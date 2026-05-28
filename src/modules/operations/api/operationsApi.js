import { supabase } from '../../../lib/supabaseClient'

export const operationsApi = {
  // Jobs
  async getJobs(filters = {}) {
    console.log('API getJobs called with filters:', filters)
    
    let query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority)
    }
    if (filters.category_id && filters.category_id !== 'all') {
      query = query.eq('job_category_id', filters.category_id)
    }
    if (filters.date_from) {
      query = query.gte('scheduled_date', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('scheduled_date', filters.date_to)
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,job_number.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    
    console.log('API getJobs result:', { data, error, count: data?.length })
    
    if (error) {
      console.error('API getJobs error:', error)
      return { data: [], error }
    }
    
    return { data: data || [], error: null }
  },

  async getJob(id) {
    console.log('API getJob called with id:', id)
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single()

    console.log('API getJob result:', { data, error })
    return { data, error }
  },

  async createJob(jobData) {
    console.log('API createJob called with:', jobData)
    const { data, error } = await supabase
      .from('jobs')
      .insert([jobData])
      .select('*')
      .single()
    
    console.log('API createJob result:', { data, error })
    return { data, error }
  },

  async updateJob(id, updates) {
    const { data, error } = await supabase
      .from('jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
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
      .select('*')
      .single()
    return { data, error }
  },

  async deleteJob(id) {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
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

  // Quality Inspections
  async getQualityInspections(jobId = null) {
    let query = supabase
      .from('quality_inspections')
      .select('*')
      .order('inspection_date', { ascending: false })

    if (jobId) query = query.eq('job_id', jobId)

    const { data, error } = await query
    return { data, error }
  },

  async createQualityInspection(inspectionData) {
    const { data, error } = await supabase
      .from('quality_inspections')
      .insert([inspectionData])
      .select('*')
      .single()
    return { data, error }
  },

  // Routes
  async getRoutes(filters = {}) {
    let query = supabase
      .from('routes')
      .select('*')
      .order('route_date', { ascending: false })

    if (filters.date) query = query.eq('route_date', filters.date)
    if (filters.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    return { data, error }
  },

  // Teams
  async getTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('is_active', true)
      .order('team_name')
    return { data, error }
  },

  async createTeam(teamData) {
    const { data, error } = await supabase
      .from('teams')
      .insert([teamData])
      .select('*')
      .single()
    return { data, error }
  },

  // Equipment
  async getEquipmentSupplies() {
    const { data, error } = await supabase
      .from('equipment_supplies')
      .select('*')
      .eq('is_active', true)
      .order('category')
    return { data, error }
  },

  // Dashboard Stats
  async getOperationsStats() {
    const today = new Date().toISOString().split('T')[0]
    
    // Get all jobs first
    const { data: allJobs, error: allError } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (allError) {
      console.error('Error fetching all jobs:', allError)
    }

    // Filter in JavaScript instead of using Supabase filters that might fail
    const todayJobs = (allJobs || []).filter(job => job.scheduled_date === today)
    const inProgressJobs = (allJobs || []).filter(job => job.status === 'in_progress')
    const completedToday = (allJobs || []).filter(job => job.status === 'completed' && job.actual_end_time && job.actual_end_time >= `${today}T00:00:00`)
    const overdueJobs = (allJobs || []).filter(job => job.status === 'overdue')
    const recentJobs = (allJobs || []).slice(0, 5)

    // Get categories
    const { data: categories } = await supabase
      .from('job_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    return {
      totalJobs: (allJobs || []).length,
      scheduledToday: todayJobs.length,
      inProgress: inProgressJobs.length,
      completedToday: completedToday.length,
      overdueJobs: overdueJobs.length,
      completionRate: (allJobs || []).length > 0 ? Math.round((completedToday.length / Math.max(todayJobs.length, 1)) * 100) : 0,
      recentJobs: recentJobs,
      todayJobs: todayJobs,
      categories: categories || []
    }
  }
}
