import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFinanceStore from '../store/financeStore'
import useThemeStore from '../../../store/themeStore'
import { 
  Landmark, DollarSign, TrendingUp, TrendingDown, 
  CheckCircle2, Clock, AlertCircle, FileText, 
  Sparkles, Sun, Moon, ChevronRight, ArrowLeft,
  Users, ShoppingCart, Send, Receipt, BarChart3
} from 'lucide-react'

export default function FinanceDashboard() {
  const { stats, fetchFinanceStats, pendingApprovals, fetchPendingApprovals, fetchPendingVendors, pendingVendors, approveRequest, rejectRequest } = useFinanceStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchFinanceStats()
    fetchPendingApprovals()
    fetchPendingVendors()
  }, [])

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const handleApprove = async (approvalId) => {
    const result = await approveRequest(approvalId)
    if (result.success) {
      // Show success via the re-render
    }
  }

  const handleReject = async (approvalId) => {
    const reason = prompt('Rejection reason (optional):')
    await rejectRequest(approvalId, null, reason)
  }

  const statCards = [
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
          <p className="text-slate-500 dark:text-slate-400 ml-11">Approvals, budgets, ledger, payables & receivables</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="neu-raised rounded-2xl p-4 stat-card">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* PENDING APPROVALS - MAIN SECTION */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="neu-raised rounded-3xl p-6 mb-8 border-2 border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-amber-600" />
              Pending Approvals
              {stats.pendingApprovals > 0 && (
                <span className="px-2 py-1 rounded-full text-xs bg-amber-600 text-white">{stats.pendingApprovals}</span>
              )}
            </h2>
            <Link to="/finance/approvals" className="text-sm text-emerald-600 flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link>
          </div>

          {/* Vendor Approvals */}
          {pendingVendors.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> Vendor Approvals ({pendingVendors.length})
              </h3>
              <div className="space-y-3">
                {pendingVendors.map(vendor => (
                  <div key={vendor.id} className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{vendor.company_name}</p>
                      <p className="text-xs text-slate-500">{vendor.vendor_code} · {vendor.email} · {vendor.city}</p>
                      <p className="text-xs text-slate-400 mt-1">Category: {vendor.vendor_category?.replace('_', ' ')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(vendor.id)} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-sm flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => handleReject(vendor.id)} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm">
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Approvals */}
          {pendingApprovals.filter(a => a.approval_type !== 'vendor').length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-500 mb-3">Other Approvals</h3>
              <div className="space-y-2">
                {pendingApprovals.filter(a => a.approval_type !== 'vendor').map(approval => (
                  <div key={approval.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10">
                    <div>
                      <p className="font-medium text-sm">{approval.reference_name || approval.reference_number}</p>
                      <p className="text-xs text-slate-500 capitalize">{approval.approval_type} · Requested {new Date(approval.requested_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(approval.id)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs">Approve</button>
                      <button onClick={() => handleReject(approval.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingVendors.length === 0 && pendingApprovals.filter(a => a.approval_type !== 'vendor').length === 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <p className="text-slate-500">No pending approvals! 🎉</p>
            </div>
          )}
        </motion.div>

        {/* Quick Links */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { label: 'Approvals', icon: CheckCircle2, path: '/finance/approvals' },
            { label: 'Payables', icon: TrendingDown, path: '/finance/payables' },
            { label: 'Receivables', icon: TrendingUp, path: '/finance/receivables' },
            { label: 'Budgets', icon: DollarSign, path: '/finance/budgets' },
            { label: 'Ledger', icon: FileText, path: '/finance/ledger' },
            { label: 'Payments', icon: Receipt, path: '/finance/payments' },
            { label: 'Procurement', icon: ShoppingCart, path: '/procurement' },
            { label: 'Reports', icon: BarChart3, path: '/finance/reports' },
          ].map(action => (
            <button key={action.label} onClick={() => navigate(action.path)} className="neu-raised neu-btn rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-105">
              <action.icon className="w-6 h-6 text-emerald-600" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
            </button>
          ))}
        </motion.div>
      </main>
    </div>
  )
}
