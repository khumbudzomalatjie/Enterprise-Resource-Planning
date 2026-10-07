import { supabase } from '../../../../lib/supabaseClient'

// Normalize a services/products row so the UI has consistent fields
const normalizeService = (s) => ({
  id: s.id,
  name: s.name || s.service_name || s.product_name || s.title || 'Service',
  price: parseFloat(s.price || s.unit_price || s.rate || 0),
  unit: s.unit || 'service',
  description: s.description || s.notes || s.name || 'Service'
})

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
        field_job_assignments(*, employees(*))
      `)
      .eq('id', id)
      .single()
    return { data, error }
  },

  // ============================================
  // ✅ NEW: search jobs by number for lookup
  // ============================================
  async searchByJobNumber(query) {
    if (!query || !query.trim()) return { data: [], error: null }
    const trimmed = query.trim().toUpperCase()

    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id, job_number, title, status, priority,
        scheduled_date, scheduled_start_time, quoted_amount,
        clients(company_name),
        job_categories(name, color)
      `)
      .ilike('job_number', `%${trimmed}%`)
      .order('created_at', { ascending: false })
      .limit(15)

    return { data: data || [], error }
  },

  // ============================================
  // ✅ NEW: full load with items — used by editor
  // ============================================
  async getJobWithItems(jobId) {
    const [jobRes, itemsRes] = await Promise.all([
      supabase
        .from('jobs')
        .select(`
          *,
          clients(*),
          job_categories(*),
          teams(id, team_name)
        `)
        .eq('id', jobId)
        .single(),
      supabase
        .from('job_items')
        .select('*')
        .eq('job_id', jobId)
        .order('item_number')
    ])

    if (jobRes.error) return { data: null, error: jobRes.error }
    if (itemsRes.error) {
      // job_items might not exist — degrade gracefully
      console.warn('job_items fetch failed:', itemsRes.error.message)
      return { data: { ...jobRes.data, job_items: [] }, error: null }
    }

    return {
      data: {
        ...jobRes.data,
        job_items: itemsRes.data || []
      },
      error: null
    }
  },

  // ============================================
  // ✅ NEW: available services (for the picker)
  // ============================================
  async getAvailableServices() {
    const { data, error } = await supabase
      .from('products_services')
      .select('*')

    if (error) {
      // Fallback to job_categories if products_services isn't there
      const fb = await supabase
        .from('job_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')
      return { data: (fb.data || []).map(normalizeService), error: fb.error }
    }

    return { data: (data || []).map(normalizeService), error: null }
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
      total: 0, scheduled: 0, rescheduled: 0, postponed: 0, reassigned: 0,
      cancelled: 0, completed: 0, in_progress: 0, assigned: 0,
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
  // ✅ NEW: save full job (details + items + schedule)
  // ============================================
  async saveFullJob(jobId, { jobData, items, originalItemIds, schedule }, currentUser) {
    try {
      // 1. Compute subtotal from items
      const subtotal = (items || []).reduce((sum, it) => {
        const line = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0)
        return sum + line
      }, 0)

      // 2. Update job row (details + schedule + totals)
      const jobPatch = {
        ...(jobData || {}),
        ...(schedule || {}),
        quoted_amount: subtotal,
        updated_at: new Date().toISOString(),
        last_updated_by: currentUser?.id,
        last_updated_at: new Date().toISOString()
      }

      // Remove undefined
      Object.keys(jobPatch).forEach(k => jobPatch[k] === undefined && delete jobPatch[k])

      const { error: jobError } = await supabase
        .from('jobs')
        .update(jobPatch)
        .eq('id', jobId)

      if (jobError) return { error: jobError }

      // 3. Diff items
      const originalIds = originalItemIds || []
      const currentRealIds = (items || []).filter(i => i.id && !String(i.id).startsWith('temp-')).map(i => i.id)

      const toDelete = originalIds.filter(id => !currentRealIds.includes(id))
      const toInsert = (items || []).filter(i => !i.id || String(i.id).startsWith('temp-'))
      const toUpdate = (items || []).filter(i => i.id && !String(i.id).startsWith('temp-'))

      if (toDelete.length > 0) {
        await supabase.from('job_items').delete().in('id', toDelete)
      }

      if (toInsert.length > 0) {
        const startNum = originalIds.length || 0
        const inserts = toInsert.map((it, idx) => ({
          job_id: jobId,
          item_number: startNum + idx + 1,
          description: it.description || 'Service',
          quantity: parseFloat(it.quantity) || 1,
          unit: it.unit || 'service',
          unit_price: parseFloat(it.unit_price) || 0,
          total_price: (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0)
        }))
        const { error: insErr } = await supabase.from('job_items').insert(inserts)
        if (insErr) console.warn('Insert items warning:', insErr.message)
      }

      for (const it of toUpdate) {
        await supabase.from('job_items').update({
          description: it.description || 'Service',
          quantity: parseFloat(it.quantity) || 1,
          unit: it.unit || 'service',
          unit_price: parseFloat(it.unit_price) || 0,
          total_price: (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0),
          updated_at: new Date().toISOString()
        }).eq('id', it.id)
      }

      // 4. History log
      await supabase.from('job_history').insert([{
        job_id: jobId,
        action_type: 'edited',
        action_description: `Job details, services and schedule updated (${(items || []).length} items, R${subtotal.toFixed(2)})`,
        performed_by: currentUser?.id,
        performed_by_name: currentUser?.full_name || currentUser?.email,
        performed_by_role: currentUser?.role
      }])

      return { success: true, subtotal }
    } catch (err) {
      return { error: err }
    }
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
  // TEAMS & EMPLOYEES
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
