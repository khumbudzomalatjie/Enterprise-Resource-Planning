import { create } from 'zustand'
import { mobileApi } from '../api/mobileApi'

const useMobileStore = create((set, get) => ({
  myJobs: [],
  selectedJob: null,
  jobTasks: [],
  myProfile: null,
  stats: {},
  loading: false,
  error: null,

  fetchMyJobs: async (employeeId, date = null) => {
    set({ loading: true })
    const { data, error } = await mobileApi.getMyJobs(employeeId, date)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ myJobs: data || [], loading: false })
    return { success: true, data }
  },

  setSelectedJob: (job) => set({ selectedJob: job }),

  clockIn: async (employeeId, jobId, lat, lng) => {
    const { data, error } = await mobileApi.clockIn(employeeId, jobId, lat, lng)
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  },

  clockOut: async (employeeId) => {
    const { data, error } = await mobileApi.clockOut(employeeId)
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  },

  uploadPhoto: async (jobId, employeeId, file, photoType, caption) => {
    const { data, error } = await mobileApi.uploadJobPhoto(jobId, employeeId, file, photoType, caption)
    if (error) return { success: false, error: error.message }
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

  createSuppliesRequest: async (requestData, items) => {
    const result = await mobileApi.createSuppliesRequest(requestData, items)
    if (result.error) return { success: false }
    return { success: true, data: result.data }
  },

  reportIncident: async (incidentData) => {
    const { data, error } = await mobileApi.reportIncident(incidentData)
    if (error) return { success: false }
    return { success: true, data }
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
