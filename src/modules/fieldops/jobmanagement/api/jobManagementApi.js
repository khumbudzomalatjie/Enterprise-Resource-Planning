import { supabase } from '../../../../lib/supabaseClient'

// Normalize a services/products row so the UI has consistent fields
const normalizeService = (s) => ({
  id: s.id,
  name: s.name || s.service_name || s.product_name || s.title || 'Service',
  price: parseFloat(s.price || s.unit_price || s.rate || 0),
  unit: s.unit || 'service',
  description: s.description || s.notes || s.name || 'Service'
})

// ═══════════════════════════════════════════════════════════════
// ✅ Reliable actor name resolver
// Tries: passed-in full_name → passed-in email → profiles table →
//        auth user email → user_metadata.full_name → "User"
// ═══════════════════════════════════════════════════════════════
async function resolveActorName(currentUser) {
  // 1. Fast path — client already provided a real name
  if (currentUser?.full_name && String(currentUser.full_name).trim()) {
    return currentUser.full_name
  }
  if (currentUser?.name && String(currentUser.name).trim()) {
    return currentUser.name
  }

  // 2. Fetch from auth + profiles
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Still fall back to whatever client passed
      return currentUser?.email || 'Unknown'
    }

    // Try profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.full_name && String(profile.full_name).trim()) return profile.full_name
    if (profile?.email) return profile.email
    if (user.user_metadata?.full_name) return user.user_metadata.full_name
    if (user.email) return user.email

    // Absolute fallback — never write null
    return currentUser?.email || 'User'
  } catch (err) {
    console.warn('resolveActorName error:', err.message)
    return currentUser?.email || 'Unknown'
  }
}

// ─────────────────────────────────────────────
// Reusable fetch-by-IDs helpers
// ─────────────────────────────────────────────
async function fetchClientsByIds(ids) {
  if (!ids || ids.length === 0) return {}
  const { data } = await supabase.from('clients').select('*').in('id', ids)
  const map = {}
  ;(data || []).forEach(c => { map[c.id] = c })
  return map
}

async function fetchCategoriesByIds(ids) {
  if (!ids || ids.length === 0) return {}
  const { data } = await supabase.from('job_categories').select('id, name, color').in('id', ids)
  const map = {}
  ;(data || []).forEach(c => { map[c.id] = c })
  return map
}

async function fetchTeamsByIds(ids) {
  if (!ids || ids.length === 0) return {}
  const { data } = await supabase.from('teams').select('id, team_name').in('id', ids)
  const map = {}
  ;(data || []).forEach(t => { map[t.id] = t })
  return map
}

async function fetchEmployeesByIds(ids) {
  if (!ids || ids.length === 0) return {}
  const { data } = await supabase
    .from('employees')
    .select('id, first_name, last_name, employee_code, phone, user_id')
    .in('id', ids)
  const map = {}
  ;(data || []).forEach(e => { map[e.id] = e })
  return map
}

// Central helper: build a job_history row with a guaranteed name
async function buildHistoryEntry({ jobId, actionType, description, currentUser, extra = {} }) {
  const actorName = await resolveActorName(currentUser)
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
  const actorId = currentUser?.id || user?.id || null

  return {
    job_id: jobId,
    action_type: actionType,
    action_description: description,
    performed_by: actorId,
    performed_by_name: actorName,
    performed_by_role: currentUser?.role || null,
    ...extra
  }
}

