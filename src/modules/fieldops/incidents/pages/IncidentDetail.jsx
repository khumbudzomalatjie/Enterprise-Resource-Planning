import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useIncidentStore from '../store/incidentStore'
import useThemeStore from '../../../../store/themeStore'
import { supabase } from '../../../../lib/supabaseClient'
import { 
  ArrowLeft, ChevronRight, Sun, Moon, Shield, Clock, MapPin, 
  User, AlertTriangle, Camera, Download, X, Image as ImageIcon
} from 'lucide-react'

export default function IncidentDetail() {
  const { id } = useParams()
  const { selectedIncident, fetchIncident, loading } = useIncidentStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  useEffect(() => {
    if (id) fetchIncident(id)
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  )

  if (!selectedIncident) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500">Incident not found</p>
    </div>
  )

  const inc = selectedIncident
  
  // Combine all photos from incident
  const allPhotos = [
    ...(inc.before_photos || []),
    ...(inc.after_photos || []),
    ...(inc.photos || [])
  ]

  const getRiskColor = (r) => {
    const c = { green: 'bg-green-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500', red: 'bg-red-500', critical: 'bg-red-700' }
    return c[r] || 'bg-slate-400'
  }

  const formatDate = (date) => date
    ? new Date(date).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

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
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded-full ${getRiskColor(inc.risk_level)}`}></span>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{inc.incident_number}</h1>
              </div>
              <h2 className="text-xl text-slate-600 dark:text-slate-400 mt-1">{inc.title}</h2>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                inc.severity === 'critical' ? 'bg-red-100 text-red-700' : 
                inc.severity === 'high' ? 'bg-orange-100 text-orange-700' : 
                inc.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 
                'bg-green-100 text-green-700'
              }`}>
                {inc.severity?.toUpperCase()}
              </span>
              <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 capitalize">
                {inc.status?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* ✅ PHOTOS SECTION */}
          {allPhotos.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="neu-raised rounded-3xl p-6 mb-6 border-l-4 border-indigo-500"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-600" />
                  Photos ({allPhotos.length})
                </h3>
                <span className="text-xs text-slate-500">Click to enlarge</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {allPhotos.map((url, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedPhoto(url)}
                    className="relative rounded-xl overflow-hidden cursor-pointer group bg-slate-200"
                  >
                    <img 
                      src={url} 
                      alt={`Incident photo ${idx + 1}`} 
                      className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="absolute top-1 left-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                      Photo {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* No photos message */}
          {allPhotos.length === 0 && (
            <div className="neu-raised rounded-3xl p-6 mb-6 text-center">
              <Camera className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No photos attached to this incident</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />Incident Info
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Category:</span><span className="capitalize">{inc.incident_category?.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Date:</span><span>{new Date(inc.incident_date).toLocaleDateString()} at {inc.incident_time?.slice(0,5)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Risk Score:</span><span className="font-bold">{inc.risk_score} ({inc.risk_level})</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Reported By:</span><span>{inc.employee_name || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Department:</span><span>{inc.department || 'N/A'}</span></div>
                {inc.job_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Job:</span>
                    <Link to="/fieldops/job-tracker" className="text-purple-600 hover:text-purple-700 font-medium">
                      {inc.job_number}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />Location
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Site:</span><span>{inc.site || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Address:</span><span>{inc.site_address || 'N/A'}</span></div>
                {inc.gps_latitude && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">GPS:</span>
                    <span className="text-xs">{inc.gps_latitude?.toFixed(6)}, {inc.gps_longitude?.toFixed(6)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="neu-raised rounded-3xl p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Description</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{inc.description}</p>
            </div>

            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600" />People
              </h3>
              <div className="space-y-3 text-sm">
                <div><span className="text-slate-500">Involved:</span><p>{inc.people_involved || 'None listed'}</p></div>
                <div><span className="text-slate-500">Witnesses:</span><p>{inc.witnesses || 'None listed'}</p></div>
              </div>
            </div>

            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-pink-600" />Injuries & Damage
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">{inc.injury_reported ? '✅' : '❌'} Injury Reported</div>
                <div className="flex items-center gap-2">{inc.medical_treatment ? '✅' : '❌'} Medical Treatment</div>
                <div className="flex items-center gap-2">{inc.hospital_visit ? '✅' : '❌'} Hospital Visit</div>
                <div className="flex items-center gap-2">{inc.emergency_services ? '✅' : '❌'} Emergency Services</div>
                {inc.equipment_involved && <div><span className="text-slate-500">Equipment:</span> {inc.equipment_involved}</div>}
                {inc.vehicle_involved && <div><span className="text-slate-500">Vehicle:</span> {inc.vehicle_involved}</div>}
              </div>
            </div>

            {inc.immediate_actions && (
              <div className="neu-raised rounded-3xl p-6 md:col-span-2">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />Immediate Actions
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{inc.immediate_actions}</p>
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {/* Photo Viewer Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="max-w-4xl w-full"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={selectedPhoto}
                alt="Full size"
                className="w-full max-h-[75vh] object-contain rounded-2xl"
              />
              <div className="flex justify-center gap-3 mt-4">
                <a
                  href={selectedPhoto}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 bg-white text-slate-800 rounded-xl font-medium flex items-center gap-2 hover:bg-slate-100"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="px-5 py-3 bg-slate-700 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-slate-600"
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
