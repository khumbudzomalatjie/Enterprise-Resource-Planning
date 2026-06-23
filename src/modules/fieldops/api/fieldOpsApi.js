import { supabase } from '../../../lib/supabaseClient'

export const fieldOpsApi = {
  // ============================================
  // LIVE JOBS
  // ============================================
  async getLiveJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        clients(company_name, client_code, phone, city),
        job_categories(name, color),
        teams(team_name),
        field_job_assignments(
          *,
          employees(first_name, last_name, employee_code, phone)
        )
      `)
      .in('status', ['pending', 'scheduled', 'in_progress', 'assigned'])
      .order('priority', { ascending: true })
      .order('scheduled_date', { ascending: true })
    
    return { data, error }
  },

  async getAssignedEmployees(jobId) {
    const { data, error } = await supabase
      .from('field_job_assignments')
      .select('*, employees(first_name, last_name, employee_code, phone, department)')
      .eq('job_id', jobId)
      .in('assignment_status', ['assigned', 'accepted', 'in_progress'])
    
    return { data, error }
  },

  async assignEmployeeToJob(jobId, employeeId, teamId = null) {
    const { data, error } = await supabase
      .from('field_job_assignments')
      .upsert([{
        job_id: jobId,
        employee_id: employeeId,
        team_id: teamId,
        assigned_by: (await supabase.auth.getUser()).data.user?.id,
        assignment_status: 'assigned',
        assigned_at: new Date().toISOString()
      }], { onConflict: 'job_id,employee_id' })
      .select('*, employees(first_name, last_name)')
      .single()
    
    if (!error) {
      // Update job cleaners_assigned count
      await supabase.rpc('increment_job_cleaners', { p_job_id: jobId })
    }
    
    return { data, error }
  },

  async releaseEmployeeFromJob(assignmentId, reason = '') {
    const { data, error } = await supabase
      .from('field_job_assignments')
      .update({
        assignment_status: 'released',
        released_at: new Date().toISOString(),
        released_by: (await supabase.auth.getUser()).data.user?.id,
        release_reason: reason
      })
      .eq('id', assignmentId)
      .select()
      .single()
    
    return { data, error }
  },

  async bulkAssignEmployees(jobId, employeeIds, teamId = null) {
    const userId = (await supabase.auth.getUser()).data.user?.id
    const assignments = employeeIds.map(empId => ({
      job_id: jobId,
      employee_id: empId,
      team_id: teamId,
      assigned_by: userId,
      assignment_status: 'assigned',
      assigned_at: new Date().toISOString()
    }))

    const { data, error } = await supabase
      .from('field_job_assignments')
      .upsert(assignments, { onConflict: 'job_id,employee_id' })
      .select('*, employees(first_name, last_name)')
    
    return { data, error }
  },

  async updateJobStatus(jobId, status) {
    const updates = { status, updated_at: new Date().toISOString() }
    if (status === 'in_progress') updates.actual_start_time = new Date().toISOString()
    if (status === 'completed') updates.actual_end_time = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)
      .select()
      .single()
    
    return { data, error }
  },

  // ============================================
  // INCIDENTS
  // ============================================
  async getIncidents(filters = {}) {
    let query = supabase
      .from('incidents')
      .select(`
        *,
        employees(first_name, last_name, employee_code),
        jobs(job_number, title),
        clients(company_name)
      `)
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.severity) query = query.eq('severity', filters.severity)
    if (filters.incident_type) query = query.eq('incident_type', filters.incident_type)
    if (filters.job_id) query = query.eq('job_id', filters.job_id)
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,incident_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    return { data, error }
  },

  async getIncident(id) {
    const { data, error } = await supabase
      .from('incidents')
      .select('*, employees(*), jobs(*), clients(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createIncident(incidentData) {
    const { data, error } = await supabase
      .from('incidents')
      .insert([incidentData])
      .select()
      .single()
    return { data, error }
  },

  async updateIncident(id, updates) {
    const { data, error } = await supabase
      .from('incidents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async resolveIncident(id, resolution) {
    const { data, error } = await supabase
      .from('incidents')
      .update({
        status: 'resolved',
        investigation_findings: resolution.findings,
        root_cause: resolution.root_cause,
        corrective_actions: resolution.corrective_actions,
        preventive_actions: resolution.preventive_actions,
        resolved_by: (await supabase.auth.getUser()).data.user?.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // JOB TRACKER / AUDIT
  // ============================================
  async getJobAuditTrail(jobNumber) {
    // First find the job by number
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_number', jobNumber)
      .single()
    
    if (jobError || !job) {
      return { error: 'Job not found' }
    }

    // Get all audit logs
    const { data: auditLogs, error: auditError } = await supabase
      .from('job_audit_log')
      .select('*')
      .eq('job_id', job.id)
      .order('created_at', { ascending: true })

    // Get status history
    const { data: statusHistory } = await supabase
      .from('job_status_history')
      .select('*')
      .eq('job_id', job.id)
      .order('changed_at', { ascending: true })

    // Get assignments
    const { data: assignments } = await supabase
      .from('field_job_assignments')
      .select('*, employees(first_name, last_name, employee_code)')
      .eq('job_id', job.id)

    // Get client info
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', job.client_id)
      .single()

    // Get quality inspections
    const { data: inspections } = await supabase
      .from('quality_inspections')
      .select('*')
      .eq('job_id', job.id)

    // Get related invoice/quotations if any
    const { data: quotation } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', job.quotation_id)
      .maybeSingle()

    return {
      data: {
        job,
        client,
        auditLogs: auditLogs || [],
        statusHistory: statusHistory || [],
        assignments: assignments || [],
        inspections: inspections || [],
        quotation: quotation || null
      }
    }
  },

  async getJobByNumber(jobNumber) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, clients(*), job_categories(*)')
      .eq('job_number', jobNumber)
      .single()
    return { data, error }
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================
  async getFieldOpsStats() {
    const today = new Date().toISOString().split('T')[0]
    
    const [
      { count: activeJobs },
      { count: assignedEmployees },
      { count: openIncidents },
      { count: criticalIncidents },
      { data: recentIncidents },
      { data: liveJobs }
    ] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }).in('status', ['in_progress', 'assigned']),
      supabase.from('field_job_assignments').select('*', { count: 'exact', head: true }).in('assignment_status', ['assigned', 'accepted', 'in_progress']),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_investigation']),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical').in('status', ['reported', 'under_investigation']),
      supabase.from('incidents').select('*, employees(first_name, last_name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('jobs').select('*, clients(company_name), job_categories(name, color)').in('status', ['in_progress', 'assigned']).order('scheduled_date', { ascending: true }).limit(10)
    ])

    return {
      activeJobs: activeJobs || 0,
      assignedEmployees: assignedEmployees || 0,
      openIncidents: openIncidents || 0,
      criticalIncidents: criticalIncidents || 0,
      recentIncidents: recentIncidents || [],
      liveJobs: liveJobs || []
    }
  }
}
