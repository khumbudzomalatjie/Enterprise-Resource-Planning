import { create } from 'zustand'
import { auditApi } from '../api/auditApi'

const useAuditStore = create((set, get) => ({
  auditEntries: [],
  selectedEntry: null,
  stats: {},
  loading: false,
  error: null,

  fetchAuditTrail: async (filters = {}) => {
    set({ loading: true, error: null })
    const { data, error } = await auditApi.getAuditTrail(filters)
    if (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
    set({ auditEntries: data || [], loading: false })
    return { success: true, data }
  },

  fetchAuditEntry: async (id) => {
    set({ loading: true })
    const { data, error } = await auditApi.getAuditEntry(id)
    if (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
    set({ selectedEntry: data, loading: false })
    return { success: true, data }
  },

  logAction: async (actionData) => {
    const { data, error } = await auditApi.logAction(actionData)
    if (error) {
      console.error('Audit log error:', error.message)
      return { success: false, error: error.message }
    }
    // Add to local state
    set(state => ({ auditEntries: [data, ...state.auditEntries].slice(0, 100) }))
    return { success: true, data }
  },

  logLogin: async (userData) => {
    return await auditApi.logLogin(userData)
  },

  logLogout: async (userData) => {
    return await auditApi.logLogout(userData)
  },

  fetchAuditStats: async () => {
    const stats = await auditApi.getAuditStats()
    set({ stats })
    return stats
  },

  clearError: () => set({ error: null }),
}))

export default useAuditStore
