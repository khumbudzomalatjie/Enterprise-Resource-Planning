import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useInventoryStore from '../store/inventoryStore'
import useThemeStore from '../../../store/themeStore'
import { 
  Package, AlertTriangle, ShoppingCart, 
  TrendingDown, DollarSign, BarChart3, Plus,
  ArrowDown, ArrowUp, Truck, Clock,
  Sparkles, Sun, Moon, ChevronRight, ArrowLeft,
  Wrench, Briefcase, Tag
} from 'lucide-react'

export default function InventoryDashboard() {
  const { stats, fetchInventoryStats, fetchItems, fetchStockMovements } = useInventoryStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [lowStockItems, setLowStockItems] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await fetchInventoryStats()
    const result = await fetchItems({ low_stock: true })
    if (result.success) setLowStockItems(result.data.slice(0, 5))
    await fetchStockMovements()
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  const statCards = [
    { icon: Package, label: 'Total Items', value: stats.totalItems || 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: AlertTriangle, label: 'Low Stock', value: stats.lowStockItems || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { icon: TrendingDown, label: 'Out of Stock', value: stats.outOfStockItems || 0, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { icon: ShoppingCart, label: 'Suppliers', value: stats.totalSuppliers || 0, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: DollarSign, label: 'Stock Value', value: formatCurrency(stats.totalStockValue), color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: Truck, label: 'Expiring Soon', value: stats.expiringBatches?.length || 0, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  ]

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
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Main Dashboard</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Inventory Management</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">Stock control, services pricing, products, and suppliers</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => navigate('/inventory/stock-in')} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm">
              <ArrowDown className="w-5 h-5" /><span>Stock In</span>
            </button>
            <button onClick={() => navigate('/inventory/stock-out')} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 text-sm">
              <ArrowUp className="w-5 h-5" /><span>Stock Out</span>
            </button>
            <button onClick={() => navigate('/inventory/items/new')} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm">
              <Plus className="w-5 h-5" /><span>New Item</span>
            </button>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════ */}
        {/* SERVICES & PRODUCTS QUICK ACCESS CARDS    */}
        {/* ═══════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Services Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            onClick={() => navigate('/inventory/services')}
            className="neu-raised rounded-3xl p-8 cursor-pointer hover:scale-[1.02] transition-transform text-center border-l-4 border-emerald-500">
            <div className="w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Services & Pricing</h2>
            <p className="text-slate-500 mb-4">Manage cleaning services, prices & quotations</p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700">22 Services</span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">View & Edit</span>
            </div>
            <div className="mt-4 flex gap-2 justify-center">
              <button onClick={(e) => { e.stopPropagation(); navigate('/inventory/services') }} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm">View All</button>
              <button onClick={(e) => { e.stopPropagation(); navigate('/inventory/services/new') }} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm">Add New</button>
            </div>
          </motion.div>

          {/* Products Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            onClick={() => navigate('/inventory/products')}
            className="neu-raised rounded-3xl p-8 cursor-pointer hover:scale-[1.02] transition-transform text-center border-l-4 border-blue-500">
            <div className="w-20 h-20 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Consumable Products</h2>
            <p className="text-slate-500 mb-4">Chemicals, PPE & equipment used on jobs</p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700">{stats.totalItems || 0} Items</span>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700">Track Stock</span>
            </div>
            <div className="mt-4 flex gap-2 justify-center">
              <button onClick={(e) => { e.stopPropagation(); navigate('/inventory/products') }} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm">View All</button>
              <button onClick={(e) => { e.stopPropagation(); navigate('/inventory/items') }} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white text-sm">Stock List</button>
            </div>
          </motion.div>
        </div>

        {/* Quick Links Row */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'All Services', icon: Briefcase, path: '/inventory/services' },
            { label: 'Add Service', icon: Plus, path: '/inventory/services/new' },
            { label: 'Products', icon: Package, path: '/inventory/products' },
            { label: 'Stock Items', icon: Tag, path: '/inventory/items' },
          ].map(action => (
            <button key={action.label} onClick={() => navigate(action.path)} className="neu-raised neu-btn rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-105 transition-transform">
              <action.icon className="w-6 h-6 text-emerald-600" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }} className="neu-raised rounded-2xl p-4 stat-card">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Low Stock & Movements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />Low Stock Alert
              </h2>
              <Link to="/inventory/products" className="text-sm text-emerald-600 flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link>
            </div>
            <div className="space-y-3">
              {lowStockItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 cursor-pointer" onClick={() => navigate(`/inventory/items/${item.id}`)}>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white text-sm">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.item_code} · {item.item_categories?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-600">{item.current_stock} {item.unit}</p>
                    <p className="text-xs text-slate-500">Reorder: {item.reorder_point}</p>
                  </div>
                </div>
              ))}
              {lowStockItems.length === 0 && <p className="text-center text-slate-500 py-4">No low stock items</p>}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />Recent Movements
              </h2>
              <Link to="/inventory/movements" className="text-sm text-emerald-600 flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link>
            </div>
            <div className="space-y-2">
              {stats.recentMovements?.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/30 text-sm">
                  <div className="flex items-center gap-2">
                    {m.movement_type === 'purchase' || m.movement_type === 'return' || m.movement_type === 'transfer_in' ? 
                      <ArrowDown className="w-4 h-4 text-emerald-600" /> : 
                      <ArrowUp className="w-4 h-4 text-red-600" />
                    }
                    <span className="text-slate-700 dark:text-slate-300">{m.inventory_items?.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-slate-800 dark:text-white">{m.quantity} {m.inventory_items?.unit}</span>
                    <span className="text-xs text-slate-500 ml-2">{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {(!stats.recentMovements || stats.recentMovements.length === 0) && (
                <p className="text-center text-slate-500 py-4">No recent movements</p>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
