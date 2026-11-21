import { supabase } from '../../../lib/supabaseClient'

// ═══════════════════════════════════════════════════════════════
// ✅ Strip empty strings to null so Postgres doesn't reject typed columns
// (UUID, date, numeric). Skips undefined entirely.
// ═══════════════════════════════════════════════════════════════
const cleanEmpty = (data) => {
  const out = {}
  for (const [key, value] of Object.entries(data || {})) {
    if (value === undefined) continue
    if (value === '') { out[key] = null; continue }
    out[key] = value
  }
  return out
}

// ✅ Safe numeric reduce — never NaN, never crashes on nulls
const sumField = (rows, field) =>
  (rows || []).reduce((acc, r) => acc + (Number(r?.[field]) || 0), 0)

export const payrollApi = {
  // ═══════════════════════════════════════════════════════════════
  // SALARY STRUCTURES
  // ═══════════════════════════════════════════════════════════════
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
    const clean = cleanEmpty(salaryData)
    const { data, error } = await supabase
      .from('salary_structures')
      .insert([clean])
      .select()
      .single()
    return { data, error }
  },

  async updateSalaryStructure(id, updates) {
    const clean = cleanEmpty(updates)
    clean.updated_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('salary_structures')
      .update(clean)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ═══════════════════════════════════════════════════════════════
  // PAYSLIPS  ✅ joins payroll_runs (confirmed FK: payslips.payroll_run_id)
  // ═══════════════════════════════════════════════════════════════
  async getPayslips(filters = {}) {
    let query = supabase
      .from('payslips')
      .select('*, employees(first_name, last_name, employee_code), payroll_runs(period_start, period_end, run_number)')
      .order('created_at', { ascending: false })

    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.payroll_run_id) query = query.eq('payroll_run_id', filters.payroll_run_id)
    // ✅ Accept legacy key too — silently ignored if not provided
    if (filters.payroll_period_id) query = query.eq('payroll_run_id', filters.payroll_period_id)
    if (filters.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    return { data, error }
  },

  async getPayslip(id) {
    const { data, error } = await supabase
      .from('payslips')
      .select('*, employees(*), payroll_runs(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createPayslip(payslipData) {
    const clean = cleanEmpty(payslipData)
    const { data, error } = await supabase
      .from('payslips')
      .insert([clean])
      .select()
      .single()
    return { data, error }
  },

  async updatePayslip(id, updates) {
    const clean = cleanEmpty(updates)
    const { data, error } = await supabase
      .from('payslips')
      .update(clean)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ═══════════════════════════════════════════════════════════════
  // OVERTIME
  // ═══════════════════════════════════════════════════════════════
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
    const clean = cleanEmpty(overtimeData)
    const { data, error } = await supabase
      .from('overtime_records')
      .insert([clean])
      .select()
      .single()
    return { data, error }
  },

  async updateOvertimeRecord(id, updates) {
    const clean = cleanEmpty(updates)
    const { data, error } = await supabase
      .from('overtime_records')
      .update(clean)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ═══════════════════════════════════════════════════════════════
  // PAYROLL RUNS — canonical "period" concept for this module
  // ✅ If the payroll_periods table exists independently and is used
  //    elsewhere in the UI, the 3 legacy helpers below still call it.
  //    If that table does NOT exist, remove the 3 helpers + any callers.
  // ═══════════════════════════════════════════════════════════════
  async getPayrollRuns() {
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .order('period_start', { ascending: false })
    return { data, error }
  },

  async getCurrentPayrollRun() {
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .order('period_start', { ascending: false })
      .limit(1)
      .maybeSingle()
    return { data, error }
  },

  // ⚠️ Legacy — only kept for backward compat.
  async getPayrollPeriods() {
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .order('period_start', { ascending: false })
    return { data, error }
  },

  async createPayrollPeriod(periodData) {
    const clean = cleanEmpty(periodData)
    const { data, error } = await supabase
      .from('payroll_periods')
      .insert([clean])
      .select()
      .single()
    return { data, error }
  },

  async updatePayrollPeriod(id, updates) {
    const clean = cleanEmpty(updates)
    clean.updated_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('payroll_periods')
      .update(clean)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ═══════════════════════════════════════════════════════════════
  // TAX BRACKETS  ✅ default = current year, fall back to most recent year
  // ═══════════════════════════════════════════════════════════════
  async getTaxBrackets(taxYear = null) {
    const year = taxYear || new Date().getFullYear()

    const { data, error } = await supabase
      .from('tax_brackets')
      .select('*')
      .eq('tax_year', year)
      .order('min_income')

    if (error) return { data: null, error }
    if (data && data.length > 0) return { data, error: null }

    // ✅ Fallback: find the most recent year that has data
    const { data: fallback, error: fbError } = await supabase
      .from('tax_brackets')
      .select('*')
      .order('tax_year', { ascending: false })

    if (fbError) return { data: null, error: fbError }
    if (!fallback || fallback.length === 0) {
      return { data: [], error: { message: `No tax brackets found for any year (requested ${year})` } }
    }

    const latestYear = fallback[0].tax_year
    const filtered = fallback.filter(b => b.tax_year === latestYear)
    console.warn(`[payroll] No tax brackets for ${year}, using ${latestYear}`)
    return { data: filtered, error: null }
  },

  // ═══════════════════════════════════════════════════════════════
  // DEDUCTIONS
  // ═══════════════════════════════════════════════════════════════
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
    const clean = cleanEmpty(deductionData)
    const { data, error } = await supabase
      .from('employee_deductions')
      .insert([clean])
      .select()
      .single()
    return { data, error }
  },

  // ═══════════════════════════════════════════════════════════════
  // BONUS
  // ═══════════════════════════════════════════════════════════════
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
    const clean = cleanEmpty(bonusData)
    const { data, error } = await supabase
      .from('bonus_records')
      .insert([clean])
      .select()
      .single()
    return { data, error }
  },

  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD STATS
  // ✅ Uses payroll_runs for current period
  // ✅ Excludes draft payslips from aggregates
  // ✅ Correct average (sum ÷ count)
  // ✅ try/catch so a failure doesn't return undefined
  // ═══════════════════════════════════════════════════════════════
  async getPayrollStats() {
    try {
      const [
        { data: currentRun, error: runErr },
        { count: totalPayslips, error: countErr },
        { data: finalPayslips, error: payslipsErr },
        { data: pendingOvertime, error: overtimeErr }
      ] = await Promise.all([
        supabase.from('payroll_runs')
          .select('*')
          .order('period_start', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from('payslips')
          .select('*', { count: 'exact', head: true }),
        supabase.from('payslips')
          .select('total_earnings, total_deductions, net_salary, status')
          .in('status', ['approved', 'finalized', 'paid']),
        supabase.from('overtime_records')
          .select('id')
          .eq('status', 'pending')
      ])

      if (runErr) console.warn('[payroll] currentRun error:', runErr.message)
      if (countErr) console.warn('[payroll] totalPayslips error:', countErr.message)
      if (payslipsErr) console.warn('[payroll] payslip aggregates error:', payslipsErr.message)
      if (overtimeErr) console.warn('[payroll] pendingOvertime error:', overtimeErr.message)

      const rows = finalPayslips || []
      const totalNetSalary = sumField(rows, 'net_salary')
      const totalGross = sumField(rows, 'total_earnings')
      const totalDeductions = sumField(rows, 'total_deductions')
      const finalCount = rows.length
      const averageSalary = finalCount > 0 ? totalNetSalary / finalCount : 0

      return {
        currentPeriod: currentRun || null,
        totalPayslips: totalPayslips || 0,
        finalizedPayslips: finalCount,
        totalNetSalary,
        totalGross,
        totalDeductions,
        pendingOvertime: pendingOvertime?.length || 0,
        averageSalary,
      }
    } catch (err) {
      console.error('[payroll] getPayrollStats threw:', err)
      return {
        currentPeriod: null,
        totalPayslips: 0,
        finalizedPayslips: 0,
        totalNetSalary: 0,
        totalGross: 0,
        totalDeductions: 0,
        pendingOvertime: 0,
        averageSalary: 0,
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // RUN PAYROLL
  // ✅ Refuses to re-run a completed/locked run
  // ═══════════════════════════════════════════════════════════════
  async runPayroll(runId) {
    // ✅ Guard against double-run — if the run is already completed,
    //    refuse. The RPC should also enforce this server-side.
    const { data: run, error: runErr } = await supabase
      .from('payroll_runs')
      .select('id, status, run_number')
      .eq('id', runId)
      .single()

    if (runErr) return { data: null, error: runErr }
    if (!run) return { data: null, error: { message: 'Payroll run not found' } }
    if (['completed', 'paid', 'locked'].includes(run.status)) {
      return {
        data: null,
        error: { message: `Payroll run ${run.run_number} is ${run.status} and cannot be re-processed.` }
      }
    }

    const { data, error } = await supabase.rpc('process_payroll', {
      p_period_id: runId,
    })
    return { data, error }
  },
}
