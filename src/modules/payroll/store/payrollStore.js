import { create } from 'zustand'
import { payrollApi } from '../api/payrollApi'

const usePayrollStore = create((set, get) => ({
  // State
  employees: [],
  selectedEmployee: null,
  payrollProfiles: [],
  salaryStructures: [],
  payslips: [],
  selectedPayslip: null,
  payrollRuns: [],
  currentRun: null,
  overtimeRecords: [],
  payrollPeriods: [],
  currentPeriod: null,
  taxBrackets: [],
  earningTypes: [],
  deductionTypes: [],
  employeeEarnings: [],
  employeeDeductions: [],
  leaveBalances: [],
  attendanceRecords: [],
  bonusRecords: [],
  auditLogs: [],
  notifications: [],
  stats: {},
  loading: false,
  error: null,

  // Employee Actions
  fetchEmployees: async (filters = {}) => {
    set({ loading: true })
    const { data, error } = await payrollApi.getEmployees(filters)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ employees: data || [], loading: false })
    return { success: true, data }
  },

  fetchEmployee: async (id) => {
    const { data, error } = await payrollApi.getEmployee(id)
    if (error) return { success: false }
    set({ selectedEmployee: data })
    return { success: true, data }
  },

  // Payroll Profile Actions
  fetchPayrollProfile: async (employeeId) => {
    const { data, error } = await payrollApi.getPayrollProfile(employeeId)
    if (error) return { success: false }
    set(state => ({ payrollProfiles: [...state.payrollProfiles.filter(p => p.employee_id !== employeeId), data] }))
    return { success: true, data }
  },

  createPayrollProfile: async (profileData) => {
    const { data, error } = await payrollApi.createPayrollProfile(profileData)
    if (error) return { success: false, error: error.message }
    set(state => ({ payrollProfiles: [data, ...state.payrollProfiles] }))
    return { success: true, data }
  },

  updatePayrollProfile: async (id, updates) => {
    const { data, error } = await payrollApi.updatePayrollProfile(id, updates)
    if (error) return { success: false }
    set(state => ({ payrollProfiles: state.payrollProfiles.map(p => p.id === id ? data : p) }))
    return { success: true }
  },

  // Earning Type Actions
  fetchEarningTypes: async () => {
    const { data } = await payrollApi.getEarningTypes()
    set({ earningTypes: data || [] })
    return data
  },

  createEarningType: async (earningData) => {
    const { data, error } = await payrollApi.createEarningType(earningData)
    if (error) return { success: false }
    set(state => ({ earningTypes: [data, ...state.earningTypes] }))
    return { success: true, data }
  },

  // Deduction Type Actions
  fetchDeductionTypes: async () => {
    const { data } = await payrollApi.getDeductionTypes()
    set({ deductionTypes: data || [] })
    return data
  },

  createDeductionType: async (deductionData) => {
    const { data, error } = await payrollApi.createDeductionType(deductionData)
    if (error) return { success: false }
    set(state => ({ deductionTypes: [data, ...state.deductionTypes] }))
    return { success: true, data }
  },

  // Employee Earnings
  fetchEmployeeEarnings: async (profileId) => {
    const { data } = await payrollApi.getEmployeeEarnings(profileId)
    set({ employeeEarnings: data || [] })
    return data
  },

  addEmployeeEarning: async (earningData) => {
    const { data, error } = await payrollApi.addEmployeeEarning(earningData)
    if (error) return { success: false }
    set(state => ({ employeeEarnings: [data, ...state.employeeEarnings] }))
    return { success: true, data }
  },

  // Employee Deductions
  fetchEmployeeDeductions: async (profileId) => {
    const { data } = await payrollApi.getEmployeeDeductions(profileId)
    set({ employeeDeductions: data || [] })
    return data
  },

  addEmployeeDeduction: async (deductionData) => {
    const { data, error } = await payrollApi.addEmployeeDeduction(deductionData)
    if (error) return { success: false }
    set(state => ({ employeeDeductions: [data, ...state.employeeDeductions] }))
    return { success: true, data }
  },

  // Payroll Run Actions
  fetchPayrollRuns: async () => {
    const { data } = await payrollApi.getPayrollRuns()
    set({ payrollRuns: data || [] })
    return data
  },

  createPayrollRun: async (runData) => {
    const { data, error } = await payrollApi.createPayrollRun(runData)
    if (error) return { success: false, error: error.message }
    set(state => ({ payrollRuns: [data, ...state.payrollRuns], currentRun: data }))
    return { success: true, data }
  },

  processPayroll: async (runId) => {
    set({ loading: true })
    const { data, error } = await payrollApi.processPayroll(runId)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ currentRun: data, loading: false })
    return { success: true, data }
  },

  approvePayroll: async (runId) => {
    const { data, error } = await payrollApi.approvePayroll(runId)
    if (error) return { success: false }
    set(state => ({ payrollRuns: state.payrollRuns.map(r => r.id === runId ? data : r) }))
    return { success: true }
  },

  // Payslip Actions
  fetchPayslips: async (filters = {}) => {
    set({ loading: true })
    const { data, error } = await payrollApi.getPayslips(filters)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ payslips: data || [], loading: false })
    return { success: true, data }
  },

  fetchPayslip: async (id) => {
    const { data, error } = await payrollApi.getPayslip(id)
    if (error) return { success: false }
    set({ selectedPayslip: data })
    return { success: true, data }
  },

  generatePayslip: async (runId, employeeId) => {
    const { data, error } = await payrollApi.generatePayslip(runId, employeeId)
    if (error) return { success: false }
    return { success: true, data }
  },

  // Leave Balance Actions
  fetchLeaveBalances: async (employeeId) => {
    const { data } = await payrollApi.getLeaveBalances(employeeId)
    set({ leaveBalances: data || [] })
    return data
  },

  // Attendance Actions
  fetchAttendanceRecords: async (employeeId, dateFrom, dateTo) => {
    const { data } = await payrollApi.getAttendanceRecords(employeeId, dateFrom, dateTo)
    set({ attendanceRecords: data || [] })
    return data
  },

  // Audit Actions
  fetchAuditLogs: async (filters = {}) => {
    const { data } = await payrollApi.getAuditLogs(filters)
    set({ auditLogs: data || [] })
    return data
  },

  // Stats
  fetchPayrollStats: async () => {
    const stats = await payrollApi.getPayrollStats()
    set({ stats })
    return stats
  },

  clearError: () => set({ error: null }),
}))

export default usePayrollStore
