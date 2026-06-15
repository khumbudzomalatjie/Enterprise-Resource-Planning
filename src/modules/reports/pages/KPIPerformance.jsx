import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import useAuthStore from '../../../store/authStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Target, Download, ArrowLeft, Sun, Moon, Sparkles, 
  Users, User, TrendingUp, Search, Eye, Shield,
  Briefcase, MapPin, ChevronDown, ChevronUp,
  Star, Award, AlertCircle
} from 'lucide-react'

export default function KPIPerformance() {
  const { isDark, toggleTheme } = useThemeStore()
  const { profile } = useAuthStore()
  const userRole = profile?.role
  const [employees, setEmployees] = useState([])
  const [kpiData, setKpiData] = useState({})
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [viewMode, setViewMode] = useState('group')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedDept, setExpandedDept] = useState(null)
  const [filterDept, setFilterDept] = useState('all')

  // Role-based access control
  const canViewAll = ['super_admin', 'operations_manager', 'hr_manager', 'finance_officer'].includes(userRole)
  const canViewDepartment = ['supervisor'].includes(userRole)
  const canViewOwn = ['cleaner'].includes(userRole)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      let query = supabase.from('employees').select('*').order('department').order('position').order('first_name')

      // Filter based on role
      if (canViewOwn && profile?.id) {
        // Cleaners can only see themselves
        const { data: emp } = await supabase.from('employees').select('*').eq('user_id', profile.user_id).single()
        setEmployees(emp ? [emp] : [])
      } else if (canViewDepartment && profile?.department) {
        // Supervisors can only see their department
        query = query.eq('department', profile.department)
        const { data } = await query
        setEmployees(data || [])
      } else if (canViewAll) {
        // Admins/Managers can see all
        const { data } = await query
        setEmployees(data || [])
      } else {
        setEmployees([])
        toast.error('You do not have access to view KPI data')
      }

      // Load KPI data for visible employees
      const visibleEmps = canViewAll ? (await supabase.from('employees').select('*').order('first_name')).data || [] :
                          canViewDepartment ? (await supabase.from('employees').select('*').eq('department', profile?.department)).data || [] :
                          canViewOwn && profile?.id ? (await supabase.from('employees').select('*').eq('user_id', profile.user_id)).data || [] : []

      const kpis = {}
      for (const emp of visibleEmps) {
        const { data: attendance } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('employee_id', emp.id)
          .gte('attendance_date', new Date().getFullYear() + '-01-01')

        const presentDays = attendance?.filter(a => a.status === 'present').length || 0
        const totalDays = attendance?.length || 1
        const attendanceRate = Math.round((presentDays / totalDays) * 100)

        const { data: assignments } = await supabase
          .from('job_assignments')
          .select('*, jobs(status)')
          .eq('employee_id', emp.id)

        const completedJobs = assignments?.filter(a => a.jobs?.status === 'completed').length || 0
        const totalJobs = assignments?.length || 1
        const totalHours = attendance?.reduce((s, a) => s + (a.total_hours || 0), 0) || 0

        kpis[emp.id] = {
          employee: emp,
          attendanceRate,
          completedJobs,
          totalJobs,
          jobCompletionRate: Math.round((completedJobs / totalJobs) * 100),
          totalHours: Math.round(totalHours),
          presentDays,
          totalDays: attendance?.length || 0,
          performanceScore: Math.round((attendanceRate + Math.round((completedJobs / totalJobs) * 100)) / 2)
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
    if (filterDept !== 'all' && emp.department !== filterDept) return false
    if (!search) return true
    const s = search.toLowerCase()
    return (emp.first_name || '').toLowerCase().includes(s) ||
           (emp.last_name || '').toLowerCase().includes(s) ||
           (emp.employee_code || '').toLowerCase().includes(s) ||
           (emp.position || '').toLowerCase().includes(s) ||
           (emp.department || '').toLowerCase().includes(s)
  })

  // Group by department and position
  const groupedByDept = {}
  filteredEmployees.forEach(emp => {
    const dept = emp.department || 'Unassigned'
    if (!groupedByDept[dept]) groupedByDept[dept] = []
    groupedByDept[dept].push(emp)
  })

  // Group by position
  const groupedByPosition = {}
  filteredEmployees.forEach(emp => {
    const pos = emp.position || 'No Position'
    if (!groupedByPosition[pos]) groupedByPosition[pos] = []
    groupedByPosition[pos].push(emp)
  })

  // Department averages
  const deptAverages = {}
  Object.entries(groupedByDept).forEach(([dept, emps]) => {
    const kpis = emps.map(e => kpiData[e.id]).filter(Boolean)
    deptAverages[dept] = {
      count: emps.length,
      avgAttendance: kpis.length > 0 ? Math.round(kpis.reduce((s, k) => s + (k.attendanceRate || 0), 0) / kpis.length) : 0,
      avgJobCompletion: kpis.length > 0 ? Math.round(kpis.reduce((s, k) => s + (k.jobCompletionRate || 0), 0) / kpis.length) : 0,
      avgPerformance: kpis.length > 0 ? Math.round(kpis.reduce((s, k) => s + (k.performanceScore || 0), 0) / kpis.length) : 0,
      totalHours: kpis.reduce((s, k) => s + (k.totalHours || 0), 0)
    }
  })

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))]

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

  const getPerformanceBadge = (score) => {
    if (score >= 95) return { icon: Star, label: 'Top Performer', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' }
    if (score >= 85) return { icon: Award, label: 'Excellent', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' }
    if (score >= 70) return { icon: TrendingUp, label: 'Good', color: 'bg-blue-100 text-blue-700 border-blue-300' }
    if (score >= 50) return { icon: AlertCircle, label: 'Needs Improvement', color: 'bg-amber-100 text-amber-700 border-amber-300' }
    return { icon: AlertCircle, label: 'Poor', color: 'bg-red-100 text-red-700 border-red-300' }
  }

  const handleExportCSV = () => {
    const csv = 'Employee,Code,Department,Position,Attendance Rate,Job Completion,Performance Score,Hours Worked\n' +
      filteredEmployees.map(emp => {
        const kpi = kpiData[emp.id] || {}
        return `"${emp.first_name} ${emp.last_name}","${emp.employee_code}","${emp.department || 'N/A'}","${emp.position || 'N/A'}",${kpi.attendanceRate || 0}%,${kpi.jobCompletionRate || 0}%,${kpi.performanceScore || 0}%,${kpi.totalHours || 0}`
      }).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'KPI_Performance_Report.csv'; a.click()
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Target className="w-8 h-8 text-red-600" />KPI Performance
            </h1>
            <p className="text-slate-500 mt-1">
              {canViewAll ? 'Viewing all employees' : canViewDepartment ? `Viewing ${profile?.department} department` : 'Viewing your performance'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setViewMode('group')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === 'group' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              <Users className="w-4 h-4 inline mr-1" />Department View
            </button>
            <button onClick={() => setViewMode('position')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === 'position' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              <Briefcase className="w-4 h-4 inline mr-1" />Position View
            </button>
            <button onClick={() => setViewMode('individual')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${viewMode === 'individual' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              <User className="w-4 h-4 inline mr-1" />Individual View
            </button>
            <button onClick={handleExportCSV} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm flex items-center gap-1 hover:bg-green-700">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} 
              placeholder="Search by name, code, position, or department..." 
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
          </div>
          {canViewAll && (
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-sm">
              <option value="all">All Departments</option>
              {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          )}
          <button onClick={loadData} className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">Refresh</button>
        </div>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div></div>
        ) : (
          <>
            {/* GROUP VIEW - By Department */}
            {viewMode === 'group' && (
              <div className="space-y-4">
                {Object.entries(deptAverages).map(([dept, avg]) => (
                  <motion.div key={dept} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="neu-raised rounded-2xl overflow-hidden">
                    <div 
                      className="p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      onClick={() => setExpandedDept(expandedDept === dept ? null : dept)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{dept}</h3>
                            <p className="text-sm text-slate-500">{avg.count} employees</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="hidden md:flex items-center gap-6">
                            <div className="text-center">
                              <p className={`text-lg font-bold ${getScoreColor(avg.avgAttendance)}`}>{formatPercent(avg.avgAttendance)}</p>
                              <p className="text-[10px] text-slate-400">Attendance</p>
                            </div>
                            <div className="text-center">
                              <p className={`text-lg font-bold ${getScoreColor(avg.avgJobCompletion)}`}>{formatPercent(avg.avgJobCompletion)}</p>
                              <p className="text-[10px] text-slate-400">Jobs</p>
                            </div>
                            <div className="text-center">
                              <p className={`text-lg font-bold ${getScoreColor(avg.avgPerformance)}`}>{formatPercent(avg.avgPerformance)}</p>
                              <p className="text-[10px] text-slate-400">Overall</p>
                            </div>
                          </div>
                          {expandedDept === dept ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </div>
                      </div>

                      {/* Progress Bars */}
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1"><span>Attendance</span><span className={getScoreColor(avg.avgAttendance)}>{formatPercent(avg.avgAttendance)}</span></div>
                          <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${getScoreBg(avg.avgAttendance)}`} style={{ width: `${avg.avgAttendance}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1"><span>Job Completion</span><span className={getScoreColor(avg.avgJobCompletion)}>{formatPercent(avg.avgJobCompletion)}</span></div>
                          <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${getScoreBg(avg.avgJobCompletion)}`} style={{ width: `${avg.avgJobCompletion}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1"><span>Overall</span><span className={getScoreColor(avg.avgPerformance)}>{formatPercent(avg.avgPerformance)}</span></div>
                          <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${getScoreBg(avg.avgPerformance)}`} style={{ width: `${avg.avgPerformance}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Employee List */}
                    {expandedDept === dept && (
                      <div className="border-t border-slate-200 dark:border-slate-600 p-4 bg-slate-50 dark:bg-slate-800/30">
                        <div className="space-y-2">
                          {groupedByDept[dept]?.map(emp => {
                            const kpi = kpiData[emp.id] || {}
                            const badge = getPerformanceBadge(kpi.performanceScore)
                            const BadgeIcon = badge.icon
                            return (
                              <div key={emp.id} 
                                onClick={() => setSelectedEmployee(selectedEmployee?.id === emp.id ? null : emp)}
                                className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-xl cursor-pointer hover:shadow-sm transition-all">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <span className="text-emerald-600 font-bold text-sm">{emp.first_name?.[0]}{emp.last_name?.[0]}</span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                                    <p className="text-xs text-slate-500">{emp.employee_code} · {emp.position || 'No position'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-medium border ${badge.color} hidden sm:inline-flex items-center gap-1`}>
                                    <BadgeIcon className="w-3 h-3" />{badge.label}
                                  </span>
                                  <span className={`text-sm font-bold ${getScoreColor(kpi.performanceScore)}`}>
                                    {formatPercent(kpi.performanceScore)}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}

            {/* POSITION VIEW */}
            {viewMode === 'position' && (
              <div className="space-y-4">
                {Object.entries(groupedByPosition).map(([position, emps]) => {
                  const posKpis = emps.map(e => kpiData[e.id]).filter(Boolean)
                  const avgPerf = posKpis.length > 0 ? Math.round(posKpis.reduce((s, k) => s + (k.performanceScore || 0), 0) / posKpis.length) : 0
                  return (
                    <motion.div key={position} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      className="neu-raised rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{position}</h3>
                            <p className="text-sm text-slate-500">{emps.length} employees · {posKpis.length} with data</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-bold ${getScoreColor(avgPerf)}`}>{formatPercent(avgPerf)}</p>
                          <p className="text-[10px] text-slate-400">Avg Score</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {emps.map(emp => {
                          const kpi = kpiData[emp.id] || {}
                          const badge = getPerformanceBadge(kpi.performanceScore)
                          return (
                            <div key={emp.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg text-sm">
                              <span>{emp.first_name} {emp.last_name}</span>
                              <span className={`font-bold ${getScoreColor(kpi.performanceScore)}`}>{formatPercent(kpi.performanceScore)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* INDIVIDUAL VIEW */}
            {viewMode === 'individual' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map(emp => {
                  const kpi = kpiData[emp.id] || {}
                  const badge = getPerformanceBadge(kpi.performanceScore)
                  const BadgeIcon = badge.icon
                  const isExpanded = selectedEmployee?.id === emp.id
                  
                  return (
                    <motion.div key={emp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      className={`neu-raised rounded-2xl p-5 cursor-pointer transition-all ${isExpanded ? 'ring-2 ring-blue-500' : 'hover:scale-[1.02]'}`}
                      onClick={() => setSelectedEmployee(isExpanded ? null : emp)}>
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center relative">
                          <span className="text-emerald-600 font-bold">{emp.first_name?.[0]}{emp.last_name?.[0]}</span>
                          <span className="absolute -bottom-1 -right-1">
                            <Shield className={`w-4 h-4 ${canViewAll ? 'text-blue-500' : 'text-slate-400'}`} />
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{emp.first_name} {emp.last_name}</h3>
                          <div className="flex flex-wrap gap-1 text-xs text-slate-500">
                            <span>{emp.employee_code}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{emp.position || 'N/A'}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{emp.department || 'N/A'}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-medium border ${badge.color} flex items-center gap-1`}>
                          <BadgeIcon className="w-3 h-3" />{badge.label}
                        </span>
                      </div>

                      {/* KPI Bars */}
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Attendance</span>
                            <span className={getScoreColor(kpi.attendanceRate)}>{formatPercent(kpi.attendanceRate)}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${getScoreBg(kpi.attendanceRate)}`} style={{ width: `${kpi.attendanceRate || 0}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Job Completion</span>
                            <span className={getScoreColor(kpi.jobCompletionRate)}>{formatPercent(kpi.jobCompletionRate)}</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${getScoreBg(kpi.jobCompletionRate)}`} style={{ width: `${kpi.jobCompletionRate || 0}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Overall Performance</span>
                            <span className={getScoreColor(kpi.performanceScore)}>{formatPercent(kpi.performanceScore)}</span>
                          </div>
                          <div className="w-full h-3 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${getScoreBg(kpi.performanceScore)}`} style={{ width: `${kpi.performanceScore || 0}%` }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="flex justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 dark:border-slate-600">
                        <span>🕐 {kpi.totalHours || 0}h</span>
                        <span>✅ {kpi.completedJobs || 0}/{kpi.totalJobs || 0} jobs</span>
                        <span>📅 {kpi.presentDays || 0}/{kpi.totalDays || 0} days</span>
                      </div>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                          <h4 className="text-sm font-semibold mb-3">Detailed Performance</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center">
                              <p className="text-xl font-bold text-emerald-600">{formatPercent(kpi.attendanceRate)}</p>
                              <p className="text-slate-500 mt-1">Attendance Rate</p>
                              <p className="text-[10px] text-slate-400">{kpi.presentDays}/{kpi.totalDays} days present</p>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                              <p className="text-xl font-bold text-blue-600">{formatPercent(kpi.jobCompletionRate)}</p>
                              <p className="text-slate-500 mt-1">Job Completion</p>
                              <p className="text-[10px] text-slate-400">{kpi.completedJobs}/{kpi.totalJobs} jobs done</p>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
                              <p className="text-xl font-bold text-purple-600">{kpi.totalHours || 0}h</p>
                              <p className="text-slate-500 mt-1">Hours Worked</p>
                            </div>
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center">
                              <p className="text-xl font-bold text-amber-600">{formatPercent(kpi.performanceScore)}</p>
                              <p className="text-slate-500 mt-1">Overall Score</p>
                            </div>
                          </div>
                          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                            <p className="text-xs text-slate-500">
                              <strong>Position:</strong> {emp.position || 'N/A'} | <strong>Department:</strong> {emp.department || 'N/A'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              <strong>Access Level:</strong> {emp.employment_type?.replace('_', ' ') || 'N/A'} | <strong>Status:</strong> {emp.employment_status || 'N/A'}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })}
                {filteredEmployees.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">No employees found</p>
                    <p className="text-slate-400 text-sm">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            )}

            {/* Access Denied */}
            {!canViewAll && !canViewDepartment && !canViewOwn && (
              <div className="text-center py-16 neu-raised rounded-3xl">
                <Shield className="w-20 h-20 text-red-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-semibold">Access Restricted</p>
                <p className="text-slate-400 text-sm mt-2">You do not have permission to view KPI data.</p>
                <p className="text-slate-400 text-xs mt-1">Contact your administrator for access.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
