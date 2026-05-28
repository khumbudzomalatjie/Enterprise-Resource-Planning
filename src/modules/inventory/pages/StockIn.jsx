import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useInventoryStore from '../store/inventoryStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { ArrowDown, Package, Save, Plus, Trash2, ChevronRight, Sparkles, Sun, Moon, ArrowLeft } from 'lucide-react'

export default function StockIn() {
  const { items, fetchItems, warehouses, fetchWarehouses, createStockMovement, fetchInventoryStats } = useInventoryStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [movements, setMovements] = useState([{ 
    item_id: '', 
    quantity: '', 
    unit_cost: '', 
    warehouse_id: '', 
    batch_number: '',
    notes: '' 
  }])

  useEffect(() => {
    fetchItems()
    fetchWarehouses()
  }, [])

  const addRow = () => {
    setMovements([...movements, { 
      item_id: '', 
      quantity: '', 
      unit_cost: '', 
      warehouse_id: movements[0]?.warehouse_id || '', 
      batch_number: '',
      notes: '' 
    }])
  }

  const removeRow = (i) => {
    if (movements.length > 1) {
      setMovements(movements.filter((_, idx) => idx !== i))
    }
  }

  const updateRow = (i, field, value) => {
    const newMov = [...movements]
    newMov[i] = { ...newMov[i], [field]: value }
    
    // Auto-fill unit cost when item is selected
    if (field === 'item_id' && value) {
      const item = items.find(it => it.id === value)
      if (item) {
        newMov[i].unit_cost = item.unit_cost || ''
        newMov[i].warehouse_id = newMov[i].warehouse_id || item.default_warehouse_id || ''
      }
    }
    setMovements(newMov)
  }

  const handleSubmit = async () => {
    // Validate
    const validMovements = movements.filter(m => m.item_id && m.quantity && parseFloat(m.quantity) > 0)
    
    if (validMovements.length === 0) {
      toast.error('Please fill in at least one item with a valid quantity')
      return
    }

    setSaving(true)
    let successCount = 0
    let failCount = 0

    for (const m of validMovements) {
      const movementData = {
        item_id: m.item_id,
        movement_type: 'purchase',
        quantity: parseFloat(m.quantity),
        unit_cost: m.unit_cost ? parseFloat(m.unit_cost) : 0,
        warehouse_id: m.warehouse_id || warehouses[0]?.id,
        reference_number: m.batch_number || null,
        notes: m.notes || 'Stock In',
        status: 'completed'
      }

      const result = await createStockMovement(movementData)
      if (result.success) {
        successCount++
      } else {
        failCount++
        console.error('Failed to stock in:', result.error)
      }
    }

    setSaving(false)

    if (successCount > 0) {
      toast.success(`${successCount} item(s) stocked in successfully!`)
      await fetchInventoryStats()
      await fetchItems()
    }
    
    if (failCount > 0) {
      toast.error(`${failCount} item(s) failed to stock in`)
    }

    if (successCount > 0 && failCount === 0) {
      navigate('/inventory')
    }
  }

  // Find item details for display
  const getItemInfo = (itemId) => {
    return items.find(it => it.id === itemId)
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-2">
            <ArrowDown className="w-8 h-8 text-emerald-600" />Stock In (Receive)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 ml-11">Receive and add stock to inventory</p>

          <div className="neu-raised rounded-3xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Items Being Received</h2>
              <button onClick={addRow} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-sm font-medium">
                <Plus className="w-4 h-4" />Add Item
              </button>
            </div>
            
            <div className="space-y-4">
              {movements.map((m, i) => {
                const selectedItem = getItemInfo(m.item_id)
                return (
                  <div key={i} className="p-5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200 dark:border-slate-600/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-500">Item #{i + 1}</span>
                      {movements.length > 1 && (
                        <button onClick={() => removeRow(i)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Item *</label>
                        <select 
                          value={m.item_id} 
                          onChange={(e) => updateRow(i, 'item_id', e.target.value)} 
                          className="w-full p-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300"
                        >
                          <option value="">Select Item</option>
                          {items.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.item_code}) - Stock: {item.current_stock} {item.unit}
                            </option>
                          ))}
                        </select>
                        {selectedItem && (
                          <p className="text-xs text-slate-500 mt-1">
                            Current stock: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedItem.current_stock} {selectedItem.unit}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Quantity *</label>
                        <input 
                          type="number" 
                          value={m.quantity} 
                          onChange={(e) => updateRow(i, 'quantity', e.target.value)} 
                          placeholder="0" 
                          min="0.01" 
                          step="0.01"
                          className="w-full p-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300" 
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Unit Cost (R)</label>
                        <input 
                          type="number" 
                          value={m.unit_cost} 
                          onChange={(e) => updateRow(i, 'unit_cost', e.target.value)} 
                          placeholder="0.00" 
                          min="0" 
                          step="0.01"
                          className="w-full p-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300" 
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Warehouse</label>
                        <select 
                          value={m.warehouse_id} 
                          onChange={(e) => updateRow(i, 'warehouse_id', e.target.value)} 
                          className="w-full p-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300"
                        >
                          <option value="">Select Warehouse</option>
                          {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Batch/Lot Number</label>
                        <input 
                          type="text" 
                          value={m.batch_number} 
                          onChange={(e) => updateRow(i, 'batch_number', e.target.value)} 
                          placeholder="Optional" 
                          className="w-full p-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300" 
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Notes</label>
                        <input 
                          type="text" 
                          value={m.notes} 
                          onChange={(e) => updateRow(i, 'notes', e.target.value)} 
                          placeholder="e.g., Delivery note #" 
                          className="w-full p-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300" 
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary */}
          {movements.filter(m => m.item_id && m.quantity).length > 0 && (
            <div className="neu-raised rounded-3xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Summary</h3>
              <div className="space-y-2">
                {movements.filter(m => m.item_id && m.quantity).map((m, i) => {
                  const item = getItemInfo(m.item_id)
                  const total = (parseFloat(m.quantity) || 0) * (parseFloat(m.unit_cost) || 0)
                  return (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        {item?.name || 'Unknown'} x {m.quantity} {item?.unit || ''}
                      </span>
                      <span className="font-medium text-slate-800 dark:text-white">
                        R {total.toFixed(2)}
                      </span>
                    </div>
                  )
                })}
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-800 dark:text-white">Total</span>
                  <span className="text-emerald-600">
                    R {movements
                      .filter(m => m.item_id && m.quantity)
                      .reduce((sum, m) => sum + (parseFloat(m.quantity) || 0) * (parseFloat(m.unit_cost) || 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-end">
            <button 
              onClick={() => navigate('/inventory')} 
              className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-slate-500 text-white hover:bg-slate-600"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={saving}
              className="neu-raised neu-btn px-8 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Processing...' : 'Confirm Stock In'}</span>
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
