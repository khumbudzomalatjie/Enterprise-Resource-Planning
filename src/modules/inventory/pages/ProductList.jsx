import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Search, Edit, ChevronRight, 
  Sun, Moon, Sparkles, Package, AlertTriangle, Wrench
} from 'lucide-react'

export default function ProductList() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadProducts() }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*, item_categories(name)')
        .order('name', { ascending: true })

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error('Error loading products:', err)
    }
    setLoading(false)
  }

  const filteredProducts = products.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return (p.name || '').toLowerCase().includes(s) || (p.item_code || '').toLowerCase().includes(s)
  })

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A'
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
  }

  const getStockStatus = (item) => {
    if (item.current_stock <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700' }
    if (item.current_stock <= item.reorder_point) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700' }
    return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-700' }
  }

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
          <Link to="/inventory" className="text-slate-500 hover:text-emerald-600">Inventory</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Consumable Products</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Wrench className="w-8 h-8 text-emerald-600" />Consumable Products
            </h1>
            <p className="text-slate-500 mt-1">{products.length} products • Chemicals, PPE & equipment used on jobs</p>
          </div>
          <button onClick={() => navigate('/inventory/products')} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-slate-600 text-white flex items-center gap-2 text-sm">
            <Package className="w-5 h-5" /><span>View Stock Items</span>
          </button>
        </motion.div>

        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 neu-raised rounded-3xl">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No products found</p>
            <p className="text-slate-400 text-sm mt-1">Products will appear here when added to inventory</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product, i) => {
              const stock = getStockStatus(product)
              return (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="neu-raised rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">{product.name}</h3>
                      <p className="text-xs text-slate-500">{product.item_code}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${stock.color}`}>{stock.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div><span className="text-slate-500">Category:</span> {product.item_categories?.name || 'N/A'}</div>
                    <div><span className="text-slate-500">Stock:</span> <span className="font-medium">{product.current_stock} {product.unit}</span></div>
                    <div><span className="text-slate-500">Cost:</span> {formatCurrency(product.unit_cost)}</div>
                    <div><span className="text-slate-500">Reorder:</span> {product.reorder_point}</div>
                  </div>
                  {product.current_stock <= product.reorder_point && (
                    <div className="mb-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 flex items-center gap-2 text-xs text-amber-700">
                      <AlertTriangle className="w-3 h-3" /> Below reorder level
                    </div>
                  )}
                  <button onClick={() => navigate(`/inventory/items/${product.id}`)} className="w-full py-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium flex items-center justify-center gap-1">
                    <Edit className="w-4 h-4" /> View / Edit
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
