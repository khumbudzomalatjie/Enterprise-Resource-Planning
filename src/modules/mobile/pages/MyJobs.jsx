import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { Html5Qrcode } from 'html5-qrcode'
import { Briefcase, MapPin, Clock, Calendar, Search, Hand, Play, CheckCircle2, Camera, Package, AlertCircle, User, List, RefreshCw, Lock, X, Upload, Barcode, ScanLine, Keyboard, Check, ArrowRight } from 'lucide-react'

export default function MyJobs() {
  const { user } = useAuthStore()
  const { openJobs, myJobs, fetchOpenJobs, fetchMyJobs, selectJob, startJob, completeJob, uploadPhoto, createSuppliesRequest, reportIncident, searchInventoryByBarcode, recordInventoryUsage } = useMobileStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('open')
  const [loading, setLoading] = useState(true)
  const [jobSearch, setJobSearch] = useState('')
  const [updatingJob, setUpdatingJob] = useState(null)
  const [myEmployeeId, setMyEmployeeId] = useState(null)

  // Modals
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [photoJobId, setPhotoJobId] = useState(null)
  const [photoType, setPhotoType] = useState('before')
  const [photoCaption, setPhotoCaption] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  const [showSuppliesModal, setShowSuppliesModal] = useState(false)
  const [suppliesJobId, setSuppliesJobId] = useState(null)
  const [supplyItem, setSupplyItem] = useState('')
  const [supplyQty, setSupplyQty] = useState(1)

  const [showIncidentModal, setShowIncidentModal] = useState(false)
  const [incidentJobId, setIncidentJobId] = useState(null)
  const [incidentTitle, setIncidentTitle] = useState('')
  const [incidentDesc, setIncidentDesc] = useState('')
  const [incidentType, setIncidentType] = useState('other')
  const [incidentSeverity, setIncidentSeverity] = useState('medium')

  // Inventory Scan
  const [showInventoryScan, setShowInventoryScan] = useState(false)
  const [scanJobId, setScanJobId] = useState(null)
  const [scanContext, setScanContext] = useState('quick')
  const [scanMode, setScanMode] = useState('camera')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scannedItem, setScannedItem] = useState(null)
  const [scanQty, setScanQty] = useState(1)
  const [scanNotes, setScanNotes] = useState('')
  const [scanning, setScanning] = useState(false)
  const [showJobPicker, setShowJobPicker] = useState(false)
  const [selectedJobForScan, setSelectedJobForScan] = useState('')
  const [scanComplete, setScanComplete] = useState(false)
  const scannerRef = useRef(null)
  const scannerIdRef = useRef('qr-scanner-' + Date.now())

  useEffect(() => {
    setupAndLoad()
    const interval = setInterval(() => { if (myEmployeeId) { fetchOpenJobs(); fetchMyJobs(myEmployeeId) } }, 15000)
    return () => clearInterval(interval)
  }, [myEmployeeId])

  useEffect(() => {
    if (!showInventoryScan) {
      stopScanner()
    }
  }, [showInventoryScan])

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (e) {}
      scannerRef.current = null
    }
  }

  const startScanner = async () => {
    setScanning(true)
    try {
      const scanner = new Html5Qrcode(scannerIdRef.current)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        async (decodedText) => {
          await stopScanner()
          setScanning(false)
          await handleBarcodeSearch(decodedText)
        },
        () => {}
      )
    } catch (err) {
      console.error('Scanner error:', err)
      setScanning(false)
      toast.error('Camera not accessible. Try manual entry.')
      setScanMode('manual')
    }
  }

  const handleBarcodeSearch = async (barcode) => {
    if (!barcode || !barcode.trim()) return
    setScanning(true)
    const result = await searchInventoryByBarcode(barcode.trim())
    setScanning(false)

    if (result.error) { toast.error(result.error); return }
    if (!result.data) { toast.error('Item not found'); return }

    setScannedItem(result.data)
    setScanQty(1)
    setScanComplete(false)

    if (scanContext === 'quick') {
      if (myJobs.length === 1) {
        setScanJobId(myJobs[0].id)
        setSelectedJobForScan(myJobs[0].id)
      } else {
        setShowJobPicker(true)
      }
    }
  }

  const setupAndLoad = async () => {
    const empId = await findOrCreateEmployee()
    if (empId) { setMyEmployeeId(empId); await Promise.all([fetchOpenJobs(), fetchMyJobs(empId)]) }
    setLoading(false)
  }

  const findOrCreateEmployee = async () => {
    let { data: emp } = await supabase.from('employees').select('id').eq('user_id', user?.id).single()
    if (emp) return emp.id
    const { data: empByEmail } = await supabase.from('employees').select('id').eq('email', user?.email).single()
    if (empByEmail) { await supabase.from('employees').update({ user_id: user?.id }).eq('id', empByEmail.id); return empByEmail.id }
    const firstName = user?.email?.split('@')[0] || 'Cleaner'
    const { data: newEmp } = await supabase.from('employees').insert([{ user_id: user?.id, first_name: firstName, last_name: '', email: user?.email, employment_status: 'active', department: 'Cleaning', employee_code: 'MOB-' + Date.now().toString(36).toUpperCase().slice(-4) }]).select('id').single()
    return newEmp?.id || null
  }

  const refreshData = async () => {
    if (!myEmployeeId) return
    setLoading(true)
    await Promise.all([fetchOpenJobs(), fetchMyJobs(myEmployeeId)])
    setLoading(false)
    toast.success('Refreshed!')
  }

  const handleSelectJob = async (jobId) => {
    if (!myEmployeeId) { toast.error('Profile not ready'); return }
    if (myJobs.length > 0) { toast.error('Complete current job first'); return }
    setUpdatingJob(jobId)
    const result = await selectJob(jobId, myEmployeeId)
    result.success ? (toast.success('Job selected!'), setActiveTab('mine')) : toast.error('Failed')
    setUpdatingJob(null)
  }

  const handleStartJob = async (jobId) => {
    setUpdatingJob(jobId)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await startJob(jobId, myEmployeeId, pos.coords.latitude, pos.coords.longitude)
    }, async () => { await startJob(jobId, myEmployeeId, null, null) })
    toast.success('Job started!')
    await fetchMyJobs(myEmployeeId)
    setUpdatingJob(null)
  }

  const handleCompleteJob = async (jobId) => {
    if (!window.confirm('Mark job as completed?')) return
    setUpdatingJob(jobId)
    const result = await completeJob(jobId, myEmployeeId)
    result.success ? (toast.success('Completed!'), setActiveTab('open')) : toast.error('Failed')
    setUpdatingJob(null)
  }

  const openPhotoModal = (jobId, type) => { setPhotoJobId(jobId); setPhotoType(type); setPhotoCaption(''); setSelectedFile(null); setShowPhotoModal(true) }
  const handleFileSelect = (e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]) }

  const handleUploadPhoto = async () => {
    if (!selectedFile) { toast.error('Please select a photo'); return }
    setUpdatingJob(photoJobId)
    const result = await uploadPhoto(photoJobId, myEmployeeId, selectedFile, photoType, photoCaption)
    result.success ? toast.success('Photo uploaded!') : toast.error('Upload failed')
    setShowPhotoModal(false)
    setUpdatingJob(null)
  }

  const openSuppliesModal = (jobId) => { setSuppliesJobId(jobId); setSupplyItem(''); setSupplyQty(1); setShowSuppliesModal(true) }
  const handleSuppliesRequest = async () => {
    if (!supplyItem) { toast.error('Enter item name'); return }
    setUpdatingJob(suppliesJobId)
    const result = await createSuppliesRequest(
      { job_id: suppliesJobId, employee_id: myEmployeeId, status: 'pending', notes: 'Requested from mobile' },
      [{ item_name: supplyItem, quantity: supplyQty, unit: 'each' }]
    )
    result.success ? toast.success('Supplies requested!') : toast.error('Failed')
    setShowSuppliesModal(false)
    setUpdatingJob(null)
  }

  const openIncidentModal = (jobId) => { setIncidentJobId(jobId); setIncidentTitle(''); setIncidentDesc(''); setIncidentType('other'); setIncidentSeverity('medium'); setShowIncidentModal(true) }
  const handleIncidentReport = async () => {
    if (!incidentTitle) { toast.error('Enter incident title'); return }
    setUpdatingJob(incidentJobId)
    const result = await reportIncident({
      job_id: incidentJobId, employee_id: myEmployeeId, reported_by: user?.id,
      title: incidentTitle, description: incidentDesc,
      incident_type: incidentType, severity: incidentSeverity,
      incident_date: new Date().toISOString().split('T')[0],
      incident_time: new Date().toTimeString().slice(0, 5), status: 'reported'
    })
    result.success ? toast.success('Incident reported!') : toast.error('Failed')
    setShowIncidentModal(false)
    setUpdatingJob(null)
  }

  // ═══════════════════════════════════════════
  // INVENTORY SCANNING
  // ═══════════════════════════════════════════
  const openQuickScan = () => {
    setScanContext('quick')
    setScanJobId(null)
    setBarcodeInput('')
    setScannedItem(null)
    setScanQty(1)
    setScanNotes('')
    setSelectedJobForScan('')
    setShowJobPicker(false)
    setScanComplete(false)
    setScanMode('camera')
    setShowInventoryScan(true)
    setTimeout(() => startScanner(), 500)
  }

  const openJobScan = (jobId) => {
    setScanContext('job')
    setScanJobId(jobId)
    setBarcodeInput('')
    setScannedItem(null)
    setScanQty(1)
    setScanNotes('')
    setShowJobPicker(false)
    setScanComplete(false)
    setScanMode('camera')
    setShowInventoryScan(true)
    setTimeout(() => startScanner(), 500)
  }

  const handleRecordUsage = async () => {
    if (!scannedItem) return

    let finalJobId = scanJobId
    if (scanContext === 'quick' && !finalJobId) {
      if (selectedJobForScan) {
        finalJobId = selectedJobForScan
      } else if (myJobs.length === 1) {
        finalJobId = myJobs[0].id
      } else {
        toast.error('Select a job for this inventory')
        setShowJobPicker(true)
        return
      }
    }

    if (!finalJobId) {
      toast.error('No job selected')
      setShowJobPicker(true)
      return
    }

    if (scanQty > scannedItem.current_stock) {
      toast.error(`Not enough stock. Max ${scannedItem.current_stock}`)
      return
    }

    setScanning(true)
    const result = await recordInventoryUsage(finalJobId, myEmployeeId, scannedItem.id, scanQty, scanNotes)
    setScanning(false)

    if (result.success) {
      setScanComplete(true)
      toast.success(`✅ ${scanQty} x ${scannedItem.name} moved to job!`)
      
      // Reset for next scan after a delay
      setTimeout(() => {
        setShowInventoryScan(false)
        setScannedItem(null)
        setBarcodeInput('')
        setScanNotes('')
        setSelectedJobForScan('')
        setShowJobPicker(false)
        setScanComplete(false)
      }, 1500)
    } else {
      toast.error(result.error)
    }
  }

  const canComplete = (job) => job.assignment_status === 'in_progress'
  const needsStart = (job) => job.assignment_status === 'assigned' || job.assignment_status === 'accepted'
  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }) : ''
  const todayStr = new Date().toISOString().split('T')[0]
  const filterJobs = (jobs) => jobs.filter(j => {
    if (!jobSearch) return true
    const s = jobSearch.toLowerCase()
    return (j.title || '').toLowerCase().includes(s) || (j.job_number || '').toLowerCase().includes(s) || (j.clients?.company_name || '').toLowerCase().includes(s)
  })
  const filteredOpen = filterJobs(openJobs || [])
  const filteredMine = filterJobs(myJobs || [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-700 font-['Inter'] pb-20">
      {/* HEADER */}
      <div className="px-5 pt-8 pb-5 text-white">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Jobs</h1><p className="text-blue-100 text-sm mt-1">Auto-refreshes</p></div>
          <div className="flex gap-2">
            <button onClick={openQuickScan} className="p-2 rounded-xl bg-teal-500/80 hover:bg-teal-500 flex items-center gap-1.5" title="Quick Scan Inventory">
              <ScanLine className="w-5 h-5" /><span className="text-xs font-bold">Scan</span>
            </button>
            <button onClick={refreshData} className="p-2 rounded-xl bg-white/20"><RefreshCw className="w-5 h-5 text-white" /></button>
          </div>
        </div>
        {myJobs.length > 0 && (
          <div className="mt-3 bg-amber-400/20 border border-amber-400/30 rounded-xl p-3 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-300 flex-shrink-0" />
            <div>
              <p className="text-amber-200 text-sm font-semibold">Active: {myJobs[0]?.title}</p>
              <p className="text-amber-300/70 text-xs">{needsStart(myJobs[0]) ? '⏳ Tap Start to begin' : canComplete(myJobs[0]) ? '🔨 Work in progress' : 'Status: ' + (myJobs[0]?.assignment_status || 'N/A')}</p>
            </div>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="px-5 -mt-2">
        <div className="flex gap-2 bg-white/10 rounded-2xl p-1">
          <button onClick={() => setActiveTab('open')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'open' ? 'bg-white text-blue-700 shadow-lg' : 'text-white/70'}`}><List className="w-4 h-4" /> Open ({filteredOpen.length})</button>
          <button onClick={() => setActiveTab('mine')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'mine' ? 'bg-white text-amber-700 shadow-lg' : 'text-white/70'}`}><User className="w-4 h-4" /> My Jobs ({filteredMine.length})</button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="px-5 mt-3 mb-3"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" /><input type="text" value={jobSearch} onChange={e => setJobSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/15 text-white placeholder-white/40 text-sm border border-white/10" /></div></div>

      {/* CONTENT */}
      <div className="px-5">
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div></div>
        ) : activeTab === 'open' ? (
          filteredOpen.length > 0 ? (
            <div className="space-y-2.5">
              {filteredOpen.map((job, i) => (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className={`bg-white rounded-2xl p-4 shadow-md border-l-4 ${myJobs.length > 0 ? 'border-l-slate-300 opacity-60' : 'border-l-blue-400'}`}>
                  <div className="flex justify-between mb-2"><div className="flex-1"><h3 className="font-semibold text-slate-800 text-sm">{job.title}</h3><p className="text-xs text-slate-400">{job.job_number} · {job.clients?.company_name}</p></div><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">{job.status}</span></div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2"><Calendar className="w-3 h-3" />{job.scheduled_date === todayStr ? 'Today' : formatDate(job.scheduled_date)}<span className="mx-1">·</span><Clock className="w-3 h-3" />{job.scheduled_start_time?.slice(0,5)}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3"><MapPin className="w-3 h-3" />{job.site_address?.slice(0, 40)}</div>
                  <button onClick={() => handleSelectJob(job.id)} disabled={updatingJob === job.id || myJobs.length > 0} className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm">{myJobs.length > 0 ? '🔒 Complete current job first' : <><Hand className="w-4 h-4" /> Select Job</>}</button>
                </motion.div>
              ))}
            </div>
          ) : <div className="text-center py-12 bg-white/10 rounded-2xl"><Briefcase className="w-12 h-12 text-white/50 mx-auto mb-2" /><p className="text-white font-semibold">No open jobs</p></div>
        ) : (
          filteredMine.length > 0 ? (
            <div className="space-y-2.5">
              {filteredMine.map((job, i) => (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-white rounded-2xl p-4 shadow-md border-l-4 border-l-amber-400">
                  <div className="flex justify-between mb-2"><div className="flex-1"><h3 className="font-semibold text-slate-800 text-sm">{job.title}</h3><p className="text-xs text-slate-400">{job.job_number} · {job.clients?.company_name}</p></div><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${needsStart(job) ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{needsStart(job) ? 'Selected' : 'In Progress'}</span></div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2"><Calendar className="w-3 h-3" />{job.scheduled_date === todayStr ? 'Today' : formatDate(job.scheduled_date)}<span className="mx-1">·</span><Clock className="w-3 h-3" />{job.scheduled_start_time?.slice(0,5)}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3"><MapPin className="w-3 h-3" />{job.site_address?.slice(0, 40)}</div>
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => handleStartJob(job.id)} disabled={updatingJob === job.id} className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-sm"><Play className="w-3.5 h-3.5" /> {needsStart(job) ? 'Start Job' : 'Restart'}</button>
                    <button onClick={() => handleCompleteJob(job.id)} disabled={updatingJob === job.id || !canComplete(job)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm ${canComplete(job) ? 'bg-emerald-600 text-white active:scale-95' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>{canComplete(job) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}{canComplete(job) ? 'Complete' : 'Start First'}</button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button onClick={() => openPhotoModal(job.id, 'before')} className="py-2 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 active:scale-95"><Camera className="w-3 h-3" /> Photos</button>
                    <button onClick={() => openSuppliesModal(job.id)} className="py-2 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 active:scale-95"><Package className="w-3 h-3" /> Supplies</button>
                    <button onClick={() => openIncidentModal(job.id)} className="py-2 bg-red-50 text-red-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 active:scale-95"><AlertCircle className="w-3 h-3" /> Incident</button>
                    <button onClick={() => openJobScan(job.id)} className="py-2 bg-teal-50 text-teal-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 active:scale-95"><Barcode className="w-3 h-3" /> Scan</button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : <div className="text-center py-12 bg-white/10 rounded-2xl"><User className="w-12 h-12 text-white/50 mx-auto mb-2" /><p className="text-white font-semibold">No jobs assigned</p></div>
        )}
      </div>

      {/* INVENTORY SCAN MODAL */}
      {showInventoryScan && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={() => setShowInventoryScan(false)}>
          <div className="bg-white rounded-t-3xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Barcode className="w-5 h-5 text-teal-600" />
                {scanContext === 'quick' ? 'Quick Scan Inventory' : 'Scan for Job'}
              </h3>
              <button onClick={() => setShowInventoryScan(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>

            {scanComplete ? (
              /* ✅ SUCCESS SCREEN */
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-10 h-10 text-emerald-600" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-1">Stock Moved!</h4>
                <p className="text-slate-500 mb-2">{scanQty} x {scannedItem?.name}</p>
                <p className="text-xs text-slate-400">Successfully recorded to job</p>
              </div>
            ) : !scannedItem ? (
              <>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => { setScanMode('camera'); setScanning(false); setTimeout(() => startScanner(), 300) }} className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1 ${scanMode === 'camera' ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Camera className="w-4 h-4" /> Camera
                  </button>
                  <button onClick={() => { setScanMode('manual'); stopScanner(); setScanning(false) }} className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1 ${scanMode === 'manual' ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <Keyboard className="w-4 h-4" /> Type
                  </button>
                </div>

                {scanMode === 'camera' ? (
                  <div className="relative rounded-2xl overflow-hidden bg-black mb-3">
                    <div id={scannerIdRef.current} className="w-full" style={{ minHeight: '280px' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-56 h-56 border-2 border-teal-400 rounded-2xl"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <input type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} placeholder="Enter barcode / item code" className="w-full p-3 border rounded-xl mb-3 text-sm" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSearch(barcodeInput)} />
                    <button onClick={() => handleBarcodeSearch(barcodeInput)} className="w-full py-3 bg-teal-500 text-white rounded-xl text-sm font-bold">Search</button>
                  </>
                )}
              </>
            ) : (
              <>
                {/* ITEM FOUND */}
                <div className="bg-teal-50 rounded-xl p-4 mb-3 border border-teal-200">
                  <p className="font-bold text-lg text-slate-800">{scannedItem.name}</p>
                  <p className="text-xs text-slate-500">{scannedItem.item_code} | Barcode: {scannedItem.barcode || 'N/A'}</p>
                  <p className="text-sm mt-1">Available: <span className="font-bold text-emerald-600">{scannedItem.current_stock} {scannedItem.unit}</span></p>
                </div>

                {/* Job Picker */}
                {showJobPicker && (
                  <div className="mb-3">
                    <label className="text-xs font-semibold text-slate-500">Select Job for this inventory:</label>
                    <select value={selectedJobForScan} onChange={(e) => setSelectedJobForScan(e.target.value)} className="w-full p-3 border rounded-xl mt-1 text-sm">
                      <option value="">-- Select Job --</option>
                      {myJobs.map(j => <option key={j.id} value={j.id}>{j.job_number} - {j.title}</option>)}
                    </select>
                  </div>
                )}

                <div className="mb-3">
                  <label className="text-xs text-slate-500">Quantity</label>
                  <input type="number" value={scanQty} onChange={(e) => setScanQty(Math.max(1, parseInt(e.target.value) || 1))} min="1" max={scannedItem.current_stock} className="w-full p-3 border rounded-xl mt-1 text-sm" />
                </div>

                <input type="text" value={scanNotes} onChange={(e) => setScanNotes(e.target.value)} placeholder="Notes (optional)" className="w-full p-3 border rounded-xl mb-3 text-sm" />

                {/* ✅ CLEAR CONFIRM BUTTONS */}
                <div className="flex gap-2 mb-2">
                  <button onClick={() => { setScannedItem(null); setBarcodeInput(''); setShowJobPicker(false); setSelectedJobForScan(''); setScanMode('camera'); setTimeout(() => startScanner(), 300) }} className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl text-sm font-bold">
                    Scan Again
                  </button>
                  <button onClick={handleRecordUsage} disabled={scanning} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg">
                    {scanning ? 'Moving...' : <><Check className="w-4 h-4" /> Confirm & Move to Job</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <BottomNav active="jobs" />
    </div>
  )
}
