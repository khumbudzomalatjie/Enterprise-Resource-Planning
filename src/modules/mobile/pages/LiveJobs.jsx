import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Briefcase, Search, Filter, ArrowLeft, Sun, Moon, Sparkles,
  Clock, MapPin, User, CheckCircle2, Play, AlertCircle,
  Calendar, Eye, ChevronDown, ChevronUp, Building2, Phone,
  RefreshCw, Camera, Package
} from 'lucide-react'

export default function LiveJobs() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedJob, setExpandedJob] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadJobs()
    const interval = setInterval(loadJobs, 30000) // Auto-refresh every 30s
    return () => clearInterval(interval)
  }, [statusFilter])

  const loadJobs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          clients(company_name, phone),
          job_categories(name, color),
          job_assignments(
            id, status,
            employees(first_name, last_name, employee_code, phone)
          ),
          job_photos(id, photo_url, photo_type, taken_at),
          quality_inspections(id, overall_rating, status)
        `)
        .order('scheduled_date', { ascending: false })
        .order('scheduled_start_time', { ascending: true })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data } = await query
      setJobs(data || [])
    } catch (error) {
      console.error('Error loading jobs:', error)
      toast.error('Failed to load jobs')
    }
    setLoading(false)
    setRefreshing(false)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadJobs()
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const formatTime = (time) => {
    if (!time) return ''
    return time.slice(0, 5)
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-slate-100 text-slate-700 border-slate-300',
      scheduled: 'bg-blue-100 text-blue-700 border-blue-300',
      in_progress: 'bg-amber-100 text-amber-700 border-amber-300',
      completed: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      cancelled: 'bg-red-100 text-red-700 border-red-300',
      on_hold: 'bg-purple-100 text-purple-700 border-purple-300',
      overdue: 'bg-red-100 text-red-700 border-red-300',
    }
    return badges[status] || 'bg-slate-100 text-slate-700 border-slate-300'
  }

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      scheduled: Calendar,
      in_progress: Play,
      completed: CheckCircle2,
      cancelled: AlertCircle,
      on_hold: AlertCircle,
      overdue: AlertCircle,
    }
    return icons[status] || Clock
  }

  const getTimelineSteps = (job) => {
    const steps = []
    
    // Step 1: Created
    steps.push({
      label: 'Job Created',
      date: job.created_at,
      icon: Briefcase,
      color: 'bg-blue-500',
      completed: true
    })

    // Step 2: Scheduled (if scheduled_date exists)
    if (job.scheduled_date) {
      steps.push({
        label: 'Scheduled',
        date: job.scheduled_date,
        icon: Calendar,
        color: 'bg-blue-500',
        completed: true
      })
    }

    // Step 3: Assigned (if cleaners assigned)
    if (job.job_assignments?.length > 0) {
      steps.push({
        label: `Assigned (${job.job_assignments.length} cleaner${job.job_assignments.length > 1 ? 's' : ''})`,
        date: job.job_assignments[0]?.assigned_date || job.scheduled_date,
        icon: User,
        color: 'bg-purple-500',
        completed: true
      })
    }

    // Step 4: In Progress (if started)
    if (job.actual_start_time) {
      steps.push({
        label: 'In Progress',
        date: job.actual_start_time,
        icon: Play,
        color: 'bg-amber-500',
        completed: true
      })
    }

    // Step 5: Completed
    if (job.status === 'completed') {
      steps.push({
        label: 'Completed',
        date: job.actual_end_time,
        icon: CheckCircle2,
        color: 'bg-emerald-500',
        completed: true
      })
    } else if (job.status === 'cancelled') {
      steps.push({
        label: 'Cancelled',
        date: job.updated_at,
        icon: AlertCircle,
        color: 'bg-red-500',
        completed: true
      })
    }

    return steps
  }

  const filteredJobs = jobs.filter(job => {
    if (!search) return true
    const s = search.toLowerCase()
    return (job.title || '').toLowerCase().includes(s) ||
           (job.job_number || '').toLowerCase().includes(s) ||
           (job.clients?.company_name || '').toLowerCase().includes(s) ||
           (job.site_address || '').toLowerCase().includes(s)
  })

  // Stats
  const statsCounts = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    scheduled: jobs.filter(j => j.status === 'scheduled').length,
    inProgress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    cancelled: jobs.filter(j => j.status === 'cancelled').length,
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/mobile/field" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Field Operations</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-blue-600" />Job Tracker
            </h1>
            <p className="text-slate-500 mt-1">Track every job from creation to completion - who, when, and how</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
          {[
            { label: 'All', count: statsCounts.total, color: 'bg-slate-600' },
            { label: 'Pending', count: statsCounts.pending, color: 'bg-slate-500' },
            { label: 'Scheduled', count: statsCounts.scheduled, color: 'bg-blue-500' },
            { label: 'In Progress', count: statsCounts.inProgress, color: 'bg-amber-500' },
            { label: 'Completed', count: statsCounts.completed, color: 'bg-emerald-500' },
            { label: 'Cancelled', count: statsCounts.cancelled, color: 'bg-red-500' },
          ].map(s => (
            <button key={s.label}
              onClick={() => setStatusFilter(s.label === 'All' ? 'all' : s.label.toLowerCase().replace(' ', '_'))}
              className={`${s.color} text-white rounded-xl p-3 text-center text-sm font-medium hover:opacity-90 transition-opacity ${
                (s.label === 'All' && statusFilter === 'all') || statusFilter === s.label.toLowerCase().replace(' ', '_') ? 'ring-2 ring-offset-2 ring-blue-300' : ''
              }`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs opacity-90">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by job title, number, client, or address..."
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
          </div>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-slate-500 mt-4">Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 neu-raised rounded-3xl">
            <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No jobs found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map(job => {
              const StatusIcon = getStatusIcon(job.status)
              const isExpanded = expandedJob === job.id
              const timeline = getTimelineSteps(job)

              return (
                <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className={`neu-raised rounded-2xl overflow-hidden transition-all ${isExpanded ? 'ring-2 ring-blue-500' : ''}`}>
                  
                  {/* Job Header */}
                  <div className="p-5 cursor-pointer" onClick={() => setExpandedJob(isExpanded ? null : job.id)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          job.status === 'completed' ? 'bg-emerald-100' :
                          job.status === 'in_progress' ? 'bg-amber-100' :
                          job.status === 'cancelled' ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                          <StatusIcon className={`w-5 h-5 ${
                            job.status === 'completed' ? 'text-emerald-600' :
                            job.status === 'in_progress' ? 'text-amber-600' :
                            job.status === 'cancelled' ? 'text-red-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800 dark:text-white">{job.title}</h3>
                          <p className="text-xs text-slate-500">{job.job_number} · {job.clients?.company_name || 'No client'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(job.status)}`}>
                          {job.status?.replace('_', ' ')}
                        </span>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>

                    {/* Quick Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.site_address?.slice(0, 25)}</div>
                      <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(job.scheduled_date)}</div>
                      <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime(job.scheduled_start_time)} - {formatTime(job.scheduled_end_time)}</div>
                      <div className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{job.job_assignments?.length || 0} cleaner{job.job_assignments?.length !== 1 ? 's' : ''}</div>
                    </div>

                    {/* Category Badge */}
                    {job.job_categories && (
                      <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: job.job_categories.color + '20', color: job.job_categories.color }}>
                        {job.job_categories.name}
                      </span>
                    )}
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="border-t border-slate-200 dark:border-slate-600 p-5 bg-slate-50 dark:bg-slate-800/30 space-y-6">
                      
                      {/* Timeline */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">📋 Job Timeline</h4>
                        <div className="relative">
                          {timeline.map((step, i) => (
                            <div key={i} className="flex items-start gap-3 mb-4 relative">
                              {/* Line */}
                              {i < timeline.length - 1 && (
                                <div className="absolute left-4 top-8 w-0.5 h-full bg-slate-300 dark:bg-slate-600"></div>
                              )}
                              {/* Dot */}
                              <div className={`w-8 h-8 rounded-full ${step.color} flex items-center justify-center flex-shrink-0 z-10`}>
                                <step.icon className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-sm text-slate-800 dark:text-white">{step.label}</p>
                                <p className="text-xs text-slate-500">{formatDate(step.date)} {step.date && new Date(step.date).toLocaleTimeString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Assigned Cleaners */}
                      {job.job_assignments?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                            👥 Assigned Cleaners ({job.job_assignments.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {job.job_assignments.map(assign => (
                              <div key={assign.id} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-700 rounded-lg">
                                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                  <User className="w-4 h-4 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{assign.employees?.first_name} {assign.employees?.last_name}</p>
                                  <p className="text-xs text-slate-500">{assign.employees?.employee_code}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                  assign.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                  assign.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>{assign.status}</span>
                                {assign.employees?.phone && (
                                  <a href={`tel:${assign.employees.phone}`} className="p-1.5 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600">
                                    <Phone className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Photos */}
                      {job.job_photos?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                            📸 Job Photos ({job.job_photos.length})
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            {job.job_photos.map(photo => (
                              <div key={photo.id} className="relative rounded-lg overflow-hidden cursor-pointer"
                                onClick={() => window.open(photo.photo_url, '_blank')}>
                                <img src={photo.photo_url} alt={photo.photo_type} className="w-full h-24 object-cover" />
                                <span className={`absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                  photo.photo_type === 'before' ? 'bg-blue-500 text-white' :
                                  photo.photo_type === 'after' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                }`}>{photo.photo_type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quality Inspection */}
                      {job.quality_inspections?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            ✅ Quality Inspection
                          </h4>
                          {job.quality_inspections.map(insp => (
                            <div key={insp.id} className="flex items-center gap-3 p-2 bg-white dark:bg-slate-700 rounded-lg">
                              <div className="text-2xl">
                                {'⭐'.repeat(insp.overall_rating || 0)}
                              </div>
                              <span className="text-sm">{insp.overall_rating}/5</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${insp.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{insp.status}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Client Info */}
                      {job.clients && (
                        <div className="flex items-center gap-4 p-3 bg-white dark:bg-slate-700 rounded-lg">
                          <Building2 className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="font-medium text-sm">{job.clients.company_name}</p>
                            {job.clients.phone && (
                              <a href={`tel:${job.clients.phone}`} className="text-xs text-blue-600 hover:underline">{job.clients.phone}</a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Special Instructions */}
                      {job.special_instructions && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                          <p className="text-xs font-semibold text-amber-700 mb-1">📝 Special Instructions</p>
                          <p className="text-xs text-amber-600">{job.special_instructions}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
