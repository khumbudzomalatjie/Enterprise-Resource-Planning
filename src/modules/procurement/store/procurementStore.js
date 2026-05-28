import { create } from 'zustand'
import { procurementApi } from '../api/procurementApi'

const useProcurementStore = create((set, get) => ({
  vendors: [],
  selectedVendor: null,
  purchaseRequisitions: [],
  selectedPR: null,
  rfqs: [],
  selectedRFQ: null,
  goodsReceipts: [],
  budgets: [],
  evaluations: [],
  stats: {},
  loading: false,
  error: null,

  fetchVendors: async (filters = {}) => {
    set({ loading: true })
    const { data, error } = await procurementApi.getVendors(filters)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ vendors: data, loading: false })
    return { success: true, data }
  },

  fetchVendor: async (id) => {
    const { data, error } = await procurementApi.getVendor(id)
    if (error) return { success: false }
    set({ selectedVendor: data })
    return { success: true, data }
  },

  createVendor: async (vendorData) => {
    const { data, error } = await procurementApi.createVendor(vendorData)
    if (error) return { success: false, error: error.message }
    set(state => ({ vendors: [data, ...state.vendors] }))
    return { success: true, data }
  },

  fetchPurchaseRequisitions: async (filters = {}) => {
    const { data, error } = await procurementApi.getPurchaseRequisitions(filters)
    if (error) return { success: false }
    set({ purchaseRequisitions: data })
    return { success: true, data }
  },

  fetchPR: async (id) => {
    const { data, error } = await procurementApi.getPurchaseRequisition(id)
    if (error) return { success: false }
    set({ selectedPR: data })
    return { success: true, data }
  },

  createPurchaseRequisition: async (prData, items) => {
    const result = await procurementApi.createPurchaseRequisition(prData, items)
    if (result.error) return { success: false, error: result.error.message }
    set(state => ({ purchaseRequisitions: [result.data, ...state.purchaseRequisitions] }))
    return { success: true, data: result.data }
  },

  updatePRStatus: async (id, status, approvedBy) => {
    const { data, error } = await procurementApi.updatePRStatus(id, status, approvedBy)
    if (error) return { success: false }
    set(state => ({ purchaseRequisitions: state.purchaseRequisitions.map(p => p.id === id ? data : p) }))
    return { success: true }
  },

  fetchRFQs: async (filters = {}) => {
    const { data, error } = await procurementApi.getRFQs(filters)
    if (error) return { success: false }
    set({ rfqs: data })
    return { success: true, data }
  },

  createRFQ: async (rfqData, items) => {
    const result = await procurementApi.createRFQ(rfqData, items)
    if (result.error) return { success: false }
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

  convertPRToPO: async (prId) => {
    const result = await procurementApi.createPurchaseOrderFromPR(prId)
    if (result.error) return { success: false, error: result.error.message }
    await get().fetchPurchaseRequisitions()
    return { success: true, data: result.data }
  },

  fetchGoodsReceipts: async (filters = {}) => {
    const { data, error } = await procurementApi.getGoodsReceipts(filters)
    if (error) return { success: false }
    set({ goodsReceipts: data })
    return { success: true, data }
  },

  createGoodsReceipt: async (grData, items) => {
    const result = await procurementApi.createGoodsReceipt(grData, items)
    if (result.error) return { success: false }
    set(state => ({ goodsReceipts: [result.data, ...state.goodsReceipts] }))
    return { success: true, data: result.data }
  },

  fetchBudgets: async () => {
    const { data, error } = await procurementApi.getBudgets()
    if (error) return { success: false }
    set({ budgets: data })
    return { success: true, data }
  },

  fetchEvaluations: async (vendorId = null) => {
    const { data, error } = await procurementApi.getVendorEvaluations(vendorId)
    if (error) return { success: false }
    set({ evaluations: data })
    return { success: true, data }
  },

  createEvaluation: async (evalData) => {
    const { data, error } = await procurementApi.createVendorEvaluation(evalData)
    if (error) return { success: false }
    set(state => ({ evaluations: [data, ...state.evaluations] }))
    return { success: true, data }
  },

  fetchProcurementStats: async () => {
    const stats = await procurementApi.getProcurementStats()
    set({ stats })
    return stats
  },

  clearError: () => set({ error: null }),
}))

export default useProcurementStore
