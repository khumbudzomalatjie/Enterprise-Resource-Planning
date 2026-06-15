import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  TrendingUp, DollarSign, FileText, Download, Calendar,
  ArrowLeft, Sun, Moon, Sparkles, BarChart3, Users
} from 'lucide-react'

export default function SalesReports() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [dateFrom, setDateFrom] = useState(new Date().getFullYear() + '-01-01')
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const loadReport = async () => {
    setLoading(true)
    try {
      // Invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*, clients(company_name)')
        .gte('invoice_date', dateFrom)
        .lte('invoice_date', dateTo)
        .order('invoice_date', { ascending: false })

      // Quotations
      const { data: quotations } = await supabase
        .from('quotations')
        .select('*')
        .gte('quotation_date', dateFrom)
        .lte('quotation_date', dateTo)

      // Client count
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })

      const totalInvoiced = invoices?.reduce((s, i) => s + (i.total_amount || 0), 0) || 0
      const totalQuoted = quotations?.reduce((s, q) => s + (q.total_amount || 0), 0) || 0
      const paidInvoices = invoices?.filter(i => i.status === 'paid').length || 0
      const pendingInvoices = invoices?.filter(i => i.status === 'sent' || i.status === 'overdue').length || 0

      // Monthly breakdown
      const monthlySales = {}
      invoices?.forEach(inv => {
        const month = inv.invoice_date?.substring(0, 7)
        if (!monthlySales[month]) monthlySales[month] = { revenue: 0, count: 0 }
        monthlySales[month].revenue += (inv.total_amount || 0)
        monthlySales[month].count += 1
      })

      setReport({
        totalInvoiced,
        totalQuoted,
        invoiceCount: invoices?.length || 0,
        quotationCount: quotations?.length || 0,
        clientCount: clientCount || 0,
        paidInvoices,
        pendingInvoices,
        conversionRate: quotations?.length > 0 ? Math.round((invoices?.length / quotations?.length) * 100) : 0,
        monthlySales: Object.entries(monthlySales).map(([month, data]) => ({ month, ...data })),
        recentInvoices: invoices?.slice(0, 10) || []
      })
    } catch (error) {
      toast.error('Failed to load report')
    }
    setLoading(false)
  }

  useEffect(() => { loadReport() }, [])

  const handleExportCSV = () => {
    if (!report) return
    const csv = 'Month,Revenue,Invoices\n' + report.monthlySales.map(m => `${m.month},${m.revenue},${m.count}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'Sales_Report.csv'; a.click()
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />Sales Report
          </h1>
        </motion.div>

        <div className="neu-raised rounded-2xl p-4 mb-6 flex items-center gap-4 flex-wrap">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span className="text-sm">From:</span><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="p-2 neu-inset rounded-lg text-sm" />
          <span className="text-sm">To:</span><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="p-2 neu-inset rounded-lg text-sm" />
          <button onClick={loadReport} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">Generate</button>
          {report && <button onClick={handleExportCSV} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm flex items-center gap-1"><Download className="w-4 h-4" /> CSV</button>}
        </div>

        {loading && <div className="text-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div></div>}

        {report && !loading && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Invoiced', value: formatCurrency(report.totalInvoiced), color: 'text-emerald-600' },
                { label: 'Total Quoted', value: formatCurrency(report.totalQuoted), color: 'text-blue-600' },
                { label: 'Invoices', value: report.invoiceCount, color: 'text-purple-600' },
                { label: 'Clients', value: report.clientCount, color: 'text-amber-600' },
                { label: 'Paid', value: report.paidInvoices, color: 'text-green-600' },
                { label: 'Pending', value: report.pendingInvoices, color: 'text-red-600' },
                { label: 'Conversion Rate', value: `${report.conversionRate}%`, color: 'text-indigo-600' },
              ].map(s => (
                <div key={s.label} className="neu-raised rounded-2xl p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="neu-raised rounded-3xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Monthly Revenue</h2>
              <div className="flex items-end gap-2 h-[150px]">
                {report.monthlySales.map((m, i) => {
                  const maxVal = Math.max(...report.monthlySales.map(s => s.revenue), 1)
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-slate-500">{formatCurrency(m.revenue).replace('R ','')}</span>
                      <div className="w-full bg-blue-500 rounded-t-sm" style={{ height: `${(m.revenue / maxVal) * 120}px` }}></div>
                      <span className="text-[10px] text-slate-400">{m.month?.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Invoices</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-slate-50"><th className="text-left py-2 px-3">Invoice #</th><th className="text-left py-2 px-3">Client</th><th className="text-left py-2 px-3">Date</th><th className="text-right py-2 px-3">Amount</th><th className="text-center py-2 px-3">Status</th></tr></thead>
                  <tbody>{report.recentInvoices.map(inv => (
                    <tr key={inv.id} className="border-b"><td className="py-2 px-3 font-mono text-xs">{inv.invoice_number}</td><td className="py-2 px-3">{inv.clients?.company_name || 'N/A'}</td><td className="py-2 px-3 text-xs">{inv.invoice_date}</td><td className="py-2 px-3 text-right">{formatCurrency(inv.total_amount)}</td><td className="py-2 px-3 text-center"><span className={`px-2 py-1 rounded-full text-xs ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span></td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
