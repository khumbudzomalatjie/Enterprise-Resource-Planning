import { supabase } from '../../../lib/supabaseClient'

export const financeApi = {
  // Approvals
  async getPendingApprovals() {
    const { data, error } = await supabase
      .from('approvals_queue')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })
    return { data, error }
  },

  async approveRequest(approvalId, approvedBy) {
    const { error } = await supabase.rpc('process_approval', {
      p_approval_id: approvalId,
      p_status: 'approved',
      p_approved_by: approvedBy
    })
    
    if (!error) {
      const { data: approval } = await supabase
        .from('approvals_queue')
        .select('*')
        .eq('id', approvalId)
        .single()
      
      if (approval?.approval_type === 'vendor') {
        await supabase.from('vendors')
          .update({ status: 'active', approved_by: approvedBy, approved_at: new Date().toISOString() })
          .eq('id', approval.reference_id)
      }
    }
    
    return { error }
  },

  async rejectRequest(approvalId, approvedBy, reason) {
    const { error } = await supabase.rpc('process_approval', {
      p_approval_id: approvalId,
      p_status: 'rejected',
      p_approved_by: approvedBy,
      p_rejection_reason: reason
    })
    return { error }
  },

  async createApprovalRequest(approvalData) {
    const { data, error } = await supabase
      .from('approvals_queue')
      .insert([approvalData])
      .select()
      .single()
    return { data, error }
  },

  async getPendingVendors() {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getAccountsPayable(filters = {}) {
    let query = supabase
      .from('accounts_payable')
      .select('*, vendors(company_name, vendor_code), purchase_orders(po_number)')
      .order('due_date', { ascending: true })

    if (filters.status) query = query.eq('status', filters.status)
    const { data, error } = await query
    return { data, error }
  },

  async createPayable(payableData) {
    const { data, error } = await supabase
      .from('accounts_payable')
      .insert([payableData])
      .select()
      .single()
    return { data, error }
  },

  async updatePayable(id, updates) {
    const { data, error } = await supabase
      .from('accounts_payable')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async getAccountsReceivable(filters = {}) {
    let query = supabase
      .from('accounts_receivable')
      .select('*, clients(company_name)')
      .order('due_date', { ascending: true })

    if (filters.status) query = query.eq('status', filters.status)
    const { data, error } = await query
    return { data, error }
  },

  async getPayments() {
    const { data, error } = await supabase
      .from('finance_payments')
      .select('*')
      .order('payment_date', { ascending: false })
      .limit(50)
    return { data, error }
  },

  async recordPayment(paymentData) {
    const { data, error } = await supabase
      .from('finance_payments')
      .insert([paymentData])
      .select()
      .single()
    
    if (!error && paymentData.reference_id) {
      if (paymentData.payment_type === 'accounts_payable') {
        const { data: payable } = await supabase
          .from('accounts_payable')
          .select('amount_paid')
          .eq('id', paymentData.reference_id)
          .single()
        
        if (payable) {
          const newPaid = (payable.amount_paid || 0) + paymentData.amount
          const { data: updated } = await supabase
            .from('accounts_payable')
            .select('amount')
            .eq('id', paymentData.reference_id)
            .single()
          
          await supabase.from('accounts_payable')
            .update({ 
              amount_paid: newPaid,
              status: newPaid >= (updated?.amount || 0) ? 'paid' : 'pending'
            })
            .eq('id', paymentData.reference_id)
        }
      }
    }
    
    return { data, error }
  },

  async getBudgets(fiscalYear = null) {
    let query = supabase
      .from('finance_budgets')
      .select('*')
      .order('fiscal_year', { ascending: false })

    if (fiscalYear) query = query.eq('fiscal_year', fiscalYear)
    const { data, error } = await query
    return { data, error }
  },

  async createBudget(budgetData) {
    const { data, error } = await supabase
      .from('finance_budgets')
      .insert([{ ...budgetData, budget_code: 'BUD-' + Date.now().toString(36).toUpperCase().slice(-6) }])
      .select()
      .single()
    return { data, error }
  },

  async getLedger(filters = {}) {
    let query = supabase
      .from('general_ledger')
      .select('*, chart_of_accounts(account_name, account_code)')
      .order('transaction_date', { ascending: false })

    if (filters.account_id) query = query.eq('account_id', filters.account_id)
    if (filters.date_from) query = query.gte('transaction_date', filters.date_from)
    if (filters.date_to) query = query.lte('transaction_date', filters.date_to)
    
    const { data, error } = await query.limit(100)
    return { data, error }
  },

  // ✅ NEW: Get completed jobs ready for invoicing
  async getCompletedJobs() {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id, job_number, title, status, scheduled_date, actual_start_time, actual_end_time,
        quoted_amount, cleaners_required, site_address, site_city,
        clients(company_name, client_code, phone, email),
        job_categories(name, color),
        field_job_assignments(
          id, employee_id, assignment_status, started_at, completed_at,
          employees(first_name, last_name, employee_code)
        )
      `)
      .eq('status', 'completed')
      .order('actual_end_time', { ascending: false })
      .limit(50)

    // Get quotation/invoice info for these jobs
    const jobIds = (data || []).map(j => j.id)
    let quotations = []
    let invoices = []
    
    if (jobIds.length > 0) {
      const { data: quots } = await supabase
        .from('quotations')
        .select('id, quotation_number, total_amount, status, job_id')
        .in('job_id', jobIds)
      quotations = quots || []

      const { data: invs } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, status, job_id')
        .in('job_id', jobIds)
      invoices = invs || []
    }

    const merged = (data || []).map(job => ({
      ...job,
      quotation: quotations.find(q => q.job_id === job.id) || null,
      invoice: invoices.find(i => i.job_id === job.id) || null,
      hasInvoice: invoices.some(i => i.job_id === job.id),
      hasQuotation: quotations.some(q => q.job_id === job.id)
    }))

    return { data: merged, error }
  },

  // ✅ NEW: Generate invoice from completed job
  async generateInvoiceFromJob(jobId) {
    const { data: job } = await supabase
      .from('jobs')
      .select('*, clients(company_name, client_code, email, phone, address_line1, city)')
      .eq('id', jobId)
      .single()

    if (!job) return { error: 'Job not found' }

    const invoiceNumber = 'INV-' + Date.now().toString(36).toUpperCase().slice(-6)
    
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert([{
        invoice_number: invoiceNumber,
        job_id: jobId,
        client_id: job.client_id,
        client_name: job.clients?.company_name,
        client_email: job.clients?.email,
        client_address: `${job.clients?.address_line1 || ''}, ${job.clients?.city || ''}`,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: job.quoted_amount || 0,
        tax_rate: 15,
        tax_amount: (job.quoted_amount || 0) * 0.15,
        total_amount: (job.quoted_amount || 0) * 1.15,
        status: 'draft',
        notes: `Invoice for job ${job.job_number} - ${job.title}`
      }])
      .select()
      .single()

    return { data: invoice, error }
  },

  async getFinanceStats() {
    const [
      { count: pendingApprovals },
      { data: payables },
      { data: receivables },
      { data: recentPayments },
      { data: budgets },
      { count: completedJobs },  // ✅ NEW
      { count: unbilledJobs }    // ✅ NEW
    ] = await Promise.all([
      supabase.from('approvals_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('accounts_payable').select('amount, amount_paid').neq('status', 'paid'),
      supabase.from('accounts_receivable').select('amount, amount_received').neq('status', 'paid'),
      supabase.from('finance_payments').select('amount').order('payment_date', { ascending: false }).limit(50),
      supabase.from('finance_budgets').select('*').eq('status', 'active'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed').not('id', 'in', supabase.from('invoices').select('job_id'))
    ])

    const totalPayables = payables?.reduce((sum, p) => sum + (p.amount - (p.amount_paid || 0)), 0) || 0
    const totalReceivables = receivables?.reduce((sum, r) => sum + (r.amount - (r.amount_received || 0)), 0) || 0
    const totalBudget = budgets?.reduce((sum, b) => sum + (b.total_budget || 0), 0) || 0
    const totalSpent = budgets?.reduce((sum, b) => sum + (b.spent_amount || 0), 0) || 0

    return {
      pendingApprovals: pendingApprovals || 0,
      totalPayables,
      totalReceivables,
      totalBudget,
      totalSpent,
      monthlyPayments: recentPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
      budgetUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      completedJobs: completedJobs || 0,    // ✅ NEW
      unbilledJobs: unbilledJobs || 0       // ✅ NEW
    }
  }
}
