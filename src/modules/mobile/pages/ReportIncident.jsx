import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  AlertTriangle, Send, X, Loader2, Briefcase, Camera, MapPin 
} from 'lucide-react'

export default function ReportIncident() {
  const { user, profile } = useAuthStore()
  const { myJobs, fetchMyJobs } = useMobileStore()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    incident_category: 'safety',
    severity: 'medium',
    likelihood: 'possible',
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: new Date().toTimeString().slice(0, 5),
    site: '',
    site_address: '',
    people_involved: '',
    witnesses: '',
    immediate_actions: '',
    injury_reported: false,
    injury_details: '',
    medical_treatment: false,
    hospital_visit: false,
    emergency_services: false,
    estimated_cost: 0
  })

  const [gps, setGps] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [myEmployeeId, setMyEmployeeId] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  // ✅ Auto-select active job
  const activeJob = myJobs && myJobs.length > 0 ? myJobs[0] : null

  useEffect(() => {
    setup()
    navigator.geolocation?.getCurrentPosition(
      pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )
  }, [])

  const setup = async () => {
    const { data: emp } = await supabase.from('employees').select('id').eq('user_id', user?.id).single()
    if (emp?.id) {
      setMyEmployeeId(emp.id)
      await fetchMyJobs(emp.id)
    }
  }

  const update = (field, value) => setForm({ ...form, [field]: value })

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (status = 'reported') => {
    if (!form.title || !form.description) {
      toast.error('Title and description are required')
      return
    }
    if (!myEmployeeId) {
      toast.error('Profile not ready')
      return
    }

    setSubmitting(true)
    try {
      // Upload photo if provided
      let photoUrl = null
      if (photo && activeJob) {
        const fileExt = photo.name.split('.').pop()
        const fileName = `incident-photos/${activeJob.id}/${Date.now()}.${fileExt}`
        try {
          await supabase.storage.createBucket('fleet', { public: true, fileSizeLimit: 10485760 })
        } catch (err) {}
        const { error: upErr } = await supabase.storage.from('fleet').upload(fileName, photo, { upsert: true })
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('fleet').getPublicUrl(fileName)
          photoUrl = publicUrl
        }
      }

      const { error } = await supabase
        .from('incidents')
        .insert([{
          title: form.title,
          description: form.description,
          incident_category: form.incident_category,
          severity: form.severity,
          likelihood: form.likelihood,
          incident_date: form.incident_date,
          incident_time: form.incident_time,
          site: form.site,
          site_address: form.site_address,
          people_involved: form.people_involved,
          witnesses: form.witnesses,
          immediate_actions: form.immediate_actions,
          injury_reported: form.injury_reported,
          injury_details: form.injury_details,
          medical_treatment: form.medical_treatment,
          hospital_visit: form.hospital_visit,
          emergency_services: form.emergency_services,
          estimated_cost: form.estimated_cost,
          status,
          job_id: activeJob?.id || null,
          job_number: activeJob?.job_number || null,
          client_id: activeJob?.client_id || null,
          reported_by: user?.id,
          employee_id: myEmployeeId,
          employee_name: profile?.full_name || user?.email,
          gps_latitude: gps?.lat,
          gps_longitude: gps?.lng,
          reporting_device: navigator.userAgent?.substring(0, 100),
          before_photos: photoUrl ? [photoUrl] : []
        }])

      if (error) throw error

      toast.success(`Incident reported${activeJob ? ` on ${activeJob.job_number}` : ''}!`)
      navigate('/mobile')
    } catch (err) {
      console.error(err)
      toast.error('Failed to report: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const categories = ['safety', 'cleaning', 'security', 'vehicle', 'equipment', 'property_damage', 'client_complaint', 'environmental', 'medical', 'near_miss', 'fire', 'chemical_spill', 'theft', 'violence', 'harassment', 'other']

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-500 via-rose-600 to-red-700 font-['Inter'] flex flex-col"
      style={{ minHeight: '100dvh' }}>

      {/* Header */}
      <div className="px-5 pt-8 pb-5 text-white flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold">Report Incident</h1>
            <p className="text-red-100 text-sm mt-1">Fill in details · Takes 60 seconds</p>
          </div>
          <button onClick={() => navigate('/mobile')}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* ✅ Active Job Banner */}
        {activeJob ? (
          <div className="bg-white/15 border border-white/20 rounded-xl p-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-white/80 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs opacity-70">Incident will be linked to</p>
              <p className="text-white font-semibold text-sm truncate">
                {activeJob.job_number} · {activeJob.title}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-amber-200 text-xs font-semibold">No active job</p>
              <p className="text-amber-100 text-xs">Incident won't be linked to a job</p>
            </div>
          </div>
        )}

        {/* GPS */}
        {gps && (
          <div className="mt-2 bg-white/10 rounded-xl p-2 flex items-center gap-2 text-xs text-white/90">
            <MapPin className="w-3 h-3" />
            GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pb-24 flex-1 overflow-y-auto space-y-3">

        {/* Title & Category */}
        <div className="bg-white rounded-2xl p-4 shadow-lg space-y-3">
          <input
            type="text"
            value={form.title}
            onChange={e => update('title', e.target.value)}
            placeholder="Incident Title *"
            className="w-full p-3 rounded-xl bg-slate-100 text-sm font-semibold"
          />
          <select
            value={form.incident_category}
            onChange={e => update('incident_category', e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-100 text-sm capitalize"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <textarea
            value={form.description}
            onChange={e => update('description', e.target.value)}
            placeholder="Detailed description *"
            rows={4}
            className="w-full p-3 rounded-xl bg-slate-100 text-sm resize-none"
          />
        </div>

        {/* Date/Time/Severity */}
        <div className="bg-white rounded-2xl p-4 shadow-lg grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Date</label>
            <input type="date" value={form.incident_date} onChange={e => update('incident_date', e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-100 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Time</label>
            <input type="time" value={form.incident_time} onChange={e => update('incident_time', e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-100 text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Severity</label>
            <select value={form.severity} onChange={e => update('severity', e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-100 text-sm">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Likelihood</label>
            <select value={form.likelihood} onChange={e => update('likelihood', e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-100 text-sm">
              <option value="rare">Rare</option>
              <option value="possible">Possible</option>
              <option value="likely">Likely</option>
              <option value="almost_certain">Almost Certain</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl p-4 shadow-lg space-y-3">
          <input type="text" value={form.site} onChange={e => update('site', e.target.value)}
            placeholder="Site / Location" className="w-full p-3 rounded-xl bg-slate-100 text-sm" />
          <input type="text" value={form.site_address} onChange={e => update('site_address', e.target.value)}
            placeholder="Address" className="w-full p-3 rounded-xl bg-slate-100 text-sm" />
        </div>

        {/* People */}
        <div className="bg-white rounded-2xl p-4 shadow-lg space-y-3">
          <input type="text" value={form.people_involved} onChange={e => update('people_involved', e.target.value)}
            placeholder="People Involved" className="w-full p-3 rounded-xl bg-slate-100 text-sm" />
          <input type="text" value={form.witnesses} onChange={e => update('witnesses', e.target.value)}
            placeholder="Witnesses" className="w-full p-3 rounded-xl bg-slate-100 text-sm" />
        </div>

        {/* Injury & Damage */}
        <div className="bg-white rounded-2xl p-4 shadow-lg space-y-3">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.injury_reported} onChange={e => update('injury_reported', e.target.checked)}
              className="w-5 h-5 rounded" />
            Injury Reported
          </label>
          {form.injury_reported && (
            <textarea value={form.injury_details} onChange={e => update('injury_details', e.target.value)}
              placeholder="Injury details..." rows={2}
              className="w-full p-3 rounded-xl bg-slate-100 text-sm resize-none" />
          )}
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.medical_treatment} onChange={e => update('medical_treatment', e.target.checked)}
              className="w-5 h-5 rounded" />
            Medical Treatment Required
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.hospital_visit} onChange={e => update('hospital_visit', e.target.checked)}
              className="w-5 h-5 rounded" />
            Hospital Visit
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={form.emergency_services} onChange={e => update('emergency_services', e.target.checked)}
              className="w-5 h-5 rounded" />
            Emergency Services Called
          </label>
        </div>

        {/* Immediate Actions */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <textarea value={form.immediate_actions} onChange={e => update('immediate_actions', e.target.value)}
            placeholder="Immediate actions taken..." rows={3}
            className="w-full p-3 rounded-xl bg-slate-100 text-sm resize-none" />
        </div>

        {/* Photo */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <label className="text-xs text-slate-500 mb-2 block">Photo (optional)</label>
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
              <button onClick={() => { setPhoto(null); setPhotoPreview(null) }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                className="hidden" onChange={handlePhoto} />
              <button onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center gap-2 text-sm font-medium">
                <Camera className="w-4 h-4" /> Take / Choose Photo
              </button>
            </>
          )}
        </div>

        {/* Estimated Cost */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <label className="text-xs text-slate-500 mb-1 block">Estimated Cost (ZAR)</label>
          <input type="number" value={form.estimated_cost}
            onChange={e => update('estimated_cost', parseFloat(e.target.value) || 0)}
            className="w-full p-3 rounded-xl bg-slate-100 text-sm" />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button onClick={() => handleSubmit('draft')} disabled={submitting}
            className="flex-1 py-4 rounded-2xl bg-slate-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
            Save Draft
          </button>
          <button onClick={() => handleSubmit('reported')} disabled={submitting}
            className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-lg">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Submit
          </button>
        </div>
      </div>

      <BottomNav active="jobs" />
    </div>
  )
}
