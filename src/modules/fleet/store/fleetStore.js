import { create } from 'zustand'
import { fleetApi } from '../api/fleetApi'

const useFleetStore = create((set, get) => ({
  vehicles: [],
  selectedVehicle: null,
  fuelRecords: [],
  expenses: [],
  maintenanceRecords: [],
  reminders: [],
  meterReadings: [],
  stats: {},
  loading: false,
  error: null,

  fetchVehicles: async (filters = {}) => {
    set({ loading: true, error: null })
    const { data, error } = await fleetApi.getVehicles(filters)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ vehicles: data || [], loading: false })
    return { success: true, data }
  },

  fetchVehicle: async (id) => {
    const { data, error } = await fleetApi.getVehicle(id)
    if (error) return { success: false }
    set({ selectedVehicle: data })
    return { success: true, data }
  },

  createVehicle: async (vehicleData) => {
    const { data, error } = await fleetApi.createVehicle(vehicleData)
    if (error) return { success: false, error: error.message }
    set(state => ({ vehicles: [data, ...state.vehicles] }))
    return { success: true, data }
  },

  updateVehicle: async (id, updates) => {
    const { data, error } = await fleetApi.updateVehicle(id, updates)
    if (error) return { success: false, error: error.message }
    set(state => ({ vehicles: state.vehicles.map(v => v.id === id ? data : v) }))
    return { success: true, data }
  },

  deleteVehicle: async (id) => {
    const { error } = await fleetApi.deleteVehicle(id)
    if (error) return { success: false }
    set(state => ({ vehicles: state.vehicles.map(v => v.id === id ? {...v, status: 'retired'} : v) }))
    return { success: true }
  },

  fetchFuelRecords: async (vehicleId = null) => {
    const { data, error } = await fleetApi.getFuelRecords(vehicleId)
    if (error) return { success: false }
    set({ fuelRecords: data || [] })
    return { success: true, data }
  },

  createFuelRecord: async (fuelData) => {
    const { data, error } = await fleetApi.createFuelRecord(fuelData)
    if (error) return { success: false, error: error.message }
    set(state => ({ fuelRecords: [data, ...state.fuelRecords] }))
    return { success: true, data }
  },

  fetchExpenses: async (vehicleId = null) => {
    const { data, error } = await fleetApi.getExpenses(vehicleId)
    if (error) return { success: false }
    set({ expenses: data || [] })
    return { success: true, data }
  },

  createExpense: async (expenseData) => {
    const { data, error } = await fleetApi.createExpense(expenseData)
    if (error) return { success: false, error: error.message }
    set(state => ({ expenses: [data, ...state.expenses] }))
    return { success: true, data }
  },

  fetchReminders: async (filters = {}) => {
    const { data, error } = await fleetApi.getReminders(filters)
    if (error) return { success: false }
    set({ reminders: data || [] })
    return { success: true, data }
  },

  createReminder: async (reminderData) => {
    const { data, error } = await fleetApi.createReminder(reminderData)
    if (error) return { success: false, error: error.message }
    set(state => ({ reminders: [data, ...state.reminders] }))
    return { success: true, data }
  },

  updateReminder: async (id, updates) => {
    const { data, error } = await fleetApi.updateReminder(id, updates)
    if (error) return { success: false }
    set(state => ({ reminders: state.reminders.map(r => r.id === id ? data : r) }))
    return { success: true }
  },

  fetchMeterReadings: async (vehicleId = null) => {
    const { data, error } = await fleetApi.getMeterReadings(vehicleId)
    if (error) return { success: false }
    set({ meterReadings: data || [] })
    return { success: true, data }
  },

  createMeterReading: async (readingData) => {
    const { data, error } = await fleetApi.createMeterReading(readingData)
    if (error) return { success: false, error: error.message }
    set(state => ({ meterReadings: [data, ...state.meterReadings] }))
    return { success: true, data }
  },

  fetchFleetStats: async () => {
    const stats = await fleetApi.getFleetStats()
    set({ stats })
    return stats
  },

  clearError: () => set({ error: null }),
}))

export default useFleetStore
