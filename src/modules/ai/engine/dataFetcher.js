import { supabase } from '../../../lib/supabaseClient'

export const dataFetcher = {
  // Employees
  async searchEmployees(searchTerm) {
    if (!searchTerm) {
      const { data, count } = await supabase.from('employees').select('*', { count: 'exact' }).eq('employment_status', 'active').order('first_name').limit(10)
      return { data, count, type: 'employees' }
    }
    const { data, count } = await supabase.from('employees').select('*', { count: 'exact' }).or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,employee_code.ilike.%${searchTerm}%`).limit(10)
    return { data, count, type: 'employees' }
  },

  async getEmployeeDetail(name) {
    const { data } = await supabase.from('employees').select('*').or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`).single()
    if (!data) return null

    // Get attendance today
    const today = new Date().toISOString().split('T')[0]
    const { data: attendance } = await supabase.from('attendance_records').select('*').eq('employee_id', data.id).eq('attendance_date', today).single()

    // Get assigned jobs
    const { data: assignments } = await supabase.from('field_job_assignments').select('*, jobs(title, job_number, site_address)').eq('employee_id', data.id).in('assignment_status', ['assigned', 'accepted', 'in_progress']).limit(5)

    // Get leave status
    const { data: leaveRequests } = await supabase.from('leave_requests').select('*').eq('employee_id', data.id).eq('status', 'approved').gte('end_date', today).limit(3)

    return {
      ...data,
      attendance: attendance || null,
      assignments: assignments || [],
      leaveRequests: leaveRequests || []
    }
  },

  // Incidents
  async getIncidents(filters = {}) {
    let query = supabase.from('incidents').select('*', { count: 'exact' })
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.severity) query = query.eq('severity', filters.severity)
    const { data, count } = await query.order('created_at', { ascending: false }).limit(10)
    return { data, count, type: 'incidents' }
  },

  // Jobs
  async getJobs(filters = {}) {
    const today = new Date().toISOString().split('T')[0]
    let query = supabase.from('jobs').select('*', { count: 'exact' })
    if (filters.today) query = query.eq('scheduled_date', today)
    if (filters.status) query = query.eq('status', filters.status)
    if (!filters.status && !filters.today) query = query.not('status', 'eq', 'completed').not('status', 'eq', 'cancelled')
    const { data, count } = await query.order('scheduled_date', { ascending: true }).limit(10)
    return { data, count, type: 'jobs' }
  },

  // Clients
  async getClients(searchTerm) {
    if (!searchTerm) {
      const { data, count } = await supabase.from('clients').select('*', { count: 'exact' }).eq('client_status', 'active').order('company_name').limit(10)
      return { data, count, type: 'clients' }
    }
    const { data, count } = await supabase.from('clients').select('*', { count: 'exact' }).ilike('company_name', `%${searchTerm}%`).limit(10)
    return { data, count, type: 'clients' }
  },

  // Quotations
  async getQuotations(filters = {}) {
    let query = supabase.from('quotations').select('*', { count: 'exact' })
    if (filters.status) query = query.eq('status', filters.status)
    const { data, count } = await query.order('created_at', { ascending: false }).limit(10)
    return { data, count, type: 'quotations' }
  },

  // Invoices
  async getInvoices(filters = {}) {
    let query = supabase.from('invoices').select('*', { count: 'exact' })
    if (filters.overdue) query = query.lt('due_date', new Date().toISOString().split('T')[0]).in('status', ['sent', 'overdue', 'partially_paid'])
    if (filters.status) query = query.eq('status', filters.status)
    const { data, count } = await query.order('created_at', { ascending: false }).limit(10)
    return { data, count, type: 'invoices' }
  },

  // Inventory
  async getInventory() {
    const { data, count } = await supabase.from('inventory_items').select('*', { count: 'exact' }).order('name').limit(20)
    const { count: lowStock } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).lte('current_stock', supabase.raw('COALESCE(reorder_point, 10)')).gt('current_stock', 0)
    return { data, count, lowStock, type: 'inventory' }
  },

  // Attendance
  async getAttendance() {
    const today = new Date().toISOString().split('T')[0]
    const { count: present } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', today).not('clock_in_time', 'is', null)
    const { count: total } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
    return { present: present || 0, total: total || 0, type: 'attendance' }
  },

  // Procurement
  async getProcurement() {
    const { count: pendingPOs } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent', 'confirmed'])
    const { count: pendingPRs } = await supabase.from('purchase_requisitions').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval')
    return { pendingPOs: pendingPOs || 0, pendingPRs: pendingPRs || 0, type: 'procurement' }
  },

  // Payroll
  async getPayroll() {
    const { count: employees } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
    const { data: latestPeriod } = await supabase.from('payroll_periods').select('*').order('period_start', { ascending: false }).limit(1)
    return { employees: employees || 0, latestPeriod: latestPeriod?.[0] || null, type: 'payroll' }
  },

  // Leave
  async getLeave() {
    const { count: pending } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const today = new Date().toISOString().split('T')[0]
    const { count: onLeave } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved').lte('start_date', today).gte('end_date', today)
    return { pending: pending || 0, onLeave: onLeave || 0, type: 'leave' }
  },

  // Dashboard summary
  async getDashboardSummary() {
    const [
      { count: employees }, { count: openIncidents }, { count: criticalIncidents },
      { count: openJobs }, { count: inProgressJobs }, { count: activeClients },
      { count: inventoryItems }, { count: pendingPOs }, { count: pendingLeave },
      { count: overdueInvoices }
    ] = await Promise.all([
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active'),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_investigation', 'acknowledged']),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).not('status', 'eq', 'completed').not('status', 'eq', 'cancelled'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'active'),
      supabase.from('inventory_items').select('*', { count: 'exact', head: true }),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent', 'confirmed']),
      supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).lt('due_date', new Date().toISOString().split('T')[0]).in('status', ['sent', 'overdue'])
    ])

    return {
      employees: employees || 0,
      openIncidents: openIncidents || 0,
      criticalIncidents: criticalIncidents || 0,
      openJobs: openJobs || 0,
      inProgressJobs: inProgressJobs || 0,
      activeClients: activeClients || 0,
      inventoryItems: inventoryItems || 0,
      pendingPOs: pendingPOs || 0,
      pendingLeave: pendingLeave || 0,
      overdueInvoices: overdueInvoices || 0
    }
  }
}
