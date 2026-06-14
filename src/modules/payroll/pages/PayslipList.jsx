import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import usePayrollStore from '../store/payrollStore'
import useThemeStore from '../../../store/themeStore'
import html2pdf from 'html2pdf.js'
import toast from 'react-hot-toast'
import { 
  Search, FileText, Download, Eye, ChevronRight,
  ArrowLeft, Sun, Moon, Sparkles, Printer, Mail
} from 'lucide-react'

export default function PayslipList() {
  const { payslips, fetchPayslips, loading } = usePayrollStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => { fetchPayslips() }, [])

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
    const csvContent = [
      'Payslip #,Employee,Period,Gross,Deductions,Net,Status',
      ...payslips.map(p => 
        `${p.payslip_number},${p.employees?.first_name} ${p.employees?.last_name},${p.payroll_runs?.period_name || ''},${p.total_earnings},${p.total_deductions},${p.net_salary},${p.status}`
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
    const data = payslips.map(p => ({
      'Payslip #': p.payslip_number,
      'Employee': `${p.employees?.first_name} ${p.employees?.last_name}`,
      'Period': p.payroll_runs?.period_name || '',
      'Gross': p.total_earnings,
      'Deductions': p.total_deductions,
      'Net': p.net_salary,
      'Status': p.status
    }))

    const csvContent = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
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
           (p.employees?.last_name || '').toLowerCase().includes(s)
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-emerald-600" />Payslips
          </h1>
          <div className="flex gap-2">
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
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by payslip number or employee name..."
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
          </div>
        </div>

        <div className="neu-raised rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 dark:bg-slate-700/30">
                  <th className="text-left py-3 px-4">Payslip #</th>
                  <th className="text-left py-3 px-4">Employee</th>
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
                    <td className="py-3 px-4 text-xs">{p.payroll_runs?.period_name || 'N/A'}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(p.total_earnings)}</td>
                    <td className="py-3 px-4 text-right text-red-600">-{formatCurrency(p.total_deductions)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatCurrency(p.net_salary)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{p.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => navigate(`/payroll/payslips/${p.id}`)} className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => handleDownloadSingle(p)} disabled={downloadingId === p.id}
                          className="p-1.5 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600" title="Download PDF">
                          {downloadingId === p.id ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div> : <Download className="w-4 h-4" />}
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-purple-100 text-slate-400 hover:text-purple-600" title="Print"><Printer className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Hidden mini payslips for PDF download */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {payslips.map(p => (
          <div key={p.id} id={`payslip-mini-${p.id}`} className="bg-white p-4" style={{ width: '210mm' }}>
            <h2 className="text-lg font-bold">Payslip #{p.payslip_number}</h2>
            <p>Employee: {p.employees?.first_name} {p.employees?.last_name}</p>
            <p>Gross: {formatCurrency(p.total_earnings)}</p>
            <p>Deductions: -{formatCurrency(p.total_deductions)}</p>
            <p className="font-bold">Net Pay: {formatCurrency(p.net_salary)}</p>
            <p className="text-xs mt-4">Generated by Ndanduleni Group ERP</p>
          </div>
        ))}
      </div>
    </div>
  )
}
