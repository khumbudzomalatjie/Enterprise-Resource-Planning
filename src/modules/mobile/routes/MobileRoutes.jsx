import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import MobileHome from '../pages/MobileHome'
import MyJobs from '../pages/MyJobs'
import ClockInOut from '../pages/ClockInOut'
import PhotoUpload from '../pages/PhotoUpload'
import SuppliesRequest from '../pages/SuppliesRequest'
import MyProfile from '../pages/MyProfile'
import MessagesContacts from '../pages/MessagesContacts'
import FieldDashboard from '../pages/FieldDashboard'
import ActiveCleaners from '../pages/ActiveCleaners'
import JobPhotos from '../pages/JobPhotos'
import LiveJobs from '../pages/LiveJobs'
import IncidentReports from '../pages/IncidentReports'
import SupplyOrders from '../pages/SupplyOrders'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { AlertCircle, ArrowLeft, Send, Camera } from 'lucide-react'
import BottomNav from '../components/BottomNav'

// ============================================
// INLINE INCIDENT REPORT COMPONENT
// ============================================
function IncidentReportPage() {
  const { user, profile } = useAuthStore()
  const { myJobs, fetchMyJobs } = useMobileStore()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [formData, setFormData] = useState({ 
    job_id: '', 
    incident_type: 'other', 
    description: '', 
    severity: 'medium' 
  })

  useEffect(() => { 
    if (profile?.id) fetchMyJobs(profile.id) 
  }, [])

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!formData.description.trim()) { 
      toast.error('Please describe the incident')
      return 
    }
    setSubmitting(true)
    try {
      let photoUrl = null
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = 'incidents/' + Date.now() + '.' + fileExt
        const { error: uploadError } = await supabase.storage
          .from('fleet')
          .upload(fileName, photoFile, { upsert: true })
        if (!uploadError) { 
          const { data: { publicUrl } } = supabase.storage.from('fleet').getPublicUrl(fileName)
          photoUrl = publicUrl 
        }
      }
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user?.id)
        .single()
      const { error } = await supabase.from('incident_reports').insert([{ 
        employee_id: employee?.id, 
        job_id: formData.job_id || null, 
        incident_type: formData.incident_type, 
        description: formData.description, 
        severity: formData.severity, 
        photo_url: photoUrl, 
        status: 'reported' 
      }])
      if (error) throw error
      toast.success('Incident reported! ✅')
      setFormData({ job_id: '', incident_type: 'other', description: '', severity: 'medium' })
      setPhotoFile(null)
      setPhotoPreview(null)
    } catch (error) { 
      toast.error('Failed to submit incident report') 
    }
    finally { setSubmitting(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-['Inter'] pb-20">
      <div className="bg-gradient-to-b from-red-500 to-red-600 px-4 pt-8 pb-6 text-white">
        <button onClick={() => navigate('/mobile')} className="p-1 rounded-lg hover:bg-white/20 mb-4">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Report Incident</h1>
        <p className="text-red-100 text-sm">Report damages, injuries, or issues on site</p>
      </div>

      <div className="px-4 -mt-4 space-y-4 pt-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-500 mb-2 block">Related Job (optional)</label>
          <select value={formData.job_id} onChange={e => setFormData({...formData, job_id: e.target.value})} 
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
            <option value="">No specific job</option>
            {myJobs?.map(job => (
              <option key={job.id} value={job.id}>{job.title} - {job.job_number}</option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-500 mb-2 block">Incident Type</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'damage', label: '🔨 Damage' },
              { value: 'injury', label: '🤕 Injury' },
              { value: 'complaint', label: '📢 Complaint' },
              { value: 'security', label: '🔒 Security' },
              { value: 'other', label: '📋 Other' },
            ].map(type => (
              <button key={type.value} onClick={() => setFormData({...formData, incident_type: type.value})}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  formData.incident_type === type.value ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>{type.label}</button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-500 mb-2 block">Severity</label>
          <div className="flex gap-2">
            {[
              { value: 'low', label: 'Low', color: 'bg-blue-500' },
              { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
              { value: 'high', label: 'High', color: 'bg-orange-500' },
              { value: 'critical', label: 'Critical', color: 'bg-red-500' },
            ].map(sev => (
              <button key={sev.value} onClick={() => setFormData({...formData, severity: sev.value})}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  formData.severity === sev.value ? `${sev.color} text-white` : 'bg-slate-100 text-slate-600'
                }`}>{sev.label}</button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-500 mb-2 block">Description *</label>
          <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
            rows={4} placeholder="Describe what happened..." 
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm resize-none" />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-500 mb-2 block">Photo (optional)</label>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
              <button onClick={() => { setPhotoFile(null); setPhotoPreview(null) }} 
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center">✕</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50">
              <Camera className="w-8 h-8 text-slate-400 mb-1" />
              <span className="text-sm text-slate-400">Tap to add photo</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
            </label>
          )}
        </div>

        <button onClick={handleSubmit} disabled={submitting} 
          className="w-full bg-red-500 text-white rounded-2xl p-4 font-bold text-lg hover:bg-red-600 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg">
          <Send className="w-5 h-5" />
          {submitting ? 'Submitting...' : 'Submit Incident Report'}
        </button>
      </div>
      <BottomNav />
    </div>
  )
}

// ============================================
// MAIN ROUTES COMPONENT
// ============================================
export default function MobileRoutes() {
  return (
    <Routes>
      {/* Cleaner Mobile Routes */}
      <Route path="/" element={<ProtectedRoute><MobileHome /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><MyJobs /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute><MyJobs /></ProtectedRoute>} />
      <Route path="/clock" element={<ProtectedRoute><ClockInOut /></ProtectedRoute>} />
      <Route path="/photos" element={<ProtectedRoute><PhotoUpload /></ProtectedRoute>} />
      <Route path="/supplies" element={<ProtectedRoute><SuppliesRequest /></ProtectedRoute>} />
      <Route path="/incident" element={<ProtectedRoute><IncidentReportPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><MessagesContacts /></ProtectedRoute>} />

      {/* Manager Field Operations Routes */}
      <Route path="/field" element={<ProtectedRoute><FieldDashboard /></ProtectedRoute>} />
      <Route path="/field/cleaners" element={<ProtectedRoute><ActiveCleaners /></ProtectedRoute>} />
      <Route path="/field/live-jobs" element={<ProtectedRoute><LiveJobs /></ProtectedRoute>} />
      <Route path="/field/photos" element={<ProtectedRoute><JobPhotos /></ProtectedRoute>} />
      <Route path="/field/incidents" element={<ProtectedRoute><IncidentReports /></ProtectedRoute>} />
      <Route path="/field/supplies" element={<ProtectedRoute><SupplyOrders /></ProtectedRoute>} />
      <Route path="/field/messages" element={<ProtectedRoute><MessagesContacts /></ProtectedRoute>} />
    </Routes>
  )
}
