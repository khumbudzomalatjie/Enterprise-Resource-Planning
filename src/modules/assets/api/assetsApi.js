import { supabase } from '../../../lib/supabaseClient'

export const assetsApi = {
  // ============================================
  // ASSETS CRUD
  // ============================================
  async getAssets(filters = {}) {
    let query = supabase
      .from('assets')
      .select('*, asset_categories(name, depreciation_rate, useful_life_years), employees(first_name, last_name)')
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.category_id) query = query.eq('category_id', filters.category_id)
    if (filters.location) query = query.eq('location', filters.location)
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,asset_code.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    return { data, error }
  },

  async getAsset(id) {
    const { data, error } = await supabase
      .from('assets')
      .select('*, asset_categories(*), asset_maintenance(*), asset_transfers(*), asset_disposals(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createAsset(assetData) {
    const { data, error } = await supabase
      .from('assets')
      .insert([assetData])
      .select()
      .single()
    return { data, error }
  },

  async updateAsset(id, updates) {
    const { data, error } = await supabase
      .from('assets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteAsset(id) {
    const { error } = await supabase
      .from('assets')
      .update({ status: 'disposed', updated_at: new Date().toISOString() })
      .eq('id', id)
    return { error }
  },

  // ============================================
  // CATEGORIES CRUD
  // ============================================
  async getCategories() {
    const { data, error } = await supabase
      .from('asset_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')
    return { data, error }
  },

  async createCategory(categoryData) {
    const { data, error } = await supabase
      .from('asset_categories')
      .insert([categoryData])
      .select()
      .single()
    return { data, error }
  },

  async updateCategory(id, updates) {
    const { data, error } = await supabase
      .from('asset_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteCategory(id) {
    const { error } = await supabase
      .from('asset_categories')
      .update({ is_active: false })
      .eq('id', id)
    return { error }
  },

  // ============================================
  // MAINTENANCE CRUD
  // ============================================
  async getMaintenance(assetId = null) {
    let query = supabase
      .from('asset_maintenance')
      .select('*, assets(name, asset_code)')
      .order('maintenance_date', { ascending: false })
    if (assetId) query = query.eq('asset_id', assetId)
    const { data, error } = await query.limit(50)
    return { data, error }
  },

  async createMaintenance(maintenanceData) {
    const { data, error } = await supabase
      .from('asset_maintenance')
      .insert([maintenanceData])
      .select()
      .single()
    return { data, error }
  },

  async updateMaintenance(id, updates) {
    const { data, error } = await supabase
      .from('asset_maintenance')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteMaintenance(id) {
    const { error } = await supabase
      .from('asset_maintenance')
      .delete()
      .eq('id', id)
    return { error }
  },

  // ============================================
  // TRANSFERS CRUD
  // ============================================
  async getTransfers(assetId = null) {
    let query = supabase
      .from('asset_transfers')
      .select('*, assets(name, asset_code)')
      .order('transfer_date', { ascending: false })
    if (assetId) query = query.eq('asset_id', assetId)
    const { data, error } = await query.limit(50)
    return { data, error }
  },

  async createTransfer(transferData) {
    const { data, error } = await supabase
      .from('asset_transfers')
      .insert([transferData])
      .select()
      .single()
    
    if (!error && data) {
      // Update asset location
      await supabase.from('assets')
        .update({ 
          location: transferData.to_location, 
          department: transferData.to_department,
          updated_at: new Date().toISOString()
        })
        .eq('id', transferData.asset_id)
    }
    return { data, error }
  },

  // ============================================
  // DISPOSALS CRUD
  // ============================================
  async getDisposals(assetId = null) {
    let query = supabase
      .from('asset_disposals')
      .select('*, assets(name, asset_code)')
      .order('disposal_date', { ascending: false })
    if (assetId) query = query.eq('asset_id', assetId)
    const { data, error } = await query.limit(50)
    return { data, error }
  },

  async createDisposal(disposalData) {
    const { data, error } = await supabase
      .from('asset_disposals')
      .insert([disposalData])
      .select()
      .single()
    
    if (!error && data) {
      // Mark asset as disposed
      await supabase.from('assets')
        .update({ status: 'disposed', updated_at: new Date().toISOString() })
        .eq('id', disposalData.asset_id)
    }
    return { data, error }
  },

  // ============================================
  // AUDITS
  // ============================================
  async getAudits() {
    const { data, error } = await supabase
      .from('asset_audits')
      .select('*')
      .order('audit_date', { ascending: false })
      .limit(20)
    return { data, error }
  },

  async createAudit(auditData) {
    const { data, error } = await supabase
      .from('asset_audits')
      .insert([auditData])
      .select()
      .single()
    return { data, error }
  },

  async getAuditItems(auditId) {
    const { data, error } = await supabase
      .from('asset_audit_items')
      .select('*, assets(name, asset_code, location)')
      .eq('audit_id', auditId)
    return { data, error }
  },

  async updateAuditItem(id, updates) {
    const { data, error } = await supabase
      .from('asset_audit_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================
  async getAssetsStats() {
    const [
      { count: totalAssets },
      { count: activeAssets },
      { count: maintenanceAssets },
      { count: disposedAssets },
      { data: totalValue },
      { data: recentAssets },
      { data: upcomingMaintenance }
    ] = await Promise.all([
      supabase.from('assets').select('*', { count: 'exact', head: true }),
      supabase.from('assets').select('*', { count: 'exact', head: true }).in('status', ['active', 'in_use']),
      supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'maintenance'),
      supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'disposed'),
      supabase.from('assets').select('current_value').in('status', ['active', 'in_use', 'available']),
      supabase.from('assets').select('*, asset_categories(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('asset_maintenance')
        .select('*, assets(name)')
        .gte('next_maintenance_date', new Date().toISOString().split('T')[0])
        .lte('next_maintenance_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .limit(10)
    ])

    const totalCurrentValue = totalValue?.reduce((sum, a) => sum + (a.current_value || 0), 0) || 0

    return {
      totalAssets: totalAssets || 0,
      activeAssets: activeAssets || 0,
      maintenanceAssets: maintenanceAssets || 0,
      disposedAssets: disposedAssets || 0,
      totalCurrentValue,
      recentAssets: recentAssets || [],
      upcomingMaintenance: upcomingMaintenance || []
    }
  }
}
