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
  Send, Image
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

  // Modal State
  const [showJobModal, setShowJobModal] = useState(false)
  const [modalJob, setModalJob] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [supplyItem, setSupplyItem] = useState('')
  const [supplyQty, setSupplyQty] = useState(1)
  const [incidentDesc, setIncidentDesc] = useState('')
  const [incidentType, setIncidentType] = useState('damage')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    initData()
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadAllJobs()
  }, [selectedDate])

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
  }

  const setupEmployee = async () => {
    try {
      let { data: emp } = await supabase.from('employees').select('id').eq('user_id', user?.id).single()
      if (emp) { setMyEmployeeId(emp.id); return }

      const { data: empByEmail } = await supabase.from('employees').select('id').eq('email', user?.email).single()
      if (empByEmail) {
        await supabase.from('employees').update({ user_id: user?.id }).eq('id', empByEmail.id)
        setMyEmployeeId(empByEmail.id)
        return
      }

      const nameParts = (profile?.full_name || user?.email?.split('@')[0] || 'Cleaner').split(' ')
      const { data: newEmp } = await supabase.from('employees').insert([{
        user_id: user?.id, first_name: nameParts[0], last_name: nameParts.slice(1).join(' ') || '',
        email: user?.email, employment_status: 'active', employment_type: 'full_time', department: 'Cleaning',
        date_of_hire: new Date().toISOString().split('T')[0]
      }]).select('id').single()

      if (newEmp) setMyEmployeeId(newEmp.id)
    } catch (e) { console.error('Setup error:', e) }
  }

  const loadAllJobs = async () => {
    setLoadingAllJobs(true)
    try {
      // Load ALL jobs except completed, cancelled - INCLUDE on_hold so they can be resumed
      let query = supabase
        .from('jobs')
        .select('id, title, job_number, status, scheduled_date, scheduled_start_time, scheduled_end_time, site_address, site_city, notes, clients(company_name, phone), job_categories(name, color)')
        .not('status', 'in', '(completed,cancelled)')
        .order('scheduled_date', { ascending: true })
        .order('scheduled_start_time', { ascending: true })

      if (selectedDate !== 'all') query = query.eq('scheduled_date', selectedDate)

      const { data: jobs } = await query
      console.log('📋 Jobs loaded:', jobs?.length || 0, 'Statuses:', jobs?.map(j => j.status))
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
    if (!isPulling) return
    const d = e.touches[0].clientY - touchStartY.current
    if (d > 0) setPullDistance(Math.min(d * 0.5, pullThreshold))
  }
  const handleTouchEnd = async () => {
    if (pullDistance >= pullThreshold && !refreshing) await handleRefresh()
    setPullDistance(0); setIsPulling(false)
  }

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  // SELECT JOB
  const handleSelectJob = async (jobId) => {
    if (!myEmployeeId) { toast.error('Profile not ready. Refresh and try again.'); return }
    setUpdatingJob(jobId)
    
    try {
      const cleanerName = myProfile?.first_name || user?.email?.split('@')[0] || 'Cleaner'
      
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'in_progress',
          actual_start_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          notes: `SELECTED BY: ${cleanerName} at ${new Date().toLocaleString()}`
        })
        .eq('id', jobId)

      if (error) { toast.error('Failed to select job'); return }

      toast.success('Job selected! ✅')
      await loadAllJobs()
      
    } catch (error) { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  // OPEN JOB ACTIONS MODAL
  const openJobModal = (job) => {
    if (!job) {
      toast.error('No job selected')
      return
    }
    setModalJob(job)
    setShowJobModal(true)
    setSupplyItem('')
    setSupplyQty(1)
    setIncidentDesc('')
    setIncidentType('damage')
  }

  // START JOB
  const handleStartJob = async () => {
    if (!modalJob) { toast.error('No job selected'); return }
    setActionLoading(true)
    try {
      await supabase.from('jobs').update({ 
        status: 'in_progress', actual_start_time: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', modalJob.id)
      toast.success('Job started! 🚀')
      await loadAllJobs()
      setShowJobModal(false)
    } catch { toast.error('Failed') }
    finally { setActionLoading(false) }
  }

  // COMPLETE JOB
  const handleCompleteJob = async () => {
    if (!modalJob) { toast.error('No job selected'); return }
    if (!window.confirm('Mark as completed? This will send for invoicing.')) return
    setActionLoading(true)
    try {
      await supabase.from('jobs').update({ 
        status: 'completed', actual_end_time: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', modalJob.id)
      toast.success('Completed! Moving to finance ✅')
      await loadAllJobs()
      setShowJobModal(false)
    } catch { toast.error('Failed') }
    finally { setActionLoading(false) }
  }

  // UPLOAD PHOTO for selected job
  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!modalJob) { toast.error('Please select a job first'); return }
    if (!myEmployeeId) { toast.error('Profile not ready'); return }
    
    setUploadingPhoto(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `job-photos/${modalJob.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage.from('fleet').upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('fleet').getPublicUrl(fileName)

      await supabase.from('job_photos').insert([{
        job_id: modalJob.id,
        employee_id: myEmployeeId,
        photo_type: 'before',
        photo_url: publicUrl,
        caption: `Photo for ${modalJob.title}`
      }])

      toast.success('Photo uploaded! 📸')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload photo')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // TAKE PHOTO - Opens file input
  const handleTakePhoto = () => {
    if (!modalJob) { toast.error('Select a job first'); return }
    fileInputRef.current?.click()
  }

  // REQUEST SUPPLIES
  const handleRequestSupplies = async () => {
    if (!modalJob) { toast.error('No job selected'); return }
    if (!supplyItem.trim()) { toast.error('Please enter an item name'); return }
    if (!myEmployeeId) { toast.error('Profile not ready'); return }
    
    setActionLoading(true)
    try {
      const { data: request } = await supabase.from('supplies_requests').insert([{
        employee_id: myEmployeeId,
        job_id: modalJob.id,
        status: 'pending'
      }]).select('id').single()

      if (request) {
        await supabase.from('supplies_request_items').insert([{
          request_id: request.id, item_name: supplyItem, quantity: supplyQty, unit: 'each'
        }])
      }

      toast.success('Supplies requested! 📦')
      setSupplyItem('')
      setSupplyQty(1)
    } catch { toast.error('Failed to request supplies') }
    finally { setActionLoading(false) }
  }

  // REPORT INCIDENT
  const handleReportIncident = async () => {
    if (!modalJob) { toast.error('No job selected'); return }
    if (!incidentDesc.trim()) { toast.error('Please describe the incident'); return }
    if (!myEmployeeId) { toast.error('Profile not ready'); return }
    
    setActionLoading(true)
    try {
      await supabase.from('incident_reports').insert([{
        employee_id: myEmployeeId,
        job_id: modalJob.id,
        incident_type: incidentType,
        description: incidentDesc,
        severity: 'medium',
        status: 'reported'
      }])

      toast.success('Incident reported! 🚨')
      setIncidentDesc('')
      setIncidentType('damage')
    } catch { toast.error('Failed to report incident') }
    finally { setActionLoading(false) }
  }

  const formatTime = (date) => date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (date) => date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
  const formatDateShort = (date) => {
    if (!date) return ''
    const d = new Date(date + 'T00:00:00')
    return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const todayStr = new Date().toISOString().split('T')[0]

  const filteredJobs = allJobs.filter(job => {
    if (!jobSearch) return true
    const s = jobSearch.toLowerCase()
    return (job.title || '').toLowerCase().includes(s) || (job.job_number || '').toLowerCase().includes(s) ||
           (job.clients?.company_name || '').toLowerCase().includes(s) || (job.site_address || '').toLowerCase().includes(s)
  })

  const dateOptions = [{ value: 'all', label: 'All Dates' }, { value: todayStr, label: 'Today' }]
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
              <button onClick={handleRefresh} className="p-2 rounded-xl bg-white/20"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /></button>
              <button onClick={handleSignOut} className="p-2 rounded-xl bg-white/20"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
          <p className="text-5xl font-bold text-center my-3 font-mono tracking-wider">{formatTime(currentTime)}</p>
        </div>

        {/* Stats */}
        <div className="px-5 -mt-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Briefcase, label: 'Jobs', value: allJobs.length, color: 'from-blue-400 to-blue-500' },
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
              { icon: User, label: 'My Profile', path: '/mobile/profile', color: 'from-purple-400 to-violet-500' },
            ].map(action => (
              <button key={action.label} onClick={() => navigate(action.path)}
                className={`bg-gradient-to-r ${action.color} text-white rounded-2xl p-3.5 text-left hover:scale-[1.02] active:scale-95 transition-all shadow-lg`}>
                <action.icon className="w-7 h-7 mb-2" /><span className="text-sm font-bold block">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Jobs Section */}
        <div className="px-5 mt-5 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2"><Briefcase className="w-4 h-4" />Jobs</h2>
            <span className="text-xs text-white/70 bg-white/20 px-2 py-0.5 rounded-full">{filteredJobs.length} jobs</span>
          </div>

          <div className="mb-3 space-y-2">
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
          {loadingAllJobs ? (
            <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div></div>
          ) : filteredJobs.length > 0 ? (
            <div className="space-y-2">
              {filteredJobs.map((job, i) => (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`bg-white rounded-2xl p-4 shadow-md ${job.status === 'in_progress' ? 'border-l-4 border-l-amber-400' : job.status === 'on_hold' ? 'border-l-4 border-l-purple-400' : 'border-l-4 border-l-blue-400'}`}>
                  
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{job.title}</h3>
                      <p className="text-xs text-slate-400">{job.job_number} · {job.clients?.company_name || 'Client'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ml-2 ${
                      job.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                      job.status === 'on_hold' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {job.status === 'in_progress' ? 'Active' : job.status === 'on_hold' ? 'Paused' : 'Open'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>{job.scheduled_date === todayStr ? 'Today' : formatDateShort(job.scheduled_date)}</span>
                    <span className="mx-1">·</span>
                    <Clock className="w-3 h-3" />{job.scheduled_start_time?.slice(0,5)}-{job.scheduled_end_time?.slice(0,5)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3"><MapPin className="w-3 h-3" />{job.site_address?.slice(0, 40)}</div>

                  {/* Action Buttons - Only show for Active jobs or Open jobs */}
                  {job.status === 'in_progress' ? (
                    <div className="space-y-2">
                      <button onClick={() => openJobModal(job)}
                        className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 shadow-sm">
                        <Play className="w-4 h-4" /> Manage Job
                      </button>
                    </div>
                  ) : job.status === 'on_hold' ? (
                    <button onClick={() => handleSelectJob(job.id)} disabled={updatingJob === job.id}
                      className="w-full py-2.5 bg-purple-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm">
                      <Play className="w-4 h-4" /> Resume Job
                    </button>
                  ) : (
                    <button onClick={() => handleSelectJob(job.id)} disabled={updatingJob === job.id}
                      className="w-full py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm">
                      <Play className="w-4 h-4" /> Select Job
                    </button>
                  )}

                  {job.clients?.phone && (
                    <a href={`tel:${job.clients.phone}`} className="mt-2 text-xs text-emerald-600 flex items-center gap-1 bg-emerald-50 rounded-lg px-2 py-1 w-fit">
                      📞 {job.clients.company_name?.split(' ')[0]}
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white/10 backdrop-blur rounded-2xl">
              <Briefcase className="w-12 h-12 text-white/60 mx-auto mb-2" />
              <p className="text-white font-semibold">No jobs available</p>
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>

      {/* Hidden file input for photo upload */}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUploadPhoto} />

      {/* JOB MANAGEMENT MODAL */}
      <AnimatePresence>
        {showJobModal && modalJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowJobModal(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="sticky top-0 bg-white z-10 p-5 border-b flex justify-between items-center rounded-t-3xl">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{modalJob.title}</h3>
                  <p className="text-xs text-slate-500">{modalJob.job_number} · {modalJob.clients?.company_name || 'Client'}</p>
                </div>
                <button onClick={() => setShowJobModal(false)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200"><X className="w-5 h-5" /></button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-5">
                {/* Job Actions */}
                <div className="flex gap-2">
                  <button onClick={handleStartJob} disabled={actionLoading}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-600">
                    <Play className="w-4 h-4" /> Start
                  </button>
                  <button onClick={handleCompleteJob} disabled={actionLoading}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700">
                    <CheckCircle2 className="w-4 h-4" /> Complete
                  </button>
                </div>

                {/* Upload Photo */}
                <div className="bg-blue-50 rounded-2xl p-4">
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><Camera className="w-4 h-4 text-blue-600" />Upload Photo</h4>
                  <p className="text-xs text-slate-500 mb-3">Take a photo of the job site</p>
                  <button onClick={handleTakePhoto} disabled={uploadingPhoto}
                    className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-50">
                    {uploadingPhoto ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading...</>
                    ) : (
                      <><Image className="w-4 h-4" /> Take / Choose Photo</>
                    )}
                  </button>
                </div>

                {/* Request Supplies */}
                <div className="bg-purple-50 rounded-2xl p-4">
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><Package className="w-4 h-4 text-purple-600" />Request Supplies</h4>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={supplyItem} onChange={e => setSupplyItem(e.target.value)}
                      placeholder="Item name..." className="flex-1 p-2.5 rounded-xl border border-slate-200 text-sm" />
                    <input type="number" value={supplyQty} onChange={e => setSupplyQty(parseInt(e.target.value) || 1)}
                      className="w-16 p-2.5 rounded-xl border border-slate-200 text-sm text-center" min="1" />
                  </div>
                  <button onClick={handleRequestSupplies} disabled={actionLoading}
                    className="w-full py-2.5 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-600 disabled:opacity-50">
                    <Send className="w-4 h-4 inline mr-1" /> Send Request
                  </button>
                </div>

                {/* Report Incident */}
                <div className="bg-red-50 rounded-2xl p-4">
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-600" />Report Incident</h4>
                  <select value={incidentType} onChange={e => setIncidentType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm mb-2">
                    <option value="damage">Damage</option>
                    <option value="injury">Injury</option>
                    <option value="complaint">Complaint</option>
                    <option value="security">Security</option>
                    <option value="other">Other</option>
                  </select>
                  <textarea value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)}
                    placeholder="Describe what happened..." rows={3}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm resize-none mb-2" />
                  <button onClick={handleReportIncident} disabled={actionLoading}
                    className="w-full py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                    <Send className="w-4 h-4 inline mr-1" /> Submit Report
                  </button>
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
