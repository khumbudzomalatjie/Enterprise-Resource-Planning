import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Briefcase, MapPin, Clock, Calendar, Search,
  Users, CheckCircle2, AlertCircle, ArrowLeft,
  Sun, Moon, Sparkles, RefreshCw
} from 'lucide-react'

export default function LiveJobs() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [allJobs, setAllJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadAllJobs()
  }, [statusFilter])

  const loadAllJobs = async () => {
    setLoading(true)
    
    try {
      let query = supabase
        .from('jobs')
        .select('id, title, job_number, status, scheduled_date, scheduled_start_time, scheduled_end_time, site_address, notes, actual_end_time, clients(company_name, phone), job_categories(name, color)')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_start_time', { ascending: true })

      if (statusFilter === 'open') {
        query = query.in('status', ['pending', 'scheduled'])
      } else if (statusFilter === 'active') {
        query = query.eq('status', 'in_progress')
      } else if (statusFilter === 'completed') {
        query = query.eq('status', 'completed')
      } else if (statusFilter === 'held') {
        query = query.eq('status', 'on_hold')
      } else {
        query = query.not('status', 'eq', 'cancelled')
      }

      const { data: jobs } = await query
      setAllJobs(jobs || [])
      
    } catch (error) {
      console.error('Error loading jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  // Extract cleaner name from job notes
  const getCleanerName = (job) => {
    if (!job?.notes) return null
    
    // Check for "SELECTED BY:" pattern (active jobs)
    if (job.notes.includes('SELECTED BY:')) {
      const name = job.notes.split('SELECTED BY:')[1]?.split('at')[0]?.trim()
      if (name && name !== 'undefined') return name
    }
    
    // Check for "COMPLETED BY:" pattern
    if (job.notes.includes('COMPLETED BY:')) {
      const name = job.notes.split('COMPLETED BY:')[1]?.split('at')[0]?.trim()
      if (name && name !== 'undefined') return name
    }
    
    // Check for "PAUSED BY CLEANER:" pattern
    if (job.notes.includes('PAUSED BY CLEANER:')) {
      const name = job.notes.split('PAUSED BY CLEANER:')[1]?.split('\n')[0]?.trim()
      if (name && name !== 'undefined') return name
    }
    
    // Generic name match
    const nameMatch = job.notes.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+at\s+/)
    if (nameMatch && nameMatch[1] && nameMatch[1] !== 'undefined') {
      return nameMatch[1]
    }
    
    return null
  }

  // Get status label for cleaner column
  const getCleanerStatus = (job) => {
    const name = getCleanerName(job)
    if (name) return { name, hasCleaner: true }
    
    if (job.status === 'pending' || job.status === 'scheduled') {
      return { name: 'Available', hasCleaner: false }
    }
    if (job.status === 'completed') {
      return { name: 'Completed', hasCleaner: false }
    }
    return { name: 'Unassigned', hasCleaner: false }
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const formatDateTime = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const todayStr = new Date().toISOString().split('T')[0]

  const filteredJobs = allJobs.filter(job => {
    if (!search) return true
    const s = search.toLowerCase()
    const cleanerName = getCleanerName(job) || ''
    return (job.title || '').toLowerCase().includes(s) ||
           (job.job_number || '').toLowerCase().includes(s) ||
           (job.clients?.company_name || '').toLowerCase().includes(s) ||
           (job.site_address || '').toLowerCase().includes(s) ||
           cleanerName.toLowerCase().includes(s)
  })

  const openCount = allJobs.filter(j => j.status === 'pending' || j.status === 'scheduled').length
  const activeCount = allJobs.filter(j => j.status === 'in_progress').length
  const completedCount = allJobs.filter(j => j.status === 'completed').length
  const heldCount = allJobs.filter(j => j.status === 'on_hold').length
  const jobsWithCleaner = allJobs.filter(j => getCleanerName(j)).length

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      on_hold: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }
    return badges[status] || 'bg-slate-100 text-slate-700'
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Live Jobs Monitor</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">
              Real-time sync with mobile · {allJobs.length} total jobs · {jobsWithCleaner} with cleaner assigned
            </p>
          </div>
          <button onClick={loadAllJobs} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Briefcase, label: 'Open Pool', value: openCount, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', desc: 'Available for selection' },
            { icon: Users, label: 'Active/Selected', value: activeCount, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', desc: 'Being worked on' },
            { icon: CheckCircle2, label: 'Completed', value: completedCount, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', desc: 'Finished jobs' },
            { icon: AlertCircle, label: 'On Hold', value: heldCount, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', desc: 'Paused jobs' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => {
                if (s.label === 'Open Pool') setStatusFilter('open')
                else if (s.label === 'Active/Selected') setStatusFilter('active')
                else if (s.label === 'Completed') setStatusFilter('completed')
                else if (s.label === 'On Hold') setStatusFilter('held')
              }}
              className="neu-raised rounded-2xl p-4 stat-card cursor-pointer hover:scale-[1.02] transition-transform">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by job #, title, client, cleaner name, address..."
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300">
            <option value="all">All Status</option>
            <option value="open">Open Pool</option>
            <option value="active">Active/Selected</option>
            <option value="completed">Completed</option>
            <option value="held">On Hold</option>
          </select>
          <button onClick={() => { setStatusFilter('all'); setSearch(''); loadAllJobs() }}
            className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm">
            Clear
          </button>
        </div>

        {/* Jobs Table */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div><p className="text-slate-500">Loading jobs...</p></div>
        ) : (
          <div className="neu-raised rounded-3xl overflow-hidden">
            {filteredJobs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Job #</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Title / Category</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Client</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Cleaner</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Location</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Date</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Time</th>
                      <th className="text-center py-3 px-3 text-slate-500 font-medium">Status</th>
                      <th className="text-center py-3 px-3 text-slate-500 font-medium">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job, i) => {
                      const cleanerInfo = getCleanerStatus(job)
                      const isToday = job.scheduled_date === todayStr
                      const isActive = job.status === 'in_progress'
                      const isCompleted = job.status === 'completed'
                      
                      return (
                        <tr key={job.id} className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${
                          isActive ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''
                        } ${isCompleted ? 'bg-emerald-50/20 dark:bg-emerald-900/5' : ''}`}>
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs font-medium text-slate-600 dark:text-slate-400">{job.job_number}</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0"></span>}
                              <div>
                                <p className="font-medium text-slate-800 dark:text-white">{job.title}</p>
                                {job.job_categories?.name && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{backgroundColor: job.job_categories.color + '20', color: job.job_categories.color}}>
                                    {job.job_categories.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-sm text-slate-600 dark:text-slate-400">
                            {job.clients?.company_name || 'N/A'}
                            {job.clients?.phone && (
                              <a href={`tel:${job.clients.phone}`} className="block text-[10px] text-blue-500 hover:underline mt-0.5">📞 Call</a>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {cleanerInfo.hasCleaner ? (
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                  isActive ? 'bg-amber-100 dark:bg-amber-900/30' : 
                                  isCompleted ? 'bg-emerald-100 dark:bg-emerald-900/30' : 
                                  'bg-blue-100 dark:bg-blue-900/30'
                                }`}>
                                  <Users className={`w-3.5 h-3.5 ${
                                    isActive ? 'text-amber-600' : 
                                    isCompleted ? 'text-emerald-600' : 
                                    'text-blue-600'
                                  }`} />
                                </div>
                                <div>
                                  <span className={`text-sm font-medium ${
                                    isActive ? 'text-amber-700 dark:text-amber-400' : 
                                    isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 
                                    'text-blue-700 dark:text-blue-400'
                                  }`}>
                                    {cleanerInfo.name}
                                  </span>
                                  {isCompleted && (
                                    <span className="block text-[9px] text-emerald-500">Completed job</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className={`text-xs italic ${
                                cleanerInfo.name === 'Available' ? 'text-blue-400' : 
                                cleanerInfo.name === 'Completed' ? 'text-emerald-400' : 
                                'text-slate-400'
                              }`}>
                                {cleanerInfo.name}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-500">
                            <div className="flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" />{job.site_address?.slice(0, 30) || 'N/A'}</div>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span className={isToday ? 'text-emerald-600 font-medium' : ''}>
                                {isToday ? 'Today' : formatDate(job.scheduled_date)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {job.scheduled_start_time?.slice(0,5) || '--'} - {job.scheduled_end_time?.slice(0,5) || '--'}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${getStatusBadge(job.status)}`}>
                              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block mr-1 animate-pulse"></span>}
                              {(job.status || 'pending').replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isCompleted && job.actual_end_time ? (
                              <span className="text-[10px] text-emerald-600 font-medium">
                                {formatDateTime(job.actual_end_time)}
                              </span>
                            ) : isCompleted ? (
                              <span className="text-[10px] text-emerald-500">Done</span>
                            ) : (
                              <span className="text-[10px] text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <Briefcase className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 text-lg mb-2">No jobs found</p>
                <p className="text-slate-400 text-sm">
                  {search || statusFilter !== 'all' ? 'Try adjusting your search or filters' : 'No jobs match the current criteria'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 neu-raised rounded-2xl p-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-slate-600 dark:text-slate-400">Open Pool (Available)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-slate-600 dark:text-slate-400">Active (In Progress)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-400">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
            <span className="text-slate-600 dark:text-slate-400">On Hold</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-amber-600" />
            <span className="text-slate-600 dark:text-slate-400">Cleaner Name Shown</span>
          </div>
        </div>
      </main>
    </div>
  )
}
