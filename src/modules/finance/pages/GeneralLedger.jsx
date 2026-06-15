import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  FileText, DollarSign, TrendingUp, TrendingDown, Plus, Search,
  ArrowLeft, Sun, Moon, Sparkles, Download, Calculator
} from 'lucide-react'

export default function GeneralLedger() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [stats, setStats] = useState({ totalDebits: 0, totalCredits: 0, balance: 0 })

  const [formData, setFormData] = useState({
    account_id: '', transaction_date: new Date().toISOString().split('T')[0],
    description: '', debit_amount: '', credit_amount: '', reference_number: '', notes: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: acctData } = await supabase.from('chart_of_accounts').select('*').order('account_code')
      setAccounts(acctData || [])

      const { data: ledgerData } = await supabase.from('general_ledger').select('*, chart_of_accounts(account_name, account_code)').order('transaction_date', { ascending: false }).limit(100)
      setEntries(ledgerData || [])

      const debits = ledgerData?.reduce((s, e) => s + (e.debit_amount || 0), 0) || 0
      const credits = ledgerData?.reduce((s, e) => s + (e.credit_amount || 0), 0) || 0
      setStats({ totalDebits: debits, totalCredits: credits, balance: debits - credits })
    } catch (error) { console.error('Error:', error) }
    setLoading(false)
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  const handleAddEntry = async () => {
    if (!formData.description || (!formData.debit_amount && !formData.credit_amount)) { toast.error('Please fill required fields'); return }
    try {
      await supabase.from('general_ledger').insert([{
        ...formData,
        debit_amount: parseFloat(formData.debit_amount) || 0,
        credit_amount: parseFloat(formData.credit_amount) || 0
      }])
      toast.success('Entry added!')
      setShowAddForm(false)
      setFormData({ account_id: '', transaction_date: new Date().toISOString().split('T')[0], description: '', debit_amount: '', credit_amount: '', reference_number: '', notes: '' })
      loadData()
    } catch (error) { toast.error('Failed to add entry') }
  }

  const handleExportCSV = () => {
    const csv = ['Date,Account,Description,Debit,Credit,Reference',
      ...entries.map(e => `${e.transaction_date},${e.chart_of_accounts?.account_name},${e.description},${e.debit_amount || 0},${e.credit_amount || 0},${e.reference_number || ''}`)
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'General_Ledger.csv'; a.click()
    toast.success('Exported!')
  }

  const filtered = entries.filter(e => {
    if (!search) return true
    const s = search.toLowerCase()
    return (e.description || '').toLowerCase().includes(s) || (e.chart_of_accounts?.account_name || '').toLowerCase().includes(s) || (e.reference_number || '').toLowerCase().includes(s)
  })

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
              <FileText className="w-8 h-8 text-indigo-600" />General Ledger
            </h1>
            <p className="text-slate-500 mt-1">Record all financial transactions</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-indigo-700">
              <Plus className="w-4 h-4" /> Journal Entry
            </button>
            <button onClick={handleExportCSV} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: TrendingUp, label: 'Total Debits', value: formatCurrency(stats.totalDebits), color: 'text-blue-600' },
            { icon: TrendingDown, label: 'Total Credits', value: formatCurrency(stats.totalCredits), color: 'text-red-600' },
            { icon: Calculator, label: 'Balance', value: formatCurrency(stats.balance), color: stats.balance >= 0 ? 'text-emerald-600' : 'text-red-600' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="neu-raised rounded-2xl p-4 text-center">
              <s.icon className={`w-6 h-6 ${s.color} mx-auto mb-2`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Add Entry Form */}
        {showAddForm && (
          <div className="neu-raised rounded-2xl p-4 mb-6">
            <h3 className="font-semibold mb-3">New Journal Entry</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})} className="p-2 neu-inset rounded-lg text-sm">
                <option value="">Select Account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>)}
              </select>
              <input type="date" value={formData.transaction_date} onChange={e => setFormData({...formData, transaction_date: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" />
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Description *" className="p-2 neu-inset rounded-lg text-sm" />
              <input type="number" step="0.01" value={formData.debit_amount} onChange={e => setFormData({...formData, debit_amount: e.target.value})} placeholder="Debit Amount" className="p-2 neu-inset rounded-lg text-sm" />
              <input type="number" step="0.01" value={formData.credit_amount} onChange={e => setFormData({...formData, credit_amount: e.target.value})} placeholder="Credit Amount" className="p-2 neu-inset rounded-lg text-sm" />
              <input type="text" value={formData.reference_number} onChange={e => setFormData({...formData, reference_number: e.target.value})} placeholder="Reference #" className="p-2 neu-inset rounded-lg text-sm" />
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-slate-300 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAddEntry} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Save Entry</button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries..." className="w-full pl-10 pr-4 py-2.5 neu-inset rounded-xl text-sm" />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="neu-raised rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-700/30">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Account</th>
                  <th className="text-left py-3 px-4">Description</th>
                  <th className="text-right py-3 px-4">Debit</th>
                  <th className="text-right py-3 px-4">Credit</th>
                  <th className="text-left py-3 px-4">Reference</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4 text-xs">{formatDate(e.transaction_date)}</td>
                    <td className="py-3 px-4 text-xs">{e.chart_of_accounts?.account_name || 'N/A'}</td>
                    <td className="py-3 px-4">{e.description}</td>
                    <td className="py-3 px-4 text-right text-blue-600 font-medium">{e.debit_amount > 0 ? formatCurrency(e.debit_amount) : '-'}</td>
                    <td className="py-3 px-4 text-right text-red-600 font-medium">{e.credit_amount > 0 ? formatCurrency(e.credit_amount) : '-'}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{e.reference_number || '-'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">No entries found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
