import { supabase } from '../../../lib/supabaseClient'

export const mobileApi = {
  // ============================================
  // GET OPEN JOBS
  // ============================================
  async getOpenJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, clients(company_name, client_code, phone, city), job_categories(name, color)')
      .in('status', ['pending', 'scheduled'])
      .order('scheduled_date', { ascending: true })
      .limit(50)
    return { data, error }
  },

  // ============================================
  // GET MY JOBS
  // ============================================
  async getMyJobs(employeeId) {
    if (!employeeId) return { data: [] }
    const { data: assignments, error } = await supabase
      .from('field_job_assignments')
      .select('job_id, assignment_status')
      .eq('employee_id', employeeId)
      .in('assignment_status', ['assigned', 'accepted', 'in_progress'])
    if (error || !assignments?.length) return { data: [] }
    const jobIds = assignments.map(a => a.job_id).filter(Boolean)
    const { data: jobs } = await supabase
      .from('jobs')
      .select('*, clients(company_name, client_code, phone, city), job_categories(name, color)')
      .in('id', jobIds)
      .eq('status', 'in_progress')
    return { data: (jobs || []).map(j => ({ ...j, assignment_status: assignments.find(a => a.job_id === j.id)?.assignment_status })) }
  },

  // ============================================
  // SELECT JOB - Only update columns that exist
  // ============================================
  async selectJob(jobId, employeeId) {
    const { data: userData } = await supabase.auth.getUser()
    const { data: existing } = await supabase
      .from('field_job_assignments')
      .select('id')
      .eq('job_id', jobId)
      .eq('employee_id', employeeId)
      .maybeSingle()

    if (existing) {
      await supabase.from('field_job_assignments').update({
        assignment_status: 'assigned', assigned_by: userData.user?.id,
        assigned_at: new Date().toISOString(), released_at: null, release_reason: null
      }).eq('id', existing.id)
    } else {
      await supabase.from('field_job_assignments').insert([{
        job_id: jobId, employee_id: employeeId, assigned_by: userData.user?.id,
        assignment_status: 'assigned', assigned_at: new Date().toISOString()
      }])
    }
    // Only update status - safest column
    await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', jobId)
    return { success: true }
  },

  // ============================================
  // START JOB
  // ============================================
  async startJob(jobId, employeeId, lat, lng) {
    const updates = { assignment_status: 'in_progress', started_at: new Date().toISOString() }
    if (lat) { updates.check_in_latitude = lat; updates.check_in_longitude = lng }
    await supabase.from('field_job_assignments').update(updates).eq('job_id', jobId).eq('employee_id', employeeId)
    return { success: true }
  },

  // ============================================
  // COMPLETE JOB - Only update status column
  // ============================================
  async completeJob(jobId, employeeId) {
    await supabase.from('field_job_assignments').update({
      assignment_status: 'completed', completed_at: new Date().toISOString()
    }).eq('job_id', jobId).eq('employee_id', employeeId)
    // Only update status - no other columns
    await supabase.from('jobs').update({ status: 'completed' }).eq('id', jobId)
    return { success: true }
  },

  // ============================================
  // CLOCK IN - Fixed column name
  // ============================================
  async clockIn(employeeId, lat, lng) {
    if (!employeeId) return { success: false }
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase.from('attendance_records')
      .select('id').eq('employee_id', employeeId).eq('attendance_date', today).maybeSingle()

    const record = {
      employee_id: employeeId,
      attendance_date: today,
      clock_in_time: new Date().toISOString(),
      check_in_method: 'gps',
      status: 'present'
    }
    if (lat) { record.check_in_latitude = lat; record.check_in_longitude = lng }

    if (existing) {
      await supabase.from('attendance_records').update(record).eq('id', existing.id)
    } else {
      await supabase.from('attendance_records').insert([record])
    }
    return { success: true }
  },

  async clockOut(employeeId) {
    if (!employeeId) return { success: false }
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('attendance_records').update({
      clock_out_time: new Date().toISOString(), check_out_method: 'gps'
    }).eq('employee_id', employeeId).eq('attendance_date', today)
    return { success: true }
  },

  // ============================================
  // PHOTOS
  // ============================================
  async uploadJobPhoto(jobId, employeeId, file, photoType, caption) {
    const fileExt = file.name.split('.').pop()
    const fileName = `job-photos/${jobId}/${photoType}-${Date.now()}.${fileExt}`
    try { await supabase.storage.createBucket('job-photos', { public: true, fileSizeLimit: 10485760 }) } catch {}
    const { error: uploadError } = await supabase.storage.from('job-photos').upload(fileName, file, { upsert: true })
    if (uploadError) return { error: uploadError.message }
    const { data: { publicUrl } } = supabase.storage.from('job-photos').getPublicUrl(fileName)
    const { data, error } = await supabase.from('job_photos').insert([{
      job_id: jobId, employee_id: employeeId, photo_type: photoType, photo_url: publicUrl, caption
    }]).select().single()
    return { data, error }
  },

  // ============================================
  // SIGNATURE
  // ============================================
  async saveSignature(jobId, signatureUrl, clientName, rating) {
    const { data, error } = await supabase.from('client_signatures').insert([{
      job_id: jobId, signature_url: signatureUrl, signed_by: clientName,
      client_name: clientName, satisfaction_rating: rating
    }]).select().single()
    return { data, error }
  },

  // ============================================
  // SUPPLIES
  // ============================================
  async createSuppliesRequest(requestData, items) {
    const { data: request, error } = await supabase.from('supplies_requests').insert([requestData]).select().single()
    if (error) return { error }
    if (items?.length) {
      await supabase.from('supplies_request_items').insert(items.map(item => ({ ...item, request_id: request.id })))
    }
    return { data: request }
  },

  // ============================================
  // INCIDENT
  // ============================================
  async reportIncident(incidentData) {
    const { data, error } = await supabase.from('incidents').insert([incidentData]).select().single()
    return { data, error }
  },

  // ============================================
  // TASKS
  // ============================================
  async getJobTasks(jobId) {
    const { data, error } = await supabase.from('job_checklist_items').select('*').eq('job_id', jobId).order('item_number')
    return { data, error }
  },
  async updateTaskItem(id, updates) {
    const { data, error } = await supabase.from('job_checklist_items').update(updates).eq('id', id).select().single()
    return { data, error }
  },

  // ============================================
  // PROFILE
  // ============================================
  async getMyProfile(userId) {
    const { data, error } = await supabase.from('employees').select('*').eq('user_id', userId).single()
    return { data, error }
  },

  // ============================================
  // STATS - Fixed employee_id reference
  // ============================================
  async getMobileStats(employeeId) {
    if (!employeeId) return { jobsToday: 0, isClockedIn: false, clockInTime: null, completedJobs: 0 }
    const today = new Date().toISOString().split('T')[0]
    const { data: myJobs } = await mobileApi.getMyJobs(employeeId)
    const { data: attendance } = await supabase.from('attendance_records')
      .select('clock_in_time, clock_out_time')
      .eq('employee_id', employeeId)
      .eq('attendance_date', today)
      .maybeSingle()
    return {
      jobsToday: myJobs?.length || 0,
      isClockedIn: !!attendance?.clock_in_time && !attendance?.clock_out_time,
      clockInTime: attendance?.clock_in_time || null,
      completedJobs: 0
    }
  }
}
