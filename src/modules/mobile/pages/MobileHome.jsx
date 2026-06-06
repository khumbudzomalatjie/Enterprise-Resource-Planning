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
  Play, RefreshCw, ChevronDown,
  Calendar, Search, User, Upload, X,
  Send, Image, ClipboardCheck, PenTool,
  Phone, Navigation, Timer, Umbrella,
  Bell, Star, FileText, Shield
} from 'lucide-react'

export default function MobileHome() {
  const { user, profile, signOut } = useAuthStore()
  const { fetchMyJobs, fetchMobileStats, fetchMyProfile, myProfile, stats } = useMobileStore()
  const navigate = useNavigate()
  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  
  const [currentTime, setCurrentTime] = useState(new Date())
  const [greeting, setGreeting] = useState('')
  const [updatingJob, setUpdatingJob] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const touchStartY = useRef(0)
  const pullThreshold = 80

  // Job States
  const [allJobs, setAllJobs] = useState([])
  const [loadingAllJobs, setLoadingAllJobs] = useState(false)
  const [jobSearch, setJobSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState('all')
  const [myEmployeeId, setMyEmployeeId] = useState(null)
  const [activeJobTab, setActiveJobTab] = useState('assigned') // assigned, available, inprogress, inspection, completed

  // Modal State
  const [showJobModal, setShowJobModal] = useState(false)
  const [modalJob, setModalJob] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [supplyItem, setSupplyItem] = useState('')
  const [supplyQty, setSupplyQty] = useState(1)
  const [incidentDesc, setIncidentDesc] = useState('')
  const [incidentType, setIncidentType] = useState('damage')
  const [actionLoading, setActionLoading] = useState(false)
  const [checklistItems, setChecklistItems] = useState([
    { id: 1, label: 'Floors Swept', completed: false },
    { id: 2, label: 'Floors Mopped', completed: false },
    { id: 3, label: 'Vacuum Completed', completed: false },
    { id: 4, label: 'Bathrooms Sanitized', completed: false },
    { id: 5, label: 'Kitchen Cleaned', completed: false },
    { id: 6, label: 'Bins Emptied', completed: false },
    { id: 7, label: 'Windows Cleaned', completed: false },
    { id: 8, label: 'Final Inspection Done', completed: false },
  ])
  const [clientSignature, setClientSignature] = useState('')
  const [clientName, setClientName] = useState('')

  // Stats
  const [dashboardStats, setDashboardStats] = useState({
    leaveBalance: { annual: 18, sick: 10, personal: 3 },
    notifications: [],
    shiftStatus: '7:30 AM - 3:30 PM',
    performanceRating: 4.5
  })

  useEffect(() => {
    initData()
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (myEmployeeId) loadAllJobs()
  }, [selectedDate, myEmployeeId, activeJobTab])

  useEffect(() => {
    const hour = currentTime.getHours()
    if (hour < 12) setGreeting('Good Morning')
    else if (hour < 17) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')
  }, [currentTime])

  const initData = async () => {
    if (user?.id) await fetchMyProfile(user.id)
    if (profile?.id) {
      await fetchMobileStats(profile.id)
      await fetchMyJobs(profile.id)
    }
    await setupEmployee()
    loadNotifications()
  }

  const setupEmployee = async () => {
    try {
      let { data: emp } = await supabase.from('employees').select('id').eq('user_id', user?.id).single()
      if (emp) { setMyEmployeeId(emp.id); return }
      const { data: empByEmail } = await supabase.from('employees').select('id').eq('email', user?.email).single()
      if (empByEmail) { await supabase.from('employees').update({ user_id: user?.id }).eq('id', empByEmail.id); setMyEmployeeId(empByEmail.id); return }
      const nameParts = (profile?.full_name || user?.email?.split('@')[0] || 'Cleaner').split(' ')
      const { data: newEmp } = await supabase.from('employees').insert([{
        user_id: user?.id, first_name: nameParts[0], last_name: nameParts.slice(1).join(' ') || '',
        email: user?.email, employment_status: 'active', employment_type: 'full_time', department: 'Cleaning',
        date_of_hire: new Date().toISOString().split('T')[0]
      }]).select('id').single()
      if (newEmp) setMyEmployeeId(newEmp.id)
    } catch (e) {}
  }

  const loadNotifications = async () => {
    const notifs = []
    if (stats.completedJobs > 0) notifs.push({ id: 1, text: `${stats.completedJobs} jobs completed today`, icon: CheckCircle2, color: 'text-emerald-500' })
    if (allJobs.filter(j => j.status === 'in_progress').length > 0) notifs.push({ id: 2, text: `${allJobs.filter(j => j.status === 'in_progress').length} jobs in progress`, icon: Play, color: 'text-amber-500' })
    setDashboardStats(prev => ({ ...prev, notifications: notifs }))
  }

  const loadAllJobs = async () => {
    setLoadingAllJobs(true)
    try {
      let query = supabase
        .from('jobs')
        .select('id, title, job_number, status, scheduled_date, scheduled_start_time, scheduled_end_time, site_address, site_city, notes, priority, clients(company_name, phone), job_categories(name, color)')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_start_time', { ascending: true })

      // Filter by tab
      if (activeJobTab === 'assigned') {
        query = query.eq('status', 'scheduled')
      } else if (activeJobTab === 'available') {
        query = query.in('status', ['pending', 'scheduled'])
      } else if (activeJobTab === 'inprogress') {
        query = query.eq('status', 'in_progress')
      } else if (activeJobTab === 'inspection') {
        query = query.eq('status', 'awaiting_inspection')
      } else if (activeJobTab === 'completed') {
        query = query.eq('status', 'completed')
      }

      if (selectedDate !== 'all') query = query.eq('scheduled_date', selectedDate)

      const { data: jobs } = await query
      setAllJobs(jobs || [])
    } catch (error) { console.error('Error:', error) }
    finally { setLoadingAllJobs(false) }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await initData()
    await loadAllJobs()
    setTimeout(() => setRefreshing(false), 500)
    toast.success('Refreshed!')
  }

  const handleTouchStart = (e) => {
    if (scrollRef.current?.scrollTop === 0) { touchStartY.current = e.touches[0].clientY; setIsPulling(true) }
  }
  const handleTouchMove = (e) => {
    if (!isPulling) return; const d = e.touches[0].clientY - touchStartY.current
    if (d > 0) setPullDistance(Math.min(d * 0.5, pullThreshold))
  }
  const handleTouchEnd = async () => {
    if (pullDistance >= pullThreshold && !refreshing) await handleRefresh()
    setPullDistance(0); setIsPulling(false)
  }
  const handleSignOut = async () => { await signOut(); navigate('/login') }

  // JOB ACTIONS
  const handleSelectJob = async (jobId) => {
    if (!myEmployeeId) { toast.error('Profile not ready'); return }
    setUpdatingJob(jobId)
    try {
      const cleanerName = myProfile?.first_name || user?.email?.split('@')[0] || 'Cleaner'
      await supabase.from('jobs').update({ 
        status: 'in_progress', actual_start_time: new Date().toISOString(), updated_at: new Date().toISOString(),
        notes: `SELECTED BY: ${cleanerName} at ${new Date().toLocaleString()}`
      }).eq('id', jobId)
      toast.success('Job claimed! ✅')
      await loadAllJobs()
    } catch { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  const handleUpdateJobStatus = async (jobId, newStatus) => {
    setUpdatingJob(jobId)
    try {
      const updates = { status: newStatus, updated_at: new Date().toISOString() }
      if (newStatus === 'in_progress') updates.actual_start_time = new Date().toISOString()
      if (newStatus === 'completed' || newStatus === 'awaiting_inspection') updates.actual_end_time = new Date().toISOString()
      
      await supabase.from('jobs').update(updates).eq('id', jobId)
      toast.success(`Status updated to: ${newStatus.replace('_', ' ')}`)
      await loadAllJobs()
    } catch { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  const openJobModal = (job) => {
    if (!job) { toast.error('No job selected'); return }
    setModalJob(job)
    setShowJobModal(true)
    setSupplyItem(''); setSupplyQty(1); setIncidentDesc(''); setIncidentType('damage')
    setClientSignature(''); setClientName('')
    setChecklistItems(checklistItems.map(c => ({ ...c, completed: false })))
  }

  const handleStartJob = async () => {
    if (!modalJob) return
    setActionLoading(true)
    try {
      await supabase.from('jobs').update({ status: 'in_progress', actual_start_time: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', modalJob.id)
      toast.success('Job started! 🚀')
      await loadAllJobs(); setShowJobModal(false)
    } catch { toast.error('Failed') }
    finally { setActionLoading(false) }
  }

  const handleCompleteJob = async () => {
    if (!modalJob) return
    // Check checklist
    const incompleteItems = checklistItems.filter(c => !c.completed)
    if (incompleteItems.length > 3) {
      toast.error(`Please complete at least ${checklistItems.length - 3} checklist items before submitting`)
      return
    }
    if (!window.confirm('Submit job for inspection? This will send for review.')) return
    setActionLoading(true)
    try {
      await supabase.from('jobs').update({ 
        status: 'awaiting_inspection', actual_end_time: new Date().toISOString(), updated_at: new Date().toISOString(),
        notes: modalJob.notes ? `${modalJob.notes}\nCLIENT: ${clientName}, SIGNED: ${clientSignature}` : `CLIENT: ${clientName}, SIGNED: ${clientSignature}`
      }).eq('id', modalJob.id)
      toast.success('Submitted for inspection! ✅')
      await loadAllJobs(); setShowJobModal(false)
    } catch { toast.error('Failed') }
    finally { setActionLoading(false) }
  }

  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !modalJob || !myEmployeeId) return
    setUploadingPhoto(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `job-photos/${modalJob.id}/${Date.now()}.${fileExt}`
      await supabase.storage.from('fleet').upload(fileName, file, { upsert: true })
      const { data: { publicUrl } } = supabase.storage.from('fleet').getPublicUrl(fileName)
      await supabase.from('job_photos').insert([{ job_id: modalJob.id, employee_id: myEmployeeId, photo_type: 'progress', photo_url: publicUrl, caption: `Photo for ${modalJob.title}` }])
      toast.success('Photo uploaded! 📸')
    } catch { toast.error('Failed') }
    finally { setUploadingPhoto(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const handleTakePhoto = () => { if (!modalJob) { toast.error('Select a job first'); return }; fileInputRef.current?.click() }

  const handleRequestSupplies = async () => {
    if (!modalJob || !supplyItem.trim() || !myEmployeeId) { toast.error('Fill all fields'); return }
    setActionLoading(true)
    try {
      const { data: request } = await supabase.from('supplies_requests').insert([{ employee_id: myEmployeeId, job_id: modalJob.id, status: 'pending' }]).select('id').single()
      if (request) await supabase.from('supplies_request_items').insert([{ request_id: request.id, item_name: supplyItem, quantity: supplyQty, unit: 'each' }])
      toast.success('Supplies requested! 📦'); setSupplyItem(''); setSupplyQty(1)
    } catch { toast.error('Failed') }
    finally { setActionLoading(false) }
  }

  const handleReportIncident = async () => {
    if (!modalJob || !incidentDesc.trim() || !myEmployeeId) { toast.error('Describe the incident'); return }
    setActionLoading(true)
    try {
      await supabase.from('incident_reports').insert([{ employee_id: myEmployeeId, job_id: modalJob.id, incident_type: incidentType, description: incidentDesc, severity: 'medium', status: 'reported' }])
      toast.success('Incident reported! 🚨'); setIncidentDesc(''); setIncidentType('damage')
    } catch { toast.error('Failed') }
    finally { setActionLoading(false) }
  }

  const toggleChecklistItem = (id) => {
    setChecklistItems(checklistItems.map(c => c.id === id ? { ...c, completed: !c.completed } : c))
  }

  const formatTime = (date) => date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (date) => date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
  const formatDateShort = (date) => { if (!date) return ''; const d = new Date(date + 'T00:00:00'); return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }) }
  const todayStr = new Date().toISOString().split('T')[0]

  const filteredJobs = allJobs.filter(job => {
    if (!jobSearch) return true
    const s = jobSearch.toLowerCase()
    return (job.title || '').toLowerCase().includes(s) || (job.job_number || '').toLowerCase().includes(s) || (job.clients?.company_name || '').toLowerCase().includes(s) || (job.site_address || '').toLowerCase().includes(s)
  })

  const dateOptions = [{ value: 'all', label: 'All Dates' }, { value: todayStr, label: 'Today' }]
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  dateOptions.push({ value: tomorrow.toISOString().split('T')[0], label: 'Tomorrow' })

  const jobTabs = [
    { id: 'assigned', label: 'My Jobs', icon: User },
    { id: 'available', label: 'Open Pool', icon: Briefcase },
    { id: 'inprogress', label: 'In Progress', icon: Play },
    { id: 'inspection', label: 'Inspection', icon: ClipboardCheck },
    { id: 'completed', label: 'Done', icon: CheckCircle2 },
  ]

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-blue-100 text-blue-700', scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700', awaiting_inspection: 'bg-purple-100 text-purple-700',
      completed: 'bg-emerald-100 text-emerald-700', on_hold: 'bg-slate-100 text-slate-600',
      cancelled: 'bg-red-100 text-red-700'
    }
    return badges[status] || 'bg-slate-100 text-slate-600'
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Open', scheduled: 'Scheduled', in_progress: 'Active',
      awaiting_inspection: 'Inspection', completed: 'Done', on_hold: 'Paused', cancelled: 'Cancelled'
    }
    return labels[status] || status?.replace('_', ' ') || 'Unknown'
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
        <div className="px-5 pt-6 pb-4 text-white">
          <div className="flex justify-between items-start mb-1">
            <div className="flex-1">
              <p className="text-emerald-100 text-xs opacity-80">{formatDate(currentTime)}</p>
              <h1 className="text-xl font-bold mt-0.5">{greeting}, {myProfile?.first_name || user?.email?.split('@')[0] || 'Cleaner'}!</h1>
              <p className="text-emerald-200 text-xs mt-0.5">ID: {myProfile?.employee_code || 'N/A'} · ⭐ {dashboardStats.performanceRating}/5</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleRefresh} className="p-2 rounded-xl bg-white/20"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /></button>
              <button onClick={handleSignOut} className="p-2 rounded-xl bg-white/20"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
          
          {/* Shift & Clock Status */}
          <div className="flex items-center gap-3 mt-3 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs flex items-center gap-1"><Timer className="w-3 h-3" /> {dashboardStats.shiftStatus}</span>
            <span className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 ${stats.isClockedIn ? 'bg-emerald-400/40' : 'bg-white/20'}`}>
              <Clock className="w-3 h-3" /> {stats.isClockedIn ? 'Clocked In' : 'Clocked Out'}
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="px-5 -mt-2">
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Briefcase, label: 'My Jobs', value: allJobs.filter(j => j.status === 'scheduled').length, color: 'from-blue-400 to-blue-500' },
              { icon: Play, label: 'Active', value: allJobs.filter(j => j.status === 'in_progress').length, color: 'from-amber-400 to-amber-500' },
              { icon: CheckCircle2, label: 'Done', value: allJobs.filter(j => j.status === 'completed').length, color: 'from-emerald-400 to-emerald-500' },
              { icon: Umbrella, label: 'Leave', value: `${dashboardStats.leaveBalance.annual}d`, color: 'from-purple-400 to-violet-500' },
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

        {/* Notifications */}
        {dashboardStats.notifications.length > 0 && (
          <div className="px-5 mt-3">
            {dashboardStats.notifications.map(n => (
              <div key={n.id} className="bg-white/15 backdrop-blur rounded-xl p-2 px-3 flex items-center gap-2 mb-1.5">
                <n.icon className={`w-4 h-4 ${n.color}`} />
                <span className="text-white text-xs">{n.text}</span>
              </div>
            ))}
          </div>
        )}

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

        {/* Job Tabs */}
        <div className="px-5 mt-5">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {jobTabs.map(tab => {
              const count = allJobs.filter(j => {
                if (tab.id === 'assigned') return j.status === 'scheduled'
                if (tab.id === 'available') return j.status === 'pending' || j.status === 'scheduled'
                if (tab.id === 'inprogress') return j.status === 'in_progress'
                if (tab.id === 'inspection') return j.status === 'awaiting_inspection'
                if (tab.id === 'completed') return j.status === 'completed'
                return false
              }).length
              return (
                <button key={tab.id} onClick={() => setActiveJobTab(tab.id)}
                  className={`flex-shrink-0 px-3 py-2 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                    activeJobTab === tab.id ? 'bg-white text-emerald-700 shadow-lg' : 'bg-white/20 text-white'
                  }`}>
                  <tab.icon className="w-3.5 h-3.5" /> {tab.label} ({count})
                </button>
              )
            })}
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

        {/* Jobs List */}
        <div className="px-5 mb-4">
          {loadingAllJobs ? (
            <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div></div>
          ) : filteredJobs.length > 0 ? (
            <div className="space-y-2">
              {filteredJobs.map((job, i) => (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`bg-white rounded-2xl p-4 shadow-md ${
                    job.status === 'in_progress' ? 'border-l-4 border-l-amber-400' :
                    job.status === 'awaiting_inspection' ? 'border-l-4 border-l-purple-400' :
                    job.status === 'completed' ? 'border-l-4 border-l-emerald-400' :
                    'border-l-4 border-l-blue-400'
                  }`}>
                  
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{job.title}</h3>
                      <p className="text-xs text-slate-400">{job.job_number} · {job.clients?.company_name || 'Client'}</p>
                      {job.priority && (
                        <span className={`text-[10px] font-medium ${job.priority === 'urgent' ? 'text-red-600' : job.priority === 'high' ? 'text-amber-600' : 'text-slate-500'}`}>
                          {job.priority.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ml-2 ${getStatusBadge(job.status)}`}>
                      {getStatusLabel(job.status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>{job.scheduled_date === todayStr ? 'Today' : formatDateShort(job.scheduled_date)}</span>
                    <span className="mx-1">·</span>
                    <Clock className="w-3 h-3" />{job.scheduled_start_time?.slice(0,5)}-{job.scheduled_end_time?.slice(0,5)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <MapPin className="w-3 h-3" />{job.site_address?.slice(0, 40)}
                  </div>

                  {/* Action Buttons based on status */}
                  <div className="flex gap-2 flex-wrap">
                    {job.status === 'scheduled' || job.status === 'pending' ? (
                      <button onClick={() => handleSelectJob(job.id)} disabled={updatingJob === job.id}
                        className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                        <Play className="w-3.5 h-3.5" /> Claim Job
                      </button>
                    ) : job.status === 'in_progress' ? (
                      <button onClick={() => openJobModal(job)}
                        className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                        <PenTool className="w-3.5 h-3.5" /> Manage Job
                      </button>
                    ) : null}
                    {job.clients?.phone && (
                      <a href={`tel:${job.clients.phone}`} className="py-2.5 px-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white/10 backdrop-blur rounded-2xl">
              <Briefcase className="w-12 h-12 text-white/60 mx-auto mb-2" />
              <p className="text-white font-semibold">No jobs in this category</p>
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUploadPhoto} />

      {/* MANAGE JOB MODAL */}
      <AnimatePresence>
        {showJobModal && modalJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowJobModal(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              
              <div className="sticky top-0 bg-white z-10 p-5 border-b flex justify-between items-center rounded-t-3xl">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{modalJob.title}</h3>
                  <p className="text-xs text-slate-500">{modalJob.job_number} · {modalJob.clients?.company_name || 'Client'}</p>
                </div>
                <button onClick={() => setShowJobModal(false)} className="p-2 rounded-xl bg-slate-100"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-5 space-y-5">
                {/* Job Details */}
                <div className="bg-slate-50 rounded-2xl p-4 space-y-1 text-sm">
                  <p><strong>Address:</strong> {modalJob.site_address}</p>
                  <p><strong>Date:</strong> {formatDateShort(modalJob.scheduled_date)} · {modalJob.scheduled_start_time?.slice(0,5)}-{modalJob.scheduled_end_time?.slice(0,5)}</p>
                  {modalJob.clients?.phone && <p><strong>Contact:</strong> {modalJob.clients.phone}</p>}
                </div>

                {/* Job Actions */}
                <div className="flex gap-2">
                  <button onClick={handleStartJob} disabled={actionLoading}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" /> Start
                  </button>
                  <button onClick={handleCompleteJob} disabled={actionLoading}
                    className="flex-1 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <ClipboardCheck className="w-4 h-4" /> Submit for Inspection
                  </button>
                </div>

                {/* Cleaning Checklist */}
                <div className="bg-emerald-50 rounded-2xl p-4">
                  <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-emerald-600" />Cleaning Checklist</h4>
                  <div className="space-y-2">
                    {checklistItems.map(item => (
                      <button key={item.id} onClick={() => toggleChecklistItem(item.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm font-medium transition-all ${
                          item.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600'
                        }`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${item.completed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                          {item.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Photo */}
                <div className="bg-blue-50 rounded-2xl p-4">
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><Camera className="w-4 h-4 text-blue-600" />Upload Photo</h4>
                  <button onClick={handleTakePhoto} disabled={uploadingPhoto}
                    className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    {uploadingPhoto ? <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading...</> : <><Image className="w-4 h-4" /> Take / Choose Photo</>}
                  </button>
                </div>

                {/* Request Supplies */}
                <div className="bg-purple-50 rounded-2xl p-4">
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><Package className="w-4 h-4 text-purple-600" />Request Supplies</h4>
                  <div className="flex gap-2 mb-2">
                    <select value={supplyItem} onChange={e => setSupplyItem(e.target.value)}
                      className="flex-1 p-2.5 rounded-xl border border-slate-200 text-sm">
                      <option value="">Select item...</option>
                      <option value="Glass Cleaner">Glass Cleaner</option>
                      <option value="Floor Cleaner">Floor Cleaner</option>
                      <option value="Degreaser">Degreaser</option>
                      <option value="Mop">Mop</option>
                      <option value="Broom">Broom</option>
                      <option value="Gloves">Gloves</option>
                      <option value="Refuse Bags">Refuse Bags</option>
                      <option value="Toilet Paper">Toilet Paper</option>
                      <option value="Sanitizer">Sanitizer</option>
                      <option value="Other">Other</option>
                    </select>
                    <input type="number" value={supplyQty} onChange={e => setSupplyQty(parseInt(e.target.value) || 1)}
                      className="w-16 p-2.5 rounded-xl border border-slate-200 text-sm text-center" min="1" />
                  </div>
                  <button onClick={handleRequestSupplies} disabled={actionLoading}
                    className="w-full py-2.5 bg-purple-500 text-white rounded-xl text-sm font-bold"><Send className="w-4 h-4 inline mr-1" /> Send Request</button>
                </div>

                {/* Report Incident */}
                <div className="bg-red-50 rounded-2xl p-4">
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-600" />Report Incident</h4>
                  <select value={incidentType} onChange={e => setIncidentType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm mb-2">
                    <option value="damage">Property Damage</option>
                    <option value="injury">Injury</option>
                    <option value="safety">Safety Hazard</option>
                    <option value="missing_equipment">Missing Equipment</option>
                    <option value="complaint">Client Complaint</option>
                    <option value="other">Other</option>
                  </select>
                  <textarea value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)}
                    placeholder="Describe what happened..." rows={3}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm resize-none mb-2" />
                  <button onClick={handleReportIncident} disabled={actionLoading}
                    className="w-full py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold"><Send className="w-4 h-4 inline mr-1" /> Submit Report</button>
                </div>

                {/* Client Sign-off */}
                <div className="bg-slate-50 rounded-2xl p-4">
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><PenTool className="w-4 h-4 text-slate-600" />Client Sign-off</h4>
                  <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                    placeholder="Client name" className="w-full p-2.5 rounded-xl border border-slate-200 text-sm mb-2" />
                  <input type="text" value={clientSignature} onChange={e => setClientSignature(e.target.value)}
                    placeholder="Client signature / confirmation" className="w-full p-2.5 rounded-xl border border-slate-200 text-sm" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  )
}
