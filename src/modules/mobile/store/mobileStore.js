import { create } from 'zustand'
import { mobileApi } from '../api/mobileApi'

const useMobileStore = create((set, get) => ({
  employee: null,
  openJobs: [],
  myJobs: [],
  completedJobs: [],
  selectedJob: null,
  attendance: null,
  weeklyAttendance: [],
  leaveRequests: [],
  leaveTypes: [],
  leaveBalances: [],
  messages: [],
  notifications: [],
  stats: {},
  loading: false,
  error: null,

  init: async (userId) => {
    set({ loading: true })
    const { data: employee } = await mobileApi.getEmployee(userId)
    if (employee) {
      set({ employee })
      // Register device
      await mobileApi.registerDevice(userId, employee.id, {
        device_type: 'web', device_name: navigator.userAgent, device_os: navigator.platform, app_version: '1.0.0'
      })
      await Promise.all([
        get().fetchOpenJobs(), get().fetchMyJobs(employee.id), get().fetchCompletedJobs(employee.id),
        get().fetchAttendance(employee.id), get().fetchWeeklyAttendance(employee.id),
        get().fetchNotifications(userId), get().fetchStats(employee.id),
        get().fetchLeaveTypes(), get().fetchLeaveBalances(employee.id), get().fetchLeaveRequests(employee.id)
      ])
    }
    set({ loading: false })
  },

  fetchOpenJobs: async () => { const { data } = await mobileApi.getOpenJobs(); set({ openJobs: data }) },
  fetchMyJobs: async (eid) => { if (!eid) return; const { data } = await mobileApi.getMyJobs(eid); set({ myJobs: data }) },
  fetchCompletedJobs: async (eid) => { if (!eid) return; const { data } = await mobileApi.getCompletedJobs(eid); set({ completedJobs: data }) },
  fetchJobDetail: async (jobId) => { const { data } = await mobileApi.getJobDetail(jobId); set({ selectedJob: data }); return data },

  selectJob: async (jobId, eid) => { const r = await mobileApi.selectJob(jobId, eid); if (r.success) await Promise.all([get().fetchOpenJobs(), get().fetchMyJobs(eid)]); return r },
  startJob: async (jobId, eid, lat, lng) => { const r = await mobileApi.startJob(jobId, eid, lat, lng); if (r.success) await get().fetchMyJobs(eid); return r },
  completeJob: async (jobId, eid, lat, lng) => { const r = await mobileApi.completeJob(jobId, eid, lat, lng); if (r.success) await Promise.all([get().fetchOpenJobs(), get().fetchMyJobs(eid), get().fetchCompletedJobs(eid)]); return r },

  clockIn: async (eid, lat, lng) => { await mobileApi.clockIn(eid, lat, lng); await Promise.all([get().fetchAttendance(eid), get().fetchWeeklyAttendance(eid), get().fetchStats(eid)]) },
  clockOut: async (eid, lat, lng) => { await mobileApi.clockOut(eid, lat, lng); await Promise.all([get().fetchAttendance(eid), get().fetchWeeklyAttendance(eid), get().fetchStats(eid)]) },
  fetchAttendance: async (eid) => { const { data } = await mobileApi.getTodayAttendance(eid); set({ attendance: data }) },
  fetchWeeklyAttendance: async (eid) => { const { data } = await mobileApi.getWeeklyAttendance(eid); set({ weeklyAttendance: data }) },

  uploadPhoto: async (jobId, eid, file, type, caption) => await mobileApi.uploadPhoto(jobId, eid, file, type, caption),
  reportIncident: async (data) => await mobileApi.reportIncident(data),
  saveJobReport: async (data) => await mobileApi.saveJobReport(data),
  getJobReport: async (jobId, eid) => await mobileApi.getJobReport(jobId, eid),

  fetchLeaveRequests: async (eid) => { const { data } = await mobileApi.getLeaveRequests(eid); set({ leaveRequests: data }) },
  fetchLeaveTypes: async () => { const { data } = await mobileApi.getLeaveTypes(); set({ leaveTypes: data }) },
  fetchLeaveBalances: async (eid) => { const { data } = await mobileApi.getLeaveBalances(eid); set({ leaveBalances: data }) },
  applyLeave: async (data) => await mobileApi.applyLeave(data),

  fetchMessages: async (userId) => { const { data } = await mobileApi.getMessages(userId); set({ messages: data }) },
  sendMessage: async (data) => await mobileApi.sendMessage(data),

  fetchNotifications: async (userId) => { const { data } = await mobileApi.getNotifications(userId); set({ notifications: data }) },
  markNotificationRead: async (id) => { await mobileApi.markNotificationRead(id); set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, is_read: true } : n) })) },
  markAllNotificationsRead: async (userId) => { await mobileApi.markAllNotificationsRead(userId); set(s => ({ notifications: s.notifications.map(n => ({ ...n, is_read: true })) })) },

  fetchStats: async (eid) => { const stats = await mobileApi.getMobileStats(eid); set({ stats }) },
  setSelectedJob: (job) => set({ selectedJob: job }),
  clearError: () => set({ error: null }),
}))

export default useMobileStore
