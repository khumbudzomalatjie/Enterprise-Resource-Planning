import { supabase } from '../../../../lib/supabaseClient'

export const jobManagementApi = {
  // ============================================
  // GET ALL JOBS WITH DETAILS
  // ============================================
  async getJobs(filters = {}) {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        clients(id, company_name, phone, email, address_line1, city, contact_person),
        job_categories(name, color),
        teams(id, team_name),
        field_job_assignments(
          id, employee_id, assignment_status, assigned_at,
          employees(id, first_name, last_name, employee_code, phone, user_id)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
    if (filters.priority && filters.priority !== 'all') query = query.eq('priority', filters.priority)
    if (filters.team_id) query = query.eq('team_id', filters.team_id)
    if (filters.date_from) query = query.gte('scheduled_date', filters.date_from)
    if (filters.date_to) query = query.lte('scheduled_date', filters.date_to)
    if (filters.search) {
      query = query.or(`job_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%,site_address.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    return { data: data || [], error }
  },

  async getJob(id) {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        clients(*),
        job_categories(*),
        teams(*),
        field_job_assignments(
          *,
          employees(*)
        )
      `)
      .eq('id', id)
      .single()
    return { data, error }
  },

  // ============================================
  // JOB HISTORY
  // ============================================
  async getJobHistory(jobId) {
    const { data, error } = await supabase
      .from('job_history')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
    return { data: data || [], error }
  },

  // ============================================
  // STATS
  // ============================================
  async getJobStats() {
    const { data: allJobs } = await supabase
      .from('jobs')
      .select('status')
      .limit(2000)

    const stats = {
      total: 0,
      scheduled: 0,
      rescheduled: 0,
      postponed: 0,
      reassigned: 0,
      cancelled: 0,
      completed: 0,
      in_progress: 0,
      assigned: 0,
    }

    if (allJobs) {
      stats.total = allJobs.length
      allJobs.forEach(j => {
        if (j.status === 'scheduled') stats.scheduled++
        else if (j.status === 'rescheduled') stats.rescheduled++
        else if (j.status === 'postponed') stats.postponed++
        else if (j.status === 'cancelled') stats.cancelled++
        else if (j.status === 'completed') stats.completed++
        else if (j.status === 'in_progress') stats.in_progress++
        else if (j.status === 'assigned') stats.assigned++
      })
    }
    return stats
  },

  // ============================================
  // EDIT JOB
  // ============================================
  async editJob(jobId, updates, currentUser) {
    const { data: oldJob } = await supabase.from('jobs').select('*').eq('id', jobId).single()
    if (!oldJob) return { error: 'Job not found' }

    const { error } = await supabase
      .from('jobs')
      .update({
        ...updates,
        last_updated_by: currentUser?.id,
        last_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) return { error }

    // Log history
    await supabase.from('job_history').insert([{
      job_id: jobId,
      action_type: 'edited',
      action_description: 'Job details edited',
      performed_by: currentUser?.id,
      performed_by_name: currentUser?.full_name || currentUser?.email,
      performed_by_role: currentUser?.role
    }])

    return { success: true }
  },

  // ============================================
  // RESCHEDULE
  // ============================================
  async rescheduleJob(jobId, { newDate, newTime, reason, notes }, currentUser) {
    const { data: oldJob } = await supabase.from('jobs').select('*').eq('id', jobId).single()
    if (!oldJob) return { error: 'Job not found' }

    const oldDateTime = `${oldJob.scheduled_date} ${oldJob.scheduled_start_time || ''}`
    const newDateTime = `${newDate} ${newTime || ''}`

    const { error } = await supabase
      .from('jobs')
      .update({
        original_date: oldJob.original_date || oldJob.scheduled_date,
        original_time: oldJob.original_time || oldJob.scheduled_start_time,
        scheduled_date: newDate,
        scheduled_time: newTime,
        scheduled_start_time: newTime,
        reschedule_reason: reason,
        status: 'rescheduled',
        last_updated_by: currentUser?.id,
        last_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) return { error }

    await supabase.from('job_history').insert([{
      job_id: jobId,
      action_type: 'rescheduled',
      action_description: `Rescheduled from ${oldDateTime} to ${newDateTime}`,
      old_value: oldDateTime,
      new_value: newDateTime,
      reason: reason,
      notes: notes,
      performed_by: currentUser?.id,
      performed_by_name: currentUser?.full_name || currentUser?.email,
      performed_by_role: currentUser?.role
    }])

    return { success: true }
  },

  // ============================================
  // POSTPONE
  // ============================================
  async postponeJob(jobId, { reason, notes, expectedDate }, currentUser) {
    const { data: oldJob } = await supabase.from('jobs').select('*').eq('id', jobId).single()
    if (!oldJob) return { error: 'Job not found' }

    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'postponed',
        postponement_reason: reason + (expectedDate ? ` (Expected: ${expectedDate})` : ''),
        last_updated_by: currentUser?.id,
        last_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) return { error }

    await supabase.from('job_history').insert([{
      job_id: jobId,
      action_type: 'postponed',
      action_description: `Job postponed${expectedDate ? '. Expected new date: ' + expectedDate : ''}`,
      reason: reason,
      notes: notes,
      performed_by: currentUser?.id,
      performed_by_name: currentUser?.full_name || currentUser?.email,
      performed_by_role: currentUser?.role
    }])

    return { success: true }
  },

  // ============================================
  // REASSIGN
  // ============================================
  async reassignJob(jobId, { newTeamId, newEmployeeId, reason }, currentUser) {
    const { error: jobError } = await supabase
      .from('jobs')
      .update({
        team_id: newTeamId || null,
        status: 'assigned',
        last_updated_by: currentUser?.id,
        last_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (jobError) return { error: jobError }

    // If new employee specified, create assignment
    if (newEmployeeId) {
      await supabase.from('field_job_assignments').upsert([{
        job_id: jobId,
        employee_id: newEmployeeId,
        team_id: newTeamId,
        assigned_by: currentUser?.id,
        assignment_status: 'assigned',
        assigned_at: new Date().toISOString()
      }], { onConflict: 'job_id,employee_id' })
    }

    await supabase.from('job_history').insert([{
      job_id: jobId,
      action_type: 'reassigned',
      action_description: `Job reassigned${newTeamId ? ' to new team' : ''}${newEmployeeId ? ' and new cleaner' : ''}`,
      reason: reason,
      performed_by: currentUser?.id,
      performed_by_name: currentUser?.full_name || currentUser?.email,
      performed_by_role: currentUser?.role
    }])

    return { success: true }
  },

  // ============================================
  // CHANGE PRIORITY
  // ============================================
  async changePriority(jobId, newPriority, currentUser) {
    const { data: oldJob } = await supabase.from('jobs').select('*').eq('id', jobId).single()
    if (!oldJob) return { error: 'Job not found' }

    const { error } = await supabase
      .from('jobs')
      .update({
        priority: newPriority,
        last_updated_by: currentUser?.id,
        last_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) return { error }

    await supabase.from('job_history').insert([{
      job_id: jobId,
      action_type: 'priority_changed',
      action_description: `Priority changed from ${oldJob.priority} to ${newPriority}`,
      old_value: oldJob.priority,
      new_value: newPriority,
      performed_by: currentUser?.id,
      performed_by_name: currentUser?.full_name || currentUser?.email,
      performed_by_role: currentUser?.role
    }])

    return { success: true }
  },

  // ============================================
  // CANCEL
  // ============================================
  async cancelJob(jobId, { reason, notes }, currentUser) {
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        last_updated_by: currentUser?.id,
        last_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) return { error }

    await supabase.from('job_history').insert([{
      job_id: jobId,
      action_type: 'cancelled',
      action_description: `Job cancelled`,
      reason: reason,
      notes: notes,
      performed_by: currentUser?.id,
      performed_by_name: currentUser?.full_name || currentUser?.email,
      performed_by_role: currentUser?.role
    }])

    return { success: true }
  },

  // ============================================
  // GET TEAMS & EMPLOYEES (for reassign)
  // ============================================
  async getTeams() {
    const { data } = await supabase.from('teams').select('id, team_name').eq('is_active', true).order('team_name')
    return data || []
  },

  async getEmployees() {
    const { data } = await supabase.from('employees').select('id, first_name, last_name, employee_code, user_id').eq('employment_status', 'active').order('first_name')
    return data || []
  }
}
