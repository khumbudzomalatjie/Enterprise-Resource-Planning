import { supabase } from '../../../lib/supabaseClient'

export const inventoryApi = {
  // ============================================
  // ITEMS
  // ============================================
  async getItems(filters = {}) {
    let query = supabase.from('inventory_items').select('*').order('name')

    if (filters.category_id) query = query.eq('category_id', filters.category_id)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.search) query = query.or(`name.ilike.%${filters.search}%,item_code.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`)

    const { data: items, error } = await query
    if (error || !items || items.length === 0) return { data: items || [], error }

    let filteredItems = items
    if (filters.low_stock) {
      filteredItems = items.filter(i => i.current_stock > 0 && i.current_stock <= (i.reorder_point || 10))
    }

    const catIds = [...new Set(filteredItems.map(i => i.category_id).filter(Boolean))]
    let categories = []
    if (catIds.length > 0) {
      const { data } = await supabase.from('item_categories').select('id, name, color').in('id', catIds)
      categories = data || []
    }

    const whIds = [...new Set(filteredItems.map(i => i.default_warehouse_id).filter(Boolean))]
    let warehouses = []
    if (whIds.length > 0) {
      const { data } = await supabase.from('warehouses').select('id, name').in('id', whIds)
      warehouses = data || []
    }

    const supIds = [...new Set(filteredItems.map(i => i.preferred_supplier_id).filter(Boolean))]
    let suppliers = []
    if (supIds.length > 0) {
      const { data } = await supabase.from('suppliers').select('id, company_name').in('id', supIds)
      suppliers = data || []
    }

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

  // ═══════════════════════════════════════════════
  // FULL AUDIT TRAIL
  // Merges creation, movements, job usage, batches.
  // ✅ Resolves the acting user from employees OR profiles
  //    (employees preferred; profiles fallback for admins).
  // ═══════════════════════════════════════════════
  async getItemAuditTrail(itemId) {
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single()

    if (itemError || !item) return { data: null, error: itemError || new Error('Item not found') }

    const [movementsRes, jobUsageRes, batchesRes, catRes, whRes, supRes] = await Promise.all([
      supabase.from('stock_movements').select('*').eq('item_id', itemId).order('created_at', { ascending: true }),
      supabase.from('job_supplies_used').select('*').eq('supply_id', itemId).order('used_at', { ascending: true }),
      supabase.from('stock_batches').select('*').eq('item_id', itemId).order('created_at', { ascending: true }),
      item.category_id ? supabase.from('item_categories').select('id, name, color').eq('id', item.category_id).single() : Promise.resolve({ data: null }),
      item.default_warehouse_id ? supabase.from('warehouses').select('id, name').eq('id', item.default_warehouse_id).single() : Promise.resolve({ data: null }),
      item.preferred_supplier_id ? supabase.from('suppliers').select('id, company_name').eq('id', item.preferred_supplier_id).single() : Promise.resolve({ data: null })
    ])

    const movements = movementsRes.data || []
    const jobUsage  = jobUsageRes.data || []
    const batches   = batchesRes.data || []

    // Jobs referenced by job usage
    const jobIds = [...new Set(jobUsage.map(u => u.job_id).filter(Boolean))]
    let jobs = []
    if (jobIds.length > 0) {
      const { data } = await supabase.from('jobs').select('id, job_number, title').in('id', jobIds)
      jobs = data || []
    }

    // ───────────────────────────────────────────────
    // ✅ Resolve acting users from BOTH employees and profiles
    // performed_by on stock_movements is typically auth.uid()
    // used_by on job_supplies_used is also auth.uid()
    // ───────────────────────────────────────────────
    const userIds = [...new Set([
      ...movements.map(m => m.performed_by),
      ...jobUsage.map(u => u.used_by)
    ].filter(Boolean))]

    let employees = []
    let profiles = []

    if (userIds.length > 0) {
      const [empRes, profRes] = await Promise.all([
        // Employees can be matched by id OR user_id (both patterns exist in the codebase)
        supabase.from('employees')
          .select('id, user_id, first_name, last_name, employee_code, email, position')
          .or(`id.in.(${userIds.join(',')}),user_id.in.(${userIds.join(',')})`),
        supabase.from('profiles')
          .select('id, full_name, email, role')
          .in('id', userIds)
      ])
      employees = empRes.data || []
      profiles = profRes.data || []
    }

    const findActor = (uid) => {
      if (!uid) return null
      const emp = employees.find(e => e.user_id === uid || e.id === uid)
      if (emp) {
        const name = [emp.first_name, emp.last_name].filter(Boolean).join(' ').trim()
        return {
          id: emp.id,
          name: name || emp.email || 'Employee',
          code: emp.employee_code || null,
          role: emp.position || 'Employee',
          email: emp.email || null,
          source: 'employee'
        }
      }
      const prof = profiles.find(p => p.id === uid)
      if (prof) {
        return {
          id: prof.id,
          name: prof.full_name || prof.email || 'User',
          code: null,
          role: prof.role ? prof.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'User',
          email: prof.email || null,
          source: 'profile'
        }
      }
      return {
        id: uid,
        name: 'Unknown user',
        code: null,
        role: null,
        email: null,
        source: 'unknown'
      }
    }

    // ───────────────────────────────────────────────
    // Build unified event timeline
    // ───────────────────────────────────────────────
    const events = []

    // Creation
    if (item.created_at) {
      events.push({
        id: `create-${item.id}`,
        type: 'created',
        timestamp: item.created_at,
        title: 'Item Created',
        description: 'Item added to inventory system',
        direction: 'neutral',
        performedBy: findActor(item.created_by),
        metadata: {
          item_code: item.item_code,
          unit: item.unit,
          initial_cost: item.unit_cost,
          initial_price: item.unit_price
        }
      })
    }

    // Stock movements
    movements.forEach(m => {
      const inTypes  = ['purchase', 'return', 'transfer_in', 'adjustment_in', 'opening_stock']
      const outTypes = ['sale', 'usage', 'job_usage', 'transfer_out', 'adjustment_out', 'wastage', 'write_off']
      const direction = inTypes.includes(m.movement_type) ? 'in'
                       : outTypes.includes(m.movement_type) ? 'out'
                       : 'neutral'

      events.push({
        id: `move-${m.id}`,
        type: 'movement',
        subtype: m.movement_type,
        timestamp: m.created_at || m.movement_date,
        title: (m.movement_type || 'Movement').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: m.notes || `Stock ${direction === 'in' ? 'added' : direction === 'out' ? 'removed' : 'adjusted'}`,
        quantity: Math.abs(m.quantity || 0),
        direction,
        performedBy: findActor(m.performed_by),
        metadata: {
          unit_cost: m.unit_cost,
          status: m.status,
          job_id: m.job_id,
          reference: m.reference_id,
          reference_type: m.reference_type
        }
      })
    })

    // Job usage
    jobUsage.forEach(u => {
      const job = jobs.find(j => j.id === u.job_id)
      events.push({
        id: `jobuse-${u.id}`,
        type: 'job_usage',
        timestamp: u.used_at || u.created_at,
        title: 'Used on Job',
        description: job ? `Consumed on ${job.job_number}${job.title ? ' — ' + job.title : ''}` : (u.notes || 'Consumed on a job'),
        quantity: Math.abs(u.quantity_used || 0),
        direction: 'out',
        performedBy: findActor(u.used_by),
        metadata: {
          job_number: job?.job_number,
          job_title: job?.title,
          notes: u.notes
        }
      })
    })

    // Batches
    batches.forEach(b => {
      events.push({
        id: `batch-${b.id}`,
        type: 'batch',
        timestamp: b.created_at || b.received_date,
        title: 'Batch Received',
        description: `Batch ${b.batch_number || b.id?.slice(0, 8)}${b.expiry_date ? ' — expires ' + b.expiry_date : ''}`,
        quantity: Math.abs(b.quantity || 0),
        direction: 'in',
        performedBy: findActor(b.received_by || b.created_by),
        metadata: {
          batch_number: b.batch_number,
          expiry_date: b.expiry_date,
          location: b.location
        }
      })
    })

    // Sort newest first
    events.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))

    // Aggregate stats
    const totalIn  = events.filter(e => e.direction === 'in').reduce((s, e) => s + (e.quantity || 0), 0)
    const totalOut = events.filter(e => e.direction === 'out').reduce((s, e) => s + (e.quantity || 0), 0)

    const stats = {
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
      currentStock: item.current_stock || 0,
      eventCount: events.length,
      firstEvent: events[events.length - 1]?.timestamp || item.created_at,
      lastEvent: events[0]?.timestamp || item.created_at,
      movementCount: movements.length,
      jobUsageCount: jobUsage.length,
      batchCount: batches.length
    }

    return {
      data: {
        item: {
          ...item,
          item_categories: catRes.data || null,
          warehouses: whRes.data || null,
          suppliers: supRes.data || null
        },
        events,
        stats,
        movements,
        jobUsage,
        batches,
        jobs,
        employees,
        profiles
      },
      error: null
    }
  },

  async createItem(itemData) {
    const cleanedData = { ...itemData }
    if (cleanedData.category_id === '') cleanedData.category_id = null
    if (cleanedData.default_warehouse_id === '') cleanedData.default_warehouse_id = null
    if (cleanedData.preferred_supplier_id === '') cleanedData.preferred_supplier_id = null

    // ✅ Auto-attach the current user as creator
    if (!cleanedData.created_by) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) cleanedData.created_by = user.id
      } catch {}
    }

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

  // ✅ AMENDED: auto-attach performed_by from the current user
  async createStockMovement(movementData) {
    const cleanedData = { ...movementData }
    if (cleanedData.warehouse_id === '') cleanedData.warehouse_id = null
    if (cleanedData.batch_id === '') cleanedData.batch_id = null
    if (cleanedData.job_id === '') cleanedData.job_id = null

    // Auto-attach the acting user
    if (!cleanedData.performed_by) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) cleanedData.performed_by = user.id
      } catch (err) {
        console.warn('createStockMovement: could not resolve user —', err.message)
      }
    }

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
    const { count: outOfStockItems } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('current_stock', 0)
    const { count: totalSuppliers } = await supabase.from('suppliers').select('*', { count: 'exact', head: true })
    const { data: recentMovements } = await supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(5)

    const { data: allItems } = await supabase.from('inventory_items').select('current_stock, reorder_point, unit_cost')
    const lowStockItems = (allItems || []).filter(i =>
      i.current_stock > 0 && i.current_stock <= (i.reorder_point || 10)
    ).length
    const totalStockValue = (allItems || []).reduce((sum, item) => sum + (item.current_stock || 0) * (item.unit_cost || 0), 0)

    const itemIds = [...new Set((recentMovements || []).map(m => m.item_id).filter(Boolean))]
    let items = []
    if (itemIds.length > 0) {
      const { data } = await supabase.from('inventory_items').select('id, name, unit').in('id', itemIds)
      items = data || []
    }

    const enrichedMovements = (recentMovements || []).map(m => ({
      ...m,
      inventory_items: items.find(i => i.id === m.item_id) || null
    }))

    return {
      totalItems: totalItems || 0,
      lowStockItems,
      outOfStockItems: outOfStockItems || 0,
      totalSuppliers: totalSuppliers || 0,
      totalStockValue,
      recentMovements: enrichedMovements
    }
  }
}
