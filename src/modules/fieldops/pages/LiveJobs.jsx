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
  Radio, Search, Users, UserPlus, UserX, MapPin, 
  Clock, Play, CheckCircle2, XCircle, ChevronRight,
  Sun, Moon, Sparkles, Building2, Calendar, Eye, 
  Wifi, WifiOff, RefreshCw, Camera, Download, X,
  Image as ImageIcon
} from 'lucide-react'

export default function LiveJobs() {
  const { 
    liveJobs, myAssignedJobs, fetchLiveJobs, fetchMyAssignedJobs,
    assignEmployee, releaseEmployee, updateJobStatus, loading 
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
  const [loadingPhotos, setLoadingPhotos] = useState({})
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

  // ✅ Load photos for a job
  const loadJobPhotos = async (jobId, force = false) => {
    if (!force && jobPhotos[jobId]) return
    setLoadingPhotos(prev => ({ ...prev, [jobId]: true }))
    try {
      const { data, error } = await supabase
        .from('job_photos')
        .select('*, employees(first_name, last_name, employee_code)')
        .eq('job_id', jobId)
        .order('taken_at', { ascending: false })

      if (error) throw error
      setJobPhotos(prev => ({ ...prev, [jobId]: data || [] }))
    } catch (err) {
      console.error('Load photos error:', err)
      setJobPhotos(prev => ({ ...prev, [jobId]: [] }))
    } finally {
      setLoadingPhotos(prev => ({ ...prev, [jobId]: false }))
    }
  }

  // Auto-load photos for first 10 jobs
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

  const filteredJobs = jobs.filter(job => {
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
    if (!window.confirm(`Are you sure you want to release ${employeeName} from ${jobNumber}?`)) return
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

  const myJobCount = jobs.filter(j => j.isMyJob).length
  const inProgressCount = jobs.filter(j => j.status === 'in_progress').length
  const unassignedCount = jobs.filter(j => (j.field_job_assignments?.filter(a => a.assignment_status !== 'released').length || 0) === 0).length
  const highPriorityCount = jobs.filter(j => ['urgent', 'emergency', 'high'].includes(j.priority)).length

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
              {jobs.length} total • {myJobCount} my jobs • {inProgressCount} in progress
              {!dataLoaded && <span className="ml-2 text-amber-500">(Loading...)</span>}
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
            { label: 'All Open', value: jobs.length, active: filterView === 'all', onClick: () => setFilterView('all'), color: 'bg-blue-500' },
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
            <button onClick={() => { setFilterView('all'); setSearch('') }} className="mt-4 neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm">
              Reset Filters
            </button>
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
                      <span className="text-xl mt-1" title={job.priority}>{getPriorityIcon(job.priority)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 dark:text-white text-lg">{job.job_number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(job.status)}`}>{job.status?.replace('_', ' ')}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(job.priority)}`}>{job.priority}</span>
                          {job.isMyJob && <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">🔒 My Job</span>}
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mt-1">{job.title}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">
                          {job.clients && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{job.clients.company_name}</span>}
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.site_city || 'N/A'}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(job.scheduled_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{job.scheduled_start_time?.slice(0, 5) || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(job.status === 'scheduled' || job.status === 'pending') && (
                        <button onClick={() => handleStartJob(job.id)} className="p-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200" title="Start Job">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {job.status === 'in_progress' && (
                        <button onClick={() => handleCompleteJob(job.id)} className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200" title="Complete Job">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => { setSelectedJob(job); setShowAssignModal(true) }} 
                        className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors" 
                        title="Assign Staff">
                        <UserPlus className="w-4 h-4" />
                      </button>
                      
                      {/* Photo button */}
                      <button 
                        onClick={() => { loadJobPhotos(job.id, true); setShowPhotoGallery(job) }}
                        className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 relative"
                        title="View Photos">
                        <Camera className="w-4 h-4" />
                        {photos.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {photos.length}
                          </span>
                        )}
                      </button>
                      
                      <button onClick={() => setShowJobDetail(showJobDetail === job.id ? null : job.id)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400" title="Details">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Assigned Staff */}
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Staff ({activeAssignments.length}/{job.cleaners_required || 1})
                      </h4>
                      {activeAssignments.length >= (job.cleaners_required || 1) && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Fully Staffed</span>
                      )}
                    </div>
                    
                    {activeAssignments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {activeAssignments.map(a => (
                          <div key={a.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${a.employees?.user_id === user?.id ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                            <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs font-bold">
                              {a.employees?.first_name?.[0] || '?'}{a.employees?.last_name?.[0] || '?'}
                            </div>
                            <span className="font-medium">{a.employees?.first_name || 'Unknown'} {a.employees?.last_name || ''}</span>
                            <span className="text-xs opacity-75">({a.assignment_status})</span>
                            <button 
                              onClick={() => handleRelease(a.id, `${a.employees?.first_name || 'Unknown'} ${a.employees?.last_name || ''}`, job.job_number)}
                              className="ml-1 p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                              title="Release Employee">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No staff assigned - Click the blue <UserPlus className="w-3 h-3 inline" /> button to assign</p>
                    )}
                  </div>

                  {/* Photo preview strip */}
                  {photos.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-slate-500 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          Photos ({photos.length})
                        </h4>
                        <button onClick={() => setShowPhotoGallery(job)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                          View All →
                        </button>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {photos.slice(0, 6).map(photo => (
                          <div 
                            key={photo.id} 
                            onClick={() => setSelectedPhoto(photo)}
                            className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer group">
                            <img src={photo.photo_url} alt="Photo" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                            <span className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-white ${
                              photo.photo_type === 'before' ? 'bg-blue-500' :
                              photo.photo_type === 'after' ? 'bg-emerald-500' :
                              photo.photo_type === 'incident' ? 'bg-red-500' : 'bg-slate-500'
                            }`}>
                              {photo.photo_type}
                            </span>
                          </div>
                        ))}
                        {photos.length > 6 && (
                          <button 
                            onClick={() => setShowPhotoGallery(job)}
                            className="flex-shrink-0 w-20 h-20 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold hover:bg-slate-200">
                            +{photos.length - 6}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {showJobDetail === job.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><p className="text-xs text-slate-500">Cleaners</p><p className="font-medium">{job.cleaners_required}</p></div>
                          <div><p className="text-xs text-slate-500">Duration</p><p className="font-medium">{job.estimated_duration_minutes || 'N/A'} min</p></div>
                          <div><p className="text-xs text-slate-500">Amount</p><p className="font-medium text-emerald-600">{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(job.quoted_amount || 0)}</p></div>
                          <div><p className="text-xs text-slate-500">Contact</p><p className="font-medium">{job.site_contact_name || 'N/A'}</p></div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}
      </main>

      {/* Assign Modal */}
      <AnimatePresence>
        {showAssignModal && selectedJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowAssignModal(false); setSelectedEmployee('') }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="neu-raised rounded-3xl p-6 max-w-md w-full bg-white dark:bg-slate-800" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Assign Staff</h3>
              <p className="text-sm text-slate-500 mb-4">Job: <span className="font-medium">{selectedJob.job_number}</span> - {selectedJob.title}</p>
              
              <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full p-3 neu-inset rounded-xl mb-4 text-slate-700 dark:text-slate-300">
                <option value="">Select Employee to Assign</option>
                {availableEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.employee_code})</option>
                ))}
              </select>

              <div className="flex gap-2">
                <button onClick={() => { setShowAssignModal(false); setSelectedEmployee('') }} className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-slate-600 text-white">Cancel</button>
                <button onClick={handleAssign} disabled={!selectedEmployee} className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-emerald-600 text-white disabled:opacity-50">Assign</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Gallery Modal */}
      <AnimatePresence>
        {showPhotoGallery && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPhotoGallery(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}>
              
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Camera className="w-5 h-5 text-indigo-600" />
                    Photos - {showPhotoGallery.job_number}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{showPhotoGallery.title}</p>
                </div>
                <button onClick={() => setShowPhotoGallery(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {(jobPhotos[showPhotoGallery.id] || []).length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(jobPhotos[showPhotoGallery.id] || []).map(photo => (
                      <div key={photo.id} onClick={() => setSelectedPhoto(photo)}
                        className="relative rounded-xl overflow-hidden cursor-pointer group">
                        <img src={photo.photo_url} alt="Photo" className="w-full h-40 object-cover group-hover:scale-105 transition-transform" />
                        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize text-white ${
                          photo.photo_type === 'before' ? 'bg-blue-500' :
                          photo.photo_type === 'after' ? 'bg-emerald-500' :
                          photo.photo_type === 'incident' ? 'bg-red-500' : 'bg-slate-500'
                        }`}>
                          {photo.photo_type}
                        </span>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="text-white text-[10px] font-medium truncate">
                            {photo.employees?.first_name} {photo.employees?.last_name}
                          </p>
                          <p className="text-white/60 text-[9px]">{formatDate(photo.taken_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Camera className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No photos for this job yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Photo Viewer */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="max-w-4xl w-full" onClick={e => e
