import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { Landmark, Download, Calendar, ArrowLeft, Sun, Moon, Sparkles, TrendingUp, TrendingDown } from 'lucide-react'

export default function FinancialReports() {
  const { isDark, toggleTheme } = useThemeStore()
  const [dateFrom, setDateFrom] = useState(new Date().getFullYear() + '-01-01')
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const loadReport = async () => {
    setLoading(true)
    try {
      const { data: invoices } = await supabase.from('invoices').select('*').gte('invoice_date', dateFrom).lte('invoice_date', dateTo)
      const { data: payments } = await supabase.from('payments').select('*').gte('payment_date', dateFrom).lte('payment_date', dateTo)
      const { data: expenses } = await supabase.from('vehicle_expenses').select('*').gte('expense_date', dateFrom).lte('expense_date', dateTo)

      const totalRevenue = invoices?.reduce((s, i) => s + (i.total_amount || 0), 0) || 0
      const totalPayments = payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0
      const totalExpenses = expenses?.reduce((s, e) => s + (e.amount || 0), 0) || 0
      const outstanding = invoices?.filter(i => i.status !== 'paid').reduce((s, i) => s + ((i.total_amount || 0) - (i.amount_paid || 0)), 0) || 0

      const monthlyData = {}
      invoices?.forEach(inv => {
        const m = inv.invoice_date?.substring(0, 7)
        if (!monthlyData[m]) monthlyData[m] = { revenue: 0, expenses: 0 }
        monthlyData[m].revenue += (inv.total_amount || 0)
      })
      expenses?.forEach(exp => {
        const m = exp.expense_date?.substring(0, 7)
        if (!monthlyData[m]) monthlyData[m] = { revenue: 0, expenses: 0 }
        monthlyData[m].expenses += (exp.amount || 0)
      })

      setReport({
        totalRevenue, totalPayments, totalExpenses, outstanding,
        netProfit: totalRevenue - totalExpenses,
        monthlyData: Object.entries(monthlyData).map(([month, data]) => ({ month, ...data })),
        invoiceCount: invoices?.length || 0,
        paymentCount: payments?.length || 0
      })
    } catch (error) { toast.error('Failed to load report') }
    setLoading(false)
  }

  useEffect(() => { loadReport() }, [])

  const handleExportCSV = () => {
    if (!report) return
    const csv = 'Month,Revenue,Expenses,Profit\n' + report.monthlyData.map(m => `${m.month},${m.revenue},${m.expenses},${m.revenue - m.expenses}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'Financial_Report.csv'; a.click()
    toast.success('Report downloaded!')
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/reports" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Reports</span>
        </Link>

        <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-8">
          <Landmark className="w-8 h-8 text-purple-600" />Financial Report
        </h1>

        <div className="neu-raised rounded-2xl p-4 mb-6 flex items-center gap-4 flex-wrap">
          <Calendar className="w-5 h-5 text-purple-600" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="p-2 neu-inset rounded-lg text-sm" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="p-2 neu-inset rounded-lg text-sm" />
          <button onClick={loadReport} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm">Generate</button>
          {report && <button onClick={handleExportCSV} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm flex items-center gap-1"><Download className="w-4 h-4" /> CSV</button>}
        </div>

        {loading && <div className="text-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div></div>}

        {report && !loading && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Revenue', value: formatCurrency(report.totalRevenue), color: 'text-emerald-600' },
                { label: 'Expenses', value: formatCurrency(report.totalExpenses), color: 'text-red-600' },
                { label: 'Net Profit', value: formatCurrency(report.netProfit), color: 'text-blue-600' },
                { label: 'Outstanding', value: formatCurrency(report.outstanding), color: 'text-amber-600' },
                { label: 'Payments', value: formatCurrency(report.totalPayments), color: 'text-green-600' },
                { label: 'Invoices', value: report.invoiceCount, color: 'text-purple-600' },
              ].map(s => (
                <div key={s.label} className="neu-raised rounded-2xl p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-xl font-semibold mb-4">Monthly Revenue vs Expenses</h2>
              <div className="flex items-end gap-2 h-[200px]">
                {report.monthlyData.map((m, i) => {
                  const maxVal = Math.max(...report.monthlyData.map(x => Math.max(x.revenue, x.expenses)), 1)
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex gap-1">
                        <div className="w-4 bg-emerald-500 rounded-t-sm" style={{ height: `${(m.revenue/maxVal)*180}px` }}></div>
                        <div className="w-4 bg-red-500 rounded-t-sm" style={{ height: `${(m.expenses/maxVal)*180}px` }}></div>
                      </div>
                      <span className="text-[10px] text-slate-400">{m.month?.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <span className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded"></span>Revenue</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 rounded"></span>Expenses</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
