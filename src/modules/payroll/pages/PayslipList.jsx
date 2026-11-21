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
        margin: [0, 0, 0, 0], // Let the CSS handle the margins
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
      <html><head><title>Payslip ${payslip.payslip_number}</title>
      <style>
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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

  // YTD Calculation (Sums all payslips for this employee in the same year)
  const getYTD = (currentPayslip, field) => {
    const currentYear = new Date(currentPayslip.payroll_runs?.period_start).getFullYear();
    return payslips
      .filter(ps => ps.employee_id === currentPayslip.employee_id && new Date(ps.payroll_runs?.period_start).getFullYear() === currentYear)
      .reduce((sum, ps) => sum + (Number(ps[field]) || 0), 0);
  }

  // Common styles for the PDF layout
  const styles = {
    container: { background: '#fff', color: '#111827', padding: '15mm', width: '210mm', minHeight: '297mm', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontSize: '12px', boxSizing: 'border-box' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #059669', paddingBottom: '15px', marginBottom: '20px' },
    logo: { maxHeight: '70px', objectFit: 'contain' },
    titleBlock: { textAlign: 'right' },
    title: { fontSize: '24px', fontWeight: 'bold', color: '#059669', margin: '0 0 5px 0', letterSpacing: '1px' },
    subtitle: { fontSize: '14px', color: '#4b5563', margin: 0 },
    grid: { display: 'flex', gap: '20px', marginBottom: '20px' },
    section: { flex: 1 },
    sectionTitle: { fontSize: '13px', fontWeight: 'bold', color: '#374151', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    row: { display: 'flex', justifyContent: 'space-between', padding: '4px 0' },
    label: { color: '#6b7280' },
    value: { fontWeight: 'bold', color: '#111827' },
    table: { width: '100%', borderCollapse: 'collapse', marginBottom: '20px' },
    th: { background: '#f3f4f6', color: '#374151', padding: '8px', textAlign: 'left', fontWeight: 'bold', fontSize: '11px', borderBottom: '1px solid #d1d5db' },
    thRight: { background: '#f3f4f6', color: '#374151', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '11px', borderBottom: '1px solid #d1d5db' },
    td: { padding: '8px', borderBottom: '1px solid #e5e7eb' },
    tdRight: { padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontWeight: '500' },
    netPayBlock: { background: '#059669', color: '#fff', padding: '15px 20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
    netPayLabel: { fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px', margin: 0 },
    netPayValue: { fontSize: '24px', fontWeight: '900', margin: 0 },
    footer: { textAlign: 'center', color: '#9ca3af', fontSize: '10px', marginTop: '40px', borderTop: '1px solid #e5e7eb', paddingTop: '10px' }
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
              {filteredPayslips.length} payslips generated
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
          HIDDEN PDF LAYOUT (Modern Corporate Design)
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }} aria-hidden="true">
        {payslips.map(p => (
          <div key={p.id} id={`payslip-mini-${p.id}`} style={styles.container}>
            
            {/* HEADER */}
            <div style={styles.header}>
              <div>
                {/* ✅ YOUR COMPANY LOGO */}
                <img src="/logo.png" alt="Ndanduleni Group" style={styles.logo} />
              </div>
              <div style={styles.titleBlock}>
                <h1 style={styles.title}>PAYSLIP</h1>
                <p style={styles.subtitle}>
                  {p.payroll_runs?.period_start} to {p.payroll_runs?.period_end}
                </p>
                <p style={{ ...styles.subtitle, fontSize: '11px', marginTop: '5px' }}>
                  Ref: <strong>{p.payslip_number}</strong>
                </p>
              </div>
            </div>

            {/* EMPLOYEE & PAYROLL DETAILS */}
            <div style={styles.grid}>
              {/* Employee Details */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Employee Details</h3>
                <div style={styles.row}><span style={styles.label}>Name:</span> <span style={styles.value}>{p.employees?.first_name} {p.employees?.last_name}</span></div>
                <div style={styles.row}><span style={styles.label}>Employee Code:</span> <span style={styles.value}>{p.employees?.employee_code || '-'}</span></div>
                <div style={styles.row}><span style={styles.label}>ID Number:</span> <span style={styles.value}>{p.employees?.id_number || '-'}</span></div>
                <div style={styles.row}><span style={styles.label}>Job Title:</span> <span style={styles.value}>{p.employees?.position || '-'}</span></div>
                <div style={styles.row}><span style={styles.label}>Address:</span> <span style={styles.value}>{p.employees?.address_line1 || '-'} {p.employees?.city || ''}</span></div>
              </div>

              {/* Banking & Tax Details */}
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Banking & Tax</h3>
                <div style={styles.row}><span style={styles.label}>Bank Name:</span> <span style={styles.value}>{p.payroll_profiles?.bank_name || '-'}</span></div>
                <div style={styles.row}><span style={styles.label}>Account No:</span> <span style={styles.value}>{p.payroll_profiles?.bank_account_number ? `****${p.payroll_profiles.bank_account_number.slice(-4)}` : '-'}</span></div>
                <div style={styles.row}><span style={styles.label}>Branch Code:</span> <span style={styles.value}>{p.payroll_profiles?.bank_branch_code || '-'}</span></div>
                <div style={styles.row}><span style={styles.label}>PAYE Ref:</span> <span style={styles.value}>{p.payroll_profiles?.tax_number || '-'}</span></div>
                <div style={styles.row}><span style={styles.label}>UIF Ref:</span> <span style={styles.value}>{p.payroll_profiles?.uif_number || '-'}</span></div>
              </div>
            </div>

            {/* EARNINGS & DEDUCTIONS */}
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '40%' }}>Earnings</th>
                  <th style={{ ...styles.thRight, width: '10%' }}>Amount</th>
                  <th style={{ width: '2%', border: 'none', background: 'transparent' }}></th>
                  <th style={{ ...styles.th, width: '38%' }}>Deductions</th>
                  <th style={{ ...styles.thRight, width: '10%' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.td}>Basic Salary</td>
                  <td style={styles.tdRight}>{formatCurrency(p.basic_salary)}</td>
                  <td style={{ border: 'none' }}></td>
                  <td style={styles.td}>PAYE (Tax)</td>
                  <td style={styles.tdRight}>{formatCurrency(p.paye_tax)}</td>
                </tr>
                <tr>
                  <td style={styles.td}>Allowances / Overtime</td>
                  <td style={styles.tdRight}>{formatCurrency((p.total_earnings || 0) - (p.basic_salary || 0))}</td>
                  <td style={{ border: 'none' }}></td>
                  <td style={styles.td}>UIF</td>
                  <td style={styles.tdRight}>{formatCurrency(p.uif_contribution)}</td>
                </tr>
                <tr>
                  <td style={styles.td}></td>
                  <td style={styles.tdRight}></td>
                  <td style={{ border: 'none' }}></td>
                  <td style={styles.td}>Other / Pension</td>
                  <td style={styles.tdRight}>{formatCurrency((p.total_deductions || 0) - (p.paye_tax || 0) - (p.uif_contribution || 0))}</td>
                </tr>
                <tr style={{ background: '#f9fafb', fontWeight: 'bold' }}>
                  <td style={{ ...styles.td, color: '#059669' }}>Total Earnings</td>
                  <td style={{ ...styles.tdRight, color: '#059669' }}>{formatCurrency(p.total_earnings)}</td>
                  <td style={{ border: 'none', background: 'transparent' }}></td>
                  <td style={{ ...styles.td, color: '#dc2626' }}>Total Deductions</td>
                  <td style={{ ...styles.tdRight, color: '#dc2626' }}>{formatCurrency(p.total_deductions)}</td>
                </tr>
              </tbody>
            </table>

            {/* NET PAY BANNER */}
            <div style={styles.netPayBlock}>
              <p style={styles.netPayLabel}>NET PAY</p>
              <p style={styles.netPayValue}>{formatCurrency(p.net_salary)}</p>
            </div>

            {/* COMPANY CONTRIBUTIONS & YTD */}
            <div style={styles.grid}>
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Company Contributions (Employer)</h3>
                <div style={styles.row}><span style={styles.label}>Skills Development Levy (1%):</span> <span style={styles.value}>{formatCurrency((p.total_earnings || 0) * 0.01)}</span></div>
                <div style={styles.row}><span style={styles.label}>UIF (Employer):</span> <span style={styles.value}>{formatCurrency(p.uif_contribution)}</span></div>
                <div style={{ ...styles.row, borderTop: '1px solid #e5e7eb', marginTop: '5px', paddingTop: '5px' }}>
                  <span style={{ ...styles.label, fontWeight: 'bold', color: '#111827' }}>Total Cost to Company:</span> 
                  <span style={{ ...styles.value, color: '#059669' }}>{formatCurrency((p.total_earnings || 0) + (p.total_earnings || 0) * 0.01 + (p.uif_contribution || 0))}</span>
                </div>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Year To Date (YTD)</h3>
                <div style={styles.row}><span style={styles.label}>YTD Gross Earnings:</span> <span style={styles.value}>{formatCurrency(getYTD(p, 'total_earnings'))}</span></div>
                <div style={styles.row}><span style={styles.label}>YTD Tax Paid (PAYE):</span> <span style={styles.value}>{formatCurrency(getYTD(p, 'paye_tax'))}</span></div>
                <div style={styles.row}><span style={styles.label}>YTD UIF Paid:</span> <span style={styles.value}>{formatCurrency(getYTD(p, 'uif_contribution'))}</span></div>
                <div style={styles.row}><span style={styles.label}>YTD Net Salary:</span> <span style={styles.value}>{formatCurrency(getYTD(p, 'net_salary'))}</span></div>
              </div>
            </div>

            {/* LEAVE BALANCES (Placeholder UI) */}
            <div style={{ marginTop: '10px' }}>
              <h3 style={styles.sectionTitle}>Leave Balances</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th style={styles.th}>Leave Type</th>
                    <th style={styles.thRight}>Entitlement</th>
                    <th style={styles.thRight}>Taken</th>
                    <th style={styles.thRight}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.td}>Annual Leave</td>
                    <td style={styles.tdRight}>15.00</td>
                    <td style={styles.tdRight}>0.00</td>
                    <td style={styles.tdRight}>15.00</td>
                  </tr>
                  <tr>
                    <td style={styles.td}>Sick Leave</td>
                    <td style={styles.tdRight}>30.00</td>
                    <td style={styles.tdRight}>0.00</td>
                    <td style={styles.tdRight}>30.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FOOTER */}
            <div style={styles.footer}>
              This is a computer-generated payslip and does not require a signature.<br />
              Generated by Ndanduleni Group ERP on {new Date().toLocaleDateString('en-ZA')}
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}
