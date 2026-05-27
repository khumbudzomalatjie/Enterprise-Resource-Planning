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
    if (filters.search) query = query.or(`quotation_number.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`)

    const { data, error } = await query
    return { data, error }
  },

  async getQuotation(id) {
    const { data: quotation, error: qError } = await supabase
      .from('quotations')
      .select('*, clients(*)')
      .eq('id', id)
      .single()

    if (qError) return { error: qError }

    const { data: items, error: iError } = await supabase
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', id)
      .order('item_number', { ascending: true })

    return { 
      data: { ...quotation, quotation_items: items || [] }, 
      error: null 
    }
  },

  async createQuotation(quotationData, items) {
    // Generate quotation number
    const yearSuffix = new Date().getFullYear().toString().slice(-2)
    const { count } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .like('quotation_number', `Q-${yearSuffix}-%`)
    
    const nextNum = String((count || 0) + 1).padStart(4, '0')
    const quotationNumber = `Q-${yearSuffix}-${nextNum}`
    
    console.log('Creating quotation:', quotationNumber)
    
    // Insert quotation
    const { data: quotation, error: qError } = await supabase
      .from('quotations')
      .insert([{ 
        quotation_number: quotationNumber,
        client_id: quotationData.client_id || null,
        client_name: quotationData.client_name || '',
        client_email: quotationData.client_email || '',
        client_phone: quotationData.client_phone || '',
        client_address: quotationData.client_address || '',
        quotation_date: quotationData.quotation_date || new Date().toISOString().split('T')[0],
        valid_until: quotationData.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_terms: quotationData.payment_terms || '50% Deposit, Balance on Completion',
        tax_rate: quotationData.tax_rate || 15,
        subtotal: quotationData.subtotal || 0,
        tax_amount: quotationData.tax_amount || 0,
        discount_amount: quotationData.discount_amount || 0,
        total_amount: quotationData.total_amount || 0,
        discount_type: quotationData.discount_type || 'none',
        discount_value: quotationData.discount_value || 0,
        notes: quotationData.notes || '',
        terms_and_conditions: quotationData.terms_and_conditions || '',
        status: quotationData.status || 'draft'
      }])
      .select()
      .single()

    if (qError) {
      console.error('Quotation insert error:', qError)
      return { error: qError }
    }

    console.log('Quotation created with ID:', quotation.id)

    // Insert items - only valid ones with description and price
    if (items && items.length > 0) {
      const validItems = items.filter(item => item.description && (item.unit_price > 0 || item.quantity > 0))
      
      if (validItems.length > 0) {
        const itemsToInsert = validItems.map((item, index) => ({
          quotation_id: quotation.id,
          item_number: index + 1,
          description: item.description,
          quantity: item.quantity || 1,
          unit: item.unit || 'each',
          unit_price: item.unit_price || 0,
          discount_percent: item.discount_percent || 0,
          tax_percent: item.tax_percent || 15
        }))

        console.log('Inserting items:', itemsToInsert.length)

        const { error: iError } = await supabase
          .from('quotation_items')
          .insert(itemsToInsert)

        if (iError) {
          console.error('Items insert error details:', iError)
          // Return error but don't delete quotation - user can retry
          return { error: iError }
        }
        
        console.log('Items inserted successfully')
      }
    }

    // Fetch complete quotation with items
    return await this.getQuotation(quotation.id)
  },

  async updateQuotation(id, updates) {
    const { data, error } = await supabase
      .from('quotations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async updateQuotationStatus(id, status) {
    const updates = { status, updated_at: new Date().toISOString() }
    if (status === 'converted') updates.converted_to_invoice = true
    
    const { data, error } = await supabase
      .from('quotations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteQuotation(id) {
    // Delete items first
    const { error: itemsError } = await supabase
      .from('quotation_items')
      .delete()
      .eq('quotation_id', id)
    
    if (itemsError) {
      console.error('Error deleting items:', itemsError)
    }

    // Delete the quotation
    const { error } = await supabase
      .from('quotations')
      .delete()
      .eq('id', id)
    
    return { error }
  },

  // ============================================
  // ACCEPT QUOTATION - Creates Job
  // ============================================
  async acceptQuotation(id) {
    console.log('Accepting quotation:', id)
    
    const { data: jobId, error: jobError } = await supabase
      .rpc('create_job_from_quotation', { p_quotation_id: id })

    if (jobError) {
      console.error('Job creation error:', jobError)
      return { error: jobError }
    }

    console.log('Job created with ID:', jobId)

    const { data: quotation, error: qError } = await supabase
      .from('quotations')
      .update({ 
        status: 'accepted',
        converted_to_invoice: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (qError) {
      console.error('Quotation update error:', qError)
      return { error: qError }
    }

    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    return { 
      data: { quotation, job: job || { id: jobId } }, 
      error: null 
    }
  },

  // ============================================
  // QUOTATION ITEMS
  // ============================================
  async addQuotationItem(itemData) {
    const { data, error } = await supabase
      .from('quotation_items')
      .insert([{
        quotation_id: itemData.quotation_id,
        item_number: itemData.item_number,
        description: itemData.description,
        quantity: itemData.quantity || 1,
        unit: itemData.unit || 'each',
        unit_price: itemData.unit_price || 0,
        discount_percent: itemData.discount_percent || 0,
        tax_percent: itemData.tax_percent || 15
      }])
      .select()
      .single()
    return { data, error }
  },

  async updateQuotationItem(id, updates) {
    const { data, error } = await supabase
      .from('quotation_items')
      .update({
        description: updates.description,
        quantity: updates.quantity,
        unit: updates.unit,
        unit_price: updates.unit_price,
        discount_percent: updates.discount_percent,
        tax_percent: updates.tax_percent
      })
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

  // ============================================
  // INVOICES
  // ============================================
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
      const itemsToInsert = items.map((item, index) => ({
        invoice_id: invoice.id,
        item_number: index + 1,
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit || 'each',
        unit_price: item.unit_price || 0,
        discount_percent: item.discount_percent || 0,
        tax_percent: item.tax_percent || 15
      }))
      await supabase.from('invoice_items').insert(itemsToInsert)
    }

    return await this.getInvoice(invoice.id)
  },

  async convertQuotationToInvoice(quotationId) {
    const { data: quotation } = await this.getQuotation(quotationId)
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
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: `Converted from quotation ${quotation.quotation_number}`
    }

    const items = (quotation.quotation_items || []).map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent,
      tax_percent: item.tax_percent
    }))

    const result = await this.createInvoice(invoiceData, items)
    if (!result.error) {
      await this.updateQuotationStatus(quotationId, 'converted')
    }
    return result
  },

  // ============================================
  // PAYMENTS
  // ============================================
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
      const { data: invoice } = await this.getInvoice(paymentData.invoice_id)
      if (invoice) {
        const totalPaid = (invoice.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0) + (paymentData.amount || 0)
        const newStatus = totalPaid >= invoice.total_amount ? 'paid' : 'partially_paid'
        await supabase
          .from('invoices')
          .update({ amount_paid: totalPaid, status: newStatus, last_payment_date: paymentData.payment_date })
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
    return { data, error }
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================
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
