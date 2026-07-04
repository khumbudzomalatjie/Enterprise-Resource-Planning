import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { 
  Calendar, Plus, Clock, AlertCircle, CheckCircle2, XCircle, 
  ChevronRight, Info, Umbrella, Stethoscope, Users, Baby, 
  UserPlus, Briefcase, Calculator, X, RefreshCw, ArrowLeft
} from 'lucide-react'

// ============================================
// SOUTH AFRICAN PUBLIC HOLIDAYS 2025
// ============================================
const SA_PUBLIC_HOLIDAYS_2025 = [
  '2025-01-01', '2025-03-21', '2025-04-18', '2025-04-21',
  '2025-04-27', '2025-05-01', '2025-06-16', '2025-08-09',
  '2025-09-24', '2025-12-16', '2025-12-25', '2025-12-26',
]

// ============================================
// SA LEAVE CONFIGURATION
// ============================================
const LEAVE_CONFIG = {
  annual: { name: 'Annual Leave', icon: Umbrella, color: 'text-emerald-600', bg: 'bg-emerald-50', barColor: 'bg-emerald-500', daysPerYear: 21, accruesPerMonth: 1.75 },
  sick: { name: 'Sick Leave', icon: Stethoscope, color: 'text-red-600', bg: 'bg-red-50', barColor: 'bg-red-500', daysPerCycle: 30, cycleMonths: 36, maxPerOccurrence: 2 },
  family_responsibility: { name: 'Family Responsibility', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', barColor: 'bg-purple-500', daysPerYear: 3, maxPerOccurrence: 3 },
  maternity: { name: 'Maternity Leave', icon: Baby, color: 'text-pink-600', bg: 'bg-pink-50', barColor: 'bg-pink-500', daysTotal: 120 },
  parental: { name: 'Parental Leave', icon: UserPlus, color: 'text-indigo-600', bg: 'bg-indigo-50', barColor: 'bg-indigo-500', daysTotal: 10 },
  unpaid: { name: 'Unpaid Leave', icon: Briefcase, color: 'text-slate-600', bg: 'bg-slate-50', barColor: 'bg-slate-500', daysPerYear: 90, maxPerRequest: 30 }
}

export default function LeaveManagement() {
  const { user } = useAuthStore()
  const { employee, leaveRequests, leaveTypes, leaveBalances, fetchLeaveRequests, fetchLeaveTypes, fetchLeaveBalances, applyLeave } = useMobileStore()
  const navigate = useNavigate()
  
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
  const [calculatedDays, setCalculatedDays] = useState(0)
  const [validationError, setValidationError] = useState('')
  const [validationWarnings, setValidationWarnings] = useState([])
  const [activeTab, setActiveTab] = useState('balances')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (employee?.id) { loadData() }
    fetchLeaveTypes()
  }, [employee?.id])

  const loadData = async () => {
    await Promise.all([fetchLeaveRequests(employee.id), fetchLeaveBalances(employee.id)])
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
    toast.success('Refreshed!')
  }

  // ============================================
  // LEAVE CALCULATOR
  // ============================================
  const isWeekend = (date) => { const d = new Date(date); return d.getDay() === 0 || d.getDay() === 6 }
  const isPublicHoliday = (date) => SA_PUBLIC_HOLIDAYS_2025.includes(date)
  const isWorkingDay = (date) => !isWeekend(date) && !isPublicHoliday(date)

  const calculateWorkingDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate), end = new Date(endDate)
    let count = 0
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (isWorkingDay(d.toISOString().split('T')[0])) count++
    }
    return count
  }

  const getLeaveBreakdown = (startDate, endDate) => {
    if (!startDate || !endDate) return { workingDays: 0, weekends: 0, holidays: 0, totalCalendar: 0 }
    const start = new Date(startDate), end = new Date(endDate)
    let workingDays = 0, weekends = 0, holidays = 0
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().split('T')[0]
      if (isPublicHoliday(ds)) holidays++
      else if (isWeekend(ds)) weekends++
      else workingDays++
    }
    return { workingDays, weekends, holidays, totalCalendar: Math.ceil((end - start) / 86400000) + 1 }
  }

  const getBalanceForType = (typeId) => leaveBalances.find(b => b.leave_type_id === typeId) || null

  const validateLeaveRequest = (typeId, startDate, endDate) => {
    const errors = [], warnings = []
    const days = calculateWorkingDays(startDate, endDate)
    if (!typeId) return { errors: ['Select a leave type'], warnings: [], days: 0 }
    if (!startDate) return { errors: ['Select start date'], warnings: [], days: 0 }
    if (!endDate) return { errors: ['Select end date'], warnings: [], days: 0 }
    if (new Date(startDate) < new Date(new Date().toISOString().split('T')[0])) errors.push('Start date cannot be in the past')
    if (new Date(endDate) < new Date(startDate)) errors.push('End date must be after start date')
    if (days < 1) errors.push('No working days in selected period')
    const balance = getBalanceForType(typeId)
    if (balance) {
      const available = balance.remaining_days ?? (balance.total_days - (balance.used_days || 0))
      if (days > available) errors.push(`Insufficient balance. ${Math.floor(available)} day(s) available`)
      if (days > available * 0.8) warnings.push(`Uses ${Math.round((days / available) * 100)}% of remaining balance`)
    }
    const overlapping = leaveRequests.filter(lr => lr.status !== 'rejected' && lr.status !== 'cancelled' &&
      ((new Date(startDate) >= new Date(lr.start_date) && new Date(startDate) <= new Date(lr.end_date)) ||
       (new Date(endDate) >= new Date(lr.start_date) && new Date(endDate) <= new Date(lr.end_date)) ||
       (new Date(startDate) <= new Date(lr.start_date) && new Date(endDate) >= new Date(lr.end_date))))
    if (overlapping.length > 0) errors.push('Already have leave during this period')
    return { errors, warnings, days }
  }

  const handleDateChange = (field, value) => {
    const newForm = { ...form, [field]: value }
    setForm(newForm)
    if (newForm.start_date && newForm.end_date) {
      const days = calculateWorkingDays(newForm.start_date, newForm.end_date)
      setCalculatedDays(days)
      const { errors, warnings } = validateLeaveRequest(newForm.leave_type_id, newForm.start_date, newForm.end_date)
      setValidationError(errors[0] || '')
      setValidationWarnings(warnings)
    }
  }

  const handleTypeChange = (typeId) => {
    const newForm = { ...form, leave_type_id: typeId }
    setForm(newForm)
    if (newForm.start_date && newForm.end_date && typeId) {
      const days = calculateWorkingDays(newForm.start_date, newForm.end_date)
      setCalculatedDays(days)
      const { errors, warnings } = validateLeaveRequest(typeId, newForm.start_date, newForm.end_date)
      setValidationError(errors[0] || '')
      setValidationWarnings(warnings)
    }
  }

  const handleApply = async () => {
    const { errors, days } = validateLeaveRequest(form.leave_type_id, form.start_date, form.end_date)
    if (errors.length > 0) { setValidationError(errors[0]); return }
    if (days < 1) { setValidationError('No working days in selected period'); return }
    const result = await applyLeave({ ...form, employee_id: employee.id, total_days: days, status: 'pending' })
    if (result.error) { toast.error(result.error.message || 'Failed'); return }
    toast.success('Leave applied!')
    setShowForm(false)
    setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
    setCalculatedDays(0)
    setValidationError('')
    setValidationWarnings([])
    await loadData()
  }

  const getStatusIcon = (s) => s === 'approved' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : s === 'rejected' ? <XCircle className="w-4 h-4 text-red-500" /> : s === 'cancelled' ? <XCircle className="w-4 h-4 text-slate-400" /> : <Clock className="w-4 h-4 text-amber-500" />
  const getStatusColor = (s) => s === 'approved' ? 'bg-emerald-100 text-emerald-700' : s === 'rejected' ? 'bg-red-100 text-red-700' : s === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
  const getLeaveTypeConfig = (n) => LEAVE_CONFIG[n?.toLowerCase().replace(/\s+/g, '_')] || LEAVE_CONFIG.annual
  const formatDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const breakdown = form.start_date && form.end_date ? getLeaveBreakdown(form.start_date, form.end_date) : null

  // ============================================
  // APPLY LEAVE SCREEN (full page, scrollable)
  // ============================================
  if (showForm) {
    return (
      <div className="min-h-screen bg-slate-100 font-['Inter']">
        {/* Header */}
        <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white px-5 pt-8 pb-5 sticky top-0 z-10">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => { setShowForm(false); setValidationError(''); setValidationWarnings([]) }}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Apply for Leave</h1>
          </div>
          <p className="text-blue-100 text-sm">Fill in the details below</p>
        </div>

        {/* Scrollable Form Content */}
        <div className="px-5 py-4 space-y-4 pb-24">
          {/* Validation Errors */}
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{validationError}</p>
            </div>
          )}

          {/* Validation Warnings */}
          {validationWarnings.map((w, i) => (
            <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">{w}</p>
            </div>
          ))}

          {/* Leave Type Selection */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Leave Type *</label>
            <div className="space-y-2">
              {leaveTypes.map(type => {
                const config = getLeaveTypeConfig(type.name)
                const Icon = config.icon
                const balance = getBalanceForType(type.id)
                const remaining = balance?.remaining_days ?? (balance?.total_days || 0) - (balance?.used_days || 0)
                return (
                  <button key={type.id} onClick={() => handleTypeChange(type.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                      form.leave_type_id === type.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-800">{type.name}</p>
                      <p className="text-xs text-slate-500">{Math.floor(remaining)} day(s) available</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.leave_type_id === type.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                      {form.leave_type_id === type.id && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Start Date *</label>
              <input type="date" value={form.start_date} onChange={e => handleDateChange('start_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">End Date *</label>
              <input type="date" value={form.end_date} onChange={e => handleDateChange('end_date', e.target.value)}
                min={form.start_date || new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>

          {/* Leave Calculator */}
          {calculatedDays > 0 && breakdown && (
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">Leave Calculator</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-blue-600">{calculatedDays}</p>
                  <p className="text-xs text-slate-500">Working Days</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-slate-400">{breakdown.totalCalendar}</p>
                  <p className="text-xs text-slate-500">Calendar Days</p>
                </div>
              </div>
              <div className="flex gap-3 text-xs text-slate-500 justify-center">
                <span>🚫 {breakdown.weekends} weekends</span>
                <span>🎌 {breakdown.holidays} public holidays</span>
              </div>
              {form.leave_type_id && (() => {
                const balance = getBalanceForType(form.leave_type_id)
                const remaining = balance?.remaining_days ?? (balance?.total_days || 0) - (balance?.used_days || 0)
                const afterRequest = remaining - calculatedDays
                return (
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-xs">
                    <span className="text-slate-500">Remaining after request:</span>
                    <span className={`font-bold ${afterRequest < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{Math.floor(afterRequest)} day(s)</span>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Reason (optional)</label>
            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder="Brief reason for leave request..." rows={3}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none" />
          </div>

          {/* Balance Summary */}
          {form.leave_type_id && (() => {
            const balance = getBalanceForType(form.leave_type_id)
            if (!balance) return null
            const total = balance.total_days || 0
            const used = balance.used_days || 0
            const remaining = balance.remaining_days ?? (total - used)
            return (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">Balance Summary</p>
                <div className="flex justify-between text-xs text-blue-600">
                  <span>Total: {Math.floor(total)} days</span>
                  <span>Used: {Math.floor(used)} days</span>
                  <span className="font-bold">Available: {Math.floor(remaining)} days</span>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Fixed Bottom Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3 z-20">
          <button onClick={() => { setShowForm(false); setValidationError(''); setValidationWarnings([]) }}
            className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleApply}
            disabled={!form.leave_type_id || !form.start_date || !form.end_date || !!validationError}
            className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Submit Request
          </button>
        </div>
      </div>
    )
  }

  // ============================================
  // MAIN LEAVE PAGE (Balances + History)
  // ============================================
  return (
    <div className="min-h-screen bg-slate-100 font-['Inter'] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-blue-600 to-blue-700 text-white px-5 pt-8 pb-6 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">Leave</h1>
          <button onClick={handleRefresh} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-blue-100 text-sm">Apply & track your leave</p>
      </div>

      {/* Tabs */}
      <div className="px-5 -mt-3 sticky top-[88px] z-10">
        <div className="flex gap-2 bg-white rounded-2xl p-1 shadow-md">
          <button onClick={() => setActiveTab('balances')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'balances' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>📊 Balances</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>📋 History</button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="px-5 mt-3 pb-4">
        {activeTab === 'balances' && (
          <>
            <div className="space-y-3 mb-4">
              {leaveBalances.length === 0 && (
                <div className="text-center py-8 bg-white rounded-2xl shadow-sm">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Loading balances...</p>
                </div>
              )}
              {leaveBalances.map(balance => {
                const typeConfig = getLeaveTypeConfig(balance.leave_types?.name)
                const Icon = typeConfig.icon
                const total = balance.total_days || 0
                const used = balance.used_days || 0
                const pending = balance.pending_days || 0
                const remaining = balance.remaining_days ?? (total - used - pending)
                const percentUsed = total > 0 ? (used / total) * 100 : 0
                return (
                  <motion.div key={balance.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`${typeConfig.bg} rounded-2xl p-4 shadow-sm border border-slate-100`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                          <Icon className={`w-5 h-5 ${typeConfig.color}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{balance.leave_types?.name || 'Leave'}</p>
                          <p className="text-xs text-slate-500">{total} days entitlement</p>
                        </div>
                      </div>
                      <p className={`text-2xl font-bold ${typeConfig.color}`}>{Math.floor(remaining)}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Used: {used}</span>
                        <span>Remaining: {Math.floor(remaining)}</span>
                        {pending > 0 && <span className="text-amber-600">Pending: {pending}</span>}
                      </div>
                      <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${typeConfig.barColor} rounded-full transition-all duration-500`} style={{ width: `${Math.min(percentUsed, 100)}%` }}></div>
                      </div>
                    </div>
                    {pending > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200/50">
                        <p className="text-xs text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3" /> {pending} day(s) pending approval</p>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowForm(true); setValidationError(''); setValidationWarnings([]); setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' }); setCalculatedDays(0) }}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-colors mb-2">
              <Plus className="w-5 h-5" /> Apply for Leave
            </motion.button>
          </>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            {leaveRequests.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No leave requests yet</p>
                <button onClick={() => setActiveTab('balances')} className="text-blue-500 text-sm mt-1">Apply for leave</button>
              </div>
            )}
            {leaveRequests.map(lr => (
              <motion.div key={lr.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${lr.status === 'approved' ? 'bg-emerald-100' : lr.status === 'rejected' ? 'bg-red-100' : 'bg-amber-100'}`}>
                      {getStatusIcon(lr.status)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{lr.leave_types?.name || 'Leave'}</p>
                      <p className="text-xs text-slate-500">{formatDate(lr.start_date)} → {formatDate(lr.end_date)}</p>
                      <p className="text-xs text-slate-400">{lr.total_days} working day{lr.total_days > 1 ? 's' : ''}</p>
                      {lr.reason && <p className="text-xs text-slate-400 mt-1 italic">"{lr.reason.slice(0, 80)}"</p>}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${getStatusColor(lr.status)}`}>{lr.status}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav active="leave" />
    </div>
  )
}
