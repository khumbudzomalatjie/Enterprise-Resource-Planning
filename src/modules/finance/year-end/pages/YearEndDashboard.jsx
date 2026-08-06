import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useThemeStore from '../../../../store/themeStore'
import { financialEngine } from '../api/financialEngine'
import { 
  Landmark, TrendingUp, TrendingDown, DollarSign,
  CreditCard, Receipt, Shield, CheckCircle2, XCircle,
  AlertTriangle, Clock, Target, Activity, BarChart3,
  Sun, Moon, Sparkles, ArrowLeft, ChevronRight,
  FileText, Download, Printer, Calculator, PieChart
} from 'lucide-react'

export default function YearEndDashboard() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    const result = await financialEngine.getYearEndDashboard()
    setDashboard(result.data)
    setLoading(false)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Calculating financial position...</p>
        </div>
      </div>
    )
  }

  const income = dashboard?.income_statement
  const balance = dashboard?.balance_sheet
  const trial = dashboard?.trial_balance
  const health = dashboard?.health_score
  const checklist = dashboard?.checklist
  const ratios = dashboard?.ratios

  const topCards = [
    { icon: Shield, label: 'Financial Health', value: `${health?.score || 0}/100`, sub: `Grade ${health?.grade || 'N/A'}`, color: health?.is_healthy ? 'text-emerald-600' : 'text-red-600', bg: health?.is_healthy ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30' },
    { icon: TrendingUp, label: 'Revenue', value: formatCurrency(income?.revenue?.total_revenue), color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: TrendingDown, label: 'Expenses', value: formatCurrency(income?.operating_expenses?.total_operating_expenses), color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { icon: DollarSign, label: 'Net Profit', value: formatCurrency(income?.net_profit), color: (income?.net_profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600', bg: (income?.net_profit || 0) >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30' },
    { icon: Landmark, label: 'Total Assets', value: formatCurrency(balance?.assets?.total_assets), color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: CreditCard, label: 'Total Liabilities', value: formatCurrency(balance?.liabilities?.total_liabilities), color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { icon: Target, label: 'Net Worth', value: formatCurrency(ratios?.net_worth), color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: Receipt, label: 'Trial Balance', value: trial?.is_balanced ? 'Balanced ✓' : 'Unbalanced ✗', sub: `Diff: ${formatCurrency(trial?.difference)}`, color: trial?.is_balanced ? 'text-emerald-600' : 'text-red-600', bg: trial?.is_balanced ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30' },
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
        <Link to="/finance/bookkeeping" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Bookkeeping</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Landmark className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Financial Year-End</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">
              FY {dashboard?.financial_year} • Real-time financial statements • 
              <span className={checklist?.can_close ? 'text-emerald-600 ml-1' : 'text-amber-600 ml-1'}>
                {checklist?.can_close ? '✅ Ready for close' : `${checklist?.passed_checks}/${checklist?.total_checks} checks passed`}
              </span>
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/finance/year-end/income-statement')} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
              <FileText className="w-5 h-5" /><span>Income Statement</span>
            </button>
            <button onClick={() => navigate('/finance/year-end/balance-sheet')} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
              <FileText className="w-5 h-5" /><span>Balance Sheet</span>
            </button>
            <button onClick={() => navigate('/finance/year-end/closing')} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /><span>Year-End Close</span>
            </button>
          </div>
        </motion.div>

        {/* Top Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {topCards.map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className="neu-raised rounded-2xl p-4">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1">{card.label}</p>
              {card.sub && <p className="text-xs text-slate-400">{card.sub}</p>}
            </motion.div>
          ))}
        </div>

        {/* Checklist & Ratios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Year-End Checklist */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="neu-raised rounded-3xl p-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />Year-End Checklist
            </h2>
            <div className="space-y-2">
              {(checklist?.checks || []).map(check => (
                <div key={check.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                  <div className="flex items-center gap-2">
                    {check.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                    <span className="text-sm text-slate-700 dark:text-slate-300">{check.name}</span>
                    {check.critical && <span className="text-xs text-red-500">*</span>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${check.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {check.passed ? 'Pass' : 'Fail'}
                  </span>
                </div>
              ))}
            </div>
            {checklist?.can_close && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl text-center">
                <p className="text-emerald-700 dark:text-emerald-400 font-semibold">🎉 All checks passed! Ready for year-end close.</p>
              </div>
            )}
          </motion.div>

          {/* Financial Ratios */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="neu-raised rounded-3xl p-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-600" />Financial Ratios
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Current Ratio', value: ratios?.current_ratio, desc: 'Ability to pay short-term debt' },
                { label: 'Debt Ratio', value: ratios?.debt_ratio, desc: 'Percentage of assets financed by debt' },
                { label: 'Profit Margin', value: ratios?.profit_margin, desc: 'Net profit as % of revenue' },
                { label: 'Working Capital', value: formatCurrency(ratios?.working_capital), desc: 'Current assets minus liabilities' },
              ].map(ratio => (
                <div key={ratio.label} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 text-center">
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{ratio.value}</p>
                  <p className="text-xs text-slate-500">{ratio.label}</p>
                  <p className="text-xs text-slate-400 mt-1">{ratio.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Links to Financial Statements */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Income Statement', icon: TrendingUp, path: '/finance/year-end/income-statement' },
            { label: 'Balance Sheet', icon: Landmark, path: '/finance/year-end/balance-sheet' },
            { label: 'Cash Flow', icon: Activity, path: '/finance/year-end/cash-flow' },
            { label: 'Trial Balance', icon: Calculator, path: '/finance/year-end/trial-balance' },
            { label: 'General Ledger', icon: FileText, path: '/finance/ledger' },
          ].map(item => (
            <button key={item.label} onClick={() => navigate(item.path)} className="neu-raised neu-btn rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-105">
              <item.icon className="w-6 h-6 text-emerald-600" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
            </button>
          ))}
        </motion.div>
      </main>
    </div>
  )
}
