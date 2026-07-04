import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { ArrowLeft, MapPin, Clock, Calendar, Play, CheckCircle2, Camera, AlertCircle, FileText, Phone, User, Package, X } from 'lucide-react'

export default function JobDetail() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const { employee, selectedJob, fetchJobDetail, startJob, completeJob, uploadPhoto, reportIncident, saveJobReport, getJobReport } = useMobileStore()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [report, setReport] = useState({ work_completed: '', materials_used: '', hours_worked: '', issues_encountered: '', client_comments: '', employee_notes: '' })
  const [showReport, setShowReport] = useState(false)
  const [showIncident, setShowIncident] = useState(false)
  const [incidentData, setIncidentData] = useState({ title: '', description: '', incident_type: 'other', severity: 'medium' })
  const [photos, setPhotos] = useState([])

  useEffect(() => { loadJob(); loadReport() }, [id])

  const loadJob = async () => { const data = await fetchJobDetail(id); setJob(data); setPhotos(data?.job_photos || []) }
  const loadReport = async () => { const { data } = await getJobReport(id, employee?.id); if (data) setReport(data) }

  const handleStart = async () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const r = await startJob(id, employee?.id, pos.coords.latitude, pos.coords.longitude)
      r.success ? (toast.success('Job started!'), loadJob()) : toast.error('Failed')
    }, async () => { const r = await startJob(id, employee?.id, null, null); r.success ? (toast.success('Job started!'), loadJob()) : toast.error('Failed') })
  }

  const handleComplete = async () => {
    if (!report.work_completed) { toast.error('Fill job report first'); setShowReport(true); return }
    if (!window.confirm('Complete this job?')) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const r = await completeJob(id, employee?.id, pos.coords.latitude, pos.coords.longitude)
      r.success ? (toast.success('Completed!'), navigate('/mobile/jobs')) : toast.error('Failed')
    }, async () => { const r = await completeJob(id, employee?.id, null, null); r.success ? (toast.success('Completed!'), navigate('/mobile/jobs')) : toast.error('Failed') })
  }

  const handlePhoto = async (e, type) => {
    const file = e.target.files?.[0]; if (!file) return
    toast.loading('Uploading...')
    const result = await uploadPhoto(id, employee?.id, file, type, '')
    toast.dismiss()
    result.error ? toast.error('Upload failed') : (toast.success('Uploaded!'), loadJob())
  }

  const handleSaveReport = async () => {
    const r = await saveJobReport({ ...report, job_id: id, employee_id: employee?.id, status: 'completed' })
    r.error ? toast.error('Failed') : (toast.success('Report saved!'), setShowReport(false))
  }

  const handleIncident = async () => {
    if (!incidentData.title) { toast.error('Enter title'); return }
    const r = await reportIncident({ ...incidentData, job_id: id, employee_id: employee?.id, reported_by: user?.id, incident_date: new Date().toISOString().split('T')[0], status: 'reported' })
    r.error ? toast.error('Failed') : (toast.success('Reported!'), setShowIncident(false))
  }

  if (!job) return <div className="min-h-screen bg-slate-100 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div></div>

  const canStart = job.assignment_status === 'assigned'
  const canComplete = job.assignment_status === 'in_progress'
  const isMyJob = job.field_job_assignments?.some(a => a.employee_id === employee?.id)

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

      {/* Actions */}
      {isMyJob && (
        <div className="px-5 -mt-3">
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex gap-2">
              {canStart && <button onClick={handleStart} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Play className="w-5 h-5" /> Start Job</button>}
              {canComplete && <button onClick={() => setShowReport(true)} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> Complete</button>}
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
            <label key={type} className="bg-white rounded-xl p-3 shadow-sm text-center cursor-pointer hover:bg-blue-50">
              <Camera className="w-6 h-6 text-blue-500 mx-auto mb-1" />
              <span className="text-xs font-medium capitalize text-slate-600">{type}</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhoto(e, type)} />
            </label>
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

      {/* Report / Incident / Supplies */}
      <div className="px-5 mt-3 grid grid-cols-2 gap-3">
        <button onClick={() => setShowReport(true)} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-2 hover:bg-emerald-50"><FileText className="w-5 h-5 text-emerald-500" /><span className="text-sm font-medium">Job Report</span></button>
        <button onClick={() => setShowIncident(true)} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-2 hover:bg-red-50"><AlertCircle className="w-5 h-5 text-red-500" /><span className="text-sm font-medium">Incident</span></button>
        <button onClick={() => navigate('/mobile/supplies')} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-2 hover:bg-purple-50"><Package className="w-5 h-5 text-purple-500" /><span className="text-sm font-medium">Supplies</span></button>
      </div>

      {/* Team */}
      <div className="px-5 mt-3">
        <h3 className="font-semibold text-slate-700 mb-2">Team ({job.field_job_assignments?.length || 0})</h3>
        {job.field_job_assignments?.map(a => (
          <div key={a.id} className="bg-white rounded-xl p-3 shadow-sm mb-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm">{a.employees?.first_name?.[0]}{a.employees?.last_name?.[0]}</div>
            <div><p className="text-sm font-medium">{a.employees?.first_name} {a.employees?.last_name}</p><p className="text-xs text-slate-500 capitalize">{a.assignment_status}</p></div>
          </div>
        ))}
      </div>

      {/* Checklist */}
      {job.job_checklist_items?.length > 0 && (
        <div className="px-5 mt-3">
          <h3 className="font-semibold text-slate-700 mb-2">Checklist</h3>
          {job.job_checklist_items.map(item => (
            <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm mb-2 flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${item.is_completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                {item.is_completed && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-sm ${item.is_completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={() => setShowReport(false)}>
          <div className="bg-white rounded-t-3xl p-5 w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3"><h3 className="text-lg font-bold">Job Report</h3><button onClick={() => setShowReport(false)}><X className="w-5 h-5" /></button></div>
            <textarea value={report.work_completed} onChange={e => setReport({...report, work_completed: e.target.value})} placeholder="Work completed *" rows={3} className="w-full p-2 border rounded-lg mb-2 text-sm" />
            <input value={report.materials_used} onChange={e => setReport({...report, materials_used: e.target.value})} placeholder="Materials used" className="w-full p-2 border rounded-lg mb-2 text-sm" />
            <input value={report.hours_worked} onChange={e => setReport({...report, hours_worked: e.target.value})} type="number" step="0.5" placeholder="Hours worked" className="w-full p-2 border rounded-lg mb-2 text-sm" />
            <textarea value={report.issues_encountered} onChange={e => setReport({...report, issues_encountered: e.target.value})} placeholder="Issues" rows={2} className="w-full p-2 border rounded-lg mb-2 text-sm" />
            <textarea value={report.client_comments} onChange={e => setReport({...report, client_comments: e.target.value})} placeholder="Client comments" rows={2} className="w-full p-2 border rounded-lg mb-2 text-sm" />
            <textarea value={report.employee_notes} onChange={e => setReport({...report, employee_notes: e.target.value})} placeholder="Your notes" rows={2} className="w-full p-2 border rounded-lg mb-3 text-sm" />
            <div className="flex gap-2">
              <button onClick={() => setShowReport(false)} className="flex-1 py-3 bg-slate-200 rounded-xl font-bold">Cancel</button>
              <button onClick={handleSaveReport} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold">Save & Complete</button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Modal */}
      {showIncident && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={() => setShowIncident(false)}>
          <div className="bg-white rounded-t-3xl p-5 w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3"><h3 className="text-lg font-bold">Report Incident</h3><button onClick={() => setShowIncident(false)}><X className="w-5 h-5" /></button></div>
            <input value={incidentData.title} onChange={e => setIncidentData({...incidentData, title: e.target.value})} placeholder="Title *" className="w-full p-2 border rounded-lg mb-2 text-sm" />
            <textarea value={incidentData.description} onChange={e => setIncidentData({...incidentData, description: e.target.value})} placeholder="Description" rows={3} className="w-full p-2 border rounded-lg mb-2 text-sm" />
            <div className="grid grid-cols-2 gap-2 mb-3">
              <select value={incidentData.incident_type} onChange={e => setIncidentData({...incidentData, incident_type: e.target.value})} className="p-2 border rounded-lg text-sm"><option value="accident">Accident</option><option value="injury">Injury</option><option value="property_damage">Damage</option><option value="near_miss">Near Miss</option><option value="other">Other</option></select>
              <select value={incidentData.severity} onChange={e => setIncidentData({...incidentData, severity: e.target.value})} className="p-2 border rounded-lg text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
            </div>
            <div className="flex gap-2"><button onClick={() => setShowIncident(false)} className="flex-1 py-3 bg-slate-200 rounded-xl font-bold">Cancel</button><button onClick={handleIncident} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">Report</button></div>
          </div>
        </div>
      )}

      <BottomNav active="jobs" />
    </div>
  )
}
