import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { ArrowLeft, MapPin, Clock, Calendar, Play, CheckCircle2, Camera, AlertCircle, FileText, Phone, Package, X, Send, Upload, Image, Plus } from 'lucide-react'

export default function JobDetail() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const { employee, fetchJobDetail, startJob, completeJob, uploadPhoto, reportIncident, saveJobReport, getJobReport } = useMobileStore()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [report, setReport] = useState({ work_completed: '', materials_used: '', hours_worked: '', issues_encountered: '', client_comments: '', employee_notes: '' })

  // Full screen modal states
  const [screen, setScreen] = useState(null) // null, 'incident', 'supplies', 'camera', 'report'
  const [photoType, setPhotoType] = useState('before')
  const [selectedFile, setSelectedFile] = useState(null)
  const [photoCaption, setPhotoCaption] = useState('')
  const [uploading, setUploading] = useState(false)

  const [incidentData, setIncidentData] = useState({ title: '', description: '', incident_type: 'other', severity: 'medium' })
  const [supplyItem, setSupplyItem] = useState('')
  const [supplyQty, setSupplyQty] = useState(1)
  const [photos, setPhotos] = useState([])

  useEffect(() => { if (id) loadJob(); loadReport() }, [id])

  const loadJob = async () => { const data = await fetchJobDetail(id); setJob(data); setPhotos(data?.job_photos || []) }
  const loadReport = async () => { const { data } = await getJobReport(id, employee?.id); if (data) setReport(data) }

  const handleStart = async () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const r = await startJob(id, employee?.id, pos.coords.latitude, pos.coords.longitude)
      r.success ? (toast.success('Job started!'), loadJob()) : toast.error('Failed')
    }, async () => { const r = await startJob(id, employee?.id, null, null); r.success ? (toast.success('Job started!'), loadJob()) : toast.error('Failed') })
  }

  const handleComplete = async () => {
    if (!report.work_completed) { toast.error('Fill job report first'); setScreen('report'); return }
    if (!window.confirm('Complete this job?')) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const r = await completeJob(id, employee?.id, pos.coords.latitude, pos.coords.longitude)
      r.success ? (toast.success('Completed!'), navigate('/mobile/jobs')) : toast.error('Failed')
    }, async () => { const r = await completeJob(id, employee?.id, null, null); r.success ? (toast.success('Completed!'), navigate('/mobile/jobs')) : toast.error('Failed') })
  }

  // ✅ PHOTO - Now requires tap to upload
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
  }

  const handleUploadPhoto = async () => {
    if (!selectedFile) { toast.error('Select a photo first'); return }
    setUploading(true)
    const result = await uploadPhoto(id, employee?.id, selectedFile, photoType, photoCaption)
    setUploading(false)
    if (result.error) { toast.error('Upload failed'); return }
    toast.success(`${photoType} photo uploaded!`)
    setScreen(null)
    setSelectedFile(null)
    setPhotoCaption('')
    loadJob()
  }

  // ✅ INCIDENT
  const handleSubmitIncident = async () => {
    if (!incidentData.title.trim()) { toast.error('Enter incident title'); return }
    const result = await reportIncident({
      ...incidentData, job_id: id, employee_id: employee?.id, reported_by: user?.id,
      incident_date: new Date().toISOString().split('T')[0],
      incident_time: new Date().toTimeString().slice(0, 5), status: 'reported'
    })
    if (result.error) { toast.error('Failed to report'); return }
    toast.success('Incident reported!')
    setScreen(null)
    setIncidentData({ title: '', description: '', incident_type: 'other', severity: 'medium' })
  }

  // ✅ SUPPLIES
  const handleSubmitSupplies = async () => {
    if (!supplyItem.trim()) { toast.error('Enter item name'); return }
    const { createSuppliesRequest } = useMobileStore.getState()
    const result = await createSuppliesRequest(
      { job_id: id, employee_id: employee?.id, status: 'pending', notes: 'Requested from mobile' },
      [{ item_name: supplyItem.trim(), quantity: supplyQty, unit: 'each' }]
    )
    if (!result.success) { toast.error('Failed to request'); return }
    toast.success('Supplies requested!')
    setScreen(null)
    setSupplyItem('')
    setSupplyQty(1)
  }

  // ✅ JOB REPORT
  const handleSaveReport = async () => {
    if (!report.work_completed.trim()) { toast.error('Enter work completed'); return }
    const result = await saveJobReport({ ...report, job_id: id, employee_id: employee?.id, status: 'completed' })
    result.error ? toast.error('Failed to save') : (toast.success('Report saved!'), setScreen(null))
  }

  // Open camera screen
  const openCamera = (type) => {
    setPhotoType(type)
    setSelectedFile(null)
    setPhotoCaption('')
    setScreen('camera')
  }

  if (!job) return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div></div>

  const canStart = job.assignment_status === 'assigned'
  const canComplete = job.assignment_status === 'in_progress'
  const isMyJob = job.field_job_assignments?.some(a => a.employee_id === employee?.id)

  // ============================================
  // FULL SCREEN MODALS
  // ============================================
  if (screen === 'camera') {
    return (
      <div className="min-h-screen bg-white font-['Inter'] flex flex-col">
        <div className="bg-blue-600 text-white px-5 pt-8 pb-5 flex items-center gap-3">
          <button onClick={() => setScreen(null)}><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="text-xl font-bold capitalize">{photoType} Photo</h1>
            <p className="text-blue-100 text-sm">Take or select a photo</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-5">
          {selectedFile ? (
            <div className="w-full">
              <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-full h-64 object-cover rounded-2xl mb-4" />
              <p className="text-sm text-slate-600 mb-2">✅ {selectedFile.name}</p>
              <button onClick={() => setSelectedFile(null)} className="text-red-500 text-sm mb-4">Remove & select another</button>
            </div>
          ) : (
            <div className="text-center mb-8">
              <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Camera className="w-12 h-12 text-slate-400" />
              </div>
              <p className="text-slate-500">No photo selected</p>
            </div>
          )}

          {/* Select Photo Button */}
          <label className="w-full py-4 bg-blue-50 border-2 border-dashed border-blue-300 rounded-2xl flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-100 mb-3">
            <Image className="w-5 h-5 text-blue-600" />
            <span className="text-blue-600 font-medium">{selectedFile ? 'Change Photo' : 'Select from Gallery'}</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
          </label>

          {/* Caption */}
          <input value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} placeholder="Add a caption (optional)" className="w-full p-3 border rounded-xl text-sm mb-4" />

          {/* ✅ UPLOAD BUTTON */}
          <button onClick={handleUploadPhoto} disabled={!selectedFile || uploading}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50">
            <Upload className="w-5 h-5" />
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
        </div>
      </div>
    )
  }

  // ============================================
  // INCIDENT FULL SCREEN
  // ============================================
  if (screen === 'incident') {
    return (
      <div className="min-h-screen bg-white font-['Inter'] flex flex-col">
        <div className="bg-red-600 text-white px-5 pt-8 pb-5 flex items-center gap-3">
          <button onClick={() => setScreen(null)}><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="text-xl font-bold">Report Incident</h1>
            <p className="text-red-100 text-sm">Job: {job.job_number}</p>
          </div>
        </div>
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Incident Title *</label>
            <input value={incidentData.title} onChange={e => setIncidentData({...incidentData, title: e.target.value})} placeholder="What happened?" className="w-full p-4 border rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Description</label>
            <textarea value={incidentData.description} onChange={e => setIncidentData({...incidentData, description: e.target.value})} placeholder="Describe the incident in detail..." rows={5} className="w-full p-4 border rounded-xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Type</label>
              <select value={incidentData.incident_type} onChange={e => setIncidentData({...incidentData, incident_type: e.target.value})} className="w-full p-4 border rounded-xl text-sm">
                <option value="accident">Accident</option><option value="injury">Injury</option><option value="property_damage">Property Damage</option><option value="equipment_failure">Equipment Failure</option><option value="near_miss">Near Miss</option><option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Severity</label>
              <select value={incidentData.severity} onChange={e => setIncidentData({...incidentData, severity: e.target.value})} className="w-full p-4 border rounded-xl text-sm">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-slate-200">
          <button onClick={handleSubmitIncident} className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2">
            <Send className="w-5 h-5" /> Submit Incident Report
          </button>
          <button onClick={() => setScreen(null)} className="w-full py-3 text-slate-500 font-medium mt-2">Cancel</button>
        </div>
      </div>
    )
  }

  // ============================================
  // SUPPLIES FULL SCREEN
  // ============================================
  if (screen === 'supplies') {
    return (
      <div className="min-h-screen bg-white font-['Inter'] flex flex-col">
        <div className="bg-purple-600 text-white px-5 pt-8 pb-5 flex items-center gap-3">
          <button onClick={() => setScreen(null)}><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="text-xl font-bold">Request Supplies</h1>
            <p className="text-purple-100 text-sm">Job: {job.job_number}</p>
          </div>
        </div>
        <div className="flex-1 p-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Item Name *</label>
            <input value={supplyItem} onChange={e => setSupplyItem(e.target.value)} placeholder="e.g. Detergent 5L, Gloves Box, Mop Head" className="w-full p-4 border rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Quantity</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setSupplyQty(Math.max(1, supplyQty - 1))} className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl font-bold">-</button>
              <span className="text-2xl font-bold w-16 text-center">{supplyQty}</span>
              <button onClick={() => setSupplyQty(supplyQty + 1)} className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl font-bold">+</button>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Unit</label>
            <select className="w-full p-4 border rounded-xl text-sm">
              <option value="each">Each</option><option value="box">Box</option><option value="bottle">Bottle</option><option value="pack">Pack</option><option value="litre">Litre</option>
            </select>
          </div>
        </div>
        <div className="p-5 border-t border-slate-200">
          <button onClick={handleSubmitSupplies} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2">
            <Send className="w-5 h-5" /> Submit Supplies Request
          </button>
          <button onClick={() => setScreen(null)} className="w-full py-3 text-slate-500 font-medium mt-2">Cancel</button>
        </div>
      </div>
    )
  }

  // ============================================
  // JOB REPORT FULL SCREEN
  // ============================================
  if (screen === 'report') {
    return (
      <div className="min-h-screen bg-white font-['Inter'] flex flex-col">
        <div className="bg-emerald-600 text-white px-5 pt-8 pb-5 flex items-center gap-3">
          <button onClick={() => setScreen(null)}><ArrowLeft className="w-6 h-6" /></button>
          <div>
            <h1 className="text-xl font-bold">Job Report</h1>
            <p className="text-emerald-100 text-sm">Job: {job.job_number}</p>
          </div>
        </div>
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Work Completed *</label>
            <textarea value={report.work_completed} onChange={e => setReport({...report, work_completed: e.target.value})} placeholder="Describe what work was done..." rows={4} className="w-full p-4 border rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Materials Used</label>
            <input value={report.materials_used} onChange={e => setReport({...report, materials_used: e.target.value})} placeholder="List materials used" className="w-full p-4 border rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Hours Worked</label>
            <input value={report.hours_worked} onChange={e => setReport({...report, hours_worked: e.target.value})} type="number" step="0.5" placeholder="e.g. 4.5" className="w-full p-4 border rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Issues Encountered</label>
            <textarea value={report.issues_encountered} onChange={e => setReport({...report, issues_encountered: e.target.value})} placeholder="Any problems during the job?" rows={3} className="w-full p-4 border rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Client Comments</label>
            <textarea value={report.client_comments} onChange={e => setReport({...report, client_comments: e.target.value})} placeholder="What did the client say?" rows={2} className="w-full p-4 border rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Your Notes</label>
            <textarea value={report.employee_notes} onChange={e => setReport({...report, employee_notes: e.target.value})} placeholder="Any additional notes..." rows={2} className="w-full p-4 border rounded-xl text-sm" />
          </div>
        </div>
        <div className="p-5 border-t border-slate-200">
          <button onClick={handleSaveReport} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2">
            <Send className="w-5 h-5" /> Save Job Report
          </button>
          <button onClick={() => setScreen(null)} className="w-full py-3 text-slate-500 font-medium mt-2">Cancel</button>
        </div>
      </div>
    )
  }

  // ============================================
  // MAIN JOB DETAIL PAGE
  // ============================================
  return (
    <div className="min-h-screen bg-slate-100 font-['Inter'] pb-20">
      <div className="bg-blue-600 text-white px-5 pt-8 pb-5">
        <button onClick={() => navigate(-1)} className="mb-3"><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-xl font-bold">{job.title}</h1>
        <p className="text-blue-100 text-sm">{job.job_number} · {job.clients?.company_name}</p>
        <div className="flex gap-3 mt-2 text-xs text-blue-100 flex-wrap">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.site_address}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(job.scheduled_date).toLocaleDateString()}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.scheduled_start_time?.slice(0, 5)}</span>
        </div>
        {job.site_contact_phone && (
          <a href={`tel:${job.site_contact_phone}`} className="mt-2 inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-xs"><Phone className="w-3 h-3" /> Call {job.site_contact_name || 'Site'}</a>
        )}
      </div>

      {isMyJob && (
        <div className="px-5 -mt-3">
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex gap-2">
              {canStart && <button onClick={handleStart} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Play className="w-5 h-5" /> Start Job</button>}
              {canComplete && <button onClick={() => setScreen('report')} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> Complete</button>}
            </div>
            <p className="text-center text-xs text-slate-500 mt-2">Status: <span className="font-semibold capitalize">{job.assignment_status}</span></p>
          </div>
        </div>
      )}

      {/* Photos */}
      <div className="px-5 mt-3">
        <h3 className="font-semibold text-slate-700 mb-2">Photos ({photos.length})</h3>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {['before', 'during', 'after'].map(type => (
            <button key={type} onClick={() => openCamera(type)} className="bg-white rounded-xl p-4 shadow-sm text-center hover:bg-blue-50">
              <Plus className="w-6 h-6 text-blue-500 mx-auto mb-1" />
              <span className="text-xs font-medium capitalize text-slate-600">{type}</span>
            </button>
          ))}
        </div>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map(p => (
              <div key={p.id} className="relative">
                <img src={p.photo_url} alt={p.photo_type} className="w-full h-24 object-cover rounded-lg" />
                <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 rounded">{p.photo_type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-5 mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => setScreen('report')} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-2 hover:bg-emerald-50">
          <FileText className="w-5 h-5 text-emerald-500" /><span className="text-sm font-medium">Job Report</span>
        </button>
        <button onClick={() => setScreen('incident')} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-2 hover:bg-red-50">
          <AlertCircle className="w-5 h-5 text-red-500" /><span className="text-sm font-medium">Incident</span>
        </button>
        <button onClick={() => setScreen('supplies')} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-2 hover:bg-purple-50">
          <Package className="w-5 h-5 text-purple-500" /><span className="text-sm font-medium">Supplies</span>
        </button>
      </div>

      {/* Team */}
      <div className="px-5 mt-3">
        <h3 className="font-semibold text-slate-700 mb-2">Team</h3>
        {job.field_job_assignments?.map(a => (
          <div key={a.id} className="bg-white rounded-xl p-3 shadow-sm mb-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm">{a.employees?.first_name?.[0]}{a.employees?.last_name?.[0]}</div>
            <div><p className="text-sm font-medium">{a.employees?.first_name} {a.employees?.last_name}</p><p className="text-xs text-slate-500 capitalize">{a.assignment_status}</p></div>
          </div>
        ))}
      </div>

      <BottomNav active="jobs" />
    </div>
  )
}
