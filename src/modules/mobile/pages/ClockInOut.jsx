import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../../store/authStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { Clock, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function ClockInOut() {
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [employeeId, setEmployeeId] = useState(null)
  const [clockInTime, setClockInTime] = useState(null)
  const [clockOutTime, setClockOutTime] = useState(null)
  const [todayRecordId, setTodayRecordId] = useState(null)

  useEffect(() => {
    setupAndCheck()
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const setupAndCheck = async () => {
    setLoading(true)
    
    // Step 1: Find or create employee
    const empId = await findOrCreateEmployee()
    if (!empId) {
      setLoading(false)
      return
    }
    setEmployeeId(empId)
    
    // Step 2: Check today's attendance
    await checkTodayAttendance(empId)
    setLoading(false)
  }

  const findOrCreateEmployee = async () => {
    try {
      // Try by user_id
      let { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (emp) return emp.id

      // Try by email
      const { data: empByEmail } = await supabase
        .from('employees')
        .select('id')
        .eq('email', user?.email)
        .single()

      if (empByEmail) {
        // Link user_id
        await supabase.from('employees').update({ user_id: user?.id }).eq('id', empByEmail.id)
        return empByEmail.id
      }

      // Create new
      const { data: newEmp } = await supabase
        .from('employees')
        .insert([{
          user_id: user?.id,
          first_name: profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Cleaner',
          last_name: profile?.full_name?.split(' ').slice(1).join(' ') || '',
          email: user?.email,
          employment_status: 'active',
          department: 'Cleaning'
        }])
        .select('id')
        .single()

      return newEmp?.id || null
    } catch (error) {
      console.error('Employee setup error:', error)
      return null
    }
  }

  const checkTodayAttendance = async (empId) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', empId)
        .eq('attendance_date', today)
        .order('clock_in_time', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Check error:', error)
        return
      }

      if (data && data.length > 0) {
        const record = data[0]
        setTodayRecordId(record.id)
        
        if (record.clock_in_time) {
          setClockInTime(record.clock_in_time)
        }
        
        if (record.clock_out_time) {
          setClockOutTime(record.clock_out_time)
          setIsClockedIn(false)
        } else if (record.clock_in_time && !record.clock_out_time) {
          // Clocked in but not out = currently working
          setIsClockedIn(true)
        }
      } else {
        // No record for today
        setIsClockedIn(false)
        setClockInTime(null)
        setClockOutTime(null)
      }
    } catch (error) {
      console.error('Check error:', error)
    }
  }

  const handleClockIn = async () => {
    if (!employeeId) {
      toast.error('Profile not found. Contact admin.')
      return
    }

    setProcessing(true)
    
    try {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString()

      // Get GPS if available
      let lat = null, lng = null
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          })
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        } catch (e) {
          console.log('GPS not available')
        }
      }

      // Insert or update attendance record
      const { data, error } = await supabase
        .from('attendance_records')
        .upsert({
          employee_id: employeeId,
          attendance_date: today,
          clock_in_time: now,
          check_in_method: lat ? 'gps' : 'mobile_app',
          check_in_latitude: lat,
          check_in_longitude: lng,
          status: 'present'
        }, {
          onConflict: 'employee_id,attendance_date'
        })
        .select()
        .single()

      if (error) {
        console.error('Clock in error:', error)
        toast.error('Failed: ' + error.message)
        setProcessing(false)
        return
      }

      console.log('✅ Clocked in:', data)
      setIsClockedIn(true)
      setClockInTime(now)
      setClockOutTime(null)
      setTodayRecordId(data.id)
      toast.success('Clocked in! 🟢')
      
    } catch (error) {
      console.error('Exception:', error)
      toast.error('Failed to clock in')
    } finally {
      setProcessing(false)
    }
  }

  const handleClockOut = async () => {
    if (!employeeId) {
      toast.error('Profile not found')
      return
    }

    setProcessing(true)
    
    try {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString()

      // Update the record
      const { data, error } = await supabase
        .from('attendance_records')
        .update({
          clock_out_time: now,
          check_out_method: 'mobile_app',
          updated_at: now
        })
        .eq('employee_id', employeeId)
        .eq('attendance_date', today)
        .is('clock_out_time', null)
        .select()
        .single()

      if (error) {
        console.error('Clock out error:', error)
        toast.error('Failed: ' + error.message)
        setProcessing(false)
        return
      }

      if (!data) {
        // No active clock-in found
        toast.error('No active clock-in found')
        setIsClockedIn(false)
        setProcessing(false)
        return
      }

      console.log('✅ Clocked out:', data)
      setIsClockedIn(false)
      setClockOutTime(now)
      toast.success('Clocked out! 👋')
      
    } catch (error) {
      console.error('Exception:', error)
      toast.error('Failed to clock out')
    } finally {
      setProcessing(false)
    }
  }

  const formatTime = (date) => date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatDate = (date) => date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
  const formatTimeStr = (dateStr) => {
    if (!dateStr) return '--:--:--'
    return new Date(dateStr).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-slate-50 font-['Inter'] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-amber-500 to-amber-600 px-4 pt-8 pb-6 text-white">
        <button onClick={() => navigate('/mobile')} className="p-1 rounded-lg hover:bg-white/20 mb-4">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Clock In / Out</h1>
        <p className="text-amber-100 text-sm">{formatDate(currentTime)}</p>
      </div>

      <div className="px-4 -mt-4">
        {/* Time Display */}
        <div className="bg-white rounded-3xl p-8 shadow-lg text-center mb-6">
          <p className="text-slate-500 text-sm mb-2">Current Time</p>
          <p className="text-5xl font-bold text-slate-800 font-mono">{formatTime(currentTime)}</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mx-auto"></div>
            <p className="text-slate-500 text-sm mt-2">Loading...</p>
          </div>
        )}

        {/* Clock Buttons - Only show when loaded */}
        {!loading && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* CLOCK IN BUTTON */}
              <button
                onClick={handleClockIn}
                disabled={isClockedIn || processing}
                className={`rounded-3xl p-6 text-center transition-all ${
                  isClockedIn 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50' 
                    : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg active:scale-95'
                }`}
              >
                {processing && !isClockedIn ? (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto"></div>
                ) : (
                  <>
                    <Clock className="w-10 h-10 mx-auto mb-2" />
                    <p className="font-bold text-lg">CLOCK IN</p>
                    <p className="text-xs opacity-75">Start Work</p>
                  </>
                )}
              </button>

              {/* CLOCK OUT BUTTON */}
              <button
                onClick={handleClockOut}
                disabled={!isClockedIn || processing}
                className={`rounded-3xl p-6 text-center transition-all ${
                  !isClockedIn 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50' 
                    : 'bg-red-500 text-white hover:bg-red-600 shadow-lg active:scale-95'
                }`}
              >
                {processing && isClockedIn ? (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto"></div>
                ) : (
                  <>
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
                    <p className="font-bold text-lg">CLOCK OUT</p>
                    <p className="text-xs opacity-75">End Work</p>
                  </>
                )}
              </button>
            </div>

            {/* Status Card */}
            <div className={`rounded-3xl p-6 text-center mb-4 shadow-sm ${
              isClockedIn ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-slate-100 border-2 border-slate-200'
            }`}>
              <p className="text-lg font-bold">
                {isClockedIn ? '🟢 CURRENTLY WORKING' : '⚪ NOT CLOCKED IN'}
              </p>
              {clockInTime && (
                <p className="text-sm text-slate-600 mt-2">
                  Clock In: <span className="font-mono font-bold">{formatTimeStr(clockInTime)}</span>
                </p>
              )}
              {clockOutTime && (
                <p className="text-sm text-slate-600 mt-1">
                  Clock Out: <span className="font-mono font-bold">{formatTimeStr(clockOutTime)}</span>
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <BottomNav active="clock" />
    </div>
  )
}
