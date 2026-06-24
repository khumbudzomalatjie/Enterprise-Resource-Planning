import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFieldOpsStore from '../store/fieldOpsStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Search, FileText, Clock, User, CheckCircle2, XCircle,
  AlertTriangle, DollarSign, Sun, Moon, Sparkles, ChevronRight,
  Users, Calendar, MapPin, Briefcase, Phone, Mail, Star,
  ClipboardCheck, Package, Truck, Camera, Shield, Wrench,
  History, ArrowUpDown, List, RefreshCw
} from 'lucide-react'

export default function JobTracker() {
  const { jobAuditData, fetchJobAuditTrail, loading, clearAuditData } = useFieldOpsStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [jobNumber, setJobNumber] = useState('')
  const [allJobs, setAllJobs] = useState([])
  const [showJobList, setShowJobList] = useState(false)
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    loadAllJobs()
  }, [])

  const loadAllJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('job_number, title, status, clients(company_name), scheduled_date')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (!error && data) {
      setAllJobs(data)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    setSearchError('')
    
    if (!jobNumber.trim()) {
      toast.error('Please enter a job number')
      return
    }

    const formattedNumber = jobNumber.trim().toUpperCase()
    
    // Validate job number format
    if (!formattedNumber.startsWith('JOB-')) {
      toast.error('Job numbers start with JOB- (e.g., JOB-2506-0001)')
      return
    }

    const result = await fetchJobAuditTrail(formattedNumber)
    if (!result.success) {
      setSearchError(result.error || 'Job not found')
    }
  }

  const handleSelectJob = (jobNum) => {
    setJobNumber(jobNum)
    setShowJobList(false)
    fetchJobAuditTrail(jobNum)
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
    return new Date(date).toLocaleDateString('en-ZA', { 
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { 
      style: 'currency', currency: 'ZAR' 
    }).format(amount || 0)
  }

  const getActionIcon = (type) => {
    const icons = {
      job_created: <FileText className="w-5 h-5 text-blue-600" />,
      job_updated: <FileText className="w-5 h-5 text-blue-600" />,
      job_scheduled: <Calendar className="w-5 h-5 text-indigo-600" />,
      job_rescheduled: <Calendar className="w-5 h-5 text-orange-600" />,
      staff_assigned: <Users className="w-5 h-5 text-purple-600" />,
      staff_released: <XCircle className="w-5 h-5 text-red-600" />,
      staff_accepted: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      staff_declined: <XCircle className="w-5 h-5 text-red-600" />,
      job_started: <Clock className="w-5 h-5 text-amber-600" />,
      job_paused: <Clock className="w-5 h-5 text-orange-600" />,
      job_resumed: <Clock className="w-5 h-5 text-emerald-600" />,
      job_completed: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      job_cancelled: <XCircle className="w-5 h-5 text-red-600" />,
      job_reopened: <FileText className="w-5 h-5 text-amber-600" />,
      priority_changed: <ArrowUpDown className="w-5 h-5 text-orange-600" />,
      location_changed: <MapPin className="w-5 h-5 text-blue-600" />,
      date_changed: <Calendar className="w-5 h-5 text-indigo-600" />,
      time_changed: <Clock className="w-5 h-5 text-indigo-600" />,
      checklist_added: <ClipboardCheck className="w-5 h-5 text-teal-600" />,
      checklist_completed: <ClipboardCheck className="w-5 h-5 text-emerald-600" />,
      photo_uploaded: <Camera className="w-5 h-5 text-pink-600" />,
      document_attached: <FileText className="w-5 h-5 text-slate-600" />,
      note_added: <FileText className="w-5 h-5 text-slate-600" />,
      quality_inspected: <Shield className="w-5 h-5 text-purple-600" />,
      quality_passed: <Shield className="w-5 h-5 text-emerald-600" />,
      quality_failed: <AlertTriangle className="w-5 h-5 text-red-600" />,
      client_notified: <Mail className="w-5 h-5 text-blue-600" />,
      client_feedback_received: <Star className="w-5 h-5 text-yellow-600" />,
      quotation_linked: <FileText className="w-5 h-5 text-indigo-600" />,
      invoice_generated: <DollarSign className="w-5 h-5 text-emerald-600" />,
      invoice_sent: <DollarSign className="w-5 h-5 text-blue-600" />,
      payment_received: <DollarSign className="w-5 h-5 text-emerald-600" />,
      supplies_requested: <Package className="w-5 h-5 text-orange-600" />,
      supplies_issued: <Package className="w-5 h-5 text-emerald-600" />,
      equipment_assigned: <Wrench className="w-5 h-5 text-purple-600" />,
      incident_reported: <AlertTriangle className="w-5 h-5 text-red-600" />,
      incident_resolved: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      route_planned: <Truck className="w-5 h-5 text-indigo-600" />,
      route_started: <Truck className="w-5 h-5 text-amber-600" />,
      route_completed: <Truck className="w-5 h-5 text-emerald-600" />,
      gps_checkin: <MapPin className="w-5 h-5 text-emerald-600" />,
      gps_checkout: <MapPin className="w-5 h-5 text-red-600" />,
    }
    return icons[type] || <FileText className="w-5 h-5 text-slate-600" />
  }

  const getSourceBadge = (source) => {
    const badges = {
      web_app: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      mobile_app: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      api: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      system: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      automation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      manual: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    }
    return badges[source] || 'bg-slate-100 text-slate-700'
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-slate-100 text-slate-700',
      scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
      on_hold: 'bg-orange-100 text-orange-700',
    }
    return colors[status] || 'bg-slate-100 text-slate-700'
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Ops</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Job Tracker</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-2">
            <History className="w-8 h-8 text-purple-600" />Job Tracker
          </h1>
          <p className="text-slate-500">Enter a job number to see complete audit trail - Who, What, When & How</p>
        </motion.div>

        {/* Search Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
              <input 
                type="text" 
                value={jobNumber} 
                onChange={(e) => setJobNumber(e.target.value)}
                placeholder="Enter Job Number (e.g., JOB-2506-0001)"
                className="w-full pl-14 pr-4 py-5 text-lg neu-inset rounded-2xl text-slate-700 dark:text-slate-300 uppercase placeholder:text-sm" 
              />
            </div>
            <button type="submit" disabled={loading} className="neu-raised neu-btn px-6 py-5 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 text-lg font-semibold disabled:opacity-50">
              {loading ? 'Searching...' : 'Track Job'}
            </button>
            <button type="button" onClick={() => { setShowJobList(!showJobList); loadAllJobs() }} className="neu-raised neu-btn px-4 py-5 rounded-2xl bg-slate-600 text-white hover:bg-slate-700">
              <List className="w-5 h-5" />
            </button>
          </form>
          
          {searchError && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {searchError}
              </p>
              <p className="text-slate-500 text-xs mt-1">Click the list button (≡) to see all available job numbers</p>
            </div>
          )}
        </motion.div>

        {/* Job List Dropdown */}
        {showJobList && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <List className="w-5 h-5 text-emerald-600" />Available Jobs ({allJobs.length})
              </h3>
              <button onClick={loadAllJobs} className="text-sm text-emerald-600 flex items-center gap-1">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>
            {allJobs.length > 0 ? (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {allJobs.map(job => (
                  <div key={job.job_number}
                    onClick={() => handleSelectJob(job.job_number)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/30 cursor-pointer transition-colors">
                    <div>
                      <p className="font-medium text-sm text-slate-800 dark:text-white">{job.job_number}</p>
                      <p className="text-xs text-slate-500 truncate max-w-xs">{job.title || 'No title'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.clients?.company_name && (
                        <span className="text-xs text-slate-500 hidden sm:inline">{job.clients.company_name}</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(job.status)}`}>
                        {job.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No jobs found in the system</p>
                <p className="text-xs text-slate-400 mt-1">Create jobs in Operations module first</p>
                <Link to="/operations/jobs/new" className="inline-block mt-3 text-sm text-emerald-600 hover:text-emerald-700">
                  Create New Job →
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading complete audit trail...</p>
          </div>
        )}

        {/* Results */}
        {jobAuditData && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Job Summary Card */}
            <div className="neu-raised rounded-3xl p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">📋 Job Summary</h2>
                <button onClick={clearAuditData} className="text-sm text-slate-500 hover:text-slate-700">Clear</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500">Job Number</p>
                  <p className="font-bold text-slate-800 dark:text-white text-lg">{jobAuditData.job.job_number}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Title</p>
                  <p className="font-medium text-sm">{jobAuditData.job.title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(jobAuditData.job.status)}`}>
                    {jobAuditData.job.status?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Priority</p>
                  <span className="font-semibold capitalize">{jobAuditData.job.priority || 'N/A'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="w-4 h-4" />{formatDate(jobAuditData.job.scheduled_date)}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <MapPin className="w-4 h-4" />{jobAuditData.job.site_city || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Briefcase className="w-4 h-4" />{jobAuditData.job.cleaners_required || 1} cleaners needed
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <User className="w-4 h-4" />{jobAuditData.assignments?.length || 0} assigned
                </div>
              </div>
              {jobAuditData.creator && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500">
                    Created by: <span className="font-medium text-slate-700 dark:text-slate-300">
                      {jobAuditData.creator.full_name} ({jobAuditData.creator.role?.replace('_', ' ')})
                    </span> · {jobAuditData.creator.email}
                  </p>
                </div>
              )}
            </div>

            {/* Client Info */}
            {jobAuditData.client && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3">🏢 Client</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <p><span className="text-slate-500">Name:</span> <span className="font-medium text-slate-800 dark:text-white">{jobAuditData.client.company_name}</span></p>
                  <p><span className="text-slate-500">Code:</span> {jobAuditData.client.client_code || 'N/A'}</p>
                  <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{jobAuditData.client.phone || 'N/A'}</p>
                  <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{jobAuditData.client.email || 'N/A'}</p>
                  {jobAuditData.client.city && <p className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{jobAuditData.client.city}</p>}
                </div>
              </div>
            )}

            {/* Complete Audit Timeline - WHO, WHAT, WHEN, HOW */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                Complete Audit Trail ({jobAuditData.auditLogs?.length || 0} events)
              </h2>
              
              {jobAuditData.auditLogs?.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-blue-500 to-emerald-500"></div>
                  <div className="space-y-6">
                    {jobAuditData.auditLogs.map((log, i) => (
                      <div key={log.id || i} className="relative pl-12">
                        <div className="absolute left-3.5 top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border-2 border-purple-500 shadow-sm"></div>
                        
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                          {/* Header: Action + Source + Time */}
                          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action_type)}
                              <span className="font-semibold text-sm capitalize text-slate-800 dark:text-white">
                                {log.action_type?.replace(/_/g, ' ')}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${getSourceBadge(log.action_source)}`}>
                                {log.action_source?.replace('_', ' ')}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">{formatDateTime(log.created_at)}</span>
                          </div>
                          
                          {/* WHAT happened */}
                          <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                            {log.action_description}
                          </p>
                          
                          {/* WHO did it */}
                          <div className="flex items-center gap-3 mb-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                              <User className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-white">
                                {log.performed_by_name || 'System'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {log.performed_by_role?.replace('_', ' ') || 'N/A'}
                                {log.performed_by_email && ` • ${log.performed_by_email}`}
                              </p>
                            </div>
                          </div>
                          
                          {/* WHAT CHANGED - Old vs New */}
                          {log.field_changed && (
                            <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 text-xs">
                              <span className="font-medium text-amber-700 dark:text-amber-400">{log.field_changed}:</span>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 line-through">{log.old_value || 'N/A'}</span>
                                <span className="text-slate-400">→</span>
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">{log.new_value || 'N/A'}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* GPS Location */}
                          {log.latitude && log.longitude && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="w-3 h-3" />
                              <span>{Number(log.latitude).toFixed(6)}, {Number(log.longitude).toFixed(6)}</span>
                              {log.location_address && <span>• {log.location_address}</span>}
                            </div>
                          )}
                          
                          {/* HOW - Source & Device */}
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                            <span>Source: {log.action_source?.replace('_', ' ')}</span>
                            {log.device_info && <span>• {log.device_info}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No audit logs available for this job</p>
                  <p className="text-xs text-slate-400 mt-1">Audit logs are created when job actions occur</p>
                </div>
              )}
            </div>

            {/* Staff Assignments */}
            {jobAuditData.assignments?.length > 0 && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />Staff Assignments
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {jobAuditData.assignments.map(a => (
                    <div key={a.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-slate-800 dark:text-white">
                          {a.employees?.first_name} {a.employees?.last_name}
                        </p>
                        <p className="text-xs text-slate-500">{a.employees?.employee_code} • {a.employees?.department}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        a.assignment_status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        a.assignment_status === 'released' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        a.assignment_status === 'in_progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {a.assignment_status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Inspections */}
            {jobAuditData.inspections?.length > 0 && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />Quality Inspections
                </h2>
                {jobAuditData.inspections.map(insp => (
                  <div key={insp.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Rating: {insp.overall_rating}/5</span>
                      <span className="text-xs text-slate-500">{formatDate(insp.inspection_date)}</span>
                    </div>
                    {insp.issues_found && <p className="text-sm text-red-600 mt-1">Issues: {insp.issues_found}</p>}
                    {insp.recommendations && <p className="text-sm text-emerald-600 mt-1">Recommendations: {insp.recommendations}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Incidents */}
            {jobAuditData.incidents?.length > 0 && (
              <div className="neu-raised rounded-3xl p-6 border-l-4 border-red-500">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />Incidents ({jobAuditData.incidents.length})
                </h2>
                {jobAuditData.incidents.map(inc => (
                  <div key={inc.id} className="p-3 rounded-xl bg-red-50 dark:bg-red-900/10 mb-2">
                    <p className="font-medium text-sm">{inc.title}</p>
                    <p className="text-xs text-slate-500">{inc.incident_number} • {inc.incident_type} • Severity: {inc.severity}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Financial Information */}
            {(jobAuditData.quotation || jobAuditData.invoice) && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />Financial Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobAuditData.quotation && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <p className="text-xs text-slate-500">Quotation</p>
                      <p className="font-medium">{jobAuditData.quotation.quotation_number}</p>
                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(jobAuditData.quotation.total_amount)}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{jobAuditData.quotation.status}</span>
                    </div>
                  )}
                  {jobAuditData.invoice && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <p className="text-xs text-slate-500">Invoice</p>
                      <p className="font-medium">{jobAuditData.invoice.invoice_number}</p>
                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(jobAuditData.invoice.total_amount)}</p>
                      <p className="text-xs">Paid: {formatCurrency(jobAuditData.invoice.amount_paid)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Route Information */}
            {jobAuditData.routeStops?.length > 0 && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-600" />Route Information
                </h2>
                {jobAuditData.routeStops.map(stop => (
                  <div key={stop.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 mb-2">
                    <p className="font-medium text-sm">{stop.routes?.route_name}</p>
                    <p className="text-xs text-slate-500">Stop #{stop.stop_number} • {formatDate(stop.routes?.route_date)} • Team: {stop.routes?.teams?.team_name}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !jobAuditData && !showJobList && (
          <div className="text-center py-12 neu-raised rounded-3xl">
            <History className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Enter a job number to view its complete audit trail</p>
            <p className="text-slate-400 text-sm mt-2">Example: JOB-2506-0001</p>
            <p className="text-slate-400 text-xs mt-1">You'll see: Who did what, when, and how</p>
            <button onClick={() => setShowJobList(true)} className="mt-4 neu-raised neu-btn px-6 py-3 rounded-2xl bg-purple-600 text-white hover:bg-purple-700">
              <List className="w-4 h-4 inline mr-2" />Browse Available Jobs
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
