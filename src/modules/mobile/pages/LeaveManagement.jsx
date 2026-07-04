import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { Calendar, Plus, Clock, AlertCircle, CheckCircle2, XCircle, ChevronRight, Calculator, Minus, Info } from 'lucide-react'

// SA Leave rules for calculations
const SA_LEAVE_CALCULATOR = {
  annual: {
    name: 'Annual Leave',
    accruesPerMonth: 1.25,
    maxDaysPerYear: 21,
    minDaysPerRequest: 1,
    maxDaysPerRequest: 30,
    requiresAdvanceNotice: true,
    advanceDays: 7,
    carriesOver: true,
    maxCarryOver: 0,
    description: '21 consecutive days per year or 1 day for every 17 days worked'
  },
  sick: {
    name: 'Sick Leave',
    daysPer36MonthCycle: 30,
    minDaysPerRequest: 1,
    maxDaysPerRequest: 2,
    requiresDoctorNote: true,
    doctorNoteThreshold: 2,
    description: '30 days per 36-month cycle. Doctor note required for 2+ consecutive days'
  },
  family_responsibility: {
    name: 'Family Responsibility Leave',
    maxDaysPerYear: 3,
    minDaysPerRequest: 1,
    maxDaysPerRequest: 3,
    allowedReasons: ['child_sick', 'child_birth', 'family_death'],
    description: '3 days per year for family emergencies'
  },
  maternity: {
    name: 'Maternity Leave',
    maxDaysPerPregnancy: 120,
    minDaysBeforeBirth: 28,
    maxDaysPerRequest: 120,
    requiresMedicalCertificate: true,
    description: '4 consecutive months. Start 4 weeks before expected birth'
  },
  parental: {
    name: 'Parental Leave',
    maxDaysPerChild: 10,
    minDaysPerRequest: 1,
    maxDaysPerRequest: 10,
    description: '10 consecutive days for fathers and adoptive parents'
  },
  unpaid: {
    name: 'Unpaid Leave',
    maxDaysPerYear: 90,
    minDaysPerRequest: 1,
    maxDaysPerRequest: 90,
    description: 'Unpaid leave subject to employer approval'
  }
}

