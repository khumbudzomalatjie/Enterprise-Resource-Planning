import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { Clock, Briefcase, MessageCircle, Bell, LogIn, LogOut, MapPin, CheckCircle2 } from 'lucide-react'

export default function MobileDashboard() {
  const { user } = useAuthStore()
  const { employee, stats, attendance, myJobs, openJobs, init, clockIn, clockOut } = useMobileStore()
  const navigate = useNavigate()

  useEffect(() => { if (user?.id) init(user.id) }, [user?.id])

  // ✅ Only management roles see KPI/performance
  const managementRoles = ['super_admin', 'admin', 'operations_manager', 'supervisor', 'hr_manager']
  const isManagement = managementRoles.includes(user?.role)

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
          <button onClick={() => navigate('/mobile/profile')} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-lg">{employee?.first_name?.[0]}{employee?.last_name?.[0]}</span>
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
      </div>

      {/* Stats Cards - Employee operational data only */}
      <div className="px-5 -mt-2">
        <div className="grid grid-cols-3 gap-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/mobile/jobs')}
            className="bg-white rounded-2xl p-4 shadow-md text-center">
            <Briefcase className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-800">{stats?.myJobsCount || 0}</p>
            <p className="text-xs text-slate-500">My Jobs</p>
          </motion.button>

          <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/mobile/attendance')}
            className="bg-white rounded-2xl p-4 shadow-md text-center">
            <Clock className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-800">{stats?.weeklyHours || 0}<span className="text-sm font-normal text-slate-500">hrs</span></p>
            <p className="text-xs text-slate-500">Week Hrs</p>
          </motion.button>

          <motion.button whileTap={{ scale: 0.95 }}
            className="bg-white rounded-2xl p-4 shadow-md text-center">
            <CheckCircle2 className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-slate-800">{stats?.completedToday || 0}</p>
            <p className="text-xs text-slate-500">Completed</p>
          </motion.button>
        </div>
      </div>

      {/* Active Jobs */}
      {myJobs?.length > 0 && (
        <div className="px-5 mt-4">
          <h3 className="text-white font-semibold mb-2">Active Jobs</h3>
          {myJobs.map(job => (
            <motion.div key={job.id} whileTap={{ scale: 0.98 }} onClick={() => navigate(`/mobile/jobs/${job.id}`)}
              className="bg-white rounded-2xl p-4 shadow-md border-l-4 border-amber-400 cursor-pointer mb-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">{job.title}</p>
                  <p className="text-xs text-slate-500">{job.job_number} · {job.clients?.company_name}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{job.site_address?.slice(0, 35)}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 capitalize">{job.assignment_status}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Available Jobs */}
      {openJobs?.length > 0 && (
        <div className="px-5 mt-4">
          <h3 className="text-white font-semibold mb-2">Available Jobs ({openJobs.length})</h3>
          {openJobs.slice(0, 3).map(job => (
            <motion.div key={job.id} whileTap={{ scale: 0.98 }} onClick={() => navigate('/mobile/jobs')}
              className="bg-white/90 rounded-2xl p-3 shadow-sm cursor-pointer mb-2">
              <p className="font-semibold text-slate-800 text-sm">{job.title}</p>
              <p className="text-xs text-slate-500">{job.clients?.company_name} · {job.site_city}</p>
            </motion.div>
          ))}
          {openJobs.length > 3 && (
            <button onClick={() => navigate('/mobile/jobs')} className="w-full text-center text-white text-sm py-2 bg-white/10 rounded-xl">
              +{openJobs.length - 3} more jobs available
            </button>
          )}
        </div>
      )}

      <BottomNav active="home" />
    </div>
  )
}
