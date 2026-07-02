import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { Briefcase, MapPin, Clock, Calendar, Search, Hand, Play, CheckCircle2, Camera, Package, AlertCircle, User, List, RefreshCw, Lock } from 'lucide-react'

export default function MyJobs() {
  const { user } = useAuthStore()
  const { openJobs, myJobs, fetchOpenJobs, fetchMyJobs, selectJob, startJob, completeJob } = useMobileStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('open')
  const [loading, setLoading] = useState(true)
  const [jobSearch, setJobSearch] = useState('')
  const [updatingJob, setUpdatingJob] = useState(null)
  const [myEmployeeId, setMyEmployeeId] = useState(null)

  // Initial load + realtime refresh
  useEffect(() => {
    setupAndLoad()

    const jobsChannel = supabase
      .channel('mobile-jobs-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jobs' }, () => {
        if (myEmployeeId) { Promise.all([fetchOpenJobs(), fetchMyJobs(myEmployeeId)]) }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'field_job_assignments' }, () => {
        if (myEmployeeId) { Promise.all([fetchOpenJobs(), fetchMyJobs(myEmployeeId)]) }
      })
      .subscribe()

    const interval = setInterval(() => {
      if (myEmployeeId) { Promise.all([fetchOpenJobs(), fetchMyJobs(myEmployeeId)]) }
    }, 10000)

    return () => { supabase.removeChannel(jobsChannel); clearInterval(interval) }
  }, [myEmployeeId])

  const setupAndLoad = async () => {
    const empId = await findOrCreateEmployee()
    if (empId) {
      setMyEmployeeId(empId)
      await Promise.all([fetchOpenJobs(), fetchMyJobs(empId)])
    }
    setLoading(false)
  }

  const findOrCreateEmployee = async () => {
    let { data: emp } = await supabase.from('employees').select('id').eq('user_id', user?.id).single()
    if (emp) return emp.id
    const { data: empByEmail } = await supabase.from('employees').select('id').eq('email', user?.email).single()
    if (empByEmail) { await supabase.from('employees').update({ user_id: user?.id }).eq('id', empByEmail.id); return empByEmail.id }
    const firstName = user?.email?.split('@')[0] || 'Cleaner'
    const { data: newEmp } = await supabase.from('employees').insert([{ user_id: user?.id, first_name: firstName, last_name: '', email: user?.email, employment_status: 'active', department: 'Cleaning', employee_code: 'MOB-' + Date.now().toString(36).toUpperCase().slice(-4) }]).select('id').single()
    return newEmp?.id || null
  }

  const refreshData = async () => {
    if (!myEmployeeId) return
    setLoading(true)
    await Promise.all([fetchOpenJobs(), fetchMyJobs(myEmployeeId)])
    setLoading(false)
    toast.success('Refreshed!')
  }

  const handleSelectJob = async (jobId) => {
    if (!myEmployeeId) { toast.error('Profile not ready'); return }
    if (myJobs.length > 0) { toast.error('Complete current job first'); return }
    setUpdatingJob(jobId)
    const result = await selectJob(jobId, myEmployeeId)
    if (result.success) {
      toast.success('Job selected! Tap Start to begin')
      setActiveTab('mine')
      await Promise.all([fetchOpenJobs(), fetchMyJobs(myEmployeeId)])
    } else { toast.error('Failed') }
    setUpdatingJob(null)
  }

  const handleStartJob = async (jobId) => {
    if (!myEmployeeId) return
    setUpdatingJob(jobId)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await startJob(jobId, myEmployeeId, pos.coords.latitude, pos.coords.longitude)
      toast.success('Job started! You can now complete it')
      await fetchMyJobs(myEmployeeId)
      setUpdatingJob(null)
    }, async () => {
      await startJob(jobId, myEmployeeId, null, null)
      toast.success('Job started! You can now complete it')
      await fetchMyJobs(myEmployeeId)
      setUpdatingJob(null)
    })
  }

  const handleCompleteJob = async (jobId) => {
    if (!window.confirm('Mark this job as completed?')) return
    if (!myEmployeeId) return
    setUpdatingJob(jobId)
    const result = await completeJob(jobId, myEmployeeId)
    if (result.success) {
      toast.success('Job completed! Great work!')
      setActiveTab('open')
      await Promise.all([fetchOpenJobs(), fetchMyJobs(myEmployeeId)])
    } else { toast.error('Failed to complete') }
    setUpdatingJob(null)
  }

  // ✅ Check if job has been started (in_progress)
  const canComplete = (job) => {
    return job.assignment_status === 'in_progress'
  }

  // ✅ Check if job is only selected (assigned) but not started
  const needsStart = (job) => {
    return job.assignment_status === 'assigned' || job.assignment_status === 'accepted'
  }

  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }) : ''
  const todayStr = new Date().toISOString().split('T')[0]

  const filterJobs = (jobs) => jobs.filter(j => {
    if (!jobSearch) return true
    const s = jobSearch.toLowerCase()
    return (j.title || '').toLowerCase().includes(s) || (j.job_number || '').toLowerCase().includes(s) || (j.clients?.company_name || '').toLowerCase().includes(s)
  })

  const filteredOpen = filterJobs(openJobs || [])
  const filteredMine = filterJobs(myJobs || [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-700 font-['Inter'] pb-20">
      <div className="px-5 pt-8 pb-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Jobs</h1>
            <p className="text-blue-100 text-sm mt-1">Auto-refreshes every 10s</p>
          </div>
          <button onClick={refreshData} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
            <RefreshCw className="w-5 h-5 text-white" />
          </button>
        </div>
        {myJobs.length > 0 && (
          <div className="mt-3 bg-amber-400/20 border border-amber-400/30 rounded-xl p-3 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-amber-300 flex-shrink-0" />
            <div>
              <p className="text-amber-200 text-sm font-semibold">Active: {myJobs[0]?.title}</p>
              <p className="text-amber-300/70 text-xs">
                {needsStart(myJobs[0]) ? '⏳ Tap Start to begin working' : 
                 canComplete(myJobs[0]) ? '🔨 Work in progress - Complete when done' : 
                 'Status: ' + (myJobs[0]?.assignment_status || 'N/A')}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 -mt-2">
        <div className="flex gap-2 bg-white/10 rounded-2xl p-1">
          <button onClick={() => setActiveTab('open')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'open' ? 'bg-white text-blue-700 shadow-lg' : 'text-white/70'}`}>
            <List className="w-4 h-4" /> Open ({filteredOpen.length})
          </button>
          <button onClick={() => setActiveTab('mine')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'mine' ? 'bg-white text-amber-700 shadow-lg' : 'text-white/70'}`}>
            <User className="w-4 h-4" /> My Jobs ({filteredMine.length})
          </button>
        </div>
      </div>

      <div className="px-5 mt-3 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input type="text" value={jobSearch} onChange={e => setJobSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/15 text-white placeholder-white/40 text-sm border border-white/10" />
        </div>
      </div>

      <div className="px-5">
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div></div>
        ) : activeTab === 'open' ? (
          filteredOpen.length > 0 ? (
            <div className="space-y-2.5">
              {filteredOpen.map((job, i) => (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`bg-white rounded-2xl p-4 shadow-md border-l-4 ${myJobs.length > 0 ? 'border-l-slate-300 opacity-60' : 'border-l-blue-400'}`}>
                  <div className="flex justify-between mb-2">
                    <div className="flex-1"><h3 className="font-semibold text-slate-800 text-sm">{job.title}</h3><p className="text-xs text-slate-400">{job.job_number} · {job.clients?.company_name}</p></div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">{job.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2"><Calendar className="w-3 h-3" />{job.scheduled_date === todayStr ? 'Today' : formatDate(job.scheduled_date)}<span className="mx-1">·</span><Clock className="w-3 h-3" />{job.scheduled_start_time?.slice(0,5)}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3"><MapPin className="w-3 h-3" />{job.site_address?.slice(0, 40)}</div>
                  <button onClick={() => handleSelectJob(job.id)} disabled={updatingJob === job.id || myJobs.length > 0}
                    className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                    {myJobs.length > 0 ? '🔒 Complete current job first' : <><Hand className="w-4 h-4" /> Select Job</>}
                  </button>
                </motion.div>
              ))}
            </div>
          ) : <div className="text-center py-12 bg-white/10 rounded-2xl"><Briefcase className="w-12 h-12 text-white/50 mx-auto mb-2" /><p className="text-white font-semibold">No open jobs</p></div>
        ) : (
          filteredMine.length > 0 ? (
            <div className="space-y-2.5">
              {filteredMine.map((job, i) => (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-2xl p-4 shadow-md border-l-4 border-l-amber-400">
                  <div className="flex justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{job.title}</h3>
                      <p className="text-xs text-slate-400">{job.job_number} · {job.clients?.company_name}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      needsStart(job) ? 'bg-blue-100 text-blue-700' : 
                      canComplete(job) ? 'bg-amber-100 text-amber-700' : 
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {needsStart(job) ? 'Selected' : canComplete(job) ? 'In Progress' : 'My Job'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2"><Calendar className="w-3 h-3" />{job.scheduled_date === todayStr ? 'Today' : formatDate(job.scheduled_date)}<span className="mx-1">·</span><Clock className="w-3 h-3" />{job.scheduled_start_time?.slice(0,5)}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3"><MapPin className="w-3 h-3" />{job.site_address?.slice(0, 40)}</div>
                  
                  {/* ✅ BUTTONS - Start always active, Complete only after Start */}
                  <div className="flex gap-2 mb-2">
                    <button 
                      onClick={() => handleStartJob(job.id)} 
                      disabled={updatingJob === job.id}
                      className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-sm">
                      <Play className="w-3.5 h-3.5" /> 
                      {needsStart(job) ? 'Start Job' : canComplete(job) ? 'Restart' : 'Start'}
                    </button>
                    <button 
                      onClick={() => handleCompleteJob(job.id)} 
                      disabled={updatingJob === job.id || !canComplete(job)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 shadow-sm ${
                        canComplete(job) 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}>
                      {canComplete(job) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {canComplete(job) ? 'Complete' : 'Start First'}
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
          ) : <div className="text-center py-12 bg-white/10 rounded-2xl"><User className="w-12 h-12 text-white/50 mx-auto mb-2" /><p className="text-white font-semibold">No jobs assigned</p><p className="text-white/50 text-xs mt-1">Select a job from Open Pool</p></div>
        )}
      </div>
      <BottomNav active="jobs" />
    </div>
  )
}