export default function LeaveManagement() {
  const { user } = useAuthStore()
  const { employee, leaveRequests, leaveTypes, leaveBalances, fetchLeaveRequests, fetchLeaveTypes, fetchLeaveBalances, applyLeave } = useMobileStore()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '', total_days: 0 })
  const [validationError, setValidationError] = useState('')
  const [activeTab, setActiveTab] = useState('apply')
  const [showCalculator, setShowCalculator] = useState(false)

  useEffect(() => {
    if (employee?.id) {
      fetchLeaveRequests(employee.id)
      fetchLeaveBalances(employee.id)
    }
    fetchLeaveTypes()
  }, [employee?.id])

  // ============================================
  // LEAVE CALCULATOR - SA Labour Law Compliant
  // ============================================
  const calculateWorkingDays = (start, end) => {
    if (!start || !end) return 0
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    let count = 0
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const day = d.getDay()
      if (day !== 0 && day !== 6) count++ // Exclude weekends
    }
    return count
  }

  const getPublicHolidaysInRange = (start, end) => {
    // SA Public Holidays
    const holidays = [
      '2026-01-01', '2026-03-21', '2026-04-03', '2026-04-06',
      '2026-04-27', '2026-05-01', '2026-06-16', '2026-08-09',
      '2026-09-24', '2026-12-16', '2026-12-25', '2026-12-26'
    ]
    if (!start || !end) return 0
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    return holidays.filter(h => {
      const d = new Date(h + 'T00:00:00')
      return d >= s && d <= e && d.getDay() !== 0 && d.getDay() !== 6
    }).length
  }

  const calculateLeaveDays = (typeId, startDate, endDate) => {
    const workingDays = calculateWorkingDays(startDate, endDate)
    const publicHolidays = getPublicHolidaysInRange(startDate, endDate)
    const netDays = workingDays - publicHolidays
    return {
      workingDays,
      publicHolidays,
      netDays: Math.max(netDays, 0)
    }
  }

  const getLeaveBalance = (typeId) => {
    const balance = leaveBalances.find(b => b.leave_type_id === typeId)
    if (!balance) return { total: 0, used: 0, remaining: 0 }
    return {
      total: balance.total_days || 0,
      used: balance.used_days || 0,
      pending: balance.pending_days || 0,
      remaining: balance.remaining_days ?? (balance.total_days - balance.used_days - (balance.pending_days || 0))
    }
  }

  const canApplyForLeave = (typeId, days) => {
    const balance = getLeaveBalance(typeId)
    if (days > balance.remaining) {
      return { allowed: false, reason: `Insufficient balance. You have ${balance.remaining} day${balance.remaining !== 1 ? 's' : ''} remaining.` }
    }
    return { allowed: true, reason: null }
  }

  const validateLeave = (typeId, startDate, endDate, days) => {
    if (!typeId) return 'Please select a leave type'
    if (!startDate || !endDate) return 'Please select start and end dates'
    if (new Date(startDate) < new Date(new Date().toISOString().split('T')[0])) return 'Start date cannot be in the past'
    if (new Date(endDate) < new Date(startDate)) return 'End date must be after start date'
    if (days < 1) return 'Leave must be at least 1 working day'

    const eligibility = canApplyForLeave(typeId, days)
    if (!eligibility.allowed) return eligibility.reason

    // Check overlapping requests
    const overlapping = leaveRequests.filter(lr =>
      lr.status !== 'rejected' && lr.status !== 'cancelled' &&
      ((new Date(startDate) >= new Date(lr.start_date) && new Date(startDate) <= new Date(lr.end_date)) ||
       (new Date(endDate) >= new Date(lr.start_date) && new Date(endDate) <= new Date(lr.end_date)) ||
       (new Date(startDate) <= new Date(lr.start_date) && new Date(endDate) >= new Date(lr.end_date)))
    )
    if (overlapping.length > 0) return 'You already have leave during this period'

    return null
  }

  const handleDateChange = (field, value) => {
    const newForm = { ...form, [field]: value }
    if (newForm.start_date && newForm.end_date && newForm.leave_type_id) {
      const calc = calculateLeaveDays(newForm.leave_type_id, newForm.start_date, newForm.end_date)
      newForm.total_days = calc.netDays
    }
    setForm(newForm)
    setValidationError('')
  }

  const handleTypeSelect = (typeId) => {
    const newForm = { ...form, leave_type_id: typeId }
    if (newForm.start_date && newForm.end_date) {
      const calc = calculateLeaveDays(typeId, newForm.start_date, newForm.end_date)
      newForm.total_days = calc.netDays
    }
    setForm(newForm)
    setValidationError('')
  }

  const handleApply = async () => {
    const calc = calculateLeaveDays(form.leave_type_id, form.start_date, form.end_date)
    const error = validateLeave(form.leave_type_id, form.start_date, form.end_date, calc.netDays)
    if (error) { setValidationError(error); return }

    const result = await applyLeave({
      ...form,
      employee_id: employee.id,
      total_days: calc.netDays,
      status: 'pending'
    })
    if (result.error) { toast.error('Failed to apply'); return }

    toast.success('Leave applied successfully!')
    setShowForm(false)
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

  // Get calculated preview when dates change
  const calculationPreview = form.start_date && form.end_date && form.leave_type_id
    ? calculateLeaveDays(form.leave_type_id, form.start_date, form.end_date)
    : null

  const selectedBalance = form.leave_type_id ? getLeaveBalance(form.leave_type_id) : null

  return (
    <div className="min-h-screen bg-slate-100 font-['Inter'] pb-20">
      <div className="bg-blue-600 text-white px-5 pt-8 pb-5">
        <h1 className="text-2xl font-bold">Leave</h1>
        <p className="text-blue-100 text-sm">Apply & track your leave</p>
      </div>

      {/* Tabs */}
      <div className="px-5 mt-4">
        <div className="flex gap-2 bg-white rounded-2xl p-1 shadow-sm">
          <button onClick={() => setActiveTab('apply')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${activeTab === 'apply' ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>Apply</button>
          <button onClick={() => setActiveTab('balances')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${activeTab === 'balances' ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>Balances</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${activeTab === 'history' ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>History</button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>

        {/* APPLY TAB */}
        {activeTab === 'apply' && (
          <div className="px-5 mt-3 pb-4">
            {/* All Balances Overview */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-slate-700 text-sm">Leave Balances</h3>
                <button onClick={() => setShowCalculator(!showCalculator)} className="text-blue-500 text-xs flex items-center gap-1">
                  <Calculator className="w-3 h-3" /> {showCalculator ? 'Hide' : 'Calculator'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {leaveBalances.length === 0 && (
                  <p className="col-span-2 text-xs text-slate-400 text-center py-4">No balances available</p>
                )}
                {leaveBalances.map(b => (
                  <div key={b.id} className={`p-2 rounded-lg border ${form.leave_type_id === b.leave_type_id ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}>
                    <p className="text-[11px] text-slate-500">{b.leave_types?.name || 'Leave'}</p>
                    <p className="text-lg font-bold text-slate-800">{b.remaining_days ?? (b.total_days - (b.used_days || 0))}</p>
                    <p className="text-[10px] text-slate-400">of {b.total_days} days</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculator Info */}
            {showCalculator && (
              <div className="bg-amber-50 rounded-2xl p-4 mb-3 border border-amber-200">
                <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1"><Info className="w-4 h-4" /> SA Leave Calculator</h4>
                <div className="space-y-2 text-xs text-amber-700">
                  <p>📅 <strong>Annual Leave:</strong> 21 days/year (1.25 days/month accrued)</p>
                  <p>🏥 <strong>Sick Leave:</strong> 30 days per 36-month cycle</p>
                  <p>👨‍👩‍👧 <strong>Family Resp:</strong> 3 days/year</p>
                  <p>🤰 <strong>Maternity:</strong> 4 consecutive months (120 days)</p>
                  <p>👶 <strong>Parental:</strong> 10 consecutive days</p>
                  <p>📋 <strong>Weekends & Public Holidays</strong> excluded from calculation</p>
                </div>
              </div>
            )}

            {/* Quick Apply Form */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="font-semibold text-slate-700 text-sm mb-3">Apply for Leave</h3>

              {validationError && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{validationError}
                </div>
              )}

              {/* Leave Type */}
              <label className="text-xs text-slate-500">Leave Type *</label>
              <div className="space-y-1.5 mt-1 mb-3">
                {leaveTypes.map(type => {
                  const balance = getLeaveBalance(type.id)
                  return (
                    <button key={type.id} onClick={() => handleTypeSelect(type.id)}
                      className={`w-full p-2.5 rounded-lg border text-left flex justify-between items-center ${form.leave_type_id === type.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                      <div>
                        <p className="font-medium text-xs text-slate-800">{type.name}</p>
                        <p className="text-[10px] text-slate-500">{type.days_per_year} days/year</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${balance.remaining > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {balance.remaining}
                        </p>
                        <p className="text-[10px] text-slate-400">remaining</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-xs text-slate-500">Start Date *</label>
                  <input type="date" value={form.start_date} onChange={e => handleDateChange('start_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]} className="w-full p-2 border rounded-lg text-xs mt-1" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">End Date *</label>
                  <input type="date" value={form.end_date} onChange={e => handleDateChange('end_date', e.target.value)}
                    min={form.start_date || new Date().toISOString().split('T')[0]} className="w-full p-2 border rounded-lg text-xs mt-1" />
                </div>
              </div>

              {/* Calculation Preview */}
              {calculationPreview && (
                <div className="bg-slate-50 rounded-lg p-2.5 mb-2 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500">Working days:</span>
                    <span className="font-medium">{calculationPreview.workingDays}</span>
                  </div>
                  {calculationPreview.publicHolidays > 0 && (
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500">Public holidays:</span>
                      <span className="font-medium text-amber-600">-{calculationPreview.publicHolidays}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="font-semibold">Leave days required:</span>
                    <span className="font-bold text-blue-600">{calculationPreview.netDays} day{calculationPreview.netDays !== 1 ? 's' : ''}</span>
                  </div>
                  {selectedBalance && (
                    <div className="flex justify-between mt-1">
                      <span className="text-slate-500">Balance after:</span>
                      <span className={`font-medium ${selectedBalance.remaining - calculationPreview.netDays >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {selectedBalance.remaining - calculationPreview.netDays} day{selectedBalance.remaining - calculationPreview.netDays !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="Reason for leave (optional)" rows={2} className="w-full p-2 border rounded-lg mb-3 text-xs" />

              <button onClick={handleApply} disabled={!form.leave_type_id || !form.start_date || !form.end_date}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">
                Submit Leave Application
              </button>
            </div>
          </div>
        )}

        {/* BALANCES TAB */}
        {activeTab === 'balances' && (
          <div className="px-5 mt-3 pb-4">
            <div className="space-y-2">
              {leaveBalances.length === 0 && (
                <div className="text-center py-8"><Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" /><p className="text-slate-500 text-sm">No leave balances</p></div>
              )}
              {leaveBalances.map(b => {
                const remaining = b.remaining_days ?? (b.total_days - (b.used_days || 0) - (b.pending_days || 0))
                const usedPercent = ((b.used_days || 0) / b.total_days) * 100
                return (
                  <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-slate-800">{b.leave_types?.name || 'Leave'}</p>
                        <p className="text-xs text-slate-500">{b.total_days} days per year</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{remaining}</p>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${usedPercent > 80 ? 'bg-red-500' : usedPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(usedPercent, 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                      <span>Used: {b.used_days || 0}</span>
                      <span>Remaining: {remaining}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="px-5 mt-3 pb-4">
            {leaveRequests.length === 0 && (
              <div className="text-center py-8"><Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" /><p className="text-slate-500 text-sm">No leave requests yet</p></div>
            )}
            {leaveRequests.map(lr => (
              <div key={lr.id} className="bg-white rounded-xl p-3 shadow-sm mb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(lr.status)}
                    <div>
                      <p className="font-medium text-sm">{lr.leave_types?.name || 'Leave'}</p>
                      <p className="text-xs text-slate-500">{lr.start_date} → {lr.end_date}</p>
                      <p className="text-[10px] text-slate-400">{lr.total_days} working day{lr.total_days !== 1 ? 's' : ''} · Applied {new Date(lr.created_at).toLocaleDateString()}</p>
                      {lr.reason && <p className="text-[10px] text-slate-400 mt-0.5 italic">"{lr.reason.slice(0, 50)}{lr.reason.length > 50 ? '...' : ''}"</p>}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(lr.status)}`}>{lr.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="leave" />
    </div>
  )
}
