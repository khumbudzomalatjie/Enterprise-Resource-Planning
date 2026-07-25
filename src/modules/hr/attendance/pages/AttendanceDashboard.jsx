import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useAttendanceStore from '../store/attendanceStore'
import useAuthStore from '../../../../store/authStore'
import useThemeStore from '../../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Clock, UserCheck, UserX, AlertTriangle, 
  Calendar, QrCode, MapPin, FileText,
  Sparkles, Sun, Moon, ChevronRight, ArrowLeft,
  Users, TrendingUp, Timer, BarChart3, List,
  RotateCw
} from 'lucide-react'

export default function AttendanceDashboard() {
  const { stats, fetchAttendanceStats, todayAttendance, clockIn, clockOut, fetchTodayAttendance } = useAttendanceStore()
  const { isDark, toggleTheme } = useThemeStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [geoLocation, setGeoLocation] = useState(null)

  useEffect(() => {
    loadData()
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    getLocation()
    return () => clearInterval(timer)
  }, [])

  const loadData = async () => {
    await fetchAttendanceStats()
    const result = await fetchTodayAttendance()
    if (result?.data) {
      const myRecord = result.data.find(r => r.employee_id === profile?.id || r.employees?.user_id === user?.id)
      if (myRecord && myRecord.clock_in_time && !myRecord.clock_out_time) {
        setIsClockedIn(true)
      }
    }
  }

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setGeoLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => console.log('GPS unavailable')
      )
    }
  }

  const handleClockIn = async () => {
    const result = await clockIn(profile?.id || user?.id, {
      method: 'gps',
      latitude: geoLocation?.latitude,
      longitude: geoLocation?.longitude,
      address: 'Current Location'
    })
    if (result.success) { setIsClockedIn(true); loadData() }
  }

  const handleClockOut = async () => {
    const result = await clockOut(profile?.id || user?.id, {
      method: 'gps',
      latitude: geoLocation?.latitude,
      longitude: geoLocation?.longitude
    })
    if (result.success) { setIsClockedIn(false); loadData() }
  }

  const formatTime = (date) => date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const formatDate = (date) => date.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const statCards = [
    { icon: Users, label: 'Total Employees', value: stats.totalEmployees || 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: UserCheck, label: 'Present Today', value: stats.presentToday || 0, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: UserX, label: 'Absent Today', value: stats.absentToday || 0, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { icon: AlertTriangle, label: 'Late Today', value: stats.lateToday || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { icon: TrendingUp, label: 'Attendance Rate', value: `${stats.attendanceRate || 0}%`, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: Timer, label: 'On Leave', value: stats.onLeave || 0, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  ]

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />

      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/hr" className="text-slate-500 hover:text-emerald-600">HR Management</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Attendance</span>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Attendance Tracking</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-11">Clock in/out, timesheets, shifts, QR codes, GPS tracking</p>
        </motion.div>

        {/* Clock In/Out Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="neu-raised rounded-3xl p-8 mb-8">
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 text-lg">{formatDate(currentTime)}</p>
            <p className="text-6xl font-bold text-slate-800 dark:text-white my-4 font-mono">{formatTime(currentTime)}</p>
            <div className="flex items-center justify-center gap-4 mt-6">
              <button onClick={handleClockIn} disabled={isClockedIn}
                className={`neu-raised neu-btn px-8 py-4 rounded-2xl text-lg font-semibold transition-all ${isClockedIn ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                <Clock className="w-5 h-5 inline mr-2" /> Clock In
              </button>
              <button onClick={handleClockOut} disabled={!isClockedIn}
                className={`neu-raised neu-btn px-8 py-4 rounded-2xl text-lg font-semibold transition-all ${!isClockedIn ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                <Timer className="w-5 h-5 inline mr-2" /> Clock Out
              </button>
            </div>
            {geoLocation && <p className="text-sm text-emerald-600 mt-4 flex items-center justify-center gap-1"><MapPin className="w-4 h-4" /> GPS Location Captured</p>}
          </div>
        </motion.div>

        {/* ✅ MAIN ACTION BUTTONS - Timesheets & Shifts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button onClick={() => navigate('/hr/attendance/timesheets')} className="neu-raised neu-btn rounded-2xl p-5 flex flex-col items-center gap-2 hover:scale-105 transition-transform bg-white dark:bg-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="w-7 h-7 text-blue-600" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Timesheets</span>
            <span className="text-xs text-slate-500">View & manage work hours</span>
          </button>
          
          <button onClick={() => navigate('/hr/attendance/shifts')} className="neu-raised neu-btn rounded-2xl p-5 flex flex-col items-center gap-2 hover:scale-105 transition-transform bg-white dark:bg-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Calendar className="w-7 h-7 text-purple-600" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Shifts</span>
            <span className="text-xs text-slate-500">Schedule & manage shifts</span>
          </button>

          <button onClick={() => navigate('/hr/attendance/qr')} className="neu-raised neu-btn rounded-2xl p-5 flex flex-col items-center gap-2 hover:scale-105 transition-transform bg-white dark:bg-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <QrCode className="w-7 h-7 text-amber-600" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">QR Check-in</span>
            <span className="text-xs text-slate-500">QR code attendance</span>
          </button>

          <button onClick={() => navigate('/hr/attendance/reports')} className="neu-raised neu-btn rounded-2xl p-5 flex flex-col items-center gap-2 hover:scale-105 transition-transform bg-white dark:bg-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-emerald-600" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Reports</span>
            <span className="text-xs text-slate-500">Attendance analytics</span>
          </button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + index * 0.05 }}
              className="neu-raised rounded-2xl p-4 stat-card">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Today's Attendance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="neu-raised rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2"><UserCheck className="w-5 h-5 text-emerald-600" />Today's Attendance</h2>
            <button onClick={() => navigate('/hr/attendance/timesheets')} className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-3 text-slate-500 text-xs">Employee</th>
                  <th className="text-left py-3 px-3 text-slate-500 text-xs">Clock In</th>
                  <th className="text-left py-3 px-3 text-slate-500 text-xs">Clock Out</th>
                  <th className="text-left py-3 px-3 text-slate-500 text-xs">Status</th>
                  <th className="text-left py-3 px-3 text-slate-500 text-xs">Method</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recentAttendance || []).map(record => (
                  <tr key={record.id} className="border-b border-slate-100 dark:border-slate-700/30">
                    <td className="py-3 px-3 font-medium">{record.employees?.first_name} {record.employees?.last_name}</td>
                    <td className="py-3 px-3">{record.clock_in_time ? new Date(record.clock_in_time).toLocaleTimeString() : '-'}</td>
                    <td className="py-3 px-3">{record.clock_out_time ? new Date(record.clock_out_time).toLocaleTimeString() : '-'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${record.status === 'present' ? 'bg-emerald-100 text-emerald-700' : record.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{record.status}</span>
                    </td>
                    <td className="py-3 px-3 text-xs capitalize">{record.check_in_method?.replace(/_/g, ' ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
