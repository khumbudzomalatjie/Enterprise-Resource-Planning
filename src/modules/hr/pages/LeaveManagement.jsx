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
  FileText, AlertCircle, Shield, Upload, Eye,
  MessageSquare, History, Users, Filter, Download,
  Search, Bell, UserCheck, UserX, BarChart3
} from 'lucide-react'

// ═══════════════════════════════════════════
// LEAVE TYPES (SA BCEA Compliant)
// ═══════════════════════════════════════════
const LEAVE_TYPES = [
  { id: 'annual', name: 'Annual Leave', days_allowed: 15, color: '#10b981', requires_doc: false },
  { id: 'sick', name: 'Sick Leave', days_allowed: 30, color: '#ef4444', requires_doc: true },
  { id: 'family', name: 'Family Responsibility Leave', days_allowed: 3, color: '#f59e0b', requires_doc: false },
  { id: 'maternity', name: 'Maternity Leave', days_allowed: 120, color: '#ec4899', requires_doc: true },
  { id: 'paternity', name: 'Paternity Leave', days_allowed: 10, color: '#8b5cf6', requires_doc: false },
  { id: 'study', name: 'Study Leave', days_allowed: 10, color: '#0ea5e9', requires_doc: true },
  { id: 'unpaid', name: 'Unpaid Leave', days_allowed: 30, color: '#78716c', requires_doc: false },
  { id: 'other', name: 'Other', days_allowed: 5, color: '#64748b', requires_doc: false },
]

