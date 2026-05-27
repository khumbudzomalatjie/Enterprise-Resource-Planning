import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useAttendanceStore from '../store/attendanceStore'
import useThemeStore from '../../../../store/themeStore'
import useAuthStore from '../../../../store/authStore'
import toast from 'react-hot-toast'
import { 
  Clock, UserCheck, UserX, AlertTriangle, 
  Calendar, QrCode, MapPin, FileText,
  Sparkles, Sun, Moon, ChevronRight, ArrowLeft,
  Users, TrendingUp, Timer, BarChart3
} from 'lucide-react'

export default function AttendanceDashboard() {
  const { stats, fetchAttendanceStats, todayAttendance, getTodayAttendance, clockIn, clockOut } = useAttendanceStore()
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
    const result = await getTodayAttendance(profile?.id)
    if (result?.data?.clock_in_time && !result?.data?.clock_out_time) {
      setIsClockedIn(true)
    }
  }

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeoLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.log('Geolocation error:', error.message)
        }
      )
    }
  }

  const handleClockIn = async () => {
    if (!geoLocation) {
      toast.error('Please enable location services')
      return
    }
    
    const result = await clockIn({
      employee_id: profile?.id,
      check_in_method: 'gps',
      latitude: geoLocation.latitude,
      longitude: geoLocation.longitude,
      address: 'Current Location'
    })
    
    if (result.success) {
      toast.success('Clocked in successfully!')
      setIsClockedIn(true)
      loadData()
    } else {
      toast.error(result.error || 'Clock in failed')
    }
  }

  const handleClockOut = async () => {
    if (!geoLocation) {
      toast.error('Please enable location services')
      return
    }
    
    const result = await clockOut(profile?.id)
    
    if (result.success) {
      toast.success('Clocked out successfully!')
      setIsClockedIn(false)
      loadData()
    } else {
      toast.error(result.error || 'Clock out failed')
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

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
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">
            Enterprise Resource Planning
          </span>
        </div>
        <button 
          onClick={toggleTheme}
          className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform"
        >
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">
              Attendance Tracking
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-11">
            Clock in/out, QR codes, GPS tracking, and timesheets
          </p>
        </motion.div>

        {/* Clock In/Out Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="neu-raised rounded-3xl p-8 mb-8"
        >
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 text-lg">{formatDate(currentTime)}</p>
            <p className="text-6xl font-bold text-slate-800 dark:text-white my-4 font-mono">
              {formatTime(currentTime)}
            </p>
            
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={handleClockIn}
                disabled={isClockedIn}
                className={`neu-raised neu-btn px-8 py-4 rounded-2xl text-lg font-semibold transition-all ${
                  isClockedIn 
                    ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 cursor-not-allowed' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <Clock className="w-5 h-5 inline mr-2" />
                Clock In
              </button>
              
              <button
                onClick={handleClockOut}
                disabled={!isClockedIn}
                className={`neu-raised neu-btn px-8 py-4 rounded-2xl text-lg font-semibold transition-all ${
                  !isClockedIn 
                    ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 cursor-not-allowed' 
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                <Timer className="w-5 h-5 inline mr-2" />
                Clock Out
              </button>
            </div>

            {todayAttendance && (
              <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                {todayAttendance.clock_in_time && (
                  <p>Clocked in at: {new Date(todayAttendance.clock_in_time).toLocaleTimeString()}</p>
                )}
                {todayAttendance.clock_out_time && (
                  <p>Clocked out at: {new Date(todayAttendance.clock_out_time).toLocaleTimeString()}</p>
                )}
                {geoLocation && (
                  <p className="flex items-center justify-center gap-1 mt-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Location captured
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: 'QR Check-in', icon: QrCode, path: '/hr/attendance/qr' },
            { label: 'Timesheets', icon: FileText, path: '/hr/attendance/timesheets' },
            { label: 'Shifts', icon: Calendar, path: '/hr/attendance/shifts' },
            { label: 'Reports', icon: BarChart3, path: '/hr/attendance/reports' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="neu-raised neu-btn rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-105 transition-transform"
            >
              <action.icon className="w-6 h-6 text-emerald-600" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="neu-raised rounded-2xl p-4 stat-card"
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Today's Attendance List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="neu-raised rounded-3xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              Today's Attendance
            </h2>
            <Link to="/hr/attendance/records" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 py-3 px-4">Employee</th>
                  <th className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 py-3 px-4">Clock In</th>
                  <th className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 py-3 px-4">Clock Out</th>
                  <th className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 py-3 px-4">Status</th>
                  <th className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 py-3 px-4">Method</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentAttendance?.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 dark:border-slate-700/50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800 dark:text-white text-sm">
                        {record.employees?.first_name} {record.employees?.last_name}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                      {record.clock_in_time ? new Date(record.clock_in_time).toLocaleTimeString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                      {record.clock_out_time ? new Date(record.clock_out_time).toLocaleTimeString() : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        record.status === 'present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        record.status === 'late' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 capitalize">
                      {record.check_in_method?.replace('_', ' ') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!stats.recentAttendance || stats.recentAttendance.length === 0) && (
            <p className="text-center text-slate-500 py-8">No attendance records for today</p>
          )}
        </motion.div>
      </main>
    </div>
  )
}
