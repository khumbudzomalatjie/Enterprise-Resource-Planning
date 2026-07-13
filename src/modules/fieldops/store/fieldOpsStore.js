import { create } from 'zustand'
import { fieldOpsApi } from '../api/fieldOpsApi'
import toast from 'react-hot-toast'

const useFieldOpsStore = create((set, get) => ({
  liveJobs: [],
  myAssignedJobs: [],
  assignedEmployees: [],
  incidents: [],
  selectedIncident: null,
  jobAuditData: null,
  availableEmployees: [],
  stats: {},
  loading: false,
  error: null,

  // Live Jobs
  fetchLiveJobs: async () => {
    set({ loading: true, error: null })
    const { data, error } = await fieldOpsApi.getLiveJobs()
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ liveJobs: data || [], loading: false })
    return { success: true, data }
  },

  fetchMyAssignedJobs: async (userId) => {
    if (!userId) return { success: false, data: [] }
    try {
      const { supabase } = await import('../../../lib/supabaseClient')
      const { data: employee } = await supabase.from('employees').select('id').eq('user_id', userId).single()
      if (!employee) return { success: false, data: [] }
      const { data, error } = await fieldOpsApi.getLiveJobsByEmployee(employee.id)
      if (error) return { success: false }
      set({ myAssignedJobs: data || [] })
      return { success: true, data }
    } catch (err) {
      console.error('fetchMyAssignedJobs error:', err)
      return { success: false }
    }
  },

  fetchAssignedEmployees: async (jobId) => {
    const { data, error } = await fieldOpsApi.getAssignedEmployees(jobId)
    if (error) return { success: false }
    set({ assignedEmployees: data || [] })
    return { success: true, data }
  },

  assignEmployee: async (jobId, employeeId, teamId) => {
    set({ error: null })
    const { data, error } = await fieldOpsApi.assignEmployeeToJob(jobId, employeeId, teamId)
    if (error) { set({ error: error.message }); return { success: false, error: error.message } }
    await get().fetchLiveJobs()
    toast.success('Employee assigned!')
    return { success: true, data }
  },

  releaseEmployee: async (assignmentId, reason = '') => {
    set({ error: null })
    const { data, error } = await fieldOpsApi.releaseEmployeeFromJob(assignmentId, reason)
    if (error) { set({ error: error.message }); return { success: false, error: error.message } }
    await get().fetchLiveJobs()
    toast.success('Employee released')
    return { success: true, data }
  },

  bulkAssign: async (jobId, employeeIds, teamId) => {
    const { data, error } = await fieldOpsApi.bulkAssignEmployees(jobId, employeeIds, teamId)
    if (error) return { success: false, error: error.message }
    await get().fetchLiveJobs()
    return { success: true, data }
  },

  // ✅ FIXED: Works without employeeId
  updateJobStatus: async (jobId, status, employeeId = null) => {
    set({ error: null })
    const { data, error } = await fieldOpsApi.updateJobStatus(jobId, status, employeeId)
    if (error) {
      console.error('Update job status error:', error)
      set({ error: error.message })
      return { success: false, error: error.message }
    }
    await get().fetchLiveJobs()
    if (status === 'completed') toast.success('Job completed!')
    if (status === 'in_progress') toast.success('Job started!')
    return { success: true, data }
  },

  syncJobFromMobile: async (jobId, syncData) => {
    set({ loading: true, error: null })
    const result = await fieldOpsApi.syncJobWithMobile(jobId, syncData)
    if (result.error) { set({ error: result.error, loading: false }); return { success: false, error: result.error } }
    await get().fetchLiveJobs()
    set({ loading: false })
    return { success: true, data: result.job }
  },

  fetchMobileSyncData: async (employeeId) => {
    const data = await fieldOpsApi.getMobileSyncData(employeeId)
    return data
  },

  // Incidents
  fetchIncidents: async (filters = {}) => {
    set({ loading: true })
    const { data, error } = await fieldOpsApi.getIncidents(filters)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ incidents: data || [], loading: false })
    return { success: true, data }
  },

  fetchIncident: async (id) => {
    const { data, error } = await fieldOpsApi.getIncident(id)
    if (error) return { success: false }
    set({ selectedIncident: data })
    return { success: true, data }
  },

  createIncident: async (incidentData) => {
    set({ loading: true, error: null })
    const { data, error } = await fieldOpsApi.createIncident(incidentData)
    if (error) { set({ error: error.message, loading: false }); return { success: false, error: error.message } }
    set(state => ({ incidents: [data, ...(state.incidents || [])], loading: false }))
    toast.success('Incident reported!')
    return { success: true, data }
  },

  updateIncident: async (id, updates) => {
    const { data, error } = await fieldOpsApi.updateIncident(id, updates)
    if (error) return { success: false, error: error.message }
    set(state => ({ incidents: state.incidents.map(i => i.id === id ? data : i) }))
    return { success: true, data }
  },

  // Job Tracker
  fetchJobAuditTrail: async (searchInput) => {
    set({ loading: true, error: null, jobAuditData: null })
    const result = await fieldOpsApi.getJobAuditTrail(searchInput)
    if (result.notFound || result.error) {
      set({ error: result.error, loading: false })
      return { success: false, error: result.error }
    }
    set({ jobAuditData: result.data, loading: false })
    return { success: true, data: result.data }
  },

  // Stats
  fetchFieldOpsStats: async () => {
    const stats = await fieldOpsApi.getFieldOpsStats()
    set({ stats })
    return stats
  },

  clearError: () => set({ error: null }),
  clearAuditData: () => set({ jobAuditData: null }),
}))

export default useFieldOpsStore
