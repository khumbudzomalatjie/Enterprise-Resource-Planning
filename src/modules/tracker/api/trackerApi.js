import { supabase } from '../../../lib/supabaseClient'

export const trackerApi = {
  // Get overall tracking summary
  async getTrackingSummary() {
    const today = new Date().toISOString().split('T')[0]
    
    const [
      { count: activeJobs },
      { count: completedJobs },
      { count: pendingVendors },
      { count: activePOs },
      { count: lowStockItems },
      { count: activeVehicles },
      { count: vehiclesInService },
      { count: activeEmployees },
      { count: activeClients },
      { count: cleanersWorking },
      { data: recentJobs },
      { data: recentPOs },
      { data: recentMovements }
    ] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }).in('status', ['pending', 'scheduled', 'in_progress']),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['sent', 'confirmed']),
      supabase.from('inventory_items').select('*', { count: 'exact', head: true }).lte('current_stock', supabase.raw('reorder_point')).gt('current_stock', 0),
      supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'in_service'),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active'),
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'active'),
      supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', today).not('clock_in_time', 'is', null).is('clock_out_time', null),
      supabase.from('jobs').select('*, clients(company_name)').order('updated_at', { ascending: false }).limit(5),
      supabase.from('purchase_orders').select('*, vendors(company_name)').order('updated_at', { ascending: false }).limit(5),
      supabase.from('stock_movements').select('*, inventory_items(name)').order('created_at', { ascending: false }).limit(5)
    ])

    return {
      activeJobs: activeJobs || 0,
      completedJobs: completedJobs || 0,
      pendingVendors: pendingVendors || 0,
      activePOs: activePOs || 0,
      lowStockItems: lowStockItems || 0,
      activeVehicles: activeVehicles || 0,
      vehiclesInService: vehiclesInService || 0,
      activeEmployees: activeEmployees || 0,
      activeClients: activeClients || 0,
      cleanersWorking: cleanersWorking || 0,
      recentJobs: recentJobs || [],
      recentPOs: recentPOs || [],
      recentMovements: recentMovements || []
    }
  },

  // Job Tracking
  async getJobTracking(filters = {}) {
    let query = supabase
      .from('jobs')
      .select('*, clients(company_name), job_categories(name)')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.search) query = query.or(`title.ilike.%${filters.search}%,job_number.ilike.%${filters.search}%`)

    const { data, error } = await query
    return { data, error }
  },

  // Vendor Tracking
  async getVendorTracking(filters = {}) {
    let query = supabase
      .from('vendors')
      .select('*')
      .order('updated_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.search) query = query.or(`company_name.ilike.%${filters.search}%,vendor_code.ilike.%${filters.search}%`)

    const { data, error } = await query
    return { data, error }
  },

  // Procurement Tracking
  async getProcurementTracking(filters = {}) {
    let query = supabase
      .from('purchase_orders')
      .select('*, vendors(company_name, vendor_code)')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.search) query = query.or(`po_number.ilike.%${filters.search}%`)

    const { data, error } = await query
    return { data, error }
  },

  // Inventory Tracking
  async getInventoryTracking(filters = {}) {
    let query = supabase
      .from('inventory_items')
      .select('*, item_categories(name)')
      .order('updated_at', { ascending: false })

    if (filters.low_stock) query = query.lte('current_stock', supabase.raw('reorder_point'))
    if (filters.search) query = query.or(`name.ilike.%${filters.search}%,item_code.ilike.%${filters.search}%`)

    const { data, error } = await query
    return { data, error }
  },

  // Vehicle Tracking
  async getVehicleTracking(filters = {}) {
    let query = supabase
      .from('vehicles')
      .select('*, employees(first_name, last_name)')
      .order('updated_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.search) query = query.or(`name.ilike.%${filters.search}%,plate_number.ilike.%${filters.search}%`)

    const { data, error } = await query
    return { data, error }
  },

  // Employee Tracking
  async getEmployeeTracking(filters = {}) {
    const today = new Date().toISOString().split('T')[0]
    
    let query = supabase
      .from('employees')
      .select('*')
      .order('first_name')

    if (filters.status) query = query.eq('employment_status', filters.status)
    if (filters.department) query = query.eq('department', filters.department)
    if (filters.search) query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,employee_code.ilike.%${filters.search}%`)

    const { data: employees, error } = await query
    
    // Get today's attendance for these employees
    if (employees?.length > 0) {
      const employeeIds = employees.map(e => e.id)
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', today)
        .in('employee_id', employeeIds)

      const attendanceMap = {}
      attendance?.forEach(a => { attendanceMap[a.employee_id] = a })

      const enriched = employees.map(emp => ({
        ...emp,
        today_attendance: attendanceMap[emp.id] || null
      }))

      return { data: enriched, error }
    }

    return { data: employees, error }
  },

  // Client Tracking
  async getClientTracking(filters = {}) {
    let query = supabase
      .from('clients')
      .select('*')
      .order('updated_at', { ascending: false })

    if (filters.status) query = query.eq('client_status', filters.status)
    if (filters.search) query = query.or(`company_name.ilike.%${filters.search}%,client_code.ilike.%${filters.search}%`)

    const { data, error } = await query
    return { data, error }
  }
}
