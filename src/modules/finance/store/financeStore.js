import { create } from 'zustand'
import { financeApi } from '../api/financeApi'

const useFinanceStore = create((set, get) => ({
  pendingApprovals: [],
  pendingVendors: [],
  accountsPayable: [],
  accountsReceivable: [],
  payments: [],
  budgets: [],
  ledger: [],
  stats: {},
  loading: false,
  error: null,

  fetchPendingApprovals: async () => {
    set({ loading: true })
    const { data, error } = await financeApi.getPendingApprovals()
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ pendingApprovals: data || [], loading: false })
    return { success: true, data }
  },

  fetchPendingVendors: async () => {
    const { data, error } = await financeApi.getPendingVendors()
    if (error) return { success: false }
    set({ pendingVendors: data || [] })
    return { success: true, data }
  },

  approveRequest: async (approvalId, approvedBy) => {
    const { error } = await financeApi.approveRequest(approvalId, approvedBy)
    if (error) return { success: false, error: error.message }
    // Refresh lists
    await get().fetchPendingApprovals()
    await get().fetchPendingVendors()
    return { success: true }
  },

  rejectRequest: async (approvalId, approvedBy, reason) => {
    const { error } = await financeApi.rejectRequest(approvalId, approvedBy, reason)
    if (error) return { success: false, error: error.message }
    await get().fetchPendingApprovals()
    await get().fetchPendingVendors()
    return { success: true }
  },

  createApprovalRequest: async (approvalData) => {
    const { data, error } = await financeApi.createApprovalRequest(approvalData)
    if (error) return { success: false, error: error.message }
    set(state => ({ pendingApprovals: [data, ...state.pendingApprovals] }))
    return { success: true, data }
  },

  fetchAccountsPayable: async (filters = {}) => {
    const { data, error } = await financeApi.getAccountsPayable(filters)
    if (error) return { success: false }
    set({ accountsPayable: data || [] })
    return { success: true, data }
  },

  fetchAccountsReceivable: async (filters = {}) => {
    const { data, error } = await financeApi.getAccountsReceivable(filters)
    if (error) return { success: false }
    set({ accountsReceivable: data || [] })
    return { success: true, data }
  },

  recordPayment: async (paymentData) => {
    const { data, error } = await financeApi.recordPayment(paymentData)
    if (error) return { success: false, error: error.message }
    set(state => ({ payments: [data, ...(state.payments || [])] }))
    await get().fetchAccountsPayable()
    return { success: true, data }
  },

  fetchBudgets: async (fiscalYear = null) => {
    const { data, error } = await financeApi.getBudgets(fiscalYear)
    if (error) return { success: false }
    set({ budgets: data || [] })
    return { success: true, data }
  },

  createBudget: async (budgetData) => {
    const { data, error } = await financeApi.createBudget(budgetData)
    if (error) return { success: false, error: error.message }
    set(state => ({ budgets: [data, ...state.budgets] }))
    return { success: true, data }
  },

  fetchLedger: async (filters = {}) => {
    const { data, error } = await financeApi.getLedger(filters)
    if (error) return { success: false }
    set({ ledger: data || [] })
    return { success: true, data }
  },

  fetchFinanceStats: async () => {
    const stats = await financeApi.getFinanceStats()
    set({ stats })
    return stats
  },

  clearError: () => set({ error: null }),
}))

export default useFinanceStore
