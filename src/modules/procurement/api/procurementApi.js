import { supabase } from '../../../lib/supabaseClient'

export const procurementApi = {
  // Vendors
  async getVendors(filters = {}) {
    let query = supabase.from('vendors').select('*').order('company_name')
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.category) query = query.eq('vendor_category', filters.category)
    if (filters.search) query = query.or(`company_name.ilike.%${filters.search}%,vendor_code.ilike.%${filters.search}%`)
    const { data, error } = await query
    return { data, error }
  },

  async getVendor(id) {
    const { data, error } = await supabase
      .from('vendors')
      .select('*, vendor_contacts(*), vendor_evaluations(*)')
      .eq('id', id).single()
    return { data, error }
  },

  async createVendor(vendorData) {
    const { data, error } = await supabase
      .from('vendors')
      .insert([{ ...vendorData, vendor_code: 'VND-' + Date.now().toString(36).toUpperCase().slice(-6) }])
      .select().single()
    return { data, error }
  },

  async updateVendor(id, updates) {
    const { data, error } = await supabase.from('vendors').update(updates).eq('id', id).select().single()
    return { data, error }
  },

  async addVendorContact(contactData) {
    const { data, error } = await supabase.from('vendor_contacts').insert([contactData]).select().single()
    return { data, error }
  },

  // Purchase Requisitions
  async getPurchaseRequisitions(filters = {}) {
    let query = supabase.from('purchase_requisitions')
      .select('*, purchase_requisition_items(*)')
      .order('created_at', { ascending: false })
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.requested_by) query = query.eq('requested_by', filters.requested_by)
    const { data, error } = await query
    return { data, error }
  },

  async getPurchaseRequisition(id) {
    const { data, error } = await supabase
      .from('purchase_requisitions')
      .select('*, purchase_requisition_items(*, inventory_items(name, item_code))')
      .eq('id', id).single()
    return { data, error }
  },

  async createPurchaseRequisition(prData, items) {
    const { data: pr, error: prError } = await supabase
      .from('purchase_requisitions').insert([prData]).select().single()
    if (prError) return { error: prError }
    if (items?.length) {
      const itemsWithPR = items.map((item, i) => ({ ...item, pr_id: pr.id, item_number: i + 1 }))
      await supabase.from('purchase_requisition_items').insert(itemsWithPR)
    }
    return { data: pr }
  },

  async updatePRStatus(id, status, approvedBy = null) {
    const updates = { status, updated_at: new Date().toISOString() }
    if (status === 'approved') { updates.approved_by = approvedBy; updates.approved_at = new Date().toISOString() }
    const { data, error } = await supabase.from('purchase_requisitions').update(updates).eq('id', id).select().single()
    return { data, error }
  },

  // RFQs
  async getRFQs(filters = {}) {
    let query = supabase.from('rfqs').select('*, rfq_items(*), rfq_responses(*, vendors(company_name))').order('created_at', { ascending: false })
    if (filters.status) query = query.eq('status', filters.status)
    const { data, error } = await query
    return { data, error }
  },

  async getRFQ(id) {
    const { data, error } = await supabase
      .from('rfqs')
      .select('*, rfq_items(*, inventory_items(name)), rfq_responses(*, vendors(*), rfq_response_items(*))')
      .eq('id', id).single()
    return { data, error }
  },

  async createRFQ(rfqData, items) {
    const { data: rfq, error } = await supabase.from('rfqs').insert([rfqData]).select().single()
    if (error) return { error }
    if (items?.length) {
      await supabase.from('rfq_items').insert(items.map((item, i) => ({ ...item, rfq_id: rfq.id, item_number: i + 1 })))
    }
    return { data: rfq }
  },

  async addRFQResponse(responseData, items) {
    const { data: response, error } = await supabase.from('rfq_responses').insert([responseData]).select().single()
    if (error) return { error }
    if (items?.length) {
      await supabase.from('rfq_response_items').insert(items.map(item => ({ ...item, response_id: response.id })))
    }
    return { data: response }
  },

  async awardRFQ(rfqId, responseId) {
    await supabase.from('rfq_responses').update({ is_selected: true }).eq('id', responseId)
    await supabase.from('rfq_responses').update({ is_selected: false }).eq('rfq_id', rfqId).neq('id', responseId)
    const { data } = await supabase.from('rfqs').update({ status: 'awarded' }).eq('id', rfqId).select().single()
    return { data }
  },

  // Purchase Orders (Extended)
  async createPurchaseOrderFromPR(prId) {
    const { data: pr } = await procurementApi.getPurchaseRequisition(prId)
    if (!pr) return { error: 'PR not found' }

    const poData = {
      pr_id: pr.id,
      supplier_id: pr.purchase_requisition_items?.[0]?.suggested_vendor_id,
      order_date: new Date().toISOString().split('T')[0],
      status: 'draft',
      notes: `Created from PR ${pr.pr_number}`
    }

    const items = pr.purchase_requisition_items.map(item => ({
      item_id: item.item_id,
      description: item.description,
      quantity_ordered: item.quantity,
      unit_price: item.estimated_unit_price || 0
    }))

    const { data: po, error } = await supabase.from('purchase_orders').insert([poData]).select().single()
    if (error) return { error }

    if (items.length) {
      await supabase.from('purchase_order_items').insert(items.map(item => ({ ...item, purchase_order_id: po.id })))
    }

    await procurementApi.updatePRStatus(prId, 'converted_to_po')
    return { data: po }
  },

  // Goods Receipts
  async getGoodsReceipts(filters = {}) {
    let query = supabase.from('goods_receipts')
      .select('*, purchase_orders(po_number), vendors(company_name), goods_receipt_items(*, inventory_items(name))')
      .order('receipt_date', { ascending: false })
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.purchase_order_id) query = query.eq('purchase_order_id', filters.purchase_order_id)
    const { data, error } = await query
    return { data, error }
  },

  async createGoodsReceipt(grData, items) {
    const { data: gr, error } = await supabase.from('goods_receipts').insert([grData]).select().single()
    if (error) return { error }
    if (items?.length) {
      await supabase.from('goods_receipt_items').insert(items.map(item => ({ ...item, goods_receipt_id: gr.id })))
    }
    return { data: gr }
  },

  // Vendor Evaluations
  async getVendorEvaluations(vendorId = null) {
    let query = supabase.from('vendor_evaluations').select('*, vendors(company_name)').order('evaluation_date', { ascending: false })
    if (vendorId) query = query.eq('vendor_id', vendorId)
    const { data, error } = await query
    return { data, error }
  },

  async createVendorEvaluation(evalData) {
    const { data, error } = await supabase.from('vendor_evaluations').insert([evalData]).select().single()
    return { data, error }
  },

  // Budgets
  async getBudgets() {
    const { data, error } = await supabase.from('procurement_budgets').select('*').order('fiscal_year', { ascending: false })
    return { data, error }
  },

  // Dashboard Stats
  async getProcurementStats() {
    const [
      { count: totalVendors },
      { count: pendingPRs },
      { count: openRFQs },
      { count: pendingPOs },
      { count: pendingGRs },
      { data: recentPRs },
      { data: recentPOs }
    ] = await Promise.all([
      supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('purchase_requisitions').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
      supabase.from('rfqs').select('*', { count: 'exact', head: true }).eq('status', 'issued'),
      supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['sent', 'confirmed']),
      supabase.from('goods_receipts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('purchase_requisitions').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('purchase_orders').select('*, vendors(company_name)').order('created_at', { ascending: false }).limit(5)
    ])

    const { data: budgets } = await supabase.from('procurement_budgets').select('*').eq('status', 'active')
    const totalBudget = budgets?.reduce((sum, b) => sum + (b.total_budget || 0), 0) || 0
    const totalSpent = budgets?.reduce((sum, b) => sum + (b.spent_amount || 0), 0) || 0

    return {
      totalVendors: totalVendors || 0,
      pendingPRs: pendingPRs || 0,
      openRFQs: openRFQs || 0,
      pendingPOs: pendingPOs || 0,
      pendingGRs: pendingGRs || 0,
      totalBudget,
      totalSpent,
      budgetUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      recentPRs: recentPRs || [],
      recentPOs: recentPOs || []
    }
  }
}
