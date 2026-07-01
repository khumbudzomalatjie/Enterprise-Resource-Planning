import { supabase } from '../../../lib/supabaseClient'

export const mobileApi = {
  // ============================================
  // GET OPEN JOBS (All jobs available to select)
  // ============================================
  async getOpenJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id, job_number, title, description, status, priority,
        scheduled_date, scheduled_start_time, scheduled_end_time,
        site_address, site_city, site_contact_name, site_contact_phone,
        access_instructions, special_instructions, notes,
        cleaners_required, estimated_duration_minutes, quoted_amount,
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
  // GET MY JOBS (Jobs assigned to THIS employee via field_job_assignments)
  // ============================================
  async getMyJobs(employeeId) {
    if (!employeeId) return { data: [], error: null }

    // Get assignments from the PROPER table (field_job_assignments)
    const { data: assignments, error: assignError } = await supabase
      .from('field_job_assignments')
      .select(`
        id, job_id, employee_id, assignment_status,
        assigned_at, started_at, completed_at,
        check_in_time, check_out_time,
        check_in_latitude, check_in_longitude, check_in_address
      `)
      .eq('employee_id', employeeId)
      .in('assignment_status', ['assigned', 'accepted', 'in_progress'])
      .order('assigned_at', { ascending: false })

    if (assignError) {
      console.error('Assignment error:', assignError)
      return { data: [], error: assignError }
    }

    if (!assignments || assignments.length === 0) {
      return { data: [], error: null }
    }

    // Get the actual jobs
    const jobIds = [...new Set(assignments.map(a => a.job_id).filter(Boolean))]
    if (jobIds.length === 0) return { data: [], error: null }

    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`
        id, job_number, title, description, status, priority,
        scheduled_date, scheduled_start_time, scheduled_end_time,
        site_address, site_city, site_contact_name, site_contact_phone,
        access_instructions, special_instructions, notes,
        cleaners_required, estimated_duration_minutes, quoted_amount,
        clients(company_name, client_code, phone, city),
        job_categories(name, color)
      `)
      .in('id', jobIds)
      .not('status', 'eq', 'completed')
      .not('status', 'eq', 'cancelled')
      .order('scheduled_date', { ascending: true })

    // Merge assignments with jobs
    const mergedJobs = (jobs || []).map(job => {
      const assignment = assignments.find(a => a.job_id === job.id)
      return {
        ...job,
        myAssignment: assignment || null,
        assignment_status: assignment?.assignment_status || null
      }
    })

    return { data: mergedJobs, error: jobsError }
  },

  // ============================================
  // SELECT JOB - Creates assignment in field_job_assignments
  // ============================================
  async selectJob(jobId, employeeId) {
    if (!employeeId) return { success: false, error: 'No employee record' }

    const { data: userData } = await supabase.auth.getUser()

    // Check if already assigned
    const { data: existing } = await supabase
      .from('field_job_assignments')
      .select('*')
      .eq('job_id', jobId)
      .eq('employee_id', employeeId)
      .maybeSingle()

    if (existing) {
      // Re-activate the assignment
      const { data, error } = await supabase
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
        .select()
        .single()

      if (!error) {
        // Update job status
        await supabase.from('jobs').update({ 
          status: 'in_progress', 
          updated_at: new Date().toISOString() 
        }).eq('id', jobId)
      }

      return { success: !error, data, error: error?.message }
    }

    // Create new assignment
    const { data, error } = await supabase
      .from('field_job_assignments')
      .insert([{
        job_id: jobId,
        employee_id: employeeId,
        assigned_by: userData.user?.id,
        assignment_status: 'assigned',
        assigned_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (!error) {
      // Update job status to in_progress
      await supabase.from('jobs').update({ 
        status: 'in_progress', 
        updated_at: new Date().toISOString() 
      }).eq('id', jobId)
    }

    return { success: !error, data, error: error?.message }
  },

  // ============================================
  // START JOB
  // ============================================
  async startJob(jobId, employeeId, latitude, longitude) {
    const updates = {
      assignment_status: 'in_progress',
      started_at: new Date().toISOString(),
      check_in_time: new Date().toISOString(),
      check_in_latitude: latitude,
      check_in_longitude: longitude
    }

    const { error: assignError } = await supabase
      .from('field_job_assignments')
      .update(updates)
      .eq('job_id', jobId)
      .eq('employee_id', employeeId)

    if (!assignError) {
      await supabase.from('jobs').update({ 
        status: 'in_progress', 
        actual_start_time: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      }).eq('id', jobId)
    }

    // Also clock in for attendance
    await mobileApi.clockIn(employeeId, jobId, latitude, longitude)

    return { success: !assignError, error: assignError?.message }
  },

  // ============================================
  // COMPLETE JOB
  // ============================================
  async completeJob(jobId, employeeId) {
    const { error: assignError } = await supabase
      .from('field_job_assignments')
      .update({
        assignment_status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('job_id', jobId)
      .eq('employee_id', employeeId)

    if (!assignError) {
      await supabase.from('jobs').update({ 
        status: 'completed', 
        actual_end_time: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      }).eq('id', jobId)
    }

    return { success: !assignError, error: assignError?.message }
  },

  // Clock in/out
  async clockIn(employeeId, jobId, latitude, longitude) {
    if (!employeeId) return { success: false, error: 'No employee record' }

    const { data, error } = await supabase
      .from('attendance_records')
      .upsert([{
        employee_id: employeeId,
        attendance_date: new Date().toISOString().split('T')[0],
        clock_in_time: new Date().toISOString(),
        check_in_method: 'gps',
        check_in_latitude: latitude,
        check_in_longitude: longitude,
        status: 'present'
      }], { onConflict: 'employee_id,attendance_date' })
      .select()
      .single()

    return { data, error }
  },

  async clockOut(employeeId) {
    if (!employeeId) return { success: false, error: 'No employee record' }

    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('attendance_records')
      .update({ 
        clock_out_time: new Date().toISOString(), 
        check_out_method: 'gps' 
      })
      .eq('employee_id', employeeId)
      .eq('attendance_date', today)
      .select()
      .single()

    return { data, error }
  },

  // Photos
  async uploadJobPhoto(jobId, employeeId, file, photoType, caption) {
    const fileExt = file.name.split('.').pop()
    const fileName = `job-photos/${jobId}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('fleet')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      try {
        await supabase.storage.createBucket('fleet', { public: true, fileSizeLimit: 10485760 })
        const { error: retryError } = await supabase.storage.from('fleet').upload(fileName, file, { upsert: true })
        if (retryError) return { error: retryError.message }
      } catch { return { error: uploadError.message } }
    }

    const { data: { publicUrl } } = supabase.storage.from('fleet').getPublicUrl(fileName)

    const { data, error } = await supabase
      .from('job_photos')
      .insert([{ job_id: jobId, employee_id: employeeId, photo_type: photoType, photo_url: publicUrl, caption }])
      .select().single()

    return { data, error }
  },

  // Signature
  async saveSignature(jobId, signatureUrl, clientName, rating) {
    const { data, error } = await supabase
      .from('client_signatures')
      .insert([{ job_id: jobId, signature_url: signatureUrl, signed_by: clientName, client_name: clientName, satisfaction_rating: rating }])
      .select().single()
    return { data, error }
  },

  // Task checklist
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
    const { data: attendance } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('attendance_date', today)
      .single()

    return {
      jobsToday: myJobs?.length || 0,
      isClockedIn: !!attendance?.clock_in_time && !attendance?.clock_out_time,
      clockInTime: attendance?.clock_in_time || null,
      completedJobs: myJobs?.filter(j => j.status === 'completed').length || 0
    }
  }
}
