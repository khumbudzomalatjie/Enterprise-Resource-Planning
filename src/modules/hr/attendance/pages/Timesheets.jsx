import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useAttendanceStore from '../store/attendanceStore'
import useThemeStore from '../../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Clock, Users, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  Search, Filter, Download, Printer, Eye, Edit, FileText,
  ChevronRight, ArrowLeft, Sun, Moon, Sparkles, MapPin, Briefcase,
  Building2, Phone, Calendar, Timer, BarChart3, Wrench
} from 'lucide-react'

export default function Timesheets() {
  const { attendanceRecords, timesheetStats, fetchAttendanceRecords, fetchTimesheetStats, loading } = useAttendanceStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  useEffect(() => {
    loadData()
  }, [statusFilter])

  const loadData = async () => {
    const filters = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    if (dateFrom) filters.date_from = dateFrom
    if (dateTo) filters.date_to = dateTo
    if (search) filters.search = search
    await Promise.all([fetchAttendanceRecords(filters), fetchTimesheetStats()])
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadData()
  }

  const handleViewDetail = (record) => {
    setSelectedRecord(record)
    setShowDetail(true)
  }

  const formatCurrency = (v) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(v || 0)
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : '-'
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }) : '-'

  const statCards = [
    { icon: Clock, label: 'Hours Today', value: `${timesheetStats.totalHoursToday || 0}h`, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: Calendar, label: 'Hours This Week', value: `${timesheetStats.totalHoursWeek || 0}h`, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: BarChart3, label: 'Hours This Month', value: `${timesheetStats.totalHoursMonth || 0}h`, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: Users, label: 'Clocked In', value: timesheetStats.clockedIn || 0, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: CheckCircle2, label: 'Clocked Out', value: timesheetStats.clockedOut || 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: TrendingUp, label: 'Overtime', value: `${timesheetStats.overtime || 0}h`, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { icon: AlertTriangle, label: 'Missing Clock Out', value: timesheetStats.missingClockOut || 0, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { icon: XCircle, label: 'Late Today', value: timesheetStats.lateToday || 0, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  ]

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Clock className="w-8 h-8 text-emerald-600" />Timesheets
          </h1>
          <p className="text-slate-500 mt-1">Employee attendance records and work hours</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="neu-raised rounded-2xl p-3 text-center">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-1`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee name or code..." className="w-full pl-9 pr-4 py-2.5 neu-inset rounded-xl text-sm" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 neu-inset rounded-xl text-sm">
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="on_leave">On Leave</option>
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-4 py-2.5 neu-inset rounded-xl text-sm" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-4 py-2.5 neu-inset rounded-xl text-sm" />
            <button type="submit" className="neu-raised neu-btn px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm">Search</button>
            <button type="button" className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-slate-600 text-white text-sm flex items-center gap-1"><Download className="w-4 h-4" /> Export</button>
            <button type="button" className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-slate-600 text-white text-sm flex items-center gap-1"><Printer className="w-4 h-4" /> Print</button>
          </form>
        </div>

        {/* Table */}
        <div className="neu-raised rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left py-3 px-3 text-slate-500 text-xs font-medium">Employee</th>
                  <th className="text-left py-3 px-3 text-slate-500 text-xs font-medium">Code</th>
                  <th className="text-left py-3 px-3 text-slate-500 text-xs font-medium hidden md:table-cell">Dept</th>
                  <th className="text-left py-3 px-3 text-slate-500 text-xs font-medium">Date</th>
                  <th className="text-left py-3 px-3 text-slate-500 text-xs font-medium">Clock In</th>
                  <th className="text-left py-3 px-3 text-slate-500 text-xs font-medium">Clock Out</th>
                  <th className="text-left py-3 px-3 text-slate-500 text-xs font-medium hidden lg:table-cell">Hours</th>
                  <th className="text-left py-3 px-3 text-slate-500 text-xs font-medium">Status</th>
                  <th className="text-right py-3 px-3 text-slate-500 text-xs font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.id} className="border-t border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20 cursor-pointer" onClick={() => handleViewDetail(record)}>
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-white">{record.employees?.first_name} {record.employees?.last_name}</td>
                    <td className="py-3 px-3 text-xs text-slate-500">{record.employees?.employee_code}</td>
                    <td className="py-3 px-3 text-xs text-slate-500 hidden md:table-cell">{record.employees?.department || '-'}</td>
                    <td className="py-3 px-3 text-xs">{formatDate(record.attendance_date)}</td>
                    <td className="py-3 px-3 text-xs">{formatTime(record.clock_in_time)}</td>
                    <td className="py-3 px-3 text-xs">{formatTime(record.clock_out_time)}</td>
                    <td className="py-3 px-3 text-xs hidden lg:table-cell font-medium">{record.total_hours?.toFixed(1) || '-'}h</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        record.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                        record.status === 'late' ? 'bg-amber-100 text-amber-700' :
                        record.status === 'absent' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'}`}>{record.status}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button onClick={(e) => { e.stopPropagation(); handleViewDetail(record) }} className="p-1.5 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600"><Eye className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {attendanceRecords.length === 0 && (
            <div className="text-center py-12"><Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" /><p className="text-slate-500">No timesheet records found</p></div>
          )}
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {showDetail && selectedRecord && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Timesheet Detail</h3>
                  <button onClick={() => setShowDetail(false)} className="p-2 rounded-lg hover:bg-slate-100"><XCircle className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs text-slate-500">Employee</p><p className="font-medium">{selectedRecord.employees?.first_name} {selectedRecord.employees?.last_name}</p></div>
                  <div><p className="text-xs text-slate-500">Code</p><p>{selectedRecord.employees?.employee_code}</p></div>
                  <div><p className="text-xs text-slate-500">Department</p><p>{selectedRecord.employees?.department || '-'}</p></div>
                  <div><p className="text-xs text-slate-500">Position</p><p>{selectedRecord.employees?.position || '-'}</p></div>
                  <div><p className="text-xs text-slate-500">Date</p><p>{formatDate(selectedRecord.attendance_date)}</p></div>
                  <div><p className="text-xs text-slate-500">Status</p><span className={`px-2 py-0.5 rounded-full text-xs ${selectedRecord.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{selectedRecord.status}</span></div>
                  <div><p className="text-xs text-slate-500">Clock In</p><p>{formatTime(selectedRecord.clock_in_time)}</p></div>
                  <div><p className="text-xs text-slate-500">Clock Out</p><p>{formatTime(selectedRecord.clock_out_time)}</p></div>
                  <div><p className="text-xs text-slate-500">Total Hours</p><p className="font-bold">{selectedRecord.total_hours?.toFixed(1) || '-'}h</p></div>
                  <div><p className="text-xs text-slate-500">Method</p><p className="capitalize">{selectedRecord.check_in_method?.replace(/_/g, ' ') || '-'}</p></div>
                  {selectedRecord.check_in_latitude && (
                    <div className="col-span-2"><p className="text-xs text-slate-500">GPS Location</p><p className="text-xs">{selectedRecord.check_in_latitude?.toFixed(6)}, {selectedRecord.check_in_longitude?.toFixed(6)}</p></div>
                  )}
                  {selectedRecord.notes && (
                    <div className="col-span-2"><p className="text-xs text-slate-500">Notes</p><p>{selectedRecord.notes}</p></div>
                  )}
                </div>
                <div className="flex gap-2 mt-6 justify-end">
                  <button className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white text-sm"><Edit className="w-4 h-4 inline mr-1" /> Edit</button>
                  <button className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm"><CheckCircle2 className="w-4 h-4 inline mr-1" /> Approve</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
