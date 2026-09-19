import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Package, Plus, Trash2, Send, X, Loader2, 
  Scan, Camera, Check, AlertCircle
} from 'lucide-react'

export default function RequestSupplies() {
  const { user } = useAuthStore()
  const { myJobs } = useMobileStore()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('request')
  const [items, setItems] = useState([{ name: '', quantity: 1, unit: 'each', notes: '' }])
  const [jobId, setJobId] = useState('')
  const [urgency, setUrgency] = useState('normal')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [myEmployeeId, setMyEmployeeId] = useState(null)
  const [myRequests, setMyRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scannedItem, setScannedItem] = useState(null)
  const scannerRef = useRef(null)

  useEffect(() => {
    setupAndLoad()
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.clear() } catch (e) {}
      }
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'scan') startScanner()
    else stopScanner()
  }, [activeTab])

  const setupAndLoad = async () => {
    const { data: emp } = await supabase.from('employees').select('id').eq('user_id', user?.id).single()
    setMyEmployeeId(emp?.id || null)
    if (emp?.id) await loadRequests(emp.id)
    setLoadingRequests(false)
  }

  const loadRequests = async (empId) => {
    const { data } = await supabase
      .from('supplies_requests')
      .select('*, supplies_request_items(*)')
      .eq('employee_id', empId)
      .order('created_at', { ascending: false })
      .limit(20)
    setMyRequests(data || [])
  }

  const addItem = () => setItems([...items, { name: '', quantity: 1, unit: 'each', notes: '' }])
  const removeItem = (i) => items.length > 1 && setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i, field, value) => {
    const newItems = [...items]
    newItems[i][field] = value
    setItems(newItems)
  }

  const handleSubmit = async () => {
    const validItems = items.filter(it => it.name.trim())
    if (validItems.length === 0) { toast.error('Add at least one item'); return }
    if (!myEmployeeId) { toast.error('Profile not ready'); return }

    setSubmitting(true)
    try {
      const { data: request, error } = await supabase
        .from('supplies_requests')
        .insert([{
          employee_id: myEmployeeId,
          job_id: jobId || null,
          urgency,
          notes,
          status: 'pending'
        }])
        .select()
        .single()

      if (error) throw error

      const itemsToInsert = validItems.map(it => ({
        request_id: request.id,
        item_name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        notes: it.notes
      }))

      const { error: itemsError } = await supabase
        .from('supplies_request_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      toast.success('Request submitted!')
      setItems([{ name: '', quantity: 1, unit: 'each', notes: '' }])
      setJobId('')
      setNotes('')
      setUrgency('normal')
      await loadRequests(myEmployeeId)
      setActiveTab('my')
    } catch (err) {
      console.error(err)
      toast.error('Failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================
  // QR SCANNER
  // ============================================
  const startScanner = async () => {
    setScanning(true)
    setScannedItem(null)
    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      setTimeout(() => {
        const scanner = new Html5QrcodeScanner('qr-reader', {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true
        }, false)

        scanner.render(
          (decodedText) => {
            console.log('✅ Scanned:', decodedText)
            setScannedItem(decodedText)
            toast.success('Item scanned!')
            try { scanner.clear() } catch (e) {}
            setScanning(false)
          },
          (error) => { /* Ignore scan errors */ }
        )
        scannerRef.current = scanner
      }, 100)
    } catch (err) {
      console.error('Scanner error:', err)
      toast.error('Camera not available')
      setScanning(false)
    }
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      try { scannerRef.current.clear() } catch (e) {}
      scannerRef.current = null
    }
    setScanning(false)
  }

  const useScannedItem = () => {
    if (!scannedItem) return
    // Add scanned item to the request list
    setItems([...items, { name: scannedItem, quantity: 1, unit: 'each', notes: 'Scanned' }])
    setScannedItem(null)
    setActiveTab('request')
    toast.success('Added to request')
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : ''

  const getStatusColor = (s) => {
    if (s === 'approved') return 'bg-emerald-100 text-emerald-700'
    if (s === 'rejected') return 'bg-red-100 text-red-700'
    if (s === 'fulfilled') return 'bg-blue-100 text-blue-700'
    return 'bg-amber-100 text-amber-700'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-500 via-indigo-600 to-blue-700 font-['Inter'] flex flex-col"
      style={{ minHeight: '100dvh' }}>
      
      {/* Header */}
      <div className="px-5 pt-8 pb-5 text-white flex-shrink-0">
        <h1 className="text-2xl font-bold">Request Supplies</h1>
        <p className="text-purple-100 text-sm mt-1">Request or scan supplies</p>
      </div>

      {/* Tabs */}
      <div className="px-5 -mt-2 flex-shrink-0">
        <div className="flex gap-2 bg-white/10 rounded-2xl p-1">
          <button onClick={() => setActiveTab('request')} 
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'request' ? 'bg-white text-purple-700 shadow-lg' : 'text-white/70'
            }`}>
            <Plus className="w-4 h-4" /> Request
          </button>
          <button onClick={() => setActiveTab('scan')} 
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'scan' ? 'bg-white text-purple-700 shadow-lg' : 'text-white/70'
            }`}>
            <Scan className="w-4 h-4" /> Scan
          </button>
          <button onClick={() => setActiveTab('my')} 
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'my' ? 'bg-white text-purple-700 shadow-lg' : 'text-white/70'
            }`}>
            <Package className="w-4 h-4" /> My ({myRequests.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-3 pb-24 flex-1 overflow-y-auto">
        
        {/* === REQUEST TAB === */}
        {activeTab === 'request' && (
          <div className="space-y-3">
            {/* Job */}
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <label className="text-xs text-slate-500 mb-1 block">Job (optional)</label>
              <select 
                value={jobId} 
                onChange={e => setJobId(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-100 text-sm"
              >
                <option value="">No specific job</option>
                {(myJobs || []).map(j => (
                  <option key={j.id} value={j.id}>{j.job_number} - {j.title}</option>
                ))}
              </select>
            </div>

            {/* Urgency */}
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <label className="text-xs text-slate-500 mb-2 block">Urgency</label>
              <div className="grid grid-cols-3 gap-2">
                {['normal','urgent','critical'].map(u => (
                  <button
                    key={u}
                    onClick={() => setUrgency(u)}
                    className={`py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                      urgency === u 
                        ? u === 'critical' ? 'bg-red-600 text-white' 
                        : u === 'urgent' ? 'bg-amber-600 text-white' 
                        : 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Items</h3>
                <button onClick={addItem} className="text-purple-600 text-sm flex items-center gap-1 font-medium">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              {items.map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">Item {i + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="text-red-500 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => updateItem(i, 'name', e.target.value)}
                    placeholder="Item name"
                    className="w-full p-3 rounded-xl bg-white border border-slate-200 text-sm"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder="Qty"
                      className="p-3 rounded-xl bg-white border border-slate-200 text-sm"
                    />
                    <select
                      value={item.unit}
                      onChange={e => updateItem(i, 'unit', e.target.value)}
                      className="p-3 rounded-xl bg-white border border-slate-200 text-sm"
                    >
                      <option value="each">each</option>
                      <option value="box">box</option>
                      <option value="litre">litre</option>
                      <option value="pack">pack</option>
                      <option value="roll">roll</option>
                    </select>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={e => updateItem(i, 'notes', e.target.value)}
                      placeholder="Notes"
                      className="p-3 rounded-xl bg-white border border-slate-200 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <label className="text-xs text-slate-500 mb-1 block">Additional Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional info..."
                className="w-full p-3 rounded-xl bg-slate-100 text-sm resize-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-purple-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        )}

        {/* === SCAN TAB === */}
        {activeTab === 'scan' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Scan className="w-5 h-5 text-purple-600" />
                Scan Supply Barcode / QR
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Point your camera at a barcode or QR code to scan supplies
              </p>
              
              <div 
                id="qr-reader" 
                className="w-full rounded-2xl overflow-hidden bg-black"
                style={{ minHeight: '320px' }}
              />

              {!scanning && (
                <button
                  onClick={startScanner}
                  className="w-full mt-3 py-4 rounded-2xl bg-purple-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95"
                >
                  <Camera className="w-5 h-5" />
                  Start Scanner
                </button>
              )}
            </div>

            {scannedItem && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-4 shadow-lg border-2 border-emerald-500"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-slate-800">Scanned Item</span>
                </div>
                <p className="p-3 rounded-xl bg-slate-100 text-sm font-mono text-slate-800 mb-3 break-all">
                  {scannedItem}
                </p>
                <button
                  onClick={useScannedItem}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Add to Request
                </button>
              </motion.div>
            )}

            <div className="bg-white/10 rounded-2xl p-4">
              <div className="flex items-start gap-2 text-white">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold mb-1">Tips:</p>
                  <ul className="space-y-1 text-white/80">
                    <li>• Ensure good lighting</li>
                    <li>• Hold camera steady</li>
                    <li>• Fill frame with barcode</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === MY REQUESTS TAB === */}
        {activeTab === 'my' && (
          <div className="space-y-3">
            {loadingRequests ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-white mx-auto" />
              </div>
            ) : myRequests.length > 0 ? (
              myRequests.map(req => (
                <div key={req.id} className="bg-white rounded-2xl p-4 shadow-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Request #{req.id?.slice(0, 8)}</p>
                      <p className="text-xs text-slate-500">{formatDate(req.created_at)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {(req.supplies_request_items || []).slice(0, 3).map(item => (
                      <p key={item.id} className="text-xs text-slate-600">
                        • {item.item_name} × {item.quantity} {item.unit}
                      </p>
                    ))}
                    {(req.supplies_request_items || []).length > 3 && (
                      <p className="text-xs text-slate-400 italic">
                        +{(req.supplies_request_items || []).length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-white/10 rounded-3xl">
                <Package className="w-16 h-16 text-white/50 mx-auto mb-3" />
                <p className="text-white font-semibold">No requests yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav active="supplies" />
    </div>
  )
}
