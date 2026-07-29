import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Briefcase, Clock, CheckCircle2, MapPin, 
  Camera, AlertCircle, Package, LogOut,
  Play, RefreshCw, Calendar, User, Users,
  Hand, Home, MessageCircle, Umbrella,
  BarChart3, Map, Send, Star,
  LogIn, LogOutIcon, Monitor
} from 'lucide-react'

export default function MobileDashboard() {
  const { user, profile, signOut } = useAuthStore()
  const { myJobs, stats, fetchMyJobs, fetchMobileStats, fetchMyProfile, myProfile } = useMobileStore()
  const navigate = useNavigate()
  
  const [currentTime, setCurrentTime] = useState(new Date())
  const [greeting, setGreeting] = useState('')
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [clockInTime, setClockInTime] = useState(null)
  const [clockingInOut, setClockingInOut] = useState(false)
  const [myEmployeeId, setMyEmployeeId] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [allOpenJobs, setAllOpenJobs] = useState([])
  const [myActiveJobs, setMyActiveJobs] = useState([])
  const [loadingAllJobs, setLoadingAllJobs] = useState(false)
  const [jobSearch, setJobSearch] = useState('')
  const [updatingJob, setUpdatingJob] = useState(null)

  useEffect(() => {
    initData()
    const t = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (myEmployeeId) {
      loadAllJobs()
      checkClockStatus()
    }
  }, [myEmployeeId])

  useEffect(() => {
    const h = currentTime.getHours()
    if (h < 12) setGreeting('Good Morning')
    else if (h < 17) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')
  }, [currentTime])

  const initData = async () => {
    if (user?.id) await fetchMyProfile(user.id)
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
      
      const { data: newEmp } = await supabase.from('employees').insert([{
        user_id: user?.id, first_name: user?.email?.split('@')[0] || 'Cleaner', 
        last_name: '', email: user?.email, employment_status: 'active', department: 'Cleaning'
      }]).select('id').single()
      
      if (newEmp) setMyEmployeeId(newEmp.id)
    } catch (e) { console.error('Setup error:', e) }
  }

  const checkClockStatus = async () => {
    if (!myEmployeeId) return
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('attendance_records').select('*')
      .eq('employee_id', myEmployeeId).eq('attendance_date', today)
      .order('created_at', { ascending: false }).limit(1)

    if (data && data.length > 0) {
      if (data[0].clock_in_time && !data[0].clock_out_time) {
        setIsClockedIn(true)
        setClockInTime(data[0].clock_in_time)
      }
    }
  }

  const loadAllJobs = async () => {
    setLoadingAllJobs(true)
    try {
      const { data: openJobs } = await supabase
        .from('jobs')
        .select('*, clients(company_name, phone), job_categories(name, color)')
        .in('status', ['pending', 'scheduled'])
        .order('scheduled_date')
      setAllOpenJobs(openJobs || [])

      if (myEmployeeId) {
        const { data: assignments } = await supabase
          .from('field_job_assignments')
          .select('job_id')
          .eq('employee_id', myEmployeeId)
          .in('assignment_status', ['assigned', 'accepted', 'in_progress'])

        const jobIds = assignments?.map(a => a.job_id) || []
        if (jobIds.length > 0) {
          const { data: myJobsData } = await supabase
            .from('jobs')
            .select('*, clients(company_name, phone), job_categories(name, color)')
            .in('id', jobIds)
            .not('status', 'eq', 'completed')
            .not('status', 'eq', 'cancelled')
          setMyActiveJobs(myJobsData || [])
        }
      }
    } catch (e) { console.error('Error loading jobs:', e) }
    finally { setLoadingAllJobs(false) }
  }

  const handleClockToggle = () => {
    if (!myEmployeeId) { toast.error('Profile not ready.'); return }
    if (isClockedIn && !window.confirm('Clock out?')) return

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        setClockingInOut(true)
        try {
          const today = new Date().toISOString().split('T')[0]
          if (isClockedIn) {
            await supabase.from('attendance_records').update({
              clock_out_time: new Date().toISOString(),
              check_out_method: 'gps',
              check_out_latitude: pos.coords.latitude,
              check_out_longitude: pos.coords.longitude
            }).eq('employee_id', myEmployeeId).eq('attendance_date', today).is('clock_out_time', null)
            
            setIsClockedIn(false)
            setClockInTime(null)
            toast.success('Clocked out!')
          } else {
            await supabase.from('attendance_records').upsert([{
              employee_id: myEmployeeId, attendance_date: today,
              clock_in_time: new Date().toISOString(), check_in_method: 'gps',
              check_in_latitude: pos.coords.latitude,
              check_in_longitude: pos.coords.longitude, status: 'present'
            }], { onConflict: 'employee_id,attendance_date' })
            
            setIsClockedIn(true)
            setClockInTime(new Date().toISOString())
            toast.success('Clocked in!')
          }
        } catch (error) { toast.error('Failed') }
        finally { setClockingInOut(false) }
      }, () => toast.error('Location access needed'))
    }
  }

  const handleSelectJob = async (jobId) => {
    if (!myEmployeeId) { toast.error('Profile not ready.'); return }
    if (myActiveJobs.length > 0) { toast.error('Complete current job first'); return }
    
    setUpdatingJob(jobId)
    try {
      const { data: existing } = await supabase.from('field_job_assignments')
        .select('id').eq('job_id', jobId).in('assignment_status', ['assigned', 'accepted', 'in_progress']).maybeSingle()
      
      if (existing) { toast.error('Job already taken'); setUpdatingJob(null); return }

      await supabase.from('field_job_assignments').insert([{
        job_id: jobId, employee_id: myEmployeeId,
        assignment_status: 'assigned', assigned_at: new Date().toISOString()
      }])

      await supabase.from('jobs').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', jobId)
      
      toast.success('Job selected!')
      await loadAllJobs()
      setActiveTab('mine')
    } catch (error) { toast.error('Failed to select job') }
    finally { setUpdatingJob(null) }
  }

  const handleStartJob = async (jobId) => {
    setUpdatingJob(jobId)
    try {
      await supabase.from('field_job_assignments').update({
        assignment_status: 'in_progress', started_at: new Date().toISOString()
      }).eq('job_id', jobId).eq('employee_id', myEmployeeId)
      toast.success('Started!')
      loadAllJobs()
    } catch {} finally { setUpdatingJob(null) }
  }

  const handleCompleteJob = async (jobId) => {
    if (!window.confirm('Mark as completed?')) return
    setUpdatingJob(jobId)
    try {
      await supabase.from('field_job_assignments').update({
        assignment_status: 'completed', completed_at: new Date().toISOString()
      }).eq('job_id', jobId).eq('employee_id', myEmployeeId)

      await supabase.from('jobs').update({ status: 'completed', actual_end_time: new Date().toISOString() }).eq('id', jobId)
      toast.success('Completed!')
      loadAllJobs()
      setActiveTab('all')
    } catch {} finally { setUpdatingJob(null) }
  }

  const handleBackToERP = () => {
    window.location.href = '/dashboard'
  }

  const fmtT = (d) => d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  const fmtDS = (d) => { if (!d) return ''; return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }) }
  const todayStr = new Date().toISOString().split('T')[0]

  const filteredOpen = allOpenJobs.filter(j => !jobSearch || (j.title || '').toLowerCase().includes(jobSearch.toLowerCase()))
  const filteredMine = myActiveJobs.filter(j => !jobSearch || (j.title || '').toLowerCase().includes(jobSearch.toLowerCase()))

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-700 font-['Inter'] pb-28">
      {/* Header */}
      <div className="px-5 pt-8 pb-5 text-white">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{greeting}, {myProfile?.first_name || 'Cleaner'}</h1>
          {/* ✅ Back to ERP Button */}
          <button
            onClick={handleBackToERP}
            className="px-4 py-2 rounded-xl bg-white/20 text-white text-sm font-semibold flex items-center gap-2 active:scale-95 transition-all border border-white/20 hover:bg-white/30"
          >
            <Monitor className="w-4 h-4" />
            ERP
          </button>
        </div>
        <p className="text-blue-100 text-sm">{myProfile?.employee_code || 'N/A'} · {myProfile?.department || 'Cleaning'}</p>
        
        {/* Clock In/Out */}
        <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between border border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></span>
              <span className="text-white font-semibold text-sm">{isClockedIn ? 'Clocked In' : 'Not Clocked In'}</span>
            </div>
            {clockInTime && <p className="text-blue-200 text-xs mt-1">Since: {new Date(clockInTime).toLocaleTimeString()}</p>}
          </div>
          <button onClick={handleClockToggle} disabled={clockingInOut}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all ${
              isClockedIn ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
            {clockingInOut ? <RefreshCw className="w-4 h-4 animate-spin" /> : isClockedIn ? 'Clock Out' : 'Clock In'}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 -mt-2">
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Briefcase, label: 'My Jobs', onClick: () => setActiveTab('mine'), color: 'bg-blue-400/20 text-blue-200' },
            { icon: Camera, label: 'Photos', onClick: () => navigate('/mobile/photos'), color: 'bg-purple-400/20 text-purple-200' },
            { icon: AlertCircle, label: 'Incident', onClick: () => navigate('/mobile/incident'), color: 'bg-red-400/20 text-red-200' },
            { icon: Umbrella, label: 'Leave', onClick: () => navigate('/mobile/leave'), color: 'bg-amber-400/20 text-amber-200' },
          ].map(action => (
            <button key={action.label} onClick={action.onClick}
              className={`${action.color} rounded-xl p-3 flex flex-col items-center gap-1 active:scale-95 transition-all`}>
              <action.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Section */}
      <div className="px-5 mt-4">
        <div className="flex gap-2 bg-white/10 rounded-2xl p-1 mb-3">
          <button onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'all' ? 'bg-white text-blue-700' : 'text-white/70'}`}>
            Open Pool ({filteredOpen.length})
          </button>
          <button onClick={() => setActiveTab('mine')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'mine' ? 'bg-white text-amber-700' : 'text-white/70'}`}>
            My Jobs ({filteredMine.length})
          </button>
        </div>

        <div className="mb-3">
          <input type="text" value={jobSearch} onChange={e => setJobSearch(e.target.value)}
            placeholder="Search jobs..." className="w-full px-4 py-2 rounded-xl bg-white/10 text-white placeholder-white/40 text-sm border border-white/10" />
        </div>

        {loadingAllJobs ? (
          <div className="text-center py-8"><RefreshCw className="w-6 h-6 text-white animate-spin mx-auto" /></div>
        ) : activeTab === 'all' ? (
          filteredOpen.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pb-4">
              {filteredOpen.map(job => (
                <div key={job.id} className="bg-white rounded-2xl p-4 shadow-md border-l-4 border-l-blue-400">
                  <div className="flex justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{job.title}</h3>
                      <p className="text-xs text-slate-400">{job.job_number} · {job.clients?.company_name}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">Open</span>
                  </div>
                  <div className="text-xs text-slate-500 mb-2">
                    <Calendar className="w-3 h-3 inline" /> {job.scheduled_date === todayStr ? 'Today' : fmtDS(job.scheduled_date)} · 
                    <Clock className="w-3 h-3 inline ml-2" /> {job.scheduled_start_time?.slice(0,5)}
                  </div>
                  <div className="text-xs text-slate-500 mb-3"><MapPin className="w-3 h-3 inline" /> {job.site_address?.slice(0, 35)}</div>
                  <button onClick={() => handleSelectJob(job.id)} disabled={updatingJob === job.id || myActiveJobs.length > 0}
                    className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                    {myActiveJobs.length > 0 ? '🔒 Complete current job first' : <><Hand className="w-4 h-4" /> Select Job</>}
                  </button>
                </div>
              ))}
            </div>
          ) : <div className="text-center py-8 bg-white/10 rounded-2xl"><Briefcase className="w-10 h-10 text-white/50 mx-auto mb-2" /><p className="text-white/70">No open jobs</p></div>
        ) : (
          filteredMine.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pb-4">
              {filteredMine.map(job => (
                <div key={job.id} className="bg-white rounded-2xl p-4 shadow-md border-l-4 border-l-amber-400">
                  <div className="flex justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{job.title}</h3>
                      <p className="text-xs text-slate-400">{job.job_number} · {job.clients?.company_name}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">My Job</span>
                  </div>
                  <div className="text-xs text-slate-500 mb-2">
                    <Calendar className="w-3 h-3 inline" /> {job.scheduled_date === todayStr ? 'Today' : fmtDS(job.scheduled_date)} · 
                    <Clock className="w-3 h-3 inline ml-2" /> {job.scheduled_start_time?.slice(0,5)}
                  </div>
                  <div className="text-xs text-slate-500 mb-3"><MapPin className="w-3 h-3 inline" /> {job.site_address?.slice(0, 35)}</div>
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => handleStartJob(job.id)} disabled={updatingJob === job.id}
                      className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95"><Play className="w-3.5 h-3.5" /> Start</button>
                    <button onClick={() => handleCompleteJob(job.id)} disabled={updatingJob === job.id}
                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95"><CheckCircle2 className="w-3.5 h-3.5" /> Complete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-center py-8 bg-white/10 rounded-2xl"><User className="w-10 h-10 text-white/50 mx-auto mb-2" /><p className="text-white/70">No jobs assigned</p></div>
        )}
      </div>

      {/* Bottom Navigation with Back to ERP */}
      <div className="fixed bottom-0 left-0 right-0 bg-white z-50 safe-area-bottom">
        <button
          onClick={handleBackToERP}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Monitor className="w-4 h-4" />
          Back to Main ERP
        </button>
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto border-t border-slate-100">
          {[
            { id: 'home', icon: Home, label: 'Home', path: '/mobile' },
            { id: 'jobs', icon: Briefcase, label: 'Jobs', path: '/mobile/jobs' },
            { id: 'messages', icon: MessageCircle, label: 'Messages', path: '/mobile/messages' },
            { id: 'leave', icon: Calendar, label: 'Leave', path: '/mobile/leave' },
            { id: 'profile', icon: User, label: 'Profile', path: '/mobile/profile' },
          ].map(tab => (
            <button key={tab.id} onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-600">
              <tab.icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
