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
          employees(first_name, last_name, employee_code, phone, department, position, user_id)
        ),
        quality_inspections(id, overall_rating, inspection_date),
        job_checklist_items(id, description, is_completed)
      `)
      .in('status', ['pending', 'scheduled', 'assigned', 'in_progress', 'on_hold', 'overdue', 'rescheduled'])
      .order('scheduled_date', { ascending: true })
      .order('scheduled_start_time', { ascending: true })
    
    return { data, error }
  },

  async getAssignedEmployees(jobId) {
    const { data, error } = await supabase
      .from('field_job_assignments')
      .select('*, employees(first_name, last_name, employee_code, phone, department, user_id)')
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
      .select('*, employees(first_name, last_name, user_id)')
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

  // ═══════════════════════════════════════════════
  // UPDATED: Syncs both jobs table AND assignments
  // ═══════════════════════════════════════════════
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
      const assignmentStatus = status === 'in_progress' ? 'in_progress' : 
                               status === 'completed' ? 'completed' : 'assigned'
      
      await supabase
        .from('field_job_assignments')
        .update({ 
          assignment_status: assignmentStatus,
          ...(status === 'in_progress' ? { started_at: new Date().toISOString() } : {}),
          ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {})
        })
        .eq('job_id', jobId)
        .eq('employee_id', employeeId)
    }
    
    return { data, error }
  },

  // ═══════════════════════════════════════════════
  // Full sync from mobile to main ERP
  // ═══════════════════════════════════════════════
  async syncJobWithMobile(jobId, data) {
    const { employeeId, status, checkInLocation, checkOutLocation, notes } = data
    
    if (status) {
      await this.updateJobStatus(jobId, status, employeeId)
    }
    
    if (employeeId) {
      const updates = {}
      if (checkInLocation) {
        updates.check_in_latitude = checkInLocation.latitude
        updates.check_in_longitude = checkInLocation.longitude
        updates.check_in_address = checkInLocation.address || null
        updates.check_in_time = new Date().toISOString()
      }
      if (checkOutLocation) {
        updates.check_out_latitude = checkOutLocation.latitude
        updates.check_out_longitude = checkOutLocation.longitude
        updates.check_out_address = checkOutLocation.address || null
        updates.check_out_time = new Date().toISOString()
      }
      if (notes) updates.employee_notes = notes
      
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('field_job_assignments')
          .update(updates)
          .eq('job_id', jobId)
          .eq('employee_id', employeeId)
      }
    }
    
    const { data: updatedJob } = await supabase
      .from('jobs')
      .select('*, clients(*), job_categories(*)')
      .eq('id', jobId)
      .single()
    
    return { success: true, job: updatedJob }
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
          clients(company_name, client_code, phone, city, address_line1), 
          job_categories(name, color),
          field_job_assignments(
            *,
            employees(first_name, last_name, employee_code, phone, user_id)
          )
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
  // SIMPLE JOB SEARCH
  // ============================================
  async getAllJobNumbers() {
    const { data, error } = await supabase
      .from('jobs')
      .select('job_number, title, status, clients(company_name), scheduled_date')
      .order('created_at', { ascending: false })
      .limit(50)
    return { data, error }
  },

  async getJobAuditTrail(searchInput) {
    const search = searchInput.trim()
    let job = null

    const { data: exactMatch } = await supabase
      .from('jobs')
      .select('id, job_number')
      .eq('job_number', search.toUpperCase())
      .single()
    
    if (exactMatch) {
      const { data } = await supabase
        .from('jobs')
        .select(`
          *,
          clients(company_name, client_code, phone, email, city),
          job_categories(name, color),
          teams(team_name),
          quotations(quotation_number, total_amount, status),
          invoices(invoice_number, total_amount, status, amount_paid)
        `)
        .eq('id', exactMatch.id)
        .single()
      job = data
    }

    if (!job) {
      const { data: partialMatch } = await supabase
        .from('jobs')
        .select('id, job_number')
        .ilike('job_number', `%${search.toUpperCase()}%`)
        .limit(1)
        .single()
      
      if (partialMatch) {
        const { data } = await supabase
          .from('jobs')
          .select(`
            *,
            clients(company_name, client_code, phone, email, city),
            job_categories(name, color),
            teams(team_name),
            quotations(quotation_number, total_amount, status),
            invoices(invoice_number, total_amount, status, amount_paid)
          `)
          .eq('id', partialMatch.id)
          .single()
        job = data
      }
    }

    if (!job) {
      const { data: titleMatch } = await supabase
        .from('jobs')
        .select('id, job_number, title')
        .ilike('title', `%${search}%`)
        .limit(1)
        .single()
      
      if (titleMatch) {
        const { data } = await supabase
          .from('jobs')
          .select(`
            *,
            clients(company_name, client_code, phone, email, city),
            job_categories(name, color),
            teams(team_name),
            quotations(quotation_number, total_amount, status),
            invoices(invoice_number, total_amount, status, amount_paid)
          `)
          .eq('id', titleMatch.id)
          .single()
        job = data
      }
    }

    if (!job) {
      const { data: clientJobs } = await supabase
        .from('jobs')
        .select('id, job_number, clients!inner(company_name)')
        .ilike('clients.company_name', `%${search}%`)
        .limit(1)
      
      if (clientJobs && clientJobs.length > 0) {
        const { data } = await supabase
          .from('jobs')
          .select(`
            *,
            clients(company_name, client_code, phone, email, city),
            job_categories(name, color),
            teams(team_name),
            quotations(quotation_number, total_amount, status),
            invoices(invoice_number, total_amount, status, amount_paid)
          `)
          .eq('id', clientJobs[0].id)
          .single()
        job = data
      }
    }

    if (!job) {
      return { 
        error: `No job found for "${search}". Try a different search term or browse the job list.`,
        notFound: true
      }
    }

    const [
      { data: auditLogs },
      { data: statusHistory },
      { data: assignments },
      { data: inspections },
      { data: incidents },
      { data: checklists },
      { data: supplies },
      { data: routeStops }
    ] = await Promise.all([
      supabase.from('job_full_audit').select('*').eq('job_id', job.id).order('created_at', { ascending: true }),
      supabase.from('job_status_history').select('*').eq('job_id', job.id).order('changed_at', { ascending: true }),
      supabase.from('field_job_assignments').select('*, employees(first_name, last_name, employee_code, phone, department, position, user_id)').eq('job_id', job.id).order('assigned_at', { ascending: true }),
      supabase.from('quality_inspections').select('*').eq('job_id', job.id).order('inspection_date', { ascending: true }),
      supabase.from('incidents').select('*').eq('job_id', job.id).order('created_at', { ascending: true }),
      supabase.from('job_checklist_items').select('*').eq('job_id', job.id).order('item_number', { ascending: true }),
      supabase.from('job_supplies_used').select('*, equipment_supplies(name)').eq('job_id', job.id),
      supabase.from('route_stops').select('*, routes(route_name, route_date, teams(team_name))').eq('job_id', job.id)
    ])

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
      supabase.from('jobs').select('*', { count: 'exact', head: true }).in('status', ['pending', 'scheduled', 'assigned', 'in_progress', 'on_hold', 'overdue', 'rescheduled']),
      supabase.from('field_job_assignments').select('*', { count: 'exact', head: true }).in('assignment_status', ['assigned', 'accepted', 'in_progress']),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_investigation']),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical').in('status', ['reported', 'under_investigation']),
      supabase.from('incidents').select('*, employees(first_name, last_name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('jobs').select('*, clients(company_name), job_categories(name, color)').in('status', ['pending', 'scheduled', 'assigned', 'in_progress', 'on_hold', 'overdue', 'rescheduled']).order('scheduled_date', { ascending: true }).limit(10)
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
