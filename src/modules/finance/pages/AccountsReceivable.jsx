import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  TrendingUp, DollarSign, Clock, CheckCircle2, Plus, Search,
  Eye, Edit, Trash2, Download, Upload, Printer, ArrowLeft,
  Sun, Moon, Sparkles, Send, Mail
} from 'lucide-react'

export default function AccountsReceivable() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [receivables, setReceivables] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [stats, setStats] = useState({ total: 0, overdue: 0, collected: 0, outstanding: 0 })
  const [clients, setClients] = useState([])

  const [formData, setFormData] = useState({
    client_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0],
    due_date: '', amount: '', description: '', notes: '', status: 'pending'
  })

  useEffect(() => { loadData() }, [statusFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: clientData } = await supabase.from('clients').select('id, company_name').order('company_name')
      setClients(clientData || [])

      let query = supabase.from('accounts_receivable').select('*, clients(company_name)').order('due_date', { ascending: true })
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      const { data } = await query
      setReceivables(data || [])

      const total = data?.reduce((s, r) => s + (r.amount || 0), 0) || 0
      const collected = data?.filter(r => r.status === 'paid').reduce((s, r) => s + (r.amount || 0), 0) || 0
      const overdue = data?.filter(r => r.status !== 'paid' && r.due_date < new Date().toISOString().split('T')[0]).reduce((s, r) => s + (r.amount || 0), 0) || 0
      setStats({ total, overdue, collected, outstanding: total - collected })
    } catch (error) { console.error('Error:', error) }
    setLoading(false)
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  const handleAddReceivable = async () => {
    if (!formData.client_id || !formData.amount || !formData.due_date) { toast.error('Please fill required fields'); return }
    try {
      await supabase.from('accounts_receivable').insert([{ ...formData, amount: parseFloat(formData.amount) }])
      toast.success('Invoice added!')
      setShowAddForm(false)
      setFormData({ client_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', amount: '', description: '', notes: '', status: 'pending' })
      loadData()
    } catch (error) { toast.error('Failed to add invoice') }
  }

  const handleMarkPaid = async (id) => {
    if (!window.confirm('Mark this invoice as paid?')) return
    await supabase.from('accounts_receivable').update({ status: 'paid', amount_received: supabase.raw('amount') }).eq('id', id)
    toast.success('Marked as paid!')
    loadData()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return
    await supabase.from('accounts_receivable').update({ status: 'cancelled' }).eq('id', id)
    toast.success('Cancelled')
    loadData()
  }

  const handleExportCSV = () => {
    const csv = ['Invoice #,Customer,Date,Due Date,Amount,Status',
      ...receivables.map(r => `${r.invoice_number},${r.clients?.company_name},${r.invoice_date},${r.due_date},${r.amount},${r.status}`)
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Accounts_Receivable.csv'; a.click()
    toast.success('Exported!')
  }

  const filtered = receivables.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return (r.invoice_number || '').toLowerCase().includes(s) || (r.clients?.company_name || '').toLowerCase().includes(s)
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
              <TrendingUp className="w-8 h-8 text-blue-600" />Accounts Receivable
            </h1>
            <p className="text-slate-500 mt-1">Track customer invoices and payments</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Create Invoice
            </button>
            <button onClick={handleExportCSV} className="px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-green-700">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: DollarSign, label: 'Total Receivables', value: formatCurrency(stats.total), color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
            { icon: Clock, label: 'Overdue', value: formatCurrency(stats.overdue), color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
            { icon: CheckCircle2, label: 'Collected', value: formatCurrency(stats.collected), color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { icon: TrendingUp, label: 'Outstanding', value: formatCurrency(stats.outstanding), color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="neu-raised rounded-2xl p-4">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="neu-raised rounded-2xl p-4 mb-6">
            <h3 className="font-semibold mb-3">Create Customer Invoice</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})} className="p-2 neu-inset rounded-lg text-sm">
                <option value="">Select Customer</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
              <input type="text" value={formData.invoice_number} onChange={e => setFormData({...formData, invoice_number: e.target.value})} placeholder="Invoice #" className="p-2 neu-inset rounded-lg text-sm" />
              <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="Amount (R)" className="p-2 neu-inset rounded-lg text-sm" />
              <input type="date" value={formData.invoice_date} onChange={e => setFormData({...formData, invoice_date: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" />
              <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" />
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-slate-300 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAddReceivable} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Save</button>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..." className="w-full pl-10 pr-4 py-2.5 neu-inset rounded-xl text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 neu-inset rounded-xl text-sm">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Table */}
        <div className="neu-raised rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-700/30">
                  <th className="text-left py-3 px-4">Invoice #</th>
                  <th className="text-left py-3 px-4">Customer</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Due Date</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-center py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium">{r.invoice_number || 'N/A'}</td>
                    <td className="py-3 px-4">{r.clients?.company_name || 'N/A'}</td>
                    <td className="py-3 px-4 text-xs">{formatDate(r.invoice_date)}</td>
                    <td className="py-3 px-4 text-xs">{formatDate(r.due_date)}</td>
                    <td className="py-3 px-4 text-right font-semibold">{formatCurrency(r.amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${r.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : r.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-1">
                        {r.status !== 'paid' && (
                          <button onClick={() => handleMarkPaid(r.id)} className="p-1.5 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600" title="Mark Paid"><CheckCircle2 className="w-4 h-4" /></button>
                        )}
                        <button className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600" title="Email"><Mail className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600" title="Cancel"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-400">No invoices found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
