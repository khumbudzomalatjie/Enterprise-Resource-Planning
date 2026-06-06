import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { 
  Briefcase, Clock, CheckCircle2, MapPin, 
  Camera, AlertCircle, Package, LogOut,
  Play, RefreshCw, ChevronDown,
  Calendar, Search, User, X, Send, Image
} from 'lucide-react'

export default function MobileHome() {
  const { user, profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const scrollRef = useRef(null)
  const fileInputRef = useRef(null)
  
  const [currentTime, setCurrentTime] = useState(new Date())
  const [greeting, setGreeting] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const touchStartY = useRef(0)
  const pullThreshold = 80

  const [allJobs, setAllJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [jobSearch, setJobSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState('all')
  const [updatingJob, setUpdatingJob] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [supplyItem, setSupplyItem] = useState('')
  const [supplyQty, setSupplyQty] = useState(1)
  const [incidentDesc, setIncidentDesc] = useState('')
  const [incidentType, setIncidentType] = useState('damage')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadAllJobs()
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

  const loadAllJobs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('jobs')
        .select('*')
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('scheduled_date', { ascending: true })

      const { data, error } = await query

      if (error) {
        console.error('❌ Error:', error.message)
        setAllJobs([])
      } else {
        console.log(`✅ Loaded ${data?.length || 0} jobs`)
        // Apply date filter in JavaScript instead of SQL for reliability
        if (selectedDate !== 'all') {
          setAllJobs((data || []).filter(j => j.scheduled_date === selectedDate))
        } else {
          setAllJobs(data || [])
        }
      }
    } catch (e) {
      console.error('❌ Exception:', e.message)
      setAllJobs([])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAllJobs()
    setTimeout(() => setRefreshing(false), 500)
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

  const handleSelectJob = async (jobId) => {
    setUpdatingJob(jobId)
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'in_progress',
          actual_start_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)

      if (error) throw error
      toast.success('Job selected! ✅')
      await loadAllJobs()
    } catch (e) {
      console.error('Select error:', e.message)
      toast.error('Failed to select job')
    } finally {
      setUpdatingJob(null)
    }
  }

  const handleCompleteJob = async (jobId) => {
    if (!window.confirm('Mark as completed?')) return
    setUpdatingJob(jobId)
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'completed',
          actual_end_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)

      if (error) throw error
      toast.success('Completed! ✅')
      await loadAllJobs()
    } catch { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedJob) return
    
    try {
      const filePath = `job-photos/${selectedJob.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('fleet').upload(filePath, file, { upsert: true })
      if (uploadError) { toast.error('Upload failed'); return }

      const { data: { publicUrl } } = supabase.storage.from('fleet').getPublicUrl(filePath)
      await supabase.from('job_photos').insert([{
        job_id: selectedJob.id, photo_url: publicUrl, photo_type: 'before'
      }])
      toast.success('Photo uploaded! 📸')
    } catch { toast.error('Failed') }
    finally { if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  const handleRequestSupplies = async () => {
    if (!selectedJob || !supplyItem.trim()) { toast.error('Enter item name'); return }
    setActionLoading(true)
    try {
      const { data: request } = await supabase.from('supplies_requests').insert([{
        job_id: selectedJob.id, status: 'pending'
      }]).select('id').single()

      if (request) {
        await supabase.from('supplies_request_items').insert([{
          request_id: request.id, item_name: supplyItem, quantity: supplyQty, unit: 'each'
        }])
      }
      toast.success('Requested! 📦')
      setSupplyItem(''); setSupplyQty(1)
    } catch { toast.error('Failed') }
    finally { setActionLoading(false) }
  }

  const handleReportIncident = async () => {
    if (!selectedJob || !incidentDesc.trim()) { toast.error('Describe incident'); return }
    setActionLoading(true)
    try {
      await supabase.from('incident_reports').insert([{
        job_id: selectedJob.id, incident_type: incidentType, description: incidentDesc, severity: 'medium', status: 'reported'
      }])
      toast.success('Reported! 🚨')
      setIncidentDesc(''); setIncidentType('damage')
    } catch { toast.error('Failed') }
    finally { setActionLoading(false) }
  }

  const formatTime = (date) => date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (date) => date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
  const formatDateShort = (date) => {
    if (!date) return 'No date'
    return new Date(date + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const todayStr = new Date().toISOString().split('T')[0]

  // Apply search filter
  const filteredJobs = allJobs.filter(job => {
    if (!jobSearch) return true
    const s = jobSearch.toLowerCase()
    return (job.title || '').toLowerCase().includes(s) || 
           (job.job_number || '').toLowerCase().includes(s) || 
           (job.site_address || '').toLowerCase().includes(s)
  })

  const openCount = allJobs.filter(j => j.status === 'pending' || j.status === 'scheduled').length
  const activeCount = allJobs.filter(j => j.status === 'in_progress').length

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
        <div className="px-5 pt-6 pb-6 text-white">
          <div className="flex justify-between items-start mb-1">
            <div className="flex-1">
              <p className="text-emerald-100 text-xs opacity-80">{formatDate(currentTime)}</p>
              <h1 className="text-xl font-bold mt-0.5">{greeting}, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Cleaner'}!</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleRefresh} className="p-2 rounded-xl bg-white/20"><RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /></button>
              <button onClick={handleSignOut} className="p-2 rounded-xl bg-white/20"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
          <p className="text-5xl font-bold text-center my-3 font-mono tracking-wider">{formatTime(currentTime)}</p>
        </div>

        <div className="px-5 -mt-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl p-2.5 text-white text-center shadow-lg">
              <Briefcase className="w-4 h-4 mx-auto mb-1 opacity-80" />
              <p className="text-lg font-bold">{openCount}</p>
              <p className="text-[9px] opacity-80 font-medium">Open Jobs</p>
            </div>
            <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl p-2.5 text-white text-center shadow-lg">
              <Play className="w-4 h-4 mx-auto mb-1 opacity-80" />
              <p className="text-lg font-bold">{activeCount}</p>
              <p className="text-[9px] opacity-80 font-medium">Active Jobs</p>
            </div>
          </div>
        </div>

        <div className="px-5 mt-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => navigate('/mobile/clock')}
              className="bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl p-3.5 text-left hover:scale-[1.02] active:scale-95 transition-all shadow-lg">
              <Clock className="w-7 h-7 mb-2" /><span className="text-sm font-bold block">Clock In/Out</span>
            </button>
            <button onClick={() => navigate('/mobile/profile')}
              className="bg-gradient-to-r from-purple-400 to-violet-500 text-white rounded-2xl p-3.5 text-left hover:scale-[1.02] active:scale-95 transition-all shadow-lg">
              <User className="w-7 h-7 mb-2" /><span className="text-sm font-bold block">My Profile</span>
            </button>
          </div>
        </div>

        <div className="px-5 mt-5 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2"><Briefcase className="w-4 h-4" />All Jobs</h2>
            <div className="flex gap-2">
              <button onClick={() => setSelectedDate('all')} className={`text-xs px-2 py-1 rounded-full ${selectedDate === 'all' ? 'bg-white text-emerald-700' : 'bg-white/20 text-white'}`}>All</button>
              <button onClick={() => setSelectedDate(todayStr)} className={`text-xs px-2 py-1 rounded-full ${selectedDate === todayStr ? 'bg-white text-emerald-700' : 'bg-white/20 text-white'}`}>Today</button>
            </div>
          </div>

          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input type="text" value={jobSearch} onChange={e => setJobSearch(e.target.value)}
                placeholder="Search jobs..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/15 text-white placeholder-white/40 text-sm border border-white/10" />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div></div>
          ) : filteredJobs.length > 0 ? (
            <div className="space-y-2">
              {filteredJobs.map((job, i) => (
                <div key={job.id}
                  className={`bg-white rounded-2xl p-4 shadow-md ${
                    job.status === 'in_progress' ? 'border-l-4 border-l-amber-400' : 
                    job.status === 'on_hold' ? 'border-l-4 border-l-purple-400' : 
                    'border-l-4 border-l-blue-400'
                  }`}>
                  
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{job.title || 'Untitled Job'}</h3>
                      <p className="text-xs text-slate-400">{job.job_number} · {formatDateShort(job.scheduled_date)}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ml-2 ${
                      job.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                      job.status === 'on_hold' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {job.status === 'in_progress' ? 'Active' : job.status === 'on_hold' ? 'Paused' : 'Open'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mb-1">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {job.scheduled_start_time?.slice(0,5) || '--:--'} - {job.scheduled_end_time?.slice(0,5) || '--:--'}
                  </div>
                  <div className="text-xs text-slate-500 mb-3">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {job.site_address?.slice(0, 40) || 'No address'}
                  </div>

                  <div className="flex gap-2">
                    {job.status === 'in_progress' ? (
                      <>
                        <button onClick={() => { setSelectedJob(job); setShowModal(true); setSupplyItem(''); setSupplyQty(1); setIncidentDesc(''); setIncidentType('damage') }}
                          className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95">
                          <Camera className="w-3.5 h-3.5" /> Manage
                        </button>
                        <button onClick={() => handleCompleteJob(job.id)} disabled={updatingJob === job.id}
                          className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleSelectJob(job.id)} disabled={updatingJob === job.id}
                        className="w-full py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                        <Play className="w-4 h-4" /> Select Job
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white/10 backdrop-blur rounded-2xl">
              <Briefcase className="w-12 h-12 text-white/60 mx-auto mb-2" />
              <p className="text-white font-semibold">No jobs found</p>
              <p className="text-white/60 text-xs mt-1">
                {selectedDate !== 'all' ? 'Try selecting "All" dates' : 'Pull down to refresh'}
              </p>
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUploadPhoto} />

      {/* MODAL */}
      <AnimatePresence>
        {showModal && selectedJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              
              <div className="sticky top-0 bg-white z-10 p-5 border-b flex justify-between items-center rounded-t-3xl">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{selectedJob.title}</h3>
                  <p className="text-xs text-slate-500">{selectedJob.job_number}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl bg-slate-100"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-blue-50 rounded-2xl p-4">
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><Camera className="w-4 h-4 text-blue-600" />Upload Photo</h4>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <Image className="w-4 h-4" /> Take / Choose Photo
                  </button>
                </div>

                <div className="bg-purple-50 rounded-2xl p-4">
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><Package className="w-4 h-4 text-purple-600" />Request Supplies</h4>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={supplyItem} onChange={e => setSupplyItem(e.target.value)}
                      placeholder="Item name..." className="flex-1 p-2.5 rounded-xl border border-slate-200 text-sm" />
                    <input type="number" value={supplyQty} onChange={e => setSupplyQty(parseInt(e.target.value) || 1)}
                      className="w-16 p-2.5 rounded-xl border border-slate-200 text-sm text-center" min="1" />
                  </div>
                  <button onClick={handleRequestSupplies} disabled={actionLoading}
                    className="w-full py-2.5 bg-purple-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                    <Send className="w-4 h-4 inline mr-1" /> Send Request
                  </button>
                </div>

                <div className="bg-red-50 rounded-2xl p-4">
                  <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-600" />Report Incident</h4>
                  <select value={incidentType} onChange={e => setIncidentType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm mb-2">
                    <option value="damage">Damage</option><option value="injury">Injury</option><option value="complaint">Complaint</option><option value="security">Security</option><option value="other">Other</option>
                  </select>
                  <textarea value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)}
                    placeholder="Describe what happened..." rows={3}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm resize-none mb-2" />
                  <button onClick={handleReportIncident} disabled={actionLoading}
                    className="w-full py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">
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
