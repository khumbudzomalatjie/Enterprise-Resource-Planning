import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useAuthStore from '../../../store/authStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import {
  Calendar, Clock, CheckCircle2, XCircle, Plus,
  ArrowLeft, Sun, Moon, Sparkles, Send, TrendingUp,
  FileText, AlertCircle, Shield
} from 'lucide-react'

// ═══════════════════════════════════════════
// FALLBACK LEAVE TYPES (SA BCEA Compliant)
// ═══════════════════════════════════════════
const FALLBACK_LEAVE_TYPES = [
  { id: 'annual', name: 'Annual Leave', days_allowed: 15, code: 'ANNUAL', color: '#10b981' },
  { id: 'sick', name: 'Sick Leave', days_allowed: 30, code: 'SICK', color: '#ef4444' },
  { id: 'family', name: 'Family Responsibility Leave', days_allowed: 3, code: 'FAMILY', color: '#f59e0b' },
  { id: 'maternity', name: 'Maternity Leave', days_allowed: 120, code: 'MATERNITY', color: '#ec4899' },
  { id: 'parental', name: 'Parental Leave', days_allowed: 10, code: 'PARENTAL', color: '#8b5cf6' },
  { id: 'adoption', name: 'Adoption Leave', days_allowed: 70, code: 'ADOPTION', color: '#6366f1' },
  { id: 'commissioning', name: 'Commissioning Parental Leave', days_allowed: 70, code: 'COMMISSIONING', color: '#14b8a6' },
  { id: 'study', name: 'Study Leave', days_allowed: 10, code: 'STUDY', color: '#0ea5e9' },
  { id: 'compassionate', name: 'Compassionate Leave', days_allowed: 5, code: 'COMPASSIONATE', color: '#64748b' },
  { id: 'unpaid', name: 'Unpaid Leave', days_allowed: 30, code: 'UNPAID', color: '#78716c' },
]

