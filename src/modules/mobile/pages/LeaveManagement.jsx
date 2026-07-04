import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { Calendar, Plus, Clock, AlertCircle, CheckCircle2, XCircle, ChevronRight, Info } from 'lucide-react'

// SA Leave type configurations (backend logic only - NOT displayed)
const SA_LEAVE_RULES = {
  annual: { minDays: 1, maxDays: 30, requiresAdvanceNotice: true, advanceDays: 7, accruesPerMonth: 1.25 },
  sick: { minDays: 1, maxDays: 2, requiresDoctorNote: true, doctorNoteThreshold: 2, cycleDays: 1095 },
  family_responsibility: { minDays: 1, maxDays: 3, allowedReasons: ['child_sick', 'child_birth', 'family_death'], perYear: 3 },
  maternity: { minDays: 1, maxDays: 120, requiresMedicalCertificate: true, unpaid: false },
  parental: { minDays: 1, maxDays: 10, appliesToFathers: true, appliesToAdoptiveParents: true },
  unpaid: { minDays: 1, maxDays: 90, requiresApproval: true }
}

export default function LeaveManagement() {
  const { user } = useAuthStore()
  const { employee, leaveRequests, leaveTypes, leaveBalances, fetchLeaveRequests, fetchLeaveTypes, fetchLeaveBalances, applyLeave } = useMobileStore()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState(null)
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '', total_days: 0 })
  const [validationError, setValidationError] = useState('')
  const [activeTab, setActiveTab] = useState('balances')

  useEffect(() => {
    if (employee?.id) { fetchLeaveRequests(employee.id); fetchLeaveBalances(employee.id) }
    fetchLeaveTypes()
  }, [employee?.id])

  const calculateDays = (start, end) => {
    if (!start || !end) return 0
    const s = new Date(start), e = new Date(end)
    let count = 0
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const day = d.getDay()
      if (day !== 0 && day !== 6) count++ // Exclude weekends
    }
    return count
  }

  const validateLeave = (typeId, startDate, endDate, days) => {
    if (!typeId || !startDate || !endDate) return 'Please fill all required fields'
    if (days < 1) return 'Leave must be at least 1 working day'
    if (new Date(startDate) < new Date()) return 'Start date cannot be in the past'
    if (new Date(endDate) < new Date(startDate)) return 'End date must be after start date'

    const balance = leaveBalances.find(b => b.leave_type_id === typeId)
    if (balance && days > (balance.remaining_days || balance.total_days || 0)) {
      return `Insufficient balance. You have ${balance.remaining_days || balance.total_days || 0} days available`
    }

    // Check for overlapping requests
    const overlapping = leaveRequests.filter(lr =>
      lr.leave_type_id === typeId &&
      lr.status !== 'rejected' && lr.status !== 'cancelled' &&
      ((new Date(startDate) >= new Date(lr.start_date) && new Date(startDate) <= new Date(lr.end_date)) ||
       (new Date(endDate) >= new Date(lr.start_date) && new Date(endDate) <= new Date(lr.end_date)))
    )
    if (overlapping.length > 0) return 'You already have leave during this period'

    return null
  }

  const handleDateChange = (field, value) => {
    const newForm = { ...form, [field]: value }
    if (newForm.start_date && newForm.end_date) {
      newForm.total_days = calculateDays(newForm.start_date, newForm.end_date)
    }
    setForm(newForm)
    setValidationError('')
  }

  const handleApply = async () => {
    const days = calculateDays(form.start_date, form.end_date)
    const error = validateLeave(form.leave_type_id, form.start_date, form.end_date, days)
    if (error) { setValidationError(error); return }

    const result = await applyLeave({ ...form, employee_id: employee.id, total_days: days, status: 'pending' })
    if (result.error) { toast.error('Failed to apply'); return }

    toast.success('Leave applied successfully!')
    setShowForm(false)
    setSelectedType(null)
    setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '', total_days: 0 })
    fetchLeaveRequests(employee.id)
    fetchLeaveBalances(employee.id)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />
      case 'cancelled': return <XCircle className="w-4 h-4 text-slate-400" />
      default: return <Clock className="w-4 h-4 text-amber-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-emerald-100 text-emerald-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      case 'cancelled': return 'bg-slate-100 text-slate-500'
      default: return 'bg-amber-100 text-amber-700'
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 font-['Inter'] pb-20">
      <div className="bg-blue-600 text-white px-5 pt-8 pb-5">
        <h1 className="text-2xl font-bold">Leave</h1>
        <p className="text-blue-100 text-sm">Apply & track your leave</p>
      </div>

      {/* Tabs */}
      <div className="px-5 mt-4">
        <div className="flex gap-2 bg-white rounded-2xl p-1 shadow-sm">
          <button onClick={() => setActiveTab('balances')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${activeTab === 'balances' ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>Balances</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${activeTab === 'history' ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>History</button>
        </div>
      </div>

      {activeTab === 'balances' && (
        <>
          {/* Balances */}
          <div className="px-5 mt-3">
            <div className="grid grid-cols-2 gap-2">
              {leaveBalances.length === 0 && (
                <div className="col-span-2 text-center py-8"><Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" /><p className="text-slate-500">No leave balances available</p></div>
              )}
              {leaveBalances.map(b => (
                <div key={b.id} className="bg-white rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-slate-500">{b.leave_types?.name || 'Leave'}</p>
                  <p className="text-2xl font-bold text-slate-800">{b.remaining_days ?? b.total_days ?? 0}</p>
                  <p className="text-[10px] text-slate-400">days remaining</p>
                </div>
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <div className="px-5 mt-4">
            <button onClick={() => { setShowForm(true); setValidationError('') }}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md">
              <Plus className="w-5 h-5" /> Apply for Leave
            </button>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="px-5 mt-3">
          {leaveRequests.length === 0 && (
            <div className="text-center py-8"><Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" /><p className="text-slate-500">No leave requests yet</p></div>
          )}
          {leaveRequests.map(lr => (
            <div key={lr.id} className="bg-white rounded-xl p-3 shadow-sm mb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {getStatusIcon(lr.status)}
                  <div>
                    <p className="font-medium text-sm">{lr.leave_types?.name || 'Leave'}</p>
                    <p className="text-xs text-slate-500">{lr.start_date} → {lr.end_date} · {lr.total_days} working days</p>
                    {lr.reason && <p className="text-xs text-slate-400 mt-0.5">{lr.reason.slice(0, 60)}</p>}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(lr.status)}`}>{lr.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply Leave Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={() => { setShowForm(false); setSelectedType(null); setValidationError('') }}>
          <div className="bg-white rounded-t-3xl p-5 w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Apply for Leave</h3>
            <p className="text-xs text-slate-500 mb-3">Select leave type and dates</p>

            {validationError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{validationError}
              </div>
            )}

            {/* Leave Type Selection */}
            <div className="space-y-2 mb-3">
              {leaveTypes.map(type => (
                <button key={type.id} onClick={() => { setSelectedType(type); setForm({ ...form, leave_type_id: type.id }); setValidationError('') }}
                  className={`w-full p-3 rounded-xl border text-left flex justify-between items-center ${form.leave_type_id === type.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                  <div>
                    <p className="font-medium text-sm text-slate-800">{type.name}</p>
                    <p className="text-xs text-slate-500">{type.days_per_year} days per year</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${form.leave_type_id === type.id ? 'text-blue-500' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>

            {/* Date Selection */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs text-slate-500">Start Date *</label>
                <input type="date" value={form.start_date} onChange={e => handleDateChange('start_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]} className="w-full p-2 border rounded-lg text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-slate-500">End Date *</label>
                <input type="date" value={form.end_date} onChange={e => handleDateChange('end_date', e.target.value)}
                  min={form.start_date || new Date().toISOString().split('T')[0]} className="w-full p-2 border rounded-lg text-sm mt-1" />
              </div>
            </div>
            {form.total_days > 0 && (
              <p className="text-xs text-blue-600 mb-2">📅 {form.total_days} working day{form.total_days > 1 ? 's' : ''}</p>
            )}

            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder="Reason for leave (optional)" rows={2} className="w-full p-2 border rounded-lg mb-3 text-sm" />

            <div className="flex gap-2">
              <button onClick={() => { setShowForm(false); setSelectedType(null); setValidationError('') }}
                className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold">Cancel</button>
              <button onClick={handleApply} disabled={!form.leave_type_id || !form.start_date || !form.end_date}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">Submit</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="leave" />
    </div>
  )
}
