import { create } from 'zustand'
import { assetsApi } from '../api/assetsApi'

const useAssetsStore = create((set, get) => ({
  // State
  assets: [],
  selectedAsset: null,
  categories: [],
  maintenance: [],
  transfers: [],
  disposals: [],
  audits: [],
  stats: {},
  loading: false,
  error: null,

  // ============================================
  // ASSET ACTIONS
  // ============================================
  fetchAssets: async (filters = {}) => {
    set({ loading: true, error: null })
    const { data, error } = await assetsApi.getAssets(filters)
    if (error) { 
      set({ error: error.message, loading: false })
      return { success: false, error: error.message } 
    }
    set({ assets: data || [], loading: false })
    return { success: true, data }
  },

  fetchAsset: async (id) => {
    set({ loading: true })
    const { data, error } = await assetsApi.getAsset(id)
    if (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
    set({ selectedAsset: data, loading: false })
    return { success: true, data }
  },

  createAsset: async (assetData) => {
    set({ loading: true, error: null })
    const { data, error } = await assetsApi.createAsset(assetData)
    if (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
    set(state => ({ assets: [data, ...state.assets], loading: false }))
    return { success: true, data }
  },

  updateAsset: async (id, updates) => {
    set({ loading: true, error: null })
    const { data, error } = await assetsApi.updateAsset(id, updates)
    if (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
    set(state => ({
      assets: state.assets.map(a => a.id === id ? data : a),
      selectedAsset: state.selectedAsset?.id === id ? data : state.selectedAsset,
      loading: false
    }))
    return { success: true, data }
  },

  deleteAsset: async (id) => {
    set({ loading: true, error: null })
    const { error } = await assetsApi.deleteAsset(id)
    if (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
    set(state => ({ 
      assets: state.assets.map(a => a.id === id ? { ...a, status: 'disposed' } : a),
      loading: false 
    }))
    return { success: true }
  },

  // ============================================
  // CATEGORY ACTIONS
  // ============================================
  fetchCategories: async () => {
    const { data, error } = await assetsApi.getCategories()
    if (error) {
      set({ error: error.message })
      return { success: false, error: error.message }
    }
    set({ categories: data || [] })
    return { success: true, data }
  },

  createCategory: async (categoryData) => {
    const { data, error } = await assetsApi.createCategory(categoryData)
    if (error) {
      return { success: false, error: error.message }
    }
    set(state => ({ categories: [data, ...state.categories] }))
    return { success: true, data }
  },

  updateCategory: async (id, updates) => {
    const { data, error } = await assetsApi.updateCategory(id, updates)
    if (error) return { success: false, error: error.message }
    set(state => ({
      categories: state.categories.map(c => c.id === id ? data : c)
    }))
    return { success: true, data }
  },

  deleteCategory: async (id) => {
    const { error } = await assetsApi.deleteCategory(id)
    if (error) return { success: false, error: error.message }
    set(state => ({
      categories: state.categories.filter(c => c.id !== id)
    }))
    return { success: true }
  },

  // ============================================
  // MAINTENANCE ACTIONS
  // ============================================
  fetchMaintenance: async (assetId = null) => {
    const { data, error } = await assetsApi.getMaintenance(assetId)
    if (error) {
      set({ error: error.message })
      return { success: false, error: error.message }
    }
    set({ maintenance: data || [] })
    return { success: true, data }
  },

  createMaintenance: async (maintenanceData) => {
    const { data, error } = await assetsApi.createMaintenance(maintenanceData)
    if (error) return { success: false, error: error.message }
    set(state => ({ maintenance: [data, ...state.maintenance] }))
    return { success: true, data }
  },

  updateMaintenance: async (id, updates) => {
    const { data, error } = await assetsApi.updateMaintenance(id, updates)
    if (error) return { success: false, error: error.message }
    set(state => ({
      maintenance: state.maintenance.map(m => m.id === id ? data : m)
    }))
    return { success: true, data }
  },

  deleteMaintenance: async (id) => {
    const { error } = await assetsApi.deleteMaintenance(id)
    if (error) return { success: false, error: error.message }
    set(state => ({
      maintenance: state.maintenance.filter(m => m.id !== id)
    }))
    return { success: true }
  },

  // ============================================
  // TRANSFER ACTIONS
  // ============================================
  fetchTransfers: async (assetId = null) => {
    const { data, error } = await assetsApi.getTransfers(assetId)
    if (error) {
      set({ error: error.message })
      return { success: false, error: error.message }
    }
    set({ transfers: data || [] })
    return { success: true, data }
  },

  createTransfer: async (transferData) => {
    const { data, error } = await assetsApi.createTransfer(transferData)
    if (error) return { success: false, error: error.message }
    set(state => ({ transfers: [data, ...state.transfers] }))
    // Refresh assets to update location
    await get().fetchAssets()
    return { success: true, data }
  },

  // ============================================
  // DISPOSAL ACTIONS
  // ============================================
  fetchDisposals: async (assetId = null) => {
    const { data, error } = await assetsApi.getDisposals(assetId)
    if (error) {
      set({ error: error.message })
      return { success: false, error: error.message }
    }
    set({ disposals: data || [] })
    return { success: true, data }
  },

  createDisposal: async (disposalData) => {
    const { data, error } = await assetsApi.createDisposal(disposalData)
    if (error) return { success: false, error: error.message }
    set(state => ({ disposals: [data, ...state.disposals] }))
    // Refresh assets to update status
    await get().fetchAssets()
    return { success: true, data }
  },

  // ============================================
  // AUDIT ACTIONS
  // ============================================
  fetchAudits: async () => {
    const { data, error } = await assetsApi.getAudits()
    if (error) {
      set({ error: error.message })
      return { success: false, error: error.message }
    }
    set({ audits: data || [] })
    return { success: true, data }
  },

  createAudit: async (auditData) => {
    const { data, error } = await assetsApi.createAudit(auditData)
    if (error) return { success: false, error: error.message }
    set(state => ({ audits: [data, ...state.audits] }))
    return { success: true, data }
  },

  // ============================================
  // STATS
  // ============================================
  fetchAssetsStats: async () => {
    const stats = await assetsApi.getAssetsStats()
    set({ stats })
    return stats
  },

  // ============================================
  // UTILITY
  // ============================================
  clearError: () => set({ error: null }),
  clearSelectedAsset: () => set({ selectedAsset: null }),
}))

export default useAssetsStore
