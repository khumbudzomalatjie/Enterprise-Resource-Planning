import { create } from 'zustand'
import { jobManagementApi } from '../api/jobManagementApi'
import toast from 'react-hot-toast'

const useJobManagementStore = create((set, get) => ({
  jobs: [],
  selectedJob: null,
  editingJob: null,              // ✅ full job + items for editor
  jobHistory: [],
  teams: [],
  employees: [],
  availableServices: [],         // ✅ services picker source
  stats: {},
  loading: false,
  error: null,

  fetchJobs: async (filters = {}) => {
    set({ loading: true, error: null })
    const { data, error } = await jobManagementApi.getJobs(filters)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ jobs: data || [], loading: false })
    return { success: true, data }
  },

  fetchJob: async (id) => {
    const { data, error } = await jobManagementApi.getJob(id)
    if (error) return { success: false }
    set({ selectedJob: data })
    return { success: true, data }
  },

  // ✅ NEW: search by number
  searchByJobNumber: async (query) => {
    const { data, error } = await jobManagementApi.searchByJobNumber(query)
    if (error) return { success: false, error: error.message, data: [] }
    return { success: true, data: data || [] }
  },

  // ✅ NEW: load full job for editing
  loadJobForEditing: async (jobId) => {
    set({ loading: true })
    const { data, error } = await jobManagementApi.getJobWithItems(jobId)
    set({ loading: false })
    if (error) return { success: false, error: error.message }
    set({ editingJob: data })
    return { success: true, data }
  },

  clearEditingJob: () => set({ editingJob: null }),

  // ✅ NEW: services picker source
  fetchAvailableServices: async () => {
    const { data, error } = await jobManagementApi.getAvailableServices()
    if (error) return { success: false }
    set({ availableServices: data || [] })
    return { success: true, data }
  },

  // ✅ NEW: save full job
  saveFullJob: async (jobId, payload, currentUser) => {
    const result = await jobManagementApi.saveFullJob(jobId, payload, currentUser)
    if (result.error) return { success: false, error: result.error.message || 'Save failed' }
    toast.success('Job updated successfully!')
    await get().fetchJobs()
    await get().fetchStats()
    return { success: true }
  },

  fetchJobHistory: async (jobId) => {
    const { data, error } = await jobManagementApi.getJobHistory(jobId)
    if (error) return { success: false }
    set({ jobHistory: data || [] })
    return { success: true, data }
  },

  fetchStats: async () => {
    const stats = await jobManagementApi.getJobStats()
    set({ stats })
    return stats
  },

  fetchTeams: async () => {
    const teams = await jobManagementApi.getTeams()
    set({ teams })
  },

  fetchEmployees: async () => {
    const employees = await jobManagementApi.getEmployees()
    set({ employees })
  },

  editJob: async (jobId, updates, currentUser) => {
    const result = await jobManagementApi.editJob(jobId, updates, currentUser)
    if (result.error) return { success: false, error: result.error.message || 'Edit failed' }
    toast.success('Job updated!')
    get().fetchJobs()
    return { success: true }
  },

  rescheduleJob: async (jobId, data, currentUser) => {
    const result = await jobManagementApi.rescheduleJob(jobId, data, currentUser)
    if (result.error) return { success: false, error: result.error.message || 'Reschedule failed' }
    toast.success('Job rescheduled!')
    get().fetchJobs()
    get().fetchStats()
    return { success: true }
  },

  postponeJob: async (jobId, data, currentUser) => {
    const result = await jobManagementApi.postponeJob(jobId, data, currentUser)
    if (result.error) return { success: false, error: result.error.message || 'Postpone failed' }
    toast.success('Job postponed!')
    get().fetchJobs()
    get().fetchStats()
    return { success: true }
  },

  reassignJob: async (jobId, data, currentUser) => {
    const result = await jobManagementApi.reassignJob(jobId, data, currentUser)
    if (result.error) return { success: false, error: result.error.message || 'Reassign failed' }
    toast.success('Job reassigned!')
    get().fetchJobs()
    return { success: true }
  },

  changePriority: async (jobId, newPriority, currentUser) => {
    const result = await jobManagementApi.changePriority(jobId, newPriority, currentUser)
    if (result.error) return { success: false, error: result.error.message || 'Priority change failed' }
    toast.success('Priority updated!')
    get().fetchJobs()
    return { success: true }
  },

  cancelJob: async (jobId, data, currentUser) => {
    const result = await jobManagementApi.cancelJob(jobId, data, currentUser)
    if (result.error) return { success: false, error: result.error.message || 'Cancel failed' }
    toast.success('Job cancelled!')
    get().fetchJobs()
    get().fetchStats()
    return { success: true }
  },

  clearError: () => set({ error: null }),
}))

export default useJobManagementStore
