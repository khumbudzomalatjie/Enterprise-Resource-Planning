import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useInventoryStore from '../store/inventoryStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Package, ArrowLeft, Sun, Moon, Sparkles,
  MoveRight, MoveLeft, RefreshCw, Save, Search, History,
  Clock, Truck, Briefcase, AlertTriangle
} from 'lucide-react'

export default function StockInOut({ type = 'in' }) {
  const isStockIn = type === 'in'
  const navigate = useNavigate()
  const { items, fetchItems, createStockMovement, fetchStockMovements, stockMovements, loading } = useInventoryStore()
  const { isDark, toggleTheme } = useThemeStore()
  
  const [search, setSearch] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [saving, setSaving] = useState(false)
  
  // Stock In specific: supplier, invoice number
  const [supplier, setSupplier] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  
  // Stock Out specific: job number, reason
  const [jobNumber, setJobNumber] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    fetchItems()
    fetchStockMovements({ movement_type: isStockIn ? 'adjustment' : 'job_usage' })
  }, [])

  const filteredItems = items.filter(i => {
    if (!search) return true
    const s = search.toLowerCase()
    return (i.name || '').toLowerCase().includes(s) || (i.item_code || '').toLowerCase().includes(s)
  })

  const addItemToAdjust = (item) => {
    if (selectedItems.find(s => s.item_id === item.id)) {
      toast.error('Item already added')
      return
    }
    setSelectedItems([...selectedItems, { 
      item_id: item.id, 
      name: item.name, 
      item_code: item.item_code, 
      unit: item.unit, 
      current_stock: item.current_stock, 
      quantity: 1, 
      notes: '' 
    }])
  }

  const removeItemFromAdjust = (itemId) => {
    setSelectedItems(selectedItems.filter(s => s.item_id !== itemId))
  }

  const updateQuantity = (itemId, qty) => {
    setSelectedItems(selectedItems.map(s => s.item_id === itemId ? { ...s, quantity: Math.max(1, parseInt(qty) || 1) } : s))
  }

  const handleSave = async () => {
    if (selectedItems.length === 0) {
      toast.error('Add at least one item')
      return
    }

    if (isStockIn && !supplier) {
      toast.error('Please enter supplier name')
      return
    }

    if (!isStockIn && !jobNumber && !reason) {
      toast.error('Please enter job number or reason')
      return
    }

    setSaving(true)
    
    for (const item of selectedItems) {
      const qty = isStockIn ? Math.abs(item.quantity) : -Math.abs(item.quantity)
      
      let notes = ''
      if (isStockIn) {
        notes = `Supplier: ${supplier}${invoiceNumber ? ` | Invoice: ${invoiceNumber}` : ''}${item.notes ? ` | ${item.notes}` : ''}`
      } else {
        notes = `${jobNumber ? `Job: ${jobNumber} | ` : ''}${reason ? `Reason: ${reason} | ` : ''}${item.notes || 'Stock out'}`
      }

      const result = await createStockMovement({
        item_id: item.item_id,
        movement_type: isStockIn ? 'adjustment' : 'job_usage',
        quantity: qty,
        notes: notes,
        movement_date: new Date().toISOString().split('T')[0],
        status: 'completed'
      })

      if (!result.success) {
        toast.error(`Failed: ${result.error}`)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    toast.success(`✅ Stock ${isStockIn ? 'added' : 'removed'} successfully!`)
    setSelectedItems([])
    setSupplier('')
    setInvoiceNumber('')
    setJobNumber('')
    setReason('')
    await fetchItems()
    await fetchStockMovements({ movement_type: isStockIn ? 'adjustment' : 'job_usage' })
  }

  const formatDateTime = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/inventory" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Inventory</span>
        </Link>

        {/* HEADER - Different colors and text */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          {isStockIn ? (
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-3xl p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Truck className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">STOCK IN</h1>
                  <p className="text-emerald-100 mt-1">Add new inventory to the system</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-3xl p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Briefcase className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">STOCK OUT</h1>
                  <p className="text-red-100 mt-1">Remove inventory for jobs or other reasons</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* STOCK IN: Supplier & Invoice | STOCK OUT: Job & Reason */}
        <div className={`neu-raised rounded-3xl p-6 mb-6 border-l-4 ${isStockIn ? 'border-l-emerald-600' : 'border-l-red-600'}`}>
          {isStockIn ? (
            <>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" /> Receiving Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600">Supplier Name *</label>
                  <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} 
                    placeholder="e.g., CleanPro Supplies Ltd" 
                    className="w-full p-3 neu-inset rounded-xl mt-1" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Invoice / Delivery Note #</label>
                  <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} 
                    placeholder="e.g., INV-001234" 
                    className="w-full p-3 neu-inset rounded-xl mt-1" />
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-red-600" /> Usage Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-600">Job Number</label>
                  <input type="text" value={jobNumber} onChange={e => setJobNumber(e.target.value)} 
                    placeholder="e.g., JOB-2508-0001" 
                    className="w-full p-3 neu-inset rounded-xl mt-1" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600">Reason *</label>
                  <select value={reason} onChange={e => setReason(e.target.value)} className="w-full p-3 neu-inset rounded-xl mt-1">
                    <option value="">Select Reason</option>
                    <option value="Job Usage">Job Usage</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Expired">Expired</option>
                    <option value="Write Off">Write Off</option>
                    <option value="Transfer">Transfer to another site</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} 
              placeholder="Search item by name or code..." 
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
        </div>

        {/* Available Items */}
        <div className="neu-raised rounded-3xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
            {isStockIn ? '📥 Select Items to Receive' : '📤 Select Items to Issue'}
          </h2>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div></div>
            ) : filteredItems.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No items found</p>
            ) : (
              filteredItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50">
                  <div>
                    <p className="font-medium text-sm text-slate-800 dark:text-white">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.item_code} • Current: <span className="font-bold text-emerald-600">{item.current_stock} {item.unit}</span>
                    </p>
                  </div>
                  <button onClick={() => addItemToAdjust(item)} 
                    className={`px-4 py-2 rounded-lg text-white text-xs font-medium ${isStockIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                    {isStockIn ? '+ Add' : '- Issue'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected Items */}
        {selectedItems.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
              Selected Items ({selectedItems.length})
            </h2>
            <div className="space-y-3">
              {selectedItems.map(item => (
                <div key={item.item_id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm text-slate-800 dark:text-white">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.item_code}</p>
                    </div>
                    <button onClick={() => removeItemFromAdjust(item.item_id)} className="text-red-500 text-sm">Remove</button>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">
                      Quantity to {isStockIn ? 'Receive' : 'Issue'}
                    </label>
                    <input type="number" value={item.quantity} onChange={e => updateQuantity(item.item_id, e.target.value)} 
                      min="1" max={!isStockIn ? item.current_stock : undefined} 
                      className={`w-full p-3 neu-inset rounded-lg mt-1 text-lg font-bold ${isStockIn ? 'text-emerald-600' : 'text-red-600'}`} />
                    {!isStockIn && <p className="text-xs text-amber-600 mt-1">Max available: {item.current_stock}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={handleSave} disabled={saving}
                className={`px-8 py-4 rounded-2xl text-white font-bold flex items-center gap-2 disabled:opacity-50 ${isStockIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : isStockIn ? <MoveRight className="w-5 h-5" /> : <MoveLeft className="w-5 h-5" />}
                {saving ? 'Processing...' : isStockIn ? '✅ CONFIRM STOCK IN' : '✅ CONFIRM STOCK OUT'}
              </button>
            </div>
          </motion.div>
        )}

        {/* AUDIT TRAIL */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <History className={`w-5 h-5 ${isStockIn ? 'text-emerald-600' : 'text-red-600'}`} />
              {isStockIn ? '📥 Stock In History' : '📤 Stock Out History'}
            </h2>
            <button onClick={() => fetchStockMovements({ movement_type: isStockIn ? 'adjustment' : 'job_usage' })} className="text-sm text-emerald-600 flex items-center gap-1">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {stockMovements.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No {isStockIn ? 'stock in' : 'stock out'} movements yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stockMovements.map(movement => (
                <div key={movement.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isStockIn ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {isStockIn ? <MoveRight className="w-5 h-5" /> : <MoveLeft className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-slate-800 dark:text-white">{movement.inventory_items?.name || 'Unknown'}</p>
                      <span className={`font-bold ${movement.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{movement.notes}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> {formatDateTime(movement.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
