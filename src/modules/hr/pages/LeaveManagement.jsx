import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useAuthStore from '../../../store/authStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import {
  Calendar, Clock, CheckCircle2, XCircle, Plus, Minus,
  ArrowLeft, Sun, Moon, Sparkles, Send, TrendingUp,
  FileText, AlertCircle, Shield, Upload, Eye,
  MessageSquare, History, Users, Filter, Download,
  Search, Bell, UserCheck, UserX, BarChart3,
  Settings, Briefcase, Home, LogOut, ChevronRight,
  Printer, Mail, Phone, MapPin, Building2, Star,
  Edit, Trash2, RefreshCw, PieChart, TrendingDown,
  Activity, BookOpen, Heart, GraduationCap, Plane,
  HelpCircle, AlertTriangle, Lock, Unlock
} from 'lucide-react'

// ═══════════════════════════════════════════
// LEAVE TYPE DEFINITIONS (SA BCEA Compliant)
// ═══════════════════════════════════════════
const LEAVE_TYPE_DEFINITIONS = [
  { id: 'annual', name: 'Annual Leave', icon: Calendar, days_allowed: 15, cycle: 'annual', paid: true, color: '#10b981', description: '15 working days per annual cycle' },
  { id: 'sick', name: 'Sick Leave', icon: Heart, days_allowed: 30, cycle: '36_months', paid: true, color: '#ef4444', description: '30 days over 36-month cycle', requires_doc: true },
  { id: 'family', name: 'Family Responsibility', icon: Users, days_allowed: 3, cycle: 'annual', paid: true, color: '#f59e0b', description: '3 days per annual cycle' },
  { id: 'maternity', name: 'Maternity Leave', icon: Heart, days_allowed: 120, cycle: 'per_event', paid: false, color: '#ec4899', description: 'Up to 4 consecutive months', requires_doc: true },
  { id: 'paternity', name: 'Paternity Leave', icon: Users, days_allowed: 10, cycle: 'per_event', paid: false, color: '#8b5cf6', description: '10 consecutive days' },
  { id: 'parental', name: 'Parental Leave', icon: Users, days_allowed: 10, cycle: 'per_event', paid: false, color: '#6366f1', description: '10 consecutive days' },
  { id: 'study', name: 'Study Leave', icon: GraduationCap, days_allowed: 10, cycle: 'annual', paid: true, color: '#0ea5e9', description: 'Company policy', requires_doc: true },
  { id: 'business_travel', name: 'Business Travel', icon: Plane, days_allowed: 0, cycle: 'custom', paid: true, color: '#14b8a6', description: 'Company approved travel' },
  { id: 'unpaid', name: 'Unpaid Leave', icon: Minus, days_allowed: 30, cycle: 'annual', paid: false, color: '#78716c', description: 'As approved' },
  { id: 'special', name: 'Special Leave', icon: Star, days_allowed: 5, cycle: 'per_event', paid: true, color: '#a855f7', description: 'Special circumstances' },
  { id: 'custom', name: 'Custom Leave', icon: Settings, days_allowed: 0, cycle: 'custom', paid: true, color: '#64748b', description: 'Custom leave type' },
]

