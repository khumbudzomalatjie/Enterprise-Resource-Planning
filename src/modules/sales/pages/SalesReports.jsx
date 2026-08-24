import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import { 
  BarChart3, TrendingUp, DollarSign, Receipt, 
  FileText, ChevronRight, Sun, Moon, Sparkles, 
  ArrowLeft, RefreshCw, Clock, CheckCircle2
} from 'lucide-react'

export default function SalesReports() {
  const { isDark, toggleTheme } = useThemeStore()
  const [stats, setStats] = useState({
    totalQuotations: 0,
    acceptedQuotations: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    totalRevenue: 0,
    outstandingRevenue: 0,
    monthlyQuotations: [],
    monthlyRevenue: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setLoading(true)
    try {
      // Get quotation stats
      const { count: totalQuotations } = await supabase.from('quotations').select('*', { count: 'exact', head: true })
      const { count: acceptedQuotations } = await supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('status', 'accepted')

      // Get invoice stats
      const { data: allInvoices } = await supabase.from('invoices').select('*')
      const totalInvoices = allInvoices?.length || 0
      const paidInvoices = allInvoices?.filter(i => i.status === 'paid').length || 0
      const totalRevenue = allInvoices?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0
      const outstandingRevenue = allInvoices?.filter(i => i.status !== 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0

      // Get recent quotations
      const { data: recentQuotations } = await supabase
        .from('quotations')
        .select('quotation_number, client_name, total_amount, status, quotation_date')
        .order('created_at', { ascending: false })
        .limit(10)

      setStats({
        totalQuotations: totalQuotations || 0,
        acceptedQuotations: acceptedQuotations || 0,
        totalInvoices,
        paidInvoices,
        totalRevenue,
        outstandingRevenue,
        recentQuotations: recentQuotations || []
      })
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const conversionRate = stats.totalQuotations > 0 
    ? Math.round((stats.acceptedQuotations / stats.totalQuotations) * 100) 
    : 0

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/sales" className="text-slate-500 hover:text-emerald-600">Sales</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Reports</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-emerald-600" />Sales Reports
            </h1>
            <p className="text-slate-500 mt-1">Performance analytics and insights</p>
          </div>
          <button onClick={loadReports} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </motion.div>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="neu-raised rounded-2xl p-6 text-center">
                <FileText className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.totalQuotations}</p>
                <p className="text-sm text-slate-500">Total Quotations</p>
              </div>
              <div className="neu-raised rounded-2xl p-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
                <p className="text-3xl font-bold text-emerald-600">{conversionRate}%</p>
                <p className="text-sm text-slate-500">Conversion Rate</p>
              </div>
              <div className="neu-raised rounded-2xl p-6 text-center">
                <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <p className="text-3xl font-bold text-slate-800 dark:text-white">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-sm text-slate-500">Total Revenue</p>
              </div>
              <div className="neu-raised rounded-2xl p-6 text-center">
                <Clock className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                <p className="text-3xl font-bold text-red-600">{formatCurrency(stats.outstandingRevenue)}</p>
                <p className="text-sm text-slate-500">Outstanding</p>
              </div>
            </div>

            {/* More Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="neu-raised rounded-2xl p-4">
                <p className="text-xs text-slate-500">Accepted Quotations</p>
                <p className="text-xl font-bold text-emerald-600">{stats.acceptedQuotations}</p>
              </div>
              <div className="neu-raised rounded-2xl p-4">
                <p className="text-xs text-slate-500">Total Invoices</p>
                <p className="text-xl font-bold text-blue-600">{stats.totalInvoices}</p>
              </div>
              <div className="neu-raised rounded-2xl p-4">
                <p className="text-xs text-slate-500">Paid Invoices</p>
                <p className="text-xl font-bold text-emerald-600">{stats.paidInvoices}</p>
              </div>
            </div>

            {/* Recent Quotations */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Recent Quotations</h2>
              {stats.recentQuotations?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-3 text-slate-500">Quote #</th>
                        <th className="text-left py-2 px-3 text-slate-500">Client</th>
                        <th className="text-left py-2 px-3 text-slate-500">Date</th>
                        <th className="text-right py-2 px-3 text-slate-500">Amount</th>
                        <th className="text-center py-2 px-3 text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentQuotations.map(q => (
                        <tr key={q.quotation_number} className="border-b border-slate-100 dark:border-slate-700/50">
                          <td className="py-2 px-3 font-mono text-xs">{q.quotation_number}</td>
                          <td className="py-2 px-3">{q.client_name || 'N/A'}</td>
                          <td className="py-2 px-3 text-xs">{formatDate(q.quotation_date)}</td>
                          <td className="py-2 px-3 text-right font-semibold">{formatCurrency(q.total_amount)}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${q.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : q.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                              {q.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">No quotations yet</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
