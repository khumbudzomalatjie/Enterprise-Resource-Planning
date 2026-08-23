import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useInventoryStore from '../store/inventoryStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Package, ArrowLeft, ChevronRight, Sun, Moon, Sparkles,
  MoveRight, MoveLeft, RefreshCw, Save, Search
} from 'lucide-react'

export default function StockInOut() {
  const { type } = useParams() // 'in' or 'out'
  const isStockIn = type === 'in'
  const navigate = useNavigate()
  const { items, fetchItems, createStockMovement, loading } = useInventoryStore()
  const { isDark, toggleTheme } = useThemeStore()
  
  const [search, setSearch] = useState('')
  const [selectedItems, setSelectedItems] = useState([]) // [{ item_id, quantity, notes }]
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchItems()
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
    setSelectedItems([...selectedItems, { item_id: item.id, name: item.name, item_code: item.item_code, unit: item.unit, current_stock: item.current_stock, quantity: 1, notes: '' }])
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
      // For stock out, quantity must be negative
      const qty = isStockIn ? Math.abs(item.quantity) : -Math.abs(item.quantity)
      
      const result = await createStockMovement({
        item_id: item.item_id,
        movement_type: isStockIn ? 'adjustment' : 'job_usage',
        quantity: qty,
        notes: item.notes || `Manual stock ${isStockIn ? 'in' : 'out'}`,
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
    toast.success(`Stock ${isStockIn ? 'added' : 'removed'} successfully!`)
    navigate('/inventory')
  }

  const formatCurrency = (a) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(a || 0)

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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/inventory" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Inventory</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            {isStockIn ? <MoveRight className="w-8 h-8 text-emerald-600" /> : <MoveLeft className="w-8 h-8 text-red-600" />}
            {isStockIn ? 'Stock In' : 'Stock Out'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isStockIn ? 'Add inventory to stock' : 'Remove inventory from stock'}
          </p>
        </motion.div>

        {/* Search */}
        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
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
                    <p className="text-xs text-slate-500">{item.item_code} • Stock: {item.current_stock} {item.unit}</p>
                  </div>
                  <button onClick={() => addItemToAdjust(item)} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700">
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected Items */}
        {selectedItems.length > 0 && (
          <div className="neu-raised rounded-3xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Selected Items ({selectedItems.length})</h2>
            <div className="space-y-3">
              {selectedItems.map(item => (
                <div key={item.item_id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm text-slate-800 dark:text-white">{item.name}</p>
                    <button onClick={() => removeItemFromAdjust(item.item_id)} className="text-red-500 text-sm">Remove</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500">Quantity</label>
                      <input type="number" value={item.quantity} onChange={e => updateQuantity(item.item_id, e.target.value)} min="1" max={isStockIn ? undefined : item.current_stock} className="w-full p-2 neu-inset rounded-lg mt-1 text-sm" />
                      {!isStockIn && <p className="text-xs text-amber-600 mt-1">Max: {item.current_stock}</p>}
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Notes</label>
                      <input type="text" value={item.notes} onChange={e => updateNotes(item.item_id, e.target.value)} placeholder="Optional" className="w-full p-2 neu-inset rounded-lg mt-1 text-sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        {selectedItems.length > 0 && (
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className={`neu-raised neu-btn px-8 py-4 rounded-2xl text-white font-semibold flex items-center gap-2 disabled:opacity-50 ${isStockIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {saving ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? 'Processing...' : isStockIn ? 'Confirm Stock In' : 'Confirm Stock Out'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
