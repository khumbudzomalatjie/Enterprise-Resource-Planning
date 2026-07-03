import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { Clock, Briefcase, Calendar, MessageCircle, Bell, User, LogIn, LogOut, ChevronRight, AlertCircle } from 'lucide-react'

export default function MobileDashboard() {
  const { user } = useAuthStore()
  const { employee, stats, attendance, myJobs, notifications, init, clockIn, clockOut } = useMobileStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.id) init(user.id)
  }, [user?.id])

  const handleClock = async () => {
    if (!employee) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      if (attendance?.clock_in_time && !attendance?.clock_out_time) {
        await clockOut(employee.id, pos.coords.latitude, pos.coords.longitude)
        toast.success('Clocked Out!')
      } else {
        await clockIn(employee.id, pos.coords.latitude, pos.coords.longitude)
        toast.success('Clocked In!')
      }
    }, async () => {
      if (attendance?.clock_in_time && !attendance?.clock_out_time) {
        await clockOut(employee.id, null, null)
        toast.success('Clocked Out!')
      } else {
        await clockIn(employee.id, null, null)
        toast.success('Clocked In!')
      }
    })
  }

  const isClockedIn = attendance?.clock_in_time && !attendance?.clock_out_time

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-700 font-['Inter'] pb-20">
      {/* Header */}
      <div className="px-5 pt-8 pb-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {employee?.first_name || 'Worker'}</h1>
            <p className="text-blue-100 text-sm">{new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <button onClick={() => navigate('/mobile/profile')} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Clock In/Out Button */}
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleClock}
          className={`w-full py-5 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 shadow-lg ${
            isClockedIn ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'
          }`}>
          {isClockedIn ? <LogOut className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
          {isClockedIn ? 'Clock Out' : 'Clock In'}
        </motion.button>
        {isClockedIn && attendance?.clock_in_time && (
          <p className="text-center text-blue-100 text-xs mt-2">
            Clocked in at {new Date(attendance.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="px-5 -mt-2">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Briefcase, label: 'My Jobs', value: myJobs?.length || 0, path: '/mobile/jobs' },
            { icon: Clock, label: 'Hours Today', value: stats?.hoursToday || '0h', path: '/mobile/attendance' },
            { icon: Bell, label: 'Alerts', value: stats?.unreadNotifications || 0, path: '/mobile/notifications' },
          ].map(s => (
            <motion.button key={s.label} whileTap={{ scale: 0.95 }} onClick={() => navigate(s.path)}
              className="bg-white rounded-2xl p-4 shadow-md text-center">
              <s.icon className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Active Job */}
      {myJobs?.length > 0 && (
        <div className="px-5 mt-4">
          <h3 className="text-white font-semibold mb-2">Active Job</h3>
          <motion.div whileTap={{ scale: 0.98 }} onClick={() => navigate(`/mobile/jobs/${myJobs[0]?.id}`)}
            className="bg-white rounded-2xl p-4 shadow-md border-l-4 border-amber-400 cursor-pointer">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-slate-800">{myJobs[0]?.title}</p>
                <p className="text-xs text-slate-500">{myJobs[0]?.job_number} · {myJobs[0]?.clients?.company_name}</p>
                <p className="text-xs text-slate-400 mt-1">{myJobs[0]?.site_address}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-5 mt-4">
        <h3 className="text-white font-semibold mb-2">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Briefcase, label: 'Open Jobs', path: '/mobile/jobs', bg: 'bg-white' },
            { icon: Calendar, label: 'Leave', path: '/mobile/leave', bg: 'bg-white' },
            { icon: MessageCircle, label: 'Messages', path: '/mobile/messages', bg: 'bg-white' },
            { icon: AlertCircle, label: 'Incidents', path: '/mobile/jobs', bg: 'bg-white' },
          ].map(a => (
            <motion.button key={a.label} whileTap={{ scale: 0.95 }} onClick={() => navigate(a.path)}
              className={`${a.bg} rounded-2xl p-4 shadow-md flex flex-col items-center gap-2`}>
              <a.icon className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">{a.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <BottomNav active="dashboard" />
    </div>
  )
}
