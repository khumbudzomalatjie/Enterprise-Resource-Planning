import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { Clock, Briefcase, Calendar, MessageCircle, Bell, User, LogIn, LogOut, ChevronRight, MapPin, CheckCircle2, AlertCircle } from 'lucide-react'

export default function MobileDashboard() {
  const { user } = useAuthStore()
  const { employee, stats, attendance, myJobs, notifications, openJobs, init, clockIn, clockOut } = useMobileStore()
  const navigate = useNavigate()

  useEffect(() => { if (user?.id) init(user.id) }, [user?.id])

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
      <div className="px-5 pt-8 pb-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {employee?.first_name || 'Worker'}</h1>
            <p className="text-blue-100 text-sm">{new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <button onClick={() => navigate('/mobile/notifications')} className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
            {stats?.unreadNotifications > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">{stats.unreadNotifications}</span>}
          </button>
        </div>

        <motion.button whileTap={{ scale: 0.95 }} onClick={handleClock}
          className={`w-full py-5 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 shadow-lg ${isClockedIn ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
          {isClockedIn ? <LogOut className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
          {isClockedIn ? 'Clock Out' : 'Clock In'}
        </motion.button>
        {isClockedIn && attendance?.clock_in_time && (
          <p className="text-center text-blue-100 text-xs mt-2">Clocked in at {new Date(attendance.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        )}
        {attendance?.clock_out_time && !isClockedIn && (
          <p className="text-center text-blue-100 text-xs mt-2">Clocked out at {new Date(attendance.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        )}
      </div>

      <div className="px-5 -mt-2">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Briefcase, label: 'My Jobs', value: myJobs?.length || 0, path: '/mobile/jobs' },
            { icon: Clock, label: 'Week Hrs', value: `${stats?.weeklyHours || 0}h`, path: '/mobile/attendance' },
            { icon: CheckCircle2, label: 'Completed', value: stats?.jobsToday || 0, path: '/mobile/jobs' },
          ].map(s => (
            <motion.button key={s.label} whileTap={{ scale: 0.95 }} onClick={() => navigate(s.path)} className="bg-white rounded-2xl p-4 shadow-md text-center">
              <s.icon className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {myJobs?.length > 0 && (
        <div className="px-5 mt-4">
          <h3 className="text-white font-semibold mb-2">Active Job</h3>
          {myJobs.map(job => (
            <motion.div key={job.id} whileTap={{ scale: 0.98 }} onClick={() => navigate(`/mobile/jobs/${job.id}`)}
              className="bg-white rounded-2xl p-4 shadow-md border-l-4 border-amber-400 cursor-pointer mb-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-slate-800">{job.title}</p>
                  <p className="text-xs text-slate-500">{job.job_number} · {job.clients?.company_name}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{job.site_address?.slice(0, 30)}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 capitalize">{job.assignment_status}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {openJobs?.length > 0 && !myJobs?.length && (
        <div className="px-5 mt-4">
          <h3 className="text-white font-semibold mb-2">Available Jobs</h3>
          {openJobs.slice(0, 3).map(job => (
            <motion.div key={job.id} whileTap={{ scale: 0.98 }} onClick={() => navigate('/mobile/jobs')}
              className="bg-white rounded-2xl p-4 shadow-md cursor-pointer mb-2">
              <p className="font-semibold text-slate-800 text-sm">{job.title}</p>
              <p className="text-xs text-slate-500">{job.clients?.company_name} · {job.site_city}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="px-5 mt-4">
        <h3 className="text-white font-semibold mb-2">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Briefcase, label: 'Open Jobs', path: '/mobile/jobs' },
            { icon: Calendar, label: 'Leave', path: '/mobile/leave' },
            { icon: MessageCircle, label: 'Messages', path: '/mobile/messages' },
            { icon: AlertCircle, label: 'Attendance', path: '/mobile/attendance' },
          ].map(a => (
            <motion.button key={a.label} whileTap={{ scale: 0.95 }} onClick={() => navigate(a.path)} className="bg-white rounded-2xl p-4 shadow-md flex flex-col items-center gap-2">
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
