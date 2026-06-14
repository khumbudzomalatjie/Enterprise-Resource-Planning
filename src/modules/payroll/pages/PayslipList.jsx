import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import html2pdf from 'html2pdf.js'
import toast from 'react-hot-toast'
import { 
  Search, FileText, Download, Eye, ChevronRight,
  ArrowLeft, Sun, Moon, Sparkles, Printer, RefreshCw
} from 'lucide-react'

export default function PayslipList() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => { loadPayslips() }, [])

  const loadPayslips = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payslips')
        .select('*, employees(first_name, last_name, employee_code), payroll_runs(period_start, period_end, run_number)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error loading payslips:', error)
        toast.error('Failed to load payslips')
      } else {
        console.log('Payslips loaded:', data?.length || 0)
        setPayslips(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const handleDownloadSingle = async (payslip) => {
    setDownloadingId(payslip.id)
    try {
      const element = document.getElementById(`payslip-mini-${payslip.id}`)
      if (!element) { toast.error('Preview not found'); return }

      const opt = {
        margin: [5, 5, 5, 5],
        filename: `Payslip_${payslip.payslip_number}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }

      await html2pdf().set(opt).from(element).save()
      toast.success('Payslip downloaded! 📄')
    } catch (error) {
      toast.error('Failed to download')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleExportAllCSV = () => {
    if (payslips.length === 0) { toast.error('No payslips to export'); return }
    
    const csvContent = [
      'Payslip #,Employee,Employee Code,Period,Gross,Deductions,Net,Status',
      ...payslips.map(p => 
        `"${p.payslip_number}","${p.employees?.first_name || ''} ${p.employees?.last_name || ''}","${p.employees?.employee_code || ''}","${p.payroll_runs?.period_start || ''} to ${p.payroll_runs?.period_end || ''}",${p.total_earnings || 0},${p.total_deductions || 0},${p.net_salary || 0},${p.status || ''}`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Payslips_Export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    toast.success('CSV exported! 📥')
  }

  const handleExportAllExcel = () => {
    if (payslips.length === 0) { toast.error('No payslips to export'); return }

    const csvContent = [
      'Payslip #,Employee,Employee Code,Period,Gross,Deductions,Net,Status',
      ...payslips.map(p => 
        `"${p.payslip_number}","${p.employees?.first_name || ''} ${p.employees?.last_name || ''}","${p.employees?.employee_code || ''}","${p.payroll_runs?.period_start || ''} to ${p.payroll_runs?.period_end || ''}",${p.total_earnings || 0},${p.total_deductions || 0},${p.net_salary || 0},${p.status || ''}`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Payslips_Export_${new Date().toISOString().split('T')[0]}.xls`
    a.click()
    toast.success('Excel exported! 📊')
  }

  const filteredPayslips = payslips.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return (p.payslip_number || '').toLowerCase().includes(s) ||
           (p.employees?.first_name || '').toLowerCase().includes(s) ||
           (p.employees?.last_name || '').toLowerCase().includes(s) ||
           (p.employees?.employee_code || '').toLowerCase().includes(s)
  })

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
          <Link to="/payroll" className="text-slate-500 hover:text-emerald-600">Payroll</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="font-medium">Payslips</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-emerald-600" />Payslips
            </h1>
            <p className="text-slate-500 mt-1">{payslips.length} payslips generated</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadPayslips} className="px-4 py-2 bg-slate-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-slate-700">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={handleExportAllCSV} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              Export CSV
            </button>
            <button onClick={handleExportAllExcel} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
              Export Excel
            </button>
          </div>
        </motion.div>

        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by payslip number, employee name or code..."
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading payslips...</p>
          </div>
        ) : filteredPayslips.length === 0 ? (
          <div className="neu-raised rounded-3xl p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg mb-2">No payslips found</p>
            <p className="text-slate-400 text-sm mb-4">Run payroll to generate payslips</p>
            <button onClick={() => navigate('/payroll/run')} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium">
              Run Payroll
            </button>
          </div>
        ) : (
          <div className="neu-raised rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-700/30">
                    <th className="text-left py-3 px-4">Payslip #</th>
                    <th className="text-left py-3 px-4">Employee</th>
                    <th className="text-left py-3 px-4">Code</th>
                    <th className="text-left py-3 px-4">Period</th>
                    <th className="text-right py-3 px-4">Gross</th>
                    <th className="text-right py-3 px-4">Deductions</th>
                    <th className="text-right py-3 px-4">Net Pay</th>
                    <th className="text-center py-3 px-4">Status</th>
                    <th className="text-center py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayslips.map(p => (
                    <tr key={p.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-700/20">
                      <td className="py-3 px-4 font-mono text-xs">{p.payslip_number}</td>
                      <td className="py-3 px-4 font-medium">{p.employees?.first_name} {p.employees?.last_name}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{p.employees?.employee_code || 'N/A'}</td>
                      <td className="py-3 px-4 text-xs">
                        {p.payroll_runs?.period_start ? `${p.payroll_runs.period_start} - ${p.payroll_runs.period_end}` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">{formatCurrency(p.total_earnings)}</td>
                      <td className="py-3 px-4 text-right text-red-600">-{formatCurrency(p.total_deductions)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatCurrency(p.net_salary)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${p.status === 'paid' || p.status === 'finalized' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {p.status || 'draft'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => navigate(`/payroll/payslips/${p.id}`)} className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDownloadSingle(p)} disabled={downloadingId === p.id}
                            className="p-1.5 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600" title="Download PDF">
                            {downloadingId === p.id ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div> : <Download className="w-4 h-4" />}
                          </button>
                          <button onClick={() => window.print()} className="p-1.5 rounded-lg hover:bg-purple-100 text-slate-400 hover:text-purple-600" title="Print">
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Hidden mini payslips for PDF download */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {payslips.map(p => (
          <div key={p.id} id={`payslip-mini-${p.id}`} className="bg-white p-6" style={{ width: '210mm', minHeight: '150mm' }}>
            <div className="border-b-2 border-blue-600 pb-3 mb-4">
              <h2 className="text-xl font-bold text-blue-800">NDANDULENI GROUP</h2>
              <p className="text-sm font-bold">PAYSLIP</p>
              <p className="text-xs">#{p.payslip_number}</p>
            </div>
            <div className="mb-4">
              <p className="font-bold">{p.employees?.first_name} {p.employees?.last_name}</p>
              <p className="text-xs">Employee Code: {p.employees?.employee_code}</p>
              <p className="text-xs">Period: {p.payroll_runs?.period_start} to {p.payroll_runs?.period_end}</p>
            </div>
            <table className="w-full text-sm mb-4">
              <thead><tr className="bg-gray-100"><th className="text-left p-1">Description</th><th className="text-right p-1">Amount</th></tr></thead>
              <tbody>
                <tr><td className="p-1">Basic Salary</td><td className="text-right p-1">{formatCurrency(p.basic_salary)}</td></tr>
                <tr className="font-bold bg-green-50"><td className="p-1">Total Earnings</td><td className="text-right p-1">{formatCurrency(p.total_earnings)}</td></tr>
                <tr><td className="p-1 text-red-600">PAYE Tax</td><td className="text-right p-1 text-red-600">-{formatCurrency(p.paye_tax)}</td></tr>
                <tr><td className="p-1 text-red-600">UIF</td><td className="text-right p-1 text-red-600">-{formatCurrency(p.uif_contribution)}</td></tr>
                <tr className="font-bold bg-red-50"><td className="p-1">Total Deductions</td><td className="text-right p-1 text-red-600">-{formatCurrency(p.total_deductions)}</td></tr>
              </tbody>
            </table>
            <div className="bg-blue-600 text-white p-3 rounded flex justify-between font-bold text-lg">
              <span>NET SALARY</span>
              <span>{formatCurrency(p.net_salary)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
