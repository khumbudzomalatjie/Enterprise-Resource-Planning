import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useBookkeepingStore from '../store/bookkeepingStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  DollarSign, TrendingUp, TrendingDown, CreditCard, 
  Banknote, FileText, Receipt, Upload, Download,
  Sun, Moon, Sparkles, ChevronRight, ArrowLeft,
  Plus, BarChart3, PieChart, Target, Clock,
  BookOpen, Calculator, Building2, ShoppingCart,
  Briefcase, Landmark
} from 'lucide-react'

export default function BookkeepingDashboard() {
  const { stats, fetchStats } = useBookkeepingStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => { fetchStats() }, [])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  const topCards = [
    { icon: Banknote, label: 'Bank Balance', value: formatCurrency(stats.bankBalance), color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: TrendingUp, label: 'Monthly Income', value: formatCurrency(stats.totalIncome), color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: TrendingDown, label: 'Monthly Expenses', value: formatCurrency(stats.totalExpenses), color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { icon: DollarSign, label: 'Profit/Loss', value: formatCurrency(stats.profitLoss), color: stats.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600', bg: stats.profitLoss >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30' },
    { icon: CreditCard, label: 'Outstanding Customer', value: formatCurrency(stats.outstandingCust), color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { icon: Receipt, label: 'Outstanding Supplier', value: formatCurrency(stats.outstandingSupp), color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: FileText, label: 'VAT Due', value: formatCurrency(stats.vatDue), color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { icon: Target, label: 'Transactions', value: stats.recentCount || 0, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  ]

  // Quick actions that navigate to EXISTING modules
  const quickActions = [
    { label: 'New Income', icon: Plus, path: '/sales/invoices/new', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'New Expense', icon: Plus, path: '/procurement/po/new', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Accounts Payable', icon: TrendingDown, path: '/finance/payables', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { label: 'Accounts Receivable', icon: TrendingUp, path: '/finance/receivables', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'General Ledger', icon: FileText, path: '/finance/ledger', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Budgets', icon: DollarSign, path: '/finance/budgets', color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { label: 'Vendor Approvals', icon: Building2, path: '/finance/approvals', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Procurement', icon: ShoppingCart, path: '/procurement', color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' },
    { label: 'Jobs → Invoice', icon: Briefcase, path: '/finance/jobs', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { label: 'Payroll', icon: CreditCard, path: '/payroll', color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
    { label: 'Sales', icon: TrendingUp, path: '/sales', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Reports', icon: BarChart3, path: '/reports', color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  ]

  const handleComingSoon = (feature) => {
    toast.success(`${feature} module coming soon!`, { icon: '🚧', duration: 3000 })
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
        {/* Breadcrumb */}
        <Link to="/finance" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Finance</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Bookkeeping</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">Financial overview, transactions & quick access to all finance modules</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => navigate('/sales/invoices/new')} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-5 h-5" /><span>New Invoice</span>
            </button>
            <button onClick={() => navigate('/procurement/po/new')} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-red-600 text-white hover:bg-red-700 flex items-center gap-2">
              <Plus className="w-5 h-5" /><span>New Purchase</span>
            </button>
            <button onClick={() => handleComingSoon('Excel Import')} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2">
              <Upload className="w-5 h-5" /><span>Import Excel</span>
            </button>
          </div>
        </motion.div>

        {/* Top Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {topCards.map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className="neu-raised rounded-2xl p-4 stat-card">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-white truncate">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions - ALL POINT TO WORKING MODULES */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
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

        {/* Recent Transactions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="neu-raised rounded-3xl p-6">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />Recent Activity
            </h2>
            <Link to="/finance/ledger" className="text-sm text-emerald-600 flex items-center gap-1">View Ledger <ChevronRight className="w-4 h-4" /></Link>
          </div>
          
          {/* Recent Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-3 text-slate-500">Number</th>
                  <th className="text-left py-3 px-3 text-slate-500">Date</th>
                  <th className="text-left py-3 px-3 text-slate-500">Description</th>
                  <th className="text-left py-3 px-3 text-slate-500">Account</th>
                  <th className="text-right py-3 px-3 text-slate-500">Amount</th>
                  <th className="text-center py-3 px-3 text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recentTransactions || []).length > 0 ? (
                  (stats.recentTransactions || []).map(tx => (
                    <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-3 font-medium">{tx.transaction_number}</td>
                      <td className="py-3 px-3 text-xs">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                      <td className="py-3 px-3">{tx.description?.substring(0, 40)}</td>
                      <td className="py-3 px-3 text-xs">{tx.chart_of_accounts?.account_name || 'N/A'}</td>
                      <td className={`py-3 px-3 text-right font-semibold ${tx.transaction_type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.total_amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${tx.status === 'posted' ? 'bg-emerald-100 text-emerald-700' : tx.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{tx.status}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      <p className="text-lg mb-2">No transactions yet</p>
                      <p className="text-sm">Create invoices in <Link to="/sales" className="text-emerald-600 hover:underline">Sales</Link> or purchase orders in <Link to="/procurement" className="text-emerald-600 hover:underline">Procurement</Link></p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Finance Module Links */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/finance/payables" className="neu-raised rounded-2xl p-5 hover:scale-[1.02] transition-transform text-center">
            <TrendingDown className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 dark:text-white">Accounts Payable</p>
            <p className="text-xs text-slate-500">Supplier invoices & payments</p>
          </Link>
          <Link to="/finance/receivables" className="neu-raised rounded-2xl p-5 hover:scale-[1.02] transition-transform text-center">
            <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 dark:text-white">Accounts Receivable</p>
            <p className="text-xs text-slate-500">Customer invoices & collections</p>
          </Link>
          <Link to="/finance/ledger" className="neu-raised rounded-2xl p-5 hover:scale-[1.02] transition-transform text-center">
            <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 dark:text-white">General Ledger</p>
            <p className="text-xs text-slate-500">All financial transactions</p>
          </Link>
          <Link to="/finance/budgets" className="neu-raised rounded-2xl p-5 hover:scale-[1.02] transition-transform text-center">
            <DollarSign className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 dark:text-white">Budgets</p>
            <p className="text-xs text-slate-500">Budget planning & tracking</p>
          </Link>
        </motion.div>
      </main>
    </div>
  )
}
