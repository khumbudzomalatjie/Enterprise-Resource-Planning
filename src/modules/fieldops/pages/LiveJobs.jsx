import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFieldOpsStore from '../store/fieldOpsStore'
import useAuthStore from '../../../store/authStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Radio, Search, Users, UserPlus, UserX, MapPin, 
  Clock, Play, CheckCircle2, XCircle, ChevronRight,
  Sun, Moon, Sparkles, Filter, Briefcase, Phone,
  User, Shield, RefreshCw, List, Grid, AlertCircle,
  Building2, Calendar, ArrowUpDown, Eye, Wifi, WifiOff
} from 'lucide-react'

// WebSocket-like polling for live updates
const POLL_INTERVAL = 10000 // 10 seconds

export default function LiveJobs() {
  const { 
    liveJobs, myAssignedJobs, fetchLiveJobs, fetchMyAssignedJobs,
    assignEmployee, releaseEmployee, updateJobStatus, loading 
  } = useFieldOpsStore()
  const { user, profile } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [search, setSearch] = useState('')
  const [filterView, setFilterView] = useState('all') // 'all', 'mine', 'unassigned', 'in_progress'
  const [sortBy, setSortBy] = useState('priority') // 'priority', 'date', 'client', 'status'
  const [selectedJob, setSelectedJob] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showJobDetail, setShowJobDetail] = useState(null)
  const [availableEmployees, setAvailableEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastSync, setLastSync] = useState(new Date())

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadAllData()
    fetchAvailableEmployees()
  }, [])

  // Auto-refresh polling
  useEffect(() => {
    const interval = setInterval(() => {
      loadAllData()
      setLastSync(new Date())
    }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  const loadAllData = async () => {
    await Promise.all([
      fetchLiveJobs(),
      fetchMyAssignedJobs(profile?.id || user?.id)
    ])
  }

  const fetchAvailableEmployees = async () => {
    try {
      const { supabase } = await import('../../../lib/supabaseClient')
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('employment_status', 'active')
        .order('first_name')
      setAvailableEmployees(data || [])
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    }
  }

  // Merge all jobs into one unified list with assignment info
  const unifiedJobs = useCallback(() => {
    const allJobs = [...(liveJobs || [])]
    
    // Mark which jobs are assigned to current user
    const myJobIds = new Set((myAssignedJobs || []).map(a => a.job_id || a.jobs?.id))
    
    return allJobs.map(job => ({
      ...job,
      isMyJob: myJobIds.has(job.id),
      myAssignment: (myAssignedJobs || []).find(a => (a.job_id || a.jobs?.id) === job.id)
    }))
  }, [liveJobs, myAssignedJobs])

  const jobs = unifiedJobs()

  // Filter and sort
  const filteredJobs = jobs.filter(job => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesSearch = 
        job.job_number?.toLowerCase().includes(searchLower) ||
        job.title?.toLowerCase().includes(searchLower) ||
        job.clients?.company_name?.toLowerCase().includes(searchLower) ||
        job.site_city?.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    // View filter
    switch (filterView) {
      case 'mine': return job.isMyJob
      case 'unassigned': return (job.field_job_assignments?.length || 0) === 0
      case 'in_progress': return job.status === 'in_progress'
      default: return true
    }
  })

  // Sort
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { emergency: 0, urgent: 1, high: 2, medium: 3, low: 4 }
        return (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5)
      case 'date':
        return new Date(a.scheduled_date) - new Date(b.scheduled_date)
      case 'client':
        return (a.clients?.company_name || '').localeCompare(b.clients?.company_name || '')
      case 'status':
        const statusOrder = { in_progress: 0, assigned: 1, scheduled: 2, pending: 3 }
        return (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4)
      default:
        return 0
    }
  })

  // Handlers
  const handleAssign = async () => {
    if (!selectedJob || !selectedEmployee) {
      toast.error('Please select an employee')
      return
    }
    const result = await assignEmployee(selectedJob.id, selectedEmployee)
    if (result.success) {
      toast.success(`Employee assigned to ${selectedJob.job_number}!`)
      setShowAssignModal(false)
      setSelectedEmployee('')
      loadAllData()
    } else {
      toast.error(result.error || 'Failed to assign')
    }
  }

  const handleRelease = async (assignmentId, employeeName, jobNumber) => {
    if (window.confirm(`Release ${employeeName} from ${jobNumber}?`)) {
      const result = await releaseEmployee(assignmentId, 'Manually released')
      if (result.success) {
        toast.success(`${employeeName} released from ${jobNumber}`)
        loadAllData()
      } else {
        toast.error('Failed to release')
      }
    }
  }

  const handleStartJob = async (jobId) => {
    const result = await updateJobStatus(jobId, 'in_progress')
    if (result.success) {
      toast.success('Job started!')
      loadAllData()
    }
  }

  const handleCompleteJob = async (jobId) => {
    if (window.confirm('Mark this job as completed? It will be removed from the live list.')) {
      const result = await updateJobStatus(jobId, 'completed')
      if (result.success) {
        toast.success('Job completed!')
        loadAllData()
      }
    }
  }

  const handleManualRefresh = () => {
    loadAllData()
    setLastSync(new Date())
    toast.success('Refreshed!')
  }

  // Status colors
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      assigned: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse',
    }
    return colors[status] || 'bg-slate-100 text-slate-700'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-slate-100 text-slate-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-amber-100 text-amber-600',
      urgent: 'bg-red-100 text-red-700',
      emergency: 'bg-red-200 text-red-800 animate-pulse',
    }
    return colors[priority] || ''
  }

  const getPriorityIcon = (priority) => {
    const icons = { emergency: '🔴', urgent: '🟠', high: '🟡', medium: '🔵', low: '⚪' }
    return icons[priority] || '⚪'
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      {/* Top Bar */}
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-3 py-2 rounded-full flex items-center gap-2 text-xs">
          {isOnline ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-red-500" />}
          <span className="text-slate-500 hidden sm:inline">
            {isOnline ? 'Live' : 'Offline'} • Synced {lastSync.toLocaleTimeString()}
          </span>
        </div>
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Ops</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Live Jobs</span>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Radio className="w-8 h-8 text-emerald-600" />Live Jobs
            </h1>
            <p className="text-slate-500 mt-1">
              {jobs.length} total • {jobs.filter(j => j.isMyJob).length} my jobs • {jobs.filter(j => j.status === 'in_progress').length} in progress
            </p>
          </div>
          <button onClick={handleManualRefresh} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2">
            <RefreshCw className="w-5 h-5" /><span>Refresh</span>
          </button>
        </motion.div>

        {/* Stats Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'All Open', value: jobs.length, active: filterView === 'all', onClick: () => setFilterView('all'), color: 'bg-blue-500' },
            { label: 'My Jobs', value: jobs.filter(j => j.isMyJob).length, active: filterView === 'mine', onClick: () => setFilterView('mine'), color: 'bg-emerald-500' },
            { label: 'Unassigned', value: jobs.filter(j => (j.field_job_assignments?.length || 0) === 0).length, active: filterView === 'unassigned', onClick: () => setFilterView('unassigned'), color: 'bg-amber-500' },
            { label: 'In Progress', value: jobs.filter(j => j.status === 'in_progress').length, active: filterView === 'in_progress', onClick: () => setFilterView('in_progress'), color: 'bg-purple-500' },
            { label: 'High Priority', value: jobs.filter(j => ['urgent', 'emergency', 'high'].includes(j.priority)).length, onClick: () => setSortBy('priority'), color: 'bg-red-500' },
          ].map(stat => (
            <button key={stat.label} onClick={stat.onClick}
              className={`neu-raised rounded-xl p-3 text-center transition-all hover:scale-105 ${stat.active ? 'ring-2 ring-emerald-500' : ''}`}>
              <div className={`w-3 h-3 rounded-full ${stat.color} mx-auto mb-1`}></div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </button>
          ))}
        </motion.div>

        {/* Search & Sort */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by job #, title, client, or city..."
                className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
              <option value="priority">Sort by Priority</option>
              <option value="date">Sort by Date</option>
              <option value="client">Sort by Client</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
        </motion.div>

        {/* Jobs List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading live jobs...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedJobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                layout
                className={`neu-raised rounded-2xl p-5 transition-all ${
                  job.isMyJob ? 'border-l-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/5' : ''
                } ${job.status === 'in_progress' ? 'border-r-4 border-amber-500' : ''}`}
              >
                {/* Job Header Row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Priority Indicator */}
                    <span className="text-xl mt-1" title={job.priority}>{getPriorityIcon(job.priority)}</span>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-white text-lg">{job.job_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(job.status)}`}>
                          {job.status?.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(job.priority)}`}>
                          {job.priority}
                        </span>
                        {job.isMyJob && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            🔒 My Job
                          </span>
                        )}
                        {job.job_categories && (
                          <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: job.job_categories.color + '20', color: job.job_categories.color }}>
                            {job.job_categories.name}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mt-1">{job.title}</h3>
                      
                      {/* Client & Location */}
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                        {job.clients && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {job.clients.company_name}
                            {job.clients.phone && <span className="text-xs text-slate-400">• {job.clients.phone}</span>}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {job.site_city || 'No location'} • {job.site_address?.substring(0, 30)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(job.scheduled_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {job.scheduled_start_time?.slice(0, 5) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {job.status === 'scheduled' && (
                      <button onClick={() => handleStartJob(job.id)}
                        className="p-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                        title="Start Job">
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {job.status === 'in_progress' && (
                      <button onClick={() => handleCompleteJob(job.id)}
                        className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                        title="Complete Job">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => { setSelectedJob(job); setShowAssignModal(true) }}
                      className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                      title="Assign Staff">
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowJobDetail(showJobDetail === job.id ? null : job.id)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
                      title="View Details">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Assigned Staff Section */}
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Assigned Staff ({job.field_job_assignments?.filter(a => a.assignment_status !== 'released' && a.assignment_status !== 'completed').length || 0} of {job.cleaners_required || 1})
                    </h4>
                    {job.field_job_assignments?.filter(a => a.assignment_status !== 'released' && a.assignment_status !== 'completed').length >= (job.cleaners_required || 1) && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Fully Staffed
                      </span>
                    )}
                  </div>
                  
                  {job.field_job_assignments?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {job.field_job_assignments
                        .filter(a => a.assignment_status !== 'released' && a.assignment_status !== 'completed')
                        .map(assignment => (
                          <div key={assignment.id} 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                              assignment.employees?.user_id === user?.id || assignment.employee_id === profile?.id
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 ring-2 ring-emerald-500'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                            <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs font-bold">
                              {assignment.employees?.first_name?.[0]}{assignment.employees?.last_name?.[0]}
                            </div>
                            <span className="font-medium">
                              {assignment.employees?.first_name} {assignment.employees?.last_name}
                            </span>
                            <span className="text-xs opacity-75">({assignment.assignment_status})</span>
                            <button 
                              onClick={() => handleRelease(assignment.id, `${assignment.employees?.first_name} ${assignment.employees?.last_name}`, job.job_number)}
                              className="ml-1 p-0.5 rounded-full hover:bg-red-200 dark:hover:bg-red-800 text-slate-400 hover:text-red-600"
                              title="Release">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">No staff assigned yet - Click <UserPlus className="w-3 h-3 inline" /> to assign</p>
                  )}
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {showJobDetail === job.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 overflow-hidden"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Cleaners Required</p>
                          <p className="font-medium">{job.cleaners_required}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Estimated Duration</p>
                          <p className="font-medium">{job.estimated_duration_minutes || 'N/A'} min</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Quoted Amount</p>
                          <p className="font-medium text-emerald-600">
                            {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(job.quoted_amount || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Site Contact</p>
                          <p className="font-medium">{job.site_contact_name || 'N/A'}</p>
                          {job.site_contact_phone && <p className="text-xs text-slate-400">{job.site_contact_phone}</p>}
                        </div>
                        {job.access_instructions && (
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500">Access Instructions</p>
                            <p className="text-sm">{job.access_instructions}</p>
                          </div>
                        )}
                        {job.special_instructions && (
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500">Special Instructions</p>
                            <p className="text-sm">{job.special_instructions}</p>
                          </div>
                        )}
                        {job.notes && (
                          <div className="col-span-full">
                            <p className="text-xs text-slate-500">Notes</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{job.notes}</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => navigate(`/fieldops/job-tracker?job=${job.job_number}`)}
                          className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
                          <Search className="w-3 h-3" /> Track Job Audit
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && sortedJobs.length === 0 && (
          <div className="text-center py-12 neu-raised rounded-3xl">
            <Radio className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No live jobs found</p>
            <p className="text-slate-400 text-sm">Try changing filters or creating new jobs in Operations</p>
          </div>
        )}
      </main>

      {/* Assign Employee Modal */}
      <AnimatePresence>
        {showAssignModal && selectedJob && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAssignModal(false)}>
            <motion.div 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="neu-raised rounded-3xl p-6 max-w-md w-full bg-white dark:bg-slate-800"
              onClick={e => e.stopPropagation()}>
              
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                Assign Staff
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Job: <span className="font-medium text-slate-700">{selectedJob.job_number}</span> - {selectedJob.title}
              </p>
              
              {/* Currently Assigned */}
              {selectedJob.field_job_assignments?.filter(a => a.assignment_status !== 'released').length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Currently Assigned:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedJob.field_job_assignments
                      .filter(a => a.assignment_status !== 'released')
                      .map(a => (
                        <span key={a.id} className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                          {a.employees?.first_name} {a.employees?.last_name}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <select 
                value={selectedEmployee} 
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full p-3 neu-inset rounded-xl mb-4 text-slate-700 dark:text-slate-300">
                <option value="">Select Employee to Assign</option>
                {availableEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code}) - {emp.department}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button onClick={() => { setShowAssignModal(false); setSelectedEmployee('') }}
                  className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-slate-600 text-white">
                  Cancel
                </button>
                <button onClick={handleAssign} disabled={!selectedEmployee}
                  className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-emerald-600 text-white disabled:opacity-50">
                  Assign
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
