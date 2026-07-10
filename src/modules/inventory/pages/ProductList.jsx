import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Search, Plus, Edit, Trash2, ChevronRight, 
  Sun, Moon, Sparkles, Package, AlertTriangle, 
  Wrench, RefreshCw, Save, X
} from 'lucide-react'

export default function ProductList() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Add/Edit state
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', category_id: '', unit: 'each',
    unit_cost: 0, unit_price: 0, minimum_stock: 0, reorder_point: 10,
    reorder_quantity: 50, current_stock: 0
  })

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

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
      toast.error('Failed to load products')
    }
    setLoading(false)
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('item_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error loading categories:', err)
    }
  }

  const filteredProducts = products.filter(p => {
    if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return (p.name || '').toLowerCase().includes(s) || (p.item_code || '').toLowerCase().includes(s)
    }
    return true
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

  const openAddModal = () => {
    setEditingProduct(null)
    setForm({ name: '', description: '', category_id: categories[0]?.id || '', unit: 'each', unit_cost: 0, unit_price: 0, minimum_stock: 0, reorder_point: 10, reorder_quantity: 50, current_stock: 0 })
    setShowAddModal(true)
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setForm({
      name: product.name || '',
      description: product.description || '',
      category_id: product.category_id || '',
      unit: product.unit || 'each',
      unit_cost: product.unit_cost || 0,
      unit_price: product.unit_price || 0,
      minimum_stock: product.minimum_stock || 0,
      reorder_point: product.reorder_point || 10,
      reorder_quantity: product.reorder_quantity || 50,
      current_stock: product.current_stock || 0
    })
    setShowAddModal(true)
  }

  const handleSave = async () => {
    if (!form.name) { toast.error('Product name is required'); return }
    setSaving(true)
    try {
      if (editingProduct) {
        // Update existing
        const { error } = await supabase
          .from('inventory_items')
          .update({
            name: form.name, description: form.description,
            category_id: form.category_id || null,
            unit: form.unit, unit_cost: form.unit_cost,
            unit_price: form.unit_price, minimum_stock: form.minimum_stock,
            reorder_point: form.reorder_point, reorder_quantity: form.reorder_quantity,
            current_stock: form.current_stock, updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id)
        if (error) throw error
        toast.success('Product updated!')
      } else {
        // Insert new
        const { error } = await supabase
          .from('inventory_items')
          .insert([{
            name: form.name, description: form.description,
            category_id: form.category_id || null,
            unit: form.unit, unit_cost: form.unit_cost,
            unit_price: form.unit_price, minimum_stock: form.minimum_stock,
            reorder_point: form.reorder_point, reorder_quantity: form.reorder_quantity,
            current_stock: form.current_stock, is_consumable: true,
            status: 'active'
          }])
        if (error) throw error
        toast.success('Product added!')
      }
      setShowAddModal(false)
      loadProducts()
    } catch (err) {
      toast.error('Failed to save: ' + err.message)
    }
    setSaving(false)
  }

  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Delete "${productName}"?`)) return
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ status: 'discontinued' })
        .eq('id', productId)
      if (error) throw error
      toast.success(`"${productName}" removed`)
      loadProducts()
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const units = ['each', 'box', 'bottle', 'pack', 'litre', 'kg', 'roll', 'pair', 'set']

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
          <div className="flex gap-2">
            <button onClick={loadProducts} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-slate-600 text-white flex items-center gap-2 text-sm">
              <RefreshCw className="w-5 h-5" /><span>Refresh</span>
            </button>
            <button onClick={openAddModal} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-emerald-600 text-white flex items-center gap-2 text-sm">
              <Plus className="w-5 h-5" /><span>Add Product</span>
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 neu-raised rounded-3xl">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No products found</p>
            <button onClick={openAddModal} className="mt-4 neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white">
              <Plus className="w-5 h-5 inline mr-2" />Add First Product
            </button>
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
                  <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={() => openEditModal(product)} className="flex-1 py-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium flex items-center justify-center gap-1">
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={() => handleDelete(product.id, product.name)} className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowAddModal(false)}>
            <div className="neu-raised rounded-3xl p-6 max-w-lg w-full bg-white dark:bg-slate-800 my-8" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Product Name *" className="w-full p-3 neu-inset rounded-xl" />
                <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Description" rows={2} className="w-full p-3 neu-inset rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={form.category_id} onChange={(e) => setForm({...form, category_id: e.target.value})} className="p-3 neu-inset rounded-xl">
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} className="p-3 neu-inset rounded-xl">
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Unit Cost (ZAR)</label>
                    <input type="number" value={form.unit_cost} onChange={(e) => setForm({...form, unit_cost: parseFloat(e.target.value) || 0})} className="w-full p-3 neu-inset rounded-xl mt-1" step="0.01" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Current Stock</label>
                    <input type="number" value={form.current_stock} onChange={(e) => setForm({...form, current_stock: parseInt(e.target.value) || 0})} className="w-full p-3 neu-inset rounded-xl mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Min Stock</label>
                    <input type="number" value={form.minimum_stock} onChange={(e) => setForm({...form, minimum_stock: parseInt(e.target.value) || 0})} className="w-full p-3 neu-inset rounded-xl mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Reorder Point</label>
                    <input type="number" value={form.reorder_point} onChange={(e) => setForm({...form, reorder_point: parseInt(e.target.value) || 0})} className="w-full p-3 neu-inset rounded-xl mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Reorder Qty</label>
                    <input type="number" value={form.reorder_quantity} onChange={(e) => setForm({...form, reorder_quantity: parseInt(e.target.value) || 0})} className="w-full p-3 neu-inset rounded-xl mt-1" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddModal(false)} className="flex-1 neu-raised neu-btn py-3 rounded-xl bg-slate-600 text-white flex items-center justify-center gap-2">
                  <X className="w-5 h-5" /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-1 neu-raised neu-btn py-3 rounded-xl bg-emerald-600 text-white disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" /> {saving ? 'Saving...' : editingProduct ? 'Update' : 'Add Product'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
