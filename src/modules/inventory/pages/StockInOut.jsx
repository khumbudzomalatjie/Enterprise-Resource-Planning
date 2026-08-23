import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useInventoryStore from '../store/inventoryStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { 
  Package, ArrowLeft, Sun, Moon, Sparkles,
  MoveRight, MoveLeft, RefreshCw, Save, Search, History,
  Clock, Truck, Briefcase, Plus, Barcode, Lock, User,
  TrendingUp, TrendingDown
} from 'lucide-react'

export default function StockInOut({ type = 'in' }) {
  const isStockIn = type === 'in'
  const navigate = useNavigate()
  const { fetchItems, createStockMovement } = useInventoryStore()
  const { isDark, toggleTheme } = useThemeStore()
  
  // STOCK OUT (TRACKER) STATE
  const [trackerCode, setTrackerCode] = useState('')
  const [trackerItem, setTrackerItem] = useState(null)
  const [trackerHistory, setTrackerHistory] = useState([])
  const [trackerLoading, setTrackerLoading] = useState(false)
  const [issueQty, setIssueQty] = useState(1)
  const [issueReason, setIssueReason] = useState('')
  const [issueJob, setIssueJob] = useState('')
  const [issuing, setIssuing] = useState(false)

  // STOCK IN (ADD STOCK) STATE
  const [stockInMode, setStockInMode] = useState('existing')
  const [stockInItems, setStockInItems] = useState([])
  const [supplier, setSupplier] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [savingStockIn, setSavingStockIn] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [])

  // ═══════════════════════════════════════════
  // STOCK OUT - FULL HISTORY TRACKER
  // ═══════════════════════════════════════════
  const handleTrackItem = async () => {
    if (!trackerCode.trim()) {
      toast.error('Enter item code or barcode')
      return
    }

    setTrackerLoading(true)
    setTrackerItem(null)
    setTrackerHistory([])

    // Find item
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('*')
      .or(`barcode.eq."${trackerCode.trim()}",item_code.eq."${trackerCode.trim()}"`)
      .maybeSingle()

    if (itemError || !item) {
      toast.error('Item not found')
      setTrackerLoading(false)
      return
    }

    setTrackerItem(item)

    // Get ALL movements in chronological order (oldest first)
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('item_id', item.id)
      .order('created_at', { ascending: true })

    if (!movements || movements.length === 0) {
      setTrackerHistory([])
      setTrackerLoading(false)
      return
    }

    // Get user names
    const userIds = [...new Set(movements.map(m => m.performed_by).filter(Boolean))]
    let userMap = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
      
      ;(profiles || []).forEach(p => { userMap[p.id] = p.full_name || p.email || 'Unknown' })
    }

    // Get job numbers
    const jobIds = [...new Set(movements.map(m => m.job_id).filter(Boolean))]
    let jobMap = {}
    if (jobIds.length > 0) {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, job_number, title')
        .in('id', jobIds)
      
      ;(jobs || []).forEach(j => { jobMap[j.id] = j })
    }

    // ✅ CALCULATE RUNNING BALANCE CORRECTLY
    // Starting from 0, add each quantity cumulatively
    let runningBalance = 0
    const enrichedMovements = movements.map(m => {
      runningBalance += Number(m.quantity || 0)
      const job = m.job_id ? jobMap[m.job_id] : null
      return {
        ...m,
        performed_by_name: userMap[m.performed_by] || 'System',
        job_number: job?.job_number || m.reference_number || null,
        job_title: job?.title || null,
        running_balance: runningBalance
      }
    })

    setTrackerHistory(enrichedMovements)
    setTrackerLoading(false)
  }

  const handleIssueStock = async () => {
    if (!trackerItem) return
    if (issueQty < 1) { toast.error('Enter quantity'); return }
    if (issueQty > trackerItem.current_stock) { toast.error(`Not enough stock. Max: ${trackerItem.current_stock}`); return }
    if (!issueReason && !issueJob) { toast.error('Enter reason or job number'); return }

    setIssuing(true)

    const { data: jobData } = issueJob ? await supabase.from('jobs').select('id').eq('job_number', issueJob).single() : { data: null }

    const notes = `${issueJob ? `Job: ${issueJob} | ` : ''}${issueReason ? `Reason: ${issueReason}` : 'Stock out'}`

    const result = await createStockMovement({
      item_id: trackerItem.id,
      movement_type: 'job_usage',
      quantity: -Math.abs(issueQty),
      reference_type: 'job',
      reference_number: issueJob || null,
      job_id: jobData?.id || null,
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
      handleTrackItem()
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
      barcode: item.barcode || '',
      unit: item.unit || 'each',
      quantity: 1,
      isNew: false,
      unit_cost: item.unit_cost || 0
    }])
  }

  const addNewItem = () => {
    setStockInItems([...stockInItems, {
      item_id: null,
      isNew: true,
      newName: '',
      newCode: '',
      newBarcode: '',
      unit: 'each',
      quantity: 1,
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

      if (item.isNew) {
        if (!item.newName) { toast.error('New item name required'); setSavingStockIn(false); return }
        if (!item.newBarcode) { toast.error('Barcode required'); setSavingStockIn(false); return }

        const { data: newItem, error: newItemError } = await supabase
          .from('inventory_items')
          .insert([{
            name: item.newName,
            item_code: item.newCode || 'ITEM-' + Date.now().toString(36).toUpperCase(),
            barcode: item.newBarcode,
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
          toast.error(`Failed: ${newItemError.message}`)
          setSavingStockIn(false)
          return
        }

        finalItemId = newItem.id
      }

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
    toast.success(`✅ Stock In complete!`)
    setStockInItems([])
    setSupplier('')
    setInvoiceNumber('')
    fetchItems()
  }

  const formatDateTime = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getMovementTypeLabel = (type) => {
    const labels = {
      'purchase': 'Received',
      'adjustment': 'Stock In',
      'job_usage': 'Issued for Job',
      'sale': 'Sold',
      'transfer_in': 'Transferred In',
      'transfer_out': 'Transferred Out',
      'write_off': 'Written Off',
      'damage': 'Damaged',
      'return': 'Returned',
      'count_correction': 'Count Correction'
    }
    return labels[type] || type?.replace(/_/g, ' ') || 'Movement'
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

        {isStockIn ? (
          /* STOCK IN */
          <>
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-3xl p-6 text-white mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Truck className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">STOCK IN</h1>
                  <p className="text-emerald-100 mt-1">Add new stock - existing or new items with barcode</p>
                </div>
              </div>
            </div>

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

            <div className="flex gap-2 mb-6">
              <button onClick={() => setStockInMode('existing')} className={`flex-1 py-3 rounded-xl font-bold text-sm ${stockInMode === 'existing' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                📦 Add Existing Item
              </button>
              <button onClick={() => setStockInMode('new')} className={`flex-1 py-3 rounded-xl font-bold text-sm ${stockInMode === 'new' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                ✨ Add New Item
              </button>
            </div>

            {stockInMode === 'existing' ? (
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
              <div className="neu-raised rounded-3xl p-6 mb-6">
                <button onClick={addNewItem} className="w-full py-4 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" /> Add New Item to Stock
                </button>
              </div>
            )}

            {stockInItems.length > 0 && (
              <div className="neu-raised rounded-3xl p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Items to Receive ({stockInItems.length})</h2>
                <div className="space-y-3">
                  {stockInItems.map((item, index) => (
                    <div key={index} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200">
                      {item.isNew ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold">Item Name *</label>
                              <input type="text" value={item.newName} onChange={e => updateStockInItem(index, 'newName', e.target.value)} placeholder="e.g., New Cleaner 5L" className="w-full p-2 neu-inset rounded-lg mt-1" />
                            </div>
                            <div>
                              <label className="text-xs font-semibold">Item Code</label>
                              <input type="text" value={item.newCode} onChange={e => updateStockInItem(index, 'newCode', e.target.value)} placeholder="Auto if empty" className="w-full p-2 neu-inset rounded-lg mt-1" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold flex items-center gap-1">
                                <Barcode className="w-3 h-3" /> Barcode *
                              </label>
                              <input type="text" value={item.newBarcode} onChange={e => updateStockInItem(index, 'newBarcode', e.target.value)} placeholder="e.g., 6001234567890" className="w-full p-2 neu-inset rounded-lg mt-1 font-mono" />
                            </div>
                            <div>
                              <label className="text-xs font-semibold">Unit</label>
                              <select value={item.unit} onChange={e => updateStockInItem(index, 'unit', e.target.value)} className="w-full p-2 neu-inset rounded-lg mt-1">
                                <option value="each">Each</option><option value="bottle">Bottle</option><option value="box">Box</option><option value="pack">Pack</option><option value="litre">Litre</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-sm mb-2">{item.name} <span className="text-xs text-slate-500">({item.item_code})</span></p>
                          <div className="mb-2">
                            <label className="text-xs font-semibold flex items-center gap-1">
                              <Barcode className="w-3 h-3" /> Barcode
                            </label>
                            <input type="text" value={item.barcode} onChange={e => updateStockInItem(index, 'barcode', e.target.value)} placeholder="Enter barcode" className="w-full p-2 neu-inset rounded-lg mt-1 font-mono" />
                          </div>
                        </div>
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
          /* STOCK OUT - HISTORY TRACKER */
          <>
            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-3xl p-6 text-white mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <History className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">STOCK HISTORY TRACKER</h1>
                  <p className="text-red-100 mt-1">View complete item history from receipt to all movements</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="neu-raised rounded-3xl p-6 mb-6">
              <div className="flex gap-3">
                <input type="text" value={trackerCode} onChange={e => setTrackerCode(e.target.value)} 
                  placeholder="Enter item code or scan barcode" 
                  className="flex-1 p-4 neu-inset rounded-xl text-lg font-mono"
                  onKeyDown={e => e.key === 'Enter' && handleTrackItem()} />
                <button onClick={handleTrackItem} disabled={trackerLoading}
                  className="px-8 py-4 rounded-xl bg-red-600 text-white font-bold flex items-center gap-2 disabled:opacity-50">
                  {trackerLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  View History
                </button>
              </div>
            </div>

            {/* Item Summary */}
            {trackerItem && (
              <div className="neu-raised rounded-3xl p-6 mb-6 border-l-4 border-l-red-600">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{trackerItem.name}</h3>
                    <p className="text-sm text-slate-500">
                      {trackerItem.item_code}
                      {trackerItem.barcode ? ` | Barcode: ${trackerItem.barcode}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-emerald-600">{trackerItem.current_stock} {trackerItem.unit}</p>
                    <p className="text-xs text-slate-500">Current Stock</p>
                  </div>
                </div>

                {/* Issue Form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
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

            {/* FULL HISTORY WITH CORRECT RUNNING BALANCE */}
            {trackerHistory.length > 0 && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" /> 
                  Complete Movement History
                </h2>
                <p className="text-sm text-slate-500 mb-4 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Read-only • {trackerHistory.length} movements
                </p>
                
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                  
                  <div className="space-y-4">
                    {trackerHistory.map((m, index) => {
                      const isIn = m.quantity > 0
                      const isFirst = index === 0
                      
                      return (
                        <div key={m.id || index} className="relative pl-14">
                          <div className={`absolute left-3 top-2 w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center ${
                            isIn ? 'bg-emerald-500' : 'bg-red-500'
                          }`}>
                            {isIn ? <TrendingUp className="w-3 h-3 text-white" /> : <TrendingDown className="w-3 h-3 text-white" />}
                          </div>
                          
                          <div className={`p-4 rounded-xl border ${
                            isIn 
                              ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-700/30' 
                              : 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-700/30'
                          }`}>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-lg ${isIn ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {isIn ? '+' : ''}{m.quantity} {trackerItem?.unit || ''}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  {getMovementTypeLabel(m.movement_type)}
                                </span>
                                {isFirst && (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                                    📦 Initially Received
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatDateTime(m.created_at)}
                              </span>
                            </div>
                            
                            {m.job_number && (
                              <p className="text-sm mt-2 flex items-center gap-1">
                                <Briefcase className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold text-blue-600">{m.job_number}</span>
                                {m.job_title && <span className="text-slate-500">- {m.job_title}</span>}
                              </p>
                            )}
                            
                            {m.notes && (
                              <p className="text-xs text-slate-500 mt-1">{m.notes}</p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-medium">{m.performed_by_name || 'System'}</span>
                            </div>
                            
                            {/* ✅ CORRECT RUNNING BALANCE */}
                            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                              <span className="text-xs text-slate-500 font-semibold">Stock Balance:</span>
                              <span className={`font-bold ${m.running_balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {m.running_balance} {trackerItem?.unit || ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {!trackerItem && !trackerLoading && (
              <div className="text-center py-12 neu-raised rounded-3xl">
                <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Enter an item code to view its complete history</p>
                <p className="text-slate-400 text-sm mt-1">Shows: when received, all movements, who did it, and running balance</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
