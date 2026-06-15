import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { Briefcase, Download, Calendar, ArrowLeft, Sun, Moon, Sparkles, CheckCircle2, Clock } from 'lucide-react'

export default function OperationsReports() {
  const { isDark, toggleTheme } = useThemeStore()
  const [dateFrom, setDateFrom] = useState(new Date().getFullYear() + '-01-01')
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const loadReport = async () => {
    setLoading(true)
    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('*, job_categories(name), clients(company_name)')
        .gte('scheduled_date', dateFrom)
        .lte('scheduled_date', dateTo)
        .order('scheduled_date', { ascending: false })

      const statusCounts = {}
      const categoryCounts = {}
      const priorityCounts = {}
      
      jobs?.forEach(job => {
        statusCounts[job.status] = (statusCounts[job.status] || 0) + 1
        categoryCounts[job.job_categories?.name || 'Other'] = (categoryCounts[job.job_categories?.name || 'Other'] || 0) + 1
        priorityCounts[job.priority] = (priorityCounts[job.priority] || 0) + 1
      })

      setReport({
        totalJobs: jobs?.length || 0,
        completedJobs: jobs?.filter(j => j.status === 'completed').length || 0,
        inProgressJobs: jobs?.filter(j => j.status === 'in_progress').length || 0,
        completionRate: jobs?.length > 0 ? Math.round((jobs.filter(j => j.status === 'completed').length / jobs.length) * 100) : 0,
        totalValue: jobs?.reduce((s, j) => s + (j.quoted_amount || j.actual_cost || 0), 0) || 0,
        statusBreakdown: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
        categoryBreakdown: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })),
        priorityBreakdown: Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count })),
        recentJobs: jobs?.slice(0, 10) || []
      })
    } catch (error) { toast.error('Failed to load report') }
    setLoading(false)
  }

  useEffect(() => { loadReport() }, [])

  const handleExportCSV = () => {
    if (!report) return
    const csv = 'Category,Count\n' + report.categoryBreakdown.map(c => `${c.category},${c.count}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'Operations_Report.csv'; a.click()
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
          <Briefcase className="w-8 h-8 text-emerald-600" />Operations Report
        </h1>

        <div className="neu-raised rounded-2xl p-4 mb-6 flex items-center gap-4 flex-wrap">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="p-2 neu-inset rounded-lg text-sm" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="p-2 neu-inset rounded-lg text-sm" />
          <button onClick={loadReport} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm">Generate</button>
          {report && <button onClick={handleExportCSV} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm flex items-center gap-1"><Download className="w-4 h-4" /> CSV</button>}
        </div>

        {loading && <div className="text-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div></div>}

        {report && !loading && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Total Jobs', value: report.totalJobs },
                { label: 'Completed', value: report.completedJobs },
                { label: 'In Progress', value: report.inProgressJobs },
                { label: 'Completion Rate', value: `${report.completionRate}%` },
                { label: 'Total Value', value: formatCurrency(report.totalValue) },
              ].map(s => (
                <div key={s.label} className="neu-raised rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-semibold mb-4">Jobs by Category</h2>
                {report.categoryBreakdown.map((c, i) => {
                  const maxCount = Math.max(...report.categoryBreakdown.map(x => x.count), 1)
                  const colors = ['#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444']
                  return (
                    <div key={c.category} className="mb-3">
                      <div className="flex justify-between text-sm mb-1"><span>{c.category}</span><span className="font-bold">{c.count}</span></div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(c.count/maxCount)*100}%`, backgroundColor: colors[i%colors.length] }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-semibold mb-4">Jobs by Status</h2>
                {report.statusBreakdown.map((s, i) => {
                  const maxCount = Math.max(...report.statusBreakdown.map(x => x.count), 1)
                  return (
                    <div key={s.status} className="mb-3">
                      <div className="flex justify-between text-sm mb-1"><span className="capitalize">{s.status?.replace('_',' ')}</span><span className="font-bold">{s.count}</span></div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.status === 'completed' ? 'bg-emerald-500' : s.status === 'in_progress' ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${(s.count/maxCount)*100}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Jobs</h2>
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-slate-50"><th className="text-left py-2 px-3">Job #</th><th className="text-left py-2 px-3">Title</th><th className="text-left py-2 px-3">Client</th><th className="text-left py-2 px-3">Date</th><th className="text-center py-2 px-3">Status</th></tr></thead>
                <tbody>{report.recentJobs.map(j => (
                  <tr key={j.id} className="border-b"><td className="py-2 px-3 font-mono text-xs">{j.job_number}</td><td className="py-2 px-3">{j.title}</td><td className="py-2 px-3 text-xs">{j.clients?.company_name || 'N/A'}</td><td className="py-2 px-3 text-xs">{j.scheduled_date}</td><td className="py-2 px-3 text-center"><span className={`px-2 py-1 rounded-full text-xs capitalize ${j.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{j.status?.replace('_',' ')}</span></td></tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
