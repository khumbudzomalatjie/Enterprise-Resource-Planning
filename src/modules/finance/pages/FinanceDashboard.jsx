import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFinanceStore from '../store/financeStore'
import useThemeStore from '../../../store/themeStore'
import { 
  Landmark, DollarSign, TrendingUp, TrendingDown, 
  FileText, Receipt, BarChart3, ShoppingCart,
  Sparkles, Sun, Moon, ChevronRight, ArrowLeft,
  CheckCircle2, AlertCircle
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
    { icon: TrendingUp, label: 'Receivables', value: formatCurrency(stats.totalReceivables), color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', path: '/finance/receivables' },
    { icon: TrendingDown, label: 'Payables', value: formatCurrency(stats.totalPayables), color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', path: '/finance/payables' },
    { icon: DollarSign, label: 'Budget Used', value: `${stats.budgetUtilization || 0}%`, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', path: '/finance/budgets' },
    { icon: Landmark, label: 'Total Budget', value: formatCurrency(stats.totalBudget), color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', path: '/finance/budgets' },
    { icon: Receipt, label: 'Monthly Payments', value: formatCurrency(stats.monthlyPayments), color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', path: '/finance/payments' },
    { icon: AlertCircle, label: 'Pending Approvals', value: stats.pendingApprovals || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', path: '/procurement/vendors' },
  ]

  const navigationCards = [
    { title: 'Vendor Approvals', desc: 'Approve or reject pending vendors from Procurement', icon: ShoppingCart, path: '/procurement/vendors', color: 'from-amber-500 to-orange-600' },
    { title: 'Accounts Payable', desc: 'Manage bills, vendor payments, and outstanding payables', icon: TrendingDown, path: '/finance/payables', color: 'from-red-500 to-pink-600' },
    { title: 'Accounts Receivable', desc: 'Track client invoices and payments received', icon: TrendingUp, path: '/finance/receivables', color: 'from-blue-500 to-cyan-600' },
    { title: 'Budget Management', desc: 'Create and manage departmental budgets', icon: DollarSign, path: '/finance/budgets', color: 'from-purple-500 to-violet-600' },
    { title: 'General Ledger', desc: 'View all financial transactions and journal entries', icon: FileText, path: '/finance/ledger', color: 'from-emerald-500 to-teal-600' },
    { title: 'Payment Records', desc: 'Record and track all payments made and received', icon: Receipt, path: '/finance/payments', color: 'from-indigo-500 to-blue-600' },
  ]

  const quickLinks = [
    { label: 'Procurement', icon: ShoppingCart, path: '/procurement' },
    { label: 'Reports', icon: BarChart3, path: '/finance/reports' },
    { label: 'Sales', icon: TrendingUp, path: '/sales' },
    { label: 'Payroll', icon: DollarSign, path: '/payroll' },
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
          <p className="text-slate-500 dark:text-slate-400 ml-11">Accounts payable, receivable, budgets, ledger, and payments</p>
        </motion.div>

        {/* Stats - Clickable */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div 
              key={stat.label} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => stat.path && navigate(stat.path)}
              className={`neu-raised rounded-2xl p-4 stat-card ${stat.path ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {navigationCards.map((card, i) => (
            <motion.div 
              key={card.title} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 + i * 0.05 }}
              onClick={() => navigate(card.path)}
              className="neu-raised rounded-3xl p-6 cursor-pointer hover:scale-[1.02] transition-all"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-lg`}>
                <card.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{card.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{card.desc}</p>
              <div className="flex items-center gap-1 mt-3 text-emerald-600 text-sm font-medium">
                <span>Open</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Links */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5 }} 
          className="neu-raised rounded-3xl p-6"
        >
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Quick Links</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map(action => (
              <button 
                key={action.label} 
                onClick={() => navigate(action.path)} 
                className="neu-raised neu-btn rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-105 transition-transform"
              >
                <action.icon className="w-6 h-6 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
