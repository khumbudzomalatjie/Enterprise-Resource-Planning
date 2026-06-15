import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  DollarSign, TrendingUp, TrendingDown, PieChart, Plus, ArrowLeft,
  Sun, Moon, Sparkles, BarChart3, Download
} from 'lucide-react'

export default function BudgetManagement() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [stats, setStats] = useState({ totalBudget: 0, totalSpent: 0, remaining: 0, utilization: 0 })

  const [formData, setFormData] = useState({
    budget_name: '', department: '', fiscal_year: new Date().getFullYear(),
    total_budget: '', notes: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('finance_budgets').select('*').order('fiscal_year', { ascending: false })
      setBudgets(data || [])
      const totalBudget = data?.reduce((s, b) => s + (b.total_budget || 0), 0) || 0
      const totalSpent = data?.reduce((s, b) => s + (b.spent_amount || 0), 0) || 0
      setStats({ totalBudget, totalSpent, remaining: totalBudget - totalSpent, utilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0 })
    } catch (error) { console.error('Error:', error) }
    setLoading(false)
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const handleAddBudget = async () => {
    if (!formData.budget_name || !formData.total_budget) { toast.error('Please fill required fields'); return }
    try {
      await supabase.from('finance_budgets').insert([{ ...formData, total_budget: parseFloat(formData.total_budget), budget_code: 'BUD-' + Date.now().toString(36).toUpperCase() }])
      toast.success('Budget created!')
      setShowAddForm(false)
      setFormData({ budget_name: '', department: '', fiscal_year: new Date().getFullYear(), total_budget: '', notes: '' })
      loadData()
    } catch (error) { toast.error('Failed to create budget') }
  }

  const handleExportCSV = () => {
    const csv = ['Budget,Department,Year,Total,Spent,Remaining',
      ...budgets.map(b => `${b.budget_name},${b.department},${b.fiscal_year},${b.total_budget},${b.spent_amount || 0},${(b.total_budget || 0) - (b.spent_amount || 0)}`)
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Budgets.csv'; a.click()
    toast.success('Exported!')
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
        <Link to="/finance" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Finance</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-purple-600" />Budget Management
            </h1>
            <p className="text-slate-500 mt-1">Plan and monitor company spending</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-purple-700">
              <Plus className="w-4 h-4" /> Create Budget
            </button>
            <button onClick={handleExportCSV} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: DollarSign, label: 'Annual Budget', value: formatCurrency(stats.totalBudget), color: 'text-purple-600' },
            { icon: TrendingDown, label: 'Spent So Far', value: formatCurrency(stats.totalSpent), color: 'text-red-600' },
            { icon: TrendingUp, label: 'Remaining', value: formatCurrency(stats.remaining), color: 'text-emerald-600' },
            { icon: PieChart, label: 'Utilization', value: `${stats.utilization}%`, color: 'text-blue-600' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="neu-raised rounded-2xl p-4">
              <s.icon className={`w-6 h-6 ${s.color} mb-2`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Budget Utilization Bar */}
        <div className="neu-raised rounded-3xl p-6 mb-6">
          <h3 className="font-semibold mb-3">Budget Utilization</h3>
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${stats.utilization}%` }}></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">{stats.utilization}% of budget utilized</p>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="neu-raised rounded-2xl p-4 mb-6">
            <h3 className="font-semibold mb-3">Create New Budget</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="text" value={formData.budget_name} onChange={e => setFormData({...formData, budget_name: e.target.value})} placeholder="Budget Name" className="p-2 neu-inset rounded-lg text-sm" />
              <input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} placeholder="Department" className="p-2 neu-inset rounded-lg text-sm" />
              <input type="number" value={formData.total_budget} onChange={e => setFormData({...formData, total_budget: e.target.value})} placeholder="Total Budget (R)" className="p-2 neu-inset rounded-lg text-sm" />
              <input type="number" value={formData.fiscal_year} onChange={e => setFormData({...formData, fiscal_year: parseInt(e.target.value)})} placeholder="Year" className="p-2 neu-inset rounded-lg text-sm" />
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-slate-300 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAddBudget} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">Save Budget</button>
            </div>
          </div>
        )}

        {/* Budgets Table */}
        <div className="neu-raised rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-700/30">
                  <th className="text-left py-3 px-4">Budget</th>
                  <th className="text-left py-3 px-4">Department</th>
                  <th className="text-left py-3 px-4">Year</th>
                  <th className="text-right py-3 px-4">Budget</th>
                  <th className="text-right py-3 px-4">Spent</th>
                  <th className="text-right py-3 px-4">Remaining</th>
                  <th className="text-center py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {budgets.map(b => (
                  <tr key={b.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium">{b.budget_name}</td>
                    <td className="py-3 px-4">{b.department || 'N/A'}</td>
                    <td className="py-3 px-4">{b.fiscal_year}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(b.total_budget)}</td>
                    <td className="py-3 px-4 text-right text-red-600">{formatCurrency(b.spent_amount)}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">{formatCurrency((b.total_budget || 0) - (b.spent_amount || 0))}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${b.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{b.status || 'active'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
