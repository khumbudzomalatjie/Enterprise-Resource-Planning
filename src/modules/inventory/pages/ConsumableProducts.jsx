import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Package, Search, Download, ChevronDown, ChevronUp,
  ChevronRight, Sun, Moon, Sparkles, Edit, Trash2,
  AlertTriangle, CheckCircle2, Plus, RefreshCw,
  FileSpreadsheet, Beaker, Shield, HardHat, ShoppingCart
} from 'lucide-react'

export default function ConsumableProducts() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryTab, setCategoryTab] = useState('all') // 'all' | 'chemicals' | 'ppe' | 'equipment'
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [selectedRows, setSelectedRows] = useState([])

  useEffect(() => {
    loadProducts()
  }, [categoryTab])

  const loadProducts = async () => {
    setLoading(true)
    
    let query = supabase
      .from('inventory_items')
      .select('*, item_categories(name, color), suppliers(company_name)')
      .eq('is_consumable', true)
      .order('name')

    // Filter by category
    if (categoryTab === 'chemicals') {
      query = query.eq('category_id', await getCategoryId('Cleaning Chemicals'))
    } else if (categoryTab === 'ppe') {
      query = query.eq('category_id', await getCategoryId('PPE & Safety'))
    } else if (categoryTab === 'equipment') {
      query = query.eq('category_id', await getCategoryId('Cleaning Equipment'))
    }

    const { data, error } = await query
    
    if (!error) {
      setProducts(data || [])
    } else {
      console.error('Error loading products:', error)
      toast.error('Failed to load products')
    }
    
    setLoading(false)
  }

  const getCategoryId = async (name) => {
    const { data } = await supabase.from('item_categories').select('id').eq('name', name).single()
    return data?.id || null
  }

  // Search filter
  const filteredProducts = products.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return (p.name || '').toLowerCase().includes(s) ||
           (p.item_code || '').toLowerCase().includes(s) ||
           (p.item_categories?.name || '').toLowerCase().includes(s) ||
           (p.suppliers?.company_name || '').toLowerCase().includes(s)
  })

  // Sort
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let valA, valB
    switch (sortField) {
      case 'name': valA = a.name || ''; valB = b.name || ''; break
      case 'category': valA = a.item_categories?.name || ''; valB = b.item_categories?.name || ''; break
      case 'stock': valA = a.current_stock || 0; valB = b.current_stock || 0; break
      case 'supplier': valA = a.suppliers?.company_name || ''; valB = b.suppliers?.company_name || ''; break
      default: valA = a.name || ''; valB = b.name || ''
    }
    if (typeof valA === 'string') return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    return sortDir === 'asc' ? valA - valB : valB - valA
  })

  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  const getStockStatus = (product) => {
    if (product.current_stock <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' }
    if (product.current_stock <= product.reorder_point) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' }
    return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' }
  }

  const toggleSelectAll = () => {
    if (selectedRows.length === sortedProducts.length) setSelectedRows([])
    else setSelectedRows(sortedProducts.map(p => p.id))
  }

  const toggleSelectRow = (id) => {
    if (selectedRows.includes(id)) setSelectedRows(selectedRows.filter(r => r !== id))
    else setSelectedRows([...selectedRows, id])
  }

  const exportToExcel = () => {
    const dataToExport = selectedRows.length > 0 
      ? sortedProducts.filter(p => selectedRows.includes(p.id))
      : sortedProducts

    const rows = dataToExport.map(p => ({
      'Item Name': p.name || '',
      'Category': p.item_categories?.name || 'N/A',
      'Quantity': p.current_stock || 0,
      'Supplier': p.suppliers?.company_name || 'N/A',
      'Unit': p.unit || '',
      'Min Stock': p.minimum_stock || 0,
      'Purchase Price': p.unit_cost || 0,
      'Status': getStockStatus(p).label,
      'Item Code': p.item_code || ''
    }))

    const csv = [
      Object.keys(rows[0] || {}).join('\t'),
      ...rows.map(r => Object.values(r).join('\t'))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Consumable_Products_${new Date().toISOString().split('T')[0]}.xls`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} products to Excel`)
  }

  const stats = {
    chemicals: products.filter(p => p.item_categories?.name === 'Cleaning Chemicals').length,
    ppe: products.filter(p => p.item_categories?.name === 'PPE & Safety').length,
    equipment: products.filter(p => p.item_categories?.name === 'Cleaning Equipment').length,
    total: products.length
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
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/inventory" className="text-slate-500 hover:text-emerald-600">Inventory</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Consumable Products</span>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-emerald-600" />Consumable Products
            </h1>
            <p className="text-slate-500 mt-1">
              {stats.total} products • Chemicals, PPE & equipment used on jobs
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={loadProducts} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2 text-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={exportToExcel} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm">
              <FileSpreadsheet className="w-4 h-4" /> Export to Excel
            </button>
            <button onClick={() => navigate('/inventory/items/new')} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'all', label: 'All Products', icon: Package, count: stats.total, color: 'bg-slate-500' },
            { id: 'chemicals', label: 'Chemicals', icon: Beaker, count: stats.chemicals, color: 'bg-blue-500' },
            { id: 'ppe', label: 'PPE & Safety', icon: Shield, count: stats.ppe, color: 'bg-red-500' },
            { id: 'equipment', label: 'Equipment', icon: HardHat, count: stats.equipment, color: 'bg-amber-500' },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setCategoryTab(tab.id); setSelectedRows([]) }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                categoryTab === tab.id 
                  ? 'bg-emerald-600 text-white shadow-lg' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}>
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${categoryTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by item name, code, category, or supplier..."
              className="w-full pl-10 pr-4 py-2.5 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300" />
          </div>
        </div>

        {/* Products Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl overflow-hidden">
          {loading ? (
            <div className="text-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div><p className="text-slate-500 mt-3">Loading products...</p></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                      <th className="py-4 px-4 w-10">
                        <input type="checkbox" checked={selectedRows.length === sortedProducts.length && sortedProducts.length > 0}
                          onChange={toggleSelectAll} className="w-4 h-4 rounded" />
                      </th>
                      <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider py-4 px-4 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">Item Name {getSortIcon('name')}</div>
                      </th>
                      <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider py-4 px-4 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('category')}>
                        <div className="flex items-center gap-1">Category {getSortIcon('category')}</div>
                      </th>
                      <th className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider py-4 px-4 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('stock')}>
                        <div className="flex items-center gap-1 justify-center">Quantity {getSortIcon('stock')}</div>
                      </th>
                      <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider py-4 px-4 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('supplier')}>
                        <div className="flex items-center gap-1">Supplier {getSortIcon('supplier')}</div>
                      </th>
                      <th className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider py-4 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-16">
                          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500 text-lg">No products found</p>
                          <p className="text-slate-400 text-sm">Try adjusting your search or category filter</p>
                        </td>
                      </tr>
                    ) : (
                      sortedProducts.map((product, i) => {
                        const status = getStockStatus(product)
                        return (
                          <tr key={product.id} 
                            className={`border-b border-slate-100 dark:border-slate-700/50 transition-all hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5 ${
                              selectedRows.includes(product.id) ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''
                            }`}>
                            <td className="py-4 px-4">
                              <input type="checkbox" checked={selectedRows.includes(product.id)}
                                onChange={() => toggleSelectRow(product.id)} className="w-4 h-4 rounded" />
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot}`}></div>
                                <div>
                                  <p className="font-semibold text-sm text-slate-800 dark:text-white">{product.name}</p>
                                  <p className="text-xs text-slate-400 font-mono">{product.item_code}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              {product.item_categories && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                                  style={{ backgroundColor: (product.item_categories.color || '#10b981') + '15', color: product.item_categories.color || '#10b981' }}>
                                  {product.item_categories.name === 'Cleaning Chemicals' && <Beaker className="w-3 h-3" />}
                                  {product.item_categories.name === 'PPE & Safety' && <Shield className="w-3 h-3" />}
                                  {product.item_categories.name === 'Cleaning Equipment' && <HardHat className="w-3 h-3" />}
                                  {product.item_categories.name}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div>
                                <span className={`text-lg font-bold ${
                                  product.current_stock <= 0 ? 'text-red-600' : 
                                  product.current_stock <= product.reorder_point ? 'text-amber-600' : 
                                  'text-emerald-600'
                                }`}>
                                  {product.current_stock}
                                </span>
                                <span className="text-xs text-slate-400 ml-1">{product.unit}</span>
                              </div>
                              {product.current_stock <= product.reorder_point && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${status.color}`}>
                                  {status.label}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  {product.suppliers?.company_name || 'No supplier'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => navigate(`/inventory/items/${product.id}`)} 
                                  className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 transition-colors" title="Edit">
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <p className="text-sm text-slate-500">
                  {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''} • 
                  {selectedRows.length > 0 && <span className="text-emerald-600 font-medium"> {selectedRows.length} selected</span>}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>🟢 In Stock</span>
                  <span>🟡 Low Stock</span>
                  <span>🔴 Out of Stock</span>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  )
}
