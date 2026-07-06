import { supabase } from '../../../../lib/supabaseClient'

export const incidentApi = {
  // ============================================
  // INCIDENTS CRUD
  // ============================================
  async getIncidents(filters = {}) {
    let query = supabase.from('incidents').select('*, employees(*), jobs(*), clients(*)').order('created_at', { ascending: false }).limit(200)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.severity) query = query.eq('severity', filters.severity)
    if (filters.category) query = query.eq('incident_category', filters.category)
    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.date_from) query = query.gte('incident_date', filters.date_from)
    if (filters.date_to) query = query.lte('incident_date', filters.date_to)
    if (filters.search) query = query.or(`title.ilike.%${filters.search}%,incident_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    const { data, error } = await query
    return { data, error }
  },

  async getIncident(id) {
    const { data, error } = await supabase.from('incidents').select('*, employees(*), jobs(*), clients(*), corrective_actions(*), incident_audit_log(*)').eq('id', id).single()
    return { data, error }
  },

  async createIncident(incidentData) {
    const { data, error } = await supabase.from('incidents').insert([incidentData]).select().single()
    if (!error) await this.logAudit(data.id, 'created', 'Incident reported', incidentData.reported_by)
    return { data, error }
  },

  async updateIncident(id, updates) {
    const { data, error } = await supabase.from('incidents').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (!error) await this.logAudit(id, 'updated', 'Incident updated')
    return { data, error }
  },

  async updateStatus(id, status, userId = null) {
    const updates = { status, updated_at: new Date().toISOString() }
    if (status === 'closed') updates.closed_at = new Date().toISOString()
    if (status === 'reopened') updates.reopened_at = new Date().toISOString()
    const { data, error } = await supabase.from('incidents').update(updates).eq('id', id).select().single()
    if (!error) await this.logAudit(id, 'status_change', `Status changed to ${status}`, userId)
    return { data, error }
  },

  // ============================================
  // CORRECTIVE ACTIONS
  // ============================================
  async getCorrectiveActions(incidentId) {
    const { data, error } = await supabase.from('corrective_actions').select('*').eq('incident_id', incidentId).order('created_at', { ascending: true })
    return { data, error }
  },

  async createCorrectiveAction(actionData) {
    const { data, error } = await supabase.from('corrective_actions').insert([actionData]).select().single()
    return { data, error }
  },

  async updateCorrectiveAction(id, updates) {
    const { data, error } = await supabase.from('corrective_actions').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    return { data, error }
  },

  // ============================================
  // AUDIT LOG
  // ============================================
  async logAudit(incidentId, actionType, description, userId = null) {
    const { data: userData } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', userId || userData.user?.id).single()
    await supabase.from('incident_audit_log').insert([{
      incident_id: incidentId, action_type: actionType, action_description: description,
      performed_by: userId || userData.user?.id, performed_by_name: profile?.full_name || 'System',
      performed_by_role: profile?.role || 'user', created_at: new Date().toISOString()
    }])
  },

  async getAuditLog(incidentId) {
    const { data, error } = await supabase.from('incident_audit_log').select('*').eq('incident_id', incidentId).order('created_at', { ascending: true })
    return { data, error }
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================
  async getIncidentStats() {
    const [
      { count: total }, { count: open }, { count: investigating }, { count: awaitingApproval },
      { count: closed }, { count: highRisk }, { count: critical },
      { count: injuries }, { count: vehicle }, { count: equipment },
      { count: propertyDamage }, { count: clientComplaints }, { count: environmental },
      { count: nearMiss }, { count: lti }, { data: recentIncidents },
      { data: monthlyStats }
    ] = await Promise.all([
      supabase.from('incidents').select('*', { count: 'exact', head: true }),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'submitted', 'acknowledged', 'assigned', 'under_review']),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'under_investigation'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'awaiting_approval'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).in('risk_level', ['red', 'critical']),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('injury_reported', true),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('incident_category', 'vehicle'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('incident_category', 'equipment'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('incident_category', 'property_damage'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('incident_category', 'client_complaint'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('incident_category', 'environmental'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('incident_category', 'near_miss'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('lost_time_injury', true),
      supabase.from('incidents').select('incident_number, title, severity, risk_level, status, incident_date, incident_category').order('created_at', { ascending: false }).limit(10),
      supabase.from('incidents').select('incident_date, severity, risk_level, status').gte('incident_date', new Date(Date.now() - 365*24*60*60*1000).toISOString())
    ])

    return {
      total: total || 0, open: open || 0, investigating: investigating || 0,
      awaitingApproval: awaitingApproval || 0, closed: closed || 0,
      highRisk: highRisk || 0, critical: critical || 0,
      injuries: injuries || 0, vehicle: vehicle || 0, equipment: equipment || 0,
      propertyDamage: propertyDamage || 0, clientComplaints: clientComplaints || 0,
      environmental: environmental || 0, nearMiss: nearMiss || 0, lti: lti || 0,
      recentIncidents: recentIncidents || [],
      monthlyStats: monthlyStats || []
    }
  }
}
