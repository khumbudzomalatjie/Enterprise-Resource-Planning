import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import usePayrollStore from '../store/payrollStore'
import useThemeStore from '../../../store/themeStore'
import html2pdf from 'html2pdf.js'
import toast from 'react-hot-toast'
import { 
  FileText, Download, Printer, Mail, ArrowLeft,
  Sun, Moon, Sparkles, ChevronRight
} from 'lucide-react'

export default function PayslipView() {
  const { id } = useParams()
  const { selectedPayslip, fetchPayslip, loading } = usePayrollStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const payslipRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (id) fetchPayslip(id)
  }, [id])

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const element = payslipRef.current
      if (!element) return

      const opt = {
        margin: [5, 5, 5, 5],
        filename: `Payslip_${selectedPayslip?.payslip_number}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' }
      }

      await html2pdf().set(opt).from(element).save()
      toast.success('Payslip downloaded! 📄')
    } catch (error) {
      toast.error('Failed to download payslip')
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!selectedPayslip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Payslip not found</p>
      </div>
    )
  }

  const ps = selectedPayslip

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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/payroll" className="text-slate-500 hover:text-emerald-600">Payroll</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/payroll/payslips" className="text-slate-500 hover:text-emerald-600">Payslips</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{ps.payslip_number}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mb-4 no-print">
          <button onClick={handleDownloadPDF} disabled={downloading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-blue-700">
            {downloading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Download className="w-4 h-4" />}
            Download PDF
          </button>
          <button onClick={handlePrint} className="px-4 py-2 bg-slate-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-slate-700">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-emerald-700">
            <Mail className="w-4 h-4" /> Email
          </button>
        </div>

        {/* Payslip Content */}
        <div ref={payslipRef} className="bg-white p-8 rounded-2xl shadow-lg" style={{ maxWidth: '210mm', margin: '0 auto' }}>
          {/* Header */}
          <div className="border-b-2 border-blue-600 pb-4 mb-6 flex justify-between">
            <div>
              <h1 className="text-2xl font-bold text-blue-800">NDANDULENI GROUP</h1>
              <p className="text-xs text-slate-500">Professional Cleaning & Hygiene Services</p>
              <p className="text-xs text-slate-400">Reg: 2020/123456/07 | PAYE: 7890123456 | UIF: 1234567</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-slate-800">PAYSLIP</h2>
              <p className="text-sm font-bold text-blue-600">#{ps.payslip_number}</p>
            </div>
          </div>

          {/* Employee & Payroll Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <h3 className="font-bold text-slate-700 mb-2">Employee Information</h3>
              <p><strong>Name:</strong> {ps.employees?.first_name} {ps.employees?.last_name}</p>
              <p><strong>Employee ID:</strong> {ps.employees?.employee_code}</p>
              <p><strong>Department:</strong> {ps.employees?.department || 'N/A'}</p>
              <p><strong>Position:</strong> {ps.employees?.position || 'N/A'}</p>
            </div>
            <div>
              <h3 className="font-bold text-slate-700 mb-2">Payroll Information</h3>
              <p><strong>Period:</strong> {formatDate(ps.payroll_runs?.period_start)} - {formatDate(ps.payroll_runs?.period_end)}</p>
              <p><strong>Payment Date:</strong> {formatDate(ps.payroll_runs?.payment_date)}</p>
              <p><strong>Status:</strong> <span className="text-emerald-600 font-medium capitalize">{ps.status}</span></p>
            </div>
          </div>

          {/* Earnings Table */}
          <h3 className="font-bold text-slate-700 mb-2 text-sm bg-emerald-50 p-2 rounded">EARNINGS</h3>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left py-2 px-3">Description</th>
                <th className="text-right py-2 px-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-3">Basic Salary</td>
                <td className="py-2 px-3 text-right">{formatCurrency(ps.basic_salary)}</td>
              </tr>
              {ps.payslip_earnings?.map((e, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2 px-3">{e.description}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(e.amount)}</td>
                </tr>
              ))}
              <tr className="font-bold bg-emerald-50">
                <td className="py-2 px-3">Total Earnings</td>
                <td className="py-2 px-3 text-right text-emerald-700">{formatCurrency(ps.total_earnings)}</td>
              </tr>
            </tbody>
          </table>

          {/* Deductions Table */}
          <h3 className="font-bold text-slate-700 mb-2 text-sm bg-red-50 p-2 rounded">DEDUCTIONS</h3>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left py-2 px-3">Description</th>
                <th className="text-right py-2 px-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 px-3">PAYE Tax</td>
                <td className="py-2 px-3 text-right text-red-600">-{formatCurrency(ps.paye_tax)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3">UIF Contribution</td>
                <td className="py-2 px-3 text-right text-red-600">-{formatCurrency(ps.uif_contribution)}</td>
              </tr>
              {ps.payslip_deductions?.map((d, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2 px-3">{d.description}</td>
                  <td className="py-2 px-3 text-right text-red-600">-{formatCurrency(d.amount)}</td>
                </tr>
              ))}
              <tr className="font-bold bg-red-50">
                <td className="py-2 px-3">Total Deductions</td>
                <td className="py-2 px-3 text-right text-red-700">-{formatCurrency(ps.total_deductions)}</td>
              </tr>
            </tbody>
          </table>

          {/* Net Salary */}
          <div className="bg-blue-600 text-white p-4 rounded-xl flex justify-between items-center text-lg font-bold">
            <span>NET SALARY</span>
            <span className="text-2xl">{formatCurrency(ps.net_salary)}</span>
          </div>

          {/* Payment Info */}
          <div className="mt-4 text-xs text-slate-500 border-t pt-4">
            <p><strong>Payment Method:</strong> EFT | <strong>Reference:</strong> {ps.payment_reference || 'N/A'}</p>
            <p className="mt-1">This is a computer-generated payslip and does not require a signature.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
