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
  // GET ALL JOBS — split queries, no deep embed
  // (PostgREST rejects the nested employees() embed inside
  //  field_job_assignments, so we fetch each table separately
  //  and merge in JS)
  // ============================================
  async getJobs(filters = {}) {
    // 1. Base jobs query — shallow embeds only
    let query = supabase
      .from('jobs')
      .select(`
        *,
        clients(id, company_name, phone, email, address_line1, city),
        job_categories(name, color),
        teams(id, team_name)
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

    const { data: jobs, error } = await query
    if (error) {
      console.error('getJobs error:', error.message, error.details, error.hint)
      return { data: [], error }
    }
    if (!jobs || jobs.length === 0) return { data: [], error: null }

    // 2. Assignments for these jobs
    const jobIds = jobs.map(j => j.id)
    const { data: assignments } = await supabase
      .from('field_job_assignments')
      .select('id, job_id, employee_id, assignment_status, assigned_at')
      .in('job_id', jobIds)

    // 3. Employees for those assignments
    const empIds = [...new Set((assignments || []).map(a => a.employee_id).filter(Boolean))]
    let employees = []
    if (empIds.length > 0) {
      const { data } = await supabase
        .from('employees')
        .select('id, first_name, last_name, employee_code, phone, user_id')
        .in('id', empIds)
      employees = data || []
    }

    // 4. Merge
    const empMap = {}
    employees.forEach(e => { empMap[e.id] = e })

    const merged = jobs.map(job => ({
      ...job,
      field_job_assignments: (assignments || [])
        .filter(a => a.job_id === job.id)
        .map(a => ({ ...a, employees: empMap[a.employee_id] || null }))
    }))

    return { data: merged, error: null }
  },

  async getJob(id) {
    const [jobRes, assignRes] = await Promise.all([
      supabase
        .from('jobs')
        .select(`
          *,
          clients(*),
          job_categories(*),
          teams(*)
        `)
        .eq('id', id)
        .single(),
      supabase
        .from('field_job_assignments')
        .select('*')
        .eq('job_id', id)
    ])

    if (jobRes.error) return { data: null, error: jobRes.error }

    // Attach employees to each assignment
    const assignments = assignRes.data || []
    const empIds = [...new Set(assignments.map(a => a.employee_id).filter(Boolean))]
    let employees = []
    if (empIds.length > 0) {
      const { data } = await supabase.from('employees').select('*').in('id', empIds)
      employees = data || []
    }
    const empMap = {}
    employees.forEach(e => { empMap[e.id] = e })

    return {
      data: {
        ...jobRes.data,
        field_job_assignments: assignments.map(a => ({ ...a, employees: empMap[a.employee_id] || null }))
      },
      error: null
    }
  },

  // ============================================
  // SEARCH BY JOB NUMBER (split queries — no deep embed)
  // ============================================
  async searchByJobNumber(query) {
    if (!query || !query.trim()) return { data: [], error: null }
    const trimmed = query.trim().toUpperCase()

    // 1. Base job query
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, job_number, title, status, priority, scheduled_date, scheduled_start_time, quoted_amount, client_id, job_category_id')
      .ilike('job_number', `%${trimmed}%`)
      .order('created_at', { ascending: false })
      .limit(15)

    if (error) {
      console.error('searchByJobNumber error:', error.message, error.details)
      return { data: [], error }
    }
    if (!jobs || jobs.length === 0) return { data: [], error: null }

    // 2. Fetch clients
    const clientIds = [...new Set(jobs.map(j => j.client_id).filter(Boolean))]
    let clients = []
    if (clientIds.length > 0) {
      const { data } = await supabase
        .from('clients')
        .select('id, company_name')
        .in('id', clientIds)
      clients = data || []
    }

    // 3. Fetch categories
    const catIds = [...new Set(jobs.map(j => j.job_category_id).filter(Boolean))]
    let categories = []
    if (catIds.length > 0) {
      const { data } = await supabase
        .from('job_categories')
        .select('id, name, color')
        .in('id', catIds)
      categories = data || []
    }

    // 4. Merge
    const merged = jobs.map(j => ({
      ...j,
      clients: clients.find(c => c.id === j.client_id) || null,
      job_categories: categories.find(c => c.id === j.job_category_id) || null
    }))

    return { data: merged, error: null }
  },

  // ============================================
  // FULL LOAD FOR EDITOR (job + items)
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
      console.warn('job_items fetch failed:', itemsRes.error.message)
      return { data: { ...jobRes.data, job_items: [] }, error: null }
    }

    return {
      data: { ...jobRes.data, job_items: itemsRes.data || [] },
      error: null
    }
  },

  // ============================================
  // AVAILABLE SERVICES (for the picker)
  // ============================================
  async getAvailableServices() {
    const { data, error } = await supabase
      .from('products_services')
      .select('*')

    if (error) {
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
  // SAVE FULL JOB (details + items + schedule)
  // ============================================
  async saveFullJob(jobId, { jobData, items, originalItemIds, schedule }, currentUser) {
    try {
      const subtotal = (items || []).reduce((sum, it) => {
        const line = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0)
        return sum + line
      }, 0)

      const jobPatch = {
        ...(jobData || {}),
        ...(schedule || {}),
        quoted_amount: subtotal,
        updated_at: new Date().toISOString(),
        last_updated_by: currentUser?.id,
        last_updated_at: new Date().toISOString()
      }

      Object.keys(jobPatch).forEach(k => jobPatch[k] === undefined && delete jobPatch[k])

      const { error: jobError } = await supabase
        .from('jobs')
        .update(jobPatch)
        .eq('id', jobId)

      if (jobError) return { error: jobError }

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
