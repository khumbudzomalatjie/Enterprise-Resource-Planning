import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFieldOpsStore from '../store/fieldOpsStore'
import useAuthStore from '../../../store/authStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Radio, Search, Users, UserPlus, MapPin, 
  Clock, Play, CheckCircle2, XCircle, ChevronRight,
  Sun, Moon, Sparkles, Building2, Calendar, Eye, 
  Wifi, WifiOff, RefreshCw, Camera, Download, X
} from 'lucide-react'

export default function LiveJobs() {
  const { 
    liveJobs, myAssignedJobs, fetchLiveJobs, fetchMyAssignedJobs,
    assignEmployee, releaseEmployee, updateJobStatus
  } = useFieldOpsStore()
  const { user, profile } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [search, setSearch] = useState('')
  const [filterView, setFilterView] = useState('all')
  const [sortBy, setSortBy] = useState('priority')
  const [selectedJob, setSelectedJob] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showJobDetail, setShowJobDetail] = useState(null)
  const [showPhotoGallery, setShowPhotoGallery] = useState(null)
  const [jobPhotos, setJobPhotos] = useState({})
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [availableEmployees, setAvailableEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastSync, setLastSync] = useState(new Date())
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); loadAllData() }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    loadAllData()
    fetchAvailableEmployees()

    const jobsChannel = supabase
      .channel('live-jobs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => { loadAllData(); setLastSync(new Date()) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'field_job_assignments' }, () => { loadAllData(); setLastSync(new Date()) })
      .subscribe()

    const fallbackInterval = setInterval(() => { loadAllData(); setLastSync(new Date()) }, 15000)

    return () => {
      supabase.removeChannel(jobsChannel)
      clearInterval(fallbackInterval)
    }
  }, [])

  const loadAllData = async () => {
    try {
      const userId = profile?.id || user?.id
      await Promise.all([
        fetchLiveJobs(),
        userId ? fetchMyAssignedJobs(userId) : Promise.resolve()
      ])
      setDataLoaded(true)
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  const fetchAvailableEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('employment_status', 'active')
        .order('first_name')
      if (!error) setAvailableEmployees(data || [])
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    }
  }

  const loadJobPhotos = async (jobId, force = false) => {
    if (!force && jobPhotos[jobId]) return
    try {
      const { data, error } = await supabase
        .from('job_photos')
        .select('*')
        .eq('job_id', jobId)
        .order('taken_at', { ascending: false })

      if (error) throw error
      setJobPhotos(prev => ({ ...prev, [jobId]: data || [] }))
    } catch (err) {
      console.error('Load photos error:', err)
      setJobPhotos(prev => ({ ...prev, [jobId]: [] }))
    }
  }

  useEffect(() => {
    if (liveJobs && liveJobs.length > 0) {
      liveJobs.slice(0, 10).forEach(job => {
        if (!jobPhotos[job.id]) loadJobPhotos(job.id)
      })
    }
  }, [liveJobs])

  const jobs = useCallback(() => {
    const allJobs = [...(liveJobs || [])]
    const myJobIds = new Set((myAssignedJobs || []).map(a => a.job_id || a.jobs?.id))
    return allJobs.map(job => ({
      ...job,
      isMyJob: myJobIds.has(job.id),
      myAssignment: (myAssignedJobs || []).find(a => (a.job_id || a.jobs?.id) === job.id)
    }))
  }, [liveJobs, myAssignedJobs])()

  // ✅ Double-safe filter — exclude completed/cancelled jobs
  const filteredJobs = jobs
    .filter(job => job.status !== 'completed' && job.status !== 'cancelled')
    .filter(job => {
      if (search) {
        const s = search.toLowerCase()
        if (!job.job_number?.toLowerCase().includes(s) &&
            !job.title?.toLowerCase().includes(s) &&
            !job.clients?.company_name?.toLowerCase().includes(s) &&
            !job.site_city?.toLowerCase().includes(s)) return false
      }
      switch (filterView) {
        case 'mine': return job.isMyJob
        case 'unassigned': return (job.field_job_assignments?.filter(a => a.assignment_status !== 'released').length || 0) === 0
        case 'in_progress': return job.status === 'in_progress'
        default: return true
      }
    })

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const priorityOrder = { emergency: 0, urgent: 1, high: 2, medium: 3, low: 4 }
    const statusOrder = { in_progress: 0, scheduled: 1, pending: 2 }
    switch (sortBy) {
      case 'priority': return (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5)
      case 'date': return new Date(a.scheduled_date) - new Date(b.scheduled_date)
      case 'client': return (a.clients?.company_name || '').localeCompare(b.clients?.company_name || '')
      case 'status': return (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4)
      default: return 0
    }
  })

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
      setSelectedJob(null)
      await loadAllData()
    } else {
      toast.error(result.error || 'Failed to assign employee')
    }
  }

  const handleRelease = async (assignmentId, employeeName, jobNumber) => {
    if (!window.confirm(`Release ${employeeName} from ${jobNumber}?`)) return
    const result = await releaseEmployee(assignmentId, 'Manually released from Live Jobs')
    if (result.success) {
      toast.success(`${employeeName} released from ${jobNumber}`)
      await loadAllData()
    } else {
      toast.error(result.error || 'Failed to release employee')
    }
  }

  const handleStartJob = async (jobId) => {
    const result = await updateJobStatus(jobId, 'in_progress')
    if (result.success) {
      toast.success('Job started!')
      await loadAllData()
    }
  }

  const handleCompleteJob = async (jobId) => {
    if (!window.confirm('Mark this job as completed? It will be removed from the live list.')) return
    const result = await updateJobStatus(jobId, 'completed')
    if (result.success) {
      toast.success('Job completed!')
      await loadAllData()
    }
  }

  const handleManualRefresh = () => {
    loadAllData()
    setLastSync(new Date())
    toast.success('Refreshed!')
  }

  const getStatusColor = (status) => {
    const c = {
      pending: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse',
    }
    return c[status] || 'bg-slate-100 text-slate-700'
  }

  const getPriorityColor = (priority) => {
    const c = {
      low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-600',
      high: 'bg-amber-100 text-amber-600', urgent: 'bg-red-100 text-red-700',
      emergency: 'bg-red-200 text-red-800 animate-pulse',
    }
    return c[priority] || ''
  }

  const getPriorityIcon = (priority) => {
    const i = { emergency: '🔴', urgent: '🟠', high: '🟡', medium: '🔵', low: '⚪' }
    return i[priority] || '⚪'
  }

  const formatDate = (date) => date
    ? new Date(date).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : ''

  const myJobCount = jobs.filter(j => j.isMyJob && j.status !== 'completed' && j.status !== 'cancelled').length
  const inProgressCount = jobs.filter(j => j.status === 'in_progress').length
  const unassignedCount = jobs
    .filter(j => j.status !== 'completed' && j.status !== 'cancelled')
    .filter(j => (j.field_job_assignments?.filter(a => a.assignment_status !== 'released').length || 0) === 0).length
  const highPriorityCount = jobs
    .filter(j => j.status !== 'completed' && j.status !== 'cancelled')
    .filter(j => ['urgent', 'emergency', 'high'].includes(j.priority)).length
  const openJobsCount = jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled').length

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-3 py-2 rounded-full flex items-center gap-2 text-xs">
          {isOnline ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-red-500" />}
          <span className="text-slate-500 hidden sm:inline">
            {isOnline ? 'Live' : 'Offline'} • {lastSync.toLocaleTimeString()}
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
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Ops</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Live Jobs</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Radio className="w-8 h-8 text-emerald-600" />Live Jobs
            </h1>
            <p className="text-slate-500 mt-1">
              {openJobsCount} open • {myJobCount} my jobs • {inProgressCount} in progress
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/fieldops/photos')} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2">
              <Camera className="w-5 h-5" /><span>All Photos</span>
            </button>
            <button onClick={handleManualRefresh} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" /><span>Refresh</span>
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'All Open', value: openJobsCount, active: filterView === 'all', onClick: () => setFilterView('all'), color: 'bg-blue-500' },
            { label: 'My Jobs', value: myJobCount, active: filterView === 'mine', onClick: () => setFilterView('mine'), color: 'bg-emerald-500' },
            { label: 'Unassigned', value: unassignedCount, active: filterView === 'unassigned', onClick: () => setFilterView('unassigned'), color: 'bg-amber-500' },
            { label: 'In Progress', value: inProgressCount, active: filterView === 'in_progress', onClick: () => setFilterView('in_progress'), color: 'bg-purple-500' },
            { label: 'High Priority', value: highPriorityCount, onClick: () => setSortBy('priority'), color: 'bg-red-500' },
          ].map(stat => (
            <button key={stat.label} onClick={stat.onClick}
              className={`neu-raised rounded-xl p-3 text-center transition-all hover:scale-105 ${stat.active ? 'ring-2 ring-emerald-500' : ''}`}>
              <div className={`w-3 h-3 rounded-full ${stat.color} mx-auto mb-1`}></div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </button>
          ))}
        </motion.div>

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

        {!dataLoaded ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading live jobs...</p>
          </div>
        ) : sortedJobs.length === 0 ? (
          <div className="text-center py-12 neu-raised rounded-3xl">
            <Radio className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No live jobs found</p>
            <p className="text-slate-400 text-sm mt-1">Completed jobs are automatically removed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedJobs.map((job) => {
              const activeAssignments = (job.field_job_assignments || []).filter(a => a.assignment_status !== 'released' && a.assignment_status !== 'completed')
              const photos = jobPhotos[job.id] || []
              
              return (
                <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} layout
                  className={`neu-raised rounded-2xl p-5 transition-all ${
                    job.isMyJob ? 'border-l-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/5' : ''
                  } ${job.status === 'in_progress' ? 'border-r-4 border-amber-500' : ''}`}>
                  
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-xl mt-1">{getPriorityIcon(job.priority)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 dark:text-white text-lg">{job.job_number}</span>
                          <span className={`px-2 py-0
