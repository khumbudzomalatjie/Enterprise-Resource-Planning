import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Briefcase, Search, RefreshCw, MapPin, 
  ChevronRight, Sparkles, Sun, Moon, 
  Play, CheckCircle2, Eye, Calendar
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

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('jobs').select('*').limit(100)
      if (error) {
        console.error('Jobs error:', error.message)
        setJobs([])
      } else {
        setJobs(data || [])
      }
    } catch (e) {
      console.error('Jobs exception:', e)
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
    const { error } = await supabase.from('jobs').update({ 
      status: newStatus, updated_at: new Date().toISOString() 
    }).eq('id', jobId)
    if (error) toast.error('Failed to update')
    else { toast.success(`Job ${newStatus.replace('_', ' ')}`); loadJobs() }
  }

  const filteredJobs = useMemo(() => {
    let result = jobs
    if (searchTerm) {
      const t = searchTerm.toLowerCase()
      result = result.filter(j => 
        (j.title || '').toLowerCase().includes(t) ||
        (j.job_number || '').toLowerCase().includes(t) ||
        (j.site_address || '').toLowerCase().includes(t)
      )
    }
    if (statusFilter !== 'all') {
      result = result.filter(j => j.status === statusFilter)
    }
    return result
  }, [jobs, searchTerm, statusFilter])

  const stats = useMemo(() => ({
    total: jobs.length,
    inProgress: jobs.filter(j => j.status === 'in_progress').length,
    pending: jobs.filter(j => j.status === 'pending' || j.status === 'scheduled').length,
    completed: jobs.filter(j => j.status === 'completed').length,
  }), [jobs])

  const getStatusBadge = (s) => {
    const b = { pending: 'bg-gray-100 text-gray-700', scheduled: 'bg-blue-100 text-blue-700', in_progress: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700', on_hold: 'bg-purple-100 text-purple-700' }
    return b[s] || 'bg-gray-100 text-gray-700'
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : 'N/A'

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <button onClick={refreshJobs} disabled={refreshing} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /><span className="text-sm font-semibold hidden sm:inline">Field Ops</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Operations</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" /><span className="font-medium">Live Jobs</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3"><Briefcase className="w-8 h-8 text-emerald-600" />Live Jobs</h1>
          <button onClick={refreshJobs} disabled={refreshing} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-700">
            <RefreshCw className={`w-4 h-4 inline mr-1 ${refreshing ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[{l:'Total',v:stats.total,c:'text-blue-600',bg:'bg-blue-100'},{l:'In Progress',v:stats.inProgress,c:'text-amber-600',bg:'bg-amber-100'},{l:'Pending',v:stats.pending,c:'text-purple-600',bg:'bg-purple-100'},{l:'Completed',v:stats.completed,c:'text-emerald-600',bg:'bg-emerald-100'}].map((s,i)=>(
            <div key={i} className="neu-raised rounded-xl p-3 flex items-center gap-3 cursor-pointer" onClick={() => setStatusFilter(s.l === 'In Progress' ? 'in_progress' : s.l === 'Pending' ? 'pending' : s.l === 'Completed' ? 'completed' : 'all')}>
              <div className={`w-10 h-10 rounded-lg ${s.bg} dark:bg-opacity-30 flex items-center justify-center`}><span className={`text-lg font-bold ${s.c}`}>{s.v}</span></div>
              <p className="text-xs text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search jobs..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-sm">
            <option value="all">All</option><option value="in_progress">In Progress</option><option value="pending">Pending</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option>
          </select>
        </div>

        {/* Jobs List */}
        {loading ? <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" /></div>
        : filteredJobs.length > 0 ? (
          <div className="space-y-3">
            {filteredJobs.map(job=>(
              <motion.div key={job.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                className={`neu-raised rounded-2xl p-5 cursor-pointer ${job.status==='in_progress'?'border-l-4 border-l-amber-500':''}`}
                onClick={()=>setSelectedJob(selectedJob?.id===job.id?null:job)}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{job.title||'Untitled'}</h3>
                    <p className="text-sm text-slate-500">{job.job_number||'No #'} • {formatDate(job.scheduled_date)} {job.site_address&&`• ${job.site_address}`}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(job.status)}`}>{job.status?.replace('_',' ')}</span>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  {(job.status==='scheduled'||job.status==='pending')&&
                    <button onClick={e=>{e.stopPropagation();updateJobStatus(job.id,'in_progress')}} className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs"><Play className="w-3 h-3 inline mr-1"/>Start</button>}
                  {job.status==='in_progress'&&
                    <button onClick={e=>{e.stopPropagation();updateJobStatus(job.id,'completed')}} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs"><CheckCircle2 className="w-3 h-3 inline mr-1"/>Complete</button>}
                  <button onClick={e=>{e.stopPropagation();navigate(`/operations/jobs/${job.id}`)}} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs"><Eye className="w-3 h-3 inline mr-1"/>View</button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 neu-raised rounded-3xl">
            <Briefcase className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No jobs found</p>
            <button onClick={refreshJobs} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm">Refresh</button>
          </div>
        )}
      </main>
    </div>
  )
}
