import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { 
  Briefcase, Clock, CheckCircle2, MapPin, 
  Camera, AlertCircle, Package, LogOut,
  Play, RefreshCw, ChevronDown,
  Calendar, Search, User, Users,
  Hand, Home, MessageCircle, Umbrella,
  BarChart3, Map, Send, Star,
  LogIn, LogOutIcon
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

  const [allOpenJobs, setAllOpenJobs] = useState([])
  const [myActiveJobs, setMyActiveJobs] = useState([])
  const [loadingAllJobs, setLoadingAllJobs] = useState(false)
  const [jobSearch, setJobSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [myEmployeeId, setMyEmployeeId] = useState(null)

  // Theme & Screen
  const [themeVariant, setThemeVariant] = useState('light')
  const [currentScreen, setCurrentScreen] = useState('dashboard')
  const [screenHistory, setScreenHistory] = useState(['dashboard'])

  // Clock In/Out State - Persisted across sessions
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [clockInTime, setClockInTime] = useState(null)
  const [clockingInOut, setClockingInOut] = useState(false)

  // Schedule data
  const [schedules, setSchedules] = useState([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)

  // Messages data
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')

  // Leave data
  const [leaveRequests, setLeaveRequests] = useState([])
  const [leaveForm, setLeaveForm] = useState({ type: 'annual', from: '', to: '', reason: '' })
  const [submittingLeave, setSubmittingLeave] = useState(false)

  // Performance data
  const [performance, setPerformance] = useState({ completedToday: 0, totalHours: 0, rating: 0 })

  // Incident form
  const [incidentForm, setIncidentForm] = useState({ type: 'other', description: '', severity: 'medium' })
  const [incidentPhoto, setIncidentPhoto] = useState(null)
  const [submittingIncident, setSubmittingIncident] = useState(false)

  // Supplies form
  const [supplyForm, setSupplyForm] = useState({ item: '', quantity: 1, notes: '' })
  const [submittingSupply, setSubmittingSupply] = useState(false)

  useEffect(() => {
    initData()
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (myEmployeeId) {
      loadAllJobs()
      checkClockStatus()
    }
  }, [myEmployeeId])

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

  // Check clock status from DATABASE - persists across sessions
  const checkClockStatus = async () => {
    if (!myEmployeeId) return
    try {
      const today = new Date().toISOString().split('T')[0]
      console.log('🔍 Checking clock status for employee:', myEmployeeId, 'date:', today)
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', myEmployeeId)
        .eq('attendance_date', today)
        .order('created_at', { ascending: false })
        .limit(1)

      console.log('📊 Clock status raw data:', data)

      if (data && data.length > 0) {
        const record = data[0]
        // User is clocked in if they have a clock_in_time AND NO clock_out_time
        if (record.clock_in_time && !record.clock_out_time) {
          console.log('✅ User is currently CLOCKED IN since:', record.clock_in_time)
          setIsClockedIn(true)
          setClockInTime(record.clock_in_time)
        } else if (record.clock_out_time) {
          console.log('🚪 User has already CLOCKED OUT at:', record.clock_out_time)
          setIsClockedIn(false)
          setClockInTime(null)
        } else {
          console.log('⚠️ Unknown state - treating as not clocked in')
          setIsClockedIn(false)
          setClockInTime(null)
        }
      } else {
        console.log('📝 No attendance record for today - not clocked in')
        setIsClockedIn(false)
        setClockInTime(null)
      }
    } catch (e) {
      console.error('❌ Error checking clock status:', e)
      // Default to not clocked in on error
      setIsClockedIn(false)
      setClockInTime(null)
    }
  }

  const loadAllJobs = async () => {
    setLoadingAllJobs(true)
    try {
      let openQuery = supabase.from('jobs')
        .select('id, title, job_number, status, scheduled_date, scheduled_start_time, scheduled_end_time, site_address, notes, clients(company_name, phone), job_categories(name, color)')
        .in('status', ['pending', 'scheduled']).order('scheduled_date', { ascending: true }).order('scheduled_start_time', { ascending: true })
      const { data: openJobs } = await openQuery
      setAllOpenJobs(openJobs || [])

      let myQuery = supabase.from('jobs')
        .select('id, title, job_number, status, scheduled_date, scheduled_start_time, scheduled_end_time, site_address, notes, clients(company_name, phone), job_categories(name, color)')
        .eq('status', 'in_progress').order('scheduled_date', { ascending: true }).order('scheduled_start_time', { ascending: true })
      const { data: myJobsData } = await myQuery
      setMyActiveJobs(myJobsData || [])
    } catch (error) { console.error('Error:', error) }
    finally { setLoadingAllJobs(false) }
  }

  const loadSchedules = async () => {
    setLoadingSchedule(true)
    try {
      const { data } = await supabase.from('employee_shifts')
        .select('*, shift_types(*), jobs(title, site_address)')
        .eq('employee_id', myEmployeeId)
        .gte('shift_date', new Date().toISOString().split('T')[0])
        .order('shift_date', { ascending: true }).limit(14)
      setSchedules(data || [])
    } catch (e) { console.error(e) }
    finally { setLoadingSchedule(false) }
  }

  const loadLeaveRequests = async () => {
    try {
      const { data } = await supabase.from('leave_requests')
        .select('*, leave_types(name)').eq('employee_id', myEmployeeId)
        .order('created_at', { ascending: false }).limit(10)
      setLeaveRequests(data || [])
    } catch (e) { console.error(e) }
  }

  const loadPerformance = async () => {
    const today = new Date().toISOString().split('T')[0]
    try {
      const { count: completed } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('actual_end_time', today + 'T00:00:00')
      setPerformance({ completedToday: completed || 0, totalHours: '0.0', rating: 4.5 })
    } catch (e) { console.error(e) }
  }

  const handleRefresh = async () => { 
    setRefreshing(true)
    await initData()
    await loadAllJobs()
    await checkClockStatus()
    setTimeout(() => setRefreshing(false), 500) 
  }

  const switchScreen = (screenId) => {
    setCurrentScreen(screenId)
    setScreenHistory(prev => [...prev, screenId])
    if (screenId === 'schedule') loadSchedules()
    if (screenId === 'leave') loadLeaveRequests()
    if (screenId === 'performance') loadPerformance()
    if (screenId === 'gps' || screenId === 'dashboard') checkClockStatus()
  }

  const goBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = [...screenHistory]
      newHistory.pop()
      setScreenHistory(newHistory)
      setCurrentScreen(newHistory[newHistory.length - 1])
    }
  }

  // JOB ACTIONS
  const handleSelectJob = async (jobId) => {
    if (!myEmployeeId) { toast.error('Profile not ready.'); return }
    setUpdatingJob(jobId)
    try {
      const cleanerName = myProfile?.first_name || user?.email?.split('@')[0] || 'Cleaner'
      await supabase.from('jobs').update({ status: 'in_progress', actual_start_time: new Date().toISOString(), updated_at: new Date().toISOString(), notes: `SELECTED BY: ${cleanerName}` }).eq('id', jobId)
      toast.success('Job selected! ✅')
      await loadAllJobs(); setActiveTab('mine')
    } catch { toast.error('Failed') } finally { setUpdatingJob(null) }
  }

  const handleStartJob = async (jobId) => {
    setUpdatingJob(jobId)
    try { await supabase.from('jobs').update({ status: 'in_progress', actual_start_time: new Date().toISOString() }).eq('id', jobId); toast.success('Started! 🚀'); loadAllJobs() } catch { toast.error('Failed') } finally { setUpdatingJob(null) }
  }

  const handleCompleteJob = async (jobId) => {
    if (!window.confirm('Mark as completed? Sends for invoicing.')) return
    setUpdatingJob(jobId)
    try { await supabase.from('jobs').update({ status: 'completed', actual_end_time: new Date().toISOString() }).eq('id', jobId); toast.success('Completed! ✅'); loadAllJobs() } catch { toast.error('Failed') } finally { setUpdatingJob(null) }
  }

  // CLOCK IN / OUT - Cannot clock in again without clocking out first
  const handleClockToggle = () => {
    if (!myEmployeeId) { toast.error('Profile not ready. Please wait or refresh.'); return }
    
    // If already clocked in, confirm clock out
    if (isClockedIn) {
      if (!window.confirm('Clock out and end your shift?')) return
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        setClockingInOut(true)
        try {
          const today = new Date().toISOString().split('T')[0]
          const now = new Date().toISOString()

          console.log('🕐 Toggle. Current state - Clocked in?', isClockedIn)

          if (isClockedIn) {
            // CLOCK OUT - Find the active record and update it
            console.log('🚪 CLOCKING OUT...')
            
            // Find the record that has clock_in but no clock_out
            const { data: activeRecord, error: findError } = await supabase
              .from('attendance_records')
              .select('id')
              .eq('employee_id', myEmployeeId)
              .eq('attendance_date', today)
              .is('clock_out_time', null)
              .order('created_at', { ascending: false })
              .limit(1)

            if (findError) {
              console.error('Error finding active record:', findError)
              toast.error('Error finding your clock-in record')
              return
            }

            if (!activeRecord || activeRecord.length === 0) {
              // No active record found - might have been clocked out by admin
              console.log('⚠️ No active clock-in record found')
              setIsClockedIn(false)
              setClockInTime(null)
              toast('No active clock-in record found. You may have been clocked out by admin.')
              return
            }

            const recordId = activeRecord[0].id
            console.log('Found active record:', recordId)

            // Update the record with clock out time
            const { error: updateError } = await supabase
              .from('attendance_records')
              .update({ 
                clock_out_time: now,
                check_out_method: 'gps',
                check_out_latitude: position.coords.latitude,
                check_out_longitude: position.coords.longitude,
                updated_at: now
              })
              .eq('id', recordId)

            if (updateError) {
              console.error('❌ Clock out error:', updateError)
              toast.error('Failed to clock out. Please try again.')
            } else {
              console.log('✅ Successfully CLOCKED OUT')
              setIsClockedIn(false)
              setClockInTime(null)
              toast.success('✅ Clocked out! Have a great day! 👋')
              // Refresh stats
              if (profile?.id) await fetchMobileStats(profile.id)
            }
          } else {
            // CLOCK IN - Only if not already clocked in
            console.log('🟢 CLOCKING IN...')
            
            // Double-check they're not already clocked in
            const { data: existingActive } = await supabase
              .from('attendance_records')
              .select('id')
              .eq('employee_id', myEmployeeId)
              .eq('attendance_date', today)
              .is('clock_out_time', null)
              .limit(1)

            if (existingActive && existingActive.length > 0) {
              console.log('⚠️ Already have an active clock-in. Preventing double clock-in.')
              toast.error('You are already clocked in! Please clock out first.')
              await checkClockStatus() // Refresh state
              return
            }
            
            // Insert new clock-in record
            const { error: insertError } = await supabase
              .from('attendance_records')
              .upsert([{
                employee_id: myEmployeeId,
                attendance_date: today,
                clock_in_time: now,
                check_in_method: 'gps',
                check_in_latitude: position.coords.latitude,
                check_in_longitude: position.coords.longitude,
                status: 'present'
              }], { onConflict: 'employee_id,attendance_date' })

            if (insertError) {
              console.error('❌ Clock in error:', insertError)
              toast.error('Failed to clock in. Please try again.')
            } else {
              console.log('✅ Successfully CLOCKED IN')
              setIsClockedIn(true)
              setClockInTime(now)
              toast.success(`✅ Clocked in! 📍 Location recorded`)
              // Refresh stats
              if (profile?.id) await fetchMobileStats(profile.id)
            }
          }
          
        } catch (error) {
          console.error('❌ Clock error:', error)
          toast.error('Failed to record attendance')
        } finally {
          setClockingInOut(false)
        }
      }, (err) => {
        console.error('📍 GPS error:', err)
        toast.error('Location access needed. Please enable GPS in your device settings.')
      })
    } else {
      toast.error('Geolocation not available on this device')
    }
  }

  // INCIDENT
  const handleSubmitIncident = async () => {
    if (!incidentForm.description.trim()) { toast.error('Describe the incident'); return }
    setSubmittingIncident(true)
    try {
      let photoUrl = null
      if (incidentPhoto) {
        const fileExt = incidentPhoto.name.split('.').pop()
        const fileName = `incidents/${Date.now()}.${fileExt}`
        await supabase.storage.from('fleet').upload(fileName, incidentPhoto, { upsert: true })
        const { data: { publicUrl } } = supabase.storage.from('fleet').getPublicUrl(fileName)
        photoUrl = publicUrl
      }
      await supabase.from('incident_reports').insert([{
        employee_id: myEmployeeId, incident_type: incidentForm.type, description: incidentForm.description,
        severity: incidentForm.severity, photo_url: photoUrl, status: 'reported'
      }])
      toast.success('Incident reported! ✅')
      setIncidentForm({ type: 'other', description: '', severity: 'medium' }); setIncidentPhoto(null)
    } catch { toast.error('Failed') } finally { setSubmittingIncident(false) }
  }

  // SUPPLIES
  const handleSubmitSupply = async () => {
    if (!supplyForm.item.trim()) { toast.error('Enter item name'); return }
    setSubmittingSupply(true)
    try {
      const { data: req } = await supabase.from('supplies_requests').insert([{ employee_id: myEmployeeId, status: 'pending', notes: supplyForm.notes }]).select('id').single()
      if (req) await supabase.from('supplies_request_items').insert([{ request_id: req.id, item_name: supplyForm.item, quantity: supplyForm.quantity, unit: 'each' }])
      toast.success('Supply request submitted! ✅')
      setSupplyForm({ item: '', quantity: 1, notes: '' })
    } catch { toast.error('Failed') } finally { setSubmittingSupply(false) }
  }

  // LEAVE
  const handleSubmitLeave = async () => {
    if (!leaveForm.from || !leaveForm.to) { toast.error('Select dates'); return }
    setSubmittingLeave(true)
    try {
      const from = new Date(leaveForm.from); const to = new Date(leaveForm.to)
      const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1
      await supabase.from('leave_requests').insert([{
        employee_id: myEmployeeId, leave_type_id: leaveForm.type === 'annual' ? 1 : leaveForm.type === 'sick' ? 2 : 3,
        start_date: leaveForm.from, end_date: leaveForm.to, total_days: days, reason: leaveForm.reason, status: 'pending'
      }])
      toast.success('Leave request submitted! ✅')
      setLeaveForm({ type: 'annual', from: '', to: '', reason: '' }); loadLeaveRequests()
    } catch { toast.error('Failed') } finally { setSubmittingLeave(false) }
  }

  const formatTime = (date) => date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (date) => date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
  const formatDateShort = (date) => { if (!date) return ''; const d = new Date(date + 'T00:00:00'); return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }) }
  const todayStr = new Date().toISOString().split('T')[0]

  const cardClasses = "rounded-[24px] p-4 shadow-[8px_8px_16px_#bcc3cf,-8px_-8px_16px_#ffffff] bg-[#eef1f6]"
  const cardInsetClasses = "rounded-[18px] p-3 shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] bg-[#e9edf2]"
  const btnClasses = "rounded-[40px] py-3.5 px-5 font-semibold shadow-[6px_6px_12px_#bcc3cf,-4px_-4px_12px_#ffffff] bg-[#eef1f6] active:shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] active:scale-[0.97] transition-all text-[#2e3b4e]"
  const btnPrimaryClasses = "rounded-[40px] py-3.5 px-5 font-semibold shadow-[6px_6px_14px_#bcc3cf,-4px_-4px_12px_#ffffff] bg-gradient-to-br from-[#6a8baa] to-[#5a7795] text-white active:scale-[0.97] transition-all"
  const inputClasses = "w-full py-3.5 px-4 rounded-[40px] shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] bg-[#e9edf2] outline-none text-[#2e3b4e] text-sm"

  // DASHBOARD
  const renderDashboard = () => (
    <div className="space-y-4">
      <div className={cardClasses}>
        <h3 className="text-xl font-bold text-[#2e3b4e]">{greeting}, {myProfile?.first_name || 'Cleaner'}</h3>
        <p className="text-[#5e6f82] text-sm">ID: {myProfile?.employee_code || 'N/A'}</p>
        <p className="text-4xl font-bold text-center my-2 font-mono text-[#2e3b4e]">{formatTime(currentTime)}</p>
      </div>

      {/* Clock In/Out Toggle - Persists across sessions */}
      <div className={`${cardClasses} flex items-center justify-between`}>
        <div>
          <span className="flex items-center gap-2 text-[#2e3b4e] font-semibold">
            {isClockedIn ? (
              <><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Clocked In</>
            ) : (
              <><span className="w-2 h-2 rounded-full bg-slate-400"></span> Not Clocked In</>
            )}
          </span>
          {clockInTime && (
            <p className="text-xs text-[#5e6f82] mt-1">Since: {new Date(clockInTime).toLocaleTimeString()}</p>
          )}
        </div>
        <button onClick={handleClockToggle} disabled={clockingInOut}
          className={`rounded-[40px] py-3 px-6 font-semibold shadow-[6px_6px_14px_#bcc3cf] active:scale-[0.97] transition-all text-sm ${
            isClockedIn ? 'bg-gradient-to-br from-red-400 to-red-600 text-white' : 'bg-gradient-to-br from-[#4b9b6b] to-[#3d8b5f] text-white'
          }`}>
          {clockingInOut ? <RefreshCw className="w-4 h-4 animate-spin inline mr-1" /> : isClockedIn ? <LogOutIcon className="w-4 h-4 inline mr-1" /> : <LogIn className="w-4 h-4 inline mr-1" />}
          {isClockedIn ? 'Clock Out' : 'Clock In'}
        </button>
      </div>

      {/* Quick Actions */}
      <div className={cardClasses}>
        <h4 className="font-semibold text-[#2e3b4e] mb-3">Quick Actions</h4>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: Briefcase, label: 'My Jobs', screen: 'jobs', color: '#5f7d9c' }, { icon: Map, label: 'Clock In', screen: 'gps', color: '#4b9b6b' },
            { icon: Camera, label: 'Photos', screen: 'photos', color: '#7a94ae' }, { icon: Package, label: 'Supplies', screen: 'supplies', color: '#c99f4b' },
            { icon: AlertCircle, label: 'Incident', screen: 'incident', color: '#c15b5b' }, { icon: Umbrella, label: 'Leave', screen: 'leave', color: '#5f7d9c' },
            { icon: Calendar, label: 'Schedule', screen: 'schedule', color: '#7a94ae' }, { icon: MessageCircle, label: 'Messages', screen: 'messages', color: '#4b9b6b' },
            { icon: BarChart3, label: 'Stats', screen: 'performance', color: '#c99f4b' },
          ].map(item => (
            <button key={item.label} onClick={() => switchScreen(item.screen)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-[18px] shadow-[6px_6px_12px_#bcc3cf,-4px_-4px_12px_#ffffff] bg-[#eef1f6] active:scale-[0.96] transition-all">
              <div className="p-2 rounded-2xl shadow-[inset_2px_2px_4px_#bcc3cf,inset_-2px_-2px_4px_#ffffff] bg-[#e9edf2]" style={{ color: item.color }}><item.icon className="w-5 h-5" /></div>
              <span className="text-[11px] font-semibold text-[#2e3b4e] text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => { if (themeVariant === 'light') setThemeVariant('dark'); else if (themeVariant === 'dark') setThemeVariant('glass-neo'); else setThemeVariant('light') }}
        className={btnClasses + " text-xs w-full"}>🎨 {themeVariant === 'light' ? 'Light' : themeVariant === 'dark' ? 'Dark' : 'Glass'}</button>
    </div>
  )

  // JOBS
  const renderJobs = () => {
    const fo = allOpenJobs.filter(j => !jobSearch || (j.title||'').toLowerCase().includes(jobSearch.toLowerCase()))
    const fm = myActiveJobs.filter(j => !jobSearch || (j.title||'').toLowerCase().includes(jobSearch.toLowerCase()))
    return (
      <div className="space-y-4">
        <button onClick={goBack} className={`${btnClasses} text-sm inline-flex items-center gap-2`}>← Back</button>
        <div className={cardClasses}>
          <h3 className="font-bold text-[#2e3b4e] text-lg mb-3">Jobs</h3>
          <div className="flex gap-2 mb-3">
            {[{ id: 'all', label: `Open (${fo.length})` }, { id: 'mine', label: `My Jobs (${fm.length})` }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2.5 rounded-[30px] font-semibold text-sm ${activeTab===tab.id?'bg-[#5f7d9c] text-white shadow-[inset_3px_3px_6px_#3e5268]':'bg-[#eef1f6] text-[#2e3b4e] shadow-[4px_4px_8px_#bcc3cf]'}`}>{tab.label}</button>
            ))}
          </div>
          <div className="relative mb-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5e6f82]" /><input type="text" value={jobSearch} onChange={e => setJobSearch(e.target.value)} placeholder="Search jobs..." className={inputClasses + " pl-9"} /></div>
          {activeTab === 'all' && (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {loadingAllJobs ? <p className="text-center py-4">Loading...</p> : fo.length > 0 ? fo.map(job => (
                <div key={job.id} className={cardInsetClasses + " border-l-4 border-l-[#5f7d9c]"}>
                  <div className="flex justify-between mb-1"><div><p className="font-semibold text-sm">{job.title}</p><p className="text-xs text-[#5e6f82]">{job.job_number} · {job.clients?.company_name}</p></div><span className="px-2 py-0.5 rounded-full text-[10px] bg-[#5f7d9c]/20 text-[#5f7d9c]">Open</span></div>
                  <div className="text-xs text-[#5e6f82] mb-1"><Calendar className="w-3 h-3 inline" /> {job.scheduled_date===todayStr?'Today':formatDateShort(job.scheduled_date)} · <Clock className="w-3 h-3 inline" /> {job.scheduled_start_time?.slice(0,5)}-{job.scheduled_end_time?.slice(0,5)}</div>
                  <div className="text-xs text-[#5e6f82] mb-2"><MapPin className="w-3 h-3 inline" /> {job.site_address?.slice(0,35)}</div>
                  <button onClick={() => handleSelectJob(job.id)} className={btnPrimaryClasses + " w-full text-sm"}><Hand className="w-4 h-4 inline mr-1" /> Select Job</button>
                </div>
              )) : <div className={cardInsetClasses + " text-center"}><p className="text-[#5e6f82]">No open jobs</p></div>}
            </div>
          )}
          {activeTab === 'mine' && (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {loadingAllJobs ? <p className="text-center py-4">Loading...</p> : fm.length > 0 ? fm.map(job => (
                <div key={job.id} className={cardInsetClasses + " border-l-4 border-l-[#c99f4b]"}>
                  <div className="flex justify-between mb-1"><div><p className="font-semibold text-sm">{job.title}</p><p className="text-xs text-[#5e6f82]">{job.job_number} · {job.clients?.company_name}</p></div><span className="px-2 py-0.5 rounded-full text-[10px] bg-[#c99f4b]/20 text-[#c99f4b]">Active</span></div>
                  <div className="text-xs text-[#5e6f82] mb-1"><Calendar className="w-3 h-3 inline" /> {job.scheduled_date===todayStr?'Today':formatDateShort(job.scheduled_date)} · <Clock className="w-3 h-3 inline" /> {job.scheduled_start_time?.slice(0,5)}-{job.scheduled_end_time?.slice(0,5)}</div>
                  <div className="text-xs text-[#5e6f82] mb-2"><MapPin className="w-3 h-3 inline" /> {job.site_address?.slice(0,35)}</div>
                  <div className="flex gap-2 mb-2">
                    <button onClick={() => handleStartJob(job.id)} className="flex-1 py-2 rounded-[40px] font-semibold text-xs bg-[#5f7d9c] text-white"><Play className="w-3 h-3 inline mr-1" />Start</button>
                    <button onClick={() => handleCompleteJob(job.id)} className="flex-1 py-2 rounded-[40px] font-semibold text-xs bg-[#4b9b6b] text-white"><CheckCircle2 className="w-3 h-3 inline mr-1" />Complete</button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => navigate('/mobile/photos')} className="py-1.5 rounded-xl text-[10px] font-medium bg-[#e9edf2] shadow-[inset_2px_2px_4px_#bcc3cf] text-[#5f7d9c]"><Camera className="w-3 h-3 inline mr-0.5" />Photos</button>
                    <button onClick={() => navigate('/mobile/supplies')} className="py-1.5 rounded-xl text-[10px] font-medium bg-[#e9edf2] shadow-[inset_2px_2px_4px_#bcc3cf] text-[#c99f4b]"><Package className="w-3 h-3 inline mr-0.5" />Supplies</button>
                    <button onClick={() => navigate('/mobile/incident')} className="py-1.5 rounded-xl text-[10px] font-medium bg-[#e9edf2] shadow-[inset_2px_2px_4px_#bcc3cf] text-[#c15b5b]"><AlertCircle className="w-3 h-3 inline mr-0.5" />Incident</button>
                  </div>
                </div>
              )) : <div className={cardInsetClasses + " text-center"}><p className="text-[#5e6f82]">No active jobs</p></div>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // GPS / CLOCK IN SCREEN
  const renderGPS = () => (
    <div className="space-y-4">
      <button onClick={goBack} className={`${btnClasses} text-sm inline-flex items-center gap-2`}>← Back</button>
      <div className={cardClasses + " text-center"}>
        <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] ${isClockedIn ? 'bg-green-100' : 'bg-[#e9edf2]'}`}>
          {isClockedIn ? <LogOutIcon className="w-10 h-10 text-red-500" /> : <Map className="w-10 h-10 text-[#4b9b6b]" />}
        </div>
        <h3 className="font-bold text-[#2e3b4e] text-lg mb-2">{isClockedIn ? 'Clock Out' : 'Clock In'}</h3>
        <p className="text-[#5e6f82] text-sm mb-4">{isClockedIn ? 'Tap to clock out and end your shift' : 'Tap to record your GPS location and start your shift'}</p>
        <button onClick={handleClockToggle} disabled={clockingInOut}
          className={`rounded-[40px] py-4 w-full font-bold text-lg shadow-[6px_6px_14px_#bcc3cf,-4px_-4px_12px_#ffffff] active:scale-[0.97] transition-all ${isClockedIn ? 'bg-gradient-to-br from-red-400 to-red-600 text-white' : 'bg-gradient-to-br from-[#4b9b6b] to-[#3d8b5f] text-white'}`}>
          {clockingInOut ? <RefreshCw className="w-5 h-5 animate-spin inline mr-2" /> : isClockedIn ? <LogOutIcon className="w-5 h-5 inline mr-2" /> : <Map className="w-5 h-5 inline mr-2" />}
          {isClockedIn ? 'Clock Out' : 'Clock In with GPS'}
        </button>
        <div className={cardInsetClasses + " mt-4 text-left"}>
          <p className="text-sm text-[#2e3b4e]"><strong>Status:</strong> {isClockedIn ? '🟢 Currently Clocked In' : '⚪ Not Clocked In'}</p>
          {clockInTime && <p className="text-xs text-[#5e6f82] mt-1">Clocked in at: {new Date(clockInTime).toLocaleTimeString()}</p>}
        </div>
      </div>
    </div>
  )

  // PHOTOS SCREEN
  const renderPhotos = () => (
    <div className="space-y-4"><button onClick={goBack} className={`${btnClasses} text-sm`}>← Back</button><div className={cardClasses+" text-center"}><Camera className="w-16 h-16 mx-auto text-[#7a94ae] mb-4"/><h3 className="font-bold text-lg mb-2">Job Photos</h3><button onClick={()=>navigate('/mobile/photos')} className={btnPrimaryClasses+" w-full"}>Open Camera</button></div></div>
  )

  // SUPPLIES SCREEN
  const renderSupplies = () => (
    <div className="space-y-4"><button onClick={goBack} className={`${btnClasses} text-sm`}>← Back</button><div className={cardClasses}><h3 className="font-bold text-lg mb-3"><Package className="w-5 h-5 inline mr-2 text-[#c99f4b]"/>Request Supplies</h3><div className="space-y-3"><input type="text" value={supplyForm.item} onChange={e=>setSupplyForm({...supplyForm,item:e.target.value})} placeholder="Item name" className={inputClasses}/><div className="flex gap-2"><input type="number" value={supplyForm.quantity} onChange={e=>setSupplyForm({...supplyForm,quantity:parseInt(e.target.value)||1})} className={inputClasses+" flex-1"}/><select className={inputClasses+" flex-1"}><option>Each</option></select></div><textarea value={supplyForm.notes} onChange={e=>setSupplyForm({...supplyForm,notes:e.target.value})} placeholder="Notes" rows={2} className={inputClasses+" rounded-[24px]"}/><button onClick={handleSubmitSupply} disabled={submittingSupply} className={btnPrimaryClasses+" w-full"}>{submittingSupply?'Submitting...':'Submit Request'}</button></div></div></div>
  )

  // INCIDENT SCREEN
  const renderIncident = () => (
    <div className="space-y-4"><button onClick={goBack} className={`${btnClasses} text-sm`}>← Back</button><div className={cardClasses}><h3 className="font-bold text-lg mb-3"><AlertCircle className="w-5 h-5 inline mr-2 text-[#c15b5b]"/>Report Incident</h3><div className="space-y-3"><div className="flex gap-2 flex-wrap">{['damage','injury','complaint','security','other'].map(t=>(<button key={t} onClick={()=>setIncidentForm({...incidentForm,type:t})} className={`px-3 py-1.5 rounded-full text-xs ${incidentForm.type===t?'bg-[#c15b5b] text-white':'bg-[#e9edf2]'}`}>{t}</button>))}</div><div className="flex gap-2">{['low','medium','high','critical'].map(s=>(<button key={s} onClick={()=>setIncidentForm({...incidentForm,severity:s})} className={`flex-1 py-1.5 rounded-full text-xs ${incidentForm.severity===s?'bg-[#c15b5b] text-white':'bg-[#e9edf2]'}`}>{s}</button>))}</div><textarea value={incidentForm.description} onChange={e=>setIncidentForm({...incidentForm,description:e.target.value})} placeholder="Describe what happened..." rows={4} className={inputClasses+" rounded-[24px]"}/><label className="block text-center p-4 border-2 border-dashed border-[#bcc3cf] rounded-[20px] cursor-pointer"><Camera className="w-6 h-6 mx-auto text-[#5f7d9c]"/><span className="text-xs">{incidentPhoto?incidentPhoto.name:'Add photo'}</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>setIncidentPhoto(e.target.files[0])}/></label><button onClick={handleSubmitIncident} disabled={submittingIncident} className="bg-[#c15b5b] text-white rounded-[40px] py-3.5 w-full font-semibold shadow-[6px_6px_14px_#bcc3cf] active:scale-[0.97]">{submittingIncident?'Submitting...':'Submit Incident Report'}</button></div></div></div>
  )

  // SCHEDULE SCREEN
  const renderSchedule = () => (
    <div className="space-y-4"><button onClick={goBack} className={`${btnClasses} text-sm`}>← Back</button><div className={cardClasses}><h3 className="font-bold text-lg mb-3"><Calendar className="w-5 h-5 inline mr-2 text-[#7a94ae]"/>My Schedule</h3>{loadingSchedule?<p className="text-center py-4">Loading...</p>:schedules.length>0?<div className="space-y-2 max-h-[400px] overflow-y-auto">{schedules.map((s,i)=>(<div key={i} className={cardInsetClasses}><div className="flex justify-between mb-1"><p className="font-semibold text-sm">{s.shift_types?.name||'Shift'}</p><span className="text-xs">{formatDateShort(s.shift_date)}</span></div><p className="text-xs">{s.shift_types?.start_time?.slice(0,5)}-{s.shift_types?.end_time?.slice(0,5)}</p>{s.jobs?.title&&<p className="text-xs mt-1">{s.jobs.title}·{s.jobs.site_address?.slice(0,25)}</p>}</div>))}</div>:<div className={cardInsetClasses+" text-center"}><p>No schedules</p></div>}</div></div>
  )

  // MESSAGES SCREEN
  const renderMessages = () => (
    <div className="space-y-4"><button onClick={goBack} className={`${btnClasses} text-sm`}>← Back</button><div className={cardClasses}><h3 className="font-bold text-lg mb-3"><MessageCircle className="w-5 h-5 inline mr-2 text-[#4b9b6b]"/>Messages</h3><div className="space-y-2 max-h-[300px] overflow-y-auto mb-3">{messages.length>0?messages.map((m,i)=>(<div key={i} className={cardInsetClasses}><p className="font-semibold text-sm">{m.from}</p><p className="text-xs">{m.text}</p><span className="text-[10px]">{m.time}</span></div>)):<div className={cardInsetClasses+" text-center"}><p>No messages</p></div>}</div><div className="flex gap-2"><input type="text" value={newMessage} onChange={e=>setNewMessage(e.target.value)} placeholder="Type..." className={inputClasses+" flex-1"}/><button onClick={()=>{if(newMessage.trim()){setMessages([...messages,{from:'You',text:newMessage,time:new Date().toLocaleTimeString()}]);setNewMessage('');toast.success('Sent!')}}} className="bg-[#4b9b6b] text-white rounded-full p-3 shadow-[4px_4px_8px_#bcc3cf] active:scale-[0.97]"><Send className="w-5 h-5"/></button></div></div></div>
  )

  // LEAVE SCREEN
  const renderLeave = () => (
    <div className="space-y-4"><button onClick={goBack} className={`${btnClasses} text-sm`}>← Back</button><div className={cardClasses}><h3 className="font-bold text-lg mb-3"><Umbrella className="w-5 h-5 inline mr-2 text-[#5f7d9c]"/>Leave</h3><div className="space-y-3"><select value={leaveForm.type} onChange={e=>setLeaveForm({...leaveForm,type:e.target.value})} className={inputClasses}><option value="annual">Annual</option><option value="sick">Sick</option><option value="family">Family</option></select><div className="flex gap-2"><input type="date" value={leaveForm.from} onChange={e=>setLeaveForm({...leaveForm,from:e.target.value})} className={inputClasses+" flex-1"}/><input type="date" value={leaveForm.to} onChange={e=>setLeaveForm({...leaveForm,to:e.target.value})} className={inputClasses+" flex-1"}/></div><textarea value={leaveForm.reason} onChange={e=>setLeaveForm({...leaveForm,reason:e.target.value})} placeholder="Reason" rows={2} className={inputClasses+" rounded-[24px]"}/><button onClick={handleSubmitLeave} disabled={submittingLeave} className={btnPrimaryClasses+" w-full"}>{submittingLeave?'Submitting...':'Submit'}</button></div>{leaveRequests.length>0&&<div className="mt-4"><h4 className="font-semibold text-sm mb-2">Recent</h4><div className="space-y-2">{leaveRequests.map(l=>(<div key={l.id} className={cardInsetClasses+" flex justify-between"}><div><p className="font-semibold text-xs">{l.leave_types?.name}</p><p className="text-[10px]">{l.start_date}→{l.end_date}({l.total_days}d)</p></div><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${l.status==='approved'?'bg-green-100 text-green-700':l.status==='rejected'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{l.status}</span></div>))}</div></div>}</div></div>
  )

  // PERFORMANCE SCREEN
  const renderPerformance = () => (
    <div className="space-y-4"><button onClick={goBack} className={`${btnClasses} text-sm`}>← Back</button><div className={cardClasses}><h3 className="font-bold text-lg mb-3"><BarChart3 className="w-5 h-5 inline mr-2 text-[#c99f4b]"/>Stats</h3><div className="grid grid-cols-3 gap-3">{[{label:'Completed',value:performance.completedToday,icon:CheckCircle2,color:'#4b9b6b'},{label:'Hours',value:performance.totalHours+'h',icon:Clock,color:'#5f7d9c'},{label:'Rating',value:performance.rating+'/5',icon:Star,color:'#c99f4b'}].map(s=>(<div key={s.label} className={cardInsetClasses+" text-center"}><s.icon className="w-6 h-6 mx-auto mb-1" style={{color:s.color}}/><p className="text-lg font-bold">{s.value}</p><p className="text-[10px]">{s.label}</p></div>))}</div></div></div>
  )

  // PROFILE SCREEN
  const renderProfile = () => (
    <div className="space-y-4"><button onClick={goBack} className={`${btnClasses} text-sm`}>← Back</button><div className={cardClasses+" text-center"}><div className="w-20 h-20 rounded-full bg-[#e9edf2] shadow-[inset_4px_4px_8px_#bcc3cf] flex items-center justify-center mx-auto mb-3"><User className="w-10 h-10 text-[#5f7d9c]"/></div><h3 className="font-bold text-lg">{myProfile?.first_name} {myProfile?.last_name}</h3><p className="text-sm">{myProfile?.employee_code||'N/A'}</p><div className={cardInsetClasses+" mt-3 text-left space-y-2"}><p className="text-sm"><strong>Email:</strong> {user?.email}</p><p className="text-sm"><strong>Dept:</strong> {myProfile?.department||'Cleaning'}</p><p className="text-sm"><strong>Status:</strong> {myProfile?.employment_status||'Active'}</p></div><button onClick={()=>{signOut();navigate('/login')}} className="bg-[#c15b5b] text-white rounded-[40px] py-3 w-full mt-3 font-semibold shadow-[6px_6px_14px_#bcc3cf] active:scale-[0.97]"><LogOut className="w-4 h-4 inline mr-2"/>Sign Out</button></div></div>
  )

  // RENDER SCREEN - FIXED: All cases now have render functions
  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard': return renderDashboard()
      case 'jobs': return renderJobs()
      case 'gps': return renderGPS()
      case 'photos': return renderPhotos()
      case 'supplies': return renderSupplies()
      case 'incident': return renderIncident()
      case 'schedule': return renderSchedule()
      case 'messages': return renderMessages()
      case 'leave': return renderLeave()
      case 'performance': return renderPerformance()
      case 'profile': return renderProfile()
      default: return renderDashboard()
    }
  }

  return (
    <div className={`min-h-screen font-['Inter'] pb-20 transition-colors duration-300 ${themeVariant==='dark'?'bg-[#2f3640]':themeVariant==='glass-neo'?'bg-[#e9edf2]/80 backdrop-blur-xl':'bg-[#e9edf2]'}`}>
      <div ref={scrollRef} className="overflow-y-auto px-3 pt-6 pb-4" style={{maxHeight:'calc(100vh - 80px)'}}>{renderScreen()}</div>
      <div className="fixed bottom-0 left-0 right-0 bg-[#e9edf2] px-3 pb-3 pt-2 rounded-t-[36px] shadow-[0_-8px_18px_rgba(0,0,0,0.05),0_-4px_8px_#bcc3cf] z-50">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {[{id:'dashboard',icon:Home,label:'Home'},{id:'jobs',icon:Briefcase,label:'Jobs'},{id:'schedule',icon:Calendar,label:'Schedule'},{id:'messages',icon:MessageCircle,label:'Messages'},{id:'profile',icon:User,label:'Profile'}].map(item=>(
            <button key={item.id} onClick={()=>switchScreen(item.id)} className="flex flex-col items-center gap-1">
              <div className={`p-2 rounded-[18px] shadow-[3px_3px_6px_#bcc3cf,-3px_-3px_6px_#ffffff] transition-all ${currentScreen===item.id?'bg-[#5f7d9c] text-white shadow-[inset_2px_2px_5px_#3e5268]':'bg-[#eef1f6] text-[#5e6f82]'}`}><item.icon className="w-5 h-5"/></div>
              <span className="text-[10px] font-medium text-[#5e6f82]">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
