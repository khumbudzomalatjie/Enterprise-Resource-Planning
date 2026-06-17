import { create } from 'zustand'
import { trackerApi } from '../api/trackerApi'

const useTrackerStore = create((set) => ({
  summary: {},
  jobs: [],
  vendors: [],
  purchaseOrders: [],
  inventoryItems: [],
  vehicles: [],
  employees: [],
  clients: [],
  loading: false,
  error: null,

  fetchSummary: async () => {
    set({ loading: true })
    const data = await trackerApi.getTrackingSummary()
    set({ summary: data, loading: false })
    return data
  },

  fetchJobTracking: async (filters = {}) => {
    const { data } = await trackerApi.getJobTracking(filters)
    set({ jobs: data || [] })
    return data
  },

  fetchVendorTracking: async (filters = {}) => {
    const { data } = await trackerApi.getVendorTracking(filters)
    set({ vendors: data || [] })
    return data
  },

  fetchProcurementTracking: async (filters = {}) => {
    const { data } = await trackerApi.getProcurementTracking(filters)
    set({ purchaseOrders: data || [] })
    return data
  },

  fetchInventoryTracking: async (filters = {}) => {
    const { data } = await trackerApi.getInventoryTracking(filters)
    set({ inventoryItems: data || [] })
    return data
  },

  fetchVehicleTracking: async (filters = {}) => {
    const { data } = await trackerApi.getVehicleTracking(filters)
    set({ vehicles: data || [] })
    return data
  },

  fetchEmployeeTracking: async (filters = {}) => {
    const { data } = await trackerApi.getEmployeeTracking(filters)
    set({ employees: data || [] })
    return data
  },

  fetchClientTracking: async (filters = {}) => {
    const { data } = await trackerApi.getClientTracking(filters)
    set({ clients: data || [] })
    return data
  },
}))

export default useTrackerStore
