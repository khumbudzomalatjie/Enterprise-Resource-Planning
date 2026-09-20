import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useThemeStore from '../../../../store/themeStore'
import { supabase } from '../../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Search, History, Shield, User, Clock, AlertTriangle,
  CheckCircle2, XCircle, FileText, Eye,
  Camera, MapPin, Mail, Building2, Wrench, Download, X,
  ChevronRight, Sun, Moon, Sparkles, Activity, 
  Calendar, ClipboardCheck, Briefcase, Phone
} from 'lucide-react'

export default function IncidentTracker() {
  const { isDark, toggleTheme } = useThemeStore()
  
  const [searchInput, setSearchInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [trackerData, setTrackerData] = useState(null)
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchInput.trim()) {
      toast.error('Please enter an incident number')
      return
    }

    setSearching(true)
    setTrackerData(null)

    const search = searchInput.trim()
    let incident = null

    // 1. Exact match (original case)
    let { data: exact } = await supabase
      .from('incidents')
      .select('*')
      .eq('incident_number', search)
      .maybeSingle()
    if (exact) incident = exact

    // 2. Uppercase match
    if (!incident) {
      let { data: upper } = await supabase
        .from('incidents')
        .select('*')
        .eq('incident_number', search.toUpperCase())
        .maybeSingle()
      if (upper) incident = upper
    }

    // 3. Lowercase match
    if (!incident) {
      let { data: lower } = await supabase
        .from('incidents')
        .select('*')
        .eq('incident_number', search.toLowerCase())
        .maybeSingle()
      if (lower) incident = lower
    }

    // 4. Case-insensitive match
    if (!incident) {
      let { data: ilike } = await supabase
        .from('incidents')
        .select('*')
        .ilike('incident_number', search)
        .maybeSingle()
      if (ilike) incident = ilike
    }

    // 5. Partial match
    if (!incident) {
      let { data: partial } = await supabase
        .from('incidents')
        .select('*')
        .ilike('incident_number', `%${search}%`)
        .limit(1)
        .maybeSingle()
      if (partial) incident = partial
    }

    // 6. Search by title
    if (!incident) {
      let { data: title } = await supabase
        .from('incidents')
        .select('*')
        .ilike('title', `%${search}%`)
        .limit(1)
        .maybeSingle()
      if (title) incident = title
    }

    // 7. Search by description
    if (!incident) {
      let { data: desc } = await supabase
        .from('incidents')
        .select('*')
        .ilike('description', `%${search}%`)
        .limit(1)
        .maybeSingle()
      if (desc) incident = desc
    }

    if (!incident) {
      const { data: recent } = await supabase
        .from('incidents')
        .select('incident_number, title')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (recent && recent.length > 0) {
        const list = recent.map(i => i.incident_number).join(', ')
        toast.error(`Not found. Available: ${list}`, { duration: 6000 })
      } else {
        toast.error(`No incidents found in the database. Report an incident first.`)
      }
      setSearching(false)
      return
    }

    const [
      { data: auditLog },
      { data: correctiveActions },
      { data: reporter },
      { data: investigator },
      { data: job },
      { data: client }
    ] = await Promise.all([
      supabase.from('incident_audit_log').select('*').eq('incident_id', incident.id).order('created_at', { ascending: true }),
      supabase.from('corrective_actions').select('*').eq('incident_id', incident.id).order('created_at', { ascending: true }),
      incident.reported_by ? supabase.from('profiles').select('full_name, email, role').eq('id', incident.reported_by).single() : { data: null },
      incident.investigator_id ? supabase.from('profiles').select('full_name, email, role').eq('id', incident.investigator_id).single() : { data: null },
      incident.job_id ? supabase.from('jobs').select('job_number, title, site_address').eq('id', incident.job_id).single() : { data: null },
      incident.client_id ? supabase.from('clients').select('company_name, phone, email').eq('id', incident.client_id).single() : { data: null }
    ])

    setTrackerData({
      incident,
      auditLog: auditLog || [],
      correctiveActions: correctiveActions || [],
      reporter: reporter?.data || null,
      investigator: investigator?.data || null,
      job: job?.data || null,
      client: client?.data || null
    })

    setSearching(false)
    toast.success(`Found: ${incident.incident_number}`)
  }

  const formatDateTime = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-ZA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getStatusIcon = (status) => {
    if (!status) return <FileText className="w-4 h-4 text-slate-500" />
    if (status.includes('created') || status.includes('reported')) return <AlertTriangle className="w-4 h-4 text-red-500" />
    if (status.includes('assigned') || status.includes('review')) return <Eye className="w-4 h-4 text-blue-500" />
    if (status.includes('investigation')) return <Search className="w-4 h-4 text-purple-500" />
    if (status.includes('corrective') || status.includes('preventive')) return <Wrench className="w-4 h-4 text-orange-500" />
    if (status.includes('approved')) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    if (status.includes('closed')) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    if (status.includes('cancelled') || status.includes('rejected')) return <XCircle className="w-4 h-4 text-red-500" />
    if (status.includes('updated')) return <Activity className="w-4 h-4 text-amber-500" />
    return <FileText className="w-4 h-4 text-slate-500" />
  }

  const getRiskColor = (r) => {
    const c = { green: 'bg-green-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500', red: 'bg-red-500', critical: 'bg-red-700 animate-pulse' }
    return c[r] || 'bg-slate-400'
  }

  const getSeverityColor = (s) => {
    const c = { low: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' }
    return c[s] || 'bg-slate-100'
  }

  // ✅ Get all photos from incident
  const getAllPhotos = (incident) => {
    if (!incident) return []
    return [
      ...(incident.before_photos || []),
      ...(incident.after_photos || []),
      ...(incident.photos || [])
    ]
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops/incidents" className="text-slate-500 hover:text-emerald-600">Incidents</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Incident Tracker</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <History className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Incident Tracker</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-11">Complete audit trail of every incident - Who, What, When & How</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter Incident Number (e.g., INC-2026-000001)"
                className="w-full pl-14 pr-4 py-5 text-lg neu-inset rounded-2xl text-slate-700 dark:text-slate-300 placeholder:text-sm"
              />
            </div>
            <button type="submit" disabled={searching}
              className="neu-raised neu-btn px-8 py-5 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 text-lg font-semibold disabled:opacity-50 flex items-center gap-2">
              <Search className="w-5 h-5" />
              {searching ? 'Searching...' : 'Track Incident'}
            </button>
          </form>
        </motion.div>

        {searching && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Searching incident database...</p>
          </div>
        )}

        {trackerData && !searching && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* INCIDENT SUMMARY */}
            <div className="neu-raised rounded-3xl p-6 border-l-4 border-purple-500">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />Incident Summary
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500">Incident Number</p>
                  <p className="font-bold text-lg text-slate-800 dark:text-white">{trackerData.incident.incident_number}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${trackerData.incident.status?.includes('closed') ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {trackerData.incident.status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Severity</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getSeverityColor(trackerData.incident.severity)}`}>
                    {trackerData.incident.severity?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Risk Level</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${getRiskColor(trackerData.incident.risk_level)}`}></span>
                    <span className="font-semibold text-sm capitalize">{trackerData.incident.risk_level} (Score: {trackerData.incident.risk_score})</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-slate-400" /><span>{formatDate(trackerData.incident.incident_date)} at {trackerData.incident.incident_time?.slice(0,5)}</span></div>
                <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-slate-400" /><span>{trackerData.incident.site || 'N/A'}</span></div>
                <div className="flex items-center gap-2 text-sm"><Building2 className="w-4 h-4 text-slate-400" /><span className="capitalize">{trackerData.incident.incident_category?.replace(/_/g, ' ')}</span></div>
                <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-slate-400" /><span>SLA: {formatDate(trackerData.incident.sla_due_date)}</span></div>
              </div>
            </div>

            {/* ✅ PHOTOS SECTION */}
            {getAllPhotos(trackerData.incident).length > 0 && (
              <div className="neu-raised rounded-3xl p-6 border-l-4 border-indigo-500">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-600" />
                  Incident Photos ({getAllPhotos(trackerData.incident).length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {getAllPhotos(trackerData.incident).map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedPhoto(url)}
                      className="relative rounded-xl overflow-hidden cursor-pointer group bg-slate-200 dark:bg-slate-700"
                    >
                      <img
                        src={url}
                        alt={`Incident photo ${idx + 1}`}
                        className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="absolute top-1 left-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                        Photo {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">Click any photo to view full size</p>
              </div>
            )}

            {/* NO PHOTOS MESSAGE */}
            {getAllPhotos(trackerData.incident).length === 0 && (
              <div className="neu-raised rounded-3xl p-6 text-center">
                <Camera className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No photos attached to this incident</p>
              </div>
            )}

            {/* WHO REPORTED + INVESTIGATED + JOB/CLIENT */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><User className="w-5 h-5 text-blue-600" />Reported By</h3>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-slate-800 dark:text-white">{trackerData.incident.employee_name || trackerData.reporter?.full_name || 'N/A'}</p>
                  <p className="text-slate-500">{trackerData.incident.department || trackerData.reporter?.role || 'N/A'}</p>
                  {trackerData.reporter?.email && <p className="flex items-center gap-1 text-slate-500"><Mail className="w-3 h-3" />{trackerData.reporter.email}</p>}
                  <p className="text-xs text-slate-400">Reported: {formatDateTime(trackerData.incident.reported_at)}</p>
                </div>
              </div>
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><Search className="w-5 h-5 text-purple-600" />Investigator</h3>
                {trackerData.investigator ? (
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-slate-800 dark:text-white">{trackerData.investigator.full_name}</p>
                    <p className="text-slate-500 capitalize">{trackerData.investigator.role?.replace(/_/g, ' ')}</p>
                    {trackerData.incident.investigation_started_at && <p className="text-xs text-slate-400">Started: {formatDateTime(trackerData.incident.investigation_started_at)}</p>}
                    {trackerData.incident.investigation_completed_at && <p className="text-xs text-emerald-600">Completed: {formatDateTime(trackerData.incident.investigation_completed_at)}</p>}
                  </div>
                ) : <p className="text-sm text-slate-400 italic">No investigator assigned yet</p>}
              </div>
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><Briefcase className="w-5 h-5 text-emerald-600" />Related</h3>
                {trackerData.job && <div className="mb-2"><p className="text-xs text-slate-500">Job</p><p className="font-medium text-sm">{trackerData.job.job_number} - {trackerData.job.title}</p></div>}
                {trackerData.client && <div><p className="text-xs text-slate-500">Client</p><p className="font-medium text-sm">{trackerData.client.company_name}</p>{trackerData.client.phone && <p className="flex items-center gap-1 text-xs text-slate-500"><Phone className="w-3 h-3" />{trackerData.client.phone}</p>}</div>}
                {!trackerData.job && !trackerData.client && <p className="text-sm text-slate-400 italic">No job or client linked</p>}
              </div>
            </div>

            {/* DESCRIPTION + PEOPLE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">Description</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{trackerData.incident.description}</p>
              </div>
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">People & Injuries</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-slate-500">Involved:</span> {trackerData.incident.people_involved || 'None'}</div>
                  <div><span className="text-slate-500">Witnesses:</span> {trackerData.incident.witnesses || 'None'}</div>
                  <div className="flex items-center gap-2">{trackerData.incident.injury_reported ? '✅' : '❌'} Injury</div>
                  <div className="flex items-center gap-2">{trackerData.incident.medical_treatment ? '✅' : '❌'} Medical</div>
                  <div className="flex items-center gap-2">{trackerData.incident.hospital_visit ? '✅' : '❌'} Hospital</div>
                  <div className="flex items-center gap-2">{trackerData.incident.emergency_services ? '✅' : '❌'} Emergency Services</div>
                </div>
              </div>
            </div>

            {/* AUDIT TIMELINE */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />Complete Audit Trail ({trackerData.auditLog.length} events)
              </h2
