import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import usePayrollStore from '../store/payrollStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  ArrowLeft, Save, Plus, Calculator, Users, DollarSign,
  Sun, Moon, Sparkles, Download, FileText
} from 'lucide-react'

export default function PayrollClassic() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [payrollData, setPayrollData] = useState({
    payroll_date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    pay_from_date: '',
    pay_to_date: '',
    total_gross: 0,
    total_net: 0
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*, payroll_profiles(*)')
      .eq('employment_status', 'active')
      .order('first_name')
    setEmployees(data || [])
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const addEmployeeToPayroll = (emp) => {
    if (!selectedEmployees.find(e => e.id === emp.id)) {
      const basicSalary = emp.payroll_profiles?.[0]?.basic_salary || 0
      setSelectedEmployees([...selectedEmployees, { ...emp, gross_pay: basicSalary, net_pay: basicSalary * 0.75 }])
      updateTotals()
    }
  }

  const removeEmployee = (empId) => {
    setSelectedEmployees(selectedEmployees.filter(e => e.id !== empId))
  }

  const updateTotals = () => {
    const totalGross = selectedEmployees.reduce((sum, e) => sum + (e.gross_pay || 0), 0)
    const totalNet = selectedEmployees.reduce((sum, e) => sum + (e.net_pay || 0), 0)
    setPayrollData({...payrollData, total_gross: totalGross, total_net: totalNet})
  }

  const handleProcessPayroll = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please add employees to payroll')
      return
    }
    if (!payrollData.pay_from_date || !payrollData.pay_to_date) {
      toast.error('Please set pay period dates')
      return
    }

    setLoading(true)
    try {
      const runNumber = 'RUN-' + new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()
      
      const { data: run } = await supabase.from('payroll_runs').insert([{
        run_number: runNumber,
        period_start: payrollData.pay_from_date,
        period_end: payrollData.pay_to_date,
        payment_date: payrollData.payroll_date,
        run_type: 'monthly',
        total_employees: selectedEmployees.length,
        employees_processed: selectedEmployees.length,
        total_gross: payrollData.total_gross,
        total_net: payrollData.total_net,
        total_deductions: payrollData.total_gross - payrollData.total_net,
        status: 'completed',
        processed_at: new Date().toISOString()
      }]).select().single()

      // Generate payslips
      for (const emp of selectedEmployees) {
        const basicSalary = emp.gross_pay || 0
        const paye = basicSalary * 0.18
        const uif = Math.min(basicSalary * 0.01, 177.12)
        const deductions = paye + uif
        const netPay = basicSalary - deductions

        const payslipNumber = 'PS-' + new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()

        await supabase.from('payslips').insert([{
          payroll_run_id: run.id,
          employee_id: emp.id,
          payroll_profile_id: emp.payroll_profiles?.[0]?.id,
          payslip_number: payslipNumber,
          basic_salary: basicSalary,
          total_earnings: basicSalary,
          paye_tax: paye,
          uif_contribution: uif,
          total_deductions: deductions,
          net_salary: netPay,
          days_worked: 22,
          hours_worked: 176,
          status: 'finalized',
          payment_reference: 'EFT-' + Date.now()
        }])
      }

      toast.success(`Payroll processed! ${selectedEmployees.length} payslips generated. ✅`)
      navigate('/payroll/payslips')
    } catch (error) {
      toast.error('Failed to process payroll: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Classic design styles
  const styles = {
    wrapper: {
      maxWidth: '1400px',
      margin: '0 auto',
      background: 'transparent'
    },
    panel: {
      border: '1px solid #2f73b8',
      background: '#d7e7f4',
      borderRadius: '4px',
      overflow: 'hidden'
    },
    panelTitle: {
      background: '#a9d2f3',
      textAlign: 'center',
      padding: '8px',
      fontWeight: 'bold',
      letterSpacing: '1px',
      borderBottom: '1px solid #2f73b8',
      fontSize: '1rem'
    },
    detailsGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr'
    },
    field: {
      borderRight: '1px solid #2f73b8',
      borderBottom: '1px solid #2f73b8',
      padding: '12px 10px',
      minHeight: '55px',
      background: '#eef4fa',
      fontSize: '0.95rem',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap'
    },
    emptyInput: {
      background: '#fffef7',
      border: '1px solid #b9cfec',
      padding: '6px 8px',
      borderRadius: '6px',
      fontFamily: 'inherit',
      fontSize: '0.85rem',
      width: '100%'
    },
    fieldLabel: {
      fontWeight: 600,
      color: '#1a4c7a',
      minWidth: '100px'
    }
  }

  return (
    <div style={{ background: '#d9d9d9', fontFamily: 'Arial, sans-serif', padding: '8px', minHeight: '100vh' }}>
      <Navbar />
      
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main style={styles.wrapper} className="pt-16">
        <Link to="/payroll" className="inline-flex items-center text-slate-600 hover:text-emerald-600 mb-4 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Payroll
        </Link>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'absolute', left: 0, width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #2f6cab', background: '#e9eef3' }}>
            <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
          </div>
          <h1 style={{ fontFamily: "'Alumni Sans Pinstripe', sans-serif", fontSize: '72px', color: '#235d95', fontWeight: 900, letterSpacing: '3px', textAlign: 'center' }}>
            Payroll Dashboard
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-4 justify-center flex-wrap">
          <button onClick={handleProcessPayroll} disabled={loading}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
            <Save className="w-4 h-4" /> {loading ? 'Processing...' : 'Process Payroll'}
          </button>
          <button onClick={() => navigate('/payroll/payslips')}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 flex items-center gap-2">
            <FileText className="w-4 h-4" /> View Payslips
          </button>
        </div>

        {/* MAIN GRID */}
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '16px', marginBottom: '20px' }}>
          {/* LEFT: PAYROLL DETAILS */}
          <div style={styles.panel}>
            <div style={styles.panelTitle}>📅 PAYROLL DETAILS</div>
            <div style={styles.detailsGrid}>
              <div style={styles.field}>
                <span style={styles.fieldLabel}>Payroll Date:</span>
                <input type="date" style={styles.emptyInput} value={payrollData.payroll_date} onChange={e => setPayrollData({...payrollData, payroll_date: e.target.value})} />
              </div>
              <div style={styles.field}>
                <span style={styles.fieldLabel}>Status:</span>
                <select style={{...styles.emptyInput, width: 'auto', minWidth: '110px'}} value={payrollData.status} onChange={e => setPayrollData({...payrollData, status: e.target.value})}>
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Paid</option>
                </select>
              </div>
              <div style={styles.field}>
                <span style={styles.fieldLabel}>Pay From Date:</span>
                <input type="date" style={styles.emptyInput} value={payrollData.pay_from_date} onChange={e => setPayrollData({...payrollData, pay_from_date: e.target.value})} />
              </div>
              <div style={styles.field}>
                <span style={styles.fieldLabel}>Pay To Date:</span>
                <input type="date" style={styles.emptyInput} value={payrollData.pay_to_date} onChange={e => setPayrollData({...payrollData, pay_to_date: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 12px', fontWeight: 'bold', background: '#deeaf5', gap: '15px', flexWrap: 'wrap' }}>
              <span style={{ background: 'white', padding: '6px 12px', borderRadius: '20px', color: '#1f5a8e', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                💰 Total Gross: {formatCurrency(payrollData.total_gross)}
              </span>
              <span style={{ background: 'white', padding: '6px 12px', borderRadius: '20px', color: '#1f5a8e', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                💵 Total Net: {formatCurrency(payrollData.total_net)}
              </span>
            </div>
          </div>

          {/* RIGHT: EMPLOYEE SELECTION */}
          <div style={styles.panel}>
            <div style={styles.panelTitle}>👤 SELECT EMPLOYEES</div>
            <div style={{ padding: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              <div className="space-y-2">
                {employees.map(emp => (
                  <div key={emp.id} 
                    onClick={() => addEmployeeToPayroll(emp)}
                    className="flex justify-between items-center p-2 rounded-lg cursor-pointer hover:bg-blue-50 border border-blue-100"
                    style={{ background: '#eef4fa' }}>
                    <div>
                      <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-slate-500">{emp.employee_code}</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(emp.payroll_profiles?.[0]?.basic_salary || 0)}</span>
                    <Plus className="w-4 h-4 text-blue-600" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TABLES SECTION */}
        <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '16px', marginBottom: '20px' }}>
          {/* SELECTED EMPLOYEES TABLE */}
          <div style={styles.panel}>
            <div style={styles.panelTitle}>📋 SELECTED PAY PERIOD EMPLOYEES ({selectedEmployees.length})</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center' }}>Employee Name</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center' }}>Gross Pay</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center' }}>Net Pay</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center', background: '#fcf8e8', color: '#6a6f73', fontStyle: 'italic' }}>
                      ✨ No employees added ✨
                    </td>
                  </tr>
                ) : (
                  selectedEmployees.map(emp => (
                    <tr key={emp.id}>
                      <td style={{ border: '1px solid #2f73b8', padding: '10px 5px', background: '#fefefe' }}>{emp.first_name} {emp.last_name}</td>
                      <td style={{ border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center', background: '#fefefe' }}>
                        <input type="number" value={emp.gross_pay || 0} onChange={e => {
                          const updated = selectedEmployees.map(se => se.id === emp.id ? {...se, gross_pay: parseFloat(e.target.value) || 0, net_pay: (parseFloat(e.target.value) || 0) * 0.75} : se)
                          setSelectedEmployees(updated)
                          const tg = updated.reduce((s, e) => s + (e.gross_pay || 0), 0)
                          const tn = updated.reduce((s, e) => s + (e.net_pay || 0), 0)
                          setPayrollData({...payrollData, total_gross: tg, total_net: tn})
                        }} style={{ width: '80px', textAlign: 'center', background: '#fffef7', border: '1px solid #b9cfec', borderRadius: '6px', padding: '4px' }} />
                      </td>
                      <td style={{ border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center', background: '#fefefe', color: '#059669', fontWeight: 'bold' }}>
                        {formatCurrency(emp.net_pay || 0)}
                      </td>
                      <td style={{ border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center', background: '#fefefe' }}>
                        <button onClick={() => removeEmployee(emp.id)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* TIMESHEET TABLE (Read-only from attendance) */}
          <div style={styles.panel}>
            <div style={styles.panelTitle}>⏱️ ATTENDANCE SUMMARY</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center' }}>Employee</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center' }}>Days Worked</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center' }}>Hours</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center' }}>OT Hours</th>
                </tr>
              </thead>
              <tbody>
                {selectedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center', background: '#fcf8e8', color: '#6a6f73', fontStyle: 'italic' }}>
                      📭 No timesheet entries
                    </td>
                  </tr>
                ) : (
                  selectedEmployees.map(emp => (
                    <tr key={emp.id}>
                      <td style={{ border: '1px solid #2f73b8', padding: '10px 5px', background: '#fefefe' }}>{emp.first_name} {emp.last_name}</td>
                      <td style={{ border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center', background: '#fefefe' }}>22</td>
                      <td style={{ border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center', background: '#fefefe' }}>176</td>
                      <td style={{ border: '1px solid #2f73b8', padding: '10px 5px', textAlign: 'center', background: '#fefefe' }}>0</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
