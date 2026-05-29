import { create } from 'zustand'
import { hrApi } from '../api/hrApi'

const useHRStore = create((set, get) => ({
  // State
  employees: [],
  selectedEmployee: null,
  contracts: [],
  leaveRequests: [],
  leaveTypes: [],
  trainingRecords: [],
  disciplinaryRecords: [],
  stats: {},
  loading: false,
  error: null,

  // Employee Actions
  fetchEmployees: async (filters = {}) => {
    set({ loading: true, error: null })
    const { data, error } = await hrApi.getEmployees(filters)
    if (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
    set({ employees: data || [], loading: false })
    return { success: true, data }
  },

  fetchEmployee: async (id) => {
    set({ loading: true, error: null })
    const { data, error } = await hrApi.getEmployee(id)
    if (error) {
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
    set({ selectedEmployee: data, loading: false })
    return { success: true, data }
  },

  createEmployee: async (employeeData) => {
    try {
      set({ loading: true, error: null })
      const { data, error } = await hrApi.createEmployee(employeeData)
      if (error) {
        console.error('Create employee error:', error)
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
      set(state => ({ employees: [data, ...(state.employees || [])], loading: false }))
      return { success: true, data }
    } catch (err) {
      console.error('Create employee exception:', err)
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  updateEmployee: async (id, updates) => {
    try {
      const { data, error } = await hrApi.updateEmployee(id, updates)
      if (error) {
        console.error('Update employee error:', error)
        return { success: false, error: error.message }
      }
      set(state => ({
        employees: (state.employees || []).map(emp => emp.id === id ? data : emp),
        selectedEmployee: state.selectedEmployee?.id === id ? data : state.selectedEmployee
      }))
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteEmployee: async (id) => {
    try {
      const { error } = await hrApi.deleteEmployee(id)
      if (error) return { success: false, error: error.message }
      set(state => ({
        employees: (state.employees || []).map(emp => 
          emp.id === id ? { ...emp, employment_status: 'terminated' } : emp
        )
      }))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  // Contract Actions
  fetchContracts: async (employeeId = null) => {
    const { data, error } = await hrApi.getContracts(employeeId)
    if (error) return { success: false, error: error.message }
    set({ contracts: data || [] })
    return { success: true, data }
  },

  createContract: async (contractData) => {
    const { data, error } = await hrApi.createContract(contractData)
    if (error) return { success: false, error: error.message }
    set(state => ({ contracts: [data, ...(state.contracts || [])] }))
    return { success: true, data }
  },

  // Leave Actions
  fetchLeaveRequests: async (filters = {}) => {
    const { data, error } = await hrApi.getLeaveRequests(filters)
    if (error) return { success: false, error: error.message }
    set({ leaveRequests: data || [] })
    return { success: true, data }
  },

  fetchLeaveTypes: async () => {
    const { data, error } = await hrApi.getLeaveTypes()
    if (error) return { success: false, error: error.message }
    set({ leaveTypes: data || [] })
    return { success: true, data }
  },

  createLeaveRequest: async (requestData) => {
    const { data, error } = await hrApi.createLeaveRequest(requestData)
    if (error) return { success: false, error: error.message }
    set(state => ({ leaveRequests: [data, ...(state.leaveRequests || [])] }))
    return { success: true, data }
  },

  updateLeaveRequest: async (id, updates) => {
    const { data, error } = await hrApi.updateLeaveRequest(id, updates)
    if (error) return { success: false, error: error.message }
    set(state => ({
      leaveRequests: (state.leaveRequests || []).map(lr => lr.id === id ? data : lr)
    }))
    return { success: true, data }
  },

  // Training Actions
  fetchTrainingRecords: async (employeeId = null) => {
    const { data, error } = await hrApi.getTrainingRecords(employeeId)
    if (error) return { success: false, error: error.message }
    set({ trainingRecords: data || [] })
    return { success: true, data }
  },

  createTrainingRecord: async (trainingData) => {
    const { data, error } = await hrApi.createTrainingRecord(trainingData)
    if (error) return { success: false, error: error.message }
    set(state => ({ trainingRecords: [data, ...(state.trainingRecords || [])] }))
    return { success: true, data }
  },

  // Disciplinary Actions
  fetchDisciplinaryRecords: async (employeeId = null) => {
    const { data, error } = await hrApi.getDisciplinaryRecords(employeeId)
    if (error) return { success: false, error: error.message }
    set({ disciplinaryRecords: data || [] })
    return { success: true, data }
  },

  createDisciplinaryRecord: async (recordData) => {
    const { data, error } = await hrApi.createDisciplinaryRecord(recordData)
    if (error) return { success: false, error: error.message }
    set(state => ({ disciplinaryRecords: [data, ...(state.disciplinaryRecords || [])] }))
    return { success: true, data }
  },

  // Stats
  fetchHRStats: async () => {
    try {
      const stats = await hrApi.getHRStats()
      set({ stats })
      return stats
    } catch (err) {
      return {}
    }
  },

  clearError: () => set({ error: null }),
}))

export default useHRStore
