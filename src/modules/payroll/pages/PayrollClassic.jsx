import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  ArrowLeft, Save, Plus, FileText, Sun, Moon, Sparkles,
  Search, X, User, DollarSign, Clock, Calendar
} from 'lucide-react'

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
    const { data } = await supabase
      .from('employees')
      .select('*, payroll_profiles(*)')
      .eq('employment_status', 'active')
      .order('first_name')
    setEmployees(data || [])
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

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
      pay_amount: emp.payroll_profiles?.[0]?.basic_salary || '',
      overtime_rate: '1.5',
      pto_taken: 0
    })
    setShowEmployeeModal(false)
    // Load timesheet data for this employee
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
    if (!selectedEmployee || !employeePayData.pay_amount) {
      toast.error('Please select an employee and set pay amount')
      return
    }

    const grossPay = parseFloat(employeePayData.pay_amount) || 0
    const netPay = grossPay * 0.75

    const exists = payrollList.find(p => p.id === selectedEmployee.id)
    if (exists) {
      toast.error('Employee already added to payroll')
      return
    }

    const newEntry = {
      ...selectedEmployee,
      gross_pay: grossPay,
      net_pay: netPay,
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
    const totalNet = list.reduce((sum, p) => sum + (p.net_pay || 0), 0)
    setPayrollData(prev => ({...prev, total_gross: totalGross, total_net: totalNet}))
  }

  const handleProcessPayroll = async () => {
    if (payrollList.length === 0) { toast.error('Please add employees to payroll'); return }
    if (!payrollData.pay_from_date || !payrollData.pay_to_date) { toast.error('Please set pay period dates'); return }

    setLoading(true)
    try {
      const runNumber = 'RUN-' + new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()
      
      const { data: run } = await supabase.from('payroll_runs').insert([{
        run_number: runNumber,
        period_start: payrollData.pay_from_date,
        period_end: payrollData.pay_to_date,
        payment_date: payrollData.payroll_date,
        run_type: 'monthly',
        total_employees: payrollList.length,
        employees_processed: payrollList.length,
        total_gross: payrollData.total_gross,
        total_net: payrollData.total_net,
        total_deductions: payrollData.total_gross - payrollData.total_net,
        status: 'completed',
        processed_at: new Date().toISOString()
      }]).select().single()

      for (const emp of payrollList) {
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

      toast.success(`Payroll processed! ${payrollList.length} payslips generated.`)
      navigate('/payroll/payslips')
    } catch (error) {
      toast.error('Failed to process payroll: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Classic style helpers
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

        {/* HEADER with Avatar */}
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

        {/* MAIN GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '16px', marginBottom: '20px' }}>
          {/* LEFT: PAYROLL DETAILS */}
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
              <span style={{ background: 'white', padding: '6px 12px', borderRadius: '20px', color: '#1f5a8e' }}>
                💵 Net: {formatCurrency(payrollData.total_net)}
              </span>
            </div>
          </div>

          {/* RIGHT: EMPLOYEE DETAILS (shows selected employee info) */}
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
                    <div style={fieldStyle}>
                      <span style={labelStyle}>OT Rate (x):</span>
                      <input type="text" style={inputStyle} value={employeePayData.overtime_rate} onChange={e => setEmployeePayData({...employeePayData, overtime_rate: e.target.value})} />
                    </div>
                    <div style={fieldStyle}>
                      <span style={labelStyle}>PTO Taken (hrs):</span>
                      <input type="number" step="0.5" style={inputStyle} value={employeePayData.pto_taken} onChange={e => setEmployeePayData({...employeePayData, pto_taken: e.target.value})} />
                    </div>
                    <div style={fieldStyle}>
                      <span style={labelStyle}>Net Pay:</span>
                      <input type="text" style={{...inputStyle, color: '#059669', fontWeight: 'bold'}} value={formatCurrency((parseFloat(employeePayData.pay_amount) || 0) * 0.75)} readOnly />
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
                <div>
                  <div style={{ width: '110px', height: '110px', borderRadius: '15px', overflow: 'hidden', border: '3px solid #2c5f9b', margin: '12px auto', background: '#f4f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedEmployee.profile_photo_url ? (
                      <img src={selectedEmployee.profile_photo_url} alt="employee" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src="https://cdn-icons-png.flaticon.com/512/4140/4140048.png" alt="silhouette" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                    )}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#2b5e96' }}>📸 {selectedEmployee.employee_code}</div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg mb-2">No employee selected</p>
                <p className="text-slate-400 text-sm mb-4">Click "Select Employee" to choose an employee</p>
                <button onClick={() => setShowEmployeeModal(true)}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700">
                  <Plus className="w-4 h-4 inline mr-1" /> Select Employee
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TABLES SECTION */}
        <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '16px', marginBottom: '20px' }}>
          {/* PAYROLL LIST TABLE */}
          <div style={panelStyle}>
            <div style={panelTitleStyle}>📋 PAYROLL LIST ({payrollList.length})</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px' }}>Employee</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px' }}>Type</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px' }}>Gross</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px' }}>Net</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px' }}>Del</th>
                </tr>
              </thead>
              <tbody>
                {payrollList.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ border: '1px solid #2f73b8', padding: '30px', textAlign: 'center', background: '#fcf8e8', color: '#6a6f73', fontStyle: 'italic' }}>
                      ✨ No employees added to payroll ✨
                    </td>
                  </tr>
                ) : (
                  payrollList.map(emp => (
                    <tr key={emp.id}>
                      <td style={{ border: '1px solid #2f73b8', padding: '8px', background: '#fefefe', textAlign: 'left' }}>{emp.first_name} {emp.last_name}</td>
                      <td style={{ border: '1px solid #2f73b8', padding: '8px', background: '#fefefe' }}>{emp.pay_type}</td>
                      <td style={{ border: '1px solid #2f73b8', padding: '8px', background: '#fefefe' }}>{formatCurrency(emp.gross_pay)}</td>
                      <td style={{ border: '1px solid #2f73b8', padding: '8px', background: '#fefefe', color: '#059669', fontWeight: 'bold' }}>{formatCurrency(emp.net_pay)}</td>
                      <td style={{ border: '1px solid #2f73b8', padding: '8px', background: '#fefefe' }}>
                        <button onClick={() => removeFromPayroll(emp.id)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* TIMESHEET TABLE */}
          <div style={panelStyle}>
            <div style={panelTitleStyle}>⏱️ ATTENDANCE / TIMESHEET</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px' }}>Date</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px' }}>Clock In</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px' }}>Clock Out</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px' }}>Hours</th>
                  <th style={{ background: '#b7dff6', border: '1px solid #2f73b8', padding: '10px 5px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {timesheetData.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ border: '1px solid #2f73b8', padding: '30px', textAlign: 'center', background: '#fcf8e8', color: '#6a6f73', fontStyle: 'italic' }}>
                      {selectedEmployee ? '📭 No attendance records' : '👈 Select an employee to view timesheet'}
                    </td>
                  </tr>
                ) : (
                  timesheetData.map((record, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #2f73b8', padding: '8px', background: '#fefefe' }}>{record.attendance_date}</td>
                      <td style={{ border: '1px solid #2f73b8', padding: '8px', background: '#fefefe' }}>
                        {record.clock_in_time ? new Date(record.clock_in_time).toLocaleTimeString() : '-'}
                      </td>
                      <td style={{ border: '1px solid #2f73b8', padding: '8px', background: '#fefefe' }}>
                        {record.clock_out_time ? new Date(record.clock_out_time).toLocaleTimeString() : '-'}
                      </td>
                      <td style={{ border: '1px solid #2f73b8', padding: '8px', background: '#fefefe' }}>
                        {record.total_hours ? record.total_hours.toFixed(1) : '-'}
                      </td>
                      <td style={{ border: '1px solid #2f73b8', padding: '8px', background: '#fefefe' }}>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          record.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 
                          record.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>{record.status || 'N/A'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* EMPLOYEE SELECTION MODAL */}
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
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                        {emp.profile_photo_url ? (
                          <img src={emp.profile_photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-slate-500">{emp.employee_code} · {emp.position || 'N/A'}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">
                      {formatCurrency(emp.payroll_profiles?.[0]?.basic_salary || 0)}
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
