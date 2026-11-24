import { supabase } from '../../../lib/supabaseClient'

export const tenderApi = {
  // ── FETCH ALL TENDERS ──
  async getTenders(filters = {}) {
    let query = supabase
      .from('tender_opportunities')
      .select('*, clients(company_name)')
      .order('created_at', { ascending: false })

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,tender_number.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    return { data, error }
  },

  // ── FETCH SINGLE TENDER WITH DETAILS ──
  async getTender(id) {
    const { data: tender, error: tError } = await supabase
      .from('tender_opportunities')
      .select('*, clients(*)')
      .eq('id', id)
      .single()

    if (tError) return { error: tError }

    const { data: pricing } = await supabase
      .from('tender_pricing_items')
      .select('*')
      .eq('tender_id', id)
      .order('created_at', { ascending: true })

    const { data: compliance } = await supabase
      .from('tender_compliance_items')
      .select('*')
      .eq('tender_id', id)

    const { data: quotation } = await supabase
      .from('quotations')
      .select('id, quotation_number, status')
      .eq('tender_id', id)
      .maybeSingle()

    return {
      data: {
        ...tender,
        pricing_items: pricing || [],
        compliance_items: compliance || [],
        quotation: quotation || null
      },
      error: null
    }
  },

  // ── CREATE TENDER ──
  async createTender(tenderData) {
    const prefix = 'TND'
    const dateCode = new Date().toISOString().slice(2, 7).replace('-', '')
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase()
    const tenderNumber = `${prefix}-${dateCode}-${randomStr}`

    const cleanData = {}
    for (const [key, value] of Object.entries(tenderData)) {
      cleanData[key] = (value === '' || value === undefined) ? null : value
    }
    cleanData.estimated_value = Number(cleanData.estimated_value) || 0

    const { data, error } = await supabase
      .from('tender_opportunities')
      .insert([{ ...cleanData, tender_number: tenderNumber }])
      .select()
      .single()

    return { data, error }
  },

  // ✅ NEW: UPDATE TENDER DETAILS
  async updateTender(id, tenderData) {
    const cleanData = {}
    for (const [key, value] of Object.entries(tenderData)) {
      cleanData[key] = (value === '' || value === undefined) ? null : value
    }
    cleanData.estimated_value = Number(cleanData.estimated_value) || 0
    cleanData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('tender_opportunities')
      .update(cleanData)
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  },

  // ── UPDATE TENDER STATUS ──
  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('tender_opportunities')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ── SAVE PRICING ITEMS ──
  async savePricingItems(tenderId, items) {
    await supabase.from('tender_pricing_items').delete().eq('tender_id', tenderId)
    if (!items || items.length === 0) return { success: true }

    const payload = items.map(item => ({
      tender_id: tenderId,
      description: item.description,
      service_category: item.service_category || null,
      quantity: Number(item.quantity) || 1,
      unit_of_measure: item.unit_of_measure || 'Month',
      frequency: item.frequency || 'Monthly',
      labour_cost: Number(item.labour_cost) || 0,
      material_cost: Number(item.material_cost) || 0,
      equipment_cost: Number(item.equipment_cost) || 0,
      transport_cost: Number(item.transport_cost) || 0,
      overhead_cost: Number(item.overhead_cost) || 0,
      profit_margin_percent: Number(item.profit_margin_percent) || 20,
      unit_price: Number(item.unit_price) || 0,
      total_amount: Number(item.total_amount) || 0,
      vat_percent: Number(item.vat_percent) || 15
    }))

    const { error } = await supabase.from('tender_pricing_items').insert(payload)
    return { success: !error, error }
  },

  // ── SAVE COMPLIANCE ITEMS ──
  async saveComplianceItems(tenderId, items) {
    await supabase.from('tender_compliance_items').delete().eq('tender_id', tenderId)
    if (!items || items.length === 0) return { success: true }

    const payload = items.map(item => ({
      tender_id: tenderId,
      requirement_name: item.requirement_name,
      is_mandatory: item.is_mandatory ?? true,
      document_url: item.document_url || null,
      status: item.status || 'pending',
      notes: item.notes || null
    }))

    const { error } = await supabase.from('tender_compliance_items').insert(payload)
    return { success: !error, error }
  },

  // ── DASHBOARD STATS ──
  async getStats() {
    const { data: tenders } = await supabase.from('tender_opportunities').select('status, estimated_value')
    if (!tenders) return { total: 0, draft: 0, submitted: 0, awarded: 0, pipelineValue: 0 }

    return {
      total: tenders.length,
      draft: tenders.filter(t => t.status === 'draft').length,
      submitted: tenders.filter(t => t.status === 'submitted').length,
      awarded: tenders.filter(t => t.status === 'awarded').length,
      pipelineValue: tenders.reduce((sum, t) => sum + (Number(t.estimated_value) || 0), 0)
    }
  }
}
