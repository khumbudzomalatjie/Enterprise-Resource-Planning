import { supabase } from '../../../lib/supabaseClient'

export const operationsApi = {
  // Jobs
  async getJobs(filters = {}) {
    let query = supabase
      .from('jobs')
      .select('*, clients(company_name, client_code), job_categories(name, color), teams(team_name)')
      .order('scheduled_date', { ascending: true })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.client_id) query = query.eq('client_id', filters.client_id)
    if (filters.date_from) query = query.gte('scheduled_date', filters.date_from)
    if (filters.date_to) query = query.lte('scheduled_date', filters.date_to)
    if (filters.search) query = query.or(`title.ilike.%${filters.search}%,job_number.ilike.%${filters.search}%`)

    const { data, error } = await query
    return { data, error }
  },

  async getJob(id) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, clients(*), job_categories(*), teams(*), job_checklist_items(*), job_assignments(*, employees(first_name, last_name)), quality_inspections(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createJob(jobData) {
    const { data, error } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single()
    return { data, error }
  },

  async updateJob(id, updates) {
    const { data, error } = await supabase
      .from('jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async updateJobStatus(id, status) {
    const updates = { status, updated_at: new Date().toISOString() }
    if (status === 'in_progress') updates.actual_start_time = new Date().toISOString()
    if (status === 'completed') updates.actual_end_time = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteJob(id) {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'cancelled' })
      .eq('id', id)
    return { error }
  },

  // Job Categories
  async getJobCategories() {
    const { data, error } = await supabase
      .from('job_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')
    return { data, error }
  },

  // Checklist
  async getChecklistItems(jobId) {
    const { data, error } = await supabase
      .from('job_checklist_items')
      .select('*')
      .eq('job_id', jobId)
      .order('item_number')
    return { data, error }
  },

  async addChecklistItem(itemData) {
    const { data, error } = await supabase
      .from('job_checklist_items')
      .insert([itemData])
      .select()
      .single()
    return { data, error }
  },

  async updateChecklistItem(id, updates) {
    const { data, error } = await supabase
      .from('job_checklist_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Teams
  async getTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select('*, team_members(*, employees(first_name, last_name, employee_code))')
      .eq('is_active', true)
      .order('team_name')
    return { data, error }
  },

  async createTeam(teamData) {
    const { data, error } = await supabase
      .from('teams')
      .insert([teamData])
      .select()
      .single()
    return { data, error }
  },

  async addTeamMember(memberData) {
    const { data, error } = await supabase
      .from('team_members')
      .insert([memberData])
      .select()
      .single()
    return { data, error }
  },

  async removeTeamMember(id) {
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: false })
      .eq('id', id)
    return { error }
  },

  // Job Assignments
  async assignEmployee(jobId, employeeId, teamId = null) {
    const { data, error } = await supabase
      .from('job_assignments')
      .upsert([{
        job_id: jobId,
        employee_id: employeeId,
        team_id: teamId,
        status: 'assigned'
      }], { onConflict: 'job_id,employee_id' })
      .select()
      .single()
    return { data, error }
  },

  async bulkAssign(jobId, employeeIds) {
    const assignments = employeeIds.map(empId => ({
      job_id: jobId,
      employee_id: empId,
      status: 'assigned'
    }))
    
    const { data, error } = await supabase
      .from('job_assignments')
      .upsert(assignments, { onConflict: 'job_id,employee_id' })
      .select()
    return { data, error }
  },

  // Routes
  async getRoutes(filters = {}) {
    let query = supabase
      .from('routes')
      .select('*, teams(team_name), route_stops(*, jobs(title, site_address))')
      .order('route_date', { ascending: false })

    if (filters.date) query = query.eq('route_date', filters.date)
    if (filters.team_id) query = query.eq('team_id', filters.team_id)
    if (filters.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    return { data, error }
  },

  async createRoute(routeData, stops) {
    const { data: route, error: rError } = await supabase
      .from('routes')
      .insert([routeData])
      .select()
      .single()

    if (rError) return { error: rError }

    if (stops && stops.length > 0) {
      const stopsWithRoute = stops.map((stop, i) => ({
        ...stop,
        route_id: route.id,
        stop_number: i + 1
      }))
      await supabase.from('route_stops').insert(stopsWithRoute)
    }

    return { data: route }
  },

  async updateRouteStop(id, updates) {
    const { data, error } = await supabase
      .from('route_stops')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Quality Inspections
  async getQualityInspections(jobId = null) {
    let query = supabase
      .from('quality_inspections')
      .select('*, jobs(title, job_number, site_address)')
      .order('inspection_date', { ascending: false })

    if (jobId) query = query.eq('job_id', jobId)

    const { data, error } = await query
    return { data, error }
  },

  async createQualityInspection(inspectionData) {
    const { data, error } = await supabase
      .from('quality_inspections')
      .insert([inspectionData])
      .select()
      .single()
    return { data, error }
  },

  // Supplies
  async getEquipmentSupplies() {
    const { data, error } = await supabase
      .from('equipment_supplies')
      .select('*')
      .eq('is_active', true)
      .order('category')
    return { data, error }
  },

  async recordSupplyUsage(usageData) {
    const { data, error } = await supabase
      .from('job_supplies_used')
      .insert([usageData])
      .select()
      .single()
    
    if (!error) {
      // Update stock
      await supabase.rpc('update_supply_stock', {
        p_supply_id: usageData.supply_id,
        p_quantity_used: usageData.quantity_used
      })
    }
    
    return { data, error }
  },

  // Dashboard Stats
  async getOperationsStats() {
    const today = new Date().toISOString().split('T')[0]
    const [
      { count: totalJobs },
      { count: scheduledToday },
      { count: inProgress },
      { count: completedToday },
      { count: overdueJobs },
      { data: recentJobs },
      { data: todayJobs }
    ] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('scheduled_date', today),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('actual_end_time', `${today}T00:00:00`),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'overdue'),
      supabase.from('jobs').select('*, clients(company_name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('jobs').select('*, clients(company_name), job_categories(name, color)').eq('scheduled_date', today).order('scheduled_start_time')
    ])

    return {
      totalJobs: totalJobs || 0,
      scheduledToday: scheduledToday || 0,
      inProgress: inProgress || 0,
      completedToday: completedToday || 0,
      overdueJobs: overdueJobs || 0,
      completionRate: totalJobs > 0 ? Math.round((completedToday || 0) / (scheduledToday || 1) * 100) : 0,
      recentJobs: recentJobs || [],
      todayJobs: todayJobs || []
    }
  }
}
