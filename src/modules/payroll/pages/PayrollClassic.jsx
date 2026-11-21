import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Save, Plus, FileText, Sun, Moon, Sparkles,
  Search, X, User
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// 🇿🇦 SARS PAYE TAX CALCULATOR (2024/2025 Tax Year)
// ═══════════════════════════════════════════════════════════════
const calculateZATax = (monthlyGross, monthlyPension = 0) => {
  const taxableIncome = monthlyGross - monthlyPension
  const annualIncome = taxableIncome * 12

  let annualTax = 0
  if (annualIncome <= 237100) {
    annualTax = annualIncome * 0.18
  } else if (annualIncome <= 370500) {
    annualTax = 42678 + (annualIncome - 237100) * 0.26
  } else if (annualIncome <= 512800) {
    annualTax = 77362 + (annualIncome - 370500) * 0.31
  } else if (annualIncome <= 673000) {
    annualTax = 121475 + (annualIncome - 512800) * 0.36
  } else if (annualIncome <= 857900) {
    annualTax = 179147 + (annualIncome - 673000) * 0.39
  } else if (annualIncome <= 1817000) {
    annualTax = 251258 + (annualIncome - 857900) * 0.41
  } else {
    annualTax = 644489 + (annualIncome - 1817000) * 0.45
  }

  // Primary Rebate
  const rebate = 17235
  const finalAnnualTax = Math.max(0, annualTax - rebate)
  const monthlyPAYE = finalAnnualTax / 12

  // UIF (1% capped at R177.12)
  const uif = Math.min(monthlyGross * 0.01, 177.12)

  return {
    paye: Math.round(monthlyPAYE * 100) / 100,
    uif: Math.round(uif * 100) / 100
  }
}

