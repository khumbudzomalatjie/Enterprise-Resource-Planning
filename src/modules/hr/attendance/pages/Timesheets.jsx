import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useAttendanceStore from '../store/attendanceStore'
import useThemeStore from '../../../../store/themeStore'
import { supabase } from '../../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Clock, Users, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  Search, Filter, Download, Printer, Eye, Edit, FileText,
  ChevronRight, ArrowLeft, Sun, Moon, Sparkles, MapPin, Briefcase,
  Building2, Phone, Calendar, Timer, BarChart3, Wrench, User,
  Mail, Shield, Clock3, Hash, ChevronDown, ChevronUp
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
  const [employeeDetails, setEmployeeDetails] = useState(null)
  const [employeeShifts, setEmployeeShifts] = useState([])
  const [employeeStats, setEmployeeStats] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [sortField, setSortField] = useState('attendance_date')
  const [sortDir, setSortDir] = useState('desc')

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

  const handleSearch = (e) => { e.preventDefault(); loadData() }

  const handleViewDetail = async (record) => {
    setSelectedRecord(record)
    setShowDetail(true)
    setLoadingDetail(true)
    
    // Fetch complete employee details
    if (record.employee_id || record.employees?.id) {
      const empId = record.employee_id || record.employees?.id
      
      // Get employee full profile
      const { data: emp } = await supabase
        .from('employees')
        .select('*')
        .eq('id', empId)
        .single()
      setEmployeeDetails(emp)

      // Get employee's shifts
      const { data: shifts } = await supabase
        .from('shift_assignments')
        .select('*, shift_templates(*)')
        .eq('employee_id', empId)
        .eq('status', 'active')
        .order('effective_date', { ascending: false })
        .limit(5)
      setEmployeeShifts(shifts || [])

      // Get employee attendance stats for current month
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      const { data: monthRecords } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', empId)
        .gte('attendance_date', monthStart)
      
      if (monthRecords) {
        const totalDays = monthRecords.length
        const presentDays = monthRecords.filter(r => r.status === 'present').length
        const absentDays = monthRecords.filter(r => r.status === 'absent').length
        const lateDays = monthRecords.filter(r => r.is_late).length
        const totalHours = monthRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0)
        const overtimeHours = monthRecords.reduce((sum, r) => {
          const ot = (r.total_hours || 0) > 9 ? (r.total_hours - 9) : 0
          return sum + ot
        }, 0)

        setEmployeeStats({
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          totalHours: totalHours.toFixed(1),
          overtimeHours: overtimeHours.toFixed(1),
          attendanceRate: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
        })
      }
    }
    setLoadingDetail(false)
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedRecords = [...attendanceRecords].sort((a, b) => {
    let valA, valB
    switch (sortField) {
      case 'employee': valA = `${a.employees?.first_name} ${a.employees?.last_name}`; valB = `${b.employees?.first_name} ${b.employees?.last_name}`; break
      case 'attendance_date': valA = a.attendance_date; valB = b.attendance_date; break
      case 'clock_in_time': valA = a.clock_in_time || ''; valB = b.clock_in_time || ''; break
      case 'total_hours': valA = a.total_hours || 0; valB = b.total_hours || 0; break
      case 'status': valA = a.status || ''; valB = b.status || ''; break
      default: valA = a.attendance_date; valB = b.attendance_date
    }
    if (valA < valB) return sortDir === 'asc' ? -1 : 1
    if (valA > valB) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : '-'
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'

  const SortIcon = ({ field }) => (
    <span className="inline-flex flex-col ml-1">
      <ChevronUp className={`w-3 h-3 -mb-1 ${sortField === field && sortDir === 'asc' ? 'text-emerald-600' : 'text-slate-300'}`} />
      <ChevronDown className={`w-3 h-3 ${sortField === field && sortDir === 'desc' ? 'text-emerald-600' : 'text-slate-300'}`} />
    </span>
  )

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
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><Clock className="w-8 h-8 text-emerald-600" />Timesheets</h1>
          <p className="text-slate-500 mt-1">Employee attendance records and work hours - Click any row for details</p>
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
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." className="w-full pl-9 pr-4 py-2.5 neu-inset rounded-xl text-sm" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 neu-inset rounded-xl text-sm">
              <option value="all">All Status</option><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="on_leave">On Leave</option>
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-4 py-2.5 neu-inset rounded-xl text-sm" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-4 py-2.5 neu-inset rounded-xl text-sm" />
            <button type="submit" className="neu-raised neu-btn px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm">Search</button>
            <button type="button" onClick={() => {
              const csv = sortedRecords.map(r => `${r.employees?.first_name} ${r.employees?.last_name},${r.employees?.employee_code},${r.attendance_date},${r.clock_in_time},${r.clock_out_time},${r.total_hours},${r.status}`).join('\n')
              const blob = new Blob(['Employee,Code,Date,Clock In,Clock Out,Hours,Status\n' + csv], { type: 'text/csv' })
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = 'timesheets.csv'; a.click()
              toast.success('Exported!')
            }} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-slate-600 text-white text-sm flex items-center gap-1"><Download className="w-4 h-4" /> Export</button>
          </form>
        </div>

        {/* Table */}
        <div className="neu-raised rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left py-3 px-3 text-xs text-slate-500 cursor-pointer hover:text-slate-700" onClick={() => handleSort('employee')}>
                    Employee <SortIcon field="employee" />
                  </th>
                  <th className="text-left py-3 px-3 text-xs text-slate-500 hidden md:table-cell">Code</th>
                  <th className="text-left py-3 px-3 text-xs text-slate-500 hidden md:table-cell">Dept</th>
                  <th className="text-left py-3 px-3 text-xs text-slate-500 cursor-pointer hover:text-slate-700" onClick={() => handleSort('attendance_date')}>
                    Date <SortIcon field="attendance_date" />
                  </th>
                  <th className="text-left py-3 px-3 text-xs text-slate-500 cursor-pointer hover:text-slate-700" onClick={() => handleSort('clock_in_time')}>
                    Clock In <SortIcon field="clock_in_time" />
                  </th>
                  <th className="text-left py-3 px-3 text-xs text-slate-500">Clock Out</th>
                  <th className="text-left py-3 px-3 text-xs text-slate-500 hidden lg:table-cell cursor-pointer hover:text-slate-700" onClick={() => handleSort('total_hours')}>
                    Hours <SortIcon field="total_hours" />
                  </th>
                  <th className="text-left py-3 px-3 text-xs text-slate-500 cursor-pointer hover:text-slate-700" onClick={() => handleSort('status')}>
                    Status <SortIcon field="status" />
                  </th>
                  <th className="text-right py-3 px-3 text-xs text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((record) => (
                  <tr key={record.id} className="border-t border-slate-100 dark:border-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/20 cursor-pointer" onClick={() => handleViewDetail(record)}>
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-white">{record.employees?.first_name} {record.employees?.last_name}</td>
                    <td className="py-3 px-3 text-xs text-slate-500 hidden md:table-cell">{record.employees?.employee_code || '-'}</td>
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
          {sortedRecords.length === 0 && (
            <div className="text-center py-12"><Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" /><p className="text-slate-500">No timesheet records found</p></div>
          )}
        </div>

        {/* Detail Modal */}
        <AnimatePresence>
          {showDetail && selectedRecord && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => { setShowDetail(false); setEmployeeDetails(null); setEmployeeStats(null) }}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} 
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto" 
                onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Timesheet Detail</h3>
                    <p className="text-sm text-slate-500">{selectedRecord.employees?.first_name} {selectedRecord.employees?.last_name} - {formatDate(selectedRecord.attendance_date)}</p>
                  </div>
                  <button onClick={() => { setShowDetail(false); setEmployeeDetails(null); setEmployeeStats(null) }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                    <XCircle className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {loadingDetail ? (
                  <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div><p className="text-sm text-slate-500 mt-2">Loading details...</p></div>
                ) : (
                  <>
                    {/* Employee Information */}
                    {employeeDetails && (
                      <div className="neu-inset rounded-2xl p-4 mb-4">
                        <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Employee Information</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><p className="text-xs text-slate-500">Full Name</p><p className="font-medium text-slate-800 dark:text-white">{employeeDetails.first_name} {employeeDetails.last_name}</p></div>
                          <div><p className="text-xs text-slate-500">Employee Code</p><p className="font-medium">{employeeDetails.employee_code || '-'}</p></div>
                          <div><p className="text-xs text-slate-500">Department</p><p className="font-medium">{employeeDetails.department || '-'}</p></div>
                          <div><p className="text-xs text-slate-500">Position</p><p className="font-medium">{employeeDetails.position || '-'}</p></div>
                          {employeeDetails.email && <div><p className="text-xs text-slate-500">Email</p><p className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" />{employeeDetails.email}</p></div>}
                          {employeeDetails.phone && <div><p className="text-xs text-slate-500">Phone</p><p className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" />{employeeDetails.phone}</p></div>}
                          <div><p className="text-xs text-slate-500">Hire Date</p><p className="text-xs">{employeeDetails.date_of_hire ? formatDate(employeeDetails.date_of_hire) : '-'}</p></div>
                          <div><p className="text-xs text-slate-500">Status</p><span className={`px-2 py-0.5 rounded-full text-xs ${employeeDetails.employment_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{employeeDetails.employment_status}</span></div>
                        </div>
                      </div>
                    )}

                    {/* Attendance Details */}
                    <div className="neu-inset rounded-2xl p-4 mb-4">
                      <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" /> Attendance Record</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><p className="text-xs text-slate-500">Date</p><p className="font-medium">{formatDate(selectedRecord.attendance_date)}</p></div>
                        <div><p className="text-xs text-slate-500">Status</p><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${selectedRecord.status === 'present' ? 'bg-emerald-100 text-emerald-700' : selectedRecord.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{selectedRecord.status}</span></div>
                        <div><p className="text-xs text-slate-500">Clock In</p><p className="font-medium">{formatTime(selectedRecord.clock_in_time)}</p></div>
                        <div><p className="text-xs text-slate-500">Clock Out</p><p className="font-medium">{formatTime(selectedRecord.clock_out_time)}</p></div>
                        <div><p className="text-xs text-slate-500">Total Hours</p><p className="font-bold text-emerald-600">{selectedRecord.total_hours?.toFixed(1) || '-'}h</p></div>
                        <div><p className="text-xs text-slate-500">Method</p><p className="capitalize">{selectedRecord.check_in_method?.replace(/_/g, ' ') || '-'}</p></div>
                        <div><p className="text-xs text-slate-500">Break Start</p><p>{formatTime(selectedRecord.break_start)}</p></div>
                        <div><p className="text-xs text-slate-500">Break End</p><p>{formatTime(selectedRecord.break_end)}</p></div>
                      </div>
                      {selectedRecord.check_in_latitude && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> GPS Location</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-slate-500">Check-in:</span> {selectedRecord.check_in_latitude?.toFixed(6)}, {selectedRecord.check_in_longitude?.toFixed(6)}</div>
                            {selectedRecord.check_out_latitude && <div><span className="text-slate-500">Check-out:</span> {selectedRecord.check_out_latitude?.toFixed(6)}, {selectedRecord.check_out_longitude?.toFixed(6)}</div>}
                          </div>
                        </div>
                      )}
                      {selectedRecord.notes && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                          <p className="text-xs text-slate-500">Notes</p><p className="text-sm">{selectedRecord.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Monthly Stats */}
                    {employeeStats && (
                      <div className="neu-inset rounded-2xl p-4 mb-4">
                        <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Monthly Statistics</h4>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20"><p className="text-lg font-bold text-emerald-600">{employeeStats.presentDays}</p><p className="text-[10px] text-slate-500">Present</p></div>
                          <div className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20"><p className="text-lg font-bold text-red-600">{employeeStats.absentDays}</p><p className="text-[10px] text-slate-500">Absent</p></div>
                          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20"><p className="text-lg font-bold text-amber-600">{employeeStats.lateDays}</p><p className="text-[10px] text-slate-500">Late</p></div>
                          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20"><p className="text-lg font-bold text-blue-600">{employeeStats.totalHours}h</p><p className="text-[10px] text-slate-500">Total Hours</p></div>
                          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20"><p className="text-lg font-bold text-purple-600">{employeeStats.overtimeHours}h</p><p className="text-[10px] text-slate-500">Overtime</p></div>
                          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20"><p className="text-lg font-bold text-indigo-600">{employeeStats.attendanceRate}%</p><p className="text-[10px] text-slate-500">Rate</p></div>
                        </div>
                      </div>
                    )}

                    {/* Active Shifts */}
                    {employeeShifts.length > 0 && (
                      <div className="neu-inset rounded-2xl p-4 mb-4">
                        <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> Active Shifts</h4>
                        <div className="space-y-2">
                          {employeeShifts.map(shift => (
                            <div key={shift.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30 text-sm">
                              <div>
                                <span className="font-medium">{shift.shift_templates?.shift_name}</span>
                                <span className="text-xs text-slate-500 ml-2">{shift.shift_templates?.start_time?.slice(0,5)} - {shift.shift_templates?.end_time?.slice(0,5)}</span>
                              </div>
                              <span className="text-xs text-slate-500">Since {formatDate(shift.effective_date)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-6 justify-end">
                  <button onClick={() => toast.success('Edit feature coming soon')} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white text-sm flex items-center gap-1"><Edit className="w-4 h-4" /> Edit</button>
                  <button onClick={() => toast.success('Approved!')} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Approve</button>
                  <button onClick={() => { 
                    const detailText = `
Employee: ${employeeDetails?.first_name || selectedRecord.employees?.first_name} ${employeeDetails?.last_name || selectedRecord.employees?.last_name}
Code: ${employeeDetails?.employee_code || selectedRecord.employees?.employee_code}
Date: ${formatDate(selectedRecord.attendance_date)}
Clock In: ${formatTime(selectedRecord.clock_in_time)}
Clock Out: ${formatTime(selectedRecord.clock_out_time)}
Total Hours: ${selectedRecord.total_hours?.toFixed(1) || '-'}h
Status: ${selectedRecord.status}
                    `.trim()
                    const blob = new Blob([detailText], { type: 'text/plain' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = `timesheet-${selectedRecord.employees?.first_name}-${selectedRecord.attendance_date}.txt`; a.click()
                    toast.success('Downloaded!')
                  }} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm flex items-center gap-1"><Download className="w-4 h-4" /> Download</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
