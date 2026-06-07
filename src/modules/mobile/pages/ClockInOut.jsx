import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { Clock, MapPin, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react'

export default function ClockInOut() {
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState(null)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [todayRecord, setTodayRecord] = useState(null)
  const [employeeId, setEmployeeId] = useState(null)
  const [clockHistory, setClockHistory] = useState([])

  useEffect(() => {
    initData()
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    getLocation()
    return () => clearInterval(timer)
  }, [])

  const initData = async () => {
    setLoading(true)
    await setupEmployee()
    setLoading(false)
  }

  // Find or create employee record
  const setupEmployee = async () => {
    try {
      // Try to find employee
      let { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (!emp) {
        // Try by email
        const { data: empByEmail } = await supabase
          .from('employees')
          .select('id')
          .eq('email', user?.email)
          .single()
        
        if (empByEmail) {
          emp = empByEmail
          // Link user_id
          await supabase.from('employees').update({ user_id: user?.id }).eq('id', emp.id)
        } else {
          // Create employee record
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
          
          if (newEmp) emp = newEmp
        }
      }

      if (emp) {
        console.log('✅ Employee ID:', emp.id)
        setEmployeeId(emp.id)
        await checkTodayStatus(emp.id)
        await loadClockHistory(emp.id)
      } else {
        console.error('❌ Could not find or create employee')
        toast.error('Employee profile not found')
      }
    } catch (error) {
      console.error('Setup error:', error)
    }
  }

  // Check if already clocked in today
  const checkTodayStatus = async (empId) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Check if there's a record for today
      const { data: records, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', empId)
        .eq('attendance_date', today)
        .order('clock_in_time', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error checking status:', error)
        return
      }

      if (records && records.length > 0) {
        const record = records[0]
        setTodayRecord(record)
        
        // If clocked in but NOT clocked out, they're still clocked in
        if (record.clock_in_time && !record.clock_out_time) {
          setIsClockedIn(true)
          console.log('✅ Currently clocked in since:', record.clock_in_time)
        } else if (record.clock_out_time) {
          setIsClockedIn(false)
          console.log('✅ Already clocked out at:', record.clock_out_time)
        }
      } else {
        setIsClockedIn(false)
        console.log('✅ Not clocked in today')
      }
    } catch (error) {
      console.error('Check status error:', error)
    }
  }

  // Load clock history
  const loadClockHistory = async (empId) => {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', empId)
        .order('attendance_date', { ascending: false })
        .order('clock_in_time', { ascending: false })
        .limit(10)

      if (!error) {
        setClockHistory(data || [])
      }
    } catch (error) {
      console.error('History error:', error)
    }
  }

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log('GPS not available:', err.message)
      )
    }
  }

  // CLOCK IN
  const handleClockIn = async () => {
    if (!employeeId) {
      toast.error('Employee profile not found')
      return
    }

    if (!location) {
      getLocation()
      toast.error('Waiting for GPS location...')
      return
    }

    setProcessing(true)
    
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Insert new attendance record (UPSERT - insert or update)
      const { data, error } = await supabase
        .from('attendance_records')
        .upsert({
          employee_id: employeeId,
          attendance_date: today,
          clock_in_time: new Date().toISOString(),
          check_in_method: 'gps',
          check_in_latitude: location.lat,
          check_in_longitude: location.lng,
          status: 'present'
        }, {
          onConflict: 'employee_id,attendance_date',
          ignoreDuplicates: false // Update if exists
        })
        .select()
        .single()

      if (error) {
        console.error('Clock in error:', error)
        toast.error('Failed to clock in: ' + error.message)
        return
      }

      console.log('✅ Clocked in:', data)
      setIsClockedIn(true)
      setTodayRecord(data)
      toast.success('Clocked in! 🟢')
      loadClockHistory(employeeId)
      
    } catch (error) {
      console.error('Exception:', error)
      toast.error('Failed to clock in')
    } finally {
      setProcessing(false)
    }
  }

  // CLOCK OUT
  const handleClockOut = async () => {
    if (!employeeId) {
      toast.error('Employee profile not found')
      return
    }

    setProcessing(true)
    
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Update the existing record with clock out time
      const { data, error } = await supabase
        .from('attendance_records')
        .update({
          clock_out_time: new Date().toISOString(),
          check_out_method: 'gps',
          updated_at: new Date().toISOString()
        })
        .eq('employee_id', employeeId)
        .eq('attendance_date', today)
        .is('clock_out_time', null) // Only update if not already clocked out
        .select()
        .single()

      if (error) {
        console.error('Clock out error:', error)
        toast.error('Failed to clock out: ' + error.message)
        return
      }

      if (!data) {
        toast.error('No active clock-in found for today')
        setIsClockedIn(false)
        return
      }

      console.log('✅ Clocked out:', data)
      setIsClockedIn(false)
      setTodayRecord(data)
      toast.success('Clocked out! See you tomorrow 👋')
      loadClockHistory(employeeId)
      
    } catch (error) {
      console.error('Exception:', error)
      toast.error('Failed to clock out')
    } finally {
      setProcessing(false)
    }
  }

  const formatTime = (date) => date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatDate = (date) => date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  }
  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
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
          {location && (
            <div className="flex items-center justify-center gap-1 mt-3 text-emerald-600 text-sm">
              <MapPin className="w-4 h-4" />
              <span>GPS Location Captured</span>
            </div>
          )}
          {!location && (
            <div className="flex items-center justify-center gap-1 mt-3 text-amber-600 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Getting location...</span>
            </div>
          )}
        </div>

        {/* Clock Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={handleClockIn}
            disabled={isClockedIn || processing}
            className={`rounded-3xl p-6 text-center transition-all ${
              isClockedIn 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg active:scale-95'
            }`}
          >
            {processing && !isClockedIn ? (
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto"></div>
            ) : (
              <>
                <Clock className="w-10 h-10 mx-auto mb-2" />
                <p className="font-bold text-lg">Clock In</p>
                <p className="text-xs opacity-75">Start Work</p>
              </>
            )}
          </button>

          <button
            onClick={handleClockOut}
            disabled={!isClockedIn || processing}
            className={`rounded-3xl p-6 text-center transition-all ${
              !isClockedIn 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-red-500 text-white hover:bg-red-600 shadow-lg active:scale-95'
            }`}
          >
            {processing && isClockedIn ? (
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto"></div>
            ) : (
              <>
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
                <p className="font-bold text-lg">Clock Out</p>
                <p className="text-xs opacity-75">End Work</p>
              </>
            )}
          </button>
        </div>

        {/* Status Card */}
        <div className={`rounded-3xl p-6 text-center mb-6 ${
          isClockedIn ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-100'
        }`}>
          <p className="text-lg font-semibold">
            Status: <span className={isClockedIn ? 'text-emerald-600' : 'text-slate-500'}>
              {isClockedIn ? '🟢 Clocked In' : '⚪ Not Clocked In'}
            </span>
          </p>
          {todayRecord?.clock_in_time && (
            <p className="text-sm text-slate-500 mt-1">
              Clocked in at: {formatDateTime(todayRecord.clock_in_time)}
            </p>
          )}
          {todayRecord?.clock_out_time && (
            <p className="text-sm text-slate-500 mt-1">
              Clocked out at: {formatDateTime(todayRecord.clock_out_time)}
            </p>
          )}
        </div>

        {/* Clock History */}
        <div className="bg-white rounded-3xl p-4 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-700 mb-3">Recent History</h3>
          {clockHistory.length > 0 ? (
            <div className="space-y-2">
              {clockHistory.slice(0, 5).map((record, i) => (
                <div key={record.id || i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-600">{formatDateOnly(record.attendance_date)}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-600">{formatDateTime(record.clock_in_time)}</span>
                    <span className="text-slate-400">→</span>
                    <span className={record.clock_out_time ? 'text-red-600' : 'text-amber-600'}>
                      {record.clock_out_time ? formatDateTime(record.clock_out_time) : 'Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-400 py-4 text-sm">No clock history yet</p>
          )}
        </div>
      </div>

      <BottomNav active="clock" />
    </div>
  )
}
