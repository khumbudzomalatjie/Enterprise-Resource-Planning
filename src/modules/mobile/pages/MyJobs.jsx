import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { 
  Briefcase, MapPin, Clock, Calendar, 
  Search, Hand, Play, CheckCircle2, Pause,
  Camera, Package, AlertCircle, RefreshCw,
  ChevronDown, User, Users, List
} from 'lucide-react'

export default function MyJobs() {
  const { user, profile } = useAuthStore()
  const { fetchMyJobs, fetchMobileStats } = useMobileStore()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('open')
  const [openJobs, setOpenJobs] = useState([])
  const [myJobs, setMyJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [jobSearch, setJobSearch] = useState('')
  const [updatingJob, setUpdatingJob] = useState(null)
  const [myEmployeeId, setMyEmployeeId] = useState(null)

  useEffect(() => {
    setupAndLoad()
  }, [])

  const setupAndLoad = async () => {
    await findEmployee()
    await loadAllJobs()
  }

  const findEmployee = async () => {
    try {
      let { data: emp } = await supabase.from('employees').select('id').eq('user_id', user?.id).single()
      if (emp) { setMyEmployeeId(emp.id); return }
      
      const { data: empByEmail } = await supabase.from('employees').select('id').eq('email', user?.email).single()
      if (empByEmail) { 
        await supabase.from('employees').update({ user_id: user?.id }).eq('id', empByEmail.id)
        setMyEmployeeId(empByEmail.id); return 
      }

      const { data: newEmp } = await supabase.from('employees').insert([{
        user_id: user?.id, first_name: user?.email?.split('@')[0] || 'Cleaner', last_name: '',
        email: user?.email, employment_status: 'active', department: 'Cleaning'
      }]).select('id').single()
      if (newEmp) setMyEmployeeId(newEmp.id)
    } catch (e) {}
  }

  const loadAllJobs = async () => {
    setLoading(true)
    try {
      // OPEN JOBS: All scheduled/pending jobs from ERP
      const { data: open } = await supabase
        .from('jobs')
        .select('id, title, job_number, status, scheduled_date, scheduled_start_time, scheduled_end_time, site_address, notes, clients(company_name, phone), job_categories(name, color)')
        .in('status', ['pending', 'scheduled'])
        .order('scheduled_date', { ascending: true })
        .order('scheduled_start_time', { ascending: true })

      setOpenJobs(open || [])

      // MY JOBS: In progress jobs
      const { data: mine } = await supabase
        .from('jobs')
        .select('id, title, job_number, status, scheduled_date, scheduled_start_time, scheduled_end_time, site_address, notes, clients(company_name, phone), job_categories(name, color)')
        .eq('status', 'in_progress')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_start_time', { ascending: true })

      setMyJobs(mine || [])

    } catch (error) { console.error('Error:', error) }
    finally { setLoading(false) }
  }

  // SELECT JOB - Cleaner can only have ONE job at a time
  const handleSelectJob = async (jobId) => {
    if (!myEmployeeId) { toast.error('Profile not ready'); return }
    
    // Check if cleaner already has an active job
    if (myJobs.length > 0) {
      const activeJobTitle = myJobs[0].title || 'another job'
      toast.error('You already have an active job: ' + activeJobTitle + '. Complete it first before selecting a new one.')
      setActiveTab('mine') // Switch to My Jobs tab to show the active job
      return
    }

    setUpdatingJob(jobId)
    try {
      const cleanerName = profile?.full_name || user?.email?.split('@')[0] || 'Cleaner'
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'in_progress', actual_start_time: new Date().toISOString(), updated_at: new Date().toISOString(),
          notes: 'SELECTED BY: ' + cleanerName + ' at ' + new Date().toLocaleString()
        })
        .eq('id', jobId)
      if (error) { toast.error('Failed'); return }
      toast.success('Job selected! You can now work on this job.')
      loadAllJobs()
      setActiveTab('mine')
    } catch { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  // START JOB
  const handleStartJob = async (jobId) => {
    setUpdatingJob(jobId)
    try {
      await supabase.from('jobs').update({ status: 'in_progress', actual_start_time: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', jobId)
      toast.success('Job started!')
      loadAllJobs()
    } catch { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  // COMPLETE JOB - Frees up the cleaner to select a new job
  const handleCompleteJob = async (jobId) => {
    if (!window.confirm('Mark as completed? You can then select a new job.')) return
    setUpdatingJob(jobId)
    try {
      await supabase.from('jobs').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', jobId)
      toast.success('Completed! You can now select a new job.')
      loadAllJobs()
      setActiveTab('open') // Switch to Open Pool so they can pick a new job
    } catch { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  const formatDateShort = (date) => {
    if (!date) return ''
    return new Date(date + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
  }
  const todayStr = new Date().toISOString().split('T')[0]

  const filteredOpen = openJobs.filter(j => {
    if (!jobSearch) return true
    const s = jobSearch.toLowerCase()
    return (j.title || '').toLowerCase().includes(s) || (j.job_number || '').toLowerCase().includes(s) ||
           (j.clients?.company_name || '').toLowerCase().includes(s) || (j.site_address || '').toLowerCase().includes(s)
  })

  const filteredMine = myJobs.filter(j => {
    if (!jobSearch) return true
    const s = jobSearch.toLowerCase()
    return (j.title || '').toLowerCase().includes(s) || (j.job_number || '').toLowerCase().includes(s) ||
           (j.clients?.company_name || '').toLowerCase().includes(s) || (j.site_address || '').toLowerCase().includes(s)
  })

  // Check if cleaner has an active job (for the warning badge)
  const hasActiveJob = myJobs.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-700 font-['Inter'] pb-20">
      {/* Header */}
      <div className="px-5 pt-8 pb-5 text-white">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <p className="text-blue-100 text-sm mt-1">Select and manage your jobs</p>
        
        {/* Active Job Warning */}
        {hasActiveJob && (
          <div className="mt-3 bg-amber-400/20 border border-amber-400/30 rounded-xl p-3 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-300 flex-shrink-0" />
            <div>
              <p className="text-amber-200 text-sm font-semibold">Active Job: {myJobs[0]?.title}</p>
              <p className="text-amber-300/70 text-xs">Complete this job before selecting a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-5 -mt-2">
        <div className="flex gap-2 bg-white/10 rounded-2xl p-1">
          <button onClick={() => setActiveTab('open')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'open' ? 'bg-white text-blue-700 shadow-lg' : 'text-white/70'}`}>
            <List className="w-4 h-4" /> Open Pool ({filteredOpen.length})
          </button>
          <button onClick={() => setActiveTab('mine')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'mine' ? 'bg-white text-amber-700 shadow-lg' : 'text-white/70'}`}>
            <User className="w-4 h-4" /> My Jobs ({filteredMine.length})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 mt-3 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input type="text" value={jobSearch} onChange={e => setJobSearch(e.target.value)}
            placeholder="Search jobs..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/15 text-white placeholder-white/40 text-sm border border-white/10" />
        </div>
      </div>

      {/* Content */}
      <div className="px-5">
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div></div>
        ) : activeTab === 'open' ? (
          /* OPEN POOL */
          filteredOpen.length > 0 ? (
            <div className="space-y-2.5">
              {filteredOpen.map((job, i) => (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`bg-white rounded-2xl p-4 shadow-md border-l-4 ${hasActiveJob ? 'border-l-slate-300 opacity-60' : 'border-l-blue-400'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{job.title}</h3>
                      <p className="text-xs text-slate-400">{job.job_number} · {job.clients?.company_name || 'Client'}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">Open</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>{job.scheduled_date === todayStr ? 'Today' : formatDateShort(job.scheduled_date)}</span>
                    <span className="mx-1">·</span>
                    <Clock className="w-3 h-3" />{job.scheduled_start_time?.slice(0,5)}-{job.scheduled_end_time?.slice(0,5)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3"><MapPin className="w-3 h-3" />{job.site_address?.slice(0, 40)}</div>
                  
                  {hasActiveJob ? (
                    <div className="w-full py-2.5 bg-slate-400 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                      🔒 Complete current job first
                    </div>
                  ) : (
                    <button onClick={() => handleSelectJob(job.id)} disabled={updatingJob === job.id}
                      className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm">
                      <Hand className="w-4 h-4" /> Select Job
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white/10 rounded-2xl">
              <Briefcase className="w-12 h-12 text-white/50 mx-auto mb-2" />
              <p className="text-white font-semibold">No open jobs available</p>
              <p className="text-white/50 text-xs mt-1">Jobs will appear here when created in ERP</p>
            </div>
          )
        ) : (
          /* MY JOBS */
          filteredMine.length > 0 ? (
            <div className="space-y-2.5">
              {filteredMine.map((job, i) => (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-2xl p-4 shadow-md border-l-4 border-l-amber-400">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{job.title}</h3>
                      <p className="text-xs text-slate-400">{job.job_number} · {job.clients?.company_name || 'Client'}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Active</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>{job.scheduled_date === todayStr ? 'Today' : formatDateShort(job.scheduled_date)}</span>
                    <span className="mx-1">·</span>
                    <Clock className="w-3 h-3" />{job.scheduled_start_time?.slice(0,5)}-{job.scheduled_end_time?.slice(0,5)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3"><MapPin className="w-3 h-3" />{job.site_address?.slice(0, 40)}</div>
                  
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => handleStartJob(job.id)} disabled={updatingJob === job.id}
                      className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-sm">
                      <Play className="w-3.5 h-3.5" /> Start Job
                    </button>
                    <button onClick={() => handleCompleteJob(job.id)} disabled={updatingJob === job.id}
                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => navigate('/mobile/photos')} className="py-2 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1"><Camera className="w-3 h-3" /> Photos</button>
                    <button onClick={() => navigate('/mobile/supplies')} className="py-2 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1"><Package className="w-3 h-3" /> Supplies</button>
                    <button onClick={() => navigate('/mobile/incident')} className="py-2 bg-red-50 text-red-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3" /> Incident</button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white/10 rounded-2xl">
              <User className="w-12 h-12 text-white/50 mx-auto mb-2" />
              <p className="text-white font-semibold">No active jobs</p>
              <p className="text-white/50 text-xs mt-1">Select a job from Open Pool</p>
            </div>
          )
        )}
      </div>

      <BottomNav active="jobs" />
    </div>
  )
}
