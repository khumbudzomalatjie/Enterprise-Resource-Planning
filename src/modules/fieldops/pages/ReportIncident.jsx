import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFieldOpsStore from '../store/fieldOpsStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { AlertTriangle, Save, ChevronRight } from 'lucide-react'

export default function ReportIncident() {
  const { createIncident } = useFieldOpsStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const [incidentData, setIncidentData] = useState({
    incident_type: 'accident', severity: 'medium', title: '', description: '',
    incident_location: '', incident_date: new Date().toISOString().split('T')[0],
    incident_time: new Date().toTimeString().slice(0,5),
    people_involved: '', witnesses: '', injuries_reported: false, injury_details: '',
    property_damage: false, damage_details: '', estimated_damage_cost: 0,
    immediate_actions: '', emergency_services_called: false, police_report_number: '',
    notes: '', status: 'reported'
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!incidentData.title || !incidentData.description) {
      toast.error('Title and description are required')
      return
    }
    const result = await createIncident(incidentData)
    if (result.success) navigate('/fieldops/incidents')
  }

  const update = (field, value) => setIncidentData({...incidentData, [field]: value})

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Ops</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/fieldops/incidents" className="text-slate-500 hover:text-emerald-600">Incidents</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Report Incident</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-8">
            <AlertTriangle className="w-8 h-8 text-red-600" />Report Incident
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Incident Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500">Type *</label>
                  <select value={incidentData.incident_type} onChange={(e) => update('incident_type', e.target.value)} className="w-full p-3 neu-inset rounded-xl mt-1">
                    <option value="accident">Accident</option><option value="injury">Injury</option><option value="property_damage">Property Damage</option><option value="equipment_failure">Equipment Failure</option><option value="chemical_spill">Chemical Spill</option><option value="near_miss">Near Miss</option><option value="security">Security</option><option value="customer_complaint">Customer Complaint</option><option value="vehicle_accident">Vehicle Accident</option><option value="theft">Theft</option><option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-500">Severity *</label>
                  <select value={incidentData.severity} onChange={(e) => update('severity', e.target.value)} className="w-full p-3 neu-inset rounded-xl mt-1">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option><option value="fatal">Fatal</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-500">Title *</label>
                  <input type="text" value={incidentData.title} onChange={(e) => update('title', e.target.value)} className="w-full p-3 neu-inset rounded-xl mt-1" required />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-500">Description *</label>
                  <textarea value={incidentData.description} onChange={(e) => update('description', e.target.value)} rows={4} className="w-full p-3 neu-inset rounded-xl mt-1" required />
                </div>
                <div>
                  <label className="text-sm text-slate-500">Date</label>
                  <input type="date" value={incidentData.incident_date} onChange={(e) => update('incident_date', e.target.value)} className="w-full p-3 neu-inset rounded-xl mt-1" />
                </div>
                <div>
                  <label className="text-sm text-slate-500">Time</label>
                  <input type="time" value={incidentData.incident_time} onChange={(e) => update('incident_time', e.target.value)} className="w-full p-3 neu-inset rounded-xl mt-1" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-500">Location</label>
                  <input type="text" value={incidentData.incident_location} onChange={(e) => update('incident_location', e.target.value)} className="w-full p-3 neu-inset rounded-xl mt-1" />
                </div>
              </div>
            </div>

            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">People & Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm text-slate-500">People Involved</label><input type="text" value={incidentData.people_involved} onChange={(e) => update('people_involved', e.target.value)} className="w-full p-3 neu-inset rounded-xl mt-1" /></div>
                <div><label className="text-sm text-slate-500">Witnesses</label><input type="text" value={incidentData.witnesses} onChange={(e) => update('witnesses', e.target.value)} className="w-full p-3 neu-inset rounded-xl mt-1" /></div>
                <div className="flex items-center gap-3"><input type="checkbox" checked={incidentData.injuries_reported} onChange={(e) => update('injuries_reported', e.target.checked)} className="w-5 h-5" /><label className="text-sm">Injuries Reported</label></div>
                <div className="flex items-center gap-3"><input type="checkbox" checked={incidentData.property_damage} onChange={(e) => update('property_damage', e.target.checked)} className="w-5 h-5" /><label className="text-sm">Property Damage</label></div>
                <div className="md:col-span-2"><label className="text-sm text-slate-500">Immediate Actions</label><textarea value={incidentData.immediate_actions} onChange={(e) => update('immediate_actions', e.target.value)} rows={2} className="w-full p-3 neu-inset rounded-xl mt-1" /></div>
              </div>
            </div>

            <div className="flex gap-4 justify-end">
              <button type="button" onClick={() => navigate('/fieldops/incidents')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-slate-600 text-white">Cancel</button>
              <button type="submit" className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-red-600 text-white hover:bg-red-700 flex items-center gap-2">
                <Save className="w-5 h-5" /><span>Report Incident</span>
              </button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  )
}
