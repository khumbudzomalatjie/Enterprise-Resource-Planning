import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { 
  Briefcase, Clock, CheckCircle2, MapPin, 
  Camera, AlertCircle, Package, LogOut,
  Pause, RefreshCw, ChevronDown,
  Calendar, Search, List, User, Users,
  Hand
} from 'lucide-react'

export default function MobileHome() {
  const { user, profile, signOut } = useAuthStore()
  const { myJobs, stats, fetchMyJobs, fetchMobileStats, fetchMyProfile, myProfile } = useMobileStore()
  const navigate = useNavigate()
  const scrollRef = useRef(null)
  
  const [currentTime, setCurrentTime] = useState(new Date())
  const [greeting, setGreeting] = useState('')
  const [updatingJob, setUpdatingJob] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const touchStartY = useRef(0)
  const pullThreshold = 80

  const [allOpenJobs, setAllOpenJobs] = useState([])
  const [myActiveJobs, setMyActiveJobs] = useState([])
  const [loadingAllJobs, setLoadingAllJobs] = useState(false)
  const [jobSearch, setJobSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState('all')
  const [activeTab, setActiveTab] = useState('all')
  const [myEmployeeId, setMyEmployeeId] = useState(null)

  useEffect(() => {
    initData()
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (myEmployeeId) loadAllJobs()
  }, [selectedDate, myEmployeeId])

  useEffect(() => {
    const hour = currentTime.getHours()
    if (hour < 12) setGreeting('Good Morning')
    else if (hour < 17) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')
  }, [currentTime])

  const initData = async () => {
    if (user?.id) {
      await fetchMyProfile(user.id)
    }
    if (profile?.id) {
      await fetchMobileStats(profile.id)
      await fetchMyJobs(profile.id)
    }
    await setupEmployee()
  }

  // AUTO-SETUP: Find or create employee record for ANY logged-in cleaner
  const setupEmployee = async () => {
    try {
      console.log('🔍 Setting up employee for:', user?.email)

      // Step 1: Try to find by user_id
      let { data: emp } = await supabase
        .from('employees')
        .select('id, email, first_name')
        .eq('user_id', user?.id)
        .single()

      if (emp) {
        console.log('✅ Found employee by user_id:', emp.id, emp.first_name)
        setMyEmployeeId(emp.id)
        return
      }

      // Step 2: Try to find by email
      const { data: empByEmail } = await supabase
        .from('employees')
        .select('id, email, first_name')
        .eq('email', user?.email)
        .single()

      if (empByEmail) {
        console.log('✅ Found employee by email:', empByEmail.id)
        // Link user_id for future logins
        await supabase.from('employees').update({ user_id: user?.id }).eq('id', empByEmail.id)
        setMyEmployeeId(empByEmail.id)
        return
      }

      // Step 3: Auto-create employee record from auth user data
      console.log('🆕 Creating new employee record for:', user?.email)
      
      const firstName = profile?.full_name?.split(' ')[0] || 
                        user?.user_metadata?.full_name?.split(' ')[0] ||
                        user?.email?.split('@')[0] || 'Cleaner'
      
      const lastName = profile?.full_name?.split(' ').slice(1).join(' ') || 
                       user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || ''

      const { data: newEmp, error: createError } = await supabase
        .from('employees')
        .insert([{
          user_id: user?.id,
          first_name: firstName,
          last_name: lastName,
          email: user?.email,
          phone: user?.phone || null,
          employment_status: 'active',
          employment_type: 'full_time',
          department: 'Cleaning',
          date_of_hire: new Date().toISOString().split('T')[0]
        }])
        .select('id, first_name')
        .single()

      if (newEmp) {
        console.log('✅ Created new employee:', newEmp.id, newEmp.first_name)
        setMyEmployeeId(newEmp.id)
        toast.success(`Welcome, ${newEmp.first_name}! Your profile has been created.`)
      } else {
        console.error('❌ Failed to create employee:', createError)
        toast.error('Could not create employee profile. Contact admin.')
      }
    } catch (error) {
      console.error('❌ Setup error:', error.message)
    }
  }

  const loadAllJobs = async () => {
    if (!myEmployeeId) return
    
    setLoadingAllJobs(true)
    
    try {
      // OPEN POOL: All jobs with status pending/scheduled
      let openQuery = supabase
        .from('jobs')
        .select('id, title, job_number, status, scheduled_date, scheduled_start_time, scheduled_end_time, site_address, clients(company_name, phone), job_categories(name, color)')
        .in('status', ['pending', 'scheduled'])
        .order('scheduled_date', { ascending: true })
        .order('scheduled_start_time', { ascending: true })

      if (selectedDate !== 'all') {
        openQuery = openQuery.eq('scheduled_date', selectedDate)
      }

      const { data: openJobs } = await openQuery
      console.log('📋 Open Pool:', openJobs?.length || 0)
      setAllOpenJobs(openJobs || [])

      // MY JOBS: Jobs in_progress AND assigned to THIS employee
      let myQuery = supabase
        .from('jobs')
        .select('id, title, job_number, status, scheduled_date, scheduled_start_time, scheduled_end_time, site_address, assigned_to, clients(company_name, phone), job_categories(name, color)')
        .eq('status', 'in_progress')
        .eq('assigned_to', myEmployeeId)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_start_time', { ascending: true })

      if (selectedDate !== 'all') {
        myQuery = myQuery.eq('scheduled_date', selectedDate)
      }

      const { data: myJobsData, error: myError } = await myQuery
      
      if (myError) {
        // If assigned_to column doesn't exist, fallback to all in_progress
        console.log('⚠️ assigned_to query failed, using fallback')
        const { data: fallback } = await supabase
          .from('jobs')
          .select('id, title, job_number, status, scheduled_date, scheduled_start_time, scheduled_end_time, site_address, clients(company_name, phone), job_categories(name, color)')
          .eq('status', 'in_progress')
          .order('scheduled_date', { ascending: true })
        console.log('👤 My Jobs (fallback):', fallback?.length || 0)
        setMyActiveJobs(fallback || [])
      } else {
        console.log('👤 My Jobs:', myJobsData?.length || 0)
        setMyActiveJobs(myJobsData || [])
      }

    } catch (error) {
      console.error('Error loading jobs:', error)
    } finally {
      setLoadingAllJobs(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await initData()
    await loadAllJobs()
    setTimeout(() => setRefreshing(false), 500)
    toast.success('Refreshed!')
  }

  // Touch handlers
  const handleTouchStart = (e) => {
    if (scrollRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }
  const handleTouchMove = (e) => {
    if (!isPulling) return
    const currentY = e.touches[0].clientY
    const distance = currentY - touchStartY.current
    if (distance > 0) setPullDistance(Math.min(distance * 0.5, pullThreshold))
  }
  const handleTouchEnd = async () => {
    if (pullDistance >= pullThreshold && !refreshing) await handleRefresh()
    setPullDistance(0); setIsPulling(false)
  }

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  // SELECT JOB - Cleaner picks up a job from Open Pool
  const handleSelectJob = async (jobId) => {
    if (!myEmployeeId) {
      toast.error('Profile not ready. Please wait or refresh.')
      return
    }

    setUpdatingJob(jobId)
    console.log('📝 Cleaner', myEmployeeId, 'selecting job:', jobId)

    try {
      // Try update with assigned_to
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'in_progress',
          assigned_to: myEmployeeId,
          actual_start_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)

      if (error) {
        // If assigned_to column doesn't exist, try without it
        if (error.message.includes('assigned_to')) {
          const { error: fallbackError } = await supabase
            .from('jobs')
            .update({ 
              status: 'in_progress',
              actual_start_time: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId)
          
          if (fallbackError) {
            console.error('❌ Update failed:', fallbackError.message)
            toast.error('Failed to select job')
            return
          }
        } else {
          console.error('❌ Update failed:', error.message)
          toast.error('Failed to select job')
          return
        }
      }

      console.log('✅ Job selected successfully')
      toast.success('Job selected! ✅')
      loadAllJobs()
      setActiveTab('mine')
      
    } catch (error) {
      console.error('❌ Exception:', error.message)
      toast.error('Failed to select job')
    } finally {
      setUpdatingJob(null)
    }
  }

  // COMPLETE JOB
  const handleCompleteJob = async (jobId) => {
    if (!window.confirm('Mark as completed? This will send for invoicing.')) return
    setUpdatingJob(jobId)
    try {
      await supabase.from('jobs').update({ 
        status: 'completed', actual_end_time: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', jobId)
      toast.success('Completed! Moving to finance ✅')
      loadAllJobs()
    } catch { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  // PAUSE JOB
  const handlePauseJob = async (jobId) => {
    const reason = prompt('Reason for pausing:')
    if (!reason) return
    setUpdatingJob(jobId)
    try {
      await supabase.from('jobs').update({ 
        status: 'on_hold', updated_at: new Date().toISOString()
      }).eq('id', jobId)
      toast.success('Paused - supervisor will review')
      loadAllJobs()
    } catch { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  const formatTime = (date) => date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (date) => date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
  const formatDateShort = (date) => {
    if (!date) return ''
    const d = new Date(date + 'T00:00:00')
    return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const todayStr = new Date().toISOString().split('T')[0]

  const filteredOpenJobs = allOpenJobs.filter(job => {
    if (!jobSearch) return true
    const s = jobSearch.toLowerCase()
    return (job.title || '').toLowerCase().includes(s) ||
           (job.job_number || '').toLowerCase().includes(s) ||
           (job.clients?.company_name || '').toLowerCase().includes(s) ||
           (job.site_address || '').toLowerCase().includes(s)
  })

  const filteredMyJobs = myActiveJobs.filter(job => {
    if (!jobSearch) return true
    const s = jobSearch.toLowerCase()
    return (job.title || '').toLowerCase().includes(s) ||
           (job.job_number || '').toLowerCase().includes(s) ||
           (job.clients?.company_name || '').toLowerCase().includes(s) ||
           (job.site_address || '').toLowerCase().includes(s)
  })

  const dateOptions = [
    { value: 'all', label: 'All Dates' },
    { value: todayStr, label: 'Today' },
  ]
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  dateOptions.push({ value: tomorrow.toISOString().split('T')[0], label: 'Tomorrow' })
  for (let i = 2; i < 5; i++) {
    const d = new Date(); d.setDate(d.getDate() + i)
    dateOptions.push({ value: d.toISOString().split('T')[0], label: formatDateShort(d.toISOString().split('T')[0]) })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 font-['Inter'] pb-20"
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <AnimatePresence>
        {(pullDistance > 20 || refreshing) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: pullDistance > 20 ? pullDistance : refreshing ? 50 : 0, opacity: 1 }}
            className="flex items-center justify-center text-white/80 overflow-hidden">
            {refreshing ? <RefreshCw className="w-5 h-5 animate-spin" /> : pullDistance >= pullThreshold ? <span className="text-sm font-medium">Release to refresh</span> : <ChevronDown className="w-5 h-5" />}
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px)' }}>
        {/* Header */}
        <div className="px-5 pt-6 pb-6 text-white">
          <div className="flex justify-between items-start mb-1">
            <div className="flex-1">
              <p className="text-emerald-100 text-xs opacity-80">{formatDate(currentTime)}</p>
              <h1 className="text-xl font-bold mt-0.5">{greeting}, {myProfile?.first_name || user?.email?.split('@')[0] || 'Cleaner'}!</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleRefresh} className="p-2 rounded-xl bg-white/20 hover:bg-white/30"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /></button>
              <button onClick={handleSignOut} className="p-2 rounded-xl bg-white/20 hover:bg-white/30"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
          <p className="text-5xl font-bold text-center my-3 font-mono tracking-wider">{formatTime(currentTime)}</p>
        </div>

        {/* Stats */}
        <div className="px-5 -mt-3">
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: List, label: 'Open Pool', value: allOpenJobs.length, color: 'from-blue-400 to-blue-500' },
              { icon: User, label: 'My Jobs', value: myActiveJobs.length, color: 'from-amber-400 to-amber-500' },
              { icon: Clock, label: 'Clock', value: stats.isClockedIn ? 'In' : 'Out', color: stats.isClockedIn ? 'from-green-400 to-green-500' : 'from-slate-400 to-slate-500' },
              { icon: CheckCircle2, label: 'Done', value: stats.completedJobs || 0, color: 'from-emerald-400 to-emerald-500' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className={`bg-gradient-to-br ${s.color} rounded-2xl p-2.5 text-white text-center shadow-lg`}>
                <s.icon className="w-4 h-4 mx-auto mb-1 opacity-80" />
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[9px] opacity-80 font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-5 mt-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Clock, label: 'Clock In/Out', path: '/mobile/clock', color: 'from-amber-400 to-orange-500' },
              { icon: Camera, label: 'Job Photos', path: '/mobile/photos', color: 'from-blue-400 to-indigo-500' },
              { icon: Package, label: 'Supplies', path: '/mobile/supplies', color: 'from-purple-400 to-violet-500' },
              { icon: AlertCircle, label: 'Incident', path: '/mobile/incident', color: 'from-red-400 to-rose-500' },
            ].map(action => (
              <button key={action.label} onClick={() => navigate(action.path)}
                className={`bg-gradient-to-r ${action.color} text-white rounded-2xl p-3.5 text-left hover:scale-[1.02] active:scale-95 transition-all shadow-lg`}>
                <action.icon className="w-7 h-7 mb-2" /><span className="text-sm font-bold block">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 mt-5">
          <div className="flex gap-2 bg-white/10 rounded-2xl p-1">
            <button onClick={() => setActiveTab('all')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'all' ? 'bg-white text-emerald-700 shadow-lg' : 'text-white/70'}`}>
              <Users className="w-4 h-4" /> Open Pool ({filteredOpenJobs.length})
            </button>
            <button onClick={() => setActiveTab('mine')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'mine' ? 'bg-white text-amber-700 shadow-lg' : 'text-white/70'}`}>
              <User className="w-4 h-4" /> My Jobs ({filteredMyJobs.length})
            </button>
          </div>
        </div>

        {/* Search & Date */}
        <div className="px-5 mt-3 mb-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input type="text" value={jobSearch} onChange={e => setJobSearch(e.target.value)}
              placeholder="Search jobs..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/15 text-white placeholder-white/40 text-sm border border-white/10" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dateOptions.map(opt => (
              <button key={opt.value} onClick={() => setSelectedDate(opt.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium ${selectedDate === opt.value ? 'bg-white text-emerald-700 shadow-lg' : 'bg-white/20 text-white'}`}>{opt.label}</button>
            ))}
          </div>
        </div>

        {/* OPEN POOL TAB */}
        {activeTab === 'all' && (
          <div className="px-5 mb-4">
            {loadingAllJobs ? <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div></div>
             : filteredOpenJobs.length > 0 ? (
              <div className="space-y-2">
                {filteredOpenJobs.map((job, i) => (
                  <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-white rounded-2xl p-4 shadow-md border-l-4 border-l-blue-400">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1"><h3 className="font-semibold text-slate-800 text-sm">{job.title}</h3><p className="text-xs text-slate-400">{job.job_number} · {job.clients?.company_name || 'Client'}</p></div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">Open</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2"><Calendar className="w-3 h-3" /><span>{job.scheduled_date === todayStr ? 'Today' : formatDateShort(job.scheduled_date)}</span><span className="mx-1">·</span><Clock className="w-3 h-3" />{job.scheduled_start_time?.slice(0,5)}-{job.scheduled_end_time?.slice(0,5)}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3"><MapPin className="w-3 h-3" />{job.site_address?.slice(0, 40)}</div>
                    <button onClick={() => handleSelectJob(job.id)} disabled={updatingJob === job.id}
                      className="w-full py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm">
                      <Hand className="w-4 h-4" /> Select Job
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : <div className="text-center py-10 bg-white/10 backdrop-blur rounded-2xl"><List className="w-12 h-12 text-white/60 mx-auto mb-2" /><p className="text-white font-semibold">No open jobs</p></div>}
          </div>
        )}

        {/* MY JOBS TAB */}
        {activeTab === 'mine' && (
          <div className="px-5 mb-4">
            {loadingAllJobs ? <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div></div>
             : filteredMyJobs.length > 0 ? (
              <div className="space-y-2">
                {filteredMyJobs.map((job, i) => (
                  <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-white rounded-2xl p-4 shadow-md border-l-4 border-l-amber-400">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1" onClick={() => navigate(`/mobile/jobs/${job.id}`)}><h3 className="font-semibold text-slate-800 text-sm">{job.title}</h3><p className="text-xs text-slate-400">{job.job_number} · {job.clients?.company_name || 'Client'}</p></div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Mine</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2"><Calendar className="w-3 h-3" /><span>{job.scheduled_date === todayStr ? 'Today' : formatDateShort(job.scheduled_date)}</span><span className="mx-1">·</span><Clock className="w-3 h-3" />{job.scheduled_start_time?.slice(0,5)}-{job.scheduled_end_time?.slice(0,5)}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3"><MapPin className="w-3 h-3" />{job.site_address?.slice(0, 40)}</div>
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => handleCompleteJob(job.id)} disabled={updatingJob === job.id}
                        className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-sm"><CheckCircle2 className="w-3.5 h-3.5" />Complete</button>
                      <button onClick={() => handlePauseJob(job.id)} disabled={updatingJob === job.id}
                        className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-sm"><Pause className="w-3.5 h-3.5" />Pause</button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button onClick={() => navigate('/mobile/photos')} className="py-2 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1"><Camera className="w-3 h-3" /> Photos</button>
                      <button onClick={() => navigate('/mobile/supplies')} className="py-2 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1"><Package className="w-3 h-3" /> Supplies</button>
                      <button onClick={() => navigate('/mobile/incident')} className="py-2 bg-red-50 text-red-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3" /> Incident</button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : <div className="text-center py-10 bg-white/10 backdrop-blur rounded-2xl"><User className="w-12 h-12 text-white/60 mx-auto mb-2" /><p className="text-white font-semibold">No jobs yet</p><p className="text-white/60 text-xs mt-1">Select a job from Open Pool</p></div>}
          </div>
        )}

        <div className="h-4" />
      </div>
      <BottomNav />
    </div>
  )
}
