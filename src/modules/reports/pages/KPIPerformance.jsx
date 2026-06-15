import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Target, Download, ArrowLeft, Sun, Moon, Sparkles, 
  Users, User, TrendingUp, Search, Eye
} from 'lucide-react'

export default function KPIPerformance() {
  const { isDark, toggleTheme } = useThemeStore()
  const [employees, setEmployees] = useState([])
  const [kpiData, setKpiData] = useState({})
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [viewMode, setViewMode] = useState('group') // 'group' or 'individual'
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: emps } = await supabase
        .from('employees')
        .select('*')
        .eq('employment_status', 'active')
        .order('first_name')

      setEmployees(emps || [])

      // Load KPI data for each employee
      const kpis = {}
      for (const emp of (emps || [])) {
        // Get attendance rate
        const { data: attendance } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('employee_id', emp.id)
          .gte('attendance_date', new Date().getFullYear() + '-01-01')

        const presentDays = attendance?.filter(a => a.status === 'present').length || 0
        const totalDays = attendance?.length || 1
        const attendanceRate = Math.round((presentDays / totalDays) * 100)

        // Get completed jobs
        const { data: assignments } = await supabase
          .from('job_assignments')
          .select('*, jobs(status)')
          .eq('employee_id', emp.id)

        const completedJobs = assignments?.filter(a => a.jobs?.status === 'completed').length || 0
        const totalJobs = assignments?.length || 1

        // Get hours worked
        const totalHours = attendance?.reduce((s, a) => s + (a.total_hours || 0), 0) || 0

        kpis[emp.id] = {
          employee: emp,
          attendanceRate,
          completedJobs,
          totalJobs,
          jobCompletionRate: Math.round((completedJobs / totalJobs) * 100),
          totalHours,
          presentDays,
          totalDays: attendance?.length || 0
        }
      }
      setKpiData(kpis)
    } catch (error) {
      toast.error('Failed to load KPI data')
    }
    setLoading(false)
  }

  const formatPercent = (val) => `${val || 0}%`

  const filteredEmployees = employees.filter(emp => {
    if (!search) return true
    const s = search.toLowerCase()
    return (emp.first_name || '').toLowerCase().includes(s) ||
           (emp.last_name || '').toLowerCase().includes(s) ||
           (emp.employee_code || '').toLowerCase().includes(s) ||
           (emp.department || '').toLowerCase().includes(s)
  })

  // Group averages
  const groupAvg = {
    attendanceRate: employees.length > 0 ? Math.round(Object.values(kpiData).reduce((s, k) => s + (k.attendanceRate || 0), 0) / employees.length) : 0,
    jobCompletionRate: employees.length > 0 ? Math.round(Object.values(kpiData).reduce((s, k) => s + (k.jobCompletionRate || 0), 0) / employees.length) : 0,
    totalHours: Object.values(kpiData).reduce((s, k) => s + (k.totalHours || 0), 0)
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-600'
    if (score >= 70) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreBg = (score) => {
    if (score >= 90) return 'bg-emerald-500'
    if (score >= 70) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const handleExportCSV = () => {
    const csv = 'Employee,Code,Department,Attendance Rate,Job Completion,Hours Worked\n' +
      filteredEmployees.map(emp => {
        const kpi = kpiData[emp.id] || {}
        return `${emp.first_name} ${emp.last_name},${emp.employee_code},${emp.department || 'N/A'},${kpi.attendanceRate || 0}%,${kpi.jobCompletionRate || 0}%,${kpi.totalHours || 0}`
      }).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'KPI_Report.csv'; a.click()
    toast.success('KPI report downloaded!')
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
        <Link to="/reports" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Reports</span>
        </Link>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-red-600" />KPI Performance
          </h1>
          <div className="flex gap-2">
            <button onClick={() => setViewMode('group')} className={`px-4 py-2 rounded-xl text-sm font-medium ${viewMode === 'group' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
              <Users className="w-4 h-4 inline mr-1" />Group View
            </button>
            <button onClick={() => setViewMode('individual')} className={`px-4 py-2 rounded-xl text-sm font-medium ${viewMode === 'individual' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
              <User className="w-4 h-4 inline mr-1" />Individual View
            </button>
            <button onClick={handleExportCSV} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm flex items-center gap-1">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div></div>
        ) : (
          <>
            {/* Group View */}
            {viewMode === 'group' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {[
                    { label: 'Avg Attendance', value: formatPercent(groupAvg.attendanceRate), color: getScoreColor(groupAvg.attendanceRate) },
                    { label: 'Avg Job Completion', value: formatPercent(groupAvg.jobCompletionRate), color: getScoreColor(groupAvg.jobCompletionRate) },
                    { label: 'Total Hours Worked', value: `${groupAvg.totalHours.toFixed(0)} hrs`, color: 'text-blue-600' },
                  ].map(s => (
                    <div key={s.label} className="neu-raised rounded-2xl p-6 text-center">
                      <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-sm text-slate-500 mt-2">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Department Breakdown */}
                <div className="neu-raised rounded-3xl p-6 mb-8">
                  <h2 className="text-xl font-semibold mb-4">Performance by Department</h2>
                  <div className="space-y-4">
                    {['Cleaning', 'Operations', 'Administration', 'Sales'].map(dept => {
                      const deptEmps = employees.filter(e => e.department === dept)
                      const avgAtt = deptEmps.length > 0 ? Math.round(deptEmps.reduce((s, e) => s + (kpiData[e.id]?.attendanceRate || 0), 0) / deptEmps.length) : 0
                      const avgJob = deptEmps.length > 0 ? Math.round(deptEmps.reduce((s, e) => s + (kpiData[e.id]?.jobCompletionRate || 0), 0) / deptEmps.length) : 0
                      return deptEmps.length > 0 ? (
                        <div key={dept} className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold">{dept}</span>
                            <span className="text-sm text-slate-500">{deptEmps.length} employees</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="flex justify-between text-xs mb-1"><span>Attendance</span><span className={getScoreColor(avgAtt)}>{formatPercent(avgAtt)}</span></div>
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${getScoreBg(avgAtt)}`} style={{ width: `${avgAtt}%` }}></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs mb-1"><span>Job Completion</span><span className={getScoreColor(avgJob)}>{formatPercent(avgJob)}</span></div>
                              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${getScoreBg(avgJob)}`} style={{ width: `${avgJob}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Individual View */}
            {viewMode === 'individual' && (
              <>
                <div className="neu-raised rounded-2xl p-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..."
                      className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredEmployees.map(emp => {
                    const kpi = kpiData[emp.id] || {}
                    return (
                      <motion.div key={emp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="neu-raised rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all"
                        onClick={() => setSelectedEmployee(selectedEmployee?.id === emp.id ? null : emp)}>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <span className="text-emerald-600 font-bold">{emp.first_name?.[0]}{emp.last_name?.[0]}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold">{emp.first_name} {emp.last_name}</h3>
                            <p className="text-xs text-slate-500">{emp.employee_code} · {emp.department || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span>Attendance</span><span className={getScoreColor(kpi.attendanceRate)}>{formatPercent(kpi.attendanceRate)}</span></div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${getScoreBg(kpi.attendanceRate)}`} style={{ width: `${kpi.attendanceRate || 0}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-1"><span>Job Completion</span><span className={getScoreColor(kpi.jobCompletionRate)}>{formatPercent(kpi.jobCompletionRate)}</span></div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${getScoreBg(kpi.jobCompletionRate)}`} style={{ width: `${kpi.jobCompletionRate || 0}%` }}></div>
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 pt-2 border-t">
                            <span>Hours: {kpi.totalHours?.toFixed(0) || 0}</span>
                            <span>Jobs: {kpi.completedJobs || 0}/{kpi.totalJobs || 0}</span>
                            <span>Days: {kpi.presentDays || 0}/{kpi.totalDays || 0}</span>
                          </div>
                        </div>

                        {/* Expanded Detail */}
                        {selectedEmployee?.id === emp.id && (
                          <div className="mt-4 pt-4 border-t space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2 bg-slate-50 rounded-lg text-center">
                                <p className="font-bold text-lg text-emerald-600">{kpi.attendanceRate}%</p>
                                <p className="text-slate-500">Attendance</p>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg text-center">
                                <p className="font-bold text-lg text-blue-600">{kpi.jobCompletionRate}%</p>
                                <p className="text-slate-500">Job Rate</p>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg text-center">
                                <p className="font-bold text-lg text-purple-600">{kpi.totalHours?.toFixed(0)}</p>
                                <p className="text-slate-500">Hours</p>
                              </div>
                              <div className="p-2 bg-slate-50 rounded-lg text-center">
                                <p className="font-bold text-lg text-amber-600">{kpi.completedJobs}</p>
                                <p className="text-slate-500">Done</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
