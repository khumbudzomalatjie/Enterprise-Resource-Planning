import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  User, TrendingUp, TrendingDown, FileText, Save, Plus, Trash2,
  ArrowLeft, ChevronRight, Sun, Moon, Sparkles,
  Briefcase, Mail, Phone
} from 'lucide-react'

export default function EmployeePayrollDetail() {
  const { id } = useParams()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState(null)
  const [payrollProfile, setPayrollProfile] = useState(null)
  const [earnings, setEarnings] = useState([])
  const [deductions, setDeductions] = useState([])
  const [earningTypes, setEarningTypes] = useState([])
  const [deductionTypes, setDeductionTypes] = useState([])
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [editingProfile, setEditingProfile] = useState(false)
  const [showAddEarning, setShowAddEarning] = useState(false)
  const [showAddDeduction, setShowAddDeduction] = useState(false)
  
  const [profileForm, setProfileForm] = useState({
    basic_salary: '',
    bank_name: '',
    bank_account_number: '',
    bank_branch_code: '',
    bank_account_type: 'cheque',
    tax_number: '',
    uif_number: '',
    payment_method: 'eft'
  })

  const [newEarning, setNewEarning] = useState({ earning_type_id: '', amount: '' })
  const [newDeduction, setNewDeduction] = useState({ deduction_type_id: '', amount: '' })

  useEffect(() => { loadAllData() }, [id])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const { data: emp } = await supabase.from('employees').select('*').eq('id', id).single()
      setEmployee(emp)

      const { data: profile } = await supabase.from('payroll_profiles').select('*').eq('employee_id', id).single()
      setPayrollProfile(profile)
      if (profile) {
        setProfileForm({
          basic_salary: profile.basic_salary || '',
          bank_name: profile.bank_name || '',
          bank_account_number: profile.bank_account_number || '',
          bank_branch_code: profile.bank_branch_code || '',
          bank_account_type: profile.bank_account_type || 'cheque',
          tax_number: profile.tax_number || '',
          uif_number: profile.uif_number || '',
          payment_method: profile.payment_method || 'eft'
        })
      }

      if (profile) {
        const { data: earn } = await supabase.from('employee_earnings').select('*, earning_types(name)').eq('payroll_profile_id', profile.id)
        setEarnings(earn || [])
        const { data: deduct } = await supabase.from('employee_deductions').select('*, deduction_types(name)').eq('payroll_profile_id', profile.id)
        setDeductions(deduct || [])
      }

      const { data: eTypes } = await supabase.from('earning_types').select('*').eq('is_active', true).order('display_order')
      setEarningTypes(eTypes || [])
      const { data: dTypes } = await supabase.from('deduction_types').select('*').eq('is_active', true).order('display_order')
      setDeductionTypes(dTypes || [])

      const { data: slips } = await supabase.from('payslips').select('*, payroll_runs(period_start, period_end, payment_date)').eq('employee_id', id).order('created_at', { ascending: false }).limit(12)
      setPayslips(slips || [])
    } catch (error) { console.error('Error:', error) }
    setLoading(false)
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  const handleSaveProfile = async () => {
    if (!profileForm.basic_salary || !profileForm.bank_name || !profileForm.bank_account_number) {
      toast.error('Basic salary and banking details are required'); return
    }
    try {
      if (payrollProfile) {
        await supabase.from('payroll_profiles').update(profileForm).eq('id', payrollProfile.id)
      } else {
        await supabase.from('payroll_profiles').insert([{ ...profileForm, employee_id: id }])
      }
      toast.success('Profile saved!')
      setEditingProfile(false)
      loadAllData()
    } catch (error) { toast.error('Failed to save profile') }
  }

  const handleAddEarning = async () => {
    if (!newEarning.earning_type_id || !newEarning.amount) { toast.error('Please fill all fields'); return }
    try {
      await supabase.from('employee_earnings').insert([{ payroll_profile_id: payrollProfile.id, earning_type_id: newEarning.earning_type_id, amount: parseFloat(newEarning.amount) }])
      toast.success('Earning added!')
      setShowAddEarning(false); setNewEarning({ earning_type_id: '', amount: '' }); loadAllData()
    } catch (error) { toast.error('Failed to add earning') }
  }

  const handleAddDeduction = async () => {
    if (!newDeduction.deduction_type_id || !newDeduction.amount) { toast.error('Please fill all fields'); return }
    try {
      await supabase.from('employee_deductions').insert([{ payroll_profile_id: payrollProfile.id, deduction_type_id: newDeduction.deduction_type_id, amount: parseFloat(newDeduction.amount) }])
      toast.success('Deduction added!')
      setShowAddDeduction(false); setNewDeduction({ deduction_type_id: '', amount: '' }); loadAllData()
    } catch (error) { toast.error('Failed to add deduction') }
  }

  const handleDeleteEarning = async (earningId) => {
    if (window.confirm('Delete this earning?')) { await supabase.from('employee_earnings').delete().eq('id', earningId); toast.success('Deleted'); loadAllData() }
  }

  const handleDeleteDeduction = async (deductionId) => {
    if (window.confirm('Delete this deduction?')) { await supabase.from('employee_deductions').delete().eq('id', deductionId); toast.success('Deleted'); loadAllData() }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>
  if (!employee) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">Employee not found</p></div>

  const tabs = [
    { id: 'profile', label: 'Payroll Profile', icon: User },
    { id: 'earnings', label: 'Earnings', icon: TrendingUp },
    { id: 'deductions', label: 'Deductions', icon: TrendingDown },
    { id: 'payslips', label: 'Payslip History', icon: FileText },
  ]

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
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/payroll" className="text-slate-500 hover:text-emerald-600">Payroll</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/payroll/employees" className="text-slate-500 hover:text-emerald-600">Employees</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{employee.first_name} {employee.last_name}</span>
        </div>

        <div className="neu-raised rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <span className="text-emerald-600 text-2xl font-bold">{employee.first_name?.[0]}{employee.last_name?.[0]}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{employee.first_name} {employee.last_name}</h1>
            <div className="flex gap-4 text-sm text-slate-500 mt-1 flex-wrap">
              <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{employee.employee_code}</span>
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{employee.email}</span>
              {employee.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{employee.phone}</span>}
            </div>
          </div>
          {!payrollProfile && (
            <button onClick={() => setEditingProfile(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm">Create Profile</button>
          )}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}><tab.icon className="w-4 h-4" />{tab.label}</button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Payroll Profile</h2>
              {payrollProfile && !editingProfile && <button onClick={() => setEditingProfile(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">Edit</button>}
            </div>
            {editingProfile || !payrollProfile ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-sm text-slate-500">Basic Salary *</label><input type="number" step="0.01" value={profileForm.basic_salary} onChange={e => setProfileForm({...profileForm, basic_salary: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" /></div>
                  <div><label className="text-sm text-slate-500">Payment Method</label><select value={profileForm.payment_method} onChange={e => setProfileForm({...profileForm, payment_method: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1"><option value="eft">EFT</option><option value="cash">Cash</option><option value="cheque">Cheque</option></select></div>
                  <div><label className="text-sm text-slate-500">Bank Name *</label><input type="text" value={profileForm.bank_name} onChange={e => setProfileForm({...profileForm, bank_name: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" /></div>
                  <div><label className="text-sm text-slate-500">Account Number *</label><input type="text" value={profileForm.bank_account_number} onChange={e => setProfileForm({...profileForm, bank_account_number: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" /></div>
                  <div><label className="text-sm text-slate-500">Branch Code</label><input type="text" value={profileForm.bank_branch_code} onChange={e => setProfileForm({...profileForm, bank_branch_code: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" /></div>
                  <div><label className="text-sm text-slate-500">Account Type</label><select value={profileForm.bank_account_type} onChange={e => setProfileForm({...profileForm, bank_account_type: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1"><option value="cheque">Cheque</option><option value="savings">Savings</option><option value="transmission">Transmission</option></select></div>
                  <div><label className="text-sm text-slate-500">Tax Number</label><input type="text" value={profileForm.tax_number} onChange={e => setProfileForm({...profileForm, tax_number: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" /></div>
                  <div><label className="text-sm text-slate-500">UIF Number</label><input type="text" value={profileForm.uif_number} onChange={e => setProfileForm({...profileForm, uif_number: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" /></div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setEditingProfile(false); loadAllData() }} className="px-4 py-2 bg-slate-300 rounded-xl">Cancel</button>
                  <button onClick={handleSaveProfile} className="px-6 py-2 bg-emerald-600 text-white rounded-xl flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['Basic Salary', formatCurrency(payrollProfile.basic_salary), 'text-emerald-600 font-bold'],
                  ['Payment Method', payrollProfile.payment_method?.toUpperCase()],
                  ['Tax Number', payrollProfile.tax_number || 'N/A'],
                  ['UIF Number', payrollProfile.uif_number || 'N/A'],
                  ['Bank', payrollProfile.bank_name],
                  ['Account', '****' + (payrollProfile.bank_account_number?.slice(-4) || '')],
                  ['Branch', payrollProfile.bank_branch_code || 'N/A'],
                  ['Account Type', payrollProfile.bank_account_type],
                ].map(([label, value, className]) => (
                  <div key={label} className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                    <span className="text-slate-500 text-sm">{label}</span>
                    <span className={`text-sm ${className || ''}`}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-600" />Earnings ({earnings.length})</h2>
              <button onClick={() => setShowAddEarning(!showAddEarning)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button>
            </div>
            {showAddEarning && (
              <div className="flex gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                <select value={newEarning.earning_type_id} onChange={e => setNewEarning({...newEarning, earning_type_id: e.target.value})} className="flex-1 p-2 neu-inset rounded-lg text-sm">
                  <option value="">Select Type</option>
                  {earningTypes.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                </select>
                <input type="number" step="0.01" value={newEarning.amount} onChange={e => setNewEarning({...newEarning, amount: e.target.value})} placeholder="Amount" className="w-32 p-2 neu-inset rounded-lg text-sm" />
                <button onClick={handleAddEarning} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">Add</button>
              </div>
            )}
            <div className="space-y-2">
              {earnings.map(e => (
                <div key={e.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                  <div><p className="font-medium text-sm">{e.earning_types?.name || 'Earning'}</p></div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-600">{formatCurrency(e.amount)}</span>
                    <button onClick={() => handleDeleteEarning(e.id)} className="p-1 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              {earnings.length === 0 && <p className="text-center text-slate-400 py-4">No earnings configured</p>}
            </div>
          </div>
        )}

        {activeTab === 'deductions' && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-600" />Deductions ({deductions.length})</h2>
              <button onClick={() => setShowAddDeduction(!showAddDeduction)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button>
            </div>
            {showAddDeduction && (
              <div className="flex gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                <select value={newDeduction.deduction_type_id} onChange={e => setNewDeduction({...newDeduction, deduction_type_id: e.target.value})} className="flex-1 p-2 neu-inset rounded-lg text-sm">
                  <option value="">Select Type</option>
                  {deductionTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
                </select>
                <input type="number" step="0.01" value={newDeduction.amount} onChange={e => setNewDeduction({...newDeduction, amount: e.target.value})} placeholder="Amount" className="w-32 p-2 neu-inset rounded-lg text-sm" />
                <button onClick={handleAddDeduction} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Add</button>
              </div>
            )}
            <div className="space-y-2">
              {deductions.map(d => (
                <div key={d.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                  <div><p className="font-medium text-sm">{d.deduction_types?.name || 'Deduction'}</p></div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-red-600">-{formatCurrency(d.amount)}</span>
                    <button onClick={() => handleDeleteDeduction(d.id)} className="p-1 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              {deductions.length === 0 && <p className="text-center text-slate-400 py-4">No deductions configured</p>}
            </div>
          </div>
        )}

        {activeTab === 'payslips' && (
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" />Payslip History ({payslips.length})</h2>
            {payslips.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-slate-50 dark:bg-slate-700/30"><th className="text-left py-2 px-3">Payslip #</th><th className="text-left py-2 px-3">Period</th><th className="text-right py-2 px-3">Gross</th><th className="text-right py-2 px-3">Net</th><th className="text-center py-2 px-3">Status</th><th className="text-center py-2 px-3">Action</th></tr></thead>
                  <tbody>
                    {payslips.map(ps => (
                      <tr key={ps.id} className="border-b hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-xs">{ps.payslip_number}</td>
                        <td className="py-2 px-3 text-xs">{formatDate(ps.payroll_runs?.period_start)} - {formatDate(ps.payroll_runs?.period_end)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(ps.total_earnings)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">{formatCurrency(ps.net_salary)}</td>
                        <td className="py-2 px-3 text-center"><span className={`px-2 py-1 rounded-full text-xs ${ps.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{ps.status}</span></td>
                        <td className="py-2 px-3 text-center"><button onClick={() => navigate(`/payroll/payslips/${ps.id}`)} className="text-blue-600 hover:underline text-xs">View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-center text-slate-400 py-8">No payslips yet</p>}
          </div>
        )}
      </main>
    </div>
  )
}
