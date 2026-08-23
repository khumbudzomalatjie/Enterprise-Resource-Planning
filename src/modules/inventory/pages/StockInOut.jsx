import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useInventoryStore from '../store/inventoryStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { 
  Package, ArrowLeft, Sun, Moon, Sparkles,
  MoveRight, MoveLeft, RefreshCw, Save, Search, History,
  Clock, Truck, Briefcase, Plus, Barcode
} from 'lucide-react'

export default function StockInOut({ type = 'in' }) {
  const isStockIn = type === 'in'
  const navigate = useNavigate()
  const { fetchItems, createStockMovement, fetchStockMovements, stockMovements } = useInventoryStore()
  const { isDark, toggleTheme } = useThemeStore()
  
  // ────────────────────────────────────────
  // STOCK OUT (TRACKER) STATE
  // ────────────────────────────────────────
  const [trackerCode, setTrackerCode] = useState('')
  const [trackerItem, setTrackerItem] = useState(null)
  const [trackerHistory, setTrackerHistory] = useState([])
  const [trackerLoading, setTrackerLoading] = useState(false)
  const [issueQty, setIssueQty] = useState(1)
  const [issueReason, setIssueReason] = useState('')
  const [issueJob, setIssueJob] = useState('')
  const [issuing, setIssuing] = useState(false)

  // ────────────────────────────────────────
  // STOCK IN (ADD STOCK) STATE
  // ────────────────────────────────────────
  const [stockInMode, setStockInMode] = useState('existing') // 'existing' or 'new'
  const [stockInItems, setStockInItems] = useState([]) // [{ item_id, name, qty, isNew, newName, newCode, unit, cost }]
  const [supplier, setSupplier] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [savingStockIn, setSavingStockIn] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [])

  // ═══════════════════════════════════════════
  // STOCK OUT - TRACKER FUNCTIONS
  // ═══════════════════════════════════════════
  const handleTrackItem = async () => {
    if (!trackerCode.trim()) {
      toast.error('Enter item code or barcode')
      return
    }

    setTrackerLoading(true)
    setTrackerItem(null)
    setTrackerHistory([])

    // Search by barcode or item code
    const { data: item, error } = await supabase
      .from('inventory_items')
      .select('*')
      .or(`barcode.eq."${trackerCode.trim()}",item_code.eq."${trackerCode.trim()}"`)
      .maybeSingle()

    if (error) {
      toast.error('Search failed')
      setTrackerLoading(false)
      return
    }

    if (!item) {
      toast.error('Item not found')
      setTrackerLoading(false)
      return
    }

    setTrackerItem(item)

    // Get full audit trail
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('item_id', item.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setTrackerHistory(movements || [])
    setTrackerLoading(false)
  }

  const handleIssueStock = async () => {
    if (!trackerItem) return
    if (issueQty < 1) { toast.error('Enter quantity'); return }
    if (issueQty > trackerItem.current_stock) { toast.error(`Not enough stock. Max: ${trackerItem.current_stock}`); return }
    if (!issueReason && !issueJob) { toast.error('Enter reason or job number'); return }

    setIssuing(true)

    const notes = `${issueJob ? `Job: ${issueJob} | ` : ''}${issueReason ? `Reason: ${issueReason}` : 'Stock out'}`

    const result = await createStockMovement({
      item_id: trackerItem.id,
      movement_type: 'job_usage',
      quantity: -issueQty,
      notes: notes,
      movement_date: new Date().toISOString().split('T')[0],
      status: 'completed'
    })

    setIssuing(false)

    if (result.success) {
      toast.success(`✅ ${issueQty} x ${trackerItem.name} issued!`)
      setIssueQty(1)
      setIssueReason('')
      setIssueJob('')
      handleTrackItem() // Refresh trail
    } else {
      toast.error(result.error || 'Failed to issue')
    }
  }

  // ═══════════════════════════════════════════
  // STOCK IN - ADD STOCK FUNCTIONS
  // ═══════════════════════════════════════════
  const addExistingItem = (item) => {
    if (stockInItems.find(s => s.item_id === item.id)) {
      toast.error('Item already added')
      return
    }
    setStockInItems([...stockInItems, {
      item_id: item.id,
      name: item.name,
      item_code: item.item_code,
      unit: item.unit || 'each',
      quantity: 1,
      isNew: false,
      unit_cost: item.unit_cost || 0
    }])
  }

  const addNewItem = () => {
    setStockInItems([...stockInItems, {
      item_id: null,
      name: '',
      item_code: '',
      unit: 'each',
      quantity: 1,
      isNew: true,
      newName: '',
      newCode: '',
      unit_cost: 0
    }])
  }

  const removeStockInItem = (index) => {
    setStockInItems(stockInItems.filter((_, i) => i !== index))
  }

  const updateStockInItem = (index, field, value) => {
    setStockInItems(stockInItems.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const handleSaveStockIn = async () => {
    if (stockInItems.length === 0) { toast.error('Add items'); return }
    if (!supplier) { toast.error('Enter supplier name'); return }

    setSavingStockIn(true)

    for (const item of stockInItems) {
      let finalItemId = item.item_id

      // If new item, create it first
      if (item.isNew) {
        if (!item.newName) { toast.error('New item name required'); setSavingStockIn(false); return }
        
        const { data: newItem, error: newItemError } = await supabase
          .from('inventory_items')
          .insert([{
            name: item.newName,
            item_code: item.newCode || 'ITEM-' + Date.now().toString(36).toUpperCase(),
            unit: item.unit,
            unit_cost: item.unit_cost || 0,
            current_stock: 0,
            minimum_stock: 0,
            reorder_point: 10,
            status: 'active'
          }])
          .select()
          .single()

        if (newItemError) {
          toast.error(`Failed to create ${item.newName}: ${newItemError.message}`)
          setSavingStockIn(false)
          return
        }

        finalItemId = newItem.id
      }

      // Record stock movement
      const result = await createStockMovement({
        item_id: finalItemId,
        movement_type: 'adjustment',
        quantity: Math.abs(item.quantity),
        notes: `Stock In - Supplier: ${supplier}${invoiceNumber ? ` | Invoice: ${invoiceNumber}` : ''}`,
        movement_date: new Date().toISOString().split('T')[0],
        status: 'completed'
      })

      if (!result.success) {
        toast.error(`Failed: ${result.error}`)
        setSavingStockIn(false)
        return
      }
    }

    setSavingStockIn(false)
    toast.success(`✅ Stock In complete! ${stockInItems.length} items added.`)
    setStockInItems([])
    setSupplier('')
    setInvoiceNumber('')
    fetchItems()
  }

  // ═══════════════════════════════════════════
  // FORMAT HELPERS
  // ═══════════════════════════════════════════
  const formatDateTime = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const formatCurrency = (a) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(a || 0)

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

        {isStockIn ? (
          /* ═══════════════════════════════════════
             STOCK IN - ADD NEW STOCK
             ═══════════════════════════════════════ */
          <>
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-3xl p-6 text-white mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Truck className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">STOCK IN</h1>
                  <p className="text-emerald-100 mt-1">Add new stock - existing or new items</p>
                </div>
              </div>
            </div>

            {/* Supplier Info */}
            <div className="neu-raised rounded-3xl p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Receiving Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold">Supplier Name *</label>
                  <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g., CleanPro Supplies" className="w-full p-3 neu-inset rounded-xl mt-1" />
                </div>
                <div>
                  <label className="text-sm font-semibold">Invoice / Delivery Note #</label>
                  <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="e.g., INV-001234" className="w-full p-3 neu-inset rounded-xl mt-1" />
                </div>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <button onClick={() => setStockInMode('existing')} className={`flex-1 py-3 rounded-xl font-bold text-sm ${stockInMode === 'existing' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                📦 Add Existing Item
              </button>
              <button onClick={() => setStockInMode('new')} className={`flex-1 py-3 rounded-xl font-bold text-sm ${stockInMode === 'new' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                ✨ Add New Item
              </button>
            </div>

            {stockInMode === 'existing' ? (
              /* Select existing items */
              <div className="neu-raised rounded-3xl p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Select Existing Items</h2>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {useInventoryStore.getState().items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.item_code} • Stock: {item.current_stock} {item.unit}</p>
                      </div>
                      <button onClick={() => addExistingItem(item)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium">+ Add</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Add new item button */
              <div className="neu-raised rounded-3xl p-6 mb-6">
                <button onClick={addNewItem} className="w-full py-4 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" /> Add New Item to Stock
                </button>
              </div>
            )}

            {/* Selected Stock In Items */}
            {stockInItems.length > 0 && (
              <div className="neu-raised rounded-3xl p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Items to Receive ({stockInItems.length})</h2>
                <div className="space-y-3">
                  {stockInItems.map((item, index) => (
                    <div key={index} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200">
                      {item.isNew ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="text-xs font-semibold">New Item Name *</label>
                            <input type="text" value={item.newName} onChange={e => updateStockInItem(index, 'newName', e.target.value)} placeholder="e.g., New Cleaner 5L" className="w-full p-2 neu-inset rounded-lg mt-1" />
                          </div>
                          <div>
                            <label className="text-xs font-semibold">Item Code</label>
                            <input type="text" value={item.newCode} onChange={e => updateStockInItem(index, 'newCode', e.target.value)} placeholder="Auto if empty" className="w-full p-2 neu-inset rounded-lg mt-1" />
                          </div>
                          <div>
                            <label className="text-xs font-semibold">Unit</label>
                            <select value={item.unit} onChange={e => updateStockInItem(index, 'unit', e.target.value)} className="w-full p-2 neu-inset rounded-lg mt-1">
                              <option value="each">Each</option><option value="bottle">Bottle</option><option value="box">Box</option><option value="pack">Pack</option><option value="litre">Litre</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <p className="font-medium text-sm mb-2">{item.name} <span className="text-xs text-slate-500">({item.item_code})</span></p>
                      )}
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="text-xs font-semibold">Quantity to Add *</label>
                          <input type="number" value={item.quantity} onChange={e => updateStockInItem(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} min="1" className="w-full p-2 neu-inset rounded-lg mt-1 text-lg font-bold text-emerald-600" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold">Unit Cost (R)</label>
                          <input type="number" value={item.unit_cost} onChange={e => updateStockInItem(index, 'unit_cost', parseFloat(e.target.value) || 0)} min="0" step="0.01" className="w-full p-2 neu-inset rounded-lg mt-1" />
                        </div>
                      </div>
                      <button onClick={() => removeStockInItem(index)} className="text-red-500 text-xs mt-2">Remove</button>
                    </div>
                  ))}
                </div>

                <button onClick={handleSaveStockIn} disabled={savingStockIn} className="w-full mt-6 py-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50">
                  {savingStockIn ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {savingStockIn ? 'Saving...' : '✅ CONFIRM STOCK IN'}
                </button>
              </div>
            )}
          </>
        ) : (
          /* ═══════════════════════════════════════
             STOCK OUT - TRACKER
             ═══════════════════════════════════════ */
          <>
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-3xl p-6 text-white mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Briefcase className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">STOCK OUT TRACKER</h1>
                  <p className="text-red-100 mt-1">Enter item code to view audit trail and issue stock</p>
                </div>
              </div>
            </div>

            {/* Item Code Search */}
            <div className="neu-raised rounded-3xl p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Barcode className="w-5 h-5 text-red-600" /> Enter Item Code or Barcode
              </h2>
              <div className="flex gap-3">
                <input type="text" value={trackerCode} onChange={e => setTrackerCode(e.target.value)} 
                  placeholder="e.g., ITEM-000001 or scan barcode" 
                  className="flex-1 p-4 neu-inset rounded-xl text-lg font-mono"
                  onKeyDown={e => e.key === 'Enter' && handleTrackItem()} />
                <button onClick={handleTrackItem} disabled={trackerLoading}
                  className="px-8 py-4 rounded-xl bg-red-600 text-white font-bold flex items-center gap-2 disabled:opacity-50">
                  {trackerLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  Track
                </button>
              </div>
            </div>

            {/* Item Info + Issue */}
            {trackerItem && (
              <div className="neu-raised rounded-3xl p-6 mb-6 border-l-4 border-l-red-600">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{trackerItem.name}</h3>
                    <p className="text-sm text-slate-500">{trackerItem.item_code} {trackerItem.barcode ? `| Barcode: ${trackerItem.barcode}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">{trackerItem.current_stock} {trackerItem.unit}</p>
                    <p className="text-xs text-slate-500">Current Stock</p>
                  </div>
                </div>

                {/* Issue Form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold">Quantity to Issue *</label>
                    <input type="number" value={issueQty} onChange={e => setIssueQty(Math.max(1, parseInt(e.target.value) || 1))} 
                      min="1" max={trackerItem.current_stock} className="w-full p-3 neu-inset rounded-xl mt-1 font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">Job Number</label>
                    <input type="text" value={issueJob} onChange={e => setIssueJob(e.target.value)} placeholder="e.g., JOB-2508-0001" className="w-full p-3 neu-inset rounded-xl mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold">Reason *</label>
                    <select value={issueReason} onChange={e => setIssueReason(e.target.value)} className="w-full p-3 neu-inset rounded-xl mt-1">
                      <option value="">Select Reason</option>
                      <option value="Job Usage">Job Usage</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Expired">Expired</option>
                      <option value="Write Off">Write Off</option>
                      <option value="Transfer">Transfer</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <button onClick={handleIssueStock} disabled={issuing} className="w-full mt-4 py-4 rounded-2xl bg-red-600 text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50">
                  {issuing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <MoveLeft className="w-5 h-5" />}
                  {issuing ? 'Issuing...' : `ISSUE ${issueQty} x ${trackerItem.name.toUpperCase()}`}
                </button>
              </div>
            )}

            {/* Audit Trail */}
            {trackerHistory.length > 0 && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" /> Full Audit Trail ({trackerHistory.length} movements)
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {trackerHistory.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${m.quantity > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {m.quantity > 0 ? <MoveRight className="w-5 h-5" /> : <MoveLeft className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {m.quantity > 0 ? '+' : ''}{m.quantity}
                          </span>
                          <span className="text-sm text-slate-600">{m.movement_type?.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="text-xs text-slate-500">{m.notes}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" /> {formatDateTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!trackerItem && !trackerLoading && (
              <div className="text-center py-12 neu-raised rounded-3xl">
                <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Enter an item code to view its complete audit trail</p>
                <p className="text-slate-400 text-sm mt-1">The full stock movement history will appear here</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
