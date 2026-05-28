import { supabase } from '../../../lib/supabaseClient'

export const salesApi = {
  // ============================================
  // QUOTATIONS
  // ============================================
  async getQuotations(filters = {}) {
    let query = supabase
      .from('quotations')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
    if (filters.client_id) query = query.eq('client_id', filters.client_id)
    if (filters.search) {
      query = query.or(`quotation_number.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    return { data: data || [], error }
  },

  async getQuotation(id) {
    const { data, error } = await supabase
      .from('quotations')
      .select('*, quotation_items(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createQuotation(quotationData, items) {
    // Generate quotation number manually instead of relying on trigger
    const { data: existingQuotes } = await supabase
      .from('quotations')
      .select('quotation_number')
      .order('created_at', { ascending: false })
      .limit(1)
    
    let nextNum = 1
    if (existingQuotes && existingQuotes.length > 0) {
      const lastNum = parseInt(existingQuotes[0].quotation_number?.split('-').pop() || '0')
      nextNum = lastNum + 1
    }
    
    const yearSuffix = new Date().getFullYear().toString().slice(-2)
    const quotationNumber = `Q-${yearSuffix}-${String(nextNum).padStart(4, '0')}`

    // Insert quotation
    const { data: quotation, error: qError } = await supabase
      .from('quotations')
      .insert([{
        ...quotationData,
        quotation_number: quotationNumber,
        quotation_date: quotationData.quotation_date || new Date().toISOString().split('T')[0],
        valid_until: quotationData.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: quotationData.subtotal || 0,
        tax_rate: quotationData.tax_rate || 15,
        tax_amount: quotationData.tax_amount || 0,
        discount_amount: quotationData.discount_amount || 0,
        total_amount: quotationData.total_amount || 0,
        status: quotationData.status || 'draft'
      }])
      .select('*')
      .single()

    if (qError) return { error: qError }

    // Insert items
    if (items && items.length > 0) {
      const itemsWithQuotationId = items.map((item, index) => ({
        quotation_id: quotation.id,
        item_number: index + 1,
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit || 'each',
        unit_price: item.unit_price || 0,
        discount_percent: item.discount_percent || 0,
        tax_percent: item.tax_percent || 15
      }))

      const { error: iError } = await supabase
        .from('quotation_items')
        .insert(itemsWithQuotationId)

      if (iError) return { error: iError }
    }

    // Return complete quotation with items
    return await salesApi.getQuotation(quotation.id)
  },

  async updateQuotation(id, updates) {
    const cleanUpdates = { ...updates }
    
    // Don't send empty strings for dates
    if (cleanUpdates.quotation_date === '') delete cleanUpdates.quotation_date
    if (cleanUpdates.valid_until === '') delete cleanUpdates.valid_until
    
    const { data, error } = await supabase
      .from('quotations')
      .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()
    return { data, error }
  },

  async convertQuotationToInvoice(quotationId) {
    // Get quotation with items
    const { data: quotation, error: fetchError } = await salesApi.getQuotation(quotationId)
    if (fetchError || !quotation) return { error: fetchError || 'Quotation not found' }

    // Generate invoice number
    const yearSuffix = new Date().getFullYear().toString().slice(-2)
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)
    
    let nextInvNum = 1
    if (existingInvoices && existingInvoices.length > 0) {
      const lastInvNum = parseInt(existingInvoices[0].invoice_number?.split('-').pop() || '0')
      nextInvNum = lastInvNum + 1
    }
    const invoiceNumber = `INV-${yearSuffix}-${String(nextInvNum).padStart(4, '0')}`

    // Create invoice
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert([{
        invoice_number: invoiceNumber,
        quotation_id: quotation.id,
        client_id: quotation.client_id,
        client_name: quotation.client_name,
        client_email: quotation.client_email,
        client_address: quotation.client_address,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: quotation.subtotal || 0,
        tax_rate: quotation.tax_rate || 15,
        tax_amount: quotation.tax_amount || 0,
        discount_amount: quotation.discount_amount || 0,
        total_amount: quotation.total_amount || 0,
        status: 'sent',
        notes: `Converted from quotation ${quotation.quotation_number}`
      }])
      .select('*')
      .single()

    if (invError) return { error: invError }

    // Copy quotation items to invoice items
    if (quotation.quotation_items && quotation.quotation_items.length > 0) {
      const invoiceItems = quotation.quotation_items.map((item, index) => ({
        invoice_id: invoice.id,
        item_number: index + 1,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
        tax_percent: item.tax_percent || 15
      }))

      await supabase.from('invoice_items').insert(invoiceItems)
    }

    // Update quotation status
    await supabase
      .from('quotations')
      .update({ 
        status: 'converted', 
        converted_to_invoice: true,
        invoice_id: invoice.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', quotationId)

    return { data: invoice }
  },

  // ============================================
  // INVOICES
  // ============================================
  async getInvoices(filters = {}) {
    let query = supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
    if (filters.client_id) query = query.eq('client_id', filters.client_id)

    const { data, error } = await query
    return { data: data || [], error }
  },

  async getInvoice(id) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*), payments(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async recordPayment(paymentData) {
    const cleanData = { ...paymentData }
    // Clean UUID field
    if (!cleanData.invoice_id || cleanData.invoice_id === '') delete cleanData.invoice_id
    if (!cleanData.client_id || cleanData.client_id === '') delete cleanData.client_id
    if (!cleanData.recorded_by || cleanData.recorded_by === '') delete cleanData.recorded_by
    
    // Clean numeric
    if (cleanData.amount !== undefined) cleanData.amount = Number(cleanData.amount)
    
    const { data, error } = await supabase
      .from('payments')
      .insert([cleanData])
      .select('*')
      .single()

    if (!error && paymentData.invoice_id) {
      // Update invoice paid amount
      const { data: invoice } = await salesApi.getInvoice(paymentData.invoice_id)
      if (invoice) {
        const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0)
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

  // ============================================
  // PRODUCTS/SERVICES
  // ============================================
  async getProductsServices() {
    const { data, error } = await supabase
      .from('products_services')
      .select('*')
      .eq('is_active', true)
      .order('category')
    return { data: data || [], error }
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================
  async getSalesStats() {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7)
      
      const { count: totalQuotations } = await supabase.from('quotations').select('*', { count: 'exact', head: true })
      const { count: pendingQuotations } = await supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('status', 'sent')
      const { count: totalInvoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true })
      const { count: unpaidInvoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).in('status', ['sent', 'overdue', 'partially_paid'])
      const { data: monthlyInvoices } = await supabase.from('invoices').select('total_amount').gte('invoice_date', `${currentMonth}-01`)
      const { data: recentQuotations } = await supabase.from('quotations').select('*').order('created_at', { ascending: false }).limit(5)

      const monthlyTotal = (monthlyInvoices || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

      return {
        totalQuotations: totalQuotations || 0,
        pendingQuotations: pendingQuotations || 0,
        totalInvoices: totalInvoices || 0,
        unpaidInvoices: unpaidInvoices || 0,
        monthlyTotal,
        recentQuotations: recentQuotations || []
      }
    } catch (error) {
      console.error('getSalesStats error:', error)
      return {
        totalQuotations: 0,
        pendingQuotations: 0,
        totalInvoices: 0,
        unpaidInvoices: 0,
        monthlyTotal: 0,
        recentQuotations: []
      }
    }
  }
