import { supabase } from '../../../lib/supabaseClient'

export const fleetApi = {
  // ============================================
  // VEHICLES
  // ============================================
  async getVehicles(filters = {}) {
    let query = supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false })
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.search) query = query.or(`name.ilike.%${filters.search}%,plate_number.ilike.%${filters.search}%,make.ilike.%${filters.search}%`)
    const { data, error } = await query
    return { data, error }
  },

  async getVehicle(id) {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createVehicle(vehicleData) {
    const { data, error } = await supabase
      .from('vehicles')
      .insert([vehicleData])
      .select()
      .single()
    return { data, error }
  },

  async updateVehicle(id, updates) {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ✅ HARD DELETE — permanently removes the vehicle + cascades to all related records
  async deleteVehicle(id) {
    console.log('🗑️ [fleetApi] Deleting vehicle:', id)
    const { data, error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id)
      .select()
    console.log('🗑️ [fleetApi] Delete result:', { data, error })
    return { data, error }
  },

  // ============================================
  // FUEL RECORDS
  // ============================================
  async getFuelRecords(vehicleId = null) {
    let query = supabase
      .from('fuel_records')
      .select('*')
      .order('fuel_date', { ascending: false })
    if (vehicleId) query = query.eq('vehicle_id', vehicleId)
    const { data, error } = await query.limit(100)
    return { data, error }
  },

  async createFuelRecord(fuelData) {
    const { data, error } = await supabase
      .from('fuel_records')
      .insert([fuelData])
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // EXPENSES
  // ============================================
  async getExpenses(vehicleId = null) {
    let query = supabase
      .from('vehicle_expenses')
      .select('*')
      .order('expense_date', { ascending: false })
    if (vehicleId) query = query.eq('vehicle_id', vehicleId)
    const { data, error } = await query.limit(100)
    return { data, error }
  },

  async createExpense(expenseData) {
    const { data, error } = await supabase
      .from('vehicle_expenses')
      .insert([expenseData])
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // REMINDERS
  // ============================================
  async getReminders(filters = {}) {
    let query = supabase
      .from('fleet_reminders')
      .select('*')
      .order('next_date', { ascending: true })
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.vehicle_id) query = query.eq('vehicle_id', filters.vehicle_id)
    const { data, error } = await query
    return { data, error }
  },

  async createReminder(reminderData) {
    const { data, error } = await supabase
      .from('fleet_reminders')
      .insert([reminderData])
      .select()
      .single()
    return { data, error }
  },

  async updateReminder(id, updates) {
    const { data, error } = await supabase
      .from('fleet_reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // METER READINGS
  // ============================================
  async getMeterReadings(vehicleId = null) {
    let query = supabase
      .from('meter_readings')
      .select('*')
      .order('reading_date', { ascending: false })
    if (vehicleId) query = query.eq('vehicle_id', vehicleId)
    const { data, error } = await query.limit(50)
    return { data, error }
  },

  async createMeterReading(readingData) {
    const { data, error } = await supabase
      .from('meter_readings')
      .insert([readingData])
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================
  async getFleetStats() {
    const [
      { count: totalVehicles },
      { count: activeVehicles },
      { data: recentFuel },
      { data: recentExpenses },
      { data: upcomingReminders },
      { data: overdueReminders }
    ] = await Promise.all([
      supabase.from('vehicles').select('*', { count: 'exact', head: true }),
      supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('fuel_records').select('amount').order('fuel_date', { ascending: false }).limit(30),
      supabase.from('vehicle_expenses').select('amount').order('expense_date', { ascending: false }).limit(30),
      supabase.from('fleet_reminders').select('*').eq('status', 'active').order('next_date').limit(5),
      supabase.from('fleet_reminders').select('*').lt('next_date', new Date().toISOString()).neq('status', 'completed')
    ])

    const totalFuelCost = recentFuel?.reduce((s, f) => s + (f.amount || 0), 0) || 0
    const totalExpenses = recentExpenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0

    return {
      totalVehicles: totalVehicles || 0,
      activeVehicles: activeVehicles || 0,
      totalFuelCost,
      totalExpenses,
      upcomingReminders: upcomingReminders || [],
      overdueReminders: overdueReminders?.length || 0
    }
  }
}
