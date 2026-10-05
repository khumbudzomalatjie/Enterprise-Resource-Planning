import { supabase } from '../../../lib/supabaseClient'

// ═══════════════════════════════════════════════
// ✅ CONFIG — set this to your Inventory > Services & Pricing table name.
//    If the SQL diagnostic returns e.g. 'products_services', put that here.
// ═══════════════════════════════════════════════
const SERVICES_TABLE = 'products_services'

export const operationsApi = {
  // Jobs
  async getJobs(filters = {}) {
    let query = supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
    if (filters.priority && filters.priority !== 'all') query = query.eq('priority', filters.priority)
    if (filters.category_id && filters.category_id !== 'all') query = query.eq('job_category_id', filters.category_id)
    if (filters.date_from) query = query.gte('scheduled_date', filters.date_from)
    if (filters.date_to) query = query.lte('scheduled_date', filters.date_to)
    if (filters.search) query = query.or(`title.ilike.%${filters.search}%,job_number.ilike.%${filters.search}%`)

    const { data, error } = await query
    if (error) {
      console.error('API getJobs error:', error)
      return { data: [], error }
    }
    return { data: data || [], error: null }
  },

  async getJob(id) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createJob(jobData) {
    console.log('🆕 [createJob] input:', jobData)

    let payload = { ...jobData }
    if (!payload.created_by) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) payload.created_by = user.id
      } catch (err) {
        console.warn('createJob: could not resolve user —', err.message)
      }
    }

    Object.keys(payload).forEach(k => {
      if (payload[k] === undefined) delete payload[k]
    })

    const { data, error } = await supabase
      .from('jobs')
      .insert([payload])
      .select('*')
      .single()

    if (error) {
      console.error('❌ [createJob] failed:', {
        message: error.message, details: error.details, hint: error.hint, code: error.code
      })
    } else {
      console.log('✅ [createJob] success:', data?.job_number)
    }
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

  // ═══════════════════════════════════════════════
  // ✅ AMENDED: Read categories from Inventory > Services & Pricing
  //    Normalizes column names so CreateJob.jsx keeps working untouched.
  // ═══════════════════════════════════════════════
  async getJobCategories() {
    const { data, error } = await supabase
      .from(SERVICES_TABLE)
      .select('*')

    if (error) {
      console.error(`❌ getJobCategories (${SERVICES_TABLE}) failed:`, error.message)
      // Fallback: try the legacy job_categories table so the form still works
      const fallback = await supabase
        .from('job_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (!fallback.error) {
        console.warn('⚠️ Falling back to job_categories table')
        return { data: fallback.data || [], error: null }
      }
      return { data: [], error }
    }

    // Normalize: map whichever column names exist → what CreateJob expects
    const normalized = (data || [])
      .filter(item => {
        // If there's an is_active / active flag, respect it. Otherwise keep everything.
        if (typeof item.is_active === 'boolean') return item.is_active
        if (typeof item.active === 'boolean') return item.active
        return true
      })
      .map(item => ({
        id: item.id,
        // Try common name columns in order of likelihood
        name:
          item.name ||
          item.service_name ||
          item.product_name ||
          item.item_name ||
          item.title ||
          'Unnamed Service',
        // Display color (falls back to a default)
        color:
          item.color ||
          item.colour ||
          '#10b981',
        // Duration — if the service has it, use it; otherwise default 120 min
        estimated_duration_minutes:
          item.estimated_duration_minutes ||
          item.duration_minutes ||
          item.duration ||
          120,
        // Cleaner count — if the service has it, use it; otherwise default 2
        default_cleaners_required:
          item.default_cleaners_required ||
          item.cleaners_required ||
          item.staff_required ||
          2,
        // Extra fields passed through for display if needed
        price: item.price || item.unit_price || item.rate || null,
        description: item.description || item.notes || null,
        // Keep the original row so nothing is lost
        _raw: item
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    console.log(`✅ getJobCategories: loaded ${normalized.length} from ${SERVICES_TABLE}`)
    return { data: normalized, error: null }
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

  async getEquipmentSupplies() {
    const { data, error } = await supabase
      .from('equipment_supplies')
      .select('*')
      .eq('is_active', true)
      .order('category')
    return { data, error }
  },

  async getOperationsStats() {
    const today = new Date().toISOString().split('T')[0]
    const { data: allJobs, error: allError } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })

    if (allError) console.error('Error fetching all jobs:', allError)

    const todayJobs = (allJobs || []).filter(job => job.scheduled_date === today)
    const inProgressJobs = (allJobs || []).filter(job => job.status === 'in_progress')
    const completedToday = (allJobs || []).filter(job => job.status === 'completed' && job.actual_end_time && job.actual_end_time >= `${today}T00:00:00`)
    const overdueJobs = (allJobs || []).filter(job => job.status === 'overdue')
    const recentJobs = (allJobs || []).slice(0, 5)

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
      recentJobs,
      todayJobs,
      categories: categories || []
    }
  }
}
