import { supabase } from '../../../lib/supabaseClient'

export const fieldOpsApi = {
  // ============================================
  // LIVE JOBS - Read from BOTH assignment tables
  // ============================================
  async getLiveJobs() {
    // 1. Get all jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_start_time', { ascending: true })
      .limit(100)

    if (jobsError) {
      console.error('Jobs error:', jobsError)
      return { data: [], error: jobsError }
    }

    if (!jobs || jobs.length === 0) {
      console.log('No jobs in database')
      return { data: [], error: null }
    }

    // 2. Get clients for these jobs
    const clientIds = [...new Set(jobs.map(j => j.client_id).filter(Boolean))]
    let clients = []
    if (clientIds.length > 0) {
      const { data } = await supabase
        .from('clients')
        .select('id, company_name, client_code, phone, city, address_line1')
        .in('id', clientIds)
      clients = data || []
    }

    // 3. Get job categories
    const catIds = [...new Set(jobs.map(j => j.job_category_id).filter(Boolean))]
    let categories = []
    if (catIds.length > 0) {
      const { data } = await supabase
        .from('job_categories')
        .select('id, name, color')
        .in('id', catIds)
      categories = data || []
    }

    // 4. Get teams
    const teamIds = [...new Set(jobs.map(j => j.team_id).filter(Boolean))]
    let teams = []
    if (teamIds.length > 0) {
      const { data } = await supabase
        .from('teams')
        .select('id, team_name')
        .in('id', teamIds)
      teams = data || []
    }

    const jobIds = jobs.map(j => j.id)

    // 5a. Get assignments from field_job_assignments (Main ERP)
    const { data: fieldAssignments } = await supabase
      .from('field_job_assignments')
      .select('*')
      .in('job_id', jobIds)

    // 5b. ✅ NEW: Get assignments from job_assignments (Mobile app writes here)
    const { data: mobileAssignments } = await supabase
      .from('job_assignments')
      .select('*')
      .in('job_id', jobIds)

    console.log(`📊 field_job_assignments: ${fieldAssignments?.length || 0}`)
    console.log(`📊 job_assignments (mobile): ${mobileAssignments?.length || 0}`)

    // 5c. Merge both into unified format
    const allAssignments = [
      ...(fieldAssignments || []).map(a => ({
        id: a.id,
        job_id: a.job_id,
        employee_id: a.employee_id,
        assignment_status: a.assignment_status || 'assigned',
        assigned_at: a.assigned_at,
        assigned_by: a.assigned_by,
        started_at: a.started_at,
        completed_at: a.completed_at,
        released_at: a.released_at,
        released_by: a.released_by,
        release_reason: a.release_reason,
        check_in_time: a.check_in_time,
        check_out_time: a.check_out_time,
        check_in_latitude: a.check_in_latitude,
        check_in_longitude: a.check_in_longitude,
        source: 'main_erp'
      })),
      ...(mobileAssignments || []).map(a => ({
        id: a.id,
        job_id: a.job_id,
        employee_id: a.employee_id,
        assignment_status: a.status || 'assigned',
        assigned_at: a.assigned_at || a.created_at || new Date().toISOString(),
        assigned_by: a.assigned_by || null,
        started_at: a.started_at || null,
        completed_at: a.completed_at || null,
        released_at: null,
        released_by: null,
        release_reason: null,
        check_in_time: a.check_in_time || null,
        check_out_time: a.check_out_time || null,
        check_in_latitude: null,
        check_in_longitude: null,
        source: 'mobile_app'
      }))
    ]

    console.log(`📊 Total merged assignments: ${allAssignments.length}`)

    // 6. Get employees for ALL assignments
    let employees = []
    if (allAssignments.length > 0) {
      const empIds = [...new Set(allAssignments.map(a => a.employee_id).filter(Boolean))]
      if (empIds.length > 0) {
        const { data } = await supabase
          .from('employees')
          .select('id, first_name, last_name, employee_code, phone, department, position, user_id')
          .in('id', empIds)
        employees = data || []
      }
    }

    // 7. Get quality inspections
    let inspections = []
    if (jobIds.length > 0) {
      const { data } = await supabase
        .from('quality_inspections')
        .select('id, overall_rating, inspection_date, job_id')
        .in('job_id', jobIds)
      inspections = data || []
    }

    // 8. Get checklist items
    let checklists = []
    if (jobIds.length > 0) {
      const { data } = await supabase
        .from('job_checklist_items')
        .select('id, description, is_completed, job_id')
        .in('job_id', jobIds)
      checklists = data || []
    }

    // 9. Merge everything together
    const merged = jobs
      .filter(job => job.status !== 'cancelled')
      .map(job => ({
        ...job,
        clients: clients.find(c => c.id === job.client_id) || null,
        job_categories: categories.find(c => c.id === job.job_category_id) || null,
        teams: teams.find(t => t.id === job.team_id) || null,
        field_job_assignments: allAssignments
          .filter(a => a.job_id === job.id)
          .map(a => ({
            ...a,
            employees: employees.find(e => e.id === a.employee_id) || null
          })),
        quality_inspections: inspections.filter(i => i.job_id === job.id),
        job_checklist_items: checklists.filter(c => c.job_id === job.id)
      }))

    console.log(`📊 Live jobs merged: ${merged.length}`)
    const jobsWithAssignments = merged.filter(j => j.field_job_assignments?.length > 0)
    console.log(`📊 Jobs with assignments: ${jobsWithAssignments.length}`)
    jobsWithAssignments.forEach(job => {
      console.log(`📋 ${job.job_number} | Status: ${job.status} | Assignments: ${job.field_job_assignments.length}`)
      job.field_job_assignments.forEach(a => {
        console.log(`   👤 ${a.employees?.first_name || '?'} ${a.employees?.last_name || ''} | ${a.assignment_status} | via: ${a.source}`)
      })
    })

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

  async getLiveJobsByEmployee(employeeId) {
    // ✅ Also check job_assignments for mobile
    const { data: fieldData } = await supabase
      .from('field_job_assignments')
      .select('*')
      .eq('employee_id', employeeId)
      .order('assigned_at', { ascending: false })

    const { data: mobileData } = await supabase
      .from('job_assignments')
      .select('*')
      .eq('employee_id', employeeId)
    
    const allData = [
      ...(fieldData || []).map(a => ({ ...a, assignment_status: a.assignment_status || 'assigned' })),
      ...(mobileData || []).map(a => ({ ...a, assignment_status: a.status || 'assigned', assigned_at: a.assigned_at || a.created_at }))
    ]

    if (allData.length === 0) return { data: [], error: null }

    const jobIds = [...new Set(allData.map(a => a.job_id).filter(Boolean))]
    const { data: jobs } = await supabase.from('jobs').select('*').in('id', jobIds)

    const clientIds = [...new Set((jobs || []).map(j => j.client_id).filter(Boolean))]
    let clients = []
    if (clientIds.length > 0) {
      const { data: c } = await supabase.from('clients').select('id, company_name, client_code, phone, city, address_line1').in('id', clientIds)
      clients = c || []
    }

    const catIds = [...new Set((jobs || []).map(j => j.job_category_id).filter(Boolean))]
    let categories = []
    if (catIds.length > 0) {
      const { data: c } = await supabase.from('job_categories').select('id, name, color').in('id', catIds)
      categories = c || []
    }

    const activeJobs = allData
      .filter(a => { const job = (jobs || []).find(j => j.id === a.job_id); return job && job.status !== 'completed' && job.status !== 'cancelled' })
      .map(a => {
        const job = (jobs || []).find(j => j.id === a.job_id)
        return { ...a, jobs: job ? { ...job, clients: clients.find(c => c.id === job.client_id) || null, job_categories: categories.find(c => c.id === job.job_category_id) || null } : null }
      })
    
    return { data: activeJobs, error: null }
  },

  async getMobileSyncData(employeeId) {
    const [jobsResult, assignedResult] = await Promise.all([
      this.getLiveJobs(),
      this.getLiveJobsByEmployee(employeeId)
    ])
    return { allLiveJobs: jobsResult.data || [], myAssignedJobs: assignedResult.data || [], timestamp: new Date().toISOString() }
  },

  // ============================================
  // INCIDENTS
  // ============================================
  async getIncidents(filters = {}) {
    const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(100)
    if (error || !data || data.length === 0) return { data: data || [], error }
    const empIds = [...new Set(data.map(i => i.employee_id).filter(Boolean))]
    let employees = []
    if (empIds.length > 0) { const { data: e } = await supabase.from('employees').select('id, first_name, last_name, employee_code').in('id', empIds); employees = e || [] }
    const jobIds = [...new Set(data.map(i => i.job_id).filter(Boolean))]
    let jobs = []
    if (jobIds.length > 0) { const { data: j } = await supabase.from('jobs').select('id, job_number, title').in('id', jobIds); jobs = j || [] }
    const clientIds = [...new Set(data.map(i => i.client_id).filter(Boolean))]
    let clients = []
    if (clientIds.length > 0) { const { data: c } = await supabase.from('clients').select('id, company_name').in('id', clientIds); clients = c || [] }
    let filtered = data
    if (filters.status) filtered = filtered.filter(i => i.status === filters.status)
    if (filters.severity) filtered = filtered.filter(i => i.severity === filters.severity)
    if (filters.incident_type) filtered = filtered.filter(i => i.incident_type === filters.incident_type)
    if (filters.job_id) filtered = filtered.filter(i => i.job_id === filters.job_id)
    if (filters.search) { const s = filters.search.toLowerCase(); filtered = filtered.filter(i => i.title?.toLowerCase().includes(s) || i.incident_number?.toLowerCase().includes(s) || i.description?.toLowerCase().includes(s)) }
    const merged = filtered.map(i => ({ ...i, employees: employees.find(e => e.id === i.employee_id) || null, jobs: jobs.find(j => j.id === i.job_id) || null, clients: clients.find(c => c.id === i.client_id) || null }))
    return { data: merged, error: null }
  },

  async getIncident(id) { const { data, error } = await supabase.from('incidents').select('*').eq('id', id).single(); return { data, error } },
  async createIncident(incidentData) { const { data, error } = await supabase.from('incidents').insert([incidentData]).select().single(); return { data, error } },
  async updateIncident(id, updates) { const { data, error } = await supabase.from('incidents').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single(); return { data, error } },
  async resolveIncident(id, resolution) { const { data: userData } = await supabase.auth.getUser(); const { data, error } = await supabase.from('incidents').update({ status: 'resolved', investigation_findings: resolution.findings, root_cause: resolution.root_cause, corrective_actions: resolution.corrective_actions, preventive_actions: resolution.preventive_actions, resolved_by: userData.user?.id, resolved_at: new Date().toISOString() }).eq('id', id).select().single(); return { data, error } },

  async getAllJobNumbers() { const { data, error } = await supabase.from('jobs').select('job_number, title, status, scheduled_date').order('created_at', { ascending: false }).limit(50); return { data, error } },

  async getJobAuditTrail(searchInput) {
    const search = searchInput.trim().toUpperCase()
    let { data: job } = await supabase.from('jobs').select('*').eq('job_number', search).single()
    if (!job) { const { data: partial } = await supabase.from('jobs').select('*').ilike('job_number', `%${search}%`).limit(1).single(); job = partial }
    if (!job) { const { data: titleMatch } = await supabase.from('jobs').select('*').ilike('title', `%${searchInput.trim()}%`).limit(1).single(); job = titleMatch }
    if (!job) return { error: `No job found for "${searchInput}"`, notFound: true }
    const [{ data: client }, { data: category }, { data: team }, { data: auditLogs }, { data: statusHistory }, { data: assignments }, { data: inspections }, { data: incidents }, { data: checklists }, { data: quotation }, { data: invoice }] = await Promise.all([
      job.client_id ? supabase.from('clients').select('*').eq('id', job.client_id).single() : { data: null },
      job.job_category_id ? supabase.from('job_categories').select('*').eq('id', job.job_category_id).single() : { data: null },
      job.team_id ? supabase.from('teams').select('*').eq('id', job.team_id).single() : { data: null },
      supabase.from('job_full_audit').select('*').eq('job_id', job.id).order('created_at', { ascending: true }),
      supabase.from('job_status_history').select('*').eq('job_id', job.id).order('changed_at', { ascending: true }),
      supabase.from('field_job_assignments').select('*').eq('job_id', job.id).order('assigned_at', { ascending: true }),
      supabase.from('quality_inspections').select('*').eq('job_id', job.id).order('inspection_date', { ascending: true }),
      supabase.from('incidents').select('*').eq('job_id', job.id).order('created_at', { ascending: true }),
      supabase.from('job_checklist_items').select('*').eq('job_id', job.id).order('item_number', { ascending: true }),
      job.quotation_id ? supabase.from('quotations').select('*').eq('id', job.quotation_id).single() : { data: null },
      supabase.from('invoices').select('*').eq('id', job.id).maybeSingle()
    ])
    let assignmentsWithNames = assignments?.data || []
    if (assignmentsWithNames.length > 0) { const empIds = [...new Set(assignmentsWithNames.map(a => a.employee_id).filter(Boolean))]; if (empIds.length > 0) { const { data: emps } = await supabase.from('employees').select('id, first_name, last_name, employee_code, phone, department, position, user_id').in('id', empIds); const empMap = {}; ;(emps || []).forEach(e => { empMap[e.id] = e }); assignmentsWithNames = assignmentsWithNames.map(a => ({ ...a, employees: empMap[a.employee_id] || null })) } }
    let creator = null; if (job.created_by) { const { data: creatorData } = await supabase.from('profiles').select('full_name, email, role').eq('id', job.created_by).single(); creator = creatorData }
    return { data: { job: { ...job, clients: client?.data || null, job_categories: category?.data || null, teams: team?.data || null, quotations: quotation?.data || null, invoices: invoice?.data || null }, creator, auditLogs: auditLogs?.data || [], statusHistory: statusHistory?.data || [], assignments: assignmentsWithNames, inspections: inspections?.data || [], incidents: incidents?.data || [], checklists: checklists?.data || [], client: client?.data || null, quotation: quotation?.data || null, invoice: invoice?.data || null } }
  },

  async getFieldOpsStats() {
    const { data: allJobs } = await supabase.from('jobs').select('*').order('scheduled_date', { ascending: true }).limit(200)
    const openJobs = (allJobs || []).filter(j => j.status !== 'completed' && j.status !== 'cancelled')
    const { count: assignedEmployees } = await supabase.from('field_job_assignments').select('*', { count: 'exact', head: true }).in('assignment_status', ['assigned', 'accepted', 'in_progress'])
    const { count: openIncidents } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_investigation'])
    const { data: recentIncidents } = await supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(5)
    let incidentsWithNames = recentIncidents || []
    if (incidentsWithNames.length > 0) { const empIds = [...new Set(incidentsWithNames.map(i => i.employee_id).filter(Boolean))]; if (empIds.length > 0) { const { data: emps } = await supabase.from('employees').select('id, first_name, last_name').in('id', empIds); const empMap = {}; ;(emps || []).forEach(e => { empMap[e.id] = e }); incidentsWithNames = incidentsWithNames.map(i => ({ ...i, employees: empMap[i.employee_id] || null })) } }
    return { activeJobs: openJobs.length, assignedEmployees: assignedEmployees || 0, openIncidents: openIncidents || 0, criticalIncidents: 0, recentIncidents: incidentsWithNames, liveJobs: openJobs.slice(0, 10) }
  }
}
