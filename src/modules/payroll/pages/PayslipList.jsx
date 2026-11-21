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
  Sun, Moon, Sparkles, Printer, RefreshCw
} from 'lucide-react'

const formatCurrency = (amount) => {
  const n = Number(amount)
  if (!isFinite(n)) return 'R 0.00'
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n)
}

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
      // ✅ Join employees and payroll_profiles to get the full primary info
      const { data, error } = await supabase
        .from('payslips')
        .select(`
          *,
          employees(*),
          payroll_runs(period_start, period_end, run_number),
          payroll_profiles(*)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        toast.error('Failed to load: ' + error.message)
      } else {
        setPayslips(data || [])
      }
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  const waitForNode = (id, timeoutMs = 500) => new Promise((resolve) => {
    const started = Date.now()
    const tick = () => {
      const node = document.getElementById(id)
      if (node) return resolve(node)
      if (Date.now() - started > timeoutMs) return resolve(null)
      requestAnimationFrame(tick)
    }
    tick()
  })

  const handleDownloadSingle = async (payslip) => {
    setDownloadingId(payslip.id)
    try {
      const nodeId = `payslip-mini-${payslip.id}`
      const element = await waitForNode(nodeId)
      if (!element) { toast.error('Payslip preview not ready — try again'); return }

      const opt = {
        margin: [5, 5, 5, 5],
        filename: `Payslip_${payslip.payslip_number}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true },
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

  const handlePrint = async (payslip) => {
    const element = await waitForNode(`payslip-mini-${payslip.id}`)
    if (!element) { toast.error('Preview not ready'); return }

    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Payslip</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 4px; }
      </style></head>
      <body>${element.innerHTML}</body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 250)
  }

  const filteredPayslips = payslips.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return (p.payslip_number || '').toLowerCase().includes(s) ||
           (p.employees?.first_name || '').toLowerCase().includes(s) ||
           (p.employees?.last_name || '').toLowerCase().includes(s) ||
           (p.employees?.employee_code || '').toLowerCase().includes(s)
  })

  // YTD Calculation helper (sums all loaded payslips for this employee in the same year)
  const getYTD = (currentPayslip, field) => {
    const currentYear = new Date(currentPayslip.payroll_runs?.period_start).getFullYear();
    return payslips
      .filter(ps => ps.employee_id === currentPayslip.employee_id && new Date(ps.payroll_runs?.period_start).getFullYear() === currentYear)
      .reduce((sum, ps) => sum + (Number(ps[field]) || 0), 0);
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
            <p className="text-slate-500 mt-1">
              {filteredPayslips.length} payslips
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadPayslips} className="px-4 py-2 bg-slate-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-slate-700">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </motion.div>

        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by payslip #, employee name, or code..."
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading...</p>
          </div>
        ) : filteredPayslips.length === 0 ? (
          <div className="neu-raised rounded-3xl p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg mb-2">No payslips found</p>
          </div>
        ) : (
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
                    <th className="text-center py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayslips.map(p => (
                    <tr key={p.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-xs">{p.payslip_number}</td>
                      <td className="py-3 px-4 font-medium">{p.employees?.first_name} {p.employees?.last_name}</td>
                      <td className="py-3 px-4 text-xs">{p.payroll_runs?.period_start} to {p.payroll_runs?.period_end}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(p.total_earnings)}</td>
                      <td className="py-3 px-4 text-right text-red-600">-{formatCurrency(p.total_deductions)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatCurrency(p.net_salary)}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => handleDownloadSingle(p)} disabled={downloadingId === p.id}
                            className="p-1.5 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600" title="Download PDF">
                            {downloadingId === p.id
                              ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                              : <Download className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handlePrint(p)} className="p-1.5 rounded-lg hover:bg-purple-100 text-slate-400 hover:text-purple-600" title="Print">
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

      {/* ═══════════════════════════════════════════════════════════════
          HIDDEN PDF LAYOUT (Matches Mustek Example)
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }} aria-hidden="true">
        {payslips.map(p => (
          <div key={p.id} id={`payslip-mini-${p.id}`} style={{ background: '#fff', color: '#000', padding: '30px', width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>NDANDULENI GROUP</h1>
                <p style={{ margin: 0 }}>Payslip for {p.payroll_runs?.period_start} to {p.payroll_runs?.period_end}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>PAYSLIP</h2>
                <p style={{ margin: 0 }}>#{p.payslip_number}</p>
              </div>
            </div>

            {/* EMPLOYEE & PROFILE DETAILS */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold', width: '15%' }}>Emp. Code</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc', width: '18%' }}>{p.employees?.employee_code || '-'}</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold', width: '15%' }}>Date Engaged</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc', width: '18%' }}>{p.employees?.hire_date || '-'}</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold', width: '15%' }}>Pay Period</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc', width: '19%' }}>{p.payroll_runs?.period_start} - {p.payroll_runs?.period_end}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}>Emp. Name</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc' }}>{p.employees?.first_name} {p.employees?.last_name}</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}>Job Title</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc' }}>{p.employees?.position || '-'}</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}>Co. Name</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc' }}>NDANDULENI GROUP</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}>ID Number</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc' }}>{p.employees?.id_number || '-'}</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}>Paypoint</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc' }}>HEAD_OFFICE</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}>PAYE Ref. No.</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc' }}>{p.payroll_profiles?.tax_number || '-'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}>Emp. Address</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc' }}>{p.employees?.address_line1 || '-'} {p.employees?.city || ''}</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}>Bank</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc' }}>{p.payroll_profiles?.bank_name || '-'}</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}>UIF Reg. No.</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc' }}>{p.payroll_profiles?.uif_number || '-'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}>Account No.</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc' }}>{p.payroll_profiles?.bank_account_number ? `****${p.payroll_profiles.bank_account_number.slice(-4)}` : '-'}</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}>Branch No.</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc' }}>{p.payroll_profiles?.bank_branch_code || '-'}</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc', fontWeight: 'bold' }}>Payment Type</td>
                  <td style={{ padding: '4px', border: '1px solid #ccc' }}>EFT</td>
                </tr>
              </tbody>
            </table>

            {/* EARNINGS AND DEDUCTIONS */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#e0e0e0' }}>
                      <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'left' }}>Earnings</th>
                      <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px', border: '1px solid #ccc' }}>Basic Salary</td>
                      <td style={{ padding: '4px', border: '1px solid #ccc', textAlign: 'right' }}>{formatCurrency(p.basic_salary)}</td>
                    </tr>
                    {(p.total_earnings - p.basic_salary) > 0 && (
                      <tr>
                        <td style={{ padding: '4px', border: '1px solid #ccc' }}>Allowances / Overtime</td>
                        <td style={{ padding: '4px', border: '1px solid #ccc', textAlign: 'right' }}>{formatCurrency(p.total_earnings - p.basic_salary)}</td>
                      </tr>
                    )}
                    <tr style={{ fontWeight: 'bold', background: '#f9f9f9' }}>
                      <td style={{ padding: '4px', border: '1px solid #000' }}>Total Earnings</td>
                      <td style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>{formatCurrency(p.total_earnings)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#e0e0e0' }}>
                      <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'left' }}>Deductions</th>
                      <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px', border: '1px solid #ccc' }}>PAYE (Tax)</td>
                      <td style={{ padding: '4px', border: '1px solid #ccc', textAlign: 'right' }}>{formatCurrency(p.paye_tax)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px', border: '1px solid #ccc' }}>UIF</td>
                      <td style={{ padding: '4px', border: '1px solid #ccc', textAlign: 'right' }}>{formatCurrency(p.uif_contribution)}</td>
                    </tr>
                    {(p.total_deductions - p.paye_tax - p.uif_contribution) > 0 && (
                      <tr>
                        <td style={{ padding: '4px', border: '1px solid #ccc' }}>Other / Pension</td>
                        <td style={{ padding: '4px', border: '1px solid #ccc', textAlign: 'right' }}>{formatCurrency(p.total_deductions - p.paye_tax - p.uif_contribution)}</td>
                      </tr>
                    )}
                    <tr style={{ fontWeight: 'bold', background: '#f9f9f9' }}>
                      <td style={{ padding: '4px', border: '1px solid #000' }}>Total Deductions</td>
                      <td style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>{formatCurrency(p.total_deductions)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* NET PAY BLOCK */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#000', color: '#fff', fontWeight: 'bold', fontSize: '14px', marginBottom: '20px' }}>
              <span>Net Pay</span>
              <span>{formatCurrency(p.net_salary)}</span>
            </div>

            {/* COMPANY CONTRIBUTIONS & YTD */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#e0e0e0' }}>
                      <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'left' }}>Company Contributions</th>
                      <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px', border: '1px solid #ccc' }}>Skills Development Levy</td>
                      <td style={{ padding: '4px', border: '1px solid #ccc', textAlign: 'right' }}>{formatCurrency(p.total_earnings * 0.01)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px', border: '1px solid #ccc' }}>UIF (Employer)</td>
                      <td style={{ padding: '4px', border: '1px solid #ccc', textAlign: 'right' }}>{formatCurrency(p.uif_contribution)}</td>
                    </tr>
                    <tr style={{ fontWeight: 'bold', background: '#f9f9f9' }}>
                      <td style={{ padding: '4px', border: '1px solid #000' }}>Total Contributions</td>
                      <td style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>{formatCurrency((p.total_earnings * 0.01) + p.uif_contribution)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#e0e0e0' }}>
                      <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'left' }}>Year To Date Totals</th>
                      <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px', border: '1px solid #ccc' }}>YTD Tax Paid</td>
                      <td style={{ padding: '4px', border: '1px solid #ccc', textAlign: 'right' }}>{formatCurrency(getYTD(p, 'paye_tax'))}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px', border: '1px solid #ccc' }}>YTD Gross Earnings</td>
                      <td style={{ padding: '4px', border: '1px solid #ccc', textAlign: 'right' }}>{formatCurrency(getYTD(p, 'total_earnings'))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}