export default function LeaveManagement() {
  const { isDark, toggleTheme } = useThemeStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  
  // UI State
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Data State
  const [leaveTypes, setLeaveTypes] = useState(LEAVE_TYPES)
  const [leaveBalances, setLeaveBalances] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [allRequests, setAllRequests] = useState([])
  const [leaveStats, setLeaveStats] = useState({})
  const [employees, setEmployees] = useState([])
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  
  // Form State
  const [applyForm, setApplyForm] = useState({ 
    leave_type_id: '', 
    start_date: '', 
    end_date: '', 
    reason: '',
    document_url: ''
  })
  const [calculatedDays, setCalculatedDays] = useState(0)

  // Determine user role
  const isSuperAdmin = profile?.role === 'super_admin'
  const isHRManager = profile?.role === 'hr_manager'
  const isApprover = isSuperAdmin || isHRManager
  const isSupervisor = profile?.role === 'supervisor'

  useEffect(() => { loadAllData() }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      // Load leave types from DB
      const { data: types } = await supabase.from('leave_types').select('*').eq('is_active', true).order('display_order')
      if (types?.length > 0) setLeaveTypes(types)

      // Get employee record
      const { data: employee } = await supabase.from('employees').select('*').eq('user_id', user?.id).single()
      const employeeId = employee?.id

      if (employeeId) {
        // My leave balances
        const { data: balances } = await supabase
          .from('employee_leave_balances')
          .select('*, leave_types(name, code, color, days_allowed)')
          .eq('employee_id', employeeId)
        setLeaveBalances(balances || [])

        // My requests
        const { data: myReqs } = await supabase
          .from('leave_requests')
          .select('*, leave_types(name, code, color)')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false })
        setMyRequests(myReqs || [])
      }

      // For approvers - load all pending requests
      if (isApprover || isSupervisor) {
        const { data: pending } = await supabase
          .from('leave_requests')
          .select('*, leave_types(name, code, color), employees(first_name, last_name, employee_code, department, position)')
          .eq('status', 'pending')
          .order('submitted_at', { ascending: false })
        setPendingApprovals(pending || [])
      }

      // For super admin - load ALL requests
      if (isSuperAdmin) {
        const { data: all } = await supabase
          .from('leave_requests')
          .select('*, leave_types(name, code, color), employees(first_name, last_name, employee_code, department)')
          .order('created_at', { ascending: false })
          .limit(50)
        setAllRequests(all || [])
      }

      // Calculate stats
      await loadStats()
    } catch (error) {
      console.error('Error loading leave data:', error)
    }
    setLoading(false)
  }

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const [
        { count: totalRequests },
        { count: pendingCount },
        { count: approvedCount },
        { count: declinedCount },
        { data: onLeave }
      ] = await Promise.all([
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('leave_requests').select('*, employees(first_name, last_name)').eq('status', 'approved').lte('start_date', today).gte('end_date', today)
      ])
      setLeaveStats({
        totalRequests: totalRequests || 0,
        pendingCount: pendingCount || 0,
        approvedCount: approvedCount || 0,
        declinedCount: declinedCount || 0,
        onLeave: onLeave || []
      })
    } catch (error) { console.error('Stats error:', error) }
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
    } else { setCalculatedDays(0) }
  }, [applyForm.start_date, applyForm.end_date])

  // Upload document
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `leave-docs/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName)
      setApplyForm({...applyForm, document_url: publicUrl})
      toast.success('Document uploaded!')
    } catch (error) {
      toast.error('Upload failed')
    }
    setUploading(false)
  }

  // Submit leave request
  const handleApplyLeave = async (e) => {
    e.preventDefault()
    if (!applyForm.leave_type_id) { toast.error('Select leave type'); return }
    if (!applyForm.start_date || !applyForm.end_date) { toast.error('Select dates'); return }
    if (calculatedDays <= 0) { toast.error('Invalid dates'); return }

    setSubmitting(true)
    try {
      const { data: employee } = await supabase.from('employees').select('*').eq('user_id', user?.id).single()
      if (!employee) { toast.error('Employee record not found'); setSubmitting(false); return }

      const { error } = await supabase.from('leave_requests').insert([{
        employee_id: employee.id,
        leave_type_id: applyForm.leave_type_id,
        start_date: applyForm.start_date,
        end_date: applyForm.end_date,
        total_days: calculatedDays,
        reason: applyForm.reason || '',
        document_url: applyForm.document_url || '',
        status: 'pending'
      }])

      if (error) throw error

      // Log audit
      await supabase.from('leave_approvals').insert([{
        leave_request_id: null,
        action_by: user.id,
        action: 'submitted',
        remarks: `Leave request submitted: ${applyForm.leave_type_id} from ${applyForm.start_date} to ${applyForm.end_date}`
      }])

      toast.success('Leave request submitted for approval! 🎉')
      setShowApplyForm(false)
      setApplyForm({ leave_type_id: '', start_date: '', end_date: '', reason: '', document_url: '' })
      loadAllData()
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Failed to submit: ' + error.message)
    }
    setSubmitting(false)
  }

  // Approve leave
  const handleApprove = async (id, employeeName) => {
    const comments = prompt(`Approval comments for ${employeeName} (optional):`) || ''
    try {
      await supabase.from('leave_requests').update({ 
        status: 'approved', 
        approved_by: user.id, 
        approved_at: new Date().toISOString(),
        comments: comments
      }).eq('id', id)

      // Log audit
      await supabase.from('leave_approvals').insert([{
        leave_request_id: id,
        action_by: user.id,
        action: 'approved',
        remarks: comments || 'Leave approved'
      }])

      toast.success(`Leave approved for ${employeeName}! ✅`)
      loadAllData()
    } catch (error) { toast.error('Failed to approve') }
  }

  // Decline leave
  const handleReject = async (id, employeeName) => {
    const reason = prompt(`Decline reason for ${employeeName}:`) || 'No reason provided'
    if (reason === null) return
    try {
      await supabase.from('leave_requests').update({ 
        status: 'rejected', 
        rejection_reason: reason,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      }).eq('id', id)

      // Log audit
      await supabase.from('leave_approvals').insert([{
        leave_request_id: id,
        action_by: user.id,
        action: 'rejected',
        remarks: reason
      }])

      toast.success(`Leave declined for ${employeeName}`)
      loadAllData()
    } catch (error) { toast.error('Failed to decline') }
  }

  // Request more info
  const handleRequestInfo = async (id, employeeName) => {
    const message = prompt(`What additional information is needed from ${employeeName}?`) || 'Please provide more information'
    if (message === null) return
    try {
      await supabase.from('leave_requests').update({ 
        status: 'pending',
        comments: `INFO REQUESTED: ${message}`
      }).eq('id', id)

      await supabase.from('leave_approvals').insert([{
        leave_request_id: id,
        action_by: user.id,
        action: 'returned',
        remarks: message
      }])

      toast.success(`Info requested from ${employeeName}`)
      loadAllData()
    } catch (error) { toast.error('Failed to send request') }
  }

  // Cancel request
  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return
    try {
      await supabase.from('leave_requests').update({ status: 'cancelled' }).eq('id', id)
      await supabase.from('leave_approvals').insert([{
        leave_request_id: id, action_by: user.id, action: 'cancelled', remarks: 'Cancelled by employee'
      }])
      toast.success('Leave request cancelled')
      loadAllData()
    } catch (error) { toast.error('Failed to cancel') }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'

  const getStatusBadge = (s) => ({
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  }[s] || 'bg-slate-100')

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

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Calendar className="w-8 h-8 text-emerald-600" />Leave Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">SA BCEA Compliant · {isApprover ? 'Administrator View' : 'Employee Self-Service'}</p>
          </div>
          <button onClick={() => setShowApplyForm(!showApplyForm)} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-medium flex items-center gap-2 hover:bg-emerald-700 shadow-lg">
            <Plus className="w-5 h-5" /> Apply for Leave
          </button>
        </motion.div>

        {/* Stats Cards */}
        {isApprover && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { icon: FileText, label: 'Total Requests', value: leaveStats.totalRequests, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
              { icon: Clock, label: 'Pending', value: leaveStats.pendingCount, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
              { icon: CheckCircle2, label: 'Approved', value: leaveStats.approvedCount, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
              { icon: XCircle, label: 'Declined', value: leaveStats.declinedCount, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
            ].map(stat => (
              <div key={stat.label} className="neu-raised rounded-2xl p-4 text-center">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-2`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'my-leave', label: 'My Leave', icon: Calendar },
            ...(isApprover ? [
              { id: 'approvals', label: `Approvals (${pendingApprovals.length})`, icon: Shield },
              { id: 'all-requests', label: 'All Requests', icon: FileText },
              { id: 'on-leave', label: `On Leave (${leaveStats.onLeave?.length || 0})`, icon: Users },
            ] : []),
            { id: 'history', label: 'History', icon: History },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3"></div><p className="text-slate-500">Loading...</p></div>}

        {/* APPLY FORM */}
        {showApplyForm && !loading && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 mb-6 border-2 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Apply for Leave</h2>
              <button onClick={() => setShowApplyForm(false)} className="p-1 rounded-lg hover:bg-slate-100"><XCircle className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500 font-medium">Leave Type *</label>
                  <select value={applyForm.leave_type_id} onChange={e => setApplyForm({...applyForm, leave_type_id: e.target.value})}
                    className="w-full p-3 neu-inset rounded-xl mt-1" required>
                    <option value="">-- Select Leave Type --</option>
                    {leaveTypes.map(lt => <option key={lt.id || lt.code} value={lt.id || lt.code}>{lt.name} ({lt.days_allowed} days/year)</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-500 font-medium">Reason</label>
                  <input type="text" value={applyForm.reason} onChange={e => setApplyForm({...applyForm, reason: e.target.value})}
                    placeholder="Reason for leave..." className="w-full p-3 neu-inset rounded-xl mt-1" />
                </div>
                <div>
                  <label className="text-sm text-slate-500 font-medium">Start Date *</label>
                  <input type="date" value={applyForm.start_date} onChange={e => setApplyForm({...applyForm, start_date: e.target.value})}
                    className="w-full p-3 neu-inset rounded-xl mt-1" required />
                </div>
                <div>
                  <label className="text-sm text-slate-500 font-medium">End Date *</label>
                  <input type="date" value={applyForm.end_date} onChange={e => setApplyForm({...applyForm, end_date: e.target.value})}
                    className="w-full p-3 neu-inset rounded-xl mt-1" required />
                </div>
              </div>
              {calculatedDays > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-200">
                  <p className="text-blue-700 font-semibold">{calculatedDays} working day{calculatedDays > 1 ? 's' : ''} selected (weekends excluded)</p>
                </div>
              )}
              <div>
                <label className="text-sm text-slate-500 font-medium">Supporting Documents</label>
                <div className="flex items-center gap-3 mt-1">
                  <label className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl cursor-pointer hover:bg-slate-200 flex items-center gap-2 text-sm">
                    <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload File'}
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.png,.doc,.docx" />
                  </label>
                  {applyForm.document_url && <span className="text-xs text-emerald-600">✅ File uploaded</span>}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowApplyForm(false)} className="px-5 py-2.5 bg-slate-200 rounded-xl text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50">
                  {submitting ? 'Submitting...' : <><Send className="w-4 h-4" /> Submit for Approval</>}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && !loading && (
          <div className="space-y-6">
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-600" />Leave Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {leaveBalances.slice(0, 8).map(b => (
                  <div key={b.id} className="rounded-xl p-4 text-center border-2" style={{ borderColor: b.leave_types?.color || '#10b981' }}>
                    <p className="text-xs text-slate-500 font-medium">{b.leave_types?.name || 'Leave'}</p>
                    <div className="w-full h-2 bg-slate-200 rounded-full mt-2 mb-1 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${b.allocated_days > 0 ? Math.min((b.used_days / b.allocated_days) * 100, 100) : 0}%`, backgroundColor: b.leave_types?.color || '#10b981' }}></div>
                    </div>
                    <p className="text-2xl font-bold mt-1" style={{ color: b.leave_types?.color }}>{b.remaining_days || 0}</p>
                    <p className="text-[10px] text-slate-400">of {b.allocated_days} days remaining</p>
                  </div>
                ))}
              </div>
            </div>
            {isApprover && leaveStats.onLeave?.length > 0 && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" />Currently on Leave ({leaveStats.onLeave.length})</h2>
                <div className="flex flex-wrap gap-3">
                  {leaveStats.onLeave.map(l => (
                    <div key={l.id} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-2 border border-blue-200">
                      <span className="font-medium text-sm">{l.employees?.first_name} {l.employees?.last_name}</span>
                      <span className="text-xs text-slate-500 ml-2">{formatDate(l.start_date)} - {formatDate(l.end_date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MY LEAVE TAB */}
        {activeTab === 'my-leave' && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-bold mb-4">My Leave Balances</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {leaveBalances.map(b => (
                <div key={b.id} className="rounded-xl p-4 text-center border-2" style={{ borderColor: b.leave_types?.color }}>
                  <p className="text-xs text-slate-500">{b.leave_types?.name}</p>
                  <div className="w-full h-2 bg-slate-200 rounded-full mt-2 mb-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${b.allocated_days > 0 ? Math.min((b.used_days / b.allocated_days) * 100, 100) : 0}%`, backgroundColor: b.leave_types?.color }}></div>
                  </div>
                  <p className="text-2xl font-bold mt-1" style={{ color: b.leave_types?.color }}>{b.remaining_days || 0}</p>
                  <p className="text-[10px] text-slate-400">Used: {b.used_days} | Remaining: {b.remaining_days}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* APPROVALS TAB */}
        {activeTab === 'approvals' && isApprover && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-6 h-6 text-amber-600" />
              <h2 className="text-lg font-bold">Pending Leave Approvals ({pendingApprovals.length})</h2>
            </div>
            {pendingApprovals.length > 0 ? (
              <div className="space-y-4">
                {pendingApprovals.map(req => (
                  <div key={req.id} className="bg-white dark:bg-slate-700/30 border border-amber-200 rounded-xl p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: req.leave_types?.color }}></span>
                          <span className="font-bold text-lg">{req.employees?.first_name} {req.employees?.last_name}</span>
                          <span className="text-xs text-slate-500">{req.employees?.employee_code} · {req.employees?.department}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm ml-5">
                          <div><span className="text-slate-500">Type:</span> <span className="font-semibold">{req.leave_types?.name}</span></div>
                          <div><span className="text-slate-500">Days:</span> <span className="font-semibold">{req.total_days} working days</span></div>
                          <div><span className="text-slate-500">Dates:</span> <span>{formatDate(req.start_date)} - {formatDate(req.end_date)}</span></div>
                          <div><span className="text-slate-500">Position:</span> <span>{req.employees?.position || 'N/A'}</span></div>
                        </div>
                        {req.reason && <p className="text-sm text-slate-600 mt-2 ml-5">📝 {req.reason}</p>}
                        {req.document_url && (
                          <a href={req.document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline ml-5 mt-1 inline-block">📎 View attached document</a>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleApprove(req.id, `${req.employees?.first_name} ${req.employees?.last_name}`)} 
                          className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Approve
                        </button>
                        <button onClick={() => handleReject(req.id, `${req.employees?.first_name} ${req.employees?.last_name}`)} 
                          className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 flex items-center gap-2">
                          <XCircle className="w-4 h-4" /> Decline
                        </button>
                        <button onClick={() => handleRequestInfo(req.id, `${req.employees?.first_name} ${req.employees?.last_name}`)} 
                          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" /> Request Info
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16"><CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" /><p className="text-xl font-semibold">All Clear! 🎉</p><p className="text-sm text-slate-500 mt-2">No pending leave requests to review</p></div>
            )}
          </div>
        )}

        {/* ALL REQUESTS TAB */}
        {activeTab === 'all-requests' && isApprover && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-bold">All Leave Requests</h2>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 neu-inset rounded-lg text-sm">
                <option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Declined</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-slate-50"><th className="text-left py-3 px-4">Employee</th><th className="text-left py-3 px-4">Type</th><th className="text-left py-3 px-4">Dates</th><th className="text-right py-3 px-4">Days</th><th className="text-center py-3 px-4">Status</th><th className="text-left py-3 px-4">Submitted</th></tr></thead>
                <tbody>
                  {(allRequests.length > 0 ? allRequests : myRequests).filter(r => statusFilter === 'all' || r.status === statusFilter).map(r => (
                    <tr key={r.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium">{r.employees?.first_name || profile?.full_name || 'N/A'} {r.employees?.last_name || ''}</td>
                      <td className="py-3 px-4">{r.leave_types?.name || r.leave_type_id}</td>
                      <td className="py-3 px-4 text-xs">{formatDate(r.start_date)} - {formatDate(r.end_date)}</td>
                      <td className="py-3 px-4 text-right font-semibold">{r.total_days}</td>
                      <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(r.status)}`}>{r.status}</span></td>
                      <td className="py-3 px-4 text-xs">{formatDate(r.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ON LEAVE TAB */}
        {activeTab === 'on-leave' && isApprover && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-bold mb-4">Employees Currently on Leave ({leaveStats.onLeave?.length || 0})</h2>
            {leaveStats.onLeave?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leaveStats.onLeave.map(l => (
                  <div key={l.id} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="font-bold">{l.employees?.first_name} {l.employees?.last_name}</span>
                    </div>
                    <p className="text-sm">{l.leave_types?.name || 'Leave'}</p>
                    <p className="text-xs text-slate-500 mt-1">{formatDate(l.start_date)} - {formatDate(l.end_date)} ({l.total_days} days)</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-center py-8 text-slate-500">No employees currently on leave</p>}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-bold">My Leave History</h2>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 neu-inset rounded-lg text-sm">
                <option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Declined</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            {myRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-slate-50"><th className="text-left py-3 px-4">Type</th><th className="text-left py-3 px-4">Dates</th><th className="text-right py-3 px-4">Days</th><th className="text-left py-3 px-4">Reason</th><th className="text-center py-3 px-4">Status</th><th className="text-center py-3 px-4">Action</th></tr></thead>
                  <tbody>
                    {myRequests.filter(r => statusFilter === 'all' || r.status === statusFilter).map(r => (
                      <tr key={r.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.leave_types?.color }}></span><span>{r.leave_types?.name || r.leave_type_id}</span></div></td>
                        <td className="py-3 px-4 text-xs">{formatDate(r.start_date)} - {formatDate(r.end_date)}</td>
                        <td className="py-3 px-4 text-right font-semibold">{r.total_days}</td>
                        <td className="py-3 px-4 text-xs truncate max-w-[150px]">{r.reason || '-'}</td>
                        <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(r.status)}`}>{r.status}</span></td>
                        <td className="py-3 px-4 text-center">
                          {r.status === 'pending' && <button onClick={() => handleCancel(r.id)} className="text-xs text-red-600 hover:underline">Cancel</button>}
                          {r.status !== 'pending' && <span className="text-xs text-slate-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-center py-8 text-slate-500">No leave history</p>}
          </div>
        )}
      </main>
    </div>
  )
}
