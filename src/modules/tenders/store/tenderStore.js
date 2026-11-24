import { create } from 'zustand'
import { tenderApi } from '../api/tenderApi'
import toast from 'react-hot-toast'

const useTenderStore = create((set, get) => ({
  tenders: [],
  selectedTender: null,
  stats: {},
  loading: false,

  fetchTenders: async (filters = {}) => {
    set({ loading: true })
    const { data, error } = await tenderApi.getTenders(filters)
    if (error) console.error(error)
    set({ tenders: data || [], loading: false })
  },

  fetchTender: async (id) => {
    set({ loading: true })
    const { data, error } = await tenderApi.getTender(id)
    if (error) toast.error('Failed to load tender')
    set({ selectedTender: data, loading: false })
  },

  fetchStats: async () => {
    const stats = await tenderApi.getStats()
    set({ stats })
  },

  createTender: async (data) => {
    const { data: newTender, error } = await tenderApi.createTender(data)
    if (error) {
      toast.error('Failed to create tender: ' + error.message)
      return { success: false }
    }
    toast.success('Tender created successfully')
    return { success: true, data: newTender }
  },

  // ✅ NEW: Update tender
  updateTender: async (id, data) => {
    const { data: updated, error } = await tenderApi.updateTender(id, data)
    if (error) {
      toast.error('Failed to update tender: ' + error.message)
      return { success: false }
    }
    toast.success('Tender updated successfully')
    set({ selectedTender: updated })
    return { success: true, data: updated }
  },

  updateStatus: async (id, status) => {
    const { error } = await tenderApi.updateStatus(id, status)
    if (error) toast.error('Failed to update status')
    else {
      toast.success('Status updated')
      get().fetchTender(id)
    }
  },

  savePricing: async (id, items) => {
    const { success, error } = await tenderApi.savePricingItems(id, items)
    if (success) toast.success('Pricing saved')
    else toast.error('Failed to save pricing')
  }
}))

export default useTenderStore
