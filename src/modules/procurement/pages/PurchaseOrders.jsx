import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useProcurementStore from '../store/procurementStore'
import useInventoryStore from '../../inventory/store/inventoryStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { Search, ShoppingCart, Plus, Eye, Trash2, ChevronRight, Sun, Moon, Sparkles, Truck } from 'lucide-react'

export default function PurchaseOrders() {
  const { purchaseOrders, fetchPurchaseOrders } = useInventoryStore()
  const { convertPRToPO, receivePurchaseOrder } = useProcurementStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => { loadData() }, [statusFilter])

  const loadData = async () => {
    const filters = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    await fetchPurchaseOrders(filters)
  }

  const handleReceive = async (poId) => {
    if (window.confirm('Mark this PO as received? This will update inventory stock.')) {
      await receivePurchaseOrder(poId)
      toast.success('PO received! Inventory updated.')
      loadData()
    }
  }

  const filteredPOs = (purchaseOrders || []).filter(po => {
    if (!search) return true
    return po.po_number?.toLowerCase().includes(search.toLowerCase()) ||
           po.vendors?.company_name?.toLowerCase().includes(search.toLowerCase())
  })

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-slate-100 text-slate-700',
      sent: 'bg-blue-100 text-blue-700',
      confirmed: 'bg-purple-100 text-purple-700',
      partially_received: 'bg-amber-100 text-amber-700',
      received: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    return badges[status] || 'bg-slate-100 text-slate-700'
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

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
          <Link to="/procurement" className="text-slate-500 hover:text-emerald-600">Procurement</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Purchase Orders</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-emerald-600" />Purchase Orders
            </h1>
            <p className="text-slate-500 mt-1">{(purchaseOrders || []).length} orders</p>
          </div>
          <button onClick={() => navigate('/procurement/po/new')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-5 h-5" /><span>New PO</span>
          </button>
        </motion.div>

        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search POs..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="confirmed">Confirmed</option>
            <option value="partially_received">Partially Received</option>
            <option value="received">Received</option>
          </select>
        </div>

        <div className="neu-raised rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">PO Number</th>
                  <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Vendor</th>
                  <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Date</th>
                  <th className="text-right text-sm font-medium text-slate-500 py-4 px-4">Total</th>
                  <th className="text-center text-sm font-medium text-slate-500 py-4 px-4">Status</th>
                  <th className="text-right text-sm font-medium text-slate-500 py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPOs.map(po => (
                  <tr key={po.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-sm font-medium text-slate-800 dark:text-white">{po.po_number}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{po.vendors?.company_name || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-slate-500">{new Date(po.order_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-sm font-medium text-right">{formatCurrency(po.total_amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(po.status)}`}>{po.status.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/procurement/po/${po.id}`)} className="p-2 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600" title="View"><Eye className="w-4 h-4" /></button>
                        {(po.status === 'sent' || po.status === 'confirmed') && (
                          <button onClick={() => handleReceive(po.id)} className="p-2 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600" title="Receive"><Truck className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredPOs.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No purchase orders found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
