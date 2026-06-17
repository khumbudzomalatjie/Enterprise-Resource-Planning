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
  FileText, AlertCircle
} from 'lucide-react'

export default function LeaveManagement() {
  const { isDark, toggleTheme } = useThemeStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('my-leave')
  const [leaveBalances, setLeaveBalances] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [applyForm, setApplyForm] = useState({ 
    leave_type_id: '', 
    start_date: '', 
    end_date: '', 
    reason: '' 
  })
  const [calculatedDays, setCalculatedDays] = useState(0)

  useEffect(() => { 
    loadAllData() 
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      // 1. Load leave types directly from database
      const { data: types, error: typeError } = await supabase
        .from('leave_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      
      if (typeError) {
        console.error('Error loading leave types:', typeError)
        toast.error('Failed to load leave types. Please check database.')
      } else {
        console.log('Leave types loaded:', types?.length)
        setLeaveTypes(types || [])
      }

      // 2. Get employee record
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user?.id)
        .single()
      
      const employeeId = employee?.id

      if (employeeId) {
        // 3. Load leave balances
        const { data: balances } = await supabase
          .from('employee_leave_balances')
          .select('*, leave_types(name, code, color, days_allowed)')
          .eq('employee_id', employeeId)
        
        setLeaveBalances(balances || [])

        // 4. Load my leave requests
        const { data: requests } = await supabase
          .from('leave_requests')
          .select('*, leave_types(name, code, color)')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false })
        
        setLeaveRequests(requests || [])

        // 5. Load pending approvals (for HR/Managers)
        if (['super_admin', 'hr_manager', 'operations_manager'].includes(profile?.role)) {
          const { data: pending } = await supabase
            .from('leave_requests')
            .select('*, leave_types(name, code, color), employees(first_name, last_name, employee_code)')
            .eq('status', 'pending')
            .order('submitted_at', { ascending: false })
          
          setPendingApprovals(pending || [])
        }
      } else {
        // If no employee record found, show message
        console.log('No employee record found for user:', user?.id)
      }
    } catch (error) {
      console.error('Error loading leave data:', error)
      toast.error('Failed to load leave data')
    }
    setLoading(false)
  }

  // Calculate working days when dates change
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

  const handleApplyLeave = async (e) => {
    e.preventDefault()
    
    if (!applyForm.leave_type_id) {
      toast.error('Please select a leave type')
      return
    }
    if (!applyForm.start_date || !applyForm.end_date) {
      toast.error('Please select start and end dates')
      return
    }
    if (calculatedDays <= 0) {
      toast.error('Invalid date range')
      return
    }

    setSubmitting(true)
    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (!employee) {
        toast.error('Employee record not found')
        setSubmitting(false)
        return
      }

      const { error } = await supabase
        .from('leave_requests')
        .insert([{
          employee_id: employee.id,
          leave_type_id: applyForm.leave_type_id,
          start_date: applyForm.start_date,
          end_date: applyForm.end_date,
          total_days: calculatedDays,
          reason: applyForm.reason,
          status: 'pending'
        }])

      if (error) throw error

      toast.success('Leave request submitted successfully! 🎉')
      setShowApplyForm(false)
      setApplyForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
      loadAllData()
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Failed to submit: ' + (error.message || 'Unknown error'))
    }
    setSubmitting(false)
  }

  const handleApprove = async (id) => {
    try {
      await supabase
        .from('leave_requests')
        .update({ 
          status: 'approved', 
          approved_by: user.id, 
          approved_at: new Date().toISOString() 
        })
        .eq('id', id)
      
      toast.success('Leave approved! ✅')
      loadAllData()
    } catch (error) {
      toast.error('Failed to approve')
    }
  }

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason (optional):')
    if (reason === null) return
    
    try {
      await supabase
        .from('leave_requests')
        .update({ 
          status: 'rejected', 
          rejection_reason: reason 
        })
        .eq('id', id)
      
      toast.success('Leave rejected')
      loadAllData()
    } catch (error) {
      toast.error('Failed to reject')
    }
  }

  const formatDate = (d) => {
    if (!d) return 'N/A'
    return new Date(d).toLocaleDateString('en-ZA', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    }
    return badges[status] || 'bg-slate-100 text-slate-600'
  }

  const isHR = ['super_admin', 'hr_manager'].includes(profile?.role)

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
        {/* Breadcrumb */}
        <Link to="/hr" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span className="text-sm">Back to HR</span>
        </Link>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Calendar className="w-8 h-8 text-emerald-600" />
              Leave Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              SA BCEA Compliant Leave System
            </p>
          </div>
          <button 
            onClick={() => setShowApplyForm(!showApplyForm)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-medium flex items-center gap-2 hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-5 h-5" /> Apply Leave
          </button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'my-leave', label: 'My Leave', icon: Calendar },
            { id: 'balances', label: 'Balances', icon: TrendingUp },
            { id: 'history', label: 'History', icon: Clock },
            ...(isHR ? [{ id: 'approvals', label: `Approvals (${pendingApprovals.length})`, icon: CheckCircle2 }] : []),
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'bg-emerald-600 text-white shadow-lg' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3"></div>
            <p className="text-slate-500">Loading leave data...</p>
          </div>
        )}

        {/* Apply Form */}
        {showApplyForm && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="neu-raised rounded-3xl p-6 mb-6 border-2 border-emerald-200 dark:border-emerald-800"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Apply for Leave</h2>
              <button onClick={() => setShowApplyForm(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Leave Type Dropdown */}
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400">Leave Type *</label>
                  <select 
                    value={applyForm.leave_type_id} 
                    onChange={e => setApplyForm({...applyForm, leave_type_id: e.target.value})}
                    className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300"
                    required
                  >
                    <option value="">-- Select Leave Type --</option>
                    {leaveTypes.map(lt => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name} ({lt.days_allowed} days - {lt.paid ? 'Paid' : 'Unpaid'})
                      </option>
                    ))}
                  </select>
                  {leaveTypes.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      No leave types available. Please run the database setup SQL.
                    </p>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400">Reason</label>
                  <input 
                    type="text" 
                    value={applyForm.reason} 
                    onChange={e => setApplyForm({...applyForm, reason: e.target.value})}
                    placeholder="Reason for leave..."
                    className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300" 
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400">Start Date *</label>
                  <input 
                    type="date" 
                    value={applyForm.start_date} 
                    onChange={e => setApplyForm({...applyForm, start_date: e.target.value})}
                    className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300" 
                    required 
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400">End Date *</label>
                  <input 
                    type="date" 
                    value={applyForm.end_date} 
                    onChange={e => setApplyForm({...applyForm, end_date: e.target.value})}
                    className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300" 
                    required 
                  />
                </div>
              </div>

              {/* Calculated Days */}
              {calculatedDays > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-200 dark:border-blue-800">
                  <p className="text-blue-700 dark:text-blue-400 font-semibold">
                    {calculatedDays} working day{calculatedDays > 1 ? 's' : ''} selected
                  </p>
                  <p className="text-xs text-blue-500 mt-1">Weekends excluded</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowApplyForm(false)} 
                  className="px-5 py-2.5 bg-slate-200 dark:bg-slate-600 rounded-xl text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-500"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? (
                    <>Submitting...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Submit Request</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* MY LEAVE TAB */}
        {activeTab === 'my-leave' && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              My Leave Summary
            </h2>
            
            {leaveBalances.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {leaveBalances.slice(0, 8).map(balance => (
                  <div 
                    key={balance.id} 
                    className="rounded-xl p-4 text-center border-2 transition-all hover:shadow-md"
                    style={{ borderColor: balance.leave_types?.color || '#10b981' }}
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {balance.leave_types?.name || 'Leave'}
                    </p>
                    <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full mt-2 mb-1 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${balance.allocated_days > 0 ? Math.min((balance.used_days / balance.allocated_days) * 100, 100) : 0}%`,
                          backgroundColor: balance.leave_types?.color || '#10b981'
                        }}
                      ></div>
                    </div>
                    <p className="text-2xl font-bold mt-1" style={{ color: balance.leave_types?.color || '#10b981' }}>
                      {balance.remaining_days || 0}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      of {balance.allocated_days} days remaining
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No leave balances found</p>
                <p className="text-xs text-slate-400 mt-1">Contact HR to set up your leave balances</p>
              </div>
            )}
          </div>
        )}

        {/* BALANCES TAB */}
        {activeTab === 'balances' && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              Leave Balances
            </h2>
            
            {leaveBalances.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                      <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Leave Type</th>
                      <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Allocated</th>
                      <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Used</th>
                      <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Pending</th>
                      <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Remaining</th>
                      <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">Cycle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveBalances.map(b => (
                      <tr key={b.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.leave_types?.color || '#10b981' }}></span>
                            <span className="font-medium text-slate-800 dark:text-white">{b.leave_types?.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{b.allocated_days}</td>
                        <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">{b.used_days}</td>
                        <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-400">{b.pending_days}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{b.remaining_days}</td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(b.cycle_start)} - {formatDate(b.cycle_end)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500">No leave balances found</p>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Leave History</h2>
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)} 
                className="px-3 py-1.5 neu-inset rounded-lg text-sm text-slate-600 dark:text-slate-300"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            {leaveRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                      <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Type</th>
                      <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Dates</th>
                      <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400">Days</th>
                      <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Reason</th>
                      <th className="text-center py-3 px-4 text-slate-500 dark:text-slate-400">Status</th>
                      <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests
                      .filter(lr => statusFilter === 'all' || lr.status === statusFilter)
                      .map(lr => (
                        <tr key={lr.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/20">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: lr.leave_types?.color || '#10b981' }}></span>
                              <span className="text-slate-700 dark:text-slate-300">{lr.leave_types?.name || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                            {formatDate(lr.start_date)} - {formatDate(lr.end_date)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                            {lr.total_days}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                            {lr.reason || '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(lr.status)}`}>
                              {lr.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(lr.submitted_at)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No leave requests found</p>
              </div>
            )}
          </div>
        )}

        {/* APPROVALS TAB (HR/Manager only) */}
        {activeTab === 'approvals' && isHR && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              Pending Approvals ({pendingApprovals.length})
            </h2>
            
            {pendingApprovals.length > 0 ? (
              <div className="space-y-3">
                {pendingApprovals.map(req => (
                  <div 
                    key={req.id} 
                    className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: req.leave_types?.color || '#10b981' }}></span>
                          <span className="font-semibold text-slate-800 dark:text-white">
                            {req.employees?.first_name} {req.employees?.last_name}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {req.employees?.employee_code}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          <strong>{req.leave_types?.name}</strong>: {formatDate(req.start_date)} - {formatDate(req.end_date)} 
                          <span className="ml-2 font-semibold">({req.total_days} days)</span>
                        </p>
                        {req.reason && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Reason: {req.reason}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          Submitted: {formatDate(req.submitted_at)}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button 
                          onClick={() => handleApprove(req.id)} 
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Approve
                        </button>
                        <button 
                          onClick={() => handleReject(req.id)} 
                          className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-lg">No pending leave requests</p>
                <p className="text-sm mt-1">All leave requests have been processed</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
