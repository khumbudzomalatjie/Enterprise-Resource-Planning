import { supabase } from '../../../../lib/supabaseClient'

export const messageApi = {
  async getConversations() {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) return { data: [] }

    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    const convIds = (participations || []).map(p => p.conversation_id)
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

    const enriched = await Promise.all((conversations || []).map(async (conv) => {
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conv.id)
        .neq('user_id', userId)

      const otherUserIds = (participants || []).map(p => p.user_id)
      let recipientNames = []
      if (otherUserIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('full_name, role').in('id', otherUserIds)
        recipientNames = (profiles || []).map(p => p.full_name || 'Unknown')
      }
      if (recipientNames.length === 0) recipientNames = [conv.title || 'Chat']

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at, sender_name')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return {
        ...conv,
        display_name: recipientNames.join(', '),
        is_group: conv.type === 'group' || recipientNames.length > 1,
        last_message: lastMsg?.content?.substring(0, 60) || 'No messages',
        last_message_time: lastMsg?.created_at || conv.created_at,
        last_sender: lastMsg?.sender_name || '',
        unread_count: 0
      }
    }))

    return { data: enriched }
  },

  async getMessages(conversationId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100)
    return { data, error }
  },

  async sendMessage(messageData) {
    const { data: userData } = await supabase.auth.getUser()
    let userName = 'User'
    let userRole = 'user'
    try {
      const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', userData.user?.id).single()
      if (profile) { userName = profile.full_name || 'User'; userRole = profile.role || 'user' }
    } catch (e) {}

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        conversation_id: messageData.conversation_id,
        sender_id: userData.user?.id,
        sender_name: userName,
        sender_role: userRole,
        message_type: 'text',
        content: messageData.content
      }])
      .select()
      .single()

    if (!error) {
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', messageData.conversation_id)
    }
    return { data, error }
  },

  async createConversation(convData, participantIds) {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user?.id) return { error: { message: 'Not authenticated' } }

    let userName = 'User'
    try {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userData.user?.id).single()
      userName = profile?.full_name || 'User'
    } catch (e) {}

    // Check for existing direct chat
    if (participantIds.length === 1) {
      const { data: myConvs } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', userData.user?.id)
      const myConvIds = (myConvs || []).map(p => p.conversation_id)
      if (myConvIds.length > 0) {
        const { data: existing } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', participantIds[0]).in('conversation_id', myConvIds)
        if (existing && existing.length > 0) {
          const { data: existingConv } = await supabase.from('conversations').select('*').eq('id', existing[0].conversation_id).single()
          return { data: existingConv, is_existing: true }
        }
      }
    }

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert([{ title: convData.title || 'Chat', type: convData.type || 'direct', created_by: userData.user?.id }])
      .select().single()
    
    if (error) return { error }

    await supabase.from('conversation_participants').insert([{ conversation_id: conv.id, user_id: userData.user?.id, role: 'sender' }])

    const others = participantIds.filter(uid => uid !== userData.user?.id)
    if (others.length > 0) {
      await supabase.from('conversation_participants').insert(others.map(uid => ({ conversation_id: conv.id, user_id: uid, role: 'receiver' })))
    }

    await supabase.from('messages').insert([{ conversation_id: conv.id, sender_id: userData.user?.id, sender_name: userName, sender_role: 'system', message_type: 'system', content: `Chat started by ${userName}` }])

    return { data: conv, is_existing: false }
  },

  async getAvailableUsers() {
    const { data, error } = await supabase.from('profiles').select('id, full_name, role, email').order('full_name')
    return { data, error }
  },

  async getUnreadCount() {
    return { count: 0 }
  }
}
