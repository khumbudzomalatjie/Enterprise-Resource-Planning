import { create } from 'zustand'
import { inventoryApi } from '../api/inventoryApi'

const useInventoryStore = create((set, get) => ({
  items: [],
  selectedItem: null,
  stockMovements: [],
  warehouses: [],
  categories: [],
  suppliers: [],
  batches: [],
  purchaseOrders: [],
  stats: {},
  loading: false,
  error: null,

  fetchItems: async (filters = {}) => {
    set({ loading: true, error: null })
    const { data, error } = await inventoryApi.getItems(filters)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ items: data, loading: false })
    return { success: true, data }
  },

  fetchItem: async (id) => {
    const { data, error } = await inventoryApi.getItem(id)
    if (error) return { success: false, error: error.message }
    set({ selectedItem: data })
    return { success: true, data }
  },

  createItem: async (itemData) => {
    const { data, error } = await inventoryApi.createItem(itemData)
    if (error) return { success: false, error: error.message }
    set(state => ({ items: [data, ...state.items] }))
    return { success: true, data }
  },

  updateItem: async (id, updates) => {
    const { data, error } = await inventoryApi.updateItem(id, updates)
    if (error) return { success: false, error: error.message }
    set(state => ({
      items: state.items.map(i => i.id === id ? data : i),
      selectedItem: state.selectedItem?.id === id ? data : state.selectedItem
    }))
    return { success: true, data }
  },

  fetchStockMovements: async (filters = {}) => {
    const { data, error } = await inventoryApi.getStockMovements(filters)
    if (error) return { success: false }
    set({ stockMovements: data })
    return { success: true, data }
  },

  createStockMovement: async (movementData) => {
    const { data, error } = await inventoryApi.createStockMovement(movementData)
    if (error) return { success: false, error: error.message }
    set(state => ({ stockMovements: [data, ...state.stockMovements] }))
    await get().fetchItems()
    return { success: true, data }
  },

  fetchWarehouses: async () => {
    const { data, error } = await inventoryApi.getWarehouses()
    if (error) return { success: false }
    set({ warehouses: data })
    return { success: true, data }
  },

  fetchCategories: async () => {
    const { data, error } = await inventoryApi.getCategories()
    if (error) return { success: false }
    set({ categories: data })
    return { success: true, data }
  },

  fetchSuppliers: async () => {
    const { data, error } = await inventoryApi.getSuppliers()
    if (error) return { success: false }
    set({ suppliers: data })
    return { success: true, data }
  },

  fetchBatches: async (itemId = null) => {
    const { data, error } = await inventoryApi.getBatches(itemId)
    if (error) return { success: false }
    set({ batches: data })
    return { success: true, data }
  },

  fetchPurchaseOrders: async (filters = {}) => {
    const { data, error } = await inventoryApi.getPurchaseOrders(filters)
    if (error) return { success: false }
    set({ purchaseOrders: data })
    return { success: true, data }
  },

  fetchInventoryStats: async () => {
    const stats = await inventoryApi.getInventoryStats()
    set({ stats })
    return stats
  },

  clearError: () => set({ error: null }),
}))

export default useInventoryStore
