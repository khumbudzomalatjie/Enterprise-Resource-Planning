import { supabase } from '../../../lib/supabaseClient'

export const fieldOpsApi = {
  // ============================================
  // LIVE JOBS - Read from field_job_assignments
  // ============================================
  async getLiveJobs() {
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_start_time', { ascending: true })
      .limit(100)

    if (jobsError || !jobs || jobs.length === 0) {
      return { data: jobs || [], error: jobsError }
    }

    const jobIds = jobs.map(j => j.id)

    const clientIds = [...new Set(jobs.map(j => j.client_id).filter(Boolean))]
    const { data: clients } = await supabase.from('clients').select('id, company_name, client_code, phone, city, address_line1').in('id', clientIds)

    const catIds = [...new Set(jobs.map(j => j.job_category_id).filter(Boolean))]
    const { data: categories } = await supabase.from('job_categories').select('id, name, color').in('id', catIds)

    const teamIds = [...new Set(jobs.map(j => j.team_id).filter(Boolean))]
    const { data: teams } = await supabase.from('teams').select('id, team_name').in('id', teamIds)

    const { data: allAssignments } = await supabase.from('field_job_assignments').select('*').in('job_id', jobIds)

    const empIds = [...new Set((allAssignments || []).map(a => a.employee_id).filter(Boolean))]
    let employees = []
    if (empIds.length > 0) {
      const { data } = await supabase.from('employees').select('id, first_name, last_name, employee_code, phone, department, position, user_id').in('id', empIds)
      employees = data || []
    }

    const { data: inspections } = await supabase.from('quality_inspections').select('id, overall_rating, inspection_date, job_id').in('job_id', jobIds)
    const { data: checklists } = await supabase.from('job_checklist_items').select('id, description, is_completed, job_id').in('job_id', jobIds)

    const merged = jobs
      .filter(job => job.status !== 'cancelled')
      .map(job => ({
        ...job,
        clients: (clients || []).find(c => c.id === job.client_id) || null,
        job_categories: (categories || []).find(c => c.id === job.job_category_id) || null,
        teams: (teams || []).find(t => t.id === job.team_id) || null,
        field_job_assignments: (allAssignments || [])
          .filter(a => a.job_id === job.id)
          .map(a => ({ ...a, employees: (employees || []).find(e => e.id === a.employee_id) || null })),
        quality_inspections: (inspections || []).filter(i => i.job_id === job.id),
        job_checklist_items: (checklists || []).filter(c => c.job_id === job.id)
      }))

    return { data: merged, error: null }
  },

  async getAssignedEmployees(jobId) {
    const { data, error } = await supabase
      .from('field_job_assignments')
      .select('*, employees(first_name, last_name, employee_code, phone, department, user_id)')
      .eq('job_id', jobId)
    return { data, error }
  },

  async assignEmployeeToJob(jobId, employeeId, teamId = null) {
    const { data: userData } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('field_job_assignments')
      .upsert([{
        job_id: jobId, employee_id: employeeId, team_id: teamId,
        assigned_by: userData.user?.id, assignment_status: 'assigned',
        assigned_at: new Date().toISOString()
      }], { onConflict: 'job_id,employee_id' })
      .select('*, employees(first_name, last_name, user_id)')
      .single()
    return { data, error }
  },

  async releaseEmployeeFromJob(assignmentId, reason = '') {
    const { data: userData } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('field_job_assignments')
      .update({
        assignment_status: 'released', released_at: new Date().toISOString(),
        released_by: userData.user?.id, release_reason: reason
      })
      .eq('id', assignmentId).select().single()
    return { data, error }
  },

  async bulkAssignEmployees(jobId, employeeIds, teamId = null) {
    const { data: userData } = await supabase.auth.getUser()
    const assignments = employeeIds.map(empId => ({
      job_id: jobId, employee_id: empId, team_id: teamId,
      assigned_by: userData.user?.id, assignment_status: 'assigned',
      assigned_at: new Date().toISOString()
    }))
    const { data, error } = await supabase
      .from('field_job_assignments')
      .upsert(assignments, { onConflict: 'job_id,employee_id' })
      .select('*, employees(first_name, last_name)')
    return { data, error }
  },

  // ✅ FIXED: Works without employeeId, updates all active assignments on complete
  async updateJobStatus(jobId, status, employeeId = null) {
    const updates = { status, updated_at: new Date().toISOString() }
    if (status === 'in_progress') updates.actual_start_time = new Date().toISOString()
    if (status === 'completed') updates.actual_end_time = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)
      .select()
      .single()

    if (!error && employeeId) {
      const as = status === 'in_progress' ? 'in_progress' : status === 'completed' ? 'completed' : 'assigned'
      await supabase.from('field_job_assignments').update({ 
        assignment_status: as,
        ...(status === 'in_progress' ? { started_at: new Date().toISOString() } : {}),
        ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {})
      }).eq('job_id', jobId).eq('employee_id', employeeId)
    }
    
    // If no employeeId but job is being completed, update ALL active assignments
    if (!error && status === 'completed' && !employeeId) {
      await supabase.from('field_job_assignments').update({ 
        assignment_status: 'completed',
        completed_at: new Date().toISOString()
      }).eq('job_id', jobId).in('assignment_status', ['assigned', 'accepted', 'in_progress'])
    }
    
    return { data, error }
  },

  async syncJobWithMobile(jobId, data) {
    const { employeeId, status, checkInLocation, checkOutLocation, notes } = data
    if (status) await this.updateJobStatus(jobId, status, employeeId)
    if (employeeId) {
      const updates = {}
      if (checkInLocation) { updates.check_in_latitude = checkInLocation.latitude; updates.check_in_longitude = checkInLocation.longitude; updates.check_in_address = checkInLocation.address || null; updates.check_in_time = new Date().toISOString() }
      if (checkOutLocation) { updates.check_out_latitude = checkOutLocation.latitude; updates.check_out_longitude = checkOutLocation.longitude; updates.check_out_address = checkOutLocation.address || null; updates.check_out_time = new Date().toISOString() }
      if (notes) updates.employee_notes = notes
      if (Object.keys(updates).length > 0) await supabase.from('field_job_assignments').update(updates).eq('job_id', jobId).eq('employee_id', employeeId)
    }
    const { data: updatedJob } = await supabase.from('jobs').select('*, clients(*), job_categories(*)').eq('id', jobId).single()
    return { success: true, job: updatedJob }
  },

  async getLiveJobsByEmployee(employeeId) {
    const { data } = await supabase.from('field_job_assignments').select('*').eq('employee_id', employeeId).order('assigned_at', { ascending: false })
    if (!data?.length) return { data: [] }
    const jobIds = [...new Set(data.map(a => a.job_id).filter(Boolean))]
    const { data: jobs } = await supabase.from('jobs').select('*').in('id', jobIds)
    const clientIds = [...new Set((jobs || []).map(j => j.client_id).filter(Boolean))]
    const { data: clients } = await supabase.from('clients').select('id, company_name, client_code, phone, city').in('id', clientIds)
    const catIds = [...new Set((jobs || []).map(j => j.job_category_id).filter(Boolean))]
    const { data: categories } = await supabase.from('job_categories').select('id, name, color').in('id', catIds)
    const activeJobs = data.filter(a => { const job = (jobs || []).find(j => j.id === a.job_id); return job && job.status !== 'completed' && job.status !== 'cancelled' }).map(a => { const job = (jobs || []).find(j => j.id === a.job_id); return { ...a, jobs: job ? { ...job, clients: (clients || []).find(c => c.id === job.client_id) || null, job_categories: (categories || []).find(c => c.id === job.job_category_id) || null } : null } })
    return { data: activeJobs }
  },

  async getMobileSyncData(employeeId) {
    const [jobsResult, assignedResult] = await Promise.all([this.getLiveJobs(), this.getLiveJobsByEmployee(employeeId)])
    return { allLiveJobs: jobsResult.data || [], myAssignedJobs: assignedResult.data || [], timestamp: new Date().toISOString() }
  },

  // Incidents
  async getIncidents(filters = {}) {
    const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(100)
    if (error || !data) return { data: data || [], error }
    return { data, error: null }
  },
  async getIncident(id) { const { data, error } = await supabase.from('incidents').select('*').eq('id', id).single(); return { data, error } },
  async createIncident(incidentData) { const { data, error } = await supabase.from('incidents').insert([incidentData]).select().single(); return { data, error } },
  async updateIncident(id, updates) { const { data, error } = await supabase.from('incidents').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single(); return { data, error } },

  async getAllJobNumbers() { const { data, error } = await supabase.from('jobs').select('job_number, title, status, scheduled_date').order('created_at', { ascending: false }).limit(50); return { data, error } },

  async getJobAuditTrail(searchInput) {
    const search = searchInput.trim().toUpperCase()
    let { data: job } = await supabase.from('jobs').select('*').eq('job_number', search).single()
    if (!job) { const { data: partial } = await supabase.from('jobs').select('*').ilike('job_number', `%${search}%`).limit(1).single(); job = partial }
    if (!job) return { error: `No job found`, notFound: true }
    const [{ data: client }, { data: category }, { data: auditLogs }, { data: assignments }] = await Promise.all([
      job.client_id ? supabase.from('clients').select('*').eq('id', job.client_id).single() : { data: null },
      job.job_category_id ? supabase.from('job_categories').select('*').eq('id', job.job_category_id).single() : { data: null },
      supabase.from('job_full_audit').select('*').eq('job_id', job.id).order('created_at', { ascending: true }),
      supabase.from('field_job_assignments').select('*, employees(first_name, last_name, employee_code)').eq('job_id', job.id).order('assigned_at', { ascending: true })
    ])
    let creator = null; if (job.created_by) { const { data: c } = await supabase.from('profiles').select('full_name, email, role').eq('id', job.created_by).single(); creator = c }
    return { data: { job: { ...job, clients: client?.data || null, job_categories: category?.data || null }, creator, auditLogs: auditLogs?.data || [], assignments: assignments?.data || [], client: client?.data || null } }
  },

  async getFieldOpsStats() {
    const { data: allJobs } = await supabase.from('jobs').select('*').order('scheduled_date', { ascending: true }).limit(200)
    const openJobs = (allJobs || []).filter(j => j.status !== 'completed' && j.status !== 'cancelled')
    const { count: assignedEmployees } = await supabase.from('field_job_assignments').select('*', { count: 'exact', head: true }).in('assignment_status', ['assigned', 'accepted', 'in_progress'])
    const { count: openIncidents } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_investigation'])
    return { activeJobs: openJobs.length, assignedEmployees: assignedEmployees || 0, openIncidents: openIncidents || 0, criticalIncidents: 0, recentIncidents: [], liveJobs: openJobs.slice(0, 10) }
  }
}
