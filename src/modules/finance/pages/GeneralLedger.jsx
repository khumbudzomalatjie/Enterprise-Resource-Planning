import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFinanceStore from '../store/financeStore'
import useThemeStore from '../../../store/themeStore'
import { FileText, Search, ChevronRight, Sun, Moon, Sparkles } from 'lucide-react'

export default function GeneralLedger() {
  const { ledger, fetchLedger } = useFinanceStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => { fetchLedger() }, [])

  const handleFilter = () => {
    const filters = {}
    if (dateFrom) filters.date_from = dateFrom
    if (dateTo) filters.date_to = dateTo
    fetchLedger(filters)
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  
  const totalDebit = ledger.reduce((sum, l) => sum + (l.debit_amount || 0), 0)
  const totalCredit = ledger.reduce((sum, l) => sum + (l.credit_amount || 0), 0)

  const filtered = ledger.filter(l => {
    if (!search) return true
    return l.description?.toLowerCase().includes(search.toLowerCase()) ||
           l.chart_of_accounts?.account_name?.toLowerCase().includes(search.toLowerCase()) ||
           l.reference_number?.toLowerCase().includes(search.toLowerCase())
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
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/finance" className="text-slate-500 hover:text-emerald-600">Finance</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">General Ledger</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><FileText className="w-8 h-8 text-emerald-600" />General Ledger</h1>
          <p className="text-slate-500 mt-1">{ledger.length} transactions</p>
        </motion.div>

        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl" />
          </div>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-4 py-3 neu-inset rounded-xl" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-4 py-3 neu-inset rounded-xl" />
          <button onClick={handleFilter} className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white">Filter</button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="neu-raised rounded-2xl p-4 text-center"><p className="text-xs text-slate-500">Total Debits</p><p className="text-xl font-bold text-red-600">{formatCurrency(totalDebit)}</p></div>
          <div className="neu-raised rounded-2xl p-4 text-center"><p className="text-xs text-slate-500">Total Credits</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(totalCredit)}</p></div>
          <div className="neu-raised rounded-2xl p-4 text-center"><p className="text-xs text-slate-500">Balance</p><p className={`text-xl font-bold ${totalDebit - totalCredit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(totalDebit - totalCredit)}</p></div>
        </div>

        <div className="neu-raised rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Date</th>
                <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Account</th>
                <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Description</th>
                <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Reference</th>
                <th className="text-right text-sm font-medium text-slate-500 py-4 px-4">Debit</th>
                <th className="text-right text-sm font-medium text-slate-500 py-4 px-4">Credit</th>
                <th className="text-center text-sm font-medium text-slate-500 py-4 px-4">Status</th>
              </tr></thead>
              <tbody>
                {filtered.map(entry => (
                  <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-3 px-4 text-sm">{new Date(entry.transaction_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-sm font-medium">{entry.chart_of_accounts?.account_name || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm">{entry.description}</td>
                    <td className="py-3 px-4 text-sm text-slate-500">{entry.reference_number || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right text-red-600 font-medium">{entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}</td>
                    <td className="py-3 px-4 text-sm text-right text-emerald-600 font-medium">{entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}</td>
                    <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded-full text-xs ${entry.status === 'posted' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{entry.status}</span></td>
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
