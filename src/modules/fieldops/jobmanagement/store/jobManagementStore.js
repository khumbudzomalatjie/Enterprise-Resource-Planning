import { create } from 'zustand'
import { jobManagementApi } from '../api/jobManagementApi'
import toast from 'react-hot-toast'

const useJobManagementStore = create((set, get) => ({
  jobs: [],
  selectedJob: null,
  jobHistory: [],
  teams: [],
  employees: [],
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
    if (result.error) return { success: false, error: result.error }
    toast.success('Job updated!')
    get().fetchJobs()
    return { success: true }
  },

  rescheduleJob: async (jobId, data, currentUser) => {
    const result = await jobManagementApi.rescheduleJob(jobId, data, currentUser)
    if (result.error) return { success: false, error: result.error }
    toast.success('Job rescheduled!')
    get().fetchJobs()
    get().fetchStats()
    return { success: true }
  },

  postponeJob: async (jobId, data, currentUser) => {
    const result = await jobManagementApi.postponeJob(jobId, data, currentUser)
    if (result.error) return { success: false, error: result.error }
    toast.success('Job postponed!')
    get().fetchJobs()
    get().fetchStats()
    return { success: true }
  },

  reassignJob: async (jobId, data, currentUser) => {
    const result = await jobManagementApi.reassignJob(jobId, data, currentUser)
    if (result.error) return { success: false, error: result.error }
    toast.success('Job reassigned!')
    get().fetchJobs()
    return { success: true }
  },

  changePriority: async (jobId, newPriority, currentUser) => {
    const result = await jobManagementApi.changePriority(jobId, newPriority, currentUser)
    if (result.error) return { success: false, error: result.error }
    toast.success('Priority updated!')
    get().fetchJobs()
    return { success: true }
  },

  cancelJob: async (jobId, data, currentUser) => {
    const result = await jobManagementApi.cancelJob(jobId, data, currentUser)
    if (result.error) return { success: false, error: result.error }
    toast.success('Job cancelled!')
    get().fetchJobs()
    get().fetchStats()
    return { success: true }
  },

  clearError: () => set({ error: null }),
}))

export default useJobManagementStore
