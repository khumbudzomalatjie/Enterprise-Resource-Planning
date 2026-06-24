import { supabase } from '../../../lib/supabaseClient'

export const fieldOpsApi = {
  // ============================================
  // LIVE JOBS - All Open Jobs (No Completed/Cancelled)
  // ============================================
  async getLiveJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        clients(company_name, client_code, phone, city, address_line1),
        job_categories(name, color),
        teams(team_name),
        field_job_assignments(
          *,
          employees(first_name, last_name, employee_code, phone, department, position)
        ),
        quality_inspections(id, overall_rating, inspection_date),
        job_checklist_items(id, description, is_completed)
      `)
      .not('status', 'eq', 'completed')
      .not('status', 'eq', 'cancelled')
      .order('priority', { ascending: false })
      .order('scheduled_date', { ascending: true })
      .order('scheduled_start_time', { ascending: true })
    
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
    const { data: userData } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('field_job_assignments')
      .upsert([{
        job_id: jobId,
        employee_id: employeeId,
        team_id: teamId,
        assigned_by: userData.user?.id,
        assignment_status: 'assigned',
        assigned_at: new Date().toISOString()
      }], { onConflict: 'job_id,employee_id' })
      .select('*, employees(first_name, last_name)')
      .single()
    
    return { data, error }
  },

  async releaseEmployeeFromJob(assignmentId, reason = '') {
    const { data: userData } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('field_job_assignments')
      .update({
        assignment_status: 'released',
        released_at: new Date().toISOString(),
        released_by: userData.user?.id,
        release_reason: reason
      })
      .eq('id', assignmentId)
      .select()
      .single()
    
    return { data, error }
  },

  async bulkAssignEmployees(jobId, employeeIds, teamId = null) {
    const { data: userData } = await supabase.auth.getUser()
    const assignments = employeeIds.map(empId => ({
      job_id: jobId,
      employee_id: empId,
      team_id: teamId,
      assigned_by: userData.user?.id,
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
  // LIVE JOBS BY EMPLOYEE (Mobile Sync)
  // ============================================
  async getLiveJobsByEmployee(employeeId) {
    const { data, error } = await supabase
      .from('field_job_assignments')
      .select(`
        *,
        jobs(
          *, 
          clients(company_name, client_code, phone, city), 
          job_categories(name, color)
        )
      `)
      .eq('employee_id', employeeId)
      .in('assignment_status', ['assigned', 'accepted', 'in_progress'])
      .order('assigned_at', { ascending: false })
    
    const activeJobs = data?.filter(a => 
      a.jobs && 
      a.jobs.status !== 'completed' && 
      a.jobs.status !== 'cancelled'
    ) || []
    
    return { data: activeJobs, error }
  },

  async getMobileSyncData(employeeId) {
    const [jobsResult, assignedResult] = await Promise.all([
      this.getLiveJobs(),
      this.getLiveJobsByEmployee(employeeId)
    ])
    
    return {
      allLiveJobs: jobsResult.data || [],
      myAssignedJobs: assignedResult.data || [],
      timestamp: new Date().toISOString()
    }
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
    const { data: userData } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('incidents')
      .update({
        status: 'resolved',
        investigation_findings: resolution.findings,
        root_cause: resolution.root_cause,
        corrective_actions: resolution.corrective_actions,
        preventive_actions: resolution.preventive_actions,
        resolved_by: userData.user?.id,
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // ENHANCED JOB TRACKER - COMPLETE AUDIT
  // ============================================
  async getJobAuditTrail(jobNumber) {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        clients(company_name, client_code, phone, email, city),
        job_categories(name, color),
        teams(team_name),
        quotations(quotation_number, total_amount, status),
        invoices(invoice_number, total_amount, status, amount_paid)
      `)
      .eq('job_number', jobNumber.toUpperCase())
      .single()
    
    if (jobError || !job) {
      return { error: `Job ${jobNumber} not found. Please check the job number.` }
    }

    const { data: auditLogs } = await supabase
      .from('job_full_audit')
      .select('*')
      .eq('job_id', job.id)
      .order('created_at', { ascending: true })

    const { data: statusHistory } = await supabase
      .from('job_status_history')
      .select('*')
      .eq('job_id', job.id)
      .order('changed_at', { ascending: true })

    const { data: assignments } = await supabase
      .from('field_job_assignments')
      .select('*, employees(first_name, last_name, employee_code, phone, department, position)')
      .eq('job_id', job.id)
      .order('assigned_at', { ascending: true })

    const { data: inspections } = await supabase
      .from('quality_inspections')
      .select('*')
      .eq('job_id', job.id)
      .order('inspection_date', { ascending: true })

    const { data: incidents } = await supabase
      .from('incidents')
      .select('*')
      .eq('job_id', job.id)
      .order('created_at', { ascending: true })

    const { data: checklists } = await supabase
      .from('job_checklist_items')
      .select('*')
      .eq('job_id', job.id)
      .order('item_number', { ascending: true })

    const { data: supplies } = await supabase
      .from('job_supplies_used')
      .select('*, equipment_supplies(name)')
      .eq('job_id', job.id)

    const { data: routeStops } = await supabase
      .from('route_stops')
      .select('*, routes(route_name, route_date, teams(team_name))')
      .eq('job_id', job.id)

    let creator = null
    if (job.created_by) {
      const { data: creatorData } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('id', job.created_by)
        .single()
      creator = creatorData
    }

    return {
      data: {
        job,
        creator,
        auditLogs: auditLogs || [],
        statusHistory: statusHistory || [],
        assignments: assignments || [],
        inspections: inspections || [],
        incidents: incidents || [],
        checklists: checklists || [],
        supplies: supplies || [],
        routeStops: routeStops || [],
        client: job.clients || null,
        quotation: job.quotations || null,
        invoice: job.invoices || null
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
    const [
      { count: activeJobs },
      { count: assignedEmployees },
      { count: openIncidents },
      { count: criticalIncidents },
      { data: recentIncidents },
      { data: liveJobs }
    ] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }).not('status', 'eq', 'completed').not('status', 'eq', 'cancelled'),
      supabase.from('field_job_assignments').select('*', { count: 'exact', head: true }).in('assignment_status', ['assigned', 'accepted', 'in_progress']),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_investigation']),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical').in('status', ['reported', 'under_investigation']),
      supabase.from('incidents').select('*, employees(first_name, last_name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('jobs').select('*, clients(company_name), job_categories(name, color)').not('status', 'eq', 'completed').not('status', 'eq', 'cancelled').order('scheduled_date', { ascending: true }).limit(10)
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
