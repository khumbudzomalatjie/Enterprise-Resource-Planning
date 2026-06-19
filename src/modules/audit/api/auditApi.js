import { supabase } from '../../../lib/supabaseClient'

export const auditApi = {
  // Get all audit entries with filters
  async getAuditTrail(filters = {}) {
    let query = supabase
      .from('audit_trail')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filters.limit || 100)

    if (filters.module) query = query.eq('module', filters.module)
    if (filters.action) query = query.eq('action', filters.action)
    if (filters.entity_type) query = query.eq('entity_type', filters.entity_type)
    if (filters.user_id) query = query.eq('user_id', filters.user_id)
    if (filters.severity) query = query.eq('severity', filters.severity)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.search) query = query.or(`description.ilike.%${filters.search}%,entity_name.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%`)
    if (filters.date_from) query = query.gte('created_at', filters.date_from)
    if (filters.date_to) query = query.lte('created_at', filters.date_to)

    const { data, error } = await query
    return { data, error }
  },

  // Get audit entry by ID
  async getAuditEntry(id) {
    const { data, error } = await supabase
      .from('audit_trail')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Create audit entry manually via RPC
  async createAuditEntry(entry) {
    const { data, error } = await supabase
      .rpc('create_audit_entry', {
        p_module: entry.module,
        p_action: entry.action,
        p_entity_type: entry.entity_type,
        p_entity_id: entry.entity_id || null,
        p_entity_name: entry.entity_name || null,
        p_old_values: entry.old_values || null,
        p_new_values: entry.new_values || null,
        p_description: entry.description || null,
        p_severity: entry.severity || 'info',
        p_status: entry.status || 'success'
      })
    return { data, error }
  },

  // Get audit statistics
  async getAuditStats() {
    const [
      { count: totalEntries },
      { count: todayEntries },
      { data: moduleData },
      { data: recentActivity }
    ] = await Promise.all([
      supabase.from('audit_trail').select('*', { count: 'exact', head: true }),
      supabase.from('audit_trail').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]),
      supabase.from('audit_trail').select('module'),
      supabase.from('audit_trail').select('*').order('created_at', { ascending: false }).limit(10)
    ])

    // Count by module
    const moduleCounts = {}
    moduleData?.forEach(m => {
      moduleCounts[m.module] = (moduleCounts[m.module] || 0) + 1
    })

    // Count by severity
    const severityCounts = { info: 0, warning: 0, error: 0, critical: 0 }
    if (recentActivity) {
      recentActivity.forEach(a => {
        if (severityCounts[a.severity] !== undefined) severityCounts[a.severity]++
      })
    }

    return {
      totalEntries: totalEntries || 0,
      todayEntries: todayEntries || 0,
      moduleCounts,
      severityCounts,
      recentActivity: recentActivity || []
    }
  },

  // Log user action (convenience method)
  async logAction(actionData) {
    return await auditApi.createAuditEntry(actionData)
  },

  // Log login
  async logLogin(userData) {
    return await auditApi.createAuditEntry({
      module: 'Authentication',
      action: 'Login',
      entity_type: 'User',
      entity_id: userData.id,
      entity_name: userData.email,
      description: `User logged in: ${userData.email}`,
      severity: 'info',
      status: 'success'
    })
  },

  // Log logout
  async logLogout(userData) {
    return await auditApi.createAuditEntry({
      module: 'Authentication',
      action: 'Logout',
      entity_type: 'User',
      entity_id: userData.id,
      entity_name: userData.email,
      description: `User logged out: ${userData.email}`,
      severity: 'info',
      status: 'success'
    })
  }
}
