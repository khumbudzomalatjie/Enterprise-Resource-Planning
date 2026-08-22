import { supabase } from '../../../lib/supabaseClient'

export const inventoryApi = {
  // ============================================
  // ITEMS - NO FK JOINS (fixes schema cache error)
  // ============================================
  async getItems(filters = {}) {
    // Step 1: Get items - NO joins
    let query = supabase.from('inventory_items').select('*').order('name')

    if (filters.category_id) query = query.eq('category_id', filters.category_id)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.search) query = query.or(`name.ilike.%${filters.search}%,item_code.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`)

    const { data: items, error } = await query
    if (error || !items || items.length === 0) return { data: items || [], error }

    // Handle low_stock filter MANUALLY
    let filteredItems = items
    if (filters.low_stock) {
      filteredItems = items.filter(i => i.current_stock > 0 && i.current_stock <= (i.reorder_point || 10))
    }

    // Get categories separately
    const catIds = [...new Set(filteredItems.map(i => i.category_id).filter(Boolean))]
    let categories = []
    if (catIds.length > 0) {
      const { data } = await supabase.from('item_categories').select('id, name, color').in('id', catIds)
      categories = data || []
    }

    // Get warehouses separately
    const whIds = [...new Set(filteredItems.map(i => i.default_warehouse_id).filter(Boolean))]
    let warehouses = []
    if (whIds.length > 0) {
      const { data } = await supabase.from('warehouses').select('id, name').in('id', whIds)
      warehouses = data || []
    }

    // Get suppliers separately
    const supIds = [...new Set(filteredItems.map(i => i.preferred_supplier_id).filter(Boolean))]
    let suppliers = []
    if (supIds.length > 0) {
      const { data } = await supabase.from('suppliers').select('id, company_name').in('id', supIds)
      suppliers = data || []
    }

    // Merge everything
    const merged = filteredItems.map(item => ({
      ...item,
      item_categories: categories.find(c => c.id === item.category_id) || null,
      warehouses: warehouses.find(w => w.id === item.default_warehouse_id) || null,
      suppliers: suppliers.find(s => s.id === item.preferred_supplier_id) || null
    }))

    return { data: merged, error: null }
  },

  async getItem(id) {
    const { data: item, error } = await supabase.from('inventory_items').select('*').eq('id', id).single()
    if (error || !item) return { data: item, error }

    const [catResult, whResult, supResult, batchesResult, movementsResult] = await Promise.all([
      item.category_id ? supabase.from('item_categories').select('*').eq('id', item.category_id).single() : { data: null },
      item.default_warehouse_id ? supabase.from('warehouses').select('*').eq('id', item.default_warehouse_id).single() : { data: null },
      item.preferred_supplier_id ? supabase.from('suppliers').select('*').eq('id', item.preferred_supplier_id).single() : { data: null },
      supabase.from('stock_batches').select('*').eq('item_id', id),
      supabase.from('stock_movements').select('*').eq('item_id', id).order('created_at', { ascending: false }).limit(50)
    ])

    return {
      data: {
        ...item,
        item_categories: catResult.data || null,
        warehouses: whResult.data || null,
        suppliers: supResult.data || null,
        stock_batches: batchesResult.data || [],
        stock_movements: movementsResult.data || []
      },
      error: null
    }
  },

  async createItem(itemData) {
    const cleanedData = { ...itemData }
    if (cleanedData.category_id === '') cleanedData.category_id = null
    if (cleanedData.default_warehouse_id === '') cleanedData.default_warehouse_id = null
    if (cleanedData.preferred_supplier_id === '') cleanedData.preferred_supplier_id = null

    const { data, error } = await supabase
      .from('inventory_items')
      .insert([cleanedData])
      .select()
      .single()
    return { data, error }
  },

  async updateItem(id, updates) {
    const cleanedData = { ...updates }
    if (cleanedData.category_id === '') cleanedData.category_id = null
    if (cleanedData.default_warehouse_id === '') cleanedData.default_warehouse_id = null
    if (cleanedData.preferred_supplier_id === '') cleanedData.preferred_supplier_id = null

    const { data, error } = await supabase
      .from('inventory_items')
      .update(cleanedData)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteItem(id) {
    const { error } = await supabase
      .from('inventory_items')
      .update({ status: 'discontinued' })
      .eq('id', id)
    return { error }
  },

  // ============================================
  // STOCK MOVEMENTS
  // ============================================
  async getStockMovements(filters = {}) {
    let query = supabase.from('stock_movements').select('*').order('created_at', { ascending: false })

    if (filters.item_id) query = query.eq('item_id', filters.item_id)
    if (filters.movement_type) query = query.eq('movement_type', filters.movement_type)

    const { data: movements, error } = await query.limit(100)
    if (error || !movements || movements.length === 0) return { data: movements || [], error }

    const itemIds = [...new Set(movements.map(m => m.item_id).filter(Boolean))]
    const { data: items } = await supabase.from('inventory_items').select('id, name, item_code, unit').in('id', itemIds)

    const merged = movements.map(m => ({
      ...m,
      inventory_items: (items || []).find(i => i.id === m.item_id) || null
    }))

    return { data: merged, error: null }
  },

  async createStockMovement(movementData) {
    const cleanedData = { ...movementData }
    if (cleanedData.warehouse_id === '') cleanedData.warehouse_id = null
    if (cleanedData.batch_id === '') cleanedData.batch_id = null
    if (cleanedData.job_id === '') cleanedData.job_id = null

    const { data, error } = await supabase
      .from('stock_movements')
      .insert([cleanedData])
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // WAREHOUSES
  // ============================================
  async getWarehouses() {
    const { data, error } = await supabase.from('warehouses').select('*').order('name')
    return { data, error }
  },

  async createWarehouse(warehouseData) {
    const warehouseCode = 'WH-' + Date.now().toString(36).toUpperCase().slice(-4)
    const { data, error } = await supabase
      .from('warehouses')
      .insert([{ ...warehouseData, warehouse_code: warehouseCode }])
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // CATEGORIES
  // ============================================
  async getCategories() {
    const { data, error } = await supabase.from('item_categories').select('*').order('name')
    return { data, error }
  },

  async createCategory(categoryData) {
    const { data, error } = await supabase
      .from('item_categories')
      .insert([categoryData])
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // SUPPLIERS
  // ============================================
  async getSuppliers() {
    const { data, error } = await supabase.from('suppliers').select('*').order('company_name')
    return { data, error }
  },

  async createSupplier(supplierData) {
    const supplierCode = 'SUP-' + Date.now().toString(36).toUpperCase().slice(-6)
    const { data, error } = await supabase
      .from('suppliers')
      .insert([{ ...supplierData, supplier_code: supplierCode }])
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // BATCHES
  // ============================================
  async getBatches(itemId = null) {
    let query = supabase.from('stock_batches').select('*').order('expiry_date', { ascending: true })
    if (itemId) query = query.eq('item_id', itemId)
    const { data, error } = await query
    return { data, error }
  },

  // ============================================
  // PURCHASE ORDERS
  // ============================================
  async getPurchaseOrders(filters = {}) {
    let query = supabase.from('purchase_orders').select('*').order('created_at', { ascending: false })
    if (filters.status) query = query.eq('status', filters.status)
    const { data, error } = await query
    return { data, error }
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================
  async getInventoryStats() {
    const { count: totalItems } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true })
    const { count: lowStockItems } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).lte('current_stock', supabase.raw('COALESCE(reorder_point, 10)')).gt('current_stock', 0)
    const { count: outOfStockItems } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('current_stock', 0)
    const { count: totalSuppliers } = await supabase.from('suppliers').select('*', { count: 'exact', head: true })
    const { data: recentMovements } = await supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(5)

    const totalValue = await supabase.from('inventory_items').select('current_stock, unit_cost')
    const totalStockValue = totalValue.data?.reduce((sum, item) => sum + (item.current_stock || 0) * (item.unit_cost || 0), 0) || 0

    return {
      totalItems: totalItems || 0,
      lowStockItems: lowStockItems || 0,
      outOfStockItems: outOfStockItems || 0,
      totalSuppliers: totalSuppliers || 0,
      totalStockValue,
      recentMovements: recentMovements || []
    }
  }
}
