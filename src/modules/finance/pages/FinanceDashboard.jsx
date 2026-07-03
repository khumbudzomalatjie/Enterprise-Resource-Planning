import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFinanceStore from '../store/financeStore'
import useThemeStore from '../../../store/themeStore'
import { 
  Landmark, DollarSign, TrendingUp, TrendingDown, 
  AlertCircle, FileText, 
  Sparkles, Sun, Moon, ArrowLeft,
  ShoppingCart, Receipt, BarChart3,
  Briefcase, Building2, CheckCircle2, FileInvoice
} from 'lucide-react'

export default function FinanceDashboard() {
  const { stats, fetchFinanceStats } = useFinanceStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchFinanceStats()
  }, [])

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const statCards = [
    { icon: Briefcase, label: 'Completed Jobs', value: stats.completedJobs || 0, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: FileInvoice, label: 'Ready to Bill', value: stats.unbilledJobs || 0, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { icon: AlertCircle, label: 'Pending Approvals', value: stats.pendingApprovals || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { icon: TrendingUp, label: 'Receivables', value: formatCurrency(stats.totalReceivables), color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: TrendingDown, label: 'Payables', value: formatCurrency(stats.totalPayables), color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { icon: DollarSign, label: 'Budget Used', value: `${stats.budgetUtilization || 0}%`, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: Landmark, label: 'Total Budget', value: formatCurrency(stats.totalBudget), color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: Receipt, label: 'Monthly Payments', value: formatCurrency(stats.monthlyPayments), color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  ]

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
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Main Dashboard</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Landmark className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Finance & Accounting</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-11">Budgets, ledger, payables, receivables, vendor management & invoice generation</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="neu-raised rounded-2xl p-4 stat-card">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ✅ NEW: Completed Jobs Ready for Invoicing */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="neu-raised rounded-3xl p-6 mb-8 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-600" />Completed Jobs Ready for Invoicing
            </h2>
            <button onClick={() => navigate('/finance/jobs')} className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div onClick={() => navigate('/finance/jobs')} className="neu-raised rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-transform text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-3xl font-bold text-emerald-600">{stats.completedJobs || 0}</p>
              <p className="text-sm text-slate-500 mt-1">Jobs Completed</p>
              <p className="text-xs text-slate-400 mt-1">From field operations</p>
            </div>
            <div onClick={() => navigate('/finance/jobs')} className="neu-raised rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-transform text-center">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-3">
                <FileInvoice className="w-8 h-8 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-orange-600">{stats.unbilledJobs || 0}</p>
              <p className="text-sm text-slate-500 mt-1">Ready to Bill</p>
              <p className="text-xs text-slate-400 mt-1">Generate invoices now</p>
            </div>
          </div>
          {stats.unbilledJobs > 0 && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl text-center">
              <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">
                ⚡ {stats.unbilledJobs} job{stats.unbilledJobs > 1 ? 's' : ''} waiting to be invoiced. 
                <button onClick={() => navigate('/finance/jobs')} className="text-amber-600 hover:text-amber-700 underline ml-1 font-bold">
                  Generate Now →
                </button>
              </p>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Jobs → Invoice', icon: Briefcase, path: '/finance/jobs', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
              { label: 'Vendor Approvals', icon: Building2, path: '/finance/approvals', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
              { label: 'Payables', icon: TrendingDown, path: '/finance/payables', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
              { label: 'Receivables', icon: TrendingUp, path: '/finance/receivables', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
              { label: 'Budgets', icon: DollarSign, path: '/finance/budgets', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
              { label: 'Ledger', icon: FileText, path: '/finance/ledger', color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
              { label: 'Payments', icon: Receipt, path: '/finance/payments', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
              { label: 'Procurement', icon: ShoppingCart, path: '/procurement', color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' },
            ].map(action => (
              <button key={action.label} onClick={() => navigate(action.path)} 
                className="neu-raised neu-btn rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-105 transition-transform">
                <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center`}>
                  <action.icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Budget Overview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="neu-raised rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />Budget Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
              <p className="text-sm text-slate-500">Total Budget</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(stats.totalBudget)}</p>
            </div>
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
              <p className="text-sm text-slate-500">Total Spent</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.totalSpent)}</p>
            </div>
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
              <p className="text-sm text-slate-500">Remaining</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency((stats.totalBudget || 0) - (stats.totalSpent || 0))}</p>
            </div>
          </div>
          <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(stats.budgetUtilization || 0, 100)}%` }}></div>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">{stats.budgetUtilization || 0}% of budget utilized</p>
        </motion.div>
      </main>
    </div>
  )
}
