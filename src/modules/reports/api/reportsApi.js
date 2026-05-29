import { supabase } from '../../../lib/supabaseClient'

export const reportsApi = {
  // Get aggregate stats from all modules
  async getDashboardOverview(dateFrom, dateTo) {
    const [
      { count: totalClients },
      { count: activeJobs },
      { count: totalEmployees },
      { count: totalVehicles },
      { data: salesData },
      { data: expenses },
      { data: revenue }
    ] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active'),
      supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('invoices').select('total_amount').gte('invoice_date', dateFrom).lte('invoice_date', dateTo),
      supabase.from('vehicle_expenses').select('amount').gte('expense_date', dateFrom).lte('expense_date', dateTo),
      supabase.from('payments').select('amount').gte('payment_date', dateFrom).lte('payment_date', dateTo)
    ])

    const totalSales = salesData?.reduce((s, i) => s + (i.total_amount || 0), 0) || 0
    const totalExpenses = expenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0
    const totalRevenue = revenue?.reduce((s, p) => s + (p.amount || 0), 0) || 0

    return {
      totalClients: totalClients || 0,
      activeJobs: activeJobs || 0,
      totalEmployees: totalEmployees || 0,
      totalVehicles: totalVehicles || 0,
      totalSales,
      totalExpenses,
      totalRevenue,
      netProfit: totalRevenue - totalExpenses
    }
  },

  // Sales Reports
  async getSalesReport(dateFrom, dateTo) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*, clients(company_name)')
      .gte('invoice_date', dateFrom)
      .lte('invoice_date', dateTo)
      .order('invoice_date', { ascending: false })

    const { data: quotations } = await supabase
      .from('quotations')
      .select('*')
      .gte('quotation_date', dateFrom)
      .lte('quotation_date', dateTo)

    // Monthly breakdown
    const monthlySales = {}
    invoices?.forEach(inv => {
      const month = inv.invoice_date?.substring(0, 7)
      if (!monthlySales[month]) monthlySales[month] = { revenue: 0, count: 0 }
      monthlySales[month].revenue += (inv.total_amount || 0)
      monthlySales[month].count += 1
    })

    return {
      totalInvoiced: invoices?.reduce((s, i) => s + (i.total_amount || 0), 0) || 0,
      totalQuoted: quotations?.reduce((s, q) => s + (q.total_amount || 0), 0) || 0,
      invoiceCount: invoices?.length || 0,
      quotationCount: quotations?.length || 0,
      conversionRate: quotations?.length > 0 ? Math.round((invoices?.length / quotations?.length) * 100) : 0,
      monthlySales: Object.entries(monthlySales).map(([month, data]) => ({ month, ...data })),
      recentInvoices: invoices?.slice(0, 10) || []
    }
  },

  // Operations Reports
  async getOperationsReport(dateFrom, dateTo) {
    const { data: jobs } = await supabase
      .from('jobs')
      .select('*, job_categories(name), clients(company_name)')
      .gte('scheduled_date', dateFrom)
      .lte('scheduled_date', dateTo)
      .order('scheduled_date', { ascending: false })

    const statusCounts = {}
    const categoryCounts = {}
    jobs?.forEach(job => {
      statusCounts[job.status] = (statusCounts[job.status] || 0) + 1
      categoryCounts[job.job_categories?.name || 'Other'] = (categoryCounts[job.job_categories?.name || 'Other'] || 0) + 1
    })

    return {
      totalJobs: jobs?.length || 0,
      completedJobs: jobs?.filter(j => j.status === 'completed').length || 0,
      completionRate: jobs?.length > 0 ? Math.round((jobs.filter(j => j.status === 'completed').length / jobs.length) * 100) : 0,
      statusBreakdown: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      categoryBreakdown: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })),
      recentJobs: jobs?.slice(0, 10) || []
    }
  },

  // Financial Reports
  async getFinancialReport(dateFrom, dateTo) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .gte('invoice_date', dateFrom)
      .lte('invoice_date', dateTo)

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .gte('payment_date', dateFrom)
      .lte('payment_date', dateTo)

    const { data: expenses } = await supabase
      .from('vehicle_expenses')
      .select('*')
      .gte('expense_date', dateFrom)
      .lte('expense_date', dateTo)

    const { data: budgets } = await supabase
      .from('finance_budgets')
      .select('*')
      .eq('status', 'active')

    // Monthly breakdown
    const monthlyFinancials = {}
    invoices?.forEach(inv => {
      const month = inv.invoice_date?.substring(0, 7)
      if (!monthlyFinancials[month]) monthlyFinancials[month] = { revenue: 0, expenses: 0 }
      monthlyFinancials[month].revenue += (inv.total_amount || 0)
    })
    expenses?.forEach(exp => {
      const month = exp.expense_date?.substring(0, 7)
      if (!monthlyFinancials[month]) monthlyFinancials[month] = { revenue: 0, expenses: 0 }
      monthlyFinancials[month].expenses += (exp.amount || 0)
    })

    return {
      totalRevenue: invoices?.reduce((s, i) => s + (i.total_amount || 0), 0) || 0,
      totalPayments: payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0,
      totalExpenses: expenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0,
      outstandingAmount: invoices?.filter(i => i.status !== 'paid').reduce((s, i) => s + ((i.total_amount || 0) - (i.amount_paid || 0)), 0) || 0,
      totalBudget: budgets?.reduce((s, b) => s + (b.total_budget || 0), 0) || 0,
      budgetSpent: budgets?.reduce((s, b) => s + (b.spent_amount || 0), 0) || 0,
      monthlyFinancials: Object.entries(monthlyFinancials).map(([month, data]) => ({ month, ...data })),
      recentTransactions: payments?.slice(0, 10) || []
    }
  },

  // HR Reports
  async getHRReport() {
    const { data: employees } = await supabase
      .from('employees')
      .select('*')

    const { data: attendance } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('attendance_date', new Date().toISOString().split('T')[0])

    const departmentCounts = {}
    employees?.forEach(emp => {
      const dept = emp.department || 'Unassigned'
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1
    })

    return {
      totalEmployees: employees?.length || 0,
      activeEmployees: employees?.filter(e => e.employment_status === 'active').length || 0,
      onLeave: employees?.filter(e => e.employment_status === 'on_leave').length || 0,
      attendanceRate: employees?.length > 0 ? Math.round((attendance?.filter(a => a.status === 'present').length / employees.length) * 100) : 0,
      departmentBreakdown: Object.entries(departmentCounts).map(([department, count]) => ({ department, count })),
      recentHires: employees?.sort((a, b) => new Date(b.date_of_hire) - new Date(a.date_of_hire)).slice(0, 5) || []
    }
  },

  // Fleet Reports
  async getFleetReport(dateFrom, dateTo) {
    const { data: fuelRecords } = await supabase
      .from('fuel_records')
      .select('*, vehicles(name)')
      .gte('fuel_date', dateFrom)
      .lte('fuel_date', dateTo)

    const { data: expenses } = await supabase
      .from('vehicle_expenses')
      .select('*, vehicles(name)')
      .gte('expense_date', dateFrom)
      .lte('expense_date', dateTo)

    const totalFuelCost = fuelRecords?.reduce((s, f) => s + (f.amount || 0), 0) || 0
    const totalFuelLitres = fuelRecords?.reduce((s, f) => s + (f.quantity || 0), 0) || 0
    const totalMaintenance = expenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0

    // Cost per vehicle
    const vehicleCosts = {}
    expenses?.forEach(e => {
      const vname = e.vehicles?.name || 'Unknown'
      vehicleCosts[vname] = (vehicleCosts[vname] || 0) + (e.amount || 0)
    })

    return {
      totalFuelCost,
      totalFuelLitres,
      averageFuelPrice: totalFuelLitres > 0 ? totalFuelCost / totalFuelLitres : 0,
      fuelEfficiency: totalFuelLitres > 0 ? 'N/A' : 0,
      totalMaintenance,
      vehicleCostBreakdown: Object.entries(vehicleCosts).map(([vehicle, cost]) => ({ vehicle, cost })),
      recentFuelLogs: fuelRecords?.slice(0, 10) || []
    }
  },

  // KPI Targets
  async getKPITargets() {
    const { data, error } = await supabase
      .from('kpi_targets')
      .select('*')
      .order('category')
    return { data, error }
  },

  async updateKPI(id, updates) {
    const { data, error } = await supabase
      .from('kpi_targets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Saved Reports
  async getSavedReports() {
    const { data, error } = await supabase
      .from('saved_reports')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async saveReport(reportData) {
    const { data, error } = await supabase
      .from('saved_reports')
      .insert([reportData])
      .select()
      .single()
    return { data, error }
  },

  async deleteReport(id) {
    const { error } = await supabase
      .from('saved_reports')
      .delete()
      .eq('id', id)
    return { error }
  },

  // Export Report
  async exportReport(reportId, exportType) {
    const { data: report } = await supabase
      .from('saved_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (!report) return { error: 'Report not found' }

    // Generate export file
    let fileContent = ''
    let mimeType = ''
    let fileExt = ''

    if (exportType === 'csv') {
      // Convert report data to CSV
      fileContent = 'Report: ' + report.report_name + '\n'
      fileContent += 'Generated: ' + new Date().toISOString() + '\n\n'
      fileContent += JSON.stringify(report.report_config, null, 2)
      mimeType = 'text/csv'
      fileExt = 'csv'
    } else if (exportType === 'excel') {
      fileContent = JSON.stringify(report.report_config, null, 2)
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      fileExt = 'xlsx'
    } else {
      fileContent = JSON.stringify(report.report_config, null, 2)
      mimeType = 'application/pdf'
      fileExt = 'pdf'
    }

    // Create downloadable file
    const blob = new Blob([fileContent], { type: mimeType })
    const url = URL.createObjectURL(blob)

    return {
      success: true,
      url,
      filename: `${report.report_name.replace(/\s+/g, '_')}.${fileExt}`
    }
  }
}
