import { supabase } from '../../../lib/supabaseClient'

export const mobileApi = {
  // ============================================
  // EMPLOYEE
  // ============================================
  async getEmployee(userId) {
    let { data } = await supabase.from('employees').select('*').eq('user_id', userId).single()
    if (!data) {
      const { data: user } = await supabase.auth.getUser()
      const email = user?.user?.email
      const { data: byEmail } = await supabase.from('employees').select('*').eq('email', email).single()
      if (byEmail) {
        await supabase.from('employees').update({ user_id: userId }).eq('id', byEmail.id)
        return { data: byEmail }
      }
      const { data: created } = await supabase.from('employees').insert([{
        user_id: userId, email, first_name: email?.split('@')[0] || 'Worker',
        last_name: '', employment_status: 'active', department: 'Cleaning',
        employee_code: 'MOB-' + Date.now().toString(36).toUpperCase().slice(-4)
      }]).select().single()
      return { data: created }
    }
    return { data }
  },

  // ============================================
  // JOBS
  // ============================================
  async getOpenJobs() {
    const { data } = await supabase.from('jobs')
      .select('*, clients(company_name, phone, city), job_categories(name, color)')
      .in('status', ['pending', 'scheduled'])
      .order('scheduled_date').limit(50)
    return { data: data || [] }
  },

  async getMyJobs(employeeId) {
    const { data: assignments } = await supabase.from('field_job_assignments')
      .select('job_id, assignment_status, assigned_at, started_at')
      .eq('employee_id', employeeId)
      .in('assignment_status', ['assigned', 'accepted', 'in_progress'])
    if (!assignments?.length) return { data: [] }
    const jobIds = assignments.map(a => a.job_id)
    const { data: jobs } = await supabase.from('jobs')
      .select('*, clients(company_name, phone, city), job_categories(name, color)')
      .in('id', jobIds).eq('status', 'in_progress')
    return { data: (jobs || []).map(j => ({ ...j, assignment_status: assignments.find(a => a.job_id === j.id)?.assignment_status })) }
  },

  async getJobDetail(jobId) {
    const { data } = await supabase.from('jobs')
      .select('*, clients(*), job_categories(*), field_job_assignments(*, employees(first_name, last_name, phone)), job_checklist_items(*)')
      .eq('id', jobId).single()
    return { data }
  },

  // ============================================
  // JOB ACTIONS - Simple and reliable
  // ============================================
  async selectJob(jobId, employeeId) {
    const { error: aErr } = await supabase.from('field_job_assignments').upsert({
      job_id: jobId, employee_id: employeeId,
      assignment_status: 'assigned', assigned_at: new Date().toISOString()
    }, { onConflict: 'job_id,employee_id' })
    if (aErr) return { success: false, error: aErr.message }
    const { error: jErr } = await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', jobId)
    return { success: !jErr, error: jErr?.message }
  },

  async startJob(jobId, employeeId) {
    const { error } = await supabase.from('field_job_assignments').update({
      assignment_status: 'in_progress', started_at: new Date().toISOString()
    }).eq('job_id', jobId).eq('employee_id', employeeId)
    return { success: !error }
  },

  async completeJob(jobId, employeeId) {
    await supabase.from('field_job_assignments').update({
      assignment_status: 'completed', completed_at: new Date().toISOString()
    }).eq('job_id', jobId).eq('employee_id', employeeId)
    const { error } = await supabase.from('jobs').update({ status: 'completed' }).eq('id', jobId)
    return { success: !error }
  },

  // ============================================
  // ATTENDANCE
  // ============================================
  async clockIn(employeeId, lat, lng) {
    const today = new Date().toISOString().split('T')[0]
    const record = { employee_id: employeeId, attendance_date: today, clock_in_time: new Date().toISOString(), check_in_method: lat ? 'gps' : 'mobile_app', status: 'present' }
    if (lat) { record.check_in_latitude = lat; record.check_in_longitude = lng }
    const { data: existing } = await supabase.from('attendance_records').select('id').eq('employee_id', employeeId).eq('attendance_date', today).maybeSingle()
    if (existing) {
      await supabase.from('attendance_records').update(record).eq('id', existing.id)
    } else {
      await supabase.from('attendance_records').insert([record])
    }
    return { success: true }
  },

  async clockOut(employeeId, lat, lng) {
    const today = new Date().toISOString().split('T')[0]
    const record = { clock_out_time: new Date().toISOString(), check_out_method: lat ? 'gps' : 'mobile_app' }
    if (lat) { record.check_out_latitude = lat; record.check_out_longitude = lng }
    await supabase.from('attendance_records').update(record).eq('employee_id', employeeId).eq('attendance_date', today)
    return { success: true }
  },

  async getTodayAttendance(employeeId) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('attendance_records').select('*').eq('employee_id', employeeId).eq('attendance_date', today).maybeSingle()
    return { data }
  },

  // ============================================
  // PHOTOS
  // ============================================
  async uploadPhoto(jobId, employeeId, file, type, caption) {
    const ext = file.name.split('.').pop()
    const path = `jobs/${jobId}/${type}-${Date.now()}.${ext}`
    try { await supabase.storage.createBucket('job-photos', { public: true }) } catch {}
    const { error: upErr } = await supabase.storage.from('job-photos').upload(path, file, { upsert: true })
    if (upErr) return { error: upErr.message }
    const { data: { publicUrl } } = supabase.storage.from('job-photos').getPublicUrl(path)
    const { data, error } = await supabase.from('job_photos').insert([{ job_id: jobId, employee_id: employeeId, photo_type: type, photo_url: publicUrl, caption }]).select().single()
    return { data, error }
  },

  // ============================================
  // INCIDENT
  // ============================================
  async reportIncident(data) {
    const { data: result, error } = await supabase.from('incidents').insert([data]).select().single()
    return { data: result, error }
  },

  // ============================================
  // JOB REPORT
  // ============================================
  async saveJobReport(reportData) {
    const { data, error } = await supabase.from('job_reports').upsert(reportData, { onConflict: 'job_id,employee_id' }).select().single()
    return { data, error }
  },

  async getJobReport(jobId, employeeId) {
    const { data } = await supabase.from('job_reports').select('*').eq('job_id', jobId).eq('employee_id', employeeId).maybeSingle()
    return { data }
  },

  // ============================================
  // LEAVE
  // ============================================
  async getLeaveRequests(employeeId) {
    const { data } = await supabase.from('leave_requests').select('*, leave_types(name)').eq('employee_id', employeeId).order('created_at', { ascending: false })
    return { data: data || [] }
  },

  async getLeaveTypes() {
    const { data } = await supabase.from('leave_types').select('*')
    return { data: data || [] }
  },

  async applyLeave(leaveData) {
    const { data, error } = await supabase.from('leave_requests').insert([leaveData]).select().single()
    return { data, error }
  },

  // ============================================
  // MESSAGES
  // ============================================
  async getMessages(userId) {
    const { data } = await supabase.from('messages')
      .select('*, sender:profiles!sender_id(full_name), receiver:profiles!receiver_id(full_name)')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false }).limit(50)
    return { data: data || [] }
  },

  async sendMessage(messageData) {
    const { data, error } = await supabase.from('messages').insert([messageData]).select().single()
    return { data, error }
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================
  async getNotifications(userId) {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
    return { data: data || [] }
  },

  async markNotificationRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  },

  // ============================================
  // STATS
  // ============================================
  async getMobileStats(employeeId) {
    const today = new Date().toISOString().split('T')[0]
    const [{ data: myJobs }, { data: attendance }, { data: notifications }] = await Promise.all([
      mobileApi.getMyJobs(employeeId),
      mobileApi.getTodayAttendance(employeeId),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', employeeId).eq('is_read', false)
    ])
    return {
      jobsToday: myJobs?.length || 0,
      isClockedIn: !!attendance?.clock_in_time && !attendance?.clock_out_time,
      clockInTime: attendance?.clock_in_time || null,
      unreadNotifications: notifications?.count || 0
    }
  }
}
