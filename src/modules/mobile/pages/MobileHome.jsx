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
  Calendar, Search, User, Users,
  Hand, Home, MessageCircle, Umbrella,
  BarChart3, Map, Phone
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

  // Theme state
  const [themeVariant, setThemeVariant] = useState('light')
  const [currentScreen, setCurrentScreen] = useState('dashboard')
  const [screenHistory, setScreenHistory] = useState(['dashboard'])

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
      if (empByEmail) { await supabase.from('employees').update({ user_id: user?.id }).eq('id', empByEmail.id); setMyEmployeeId(empByEmail.id); return }
      const { data: newEmp } = await supabase.from('employees').insert([{
        user_id: user?.id, first_name: user?.email?.split('@')[0] || 'Cleaner', last_name: '',
        email: user?.email, employment_status: 'active', department: 'Cleaning'
      }]).select('id').single()
      if (newEmp) setMyEmployeeId(newEmp.id)
    } catch (e) { console.error('Setup error:', e) }
  }

  const loadAllJobs = async () => {
    setLoadingAllJobs(true)
    try {
      let openQuery = supabase.from('jobs')
        .select('id, title, job_number, status, scheduled_date, scheduled_start_time, scheduled_end_time, site_address, notes, clients(company_name, phone), job_categories(name, color)')
        .in('status', ['pending', 'scheduled']).order('scheduled_date', { ascending: true }).order('scheduled_start_time', { ascending: true })
      if (selectedDate !== 'all') openQuery = openQuery.eq('scheduled_date', selectedDate)
      const { data: openJobs } = await openQuery
      setAllOpenJobs(openJobs || [])

      let myQuery = supabase.from('jobs')
        .select('id, title, job_number, status, scheduled_date, scheduled_start_time, scheduled_end_time, site_address, notes, clients(company_name, phone), job_categories(name, color)')
        .eq('status', 'in_progress').order('scheduled_date', { ascending: true }).order('scheduled_start_time', { ascending: true })
      if (selectedDate !== 'all') myQuery = myQuery.eq('scheduled_date', selectedDate)
      const { data: myJobsData } = await myQuery
      setMyActiveJobs(myJobsData || [])
    } catch (error) { console.error('Error:', error) }
    finally { setLoadingAllJobs(false) }
  }

  const handleRefresh = async () => { setRefreshing(true); await initData(); await loadAllJobs(); setTimeout(() => setRefreshing(false), 500) }

  const switchScreen = (screenId) => {
    setCurrentScreen(screenId)
    setScreenHistory(prev => [...prev, screenId])
  }

  const goBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = [...screenHistory]
      newHistory.pop()
      setScreenHistory(newHistory)
      setCurrentScreen(newHistory[newHistory.length - 1])
    }
  }

  const handleSelectJob = async (jobId) => {
    if (!myEmployeeId) { toast.error('Profile not ready. Refresh and try again.'); return }
    setUpdatingJob(jobId)
    try {
      const cleanerName = myProfile?.first_name || user?.email?.split('@')[0] || 'Cleaner'
      const { error } = await supabase.from('jobs').update({ status: 'in_progress', actual_start_time: new Date().toISOString(), updated_at: new Date().toISOString(), notes: `SELECTED BY: ${cleanerName} at ${new Date().toLocaleString()}` }).eq('id', jobId)
      if (error) { toast.error('Failed to select job'); return }
      toast.success('Job selected! ✅')
      await loadAllJobs()
      setActiveTab('mine')
    } catch (error) { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  const handleStartJob = async (jobId) => {
    setUpdatingJob(jobId)
    try { await supabase.from('jobs').update({ status: 'in_progress', actual_start_time: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', jobId); toast.success('Job started! 🚀'); loadAllJobs() } catch { toast.error('Failed') } finally { setUpdatingJob(null) }
  }

  const handleCompleteJob = async (jobId) => {
    if (!window.confirm('Mark as completed? This will send for invoicing.')) return
    setUpdatingJob(jobId)
    try { await supabase.from('jobs').update({ status: 'completed', actual_end_time: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', jobId); toast.success('Completed! Moving to finance ✅'); loadAllJobs() } catch { toast.error('Failed') } finally { setUpdatingJob(null) }
  }

  const handleClockIn = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          await supabase.from('attendance_records').upsert([{
            employee_id: myEmployeeId,
            attendance_date: new Date().toISOString().split('T')[0],
            clock_in_time: new Date().toISOString(),
            check_in_method: 'gps',
            check_in_latitude: position.coords.latitude,
            check_in_longitude: position.coords.longitude,
            status: 'present'
          }], { onConflict: 'employee_id,attendance_date' })
          toast.success(`Clocked in! 📍 Lat: ${position.coords.latitude.toFixed(4)}`)
        } catch { toast.error('Clock in failed') }
      }, () => toast.error('Location access needed'))
    } else { toast.error('Geolocation not supported') }
  }

  const formatTime = (date) => date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (date) => date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
  const formatDateShort = (date) => { if (!date) return ''; const d = new Date(date + 'T00:00:00'); return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }) }
  const todayStr = new Date().toISOString().split('T')[0]

  const themeClasses = {
    light: 'bg-[#e9edf2]',
    dark: 'bg-[#2f3640]',
    'glass-neo': 'bg-[#e9edf2]/80 backdrop-blur-xl'
  }

  const cardClasses = "rounded-[24px] p-4 shadow-[8px_8px_16px_#bcc3cf,-8px_-8px_16px_#ffffff] bg-[#eef1f6]"
  const cardInsetClasses = "rounded-[18px] p-3 shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] bg-[#e9edf2]"
  const btnClasses = "rounded-[40px] py-3.5 px-5 font-semibold shadow-[6px_6px_12px_#bcc3cf,-4px_-4px_12px_#ffffff] bg-[#eef1f6] active:shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] active:scale-[0.97] transition-all"
  const btnPrimaryClasses = "rounded-[40px] py-3.5 px-5 font-semibold shadow-[6px_6px_14px_#bcc3cf,-4px_-4px_12px_#ffffff] bg-gradient-to-br from-[#6a8baa] to-[#5a7795] text-white active:scale-[0.97] transition-all"

  // DASHBOARD SCREEN
  const renderDashboard = () => (
    <div className="space-y-4">
      {/* Header Card */}
      <div className={cardClasses}>
        <h3 className="text-xl font-bold text-[#2e3b4e]">{greeting}, {myProfile?.first_name || user?.email?.split('@')[0] || 'Cleaner'}</h3>
        <p className="text-[#5e6f82] text-sm">ID: {myProfile?.employee_code || user?.email?.split('@')[0]}</p>
        <p className="text-4xl font-bold text-center my-2 font-mono text-[#2e3b4e]">{formatTime(currentTime)}</p>
      </div>

      {/* Clock In/Out */}
      <div className={`${cardClasses} flex items-center justify-between`}>
        <span className="flex items-center gap-2 text-[#2e3b4e]"><Clock className="w-4 h-4" /> Shift Status</span>
        <button onClick={handleClockIn} className={btnPrimaryClasses + " text-sm"}>
          <Map className="w-4 h-4 inline mr-1" /> Clock In
        </button>
      </div>

      {/* Quick Actions Grid */}
      <div className={cardClasses}>
        <h4 className="font-semibold text-[#2e3b4e] mb-3">Quick Actions</h4>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: Briefcase, label: 'My Jobs', screen: 'jobs', color: '#5f7d9c' },
            { icon: Map, label: 'Clock In', screen: 'gps', color: '#4b9b6b' },
            { icon: Camera, label: 'Photos', screen: 'photos', color: '#7a94ae' },
            { icon: Package, label: 'Supplies', screen: 'supplies', color: '#c99f4b' },
            { icon: AlertCircle, label: 'Incident', screen: 'incident', color: '#c15b5b' },
            { icon: Umbrella, label: 'Leave', screen: 'leave', color: '#5f7d9c' },
            { icon: Calendar, label: 'Schedule', screen: 'schedule', color: '#7a94ae' },
            { icon: MessageCircle, label: 'Messages', screen: 'messages', color: '#4b9b6b' },
            { icon: BarChart3, label: 'Stats', screen: 'performance', color: '#c99f4b' },
          ].map(item => (
            <button key={item.label} onClick={() => switchScreen(item.screen)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-[18px] shadow-[6px_6px_12px_#bcc3cf,-4px_-4px_12px_#ffffff] bg-[#eef1f6] active:shadow-[inset_4px_4px_8px_#bcc3cf] active:scale-[0.96] transition-all">
              <div className="p-2 rounded-2xl shadow-[inset_2px_2px_4px_#bcc3cf,inset_-2px_-2px_4px_#ffffff] bg-[#e9edf2]" style={{ color: item.color }}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-[#2e3b4e] text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Style Toggle */}
      <button onClick={() => {
        if (themeVariant === 'light') setThemeVariant('dark')
        else if (themeVariant === 'dark') setThemeVariant('glass-neo')
        else setThemeVariant('light')
      }} className={btnClasses + " text-xs w-full"}>
        🎨 Style: {themeVariant === 'light' ? 'Light' : themeVariant === 'dark' ? 'Dark' : 'Glass'}
      </button>
    </div>
  )

  // JOBS SCREEN
  const renderJobs = () => {
    const filteredOpenJobs = allOpenJobs.filter(job => {
      if (!jobSearch) return true
      const s = jobSearch.toLowerCase()
      return (job.title || '').includes(s) || (job.job_number || '').includes(s) || (job.clients?.company_name || '').includes(s)
    })
    const filteredMyJobs = myActiveJobs.filter(job => {
      if (!jobSearch) return true
      const s = jobSearch.toLowerCase()
      return (job.title || '').includes(s) || (job.job_number || '').includes(s) || (job.clients?.company_name || '').includes(s)
    })

    return (
      <div className="space-y-4">
        <button onClick={goBack} className={`${btnClasses} text-sm inline-flex items-center gap-2 mb-2`}>← Back</button>
        <div className={cardClasses}>
          <h3 className="font-bold text-[#2e3b4e] text-lg mb-3">Jobs</h3>
          
          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            {[
              { id: 'all', label: `Open Pool (${filteredOpenJobs.length})` },
              { id: 'mine', label: `My Jobs (${filteredMyJobs.length})` },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 rounded-[30px] font-semibold text-sm transition-all ${activeTab === tab.id ? 'bg-[#5f7d9c] text-white shadow-[inset_3px_3px_6px_#3e5268,inset_-3px_-3px_6px_#7a94ae]' : 'bg-[#eef1f6] text-[#2e3b4e] shadow-[4px_4px_8px_#bcc3cf,-2px_-2px_6px_#ffffff]'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5e6f82]" />
            <input type="text" value={jobSearch} onChange={e => setJobSearch(e.target.value)} placeholder="Search jobs..."
              className="w-full pl-9 pr-4 py-3 rounded-[40px] shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] bg-[#e9edf2] outline-none text-[#2e3b4e] text-sm" />
          </div>

          {/* Open Pool */}
          {activeTab === 'all' && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {loadingAllJobs ? <p className="text-center text-[#5e6f82] py-4">Loading...</p> :
               filteredOpenJobs.length > 0 ? filteredOpenJobs.map(job => (
                <div key={job.id} className={cardInsetClasses + " border-l-4 border-l-[#5f7d9c]"}>
                  <div className="flex justify-between items-start mb-1">
                    <div><p className="font-semibold text-[#2e3b4e] text-sm">{job.title}</p><p className="text-xs text-[#5e6f82]">{job.job_number} · {job.clients?.company_name || 'Client'}</p></div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#5f7d9c]/20 text-[#5f7d9c]">Open</span>
                  </div>
                  <div className="text-xs text-[#5e6f82] mb-2"><Calendar className="w-3 h-3 inline mr-1" />{job.scheduled_date === todayStr ? 'Today' : formatDateShort(job.scheduled_date)} · <Clock className="w-3 h-3 inline mr-1" />{job.scheduled_start_time?.slice(0,5)}-{job.scheduled_end_time?.slice(0,5)}</div>
                  <div className="text-xs text-[#5e6f82] mb-2"><MapPin className="w-3 h-3 inline mr-1" />{job.site_address?.slice(0, 40)}</div>
                  <button onClick={() => handleSelectJob(job.id)} disabled={updatingJob === job.id}
                    className={`${btnPrimaryClasses} w-full text-sm mt-1`}><Hand className="w-4 h-4 inline mr-1" /> Select Job</button>
                </div>
              )) : <div className={cardInsetClasses + " text-center"}><p className="text-[#5e6f82]">No open jobs</p></div>}
            </div>
          )}

          {/* My Jobs */}
          {activeTab === 'mine' && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {loadingAllJobs ? <p className="text-center text-[#5e6f82] py-4">Loading...</p> :
               filteredMyJobs.length > 0 ? filteredMyJobs.map(job => (
                <div key={job.id} className={cardInsetClasses + " border-l-4 border-l-[#c99f4b]"}>
                  <div className="flex justify-between items-start mb-1">
                    <div><p className="font-semibold text-[#2e3b4e] text-sm">{job.title}</p><p className="text-xs text-[#5e6f82]">{job.job_number} · {job.clients?.company_name || 'Client'}</p></div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#c99f4b]/20 text-[#c99f4b]">Active</span>
                  </div>
                  <div className="text-xs text-[#5e6f82] mb-2"><Calendar className="w-3 h-3 inline mr-1" />{job.scheduled_date === todayStr ? 'Today' : formatDateShort(job.scheduled_date)} · <Clock className="w-3 h-3 inline mr-1" />{job.scheduled_start_time?.slice(0,5)}-{job.scheduled_end_time?.slice(0,5)}</div>
                  <div className="text-xs text-[#5e6f82] mb-2"><MapPin className="w-3 h-3 inline mr-1" />{job.site_address?.slice(0, 40)}</div>
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => handleStartJob(job.id)} className="flex-1 py-2 rounded-[40px] font-semibold text-xs shadow-[4px_4px_8px_#bcc3cf,-2px_-2px_6px_#ffffff] bg-[#5f7d9c] text-white"><Play className="w-3 h-3 inline mr-1" />Start</button>
                    <button onClick={() => handleCompleteJob(job.id)} className="flex-1 py-2 rounded-[40px] font-semibold text-xs shadow-[4px_4px_8px_#bcc3cf,-2px_-2px_6px_#ffffff] bg-[#4b9b6b] text-white"><CheckCircle2 className="w-3 h-3 inline mr-1" />Complete</button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => navigate('/mobile/photos')} className="py-1.5 rounded-xl text-[10px] font-medium bg-[#e9edf2] shadow-[inset_2px_2px_4px_#bcc3cf,inset_-2px_-2px_4px_#ffffff] text-[#5f7d9c]"><Camera className="w-3 h-3 inline mr-0.5" />Photos</button>
                    <button onClick={() => navigate('/mobile/supplies')} className="py-1.5 rounded-xl text-[10px] font-medium bg-[#e9edf2] shadow-[inset_2px_2px_4px_#bcc3cf,inset_-2px_-2px_4px_#ffffff] text-[#c99f4b]"><Package className="w-3 h-3 inline mr-0.5" />Supplies</button>
                    <button onClick={() => navigate('/mobile/incident')} className="py-1.5 rounded-xl text-[10px] font-medium bg-[#e9edf2] shadow-[inset_2px_2px_4px_#bcc3cf,inset_-2px_-2px_4px_#ffffff] text-[#c15b5b]"><AlertCircle className="w-3 h-3 inline mr-0.5" />Incident</button>
                  </div>
                </div>
              )) : <div className={cardInsetClasses + " text-center"}><p className="text-[#5e6f82]">No active jobs</p><p className="text-xs text-[#5e6f82] mt-1">Select a job from Open Pool</p></div>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // PLACEHOLDER SCREENS
  const renderPlaceholder = (title, icon, backTarget = 'dashboard') => (
    <div className="space-y-4">
      <button onClick={goBack} className={`${btnClasses} text-sm inline-flex items-center gap-2 mb-2`}>← Back</button>
      <div className={cardClasses}>
        <h3 className="font-bold text-[#2e3b4e] text-lg">{title}</h3>
        <div className={cardInsetClasses + " mt-3 text-center"}>
          <p className="text-[#5e6f82]">Coming soon</p>
        </div>
      </div>
    </div>
  )

  // RENDER CURRENT SCREEN
  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return renderDashboard()
      case 'jobs': return renderJobs()
      case 'gps': return renderPlaceholder('GPS Clock In', 'Map')
      case 'photos': return renderPlaceholder('Photos', 'Camera', 'jobs')
      case 'supplies': return renderPlaceholder('Supplies', 'Package')
      case 'incident': return renderPlaceholder('Incident Report', 'AlertCircle', 'jobs')
      case 'leave': return renderPlaceholder('Leave', 'Umbrella')
      case 'schedule': return renderPlaceholder('Schedule', 'Calendar')
      case 'messages': return renderPlaceholder('Messages', 'MessageCircle')
      case 'performance': return renderPlaceholder('Performance', 'BarChart3')
      case 'profile': return renderPlaceholder('Profile', 'User')
      default: return renderDashboard()
    }
  }

  return (
    <div className={`min-h-screen font-['Inter'] pb-20 ${themeClasses[themeVariant]}`}>
      {/* Main Content */}
      <div ref={scrollRef} className="overflow-y-auto px-3 pt-6 pb-4" style={{ maxHeight: 'calc(100vh - 80px)' }}>
        {renderScreen()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#e9edf2] px-3 pb-3 pt-2 rounded-t-[36px] shadow-[0_-8px_18px_rgba(0,0,0,0.05),0_-4px_8px_#bcc3cf] z-50">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {[
            { id: 'dashboard', icon: Home, label: 'Home' },
            { id: 'jobs', icon: Briefcase, label: 'Jobs' },
            { id: 'schedule', icon: Calendar, label: 'Schedule' },
            { id: 'messages', icon: MessageCircle, label: 'Messages' },
            { id: 'profile', icon: User, label: 'Profile' },
          ].map(item => (
            <button key={item.id} onClick={() => switchScreen(item.id)}
              className="flex flex-col items-center gap-1">
              <div className={`p-2 rounded-[18px] shadow-[3px_3px_6px_#bcc3cf,-3px_-3px_6px_#ffffff] transition-all ${
                currentScreen === item.id ? 'bg-[#5f7d9c] text-white shadow-[inset_2px_2px_5px_#3e5268,inset_-2px_-2px_5px_#7a94ae]' : 'bg-[#eef1f6] text-[#5e6f82]'
              }`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium text-[#5e6f82]">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
