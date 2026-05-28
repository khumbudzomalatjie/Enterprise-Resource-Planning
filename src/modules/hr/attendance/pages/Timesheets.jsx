import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useAttendanceStore from '../store/attendanceStore'
import useThemeStore from '../../../../store/themeStore'
import toast from 'react-hot-toast'
import { FileText, Search, Eye, Download, Calendar, ChevronRight, Sun, Moon, Sparkles } from 'lucide-react'

export default function Timesheets() {
  const { timesheets, fetchTimesheets, loading } = useAttendanceStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [periodFilter, setPeriodFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const filters = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    fetchTimesheets(filters)
  }, [statusFilter])

  const formatHours = (hours) => {
    if (!hours) return '0h 0m'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h ${m}m`
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

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
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/hr/attendance" className="text-slate-500 hover:text-emerald-600">Attendance</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Timesheets</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><FileText className="w-8 h-8 text-emerald-600" />Timesheets</h1>
            <p className="text-slate-500 mt-1">Employee timesheets and work hours</p>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="processed">Processed</option>
          </select>
        </motion.div>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div><p className="text-slate-500">Loading timesheets...</p></div>
        ) : (
          <div className="neu-raised rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left text-sm font-medium text-slate-500 py-4 px-6">Employee</th>
                    <th className="text-left text-sm font-medium text-slate-500 py-4 px-6">Period</th>
                    <th className="text-center text-sm font-medium text-slate-500 py-4 px-6">Regular Hours</th>
                    <th className="text-center text-sm font-medium text-slate-500 py-4 px-6">Overtime</th>
                    <th className="text-center text-sm font-medium text-slate-500 py-4 px-6">Days Worked</th>
                    <th className="text-center text-sm font-medium text-slate-500 py-4 px-6">Status</th>
                    <th className="text-right text-sm font-medium text-slate-500 py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.map(ts => (
                    <tr key={ts.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer" onClick={() => navigate(`/hr/attendance/timesheets/${ts.id}`)}>
                      <td className="py-4 px-6"><p className="font-medium text-sm">{ts.employees?.first_name} {ts.employees?.last_name}</p><p className="text-xs text-slate-500">{ts.employees?.employee_code}</p></td>
                      <td className="py-4 px-6 text-sm text-slate-600">{new Date(ts.period_start).toLocaleDateString()} - {new Date(ts.period_end).toLocaleDateString()}</td>
                      <td className="py-4 px-6 text-center text-sm">{formatHours(ts.total_regular_hours)}</td>
                      <td className="py-4 px-6 text-center text-sm text-amber-600">{formatHours(ts.total_overtime_hours)}</td>
                      <td className="py-4 px-6 text-center text-sm">{ts.total_worked_days}</td>
                      <td className="py-4 px-6 text-center"><span className={`px-2 py-1 rounded-full text-xs ${ts.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : ts.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{ts.status}</span></td>
                      <td className="py-4 px-6 text-right"><button className="p-2 rounded-xl hover:bg-emerald-100 text-slate-400 hover:text-emerald-600"><Eye className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {timesheets.length === 0 && <p className="text-center text-slate-500 py-12">No timesheets found</p>}
          </div>
        )}
      </main>
    </div>
  )
}
