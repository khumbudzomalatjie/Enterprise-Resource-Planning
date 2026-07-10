import { supabase } from '../../../../lib/supabaseClient'

export const messageApi = {
  // ============================================
  // CONVERSATIONS
  // ============================================
  async getConversations() {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    // Get conversations where user is a participant
    const { data: participations, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId)
      .eq('is_archived', false)

    if (partError || !participations?.length) {
      // Also check conversations created by user
      const { data: created } = await supabase
        .from('conversations')
        .select('*')
        .eq('created_by', userId)
        .order('updated_at', { ascending: false })
      return { data: created || [] }
    }

    const convIds = participations.map(p => p.conversation_id)
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*, conversation_participants(*, profiles:user_id(full_name, role), employees:employee_id(first_name, last_name))')
      .in('id', convIds)
      .order('updated_at', { ascending: false })

    // Get last message and unread count for each conversation
    const enriched = await Promise.all((conversations || []).map(async (conv) => {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at, sender_name')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const { count: unread } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('is_read', false)
        .neq('sender_id', userId)

      return {
        ...conv,
        last_message: lastMsg?.content?.substring(0, 50) || 'No messages',
        last_message_time: lastMsg?.created_at,
        unread_count: unread || 0
      }
    }))

    return { data: enriched }
  },

  async getConversation(id) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*, conversation_participants(*, profiles:user_id(full_name, role), employees:employee_id(first_name, last_name))')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createConversation(convData, participantIds) {
    const { data: userData } = await supabase.auth.getUser()
    
    // Create conversation
    const { data: conv, error } = await supabase
      .from('conversations')
      .insert([{ ...convData, created_by: userData.user?.id }])
      .select()
      .single()
    
    if (error || !conv) return { error }

    // Add participants
    const allParticipants = [
      { conversation_id: conv.id, user_id: userData.user?.id, role: 'sender' },
      ...participantIds.map(uid => ({ conversation_id: conv.id, user_id: uid, role: 'receiver' }))
    ]

    await supabase.from('conversation_participants').insert(allParticipants)

    return { data: conv }
  },

  // ============================================
  // MESSAGES
  // ============================================
  async getMessages(conversationId, limit = 50) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(limit)

    // Mark messages as read
    const { data: userData } = await supabase.auth.getUser()
    if (data?.length) {
      const unreadIds = data.filter(m => !m.is_read && m.sender_id !== userData.user?.id).map(m => m.id)
      if (unreadIds.length) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds)
      }
      // Update participant last_read
      await supabase.from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userData.user?.id)
    }

    return { data, error }
  },

  async sendMessage(messageData) {
    const { data: userData } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', userData.user?.id)
      .single()

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        ...messageData,
        sender_id: userData.user?.id,
        sender_name: profile?.full_name || 'Unknown',
        sender_role: profile?.role || 'user'
      }])
      .select()
      .single()

    // Update conversation timestamp
    if (!error) {
      await supabase.from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', messageData.conversation_id)
    }

    return { data, error }
  },

  // ============================================
  // USERS (for new conversations)
  // ============================================
  async getAvailableUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .order('full_name')
    return { data, error }
  },

  async getEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_code, department, user_id')
      .eq('employment_status', 'active')
      .order('first_name')
    return { data, error }
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================
  async getUnreadCount() {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    // Count unread messages across all conversations
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('sender_id', userId)
      .filter('conversation_id', 'in', 
        supabase.from('conversation_participants').select('conversation_id').eq('user_id', userId)
      )

    return { count: count || 0 }
  },

  // ============================================
  // REALTIME SUBSCRIPTION
  // ============================================
  subscribeToMessages(conversationId, callback) {
    return supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        callback(payload.new)
      })
      .subscribe()
  },

  subscribeToConversations(userId, callback) {
    return supabase
      .channel(`conversations-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        callback(payload)
      })
      .subscribe()
  }
}
