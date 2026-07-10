import { supabase } from '../../../../lib/supabaseClient'

export const messageApi = {
  // ============================================
  // CONVERSATIONS
  // ============================================
  async getConversations() {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    // Get conversations where user is a participant
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('is_archived', false)

    const convIds = (participations || []).map(p => p.conversation_id)

    // Also get conversations created by user
    const { data: created } = await supabase
      .from('conversations')
      .select('id')
      .eq('created_by', userId)

    const allConvIds = [...new Set([...convIds, ...(created || []).map(c => c.id)])]

    if (allConvIds.length === 0) return { data: [] }

    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .in('id', allConvIds)
      .order('updated_at', { ascending: false })

    // Get last message and unread count for each
    const enriched = await Promise.all((conversations || []).map(async (conv) => {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at, sender_name')
        .eq('conversation_id', conv.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const { count: unread } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('is_read', false)
        .neq('sender_id', userId)

      return {
        ...conv,
        last_message: lastMsg?.content?.substring(0, 60) || 'No messages yet',
        last_message_time: lastMsg?.created_at || conv.created_at,
        unread_count: unread || 0
      }
    }))

    return { data: enriched }
  },

  async getMessages(conversationId, limit = 50) {
    const { data: userData } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(limit)

    // Mark as read
    if (data?.length) {
      const unreadIds = data
        .filter(m => !m.is_read && m.sender_id !== userData.user?.id)
        .map(m => m.id)
      if (unreadIds.length) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds)
      }
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
        conversation_id: messageData.conversation_id,
        sender_id: userData.user?.id,
        sender_name: profile?.full_name || 'Unknown',
        sender_role: profile?.role || 'user',
        message_type: messageData.message_type || 'text',
        content: messageData.content
      }])
      .select()
      .single()

    if (!error) {
      await supabase.from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', messageData.conversation_id)
    }

    return { data, error }
  },

  async createConversation(convData, participantIds) {
    const { data: userData } = await supabase.auth.getUser()
    
    if (!userData.user?.id) {
      return { error: { message: 'User not authenticated' } }
    }

    // Create conversation
    const { data: conv, error } = await supabase
      .from('conversations')
      .insert([{
        title: convData.title || 'New Chat',
        type: participantIds.length > 1 ? 'group' : 'direct',
        created_by: userData.user?.id
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Create conv error:', error)
      return { error }
    }

    // Add creator as participant
    await supabase.from('conversation_participants').insert([{
      conversation_id: conv.id,
      user_id: userData.user?.id,
      role: 'sender'
    }])

    // Add other participants
    const participants = participantIds.map(uid => ({
      conversation_id: conv.id,
      user_id: uid,
      role: 'receiver'
    }))

    if (participants.length > 0) {
      await supabase.from('conversation_participants').insert(participants)
    }

    // Send first message
    await supabase.from('messages').insert([{
      conversation_id: conv.id,
      sender_id: userData.user?.id,
      sender_name: profile?.full_name || 'System',
      sender_role: 'system',
      message_type: 'system',
      content: `Chat created by ${profile?.full_name || 'User'}`
    }])

    return { data: conv }
  },

  async getAvailableUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .order('full_name')
    return { data, error }
  },

  async getUnreadCount() {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    const convIds = (participations || []).map(p => p.conversation_id)
    if (convIds.length === 0) return { count: 0 }

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .eq('is_read', false)
      .neq('sender_id', userId)

    return { count: count || 0 }
  }
}
