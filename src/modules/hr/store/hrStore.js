import { create } from 'zustand'
import { hrApi } from '../api/hrApi'
import { supabase } from '../../../lib/supabaseClient'

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
      
      const safeData = {
        first_name: employeeData.first_name,
        last_name: employeeData.last_name,
        email: employeeData.email,
        phone: employeeData.phone || null,
        alternative_phone: employeeData.alternative_phone || null,
        address_line1: employeeData.address_line1 || null,
        address_line2: employeeData.address_line2 || null,
        city: employeeData.city || null,
        state: employeeData.state || null,
        postal_code: employeeData.postal_code || null,
        department: employeeData.department || null,
        position: employeeData.position || null,
        employment_type: employeeData.employment_type || 'full_time',
        employment_status: employeeData.employment_status || 'active',
        date_of_hire: employeeData.date_of_hire || null,
        date_of_birth: employeeData.date_of_birth || null,
        gender: employeeData.gender || null,
        marital_status: employeeData.marital_status || null,
        id_number: employeeData.id_number || null,
        tax_number: employeeData.tax_number || null,
        bank_name: employeeData.bank_name || null,
        bank_account_number: employeeData.bank_account_number || null,
        bank_branch_code: employeeData.bank_branch_code || null,
        emergency_contact_name: employeeData.emergency_contact_name || null,
        emergency_contact_phone: employeeData.emergency_contact_phone || null,
        emergency_contact_relation: employeeData.emergency_contact_relation || null,
        notes: employeeData.notes || null,
        profile_photo_url: employeeData.profile_photo_url || null
      }

      const { data, error } = await hrApi.createEmployee(safeData)
      if (error) {
        console.error('Create employee error:', error)
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
      set(state => ({ employees: [data, ...(state.employees || [])], loading: false }))
      
      // AUDIT: Log employee creation
      try {
        await supabase.rpc('log_audit', {
          p_module: 'HR Management',
          p_action: 'Created',
          p_entity_type: 'Employee',
          p_entity_name: data.first_name + ' ' + data.last_name,
          p_description: 'Employee created: ' + data.first_name + ' ' + data.last_name
        })
      } catch (auditError) {
        console.error('Audit log error (non-critical):', auditError.message)
      }
      
      return { success: true, data }
    } catch (err) {
      console.error('Create employee exception:', err)
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  updateEmployee: async (id, updates) => {
    try {
      set({ loading: true, error: null })
      
      const safeUpdates = {}
      const allowedFields = [
        'first_name', 'last_name', 'email', 'phone', 'alternative_phone',
        'address_line1', 'address_line2', 'city', 'state', 'postal_code',
        'department', 'position', 'employment_type', 'employment_status',
        'date_of_hire', 'date_of_birth', 'gender', 'marital_status',
        'id_number', 'tax_number', 'bank_name', 'bank_account_number',
        'bank_branch_code', 'emergency_contact_name', 'emergency_contact_phone',
        'emergency_contact_relation', 'notes', 'profile_photo_url',
        'date_of_termination', 'termination_reason'
      ]

      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          safeUpdates[field] = updates[field] || null
        }
      })

      safeUpdates.updated_at = new Date().toISOString()

      const { data, error } = await hrApi.updateEmployee(id, safeUpdates)
      if (error) {
        console.error('Update employee error:', error)
        set({ error: error.message, loading: false })
        return { success: false, error: error.message }
      }
      
      set(state => ({
        employees: (state.employees || []).map(emp => emp.id === id ? data : emp),
        selectedEmployee: state.selectedEmployee?.id === id ? data : state.selectedEmployee,
        loading: false
      }))
      
      // AUDIT: Log employee update
      try {
        await supabase.rpc('log_audit', {
          p_module: 'HR Management',
          p_action: 'Updated',
          p_entity_type: 'Employee',
          p_entity_name: data.first_name + ' ' + data.last_name,
          p_description: 'Employee updated: ' + data.first_name + ' ' + data.last_name
        })
      } catch (auditError) {
        console.error('Audit log error (non-critical):', auditError.message)
      }
      
      return { success: true, data }
    } catch (err) {
      console.error('Update employee exception:', err)
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  deleteEmployee: async (id) => {
    try {
      const employee = get().employees?.find(emp => emp.id === id)
      const employeeName = employee ? employee.first_name + ' ' + employee.last_name : 'Unknown'
      
      const { error } = await hrApi.deleteEmployee(id)
      if (error) return { success: false, error: error.message }
      set(state => ({
        employees: (state.employees || []).map(emp => 
          emp.id === id ? { ...emp, employment_status: 'terminated' } : emp
        )
      }))
      
      // AUDIT: Log employee termination
      try {
        await supabase.rpc('log_audit', {
          p_module: 'HR Management',
          p_action: 'Terminated',
          p_entity_type: 'Employee',
          p_entity_name: employeeName,
          p_description: 'Employee terminated: ' + employeeName
        })
      } catch (auditError) {
        console.error('Audit log error (non-critical):', auditError.message)
      }
      
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
    
    // AUDIT: Log contract creation
    try {
      await supabase.rpc('log_audit', {
        p_module: 'HR Management',
        p_action: 'Contract Created',
        p_entity_type: 'Contract',
        p_entity_name: data.contract_title,
        p_description: 'Contract created: ' + data.contract_title
      })
    } catch (auditError) {
      console.error('Audit log error (non-critical):', auditError.message)
    }
    
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
    
    // AUDIT: Log leave request
    try {
      await supabase.rpc('log_audit', {
        p_module: 'HR Management',
        p_action: 'Leave Requested',
        p_entity_type: 'Leave',
        p_entity_name: data.leave_types?.name || 'Leave',
        p_description: 'Leave request submitted: ' + data.total_days + ' days'
      })
    } catch (auditError) {
      console.error('Audit log error (non-critical):', auditError.message)
    }
    
    return { success: true, data }
  },

  updateLeaveRequest: async (id, updates) => {
    const { data, error } = await hrApi.updateLeaveRequest(id, updates)
    if (error) return { success: false, error: error.message }
    set(state => ({
      leaveRequests: (state.leaveRequests || []).map(lr => lr.id === id ? data : lr)
    }))
    
    // AUDIT: Log leave status change
    try {
      await supabase.rpc('log_audit', {
        p_module: 'HR Management',
        p_action: 'Leave ' + (updates.status || 'Updated'),
        p_entity_type: 'Leave',
        p_entity_name: data.leave_types?.name || 'Leave',
        p_description: 'Leave request ' + (updates.status || 'updated')
      })
    } catch (auditError) {
      console.error('Audit log error (non-critical):', auditError.message)
    }
    
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
    
    // AUDIT: Log training record
    try {
      await supabase.rpc('log_audit', {
        p_module: 'HR Management',
        p_action: 'Training Added',
        p_entity_type: 'Training',
        p_entity_name: data.training_name,
        p_description: 'Training record added: ' + data.training_name
      })
    } catch (auditError) {
      console.error('Audit log error (non-critical):', auditError.message)
    }
    
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
    
    // AUDIT: Log disciplinary record
    try {
      await supabase.rpc('log_audit', {
        p_module: 'HR Management',
        p_action: 'Disciplinary Action',
        p_entity_type: 'Disciplinary',
        p_entity_name: data.incident_type,
        p_description: 'Disciplinary record added: ' + data.incident_type
      })
    } catch (auditError) {
      console.error('Audit log error (non-critical):', auditError.message)
    }
    
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
