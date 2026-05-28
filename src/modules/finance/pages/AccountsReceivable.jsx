import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFinanceStore from '../store/financeStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { TrendingUp, Search, ChevronRight, Sun, Moon, Sparkles, Calendar } from 'lucide-react'

export default function AccountsReceivable() {
  const { accountsReceivable, fetchAccountsReceivable, recordPayment } = useFinanceStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => { fetchAccountsReceivable() }, [])

  const handleReceive = async (item) => {
    const amount = prompt('Payment amount received:', item.balance || item.amount)
    if (amount && parseFloat(amount) > 0) {
      await recordPayment({
        payment_type: 'accounts_receivable',
        reference_id: item.id,
        amount: parseFloat(amount),
        payment_method: 'eft',
        description: `Payment received for ${item.invoice_number || 'receivable'}`
      })
      toast.success('Payment recorded!')
      fetchAccountsReceivable()
    }
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  const filtered = accountsReceivable.filter(r => {
    if (search) return r.invoice_number?.toLowerCase().includes(search.toLowerCase()) || r.clients?.company_name?.toLowerCase().includes(search.toLowerCase())
    if (statusFilter !== 'all') return r.status === statusFilter
    return true
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
          <span className="text-slate-800 dark:text-white font-medium">Accounts Receivable</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><TrendingUp className="w-8 h-8 text-blue-600" />Accounts Receivable</h1>
          <p className="text-slate-500 mt-1">{accountsReceivable.length} records</p>
        </motion.div>

        <div className="neu-raised rounded-2xl p-4 mb-6 flex gap-4">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl">
            <option value="all">All</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
          </select>
        </div>

        <div className="neu-raised rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Client</th>
                <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Invoice #</th>
                <th className="text-right text-sm font-medium text-slate-500 py-4 px-4">Amount</th>
                <th className="text-right text-sm font-medium text-slate-500 py-4 px-4">Received</th>
                <th className="text-right text-sm font-medium text-slate-500 py-4 px-4">Balance</th>
                <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Due Date</th>
                <th className="text-center text-sm font-medium text-slate-500 py-4 px-4">Status</th>
                <th className="text-center text-sm font-medium text-slate-500 py-4 px-4">Action</th>
              </tr></thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-sm font-medium">{item.clients?.company_name}</td>
                    <td className="py-3 px-4 text-sm">{item.invoice_number || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium">{formatCurrency(item.amount)}</td>
                    <td className="py-3 px-4 text-sm text-right text-emerald-600">{formatCurrency(item.amount_received)}</td>
                    <td className="py-3 px-4 text-sm text-right font-bold text-blue-600">{formatCurrency(item.balance)}</td>
                    <td className="py-3 px-4 text-sm flex items-center gap-1"><Calendar className="w-3 h-3" />{item.due_date ? new Date(item.due_date).toLocaleDateString() : '-'}</td>
                    <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded-full text-xs ${item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : item.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span></td>
                    <td className="py-3 px-4 text-center">
                      {item.balance > 0 && (
                        <button onClick={() => handleReceive(item)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700">Receive Payment</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div className="text-center py-12"><TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" /><p className="text-slate-500">No receivables found</p></div>}
        </div>
      </main>
    </div>
  )
}
