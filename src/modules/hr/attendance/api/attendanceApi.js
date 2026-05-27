import { supabase } from '../../../../lib/supabaseClient'

export const attendanceApi = {
  // Attendance Records
  async getAttendanceRecords(filters = {}) {
    let query = supabase
      .from('attendance_records')
      .select('*, employees(first_name, last_name, employee_code, department)')
      .order('attendance_date', { ascending: false })

    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.date_from) query = query.gte('attendance_date', filters.date_from)
    if (filters.date_to) query = query.lte('attendance_date', filters.date_to)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.department) query = query.eq('employees.department', filters.department)

    const { data, error } = await query
    return { data, error }
  },

  async clockIn(attendanceData) {
    const { data, error } = await supabase
      .from('attendance_records')
      .upsert([{
        employee_id: attendanceData.employee_id,
        attendance_date: new Date().toISOString().split('T')[0],
        clock_in_time: new Date().toISOString(),
        check_in_method: attendanceData.check_in_method || 'mobile_app',
        check_in_latitude: attendanceData.latitude,
        check_in_longitude: attendanceData.longitude,
        check_in_address: attendanceData.address,
        status: 'present'
      }], {
        onConflict: 'employee_id,attendance_date',
        ignoreDuplicates: false
      })
      .select()
      .single()
    return { data, error }
  },

  async clockOut(employeeId) {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('attendance_records')
      .update({
        clock_out_time: new Date().toISOString(),
        check_out_method: 'mobile_app',
        updated_at: new Date().toISOString()
      })
      .eq('employee_id', employeeId)
      .eq('attendance_date', today)
      .select()
      .single()
    return { data, error }
  },

  async getTodayAttendance(employeeId) {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('attendance_date', today)
      .single()
    return { data, error }
  },

  // Shifts
  async getShiftTypes() {
    const { data, error } = await supabase
      .from('shift_types')
      .select('*')
      .order('start_time')
    return { data, error }
  },

  async getEmployeeShifts(filters = {}) {
    let query = supabase
      .from('employee_shifts')
      .select('*, shift_types(*), employees(first_name, last_name, employee_code)')
      .order('shift_date', { ascending: false })

    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.date_from) query = query.gte('shift_date', filters.date_from)
    if (filters.date_to) query = query.lte('shift_date', filters.date_to)
    if (filters.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    return { data, error }
  },

  async assignShift(shiftData) {
    const { data, error } = await supabase
      .from('employee_shifts')
      .upsert([shiftData], {
        onConflict: 'employee_id,shift_date'
      })
      .select()
      .single()
    return { data, error }
  },

  async bulkAssignShifts(shiftsArray) {
    const { data, error } = await supabase
      .from('employee_shifts')
      .upsert(shiftsArray, {
        onConflict: 'employee_id,shift_date'
      })
      .select()
    return { data, error }
  },

  // QR Codes
  async generateQRCode(employeeId) {
    const qrData = `NDANDULENI-${employeeId}-${Date.now()}`
    const { data, error } = await supabase
      .from('qr_codes')
      .upsert([{
        employee_id: employeeId,
        qr_code_data: qrData,
        is_active: true,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      }], {
        onConflict: 'employee_id'
      })
      .select()
      .single()
    return { data, error }
  },

  async getQRCode(employeeId) {
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .single()
    return { data, error }
  },

  async verifyQRCode(qrCodeData) {
    const { data, error } = await supabase
      .from('qr_codes')
      .select('*, employees(*)')
      .eq('qr_code_data', qrCodeData)
      .eq('is_active', true)
      .single()
    return { data, error }
  },

  // GPS Locations
  async getApprovedLocations() {
    const { data, error } = await supabase
      .from('approved_locations')
      .select('*')
      .eq('is_active', true)
      .order('name')
    return { data, error }
  },

  async createApprovedLocation(locationData) {
    const { data, error } = await supabase
      .from('approved_locations')
      .insert([locationData])
      .select()
      .single()
    return { data, error }
  },

  // Timesheets
  async getTimesheets(filters = {}) {
    let query = supabase
      .from('timesheets')
      .select('*, employees(first_name, last_name, employee_code, department)')
      .order('period_start', { ascending: false })

    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.department) query = query.eq('employees.department', filters.department)

    const { data, error } = await query
    return { data, error }
  },

  async getTimesheet(id) {
    const { data, error } = await supabase
      .from('timesheets')
      .select('*, employees(*), attendance_records(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async generateTimesheet(employeeId, periodStart, periodEnd) {
    const { data, error } = await supabase
      .rpc('generate_timesheet', {
        p_employee_id: employeeId,
        p_period_start: periodStart,
        p_period_end: periodEnd
      })
    return { data, error }
  },

  async updateTimesheetStatus(id, status, approvedBy = null) {
    const updates = { 
      status,
      updated_at: new Date().toISOString()
    }
    if (status === 'submitted') updates.submitted_at = new Date().toISOString()
    if (status === 'approved') {
      updates.approved_by = approvedBy
      updates.approved_at = new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('timesheets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Policies
  async getAttendancePolicies() {
    const { data, error } = await supabase
      .from('attendance_policies')
      .select('*')
      .order('policy_name')
    return { data, error }
  },

  async getHolidays(year = new Date().getFullYear()) {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .gte('holiday_date', `${year}-01-01`)
      .lte('holiday_date', `${year}-12-31`)
      .order('holiday_date')
    return { data, error }
  },

  // Corrections
  async requestCorrection(correctionData) {
    const { data, error } = await supabase
      .from('attendance_corrections')
      .insert([correctionData])
      .select()
      .single()
    return { data, error }
  },

  async updateCorrection(id, updates) {
    const { data, error } = await supabase
      .from('attendance_corrections')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Dashboard Stats
  async getAttendanceStats(date = new Date().toISOString().split('T')[0]) {
    const [
      { count: totalEmployees },
      { count: presentToday },
      { count: absentToday },
      { count: lateToday },
      { data: recentAttendance }
    ] = await Promise.all([
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active'),
      supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', date).eq('status', 'present'),
      supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', date).eq('status', 'absent'),
      supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', date).eq('is_late', true),
      supabase.from('attendance_records')
        .select('*, employees(first_name, last_name, employee_code)')
        .eq('attendance_date', date)
        .order('clock_in_time', { ascending: false })
        .limit(10)
    ])

    const onLeave = (totalEmployees || 0) - (presentToday || 0) - (absentToday || 0)

    return {
      totalEmployees: totalEmployees || 0,
      presentToday: presentToday || 0,
      absentToday: absentToday || 0,
      lateToday: lateToday || 0,
      onLeave,
      attendanceRate: totalEmployees > 0 ? ((presentToday || 0) / totalEmployees * 100).toFixed(1) : 0,
      recentAttendance: recentAttendance || []
    }
  }
}
