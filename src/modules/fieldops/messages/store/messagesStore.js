import { create } from 'zustand'
import { messagesApi } from '../api/messagesApi'

const useMessagesStore = create((set, get) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchConversations: async () => {
    set({ loading: true })
    try {
      const { data, error } = await messagesApi.getConversations()
      if (error) {
        console.error('fetchConversations error:', error)
        set({ error: error.message, loading: false })
        return { success: false }
      }
      set({ conversations: data || [], loading: false })
      return { success: true, data }
    } catch (e) {
      console.error('fetchConversations exception:', e)
      set({ loading: false })
      return { success: false }
    }
  },

  selectConversation: async (id) => {
    set({ loading: true })
    const conv = get().conversations.find(c => c.id === id) || null
    set({ selectedConversation: conv })
    
    if (!id) {
      set({ messages: [], loading: false })
      return { success: true }
    }
    
    try {
      const { data, error } = await messagesApi.getMessages(id)
      if (error) {
        set({ error: error.message, loading: false })
        return { success: false }
      }
      set({ messages: data || [], loading: false })
      return { success: true, data }
    } catch (e) {
      set({ loading: false })
      return { success: false }
    }
  },

  getOrCreateDirectConversation: async (otherUserId) => {
    try {
      const result = await messagesApi.getOrCreateDirectConversation(otherUserId)
      if (result.error) return { success: false, error: result.error }
      const exists = get().conversations.find(c => c.id === result.data.id)
      if (!exists) set(state => ({ conversations: [result.data, ...state.conversations] }))
      await get().selectConversation(result.data.id)
      return { success: true, data: result.data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  },

  sendMessage: async (messageData) => {
    try {
      const { data, error } = await messagesApi.sendMessage(messageData)
      if (error) return { success: false, error: error.message }
      set(state => ({ messages: [...state.messages, data] }))
      return { success: true, data }
    } catch (e) {
      return { success: false, error: e.message }
    }
  },

  deleteMessage: async (id) => {
    await messagesApi.deleteMessage(id)
    set(state => ({ messages: state.messages.filter(m => m.id !== id) }))
  },

  addReaction: async (messageId, reaction) => {
    const { data } = await messagesApi.addReaction(messageId, reaction)
    if (data) {
      set(state => ({ 
        messages: state.messages.map(m => 
          m.id === messageId ? { ...m, reactions: [...(m.reactions || []), data] } : m
        ) 
      }))
    }
  },

  fetchNotifications: async () => {
    try {
      const { data } = await messagesApi.getNotifications()
      set({ notifications: data || [] })
      const count = await messagesApi.getUnreadCount()
      set({ unreadCount: count || 0 })
    } catch (e) {
      set({ notifications: [], unreadCount: 0 })
    }
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
