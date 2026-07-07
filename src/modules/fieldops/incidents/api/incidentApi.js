import { supabase } from '../../../../lib/supabaseClient'

export const incidentApi = {
  // ============================================
  // INCIDENTS CRUD
  // ============================================
  async getIncidents(filters = {}) {
    let query = supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(200)
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
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) return { data: null, error }
    if (!data) return { data: null, error: 'Not found' }

    const { data: correctiveActions } = await supabase
      .from('corrective_actions')
      .select('*')
      .eq('incident_id', id)
      .order('created_at', { ascending: true })

    const { data: auditLog } = await supabase
      .from('incident_audit_log')
      .select('*')
      .eq('incident_id', id)
      .order('created_at', { ascending: true })

    return { 
      data: {
        ...data,
        corrective_actions: correctiveActions || [],
        incident_audit_log: auditLog || []
      }, 
      error: null 
    }
  },

  async createIncident(incidentData) {
    const { data, error } = await supabase.from('incidents').insert([incidentData]).select().single()
    if (!error && data) {
      await this.logAudit(data.id, 'created', 'Incident reported', data.reported_by)
    }
    return { data, error }
  },

  async updateIncident(id, updates) {
    // Remove nested objects that can't be saved directly
    const cleanUpdates = { ...updates }
    delete cleanUpdates.corrective_actions
    delete cleanUpdates.incident_audit_log
    delete cleanUpdates.clients
    delete cleanUpdates.jobs
    delete cleanUpdates.employees
    delete cleanUpdates.created_at
    delete cleanUpdates.incident_number

    const { data, error } = await supabase
      .from('incidents')
      .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (!error && data) {
      await this.logAudit(id, 'updated', 'Incident details updated')
    }
    return { data, error }
  },

  async updateStatus(id, status, userId = null) {
    const updates = { status, updated_at: new Date().toISOString() }
    if (status === 'closed') updates.closed_at = new Date().toISOString()
    if (status === 'reopened') updates.reopened_at = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('incidents')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (!error && data) {
      await this.logAudit(id, 'status_change', `Status changed to ${status}`, userId)
    }
    return { data, error }
  },

  // ============================================
  // CORRECTIVE ACTIONS
  // ============================================
  async getCorrectiveActions(incidentId) {
    const { data, error } = await supabase
      .from('corrective_actions')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true })
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

  // ============================================
  // AUDIT LOG
  // ============================================
  async logAudit(incidentId, actionType, description, userId = null) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userId || userData?.user?.id
      let profileName = 'System'
      let profileRole = 'user'
      
      if (uid) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', uid)
          .single()
        if (profile) {
          profileName = profile.full_name || 'Unknown'
          profileRole = profile.role || 'user'
        }
      }
      
      await supabase.from('incident_audit_log').insert([{
        incident_id: incidentId,
        action_type: actionType,
        action_description: description,
        performed_by: uid,
        performed_by_name: profileName,
        performed_by_role: profileRole,
        created_at: new Date().toISOString()
      }])
    } catch (err) {
      console.error('Audit log error:', err)
    }
  },

  async getAuditLog(incidentId) {
    const { data, error } = await supabase
      .from('incident_audit_log')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true })
    return { data, error }
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================
  async getIncidentStats() {
    try {
      const [
        { count: total },
        { count: open },
        { count: investigating },
        { count: closed },
        { count: critical },
        { count: injuries },
        { data: recentIncidents }
      ] = await Promise.all([
        supabase.from('incidents').select('*', { count: 'exact', head: true }),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'submitted', 'acknowledged', 'assigned', 'under_review']),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'under_investigation'),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical'),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('injury_reported', true),
        supabase.from('incidents').select('incident_number, title, severity, risk_level, status, incident_date, incident_category').order('created_at', { ascending: false }).limit(10)
      ])

      return {
        total: total || 0,
        open: open || 0,
        investigating: investigating || 0,
        awaitingApproval: 0,
        closed: closed || 0,
        highRisk: 0,
        critical: critical || 0,
        injuries: injuries || 0,
        vehicle: 0,
        equipment: 0,
        propertyDamage: 0,
        clientComplaints: 0,
        environmental: 0,
        nearMiss: 0,
        lti: 0,
        recentIncidents: recentIncidents || [],
        monthlyStats: []
      }
    } catch (err) {
      console.error('Stats error:', err)
      return {
        total: 0, open: 0, investigating: 0, awaitingApproval: 0,
        closed: 0, highRisk: 0, critical: 0, injuries: 0,
        vehicle: 0, equipment: 0, propertyDamage: 0,
        clientComplaints: 0, environmental: 0, nearMiss: 0, lti: 0,
        recentIncidents: [], monthlyStats: []
      }
    }
  }
}
