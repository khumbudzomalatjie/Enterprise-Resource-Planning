import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFieldOpsStore from '../store/fieldOpsStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import { 
  Search, FileText, Clock, User, CheckCircle2, XCircle,
  AlertTriangle, DollarSign, Sun, Moon, Sparkles, ChevronRight,
  Users, Calendar, MapPin, Briefcase, Phone, Mail,
  Shield, History, List, RefreshCw, Info
} from 'lucide-react'

export default function JobTracker() {
  const { jobAuditData, fetchJobAuditTrail, loading, clearAuditData } = useFieldOpsStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [searchInput, setSearchInput] = useState('')
  const [allJobs, setAllJobs] = useState([])
  const [showJobList, setShowJobList] = useState(true) // Show by default
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    loadAllJobs()
  }, [])

  const loadAllJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('job_number, title, status, clients(company_name), scheduled_date')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (data) {
      setAllJobs(data)
      console.log('Jobs loaded:', data.length)
    }
    if (error) {
      console.error('Error loading jobs:', error)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    setSearchError('')
    
    if (!searchInput.trim()) return

    const result = await fetchJobAuditTrail(searchInput.trim())
    if (!result.success) {
      setSearchError(result.error || 'Job not found')
      // Show job list to help user
      setShowJobList(true)
    }
  }

  const handleSelectJob = (jobNum) => {
    setSearchInput(jobNum)
    setShowJobList(false)
    setSearchError('')
    fetchJobAuditTrail(jobNum)
  }

  const formatDateTime = (date) => date ? new Date(date).toLocaleString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'
  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const getActionIcon = (type) => {
    const icons = {
      job_created: <FileText className="w-4 h-4 text-blue-600" />,
      staff_assigned: <Users className="w-4 h-4 text-purple-600" />,
      staff_released: <XCircle className="w-4 h-4 text-red-600" />,
      job_started: <Clock className="w-4 h-4 text-amber-600" />,
      job_completed: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      job_cancelled: <XCircle className="w-4 h-4 text-red-600" />,
      quality_inspected: <Shield className="w-4 h-4 text-purple-600" />,
      invoice_generated: <DollarSign className="w-4 h-4 text-emerald-600" />,
      gps_checkin: <MapPin className="w-4 h-4 text-emerald-600" />,
      gps_checkout: <MapPin className="w-4 h-4 text-red-600" />,
      incident_reported: <AlertTriangle className="w-4 h-4 text-red-600" />,
    }
    return icons[type] || <FileText className="w-4 h-4 text-slate-600" />
  }

  const getStatusColor = (status) => {
    const c = { pending: 'bg-slate-100 text-slate-700', scheduled: 'bg-blue-100 text-blue-700', in_progress: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' }
    return c[status] || 'bg-slate-100 text-slate-700'
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
          <p className="text-slate-500">Click any job below or search by number, title, or client</p>
        </motion.div>

        {/* Search Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Type job number, title, or client name..."
                className="w-full pl-12 pr-4 py-4 text-lg neu-inset rounded-2xl text-slate-700 dark:text-slate-300"
              />
            </div>
            <button type="submit" disabled={loading} className="neu-raised neu-btn px-6 py-4 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 font-semibold disabled:opacity-50">
              {loading ? '...' : 'Track'}
            </button>
            <button type="button" onClick={() => { setShowJobList(!showJobList); if (!showJobList) loadAllJobs() }} className="neu-raised neu-btn px-4 py-4 rounded-2xl bg-slate-600 text-white hover:bg-slate-700" title="Toggle job list">
              <List className="w-5 h-5" />
            </button>
          </form>
          
          {searchError && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
              <p className="text-amber-700 dark:text-amber-400 text-sm flex items-center gap-2">
                <Info className="w-4 h-4" />{searchError}
              </p>
              <p className="text-xs text-slate-500 mt-1">Select a job from the list below or try a different search term.</p>
            </div>
          )}
        </motion.div>

        {/* Job List - Always visible by default */}
        {showJobList && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <List className="w-5 h-5 text-emerald-600" />
                Available Jobs ({allJobs.length})
              </h3>
              <button onClick={loadAllJobs} className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            
            {allJobs.length > 0 ? (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {allJobs.map(job => (
                  <div key={job.job_number}
                    onClick={() => handleSelectJob(job.job_number)}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/10 cursor-pointer border border-slate-100 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-800 dark:text-white">{job.job_number}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{job.title || 'No title'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {job.clients?.company_name && (
                          <span className="text-xs text-slate-500">🏢 {job.clients.company_name}</span>
                        )}
                        {job.scheduled_date && (
                          <span className="text-xs text-slate-500">📅 {formatDate(job.scheduled_date)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status?.replace('_', ' ')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-medium">No jobs found in the database</p>
                <p className="text-slate-400 text-sm mt-2">You need to create jobs first before you can track them.</p>
                <div className="mt-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-left">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Run this SQL in Supabase to create test jobs:</p>
                  <pre className="text-xs text-slate-500 overflow-auto max-h-32 bg-slate-200 dark:bg-slate-900 p-3 rounded-lg">
{`INSERT INTO public.jobs (job_number, title, description, site_address, 
site_city, scheduled_date, scheduled_start_time, scheduled_end_time, 
priority, status, cleaners_required, notes)
VALUES 
  ('JOB-2606-0001', 'Office Cleaning - Sandton', 'Daily cleaning', 
   '100 Rivonia Road', 'Sandton', '2026-06-25', '08:00', '17:00', 
   'high', 'scheduled', 3, 'Test job');`}
                  </pre>
                </div>
                <div className="flex gap-3 justify-center mt-4">
                  <Link to="/operations/jobs/new" className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700">
                    Create Job in Operations
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading complete audit trail...</p>
          </div>
        )}

        {/* Results - Job Audit Data */}
        {jobAuditData && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* Job Summary Card */}
            <div className="neu-raised rounded-3xl p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">📋 {jobAuditData.job.job_number}</h2>
                <button onClick={clearAuditData} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
                  <XCircle className="w-4 h-4" /> Clear
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-xs text-slate-500">Title</p><p className="font-medium text-sm">{jobAuditData.job.title || 'N/A'}</p></div>
                <div><p className="text-xs text-slate-500">Status</p><span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(jobAuditData.job.status)}`}>{jobAuditData.job.status?.replace('_', ' ')}</span></div>
                <div><p className="text-xs text-slate-500">Priority</p><p className="font-semibold capitalize">{jobAuditData.job.priority || 'N/A'}</p></div>
                <div><p className="text-xs text-slate-500">Value</p><p className="font-bold text-emerald-600">{formatCurrency(jobAuditData.job.quoted_amount)}</p></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1 text-sm text-slate-500"><Calendar className="w-4 h-4" />{formatDate(jobAuditData.job.scheduled_date)}</div>
                <div className="flex items-center gap-1 text-sm text-slate-500"><MapPin className="w-4 h-4" />{jobAuditData.job.site_city || 'N/A'}</div>
                <div className="flex items-center gap-1 text-sm text-slate-500"><Briefcase className="w-4 h-4" />{jobAuditData.job.cleaners_required || 1} cleaners</div>
                <div className="flex items-center gap-1 text-sm text-slate-500"><User className="w-4 h-4" />{jobAuditData.assignments?.length || 0} assigned</div>
              </div>
              {jobAuditData.creator && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500">Created by: <span className="font-medium">{jobAuditData.creator.full_name} ({jobAuditData.creator.role?.replace('_', ' ')})</span></p>
                </div>
              )}
            </div>

            {/* Client Info */}
            {jobAuditData.client && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-lg font-bold mb-3 text-slate-800 dark:text-white">🏢 Client</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <p><span className="text-slate-500">Name:</span> <span className="font-medium">{jobAuditData.client.company_name}</span></p>
                  <p><span className="text-slate-500">Code:</span> {jobAuditData.client.client_code || 'N/A'}</p>
                  <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{jobAuditData.client.phone || 'N/A'}</p>
                  <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{jobAuditData.client.email || 'N/A'}</p>
                </div>
              </div>
            )}

            {/* Audit Timeline */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />Audit Trail ({jobAuditData.auditLogs?.length || 0} events)
              </h2>
              {jobAuditData.auditLogs?.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-blue-500 to-emerald-500"></div>
                  <div className="space-y-4">
                    {jobAuditData.auditLogs.map((log, i) => (
                      <div key={log.id || i} className="relative pl-12">
                        <div className="absolute left-3.5 top-2 w-3 h-3 rounded-full bg-white dark:bg-slate-800 border-2 border-purple-500"></div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                          <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                            <div className="flex items-center gap-1.5">
                              {getActionIcon(log.action_type)}
                              <span className="font-medium text-sm capitalize">{log.action_type?.replace(/_/g, ' ')}</span>
                            </div>
                            <span className="text-xs text-slate-500">{formatDateTime(log.created_at)}</span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{log.action_description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                              <User className="w-3 h-3 text-purple-600" />
                            </div>
                            <span className="text-xs font-medium">{log.performed_by_name || 'System'}</span>
                            <span className="text-xs text-slate-500">({log.performed_by_role?.replace('_', ' ') || 'N/A'})</span>
                          </div>
                          {log.field_changed && (
                            <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-900/10 text-xs">
                              <span className="font-medium">{log.field_changed}:</span>{' '}
                              <span className="line-through text-red-600">{log.old_value || 'N/A'}</span> →{' '}
                              <span className="text-emerald-600">{log.new_value || 'N/A'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No audit logs yet</p>
                  <p className="text-xs text-slate-400 mt-1">Perform actions on this job (assign staff, change status) to generate audit logs</p>
                </div>
              )}
            </div>

            {/* Staff Assignments */}
            {jobAuditData.assignments?.length > 0 && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-lg font-bold mb-3 text-slate-800 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />Staff ({jobAuditData.assignments.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {jobAuditData.assignments.map(a => (
                    <div key={a.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{a.employees?.first_name} {a.employees?.last_name}</p>
                        <p className="text-xs text-slate-500">{a.employees?.employee_code}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        a.assignment_status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                        a.assignment_status === 'released' ? 'bg-red-100 text-red-700' : 
                        'bg-blue-100 text-blue-700'}`}>{a.assignment_status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial */}
            {(jobAuditData.quotation || jobAuditData.invoice) && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-lg font-bold mb-3 text-slate-800 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />Financial
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {jobAuditData.quotation && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <p className="text-xs text-slate-500">Quotation</p>
                      <p className="font-medium">{jobAuditData.quotation.quotation_number}</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(jobAuditData.quotation.total_amount)}</p>
                    </div>
                  )}
                  {jobAuditData.invoice && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <p className="text-xs text-slate-500">Invoice</p>
                      <p className="font-medium">{jobAuditData.invoice.invoice_number}</p>
                      <p className="font-bold text-emerald-600">{formatCurrency(jobAuditData.invoice.total_amount)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  )
}
