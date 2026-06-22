import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useAuthStore from '../../../store/authStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Briefcase, Search, RefreshCw, Clock, MapPin, 
  Users, Circle, ChevronRight,
  Sparkles, Sun, Moon, Play, CheckCircle2, AlertTriangle,
  Phone, Mail, Building2, Eye, Calendar
} from 'lucide-react'

export default function LiveJobs() {
  const { user, profile } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [debugInfo, setDebugInfo] = useState('')

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    setLoading(true)
    setDebugInfo('Loading...')
    
    try {
      // Simplest possible query
      const { data, error } = await supabase
        .from('jobs')
        .select('*')

      console.log('📊 Jobs query result:', { 
        count: data?.length || 0, 
        error: error?.message || 'none',
        errorCode: error?.code,
        firstItem: data?.[0] || 'none'
      })

      if (error) {
        setDebugInfo(`Error: ${error.message} (Code: ${error.code})`)
        console.error('❌ Jobs error:', error)
        setJobs([])
        toast.error('Failed to load jobs: ' + error.message)
      } else if (!data || data.length === 0) {
        setDebugInfo('No jobs found in database. Run the SQL to add test jobs.')
        console.warn('⚠️ No jobs found')
        setJobs([])
      } else {
        setDebugInfo(`Loaded ${data.length} jobs successfully`)
        console.log(`✅ Loaded ${data.length} jobs`)
        setJobs(data)
      }
    } catch (e) {
      setDebugInfo(`Exception: ${e.message}`)
      console.error('❌ Exception:', e)
      setJobs([])
    }
    
    setLoading(false)
  }

  const refreshJobs = async () => {
    setRefreshing(true)
    await loadJobs()
    setRefreshing(false)
    toast.success('Jobs refreshed')
  }

  const updateJobStatus = async (jobId, newStatus) => {
    const updates = { status: newStatus, updated_at: new Date().toISOString() }
    if (newStatus === 'in_progress') updates.actual_start_time = new Date().toISOString()
    if (newStatus === 'completed') updates.actual_end_time = new Date().toISOString()
    
    const { error } = await supabase.from('jobs').update(updates).eq('id', jobId)
    if (error) toast.error('Failed to update')
    else { toast.success(`Job ${newStatus.replace('_', ' ')}`); loadJobs() }
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = !searchTerm || 
        (job.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.job_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.site_address || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || job.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [jobs, searchTerm, statusFilter, priorityFilter])

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return {
      total: jobs.length,
      inProgress: jobs.filter(j => j.status === 'in_progress').length,
      pending: jobs.filter(j => j.status === 'pending' || j.status === 'scheduled').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      overdue: jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled' && j.scheduled_date < today).length,
    }
  }, [jobs])

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-slate-100 text-slate-700', scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700', overdue: 'bg-red-100 text-red-700',
      on_hold: 'bg-purple-100 text-purple-700',
    }
    return colors[status] || 'bg-slate-100 text-slate-700'
  }

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : 'N/A'

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <button onClick={refreshJobs} disabled={refreshing} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          <RefreshCw className={`w-5 h-5 text-slate-600 dark:text-slate-300 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold hidden sm:inline">Field Ops</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Operations</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="font-medium">Live Jobs</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3"><Briefcase className="w-8 h-8 text-emerald-600" />Live Jobs</h1>
          <p className="text-slate-500 mt-1">Real-time job monitoring</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-100' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-amber-600', bg: 'bg-amber-100' },
            { label: 'Pending', value: stats.pending, color: 'text-purple-600', bg: 'bg-purple-100' },
            { label: 'Completed', value: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-100' },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-600', bg: 'bg-red-100' },
          ].map((s, i) => (
            <div key={i} className="neu-raised rounded-xl p-3 flex items-center gap-3 cursor-pointer"
              onClick={() => setStatusFilter(s.label === 'In Progress' ? 'in_progress' : s.label === 'Pending' ? 'pending' : s.label === 'Completed' ? 'completed' : 'all')}>
              <div className={`w-10 h-10 rounded-lg ${s.bg} dark:bg-opacity-30 flex items-center justify-center`}>
                <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
              </div>
              <div><p className="text-xs text-slate-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search jobs..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-sm">
            <option value="all">All Status</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-sm">
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Debug Info */}
        {debugInfo && (
          <div className="mb-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-400">
            🔍 {debugInfo}
          </div>
        )}

        {/* Jobs List */}
        {loading ? (
          <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" /></div>
        ) : filteredJobs.length > 0 ? (
          <div className="space-y-3">
            {filteredJobs.map((job) => {
              const isOverdue = job.status !== 'completed' && job.status !== 'cancelled' && job.scheduled_date < new Date().toISOString().split('T')[0]
              return (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`neu-raised rounded-2xl p-5 cursor-pointer ${isOverdue && job.status !== 'in_progress' ? 'border-l-4 border-l-red-500' : job.status === 'in_progress' ? 'border-l-4 border-l-amber-500' : ''}`}
                  onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{job.title || 'Untitled Job'}</h3>
                      <p className="text-sm text-slate-500">{job.job_number || 'No #'} • {formatDate(job.scheduled_date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(isOverdue && job.status !== 'in_progress' ? 'overdue' : job.status)}`}>
                        {isOverdue && job.status !== 'in_progress' ? 'overdue' : (job.status || 'unknown')?.replace('_', ' ')}
                      </span>
                      {job.priority && <span className="text-xs capitalize">{job.priority}</span>}
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-500">
                    {job.site_address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.site_address}</span>}
                    {job.cleaners_required && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{job.cleaners_required} cleaners</span>}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    {job.status === 'scheduled' || job.status === 'pending' ? (
                      <button onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, 'in_progress') }}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs flex items-center gap-1"><Play className="w-3 h-3" />Start</button>
                    ) : job.status === 'in_progress' ? (
                      <button onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, 'completed') }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Complete</button>
                    ) : null}
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/operations/jobs/${job.id}`) }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs flex items-center gap-1"><Eye className="w-3 h-3" />View</button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20 neu-raised rounded-3xl">
            <Briefcase className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No jobs found</p>
            <p className="text-slate-400 text-sm mt-1">Run the SQL in Supabase to create test jobs</p>
            <button onClick={refreshJobs} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm flex items-center gap-2 mx-auto">
              <RefreshCw className="w-4 h-4" />Refresh
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