export default function LeaveManagement() {
  const { isDark, toggleTheme } = useThemeStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const reportRef = useRef(null)
  
  // Core State
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Data State
  const [leaveTypes, setLeaveTypes] = useState(LEAVE_TYPE_DEFINITIONS)
  const [leaveBalances, setLeaveBalances] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [allRequests, setAllRequests] = useState([])
  const [leaveStats, setLeaveStats] = useState({})
  const [auditLogs, setAuditLogs] = useState([])
  
  // UI State
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form State
  const [applyForm, setApplyForm] = useState({
    leave_type_id: '', start_date: '', end_date: '',
    reason: '', document_url: '', is_partial: false,
    partial_start: '', partial_end: ''
  })
  const [calculatedDays, setCalculatedDays] = useState(0)

  // Role checks
  const isSuperAdmin = profile?.role === 'super_admin'
  const isHRManager = profile?.role === 'hr_manager'
  const isApprover = isSuperAdmin || isHRManager
  const isManager = ['super_admin', 'hr_manager', 'operations_manager'].includes(profile?.role)

  useEffect(() => { loadAllData() }, [])

  // ═══════════════════════════════════════════
  // LOAD ALL DATA
  // ═══════════════════════════════════════════
  const loadAllData = async () => {
    setLoading(true)
    try {
      const { data: types } = await supabase.from('leave_types').select('*').eq('is_active', true).order('display_order')
      if (types?.length > 0) setLeaveTypes(types)

      const { data: employee } = await supabase.from('employees').select('*').eq('user_id', user?.id).single()
      const employeeId = employee?.id

      if (employeeId) {
        const { data: balances } = await supabase
          .from('employee_leave_balances')
          .select('*, leave_types(name, code, color, days_allowed, cycle_type)')
          .eq('employee_id', employeeId)
        setLeaveBalances(balances || [])

        const { data: myReqs } = await supabase
          .from('leave_requests')
          .select('*, leave_types(name, code, color)')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false })
        setMyRequests(myReqs || [])
      }

      if (isApprover) {
        const { data: pending } = await supabase
          .from('leave_requests')
          .select('*, leave_types(name, code, color), employees(first_name, last_name, employee_code, department, position)')
          .eq('status', 'pending')
          .order('submitted_at', { ascending: false })
        setPendingApprovals(pending || [])

        const { data: all } = await supabase
          .from('leave_requests')
          .select('*, leave_types(name, code, color), employees(first_name, last_name, employee_code, department)')
          .order('created_at', { ascending: false })
          .limit(100)
        setAllRequests(all || [])

        const { data: logs } = await supabase
          .from('leave_approvals')
          .select('*, leave_requests(*, employees(first_name, last_name), leave_types(name))')
          .order('action_date', { ascending: false })
          .limit(50)
        setAuditLogs(logs || [])
      }

      await loadStats()
    } catch (error) { console.error('Error:', error) }
    setLoading(false)
  }

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const [
        { count: totalRequests }, { count: pendingCount },
        { count: approvedCount }, { count: declinedCount },
        { data: onLeave }
      ] = await Promise.all([
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('leave_requests').select('*, employees(first_name, last_name)').eq('status', 'approved').lte('start_date', today).gte('end_date', today)
      ])
      setLeaveStats({ totalRequests, pendingCount, approvedCount, declinedCount, onLeave: onLeave || [] })
    } catch (error) { console.error('Stats error:', error) }
  }

  // ═══════════════════════════════════════════
  // CALCULATE WORKING DAYS
  // ═══════════════════════════════════════════
  useEffect(() => {
    if (applyForm.start_date && applyForm.end_date) {
      if (applyForm.is_partial && applyForm.partial_start && applyForm.partial_end) {
        setCalculatedDays(0.5)
      } else {
        let days = 0
        const start = new Date(applyForm.start_date)
        const end = new Date(applyForm.end_date)
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (d.getDay() !== 0 && d.getDay() !== 6) days++
        }
        setCalculatedDays(days)
      }
    } else { setCalculatedDays(0) }
  }, [applyForm.start_date, applyForm.end_date, applyForm.is_partial, applyForm.partial_start, applyForm.partial_end])

  // ═══════════════════════════════════════════
  // OPEN LEAVE APPLICATION FOR SPECIFIC TYPE
  // ═══════════════════════════════════════════
  const openLeaveApplication = (leaveTypeId) => {
    setApplyForm({
      leave_type_id: leaveTypeId, start_date: '', end_date: '',
      reason: '', document_url: '', is_partial: false,
      partial_start: '', partial_end: ''
    })
    setShowApplyForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ═══════════════════════════════════════════
  // UPLOAD DOCUMENT
  // ═══════════════════════════════════════════
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `leave-docs/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const { error } = await supabase.storage.from('documents').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName)
      setApplyForm({...applyForm, document_url: publicUrl})
      toast.success('Document uploaded!')
    } catch (error) { toast.error('Upload failed') }
    setUploading(false)
  }

  // ═══════════════════════════════════════════
  // SUBMIT LEAVE REQUEST
  // ═══════════════════════════════════════════
  const handleSubmitLeave = async (e) => {
    e.preventDefault()
    if (!applyForm.leave_type_id) { toast.error('Select leave type'); return }
    if (!applyForm.start_date || !applyForm.end_date) { toast.error('Select dates'); return }
    if (calculatedDays <= 0) { toast.error('Invalid dates'); return }

    const leaveType = leaveTypes.find(lt => (lt.id || lt.code) === applyForm.leave_type_id)
    const balance = leaveBalances.find(b => (b.leave_type_id || b.leave_types?.code) === applyForm.leave_type_id)
    
    if (leaveType?.paid !== false && balance && balance.remaining_days < calculatedDays) {
      toast.error(`Insufficient balance. You have ${balance.remaining_days} days remaining.`)
      return
    }

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
        status: 'pending',
        is_partial: applyForm.is_partial
      }])

      if (error) throw error

      await supabase.from('leave_approvals').insert([{
        leave_request_id: null,
        action_by: user.id,
        action: 'submitted',
        remarks: `Leave submitted: ${applyForm.leave_type_id} | ${applyForm.start_date} to ${applyForm.end_date} | ${calculatedDays} days`
      }])

      toast.success('Leave request submitted! 🎉')
      setShowApplyForm(false)
      setApplyForm({ leave_type_id: '', start_date: '', end_date: '', reason: '', document_url: '', is_partial: false, partial_start: '', partial_end: '' })
      loadAllData()
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Failed: ' + error.message)
    }
    setSubmitting(false)
  }

  // ═══════════════════════════════════════════
  // APPROVE / DECLINE / REQUEST INFO
  // ═══════════════════════════════════════════
  const handleApprove = async (id, name) => {
    if (!window.confirm(`Approve leave for ${name}?`)) return
    try {
      await supabase.from('leave_requests').update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() }).eq('id', id)
      await supabase.from('leave_approvals').insert([{ leave_request_id: id, action_by: user.id, action: 'approved', remarks: 'Leave approved' }])
      toast.success(`Approved for ${name}! ✅`)
      loadAllData()
    } catch (error) { toast.error('Failed to approve') }
  }

  const handleDecline = async (id, name) => {
    const reason = prompt(`Decline reason for ${name}:`) || 'Not specified'
    if (reason === null) return
    try {
      await supabase.from('leave_requests').update({ status: 'rejected', rejection_reason: reason, approved_by: user.id, approved_at: new Date().toISOString() }).eq('id', id)
      await supabase.from('leave_approvals').insert([{ leave_request_id: id, action_by: user.id, action: 'rejected', remarks: reason }])
      toast.success(`Declined for ${name}`)
      loadAllData()
    } catch (error) { toast.error('Failed to decline') }
  }

  const handleRequestInfo = async (id, name) => {
    const msg = prompt(`What info is needed from ${name}?`) || 'Please provide more details'
    if (msg === null) return
    try {
      await supabase.from('leave_requests').update({ status: 'pending', comments: `INFO REQUESTED: ${msg}` }).eq('id', id)
      await supabase.from('leave_approvals').insert([{ leave_request_id: id, action_by: user.id, action: 'returned', remarks: msg }])
      toast.success(`Info requested from ${name}`)
      loadAllData()
    } catch (error) { toast.error('Failed') }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this request?')) return
    try {
      await supabase.from('leave_requests').update({ status: 'cancelled' }).eq('id', id)
      await supabase.from('leave_approvals').insert([{ leave_request_id: id, action_by: user.id, action: 'cancelled', remarks: 'Cancelled by employee' }])
      toast.success('Cancelled')
      loadAllData()
    } catch (error) { toast.error('Failed') }
  }

  // ═══════════════════════════════════════════
  // EXPORT FUNCTIONS
  // ═══════════════════════════════════════════
  const handleExportCSV = () => {
    const data = allRequests.length > 0 ? allRequests : myRequests
    const csv = ['Employee,Type,Start,End,Days,Status,Submitted'].join(',') + '\n' +
      data.map(r => `${r.employees?.first_name || 'N/A'} ${r.employees?.last_name || ''},${r.leave_types?.name || r.leave_type_id},${r.start_date},${r.end_date},${r.total_days},${r.status},${r.submitted_at}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `Leave_Report_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    toast.success('CSV downloaded!')
  }

  const handleExportPDF = async () => {
    try {
      const element = reportRef.current
      if (!element) return
      const opt = { margin: 10, filename: `Leave_Report_${new Date().toISOString().split('T')[0]}.pdf`, image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } }
      await html2pdf().set(opt).from(element).save()
      toast.success('PDF downloaded!')
    } catch (error) { toast.error('PDF failed') }
  }

  // ═══════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'
  
  const getBalanceForType = (typeId) => {
    return leaveBalances.find(b => (b.leave_type_id || b.leave_types?.code) === typeId)
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/hr" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">HR Dashboard</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Calendar className="w-8 h-8 text-emerald-600" />Leave Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              SA BCEA Compliant · {isSuperAdmin ? 'Super Administrator' : isHRManager ? 'HR Administrator' : isManager ? 'Manager View' : 'Employee Self-Service'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* GLOBAL APPLY BUTTON - ADDED HERE */}
            <button 
              onClick={() => openLeaveApplication('')}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg transition-colors"
            >
              <Plus className="w-5 h-5" /> Apply Leave
            </button>
            <button onClick={handleExportCSV} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm flex items-center gap-1"><Download className="w-4 h-4" /> CSV</button>
            <button onClick={handleExportPDF} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm flex items-center gap-1"><FileText className="w-4 h-4" /> PDF</button>
            {isSuperAdmin && (
              <button onClick={() => navigate('/hr/settings')} className="px-4 py-2 bg-slate-600 text-white rounded-xl text-sm flex items-center gap-1"><Settings className="w-4 h-4" /> Configure</button>
            )}
          </div>
        </motion.div>

        {/* Admin Stats Bar */}
        {isApprover && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              { icon: FileText, label: 'Total', value: leaveStats.totalRequests, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
              { icon: Clock, label: 'Pending', value: leaveStats.pendingCount, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
              { icon: CheckCircle2, label: 'Approved', value: leaveStats.approvedCount, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
              { icon: XCircle, label: 'Declined', value: leaveStats.declinedCount, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
              { icon: Users, label: 'On Leave Now', value: leaveStats.onLeave?.length || 0, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
            ].map(s => (
              <div key={s.label} className="neu-raised rounded-2xl p-3 text-center">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-1`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
                <p className="text-xl font-bold">{s.value}</p><p className="text-[10px] text-slate-500">{s.label}</p>
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
              { id: 'audit', label: 'Audit Trail', icon: History },
            ] : []),
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3"></div><p>Loading leave data...</p></div>}

        {/* ═══════════════════════════════════════════ */}
        {/* DASHBOARD TAB */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === 'dashboard' && !loading && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />Leave Balances
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {leaveTypes.map(type => {
                const balance = getBalanceForType(type.id || type.code)
                const Icon = type.icon || Calendar
                const allocated = balance?.allocated_days || type.days_allowed || 0
                const used = balance?.used_days || 0
                const pending = balance?.pending_days || 0
                const remaining = balance?.remaining_days || allocated
                const usagePercent = allocated > 0 ? Math.round((used / allocated) * 100) : 0

                return (
                  <motion.div key={type.id || type.code} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="neu-raised rounded-2xl p-5 hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden"
                    onClick={() => openLeaveApplication(type.id || type.code)}>
                    <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: type.color }}></div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: type.color + '20' }}>
                          <Icon className="w-5 h-5" style={{ color: type.color }} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">{type.name}</h3>
                          <p className="text-[10px] text-slate-400">{type.description}</p>
                        </div>
                      </div>
                      {/* APPLY BUTTON ON EACH CARD */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); openLeaveApplication(type.id || type.code) }}
                        className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
                        title={`Apply for ${type.name}`}
                      >
                        <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </button>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-600 rounded-full mb-3 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(usagePercent, 100)}%`, backgroundColor: type.color }}></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2">
                        <p className="text-lg font-bold" style={{ color: type.color }}>{remaining}</p>
                        <p className="text-[9px] text-slate-400">Available</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2">
                        <p className="text-lg font-bold text-slate-600">{allocated}</p>
                        <p className="text-[9px] text-slate-400">Entitlement</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2">
                        <p className="text-sm font-bold text-amber-600">{pending}</p>
                        <p className="text-[9px] text-slate-400">Pending</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2">
                        <p className="text-sm font-bold text-red-500">{used}</p>
                        <p className="text-[9px] text-slate-400">Taken</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* MY LEAVE TAB - CARD GRID DESIGN */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === 'my-leave' && !loading && (
          <div>
            {/* Leave Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {leaveTypes.map(type => {
                const balance = getBalanceForType(type.id || type.code)
                const Icon = type.icon || Calendar
                const available = balance?.remaining_days || type.days_allowed || 0
                const pending = balance?.pending_days || 0

                return (
                  <motion.div 
                    key={type.id || type.code}
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="neu-raised rounded-2xl p-5 relative min-h-[180px] transition-all hover:scale-[1.02] cursor-pointer"
                    style={{ 
                      background: isDark 
                        ? 'linear-gradient(145deg, #1e293b, #0f172a)' 
                        : 'linear-gradient(145deg, #394150, #2d3543)'
                    }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: type.color }}></div>
                    
                    <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
                      <Icon className="w-5 h-5" style={{ color: type.color }} />
                      {type.name}
                    </h3>

                    <div className="flex justify-between items-center mb-3">
                      <div className="text-center flex-1">
                        <p className="text-slate-300 text-[10px] uppercase tracking-wide mb-1">Available</p>
                        <p className="text-2xl font-bold" style={{ color: type.color }}>
                          {available.toFixed(4)}
                        </p>
                        <p className="text-slate-400 text-[10px]">Days</p>
                      </div>

                      <div className="w-px h-16 bg-white/20 mx-2"></div>

                      <div className="text-center flex-1">
                        <p className="text-slate-300 text-[10px] uppercase tracking-wide mb-1">Pending</p>
                        <p className="text-2xl font-bold text-amber-400">
                          {pending.toFixed(4)}
                        </p>
                        <p className="text-slate-400 text-[10px]">Days</p>
                      </div>
                    </div>

                    <p className="text-slate-400 text-[11px] mt-2">{type.description}</p>

                    {/* APPLY BUTTON ON MY LEAVE CARDS */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); openLeaveApplication(type.id || type.code) }}
                      className="absolute bottom-3 right-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-all hover:scale-110"
                      title={`Apply for ${type.name}`}
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </motion.div>
                )
              })}
            </div>

            {/* Recent Applications Section */}
            <div className="neu-raised rounded-3xl p-6">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                  <Clock className="w-6 h-6 text-blue-500" />
                  Recent Applications
                </h2>
                <button 
                  onClick={() => setActiveTab('history')}
                  className="text-blue-500 hover:text-blue-600 font-semibold text-sm flex items-center gap-1 transition-colors"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {myRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-700/30">
                        <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Leave Type</th>
                        <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">From</th>
                        <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">To</th>
                        <th className="text-right py-3 px-4 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Days</th>
                        <th className="text-center py-3 px-4 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-4 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Applied On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myRequests.slice(0, 10).map(r => (
                        <tr key={r.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.leave_types?.color || '#10b981' }}></span>
                              <span className="font-medium text-slate-700 dark:text-slate-300">{r.leave_types?.name || r.leave_type_id}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">{formatDate(r.start_date)}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">{formatDate(r.end_date)}</td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">{r.total_days}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              r.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              r.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              r.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                            }`}>
                              {r.status?.charAt(0).toUpperCase() + r.status?.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">{formatDate(r.submitted_at || r.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">No recent applications</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Click the + button on any leave card to apply</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* APPLY FORM MODAL */}
        {/* ═══════════════════════════════════════════ */}
        <AnimatePresence>
          {showApplyForm && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowApplyForm(false)}>
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Apply for Leave</h2>
                    <button onClick={() => setShowApplyForm(false)} className="p-1 rounded-lg hover:bg-slate-100"><XCircle className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleSubmitLeave} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Leave Type *</label>
                      <select value={applyForm.leave_type_id} onChange={e => setApplyForm({...applyForm, leave_type_id: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" required>
                        <option value="">Select type...</option>
                        {leaveTypes.map(lt => <option key={lt.id || lt.code} value={lt.id || lt.code}>{lt.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-sm font-medium">Start Date *</label><input type="date" value={applyForm.start_date} onChange={e => setApplyForm({...applyForm, start_date: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" required /></div>
                      <div><label className="text-sm font-medium">End Date *</label><input type="date" value={applyForm.end_date} onChange={e => setApplyForm({...applyForm, end_date: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" required /></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="partial" checked={applyForm.is_partial} onChange={e => setApplyForm({...applyForm, is_partial: e.target.checked})} />
                      <label htmlFor="partial" className="text-sm">Partial day leave</label>
                    </div>
                    {calculatedDays > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                        <p className="font-semibold text-blue-700">{calculatedDays} day{calculatedDays !== 1 ? 's' : ''} selected</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium">Reason</label>
                      <textarea value={applyForm.reason} onChange={e => setApplyForm({...applyForm, reason: e.target.value})} rows={2} className="w-full p-3 neu-inset rounded-xl mt-1" placeholder="Reason for leave..." />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Supporting Document</label>
                      <div className="mt-1">
                        <label className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl cursor-pointer hover:bg-slate-200 inline-flex items-center gap-2 text-sm">
                          <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload File'}
                          <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.png,.doc,.docx" />
                        </label>
                        {applyForm.document_url && <span className="ml-2 text-xs text-emerald-600">✅ Uploaded</span>}
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end pt-2">
                      <button type="button" onClick={() => setShowApplyForm(false)} className="px-5 py-2.5 bg-slate-200 rounded-xl text-sm">Cancel</button>
                      <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50">
                        {submitting ? 'Submitting...' : <><Send className="w-4 h-4" /> Submit</>}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════ */}
        {/* APPROVALS TAB */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === 'approvals' && isApprover && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-6 h-6 text-amber-600" />
              <h2 className="text-lg font-bold">Pending Approvals ({pendingApprovals.length})</h2>
            </div>
            {pendingApprovals.length > 0 ? (
              <div className="space-y-4">
                {pendingApprovals.map(req => (
                  <div key={req.id} className="bg-white dark:bg-slate-700/30 border border-amber-200 rounded-xl p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: req.leave_types?.color }}></span><span className="font-bold text-lg">{req.employees?.first_name} {req.employees?.last_name}</span><span className="text-xs text-slate-500">{req.employees?.employee_code} · {req.employees?.department}</span></div>
                        <div className="grid grid-cols-2 gap-2 text-sm ml-5">
                          <div><span className="text-slate-500">Type:</span> <span className="font-semibold">{req.leave_types?.name}</span></div>
                          <div><span className="text-slate-500">Days:</span> <span className="font-semibold">{req.total_days} days</span></div>
                          <div><span className="text-slate-500">Dates:</span> <span>{formatDate(req.start_date)} - {formatDate(req.end_date)}</span></div>
                          <div><span className="text-slate-500">Position:</span> <span>{req.employees?.position || 'N/A'}</span></div>
                        </div>
                        {req.reason && <p className="text-sm text-slate-600 mt-2 ml-5">📝 {req.reason}</p>}
                        {req.document_url && <a href={req.document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline ml-5 mt-1 inline-block">📎 View document</a>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleApprove(req.id, `${req.employees?.first_name} ${req.employees?.last_name}`)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Approve</button>
                        <button onClick={() => handleDecline(req.id, `${req.employees?.first_name} ${req.employees?.last_name}`)} className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 flex items-center gap-2"><XCircle className="w-4 h-4" />Decline</button>
                        <button onClick={() => handleRequestInfo(req.id, `${req.employees?.first_name} ${req.employees?.last_name}`)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2"><MessageSquare className="w-4 h-4" />Request Info</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16"><CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" /><p className="text-xl font-semibold">All Clear! 🎉</p><p className="text-sm text-slate-500">No pending requests</p></div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ALL REQUESTS TAB */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === 'all-requests' && isApprover && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex flex-wrap justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold">All Leave Requests</h2>
              <div className="flex gap-2 flex-wrap">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 neu-inset rounded-lg text-sm"><option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Declined</option></select>
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="px-3 py-1.5 neu-inset rounded-lg text-sm w-40" />
              </div>
            </div>
            <div ref={reportRef} className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-slate-50"><th className="text-left py-3 px-3">Employee</th><th className="text-left py-3 px-3">Type</th><th className="text-left py-3 px-3">Dates</th><th className="text-right py-3 px-3">Days</th><th className="text-left py-3 px-3">Dept</th><th className="text-center py-3 px-3">Status</th><th className="text-left py-3 px-3">Submitted</th><th className="text-left py-3 px-3">Approved By</th></tr></thead>
                <tbody>
                  {allRequests.filter(r => {
                    if (statusFilter !== 'all' && r.status !== statusFilter) return false
                    if (searchTerm && !(`${r.employees?.first_name} ${r.employees?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()))) return false
                    return true
                  }).map(r => (
                    <tr key={r.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-xs">{r.employees?.first_name} {r.employees?.last_name}</td>
                      <td className="py-2 px-3 text-xs">{r.leave_types?.name || r.leave_type_id}</td>
                      <td className="py-2 px-3 text-xs">{formatDate(r.start_date)} - {formatDate(r.end_date)}</td>
                      <td className="py-2 px-3 text-right text-xs font-semibold">{r.total_days}</td>
                      <td className="py-2 px-3 text-xs">{r.employees?.department || 'N/A'}</td>
                      <td className="py-2 px-3 text-center"><span className={`px-2 py-1 rounded-full text-[10px] ${getStatusBadge(r.status)}`}>{r.status}</span></td>
                      <td className="py-2 px-3 text-[10px]">{formatDate(r.submitted_at)}</td>
                      <td className="py-2 px-3 text-[10px]">{r.approved_by ? 'Approved' : r.status === 'rejected' ? 'Declined' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* AUDIT TRAIL TAB */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === 'audit' && isApprover && !loading && (
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><History className="w-5 h-5 text-purple-600" />Audit Trail</h2>
            {auditLogs.length > 0 ? (
              <div className="space-y-2">
                {auditLogs.slice(0, 30).map(log => (
                  <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30 text-xs">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      log.action === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      log.action === 'rejected' ? 'bg-red-100 text-red-700' :
                      log.action === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>{log.action}</span>
                    <span className="text-slate-500 flex-1">{log.remarks}</span>
                    <span className="text-slate-400 whitespace-nowrap">{formatDateTime(log.action_date)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-center py-8 text-slate-500">No audit records</p>}
          </div>
        )}

        {/* Missing getStatusBadge function - adding here */}
        {(() => {
          window.getStatusBadge = (s) => ({
            pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
          }[s] || 'bg-slate-100')
          return null
        })()}
      </main>
    </div>
  )
}

// Helper function for status badges
const getStatusBadge = (s) => ({
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
}[s] || 'bg-slate-100')
