import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useInventoryStore from '../store/inventoryStore'
import useThemeStore from '../../../store/themeStore'
import { RefreshCw, ArrowLeft, ChevronRight, Sun, Moon, Sparkles, MoveRight, MoveLeft, Search } from 'lucide-react'

export default function StockMovements() {
  const { stockMovements, fetchStockMovements, loading } = useInventoryStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    loadMovements()
  }, [typeFilter])

  const loadMovements = async () => {
    const filters = {}
    if (typeFilter !== 'all') filters.movement_type = typeFilter
    if (search) filters.search = search
    await fetchStockMovements(filters)
  }

  const getMovementIcon = (type) => {
    if (['purchase', 'return', 'transfer_in'].includes(type)) return MoveRight
    if (['sale', 'transfer_out', 'write_off', 'damage', 'job_usage'].includes(type)) return MoveLeft
    return RefreshCw
  }

  const getMovementColor = (type) => {
    if (!type) return 'text-slate-500 bg-slate-100'
    if (['purchase', 'return', 'transfer_in'].includes(type)) return 'text-emerald-600 bg-emerald-100'
    if (['sale', 'transfer_out', 'write_off', 'damage', 'job_usage'].includes(type)) return 'text-red-600 bg-red-100'
    return 'text-slate-500 bg-slate-100'
  }

  const formatDateTime = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

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
          <Link to="/inventory" className="text-slate-500 hover:text-emerald-600">Inventory</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Stock Movements</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-600" />Stock Movements
          </h1>
          <p className="text-slate-500 mt-1">{stockMovements.length} movements recorded</p>
        </motion.div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" onKeyDown={(e) => e.key === 'Enter' && loadMovements()} />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Types</option>
            <option value="purchase">Purchase</option>
            <option value="sale">Sale</option>
            <option value="transfer_in">Transfer In</option>
            <option value="transfer_out">Transfer Out</option>
            <option value="job_usage">Job Usage</option>
            <option value="adjustment">Adjustment</option>
            <option value="write_off">Write Off</option>
            <option value="damage">Damage</option>
          </select>
          <button onClick={loadMovements} className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white">Search</button>
        </div>

        {/* Movements Table */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : stockMovements.length === 0 ? (
          <div className="text-center py-12 neu-raised rounded-3xl">
            <RefreshCw className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No movements found</p>
          </div>
        ) : (
          <div className="neu-raised rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Type</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Item</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Quantity</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Value</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Reference</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMovements.map((movement) => {
                    const Icon = getMovementIcon(movement.movement_type)
                    return (
                      <tr key={movement.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getMovementColor(movement.movement_type)}`}>
                            <Icon className="w-3 h-3" />
                            {movement.movement_type?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800 dark:text-white text-sm">{movement.inventory_items?.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{movement.inventory_items?.item_code}</p>
                        </td>
                        <td className={`py-3 px-4 font-bold ${movement.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {movement.quantity > 0 ? '+' : ''}{movement.quantity} {movement.inventory_items?.unit || ''}
                        </td>
                        <td className="py-3 px-4">{formatCurrency(Math.abs(movement.total_value || (movement.quantity * movement.unit_cost)))}</td>
                        <td className="py-3 px-4 text-slate-600 text-xs">{movement.reference_number || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-500 text-xs">{formatDateTime(movement.created_at || movement.movement_date)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
