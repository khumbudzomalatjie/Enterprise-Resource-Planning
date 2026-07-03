import { create } from 'zustand'
import { mobileApi } from '../api/mobileApi'

const useMobileStore = create((set, get) => ({
  employee: null,
  openJobs: [],
  myJobs: [],
  selectedJob: null,
  attendance: null,
  leaveRequests: [],
  leaveTypes: [],
  messages: [],
  notifications: [],
  stats: {},
  loading: false,

  init: async (userId) => {
    set({ loading: true })
    const { data: employee } = await mobileApi.getEmployee(userId)
    if (employee) {
      set({ employee })
      await Promise.all([
        get().fetchOpenJobs(),
        get().fetchMyJobs(employee.id),
        get().fetchAttendance(employee.id),
        get().fetchStats(employee.id),
      ])
    }
    set({ loading: false })
  },

  fetchOpenJobs: async () => {
    const { data } = await mobileApi.getOpenJobs()
    set({ openJobs: data })
  },

  fetchMyJobs: async (employeeId) => {
    if (!employeeId) return
    const { data } = await mobileApi.getMyJobs(employeeId)
    set({ myJobs: data })
  },

  fetchJobDetail: async (jobId) => {
    const { data } = await mobileApi.getJobDetail(jobId)
    set({ selectedJob: data })
    return data
  },

  selectJob: async (jobId, employeeId) => {
    const result = await mobileApi.selectJob(jobId, employeeId)
    if (result.success) await Promise.all([get().fetchOpenJobs(), get().fetchMyJobs(employeeId)])
    return result
  },

  startJob: async (jobId, employeeId) => {
    const result = await mobileApi.startJob(jobId, employeeId)
    if (result.success) await get().fetchMyJobs(employeeId)
    return result
  },

  completeJob: async (jobId, employeeId) => {
    const result = await mobileApi.completeJob(jobId, employeeId)
    if (result.success) await Promise.all([get().fetchOpenJobs(), get().fetchMyJobs(employeeId)])
    return result
  },

  clockIn: async (employeeId, lat, lng) => {
    await mobileApi.clockIn(employeeId, lat, lng)
    await get().fetchAttendance(employeeId)
    await get().fetchStats(employeeId)
  },

  clockOut: async (employeeId, lat, lng) => {
    await mobileApi.clockOut(employeeId, lat, lng)
    await get().fetchAttendance(employeeId)
    await get().fetchStats(employeeId)
  },

  fetchAttendance: async (employeeId) => {
    const { data } = await mobileApi.getTodayAttendance(employeeId)
    set({ attendance: data })
  },

  uploadPhoto: async (jobId, employeeId, file, type, caption) => {
    return await mobileApi.uploadPhoto(jobId, employeeId, file, type, caption)
  },

  reportIncident: async (data) => {
    return await mobileApi.reportIncident(data)
  },

  saveJobReport: async (data) => {
    return await mobileApi.saveJobReport(data)
  },

  getJobReport: async (jobId, employeeId) => {
    return await mobileApi.getJobReport(jobId, employeeId)
  },

  fetchLeaveRequests: async (employeeId) => {
    const { data } = await mobileApi.getLeaveRequests(employeeId)
    set({ leaveRequests: data })
  },

  fetchLeaveTypes: async () => {
    const { data } = await mobileApi.getLeaveTypes()
    set({ leaveTypes: data })
  },

  applyLeave: async (data) => {
    return await mobileApi.applyLeave(data)
  },

  fetchMessages: async (userId) => {
    const { data } = await mobileApi.getMessages(userId)
    set({ messages: data })
  },

  sendMessage: async (data) => {
    return await mobileApi.sendMessage(data)
  },

  fetchNotifications: async (userId) => {
    const { data } = await mobileApi.getNotifications(userId)
    set({ notifications: data })
  },

  markNotificationRead: async (id) => {
    await mobileApi.markNotificationRead(id)
  },

  fetchStats: async (employeeId) => {
    const stats = await mobileApi.getMobileStats(employeeId)
    set({ stats })
  },

  setSelectedJob: (job) => set({ selectedJob: job }),
  clearError: () => set({ error: null }),
}))

export default useMobileStore
