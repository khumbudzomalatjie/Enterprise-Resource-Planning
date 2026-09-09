import { create } from 'zustand'
import { procurementApi } from '../api/procurementApi'

const useProcurementStore = create((set, get) => ({
  vendors: [],
  selectedVendor: null,
  purchaseRequisitions: [],
  selectedPR: null,
  rfqs: [],
  selectedRFQ: null,
  purchaseOrders: [],
  goodsReceipts: [],
  budgets: [],
  evaluations: [],
  stats: {},
  loading: false,
  error: null,

  // Vendor Actions
  fetchVendors: async (filters = {}) => {
    set({ loading: true, error: null })
    const { data, error } = await procurementApi.getVendors(filters)
    if (error) { set({ error: error.message, loading: false }); return { success: false, error: error.message } }
    set({ vendors: data || [], loading: false })
    return { success: true, data }
  },

  fetchVendor: async (id) => {
    const { data, error } = await procurementApi.getVendor(id)
    if (error) return { success: false, error: error.message }
    set({ selectedVendor: data })
    return { success: true, data }
  },

  createVendor: async (vendorData) => {
    set({ loading: true, error: null })
    const { data, error } = await procurementApi.createVendor(vendorData)
    if (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
    set(state => ({ vendors: [data, ...(state.vendors || [])], loading: false }))
    return { success: true, data }
  },

  updateVendor: async (id, updates) => {
    const { data, error } = await procurementApi.updateVendor(id, updates)
    if (error) return { success: false, error: error.message }
    set(state => ({ vendors: state.vendors.map(v => v.id === id ? data : v) }))
    return { success: true, data }
  },

  // ✅ Hard delete vendor (permanently removes record)
  deleteVendor: async (id) => {
    set({ loading: true, error: null })
    const { error } = await procurementApi.deleteVendor(id)
    if (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
    set(state => ({ vendors: state.vendors.filter(v => v.id !== id), loading: false }))
    return { success: true }
  },

  // Purchase Requisition Actions
  fetchPurchaseRequisitions: async (filters = {}) => {
    set({ loading: true })
    const { data, error } = await procurementApi.getPurchaseRequisitions(filters)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ purchaseRequisitions: data || [], loading: false })
    return { success: true, data }
  },

  fetchPR: async (id) => {
    const { data, error } = await procurementApi.getPurchaseRequisition(id)
    if (error) return { success: false }
    set({ selectedPR: data })
    return { success: true, data }
  },

  createPurchaseRequisition: async (prData, items) => {
    set({ loading: true, error: null })
    const result = await procurementApi.createPurchaseRequisition(prData, items)
    if (result.error) {
      set({ error: result.error.message || 'Failed to create PR', loading: false })
      return { success: false, error: result.error.message || 'Failed to create PR' }
    }
    set(state => ({ 
      purchaseRequisitions: [result.data, ...(state.purchaseRequisitions || [])], 
      loading: false 
    }))
    return { success: true, data: result.data }
  },

  updatePRStatus: async (id, status, approvedBy) => {
    const { data, error } = await procurementApi.updatePRStatus(id, status, approvedBy)
    if (error) return { success: false }
    set(state => ({ purchaseRequisitions: state.purchaseRequisitions.map(p => p.id === id ? data : p) }))
    return { success: true }
  },

  // RFQ Actions
  fetchRFQs: async (filters = {}) => {
    const { data, error } = await procurementApi.getRFQs(filters)
    if (error) return { success: false }
    set({ rfqs: data || [] })
    return { success: true, data }
  },

  createRFQ: async (rfqData, items) => {
    set({ loading: true, error: null })
    const result = await procurementApi.createRFQ(rfqData, items)
    if (result.error) {
      set({ error: result.error.message || 'Failed to create RFQ', loading: false })
      return { success: false, error: result.error.message || 'Failed to create RFQ' }
    }
    set(state => ({ rfqs: [result.data, ...(state.rfqs || [])], loading: false }))
    return { success: true, data: result.data }
  },

  addRFQResponse: async (responseData, items) => {
    const result = await procurementApi.addRFQResponse(responseData, items)
    if (result.error) return { success: false }
    return { success: true, data: result.data }
  },

  awardRFQ: async (rfqId, responseId) => {
    const result = await procurementApi.awardRFQ(rfqId, responseId)
    if (result.data) {
      set(state => ({ rfqs: state.rfqs.map(r => r.id === rfqId ? { ...r, status: 'awarded' } : r) }))
    }
    return { success: true, data: result.data }
  },

  // Purchase Order Actions
  fetchPurchaseOrders: async (filters = {}) => {
    const { data, error } = await procurementApi.getPurchaseOrders(filters)
    if (error) return { success: false }
    set({ purchaseOrders: data || [] })
    return { success: true, data }
  },

  createPurchaseOrder: async (poData, items) => {
    set({ loading: true, error: null })
    const result = await procurementApi.createPurchaseOrder(poData, items)
    if (result.error) {
      set({ error: result.error.message || 'Failed to create PO', loading: false })
      return { success: false, error: result.error.message || 'Failed to create PO' }
    }
    set(state => ({ purchaseOrders: [result.data, ...(state.purchaseOrders || [])], loading: false }))
    return { success: true, data: result.data }
  },

  convertPRToPO: async (prId) => {
    const result = await procurementApi.convertPRToPO(prId)
    if (result.error) return { success: false, error: result.error.message }
    await get().fetchPurchaseRequisitions()
    return { success: true, data: result.data }
  },

  receivePurchaseOrder: async (poId) => {
    const result = await procurementApi.receivePurchaseOrder(poId)
    return result
  },

  // Goods Receipt Actions
  fetchGoodsReceipts: async (filters = {}) => {
    const { data, error } = await procurementApi.getGoodsReceipts(filters)
    if (error) return { success: false }
    set({ goodsReceipts: data || [] })
    return { success: true, data }
  },

  createGoodsReceipt: async (grData, items) => {
    set({ loading: true, error: null })
    const result = await procurementApi.createGoodsReceipt(grData, items)
    if (result.error) {
      set({ error: result.error.message || 'Failed to create GR', loading: false })
      return { success: false, error: result.error.message || 'Failed to create GR' }
    }
    set(state => ({ goodsReceipts: [result.data, ...(state.goodsReceipts || [])], loading: false }))
    return { success: true, data: result.data }
  },

  // Budget Actions
  fetchBudgets: async () => {
    const { data, error } = await procurementApi.getBudgets()
    if (error) return { success: false }
    set({ budgets: data || [] })
    return { success: true, data }
  },

  // Evaluation Actions
  fetchEvaluations: async (vendorId = null) => {
    const { data, error } = await procurementApi.getVendorEvaluations(vendorId)
    if (error) return { success: false }
    set({ evaluations: data || [] })
    return { success: true, data }
  },

  createEvaluation: async (evalData) => {
    const { data, error } = await procurementApi.createVendorEvaluation(evalData)
    if (error) return { success: false }
    set(state => ({ evaluations: [data, ...state.evaluations] }))
    return { success: true, data }
  },

  // Stats
  fetchProcurementStats: async () => {
    const stats = await procurementApi.getProcurementStats()
    set({ stats })
    return stats
  },

  clearError: () => set({ error: null }),
}))

export default useProcurementStore
