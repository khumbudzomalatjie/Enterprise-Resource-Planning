import { create } from 'zustand'
import { supabase } from '../../../../lib/supabaseClient'

const useMessageStore = create((set, get) => ({
  conversations: [],
  messages: [],
  activeConversation: null,
  unreadCount: 0,
  loading: false,

  fetchConversations: async () => {
    set({ loading: true })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ loading: false }); return }

    // Get all messages for this user (same as mobile)
    const { data: allMessages } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!allMessages?.length) { set({ conversations: [], loading: false }); return }

    // Group by conversation partner
    const conversationMap = {}
    allMessages.forEach(msg => {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
      if (!conversationMap[partnerId]) {
        conversationMap[partnerId] = {
          id: partnerId,
          messages: [],
          unread_count: 0,
          last_message: null,
          last_message_time: null,
          last_sender: null
        }
      }
      conversationMap[partnerId].messages.push(msg)
      if (msg.sender_id !== user.id && !msg.is_read) {
        conversationMap[partnerId].unread_count++
      }
    })

    // Get profiles for conversation partners
    const partnerIds = Object.keys(conversationMap)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('id', partnerIds)

    const profileMap = {}
    ;(profiles || []).forEach(p => { profileMap[p.id] = p })

    // Build conversation list
    const conversations = partnerIds.map(id => {
      const conv = conversationMap[id]
      const lastMsg = conv.messages[0]
      const profile = profileMap[id]
      return {
        id,
        display_name: profile?.full_name || 'Unknown',
        role: profile?.role || 'user',
        is_group: false,
        is_direct: true,
        last_message: lastMsg?.message || lastMsg?.content || '',
        last_message_time: lastMsg?.created_at,
        last_sender: lastMsg?.sender_id === user.id ? 'You' : (profile?.full_name || 'Unknown'),
        unread_count: conv.unread_count,
        recipient_count: 1
      }
    })

    // Sort by most recent message
    conversations.sort((a, b) => {
      const aTime = a.last_message_time ? new Date(a.last_message_time).getTime() : 0
      const bTime = b.last_message_time ? new Date(b.last_message_time).getTime() : 0
      return bTime - aTime
    })

    set({ conversations, loading: false })
  },

  fetchMessages: async (partnerId) => {
    set({ loading: true })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ loading: false }); return }

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })

    // Get partner profile
    const { data: partnerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', partnerId)
      .single()

    const enriched = (messages || []).map(msg => ({
      ...msg,
      sender_name: msg.sender_id === user.id ? 'You' : (partnerProfile?.full_name || 'Unknown'),
      content: msg.message || msg.content || ''
    }))

    set({ messages: enriched, loading: false })

    // Mark as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', partnerId)
      .eq('receiver_id', user.id)
      .eq('is_read', false)

    get().fetchConversations()
    get().fetchUnreadCount()
  },

  sendMessage: async (messageData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const payload = {
      sender_id: user.id,
      sender_name: profile?.full_name || 'User',
      receiver_id: messageData.receiver_id || get().activeConversation?.id,
      message: messageData.content || messageData.message || '',
      content: messageData.content || messageData.message || '',
      is_read: false,
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([payload])
      .select()
      .single()

    if (!error && data) {
      // Add to current messages
      set(state => ({
        messages: [...state.messages, {
          ...data,
          sender_name: 'You',
          content: data.message || data.content
        }]
      }))
      get().fetchConversations()
    }

    return { success: !error, data, error: error?.message }
  },

  createConversation: async (convData, participantIds) => {
    // For direct messages, just return the partner info
    if (participantIds.length === 1) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', participantIds[0])
        .single()

      const conv = {
        id: participantIds[0],
        display_name: profile?.full_name || 'User',
        is_direct: true,
        is_group: false
      }

      set({ activeConversation: conv })
      await get().fetchMessages(participantIds[0])
      return { success: true, data: conv }
    }

    // For group chats (future feature)
    return { success: false, error: 'Group chats not yet supported' }
  },

  fetchUnreadCount: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false)

    set({ unreadCount: count || 0 })
  }
}))

export default useMessageStore
