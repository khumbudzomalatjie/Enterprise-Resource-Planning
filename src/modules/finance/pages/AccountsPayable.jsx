import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  TrendingDown, DollarSign, Clock, CheckCircle2, Plus, Search,
  Eye, Edit, Trash2, Download, Upload, Printer, ArrowLeft,
  Sun, Moon, Sparkles, FileText, AlertCircle, Send
} from 'lucide-react'

export default function AccountsPayable() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [payables, setPayables] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [stats, setStats] = useState({ total: 0, overdue: 0, dueToday: 0, paidThisMonth: 0 })

  const [formData, setFormData] = useState({
    vendor_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0],
    due_date: '', amount: '', description: '', notes: '', status: 'pending'
  })

  const [vendors, setVendors] = useState([])

  useEffect(() => { loadData() }, [statusFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load vendors
      const { data: vendorData } = await supabase.from('vendors').select('id, company_name').eq('status', 'active')
      setVendors(vendorData || [])

      // Load payables
      let query = supabase.from('accounts_payable').select('*, vendors(company_name)').order('due_date', { ascending: true })
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      const { data } = await query
      setPayables(data || [])

      // Calculate stats
      const total = data?.reduce((s, p) => s + (p.amount || 0), 0) || 0
      const paid = data?.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0) || 0
      const overdue = data?.filter(p => p.status !== 'paid' && p.due_date < new Date().toISOString().split('T')[0]).reduce((s, p) => s + (p.amount || 0), 0) || 0
      const dueToday = data?.filter(p => p.due_date === new Date().toISOString().split('T')[0] && p.status !== 'paid').reduce((s, p) => s + (p.amount || 0), 0) || 0

      setStats({ total, overdue, dueToday, paidThisMonth: paid })
    } catch (error) { console.error('Error:', error) }
    setLoading(false)
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  const handleAddPayable = async () => {
    if (!formData.vendor_id || !formData.amount || !formData.due_date) {
      toast.error('Please fill required fields'); return
    }
    try {
      await supabase.from('accounts_payable').insert([{ ...formData, amount: parseFloat(formData.amount) }])
      toast.success('Invoice added!')
      setShowAddForm(false)
      setFormData({ vendor_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', amount: '', description: '', notes: '', status: 'pending' })
      loadData()
    } catch (error) { toast.error('Failed to add invoice') }
  }

  const handlePayInvoice = async (id) => {
    if (!window.confirm('Mark this invoice as paid?')) return
    await supabase.from('accounts_payable').update({ status: 'paid', amount_paid: supabase.raw('amount') }).eq('id', id)
    toast.success('Invoice marked as paid!')
    loadData()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return
    await supabase.from('accounts_payable').update({ status: 'cancelled' }).eq('id', id)
    toast.success('Invoice cancelled')
    loadData()
  }

  const handleExportCSV = () => {
    const csv = ['Invoice #,Vendor,Date,Due Date,Amount,Status',
      ...payables.map(p => `${p.invoice_number},${p.vendors?.company_name},${p.invoice_date},${p.due_date},${p.amount},${p.status}`)
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Accounts_Payable.csv'; a.click()
    toast.success('Exported!')
  }

  const filteredPayables = payables.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return (p.invoice_number || '').toLowerCase().includes(s) || (p.vendors?.company_name || '').toLowerCase().includes(s)
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
              <TrendingDown className="w-8 h-8 text-red-600" />Accounts Payable
            </h1>
            <p className="text-slate-500 mt-1">Manage supplier invoices and payments</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-red-700">
              <Plus className="w-4 h-4" /> Add Invoice
            </button>
            <button onClick={handleExportCSV} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: DollarSign, label: 'Total Payables', value: formatCurrency(stats.total), color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
            { icon: AlertCircle, label: 'Overdue', value: formatCurrency(stats.overdue), color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
            { icon: Clock, label: 'Due Today', value: formatCurrency(stats.dueToday), color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
            { icon: CheckCircle2, label: 'Paid This Month', value: formatCurrency(stats.paidThisMonth), color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="neu-raised rounded-2xl p-4">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Add Invoice Form */}
        {showAddForm && (
          <div className="neu-raised rounded-2xl p-4 mb-6">
            <h3 className="font-semibold mb-3">Add Supplier Invoice</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={formData.vendor_id} onChange={e => setFormData({...formData, vendor_id: e.target.value})} className="p-2 neu-inset rounded-lg text-sm">
                <option value="">Select Vendor</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.company_name}</option>)}
              </select>
              <input type="text" value={formData.invoice_number} onChange={e => setFormData({...formData, invoice_number: e.target.value})} placeholder="Invoice #" className="p-2 neu-inset rounded-lg text-sm" />
              <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="Amount (R)" className="p-2 neu-inset rounded-lg text-sm" />
              <input type="date" value={formData.invoice_date} onChange={e => setFormData({...formData, invoice_date: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" />
              <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" />
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Description" className="p-2 neu-inset rounded-lg text-sm" />
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-slate-300 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAddPayable} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Save Invoice</button>
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

        {/* Payables Table */}
        <div className="neu-raised rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-700/30">
                  <th className="text-left py-3 px-4">Invoice #</th>
                  <th className="text-left py-3 px-4">Supplier</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Due Date</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-center py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayables.map(p => (
                  <tr key={p.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium">{p.invoice_number || 'N/A'}</td>
                    <td className="py-3 px-4">{p.vendors?.company_name || 'N/A'}</td>
                    <td className="py-3 px-4 text-xs">{formatDate(p.invoice_date)}</td>
                    <td className="py-3 px-4 text-xs">{formatDate(p.due_date)}</td>
                    <td className="py-3 px-4 text-right font-semibold">{formatCurrency(p.amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : p.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>{p.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-1">
                        {p.status !== 'paid' && (
                          <button onClick={() => handlePayInvoice(p.id)} className="p-1.5 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600" title="Mark Paid"><CheckCircle2 className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600" title="Cancel"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPayables.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-400">No invoices found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
