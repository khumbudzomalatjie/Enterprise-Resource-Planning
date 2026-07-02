import { supabase } from '../../../lib/supabaseClient'

export const mobileApi = {
  // ============================================
  // GET OPEN JOBS - Same query as main ERP
  // ============================================
  async getOpenJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        clients(company_name, client_code, phone, city),
        job_categories(name, color)
      `)
      .in('status', ['pending', 'scheduled'])
      .order('scheduled_date', { ascending: true })
      .order('scheduled_start_time', { ascending: true })
      .limit(50)
    
    return { data, error }
  },

  // ============================================
  // GET MY JOBS - Same field_job_assignments as main ERP
  // ============================================
  async getMyJobs(employeeId) {
    if (!employeeId) return { data: [] }

    const { data: assignments, error } = await supabase
      .from('field_job_assignments')
      .select('job_id, assignment_status, assigned_at')
      .eq('employee_id', employeeId)
      .in('assignment_status', ['assigned', 'accepted', 'in_progress'])
      .order('assigned_at', { ascending: false })

    if (error || !assignments || assignments.length === 0) {
      return { data: [] }
    }

    const jobIds = assignments.map(a => a.job_id).filter(Boolean)
    if (jobIds.length === 0) return { data: [] }

    const { data: jobs } = await supabase
      .from('jobs')
      .select(`
        *,
        clients(company_name, client_code, phone, city),
        job_categories(name, color)
      `)
      .in('id', jobIds)
      .not('status', 'eq', 'completed')
      .not('status', 'eq', 'cancelled')

    // Merge assignment status into jobs
    const merged = (jobs || []).map(job => {
      const assignment = assignments.find(a => a.job_id === job.id)
      return { ...job, assignment_status: assignment?.assignment_status || null }
    })

    return { data: merged }
  },

  // ============================================
  // SELECT JOB - Write to field_job_assignments
  // ============================================
  async selectJob(jobId, employeeId) {
    const { data: userData } = await supabase.auth.getUser()

    // Check existing
    const { data: existing } = await supabase
      .from('field_job_assignments')
      .select('id')
      .eq('job_id', jobId)
      .eq('employee_id', employeeId)
      .maybeSingle()

    if (existing) {
      // Reactivate
      const { error } = await supabase
        .from('field_job_assignments')
        .update({
          assignment_status: 'assigned',
          assigned_by: userData.user?.id,
          assigned_at: new Date().toISOString(),
          released_at: null,
          released_by: null,
          release_reason: null
        })
        .eq('id', existing.id)

      if (!error) {
        await supabase.from('jobs').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', jobId)
      }
      return { success: !error }
    }

    // Create new
    const { error } = await supabase
      .from('field_job_assignments')
      .insert([{
        job_id: jobId,
        employee_id: employeeId,
        assigned_by: userData.user?.id,
        assignment_status: 'assigned',
        assigned_at: new Date().toISOString()
      }])

    if (!error) {
      await supabase.from('jobs').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', jobId)
    }
    return { success: !error }
  },

  // ============================================
  // START JOB
  // ============================================
  async startJob(jobId, employeeId, lat, lng) {
    const { error } = await supabase
      .from('field_job_assignments')
      .update({
        assignment_status: 'in_progress',
        started_at: new Date().toISOString(),
        check_in_time: new Date().toISOString(),
        check_in_latitude: lat,
        check_in_longitude: lng
      })
      .eq('job_id', jobId)
      .eq('employee_id', employeeId)

    if (!error) {
      await supabase.from('jobs').update({ 
        status: 'in_progress', 
        actual_start_time: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      }).eq('id', jobId)
    }
    return { success: !error }
  },

  // ============================================
  // COMPLETE JOB
  // ============================================
  async completeJob(jobId, employeeId) {
    const { error } = await supabase
      .from('field_job_assignments')
      .update({
        assignment_status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('job_id', jobId)
      .eq('employee_id', employeeId)

    if (!error) {
      await supabase.from('jobs').update({ 
        status: 'completed', 
        actual_end_time: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      }).eq('id', jobId)
    }
    return { success: !error }
  },

  // Clock in/out
  async clockIn(employeeId, jobId, lat, lng) {
    if (!employeeId) return { success: false }
    const { error } = await supabase
      .from('attendance_records')
      .upsert([{
        employee_id: employeeId,
        attendance_date: new Date().toISOString().split('T')[0],
        clock_in_time: new Date().toISOString(),
        check_in_method: 'gps',
        check_in_latitude: lat,
        check_in_longitude: lng,
        status: 'present'
      }], { onConflict: 'employee_id,attendance_date' })
    return { success: !error }
  },

  async clockOut(employeeId) {
    if (!employeeId) return { success: false }
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('attendance_records')
      .update({ clock_out_time: new Date().toISOString(), check_out_method: 'gps' })
      .eq('employee_id', employeeId)
      .eq('attendance_date', today)
    return { success: !error }
  },

  // Photos
  async uploadJobPhoto(jobId, employeeId, file, photoType, caption) {
    const fileExt = file.name.split('.').pop()
    const fileName = `job-photos/${jobId}/${Date.now()}.${fileExt}`
    try {
      await supabase.storage.createBucket('fleet', { public: true, fileSizeLimit: 10485760 })
    } catch {}
    const { error: uploadError } = await supabase.storage.from('fleet').upload(fileName, file, { upsert: true })
    if (uploadError) return { error: uploadError.message }
    const { data: { publicUrl } } = supabase.storage.from('fleet').getPublicUrl(fileName)
    const { data, error } = await supabase.from('job_photos').insert([{ job_id: jobId, employee_id: employeeId, photo_type: photoType, photo_url: publicUrl, caption }]).select().single()
    return { data, error }
  },

  // Signature
  async saveSignature(jobId, signatureUrl, clientName, rating) {
    const { data, error } = await supabase.from('client_signatures').insert([{ job_id: jobId, signature_url: signatureUrl, signed_by: clientName, client_name: clientName, satisfaction_rating: rating }]).select().single()
    return { data, error }
  },

  // Tasks
  async getJobTasks(jobId) {
    const { data, error } = await supabase.from('job_checklist_items').select('*').eq('job_id', jobId).order('item_number')
    return { data, error }
  },
  async updateTaskItem(id, updates) {
    const { data, error } = await supabase.from('job_checklist_items').update(updates).eq('id', id).select().single()
    return { data, error }
  },

  // Profile
  async getMyProfile(userId) {
    const { data, error } = await supabase.from('employees').select('*').eq('user_id', userId).single()
    return { data, error }
  },

  // Stats
  async getMobileStats(employeeId) {
    if (!employeeId) return { jobsToday: 0, isClockedIn: false, clockInTime: null, completedJobs: 0 }
    const today = new Date().toISOString().split('T')[0]
    const { data: myJobs } = await mobileApi.getMyJobs(employeeId)
    const { data: attendance } = await supabase.from('attendance_records').select('*').eq('employee_id', employeeId).eq('attendance_date', today).single()
    return {
      jobsToday: myJobs?.length || 0,
      isClockedIn: !!attendance?.clock_in_time && !attendance?.clock_out_time,
      clockInTime: attendance?.clock_in_time || null,
      completedJobs: myJobs?.filter(j => j.status === 'completed').length || 0
    }
  }
}
