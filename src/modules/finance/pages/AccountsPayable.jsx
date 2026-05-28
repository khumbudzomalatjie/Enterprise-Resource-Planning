import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFinanceStore from '../store/financeStore'
import useProcurementStore from '../../procurement/store/procurementStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  TrendingDown, Search, Plus, Edit, Trash2, Save, X,
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
    vendor_id: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: 0,
    description: '',
    notes: '',
    status: 'pending'
  })

  useEffect(() => {
    fetchAccountsPayable()
    fetchVendors({ status: 'active' })
  }, [])

  const resetForm = () => {
    setFormData({
      vendor_id: '', invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: 0, description: '', notes: '', status: 'pending'
    })
    setEditId(null)
    setShowForm(false)
  }

  const handleEdit = (item) => {
    setFormData({
      vendor_id: item.vendor_id || '',
      invoice_number: item.invoice_number || '',
      invoice_date: item.invoice_date || new Date().toISOString().split('T')[0],
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
    if (result && result.success) {
      toast.success(editId ? 'Payable updated!' : 'Payable created!')
      resetForm()
      fetchAccountsPayable()
    } else {
      toast.error(result?.error || 'Failed to save')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Cancel this payable?')) {
      await updatePayable(id, { status: 'cancelled' })
      toast.success('Payable cancelled')
      fetchAccountsPayable()
    }
  }

  const handlePay = async (item) => {
    const amount = prompt('Payment amount:', item.balance || item.amount)
    if (amount && parseFloat(amount) > 0) {
      const result = await recordPayment({
        payment_type: 'accounts_payable',
        reference_id: item.id,
        amount: parseFloat(amount),
        payment_method: 'eft',
        description: `Payment for ${item.invoice_number || 'payable'} - ${item.vendors?.company_name || ''}`
      })
      if (result && result.success) {
        toast.success('Payment recorded!')
        fetchAccountsPayable()
      } else {
        toast.error(result?.error || 'Payment failed')
      }
    }
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const filtered = accountsPayable.filter(p => {
    const matchesSearch = !search || 
      p.invoice_number?.toLowerCase().includes(search.toLowerCase()) || 
      p.vendors?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPayables = filtered.reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalPaid = filtered.reduce((sum, p) => sum + (p.amount_paid || 0), 0)
  const totalBalance = filtered.reduce((sum, p) => sum + ((p.amount || 0) - (p.amount_paid || 0)), 0)

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
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/finance" className="text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">Finance</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Accounts Payable</span>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-red-600" />Accounts Payable
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{accountsPayable.length} records</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true) }} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-5 h-5" /><span>Add Payable</span>
          </button>
        </motion.div>

        {/* Form Modal */}
        {showForm && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="neu-raised rounded-3xl p-6 mb-6 border-2 border-emerald-200 dark:border-emerald-800">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{editId ? 'Edit Payable' : 'New Payable'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select value={formData.vendor_id} onChange={(e) => setFormData({...formData, vendor_id: e.target.value})} className="p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
                <option value="">Select Vendor *</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.company_name}</option>)}
              </select>
              <input type="text" value={formData.invoice_number} onChange={(e) => setFormData({...formData, invoice_number: e.target.value})} placeholder="Invoice Number" className="p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
              <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} placeholder="Amount *" className="p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
              <input type="date" value={formData.invoice_date} onChange={(e) => setFormData({...formData, invoice_date: e.target.value})} className="p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
              <input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
              <input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Description" className="p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={resetForm} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2"><X className="w-4 h-4" />Cancel</button>
              <button onClick={handleSave} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"><Save className="w-4 h-4" />Save</button>
            </div>
          </motion.div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="neu-raised rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Payables</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{formatCurrency(totalPayables)}</p>
          </div>
          <div className="neu-raised rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Paid</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="neu-raised rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">Outstanding</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalBalance)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by invoice, vendor, description..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        <div className="neu-raised rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 py-4 px-4">Vendor</th>
                  <th className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 py-4 px-4">Invoice #</th>
                  <th className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 py-4 px-4">Description</th>
                  <th className="text-right text-sm font-medium text-slate-500 dark:text-slate-400 py-4 px-4">Amount</th>
                  <th className="text-right text-sm font-medium text-slate-500 dark:text-slate-400 py-4 px-4">Paid</th>
                  <th className="text-right text-sm font-medium text-slate-500 dark:text-slate-400 py-4 px-4">Balance</th>
                  <th className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 py-4 px-4">Due Date</th>
                  <th className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 py-4 px-4">Status</th>
                  <th className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, index) => (
                  <tr key={item.id} className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${item.status === 'overdue' ? 'bg-red-50 dark:bg-red-900/5' : ''}`}>
                    <td className="py-3 px-4 text-sm font-medium text-slate-800 dark:text-white">{item.vendors?.company_name || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{item.invoice_number || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{item.description || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-slate-800 dark:text-white">{formatCurrency(item.amount)}</td>
                    <td className="py-3 px-4 text-sm text-right text-emerald-600 font-medium">{formatCurrency(item.amount_paid)}</td>
                    <td className="py-3 px-4 text-sm text-right font-bold text-red-600">{formatCurrency((item.amount || 0) - (item.amount_paid || 0))}</td>
                    <td className="py-3 px-4 text-sm flex items-center gap-1 text-slate-600 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.due_date ? new Date(item.due_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        item.status === 'overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        item.status === 'approved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>{item.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleEdit(item)} className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        {item.status !== 'paid' && item.status !== 'cancelled' && (
                          <button onClick={() => handlePay(item)} className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="Record Payment">
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        {item.status !== 'cancelled' && (
                          <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Cancel">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <TrendingDown className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 text-lg">No payables found</p>
              <button onClick={() => { resetForm(); setShowForm(true) }} className="mt-4 neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white">Add First Payable</button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
