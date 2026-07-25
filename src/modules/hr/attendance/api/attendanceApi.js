import { supabase } from '../../../../lib/supabaseClient'

export const attendanceApi = {
  // ============================================
  // ATTENDANCE RECORDS
  // ============================================
  async getAttendanceRecords(filters = {}) {
    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        employees!inner(first_name, last_name, employee_code, department, position),
        jobs(job_number, title, site_address, clients(company_name))
      `)
      .order('attendance_date', { ascending: false })
      .order('clock_in_time', { ascending: false })
      .limit(200)

    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.department) query = query.eq('employees.department', filters.department)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.date_from) query = query.gte('attendance_date', filters.date_from)
    if (filters.date_to) query = query.lte('attendance_date', filters.date_to)
    if (filters.search) {
      query = query.or(`employees.first_name.ilike.%${filters.search}%,employees.last_name.ilike.%${filters.search}%,employees.employee_code.ilike.%${filters.search}%`)
    }
    if (filters.job_number) query = query.eq('jobs.job_number', filters.job_number)

    const { data, error } = await query
    return { data, error }
  },

  async getTodayAttendance() {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*, employees(first_name, last_name, employee_code, department, position)')
      .eq('attendance_date', today)
      .order('clock_in_time', { ascending: false })
    return { data, error }
  },

  async clockIn(employeeId, data = {}) {
    const today = new Date().toISOString().split('T')[0]
    const { data: record, error } = await supabase
      .from('attendance_records')
      .upsert([{
        employee_id: employeeId,
        attendance_date: today,
        clock_in_time: new Date().toISOString(),
        check_in_method: data.method || 'mobile_app',
        check_in_latitude: data.latitude,
        check_in_longitude: data.longitude,
        check_in_address: data.address,
        status: 'present',
        notes: data.notes
      }], { onConflict: 'employee_id,attendance_date' })
      .select()
      .single()
    return { data: record, error }
  },

  async clockOut(employeeId, data = {}) {
    const today = new Date().toISOString().split('T')[0]
    const { data: record, error } = await supabase
      .from('attendance_records')
      .update({
        clock_out_time: new Date().toISOString(),
        check_out_method: data.method || 'mobile_app',
        check_out_latitude: data.latitude,
        check_out_longitude: data.longitude,
        check_out_address: data.address,
        updated_at: new Date().toISOString()
      })
      .eq('employee_id', employeeId)
      .eq('attendance_date', today)
      .select()
      .single()
    return { data: record, error }
  },

  async updateAttendance(id, updates) {
    const { data, error } = await supabase
      .from('attendance_records')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // TIMESHEET STATS
  // ============================================
  async getTimesheetStats() {
    const today = new Date().toISOString().split('T')[0]
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

    const { data: todayRecords } = await supabase.from('attendance_records').select('*').eq('attendance_date', today)
    const { data: weekRecords } = await supabase.from('attendance_records').select('*').gte('attendance_date', weekStart.toISOString().split('T')[0])
    const { data: monthRecords } = await supabase.from('attendance_records').select('*').gte('attendance_date', monthStart.toISOString().split('T')[0])
    const { count: clockedIn } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', today).not('clock_in_time', 'is', null)
    const { count: clockedOut } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', today).not('clock_out_time', 'is', null)
    const { count: missingClockOut } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', today).not('clock_in_time', 'is', null).is('clock_out_time', null)
    const { count: lateToday } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', today).eq('is_late', true)

    const calcHours = (records) => records?.reduce((sum, r) => sum + (r.total_hours || 0), 0) || 0
    const calcOvertime = (records) => records?.reduce((sum, r) => {
      const ot = (r.total_hours || 0) > 9 ? (r.total_hours - 9) : 0
      return sum + ot
    }, 0) || 0

    return {
      totalHoursToday: calcHours(todayRecords).toFixed(1),
      totalHoursWeek: calcHours(weekRecords).toFixed(1),
      totalHoursMonth: calcHours(monthRecords).toFixed(1),
      clockedIn: clockedIn || 0,
      clockedOut: clockedOut || 0,
      overtime: calcOvertime(monthRecords).toFixed(1),
      missingClockOut: missingClockOut || 0,
      lateToday: lateToday || 0
    }
  },

  // ============================================
  // SHIFTS
  // ============================================
  async getShiftTemplates() {
    const { data, error } = await supabase.from('shift_templates').select('*').eq('is_active', true).order('start_time')
    return { data, error }
  },

  async createShiftTemplate(templateData) {
    const { data, error } = await supabase.from('shift_templates').insert([{ ...templateData, shift_code: templateData.shift_name.toUpperCase().replace(/\s/g, '_') }]).select().single()
    return { data, error }
  },

  async updateShiftTemplate(id, updates) {
    const { data, error } = await supabase.from('shift_templates').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    return { data, error }
  },

  async getShiftAssignments(filters = {}) {
    let query = supabase
      .from('shift_assignments')
      .select('*, employees(first_name, last_name, employee_code, department), shift_templates(*)')
      .order('effective_date', { ascending: false })

    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.department) query = query.eq('employees.department', filters.department)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.date_from) query = query.gte('effective_date', filters.date_from)

    const { data, error } = await query.limit(200)
    return { data, error }
  },

  async assignShift(shiftData) {
    const { data, error } = await supabase.from('shift_assignments').insert([shiftData]).select().single()
    return { data, error }
  },

  async bulkAssignShifts(assignments) {
    const { data, error } = await supabase.from('shift_assignments').insert(assignments).select()
    return { data, error }
  },

  async updateShiftAssignment(id, updates) {
    const { data, error } = await supabase.from('shift_assignments').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    return { data, error }
  },

  async getEmployeeShifts(employeeId, month = null) {
    const startDate = month ? `${month}-01` : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const endDate = month ? new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0).toISOString().split('T')[0] : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('shift_assignments')
      .select('*, shift_templates(*)')
      .eq('employee_id', employeeId)
      .eq('status', 'active')
      .gte('effective_date', startDate)
      .lte('effective_date', endDate)
      .order('effective_date')

    return { data, error }
  },

  // ============================================
  // SHIFT SWAPS
  // ============================================
  async requestShiftSwap(swapData) {
    const { data, error } = await supabase.from('shift_swap_requests').insert([swapData]).select().single()
    return { data, error }
  },

  async updateShiftSwap(id, updates) {
    const { data, error } = await supabase.from('shift_swap_requests').update(updates).eq('id', id).select().single()
    return { data, error }
  },

  async getShiftSwaps(filters = {}) {
    let query = supabase.from('shift_swap_requests').select('*, requester:requester_id(first_name, last_name), requested:requested_employee_id(first_name, last_name)').order('created_at', { ascending: false })
    if (filters.status) query = query.eq('status', filters.status)
    const { data, error } = await query
    return { data, error }
  }
}
