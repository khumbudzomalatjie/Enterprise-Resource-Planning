import { supabase } from '../../../lib/supabaseClient'

export const salesApi = {
  // Quotations
  async getQuotations(filters = {}) {
    let query = supabase
      .from('quotations')
      .select('*, clients(company_name, client_code)')
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.client_id) query = query.eq('client_id', filters.client_id)
    if (filters.search) query = query.or(`quotation_number.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`)

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

  async createQuotation(quotationData, items) {
    // Insert quotation
    const { data: quotation, error: qError } = await supabase
      .from('quotations')
      .insert([quotationData])
      .select()
      .single()

    if (qError) return { error: qError }

    // Insert items
    if (items && items.length > 0) {
      const itemsWithQuotationId = items.map((item, index) => ({
        ...item,
        quotation_id: quotation.id,
        item_number: index + 1
      }))

      const { error: iError } = await supabase
        .from('quotation_items')
        .insert(itemsWithQuotationId)

      if (iError) return { error: iError }
    }

    // Fetch complete quotation with items
    return await salesApi.getQuotation(quotation.id)
  },

  async updateQuotation(id, updates) {
    const { data, error } = await supabase
      .from('quotations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, clients(company_name, client_code)')
      .single()
    return { data, error }
  },

  // NEW: Update quotation status only
  async updateQuotationStatus(id, status) {
    const updates = { 
      status,
      updated_at: new Date().toISOString()
    }
    
    if (status === 'converted') {
      updates.converted_to_invoice = true
    }
    
    const { data, error } = await supabase
      .from('quotations')
      .update(updates)
      .eq('id', id)
      .select('*, clients(company_name, client_code)')
      .single()
      
    return { data, error }
  },

  // Quotation Items
  async addQuotationItem(itemData) {
    const { data, error } = await supabase
      .from('quotation_items')
      .insert([itemData])
      .select()
      .single()
    return { data, error }
  },

  async updateQuotationItem(id, updates) {
    const { data, error } = await supabase
      .from('quotation_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteQuotationItem(id) {
    const { error } = await supabase
      .from('quotation_items')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Invoices
  async getInvoices(filters = {}) {
    let query = supabase
      .from('invoices')
      .select('*, clients(company_name)')
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.client_id) query = query.eq('client_id', filters.client_id)
    if (filters.overdue) query = query.lt('due_date', new Date().toISOString()).neq('status', 'paid')

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

  async convertQuotationToInvoice(quotationId) {
    // Get quotation with items
    const { data: quotation, error: qError } = await salesApi.getQuotation(quotationId)
    if (qError || !quotation) return { error: qError || 'Quotation not found' }

    // Create invoice from quotation
    const invoiceData = {
      quotation_id: quotation.id,
      client_id: quotation.client_id,
      client_name: quotation.client_name || quotation.clients?.company_name,
      client_email: quotation.client_email || quotation.clients?.email,
      client_address: quotation.client_address,
      subtotal: quotation.subtotal || 0,
      tax_rate: quotation.tax_rate || 15,
      tax_amount: quotation.tax_amount || 0,
      discount_amount: quotation.discount_amount || 0,
      total_amount: quotation.total_amount || 0,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: `Converted from quotation ${quotation.quotation_number}`,
      status: 'sent'
    }

    const items = (quotation.quotation_items || []).map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent || 0,
      tax_percent: item.tax_percent || 15
    }))

    const result = await salesApi.createInvoice(invoiceData, items)
    
    if (!result.error) {
      // Update quotation status
      await salesApi.updateQuotationStatus(quotationId, 'converted')
    }

    return result
  },

  async convertQuotationToJob(quotationId) {
    // Get quotation with items
    const { data: quotation, error: qError } = await salesApi.getQuotation(quotationId)
    if (qError || !quotation) return { error: qError || 'Quotation not found' }

    // Create job from quotation
    const jobData = {
      client_id: quotation.client_id,
      title: `Job from Quotation ${quotation.quotation_number}`,
      description: quotation.notes || '',
      site_address: quotation.client_address || '',
      quoted_amount: quotation.total_amount || 0,
      quotation_id: quotation.id,
      status: 'pending',
      priority: 'medium',
      cleaners_required: 1
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single()

    if (jobError) return { error: jobError }

    // Update quotation status
    await salesApi.updateQuotationStatus(quotationId, 'converted')

    return { data: { job, quotation } }
  },

  // Payments
  async getPayments(invoiceId = null) {
    let query = supabase
      .from('payments')
      .select('*, invoices(invoice_number), clients(company_name)')
      .order('payment_date', { ascending: false })

    if (invoiceId) query = query.eq('invoice_id', invoiceId)

    const { data, error } = await query
    return { data, error }
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
        const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0) + (paymentData.amount || 0)
        const newStatus = totalPaid >= (invoice.total_amount || 0) ? 'paid' : 'partially_paid'
        
        await supabase
          .from('invoices')
          .update({ 
            amount_paid: totalPaid,
            status: newStatus,
            last_payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0]
          })
          .eq('id', paymentData.invoice_id)
      }
    }

    return { data, error }
  },

  // Products/Services
  async getProductsServices() {
    const { data, error } = await supabase
      .from('products_services')
      .select('*')
      .eq('is_active', true)
      .order('category')
    return { data, error }
  },

  // Sales Targets
  async getSalesTargets() {
    const { data, error } = await supabase
      .from('sales_targets')
      .select('*')
      .order('start_date', { ascending: false })
    return { data, error }
  },

  // Dashboard Stats
  async getSalesStats() {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const [
      { count: totalQuotations },
      { count: pendingQuotations },
      { count: totalInvoices },
      { count: unpaidInvoices },
      { data: monthlySales },
      { data: recentQuotations }
    ] = await Promise.all([
      supabase.from('quotations').select('*', { count: 'exact', head: true }),
      supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
      supabase.from('invoices').select('*', { count: 'exact', head: true }),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).in('status', ['sent', 'overdue', 'partially_paid']),
      supabase.from('invoices').select('total_amount').gte('invoice_date', `${currentMonth}-01`),
      supabase.from('quotations').select('*, clients(company_name)').order('created_at', { ascending: false }).limit(5)
    ])

    const monthlyTotal = monthlySales?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0

    return {
      totalQuotations: totalQuotations || 0,
      pendingQuotations: pendingQuotations || 0,
      totalInvoices: totalInvoices || 0,
      unpaidInvoices: unpaidInvoices || 0,
      monthlyTotal,
      recentQuotations: recentQuotations || []
    }
  }
}
