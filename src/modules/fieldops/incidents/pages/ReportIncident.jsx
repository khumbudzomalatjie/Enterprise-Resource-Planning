import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useIncidentStore from '../store/incidentStore'
import useAuthStore from '../../../../store/authStore'
import useThemeStore from '../../../../store/themeStore'
import { supabase } from '../../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { AlertTriangle, Save, Send, Camera, MapPin, ChevronRight, ArrowLeft, Sun, Moon, Sparkles } from 'lucide-react'

export default function ReportIncident() {
  const { createIncident } = useIncidentStore()
  const { user, profile } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [gps, setGps] = useState(null)

  const [form, setForm] = useState({
    title: '', description: '', incident_category: 'safety', severity: 'medium',
    likelihood: 'possible', incident_date: new Date().toISOString().split('T')[0],
    incident_time: new Date().toTimeString().slice(0,5),
    site: '', site_address: '', people_involved: '', witnesses: '',
    immediate_actions: '', injury_reported: false, injury_details: '',
    medical_treatment: false, hospital_visit: false, emergency_services: false,
    equipment_involved: '', vehicle_involved: '', estimated_cost: 0,
    status: 'reported', department: profile?.department || 'Operations'
  })

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(pos => {
      setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    }, () => {})
  }, [])

  const handleSubmit = async (status = 'reported') => {
    if (!form.title || !form.description) { toast.error('Title and description required'); return }
    const data = {
      ...form, status,
      reported_by: user?.id,
      employee_id: profile?.id,
      employee_name: profile?.full_name || user?.email,
      gps_latitude: gps?.lat, gps_longitude: gps?.lng,
      reporting_device: navigator.userAgent?.substring(0, 100),
    }
    const result = await createIncident(data)
    if (result.success) { navigate('/fieldops/incidents') }
    else { toast.error('Failed to report incident') }
  }

  const categories = ['safety','cleaning','security','vehicle','equipment','property_damage','client_complaint','environmental','medical','near_miss','fire','chemical_spill','theft','violence','harassment','other']

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/fieldops/incidents" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />Report Incident
          </h1>
          <p className="text-slate-500 mb-8">Fill in the details below. Takes less than 60 seconds.</p>

          <div className="space-y-4">
            {/* GPS Status */}
            {gps && (
              <div className="neu-inset rounded-2xl p-3 flex items-center gap-2 text-sm text-emerald-600">
                <MapPin className="w-4 h-4" /> GPS Captured: {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)}
              </div>
            )}

            {/* Title & Category */}
            <div className="neu-raised rounded-3xl p-5 space-y-4">
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Incident Title *" className="w-full p-4 neu-inset rounded-xl text-lg font-semibold" />
              <select value={form.incident_category} onChange={e => setForm({...form, incident_category: e.target.value})} className="w-full p-4 neu-inset rounded-xl">
                {categories.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ').toUpperCase()}</option>)}
              </select>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Detailed description of what happened... *" rows={4} className="w-full p-4 neu-inset rounded-xl" />
            </div>

            {/* Date, Time, Severity */}
            <div className="neu-raised rounded-3xl p-5 grid grid-cols-2 gap-4">
              <div><label className="text-xs text-slate-500">Date</label><input type="date" value={form.incident_date} onChange={e => setForm({...form, incident_date: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" /></div>
              <div><label className="text-xs text-slate-500">Time</label><input type="time" value={form.incident_time} onChange={e => setForm({...form, incident_time: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" /></div>
              <div><label className="text-xs text-slate-500">Severity</label><select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
              <div><label className="text-xs text-slate-500">Likelihood</label><select value={form.likelihood} onChange={e => setForm({...form, likelihood: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1"><option value="rare">Rare</option><option value="possible">Possible</option><option value="likely">Likely</option><option value="almost_certain">Almost Certain</option></select></div>
            </div>

            {/* Location */}
            <div className="neu-raised rounded-3xl p-5 space-y-4">
              <input type="text" value={form.site} onChange={e => setForm({...form, site: e.target.value})} placeholder="Site / Location" className="w-full p-4 neu-inset rounded-xl" />
              <input type="text" value={form.site_address} onChange={e => setForm({...form, site_address: e.target.value})} placeholder="Address" className="w-full p-4 neu-inset rounded-xl" />
            </div>

            {/* People */}
            <div className="neu-raised rounded-3xl p-5 space-y-4">
              <input type="text" value={form.people_involved} onChange={e => setForm({...form, people_involved: e.target.value})} placeholder="People Involved (names)" className="w-full p-4 neu-inset rounded-xl" />
              <input type="text" value={form.witnesses} onChange={e => setForm({...form, witnesses: e.target.value})} placeholder="Witnesses (names)" className="w-full p-4 neu-inset rounded-xl" />
            </div>

            {/* Injury & Damage */}
            <div className="neu-raised rounded-3xl p-5 space-y-3">
              <label className="flex items-center gap-3"><input type="checkbox" checked={form.injury_reported} onChange={e => setForm({...form, injury_reported: e.target.checked})} className="w-5 h-5" /> Injury Reported</label>
              {form.injury_reported && <textarea value={form.injury_details} onChange={e => setForm({...form, injury_details: e.target.value})} placeholder="Injury details..." rows={2} className="w-full p-3 neu-inset rounded-xl" />}
              <label className="flex items-center gap-3"><input type="checkbox" checked={form.medical_treatment} onChange={e => setForm({...form, medical_treatment: e.target.checked})} className="w-5 h-5" /> Medical Treatment Required</label>
              <label className="flex items-center gap-3"><input type="checkbox" checked={form.hospital_visit} onChange={e => setForm({...form, hospital_visit: e.target.checked})} className="w-5 h-5" /> Hospital Visit</label>
              <label className="flex items-center gap-3"><input type="checkbox" checked={form.emergency_services} onChange={e => setForm({...form, emergency_services: e.target.checked})} className="w-5 h-5" /> Emergency Services Called</label>
            </div>

            {/* Equipment & Vehicle */}
            <div className="neu-raised rounded-3xl p-5 space-y-4">
              <input type="text" value={form.equipment_involved} onChange={e => setForm({...form, equipment_involved: e.target.value})} placeholder="Equipment Involved" className="w-full p-4 neu-inset rounded-xl" />
              <input type="text" value={form.vehicle_involved} onChange={e => setForm({...form, vehicle_involved: e.target.value})} placeholder="Vehicle Involved" className="w-full p-4 neu-inset rounded-xl" />
            </div>

            {/* Immediate Actions */}
            <div className="neu-raised rounded-3xl p-5">
              <textarea value={form.immediate_actions} onChange={e => setForm({...form, immediate_actions: e.target.value})} placeholder="Immediate actions taken..." rows={3} className="w-full p-4 neu-inset rounded-xl" />
            </div>

            {/* Estimated Cost */}
            <div className="neu-raised rounded-3xl p-5">
              <label className="text-xs text-slate-500">Estimated Cost (ZAR)</label>
              <input type="number" value={form.estimated_cost} onChange={e => setForm({...form, estimated_cost: parseFloat(e.target.value) || 0})} className="w-full p-4 neu-inset rounded-xl mt-1" />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => handleSubmit('draft')} className="flex-1 neu-raised neu-btn py-4 rounded-2xl bg-slate-600 text-white font-semibold flex items-center justify-center gap-2">
                <Save className="w-5 h-5" /> Save Draft
              </button>
              <button onClick={() => handleSubmit('reported')} className="flex-1 neu-raised neu-btn py-4 rounded-2xl bg-red-600 text-white font-semibold flex items-center justify-center gap-2">
                <Send className="w-5 h-5" /> Submit Report
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
