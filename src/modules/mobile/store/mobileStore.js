import { create } from 'zustand'
import { mobileApi } from '../api/mobileApi'

const useMobileStore = create((set, get) => ({
  openJobs: [],
  myJobs: [],
  selectedJob: null,
  jobTasks: [],
  myProfile: null,
  stats: {},
  loading: false,
  error: null,

  fetchOpenJobs: async () => {
    set({ loading: true })
    const { data, error } = await mobileApi.getOpenJobs()
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ openJobs: data || [], loading: false })
    return { success: true, data }
  },

  fetchMyJobs: async (employeeId) => {
    if (!employeeId) return { success: false }
    set({ loading: true })
    const { data, error } = await mobileApi.getMyJobs(employeeId)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ myJobs: data || [], loading: false })
    return { success: true, data }
  },

  selectJob: async (jobId, employeeId) => {
    const result = await mobileApi.selectJob(jobId, employeeId)
    if (!result.success) return result
    await Promise.all([get().fetchOpenJobs(), get().fetchMyJobs(employeeId)])
    return result
  },

  startJob: async (jobId, employeeId, lat, lng) => {
    const result = await mobileApi.startJob(jobId, employeeId, lat, lng)
    if (!result.success) return result
    await get().fetchMyJobs(employeeId)
    return result
  },

  completeJob: async (jobId, employeeId) => {
    const result = await mobileApi.completeJob(jobId, employeeId)
    if (!result.success) return result
    await Promise.all([get().fetchOpenJobs(), get().fetchMyJobs(employeeId)])
    return result
  },

  setSelectedJob: (job) => set({ selectedJob: job }),

  clockIn: async (employeeId, jobId, lat, lng) => {
    const result = await mobileApi.clockIn(employeeId, jobId, lat, lng)
    return result
  },

  clockOut: async (employeeId) => {
    const result = await mobileApi.clockOut(employeeId)
    return result
  },

  uploadPhoto: async (jobId, employeeId, file, photoType, caption) => {
    const { data, error } = await mobileApi.uploadJobPhoto(jobId, employeeId, file, photoType, caption)
    if (error) return { success: false, error }
    return { success: true, data }
  },

  saveSignature: async (jobId, signatureUrl, clientName, rating) => {
    const { data, error } = await mobileApi.saveSignature(jobId, signatureUrl, clientName, rating)
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  },

  fetchJobTasks: async (jobId) => {
    const { data, error } = await mobileApi.getJobTasks(jobId)
    if (error) return { success: false }
    set({ jobTasks: data || [] })
    return { success: true, data }
  },

  updateTaskItem: async (id, updates) => {
    const { data, error } = await mobileApi.updateTaskItem(id, updates)
    if (error) return { success: false }
    set(state => ({ jobTasks: state.jobTasks.map(t => t.id === id ? data : t) }))
    return { success: true }
  },

  fetchMyProfile: async (userId) => {
    const { data, error } = await mobileApi.getMyProfile(userId)
    if (error) return { success: false }
    set({ myProfile: data })
    return { success: true, data }
  },

  fetchMobileStats: async (employeeId) => {
    const stats = await mobileApi.getMobileStats(employeeId)
    set({ stats })
    return stats
  },

  clearError: () => set({ error: null }),
}))

export default useMobileStore
