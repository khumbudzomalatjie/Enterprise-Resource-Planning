import { create } from 'zustand'
import { assetsApi } from '../api/assetsApi'

const useAssetsStore = create((set, get) => ({
  assets: [],
  selectedAsset: null,
  categories: [],
  maintenance: [],
  transfers: [],
  stats: {},
  loading: false,
  error: null,

  fetchAssets: async (filters = {}) => {
    set({ loading: true, error: null })
    const { data, error } = await assetsApi.getAssets(filters)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ assets: data || [], loading: false })
    return { success: true, data }
  },

  fetchAsset: async (id) => {
    const { data, error } = await assetsApi.getAsset(id)
    if (error) return { success: false }
    set({ selectedAsset: data })
    return { success: true, data }
  },

  createAsset: async (assetData) => {
    const { data, error } = await assetsApi.createAsset(assetData)
    if (error) return { success: false, error: error.message }
    set(state => ({ assets: [data, ...state.assets] }))
    return { success: true, data }
  },

  updateAsset: async (id, updates) => {
    const { data, error } = await assetsApi.updateAsset(id, updates)
    if (error) return { success: false, error: error.message }
    set(state => ({
      assets: state.assets.map(a => a.id === id ? data : a),
      selectedAsset: state.selectedAsset?.id === id ? data : state.selectedAsset
    }))
    return { success: true, data }
  },

  deleteAsset: async (id) => {
    const { error } = await assetsApi.deleteAsset(id)
    if (error) return { success: false }
    set(state => ({ assets: state.assets.map(a => a.id === id ? { ...a, status: 'disposed' } : a) }))
    return { success: true }
  },

  fetchCategories: async () => {
    const { data, error } = await assetsApi.getCategories()
    if (error) return { success: false }
    set({ categories: data || [] })
    return { success: true, data }
  },

  fetchMaintenance: async (assetId = null) => {
    const { data, error } = await assetsApi.getMaintenance(assetId)
    if (error) return { success: false }
    set({ maintenance: data || [] })
    return { success: true, data }
  },

  createMaintenance: async (maintenanceData) => {
    const { data, error } = await assetsApi.createMaintenance(maintenanceData)
    if (error) return { success: false, error: error.message }
    set(state => ({ maintenance: [data, ...state.maintenance] }))
    return { success: true, data }
  },

  createTransfer: async (transferData) => {
    const { data, error } = await assetsApi.createTransfer(transferData)
    if (error) return { success: false, error: error.message }
    set(state => ({ transfers: [data, ...state.transfers] }))
    return { success: true, data }
  },

  createDisposal: async (disposalData) => {
    const { data, error } = await assetsApi.createDisposal(disposalData)
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  },

  fetchAssetsStats: async () => {
    const stats = await assetsApi.getAssetsStats()
    set({ stats })
    return stats
  },

  clearError: () => set({ error: null }),
}))

export default useAssetsStore
