import { supabase } from '../../../lib/supabaseClient'

export const salesApi = {
  // ============================================
  // QUOTATIONS
  // ============================================

  async getQuotations(filters = {}) {
    let query = supabase
      .from('quotations')
      .select('*, clients(company_name, client_code)')
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.client_id) query = query.eq('client_id', filters.client_id)
    if (filters.search) {
      query = query.or(
        `quotation_number.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await query
    return { data, error }
  },

  async getQuotation(id) {
    const { data, error } = await supabase
      .from('quotations')
      .select('*, quotation_items(*), clients(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  /**
   * Create a quotation with items.
   * @param {Object} quotationData - The quotation header data.
   * @param {Array}  items          - Array of item objects.
   *   Each item must have: description, quantity, unit, unit_price, tax_percent, discount_percent.
   */
  async createQuotation(quotationData, items) {
    // 1. Insert quotation header
    const { data: quotation, error: qError } = await supabase
      .from('quotations')
      .insert([quotationData])
      .select()
      .single()

    if (qError) return { error: qError }

    // 2. Insert quotation items (with item_number auto‑incremented)
    if (items && items.length > 0) {
      const itemsWithNumbers = items.map((item, index) => ({
        quotation_id: quotation.id,
        item_number: index + 1,                          // required field
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit || 'each',
        unit_price: item.unit_price || 0,
        tax_percent: item.tax_percent ?? 15,
        discount_percent: item.discount_percent ?? 0,
        total_price: (item.quantity || 1) * (item.unit_price || 0) // denormalised for speed
      }))

      const { error: iError } = await supabase
        .from('quotation_items')
        .insert(itemsWithNumbers)

      if (iError) return { error: iError }
    }

    // 3. Return the full quotation with items
    return await salesApi.getQuotation(quotation.id)
  },

  async updateQuotation(id, updates) {
    const { data, error } = await supabase
      .from('quotations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // INVOICES (unchanged)
  // ============================================
  async getInvoices(filters = {}) {
    let query = supabase
      .from('invoices')
      .select('*, clients(company_name)')
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.client_id) query = query.eq('client_id', filters.client_id)
    if (filters.overdue)
      query = query.lt('due_date', new Date().toISOString()).neq('status', 'paid')

    const { data, error } = await query
    return { data, error }
  },

  async getInvoice(id) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*), clients(*), payments(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createInvoice(invoiceData, items) {
    const { data: invoice, error: iError } = await supabase
      .from('invoices')
      .insert([invoiceData])
      .select()
      .single()

    if (iError) return { error: iError }

    if (items && items.length > 0) {
      const itemsWithInvoiceId = items.map((item, index) => ({
        ...item,
        invoice_id: invoice.id,
        item_number: index + 1
      }))
      await supabase.from('invoice_items').insert(itemsWithInvoiceId)
    }

    return await salesApi.getInvoice(invoice.id)
  },

  async recordPayment(paymentData) {
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single()

    if (!error && paymentData.invoice_id) {
      // Update invoice amount paid
      const { data: invoice } = await salesApi.getInvoice(paymentData.invoice_id)
      if (invoice) {
        const totalPaid =
          (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0) +
          paymentData.amount
        const newStatus = totalPaid >= invoice.total_amount ? 'paid' : 'partially_paid'

        await supabase
          .from('invoices')
          .update({
            amount_paid: totalPaid,
            status: newStatus,
            last_payment_date: paymentData.payment_date
          })
          .eq('id', paymentData.invoice_id)
      }
    }

    return { data, error }
  },

  // ============================================
  // CONVERSIONS
  // ============================================
  async convertQuotationToInvoice(quotationId) {
    const { data: quotation } = await salesApi.getQuotation(quotationId)
    if (!quotation) return { error: 'Quotation not found' }

    const invoiceData = {
      quotation_id: quotation.id,
      client_id: quotation.client_id,
      client_name: quotation.client_name,
      client_email: quotation.client_email,
      client_address: quotation.client_address,
      subtotal: quotation.subtotal,
      tax_rate: quotation.tax_rate,
      tax_amount: quotation.tax_amount,
      discount_amount: quotation.discount_amount,
      total_amount: quotation.total_amount,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      notes: `Converted from quotation ${quotation.quotation_number}`
    }

    const items = quotation.quotation_items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent,
      tax_percent: item.tax_percent
    }))

    const result = await salesApi.createInvoice(invoiceData, items)

    if (!result.error) {
      await salesApi.updateQuotation(quotationId, {
        status: 'converted',
        converted_to_invoice: true,
        invoice_id: result.data.id
      })
    }

    return result
  },

  async convertQuotationToJob(quotationId) {
    const { data: quotation } = await salesApi.getQuotation(quotationId)
    if (!quotation) return { error: 'Quotation not found' }

    // Insert a new job based on quotation
    const jobData = {
      client_id: quotation.client_id,
      title: quotation.client_name + ' - Cleaning Service',
      description: quotation.notes || 'Job created from quotation ' + quotation.quotation_number,
      site_address: quotation.client_address,
      quoted_amount: quotation.total_amount,
      quotation_id: quotation.id,
      status: 'scheduled',
      scheduled_date: new Date().toISOString().split('T')[0],
      priority: 'medium'
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single()

    if (error) return { error }

    // Update quotation status
    await salesApi.updateQuotation(quotationId, { status: 'converted' })

    return { data: job }
  },

  // ============================================
  // PRODUCTS / SERVICES
  // ============================================
  async getProductsServices() {
    const { data, error } = await supabase
      .from('products_services')
      .select('*')
      .eq('is_active', true)
      .order('category')
    return { data, error }
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================
  async getSalesStats() {
    const [
      { count: totalQuotations },
      { count: pendingQuotations },
      { count: totalInvoices },
      { count: unpaidInvoices }
    ] = await Promise.all([
      supabase.from('quotations').select('*', { count: 'exact', head: true }),
      supabase
        .from('quotations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent'),
      supabase.from('invoices').select('*', { count: 'exact', head: true }),
      supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .in('status', ['sent', 'overdue', 'partially_paid'])
    ])

    return {
      totalQuotations: totalQuotations || 0,
      pendingQuotations: pendingQuotations || 0,
      totalInvoices: totalInvoices || 0,
      unpaidInvoices: unpaidInvoices || 0
    }
  }
}
