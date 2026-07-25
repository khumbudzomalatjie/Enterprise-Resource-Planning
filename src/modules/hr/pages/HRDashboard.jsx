import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useHRStore from '../store/hrStore'
import useAttendanceStore from '../attendance/store/attendanceStore'
import useThemeStore from '../../../store/themeStore'
import { 
  Users, UserPlus, UserCheck, UserX, 
  FileText, Calendar, Briefcase, GraduationCap,
  AlertTriangle, Clock, TrendingUp, Sparkles,
  Sun, Moon, ChevronRight, ArrowLeft,
  CreditCard, QrCode, ClipboardList, Building2
} from 'lucide-react'

export default function HRDashboard() {
  const { stats, fetchHRStats, fetchEmployees, fetchLeaveRequests } = useHRStore()
  const { stats: attendanceStats, fetchAttendanceStats } = useAttendanceStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [recentEmployees, setRecentEmployees] = useState([])
  const [pendingLeaves, setPendingLeaves] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchHRStats(),
        fetchAttendanceStats()
      ])
      const empResult = await fetchEmployees({ limit: 5 })
      if (empResult?.success) setRecentEmployees(empResult.data?.slice(0, 5) || [])
      const leaveResult = await fetchLeaveRequests({ status: 'pending' })
      if (leaveResult?.success) setPendingLeaves(leaveResult.data?.slice(0, 5) || [])
    } catch (err) {
      console.error('HR Dashboard load error:', err)
    }
    setLoading(false)
  }

  const statCards = [
    { icon: Users, label: 'Total Employees', value: stats.totalEmployees || 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', path: '/hr/employees' },
    { icon: UserCheck, label: 'Active Employees', value: stats.activeEmployees || 0, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', path: '/hr/employees' },
    { icon: Clock, label: 'Present Today', value: attendanceStats?.presentToday || 0, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30', path: '/hr/attendance' },
    { icon: FileText, label: 'Active Contracts', value: stats.activeContracts || 0, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', path: '/hr/contracts' },
    { icon: Calendar, label: 'Pending Leave', value: stats.pendingLeave || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', path: '/hr/leave' },
    { icon: GraduationCap, label: 'Training', value: stats.ongoingTraining || 0, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', path: '/hr/training' },
    { icon: AlertTriangle, label: 'Disciplinary', value: '0', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', path: '/hr/disciplinary' },
    { icon: TrendingUp, label: 'Attendance Rate', value: `${attendanceStats?.attendanceRate || 0}%`, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30', path: '/hr/attendance' },
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
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Back to Dashboard */}
        <Link 
          to="/dashboard"
          className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span className="text-sm">Back to Main Dashboard</span>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">
                HR Management
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">
              Employee lifecycle management, contracts, leave, training, and attendance
            </p>
          </div>
          
          <button
            onClick={() => navigate('/hr/employees/new')}
            className="neu-raised neu-btn px-6 py-3 rounded-2xl flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Employee</span>
          </button>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
        >
          {[
            { label: 'Add Employee', icon: UserPlus, path: '/hr/employees/new' },
            { label: 'Attendance', icon: Clock, path: '/hr/attendance' },
            { label: 'Timesheets', icon: ClipboardList, path: '/hr/attendance/timesheets' },
            { label: 'Shifts', icon: Calendar, path: '/hr/attendance/shifts' },
            { label: 'Leave', icon: Calendar, path: '/hr/leave' },
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              onClick={() => stat.path && navigate(stat.path)}
              className="neu-raised rounded-2xl p-4 stat-card cursor-pointer hover:scale-105 transition-transform"
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Employees */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="neu-raised rounded-3xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Recent Employees
              </h2>
              <Link to="/hr/employees" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {recentEmployees.length > 0 ? recentEmployees.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/hr/employees/${emp.id}`)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">{emp.first_name?.[0]}{emp.last_name?.[0]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-white text-sm">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{emp.position || 'No position'} · {emp.employee_code}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.employment_status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : emp.employment_status === 'on_leave' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                    {emp.employment_status?.replace('_', ' ') || 'unknown'}
                  </span>
                </div>
              )) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No employees yet</p>
                  <button onClick={() => navigate('/hr/employees/new')} className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium">Add your first employee →</button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Pending Leave Requests */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="neu-raised rounded-3xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                Pending Leave Requests
              </h2>
              <Link to="/hr/leave" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {pendingLeaves.length > 0 ? pendingLeaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white text-sm">{leave.employees?.first_name} {leave.employees?.last_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{leave.leave_types?.name || 'Leave'} · {leave.total_days} days</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full whitespace-nowrap">Pending</span>
                </div>
              )) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No pending leave requests</p>
                  <button onClick={() => navigate('/hr/leave/new')} className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium">Create leave request →</button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Attendance Quick View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="neu-raised rounded-3xl p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-600" />
              Today's Attendance Overview
            </h2>
            <Link to="/hr/attendance" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Go to Attendance <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{attendanceStats?.presentToday || 0}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Present</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{attendanceStats?.absentToday || 0}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Absent</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{attendanceStats?.lateToday || 0}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Late</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{attendanceStats?.onLeave || 0}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">On Leave</p>
            </div>
          </div>
        </motion.div>

        {/* HR Sub-Modules */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            HR Sub-Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Clock, label: 'Attendance Tracking', description: 'Clock in/out, GPS, QR codes, timesheets', path: '/hr/attendance', color: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600 dark:text-cyan-400' },
              { icon: CreditCard, label: 'Payroll Management', description: 'Salaries, payslips, overtime, tax', path: '/payroll', color: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600 dark:text-purple-400' },
              { icon: ClipboardList, label: 'Jobs & Scheduling', description: 'Job management, teams, routes, quality control', path: '/operations', color: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400' },
            ].map((module, index) => (
              <motion.div key={module.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + index * 0.1 }}
                onClick={() => navigate(module.path)}
                className="neu-raised rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all">
                <div className={`w-12 h-12 rounded-xl ${module.color} flex items-center justify-center mb-3`}>
                  <module.icon className={`w-6 h-6 ${module.iconColor}`} />
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-white mb-1">{module.label}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{module.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
