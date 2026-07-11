import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Package, Search, Filter, Download, ChevronDown, ChevronUp,
  ChevronRight, ArrowLeft, Sun, Moon, Sparkles, Edit, Trash2,
  AlertTriangle, CheckCircle2, XCircle, Plus, MoreVertical,
  FileSpreadsheet, FileText, Printer, RefreshCw, ShoppingCart,
  DollarSign, TrendingDown, BarChart3, Layers, Truck
} from 'lucide-react'

export default function ConsumableProducts() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categories, setCategories] = useState([])
  const [selectedRows, setSelectedRows] = useState([])
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [summary, setSummary] = useState({ total: 0, categories: 0, lowStock: 0, outOfStock: 0, totalValue: 0 })
  const ITEMS_PER_PAGE = 25

  useEffect(() => {
    loadData()
  }, [categoryFilter, statusFilter])

  const loadData = async () => {
    setLoading(true)
    
    let query = supabase.from('inventory_items').select('*, item_categories(name, color), suppliers(company_name)', { count: 'exact' }).eq('is_consumable', true)
    
    if (categoryFilter !== 'all') query = query.eq('category_id', categoryFilter)
    
    const { data, count, error } = await query.order('name')
    
    if (!error) {
      let filtered = data || []
      
      // Status filter
      if (statusFilter === 'low_stock') filtered = filtered.filter(p => p.current_stock <= p.reorder_point && p.current_stock > 0)
      if (statusFilter === 'out_of_stock') filtered = filtered.filter(p => p.current_stock <= 0)
      if (statusFilter === 'in_stock') filtered = filtered.filter(p => p.current_stock > p.reorder_point)
      
      setProducts(filtered)
      
      // Calculate summary
      const cats = [...new Set(filtered.map(p => p.category_id))]
      setSummary({
        total: filtered.length,
        categories: cats.length,
        lowStock: filtered.filter(p => p.current_stock <= p.reorder_point && p.current_stock > 0).length,
        outOfStock: filtered.filter(p => p.current_stock <= 0).length,
        totalValue: filtered.reduce((sum, p) => sum + ((p.current_stock || 0) * (p.unit_cost || 0)), 0)
      })
    }
    
    // Load categories
    const { data: cats } = await supabase.from('item_categories').select('*').eq('is_active', true).order('name')
    setCategories(cats || [])
    
    setLoading(false)
  }

  // Search
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
      case 'code': valA = a.item_code || ''; valB = b.item_code || ''; break
      case 'category': valA = a.item_categories?.name || ''; valB = b.item_categories?.name || ''; break
      case 'stock': valA = a.current_stock || 0; valB = b.current_stock || 0; break
      case 'supplier': valA = a.suppliers?.company_name || ''; valB = b.suppliers?.company_name || ''; break
      case 'price': valA = a.unit_cost || 0; valB = b.unit_cost || 0; break
      case 'status': valA = a.current_stock <= 0 ? 0 : a.current_stock <= a.reorder_point ? 1 : 2; valB = b.current_stock <= 0 ? 0 : b.current_stock <= b.reorder_point ? 1 : 2; break
      case 'updated': valA = a.updated_at || ''; valB = b.updated_at || ''; break
      default: valA = a.name || ''; valB = b.name || ''
    }
    if (typeof valA === 'string') return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    return sortDir === 'asc' ? valA - valB : valB - valA
  })

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE)
  const paginatedProducts = sortedProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handleSort = (field) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  const getStockStatus = (product) => {
    if (product.current_stock <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle }
    if (product.current_stock <= product.reorder_point) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertTriangle }
    return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 }
  }

  const toggleSelectAll = () => {
    if (selectedRows.length === paginatedProducts.length) setSelectedRows([])
    else setSelectedRows(paginatedProducts.map(p => p.id))
  }

  const toggleSelectRow = (id) => {
    if (selectedRows.includes(id)) setSelectedRows(selectedRows.filter(r => r !== id))
    else setSelectedRows([...selectedRows, id])
  }

  const exportData = async (format) => {
    const data = sortedProducts.map(p => ({
      'Product Code': p.item_code,
      'Product Name': p.name,
      'Category': p.item_categories?.name || 'N/A',
      'Quantity': p.current_stock,
      'Unit': p.unit,
      'Min Stock': p.minimum_stock,
      'Supplier': p.suppliers?.company_name || 'N/A',
      'Purchase Price': p.unit_cost,
      'Selling Price': p.selling_price || '',
      'Status': getStockStatus(p).label,
      'Last Updated': p.updated_at ? new Date(p.updated_at).toLocaleDateString() : 'N/A'
    }))

    if (format === 'csv') {
      const csv = [Object.keys(data[0]).join(','), ...data.map(r => Object.values(r).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `Consumable_Products_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    } else {
      // Excel format
      const csv = [Object.keys(data[0]).join('\t'), ...data.map(r => Object.values(r).join('\t'))].join('\n')
      const blob = new Blob([csv], { type: 'application/vnd.ms-excel' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `Consumable_Products_${new Date().toISOString().split('T')[0]}.xls`; a.click()
    }
    setShowExportMenu(false)
    toast.success(`Exported as ${format.toUpperCase()}`)
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
            <p className="text-slate-500 mt-1">{summary.total} products across {summary.categories} categories</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => loadData()} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2 text-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <div className="relative">
              <button onClick={() => setShowExportMenu(!showExportMenu)} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> Export
              </button>
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 mt-2 w-48 neu-raised rounded-xl p-2 bg-white dark:bg-slate-800 z-40 shadow-xl">
                    <button onClick={() => exportData('excel')} className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-sm flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel (.xlsx)</button>
                    <button onClick={() => exportData('csv')} className="w-full text-left px-4 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" /> CSV</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {selectedRows.length > 0 && (
              <div className="relative">
                <button onClick={() => setShowBulkMenu(!showBulkMenu)} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2 text-sm">
                  <Layers className="w-4 h-4" /> Bulk ({selectedRows.length})
                </button>
              </div>
            )}
            <button onClick={() => navigate('/inventory/items/new')} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { icon: Package, label: 'Total Products', value: summary.total, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
            { icon: Layers, label: 'Categories', value: summary.categories, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
            { icon: AlertTriangle, label: 'Low Stock', value: summary.lowStock, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
            { icon: TrendingDown, label: 'Out of Stock', value: summary.outOfStock, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
            { icon: DollarSign, label: 'Total Value', value: formatCurrency(summary.totalValue), color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
              className="neu-raised rounded-2xl p-4">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}><card.icon className={`w-5 h-5 ${card.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white truncate">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1">{card.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                placeholder="Search by product name, code, category, or supplier..."
                className="w-full pl-10 pr-4 py-2.5 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300" />
            </div>
            <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1) }} className="px-3 py-2.5 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300">
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1) }} className="px-3 py-2.5 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300">
              <option value="all">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl overflow-hidden">
          {loading ? (
            <div className="text-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-4">
                        <input type="checkbox" checked={selectedRows.length === paginatedProducts.length && paginatedProducts.length > 0}
                          onChange={toggleSelectAll} className="w-4 h-4 rounded" />
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-3 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('code')}>
                        <div className="flex items-center gap-1">Code {getSortIcon('code')}</div>
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-3 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">Product Name {getSortIcon('name')}</div>
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-3 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('category')}>
                        <div className="flex items-center gap-1">Category {getSortIcon('category')}</div>
                      </th>
                      <th className="text-right text-xs font-semibold text-slate-500 uppercase py-3 px-3 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('stock')}>
                        <div className="flex items-center gap-1 justify-end">Qty {getSortIcon('stock')}</div>
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-3">Unit</th>
                      <th className="text-right text-xs font-semibold text-slate-500 uppercase py-3 px-3">Min Stock</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-3 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('supplier')}>
                        <div className="flex items-center gap-1">Supplier {getSortIcon('supplier')}</div>
                      </th>
                      <th className="text-right text-xs font-semibold text-slate-500 uppercase py-3 px-3 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('price')}>
                        <div className="flex items-center gap-1 justify-end">Price {getSortIcon('price')}</div>
                      </th>
                      <th className="text-center text-xs font-semibold text-slate-500 uppercase py-3 px-3 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('status')}>
                        <div className="flex items-center gap-1 justify-center">Status {getSortIcon('status')}</div>
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase py-3 px-3 cursor-pointer hover:text-emerald-600" onClick={() => handleSort('updated')}>
                        <div className="flex items-center gap-1">Updated {getSortIcon('updated')}</div>
                      </th>
                      <th className="text-right text-xs font-semibold text-slate-500 uppercase py-3 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((product, i) => {
                      const status = getStockStatus(product)
                      const StatusIcon = status.icon
                      return (
                        <tr key={product.id} 
                          className={`border-b border-slate-100 dark:border-slate-700/50 transition-colors ${
                            i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'
                          } hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10`}>
                          <td className="py-3 px-4">
                            <input type="checkbox" checked={selectedRows.includes(product.id)}
                              onChange={() => toggleSelectRow(product.id)} className="w-4 h-4 rounded" />
                          </td>
                          <td className="py-3 px-3 text-sm font-mono text-slate-600 dark:text-slate-400">{product.item_code}</td>
                          <td className="py-3 px-3">
                            <p className="font-medium text-sm text-slate-800 dark:text-white">{product.name}</p>
                            {product.description && <p className="text-xs text-slate-500 truncate max-w-[200px]">{product.description}</p>}
                          </td>
                          <td className="py-3 px-3">
                            {product.item_categories && (
                              <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: (product.item_categories.color || '#10b981') + '20', color: product.item_categories.color || '#10b981' }}>
                                {product.item_categories.name}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`font-bold text-sm ${product.current_stock <= 0 ? 'text-red-600' : product.current_stock <= product.reorder_point ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {product.current_stock}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-sm text-slate-500">{product.unit}</td>
                          <td className="py-3 px-3 text-right text-sm text-slate-500">{product.minimum_stock}</td>
                          <td className="py-3 px-3 text-sm text-slate-600 dark:text-slate-400">
                            {product.suppliers?.company_name || 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                            {formatCurrency(product.unit_cost)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              <StatusIcon className="w-3 h-3" /> {status.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-500">
                            {product.updated_at ? new Date(product.updated_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => navigate(`/inventory/items/${product.id}`)} className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500">Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, sortedProducts.length)} of {sortedProducts.length}</p>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const page = i + 1
                      return (
                        <button key={page} onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                            currentPage === page ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}>{page}</button>
                      )
                    })}
                  </div>
                </div>
              )}

              {sortedProducts.length === 0 && (
                <div className="text-center py-16">
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">No products found</p>
                  <p className="text-slate-400 text-sm">Try adjusting your filters</p>
                </div>
              )}
            </>
          )}
        </motion.div>
      </main>
    </div>
  )
}
