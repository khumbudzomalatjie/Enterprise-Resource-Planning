import { supabase } from '../../../../lib/supabaseClient'

export const incidentApi = {
  async getIncidents(filters = {}) {
    let query = supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.severity) query = query.eq('severity', filters.severity)
    if (filters.category) query = query.eq('incident_category', filters.category)
    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,incident_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    return { data, error }
  },

  // ============================================
  // ✅ FIXED: Load incident + ALL CAPAs separately
  // ============================================
  async getIncident(id) {
    try {
      // Get incident
      const { data: incident, error: incError } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .single()

      if (incError) throw incError

      // Get ALL corrective actions (open, in_progress, completed) — NO FILTER
      const { data: capas, error: capaError } = await supabase
        .from('corrective_actions')
        .select('*')
        .eq('incident_id', id)
        .order('created_at', { ascending: true })

      if (capaError) console.error('CAPA load error:', capaError)

      // Get audit log
      const { data: auditLog } = await supabase
        .from('incident_audit_log')
        .select('*')
        .eq('incident_id', id)
        .order('created_at', { ascending: true })

      const fullIncident = {
        ...incident,
        corrective_actions: capas || [],
        incident_audit_log: auditLog || []
      }

      console.log(`📋 Loaded incident ${incident.incident_number} with ${capas?.length || 0} CAPAs`)
      console.log('CAPA statuses:', (capas || []).map(c => c.status))

      return { data: fullIncident, error: null }
    } catch (error) {
      console.error('getIncident error:', error)
      return { data: null, error }
    }
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

  async updateStatus(id, status) {
    const updates = { status, updated_at: new Date().toISOString() }
    if (status === 'closed') updates.closed_at = new Date().toISOString()
    if (status === 'under_investigation') updates.investigation_started_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('incidents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async acknowledgeIncident(id) {
    const { data, error } = await supabase
      .from('incidents')
      .update({ status: 'acknowledged', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { success: !error, data, error }
  },

  async startInvestigation(id) {
    const { data, error } = await supabase
      .from('incidents')
      .update({
        status: 'under_investigation',
        investigation_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    return { success: !error, data, error }
  },

  async submitForApproval(id) {
    const { data, error } = await supabase
      .from('incidents')
      .update({
        status: 'awaiting_approval',
        investigation_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    return { success: !error, data, error }
  },

  async approveIncident(id) {
    const { data, error } = await supabase
      .from('incidents')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { success: !error, data, error }
  },

  async closeIncident(id) {
    const { data, error } = await supabase
      .from('incidents')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    return { success: !error, data, error }
  },

  async reopenIncident(id) {
    const { data, error } = await supabase
      .from('incidents')
      .update({
        status: 'under_investigation',
        closed_at: null,
        reopened_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    return { success: !error, data, error }
  },

  async approveByRole(id, role) {
    const updates = { updated_at: new Date().toISOString() }
    const map = {
      supervisor: { supervisor_approved: true, supervisor_approved_at: new Date().toISOString() },
      hse: { hse_approved: true, hse_approved_at: new Date().toISOString() },
      ops_manager: { ops_manager_approved: true, ops_manager_approved_at: new Date().toISOString() },
      hr: { hr_approved: true, hr_approved_at: new Date().toISOString() },
      md: { md_approved: true, md_approved_at: new Date().toISOString() }
    }
    Object.assign(updates, map[role] || {})

    const { data, error } = await supabase
      .from('incidents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async createCorrectiveAction(actionData) {
    const { data, error } = await supabase
      .from('corrective_actions')
      .insert([actionData])
      .select()
      .single()
    return { data, error }
  },

  async updateCorrectiveAction(id, updates) {
    const { data, error } = await supabase
      .from('corrective_actions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async getIncidentStats() {
    const [
      { count: total },
      { count: open },
      { count: investigating },
      { count: awaitingApproval },
      { count: closed },
      { count: critical },
      { count: highRisk },
      { count: injuries },
      { count: vehicle },
      { count: equipment },
      { count: propertyDamage },
      { count: clientComplaints },
      { count: environmental },
      { count: nearMiss },
      { data: recentIncidents }
    ] = await Promise.all([
      supabase.from('incidents').select('*', { count: 'exact', head: true }),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'submitted', 'acknowledged', 'assigned', 'under_review']),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'under_investigation'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'awaiting_approval'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).in('risk_level', ['red', 'critical']),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('injury_reported', true),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('incident_category', 'vehicle'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('incident_category', 'equipment'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('incident_category', 'property_damage'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('incident_category', 'client_complaint'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('incident_category', 'environmental'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('incident_category', 'near_miss'),
      supabase.from('incidents').select('incident_number, title, severity, risk_level, status, incident_date').order('created_at', { ascending: false }).limit(10)
    ])

    return {
      total: total || 0,
      open: open || 0,
      investigating: investigating || 0,
      awaitingApproval: awaitingApproval || 0,
      closed: closed || 0,
      critical: critical || 0,
      highRisk: highRisk || 0,
      injuries: injuries || 0,
      vehicle: vehicle || 0,
      equipment: equipment || 0,
      propertyDamage: propertyDamage || 0,
      clientComplaints: clientComplaints || 0,
      environmental: environmental || 0,
      nearMiss: nearMiss || 0,
      recentIncidents: recentIncidents || []
    }
  }
}
