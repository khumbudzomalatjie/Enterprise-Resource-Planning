import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useProcurementStore from '../store/procurementStore'
import useInventoryStore from '../../inventory/store/inventoryStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { ShoppingCart, Save, Send, Plus, Trash2, ChevronRight } from 'lucide-react'

export default function CreatePurchaseOrder() {
  const { createPurchaseOrder, fetchVendors, vendors } = useProcurementStore()
  const { items, fetchItems } = useInventoryStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const [poData, setPoData] = useState({
    vendor_id: '',
    expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    delivery_address: '',
    shipping_method: 'Standard',
    notes: '',
    status: 'draft'
  })

  const [lineItems, setLineItems] = useState([
    { description: '', quantity_ordered: 1, unit_price: 0, item_id: null }
  ])

  useEffect(() => {
    fetchItems()
    fetchVendors({ status: 'active' })
  }, [])

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity_ordered: 1, unit_price: 0, item_id: null }])
  }

  const removeLineItem = (index) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const updateLineItem = (index, field, value) => {
    const newItems = [...lineItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setLineItems(newItems)
  }

  const handleItemSelect = (index, itemId) => {
    const item = items.find(i => i.id === itemId)
    if (item) {
      updateLineItem(index, 'item_id', itemId)
      updateLineItem(index, 'description', item.name)
      updateLineItem(index, 'unit_price', item.unit_cost || 0)
    }
  }

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_price), 0)
  }

  const handleSubmit = async (status = 'draft') => {
    if (!poData.vendor_id) {
      toast.error('Please select a vendor')
      return
    }
    if (lineItems.some(item => !item.description)) {
      toast.error('Please fill in all items')
      return
    }

    const total = calculateTotal()
    const result = await createPurchaseOrder(
      { 
        ...poData, 
        total_amount: total,
        subtotal: total,
        tax_amount: total * 0.15,
        status,
        supplier_id: poData.vendor_id
      },
      lineItems
    )

    if (result.success) {
      toast.success(status === 'sent' ? 'PO sent!' : 'PO saved as draft!')
      navigate('/procurement/po')
    } else {
      toast.error(result.error || 'Failed to create PO')
    }
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/procurement" className="text-slate-500 hover:text-emerald-600">Procurement</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/procurement/po" className="text-slate-500 hover:text-emerald-600">Purchase Orders</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">New PO</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-8">
            <ShoppingCart className="w-8 h-8 text-emerald-600" />Create Purchase Order
          </h1>

          <div className="space-y-6">
            {/* PO Details */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Order Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500">Vendor *</label>
                  <select value={poData.vendor_id} onChange={(e) => setPoData({...poData, vendor_id: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" required>
                    <option value="">Select Vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Expected Delivery</label>
                  <input type="date" value={poData.expected_delivery_date} onChange={(e) => setPoData({...poData, expected_delivery_date: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" />
                </div>
                <div>
                  <label className="text-sm text-slate-500">Shipping Method</label>
                  <select value={poData.shipping_method} onChange={(e) => setPoData({...poData, shipping_method: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1">
                    <option value="Standard">Standard</option>
                    <option value="Express">Express</option>
                    <option value="Courier">Courier</option>
                    <option value="Collection">Collection</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-500">Delivery Address</label>
                  <textarea value={poData.delivery_address} onChange={(e) => setPoData({...poData, delivery_address: e.target.value})} rows={2} className="w-full p-3 neu-inset rounded-xl mt-1" placeholder="Main Warehouse, Johannesburg" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-500">Notes</label>
                  <textarea value={poData.notes} onChange={(e) => setPoData({...poData, notes: e.target.value})} rows={2} className="w-full p-3 neu-inset rounded-xl mt-1" />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="neu-raised rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Order Items</h2>
                <button onClick={addLineItem} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-sm">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={index} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-500">Item {index + 1}</span>
                      <button onClick={() => removeLineItem(index)} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <select onChange={(e) => handleItemSelect(index, e.target.value)} className="w-full p-2 neu-inset rounded-lg text-sm">
                      <option value="">Select from inventory</option>
                      {items.map(inv => <option key={inv.id} value={inv.id}>{inv.name} ({inv.item_code})</option>)}
                    </select>
                    <input type="text" value={item.description} onChange={(e) => updateLineItem(index, 'description', e.target.value)} placeholder="Description" className="w-full p-2 neu-inset rounded-lg text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={item.quantity_ordered} onChange={(e) => updateLineItem(index, 'quantity_ordered', parseFloat(e.target.value) || 0)} placeholder="Quantity" className="p-2 neu-inset rounded-lg text-sm" />
                      <input type="number" value={item.unit_price} onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="Unit Price" className="p-2 neu-inset rounded-lg text-sm" />
                    </div>
                    <div className="text-right text-sm">
                      <span className="text-slate-500">Line Total: </span>
                      <span className="font-semibold">{formatCurrency(item.quantity_ordered * item.unit_price)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-xl font-bold text-emerald-600">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-end">
              <button onClick={() => handleSubmit('draft')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2">
                <Save className="w-5 h-5" /><span>Save Draft</span>
              </button>
              <button onClick={() => handleSubmit('sent')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
                <Send className="w-5 h-5" /><span>Send PO</span>
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
