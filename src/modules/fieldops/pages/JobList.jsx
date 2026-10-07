import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import {
  Briefcase, Search, ChevronRight,
  Sun, Moon, Sparkles, Calendar, Clock, MapPin,
  Loader2, Send, CheckSquare, Square, RefreshCw,
  FileText, Edit
} from 'lucide-react'

export default function JobList() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [releasing, setReleasing] = useState(null)

  useEffect(() => { loadJobs() }, [statusFilter])

  const loadJobs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('jobs')
        .select('*')
        .or('released_to_pool.is.null,released_to_pool.eq.false')
        .not('status', 'in', '(completed,cancelled)')
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .limit(300)

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      const { data: jobRows, error } = await query
      if (error) throw error
      if (!jobRows || jobRows.length === 0) {
        setJobs([])
        setLoading(false)
        return
      }

      const clientIds = [...new Set(jobRows.map(j => j.client_id).filter(Boolean))]
      const catIds = [...new Set(jobRows.map(j => j.job_category_id).filter(Boolean))]

      const [clientsRes, catsRes] = await Promise.all([
        clientIds.length > 0
          ? supabase.from('clients').select('id, company_name').in('id', clientIds)
          : Promise.resolve({ data: [] }),
        catIds.length > 0
          ? supabase.from('job_categories').select('id, name, color').in('id', catIds)
          : Promise.resolve({ data: [] })
      ])

      const clientsMap = {}
      ;(clientsRes.data || []).forEach(c => { clientsMap[c.id] = c })
      const catsMap = {}
      ;(catsRes.data || []).forEach(c => { catsMap[c.id] = c })

      setJobs(jobRows.map(j => ({
        ...j,
        clients: clientsMap[j.client_id] || null,
        job_categories: catsMap[j.job_category_id] || null
      })))
    } catch (err) {
      console.error('loadJobs error:', err)
      toast.error('Failed to load job list: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const releaseJob = async (jobId) => {
    setReleasing(jobId)
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ released_to_pool: true, updated_at: new Date().toISOString() })
        .eq('id', jobId)
      if (error) throw error
      setJobs(prev => prev.filter(j => j.id !== jobId))
      setSelectedIds(prev => prev.filter(id => id !== jobId))
      toast.success('Job released to pool ✅')
    } catch (err) {
      toast.error('Failed to release: ' + err.message)
    } finally {
      setReleasing(null)
    }
  }

  const bulkRelease = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Release ${selectedIds.length} job(s) to the pool?`)) return
    setReleasing('bulk')
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ released_to_pool: true, updated_at: new Date().toISOString() })
        .in('id', selectedIds)
      if (error) throw error
      setJobs(prev => prev.filter(j => !selectedIds.includes(j.id)))
      toast.success(`${selectedIds.length} job(s) released ✅`)
      setSelectedIds([])
    } catch (err) {
      toast.error('Bulk release failed: ' + err.message)
    } finally {
      setReleasing(null)
    }
  }

  const toggleSelection = (jobId) => {
    setSelectedIds(prev => prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId])
  }

  const filteredJobs = jobs.filter(j => {
    if (!search) return true
    const s = search.toLowerCase()
    return j.job_number?.toLowerCase().includes(s)
      || j.title?.toLowerCase().includes(s)
      || j.clients?.company_name?.toLowerCase().includes(s)
      || j.site_address?.toLowerCase().includes(s)
  })

  const allSelected = filteredJobs.length > 0 && selectedIds.length === filteredJobs.length
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds([])
    else setSelectedIds(filteredJobs.map(j => j.id))
  }

  const formatDate = (d) => d
    ? new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      assigned: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    }
    return colors[status] || colors.draft
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-slate-100 text-slate-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-amber-100 text-amber-600',
      urgent: 'bg-red-100 text-red-700',
      emergency: 'bg-red-200 text-red-800',
    }
    return colors[priority] || colors.low
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
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Ops</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Job List</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-emerald-600" />Job List
            </h1>
            <p className="text-slate-500 mt-1 ml-11">
              Jobs waiting to be released to the pool — not yet visible to cleaners
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedIds.length > 0 && (
              <button
                onClick={bulkRelease}
                disabled={releasing === 'bulk'}
                className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {releasing === 'bulk' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Release Selected ({selectedIds.length})
              </button>
            )}
            <button
              onClick={loadJobs}
              className="px-4 py-3 rounded-2xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="neu-raised rounded-2xl p-4 mb-6 border-l-4 border-blue-500 bg-blue-50/40 dark:bg-blue-900/10 flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-slate-800 dark:text-white">Staging area</p>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5">
              Jobs stay here until you release them. Once released, they appear on mobile's Open pool
              for cleaners to pick up.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by job #, title, client, or address..."
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
          </select>
          {filteredJobs.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="px-4 py-3 neu-inset rounded-xl flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400"
            >
              {allSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
              <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}
        </motion.div>

        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mx-auto" />
            <p className="text-slate-500 mt-3">Loading job list...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 neu-raised rounded-3xl"
          >
            <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">
              {search ? 'No jobs match your search' : 'No jobs waiting to be released'}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {search ? 'Try a different search term' : 'All jobs are currently in the pool'}
            </p>
          </motion.div>
        ) : (
          <>
            <div className="hidden lg:block neu-raised rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-3 text-slate-500 font-medium w-10">
                        <button onClick={toggleSelectAll} className="p-1">
                          {allSelected
                            ? <CheckSquare className="w-4 h-4 text-emerald-600" />
                            : <Square className="w-4 h-4 text-slate-400" />}
                        </button>
                      </th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Job #</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Title</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Client</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Location</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Scheduled</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Status</th>
                      <th className="text-left py-3 px-3 text-slate-500 font-medium">Priority</th>
                      <th className="text-right py-3 px-3 text-slate-500 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map(job => {
                      const selected = selectedIds.includes(job.id)
                      return (
                        <tr key={job.id} className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${selected ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
                          <td className="py-3 px-3">
                            <button onClick={() => toggleSelection(job.id)} className="p-1">
                              {selected
                                ? <CheckSquare className="w-4 h-4 text-emerald-600" />
                                : <Square className="w-4 h-4 text-slate-400" />}
                            </button>
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-800 dark:text-white">{job.job_number}</td>
                          <td className="py-3 px-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">{job.title || '—'}</td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{job.clients?.company_name || '—'}</td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{job.site_address || '—'}</td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1 text-xs">
                              <Calendar className="w-3 h-3" />
                              {formatDate(job.scheduled_date)}
                              {job.scheduled_start_time && (
                                <>
                                  <Clock className="w-3 h-3 ml-1" />
                                  {job.scheduled_start_time.slice(0, 5)}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(job.status)}`}>
                              {job.status?.replace('_', ' ') || 'draft'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getPriorityColor(job.priority)}`}>
                              {job.priority || 'medium'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => navigate(`/fieldops/job-management`)}
                                className="p-2 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600"
                                title="Open Job Management to edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => releaseJob(job.id)}
                                disabled={releasing === job.id}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                                title="Release this job to the pool"
                              >
                                {releasing === job.id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Send className="w-3 h-3" />}
                                Release
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:hidden space-y-4">
              {filteredJobs.map(job => {
                const selected = selectedIds.includes(job.id)
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className={`neu-raised rounded-2xl p-5 ${selected ? 'ring-2 ring-emerald-500' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <button onClick={() => toggleSelection(job.id)} className="p-1 flex-shrink-0">
                        {selected
                          ? <CheckSquare className="w-5 h-5 text-emerald-600" />
                          : <Square className="w-5 h-5 text-slate-400" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono font-bold text-slate-800 dark:text-white text-sm">{job.job_number}</p>
                        <p className="text-xs text-slate-500 truncate">{job.clients?.company_name || '—'}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize flex-shrink-0 ${getStatusColor(job.status)}`}>
                        {job.status?.replace('_', ' ') || 'draft'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-2">{job.title || 'Untitled'}</h3>
                    <div className="space-y-1 text-xs text-slate-500 mb-3">
                      <p className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.site_address || '—'}</p>
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{formatDate(job.scheduled_date)}
                        {job.scheduled_start_time && <> at {job.scheduled_start_time.slice(0, 5)}</>}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getPriorityColor(job.priority)}`}>
                        {job.priority || 'medium'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate('/fieldops/job-management')}
                        className="py-2 px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium flex items-center justify-center gap-1"
                      >
                        <Edit className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => releaseJob(job.id)}
                        disabled={releasing === job.id}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {releasing === job.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Send className="w-3 h-3" />}
                        Release to Pool
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
