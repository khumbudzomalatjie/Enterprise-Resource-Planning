import { create } from 'zustand'
import { attendanceApi } from '../api/attendanceApi'
import toast from 'react-hot-toast'

const useAttendanceStore = create((set, get) => ({
  attendanceRecords: [],
  todayAttendance: null,
  timesheetStats: {},
  shiftTemplates: [],
  shiftAssignments: [],
  shiftSwaps: [],
  selectedRecord: null,
  loading: false,
  error: null,

  // Attendance
  fetchAttendanceRecords: async (filters = {}) => {
    set({ loading: true, error: null })
    const { data, error } = await attendanceApi.getAttendanceRecords(filters)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ attendanceRecords: data || [], loading: false })
    return { success: true, data }
  },

  fetchTodayAttendance: async () => {
    const { data, error } = await attendanceApi.getTodayAttendance()
    if (error) return { success: false }
    set({ todayAttendance: data || [] })
    return { success: true, data }
  },

  clockIn: async (employeeId, clockData = {}) => {
    const { data, error } = await attendanceApi.clockIn(employeeId, clockData)
    if (error) return { success: false, error: error.message }
    toast.success('Clocked in successfully!')
    await get().fetchTodayAttendance()
    return { success: true, data }
  },

  clockOut: async (employeeId, clockData = {}) => {
    const { data, error } = await attendanceApi.clockOut(employeeId, clockData)
    if (error) return { success: false, error: error.message }
    toast.success('Clocked out successfully!')
    await get().fetchTodayAttendance()
    return { success: true, data }
  },

  updateAttendance: async (id, updates) => {
    const { data, error } = await attendanceApi.updateAttendance(id, updates)
    if (error) return { success: false, error: error.message }
    set(state => ({ attendanceRecords: state.attendanceRecords.map(r => r.id === id ? data : r) }))
    toast.success('Updated!')
    return { success: true, data }
  },

  setSelectedRecord: (record) => set({ selectedRecord: record }),

  // Timesheet Stats
  fetchTimesheetStats: async () => {
    const stats = await attendanceApi.getTimesheetStats()
    set({ timesheetStats: stats })
    return stats
  },

  // Shifts
  fetchShiftTemplates: async () => {
    const { data, error } = await attendanceApi.getShiftTemplates()
    if (error) return { success: false }
    set({ shiftTemplates: data || [] })
    return { success: true, data }
  },

  createShiftTemplate: async (templateData) => {
    const { data, error } = await attendanceApi.createShiftTemplate(templateData)
    if (error) return { success: false, error: error.message }
    set(state => ({ shiftTemplates: [...state.shiftTemplates, data] }))
    toast.success('Shift template created!')
    return { success: true, data }
  },

  updateShiftTemplate: async (id, updates) => {
    const { data, error } = await attendanceApi.updateShiftTemplate(id, updates)
    if (error) return { success: false }
    set(state => ({ shiftTemplates: state.shiftTemplates.map(s => s.id === id ? data : s) }))
    return { success: true }
  },

  fetchShiftAssignments: async (filters = {}) => {
    set({ loading: true })
    const { data, error } = await attendanceApi.getShiftAssignments(filters)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ shiftAssignments: data || [], loading: false })
    return { success: true, data }
  },

  assignShift: async (shiftData) => {
    const { data, error } = await attendanceApi.assignShift(shiftData)
    if (error) return { success: false, error: error.message }
    set(state => ({ shiftAssignments: [data, ...state.shiftAssignments] }))
    toast.success('Shift assigned!')
    return { success: true, data }
  },

  bulkAssignShifts: async (assignments) => {
    const { data, error } = await attendanceApi.bulkAssignShifts(assignments)
    if (error) return { success: false }
    set(state => ({ shiftAssignments: [...data, ...state.shiftAssignments] }))
    toast.success(`${data.length} shifts assigned!`)
    return { success: true }
  },

  updateShiftAssignment: async (id, updates) => {
    const { data, error } = await attendanceApi.updateShiftAssignment(id, updates)
    if (error) return { success: false }
    set(state => ({ shiftAssignments: state.shiftAssignments.map(s => s.id === id ? data : s) }))
    return { success: true }
  },

  // Shift Swaps
  requestShiftSwap: async (swapData) => {
    const { data, error } = await attendanceApi.requestShiftSwap(swapData)
    if (error) return { success: false }
    set(state => ({ shiftSwaps: [data, ...state.shiftSwaps] }))
    toast.success('Swap requested!')
    return { success: true, data }
  },

  updateShiftSwap: async (id, updates) => {
    const { data, error } = await attendanceApi.updateShiftSwap(id, updates)
    if (error) return { success: false }
    set(state => ({ shiftSwaps: state.shiftSwaps.map(s => s.id === id ? data : s) }))
    return { success: true }
  },

  fetchShiftSwaps: async (filters = {}) => {
    const { data, error } = await attendanceApi.getShiftSwaps(filters)
    if (error) return { success: false }
    set({ shiftSwaps: data || [] })
    return { success: true }
  },

  clearError: () => set({ error: null }),
}))

export default useAttendanceStore
