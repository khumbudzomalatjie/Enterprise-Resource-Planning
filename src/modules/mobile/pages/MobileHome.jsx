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
  Calendar, Search, User, Upload, X
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

  // Selected Job Actions Modal
  const [selectedJob, setSelectedJob] = useState(null)
  const [showJobActions, setShowJobActions] = useState(false)
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

  // Find or create employee record - SYNC WITH HR
  const setupEmployee = async () => {
    try {
      // Try by user_id first
      let { data: emp } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (emp) {
        // Sync profile data with HR
        if (profile?.full_name && (!emp.first_name || emp.first_name === 'Cleaner')) {
          const nameParts = profile.full_name.split(' ')
          await supabase.from('employees').update({
            first_name: nameParts[0],
            last_name: nameParts.slice(1).join(' ') || '',
            updated_at: new Date().toISOString()
          }).eq('id', emp.id)
        }
        setMyEmployeeId(emp.id)
        return
      }

      // Try by email
      const { data: empByEmail } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user?.email)
        .single()

      if (empByEmail) {
        await supabase.from('employees').update({ user_id: user?.id }).eq('id', empByEmail.id)
        setMyEmployeeId(empByEmail.id)
        return
      }

      // Create new employee from profile data
      const nameParts = (profile?.full_name || user?.email?.split('@')[0] || 'Cleaner').split(' ')
      const { data: newEmp } = await supabase.from('employees').insert([{
        user_id: user?.id,
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(' ') || '',
        email: user?.email,
        phone: profile?.phone || null,
        employment_status: 'active',
        employment_type: 'full_time',
        department: 'Cleaning',
        date_of_hire: new Date().toISOString().split('T')[0]
      }]).select('id').single()

      if (newEmp) setMyEmployeeId(newEmp.id)
    } catch (e) { console.error('Setup error:', e) }
  }

  const loadAllJobs = async () => {
    setLoadingAllJobs(true)
    try {
      // Load ALL jobs except completed, on_hold, cancelled
      let query = supabase
        .from('jobs')
        .select('id, title, job_number, status, scheduled_date, scheduled_start_time, scheduled_end_time, site_address, site_city, notes, clients(company_name, phone), job_categories(name, color)')
        .in('status', ['pending', 'scheduled', 'in_progress'])
        .order('scheduled_date', { ascending: true })
        .order('scheduled_start_time', { ascending: true })

      if (selectedDate !== 'all') query = query.eq('scheduled_date', selectedDate)

      const { data: jobs } = await query
      console.log('📋 Jobs loaded:', jobs?.length || 0)
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

  // SELECT JOB - Opens action modal
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
  const handleOpenJobActions = (job) => {
    setSelectedJob(job)
    setShowJobActions(true)
    setSupplyItem('')
    setSupplyQty(1)
    setIncidentDesc('')
    setIncidentType('damage')
  }

  // START JOB
  const handleStartJob = async () => {
    if (!selectedJob) return
    setActionLoading(true)
    try {
      await supabase.from('jobs').update({ 
        status: 'in_progress', actual_start_time: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', selectedJob.id)
      toast.success('Job started! 🚀')
      loadAllJobs()
      setShowJobActions(false)
    } catch { toast.error('Failed') }
    finally { setActionLoading(false) }
  }

  // COMPLETE JOB
  const handleCompleteJob = async () => {
    if (!selectedJob) return
    if (!window.confirm('Mark as completed? This will send for invoicing.')) return
    setActionLoading(true)
    try {
      await supabase.from('jobs').update({ 
        status: 'completed', actual_end_time: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', selectedJob.id)
      toast.success('Completed! Moving to finance ✅')
      loadAllJobs()
      setShowJobActions(false)
    } catch { toast.error('Failed') }
    finally { setActionLoading(false) }
  }

  // UPLOAD PHOTO directly for this job
  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedJob || !myEmployeeId) return
    
    setUploadingPhoto(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `job-photos/${selectedJob.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage.from('fleet').upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('fleet').getPublicUrl(fileName)

      await supabase.from('job_photos').insert([{
        job_id: selectedJob.id,
        employee_id: myEmployeeId,
        photo_type: 'before',
        photo_url: publicUrl,
        caption: `Photo uploaded for ${selectedJob.title}`
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

  // REQUEST SUPPLIES for this job
  const handleRequestSupplies = async () => {
    if (!supplyItem.trim() || !selectedJob || !myEmployeeId) {
      toast.error('Please enter an item name')
      return
    }
    setActionLoading(true)
    try {
      const { data: request } = await supabase.from('supplies_requests').insert([{
        employee_id: myEmployeeId,
        job_id: selectedJob.id,
        status: 'pending'
      }]).select('id').single()

      if (request) {
        await supabase.from('supplies_request_items').insert([{
          request_id: request.id,
          item_name: supplyItem,
          quantity: supplyQty,
          unit: 'each'
        }])
      }

      toast.success('Supplies requested! 📦')
      setSupplyItem('')
      setSupplyQty(1)
    } catch { toast.error('Failed to request supplies') }
    finally { setActionLoading(false) }
  }

  // REPORT INCIDENT for this job
  const handleReportIncident = async () => {
    if (!incidentDesc.trim() || !selectedJob || !myEmployeeId) {
      toast.error('Please describe the incident')
      return
    }
    setActionLoading(true)
    try {
      await supabase.from('incident_reports').insert([{
        employee_id: myEmployeeId,
        job_id: selectedJob.id,
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
      
      {/* Pull to Refresh */}
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
              { icon: CheckCircle2, label: 'Done Today', value: stats.completedJobs || 0, color: 'from-emerald-400 to-emerald-500' },
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
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4" />Jobs
            </h2>
            <span className="text-xs text-white/70 bg-white/20 px-2 py-0.5 rounded-full">{filteredJobs.length} jobs</span>
          </div>

          {/* Search & Date Filter */}
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
                  className={`bg-white rounded-2xl p-4 shadow-md ${job.status === 'in_progress' ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-blue-400'}`}>
                  
                  {/* Job Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{job.title}</h3>
                      <p className="text-xs text-slate-400">{job.job_number} · {job.clients?.company_name || 'Client'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ml-2 ${job.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {job.status === 'in_progress' ? 'Active' : 'Open'}
                    </span>
                  </div>

                  {/* Job Info */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Calendar className="w-3 h-3" />
                    <span className={job.scheduled_date !== todayStr ? 'text-amber-600 font-medium' : ''}>
                      {job.scheduled_date === todayStr ? 'Today' : formatDateShort(job.scheduled_date)}
                    </span>
                    <span className="mx-1">·</span>
                    <Clock className="w-3 h-3" />{job.scheduled_start_time?.slice(0,5)}-{job.scheduled_end_time?.slice(0,5)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <MapPin className="w-3 h-3" />{job.site_address?.slice(0, 40)}
                    {job.site_city && <span>, {job.site_city}</span>}
                  </div>

                  {/* Action Buttons */}
                  {job.status === 'in_progress' ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectedJob(job); handleStartJob() }}
                          className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                          <Play className="w-3.5 h-3.5" /> Start
                        </button>
                        <button onClick={() => { setSelectedJob(job); handleCompleteJob() }}
                          className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                        </button>
                      </div>
                      {/* Inline Actions for Active Jobs */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button onClick={() => { setSelectedJob(job); fileInputRef.current?.click() }}
                          className="py-2 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1">
                          <Camera className="w-3 h-3" /> Photo
                        </button>
                        <button onClick={() => { setSelectedJob(job); handleOpenJobActions(job) }}
                          className="py-2 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1">
                          <Package className="w-3 h-3" /> Supplies
                        </button>
                        <button onClick={() => { setSelectedJob(job); handleOpenJobActions(job) }}
                          className="py-2 bg-red-50 text-red-700 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Incident
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => handleSelectJob(job.id)} disabled={updatingJob === job.id}
                      className="w-full py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm">
                      <Play className="w-4 h-4" /> Select Job
                    </button>
                  )}

                  {/* Client Call */}
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
              <p className="text-white/60 text-xs mt-1">Pull down to refresh</p>
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>

      {/* Hidden file input for photo upload */}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUploadPhoto} />

      {/* JOB ACTIONS MODAL */}
      <AnimatePresence>
        {showJobActions && selectedJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowJobActions(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="sticky top-0 bg-white z-10 p-5 border-b flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">{selectedJob.title}</h3>
                  <p className="text-xs text-slate-500">{selectedJob.job_number}</p>
                </div>
                <button onClick={() => setShowJobActions(false)} className="p-2 rounded-xl bg-slate-100"><X className="w-5 h-5" /></button>
              </div>

              {/* Modal Content */}
              <div className="p-5 space-y-5">
                {/* Request Supplies */}
                <div>
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><Package className="w-4 h-4 text-purple-600" />Request Supplies</h4>
                  <div className="flex gap-2">
                    <input type="text" value={supplyItem} onChange={e => setSupplyItem(e.target.value)}
                      placeholder="Item name..." className="flex-1 p-2.5 rounded-xl border border-slate-200 text-sm" />
                    <input type="number" value={supplyQty} onChange={e => setSupplyQty(parseInt(e.target.value) || 1)}
                      className="w-16 p-2.5 rounded-xl border border-slate-200 text-sm text-center" min="1" />
                  </div>
                  <button onClick={handleRequestSupplies} disabled={actionLoading}
                    className="mt-2 w-full py-2.5 bg-purple-500 text-white rounded-xl text-sm font-bold">
                    {actionLoading ? 'Requesting...' : 'Send Request'}
                  </button>
                </div>

                {/* Report Incident */}
                <div>
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
                    placeholder="Describe the incident..." rows={3}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm resize-none" />
                  <button onClick={handleReportIncident} disabled={actionLoading}
                    className="mt-2 w-full py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold">
                    {actionLoading ? 'Reporting...' : 'Submit Report'}
                  </button>
                </div>

                {/* Job Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <button onClick={handleStartJob} disabled={actionLoading}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <Play className="w-4 h-4" /> Start
                  </button>
                  <button onClick={handleCompleteJob} disabled={actionLoading}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Complete
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
