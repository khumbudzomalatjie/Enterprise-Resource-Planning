import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFinanceStore from '../store/financeStore'
import useProcurementStore from '../../procurement/store/procurementStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  TrendingDown, Search, Plus, Eye, Edit, Trash2, Save, X,
  ChevronRight, Sun, Moon, Sparkles, DollarSign, Calendar
} from 'lucide-react'

export default function AccountsPayable() {
  const { accountsPayable, fetchAccountsPayable, createPayable, updatePayable, recordPayment } = useFinanceStore()
  const { vendors, fetchVendors } = useProcurementStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [formData, setFormData] = useState({
    vendor_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0],
    due_date: '', amount: 0, description: '', notes: '', status: 'pending'
  })

  useEffect(() => {
    fetchAccountsPayable()
    fetchVendors({ status: 'active' })
  }, [])

  const resetForm = () => {
    setFormData({ vendor_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', amount: 0, description: '', notes: '', status: 'pending' })
    setEditId(null)
    setShowForm(false)
  }

  const handleEdit = (item) => {
    setFormData({
      vendor_id: item.vendor_id || '',
      invoice_number: item.invoice_number || '',
      invoice_date: item.invoice_date || '',
      due_date: item.due_date || '',
      amount: item.amount || 0,
      description: item.description || '',
      notes: item.notes || '',
      status: item.status || 'pending'
    })
    setEditId(item.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.vendor_id || !formData.amount) {
      toast.error('Vendor and amount are required')
      return
    }
    let result
    if (editId) {
      result = await updatePayable(editId, formData)
    } else {
      result = await createPayable(formData)
    }
    if (result.success) {
      toast.success(editId ? 'Updated!' : 'Created!')
      resetForm()
      fetchAccountsPayable()
    } else {
      toast.error('Failed to save')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Cancel this payable?')) {
      await updatePayable(id, { status: 'cancelled' })
      toast.success('Cancelled')
      fetchAccountsPayable()
    }
  }

  const handlePay = async (item) => {
    const amount = prompt('Payment amount:', item.balance || item.amount)
    if (amount && parseFloat(amount) > 0) {
      await recordPayment({
        payment_type: 'accounts_payable',
        reference_id: item.id,
        amount: parseFloat(amount),
        payment_method: 'eft',
        description: `Payment for ${item.invoice_number || 'payable'}`
      })
      toast.success('Payment recorded!')
      fetchAccountsPayable()
    }
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  const filtered = accountsPayable.filter(p => {
    if (search) return p.invoice_number?.toLowerCase().includes(search.toLowerCase()) || p.vendors?.company_name?.toLowerCase().includes(search.toLowerCase())
    if (statusFilter !== 'all') return p.status === statusFilter
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
          <span className="text-slate-800 dark:text-white font-medium">Accounts Payable</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><TrendingDown className="w-8 h-8 text-red-600" />Accounts Payable</h1>
            <p className="text-slate-500 mt-1">{accountsPayable.length} records</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true) }} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-5 h-5" /><span>Add Payable</span>
          </button>
        </motion.div>

        {/* Form Modal */}
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="neu-raised rounded-3xl p-6 mb-6 border-2 border-emerald-200 dark:border-emerald-800">
            <h3 className="text-lg font-semibold mb-4">{editId ? 'Edit Payable' : 'New Payable'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select value={formData.vendor_id} onChange={(e) => setFormData({...formData, vendor_id: e.target.value})} className="p-3 neu-inset rounded-xl">
                <option value="">Select Vendor *</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.company_name}</option>)}
              </select>
              <input type="text" value={formData.invoice_number} onChange={(e) => setFormData({...formData, invoice_number: e.target.value})} placeholder="Invoice Number" className="p-3 neu-inset rounded-xl" />
              <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} placeholder="Amount *" className="p-3 neu-inset rounded-xl" />
              <input type="date" value={formData.invoice_date} onChange={(e) => setFormData({...formData, invoice_date: e.target.value})} className="p-3 neu-inset rounded-xl" />
              <input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="p-3 neu-inset rounded-xl" />
              <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Description" className="p-3 neu-inset rounded-xl" />
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={resetForm} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white"><X className="w-4 h-4" /></button>
              <button onClick={handleSave} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white flex items-center gap-2"><Save className="w-4 h-4" />Save</button>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex gap-4">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl">
            <option value="all">All</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Table */}
        <div className="neu-raised rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Vendor</th>
                <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Invoice #</th>
                <th className="text-right text-sm font-medium text-slate-500 py-4 px-4">Amount</th>
                <th className="text-right text-sm font-medium text-slate-500 py-4 px-4">Paid</th>
                <th className="text-right text-sm font-medium text-slate-500 py-4 px-4">Balance</th>
                <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Due Date</th>
                <th className="text-center text-sm font-medium text-slate-500 py-4 px-4">Status</th>
                <th className="text-center text-sm font-medium text-slate-500 py-4 px-4">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-sm font-medium">{item.vendors?.company_name}</td>
                    <td className="py-3 px-4 text-sm">{item.invoice_number || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium">{formatCurrency(item.amount)}</td>
                    <td className="py-3 px-4 text-sm text-right text-emerald-600">{formatCurrency(item.amount_paid)}</td>
                    <td className="py-3 px-4 text-sm text-right font-bold text-red-600">{formatCurrency(item.balance)}</td>
                    <td className="py-3 px-4 text-sm flex items-center gap-1"><Calendar className="w-3 h-3" />{item.due_date ? new Date(item.due_date).toLocaleDateString() : '-'}</td>
                    <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded-full text-xs ${item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : item.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span></td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleEdit(item)} className="p-2 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                        {item.status !== 'paid' && <button onClick={() => handlePay(item)} className="p-2 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600"><DollarSign className="w-4 h-4" /></button>}
                        {item.status !== 'cancelled' && <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div className="text-center py-12"><TrendingDown className="w-16 h-16 text-slate-300 mx-auto mb-4" /><p className="text-slate-500">No payables found</p></div>}
        </div>
      </main>
    </div>
  )
}
