import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Package, Search, Download, ChevronDown, ChevronUp,
  ChevronRight, Sun, Moon, Sparkles, Edit,
  AlertTriangle, CheckCircle2, Plus, RefreshCw,
  FileSpreadsheet, FileText, Beaker, Shield, HardHat, ShoppingCart
} from 'lucide-react'

export default function ConsumableProducts() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryTab, setCategoryTab] = useState('all')
  const [sortField, setSortField] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const [selectedRows, setSelectedRows] = useState([])
  const [showExportMenu, setShowExportMenu] = useState(false)

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

  const filteredProducts = products.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return (p.name || '').toLowerCase().includes(s) ||
           (p.item_code || '').toLowerCase().includes(s) ||
           (p.item_categories?.name || '').toLowerCase().includes(s) ||
           (p.suppliers?.company_name || '').toLowerCase().includes(s)
  })

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

  // Get base64 logo for Excel
  const getLogoBase64 = () => {
    // Try to get the logo from the page
    const logoImg = document.querySelector('img[src="/logo.png"]')
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      const canvas = document.createElement('canvas')
      canvas.width = logoImg.naturalWidth
      canvas.height = logoImg.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(logoImg, 0, 0)
      return canvas.toDataURL('image/png')
    }
    // Fallback: create a text-based logo
    return null
  }

  const exportToExcel = async () => {
    const dataToExport = selectedRows.length > 0 
      ? sortedProducts.filter(p => selectedRows.includes(p.id))
      : sortedProducts

    if (dataToExport.length === 0) {
      toast.error('No data to export')
      return
    }

    const today = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
    const categoryLabel = categoryTab === 'all' ? 'All Products' : categoryTab.charAt(0).toUpperCase() + categoryTab.slice(1)
    const logoBase64 = getLogoBase64()
    
    // Company info
    const companyName = 'NDANDULENI GROUP'
    const companyTagline = 'Professional Cleaning & Hygiene Services'
    const companyInfo = '123 Main Street, Johannesburg, 2000 | Tel: +27 11 234 5678 | info@ndanduleni.co.za'
    
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
        <x:Name>Consumable Products</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          @page { margin: 0.3cm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 10px; }
          
          /* Header with Logo */
          .report-header { 
            background: linear-gradient(135deg, #059669, #047857);
            color: white; 
            padding: 20px 25px; 
            border-radius: 10px 10px 0 0;
            display: flex;
            align-items: center;
            gap: 20px;
          }
          .report-header img { width: 70px; height: 70px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.3); object-fit: contain; background: white; padding: 5px; }
          .report-header .logo-placeholder {
            width: 70px; height: 70px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.3);
            background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center;
            font-size: 28px; font-weight: bold; color: white;
          }
          .report-header h1 { margin: 0; font-size: 22px; letter-spacing: 1px; }
          .report-header p { margin: 3px 0 0 0; font-size: 11px; opacity: 0.9; }
          
          /* Sub Header */
          .subheader { 
            background: #f0fdf4; 
            padding: 12px 25px; 
            border-left: 4px solid #059669; 
            border-right: 4px solid #059669;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: #374151;
          }
          .subheader .badge {
            background: #059669; color: white; padding: 3px 10px; border-radius: 12px;
            font-size: 10px; font-weight: 600;
          }
          
          /* Table */
          table { 
            border-collapse: collapse; 
            width: 100%; 
            font-size: 11px;
            border-left: 4px solid #059669;
            border-right: 4px solid #059669;
          }
          th { 
            background: #047857; 
            color: white; 
            padding: 11px 8px; 
            text-align: left; 
            font-weight: 600; 
            font-size: 10px; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
          }
          td { 
            padding: 9px 8px; 
            border-bottom: 1px solid #e5e7eb; 
          }
          tr:nth-child(even) { background: #f9fafb; }
          tr:hover { background: #ecfdf5; }
          
          /* Status Styles */
          .stock-in { color: #059669; font-weight: bold; }
          .stock-low { color: #d97706; font-weight: bold; }
          .stock-out { color: #dc2626; font-weight: bold; }
          
          /* Category Badges */
          .category-badge { 
            padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; 
            display: inline-block; white-space: nowrap;
          }
          .cat-chemicals { background: #dbeafe; color: #1d4ed8; }
          .cat-ppe { background: #fee2e2; color: #dc2626; }
          .cat-equipment { background: #fef3c7; color: #d97706; }
          
          .item-name { font-weight: 600; color: #1f2937; }
          .item-code { font-size: 10px; color: #9ca3af; font-family: 'Consolas', monospace; }
          
          /* Status Dots */
          .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
          .dot-green { background: #10b981; }
          .dot-amber { background: #f59e0b; }
          .dot-red { background: #ef4444; }
          
          /* Footer */
          .footer { 
            background: #f9fafb; 
            padding: 12px 25px; 
            border: 4px solid #059669;
            border-top: 3px solid #059669;
            border-radius: 0 0 10px 10px;
            font-size: 10px; 
            color: #6b7280; 
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .footer .stats { display: flex; gap: 15px; }
          .footer .stat-item { display: flex; align-items: center; gap: 5px; }
          .footer .stat-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
          
          .price-col { text-align: right; font-family: 'Consolas', monospace; }
          .qty-col { text-align: center; }
        </style>
      </head>
      <body>
        <!-- HEADER WITH LOGO -->
        <div class="report-header">
          ${logoBase64 
            ? `<img src="${logoBase64}" alt="Logo" />`
            : `<div class="logo-placeholder">NG</div>`
          }
          <div>
            <h1>${companyName}</h1>
            <p>${companyTagline}</p>
            <p style="font-size:10px;opacity:0.7">${companyInfo}</p>
          </div>
        </div>
        
        <!-- SUB HEADER -->
        <div class="subheader">
          <span>📋 <strong>Consumable Products Report</strong> — ${categoryLabel}</span>
          <span class="badge">${dataToExport.length} Products</span>
        </div>
        <div class="subheader" style="border-top:none;padding-top:5px;">
          <span>📅 Generated: <strong>${today}</strong></span>
          <span>🔍 Filters: <strong>${search || 'None'}</strong> | Sort: <strong>${sortField} (${sortDir})</strong></span>
        </div>
        
        <!-- TABLE -->
        <table>
          <thead>
            <tr>
              <th width="5%">#</th>
              <th width="12%">Item Code</th>
              <th width="22%">Item Name</th>
              <th width="14%">Category</th>
              <th width="8%" style="text-align:center">Qty</th>
              <th width="6%">Unit</th>
              <th width="7%" style="text-align:center">Min Stock</th>
              <th width="14%">Supplier</th>
              <th width="10%" style="text-align:right">Purchase Price</th>
              <th width="10%" style="text-align:right">Selling Price</th>
              <th width="10%">Status</th>
            </tr>
          </thead>
          <tbody>
    `

    dataToExport.forEach((p, i) => {
      const status = getStockStatus(p)
      const catClass = p.item_categories?.name === 'Cleaning Chemicals' ? 'cat-chemicals' : 
                       p.item_categories?.name === 'PPE & Safety' ? 'cat-ppe' : 
                       p.item_categories?.name === 'Cleaning Equipment' ? 'cat-equipment' : ''
      const stockClass = p.current_stock <= 0 ? 'stock-out' : p.current_stock <= p.reorder_point ? 'stock-low' : 'stock-in'
      const dotClass = p.current_stock <= 0 ? 'dot-red' : p.current_stock <= p.reorder_point ? 'dot-amber' : 'dot-green'
      const purchasePrice = p.unit_cost ? `R ${p.unit_cost.toFixed(2)}` : '—'
      const sellingPrice = p.selling_price ? `R ${p.selling_price.toFixed(2)}` : '—'
      
      html += `
        <tr>
          <td>${i + 1}</td>
          <td><span style="font-family:Consolas,monospace;font-size:10px;color:#6b7280">${p.item_code || 'N/A'}</span></td>
          <td>
            <div class="item-name">${p.name || 'Unnamed Product'}</div>
            ${p.description ? `<div style="font-size:9px;color:#9ca3af;margin-top:1px">${p.description.substring(0, 60)}</div>` : ''}
          </td>
          <td><span class="category-badge ${catClass}">${p.item_categories?.name || 'Uncategorized'}</span></td>
          <td class="${stockClass} qty-col">${p.current_stock || 0}</td>
          <td>${p.unit || 'unit'}</td>
          <td class="qty-col">${p.minimum_stock || 0}</td>
          <td>${p.suppliers?.company_name || '<span style="color:#9ca3af">No supplier</span>'}</td>
          <td class="price-col">${purchasePrice}</td>
          <td class="price-col">${sellingPrice}</td>
          <td><span class="status-dot ${dotClass}"></span>${status.label}</td>
        </tr>
      `
    })

    // Summary calculations
    const inStock = dataToExport.filter(p => p.current_stock > (p.reorder_point || 10)).length
    const lowStock = dataToExport.filter(p => p.current_stock <= (p.reorder_point || 10) && p.current_stock > 0).length
    const outOfStock = dataToExport.filter(p => p.current_stock <= 0).length
    const totalValue = dataToExport.reduce((sum, p) => sum + ((p.current_stock || 0) * (p.unit_cost || 0)), 0)

    html += `
          </tbody>
        </table>
        
        <!-- FOOTER -->
        <div class="footer">
          <div class="stats">
            <span class="stat-item"><span class="stat-dot" style="background:#10b981"></span> In Stock: <strong>${inStock}</strong></span>
            <span class="stat-item"><span class="stat-dot" style="background:#f59e0b"></span> Low Stock: <strong>${lowStock}</strong></span>
            <span class="stat-item"><span class="stat-dot" style="background:#ef4444"></span> Out of Stock: <strong>${outOfStock}</strong></span>
          </div>
          <div style="text-align:right">
            <strong>Total Inventory Value: R ${totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</strong>
            <br/><span style="font-size:9px">NDANDULENI GROUP ERP | ${today}</span>
          </div>
        </div>
      </body>
      </html>
    `

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `NDANDULENI_Consumable_Products_${new Date().toISOString().split('T')[0]}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    setShowExportMenu(false)
    toast.success(`📥 Exported ${dataToExport.length} products to Excel`)
  }

  const exportToCSV = () => {
    const dataToExport = selectedRows.length > 0 
      ? sortedProducts.filter(p => selectedRows.includes(p.id))
      : sortedProducts

    const rows = dataToExport.map(p => ({
      'Item Code': p.item_code || '',
      'Item Name': p.name || '',
      'Category': p.item_categories?.name || '',
      'Quantity': p.current_stock || 0,
      'Unit': p.unit || '',
      'Min Stock': p.minimum_stock || 0,
      'Supplier': p.suppliers?.company_name || '',
      'Purchase Price (ZAR)': p.unit_cost || 0,
      'Selling Price (ZAR)': p.selling_price || '',
      'Status': getStockStatus(p).label,
      'Last Updated': p.updated_at ? new Date(p.updated_at).toLocaleDateString() : ''
    }))

    const csv = [
      Object.keys(rows[0]).join(','),
      ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `NDANDULENI_Consumable_Products_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    setShowExportMenu(false)
    toast.success(`📥 Exported ${dataToExport.length} products to CSV`)
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
            
            {/* Export Dropdown */}
            <div className="relative">
              <button onClick={() => setShowExportMenu(!showExportMenu)} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> Export
                <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {showExportMenu && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 mt-2 w-56 neu-raised rounded-xl p-2 bg-white dark:bg-slate-800 z-40 shadow-xl border border-slate-200 dark:border-slate-700">
                    <button onClick={exportToExcel} className="w-full text-left px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-sm flex items-center gap-3 group">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">Excel (.xls)</p>
                        <p className="text-xs text-slate-500">Formatted with logo</p>
                      </div>
                    </button>
                    <button onClick={exportToCSV} className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm flex items-center gap-3 group">
                      <FileText className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">CSV</p>
                        <p className="text-xs text-slate-500">Plain data format</p>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={() => navigate('/inventory/items/new')} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'all', label: 'All Products', icon: Package, count: stats.total },
            { id: 'chemicals', label: 'Chemicals', icon: Beaker, count: stats.chemicals },
            { id: 'ppe', label: 'PPE & Safety', icon: Shield, count: stats.ppe },
            { id: 'equipment', label: 'Equipment', icon: HardHat, count: stats.equipment },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setCategoryTab(tab.id); setSelectedRows([]) }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
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
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> In Stock</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Low Stock</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Out of Stock</span>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  )
}
