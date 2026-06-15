import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { Users, Download, ArrowLeft, Sun, Moon, Sparkles, TrendingUp } from 'lucide-react'

export default function HRReports() {
  const { isDark, toggleTheme } = useThemeStore()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadReport = async () => {
    setLoading(true)
    try {
      const { data: employees } = await supabase.from('employees').select('*')
      const { data: attendance } = await supabase.from('attendance_records').select('*').gte('attendance_date', new Date().toISOString().split('T')[0])

      const deptCounts = {}
      const statusCounts = {}
      employees?.forEach(emp => {
        deptCounts[emp.department || 'Unassigned'] = (deptCounts[emp.department || 'Unassigned'] || 0) + 1
        statusCounts[emp.employment_status] = (statusCounts[emp.employment_status] || 0) + 1
      })

      setReport({
        totalEmployees: employees?.length || 0,
        activeEmployees: employees?.filter(e => e.employment_status === 'active').length || 0,
        onLeave: employees?.filter(e => e.employment_status === 'on_leave').length || 0,
        attendanceRate: employees?.length > 0 ? Math.round((attendance?.filter(a => a.status === 'present').length / employees.length) * 100) : 0,
        departmentBreakdown: Object.entries(deptCounts).map(([d, c]) => ({ department: d, count: c })),
        statusBreakdown: Object.entries(statusCounts).map(([s, c]) => ({ status: s, count: c })),
        recentHires: employees?.sort((a, b) => new Date(b.date_of_hire) - new Date(a.date_of_hire)).slice(0, 5) || []
      })
    } catch (error) { toast.error('Failed to load report') }
    setLoading(false)
  }

  useEffect(() => { loadReport() }, [])

  const handleExportCSV = () => {
    if (!report) return
    const csv = 'Department,Count\n' + report.departmentBreakdown.map(d => `${d.department},${d.count}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'HR_Report.csv'; a.click()
    toast.success('Report downloaded!')
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

        <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-amber-600" />HR Report
        </h1>

        <div className="neu-raised rounded-2xl p-4 mb-6 flex items-center gap-4">
          <button onClick={loadReport} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm">Refresh Data</button>
          {report && <button onClick={handleExportCSV} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm flex items-center gap-1"><Download className="w-4 h-4" /> CSV</button>}
        </div>

        {loading && <div className="text-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mx-auto"></div></div>}

        {report && !loading && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Employees', value: report.totalEmployees, color: 'text-blue-600' },
                { label: 'Active', value: report.activeEmployees, color: 'text-emerald-600' },
                { label: 'On Leave', value: report.onLeave, color: 'text-amber-600' },
                { label: 'Attendance Rate', value: `${report.attendanceRate}%`, color: 'text-purple-600' },
              ].map(s => (
                <div key={s.label} className="neu-raised rounded-2xl p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-semibold mb-4">By Department</h2>
                {report.departmentBreakdown.map((d, i) => {
                  const maxCount = Math.max(...report.departmentBreakdown.map(x => x.count), 1)
                  const colors = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#6366f1']
                  return (
                    <div key={d.department} className="mb-3">
                      <div className="flex justify-between text-sm mb-1"><span>{d.department}</span><span className="font-bold">{d.count}</span></div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(d.count/maxCount)*100}%`, backgroundColor: colors[i%colors.length] }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-semibold mb-4">By Status</h2>
                {report.statusBreakdown.map((s, i) => {
                  const maxCount = Math.max(...report.statusBreakdown.map(x => x.count), 1)
                  return (
                    <div key={s.status} className="mb-3">
                      <div className="flex justify-between text-sm mb-1"><span className="capitalize">{s.status?.replace('_',' ')}</span><span className="font-bold">{s.count}</span></div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.status === 'active' ? 'bg-emerald-500' : s.status === 'on_leave' ? 'bg-amber-500' : 'bg-slate-500'}`} style={{ width: `${(s.count/maxCount)*100}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
