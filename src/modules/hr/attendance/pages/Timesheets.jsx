import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useAttendanceStore from '../store/attendanceStore'
import useThemeStore from '../../../../store/themeStore'
import { supabase } from '../../../../lib/supabaseClient'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { 
  Clock, Users, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  Search, Download, Eye, ChevronRight, Sun, Moon, Sparkles, MapPin,
  Calendar, Timer, BarChart3, User, Mail, Phone, Shield, Briefcase,
  Hash, Building2, FileSpreadsheet
} from 'lucide-react'

export default function Timesheets() {
  const { attendanceRecords, timesheetStats, fetchAttendanceRecords, fetchTimesheetStats, loading } = useAttendanceStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [employeeData, setEmployeeData] = useState(null)
  const [employeeAttendance, setEmployeeAttendance] = useState([])
  const [employeeShifts, setEmployeeShifts] = useState([])
  const [employeeStats, setEmployeeStats] = useState(null)
  const [loadingEmployee, setLoadingEmployee] = useState(false)
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false)
  const logoRef = useRef(null)

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
    if (search.trim()) {
      searchAndShowEmployee(search)
    } else {
      loadData()
    }
  }

  const searchAndShowEmployee = async (searchTerm) => {
    setLoadingEmployee(true)
    setShowEmployeeDetail(true)
    
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,employee_code.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(1)

    if (!employees || employees.length === 0) {
      toast.error('Employee not found')
      setLoadingEmployee(false)
      return
    }

    const emp = employees[0]
    setSelectedEmployee(emp)
    setEmployeeData(emp)

    const { data: attendance } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', emp.id)
      .order('attendance_date', { ascending: false })
      .limit(100)
    setEmployeeAttendance(attendance || [])

    const { data: shifts } = await supabase
      .from('shift_assignments')
      .select('*, shift_templates(*)')
      .eq('employee_id', emp.id)
      .eq('status', 'active')
      .order('effective_date', { ascending: false })
    setEmployeeShifts(shifts || [])

    if (attendance && attendance.length > 0) {
      const total = attendance.length
      const present = attendance.filter(r => r.status === 'present').length
      const absent = attendance.filter(r => r.status === 'absent').length
      const late = attendance.filter(r => r.is_late).length
      const hours = attendance.reduce((s, r) => s + (r.total_hours || 0), 0)
      const overtime = attendance.reduce((s, r) => {
        const ot = (r.total_hours || 0) > 9 ? (r.total_hours - 9) : 0
        return s + ot
      }, 0)

      setEmployeeStats({
        total, present, absent, late,
        totalHours: hours.toFixed(1),
        overtimeHours: overtime.toFixed(1),
        attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
        avgHours: present > 0 ? (hours / present).toFixed(1) : 0
      })
    }

    setLoadingEmployee(false)
    await fetchAttendanceRecords({ search: searchTerm })
  }

  const clearEmployeeSearch = () => {
    setSearch('')
    setShowEmployeeDetail(false)
    setSelectedEmployee(null)
    setEmployeeData(null)
    setEmployeeAttendance([])
    setEmployeeShifts([])
    setEmployeeStats(null)
    loadData()
  }

  const downloadExcel = async () => {
    if (!employeeData || employeeAttendance.length === 0) {
      toast.error('No data to download')
      return
    }

    const emp = employeeData
    const attendance = employeeAttendance
    const stats = employeeStats

    // Create workbook
    const wb = XLSX.utils.book_new()

    // ============================================
    // Sheet 1: Employee Info
    // ============================================
    const infoData = [
      ['NDANDULENI GROUP - EMPLOYEE TIMESHEET'],
      [''],
      ['Employee Information'],
      ['Employee Name', `${emp.first_name} ${emp.last_name || ''}`],
      ['Employee Code', emp.employee_code || 'N/A'],
      ['Department', emp.department || 'N/A'],
      ['Position', emp.position || 'N/A'],
      ['Email', emp.email || 'N/A'],
      ['Phone', emp.phone || 'N/A'],
      ['Hire Date', emp.date_of_hire ? formatDate(emp.date_of_hire) : 'N/A'],
      ['Status', emp.employment_status || 'N/A'],
      [''],
      ['Attendance Summary'],
      ['Total Records', stats?.total || 0],
      ['Present Days', stats?.present || 0],
      ['Absent Days', stats?.absent || 0],
      ['Late Days', stats?.late || 0],
      ['Total Hours', `${stats?.totalHours || 0}h`],
      ['Overtime Hours', `${stats?.overtimeHours || 0}h`],
      ['Attendance Rate', `${stats?.attendanceRate || 0}%`],
      [''],
      ['Generated', new Date().toLocaleString('en-ZA')],
      ['Generated By', 'Ndanduleni Group ERP System'],
    ]

    const ws1 = XLSX.utils.aoa_to_sheet(infoData)

    // Set column widths
    ws1['!cols'] = [{ wch: 25 }, { wch: 50 }]

    // Style the title
    if (ws1['A1']) {
      ws1['A1'].s = { font: { bold: true, sz: 16, color: { rgb: '059669' } } }
    }

    XLSX.utils.book_append_sheet(wb, ws1, 'Employee Info')

    // ============================================
    // Sheet 2: Attendance History
    // ============================================
    const attendanceHeaders = [
      'Date', 'Day', 'Clock In', 'Clock Out', 'Total Hours', 
      'Status', 'Late', 'Method', 'GPS Location', 'Notes'
    ]

    const attendanceRows = attendance.map(r => [
      r.attendance_date || '',
      r.attendance_date ? new Date(r.attendance_date).toLocaleDateString('en-ZA', { weekday: 'long' }) : '',
      r.clock_in_time ? new Date(r.clock_in_time).toLocaleTimeString('en-ZA') : '-',
      r.clock_out_time ? new Date(r.clock_out_time).toLocaleTimeString('en-ZA') : '-',
      r.total_hours?.toFixed(1) || '0',
      r.status || '-',
      r.is_late ? 'Yes' : 'No',
      (r.check_in_method || '').replace(/_/g, ' '),
      r.check_in_latitude ? `${r.check_in_latitude.toFixed(6)}, ${r.check_in_longitude.toFixed(6)}` : '-',
      r.notes || ''
    ])

    const ws2 = XLSX.utils.aoa_to_sheet([attendanceHeaders, ...attendanceRows])
    ws2['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 12 },
      { wch: 30 }, { wch: 25 }
    ]

    // Style header row
    for (let i = 0; i < attendanceHeaders.length; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: i })
      if (ws2[cellRef]) {
        ws2[cellRef].s = { 
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '059669' } },
          alignment: { horizontal: 'center' }
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws2, 'Attendance History')

    // ============================================
    // Sheet 3: Summary Stats
    // ============================================
    const statsData = [
      ['NDANDULENI GROUP'],
      ['ATTENDANCE STATISTICS'],
      [''],
      ['Metric', 'Value'],
      ['Total Records', stats?.total || 0],
      ['Present Days', stats?.present || 0],
      ['Absent Days', stats?.absent || 0],
      ['Late Days', stats?.late || 0],
      ['Total Hours Worked', `${stats?.totalHours || 0}h`],
      ['Overtime Hours', `${stats?.overtimeHours || 0}h`],
      ['Average Hours/Day', `${stats?.avgHours || 0}h`],
      ['Attendance Rate', `${stats?.attendanceRate || 0}%`],
      [''],
      ['Monthly Breakdown'],
    ]

    // Monthly breakdown
    const monthlyData = {}
    attendance.forEach(r => {
      if (r.attendance_date) {
        const month = r.attendance_date.substring(0, 7)
        if (!monthlyData[month]) monthlyData[month] = { total: 0, present: 0, absent: 0, late: 0, hours: 0 }
        monthlyData[month].total++
        if (r.status === 'present') monthlyData[month].present++
        if (r.status === 'absent') monthlyData[month].absent++
        if (r.is_late) monthlyData[month].late++
        monthlyData[month].hours += (r.total_hours || 0)
      }
    })

    statsData.push(['Month', 'Total', 'Present', 'Absent', 'Late', 'Hours'])
    Object.entries(monthlyData).sort().forEach(([month, data]) => {
      statsData.push([month, data.total, data.present, data.absent, data.late, data.hours.toFixed(1)])
    })

    const ws3 = XLSX.utils.aoa_to_sheet(statsData)
    ws3['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]

    if (ws3['A1']) ws3['A1'].s = { font: { bold: true, sz: 14, color: { rgb: '059669' } } }

    XLSX.utils.book_append_sheet(wb, ws3, 'Summary')

    // Download
    const fileName = `Timesheet_${emp.first_name}_${emp.last_name}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
    toast.success('Excel downloaded!')
  }

  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : '-'
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'

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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><Clock className="w-8 h-8 text-emerald-600" />Timesheets</h1>
            <p className="text-slate-500 mt-1">Search an employee to view and download their attendance</p>
          </div>
          {showEmployeeDetail && employeeData && (
            <button onClick={downloadExcel} className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 font-semibold">
              <FileSpreadsheet className="w-5 h-5" /> Download Excel
            </button>
          )}
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

        {/* Search */}
        <div className="neu-raised rounded-2xl p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee by name, code, or email..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
            </div>
            <button type="submit" className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold">
              <Search className="w-4 h-4 inline mr-1" /> Search
            </button>
            {showEmployeeDetail && (
              <button type="button" onClick={clearEmployeeSearch} className="neu-raised neu-btn px-4 py-3 rounded-xl bg-slate-600 text-white text-sm">Clear</button>
            )}
          </form>
        </div>

        {/* Employee Detail */}
        <AnimatePresence>
          {showEmployeeDetail && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 space-y-4">
              {loadingEmployee ? (
                <div className="neu-raised rounded-3xl p-12 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3"></div>
                  <p className="text-slate-500">Loading...</p>
                </div>
              ) : employeeData ? (
                <>
                  {/* Profile */}
                  <div className="neu-raised rounded-3xl p-6 border-l-4 border-emerald-500">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-2xl font-bold text-emerald-600">
                          {employeeData.first_name?.[0]}{employeeData.last_name?.[0]}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{employeeData.first_name} {employeeData.last_name}</h2>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{employeeData.employee_code || 'N/A'}</span>
                            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{employeeData.department || 'N/A'}</span>
                            <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{employeeData.position || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${employeeData.employment_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {employeeData.employment_status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {employeeData.email && <div className="flex items-center gap-2 text-slate-500"><Mail className="w-4 h-4" />{employeeData.email}</div>}
                      {employeeData.phone && <div className="flex items-center gap-2 text-slate-500"><Phone className="w-4 h-4" />{employeeData.phone}</div>}
                      <div className="flex items-center gap-2 text-slate-500"><Calendar className="w-4 h-4" />Hired: {formatDate(employeeData.date_of_hire)}</div>
                      {employeeData.id_number && <div className="flex items-center gap-2 text-slate-500"><Shield className="w-4 h-4" />ID: {employeeData.id_number}</div>}
                    </div>
                  </div>

                  {/* Stats */}
                  {employeeStats && (
                    <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
                      {[
                        { label: 'Records', value: employeeStats.total, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                        { label: 'Present', value: employeeStats.present, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                        { label: 'Absent', value: employeeStats.absent, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
                        { label: 'Late', value: employeeStats.late, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                        { label: 'Hours', value: `${employeeStats.totalHours}h`, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                        { label: 'Overtime', value: `${employeeStats.overtimeHours}h`, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
                        { label: 'Rate', value: `${employeeStats.attendanceRate}%`, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                      ].map(s => (
                        <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-[10px] text-slate-500">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attendance Table */}
                  <div className="neu-raised rounded-3xl overflow-hidden">
                    <h3 className="text-lg font-semibold p-4 pb-0 text-slate-800 dark:text-white">Attendance History ({employeeAttendance.length})</h3>
                    <div className="overflow-x-auto p-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-700/50">
                            <th className="text-left py-3 px-3 text-xs text-slate-500">Date</th>
                            <th className="text-left py-3 px-3 text-xs text-slate-500">Clock In</th>
                            <th className="text-left py-3 px-3 text-xs text-slate-500">Clock Out</th>
                            <th className="text-left py-3 px-3 text-xs text-slate-500">Hours</th>
                            <th className="text-left py-3 px-3 text-xs text-slate-500">Status</th>
                            <th className="text-left py-3 px-3 text-xs text-slate-500">Method</th>
                            <th className="text-left py-3 px-3 text-xs text-slate-500">GPS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeeAttendance.map(r => (
                            <tr key={r.id} className="border-t border-slate-100 dark:border-slate-700/30">
                              <td className="py-2 px-3 text-xs font-medium">{formatDate(r.attendance_date)}</td>
                              <td className="py-2 px-3 text-xs">{formatTime(r.clock_in_time)}</td>
                              <td className="py-2 px-3 text-xs">{formatTime(r.clock_out_time)}</td>
                              <td className="py-2 px-3 text-xs font-medium">{r.total_hours?.toFixed(1) || '-'}h</td>
                              <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.status === 'present' ? 'bg-emerald-100 text-emerald-700' : r.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span></td>
                              <td className="py-2 px-3 text-xs capitalize">{r.check_in_method?.replace(/_/g, ' ') || '-'}</td>
                              <td className="py-2 px-3 text-xs">{r.check_in_latitude ? <MapPin className="w-3 h-3 text-emerald-500 inline" /> : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Shifts */}
                  {employeeShifts.length > 0 && (
                    <div className="neu-raised rounded-3xl p-4">
                      <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-white">Active Shifts ({employeeShifts.length})</h3>
                      <div className="space-y-2">
                        {employeeShifts.map(s => (
                          <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 text-sm">
                            <div><span className="font-medium">{s.shift_templates?.shift_name}</span><span className="text-xs text-slate-500 ml-2">{s.shift_templates?.start_time?.slice(0,5)} - {s.shift_templates?.end_time?.slice(0,5)}</span></div>
                            <span className="text-xs text-slate-500">Since {formatDate(s.effective_date)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="neu-raised rounded-3xl p-8 text-center">
                  <User className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Employee not found</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
