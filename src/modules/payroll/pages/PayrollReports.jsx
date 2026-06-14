import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  BarChart3, Download, FileText, ArrowLeft, Sun, Moon, Sparkles,
  TrendingUp, TrendingDown, DollarSign, Users, Calendar
} from 'lucide-react'

export default function PayrollReports() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [dateFrom, setDateFrom] = useState(new Date().getFullYear() + '-01-01')
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const generateReport = async (reportType) => {
    setLoading(true)
    try {
      let data = null

      switch (reportType) {
        case 'summary':
          const { data: runs } = await supabase.from('payroll_runs').select('*').gte('period_start', dateFrom).lte('period_end', dateTo)
          data = { type: 'Payroll Summary', runs: runs || [], totalRuns: runs?.length || 0, totalGross: runs?.reduce((s, r) => s + (r.total_gross || 0), 0) || 0, totalNet: runs?.reduce((s, r) => s + (r.total_net || 0), 0) || 0 }
          break
        case 'payslips':
          const { data: slips } = await supabase.from('payslips').select('*, employees(first_name, last_name)').gte('created_at', dateFrom).lte('created_at', dateTo)
          data = { type: 'Payslip Report', slips: slips || [], totalSlips: slips?.length || 0 }
          break
        case 'deductions':
          const { data: deduct } = await supabase.from('payslips').select('total_deductions, paye_tax, uif_contribution').gte('created_at', dateFrom).lte('created_at', dateTo)
          data = { type: 'Deduction Report', totalDeductions: deduct?.reduce((s, d) => s + (d.total_deductions || 0), 0) || 0, totalPAYE: deduct?.reduce((s, d) => s + (d.paye_tax || 0), 0) || 0, totalUIF: deduct?.reduce((s, d) => s + (d.uif_contribution || 0), 0) || 0 }
          break
      }

      setReportData(data)
    } catch (error) {
      toast.error('Failed to generate report')
    }
    setLoading(false)
  }

  const handleExportCSV = () => {
    if (!reportData) return
    let csv = ''
    if (reportData.type === 'Payroll Summary') {
      csv = 'Run #,Period,Employees,Gross,Net,Status\n' + reportData.runs.map(r => `${r.run_number},${r.period_start} to ${r.period_end},${r.total_employees},${r.total_gross},${r.total_net},${r.status}`).join('\n')
    } else if (reportData.type === 'Payslip Report') {
      csv = 'Payslip #,Employee,Gross,Deductions,Net,Status\n' + reportData.slips.map(s => `${s.payslip_number},${s.employees?.first_name} ${s.employees?.last_name},${s.total_earnings},${s.total_deductions},${s.net_salary},${s.status}`).join('\n')
    }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportData.type.replace(/\s/g, '_')}.csv`
    a.click()
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/payroll" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Payroll</span>
        </Link>

        <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-8">
          <BarChart3 className="w-8 h-8 text-emerald-600" />Payroll Reports
        </h1>

        {/* Date Range */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex items-center gap-4 flex-wrap">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <span className="text-sm">From:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="p-2 neu-inset rounded-lg text-sm" />
          <span className="text-sm">To:</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="p-2 neu-inset rounded-lg text-sm" />
        </div>

        {/* Report Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Payroll Summary', icon: TrendingUp, type: 'summary', color: 'bg-blue-600' },
            { label: 'Payslip Report', icon: FileText, type: 'payslips', color: 'bg-emerald-600' },
            { label: 'Deduction Report', icon: TrendingDown, type: 'deductions', color: 'bg-red-600' },
          ].map(report => (
            <button key={report.type} onClick={() => generateReport(report.type)}
              className={`${report.color} text-white rounded-2xl p-6 flex flex-col items-center gap-3 hover:scale-105 transition-transform`}>
              <report.icon className="w-10 h-10" />
              <span className="font-semibold text-lg">{report.label}</span>
            </button>
          ))}
        </div>

        {/* Report Results */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        )}

        {reportData && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{reportData.type}</h2>
              <button onClick={handleExportCSV} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm flex items-center gap-2">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>

            {reportData.type === 'Payroll Summary' && (
              <div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-slate-50 rounded-xl"><p className="text-2xl font-bold">{reportData.totalRuns}</p><p className="text-xs">Total Runs</p></div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl"><p className="text-2xl font-bold text-emerald-600">{formatCurrency(reportData.totalGross)}</p><p className="text-xs">Total Gross</p></div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl"><p className="text-2xl font-bold text-blue-600">{formatCurrency(reportData.totalNet)}</p><p className="text-xs">Total Net</p></div>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-slate-50"><th className="text-left py-2 px-3">Run #</th><th className="text-left py-2 px-3">Period</th><th className="text-right py-2 px-3">Employees</th><th className="text-right py-2 px-3">Gross</th><th className="text-right py-2 px-3">Net</th><th className="text-center py-2 px-3">Status</th></tr></thead>
                  <tbody>{reportData.runs.map(r => (
                    <tr key={r.id} className="border-b"><td className="py-2 px-3 font-mono text-xs">{r.run_number}</td><td className="py-2 px-3 text-xs">{r.period_start} to {r.period_end}</td><td className="py-2 px-3 text-right">{r.total_employees}</td><td className="py-2 px-3 text-right">{formatCurrency(r.total_gross)}</td><td className="py-2 px-3 text-right">{formatCurrency(r.total_net)}</td><td className="py-2 px-3 text-center"><span className={`px-2 py-1 rounded-full text-xs ${r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{r.status}</span></td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
