import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useSalesStore from '../store/salesStore'
import useThemeStore from '../../../store/themeStore'
import { 
  TrendingUp, FileText, Receipt, DollarSign, 
  Clock, CheckCircle2, XCircle, Plus, Briefcase,
  Sparkles, Sun, Moon, ChevronRight, ArrowLeft,
  BarChart3
} from 'lucide-react'

export default function SalesDashboard() {
  const { stats, fetchSalesStats, fetchQuotations, loading } = useSalesStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await fetchSalesStats()
    await fetchQuotations()
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  const statCards = [
    { icon: FileText, label: 'Total Quotations', value: stats.totalQuotations || 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: Clock, label: 'Pending', value: stats.pendingQuotations || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { icon: Receipt, label: 'Total Invoices', value: stats.totalInvoices || 0, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: XCircle, label: 'Unpaid Invoices', value: stats.unpaidInvoices || 0, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { icon: DollarSign, label: 'Monthly Sales', value: formatCurrency(stats.monthlyTotal), color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  ]

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">Enterprise Resource Planning</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Main Dashboard</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Sales & Quotations</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">Create quotations, manage invoices, track payments</p>
          </div>
          <div className="flex gap-3">
            {/* ✅ NEW: Link to Tenders */}
            <button onClick={() => navigate('/tenders')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
              <Briefcase className="w-5 h-5" /><span>Tenders & RFQs</span>
            </button>
            <button onClick={() => navigate('/sales/quotations/new')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-5 h-5" /><span>New Quotation</span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="neu-raised rounded-2xl p-4 stat-card">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600" />Recent Quotations</h2>
              <Link to="/sales/quotations" className="text-sm text-emerald-600 flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link>
            </div>
            <div className="space-y-3">
              {stats.recentQuotations?.map(q => (
                <div key={q.id} className="flex justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => navigate(`/sales/quotations/${q.id}`)}>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white text-sm">{q.clients?.company_name || q.client_name}</p>
                    <p className="text-xs text-slate-500">{q.quotation_number}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${q.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : q.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{q.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2"><Receipt className="w-5 h-5 text-purple-600" />Quick Actions</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'New Quotation', icon: Plus, path: '/sales/quotations/new' },
                { label: 'View Invoices', icon: Receipt, path: '/sales/invoices' },
                { label: 'Tenders & RFQs', icon: Briefcase, path: '/tenders' }, // ✅ NEW ACTION
                { label: 'Record Payment', icon: DollarSign, path: '/sales/payments' },
              ].map(action => (
                <button key={action.label} onClick={() => navigate(action.path)} className="neu-raised neu-btn rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-105">
                  <action.icon className="w-6 h-6 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
