import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useInventoryStore from '../store/inventoryStore'
import useThemeStore from '../../../store/themeStore'
import { Search, Package, Plus, Filter, ChevronRight } from 'lucide-react'

export default function StockList() {
  const { items, fetchItems, fetchCategories, categories, loading } = useInventoryStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchCategories()
    loadItems()
  }, [categoryFilter, statusFilter])

  const loadItems = async () => {
    const filters = {}
    if (categoryFilter !== 'all') filters.category_id = categoryFilter
    if (statusFilter !== 'all') filters.status = statusFilter
    if (search) filters.search = search
    await fetchItems(filters)
  }

  const getStockStatus = (item) => {
    if (item.current_stock <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700' }
    if (item.current_stock <= item.reorder_point) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700' }
    if (item.current_stock <= item.minimum_stock) return { label: 'Below Min', color: 'bg-orange-100 text-orange-700' }
    return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-700' }
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/inventory" className="text-slate-500 hover:text-emerald-600">Inventory</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Stock List</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><Package className="w-8 h-8 text-emerald-600" />Stock List</h1>
            <p className="text-slate-500 mt-1">{items.length} items in inventory</p>
          </div>
          <button onClick={() => navigate('/inventory/items/new')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-5 h-5" /><span>Add Item</span>
          </button>
        </motion.div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" onKeyDown={(e) => e.key === 'Enter' && loadItems()} />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="discontinued">Discontinued</option>
          </select>
          <button onClick={loadItems} className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">Search</button>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div><p className="text-slate-500">Loading items...</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, i) => {
              const stockStatus = getStockStatus(item)
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  onClick={() => navigate(`/inventory/items/${item.id}`)}
                  className="neu-raised rounded-2xl p-5 stat-card cursor-pointer hover:scale-[1.02]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Package className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 dark:text-white">{item.name}</h3>
                        <p className="text-xs text-slate-500">{item.item_code}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${stockStatus.color}`}>{stockStatus.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-500">Stock:</span> <span className="font-medium text-slate-800 dark:text-white">{item.current_stock} {item.unit}</span></div>
                    <div><span className="text-slate-500">Category:</span> <span style={{color: item.item_categories?.color}}>{item.item_categories?.name}</span></div>
                    <div><span className="text-slate-500">Cost:</span> <span className="font-medium">{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(item.unit_cost)}</span></div>
                    <div><span className="text-slate-500">Warehouse:</span> <span>{item.warehouses?.name || 'N/A'}</span></div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
