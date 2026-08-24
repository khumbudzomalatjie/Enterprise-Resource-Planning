import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Receipt, Search, Eye, Download, ChevronRight, 
  Sun, Moon, Sparkles, ArrowLeft, RefreshCw,
  DollarSign, Clock, CheckCircle2, XCircle
} from 'lucide-react'

export default function InvoiceList() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadInvoices()
  }, [statusFilter])

  const loadInvoices = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      const { data, error } = await query
      if (error) throw error
      setInvoices(data || [])
    } catch (err) {
      console.error('Error:', err)
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getStatusBadge = (status) => {
    if (!status) return 'bg-slate-100 text-slate-600'
    if (status === 'paid') return 'bg-emerald-100 text-emerald-700'
    if (status === 'sent') return 'bg-blue-100 text-blue-700'
    if (status === 'overdue') return 'bg-red-100 text-red-700'
    if (status === 'partially_paid') return 'bg-amber-100 text-amber-700'
    if (status === 'cancelled') return 'bg-red-100 text-red-700'
    return 'bg-slate-100 text-slate-600'
  }

  const filteredInvoices = invoices.filter(inv => {
    if (!search) return true
    const s = search.toLowerCase()
    return (inv.invoice_number || '').toLowerCase().includes(s) ||
           (inv.client_name || '').toLowerCase().includes(s)
  })

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  const outstanding = totalAmount - paidAmount

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/sales" className="text-slate-500 hover:text-emerald-600">Sales</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Invoices</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Receipt className="w-8 h-8 text-emerald-600" />Invoices
            </h1>
            <p className="text-slate-500 mt-1">{invoices.length} invoices found</p>
          </div>
          <button onClick={loadInvoices} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="neu-raised rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(totalAmount)}</p>
            <p className="text-xs text-slate-500">Total Invoiced</p>
          </div>
          <div className="neu-raised rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(paidAmount)}</p>
            <p className="text-xs text-slate-500">Paid</p>
          </div>
          <div className="neu-raised rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{formatCurrency(outstanding)}</p>
            <p className="text-xs text-slate-500">Outstanding</p>
          </div>
        </div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by invoice # or client..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-sm">
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="partially_paid">Partially Paid</option>
          </select>
        </div>

        {/* Invoices Table */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12 neu-raised rounded-3xl">
            <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No invoices found</p>
          </div>
        ) : (
          <div className="neu-raised rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left py-3 px-4 text-slate-500">Invoice #</th>
                    <th className="text-left py-3 px-4 text-slate-500">Client</th>
                    <th className="text-left py-3 px-4 text-slate-500">Date</th>
                    <th className="text-left py-3 px-4 text-slate-500">Due</th>
                    <th className="text-right py-3 px-4 text-slate-500">Amount</th>
                    <th className="text-center py-3 px-4 text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-white">{inv.invoice_number}</td>
                      <td className="py-3 px-4">{inv.client_name || 'N/A'}</td>
                      <td className="py-3 px-4 text-xs">{formatDate(inv.invoice_date)}</td>
                      <td className="py-3 px-4 text-xs">{formatDate(inv.due_date)}</td>
                      <td className="py-3 px-4 text-right font-bold">{formatCurrency(inv.total_amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(inv.status)}`}>
                          {inv.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
