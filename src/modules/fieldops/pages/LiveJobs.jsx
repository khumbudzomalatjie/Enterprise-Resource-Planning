import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Briefcase, Search, RefreshCw, MapPin, 
  Users, ChevronRight,
  Sparkles, Sun, Moon, Play, CheckCircle2, 
  Eye, Calendar, Clock, AlertTriangle
} from 'lucide-react'

export default function LiveJobs() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Load jobs immediately on mount
  useEffect(() => {
    console.log('🔄 LiveJobs mounted - loading jobs...')
    loadJobs()
  }, [])

  const loadJobs = async () => {
    setLoading(true)
    setErrorMsg('')
    console.log('🔍 Querying jobs table...')
    
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .limit(100)

      console.log('📊 Jobs result:', { 
        count: data?.length || 0, 
        error: error?.message || 'none',
        code: error?.code || 'none'
      })

      if (error) {
        console.error('❌ Jobs query error:', error)
        setErrorMsg(`Error: ${error.message} (Code: ${error.code})`)
        setJobs([])
      } else if (!data || data.length === 0) {
        console.warn('⚠️ Jobs table is empty')
        setErrorMsg('No jobs in database. Run SQL to add test jobs.')
        setJobs([])
      } else {
        console.log(`✅ Loaded ${data.length} jobs`)
        setErrorMsg('')
        setJobs(data)
      }
    } catch (e) {
      console.error('❌ Exception:', e)
      setErrorMsg(`Exception: ${e.message}`)
      setJobs([])
    }
    
    setLoading(false)
  }

  const refreshJobs = async () => {
    setRefreshing(true)
    await loadJobs()
    setRefreshing(false)
    toast.success('Refreshed')
  }

  const updateJobStatus = async (jobId, newStatus) => {
    const { error } = await supabase
      .from('jobs')
      .update({ 
        status: newStatus, 
        updated_at: new Date().toISOString(),
        ...(newStatus === 'in_progress' ? { actual_start_time: new Date().toISOString() } : {}),
        ...(newStatus === 'completed' ? { actual_end_time: new Date().toISOString() } : {})
      })
      .eq('id', jobId)

    if (error) {
      toast.error('Failed to update')
    } else {
      toast.success(`Job ${newStatus.replace('_', ' ')}`)
      loadJobs()
    }
  }

  const filteredJobs = useMemo(() => {
    let result = jobs
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(j => 
        (j.title || '').toLowerCase().includes(term) ||
        (j.job_number || '').toLowerCase().includes(term) ||
        (j.site_address || '').toLowerCase().includes(term) ||
        (j.site_city || '').toLowerCase().includes(term)
      )
    }
    
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        const today = new Date().toISOString().split('T')[0]
        result = result.filter(j => 
          j.status !== 'completed' && 
          j.status !== 'cancelled' && 
          j.scheduled_date < today
        )
      } else {
        result = result.filter(j => j.status === statusFilter)
      }
    }
    
    return result
  }, [jobs, searchTerm, statusFilter])

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return {
      total: jobs.length,
      inProgress: jobs.filter(j => j.status === 'in_progress').length,
      pending: jobs.filter(j => j.status === 'pending' || j.status === 'scheduled').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      overdue: jobs.filter(j => 
        j.status !== 'completed' && 
        j.status !== 'cancelled' && 
        j.scheduled_date && 
        j.scheduled_date < today
      ).length,
    }
  }, [jobs])

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
      on_hold: 'bg-purple-100 text-purple-700',
      overdue: 'bg-red-100 text-red-700',
    }
    return badges[status] || 'bg-gray-100 text-gray-700'
  }

  const formatDate = (d) => {
    if (!d) return 'N/A'
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <button onClick={refreshJobs} disabled={refreshing} 
          className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
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
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Operations</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="font-medium">Live Jobs</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-emerald-600" />Live Jobs
          </h1>
          <button onClick={refreshJobs} disabled={refreshing}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-700 flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
            { label: 'Pending', value: stats.pending, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
            { label: 'Completed', value: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
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
                <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, job number, address..."
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300">
            <option value="all">All Status</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Error/Debug Message */}
        {errorMsg && (
          <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        )}

        {/* Jobs List */}
        {!loading && filteredJobs.length > 0 && (
          <div className="space-y-3">
            {filteredJobs.map((job) => {
              const isOverdue = job.status !== 'completed' && 
                               job.status !== 'cancelled' && 
                               job.scheduled_date && 
                               job.scheduled_date < new Date().toISOString().split('T')[0]
              const displayStatus = isOverdue && job.status !== 'in_progress' ? 'overdue' : job.status
              
              return (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`neu-raised rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-all ${
                    job.status === 'in_progress' ? 'border-l-4 border-l-amber-500' : 
                    isOverdue ? 'border-l-4 border-l-red-500' : ''
                  }`}
                  onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}>
                  
                  {/* Job Row */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 dark:text-white">
                        {job.title || 'Untitled Job'}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        <span>{job.job_number || 'No #'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{formatDate(job.scheduled_date)}
                        </span>
                        {job.site_address && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <MapPin className="w-3 h-3 flex-shrink-0" />{job.site_address}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(displayStatus)}`}>
                        {displayStatus?.replace(/_/g, ' ')}
                      </span>
                      {job.priority && (
                        <span className="text-xs capitalize text-slate-500">{job.priority}</span>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    {(job.status === 'scheduled' || job.status === 'pending') && (
                      <button onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, 'in_progress') }}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs hover:bg-amber-700 flex items-center gap-1">
                        <Play className="w-3 h-3" />Start Job
                      </button>
                    )}
                    {job.status === 'in_progress' && (
                      <button onClick={(e) => { e.stopPropagation(); updateJobStatus(job.id, 'completed') }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs hover:bg-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />Complete
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/operations/jobs/${job.id}`) }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-200 flex items-center gap-1">
                      <Eye className="w-3 h-3" />View Details
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {selectedJob?.id === job.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400">
                      <div className="grid grid-cols-2 gap-2">
                        <div><strong>Status:</strong> {job.status?.replace(/_/g, ' ')}</div>
                        <div><strong>Priority:</strong> {job.priority}</div>
                        {job.cleaners_required && <div><strong>Cleaners:</strong> {job.cleaners_required}</div>}
                        {job.estimated_duration_minutes && <div><strong>Duration:</strong> {job.estimated_duration_minutes} min</div>}
                        {job.site_city && <div><strong>City:</strong> {job.site_city}</div>}
                        {job.site_contact_name && <div><strong>Contact:</strong> {job.site_contact_name}</div>}
                        {job.description && <div className="col-span-2"><strong>Description:</strong> {job.description}</div>}
                        {job.special_instructions && <div className="col-span-2"><strong>Instructions:</strong> {job.special_instructions}</div>}
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredJobs.length === 0 && !errorMsg && (
          <div className="text-center py-20 neu-raised rounded-3xl">
            <Briefcase className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-lg">No jobs found</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
              {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'All jobs are completed!'}
            </p>
            <button onClick={refreshJobs} 
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm flex items-center gap-2 mx-auto hover:bg-emerald-700">
              <RefreshCw className="w-4 h-4" />Refresh
            </button>
          </div>
        )}

        {/* Empty with error */}
        {!loading && filteredJobs.length === 0 && errorMsg && (
          <div className="text-center py-20 neu-raised rounded-3xl">
            <Briefcase className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-lg">Could not load jobs</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">{errorMsg}</p>
            <button onClick={refreshJobs} 
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm flex items-center gap-2 mx-auto hover:bg-emerald-700">
              <RefreshCw className="w-4 h-4" />Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