export default function PayrollClassic() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [payrollData, setPayrollData] = useState({
    payroll_date: new Date().toISOString().split('T')[0],
    status: 'Pending',
    pay_from_date: '',
    pay_to_date: '',
    total_gross: 0,
    total_net: 0
  })
  const [employeePayData, setEmployeePayData] = useState({
    pay_type: 'Salary',
    pay_amount: '',
    overtime_rate: '1.5',
    pto_taken: 0
  })
  const [payrollList, setPayrollList] = useState([])
  const [timesheetData, setTimesheetData] = useState([])

  useEffect(() => { loadEmployees() }, [])

  const loadEmployees = async () => {
    try {
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .order('first_name')

      if (empError) throw empError

      const employeeIds = (empData || []).map(e => e.id)
      let profileData = []

      if (employeeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('payroll_profiles')
          .select('*')
          .in('employee_id', employeeIds)
        profileData = profiles || []
      }

      const merged = (empData || []).map(emp => {
        const empProfiles = profileData.filter(p => p.employee_id === emp.id)
        return {
          ...emp,
          payroll_profiles: empProfiles,
          payroll_profile: empProfiles[0] || null
        }
      })

      setEmployees(merged)
    } catch (err) {
      console.error('Load error:', err)
      toast.error('Failed to load employees')
    }
  }

  const formatCurrency = (amount) => {
    const n = Number(amount)
    if (!isFinite(n)) return 'R 0.00'
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n)
  }

  const filteredEmployees = employees.filter(emp => {
    if (!searchTerm) return true
    const s = searchTerm.toLowerCase()
    return (emp.first_name || '').toLowerCase().includes(s) ||
           (emp.last_name || '').toLowerCase().includes(s) ||
           (emp.employee_code || '').toLowerCase().includes(s)
  })

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp)
    setEmployeePayData({
      pay_type: 'Salary',
      pay_amount: emp.payroll_profile?.basic_salary || '',
      overtime_rate: '1.5',
      pto_taken: 0
    })
    setShowEmployeeModal(false)
    loadTimesheetData(emp.id)
  }

  const loadTimesheetData = async (employeeId) => {
    try {
      const { data } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', employeeId)
        .order('attendance_date', { ascending: false })
        .limit(10)
      setTimesheetData(data || [])
    } catch (error) {
      setTimesheetData([])
    }
  }

  const handleAddToPayroll = () => {
    if (!selectedEmployee) return
    const basic = parseFloat(employeePayData.pay_amount) || 0
    if (basic <= 0) {
      toast.error('Please set a valid pay amount')
      return
    }

    if (payrollList.find(p => p.id === selectedEmployee.id)) {
      toast.error('Employee already added to payroll')
      return
    }

    const newEntry = {
      ...selectedEmployee,
      gross_pay: basic, // This is the basic salary before deductions
      pay_type: employeePayData.pay_type,
      overtime_rate: employeePayData.overtime_rate,
      pto_taken: employeePayData.pto_taken
    }

    const updated = [...payrollList, newEntry]
    setPayrollList(updated)
    updateTotals(updated)
    toast.success(`${selectedEmployee.first_name} added to payroll!`)
    setSelectedEmployee(null)
  }

  const removeFromPayroll = (empId) => {
    const updated = payrollList.filter(p => p.id !== empId)
    setPayrollList(updated)
    updateTotals(updated)
  }

  const updateTotals = (list) => {
    const totalGross = list.reduce((sum, p) => sum + (p.gross_pay || 0), 0)
    setPayrollData(prev => ({ ...prev, total_gross: totalGross }))
  }

  const handleProcessPayroll = async () => {
    if (payrollList.length === 0) { toast.error('Please add employees to payroll'); return }
    if (!payrollData.pay_from_date || !payrollData.pay_to_date) { toast.error('Please set pay period dates'); return }

    setLoading(true)
    try {
      const runNumber = 'RUN-' + new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()
      
      // 1. Fetch all custom deductions (e.g., Pension) for these employees before generating payslips
      const profileIds = payrollList.map(e => e.payroll_profile?.id).filter(Boolean)
      let allDeductions = []
      if (profileIds.length > 0) {
        const { data } = await supabase
          .from('employee_deductions')
          .select('*, deduction_types(name)')
          .in('payroll_profile_id', profileIds)
        allDeductions = data || []
      }

      // 2. Calculate totals for the run header
      let runTotalGross = 0
      let runTotalNet = 0
      let runTotalDeductions = 0

      const payslipPayloads = []

      for (const emp of payrollList) {
        const basicSalary = Number(emp.payroll_profile?.basic_salary || emp.gross_pay || 0)
        
        // Find custom deductions for this employee
        const empDeductions = allDeductions.filter(d => d.payroll_profile_id === emp.payroll_profile?.id)
        
        // Separate Pension (tax deductible) from other deductions
        const pensionDeduction = empDeductions.find(d => (d.deduction_types?.name || '').toLowerCase().includes('pension'))
        const pensionAmount = pensionDeduction ? Number(pensionDeduction.amount) : 0
        const otherDeductionsAmount = empDeductions.filter(d => d !== pensionDeduction).reduce((s, d) => s + Number(d.amount), 0)

        // Calculate SARS Tax and UIF
        const { paye, uif } = calculateZATax(basicSalary, pensionAmount)
        
        const totalDeductions = pensionAmount + otherDeductionsAmount + paye + uif
        const netPay = basicSalary - totalDeductions

        runTotalGross += basicSalary
        runTotalNet += netPay
        runTotalDeductions += totalDeductions

        const payslipNumber = 'PS-' + new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()

        payslipPayloads.push({
          employee_id: emp.id,
          payroll_profile_id: emp.payroll_profile?.id,
          payslip_number: payslipNumber,
          basic_salary: basicSalary,
          total_earnings: basicSalary,
          paye_tax: paye,
          uif_contribution: uif,
          total_deductions: totalDeductions,
          net_salary: netPay,
          days_worked: 22,
          hours_worked: 176,
          status: 'finalized',
          payment_reference: 'EFT-' + Date.now()
        })
      }

      // 3. Create the Payroll Run
      const { data: run, error: runError } = await supabase.from('payroll_runs').insert([{
        run_number: runNumber,
        period_start: payrollData.pay_from_date,
        period_end: payrollData.pay_to_date,
        payment_date: payrollData.payroll_date,
        run_type: 'monthly',
        total_employees: payrollList.length,
        employees_processed: payrollList.length,
        total_gross: runTotalGross,
        total_net: runTotalNet,
        total_deductions: runTotalDeductions,
        status: 'completed',
        processed_at: new Date().toISOString()
      }]).select().single()

      if (runError) throw runError

      // 4. Insert Payslips
      const finalPayloads = payslipPayloads.map(p => ({ ...p, payroll_run_id: run.id }))
      const { error: slipError } = await supabase.from('payslips').insert(finalPayloads)

      if (slipError) throw slipError

      toast.success(`Payroll processed! ${payrollList.length} payslips generated.`)
      navigate('/payroll/payslips')
    } catch (error) {
      console.error('Process error:', error)
      toast.error('Failed to process payroll: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Classic style helpers ────────────────────────────────────
  const panelStyle = { border: '1px solid #2f73b8', background: '#d7e7f4', borderRadius: '4px', overflow: 'hidden' }
  const panelTitleStyle = { background: '#a9d2f3', textAlign: 'center', padding: '8px', fontWeight: 'bold', letterSpacing: '1px', borderBottom: '1px solid #2f73b8', fontSize: '1rem' }
  const fieldStyle = { borderRight: '1px solid #2f73b8', borderBottom: '1px solid #2f73b8', padding: '12px 10px', minHeight: '55px', background: '#eef4fa', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }
  const inputStyle = { background: '#fffef7', border: '1px solid #b9cfec', padding: '6px 8px', borderRadius: '6px', fontFamily: 'inherit', fontSize: '0.85rem', width: '100%' }
  const labelStyle = { fontWeight: 600, color: '#1a4c7a', minWidth: '100px' }

  return (
    <div style={{ background: '#d9d9d9', fontFamily: 'Arial, sans-serif', padding: '8px', minHeight: '100vh' }}>
      <Navbar />
      
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2" style={{ background: isDark ? '#1e293b' : 'linear-gradient(145deg, #e2e8f0, #eef2f8)' }}>
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="pt-16">
        <Link to="/payroll" className="inline-flex items-center text-slate-600 hover:text-emerald-600 mb-4 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Payroll
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: '20px', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: "'Alumni Sans Pinstripe', sans-serif", fontSize: '72px', color: '#235d95', fontWeight: 900, letterSpacing: '3px', textAlign: 'center' }}>
            Payroll Dashboard
          </h1>
        </div>

        <div className="flex gap-3 mb-4 justify-center flex-wrap">
          <button onClick={() => setShowEmployeeModal(true)}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 flex items-center gap-2 shadow-md">
            <Plus className="w-4 h-4" /> Select Employee
          </button>
          <button onClick={handleProcessPayroll} disabled={loading}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-md">
            <Save className="w-4 h-4" /> {loading ? 'Processing...' : 'Process Payroll'}
          </button>
          <button onClick={() => navigate('/payroll/payslips')}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 flex items-center gap-2 shadow-md">
            <FileText className="w-4 h-4" /> View Payslips
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '16px', marginBottom: '20px' }}>
          <div style={panelStyle}>
            <div style={panelTitleStyle}>📅 PAYROLL DETAILS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={fieldStyle}>
                <span style={labelStyle}>Payroll Date:</span>
                <input type="date" style={inputStyle} value={payrollData.payroll_date} onChange={e => setPayrollData({...payrollData, payroll_date: e.target.value})} />
              </div>
              <div style={fieldStyle}>
                <span style={labelStyle}>Status:</span>
                <select style={{...inputStyle, width: 'auto', minWidth: '110px'}} value={payrollData.status} onChange={e => setPayrollData({...payrollData, status: e.target.value})}>
                  <option>Pending</option><option>Approved</option><option>Paid</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <span style={labelStyle}>Pay From:</span>
                <input type="date" style={inputStyle} value={payrollData.pay_from_date} onChange={e => setPayrollData({...payrollData, pay_from_date: e.target.value})} />
              </div>
              <div style={fieldStyle}>
                <span style={labelStyle}>Pay To:</span>
                <input type="date" style={inputStyle} value={payrollData.pay_to_date} onChange={e => setPayrollData({...payrollData, pay_to_date: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 12px', fontWeight: 'bold', background: '#deeaf5', gap: '15px', flexWrap: 'wrap' }}>
              <span style={{ background: 'white', padding: '6px 12px', borderRadius: '20px', color: '#1f5a8e' }}>
                💰 Gross: {formatCurrency(payrollData.total_gross)}
              </span>
            </div>
          </div>

          <div style={panelStyle}>
            <div style={panelTitleStyle}>👤 EMPLOYEE DETAILS</div>
            {selectedEmployee ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px', alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    <div style={fieldStyle}>
                      <span style={labelStyle}>Name:</span>
                      <input type="text" style={inputStyle} value={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`} readOnly />
                    </div>
                    <div style={fieldStyle}>
                      <span style={labelStyle}>Pay Type:</span>
                      <select style={inputStyle} value={employeePayData.pay_type} onChange={e => setEmployeePayData({...employeePayData, pay_type: e.target.value})}>
                        <option>Hourly</option><option>Salary</option><option>Contract</option>
                      </select>
                    </div>
                    <div style={fieldStyle}>
                      <span style={labelStyle}>Pay Amount (R):</span>
                      <input type="number" step="0.01" style={inputStyle} value={employeePayData.pay_amount} onChange={e => setEmployeePayData({...employeePayData, pay_amount: e.target.value})} />
                    </div>
                  </div>
                  <div style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                    <button onClick={handleAddToPayroll} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700">
                      + Add to Payroll
                    </button>
                    <button onClick={() => setSelectedEmployee(null)} className="px-4 py-2 bg-slate-400 text-white rounded-lg text-sm font-bold hover:bg-slate-500">
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg mb-2">No employee selected</p>
                <button onClick={() => setShowEmployeeModal(true)}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700">
                  <Plus className="w-4 h-4 inline mr-1" /> Select Employee
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '100%', gap: '16px', marginBottom: '20px' }}>
          <div style={panelStyle}>
            <div style={panelTitleStyle}>📋 PAYROLL LIST ({payrollList.length})</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px' }}>Employee</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px' }}>Type</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px' }}>Gross</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px' }}>Del</th>
                </tr>
              </thead>
              <tbody>
                {payrollList.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ border: '1px solid #2f73b8', padding: '30px', textAlign: 'center', background: '#fcf8e8', color: '#6a6f73', fontStyle: 'italic' }}>
                      ✨ No employees added to payroll ✨
                    </td>
                  </tr>
                ) : (
                  payrollList.map(emp => (
                    <tr key={emp.id}>
                      <td style={{ border: '1px solid #2f73b8', padding: '8px', background: '#fefefe', textAlign: 'left' }}>{emp.first_name} {emp.last_name}</td>
                      <td style={{ border: '1px solid #2f73b8', padding: '8px', background: '#fefefe' }}>{emp.pay_type}</td>
                      <td style={{ border: '1px solid #2f73b8', padding: '8px', background: '#fefefe' }}>{formatCurrency(emp.gross_pay)}</td>
                      <td style={{ border: '1px solid #2f73b8', padding: '8px', background: '#fefefe' }}>
                        <button onClick={() => removeFromPayroll(emp.id)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEmployeeModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}
            style={{ border: '2px solid #2f6cab' }}>
            <div style={{ background: '#a9d2f3', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="font-bold text-lg text-slate-800">Select Employee</h3>
              <button onClick={() => setShowEmployeeModal(false)} className="p-1 rounded-lg hover:bg-white/50">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search by name or code..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm" />
              </div>
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {filteredEmployees.map(emp => (
                  <div key={emp.id} onClick={() => handleSelectEmployee(emp)}
                    className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-blue-50 border border-blue-100 transition-colors"
                    style={{ background: '#eef4fa' }}>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-slate-500">{emp.employee_code} · {emp.position || 'N/A'}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">
                      {formatCurrency(emp.payroll_profile?.basic_salary || 0)}
                    </span>
                  </div>
                ))}
                {filteredEmployees.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No employees found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
