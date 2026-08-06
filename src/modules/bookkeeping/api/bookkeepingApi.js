import { supabase } from '../../../lib/supabaseClient'

export const bookkeepingApi = {
  // ============================================
  // TRANSACTIONS
  // ============================================
  async getTransactions(filters = {}) {
    let query = supabase.from('bookkeeping_transactions')
      .select('*, chart_of_accounts!account_id(*), clients!customer_id(company_name), vendors!supplier_id(company_name)')
      .order('transaction_date', { ascending: false }).limit(200)
    if (filters.type) query = query.eq('transaction_type', filters.type)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.date_from) query = query.gte('transaction_date', filters.date_from)
    if (filters.date_to) query = query.lte('transaction_date', filters.date_to)
    if (filters.account_id) query = query.eq('account_id', filters.account_id)
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.search) query = query.or(`description.ilike.%${filters.search}%,transaction_number.ilike.%${filters.search}%,reference.ilike.%${filters.search}%`)
    const { data, error } = await query
    return { data, error }
  },

  async getTransaction(id) {
    const { data, error } = await supabase.from('bookkeeping_transactions').select('*, chart_of_accounts!account_id(*), clients(*), vendors(*)').eq('id', id).single()
    return { data, error }
  },

  async createTransaction(transactionData) {
    if (!transactionData.transaction_number) {
      transactionData.transaction_number = await this.generateNumber(transactionData.transaction_type || 'expense')
    }
    const { data, error } = await supabase.from('bookkeeping_transactions').insert([transactionData]).select().single()
    return { data, error }
  },

  async updateTransaction(id, updates) {
    const { data, error } = await supabase.from('bookkeeping_transactions').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    return { data, error }
  },

  async reverseTransaction(id) {
    const { data: original } = await this.getTransaction(id)
    if (!original) return { error: 'Transaction not found' }
    const reversal = { ...original, id: undefined, transaction_number: null, transaction_type: 'adjustment', amount: -original.amount, tax_amount: -original.tax_amount, description: `REVERSAL: ${original.description}`, reference: `REV-${original.transaction_number}`, status: 'draft', notes: `Reversal of ${original.transaction_number}` }
    const result = await this.createTransaction(reversal)
    if (!result.error) await this.updateTransaction(id, { status: 'reversed', updated_at: new Date().toISOString() })
    return result
  },

  async approveTransaction(id) {
    const { data: userData } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('bookkeeping_transactions').update({ status: 'posted', approval_status: 'approved', approved_by: userData.user?.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id).select().single()
    return { data, error }
  },

  // ============================================
  // CHART OF ACCOUNTS
  // ============================================
  async getChartOfAccounts(type = null) {
    let query = supabase.from('chart_of_accounts').select('*').eq('is_active', true).order('sort_order')
    if (type) query = query.eq('account_type', type)
    const { data, error } = await query
    return { data, error }
  },

  async createAccount(accountData) {
    const { data, error } = await supabase.from('chart_of_accounts').insert([accountData]).select().single()
    return { data, error }
  },

  async updateAccount(id, updates) {
    const { data, error } = await supabase.from('chart_of_accounts').update(updates).eq('id', id).select().single()
    return { data, error }
  },

  // ============================================
  // JOURNAL ENTRIES
  // ============================================
  async getJournalEntries(filters = {}) {
    let query = supabase.from('journal_entries').select('*, journal_entry_lines(*)').order('journal_date', { ascending: false }).limit(100)
    if (filters.status) query = query.eq('status', filters.status)
    const { data, error } = await query
    return { data, error }
  },

  async createJournalEntry(entryData, lines) {
    const { data: entry, error: entryError } = await supabase.from('journal_entries').insert([entryData]).select().single()
    if (entryError) return { error: entryError }
    if (lines?.length) {
      const linesWithEntry = lines.map((line, i) => ({ ...line, journal_entry_id: entry.id, line_number: i + 1 }))
      await supabase.from('journal_entry_lines').insert(linesWithEntry)
    }
    return { data: entry }
  },

  async postJournalEntry(id) {
    const { data, error } = await supabase.from('journal_entries').update({ status: 'posted', posted_at: new Date().toISOString() }).eq('id', id).select().single()
    return { data, error }
  },

  // ============================================
  // BANKING
  // ============================================
  async getBankAccounts() {
    const { data, error } = await supabase.from('bank_accounts').select('*').eq('is_active', true).order('account_name')
    return { data, error }
  },

  async getBankStatements(accountId = null) {
    let query = supabase.from('bank_statements').select('*').order('statement_date', { ascending: false }).limit(500)
    if (accountId) query = query.eq('bank_account_id', accountId)
    const { data, error } = await query
    return { data, error }
  },

  async matchBankTransaction(statementId, transactionId) {
    const { data, error } = await supabase.from('bank_statements').update({ match_status: 'matched', matched_transaction_id: transactionId }).eq('id', statementId).select().single()
    if (!error) await supabase.from('bookkeeping_transactions').update({ is_reconciled: true, reconciled_date: new Date().toISOString().split('T')[0], reconciliation_reference: `BANK-MATCH-${statementId}` }).eq('id', transactionId)
    return { data, error }
  },

  // ============================================
  // IMPORT (Excel)
  // ============================================
  async createImportBatch(batchData) {
    const { data, error } = await supabase.from('import_batches').insert([batchData]).select().single()
    return { data, error }
  },

  async bulkImportTransactions(transactions) {
    const { data, error } = await supabase.from('bookkeeping_transactions').insert(transactions).select()
    return { data, error }
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================
  async getBookkeepingStats() {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: income } = await supabase.from('bookkeeping_transactions').select('amount').eq('transaction_type', 'income').gte('transaction_date', `${currentMonth}-01`).eq('status', 'posted')
    const { data: expenses } = await supabase.from('bookkeeping_transactions').select('amount').eq('transaction_type', 'expense').gte('transaction_date', `${currentMonth}-01`).eq('status', 'posted')
    const { data: outstandingCustomer } = await supabase.from('invoices').select('total_amount, amount_paid').neq('status', 'paid')
    const { data: outstandingSupplier } = await supabase.from('purchase_orders').select('total_amount').in('status', ['sent', 'confirmed'])
    const { data: bankAccounts } = await supabase.from('bank_accounts').select('current_balance').eq('is_active', true)
    const { count: recentCount } = await supabase.from('bookkeeping_transactions').select('*', { count: 'exact', head: true }).order('created_at', { ascending: false }).limit(50)
    const { data: recentTransactions } = await supabase.from('bookkeeping_transactions').select('*, chart_of_accounts!account_id(account_name, account_code)').order('created_at', { ascending: false }).limit(10)

    const totalIncome = income?.reduce((s, t) => s + (t.amount || 0), 0) || 0
    const totalExpenses = expenses?.reduce((s, t) => s + (t.amount || 0), 0) || 0
    const outstandingCust = outstandingCustomer?.reduce((s, i) => s + ((i.total_amount || 0) - (i.amount_paid || 0)), 0) || 0
    const outstandingSupp = outstandingSupplier?.reduce((s, p) => s + (p.total_amount || 0), 0) || 0
    const bankBalance = bankAccounts?.reduce((s, a) => s + (a.current_balance || 0), 0) || 0
    const vatDue = (totalIncome - totalExpenses) * 0.15

    return { totalIncome, totalExpenses, outstandingCust, outstandingSupp, bankBalance, vatDue: Math.max(vatDue, 0), profitLoss: totalIncome - totalExpenses, recentCount: recentCount || 0, recentTransactions: recentTransactions || [] }
  },

  async generateNumber(type) {
    const prefix = { income: 'INC', expense: 'EXP', journal: 'JNL', transfer: 'TRF', deposit: 'DEP', withdrawal: 'WTH', payment: 'PAY', receipt: 'RCT' }
    const p = prefix[type] || 'TRX'
    const yr = new Date().getFullYear()
    const { count } = await supabase.from('bookkeeping_transactions').select('*', { count: 'exact', head: true }).like('transaction_number', `${p}-${yr}-%`)
    return `${p}-${yr}-${String((count || 0) + 1).padStart(6, '0')}`
  }
}
