import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { 
  Briefcase, Clock, CheckCircle2, MapPin, 
  Camera, AlertCircle, Package, LogOut,
  Play, RefreshCw,
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
  const [themeVariant, setThemeVariant] = useState('light')
  const [currentScreen, setCurrentScreen] = useState('dashboard')
  const [screenHistory, setScreenHistory] = useState(['dashboard'])
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [clockInTime, setClockInTime] = useState(null)
  const [clockingInOut, setClockingInOut] = useState(false)
  const [schedules, setSchedules] = useState([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [leaveRequests, setLeaveRequests] = useState([])
  const [leaveForm, setLeaveForm] = useState({ type: 'annual', from: '', to: '', reason: '' })
  const [submittingLeave, setSubmittingLeave] = useState(false)
  const [performance, setPerformance] = useState({ completedToday: 0, totalHours: 0, rating: 0 })
  const [incidentForm, setIncidentForm] = useState({ type: 'other', description: '', severity: 'medium' })
  const [incidentPhoto, setIncidentPhoto] = useState(null)
  const [submittingIncident, setSubmittingIncident] = useState(false)
  const [supplyForm, setSupplyForm] = useState({ item: '', quantity: 1, notes: '' })
  const [submittingSupply, setSubmittingSupply] = useState(false)
  const [clockChecked, setClockChecked] = useState(false)

  // Initial load
  useEffect(() => { 
    initData()
    const t = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(t) 
  }, [])

  // When employee ID is set, load jobs and check clock
  useEffect(() => {
    if (myEmployeeId) {
      loadAllJobs()
      checkClockStatus()
      setClockChecked(true)
    }
  }, [myEmployeeId])

  // Fallback: check clock status 1.5 seconds after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (myEmployeeId && !clockChecked) {
        checkClockStatus()
        setClockChecked(true)
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [myEmployeeId, clockChecked])

  // Greeting
  useEffect(() => {
    const h = currentTime.getHours()
    if (h < 12) setGreeting('Good Morning')
    else if (h < 17) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')
  }, [currentTime])

  const initData = async () => {
    if (user?.id) await fetchMyProfile(user.id)
    if (profile?.id) { 
      await fetchMobileStats(profile.id)
      await fetchMyJobs(profile.id)
    }
    await setupEmployee()
    // Check clock after setup completes
    if (myEmployeeId) {
      await checkClockStatus()
      setClockChecked(true)
    }
  }

  const setupEmployee = async () => {
    try {
      // Try by user_id
      let { data: emp } = await supabase.from('employees').select('id').eq('user_id', user?.id).single()
      if (emp) { 
        setMyEmployeeId(emp.id)
        await checkClockStatus()
        return 
      }
      
      // Try by email
      const { data: empByEmail } = await supabase.from('employees').select('id').eq('email', user?.email).single()
      if (empByEmail) { 
        await supabase.from('employees').update({ user_id: user?.id }).eq('id', empByEmail.id)
        setMyEmployeeId(empByEmail.id)
        await checkClockStatus()
        return 
      }
      
      // Create new
      const { data: newEmp } = await supabase.from('employees').insert([{
        user_id: user?.id, 
        first_name: user?.email?.split('@')[0] || 'Cleaner', 
        last_name: '',
        email: user?.email, 
        employment_status: 'active', 
        department: 'Cleaning'
      }]).select('id').single()
      
      if (newEmp) {
        setMyEmployeeId(newEmp.id)
        await checkClockStatus()
      }
    } catch (e) { 
      console.error('Setup error:', e) 
    }
  }

  const checkClockStatus = async () => {
    if (!myEmployeeId) {
      // Try to get employee ID from state if available
      const empId = myEmployeeId
      if (!empId) return
    }
    
    const empIdToCheck = myEmployeeId
    if (!empIdToCheck) return
    
    try {
      const today = new Date().toISOString().split('T')[0]
      console.log('🔍 Checking clock for:', empIdToCheck, today)
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', empIdToCheck)
        .eq('attendance_date', today)
        .order('created_at', { ascending: false })
        .limit(1)

      console.log('📊 Clock data:', data, 'Error:', error)

      if (data && data.length > 0) {
        const record = data[0]
        if (record.clock_in_time && !record.clock_out_time) {
          console.log('✅ CLOCKED IN since:', record.clock_in_time)
          setIsClockedIn(true)
          setClockInTime(record.clock_in_time)
        } else {
          console.log('🚪 NOT clocked in')
          setIsClockedIn(false)
          setClockInTime(null)
        }
      } else {
        console.log('📝 No record for today')
        setIsClockedIn(false)
        setClockInTime(null)
      }
    } catch (e) {
      console.error('Check error:', e)
      setIsClockedIn(false)
      setClockInTime(null)
    }
  }

  const loadAllJobs = async () => {
    setLoadingAllJobs(true)
    try {
      const { data: o } = await supabase.from('jobs')
        .select('id,title,job_number,status,scheduled_date,scheduled_start_time,scheduled_end_time,site_address,notes,clients(company_name,phone),job_categories(name,color)')
        .in('status',['pending','scheduled']).order('scheduled_date').order('scheduled_start_time')
      setAllOpenJobs(o||[])
      
      const { data: m } = await supabase.from('jobs')
        .select('id,title,job_number,status,scheduled_date,scheduled_start_time,scheduled_end_time,site_address,notes,clients(company_name,phone),job_categories(name,color)')
        .eq('status','in_progress').order('scheduled_date').order('scheduled_start_time')
      setMyActiveJobs(m||[])
    } catch(e){} finally { setLoadingAllJobs(false) }
  }

  const loadSchedules = async () => { 
    setLoadingSchedule(true)
    try { 
      const { data } = await supabase.from('employee_shifts')
        .select('*,shift_types(*),jobs(title,site_address)')
        .eq('employee_id',myEmployeeId)
        .gte('shift_date',new Date().toISOString().split('T')[0])
        .order('shift_date').limit(14)
      setSchedules(data||[]) 
    } catch(e){} 
    finally { setLoadingSchedule(false) } 
  }

  const loadLeaveRequests = async () => { 
    try { 
      const { data } = await supabase.from('leave_requests')
        .select('*,leave_types(name)').eq('employee_id',myEmployeeId)
        .order('created_at',{ascending:false}).limit(10)
      setLeaveRequests(data||[]) 
    } catch(e){} 
  }

  const loadPerformance = async () => { 
    try { 
      const { count } = await supabase.from('jobs')
        .select('*',{count:'exact',head:true}).eq('status','completed')
        .gte('actual_end_time',new Date().toISOString().split('T')[0]+'T00:00:00')
      setPerformance({completedToday:count||0,totalHours:'0.0',rating:4.5}) 
    } catch(e){} 
  }

  const handleRefresh = async () => { 
    setRefreshing(true)
    await initData()
    await loadAllJobs()
    await checkClockStatus()
    setTimeout(()=>setRefreshing(false),500) 
  }

  const switchScreen = (s) => { 
    setCurrentScreen(s)
    setScreenHistory(p=>[...p,s])
    if(s==='schedule')loadSchedules()
    if(s==='leave')loadLeaveRequests()
    if(s==='performance')loadPerformance()
    if(s==='gps'||s==='dashboard')checkClockStatus()
  }

  const goBack = () => { 
    if(screenHistory.length>1){ 
      const h=[...screenHistory]
      h.pop()
      setScreenHistory(h)
      setCurrentScreen(h[h.length-1])
    } 
  }

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const handleSelectJob = async (jobId) => {
    if(!myEmployeeId){toast.error('Profile not ready.');return}
    setUpdatingJob(jobId)
    try { 
      await supabase.from('jobs').update({
        status:'in_progress',
        actual_start_time:new Date().toISOString(),
        updated_at:new Date().toISOString(),
        notes:`SELECTED BY: ${myProfile?.first_name||user?.email?.split('@')[0]}`
      }).eq('id',jobId)
      toast.success('Job selected!✅')
      await loadAllJobs()
      setActiveTab('mine')
    } catch{} finally{setUpdatingJob(null)}
  }

  const handleStartJob = async (jobId) => { 
    setUpdatingJob(jobId)
    try{
      await supabase.from('jobs').update({
        status:'in_progress',
        actual_start_time:new Date().toISOString()
      }).eq('id',jobId)
      toast.success('Started!🚀')
      loadAllJobs()
    }catch{}finally{setUpdatingJob(null)} 
  }

  const handleCompleteJob = async (jobId) => { 
    if(!window.confirm('Mark as completed?'))return
    setUpdatingJob(jobId)
    try{
      await supabase.from('jobs').update({
        status:'completed',
        actual_end_time:new Date().toISOString()
      }).eq('id',jobId)
      toast.success('Completed!✅')
      loadAllJobs()
    }catch{}finally{setUpdatingJob(null)} 
  }

  // CLOCK IN/OUT - Persists across refreshes
  const handleClockToggle = () => {
    if(!myEmployeeId){toast.error('Profile not ready. Please wait or refresh.');return}
    if(isClockedIn && !window.confirm('Clock out and end your shift?')) return
    
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(async(pos)=>{
        setClockingInOut(true)
        try{
          const today = new Date().toISOString().split('T')[0]
          const now = new Date().toISOString()
          console.log('🕐 Toggle. Clocked in?', isClockedIn)

          if(isClockedIn){
            // CLOCK OUT
            console.log('🚪 CLOCKING OUT...')
            const { data: r } = await supabase
              .from('attendance_records')
              .select('id')
              .eq('employee_id', myEmployeeId)
              .eq('attendance_date', today)
              .is('clock_out_time', null)
              .limit(1)

            if(r?.length > 0){
              const { error } = await supabase
                .from('attendance_records')
                .update({
                  clock_out_time: now,
                  check_out_method: 'gps',
                  check_out_latitude: pos.coords.latitude,
                  check_out_longitude: pos.coords.longitude,
                  updated_at: now
                })
                .eq('id', r[0].id)

              if(error){
                console.error('Clock out error:', error)
                toast.error('Failed to clock out')
              } else {
                console.log('✅ Clocked OUT')
                setIsClockedIn(false)
                setClockInTime(null)
                toast.success('✅ Clocked out! Have a great day! 👋')
                if(profile?.id) await fetchMobileStats(profile.id)
              }
            } else {
              console.log('⚠️ No active record')
              setIsClockedIn(false)
              setClockInTime(null)
              toast('No active clock-in record found')
            }
          } else {
            // CLOCK IN
            console.log('🟢 CLOCKING IN...')
            
            // Double-check not already clocked in
            const { data: ex } = await supabase
              .from('attendance_records')
              .select('id')
              .eq('employee_id', myEmployeeId)
              .eq('attendance_date', today)
              .is('clock_out_time', null)
              .limit(1)

            if(ex?.length > 0){
              console.log('⚠️ Already clocked in!')
              toast.error('You are already clocked in! Please clock out first.')
              await checkClockStatus()
              return
            }

            const { error } = await supabase
              .from('attendance_records')
              .upsert([{
                employee_id: myEmployeeId,
                attendance_date: today,
                clock_in_time: now,
                check_in_method: 'gps',
                check_in_latitude: pos.coords.latitude,
                check_in_longitude: pos.coords.longitude,
                status: 'present'
              }], { onConflict: 'employee_id,attendance_date' })

            if(error){
              console.error('Clock in error:', error)
              toast.error('Failed to clock in')
            } else {
              console.log('✅ Clocked IN')
              setIsClockedIn(true)
              setClockInTime(now)
              toast.success('✅ Clocked in! 📍 Location recorded')
              if(profile?.id) await fetchMobileStats(profile.id)
            }
          }
        }catch(error){
          console.error('Clock error:', error)
          toast.error('Failed to record attendance')
        }finally{
          setClockingInOut(false)
        }
      }, (err) => {
        console.error('GPS error:', err)
        toast.error('Location access needed. Please enable GPS.')
      })
    } else {
      toast.error('Geolocation not available')
    }
  }

  const handleSubmitIncident = async () => { 
    if(!incidentForm.description.trim()){toast.error('Describe incident');return}
    setSubmittingIncident(true)
    try{
      let pu=null
      if(incidentPhoto){
        const fe=incidentPhoto.name.split('.').pop()
        const fn=`incidents/${Date.now()}.${fe}`
        await supabase.storage.from('fleet').upload(fn,incidentPhoto,{upsert:true})
        const{data:{publicUrl}}=supabase.storage.from('fleet').getPublicUrl(fn)
        pu=publicUrl
      }
      await supabase.from('incident_reports').insert([{
        employee_id:myEmployeeId,
        incident_type:incidentForm.type,
        description:incidentForm.description,
        severity:incidentForm.severity,
        photo_url:pu,
        status:'reported'
      }])
      toast.success('Reported!✅')
      setIncidentForm({type:'other',description:'',severity:'medium'})
      setIncidentPhoto(null)
    }catch{}finally{setSubmittingIncident(false)} 
  }

  const handleSubmitSupply = async () => { 
    if(!supplyForm.item.trim()){toast.error('Enter item');return}
    setSubmittingSupply(true)
    try{
      const{data:req}=await supabase.from('supplies_requests').insert([{
        employee_id:myEmployeeId,status:'pending',notes:supplyForm.notes
      }]).select('id').single()
      if(req) await supabase.from('supplies_request_items').insert([{
        request_id:req.id,item_name:supplyForm.item,quantity:supplyForm.quantity,unit:'each'
      }])
      toast.success('Submitted!✅')
      setSupplyForm({item:'',quantity:1,notes:''})
    }catch{}finally{setSubmittingSupply(false)} 
  }

  const handleSubmitLeave = async () => { 
    if(!leaveForm.from||!leaveForm.to){toast.error('Select dates');return}
    setSubmittingLeave(true)
    try{
      const d=Math.ceil((new Date(leaveForm.to)-new Date(leaveForm.from))/(86400000))+1
      await supabase.from('leave_requests').insert([{
        employee_id:myEmployeeId,
        leave_type_id:leaveForm.type==='annual'?1:leaveForm.type==='sick'?2:3,
        start_date:leaveForm.from,
        end_date:leaveForm.to,
        total_days:d,
        reason:leaveForm.reason,
        status:'pending'
      }])
      toast.success('Submitted!✅')
      setLeaveForm({type:'annual',from:'',to:'',reason:''})
      loadLeaveRequests()
    }catch{}finally{setSubmittingLeave(false)} 
  }

  const fmtT = (d) => d.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})
  const fmtD = (d) => d.toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'})
  const fmtDS = (d) => {if(!d)return'';const dt=new Date(d+'T00:00:00');return dt.toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'})}
  const todayStr = new Date().toISOString().split('T')[0]
  const cc = "rounded-[24px] p-4 shadow-[8px_8px_16px_#bcc3cf,-8px_-8px_16px_#ffffff] bg-[#eef1f6]"
  const cic = "rounded-[18px] p-3 shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] bg-[#e9edf2]"
  const bc = "rounded-[40px] py-3.5 px-5 font-semibold shadow-[6px_6px_12px_#bcc3cf,-4px_-4px_12px_#ffffff] bg-[#eef1f6] active:scale-[0.97] transition-all text-[#2e3b4e]"
  const bpc = "rounded-[40px] py-3.5 px-5 font-semibold shadow-[6px_6px_14px_#bcc3cf] bg-gradient-to-br from-[#6a8baa] to-[#5a7795] text-white active:scale-[0.97] transition-all"
  const ic = "w-full py-3.5 px-4 rounded-[40px] shadow-[inset_4px_4px_8px_#bcc3cf,inset_-4px_-4px_8px_#ffffff] bg-[#e9edf2] outline-none text-[#2e3b4e] text-sm"

  const renderDashboard = () => (<div className="space-y-4">
    <div className={cc}><h3 className="text-xl font-bold text-[#2e3b4e]">{greeting}, {myProfile?.first_name||'Cleaner'}</h3><p className="text-[#5e6f82] text-sm">ID: {myProfile?.employee_code||'N/A'}</p><p className="text-4xl font-bold text-center my-2 font-mono text-[#2e3b4e]">{fmtT(currentTime)}</p></div>
    <div className={`${cc} flex items-center justify-between`}><div><span className="flex items-center gap-2 text-[#2e3b4e] font-semibold">{isClockedIn?<><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Clocked In</>:<><span className="w-2 h-2 rounded-full bg-slate-400"></span> Not Clocked In</>}</span>{clockInTime&&<p className="text-xs text-[#5e6f82] mt-1">Since: {new Date(clockInTime).toLocaleTimeString()}</p>}</div><button onClick={handleClockToggle} disabled={clockingInOut} className={`rounded-[40px] py-3 px-6 font-semibold shadow-[6px_6px_14px_#bcc3cf] active:scale-[0.97] text-sm ${isClockedIn?'bg-gradient-to-br from-red-400 to-red-600 text-white':'bg-gradient-to-br from-[#4b9b6b] to-[#3d8b5f] text-white'}`}>{clockingInOut?<RefreshCw className="w-4 h-4 animate-spin inline mr-1"/>:isClockedIn?<LogOutIcon className="w-4 h-4 inline mr-1"/>:<LogIn className="w-4 h-4 inline mr-1"/>}{isClockedIn?'Clock Out':'Clock In'}</button></div>
    <div className={cc}><h4 className="font-semibold text-[#2e3b4e] mb-3">Quick Actions</h4><div className="grid grid-cols-3 gap-2.5">{[{icon:Briefcase,label:'My Jobs',screen:'jobs',color:'#5f7d9c'},{icon:Map,label:'Clock In',screen:'gps',color:'#4b9b6b'},{icon:Camera,label:'Photos',screen:'photos',color:'#7a94ae'},{icon:Package,label:'Supplies',screen:'supplies',color:'#c99f4b'},{icon:AlertCircle,label:'Incident',screen:'incident',color:'#c15b5b'},{icon:Umbrella,label:'Leave',screen:'leave',color:'#5f7d9c'},{icon:Calendar,label:'Schedule',screen:'schedule',color:'#7a94ae'},{icon:MessageCircle,label:'Messages',screen:'messages',color:'#4b9b6b'},{icon:BarChart3,label:'Stats',screen:'performance',color:'#c99f4b'}].map(item=>(<button key={item.label} onClick={()=>switchScreen(item.screen)} className="flex flex-col items-center gap-1.5 p-3 rounded-[18px] shadow-[6px_6px_12px_#bcc3cf,-4px_-4px_12px_#ffffff] bg-[#eef1f6] active:scale-[0.96] transition-all"><div className="p-2 rounded-2xl shadow-[inset_2px_2px_4px_#bcc3cf,inset_-2px_-2px_4px_#ffffff] bg-[#e9edf2]" style={{color:item.color}}><item.icon className="w-5 h-5"/></div><span className="text-[11px] font-semibold text-[#2e3b4e] text-center">{item.label}</span></button>))}</div></div>
    <button onClick={()=>{if(themeVariant==='light')setThemeVariant('dark');else if(themeVariant==='dark')setThemeVariant('glass-neo');else setThemeVariant('light')}} className={bc+" text-xs w-full"}>🎨 {themeVariant==='light'?'Light':themeVariant==='dark'?'Dark':'Glass'}</button>
  </div>)

  const renderJobs = () => {
    const fo=allOpenJobs.filter(j=>!jobSearch||(j.title||'').toLowerCase().includes(jobSearch.toLowerCase()))
    const fm=myActiveJobs.filter(j=>!jobSearch||(j.title||'').toLowerCase().includes(jobSearch.toLowerCase()))
    return (<div className="space-y-4"><button onClick={goBack} className={`${bc} text-sm`}>← Back</button><div className={cc}><h3 className="font-bold text-lg mb-3">Jobs</h3><div className="flex gap-2 mb-3">{[{id:'all',label:`Open (${fo.length})`},{id:'mine',label:`My Jobs (${fm.length})`}].map(t=>(<button key={t.id} onClick={()=>setActiveTab(t.id)} className={`flex-1 py-2.5 rounded-[30px] font-semibold text-sm ${activeTab===t.id?'bg-[#5f7d9c] text-white':'bg-[#eef1f6]'}`}>{t.label}</button>))}</div><div className="relative mb-3"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5e6f82]"/><input type="text" value={jobSearch} onChange={e=>setJobSearch(e.target.value)} placeholder="Search..." className={ic+" pl-9"}/></div>{activeTab==='all'&&(loadingAllJobs?<p className="text-center py-4">Loading...</p>:fo.length>0?<div className="space-y-2 max-h-[350px] overflow-y-auto">{fo.map(j=>(<div key={j.id} className={cic+" border-l-4 border-l-[#5f7d9c]"}><div className="flex justify-between mb-1"><div><p className="font-semibold text-sm">{j.title}</p><p className="text-xs text-[#5e6f82]">{j.job_number}·{j.clients?.company_name}</p></div><span className="px-2 py-0.5 rounded-full text-[10px] bg-[#5f7d9c]/20 text-[#5f7d9c]">Open</span></div><div className="text-xs text-[#5e6f82] mb-1"><Calendar className="w-3 h-3 inline"/>{j.scheduled_date===todayStr?'Today':fmtDS(j.scheduled_date)}·<Clock className="w-3 h-3 inline"/>{j.scheduled_start_time?.slice(0,5)}-{j.scheduled_end_time?.slice(0,5)}</div><div className="text-xs text-[#5e6f82] mb-2"><MapPin className="w-3 h-3 inline"/>{j.site_address?.slice(0,35)}</div><button onClick={()=>handleSelectJob(j.id)} className={bpc+" w-full text-sm"}><Hand className="w-4 h-4 inline mr-1"/>Select Job</button></div>))}</div>:<div className={cic+" text-center"}><p>No open jobs</p></div>)}{activeTab==='mine'&&(loadingAllJobs?<p className="text-center py-4">Loading...</p>:fm.length>0?<div className="space-y-2 max-h-[350px] overflow-y-auto">{fm.map(j=>(<div key={j.id} className={cic+" border-l-4 border-l-[#c99f4b]"}><div className="flex justify-between mb-1"><div><p className="font-semibold text-sm">{j.title}</p><p className="text-xs text-[#5e6f82]">{j.job_number}·{j.clients?.company_name}</p></div><span className="px-2 py-0.5 rounded-full text-[10px] bg-[#c99f4b]/20 text-[#c99f4b]">Active</span></div><div className="text-xs text-[#5e6f82] mb-1"><Calendar className="w-3 h-3 inline"/>{j.scheduled_date===todayStr?'Today':fmtDS(j.scheduled_date)}·<Clock className="w-3 h-3 inline"/>{j.scheduled_start_time?.slice(0,5)}-{j.scheduled_end_time?.slice(0,5)}</div><div className="text-xs text-[#5e6f82] mb-2"><MapPin className="w-3 h-3 inline"/>{j.site_address?.slice(0,35)}</div><div className="flex gap-2 mb-2"><button onClick={()=>handleStartJob(j.id)} className="flex-1 py-2 rounded-[40px] font-semibold text-xs bg-[#5f7d9c] text-white"><Play className="w-3 h-3 inline mr-1"/>Start</button><button onClick={()=>handleCompleteJob(j.id)} className="flex-1 py-2 rounded-[40px] font-semibold text-xs bg-[#4b9b6b] text-white"><CheckCircle2 className="w-3 h-3 inline mr-1"/>Complete</button></div><div className="grid grid-cols-3 gap-1.5"><button onClick={()=>navigate('/mobile/photos')} className="py-1.5 rounded-xl text-[10px] font-medium bg-[#e9edf2] text-[#5f7d9c]"><Camera className="w-3 h-3 inline"/>Photos</button><button onClick={()=>navigate('/mobile/supplies')} className="py-1.5 rounded-xl text-[10px] font-medium bg-[#e9edf2] text-[#c99f4b]"><Package className="w-3 h-3 inline"/>Supplies</button><button onClick={()=>navigate('/mobile/incident')} className="py-1.5 rounded-xl text-[10px] font-medium bg-[#e9edf2] text-[#c15b5b]"><AlertCircle className="w-3 h-3 inline"/>Incident</button></div></div>))}</div>:<div className={cic+" text-center"}><p>No active jobs</p></div>)}</div></div>)
  }

  const renderGPS = () => (<div className="space-y-4"><button onClick={goBack} className={`${bc} text-sm`}>← Back</button><div className={cc+" text-center"}><div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${isClockedIn?'bg-green-100':'bg-[#e9edf2]'}`}>{isClockedIn?<LogOutIcon className="w-10 h-10 text-red-500"/>:<Map className="w-10 h-10 text-[#4b9b6b]"/>}</div><h3 className="font-bold text-lg mb-2">{isClockedIn?'Clock Out':'Clock In'}</h3><button onClick={handleClockToggle} disabled={clockingInOut} className={`rounded-[40px] py-4 w-full font-bold text-lg ${isClockedIn?'bg-gradient-to-br from-red-400 to-red-600 text-white':'bg-gradient-to-br from-[#4b9b6b] to-[#3d8b5f] text-white'}`}>{clockingInOut?<RefreshCw className="w-5 h-5 animate-spin inline mr-2"/>:isClockedIn?<LogOutIcon className="w-5 h-5 inline mr-2"/>:<Map className="w-5 h-5 inline mr-2"/>}{isClockedIn?'Clock Out':'Clock In with GPS'}</button><div className={cic+" mt-4 text-left"}><p className="text-sm">Status: {isClockedIn?'🟢Clocked In':'⚪Not Clocked In'}</p>{clockInTime&&<p className="text-xs mt-1">Since: {new Date(clockInTime).toLocaleTimeString()}</p>}</div></div></div>)
  const renderPhotos = () => (<div className="space-y-4"><button onClick={goBack} className={`${bc} text-sm`}>← Back</button><div className={cc+" text-center"}><Camera className="w-16 h-16 mx-auto text-[#7a94ae] mb-4"/><h3 className="font-bold text-lg mb-2">Job Photos</h3><button onClick={()=>navigate('/mobile/photos')} className={bpc+" w-full"}>Open Camera</button></div></div>)
  const renderSupplies = () => (<div className="space-y-4"><button onClick={goBack} className={`${bc} text-sm`}>← Back</button><div className={cc}><h3 className="font-bold text-lg mb-3"><Package className="w-5 h-5 inline mr-2 text-[#c99f4b]"/>Request Supplies</h3><div className="space-y-3"><input type="text" value={supplyForm.item} onChange={e=>setSupplyForm({...supplyForm,item:e.target.value})} placeholder="Item name" className={ic}/><div className="flex gap-2"><input type="number" value={supplyForm.quantity} onChange={e=>setSupplyForm({...supplyForm,quantity:parseInt(e.target.value)||1})} className={ic+" flex-1"}/><select className={ic+" flex-1"}><option>Each</option></select></div><textarea value={supplyForm.notes} onChange={e=>setSupplyForm({...supplyForm,notes:e.target.value})} placeholder="Notes" rows={2} className={ic+" rounded-[24px]"}/><button onClick={handleSubmitSupply} disabled={submittingSupply} className={bpc+" w-full"}>{submittingSupply?'Submitting...':'Submit Request'}</button></div></div></div>)
  const renderIncident = () => (<div className="space-y-4"><button onClick={goBack} className={`${bc} text-sm`}>← Back</button><div className={cc}><h3 className="font-bold text-lg mb-3"><AlertCircle className="w-5 h-5 inline mr-2 text-[#c15b5b]"/>Report Incident</h3><div className="space-y-3"><div className="flex gap-2 flex-wrap">{['damage','injury','complaint','security','other'].map(t=>(<button key={t} onClick={()=>setIncidentForm({...incidentForm,type:t})} className={`px-3 py-1.5 rounded-full text-xs ${incidentForm.type===t?'bg-[#c15b5b] text-white':'bg-[#e9edf2]'}`}>{t}</button>))}</div><div className="flex gap-2">{['low','medium','high','critical'].map(s=>(<button key={s} onClick={()=>setIncidentForm({...incidentForm,severity:s})} className={`flex-1 py-1.5 rounded-full text-xs ${incidentForm.severity===s?'bg-[#c15b5b] text-white':'bg-[#e9edf2]'}`}>{s}</button>))}</div><textarea value={incidentForm.description} onChange={e=>setIncidentForm({...incidentForm,description:e.target.value})} placeholder="Describe what happened..." rows={4} className={ic+" rounded-[24px]"}/><label className="block text-center p-4 border-2 border-dashed border-[#bcc3cf] rounded-[20px] cursor-pointer"><Camera className="w-6 h-6 mx-auto text-[#5f7d9c]"/><span className="text-xs">{incidentPhoto?incidentPhoto.name:'Add photo'}</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>setIncidentPhoto(e.target.files[0])}/></label><button onClick={handleSubmitIncident} disabled={submittingIncident} className="bg-[#c15b5b] text-white rounded-[40px] py-3.5 w-full font-semibold">{submittingIncident?'Submitting...':'Submit Report'}</button></div></div></div>)
  const renderSchedule = () => (<div className="space-y-4"><button onClick={goBack} className={`${bc} text-sm`}>← Back</button><div className={cc}><h3 className="font-bold text-lg mb-3"><Calendar className="w-5 h-5 inline mr-2 text-[#7a94ae]"/>My Schedule</h3>{loadingSchedule?<p className="text-center py-4">Loading...</p>:schedules.length>0?<div className="space-y-2 max-h-[400px] overflow-y-auto">{schedules.map((s,i)=>(<div key={i} className={cic}><div className="flex justify-between mb-1"><p className="font-semibold text-sm">{s.shift_types?.name||'Shift'}</p><span className="text-xs">{fmtDS(s.shift_date)}</span></div><p className="text-xs">{s.shift_types?.start_time?.slice(0,5)}-{s.shift_types?.end_time?.slice(0,5)}</p>{s.jobs?.title&&<p className="text-xs mt-1">{s.jobs.title}·{s.jobs.site_address?.slice(0,25)}</p>}</div>))}</div>:<div className={cic+" text-center"}><p>No schedules</p></div>}</div></div>)
  const renderMessages = () => (<div className="space-y-4"><button onClick={goBack} className={`${bc} text-sm`}>← Back</button><div className={cc}><h3 className="font-bold text-lg mb-3"><MessageCircle className="w-5 h-5 inline mr-2 text-[#4b9b6b]"/>Messages</h3><div className="space-y-2 max-h-[300px] overflow-y-auto mb-3">{messages.length>0?messages.map((m,i)=>(<div key={i} className={cic}><p className="font-semibold text-sm">{m.from}</p><p className="text-xs">{m.text}</p><span className="text-[10px]">{m.time}</span></div>)):<div className={cic+" text-center"}><p>No messages</p></div>}</div><div className="flex gap-2"><input type="text" value={newMessage} onChange={e=>setNewMessage(e.target.value)} placeholder="Type..." className={ic+" flex-1"}/><button onClick={()=>{if(newMessage.trim()){setMessages([...messages,{from:'You',text:newMessage,time:new Date().toLocaleTimeString()}]);setNewMessage('');toast.success('Sent!')}}} className="bg-[#4b9b6b] text-white rounded-full p-3"><Send className="w-5 h-5"/></button></div></div></div>)
  const renderLeave = () => (<div className="space-y-4"><button onClick={goBack} className={`${bc} text-sm`}>← Back</button><div className={cc}><h3 className="font-bold text-lg mb-3"><Umbrella className="w-5 h-5 inline mr-2 text-[#5f7d9c]"/>Leave</h3><div className="space-y-3"><select value={leaveForm.type} onChange={e=>setLeaveForm({...leaveForm,type:e.target.value})} className={ic}><option value="annual">Annual</option><option value="sick">Sick</option><option value="family">Family</option></select><div className="flex gap-2"><input type="date" value={leaveForm.from} onChange={e=>setLeaveForm({...leaveForm,from:e.target.value})} className={ic+" flex-1"}/><input type="date" value={leaveForm.to} onChange={e=>setLeaveForm({...leaveForm,to:e.target.value})} className={ic+" flex-1"}/></div><textarea value={leaveForm.reason} onChange={e=>setLeaveForm({...leaveForm,reason:e.target.value})} placeholder="Reason" rows={2} className={ic+" rounded-[24px]"}/><button onClick={handleSubmitLeave} disabled={submittingLeave} className={bpc+" w-full"}>{submittingLeave?'Submitting...':'Submit'}</button></div>{leaveRequests.length>0&&<div className="mt-4"><h4 className="font-semibold text-sm mb-2">Recent</h4><div className="space-y-2">{leaveRequests.map(l=>(<div key={l.id} className={cic+" flex justify-between"}><div><p className="font-semibold text-xs">{l.leave_types?.name}</p><p className="text-[10px]">{l.start_date}→{l.end_date}({l.total_days}d)</p></div><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${l.status==='approved'?'bg-green-100 text-green-700':l.status==='rejected'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{l.status}</span></div>))}</div></div>}</div></div>)
  const renderPerformance = () => (<div className="space-y-4"><button onClick={goBack} className={`${bc} text-sm`}>← Back</button><div className={cc}><h3 className="font-bold text-lg mb-3"><BarChart3 className="w-5 h-5 inline mr-2 text-[#c99f4b]"/>Stats</h3><div className="grid grid-cols-3 gap-3">{[{label:'Completed',value:performance.completedToday,icon:CheckCircle2,color:'#4b9b6b'},{label:'Hours',value:performance.totalHours+'h',icon:Clock,color:'#5f7d9c'},{label:'Rating',value:performance.rating+'/5',icon:Star,color:'#c99f4b'}].map(s=>(<div key={s.label} className={cic+" text-center"}><s.icon className="w-6 h-6 mx-auto mb-1" style={{color:s.color}}/><p className="text-lg font-bold">{s.value}</p><p className="text-[10px]">{s.label}</p></div>))}</div></div></div>)
  const renderProfile = () => (<div className="space-y-4"><button onClick={goBack} className={`${bc} text-sm`}>← Back</button><div className={cc+" text-center"}><div className="w-20 h-20 rounded-full bg-[#e9edf2] flex items-center justify-center mx-auto mb-3"><User className="w-10 h-10 text-[#5f7d9c]"/></div><h3 className="font-bold text-lg">{myProfile?.first_name} {myProfile?.last_name}</h3><p className="text-sm">{myProfile?.employee_code||'N/A'}</p><div className={cic+" mt-3 text-left space-y-2"}><p className="text-sm"><strong>Email:</strong> {user?.email}</p><p className="text-sm"><strong>Dept:</strong> {myProfile?.department||'Cleaning'}</p><p className="text-sm"><strong>Status:</strong> {myProfile?.employment_status||'Active'}</p></div><button onClick={handleSignOut} className="bg-[#c15b5b] text-white rounded-[40px] py-3 w-full mt-3 font-semibold"><LogOut className="w-4 h-4 inline mr-2"/>Sign Out</button></div></div>)

  const renderScreen = () => {
    switch(currentScreen){
      case'dashboard':return renderDashboard()
      case'jobs':return renderJobs()
      case'gps':return renderGPS()
      case'photos':return renderPhotos()
      case'supplies':return renderSupplies()
      case'incident':return renderIncident()
      case'schedule':return renderSchedule()
      case'messages':return renderMessages()
      case'leave':return renderLeave()
      case'performance':return renderPerformance()
      case'profile':return renderProfile()
      default:return renderDashboard()
    }
  }

  return (<div className={`min-h-screen font-['Inter'] pb-20 transition-colors duration-300 ${themeVariant==='dark'?'bg-[#2f3640]':themeVariant==='glass-neo'?'bg-[#e9edf2]/80 backdrop-blur-xl':'bg-[#e9edf2]'}`}><div ref={scrollRef} className="overflow-y-auto px-3 pt-6 pb-4" style={{maxHeight:'calc(100vh - 80px)'}}>{renderScreen()}</div><div className="fixed bottom-0 left-0 right-0 bg-[#e9edf2] px-3 pb-3 pt-2 rounded-t-[36px] shadow-[0_-8px_18px_rgba(0,0,0,0.05),0_-4px_8px_#bcc3cf] z-50"><div className="flex justify-around items-center max-w-lg mx-auto">{[{id:'dashboard',icon:Home,label:'Home'},{id:'jobs',icon:Briefcase,label:'Jobs'},{id:'schedule',icon:Calendar,label:'Schedule'},{id:'messages',icon:MessageCircle,label:'Messages'},{id:'profile',icon:User,label:'Profile'}].map(item=>(<button key={item.id} onClick={()=>switchScreen(item.id)} className="flex flex-col items-center gap-1"><div className={`p-2 rounded-[18px] shadow-[3px_3px_6px_#bcc3cf,-3px_-3px_6px_#ffffff] transition-all ${currentScreen===item.id?'bg-[#5f7d9c] text-white shadow-[inset_2px_2px_5px_#3e5268]':'bg-[#eef1f6] text-[#5e6f82]'}`}><item.icon className="w-5 h-5"/></div><span className="text-[10px] font-medium text-[#5e6f82]">{item.label}</span></button>))}</div></div></div>)
}
