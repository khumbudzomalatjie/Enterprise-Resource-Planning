import { create } from 'zustand'
import { messageApi } from '../api/messageApi'

const useMessageStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  availableUsers: [],
  employees: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchConversations: async () => {
    set({ loading: true })
    const { data, error } = await messageApi.getConversations()
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ conversations: data || [], loading: false })
    return { success: true, data }
  },

  fetchMessages: async (conversationId) => {
    set({ loading: true })
    const { data, error } = await messageApi.getMessages(conversationId)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ messages: data || [], loading: false })
    return { success: true, data }
  },

  sendMessage: async (messageData) => {
    const { data, error } = await messageApi.sendMessage(messageData)
    if (error) return { success: false, error: error.message }
    set(state => ({ messages: [...state.messages, data] }))
    return { success: true, data }
  },

  createConversation: async (convData, participantIds) => {
    const result = await messageApi.createConversation(convData, participantIds)
    if (result.error) return { success: false, error: result.error.message }
    await get().fetchConversations()
    return { success: true, data: result.data }
  },

  fetchAvailableUsers: async () => {
    const { data } = await messageApi.getAvailableUsers()
    set({ availableUsers: data || [] })
    return data
  },

  fetchEmployees: async () => {
    const { data } = await messageApi.getEmployees()
    set({ employees: data || [] })
    return data
  },

  fetchUnreadCount: async () => {
    const { count } = await messageApi.getUnreadCount()
    set({ unreadCount: count || 0 })
    return count
  },

  setActiveConversation: (conv) => set({ activeConversation: conv }),

  clearError: () => set({ error: null }),
}))

export default useMessageStore