export default function LeaveManagement() {
  const { isDark, toggleTheme } = useThemeStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('my-leave')
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  
  const [leaveTypes, setLeaveTypes] = useState(FALLBACK_LEAVE_TYPES)
  const [leaveBalances, setLeaveBalances] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])
  
  const [applyForm, setApplyForm] = useState({ 
    leave_type_id: '', 
    start_date: '', 
    end_date: '', 
    reason: '' 
  })
  const [calculatedDays, setCalculatedDays] = useState(0)

  useEffect(() => { loadAllData() }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      // Load leave types
      const { data: types, error: typeError } = await supabase
        .from('leave_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      
      if (typeError || !types || types.length === 0) {
        setLeaveTypes(FALLBACK_LEAVE_TYPES)
      } else {
        setLeaveTypes(types)
      }

      // Get employee record
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user?.id)
        .single()
      
      const employeeId = employee?.id

      if (employeeId) {
        // Load balances
        const { data: balances } = await supabase
          .from('employee_leave_balances')
          .select('*, leave_types(name, code, color, days_allowed)')
          .eq('employee_id', employeeId)
        setLeaveBalances(balances || [])

        // Load MY requests only
        const { data: requests } = await supabase
          .from('leave_requests')
          .select('*, leave_types(name, code, color)')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false })
        setLeaveRequests(requests || [])

        // Load ALL pending approvals - ONLY for Super Admin and HR Manager
        if (['super_admin', 'hr_manager'].includes(profile?.role)) {
          const { data: pending } = await supabase
            .from('leave_requests')
            .select('*, leave_types(name, code, color), employees(first_name, last_name, employee_code, department)')
            .eq('status', 'pending')
            .order('submitted_at', { ascending: false })
          setPendingApprovals(pending || [])
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setLeaveTypes(FALLBACK_LEAVE_TYPES)
    }
    setLoading(false)
  }

  // Calculate working days
  useEffect(() => {
    if (applyForm.start_date && applyForm.end_date) {
      let days = 0
      const start = new Date(applyForm.start_date)
      const end = new Date(applyForm.end_date)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) days++
      }
      setCalculatedDays(days)
    } else {
      setCalculatedDays(0)
    }
  }, [applyForm.start_date, applyForm.end_date])

  // ═══════════════════════════════════════════
  // EMPLOYEE: Submit Leave Request
  // ═══════════════════════════════════════════
  const handleApplyLeave = async (e) => {
    e.preventDefault()
    
    if (!applyForm.leave_type_id) { toast.error('Please select a leave type'); return }
    if (!applyForm.start_date || !applyForm.end_date) { toast.error('Please select dates'); return }
    if (calculatedDays <= 0) { toast.error('Invalid date range'); return }

    setSubmitting(true)
    
    try {
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (empError || !employee) {
        toast.error('Employee profile not found. Please contact HR.')
        setSubmitting(false)
        return
      }

      const { error: insertError } = await supabase
        .from('leave_requests')
        .insert([{
          employee_id: employee.id,
          leave_type_id: applyForm.leave_type_id,
          start_date: applyForm.start_date,
          end_date: applyForm.end_date,
          total_days: calculatedDays,
          reason: applyForm.reason || '',
          status: 'pending'
        }])

      if (insertError) {
        console.error('Insert error:', insertError)
        toast.error('Failed to submit: ' + insertError.message)
        setSubmitting(false)
        return
      }

      toast.success('Leave request submitted for approval! 🎉')
      setShowApplyForm(false)
      setApplyForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
      loadAllData()
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Something went wrong. Please try again.')
    }
    setSubmitting(false)
  }

  // ═══════════════════════════════════════════
  // SUPER ADMIN / HR: Approve Leave
  // ═══════════════════════════════════════════
  const handleApprove = async (id, employeeName) => {
    if (!window.confirm(`Approve leave request for ${employeeName}?`)) return
    
    try {
      await supabase.from('leave_requests').update({ 
        status: 'approved', 
        approved_by: user.id, 
        approved_at: new Date().toISOString() 
      }).eq('id', id)
      toast.success('Leave approved! ✅')
      loadAllData()
    } catch (error) {
      toast.error('Failed to approve')
    }
  }

  // ═══════════════════════════════════════════
  // SUPER ADMIN / HR: Decline Leave
  // ═══════════════════════════════════════════
  const handleReject = async (id, employeeName) => {
    const reason = prompt(`Rejection reason for ${employeeName} (optional):`)
    if (reason === null) return
    
    try {
      await supabase.from('leave_requests').update({ 
        status: 'rejected', 
        rejection_reason: reason || '' 
      }).eq('id', id)
      toast.success('Leave declined')
      loadAllData()
    } catch (error) {
      toast.error('Failed to decline')
    }
  }

  // ═══════════════════════════════════════════
  // EMPLOYEE: Cancel own pending request
  // ═══════════════════════════════════════════
  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return
    try {
      await supabase.from('leave_requests').update({ status: 'cancelled' }).eq('id', id)
      toast.success('Leave request cancelled')
      loadAllData()
    } catch (error) {
      toast.error('Failed to cancel')
    }
  }

  const formatDate = (d) => {
    if (!d) return 'N/A'
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getStatusBadge = (s) => ({
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  }[s] || 'bg-slate-100')

  // Only Super Admin and HR Manager can approve/decline
  const isApprover = ['super_admin', 'hr_manager'].includes(profile?.role)

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
        <Link to="/hr" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to HR Dashboard</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Calendar className="w-8 h-8 text-emerald-600" />
              {isApprover ? 'Leave Management (Admin)' : 'My Leave'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {isApprover ? 'Approve or decline employee leave requests' : 'Apply for leave and view your leave status'}
            </p>
          </div>
          {/* Apply Leave button - for everyone */}
          <button onClick={() => setShowApplyForm(!showApplyForm)} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-medium flex items-center gap-2 hover:bg-emerald-700 shadow-lg">
            <Plus className="w-5 h-5" /> Apply Leave
          </button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'my-leave', label: 'My Leave', icon: Calendar },
            { id: 'balances', label: 'Balances', icon: TrendingUp },
            { id: 'history', label: 'History', icon: Clock },
            // APPROVALS TAB - Only for Super Admin and HR Manager
            ...(isApprover ? [{ id: 'approvals', label: `Pending Approvals (${pendingApprovals.length})`, icon: Shield }] : []),
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading...</p>
          </div>
        )}

        {/* APPLY FORM - For everyone */}
        {showApplyForm && !loading && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 mb-6 border-2 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Apply for Leave</h2>
              <button onClick={() => setShowApplyForm(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 font-medium">Leave Type *</label>
                  <select value={applyForm.leave_type_id} onChange={e => setApplyForm({...applyForm, leave_type_id: e.target.value})}
                    className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600" required>
                    <option value="">-- Select Leave Type --</option>
                    {leaveTypes.map(lt => (
                      <option key={lt.id || lt.code} value={lt.id || lt.code}>{lt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 font-medium">Reason</label>
                  <input type="text" value={applyForm.reason} onChange={e => setApplyForm({...applyForm, reason: e.target.value})}
                    placeholder="Reason for leave..." className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600" />
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 font-medium">Start Date *</label>
                  <input type="date" value={applyForm.start_date} onChange={e => setApplyForm({...applyForm, start_date: e.target.value})}
                    className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600" required />
                </div>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 font-medium">End Date *</label>
                  <input type="date" value={applyForm.end_date} onChange={e => setApplyForm({...applyForm, end_date: e.target.value})}
                    className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600" required />
                </div>
              </div>

              {calculatedDays > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-200 dark:border-blue-800">
                  <p className="text-blue-700 dark:text-blue-400 font-semibold">{calculatedDays} working day{calculatedDays > 1 ? 's' : ''} selected</p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Weekends excluded</p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowApplyForm(false)} className="px-5 py-2.5 bg-slate-200 dark:bg-slate-600 rounded-xl text-sm font-medium">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 shadow-lg">
                  {submitting ? 'Submitting...' : <><Send className="w-4 h-4" /> Submit for Approval</>}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* MY LEAVE */}
        {activeTab === 'my-leave' && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">My Leave Summary</h2>
            {leaveBalances.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {leaveBalances.slice(0, 8).map(balance => (
                  <div key={balance.id} className="rounded-xl p-4 text-center border-2 bg-white dark:bg-slate-700/30" style={{ borderColor: balance.leave_types?.color || '#10b981' }}>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{balance.leave_types?.name || 'Leave'}</p>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full mt-2 mb-1 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${balance.allocated_days > 0 ? Math.min((balance.used_days / balance.allocated_days) * 100, 100) : 0}%`, backgroundColor: balance.leave_types?.color || '#10b981' }}></div>
                    </div>
                    <p className="text-2xl font-bold mt-1" style={{ color: balance.leave_types?.color || '#10b981' }}>{balance.remaining_days || 0}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">of {balance.allocated_days} days</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8"><AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-slate-500">No leave balances</p></div>
            )}
          </div>
        )}

        {/* BALANCES */}
        {activeTab === 'balances' && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-bold mb-4">Leave Balances</h2>
            {leaveBalances.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-slate-50 dark:bg-slate-700/30"><th className="text-left py-3 px-4">Type</th><th className="text-right py-3 px-4">Allocated</th><th className="text-right py-3 px-4">Used</th><th className="text-right py-3 px-4">Pending</th><th className="text-right py-3 px-4">Remaining</th><th className="text-left py-3 px-4">Cycle</th></tr></thead>
                  <tbody>
                    {leaveBalances.map(b => (
                      <tr key={b.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.leave_types?.color }}></span><span className="font-medium">{b.leave_types?.name}</span></div></td>
                        <td className="py-3 px-4 text-right">{b.allocated_days}</td>
                        <td className="py-3 px-4 text-right text-red-600">{b.used_days}</td>
                        <td className="py-3 px-4 text-right text-amber-600">{b.pending_days}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">{b.remaining_days}</td>
                        <td className="py-3 px-4 text-xs">{formatDate(b.cycle_start)} - {formatDate(b.cycle_end)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-center py-8 text-slate-500">No balances</p>}
          </div>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-bold">My Leave History</h2>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 neu-inset rounded-lg text-sm">
                <option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Declined</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            {leaveRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-slate-50"><th className="text-left py-3 px-4">Type</th><th className="text-left py-3 px-4">Dates</th><th className="text-right py-3 px-4">Days</th><th className="text-left py-3 px-4">Reason</th><th className="text-center py-3 px-4">Status</th><th className="text-center py-3 px-4">Action</th></tr></thead>
                  <tbody>
                    {leaveRequests.filter(lr => statusFilter === 'all' || lr.status === statusFilter).map(lr => (
                      <tr key={lr.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: lr.leave_types?.color }}></span><span>{lr.leave_types?.name}</span></div></td>
                        <td className="py-3 px-4 text-xs">{formatDate(lr.start_date)} - {formatDate(lr.end_date)}</td>
                        <td className="py-3 px-4 text-right font-semibold">{lr.total_days}</td>
                        <td className="py-3 px-4 text-xs truncate max-w-[150px]">{lr.reason || '-'}</td>
                        <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(lr.status)}`}>{lr.status}</span></td>
                        <td className="py-3 px-4 text-center">
                          {lr.status === 'pending' && (
                            <button onClick={() => handleCancel(lr.id)} className="text-xs text-red-600 hover:underline">Cancel</button>
                          )}
                          {lr.status !== 'pending' && <span className="text-xs text-slate-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-center py-8 text-slate-500">No requests</p>}
          </div>
        )}

        {/* APPROVALS TAB - Super Admin & HR Manager ONLY */}
        {activeTab === 'approvals' && isApprover && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-6 h-6 text-amber-600" />
              <h2 className="text-lg font-bold">Pending Leave Approvals ({pendingApprovals.length})</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">Review and approve or decline employee leave requests</p>
            
            {pendingApprovals.length > 0 ? (
              <div className="space-y-3">
                {pendingApprovals.map(req => (
                  <div key={req.id} className="bg-white dark:bg-slate-700/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: req.leave_types?.color }}></span>
                          <span className="font-bold text-lg">{req.employees?.first_name} {req.employees?.last_name}</span>
                          <span className="text-xs text-slate-500">{req.employees?.employee_code}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm ml-5">
                          <div><span className="text-slate-500">Leave Type:</span> <span className="font-semibold">{req.leave_types?.name}</span></div>
                          <div><span className="text-slate-500">Department:</span> <span>{req.employees?.department || 'N/A'}</span></div>
                          <div><span className="text-slate-500">Dates:</span> <span>{formatDate(req.start_date)} - {formatDate(req.end_date)}</span></div>
                          <div><span className="text-slate-500">Days:</span> <span className="font-semibold">{req.total_days} working days</span></div>
                        </div>
                        {req.reason && (
                          <p className="text-sm text-slate-600 mt-2 ml-5">
                            <span className="text-slate-500">Reason:</span> {req.reason}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-2 ml-5">
                          Submitted: {formatDate(req.submitted_at)}
                        </p>
                      </div>
                      <div className="flex gap-3 flex-shrink-0">
                        <button 
                          onClick={() => handleApprove(req.id, `${req.employees?.first_name} ${req.employees?.last_name}`)} 
                          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg"
                        >
                          <CheckCircle2 className="w-5 h-5" /> Approve
                        </button>
                        <button 
                          onClick={() => handleReject(req.id, `${req.employees?.first_name} ${req.employees?.last_name}`)} 
                          className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg"
                        >
                          <XCircle className="w-5 h-5" /> Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <p className="text-xl font-semibold">All Clear! 🎉</p>
                <p className="text-sm mt-2">No pending leave requests to review</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
