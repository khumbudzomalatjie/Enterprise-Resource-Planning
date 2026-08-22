import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useInventoryStore from '../store/inventoryStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Package, ArrowLeft, ChevronRight, Sun, Moon, Sparkles,
  Barcode, Warehouse, ShoppingCart, Edit, Trash2, X,
  MoveRight, MoveLeft, RefreshCw, Clock, AlertTriangle, Save
} from 'lucide-react'

export default function StockDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { selectedItem, fetchItem, fetchStockMovements, stockMovements, updateItem, loading } = useInventoryStore()
  const { isDark, toggleTheme } = useThemeStore()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockAction, setStockAction] = useState('in') // 'in' or 'out'
  const [stockQuantity, setStockQuantity] = useState(1)
  const [stockNotes, setStockNotes] = useState('')

  useEffect(() => {
    if (id) {
      fetchItem(id)
      fetchStockMovements({ item_id: id })
    }
  }, [id])

  useEffect(() => {
    if (selectedItem) {
      setEditData({ ...selectedItem })
    }
  }, [selectedItem])

  const handleSaveEdit = async () => {
    setSaving(true)
    const result = await updateItem(id, editData)
    setSaving(false)
    if (result.success) {
      toast.success('Item updated!')
      setIsEditing(false)
      fetchItem(id)
    } else {
      toast.error(result.error || 'Failed to update')
    }
  }

  const handleStockAdjust = async () => {
    const qty = stockAction === 'in' ? stockQuantity : -stockQuantity
    
    const result = await useInventoryStore.getState().createStockMovement({
      item_id: id,
      movement_type: stockAction === 'in' ? 'adjustment' : 'job_usage',
      quantity: qty,
      notes: stockNotes || `Manual stock ${stockAction}`,
      movement_date: new Date().toISOString().split('T')[0],
      status: 'completed'
    })

    if (result.success) {
      toast.success(`Stock ${stockAction === 'in' ? 'added' : 'removed'}!`)
      setShowStockModal(false)
      setStockQuantity(1)
      setStockNotes('')
      fetchItem(id)
      fetchStockMovements({ item_id: id })
    } else {
      toast.error(result.error || 'Failed to adjust stock')
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatDateTime = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const getMovementIcon = (type) => {
    if (!type) return RefreshCw
    if (['purchase', 'return', 'transfer_in'].includes(type)) return MoveRight
    if (['sale', 'transfer_out', 'write_off', 'damage', 'job_usage'].includes(type)) return MoveLeft
    return RefreshCw
  }

  const getMovementColor = (type) => {
    if (!type) return 'text-slate-500 bg-slate-100'
    if (['purchase', 'return', 'transfer_in'].includes(type)) return 'text-emerald-600 bg-emerald-100'
    if (['sale', 'transfer_out', 'write_off', 'damage', 'job_usage'].includes(type)) return 'text-red-600 bg-red-100'
    return 'text-slate-500 bg-slate-100'
  }

  if (loading && !selectedItem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!selectedItem) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Item not found</p>
      </div>
    )
  }

  const item = selectedItem
  const stockStatus = item.current_stock <= 0 ? 'Out of Stock' : item.current_stock <= item.reorder_point ? 'Low Stock' : 'In Stock'

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
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/inventory" className="text-slate-500 hover:text-emerald-600">Inventory</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/inventory/items" className="text-slate-500 hover:text-emerald-600">Stock List</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">{item.name}</span>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Package className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              {isEditing ? (
                <input type="text" value={editData?.name} onChange={(e) => setEditData({...editData, name: e.target.value})} className="text-2xl font-bold p-2 neu-inset rounded-xl" />
              ) : (
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{item.name}</h1>
              )}
              <p className="text-slate-500">{item.item_code}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button onClick={handleSaveEdit} disabled={saving} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white flex items-center gap-2">
                  <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setIsEditing(false); setEditData({...item}) }} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white">Cancel</button>
              </>
            ) : (
              <>
                <button onClick={() => setShowStockModal(true)} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" /><span>Adjust Stock</span>
                </button>
                <button onClick={() => setIsEditing(true)} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-2">
                  <Edit className="w-5 h-5" /><span>Edit</span>
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Stock Status Banner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`neu-raised rounded-2xl p-4 mb-6 flex items-center gap-3 ${
          stockStatus === 'Out of Stock' ? 'bg-red-50 dark:bg-red-900/10' : 
          stockStatus === 'Low Stock' ? 'bg-amber-50 dark:bg-amber-900/10' : 
          'bg-emerald-50 dark:bg-emerald-900/10'
        }`}>
          <AlertTriangle className={`w-6 h-6 ${
            stockStatus === 'Out of Stock' ? 'text-red-600' : 
            stockStatus === 'Low Stock' ? 'text-amber-600' : 
            'text-emerald-600'
          }`} />
          <div>
            <p className={`font-bold text-lg ${
              stockStatus === 'Out of Stock' ? 'text-red-700' : 
              stockStatus === 'Low Stock' ? 'text-amber-700' : 
              'text-emerald-700'
            }`}>{stockStatus}</p>
            <p className="text-sm text-slate-500">Reorder point: {item.reorder_point} {item.unit} | Minimum: {item.minimum_stock} {item.unit}</p>
          </div>
        </motion.div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Item Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Current Stock:</span><span className="font-bold text-slate-800 dark:text-white">{item.current_stock} {item.unit}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Available Stock:</span><span>{item.available_stock ?? item.current_stock} {item.unit}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Unit Cost:</span><span className="font-medium">{formatCurrency(item.unit_cost)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Unit Price:</span><span>{formatCurrency(item.unit_price)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Category:</span><span style={{color: item.item_categories?.color}}>{item.item_categories?.name || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Warehouse:</span><span>{item.warehouses?.name || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Preferred Supplier:</span><span>{item.suppliers?.company_name || 'N/A'}</span></div>
            </div>
          </div>

          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Barcode & Tracking</h2>
            {item.barcode ? (
              <div className="flex items-center gap-3 mb-4">
                <Barcode className="w-6 h-6 text-slate-600" />
                <span className="font-mono text-lg">{item.barcode}</span>
              </div>
            ) : (
              <p className="text-slate-400 italic mb-4">No barcode assigned</p>
            )}
            {isEditing ? (
              <input type="text" value={editData?.barcode || ''} onChange={(e) => setEditData({...editData, barcode: e.target.value})} placeholder="Enter barcode" className="w-full p-3 neu-inset rounded-xl mb-3" />
            ) : null}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Storage Location:</span><span>{item.storage_location || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Shelf:</span><span>{item.shelf_number || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Bin:</span><span>{item.bin_number || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status:</span><span className="capitalize">{item.status || 'active'}</span></div>
            </div>
            {item.description && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stock Movements History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />Stock Movement History ({stockMovements.length})
            </h2>
          </div>

          {stockMovements.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No movements recorded for this item</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Type</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Quantity</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Reference</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Date</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMovements.map((movement) => {
                    const Icon = getMovementIcon(movement.movement_type)
                    return (
                      <tr key={movement.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getMovementColor(movement.movement_type)}`}>
                            <Icon className="w-3 h-3" />
                            {movement.movement_type?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className={`py-3 px-3 font-bold ${movement.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{movement.reference_number || 'N/A'}</td>
                        <td className="py-3 px-3 text-slate-500 text-xs">{formatDateTime(movement.created_at || movement.movement_date)}</td>
                        <td className="py-3 px-3 text-slate-500 text-xs">{movement.notes || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>

      {/* Stock Adjust Modal */}
      <AnimatePresence>
        {showStockModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowStockModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Adjust Stock</h3>
                <button onClick={() => setShowStockModal(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex gap-2 mb-4">
                <button onClick={() => setStockAction('in')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${stockAction === 'in' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  <MoveRight className="w-4 h-4" /> Stock In
                </button>
                <button onClick={() => setStockAction('out')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${stockAction === 'out' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  <MoveLeft className="w-4 h-4" /> Stock Out
                </button>
              </div>

              <div className="mb-3">
                <label className="text-sm text-slate-500">Quantity *</label>
                <input type="number" value={stockQuantity} onChange={e => setStockQuantity(Math.max(1, parseInt(e.target.value) || 1))} min="1" max={stockAction === 'out' ? item.current_stock : undefined} className="w-full p-3 neu-inset rounded-xl mt-1" />
                {stockAction === 'out' && <p className="text-xs text-amber-600 mt-1">Max available: {item.current_stock} {item.unit}</p>}
              </div>

              <div className="mb-4">
                <label className="text-sm text-slate-500">Notes</label>
                <textarea value={stockNotes} onChange={e => setStockNotes(e.target.value)} rows={2} placeholder="Reason for adjustment..." className="w-full p-3 neu-inset rounded-xl mt-1" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowStockModal(false)} className="flex-1 py-3 rounded-xl bg-slate-300 dark:bg-slate-600 font-bold text-sm">Cancel</button>
                <button onClick={handleStockAdjust} className={`flex-1 py-3 rounded-xl font-bold text-sm text-white ${stockAction === 'in' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
