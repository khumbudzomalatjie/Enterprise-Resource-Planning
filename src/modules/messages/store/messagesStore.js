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
  error: null,
  subscription: null,

  // Conversation Actions
  fetchConversations: async () => {
    set({ loading: true })
    const { data, error } = await messagesApi.getConversations()
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ conversations: data || [], loading: false })
    return { success: true, data }
  },

  selectConversation: async (id) => {
    set({ loading: true })
    const { data, error } = await messagesApi.getConversation(id)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ selectedConversation: data, loading: false })
    
    // Load messages
    const { data: msgs } = await messagesApi.getMessages(id)
    set({ messages: msgs || [] })
    
    return { success: true }
  },

  createConversation: async (conversationData, participantIds) => {
    const result = await messagesApi.createConversation(conversationData, participantIds)
    if (result.error) return { success: false, error: result.error.message }
    set(state => ({ conversations: [result.data, ...state.conversations] }))
    return { success: true, data: result.data }
  },

  getOrCreateDirectConversation: async (otherUserId) => {
    const result = await messagesApi.getOrCreateDirectConversation(otherUserId)
    if (result.error) return { success: false, error: result.error }
    
    // Add to conversations if new
    const exists = get().conversations.find(c => c.id === result.data.id)
    if (!exists) {
      set(state => ({ conversations: [result.data, ...state.conversations] }))
    }
    
    // Select the conversation
    await get().selectConversation(result.data.id)
    return { success: true, data: result.data }
  },

  // Message Actions
  fetchMessages: async (conversationId) => {
    const { data, error } = await messagesApi.getMessages(conversationId)
    if (error) return { success: false }
    set({ messages: data || [] })
    return { success: true }
  },

  sendMessage: async (messageData) => {
    const { data, error } = await messagesApi.sendMessage(messageData)
    if (error) return { success: false, error: error.message }
    set(state => ({ messages: [...state.messages, data] }))
    return { success: true, data }
  },

  deleteMessage: async (id) => {
    const { error } = await messagesApi.deleteMessage(id)
    if (error) return { success: false }
    set(state => ({ messages: state.messages.filter(m => m.id !== id) }))
    return { success: true }
  },

  addReaction: async (messageId, reaction) => {
    const { data, error } = await messagesApi.addReaction(messageId, reaction)
    if (error) return { success: false }
    set(state => ({
      messages: state.messages.map(m => 
        m.id === messageId 
          ? { ...m, reactions: [...(m.reactions || []), data] }
          : m
      )
    }))
    return { success: true }
  },

  markAsRead: async (messageId) => {
    await messagesApi.markAsRead(messageId)
  },

  // Contact Actions
  fetchContacts: async () => {
    const { data, error } = await messagesApi.getContacts()
    if (error) return { success: false }
    set({ contacts: data || [] })
    return { success: true, data }
  },

  // Notification Actions
  fetchNotifications: async () => {
    const { data, error } = await messagesApi.getNotifications()
    if (error) return { success: false }
    set({ notifications: data || [] })
    
    const count = await messagesApi.getUnreadCount()
    set({ unreadCount: count || 0 })
    
    return { success: true }
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

  // Real-time subscriptions
  subscribeToMessages: (conversationId) => {
    const sub = messagesApi.subscribeToMessages(conversationId, (newMessage) => {
      set(state => ({
        messages: [...state.messages, newMessage]
      }))
    })
    set({ subscription: sub })
  },

  subscribeToNotifications: (userId) => {
    messagesApi.subscribeToNotifications(userId, (notification) => {
      set(state => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1
      }))
    })
  },

  unsubscribe: () => {
    const { subscription } = get()
    if (subscription) {
      subscription.unsubscribe()
      set({ subscription: null })
    }
  },

  clearError: () => set({ error: null }),
}))

export default useMessagesStore
