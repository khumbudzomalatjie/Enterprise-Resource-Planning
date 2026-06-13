import { create } from 'zustand'
import { salesApi } from '../api/salesApi'

const useSalesStore = create((set, get) => ({
  quotations: [],
  selectedQuotation: null,
  invoices: [],
  selectedInvoice: null,
  payments: [],
  productsServices: [],
  salesTargets: [],
  stats: {},
  loading: false,
  error: null,

  fetchQuotations: async (filters = {}) => {
    set({ loading: true, error: null })
    try {
      const result = await salesApi.getQuotations(filters)
      if (result.error) throw result.error
      set({ quotations: result.data || [], loading: false })
      return { success: true, data: result.data }
    } catch (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
  },

  fetchQuotation: async (id) => {
    try {
      const result = await salesApi.getQuotation(id)
      if (result.error) throw result.error
      set({ selectedQuotation: result.data })
      return { success: true, data: result.data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  createQuotation: async (quotationData, items) => {
    set({ loading: true, error: null })
    try {
      const result = await salesApi.createQuotation(quotationData, items)
      if (result.error) throw result.error
      set((state) => ({
        quotations: [result.data, ...(state.quotations || [])],
        loading: false
      }))
      return { success: true, data: result.data }
    } catch (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
  },

  updateQuotation: async (id, updates) => {
    try {
      const result = await salesApi.updateQuotation(id, updates)
      if (result.error) throw result.error
      set((state) => ({
        quotations: (state.quotations || []).map((q) =>
          q.id === id ? result.data : q
        ),
        selectedQuotation:
          state.selectedQuotation?.id === id ? result.data : state.selectedQuotation
      }))
      return { success: true, data: result.data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  acceptQuotation: async (id) => {
    return await get().updateQuotation(id, {
      status: 'accepted',
      updated_at: new Date().toISOString()
    })
  },

  convertQuotationToJob: async (quotationId) => {
    set({ loading: true })
    try {
      const result = await salesApi.convertQuotationToJob(quotationId)
      if (result.error) throw result.error
      set((state) => ({
        quotations: (state.quotations || []).map((q) =>
          q.id === quotationId ? { ...q, status: 'converted' } : q
        ),
        selectedQuotation:
          state.selectedQuotation?.id === quotationId
            ? { ...state.selectedQuotation, status: 'converted' }
            : state.selectedQuotation,
        loading: false
      }))
      return { success: true, data: result.data }
    } catch (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
  },

  convertToInvoice: async (quotationId) => {
    try {
      const result = await salesApi.convertQuotationToInvoice(quotationId)
      if (result.error) throw result.error
      return { success: true, data: result.data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  fetchInvoices: async (filters = {}) => {
    try {
      const result = await salesApi.getInvoices(filters)
      if (result.error) throw result.error
      set({ invoices: result.data || [] })
      return { success: true, data: result.data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  fetchInvoice: async (id) => {
    try {
      const result = await salesApi.getInvoice(id)
      if (result.error) throw result.error
      set({ selectedInvoice: result.data })
      return { success: true, data: result.data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  recordPayment: async (paymentData) => {
    try {
      const result = await salesApi.recordPayment(paymentData)
      if (result.error) throw result.error
      set((state) => ({
        payments: [result.data, ...(state.payments || [])]
      }))
      return { success: true, data: result.data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  fetchProductsServices: async () => {
    try {
      const result = await salesApi.getProductsServices()
      if (result.error) throw result.error
      set({ productsServices: result.data || [] })
      return { success: true, data: result.data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  fetchSalesStats: async () => {
    try {
      const stats = await salesApi.getSalesStats()
      set({ stats })
      return stats
    } catch (error) {
      return {}
    }
  },

  clearError: () => set({ error: null })
}))

export default useSalesStore
