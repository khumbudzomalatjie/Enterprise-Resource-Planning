import { supabase } from '../../../lib/supabaseClient'

export const inventoryApi = {
  // ============================================
  // ITEMS
  // ============================================
  async getItems(filters = {}) {
    // Get items without joins first (avoids FK schema cache errors)
    let query = supabase
      .from('inventory_items')
      .select('*')
      .order('name')

    if (filters.category_id) query = query.eq('category_id', filters.category_id)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.search) query = query.or(`name.ilike.%${filters.search}%,item_code.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`)

    const { data: items, error } = await query
    if (error || !items || items.length === 0) return { data: items || [], error }

    // Get categories separately
    const catIds = [...new Set(items.map(i => i.category_id).filter(Boolean))]
    const { data: categories } = await supabase.from('item_categories').select('id, name, color').in('id', catIds)

    // Get warehouses separately
    const whIds = [...new Set(items.map(i => i.default_warehouse_id).filter(Boolean))]
    const { data: warehouses } = await supabase.from('warehouses').select('id, name').in('id', whIds)

    // Get suppliers separately
    const supIds = [...new Set(items.map(i => i.preferred_supplier_id).filter(Boolean))]
    const { data: suppliers } = await supabase.from('suppliers').select('id, company_name').in('id', supIds)

    // Merge everything
    const merged = items.map(item => ({
      ...item,
      item_categories: (categories || []).find(c => c.id === item.category_id) || null,
      warehouses: (warehouses || []).find(w => w.id === item.default_warehouse_id) || null,
      suppliers: (suppliers || []).find(s => s.id === item.preferred_supplier_id) || null
    }))

    return { data: merged, error: null }
  },

  async getItem(id) {
    const { data: item, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error || !item) return { data: item, error }

    // Get related data separately
    const [catResult, whResult, supResult, batchesResult, movementsResult] = await Promise.all([
      item.category_id ? supabase.from('item_categories').select('*').eq('id', item.category_id).single() : { data: null },
      item.default_warehouse_id ? supabase.from('warehouses').select('*').eq('id', item.default_warehouse_id).single() : { data: null },
      item.preferred_supplier_id ? supabase.from('suppliers').select('*').eq('id', item.preferred_supplier_id).single() : { data: null },
      supabase.from('stock_batches').select('*').eq('item_id', id).order('expiry_date', { ascending: true }),
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
    let query = supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.item_id) query = query.eq('item_id', filters.item_id)
    if (filters.movement_type) query = query.eq('movement_type', filters.movement_type)
    if (filters.date_from) query = query.gte('movement_date', filters.date_from)
    if (filters.date_to) query = query.lte('movement_date', filters.date_to)
    if (filters.warehouse_id) query = query.eq('warehouse_id', filters.warehouse_id)

    const { data: movements, error } = await query.limit(100)
    if (error || !movements || movements.length === 0) return { data: movements || [], error }

    // Get item names separately
    const itemIds = [...new Set(movements.map(m => m.item_id).filter(Boolean))]
    const { data: items } = await supabase.from('inventory_items').select('id, name, item_code, unit').in('id', itemIds)

    // Get warehouse names separately
    const whIds = [...new Set(movements.map(m => m.warehouse_id).filter(Boolean))]
    const { data: warehouses } = await supabase.from('warehouses').select('id, name').in('id', whIds)

    // Merge
    const merged = movements.map(m => ({
      ...m,
      inventory_items: (items || []).find(i => i.id === m.item_id) || null,
      warehouses: (warehouses || []).find(w => w.id === m.warehouse_id) || null
    }))

    return { data: merged, error: null }
  },

  async createStockMovement(movementData) {
    const cleanedData = { ...movementData }
    if (cleanedData.warehouse_id === '') cleanedData.warehouse_id = null
    if (cleanedData.batch_id === '') cleanedData.batch_id = null
    if (cleanedData.source_warehouse_id === '') cleanedData.source_warehouse_id = null
    if (cleanedData.destination_warehouse_id === '') cleanedData.destination_warehouse_id = null
    if (cleanedData.job_id === '') cleanedData.job_id = null

    const { data, error } = await supabase
      .from('stock_movements')
      .insert([cleanedData])
      .select()
      .single()
    return { data, error }
  },

  async bulkStockMovements(movements) {
    const cleanedMovements = movements.map(m => {
      const cleaned = { ...m }
      if (cleaned.warehouse_id === '') cleaned.warehouse_id = null
      if (cleaned.batch_id === '') cleaned.batch_id = null
      if (cleaned.source_warehouse_id === '') cleaned.source_warehouse_id = null
      if (cleaned.destination_warehouse_id === '') cleaned.destination_warehouse_id = null
      if (cleaned.job_id === '') cleaned.job_id = null
      return cleaned
    })

    const { data, error } = await supabase
      .from('stock_movements')
      .insert(cleanedMovements)
      .select()
    return { data, error }
  },

  // ============================================
  // WAREHOUSES
  // ============================================
  async getWarehouses() {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('is_active', true)
      .order('name')
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

  async updateWarehouse(id, updates) {
    const { data, error } = await supabase
      .from('warehouses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // CATEGORIES
  // ============================================
  async getCategories() {
    const { data, error } = await supabase
      .from('item_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')
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
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('company_name')
    return { data, error }
  },

  async getSupplier(id) {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single()
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

  async updateSupplier(id, updates) {
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteSupplier(id) {
    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: false })
      .eq('id', id)
    return { error }
  },

  // ============================================
  // BATCHES
  // ============================================
  async getBatches(itemId = null) {
    let query = supabase
      .from('stock_batches')
      .select('*')
      .order('expiry_date', { ascending: true })

    if (itemId) query = query.eq('item_id', itemId)

    const { data: batches, error } = await query
    if (error || !batches || batches.length === 0) return { data: batches || [], error }

    // Get item names separately
    const itemIds = [...new Set(batches.map(b => b.item_id).filter(Boolean))]
    const { data: items } = await supabase.from('inventory_items').select('id, name, item_code').in('id', itemIds)

    const merged = batches.map(b => ({
      ...b,
      inventory_items: (items || []).find(i => i.id === b.item_id) || null
    }))

    return { data: merged, error: null }
  },

  async createBatch(batchData) {
    const { data, error } = await supabase
      .from('stock_batches')
      .insert([batchData])
      .select()
      .single()
    return { data, error }
  },

  async updateBatch(id, updates) {
    const { data, error } = await supabase
      .from('stock_batches')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // STOCK COUNTS
  // ============================================
  async getStockCounts(filters = {}) {
    let query = supabase
      .from('stock_counts')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.warehouse_id) query = query.eq('warehouse_id', filters.warehouse_id)

    const { data: counts, error } = await query
    if (error || !counts || counts.length === 0) return { data: counts || [], error }

    // Get warehouse names
    const whIds = [...new Set(counts.map(c => c.warehouse_id).filter(Boolean))]
    const { data: warehouses } = await supabase.from('warehouses').select('id, name').in('id', whIds)

    // Get count items
    const countIds = counts.map(c => c.id)
    const { data: countItems } = await supabase.from('stock_count_items').select('*').in('stock_count_id', countIds)

    // Get item names for count items
    const itemIds = [...new Set((countItems || []).map(ci => ci.item_id).filter(Boolean))]
    const { data: items } = await supabase.from('inventory_items').select('id, name, item_code').in('id', itemIds)

    const merged = counts.map(c => ({
      ...c,
      warehouses: (warehouses || []).find(w => w.id === c.warehouse_id) || null,
      stock_count_items: (countItems || [])
        .filter(ci => ci.stock_count_id === c.id)
        .map(ci => ({
          ...ci,
          inventory_items: (items || []).find(i => i.id === ci.item_id) || null
        }))
    }))

    return { data: merged, error: null }
  },

  async createStockCount(countData) {
    const { data, error } = await supabase
      .from('stock_counts')
      .insert([countData])
      .select()
      .single()
    return { data, error }
  },

  async updateStockCountItem(id, updates) {
    const { data, error } = await supabase
      .from('stock_count_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // PURCHASE ORDERS
  // ============================================
  async getPurchaseOrders(filters = {}) {
    let query = supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.supplier_id) query = query.eq('supplier_id', filters.supplier_id)

    const { data: pos, error } = await query
    if (error || !pos || pos.length === 0) return { data: pos || [], error }

    // Get supplier names
    const supIds = [...new Set(pos.map(p => p.supplier_id).filter(Boolean))]
    const { data: suppliers } = await supabase.from('suppliers').select('id, company_name').in('id', supIds)

    // Get PO items
    const poIds = pos.map(p => p.id)
    const { data: poItems } = await supabase.from('purchase_order_items').select('*').in('purchase_order_id', poIds)

    // Get item names
    const itemIds = [...new Set((poItems || []).map(pi => pi.item_id).filter(Boolean))]
    const { data: items } = await supabase.from('inventory_items').select('id, name, item_code').in('id', itemIds)

    const merged = pos.map(p => ({
      ...p,
      suppliers: (suppliers || []).find(s => s.id === p.supplier_id) || null,
      purchase_order_items: (poItems || [])
        .filter(pi => pi.purchase_order_id === p.id)
        .map(pi => ({
          ...pi,
          inventory_items: (items || []).find(i => i.id === pi.item_id) || null
        }))
    }))

    return { data: merged, error: null }
  },

  async createPurchaseOrder(poData, items) {
    const cleanedPO = { ...poData }
    if (cleanedPO.supplier_id === '') cleanedPO.supplier_id = null

    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert([cleanedPO])
      .select()
      .single()

    if (poError) return { error: poError }

    if (items && items.length > 0) {
      const cleanedItems = items.map(item => {
        const cleaned = { ...item, purchase_order_id: po.id }
        if (cleaned.item_id === '') cleaned.item_id = null
        return cleaned
      })
      await supabase.from('purchase_order_items').insert(cleanedItems)
    }

    return { data: po }
  },

  async receivePurchaseOrder(poId) {
    const { data: po } = await supabase
      .from('purchase_orders')
      .select('*, purchase_order_items(*)')
      .eq('id', poId)
      .single()

    if (po && po.purchase_order_items) {
      for (const item of po.purchase_order_items) {
        if (item.item_id) {
          await inventoryApi.createStockMovement({
            item_id: item.item_id,
            movement_type: 'purchase',
            quantity: item.quantity_ordered,
            unit_cost: item.unit_price,
            reference_type: 'purchase_order',
            reference_id: poId,
            reference_number: po.po_number,
            notes: 'Purchase order received'
          })
        }
      }
      await supabase
        .from('purchase_orders')
        .update({
          status: 'received',
          actual_delivery_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', poId)
    }
    return { success: true }
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================
  async getInventoryStats() {
    const [
      { count: totalItems },
      { count: lowStockItems },
      { count: outOfStockItems },
      { count: totalSuppliers },
      { count: totalWarehouses },
      { data: recentMovements },
      { data: expiringBatches }
    ] = await Promise.all([
      supabase.from('inventory_items').select('*', { count: 'exact', head: true }),
      supabase.from('inventory_items').select('*', { count: 'exact', head: true }).lte('current_stock', supabase.raw('reorder_point')).gt('current_stock', 0),
      supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('current_stock', 0),
      supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('warehouses').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('stock_batches').select('*').lt('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()).gt('remaining_quantity', 0).limit(10)
    ])

    // Get item names for recent movements
    const movementItemIds = [...new Set((recentMovements || []).map(m => m.item_id).filter(Boolean))]
    const { data: movementItems } = await supabase.from('inventory_items').select('id, name').in('id', movementItemIds)

    const movementsWithNames = (recentMovements || []).map(m => ({
      ...m,
      inventory_items: (movementItems || []).find(i => i.id === m.item_id) || null
    }))

    // Get item names for expiring batches
    const batchItemIds = [...new Set((expiringBatches || []).map(b => b.item_id).filter(Boolean))]
    const { data: batchItems } = await supabase.from('inventory_items').select('id, name').in('id', batchItemIds)

    const batchesWithNames = (expiringBatches || []).map(b => ({
      ...b,
      inventory_items: (batchItems || []).find(i => i.id === b.item_id) || null
    }))

    const totalValue = await supabase.from('inventory_items').select('current_stock, unit_cost')
    const totalStockValue = totalValue.data?.reduce((sum, item) => sum + (item.current_stock || 0) * (item.unit_cost || 0), 0) || 0

    const thisMonth = new Date().toISOString().slice(0, 7)
    const { data: monthlyMovements } = await supabase
      .from('stock_movements')
      .select('movement_type, quantity')
      .gte('movement_date', `${thisMonth}-01`)

    const stockInThisMonth = monthlyMovements
      ?.filter(m => ['purchase', 'return', 'transfer_in'].includes(m.movement_type))
      ?.reduce((sum, m) => sum + (m.quantity || 0), 0) || 0

    const stockOutThisMonth = monthlyMovements
      ?.filter(m => ['sale', 'transfer_out', 'write_off', 'damage', 'job_usage'].includes(m.movement_type))
      ?.reduce((sum, m) => sum + (m.quantity || 0), 0) || 0

    return {
      totalItems: totalItems || 0,
      lowStockItems: lowStockItems || 0,
      outOfStockItems: outOfStockItems || 0,
      totalSuppliers: totalSuppliers || 0,
      totalWarehouses: totalWarehouses || 0,
      totalStockValue,
      stockInThisMonth,
      stockOutThisMonth,
      recentMovements: movementsWithNames,
      expiringBatches: batchesWithNames
    }
  }
}
