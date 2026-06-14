import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import usePayrollStore from '../store/payrollStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Calculator, Play, CheckCircle2, Users, DollarSign,
  ArrowLeft, ChevronRight, Sun, Moon, Sparkles,
  Download, FileText, Calendar, AlertCircle,
  Clock, TrendingUp, TrendingDown
} from 'lucide-react'

export default function PayrollRun() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [runData, setRunData] = useState({
    period_start: '',
    period_end: '',
    payment_date: '',
    run_type: 'monthly',
    notes: ''
  })
  const [preview, setPreview] = useState(null)
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('employment_status', 'active')
        .order('first_name')

      if (empError) {
        console.error('Error loading employees:', empError)
        toast.error('Failed to load employees from HR')
        return
      }

      if (!empData || empData.length === 0) {
        setEmployees([])
        return
      }

      const employeeIds = empData.map(e => e.id)
      const { data: profileData } = await supabase
        .from('payroll_profiles')
        .select('*')
        .in('employee_id', employeeIds)

      const merged = empData.map(emp => ({
        ...emp,
        payroll_profiles: profileData?.filter(p => p.employee_id === emp.id) || []
      }))

      setEmployees(merged)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load employees')
    }
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const steps = [
    { id: 1, label: 'Select Period', icon: Calendar },
    { id: 2, label: 'Select Employees', icon: Users },
    { id: 3, label: 'Preview', icon: Calculator },
    { id: 4, label: 'Process', icon: Play },
    { id: 5, label: 'Complete', icon: CheckCircle2 },
  ]

  const handleSelectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(employees.map(e => e.id))
    }
  }

  const handleToggleEmployee = (id) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter(e => e !== id))
    } else {
      setSelectedEmployees([...selectedEmployees, id])
    }
  }

  const calculatePreview = () => {
    const selected = employees.filter(e => selectedEmployees.includes(e.id))
    let totalGross = 0
    let totalDeductions = 0

    selected.forEach(emp => {
      const basicSalary = emp.payroll_profiles?.[0]?.basic_salary || 0
      totalGross += basicSalary
      totalDeductions += basicSalary * 0.25
    })

    return {
      employeeCount: selected.length,
      totalGross,
      totalDeductions,
      totalNet: totalGross - totalDeductions,
      employees: selected
    }
  }

  const handleGeneratePreview = () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee')
      return
    }
    setProcessing(true)
    setTimeout(() => {
      setPreview(calculatePreview())
      setStep(3)
      setProcessing(false)
    }, 800)
  }

  const handleProcessPayroll = async () => {
    setProcessing(true)
    try {
      const runNumber = 'RUN-' + new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()
      
      const { data: run, error: runError } = await supabase
        .from('payroll_runs')
        .insert([{
          run_number: runNumber,
          period_start: runData.period_start,
          period_end: runData.period_end,
          payment_date: runData.payment_date,
          run_type: runData.run_type,
          total_employees: preview.employeeCount,
          employees_processed: preview.employeeCount,
          total_gross: preview.totalGross,
          total_deductions: preview.totalDeductions,
          total_net: preview.totalNet,
          status: 'completed',
          processed_at: new Date().toISOString(),
          notes: runData.notes
        }])
        .select()
        .single()

      if (runError) throw runError

      // Generate payslips
      for (const emp of preview.employees) {
        const basicSalary = emp.payroll_profiles?.[0]?.basic_salary || 0
        const paye = basicSalary * 0.18
        const uif = Math.min(basicSalary * 0.01, 177.12)
        const totalDeductions = paye + uif
        const netSalary = basicSalary - totalDeductions

        const payslipNumber = 'PS-' + new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()

        const { data: payslip } = await supabase
          .from('payslips')
          .insert([{
            payroll_run_id: run.id,
            employee_id: emp.id,
            payroll_profile_id: emp.payroll_profiles?.[0]?.id,
            payslip_number: payslipNumber,
            basic_salary: basicSalary,
            total_earnings: basicSalary,
            paye_tax: paye,
            uif_contribution: uif,
            total_deductions: totalDeductions,
            net_salary: netSalary,
            days_worked: 22,
            hours_worked: 176,
            status: 'finalized',
            payment_reference: 'EFT-' + Date.now()
          }])
          .select()
          .single()

        if (payslip) {
          await supabase.from('payslip_earnings').insert([
            { payslip_id: payslip.id, description: 'Basic Salary', amount: basicSalary, is_taxable: true, display_order: 1 }
          ])
          await supabase.from('payslip_deductions').insert([
            { payslip_id: payslip.id, description: 'PAYE Tax', amount: paye, display_order: 1 },
            { payslip_id: payslip.id, description: 'UIF Contribution', amount: uif, display_order: 2 }
          ])
        }
      }

      toast.success(`Payroll processed! ${preview.employeeCount} payslips generated. ✅`)
      setStep(5)
    } catch (error) {
      console.error('Payroll processing error:', error)
      toast.error('Failed to process payroll: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleDownloadReport = () => {
    const csvContent = [
      'Employee,Employee Code,Basic Salary,PAYE,UIF,Net Salary',
      ...preview.employees.map(emp => {
        const basic = emp.payroll_profiles?.[0]?.basic_salary || 0
        return `${emp.first_name} ${emp.last_name},${emp.employee_code},${basic},${(basic * 0.18).toFixed(2)},${Math.min(basic * 0.01, 177.12).toFixed(2)},${(basic - basic * 0.18 - Math.min(basic * 0.01, 177.12)).toFixed(2)}`
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Payroll_Report_${runData.period_start}_${runData.period_end}.csv`
    a.click()
    toast.success('Report downloaded! 📥')
  }

  const handleExportExcel = () => {
    const data = preview.employees.map(emp => {
      const basic = emp.payroll_profiles?.[0]?.basic_salary || 0
      return {
        'Employee': `${emp.first_name} ${emp.last_name}`,
        'Employee Code': emp.employee_code,
        'Basic Salary': basic,
        'PAYE': (basic * 0.18).toFixed(2),
        'UIF': Math.min(basic * 0.01, 177.12).toFixed(2),
        'Net Salary': (basic - basic * 0.18 - Math.min(basic * 0.01, 177.12)).toFixed(2)
      }
    })

    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Payroll_Export_${runData.period_start}.xls`
    a.click()
    toast.success('Excel exported! 📊')
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Calculator className="w-8 h-8 text-emerald-600" />Run Payroll
          </h1>
          <p className="text-slate-500 mt-1">Process payroll for selected employees</p>
        </motion.div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
                step >= s.id ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>
                <s.icon className="w-4 h-4" />
                {s.label}
              </div>
              {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Period */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-4">Step 1: Select Payroll Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-500">Period Start *</label>
                <input type="date" value={runData.period_start} onChange={e => setRunData({...runData, period_start: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-sm text-slate-500">Period End *</label>
                <input type="date" value={runData.period_end} onChange={e => setRunData({...runData, period_end: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-sm text-slate-500">Payment Date *</label>
                <input type="date" value={runData.payment_date} onChange={e => setRunData({...runData, payment_date: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-sm text-slate-500">Run Type</label>
                <select value={runData.run_type} onChange={e => setRunData({...runData, run_type: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="contract">Contract</option>
                  <option value="bonus">Bonus Run</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-slate-500">Notes</label>
                <textarea value={runData.notes} onChange={e => setRunData({...runData, notes: e.target.value})} rows={2} className="w-full p-3 neu-inset rounded-xl mt-1" />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => { if (runData.period_start && runData.period_end && runData.payment_date) setStep(2); else toast.error('Please fill in all date fields') }}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 flex items-center gap-2">
                Next: Select Employees <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Select Employees */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Step 2: Select Employees</h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500">{selectedEmployees.length} of {employees.length} selected</span>
                <button onClick={handleSelectAll} className="text-sm text-emerald-600 hover:underline">
                  {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {employees.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No active employees found</p>
                <p className="text-slate-400 text-sm mt-1">Add employees in the HR module first</p>
                <button onClick={loadEmployees} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">Refresh</button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {employees.map(emp => (
                  <div key={emp.id} onClick={() => handleToggleEmployee(emp.id)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors border ${
                      selectedEmployees.includes(emp.id) ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300' : 'bg-slate-50 dark:bg-slate-700/30 border-transparent hover:bg-slate-100'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedEmployees.includes(emp.id) ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                      }`}>
                        {selectedEmployees.includes(emp.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-slate-500">{emp.employee_code} · {emp.position || 'No position'}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(emp.payroll_profiles?.[0]?.basic_salary || 0)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep(1)} className="px-6 py-3 bg-slate-200 dark:bg-slate-600 rounded-xl font-medium">Back</button>
              <button onClick={handleGeneratePreview} disabled={selectedEmployees.length === 0 || processing}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                {processing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Calculator className="w-4 h-4" />}
                Generate Preview
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && preview && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Users, label: 'Employees', value: preview.employeeCount },
                { icon: TrendingUp, label: 'Total Gross', value: formatCurrency(preview.totalGross) },
                { icon: TrendingDown, label: 'Total Deductions', value: formatCurrency(preview.totalDeductions) },
                { icon: DollarSign, label: 'Total Net', value: formatCurrency(preview.totalNet) },
              ].map(s => (
                <div key={s.label} className="neu-raised rounded-2xl p-4 text-center">
                  <s.icon className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-xl font-semibold mb-4">Payroll Preview</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-2 px-3">Employee</th>
                      <th className="text-right py-2 px-3">Basic</th>
                      <th className="text-right py-2 px-3">PAYE</th>
                      <th className="text-right py-2 px-3">UIF</th>
                      <th className="text-right py-2 px-3">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.employees.map(emp => {
                      const basic = emp.payroll_profiles?.[0]?.basic_salary || 0
                      return (
                        <tr key={emp.id} className="border-b">
                          <td className="py-2 px-3">{emp.first_name} {emp.last_name}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(basic)}</td>
                          <td className="py-2 px-3 text-right text-red-600">-{formatCurrency(basic * 0.18)}</td>
                          <td className="py-2 px-3 text-right text-red-600">-{formatCurrency(Math.min(basic * 0.01, 177.12))}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">{formatCurrency(basic - basic * 0.18 - Math.min(basic * 0.01, 177.12))}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="px-6 py-3 bg-slate-200 rounded-xl font-medium">Back</button>
              <button onClick={handleProcessPayroll} disabled={processing}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                {processing ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Play className="w-5 h-5" />}
                Process Payroll
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 5: Complete */}
        {step === 5 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-8 text-center">
            <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Payroll Processed! 🎉</h2>
            <p className="text-slate-500 mb-6">{preview?.employeeCount || 0} payslips generated</p>
            <div className="flex justify-center gap-4 flex-wrap">
              <button onClick={handleDownloadReport} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2">
                <Download className="w-5 h-5" /> Download CSV
              </button>
              <button onClick={handleExportExcel} className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium flex items-center gap-2">
                <FileText className="w-5 h-5" /> Export Excel
              </button>
              <button onClick={() => navigate('/payroll/payslips')} className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium flex items-center gap-2">
                <FileText className="w-5 h-5" /> View Payslips
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
