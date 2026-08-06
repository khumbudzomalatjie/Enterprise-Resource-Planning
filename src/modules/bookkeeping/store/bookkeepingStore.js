import { create } from 'zustand'
import { bookkeepingApi } from '../api/bookkeepingApi'
import toast from 'react-hot-toast'

const useBookkeepingStore = create((set, get) => ({
  transactions: [],
  selectedTransaction: null,
  chartOfAccounts: [],
  journalEntries: [],
  bankAccounts: [],
  bankStatements: [],
  stats: {},
  loading: false,
  error: null,

  fetchTransactions: async (filters = {}) => {
    set({ loading: true, error: null })
    const { data, error } = await bookkeepingApi.getTransactions(filters)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ transactions: data || [], loading: false })
    return { success: true, data }
  },

  fetchTransaction: async (id) => {
    const { data, error } = await bookkeepingApi.getTransaction(id)
    if (error) return { success: false }
    set({ selectedTransaction: data })
    return { success: true, data }
  },

  createTransaction: async (data) => {
    set({ loading: true, error: null })
    const result = await bookkeepingApi.createTransaction(data)
    if (result.error) { set({ error: result.error.message, loading: false }); return { success: false, error: result.error.message } }
    set(state => ({ transactions: [result.data, ...state.transactions], loading: false }))
    toast.success('Transaction created!')
    return { success: true, data: result.data }
  },

  updateTransaction: async (id, updates) => {
    const { data, error } = await bookkeepingApi.updateTransaction(id, updates)
    if (error) return { success: false }
    set(state => ({ transactions: state.transactions.map(t => t.id === id ? data : t) }))
    toast.success('Updated!')
    return { success: true, data }
  },

  reverseTransaction: async (id) => {
    const result = await bookkeepingApi.reverseTransaction(id)
    if (result.error) return { success: false }
    toast.success('Transaction reversed!')
    await get().fetchTransactions()
    return { success: true }
  },

  approveTransaction: async (id) => {
    const { data, error } = await bookkeepingApi.approveTransaction(id)
    if (error) return { success: false }
    set(state => ({ transactions: state.transactions.map(t => t.id === id ? data : t) }))
    toast.success('Transaction approved & posted!')
    return { success: true }
  },

  fetchChartOfAccounts: async (type = null) => {
    const { data, error } = await bookkeepingApi.getChartOfAccounts(type)
    if (error) return { success: false }
    set({ chartOfAccounts: data || [] })
    return { success: true, data }
  },

  createAccount: async (data) => {
    const result = await bookkeepingApi.createAccount(data)
    if (result.error) return { success: false }
    set(state => ({ chartOfAccounts: [...state.chartOfAccounts, result.data] }))
    return { success: true }
  },

  fetchJournalEntries: async (filters = {}) => {
    const { data, error } = await bookkeepingApi.getJournalEntries(filters)
    if (error) return { success: false }
    set({ journalEntries: data || [] })
    return { success: true }
  },

  createJournalEntry: async (entryData, lines) => {
    const result = await bookkeepingApi.createJournalEntry(entryData, lines)
    if (result.error) return { success: false }
    toast.success('Journal entry created!')
    return { success: true }
  },

  postJournalEntry: async (id) => {
    const { data, error } = await bookkeepingApi.postJournalEntry(id)
    if (error) return { success: false }
    set(state => ({ journalEntries: state.journalEntries.map(j => j.id === id ? data : j) }))
    toast.success('Journal posted!')
    return { success: true }
  },

  fetchBankAccounts: async () => {
    const { data, error } = await bookkeepingApi.getBankAccounts()
    if (error) return { success: false }
    set({ bankAccounts: data || [] })
    return { success: true }
  },

  fetchBankStatements: async (accountId = null) => {
    const { data, error } = await bookkeepingApi.getBankStatements(accountId)
    if (error) return { success: false }
    set({ bankStatements: data || [] })
    return { success: true }
  },

  matchBankTransaction: async (statementId, transactionId) => {
    const result = await bookkeepingApi.matchBankTransaction(statementId, transactionId)
    if (result.error) return { success: false }
    toast.success('Transaction matched!')
    return { success: true }
  },

  bulkImport: async (transactions) => {
    const result = await bookkeepingApi.bulkImportTransactions(transactions)
    if (result.error) return { success: false, error: result.error.message }
    toast.success(`${result.data?.length || 0} transactions imported!`)
    await get().fetchTransactions()
    return { success: true, data: result.data }
  },

  fetchStats: async () => {
    const stats = await bookkeepingApi.getBookkeepingStats()
    set({ stats })
    return stats
  },

  clearError: () => set({ error: null }),
}))

export default useBookkeepingStore
