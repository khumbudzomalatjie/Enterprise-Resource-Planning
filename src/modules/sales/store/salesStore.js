import { create } from 'zustand'
import { salesApi } from '../api/salesApi'

var useSalesStore = create(function(set, get) {
  return {
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

    fetchQuotations: async function(filters) {
      filters = filters || {}
      set({ loading: true })
      try {
        var result = await salesApi.getQuotations(filters)
        if (result.error) throw result.error
        set({ quotations: result.data || [], loading: false })
        return { success: true, data: result.data }
      } catch (error) {
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
    },

    fetchQuotation: async function(id) {
      try {
        var result = await salesApi.getQuotation(id)
        if (result.error) throw result.error
        set({ selectedQuotation: result.data })
        return { success: true, data: result.data }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    createQuotation: async function(quotationData, items) {
      try {
        var result = await salesApi.createQuotation(quotationData, items)
        if (result.error) throw result.error
        set(function(state) {
          return { quotations: [result.data].concat(state.quotations || []) }
        })
        return { success: true, data: result.data }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    updateQuotation: async function(id, updates) {
      try {
        var result = await salesApi.updateQuotation(id, updates)
        if (result.error) throw result.error
        set(function(state) {
          return {
            quotations: (state.quotations || []).map(function(q) {
              return q.id === id ? result.data : q
            }),
            selectedQuotation: state.selectedQuotation && state.selectedQuotation.id === id ? result.data : state.selectedQuotation
          }
        })
        return { success: true, data: result.data }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    // Accept quotation
    acceptQuotation: async function(id) {
      try {
        var result = await salesApi.updateQuotation(id, {
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        if (result.error) throw result.error
        set(function(state) {
          return {
            quotations: (state.quotations || []).map(function(q) {
              return q.id === id ? result.data : q
            }),
            selectedQuotation: state.selectedQuotation && state.selectedQuotation.id === id ? result.data : state.selectedQuotation
          }
        })
        return { success: true, data: result.data }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    // Convert quotation to JOB
    convertQuotationToJob: async function(quotationId) {
      set({ loading: true })
      try {
        var result = await salesApi.convertQuotationToJob(quotationId)
        if (result.error) throw result.error
        
        // Update the quotation status in state
        set(function(state) {
          return {
            quotations: (state.quotations || []).map(function(q) {
              return q.id === quotationId ? { ...q, status: 'converted' } : q
            }),
            selectedQuotation: state.selectedQuotation && state.selectedQuotation.id === quotationId 
              ? { ...state.selectedQuotation, status: 'converted' } 
              : state.selectedQuotation,
            loading: false
          }
        })
        return { success: true, data: result.data }
      } catch (error) {
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
    },

    // Convert quotation to INVOICE
    convertToInvoice: async function(quotationId) {
      try {
        var result = await salesApi.convertQuotationToInvoice(quotationId)
        if (result.error) throw result.error
        return { success: true, data: result.data }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    fetchInvoices: async function(filters) {
      filters = filters || {}
      try {
        var result = await salesApi.getInvoices(filters)
        if (result.error) throw result.error
        set({ invoices: result.data || [] })
        return { success: true, data: result.data }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    fetchInvoice: async function(id) {
      try {
        var result = await salesApi.getInvoice(id)
        if (result.error) throw result.error
        set({ selectedInvoice: result.data })
        return { success: true, data: result.data }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    recordPayment: async function(paymentData) {
      try {
        var result = await salesApi.recordPayment(paymentData)
        if (result.error) throw result.error
        set(function(state) {
          return { payments: [result.data].concat(state.payments || []) }
        })
        return { success: true, data: result.data }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    fetchProductsServices: async function() {
      try {
        var result = await salesApi.getProductsServices()
        if (result.error) throw result.error
        set({ productsServices: result.data || [] })
        return { success: true, data: result.data }
      } catch (error) {
        return { success: false, error: error.message }
      }
    },

    fetchSalesStats: async function() {
      try {
        var stats = await salesApi.getSalesStats()
        set({ stats: stats })
        return stats
      } catch (error) {
        return {}
      }
    },

    clearError: function() {
      set({ error: null })
    }
  }
})

export default useSalesStore
