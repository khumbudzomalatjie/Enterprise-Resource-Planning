import { supabase } from '../../../lib/supabaseClient'

export const fieldOpsApi = {
  async getLiveJobs() {
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs').select('*, job_photos(*)').order('scheduled_date', { ascending: true }).order('scheduled_start_time', { ascending: true }).limit(100)
    if (jobsError || !jobs || jobs.length === 0) return { data: jobs || [], error: jobsError }
    const jobIds = jobs.map(j => j.id)
    const clientIds = [...new Set(jobs.map(j => j.client_id).filter(Boolean))]
    const { data: clients } = await supabase.from('clients').select('id, company_name, client_code, phone, city, address_line1').in('id', clientIds)
    const catIds = [...new Set(jobs.map(j => j.job_category_id).filter(Boolean))]
    const { data: categories } = await supabase.from('job_categories').select('id, name, color').in('id', catIds)
    const teamIds = [...new Set(jobs.map(j => j.team_id).filter(Boolean))]
    const { data: teams } = await supabase.from('teams').select('id, team_name').in('id', teamIds)
    const { data: fieldAssignments } = await supabase.from('field_job_assignments').select('*').in('job_id', jobIds)
    const allAssignments = fieldAssignments || []
    const empIds = [...new Set(allAssignments.map(a => a.employee_id).filter(Boolean))]
    const { data: employees } = await supabase.from('employees').select('id, first_name, last_name, employee_code, phone, department, position, user_id').in('id', empIds)
    const merged = jobs.filter(job => job.status !== 'cancelled').map(job => ({
      ...job, clients: (clients || []).find(c => c.id === job.client_id) || null,
      job_categories: (categories || []).find(c => c.id === job.job_category_id) || null,
      teams: (teams || []).find(t => t.id === job.team_id) || null,
      field_job_assignments: allAssignments.filter(a => a.job_id === job.id).map(a => ({ ...a, employees: (employees || []).find(e => e.id === a.employee_id) || null }))
    }))
    return { data: merged, error: null }
  },

  async getAssignedEmployees(jobId) {
    const { data, error } = await supabase.from('field_job_assignments').select('*, employees(first_name, last_name, employee_code, phone, department, user_id)').eq('job_id', jobId)
    return { data, error }
  },

  async assignEmployeeToJob(jobId, employeeId, teamId = null) {
    const { data: userData } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('field_job_assignments')
      .upsert([{ job_id: jobId, employee_id: employeeId, team_id: teamId, assigned_by: userData.user?.id, assignment_status: 'assigned', assigned_at: new Date().toISOString() }], { onConflict: 'job_id,employee_id' })
      .select('*, employees(first_name, last_name, user_id)').maybeSingle()
    if (!error) {
      await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', jobId)
    }
    return { data, error }
  },

  async releaseEmployeeFromJob(assignmentId, reason = '') {
    const { data: userData } = await supabase.auth.getUser()
    const { data: assignment } = await supabase.from('field_job_assignments').select('job_id').eq('id', assignmentId).maybeSingle()
    const { data, error } = await supabase.from('field_job_assignments').update({ assignment_status: 'released', released_at: new Date().toISOString(), released_by: userData.user?.id, release_reason: reason }).eq('id', assignmentId).select().maybeSingle()
    if (!error && assignment?.job_id) {
      const { data: remaining } = await supabase.from('field_job_assignments').select('id').eq('job_id', assignment.job_id).in('assignment_status', ['assigned', 'accepted', 'in_progress'])
      if (!remaining || remaining.length === 0) {
        await supabase.from('jobs').update({ status: 'pending' }).eq('id', assignment.job_id)
      }
    }
    return { data, error }
  },

  async bulkAssignEmployees(jobId, employeeIds, teamId = null) {
    const { data: userData } = await supabase.auth.getUser()
    const assignments = employeeIds.map(empId => ({ job_id: jobId, employee_id: empId, team_id: teamId, assigned_by: userData.user?.id, assignment_status: 'assigned', assigned_at: new Date().toISOString() }))
    const { data, error } = await supabase.from('field_job_assignments').upsert(assignments, { onConflict: 'job_id,employee_id' }).select('*, employees(first_name, last_name)')
    return { data, error }
  },

  async updateJobStatus(jobId, status, employeeId = null) {
    const updates = { status }
    if (status === 'in_progress') updates.actual_start_time = new Date().toISOString()
    if (status === 'completed') updates.actual_end_time = new Date().toISOString()
    const { data, error } = await supabase.from('jobs').update(updates).eq('id', jobId).select().maybeSingle()
    return { data, error }
  },

  async syncJobWithMobile(jobId, data) {
    const { employeeId, status, checkInLocation, checkOutLocation, notes } = data
    if (status) await this.updateJobStatus(jobId, status, employeeId)
    if (employeeId) {
      const updates = {}
      if (checkInLocation) { updates.check_in_latitude = checkInLocation.latitude; updates.check_in_longitude = checkInLocation.longitude; updates.check_in_time = new Date().toISOString() }
      if (checkOutLocation) { updates.check_out_latitude = checkOutLocation.latitude; updates.check_out_longitude = checkOutLocation.longitude; updates.check_out_time = new Date().toISOString() }
      if (notes) updates.employee_notes = notes
      if (Object.keys(updates).length > 0) await supabase.from('field_job_assignments').update(updates).eq('job_id', jobId).eq('employee_id', employeeId)
    }
    const { data: updatedJob } = await supabase.from('jobs').select('*, clients(*), job_categories(*)').eq('id', jobId).maybeSingle()
    return { success: true, job: updatedJob }
  },

  async getLiveJobsByEmployee(employeeId) {
    const { data: fieldData } = await supabase.from('field_job_assignments').select('*').eq('employee_id', employeeId).order('assigned_at', { ascending: false })
    if (!fieldData?.length) return { data: [], error: null }
    const jobIds = [...new Set(fieldData.map(a => a.job_id).filter(Boolean))]
    const { data: jobs } = await supabase.from('jobs').select('*').in('id', jobIds)
    const clientIds = [...new Set((jobs || []).map(j => j.client_id).filter(Boolean))]
    const { data: clients } = await supabase.from('clients').select('id, company_name, client_code, phone, city').in('id', clientIds)
    const catIds = [...new Set((jobs || []).map(j => j.job_category_id).filter(Boolean))]
    const { data: categories } = await supabase.from('job_categories').select('id, name, color').in('id', catIds)
    const activeJobs = fieldData.filter(a => { const job = (jobs || []).find(j => j.id === a.job_id); return job && job.status !== 'completed' && job.status !== 'cancelled' }).map(a => { const job = (jobs || []).find(j => j.id === a.job_id); return { ...a, jobs: job ? { ...job, clients: (clients || []).find(c => c.id === job.client_id) || null, job_categories: (categories || []).find(c => c.id === job.job_category_id) || null } : null } })
    return { data: activeJobs, error: null }
  },

  async getMobileSyncData(employeeId) {
    const [jobsResult, assignedResult] = await Promise.all([this.getLiveJobs(), this.getLiveJobsByEmployee(employeeId)])
    return { allLiveJobs: jobsResult.data || [], myAssignedJobs: assignedResult.data || [], timestamp: new Date().toISOString() }
  },

  async getIncidents(filters = {}) {
    const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(100)
    if (error || !data?.length) return { data: data || [], error }
    const empIds = [...new Set(data.map(i => i.employee_id).filter(Boolean))]
    const { data: employees } = await supabase.from('employees').select('id, first_name, last_name, employee_code').in('id', empIds)
    const merged = data.map(i => ({ ...i, employees: (employees || []).find(e => e.id === i.employee_id) || null }))
    return { data: merged, error: null }
  },

  async getIncident(id) { const { data, error } = await supabase.from('incidents').select('*').eq('id', id).maybeSingle(); return { data, error } },
  async createIncident(incidentData) { const { data, error } = await supabase.from('incidents').insert([incidentData]).select().maybeSingle(); return { data, error } },
  async updateIncident(id, updates) { const { data, error } = await supabase.from('incidents').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle(); return { data, error } },
  async resolveIncident(id, resolution) { const { data: userData } = await supabase.auth.getUser(); const { data, error } = await supabase.from('incidents').update({ status: 'resolved', investigation_findings: resolution.findings, root_cause: resolution.root_cause, corrective_actions: resolution.corrective_actions, preventive_actions: resolution.preventive_actions, resolved_by: userData.user?.id, resolved_at: new Date().toISOString() }).eq('id', id).select().maybeSingle(); return { data, error } },
  async getAllJobNumbers() { const { data, error } = await supabase.from('jobs').select('job_number, title, status, scheduled_date').order('created_at', { ascending: false }).limit(50); return { data, error } },

  async getJobAuditTrail(searchInput) {
    const search = searchInput.trim().toUpperCase()
    let { data: job } = await supabase.from('jobs').select('*').eq('job_number', search).maybeSingle()
    if (!job) { const { data: partial } = await supabase.from('jobs').select('*').ilike('job_number', `%${search}%`).limit(1).maybeSingle(); job = partial }
    if (!job) { const { data: titleMatch } = await supabase.from('jobs').select('*').ilike('title', `%${searchInput.trim()}%`).limit(1).maybeSingle(); job = titleMatch }
    if (!job) return { error: `No job found`, notFound: true }
    const [{ data: client }, { data: category }, { data: auditLogs }, { data: assignments }] = await Promise.all([
      job.client_id ? supabase.from('clients').select('*').eq('id', job.client_id).maybeSingle() : { data: null },
      job.job_category_id ? supabase.from('job_categories').select('*').eq('id', job.job_category_id).maybeSingle() : { data: null },
      supabase.from('job_full_audit').select('*').eq('job_id', job.id).order('created_at', { ascending: true }),
      supabase.from('field_job_assignments').select('*, employees(first_name, last_name, employee_code)').eq('job_id', job.id).order('assigned_at', { ascending: true })
    ])
    return { data: { job: { ...job, clients: client?.data || null, job_categories: category?.data || null }, auditLogs: auditLogs?.data || [], assignments: assignments?.data || [] } }
  },

  async getFieldOpsStats() {
    const { data: allJobs } = await supabase.from('jobs').select('*').order('scheduled_date', { ascending: true }).limit(200)
    const openJobs = (allJobs || []).filter(j => j.status !== 'completed' && j.status !== 'cancelled')
    const { count: assignedEmployees } = await supabase.from('field_job_assignments').select('*', { count: 'exact', head: true }).in('assignment_status', ['assigned', 'accepted', 'in_progress'])
    return { activeJobs: openJobs.length, assignedEmployees: assignedEmployees || 0, openIncidents: 0, liveJobs: openJobs.slice(0, 10) }
  }
}
