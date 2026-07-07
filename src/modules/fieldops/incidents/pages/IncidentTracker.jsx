import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useThemeStore from '../../../../store/themeStore'
import { supabase } from '../../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Search, History, Shield, User, Clock, AlertTriangle,
  CheckCircle2, XCircle, FileText, Eye,
  Camera, MapPin, Mail, Building2, Wrench,
  ChevronRight, Sun, Moon, Sparkles, Activity, 
  Calendar, ClipboardCheck, Briefcase, Phone
} from 'lucide-react'

export default function IncidentTracker() {
  const { isDark, toggleTheme } = useThemeStore()
  
  const [searchInput, setSearchInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [trackerData, setTrackerData] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchInput.trim()) {
      toast.error('Please enter an incident number')
      return
    }

    setSearching(true)
    setTrackerData(null)

    const search = searchInput.trim().toUpperCase()
    
    // Search by incident number
    let { data: incident } = await supabase
      .from('incidents')
      .select('*')
      .eq('incident_number', search)
      .single()

    // Search by partial match
    if (!incident) {
      const { data: partial } = await supabase
        .from('incidents')
        .select('*')
        .ilike('incident_number', `%${search}%`)
        .limit(1)
        .single()
      incident = partial
    }

    // Search by title
    if (!incident) {
      const { data: titleMatch } = await supabase
        .from('incidents')
        .select('*')
        .ilike('title', `%${searchInput.trim()}%`)
        .limit(1)
        .single()
      incident = titleMatch
    }

    if (!incident) {
      toast.error(`No incident found for "${searchInput}"`)
      setSearching(false)
      return
    }

    // Get all related data
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
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops/incidents" className="text-slate-500 hover:text-emerald-600">Incidents</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Incident Tracker</span>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <History className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Incident Tracker</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-11">Complete audit trail of every incident - Who, What, When & How</p>
        </motion.div>

        {/* Search Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter Incident Number (e.g., INC-2026-000001)"
                className="w-full pl-14 pr-4 py-5 text-lg neu-inset rounded-2xl text-slate-700 dark:text-slate-300 uppercase placeholder:text-sm"
              />
            </div>
            <button type="submit" disabled={searching}
              className="neu-raised neu-btn px-8 py-5 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 text-lg font-semibold disabled:opacity-50 flex items-center gap-2">
              <Search className="w-5 h-5" />
              {searching ? 'Searching...' : 'Track Incident'}
            </button>
          </form>
        </motion.div>

        {/* Loading */}
        {searching && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Searching incident database...</p>
          </div>
        )}

        {/* Results */}
        {trackerData && !searching && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* INCIDENT SUMMARY CARD */}
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

            {/* WHO REPORTED + WHO INVESTIGATED + JOB/CLIENT */}
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

            {/* COMPLETE AUDIT TIMELINE */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />Complete Audit Trail ({trackerData.auditLog.length} events)
              </h2>
              {trackerData.auditLog.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-500 via-purple-500 to-emerald-500"></div>
                  <div className="space-y-4">
                    {trackerData.auditLog.map((log) => (
                      <div key={log.id} className="relative pl-12">
                        <div className="absolute left-3 top-2 w-5 h-5 rounded-full bg-white dark:bg-slate-800 border-2 border-purple-500 flex items-center justify-center">
                          {getStatusIcon(log.action_type)}
                        </div>
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm capitalize text-slate-800 dark:text-white">{log.action_type?.replace(/_/g, ' ')}</span>
                            <span className="text-xs text-slate-500">{formatDateTime(log.created_at)}</span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{log.action_description}</p>
                          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                            <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"><User className="w-3.5 h-3.5 text-purple-600" /></div>
                            <div><p className="text-sm font-medium text-slate-800 dark:text-white">{log.performed_by_name || 'System'}</p><p className="text-xs text-slate-500 capitalize">{log.performed_by_role?.replace(/_/g, ' ') || 'N/A'}</p></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-slate-500 text-center py-8">No audit records available</p>}
            </div>

            {/* CORRECTIVE ACTIONS */}
            {trackerData.correctiveActions.length > 0 && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Wrench className="w-5 h-5 text-orange-600" />Actions ({trackerData.correctiveActions.length})</h2>
                <div className="space-y-3">
                  {trackerData.correctiveActions.map(action => (
                    <div key={action.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${action.status === 'completed' ? 'bg-emerald-500' : action.status === 'in_progress' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                        <div><p className="font-medium text-sm">{action.title}</p><p className="text-xs text-slate-500 capitalize">{action.action_type} • {action.priority} • Due: {formatDate(action.due_date)}</p></div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${action.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : action.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{action.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* APPROVAL STATUS */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-emerald-600" />Approval Status</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Supervisor', approved: trackerData.incident.supervisor_approved, date: trackerData.incident.supervisor_approved_at },
                  { label: 'HSE Officer', approved: trackerData.incident.hse_approved, date: trackerData.incident.hse_approved_at },
                  { label: 'Ops Manager', approved: trackerData.incident.ops_manager_approved, date: trackerData.incident.ops_manager_approved_at },
                  { label: 'HR', approved: trackerData.incident.hr_approved, date: trackerData.incident.hr_approved_at },
                  { label: 'MD', approved: trackerData.incident.md_approved, date: trackerData.incident.md_approved_at },
                ].map(approval => (
                  <div key={approval.label} className={`p-3 rounded-xl text-center ${approval.approved ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-slate-50 dark:bg-slate-700/30'}`}>
                    <p className="text-xs text-slate-500 mb-1">{approval.label}</p>
                    {approval.approved ? <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" /> : <Clock className="w-6 h-6 text-slate-400 mx-auto" />}
                    <p className="text-xs mt-1 font-medium">{approval.approved ? 'Approved' : 'Pending'}</p>
                    {approval.date && <p className="text-xs text-slate-400 mt-1">{formatDate(approval.date)}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* INVESTIGATION FINDINGS */}
            {trackerData.incident.investigation_findings && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Investigation Findings</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{trackerData.incident.investigation_findings}</p>
                {trackerData.incident.root_causes && trackerData.incident.root_causes.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-slate-500 mb-2">Root Causes:</p>
                    <div className="flex flex-wrap gap-2">
                      {trackerData.incident.root_causes.map((cause, i) => (
                        <span key={i} className="px-3 py-1 rounded-full text-xs bg-red-100 text-red-700 capitalize">{cause.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* IMMEDIATE ACTIONS */}
            {trackerData.incident.immediate_actions && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Immediate Actions Taken</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{trackerData.incident.immediate_actions}</p>
              </div>
            )}

            {/* GPS LOCATION */}
            {trackerData.incident.gps_latitude && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" />GPS Location</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500">Latitude:</span> {trackerData.incident.gps_latitude}</div>
                  <div><span className="text-slate-500">Longitude:</span> {trackerData.incident.gps_longitude}</div>
                  <div className="col-span-2"><span className="text-slate-500">Address:</span> {trackerData.incident.site_address || trackerData.incident.location_address || 'N/A'}</div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Empty State */}
        {!trackerData && !searching && (
          <div className="text-center py-16 neu-raised rounded-3xl">
            <History className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Incident Tracker</h3>
            <p className="text-slate-500 text-lg mb-1">Enter an incident number to view its complete audit trail</p>
            <p className="text-slate-400 text-sm">Example: INC-2026-000001</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> Who reported</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Search className="w-3 h-3" /> Who investigated</span>
              <span>•</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Who approved</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> Actions taken</span>
              <span>•</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> GPS location</span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
