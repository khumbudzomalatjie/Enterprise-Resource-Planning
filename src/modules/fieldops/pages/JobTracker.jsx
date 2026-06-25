import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import { Search, Sun, Moon, Sparkles, ChevronRight, History, Briefcase, RefreshCw } from 'lucide-react'

export default function JobTracker() {
  const { isDark, toggleTheme } = useThemeStore()
  const [searchInput, setSearchInput] = useState('')
  const [allJobs, setAllJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobDetails, setJobDetails] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dbStatus, setDbStatus] = useState('checking...')

  useEffect(() => {
    checkDatabase()
  }, [])

  // Check if database has data
  const checkDatabase = async () => {
    try {
      const { data, error, count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        setDbStatus('Error: ' + error.message)
        return
      }
      
      if (count === 0) {
        setDbStatus('No jobs found in database')
        return
      }
      
      setDbStatus(`${count} jobs found`)
      loadAllJobs()
    } catch (err) {
      setDbStatus('Connection error: ' + err.message)
    }
  }

  // Load all jobs for the list
  const loadAllJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('job_number, title, status, clients(company_name), scheduled_date')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (error) {
      console.error('Load jobs error:', error)
      setError('Failed to load jobs: ' + error.message)
      return
    }
    
    console.log('Jobs loaded:', data)
    setAllJobs(data || [])
    if (data?.length === 0) {
      setError('No jobs exist in the database. Create jobs in Operations module first.')
    } else {
      setError('')
    }
  }

  // Search for a job
  const handleSearch = async (e) => {
    e?.preventDefault()
    setError('')
    setSelectedJob(null)
    setJobDetails(null)
    setAuditLogs([])
    setAssignments([])
    
    if (!searchInput.trim()) return

    setLoading(true)
    const search = searchInput.trim()

    // Try to find the job - multiple methods
    let foundJob = null

    // Method 1: Exact job_number match
    let { data } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_number', search.toUpperCase())
      .single()
    if (data) foundJob = data

    // Method 2: Partial match on job_number
    if (!foundJob) {
      const { data: partial } = await supabase
        .from('jobs')
        .select('*')
        .ilike('job_number', `%${search.toUpperCase()}%`)
        .limit(1)
      if (partial?.length > 0) foundJob = partial[0]
    }

    // Method 3: Search by title
    if (!foundJob) {
      const { data: byTitle } = await supabase
        .from('jobs')
        .select('*')
        .ilike('title', `%${search}%`)
        .limit(1)
      if (byTitle?.length > 0) foundJob = byTitle[0]
    }

    if (!foundJob) {
      setError(`No job found for "${search}". Select a job from the list below.`)
      setLoading(false)
      return
    }

    // Job found! Now get details
    setSelectedJob(foundJob)
    
    // Get client info
    if (foundJob.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', foundJob.client_id)
        .single()
      foundJob.client = client
    }

    // Get creator info
    if (foundJob.created_by) {
      const { data: creator } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('id', foundJob.created_by)
        .single()
      foundJob.creator = creator
    }

    setJobDetails(foundJob)

    // Get assignments
    const { data: assignmentData } = await supabase
      .from('field_job_assignments')
      .select('*, employees(first_name, last_name, employee_code)')
      .eq('job_id', foundJob.id)
    setAssignments(assignmentData || [])

    // Get audit logs
    const { data: auditData } = await supabase
      .from('job_full_audit')
      .select('*')
      .eq('job_id', foundJob.id)
      .order('created_at', { ascending: true })
    setAuditLogs(auditData || [])

    setLoading(false)
  }

  const handleSelectJob = (jobNumber) => {
    setSearchInput(jobNumber)
    // Auto-search
    setTimeout(() => {
      handleSearch({ preventDefault: () => {} })
    }, 100)
  }

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'
  const formatDateTime = (date) => date ? new Date(date).toLocaleString('en-ZA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : 'N/A'

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-2 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Ops</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="font-medium">Job Tracker</span>
        </div>

        <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
          <History className="w-8 h-8 text-purple-600" />Job Tracker
        </h1>
        <p className="text-slate-500 text-sm mb-2">Database: {dbStatus}</p>

        {/* Search */}
        <div className="neu-raised rounded-2xl p-4 mb-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Job number or title..."
                className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
              />
            </div>
            <button type="submit" disabled={loading} className="neu-raised neu-btn px-4 py-3 rounded-xl bg-purple-600 text-white font-medium disabled:opacity-50">
              {loading ? '...' : 'Search'}
            </button>
            <button type="button" onClick={loadAllJobs} className="neu-raised neu-btn px-3 py-3 rounded-xl bg-slate-600 text-white">
              <RefreshCw className="w-5 h-5" />
            </button>
          </form>
          {error && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-sm text-amber-700 dark:text-amber-400">
              {error}
            </div>
          )}
        </div>

        {/* Job List */}
        <div className="neu-raised rounded-2xl p-4 mb-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-600" />
            Jobs ({allJobs.length})
          </h3>
          {allJobs.length > 0 ? (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {allJobs.map(job => (
                <div
                  key={job.job_number}
                  onClick={() => handleSelectJob(job.job_number)}
                  className={`p-2 rounded-lg cursor-pointer text-sm flex justify-between items-center ${
                    selectedJob?.job_number === job.job_number
                      ? 'bg-purple-100 dark:bg-purple-900/30 font-medium'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700/30'
                  }`}
                >
                  <span>{job.job_number}</span>
                  <span className="text-xs text-slate-500 truncate ml-2 flex-1 text-right">{job.title}</span>
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                    job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    job.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{job.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Briefcase className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No jobs in database</p>
              <Link to="/operations/jobs/new" className="text-xs text-emerald-600 hover:text-emerald-700 mt-1 inline-block">
                Create job in Operations →
              </Link>
            </div>
          )}
        </div>

        {/* Job Details */}
        {jobDetails && (
          <div className="neu-raised rounded-2xl p-4 mb-4">
            <h2 className="font-bold text-lg mb-2">{jobDetails.job_number}</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-500">Title:</span> {jobDetails.title}</div>
              <div><span className="text-slate-500">Status:</span> {jobDetails.status}</div>
              <div><span className="text-slate-500">Priority:</span> {jobDetails.priority}</div>
              <div><span className="text-slate-500">Date:</span> {formatDate(jobDetails.scheduled_date)}</div>
              <div><span className="text-slate-500">Location:</span> {jobDetails.site_city || 'N/A'}</div>
              <div><span className="text-slate-500">Cleaners:</span> {jobDetails.cleaners_required}</div>
            </div>
            {jobDetails.client && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-sm">
                <span className="text-slate-500">Client:</span> {jobDetails.client.company_name}
              </div>
            )}
            {jobDetails.creator && (
              <div className="text-sm">
                <span className="text-slate-500">Created by:</span> {jobDetails.creator.full_name}
              </div>
            )}
          </div>
        )}

        {/* Audit Logs */}
        {auditLogs.length > 0 && (
          <div className="neu-raised rounded-2xl p-4 mb-4">
            <h2 className="font-bold text-lg mb-2">Audit Trail ({auditLogs.length})</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogs.map((log, i) => (
                <div key={log.id || i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium capitalize">{log.action_type?.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-slate-500">{formatDateTime(log.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{log.action_description}</p>
                  <p className="text-xs text-slate-500 mt-0.5">By: {log.performed_by_name || 'System'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assignments */}
        {assignments.length > 0 && (
          <div className="neu-raised rounded-2xl p-4">
            <h2 className="font-bold text-lg mb-2">Assignments ({assignments.length})</h2>
            <div className="space-y-2">
              {assignments.map(a => (
                <div key={a.id} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30 flex justify-between text-sm">
                  <span>{a.employees?.first_name} {a.employees?.last_name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{a.assignment_status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
