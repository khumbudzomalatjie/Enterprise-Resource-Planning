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
  Play, Pause, RefreshCw, ChevronDown,
  Calendar, Search, User, Upload, X,
  Send, Image, ClipboardCheck, PenTool,
  Phone, Navigation, Timer, Umbrella,
  Bell, Star, FileText, Shield, MessageCircle,
  History, AlertTriangle, Ban, Eye, Download,
  TrendingUp
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

  const [allJobs, setAllJobs] = useState([])
  const [loadingAllJobs, setLoadingAllJobs] = useState(false)
  const [jobSearch, setJobSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState('all')
  const [myEmployeeId, setMyEmployeeId] = useState(null)
  const [activeJobTab, setActiveJobTab] = useState('myjobs')

  const [showJobModal, setShowJobModal] = useState(false)
  const [modalJob, setModalJob] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoType, setPhotoType] = useState('before')
  const [supplyItem, setSupplyItem] = useState('')
  const [supplyQty, setSupplyQty] = useState(1)
  const [incidentDesc, setIncidentDesc] = useState('')
  const [incidentType, setIncidentType] = useState('damage')
  const [actionLoading, setActionLoading] = useState(false)
  const [checklistItems, setChecklistItems] = useState([])
  const [clientSignature, setClientSignature] = useState('')
  const [clientName, setClientName] = useState('')
  const [jobNotes, setJobNotes] = useState('')

  const [dashboardStats, setDashboardStats] = useState({
    leaveBalance: { annual: 18, sick: 10, personal: 3 },
    notifications: [],
    shiftStatus: '7:30 AM - 3:30 PM',
    performanceRating: 4.5,
    completedToday: 0,
    activeJobs: 0,
    openJobs: 0,
    inspectionJobs: 0,
    attendanceRate: 98,
    monthlyPayroll: '$2,450'
  })

  const checklistTemplate = [
    { id: 1, label: 'Floors Swept', required: true },
    { id: 2, label: 'Floors Mopped', required: true },
    { id: 3, label: 'Vacuum Completed', required: false },
    { id: 4, label: 'Bathrooms Sanitized', required: true },
    { id: 5, label: 'Kitchen Cleaned', required: false },
    { id: 6, label: 'Bins Emptied', required: true },
    { id: 7, label: 'Windows Cleaned', required: false },
    { id: 8, label: 'Final Inspection Done', required: true },
  ]

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
    if (profile?.id) { await fetchMobileStats(profile.id); await fetchMyJobs(profile.id) }
    await setupEmployee()
    updateDashboardStats()
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
        email: user?.email, employment_status: 'active', department: 'Cleaning', date_of_hire: new Date().toISOString().split('T')[0]
      }]).select('id').single()
      if (newEmp) setMyEmployeeId(newEmp.id)
    } catch (e) {}
  }

  const updateDashboardStats = () => {
    const today = new Date().toISOString().split('T')[0]
    setDashboardStats(prev => ({
      ...prev,
      completedToday: allJobs.filter(j => j.status === 'completed' && j.scheduled_date === today).length,
      activeJobs: allJobs.filter(j => j.status === 'in_progress').length,
      openJobs: allJobs.filter(j => j.status === 'scheduled' || j.status === 'pending').length,
      inspectionJobs: allJobs.filter(j => j.status === 'awaiting_inspection').length,
      notifications: [
        { id: 1, text: `${allJobs.filter(j => j.status === 'in_progress').length} jobs in progress`, icon: Play, color: 'text-amber-500' },
        { id: 2, text: `${allJobs.filter(j => j.status === 'scheduled').length} jobs scheduled today`, icon: Calendar, color: 'text-blue-500' },
        { id: 3, text: `Attendance: ${prev.attendanceRate}% this month`, icon: TrendingUp, color: 'text-emerald-500' },
      ]
    }))
  }

  const loadAllJobs = async () => {
    setLoadingAllJobs(true)
    try {
      let query = supabase
        .from('jobs')
        .select('id, title, job_number, status, scheduled_date, scheduled_start_time, scheduled_end_time, site_address, site_city, notes, priority, clients(company_name, phone), job_categories(name, color)')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_start_time', { ascending: true })

      if (activeJobTab === 'myjobs') query = query.in('status', ['scheduled', 'pending'])
      else if (activeJobTab === 'openjobs') query = query.in('status', ['pending', 'scheduled'])
      else if (activeJobTab === 'inprogress') query = query.eq('status', 'in_progress')
      else if (activeJobTab === 'inspection') query = query.eq('status', 'awaiting_inspection')
      else if (activeJobTab === 'completed') query = query.eq('status', 'completed')

      if (selectedDate !== 'all') query = query.eq('scheduled_date', selectedDate)

      const { data: jobs } = await query
      setAllJobs(jobs || [])
      setTimeout(() => updateDashboardStats(), 100)
    } catch (error) { console.error('Error:', error) }
    finally { setLoadingAllJobs(false) }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await initData()
    await loadAllJobs()
    setTimeout(() => setRefreshing(false), 500)
  }

  const handleTouchStart = (e) => { if (scrollRef.current?.scrollTop === 0) { touchStartY.current = e.touches[0].clientY; setIsPulling(true) } }
  const handleTouchMove = (e) => { if (!isPulling) return; const d = e.touches[0].clientY - touchStartY.current; if (d > 0) setPullDistance(Math.min(d * 0.5, pullThreshold)) }
  const handleTouchEnd = async () => { if (pullDistance >= pullThreshold && !refreshing) await handleRefresh(); setPullDistance(0); setIsPulling(false) }
  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const handleSelectJob = async (jobId) => {
    if (!myEmployeeId) { toast.error('Profile not ready'); return }
    setUpdatingJob(jobId)
    try {
      await supabase.from('jobs').update({ status: 'in_progress', actual_start_time: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', jobId)
      toast.success('Job claimed! ✅'); await loadAllJobs()
    } catch { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  const handleUpdateJobStatus = async (jobId, newStatus) => {
    setUpdatingJob(jobId)
    try {
      const updates = { status: newStatus, updated_at: new Date().toISOString() }
      if (newStatus === 'in_progress') updates.actual_start_time = new Date().toISOString()
      if (newStatus === 'awaiting_inspection') updates.actual_end_time = new Date().toISOString()
      await supabase.from('jobs').update(updates).eq('id', jobId)
      toast.success(`Status: ${newStatus.replace('_', ' ')}`); await loadAllJobs()
    } catch { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  const openJobModal = (job) => {
    if (!job) { toast.error('No job selected'); return }
    setModalJob(job); setShowJobModal(true)
    setSupplyItem(''); setSupplyQty(1); setIncidentDesc(''); setIncidentType('damage')
    setClientSignature(''); setClientName(''); setJobNotes(job.notes || '')
    setPhotoType('before')
    setChecklistItems(checklistTemplate.map(c => ({ ...c, completed: false })))
  }

  const handleStartJob = async () => {
    if (!modalJob) return; setActionLoading(true)
    try {
      await supabase.from('jobs').update({ status: 'in_progress', actual_start_time: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', modalJob.id)
      toast.success('Job started! 🚀'); await loadAllJobs(); setShowJobModal(false)
    } catch { toast.error('Failed') } finally { setActionLoading(false) }
  }

  const handlePauseJob = async () => {
    if (!modalJob) return; setActionLoading(true)
    try {
      await supabase.from('jobs').update({ status: 'on_hold', updated_at: new Date().toISOString() }).eq('id', modalJob.id)
      toast.success('Job paused ⏸️'); await loadAllJobs()
    } catch { toast.error('Failed') } finally { setActionLoading(false) }
  }

  const handleResumeJob = async () => {
    if (!modalJob) return; setActionLoading(true)
    try {
      await supabase.from('jobs').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', modalJob.id)
      toast.success('Job resumed ▶️'); await loadAllJobs()
    } catch { toast.error('Failed') } finally { setActionLoading(false) }
  }

  const handleSubmitForInspection = async () => {
    if (!modalJob) return
    const requiredIncomplete = checklistItems.filter(c => c.required && !c.completed)
    if (requiredIncomplete.length > 0) {
      toast.error(`Complete required items: ${requiredIncomplete.map(c => c.label).join(', ')}`)
      return
    }
    if (!window.confirm('Submit for inspection?')) return
    setActionLoading(true)
    try {
      const notesUpdate = [
        modalJob.notes, jobNotes ? `NOTES: ${jobNotes}` : '',
        clientName ? `CLIENT: ${clientName}` : '', clientSignature ? `SIGNED: ${clientSignature}` : ''
      ].filter(Boolean).join(' | ')
      await supabase.from('jobs').update({ 
        status: 'awaiting_inspection', actual_end_time: new Date().toISOString(), updated_at: new Date().toISOString(), notes: notesUpdate
      }).eq('id', modalJob.id)
      toast.success('Submitted for inspection! ✅'); await loadAllJobs(); setShowJobModal(false)
    } catch { toast.error('Failed') } finally { setActionLoading(false) }
  }

  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !modalJob || !myEmployeeId) return
    setUploadingPhoto(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `job-photos/${modalJob.id}/${photoType}-${Date.now()}.${fileExt}`
      await supabase.storage.from('fleet').upload(fileName, file, { upsert: true })
      const { data: { publicUrl } } = supabase.storage.from('fleet').getPublicUrl(fileName)
      await supabase.from('job_photos').insert([{ job_id: modalJob.id, employee_id: myEmployeeId, photo_type: photoType, photo_url: publicUrl }])
      toast.success(`${photoType} photo uploaded! 📸`)
    } catch { toast.error('Failed') }
    finally { setUploadingPhoto(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const handleTakePhoto = (type) => { if (!modalJob) { toast.error('Select a job first'); return }; setPhotoType(type); fileInputRef.current?.click() }

  const handleRequestSupplies = async () => {
    if (!modalJob || !supplyItem.trim() || !myEmployeeId) { toast.error('Fill all fields'); return }
    setActionLoading(true)
    try {
      const { data: request } = await supabase.from('supplies_requests').insert([{ employee_id: myEmployeeId, job_id: modalJob.id, status: 'pending' }]).select('id').single()
      if (request) await supabase.from('supplies_request_items').insert([{ request_id: request.id, item_name: supplyItem, quantity: supplyQty, unit: 'each' }])
      toast.success('Supplies requested! 📦'); setSupplyItem(''); setSupplyQty(1)
    } catch { toast.error('Failed') } finally { setActionLoading(false) }
  }

  const handleReportIncident = async () => {
    if (!modalJob || !incidentDesc.trim() || !myEmployeeId) { toast.error('Describe the incident'); return }
    setActionLoading(true)
    try {
      await supabase.from('incident_reports').insert([{ employee_id: myEmployeeId, job_id: modalJob.id, incident_type: incidentType, description: incidentDesc, severity: 'medium', status: 'reported' }])
      toast.success('Incident reported! 🚨'); setIncidentDesc(''); setIncidentType('damage')
    } catch { toast.error('Failed') } finally { setActionLoading(false) }
  }

  const toggleChecklistItem = (id) => { setChecklistItems(checklistItems.map(c => c.id === id ? { ...c, completed: !c.completed } : c)) }

  const formatTime = (date) => date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (date) => date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
  const formatDateShort = (date) => { if (!date) return ''; const d = new Date(date + 'T00:00:00'); return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }) }
  const todayStr = new Date().toISOString().split('T')[0]

  const filteredJobs = allJobs.filter(job => {
    if (!jobSearch) return true
    const s = jobSearch.toLowerCase()
    return (job.title || '').toLowerCase().includes(s) || (job.job_number || '').toLowerCase().includes(s) || (job.clients?.company_name || '').toLowerCase().includes(s) || (job.site_address || '').toLowerCase().includes(s)
  })

  const dateOptions = [{ value: 'all', label: 'All' }, { value: todayStr, label: 'Today' }]
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  dateOptions.push({ value: tomorrow.toISOString().split('T')[0], label: 'Tomorrow' })

  const jobTabs = [
    { id: 'myjobs', label: 'My Jobs', icon: User, count: allJobs.filter(j => j.status === 'scheduled' || j.status === 'pending').length },
    { id: 'openjobs', label: 'Open', icon: Briefcase, count: allJobs.filter(j => j.status === 'pending' || j.status === 'scheduled').length },
    { id: 'inprogress', label: 'Active', icon: Play, count: allJobs.filter(j => j.status === 'in_progress').length },
    { id: 'inspection', label: 'Inspection', icon: ClipboardCheck, count: allJobs.filter(j => j.status === 'awaiting_inspection').length },
    { id: 'completed', label: 'Done', icon: CheckCircle2, count: allJobs.filter(j => j.status === 'completed').length },
  ]

  const getStatusBadge = (s) => {
    const b = { pending:'bg-blue-100 text-blue-700', scheduled:'bg-blue-100 text-blue-700', in_progress:'bg-amber-100 text-amber-700', awaiting_inspection:'bg-purple-100 text-purple-700', completed:'bg-emerald-100 text-emerald-700', on_hold:'bg-slate-100 text-slate-600', cancelled:'bg-red-100 text-red-700' }
    return b[s] || 'bg-slate-100 text-slate-600'
  }
  const getStatusLabel = (s) => {
    const l = { pending:'Open', scheduled:'Scheduled', in_progress:'Active', awaiting_inspection:'Inspection', completed:'Done', on_hold:'Paused', cancelled:'Cancelled' }
    return l[s] || s?.replace('_',' ') || 'Unknown'
  }

  return (
    <div className="min-h-screen bg-[#e9edf2] font-['Inter'] pb-20" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <AnimatePresence>
        {(pullDistance > 20 || refreshing) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: pullDistance > 20 ? pullDistance : refreshing ? 50 : 0, opacity: 1 }} className="flex items-center justify-center text-[#5e6f82] overflow-hidden">
            {refreshing ? <RefreshCw className="w-5 h-5 animate-spin" /> : pullDistance >= pullThreshold ? <span className="text-sm font-medium">Release to refresh</span> : <ChevronDown className="w-5 h-5" />}
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={scrollRef} className="overflow-y-auto px-3 pt-4 pb-2 flex flex-col gap-4" style={{ maxHeight: 'calc(100vh - 64px)' }}>
        
        {/* Welcome Card */}
        <div className="bg-[#eef1f6] rounded-[24px] shadow-[8px_8px_16px_#bcc3cf,-8px_-8px_16px_#ffffff] p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-[#2e3b4e] text-lg font-bold">{greeting}, {myProfile?.first_name || user?.email?.split('@')[0] || 'Cleaner'}</h3>
              <p className="text-[#5e6f82] text-xs">ID: {myProfile?.employee_code || 'N/A'} · ⭐ {dashboardStats.performanceRating}/5</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleRefresh} className="bg-[#eef1f6] rounded-[18px] p-2 shadow-[3px_3px_6px_#bcc3cf,-3px_-3px_6px_#ffffff]"><RefreshCw className={`w-4 h-4 text-[#5f7d9c] ${refreshing ? 'animate-spin' : ''}`} /></button>
              <button onClick={handleSignOut} className="bg-[#eef1f6] rounded-[18px] p-2 shadow-[3px_3px_6px_#bcc3cf,-3px_-3px_6px_#ffffff]"><LogOut className="w-4 h-4 text-[#c15b5b]" /></button>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="bg-[#e9edf2] rounded-[30px] px-3 py-1 text-xs shadow-[inset_2px_2px_5px_#bcc3cf,inset_-2px_-2px_5px_#ffffff] flex items-center gap-1"><Timer className="w-3 h-3" /> {dashboardStats.shiftStatus}</span>
            <span className={`rounded-[30px] px-3 py-1 text-xs shadow-[inset_2px_2px_5px_#bcc3cf,inset_-2px_-2px_5px_#ffffff] flex items-center gap-1 ${stats.isClockedIn ? 'bg-[#d4edda] text-[#2d6a4f]' : 'bg-[#e9edf2] text-[#5e6f82]'}`}>
              <Clock className="w-3 h-3" /> {stats.isClockedIn ? 'Clocked In' : 'Clocked Out'}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Briefcase, label: 'My Jobs', value: allJobs.filter(j => j.status === 'scheduled').length },
            { icon: Play, label: 'Active', value: allJobs.filter(j => j.status === 'in_progress').length },
            { icon: CheckCircle2, label: 'Done', value: dashboardStats.completedToday },
            { icon: Umbrella, label: 'Leave', value: `${dashboardStats.leaveBalance.annual}d` },
          ].map((s, i) => (
            <div key={s.label} className="bg-[#eef1f6] rounded-[18px] p-3 text-center shadow-[4px_4px_8px_#bcc3cf,-2px_-2px_6px_#ffffff]">
              <s.icon className="w-5 h-5 mx-auto mb-1 text-[#5f7d9c]" />
              <p className="text-lg font-bold text-[#2e3b4e]">{s.value}</p>
              <p className="text-[10px] text-[#5e6f82]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Notifications */}
        {dashboardStats.notifications.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {dashboardStats.notifications.map(n => (
              <div key={n.id} className="bg-[#e9edf2] rounded-[14px] p-2.5 flex items-center gap-2 shadow-[inset_2px_2px_5px_#bcc3cf,inset_-2px_-2px_5px_#ffffff]">
                <n.icon className={`w-4 h-4 ${n.color}`} /><span className="text-[#2e3b4e] text-xs">{n.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Clock, label: 'Clock In/Out', path: '/mobile/clock' },
            { icon: Camera, label: 'Job Photos', path: '/mobile/photos' },
            { icon: Package, label: 'Supplies', path: '/mobile/supplies' },
            { icon: AlertCircle, label: 'Incident', path: '/mobile/incident' },
          ].map(action => (
            <button key={action.label} onClick={() => navigate(action.path)}
              className="bg-[#eef1f6] rounded-[40px] py-3.5 px-4 font-semibold text-[#2e3b4e] shadow-[6px_6px_12px_#bcc3cf,-4px_-4px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] active:scale-[0.97] flex items-center gap-2 text-sm">
              <action.icon className="w-5 h-5 text-[#5f7d9c]" />{action.label}
            </button>
          ))}
        </div>

        {/* Job Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {jobTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveJobTab(tab.id)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-[30px] text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeJobTab === tab.id ? 'bg-[#5f7d9c] text-white shadow-[inset_3px_3px_6px_#3e5268,inset_-3px_-3px_6px_#7a94ae]' : 'bg-[#eef1f6] text-[#2e3b4e] shadow-[4px_4px_8px_#bcc3cf,-2px_-2px_6px_#ffffff]'
              }`}><tab.icon className="w-3.5 h-3.5" />{tab.label} ({tab.count})</button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5e6f82]" />
          <input type="text" value={jobSearch} onChange={e => setJobSearch(e.target.value)}
            placeholder="Search jobs..." className="w-full pl-10 pr-4 py-3.5 rounded-[40px] bg-[#e9edf2] text-[#2e3b4e] shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] text-sm outline-none" />
        </div>

        {/* Date Filter */}
        <div className="flex gap-2 overflow-x-auto">
          {dateOptions.map(opt => (
            <button key={opt.value} onClick={() => setSelectedDate(opt.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-[30px] text-[11px] font-medium ${selectedDate === opt.value ? 'bg-[#5f7d9c] text-white shadow-[inset_2px_2px_5px_#3e5268]' : 'bg-[#eef1f6] text-[#2e3b4e] shadow-[2px_2px_5px_#bcc3cf]'}`}>{opt.label}</button>
          ))}
        </div>

        {/* Jobs List */}
        {loadingAllJobs ? (
          <div className="text-center py-8"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#5f7d9c]" /></div>
        ) : filteredJobs.length > 0 ? (
          <div className="flex flex-col gap-3">
            {filteredJobs.map((job, i) => (
              <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={`bg-[#eef1f6] rounded-[24px] p-4 shadow-[8px_8px_16px_#bcc3cf,-8px_-8px_16px_#ffffff] border-l-4 ${
                  job.status === 'in_progress' ? 'border-l-amber-400' : job.status === 'awaiting_inspection' ? 'border-l-purple-400' : job.status === 'completed' ? 'border-l-emerald-400' : 'border-l-blue-400'
                }`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#2e3b4e] text-sm">{job.title}</h3>
                    <p className="text-xs text-[#5e6f82]">{job.job_number} · {job.clients?.company_name || 'Client'}</p>
                    {job.priority === 'urgent' && <span className="text-[10px] text-red-500 font-bold">⚠ URGENT</span>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-[30px] text-[10px] font-semibold ${getStatusBadge(job.status)}`}>{getStatusLabel(job.status)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#5e6f82] mb-2">
                  <Calendar className="w-3 h-3" /><span>{job.scheduled_date === todayStr ? 'Today' : formatDateShort(job.scheduled_date)}</span>
                  <span className="mx-1">·</span><Clock className="w-3 h-3" />{job.scheduled_start_time?.slice(0,5)}-{job.scheduled_end_time?.slice(0,5)}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#5e6f82] mb-3"><MapPin className="w-3 h-3" />{job.site_address?.slice(0, 40)}</div>
                <div className="flex gap-2">
                  {(job.status === 'scheduled' || job.status === 'pending') ? (
                    <button onClick={() => handleSelectJob(job.id)} disabled={updatingJob === job.id}
                      className="flex-1 py-2.5 bg-[#4b9b6b] text-white rounded-[40px] text-xs font-bold flex items-center justify-center gap-1.5 shadow-[4px_4px_8px_#bcc3cf] active:scale-95"><Play className="w-3.5 h-3.5" />Claim Job</button>
                  ) : job.status === 'in_progress' ? (
                    <button onClick={() => openJobModal(job)}
                      className="flex-1 py-2.5 bg-[#c99f4b] text-white rounded-[40px] text-xs font-bold flex items-center justify-center gap-1.5 shadow-[4px_4px_8px_#bcc3cf] active:scale-95"><PenTool className="w-3.5 h-3.5" />Manage Job</button>
                  ) : job.status === 'awaiting_inspection' ? (
                    <span className="flex-1 py-2.5 bg-purple-100 text-purple-700 rounded-[40px] text-xs font-bold flex items-center justify-center">Awaiting Review</span>
                  ) : null}
                  {job.clients?.phone && <a href={`tel:${job.clients.phone}`} className="py-2.5 px-3 bg-blue-50 text-blue-700 rounded-[40px] text-xs font-bold flex items-center gap-1"><Phone className="w-3.5 h-3.5" /></a>}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-[#eef1f6] rounded-[24px] p-8 text-center shadow-[8px_8px_16px_#bcc3cf,-8px_-8px_16px_#ffffff]">
            <Briefcase className="w-12 h-12 text-[#bcc3cf] mx-auto mb-2" /><p className="text-[#5e6f82]">No jobs in this category</p>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUploadPhoto} />

      {/* MANAGE JOB MODAL */}
      <AnimatePresence>
        {showJobModal && modalJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowJobModal(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              className="bg-[#e9edf2] rounded-t-[36px] sm:rounded-[36px] w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-[18px_18px_30px_#00000030]"
              onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-[#e9edf2] z-10 p-5 flex justify-between items-center rounded-t-[36px]">
                <div><h3 className="font-bold text-lg text-[#2e3b4e]">{modalJob.title}</h3><p className="text-xs text-[#5e6f82]">{modalJob.job_number} · {modalJob.clients?.company_name || 'Client'}</p></div>
                <button onClick={() => setShowJobModal(false)} className="bg-[#eef1f6] rounded-[18px] p-2 shadow-[3px_3px_6px_#bcc3cf,-3px_-3px_6px_#ffffff]"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 flex flex-col gap-4">
                {/* Job Info */}
                <div className="bg-[#eef1f6] rounded-[18px] p-4 shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] text-sm text-[#2e3b4e]">
                  <p><strong>Address:</strong> {modalJob.site_address}</p>
                  <p><strong>Date:</strong> {formatDateShort(modalJob.scheduled_date)} · {modalJob.scheduled_start_time?.slice(0,5)}-{modalJob.scheduled_end_time?.slice(0,5)}</p>
                  {modalJob.clients?.phone && <p><strong>Contact:</strong> {modalJob.clients.phone}</p>}
                </div>

                {/* Job Actions */}
                <div className="flex gap-2">
                  <button onClick={handleStartJob} disabled={actionLoading}
                    className="flex-1 py-3 bg-[#5f7d9c] text-white rounded-[40px] text-sm font-bold shadow-[6px_6px_12px_#bcc3cf] active:scale-95 flex items-center justify-center gap-2"><Play className="w-4 h-4" />Start</button>
                  <button onClick={handlePauseJob} disabled={actionLoading}
                    className="flex-1 py-3 bg-[#c99f4b] text-white rounded-[40px] text-sm font-bold shadow-[6px_6px_12px_#bcc3cf] active:scale-95 flex items-center justify-center gap-2"><Pause className="w-4 h-4" />Pause</button>
                </div>

                {/* Cleaning Checklist */}
                <div className="bg-[#eef1f6] rounded-[24px] p-4 shadow-[8px_8px_16px_#bcc3cf,-8px_-8px_16px_#ffffff]">
                  <h4 className="font-semibold text-[#2e3b4e] mb-3 flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-[#4b9b6b]" />Cleaning Checklist</h4>
                  <div className="flex flex-col gap-2">
                    {checklistItems.map(item => (
                      <button key={item.id} onClick={() => toggleChecklistItem(item.id)}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-[14px] text-sm font-medium transition-all ${
                          item.completed ? 'bg-[#d4edda] text-[#2d6a4f]' : 'bg-[#e9edf2] text-[#2e3b4e] shadow-[inset_2px_2px_5px_#bcc3cf,inset_-2px_-2px_5px_#ffffff]'
                        }`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${item.completed ? 'border-[#4b9b6b] bg-[#4b9b6b]' : 'border-[#bcc3cf]'}`}>
                          {item.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        {item.label} {item.required && <span className="text-red-400 text-xs">*</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photos */}
                <div className="bg-[#eef1f6] rounded-[24px] p-4 shadow-[8px_8px_16px_#bcc3cf,-8px_-8px_16px_#ffffff]">
                  <h4 className="font-semibold text-[#2e3b4e] mb-3 flex items-center gap-2"><Camera className="w-4 h-4 text-[#5f7d9c]" />Job Photos</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: 'before', label: 'Before', color: 'bg-blue-100 text-blue-700' },
                      { type: 'progress', label: 'During', color: 'bg-amber-100 text-amber-700' },
                      { type: 'after', label: 'After', color: 'bg-emerald-100 text-emerald-700' },
                    ].map(p => (
                      <button key={p.type} onClick={() => handleTakePhoto(p.type)} disabled={uploadingPhoto}
                        className={`py-3 rounded-[18px] text-xs font-bold flex flex-col items-center gap-1 ${p.color} shadow-[4px_4px_8px_#bcc3cf] active:scale-95`}>
                        <Image className="w-5 h-5" />{p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Supplies */}
                <div className="bg-[#eef1f6] rounded-[24px] p-4 shadow-[8px_8px_16px_#bcc3cf,-8px_-8px_16px_#ffffff]">
                  <h4 className="font-semibold text-[#2e3b4e] mb-3 flex items-center gap-2"><Package className="w-4 h-4 text-purple-600" />Request Supplies</h4>
                  <div className="flex gap-2 mb-2">
                    <select value={supplyItem} onChange={e => setSupplyItem(e.target.value)}
                      className="flex-1 p-3 rounded-[40px] bg-[#e9edf2] text-[#2e3b4e] shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] text-sm outline-none">
                      <option value="">Select item...</option>
                      <option>Glass Cleaner</option><option>Floor Cleaner</option><option>Degreaser</option>
                      <option>Mop</option><option>Broom</option><option>Gloves</option>
                      <option>Refuse Bags</option><option>Toilet Paper</option><option>Sanitizer</option><option>Other</option>
                    </select>
                    <input type="number" value={supplyQty} onChange={e => setSupplyQty(parseInt(e.target.value) || 1)}
                      className="w-16 p-3 rounded-[40px] bg-[#e9edf2] text-center text-sm shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] outline-none" min="1" />
                  </div>
                  <button onClick={handleRequestSupplies} disabled={actionLoading}
                    className="w-full py-3 bg-purple-500 text-white rounded-[40px] text-sm font-bold shadow-[6px_6px_12px_#bcc3cf] active:scale-95"><Send className="w-4 h-4 inline mr-1" />Send Request</button>
                </div>

                {/* Incident */}
                <div className="bg-[#eef1f6] rounded-[24px] p-4 shadow-[8px_8px_16px_#bcc3cf,-8px_-8px_16px_#ffffff]">
                  <h4 className="font-semibold text-[#2e3b4e] mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-[#c15b5b]" />Report Incident</h4>
                  <select value={incidentType} onChange={e => setIncidentType(e.target.value)}
                    className="w-full p-3 rounded-[40px] bg-[#e9edf2] text-[#2e3b4e] shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] text-sm mb-2 outline-none">
                    <option value="damage">Property Damage</option><option value="injury">Injury</option>
                    <option value="safety">Safety Hazard</option><option value="missing_equipment">Missing Equipment</option>
                    <option value="complaint">Client Complaint</option><option value="other">Other</option>
                  </select>
                  <textarea value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)} placeholder="Describe..." rows={2}
                    className="w-full p-3 rounded-[18px] bg-[#e9edf2] text-[#2e3b4e] shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] text-sm resize-none mb-2 outline-none" />
                  <button onClick={handleReportIncident} disabled={actionLoading}
                    className="w-full py-3 bg-[#c15b5b] text-white rounded-[40px] text-sm font-bold shadow-[6px_6px_12px_#bcc3cf] active:scale-95"><Send className="w-4 h-4 inline mr-1" />Submit Report</button>
                </div>

                {/* Job Notes */}
                <div className="bg-[#eef1f6] rounded-[24px] p-4 shadow-[8px_8px_16px_#bcc3cf,-8px_-8px_16px_#ffffff]">
                  <h4 className="font-semibold text-[#2e3b4e] mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-[#5f7d9c]" />Job Notes</h4>
                  <textarea value={jobNotes} onChange={e => setJobNotes(e.target.value)} placeholder="Add notes about this job..." rows={2}
                    className="w-full p-3 rounded-[18px] bg-[#e9edf2] text-[#2e3b4e] shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] text-sm resize-none outline-none" />
                </div>

                {/* Client Sign-off */}
                <div className="bg-[#eef1f6] rounded-[24px] p-4 shadow-[8px_8px_16px_#bcc3cf,-8px_-8px_16px_#ffffff]">
                  <h4 className="font-semibold text-[#2e3b4e] mb-2 flex items-center gap-2"><PenTool className="w-4 h-4 text-[#5f7d9c]" />Client Sign-off</h4>
                  <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name"
                    className="w-full p-3 rounded-[40px] bg-[#e9edf2] text-[#2e3b4e] shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] text-sm mb-2 outline-none" />
                  <input type="text" value={clientSignature} onChange={e => setClientSignature(e.target.value)} placeholder="Signature / confirmation"
                    className="w-full p-3 rounded-[40px] bg-[#e9edf2] text-[#2e3b4e] shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] text-sm outline-none" />
                </div>

                {/* Submit */}
                <button onClick={handleSubmitForInspection} disabled={actionLoading}
                  className="w-full py-4 bg-gradient-to-b from-[#6a8baa] to-[#5a7795] text-white rounded-[40px] text-base font-bold shadow-[6px_6px_14px_#bcc3cf,-4px_-4px_12px_#ffffff] active:scale-95 flex items-center justify-center gap-2">
                  <ClipboardCheck className="w-5 h-5" />Submit for Inspection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  )
}
