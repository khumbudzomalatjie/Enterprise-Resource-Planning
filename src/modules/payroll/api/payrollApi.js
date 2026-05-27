import { supabase } from '../../../lib/supabaseClient'

export const payrollApi = {
  // Salary Structures
  async getSalaryStructures(filters = {}) {
    let query = supabase
      .from('salary_structures')
      .select('*, employees(first_name, last_name, employee_code)')
      .order('created_at', { ascending: false })

    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.is_active !== undefined) query = query.eq('is_active', filters.is_active)

    const { data, error } = await query
    return { data, error }
  },

  async createSalaryStructure(salaryData) {
    const { data, error } = await supabase
      .from('salary_structures')
      .insert([salaryData])
      .select()
      .single()
    return { data, error }
  },

  async updateSalaryStructure(id, updates) {
    const { data, error } = await supabase
      .from('salary_structures')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Payslips
  async getPayslips(filters = {}) {
    let query = supabase
      .from('payslips')
      .select('*, employees(first_name, last_name, employee_code), payroll_periods(period_name, period_start, period_end)')
      .order('created_at', { ascending: false })

    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.payroll_period_id) query = query.eq('payroll_period_id', filters.payroll_period_id)
    if (filters.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    return { data, error }
  },

  async getPayslip(id) {
    const { data, error } = await supabase
      .from('payslips')
      .select('*, employees(*), payroll_periods(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createPayslip(payslipData) {
    const { data, error } = await supabase
      .from('payslips')
      .insert([payslipData])
      .select()
      .single()
    return { data, error }
  },

  async updatePayslip(id, updates) {
    const { data, error } = await supabase
      .from('payslips')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Overtime
  async getOvertimeRecords(filters = {}) {
    let query = supabase
      .from('overtime_records')
      .select('*, employees(first_name, last_name, employee_code)')
      .order('overtime_date', { ascending: false })

    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    return { data, error }
  },

  async createOvertimeRecord(overtimeData) {
    const { data, error } = await supabase
      .from('overtime_records')
      .insert([overtimeData])
      .select()
      .single()
    return { data, error }
  },

  async updateOvertimeRecord(id, updates) {
    const { data, error } = await supabase
      .from('overtime_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Payroll Periods
  async getPayrollPeriods() {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .order('period_start', { ascending: false })
    return { data, error }
  },

  async createPayrollPeriod(periodData) {
    const { data, error } = await supabase
      .from('payroll_periods')
      .insert([periodData])
      .select()
      .single()
    return { data, error }
  },

  async updatePayrollPeriod(id, updates) {
    const { data, error } = await supabase
      .from('payroll_periods')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Tax Brackets
  async getTaxBrackets(taxYear = 2025) {
    const { data, error } = await supabase
      .from('tax_brackets')
      .select('*')
      .eq('tax_year', taxYear)
      .order('min_income')
    return { data, error }
  },

  // Deductions
  async getDeductionTypes() {
    const { data, error } = await supabase
      .from('deduction_types')
      .select('*')
      .eq('is_active', true)
      .order('name')
    return { data, error }
  },

  async getEmployeeDeductions(employeeId) {
    const { data, error } = await supabase
      .from('employee_deductions')
      .select('*, deduction_types(*)')
      .eq('employee_id', employeeId)
      .eq('is_active', true)
    return { data, error }
  },

  async createEmployeeDeduction(deductionData) {
    const { data, error } = await supabase
      .from('employee_deductions')
      .insert([deductionData])
      .select()
      .single()
    return { data, error }
  },

  // Bonus
  async getBonusRecords(filters = {}) {
    let query = supabase
      .from('bonus_records')
      .select('*, employees(first_name, last_name)')
      .order('created_at', { ascending: false })

    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    return { data, error }
  },

  async createBonusRecord(bonusData) {
    const { data, error } = await supabase
      .from('bonus_records')
      .insert([bonusData])
      .select()
      .single()
    return { data, error }
  },

  // Dashboard Stats
  async getPayrollStats() {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    
    const [
      { data: periods },
      { count: totalPayslips },
      { data: recentPayslips },
      { data: pendingOvertime }
    ] = await Promise.all([
      supabase.from('payroll_periods').select('*').order('period_start', { ascending: false }).limit(1),
      supabase.from('payslips').select('*', { count: 'exact', head: true }),
      supabase.from('payslips').select('total_earnings, total_deductions, net_salary').limit(100),
      supabase.from('overtime_records').select('*').eq('status', 'pending')
    ])

    const totalNetSalary = recentPayslips?.reduce((sum, p) => sum + (p.net_salary || 0), 0) || 0
    const totalGross = recentPayslips?.reduce((sum, p) => sum + (p.total_earnings || 0), 0) || 0
    const totalDeductions = recentPayslips?.reduce((sum, p) => sum + (p.total_deductions || 0), 0) || 0

    return {
      currentPeriod: periods?.[0] || null,
      totalPayslips: totalPayslips || 0,
      totalNetSalary,
      totalGross,
      totalDeductions,
      pendingOvertime: pendingOvertime?.length || 0,
      averageSalary: totalPayslips > 0 ? totalNetSalary / recentPayslips.length : 0,
    }
  },

  // Run Payroll
  async runPayroll(periodId) {
    // This would process all employees for the period
    const { data, error } = await supabase.rpc('process_payroll', {
      p_period_id: periodId
    })
    return { data, error }
  }
}
