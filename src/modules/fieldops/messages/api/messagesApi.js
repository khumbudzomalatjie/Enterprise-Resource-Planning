import { supabase } from '../../../../lib/supabaseClient'

export const messagesApi = {
  async getConversations() {
    const { data, error } = await supabase
      .from('conversations')
      .select('*, conversation_participants(*, profiles:user_id(full_name, email, role)), last_message_by_user:last_message_by(full_name)')
      .order('last_message_at', { ascending: false })
    return { data, error }
  },

  async getOrCreateDirectConversation(otherUserId) {
    const currentUser = (await supabase.auth.getUser()).data.user
    if (!currentUser) return { error: 'Not authenticated' }

    const { data: existing } = await supabase
      .from('conversations')
      .select('*, conversation_participants!inner(*)')
      .eq('conversation_type', 'direct')
      .eq('conversation_participants.user_id', currentUser.id)
    
    const existingConv = existing?.find(conv => 
      conv.conversation_participants.some(p => p.user_id === otherUserId)
    )
    if (existingConv) return { data: existingConv }

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert([{ conversation_type: 'direct', created_by: currentUser.id }])
      .select().single()
    if (error) return { error }

    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: currentUser.id },
      { conversation_id: conv.id, user_id: otherUserId }
    ])
    return { data: conv }
  },

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
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', messageData.conversation_id)
        .neq('user_id', messageData.sender_id)

      if (participants?.length) {
        await supabase.from('notifications').insert(participants.map(p => ({
          user_id: p.user_id,
          notification_type: 'message',
          title: 'New Message',
          body: messageData.content?.substring(0, 100),
          link_url: `/fieldops/messages`,
          metadata: { conversation_id: messageData.conversation_id, sender_id: messageData.sender_id }
        })))
      }
    }
    return { data, error }
  },

  async deleteMessage(id) {
    const { error } = await supabase.from('messages').update({ is_deleted: true }).eq('id', id)
    return { error }
  },

  async addReaction(messageId, reaction) {
    const user = (await supabase.auth.getUser()).data.user
    const { data, error } = await supabase
      .from('message_reactions')
      .upsert([{ message_id: messageId, user_id: user.id, reaction }], { onConflict: 'message_id,user_id,reaction' })
      .select().single()
    return { data, error }
  },

  async getContacts() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, last_login')
      .order('full_name')
    return { data, error }
  },

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
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
  },

  async markAllNotificationsRead() {
    const user = (await supabase.auth.getUser()).data.user
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', user.id).eq('is_read', false)
  }
}
