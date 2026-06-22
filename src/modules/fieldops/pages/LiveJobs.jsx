import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useAuthStore from '../../../store/authStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Briefcase, Search, Filter, RefreshCw, Clock, MapPin, 
  Users, Circle, ArrowLeft, ChevronRight,
  Sparkles, Sun, Moon, Play, CheckCircle2, AlertTriangle,
  Phone, Mail, Building2, Truck, Wrench, Trash2,
  Eye, MessageSquare, Calendar, BarChart3
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
  const [stats, setStats] = useState({
    total: 0, inProgress: 0, pending: 0, completed: 0, overdue: 0
  })

  useEffect(() => {
    loadJobs()
    
    // Subscribe to real-time changes
    const channel = supabase
      .channel('live-jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, 
        () => { loadJobs() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadJobs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          clients:client_id(company_name, phone, email),
          job_categories:job_category_id(name, color),
          teams:assigned_team_id(team_name),
          supervisor:assigned_supervisor(full_name, email, phone),
          assignments:job_assignments(
            id, status,
            employees:employee_id(first_name, last_name, phone, profile_photo_url)
          )
        `)
        .order('scheduled_date', { ascending: true })
        .order('priority', { ascending: false })

      if (error) {
        console.error('Jobs error:', error.message)
        setJobs([])
      } else {
        const jobsData = data || []
        setJobs(jobsData)
        
        // Calculate stats
        const now = new Date().toISOString().split('T')[0]
        setStats({
          total: jobsData.length,
          inProgress: jobsData.filter(j => j.status === 'in_progress').length,
          pending: jobsData.filter(j => j.status === 'pending' || j.status === 'scheduled').length,
          completed: jobsData.filter(j => j.status === 'completed').length,
          overdue: jobsData.filter(j => j.status !== 'completed' && j.status !== 'cancelled' && j.scheduled_date < now).length,
        })
      }
    } catch (e) {
      console.error('Load jobs error:', e)
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
    const updates = { 
      status: newStatus, 
      updated_at: new Date().toISOString() 
    }
    if (newStatus === 'in_progress') {
      updates.actual_start_time = new Date().toISOString()
    }
    if (newStatus === 'completed') {
      updates.actual_end_time = new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)

    if (error) {
      toast.error('Failed to update job')
    } else {
      toast.success(`Job ${newStatus.replace('_', ' ')}`)
      loadJobs()
    }
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = !searchTerm || 
        job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.clients?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.site_address?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || job.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || job.priority === priorityFilter
      
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [jobs, searchTerm, statusFilter, priorityFilter])

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      on_hold: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    }
    return colors[status] || 'bg-slate-100 text-slate-700'
  }

  const getPriorityBadge = (priority) => {
    const badges = {
      low: 'text-slate-500',
      medium: 'text-blue-600',
      high: 'text-amber-600',
      urgent: 'text-red-600 font-bold',
      emergency: 'text-red-600 font-bold animate-pulse',
    }
    return badges[priority] || 'text-slate-500'
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatTime = (time) => {
    if (!time) return ''
    return time?.toString().slice(0, 5)
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <button onClick={refreshJobs} disabled={refreshing} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          <RefreshCw className={`w-5 h-5 text-slate-600 dark:text-slate-300 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">Field Ops</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">Field Operations</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Live Jobs</span>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                <Briefcase className="w-8 h-8 text-emerald-600" />Live Jobs Tracking
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time monitoring of all active jobs in the field</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" /> Auto-updating
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { icon: Briefcase, label: 'Total Jobs', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
            { icon: Play, label: 'In Progress', value: stats.inProgress, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
            { icon: Clock, label: 'Pending', value: stats.pending, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
            { icon: CheckCircle2, label: 'Completed', value: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { icon: AlertTriangle, label: 'Overdue', value: stats.overdue, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
          ].map((s, i) => (
            <div key={i} className="neu-raised rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => { 
                if (s.label === 'In Progress') setStatusFilter('in_progress')
                else if (s.label === 'Pending') setStatusFilter('pending')
                else if (s.label === 'Completed') setStatusFilter('completed')
                else if (s.label === 'Overdue') setStatusFilter('overdue')
                else setStatusFilter('all')
              }}>
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by job title, number, client, address..." 
                className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="on_hold">On Hold</option>
            </select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300">
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job, index) => {
              const isOverdue = job.status !== 'completed' && job.status !== 'cancelled' && job.scheduled_date < new Date().toISOString().split('T')[0]
              
              return (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}
                  className={`neu-raised rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer ${isOverdue && job.status !== 'in_progress' ? 'border-l-4 border-l-red-500' : job.status === 'in_progress' ? 'border-l-4 border-l-amber-500' : ''}`}
                  onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}>
                  
                  {/* Job Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
                        style={{ backgroundColor: job.job_categories?.color ? `${job.job_categories.color}20` : undefined }}>
                        <Briefcase className="w-5 h-5" style={{ color: job.job_categories?.color || '#10b981' }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800 dark:text-white">{job.title}</h3>
                          <span className="text-xs text-slate-400">{job.job_number}</span>
                        </div>
                        <p className="text-sm text-slate-500">{job.clients?.company_name || 'No Client'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(isOverdue && job.status !== 'in_progress' ? 'overdue' : job.status)}`}>
                        {isOverdue && job.status !== 'in_progress' ? 'overdue' : job.status?.replace('_', ' ')}
                      </span>
                      <span className={`text-xs font-medium capitalize ${getPriorityBadge(job.priority)}`}>
                        {job.priority}
                      </span>
                    </div>
                  </div>

                  {/* Job Details Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(job.scheduled_date)}</span>
                      {job.scheduled_start_time && <span className="text-xs">{formatTime(job.scheduled_start_time)}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{job.site_address || job.site_city || 'No location'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Users className="w-4 h-4" />
                      <span>{job.assignments?.length || 0}/{job.cleaners_required || 1} assigned</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Building2 className="w-4 h-4" />
                      <span>{job.job_categories?.name || 'General'}</span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    {job.status === 'scheduled' || job.status === 'pending' ? (
                      <button onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, 'in_progress') }}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs hover:bg-amber-700 flex items-center gap-1">
                        <Play className="w-3.5 h-3.5" />Start Job
                      </button>
                    ) : job.status === 'in_progress' ? (
                      <button onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, 'completed') }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs hover:bg-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />Complete
                      </button>
                    ) : null}
                    
                    {job.status !== 'cancelled' && job.status !== 'completed' && (
                      <button onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, 'on_hold') }}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs hover:bg-purple-700 flex items-center gap-1">
                        Hold
                      </button>
                    )}
                    
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/operations/jobs/${job.id}`) }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-200 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />View
                    </button>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {selectedJob?.id === job.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                        
                        {/* Assigned Staff */}
                        {job.assignments?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-slate-500 mb-2">Assigned Staff:</p>
                            <div className="flex flex-wrap gap-2">
                              {job.assignments.map(a => (
                                <div key={a.id} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-lg px-3 py-1.5 text-xs">
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <Users className="w-3 h-3 text-emerald-600" />
                                  </div>
                                  <span className="text-slate-700 dark:text-slate-300">
                                    {a.employees?.first_name} {a.employees?.last_name}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${a.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {a.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Contact & Location */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {job.site_contact_name && (
                            <div className="flex items-center gap-1 text-slate-500">
                              <Phone className="w-3 h-3" />{job.site_contact_name}: {job.site_contact_phone}
                            </div>
                          )}
                          {job.clients?.email && (
                            <div className="flex items-center gap-1 text-slate-500">
                              <Mail className="w-3 h-3" />{job.clients.email}
                            </div>
                          )}
                          {job.access_instructions && (
                            <div className="col-span-2 text-slate-500">
                              <strong>Access:</strong> {job.access_instructions}
                            </div>
                          )}
                          {job.special_instructions && (
                            <div className="col-span-2 text-slate-500">
                              <strong>Instructions:</strong> {job.special_instructions}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}

            {filteredJobs.length === 0 && (
              <div className="text-center py-20 neu-raised rounded-3xl">
                <Briefcase className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No jobs found</p>
                <p className="text-slate-400 text-sm mt-1">
                  {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'All jobs are completed!'}
                </p>
                <button onClick={refreshJobs} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm flex items-center gap-2 mx-auto">
                  <RefreshCw className="w-4 h-4" />Refresh
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
