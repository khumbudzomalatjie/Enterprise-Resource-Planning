import { useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useIncidentStore from '../store/incidentStore'
import useThemeStore from '../../../../store/themeStore'
import { ArrowLeft, ChevronRight, Sun, Moon, Sparkles, Shield, Clock, MapPin, User, AlertTriangle } from 'lucide-react'

export default function IncidentDetail() {
  const { id } = useParams()
  const { selectedIncident, fetchIncident, loading } = useIncidentStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (id) fetchIncident(id)
  }, [id])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>
  if (!selectedIncident) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">Incident not found</p></div>

  const inc = selectedIncident

  const getRiskColor = (r) => {
    const c = { green: 'bg-green-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500', red: 'bg-red-500', critical: 'bg-red-700' }
    return c[r] || 'bg-slate-400'
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops/incidents" className="text-slate-500 hover:text-emerald-600">Incidents</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/fieldops/incidents/list" className="text-slate-500 hover:text-emerald-600">All</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">{inc.incident_number}</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded-full ${getRiskColor(inc.risk_level)}`}></span>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{inc.incident_number}</h1>
              </div>
              <h2 className="text-xl text-slate-600 dark:text-slate-400 mt-1">{inc.title}</h2>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${inc.severity === 'critical' ? 'bg-red-100 text-red-700' : inc.severity === 'high' ? 'bg-orange-100 text-orange-700' : inc.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                {inc.severity?.toUpperCase()}
              </span>
              <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 capitalize">
                {inc.status?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" />Incident Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Category:</span><span className="capitalize">{inc.incident_category?.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Date:</span><span>{new Date(inc.incident_date).toLocaleDateString()} at {inc.incident_time?.slice(0,5)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Risk Score:</span><span className="font-bold">{inc.risk_score} ({inc.risk_level})</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Reported By:</span><span>{inc.employee_name || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Department:</span><span>{inc.department || 'N/A'}</span></div>
              </div>
            </div>

            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" />Location</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Site:</span><span>{inc.site || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Address:</span><span>{inc.site_address || 'N/A'}</span></div>
                {inc.gps_latitude && <div className="flex justify-between"><span className="text-slate-500">GPS:</span><span>{inc.gps_latitude?.toFixed(6)}, {inc.gps_longitude?.toFixed(6)}</span></div>}
              </div>
            </div>

            {/* Description */}
            <div className="neu-raised rounded-3xl p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Description</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{inc.description}</p>
            </div>

            {/* People */}
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-purple-600" />People</h3>
              <div className="space-y-3 text-sm">
                <div><span className="text-slate-500">Involved:</span><p>{inc.people_involved || 'None listed'}</p></div>
                <div><span className="text-slate-500">Witnesses:</span><p>{inc.witnesses || 'None listed'}</p></div>
              </div>
            </div>

            {/* Injuries */}
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-pink-600" />Injuries & Damage</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">{inc.injury_reported ? '✅' : '❌'} Injury Reported</div>
                <div className="flex items-center gap-2">{inc.medical_treatment ? '✅' : '❌'} Medical Treatment</div>
                <div className="flex items-center gap-2">{inc.hospital_visit ? '✅' : '❌'} Hospital Visit</div>
                <div className="flex items-center gap-2">{inc.emergency_services ? '✅' : '❌'} Emergency Services</div>
                {inc.equipment_involved && <div><span className="text-slate-500">Equipment:</span> {inc.equipment_involved}</div>}
                {inc.vehicle_involved && <div><span className="text-slate-500">Vehicle:</span> {inc.vehicle_involved}</div>}
              </div>
            </div>

            {/* Immediate Actions */}
            {inc.immediate_actions && (
              <div className="neu-raised rounded-3xl p-6 md:col-span-2">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-amber-600" />Immediate Actions</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{inc.immediate_actions}</p>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