export const jobManagementApi = {
  // ============================================
  // GET ALL JOBS — no embeds, no jobs.team_id
  // ============================================
  async getJobs(filters = {}) {
    let query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
    if (filters.priority && filters.priority !== 'all') query = query.eq('priority', filters.priority)
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

    const jobIds = jobs.map(j => j.id)
    const clientIds = [...new Set(jobs.map(j => j.client_id).filter(Boolean))]
    const catIds = [...new Set(jobs.map(j => j.job_category_id).filter(Boolean))]

    const [clients, categories, assignRes] = await Promise.all([
      fetchClientsByIds(clientIds),
      fetchCategoriesByIds(catIds),
      supabase
        .from('field_job_assignments')
        .select('id, job_id, employee_id, team_id, assignment_status, assigned_at')
        .in('job_id', jobIds)
    ])

    const assignments = assignRes.data || []

    const empIds = [...new Set(assignments.map(a => a.employee_id).filter(Boolean))]
    const teamIds = [...new Set(assignments.map(a => a.team_id).filter(Boolean))]

    const [employees, teams] = await Promise.all([
      fetchEmployeesByIds(empIds),
      fetchTeamsByIds(teamIds)
    ])

    const merged = jobs.map(job => {
      const jobAssignments = assignments
        .filter(a => a.job_id === job.id)
        .map(a => ({ ...a, employees: employees[a.employee_id] || null }))

      const activeAssign = jobAssignments.find(a => a.assignment_status !== 'released' && a.assignment_status !== 'completed')
      const team = activeAssign?.team_id ? (teams[activeAssign.team_id] || null) : null

      return {
        ...job,
        clients: clients[job.client_id] || null,
        job_categories: categories[job.job_category_id] || null,
        teams: team,
        field_job_assignments: jobAssignments
      }
    })

    return { data: merged, error: null }
  },

  // ============================================
  // GET ONE JOB
  // ============================================
  async getJob(id) {
    const [jobRes, assignRes] = await Promise.all([
      supabase.from('jobs').select('*').eq('id', id).single(),
      supabase.from('field_job_assignments').select('*').eq('job_id', id)
    ])

    if (jobRes.error) return { data: null, error: jobRes.error }

    const job = jobRes.data
    const assignments = assignRes.data || []

    const empIds = [...new Set(assignments.map(a => a.employee_id).filter(Boolean))]
    const teamIds = [...new Set(assignments.map(a => a.team_id).filter(Boolean))]

    const [clients, categories, teams, employees] = await Promise.all([
      fetchClientsByIds(job.client_id ? [job.client_id] : []),
      fetchCategoriesByIds(job.job_category_id ? [job.job_category_id] : []),
      fetchTeamsByIds(teamIds),
      fetchEmployeesByIds(empIds)
    ])

    const enrichedAssignments = assignments.map(a => ({
      ...a,
      employees: employees[a.employee_id] || null
    }))

    const activeAssign = enrichedAssignments.find(a => a.assignment_status !== 'released' && a.assignment_status !== 'completed')
    const team = activeAssign?.team_id ? (teams[activeAssign.team_id] || null) : null

    return {
      data: {
        ...job,
        clients: clients[job.client_id] || null,
        job_categories: categories[job.job_category_id] || null,
        teams: team,
        field_job_assignments: enrichedAssignments
      },
      error: null
    }
  },

  // ============================================
  // SEARCH BY JOB NUMBER
  // ============================================
  async searchByJobNumber(query) {
    if (!query || !query.trim()) return { data: [], error: null }
    const trimmed = query.trim().toUpperCase()

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

    const clientIds = [...new Set(jobs.map(j => j.client_id).filter(Boolean))]
    const catIds = [...new Set(jobs.map(j => j.job_category_id).filter(Boolean))]

    const [clients, categories] = await Promise.all([
      fetchClientsByIds(clientIds),
      fetchCategoriesByIds(catIds)
    ])

    const merged = jobs.map(j => ({
      ...j,
      clients: clients[j.client_id] || null,
      job_categories: categories[j.job_category_id] || null
    }))

    return { data: merged, error: null }
  },

  // ============================================
  // FULL LOAD FOR EDITOR
  // ============================================
  async getJobWithItems(jobId) {
    const [jobRes, itemsRes] = await Promise.all([
      supabase.from('jobs').select('*').eq('id', jobId).single(),
      supabase.from('job_items').select('*').eq('job_id', jobId).order('item_number')
    ])

    if (jobRes.error) return { data: null, error: jobRes.error }

    const job = jobRes.data

    const [clients, categories] = await Promise.all([
      fetchClientsByIds(job.client_id ? [job.client_id] : []),
      fetchCategoriesByIds(job.job_category_id ? [job.job_category_id] : [])
    ])

    const items = itemsRes.error ? [] : (itemsRes.data || [])
    if (itemsRes.error) console.warn('job_items fetch failed:', itemsRes.error.message)

    return {
      data: {
        ...job,
        clients: clients[job.client_id] || null,
        job_categories: categories[job.job_category_id] || null,
        job_items: items
      },
      error: null
    }
  },

  // ============================================
  // AVAILABLE SERVICES
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

    // Never allow team_id in the patch — it lives on the assignment
    const { team_id, ...safeUpdates } = updates || {}

    const { error } = await supabase
      .from('jobs')
      .update({
        ...safeUpdates,
        last_updated_by: currentUser?.id,
        last_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) return { error }

    const historyEntry = await buildHistoryEntry({
      jobId,
      actionType: 'edited',
      description: 'Job details edited',
      currentUser
    })
    await supabase.from('job_history').insert([historyEntry])

    return { success: true }
  },

  // ============================================
  // SAVE FULL JOB
  // ============================================
  async saveFullJob(jobId, { jobData, items, originalItemIds, schedule }, currentUser) {
    try {
      const subtotal = (items || []).reduce((sum, it) => {
        const line = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0)
        return sum + line
      }, 0)

      const { team_id, ...safeJobData } = jobData || {}

      const jobPatch = {
        ...safeJobData,
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

      const historyEntry = await buildHistoryEntry({
        jobId,
        actionType: 'edited',
        description: `Job details, services and schedule updated (${(items || []).length} items, R${subtotal.toFixed(2)})`,
        currentUser
      })
      await supabase.from('job_history').insert([historyEntry])

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

    const historyEntry = await buildHistoryEntry({
      jobId,
      actionType: 'rescheduled',
      description: `Rescheduled from ${oldDateTime} to ${newDateTime}`,
      currentUser,
      extra: {
        old_value: oldDateTime,
        new_value: newDateTime,
        reason: reason,
        notes: notes
      }
    })
    await supabase.from('job_history').insert([historyEntry])

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

    const historyEntry = await buildHistoryEntry({
      jobId,
      actionType: 'postponed',
      description: `Job postponed${expectedDate ? '. Expected new date: ' + expectedDate : ''}`,
      currentUser,
      extra: {
        reason: reason,
        notes: notes
      }
    })
    await supabase.from('job_history').insert([historyEntry])

    return { success: true }
  },

  // ============================================
  // REASSIGN — team lives on the ASSIGNMENT
  // ============================================
  async reassignJob(jobId, { newTeamId, newEmployeeId, reason }, currentUser) {
    const { error: jobError } = await supabase
      .from('jobs')
      .update({
        status: 'assigned',
        last_updated_by: currentUser?.id,
        last_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (jobError) return { error: jobError }

    if (newEmployeeId) {
      const { error: assignError } = await supabase
        .from('field_job_assignments')
        .upsert([{
          job_id: jobId,
          employee_id: newEmployeeId,
          team_id: newTeamId || null,
          assigned_by: currentUser?.id,
          assignment_status: 'assigned',
          assigned_at: new Date().toISOString()
        }], { onConflict: 'job_id,employee_id' })

      if (assignError) console.warn('Assignment upsert warning:', assignError.message)
    } else if (newTeamId) {
      const { error: updateErr } = await supabase
        .from('field_job_assignments')
        .update({ team_id: newTeamId })
        .eq('job_id', jobId)
        .in('assignment_status', ['assigned', 'accepted', 'in_progress'])

      if (updateErr) console.warn('Assignment team update warning:', updateErr.message)
    }

    const historyEntry = await buildHistoryEntry({
      jobId,
      actionType: 'reassigned',
      description: `Job reassigned${newTeamId ? ' to new team' : ''}${newEmployeeId ? ' and new cleaner' : ''}`,
      currentUser,
      extra: { reason }
    })
    await supabase.from('job_history').insert([historyEntry])

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

    const historyEntry = await buildHistoryEntry({
      jobId,
      actionType: 'priority_changed',
      description: `Priority changed from ${oldJob.priority} to ${newPriority}`,
      currentUser,
      extra: {
        old_value: oldJob.priority,
        new_value: newPriority
      }
    })
    await supabase.from('job_history').insert([historyEntry])

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

    const historyEntry = await buildHistoryEntry({
      jobId,
      actionType: 'cancelled',
      description: `Job cancelled`,
      currentUser,
      extra: {
        reason: reason,
        notes: notes
      }
    })
    await supabase.from('job_history').insert([historyEntry])

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
