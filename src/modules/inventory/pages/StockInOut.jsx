import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useInventoryStore from '../store/inventoryStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Package, ArrowLeft, ChevronRight, Sun, Moon, Sparkles,
  MoveRight, MoveLeft, RefreshCw, Save, Search, History,
  Clock, User, AlertTriangle, CheckCircle2
} from 'lucide-react'

export default function StockInOut({ type = 'in' }) {
  const isStockIn = type === 'in'
  const navigate = useNavigate()
  const { items, fetchItems, createStockMovement, fetchStockMovements, stockMovements, loading } = useInventoryStore()
  const { isDark, toggleTheme } = useThemeStore()
  
  const [search, setSearch] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [movementHistory, setMovementHistory] = useState([])
  const [showHistory, setShowHistory] = useState(true)

  useEffect(() => {
    fetchItems()
    loadMovements()
  }, [])

  const loadMovements = async () => {
    const filters = {}
    if (isStockIn) {
      filters.movement_type = 'adjustment' // Stock in
    } else {
      filters.movement_type = 'job_usage' // Stock out
    }
    await fetchStockMovements(filters)
    setMovementHistory(stockMovements || [])
  }

  useEffect(() => {
    setMovementHistory(stockMovements || [])
  }, [stockMovements])

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

  const updateNotes = (itemId, notes) => {
    setSelectedItems(selectedItems.map(s => s.item_id === itemId ? { ...s, notes } : s))
  }

  const handleSave = async () => {
    if (selectedItems.length === 0) {
      toast.error('Add at least one item')
      return
    }

    setSaving(true)
    
    for (const item of selectedItems) {
      // Stock In = positive, Stock Out = negative
      const qty = isStockIn ? Math.abs(item.quantity) : -Math.abs(item.quantity)
      
      const result = await createStockMovement({
        item_id: item.item_id,
        movement_type: isStockIn ? 'adjustment' : 'job_usage',
        quantity: qty,
        notes: item.notes || `Manual stock ${isStockIn ? 'in' : 'out'} - ${new Date().toLocaleString()}`,
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
    
    // Reset and refresh
    setSelectedItems([])
    await fetchItems()
    await loadMovements()
  }

  const formatDateTime = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-ZA', { 
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    })
  }

  const getMovementColor = (type) => {
    if (['purchase', 'return', 'adjustment'].includes(type)) return 'text-emerald-600 bg-emerald-100'
    return 'text-red-600 bg-red-100'
  }

  const getMovementIcon = (type) => {
    if (['purchase', 'return', 'adjustment'].includes(type)) return MoveRight
    return MoveLeft
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/inventory" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Inventory</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            {isStockIn ? (
              <MoveRight className="w-8 h-8 text-emerald-600" />
            ) : (
              <MoveLeft className="w-8 h-8 text-red-600" />
            )}
            {isStockIn ? 'Stock In - Add Inventory' : 'Stock Out - Remove Inventory'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isStockIn 
              ? 'Add stock to the system with audit trail' 
              : 'Record stock leaving with full audit trail'}
          </p>
        </motion.div>

        {/* Search & Select Items */}
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
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Select Items</h2>
          <div className="max-h-64 overflow-y-auto space-y-2">
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
                      {item.item_code} • Current Stock: <span className="font-bold text-emerald-600">{item.current_stock} {item.unit}</span>
                    </p>
                  </div>
                  <button onClick={() => addItemToAdjust(item)} 
                    className={`px-4 py-2 rounded-lg text-white text-xs font-medium ${isStockIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                    {isStockIn ? '+ Add' : '- Remove'}
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
                    <button onClick={() => removeItemFromAdjust(item.item_id)} className="text-red-500 text-sm hover:text-red-700">
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 font-semibold">Quantity {isStockIn ? 'to Add' : 'to Remove'}</label>
                      <input 
                        type="number" 
                        value={item.quantity} 
                        onChange={e => updateQuantity(item.item_id, e.target.value)} 
                        min="1" 
                        max={!isStockIn ? item.current_stock : undefined} 
                        className="w-full p-2 neu-inset rounded-lg mt-1 text-sm" 
                      />
                      {!isStockIn && (
                        <p className="text-xs text-amber-600 mt-1">Max available: {item.current_stock} {item.unit}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 font-semibold">Notes / Reason</label>
                      <input 
                        type="text" 
                        value={item.notes} 
                        onChange={e => updateNotes(item.item_id, e.target.value)} 
                        placeholder={isStockIn ? "e.g., Purchase order received" : "e.g., Used for Job JOB-123"} 
                        className="w-full p-2 neu-inset rounded-lg mt-1 text-sm" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-6">
              <button onClick={handleSave} disabled={saving}
                className={`neu-raised neu-btn px-8 py-4 rounded-2xl text-white font-semibold flex items-center gap-2 disabled:opacity-50 ${isStockIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {saving ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : isStockIn ? (
                  <MoveRight className="w-5 h-5" />
                ) : (
                  <MoveLeft className="w-5 h-5" />
                )}
                {saving ? 'Processing...' : isStockIn ? `Confirm Stock In (${selectedItems.length} items)` : `Confirm Stock Out (${selectedItems.length} items)`}
              </button>
            </div>
          </motion.div>
        )}

        {/* AUDIT TRAIL / MOVEMENT HISTORY */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              {isStockIn ? 'Stock In Audit Trail' : 'Stock Out Audit Trail'}
            </h2>
            <button onClick={loadMovements} className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {movementHistory.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No {isStockIn ? 'stock in' : 'stock out'} movements recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {movementHistory.map(movement => {
                const Icon = getMovementIcon(movement.movement_type)
                return (
                  <div key={movement.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-700">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getMovementColor(movement.movement_type)}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-slate-800 dark:text-white">
                          {movement.inventory_items?.name || 'Unknown Item'}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          movement.quantity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {movement.quantity > 0 ? '+' : ''}{movement.quantity} {movement.inventory_items?.unit || ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{movement.notes || 'No notes'}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDateTime(movement.created_at || movement.movement_date)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMovementColor(movement.movement_type)}`}>
                      {movement.movement_type === 'adjustment' ? 'Stock In' : movement.movement_type === 'job_usage' ? 'Stock Out' : movement.movement_type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
