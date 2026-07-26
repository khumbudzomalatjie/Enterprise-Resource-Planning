import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useAttendanceStore from '../store/attendanceStore'
import useThemeStore from '../../../../store/themeStore'
import { supabase } from '../../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  BarChart3, TrendingUp, Users, Clock, Calendar,
  Download, Printer, FileText, ChevronRight, ArrowLeft,
  Sun, Moon, Sparkles, UserCheck, UserX, AlertTriangle,
  Filter, Search
} from 'lucide-react'

export default function AttendanceReports() {
  const { isDark, toggleTheme } = useThemeStore()
  const [reportType, setReportType] = useState('daily')
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [department, setDepartment] = useState('all')

  useEffect(() => {
    generateReport()
  }, [reportType])

  const generateReport = async () => {
    setLoading(true)
    try {
      let query = supabase.from('attendance_records').select('*, employees(first_name, last_name, employee_code, department)')

      if (reportType === 'daily') {
        query = query.eq('attendance_date', dateFrom)
      } else if (reportType === 'weekly') {
        query = query.gte('attendance_date', dateFrom).lte('attendance_date', dateTo)
      } else if (reportType === 'monthly') {
        const start = new Date(dateFrom).toISOString().split('T')[0].substring(0, 7) + '-01'
        const end = dateTo || dateFrom
        query = query.gte('attendance_date', start).lte('attendance_date', end)
      }

      if (department !== 'all') {
        query = query.eq('employees.department', department)
      }

      const { data, error } = await query.order('attendance_date', { ascending: false }).limit(500)
      
      if (error) throw error

      // Calculate summary
      const summary = {
        total: data?.length || 0,
        present: data?.filter(r => r.status === 'present').length || 0,
        absent: data?.filter(r => r.status === 'absent').length || 0,
        late: data?.filter(r => r.is_late).length || 0,
        onLeave: data?.filter(r => r.status === 'on_leave').length || 0,
        totalHours: data?.reduce((sum, r) => sum + (r.total_hours || 0), 0)?.toFixed(1) || 0,
        avgHours: data?.length > 0 ? (data.reduce((sum, r) => sum + (r.total_hours || 0), 0) / data.filter(r => r.total_hours).length).toFixed(1) : 0,
      }

      // Department breakdown
      const deptBreakdown = {}
      data?.forEach(r => {
        const dept = r.employees?.department || 'Unknown'
        if (!deptBreakdown[dept]) deptBreakdown[dept] = { total: 0, present: 0, absent: 0, late: 0 }
        deptBreakdown[dept].total++
        if (r.status === 'present') deptBreakdown[dept].present++
        if (r.status === 'absent') deptBreakdown[dept].absent++
        if (r.is_late) deptBreakdown[dept].late++
      })

      setReportData({ records: data || [], summary, deptBreakdown })
    } catch (err) {
      console.error('Report error:', err)
      toast.error('Failed to generate report')
    }
    setLoading(false)
  }

  const handleExportCSV = () => {
    if (!reportData?.records?.length) return
    const headers = 'Employee,Code,Department,Date,Clock In,Clock Out,Total Hours,Status,Method\n'
    const rows = reportData.records.map(r => 
      `${r.employees?.first_name} ${r.employees?.last_name},${r.employees?.employee_code},${r.employees?.department || ''},${r.attendance_date},${r.clock_in_time || ''},${r.clock_out_time || ''},${r.total_hours || 0},${r.status},${r.check_in_method || ''}`
    ).join('\n')
    
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-report-${dateFrom}.csv`
    a.click()
    toast.success('Report downloaded!')
  }

  const handlePrint = () => window.print()

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : '-'

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
          <span className="text-slate-800 dark:text-white font-medium">Reports</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-emerald-600" />Attendance Reports
          </h1>
          <p className="text-slate-500 mt-1">Generate and export attendance reports</p>
        </motion.div>

        {/* Filters */}
        <div className="neu-raised rounded-3xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Report Type</label>
              <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full p-3 neu-inset rounded-xl text-sm">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">From Date</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full p-3 neu-inset rounded-xl text-sm" />
            </div>
            {reportType !== 'daily' && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">To Date</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full p-3 neu-inset rounded-xl text-sm" />
              </div>
            )}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Department</label>
              <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-3 neu-inset rounded-xl text-sm">
                <option value="all">All Departments</option>
                <option value="Operations">Operations</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Administration">Administration</option>
                <option value="Sales">Sales</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={generateReport} disabled={loading} className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm flex-1">
                {loading ? 'Loading...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {reportData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon: Users, label: 'Total Records', value: reportData.summary.total, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
                { icon: UserCheck, label: 'Present', value: reportData.summary.present, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
                { icon: UserX, label: 'Absent', value: reportData.summary.absent, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
                { icon: Clock, label: 'Total Hours', value: `${reportData.summary.totalHours}h`, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
                { icon: AlertTriangle, label: 'Late', value: reportData.summary.late, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
                { icon: TrendingUp, label: 'Avg Hours', value: `${reportData.summary.avgHours}h`, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="neu-raised rounded-2xl p-4 text-center">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Department Breakdown */}
            {Object.keys(reportData.deptBreakdown).length > 0 && (
              <div className="neu-raised rounded-3xl p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4">Department Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(reportData.deptBreakdown).map(([dept, data]) => (
                    <div key={dept} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                      <p className="font-semibold text-sm">{dept}</p>
                      <p className="text-xs text-slate-500">Total: {data.total} | Present: {data.present} | Absent: {data.absent} | Late: {data.late}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="flex gap-2 mb-4">
              <button onClick={handleExportCSV} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white text-sm flex items-center gap-1">
                <Download className="w-4 h-4" /> Export CSV
              </button>
              <button onClick={handlePrint} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white text-sm flex items-center gap-1">
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>

            <div className="neu-raised rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50">
                      <th className="text-left py-3 px-3 text-xs text-slate-500">Employee</th>
                      <th className="text-left py-3 px-3 text-xs text-slate-500">Code</th>
                      <th className="text-left py-3 px-3 text-xs text-slate-500 hidden md:table-cell">Dept</th>
                      <th className="text-left py-3 px-3 text-xs text-slate-500">Date</th>
                      <th className="text-left py-3 px-3 text-xs text-slate-500">Clock In</th>
                      <th className="text-left py-3 px-3 text-xs text-slate-500">Clock Out</th>
                      <th className="text-left py-3 px-3 text-xs text-slate-500">Hours</th>
                      <th className="text-left py-3 px-3 text-xs text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.records.map((r, i) => (
                      <tr key={r.id || i} className="border-t border-slate-100 dark:border-slate-700/30">
                        <td className="py-2 px-3 font-medium">{r.employees?.first_name} {r.employees?.last_name}</td>
                        <td className="py-2 px-3 text-xs">{r.employees?.employee_code}</td>
                        <td className="py-2 px-3 text-xs hidden md:table-cell">{r.employees?.department || '-'}</td>
                        <td className="py-2 px-3 text-xs">{formatDate(r.attendance_date)}</td>
                        <td className="py-2 px-3 text-xs">{formatTime(r.clock_in_time)}</td>
                        <td className="py-2 px-3 text-xs">{formatTime(r.clock_out_time)}</td>
                        <td className="py-2 px-3 text-xs font-medium">{r.total_hours?.toFixed(1) || '-'}h</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${r.status === 'present' ? 'bg-emerald-100 text-emerald-700' : r.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reportData.records.length === 0 && (
                <div className="text-center py-12"><BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-2" /><p className="text-slate-500">No records found for this period</p></div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
