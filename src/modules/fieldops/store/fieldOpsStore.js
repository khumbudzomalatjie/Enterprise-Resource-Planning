import { create } from 'zustand'
import { fieldOpsApi } from '../api/fieldOpsApi'
import toast from 'react-hot-toast'

const useFieldOpsStore = create((set, get) => ({
  liveJobs: [],
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

  updateJobStatus: async (jobId, status) => {
    const { data, error } = await fieldOpsApi.updateJobStatus(jobId, status)
    if (error) return { success: false, error: error.message }
    await get().fetchLiveJobs()
    return { success: true, data }
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

  resolveIncident: async (id, resolution) => {
    const { data, error } = await fieldOpsApi.resolveIncident(id, resolution)
    if (error) return { success: false, error: error.message }
    set(state => ({ incidents: state.incidents.map(i => i.id === id ? data : i) }))
    return { success: true, data }
  },

  // Job Tracker - Simple search
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
