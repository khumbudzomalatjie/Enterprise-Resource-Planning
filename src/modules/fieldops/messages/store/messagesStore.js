import { create } from 'zustand'
import { messagesApi } from '../api/messagesApi'

const useMessagesStore = create((set, get) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  contacts: [],
  notifications: [],
  unreadCount: 0,
  loading: false,
  contactsLoading: false,
  error: null,

  fetchConversations: async () => {
    set({ loading: true })
    const { data, error } = await messagesApi.getConversations()
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ conversations: data || [], loading: false })
    return { success: true }
  },

  selectConversation: async (id) => {
    set({ loading: true, selectedConversation: get().conversations.find(c => c.id === id) || null })
    const { data, error } = await messagesApi.getMessages(id)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ messages: data || [], loading: false })
    return { success: true }
  },

  getOrCreateDirectConversation: async (otherUserId) => {
    const result = await messagesApi.getOrCreateDirectConversation(otherUserId)
    if (result.error) return { success: false, error: result.error }
    const exists = get().conversations.find(c => c.id === result.data.id)
    if (!exists) set(state => ({ conversations: [result.data, ...state.conversations] }))
    await get().selectConversation(result.data.id)
    return { success: true, data: result.data }
  },

  sendMessage: async (messageData) => {
    const { data, error } = await messagesApi.sendMessage(messageData)
    if (error) return { success: false }
    set(state => ({ messages: [...state.messages, data] }))
    return { success: true, data }
  },

  deleteMessage: async (id) => {
    await messagesApi.deleteMessage(id)
    set(state => ({ messages: state.messages.filter(m => m.id !== id) }))
  },

  addReaction: async (messageId, reaction) => {
    const { data } = await messagesApi.addReaction(messageId, reaction)
    if (data) {
      set(state => ({ messages: state.messages.map(m => m.id === messageId ? { ...m, reactions: [...(m.reactions || []), data] } : m) }))
    }
  },

  // UPDATED: fetchContacts with debug logging
  fetchContacts: async () => {
    console.log('🔍 Store: Fetching contacts...')
    set({ contactsLoading: true })
    
    try {
      const { data, error } = await messagesApi.getContacts()
      
      console.log('📊 Store: getContacts result:', { 
        count: data?.length || 0, 
        error: error || 'none',
        hasData: !!data,
        sample: data?.length > 0 ? data[0] : 'empty'
      })
      
      if (error) {
        console.error('❌ Store: Error fetching contacts:', error)
        set({ contacts: [], contactsLoading: false, error })
        return { success: false, data: [], error }
      }
      
      if (!data || data.length === 0) {
        console.warn('⚠️ Store: No contacts returned - employees table may be empty or query failed')
        set({ contacts: [], contactsLoading: false })
        return { success: true, data: [] }
      }
      
      console.log(`✅ Store: Loaded ${data.length} contacts successfully`)
      set({ contacts: data, contactsLoading: false, error: null })
      return { success: true, data }
      
    } catch (e) {
      console.error('❌ Store: Exception in fetchContacts:', e)
      set({ contacts: [], contactsLoading: false, error: e.message })
      return { success: false, data: [], error: e.message }
    }
  },

  fetchNotifications: async () => {
    const { data } = await messagesApi.getNotifications()
    set({ notifications: data || [] })
    const count = await messagesApi.getUnreadCount()
    set({ unreadCount: count || 0 })
  },

  markNotificationRead: async (id) => {
    await messagesApi.markNotificationRead(id)
    set(state => ({ 
      notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n), 
      unreadCount: Math.max(0, state.unreadCount - 1) 
    }))
  },

  markAllNotificationsRead: async () => {
    await messagesApi.markAllNotificationsRead()
    set(state => ({ 
      notifications: state.notifications.map(n => ({ ...n, is_read: true })), 
      unreadCount: 0 
    }))
  },

  clearError: () => set({ error: null }),
}))

export default useMessagesStore
