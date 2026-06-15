import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useReportsStore from '../store/reportsStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users,
  Briefcase, Truck, Target, Download, FileText, Calendar,
  Sparkles, Sun, Moon, ChevronRight, ArrowLeft,
  PieChart, Activity, Clock, CheckCircle2
} from 'lucide-react'

export default function ReportsDashboard() {
  const { overview, salesReport, operationsReport, kpiTargets, fetchOverview, fetchSalesReport, fetchOperationsReport, fetchKPITargets, loading } = useReportsStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [dateFrom, setDateFrom] = useState(new Date().getFullYear() + '-01-01')
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo])

  const loadData = async () => {
    await fetchOverview(dateFrom, dateTo)
    await fetchSalesReport(dateFrom, dateTo)
    await fetchOperationsReport(dateFrom, dateTo)
    await fetchKPITargets()
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const statCards = [
    { icon: DollarSign, label: 'Total Revenue', value: formatCurrency(overview.totalRevenue), color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', trend: '+12%', trendUp: true },
    { icon: TrendingDown, label: 'Total Expenses', value: formatCurrency(overview.totalExpenses), color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', trend: '+5%', trendUp: true },
    { icon: TrendingUp, label: 'Net Profit', value: formatCurrency(overview.netProfit), color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', trend: '+18%', trendUp: true },
    { icon: Users, label: 'Active Employees', value: overview.totalEmployees || 0, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: Briefcase, label: 'Active Jobs', value: overview.activeJobs || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { icon: Truck, label: 'Active Vehicles', value: overview.totalVehicles || 0, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
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

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Reporting & Analytics</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-11">Comprehensive dashboards, KPIs, and exportable reports</p>
        </motion.div>

        {/* Date Range */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex items-center gap-4 flex-wrap">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <span className="text-sm text-slate-500">From:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="p-2 neu-inset rounded-lg text-sm" />
          <span className="text-sm text-slate-500">To:</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="p-2 neu-inset rounded-lg text-sm" />
          <button onClick={loadData} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm">Refresh</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="neu-raised rounded-2xl p-4 stat-card">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-slate-500">{stat.label}</p>
                {stat.trend && <span className={`text-xs ${stat.trendUp ? 'text-emerald-600' : 'text-red-600'}`}>{stat.trend}</span>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* KPI Targets */}
        {kpiTargets && kpiTargets.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="neu-raised rounded-3xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-emerald-600" />KPI Targets</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpiTargets.slice(0, 8).map(kpi => {
                const pct = kpi.target_value > 0 ? Math.round((kpi.current_value / kpi.target_value) * 100) : 0
                return (
                  <div key={kpi.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                    <p className="text-xs text-slate-500 mb-1">{kpi.kpi_name}</p>
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-lg font-bold text-slate-800 dark:text-white">{kpi.current_value || 0}</span>
                      <span className="text-xs text-slate-400">/ {kpi.target_value} {kpi.unit}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{pct}% of target</p>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Sales & Operations Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Chart */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="neu-raised rounded-3xl p-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-600" />Monthly Revenue</h2>
            {salesReport?.monthlySales && salesReport.monthlySales.length > 0 ? (
              <div className="flex items-end gap-2 h-[150px]">
                {salesReport.monthlySales.map((m, i) => {
                  const maxVal = Math.max(...(salesReport.monthlySales?.map(s => s.revenue) || [1]), 1)
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-slate-500">{formatCurrency(m.revenue).replace('R ','')}</span>
                      <div className="w-full bg-emerald-500 rounded-t-sm" style={{ height: `${(m.revenue / maxVal) * 120}px` }}></div>
                      <span className="text-[10px] text-slate-400">{m.month?.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">No sales data for this period</div>
            )}
          </motion.div>

          {/* Operations Chart */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="neu-raised rounded-3xl p-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-emerald-600" />Jobs by Category</h2>
            {operationsReport?.categoryBreakdown && operationsReport.categoryBreakdown.length > 0 ? (
              <div className="space-y-3">
                {operationsReport.categoryBreakdown.map((cat, i) => {
                  const maxCount = Math.max(...(operationsReport.categoryBreakdown?.map(c => c.count) || [1]), 1)
                  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#6366f1', '#ec4899']
                  return (
                    <div key={cat.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600 dark:text-slate-400">{cat.category}</span>
                        <span className="font-semibold text-slate-800 dark:text-white">{cat.count}</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(cat.count / maxCount) * 100}%`, backgroundColor: colors[i % colors.length] }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">No operations data for this period</div>
            )}
          </motion.div>
        </div>

        {/* Quick Report Links */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />Detailed Reports
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Sales Report', icon: TrendingUp, path: '/reports/sales', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
              { label: 'Operations', icon: Briefcase, path: '/reports/operations', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
              { label: 'Financial', icon: DollarSign, path: '/reports/financial', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
              { label: 'HR Report', icon: Users, path: '/reports/hr', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
              { label: 'Fleet Report', icon: Truck, path: '/reports/fleet', color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
              { label: 'KPI Performance', icon: Target, path: '/reports/kpi', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
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
      </main>
    </div>
  )
}
