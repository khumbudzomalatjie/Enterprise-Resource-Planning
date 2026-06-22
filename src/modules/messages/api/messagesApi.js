import { supabase } from '../../../lib/supabaseClient'

export const messagesApi = {
  // Conversations
  async getConversations() {
    const { data, error } = await supabase
      .from('conversations')
      .select('*, conversation_participants(*, profiles:user_id(full_name, email, role)), last_message_by_user:last_message_by(full_name)')
      .order('last_message_at', { ascending: false })
    return { data, error }
  },

  async getConversation(id) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*, conversation_participants(*, profiles:user_id(full_name, email, role))')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createConversation(conversationData, participantIds) {
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert([conversationData])
      .select()
      .single()
    
    if (convError) return { error: convError }

    // Add participants
    const participants = participantIds.map(userId => ({
      conversation_id: conv.id,
      user_id: userId
    }))
    
    await supabase.from('conversation_participants').insert(participants)
    
    return { data: conv }
  },

  async getOrCreateDirectConversation(otherUserId) {
    const currentUser = (await supabase.auth.getUser()).data.user
    if (!currentUser) return { error: 'Not authenticated' }

    // Check if direct conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('*, conversation_participants!inner(*)')
      .eq('conversation_type', 'direct')
      .eq('conversation_participants.user_id', currentUser.id)
    
    const existingConv = existing?.find(conv => 
      conv.conversation_participants.some(p => p.user_id === otherUserId)
    )

    if (existingConv) return { data: existingConv }

    // Create new direct conversation
    return await messagesApi.createConversation(
      { conversation_type: 'direct', created_by: currentUser.id },
      [currentUser.id, otherUserId]
    )
  },

  // Messages
  async getMessages(conversationId, limit = 50) {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:sender_id(full_name, email, role), reactions:message_reactions(*), read_by:message_read_status(*)')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return { data: data?.reverse(), error }
  },

  async sendMessage(messageData) {
    const { data, error } = await supabase
      .from('messages')
      .insert([messageData])
      .select('*, sender:sender_id(full_name, email)')
      .single()
    
    if (!error) {
      // Create notification for other participants
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', messageData.conversation_id)
        .neq('user_id', messageData.sender_id)

      if (participants?.length) {
        const notifications = participants.map(p => ({
          user_id: p.user_id,
          notification_type: 'message',
          title: 'New Message',
          body: messageData.content?.substring(0, 100),
          link_url: `/messages/${messageData.conversation_id}`,
          metadata: { conversation_id: messageData.conversation_id, sender_id: messageData.sender_id }
        }))
        await supabase.from('notifications').insert(notifications)
      }
    }
    
    return { data, error }
  },

  async deleteMessage(id) {
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', id)
    return { error }
  },

  async addReaction(messageId, reaction) {
    const user = (await supabase.auth.getUser()).data.user
    const { data, error } = await supabase
      .from('message_reactions')
      .upsert([{ message_id: messageId, user_id: user.id, reaction }], { onConflict: 'message_id,user_id,reaction' })
      .select()
      .single()
    return { data, error }
  },

  async removeReaction(messageId, reaction) {
    const user = (await supabase.auth.getUser()).data.user
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('reaction', reaction)
    return { error }
  },

  async markAsRead(messageId) {
    const user = (await supabase.auth.getUser()).data.user
    const { error } = await supabase
      .from('message_read_status')
      .upsert([{ message_id: messageId, user_id: user.id }], { onConflict: 'message_id,user_id' })
    return { error }
  },

  // Contacts (All Users)
  async getContacts() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, last_login')
      .order('full_name')
    return { data, error }
  },

  async getContact(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  },

  // Notifications
  async getNotifications(limit = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  async getUnreadCount() {
    const user = (await supabase.auth.getUser()).data.user
    const { data } = await supabase.rpc('get_unread_count', { p_user_id: user.id })
    return data || 0
  },

  async markNotificationRead(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
    return { error }
  },

  async markAllNotificationsRead() {
    const user = (await supabase.auth.getUser()).data.user
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false)
    return { error }
  },

  // Subscribe to real-time messages
  subscribeToMessages(conversationId, callback) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, payload => {
        callback(payload.new)
      })
      .subscribe()
  },

  // Subscribe to notifications
  subscribeToNotifications(userId, callback) {
    return supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, payload => {
        callback(payload.new)
      })
      .subscribe()
  }
}
