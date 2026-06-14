import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import usePayrollStore from '../store/payrollStore'
import useThemeStore from '../../../store/themeStore'
import { 
  CreditCard, DollarSign, FileText, Clock, Users,
  TrendingUp, TrendingDown, Calculator, Calendar,
  Sparkles, Sun, Moon, ChevronRight, ArrowLeft,
  CheckCircle2, AlertCircle, BarChart3, Activity,
  Download, Printer, PieChart
} from 'lucide-react'

export default function PayrollDashboard() {
  const { stats, fetchPayrollStats, fetchPayrollPeriods, fetchPayslips, loading } = usePayrollStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [monthlyData, setMonthlyData] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await fetchPayrollStats()
    await fetchPayrollPeriods()
    await fetchPayslips()
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  const statCards = [
    { icon: Users, label: 'Total Employees', value: stats.totalEmployees || 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: CheckCircle2, label: 'Paid This Month', value: stats.paidThisMonth || 0, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: DollarSign, label: 'Payroll Cost', value: formatCurrency(stats.totalNetSalary), color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: Clock, label: 'Pending Runs', value: stats.pendingRuns || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { icon: TrendingDown, label: 'Total Deductions', value: formatCurrency(stats.totalDeductions), color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { icon: TrendingUp, label: 'Net Salaries', value: formatCurrency(stats.totalNetSalary), color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: Calendar, label: 'Next Pay Date', value: stats.nextPayDate || 'N/A', color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { icon: Calculator, label: 'Avg Salary', value: formatCurrency(stats.averageSalary), color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' },
  ]

  const quickActions = [
    { label: 'Run Payroll', icon: Calculator, path: '/payroll/run', color: 'bg-emerald-600' },
    { label: 'View Payslips', icon: FileText, path: '/payroll/payslips', color: 'bg-blue-600' },
    { label: 'Employees', icon: Users, path: '/payroll/employees', color: 'bg-purple-600' },
    { label: 'Reports', icon: BarChart3, path: '/payroll/reports', color: 'bg-amber-600' },
    { label: 'Settings', icon: Activity, path: '/payroll/settings', color: 'bg-indigo-600' },
    { label: 'Audit Log', icon: Clock, path: '/payroll/audit', color: 'bg-red-600' },
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
            <CreditCard className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Payroll Management</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-11">Salary processing, payslips, tax compliance, and reporting</p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {quickActions.map(action => (
            <button key={action.label} onClick={() => navigate(action.path)}
              className={`${action.color} text-white rounded-2xl p-3 flex flex-col items-center gap-1 hover:scale-105 transition-transform text-sm font-medium shadow-lg`}>
              <action.icon className="w-5 h-5" />
              {action.label}
            </button>
          ))}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.03 }}
              className="neu-raised rounded-2xl p-4 stat-card">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Current Period & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Period */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="neu-raised rounded-3xl p-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />Current Payroll Period
            </h2>
            {stats.currentPeriod ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                  <span className="text-sm text-slate-500">Period</span>
                  <span className="font-semibold">{stats.currentPeriod.period_name}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                  <span className="text-sm text-slate-500">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${stats.currentPeriod.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {stats.currentPeriod.status}
                  </span>
                </div>
                <button onClick={() => navigate('/payroll/run')} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700">
                  Process Payroll
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No active payroll period</p>
                <button onClick={() => navigate('/payroll/run/new')} className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm">Create Period</button>
              </div>
            )}
          </motion.div>

          {/* Recent Activity */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="neu-raised rounded-3xl p-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />Recent Activity
            </h2>
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 text-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-slate-600 dark:text-slate-400">Payroll processed for March 2025</span>
                  <span className="text-xs text-slate-400 ml-auto">2 days ago</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
