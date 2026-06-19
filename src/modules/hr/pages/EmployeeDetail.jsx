import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useHRStore from '../store/hrStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  User, Save, Upload, ChevronRight, ArrowLeft,
  Mail, Phone, MapPin, Calendar, Briefcase, Shield, Users,
  Clock, CreditCard, FileText, Eye, Download, Trash2,
  CheckCircle2, XCircle, AlertCircle, BarChart3,
  Building2, BookOpen, Star, RefreshCw
} from 'lucide-react'

// Leave type definitions for color coding
const LEAVE_TYPE_DEFINITIONS = [
  { id: 'annual', name: 'Annual Leave', days_allowed: 15, color: '#10b981' },
  { id: 'sick', name: 'Sick Leave', days_allowed: 30, color: '#ef4444' },
  { id: 'family', name: 'Family Responsibility', days_allowed: 3, color: '#f59e0b' },
  { id: 'maternity', name: 'Maternity Leave', days_allowed: 120, color: '#ec4899' },
  { id: 'parental', name: 'Parental Leave', days_allowed: 10, color: '#8b5cf6' },
  { id: 'study', name: 'Study Leave', days_allowed: 10, color: '#0ea5e9' },
  { id: 'compassionate', name: 'Compassionate Leave', days_allowed: 5, color: '#64748b' },
  { id: 'unpaid', name: 'Unpaid Leave', days_allowed: 30, color: '#78716c' },
]

export default function EmployeeDetail() {
  const { id } = useParams()
  const { selectedEmployee, fetchEmployee, updateEmployee, deleteEmployee, loading } = useHRStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const photoInputRef = useRef(null)
  const fileInputRef = useRef(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(null)
  const [activeTab, setActiveTab] = useState('general')
  const [uploading, setUploading] = useState(false)
  
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [payrollHistory, setPayrollHistory] = useState([])
  const [payrollDetails, setPayrollDetails] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [leaveRecords, setLeaveRecords] = useState([])
  const [leaveBalances, setLeaveBalances] = useState([])
  const [leaveSubTab, setLeaveSubTab] = useState('history')
  const [events, setEvents] = useState([])
  const [attachments, setAttachments] = useState([])
  const [tabLoading, setTabLoading] = useState(false)
  const [refreshingTab, setRefreshingTab] = useState(null)

  const [stats, setStats] = useState({
    totalHoursThisWeek: 0,
    totalHoursThisMonth: 0,
    overtimeHours: 0,
    leaveBalance: 0,
    upcomingLeave: 0,
    completedJobs: 0,
    activeJobs: 0,
    attendanceRate: 0,
    lastPayroll: null,
    nextSchedule: null
  })

  const allowedFields = [
    'first_name', 'last_name', 'email', 'phone', 'alternative_phone',
    'address_line1', 'address_line2', 'city', 'state', 'postal_code',
    'department', 'position', 'employment_type', 'employment_status',
    'date_of_hire', 'date_of_birth', 'gender', 'marital_status',
    'id_number', 'tax_number', 'bank_name', 'bank_account_number',
    'bank_branch_code', 'emergency_contact_name', 'emergency_contact_phone',
    'emergency_contact_relation', 'notes', 'profile_photo_url'
  ]

  useEffect(() => {
    if (id && id !== 'new') {
      fetchEmployee(id)
      loadAllTabData()
    }
  }, [id])

  useEffect(() => {
    if (selectedEmployee) {
      const cleanEmployee = {}
      allowedFields.forEach(field => {
        if (selectedEmployee[field] !== undefined) {
          cleanEmployee[field] = selectedEmployee[field]
        }
      })
      setEditData(cleanEmployee)
    }
  }, [selectedEmployee])

  const loadAllTabData = async () => {
    setTabLoading(true)
    await Promise.all([
      loadAttendanceRecords(),
      loadPayrollHistory(),
      loadPayrollDetails(),
      loadSchedules(),
      loadLeaveRecords(),
      loadLeaveBalances(),
      loadEvents(),
      loadAttachments(),
      loadStats()
    ])
    setTabLoading(false)
  }

  const refreshTab = async (tabName) => {
    setRefreshingTab(tabName)
    switch(tabName) {
      case 'attendance': await loadAttendanceRecords(); break
      case 'payroll': await loadPayrollHistory(); break
      case 'details': await loadPayrollDetails(); break
      case 'schedule': await loadSchedules(); break
      case 'leave': await loadLeaveRecords(); await loadLeaveBalances(); break
      case 'events': await loadEvents(); break
    }
    await loadStats()
    setRefreshingTab(null)
  }

  const loadAttendanceRecords = async () => {
    if (!id) return
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', id)
        .order('attendance_date', { ascending: false })
        .limit(50)
      if (error) { console.error('Attendance query error:', error.message) }
      else { setAttendanceRecords(data || []) }
    } catch (e) { setAttendanceRecords([]) }
  }

  const loadPayrollHistory = async () => {
    if (!id) return
    try {
      const { data } = await supabase
        .from('payslips')
        .select('*, payroll_periods(period_name, period_start, period_end)')
        .eq('employee_id', id)
        .order('created_at', { ascending: false })
        .limit(20)
      setPayrollHistory(data || [])
    } catch (e) { setPayrollHistory([]) }
  }

  const loadPayrollDetails = async () => {
    if (!id) return
    try {
      const { data } = await supabase
        .from('salary_structures')
        .select('*')
        .eq('employee_id', id)
        .eq('is_active', true)
        .maybeSingle()
      setPayrollDetails(data || null)
    } catch (e) { setPayrollDetails(null) }
  }

  const loadSchedules = async () => {
    if (!id) return
    try {
      const { data } = await supabase
        .from('employee_shifts')
        .select('*, shift_types(*), jobs(title, job_number, site_address, clients(company_name))')
        .eq('employee_id', id)
        .gte('shift_date', new Date().toISOString().split('T')[0])
        .order('shift_date', { ascending: true })
        .limit(30)
      setSchedules(data || [])
    } catch (e) { setSchedules([]) }
  }

  const loadLeaveRecords = async () => {
    if (!id) return
    try {
      const { data } = await supabase
        .from('leave_requests')
        .select('*, leave_types(name)')
        .eq('employee_id', id)
        .order('created_at', { ascending: false })
        .limit(20)
      setLeaveRecords(data || [])
    } catch (e) { setLeaveRecords([]) }
  }

  // AMENDED: Leave Balances - uses simple query
  const loadLeaveBalances = async () => {
    if (!id) return
    try {
      // Sync balances first
      await supabase.rpc('sync_leave_balances', { p_employee_id: id })
      
      // Fetch balances with simple query
      const { data, error } = await supabase
        .from('employee_leave_balances')
        .select('*')
        .eq('employee_id', id)
      
      if (error) {
        console.error('Leave balances error:', error.message)
        setLeaveBalances([])
      } else {
        console.log('Leave balances loaded:', data?.length || 0)
        setLeaveBalances(data || [])
        
        const totalRemaining = (data || []).reduce((sum, b) => sum + (Number(b.remaining_days) || 0), 0)
        setStats(prev => ({ ...prev, leaveBalance: totalRemaining }))
      }
    } catch (e) {
      console.error('Leave balances load error:', e)
      setLeaveBalances([])
    }
  }

  const loadEvents = async () => {
    if (!id) return
    try {
      const { data } = await supabase
        .from('jobs')
        .select('*')
        .eq('assigned_to', id)
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true })
        .limit(10)
      setEvents(data || [])
    } catch (e) { setEvents([]) }
  }

  const loadAttachments = async () => {
    if (!id) return
    try {
      const { data } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', id)
        .order('uploaded_at', { ascending: false })
      setAttachments(data || [])
    } catch (e) { setAttachments([]) }
  }

  const loadStats = async () => {
    if (!id) return
    try {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekStartStr = weekStart.toISOString().split('T')[0]
      
      let totalHours = 0
      try {
        const { data: weekAttendance } = await supabase
          .from('attendance_records')
          .select('total_hours')
          .eq('employee_id', id)
          .gte('attendance_date', weekStartStr)
          .not('total_hours', 'is', null)
        totalHours = weekAttendance?.reduce((s, a) => s + (a.total_hours || 0), 0) || 0
      } catch (e) {}

      let activeJobsCount = 0
      try {
        const { count } = await supabase
          .from('job_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('employee_id', id)
          .eq('status', 'assigned')
        activeJobsCount = count || 0
      } catch (e) {}

      const presentCount = attendanceRecords?.filter(a => a.status === 'present').length || 0
      const totalRecords = attendanceRecords?.length || 0
      const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0

      setStats(prev => ({
        ...prev,
        totalHoursThisWeek: totalHours,
        totalHoursThisMonth: totalHours * 4,
        overtimeHours: Math.max(0, totalHours - 40),
        upcomingLeave: leaveRecords.filter(l => l.status === 'approved' && l.start_date > new Date().toISOString().split('T')[0]).length,
        completedJobs: presentCount,
        activeJobs: activeJobsCount,
        attendanceRate: attendanceRate,
      }))
    } catch (e) {}
  }

  const handleSave = async () => {
    if (!editData.first_name || !editData.last_name || !editData.email) {
      toast.error('Name and email are required')
      return
    }
    const safeEditData = {}
    allowedFields.forEach(field => {
      if (editData[field] !== undefined) { safeEditData[field] = editData[field] || null }
    })
    const result = await updateEmployee(id, safeEditData)
    if (result.success) { toast.success('Employee updated!'); setIsEditing(false); fetchEmployee(id) }
    else { toast.error(result.error || 'Failed to update') }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (selectedEmployee) {
      const cleanEmployee = {}
      allowedFields.forEach(field => {
        if (selectedEmployee[field] !== undefined) { cleanEmployee[field] = selectedEmployee[field] }
      })
      setEditData(cleanEmployee)
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Terminate this employee?')) {
      await deleteEmployee(id)
      toast.success('Employee terminated')
      navigate('/hr/employees')
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `employee-photos/${id}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('fleet').upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('fleet').getPublicUrl(fileName)
      await updateEmployee(id, { profile_photo_url: publicUrl })
      fetchEmployee(id); toast.success('Photo updated!')
    } catch (error) { toast.error('Failed to upload photo') }
    setUploading(false)
  }

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `employee-docs/${id}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('documents').upload(fileName, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName)
      await supabase.from('employee_documents').insert([{ employee_id: id, document_type: 'other', document_name: file.name, document_url: publicUrl }])
      toast.success('Document attached!'); loadAttachments()
    } catch (error) { toast.error('Failed to upload') }
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
  const formatTime = (date) => date ? new Date(date).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : '-'

  const inputClass = "w-full border border-[#2c73b6] bg-[#f7f7c2] h-[30px] px-2 outline-none text-sm"
  const labelCellClass = "cell label-cell justify-end font-bold bg-[#d7e5f2] dark:bg-slate-700"
  const valueCellClass = "cell bg-[#dce8f5] dark:bg-slate-600"

  const tabs = [
    { id: 'general', label: 'General Info', icon: '📋' },
    { id: 'attendance', label: 'Time Clock', icon: '⏰' },
    { id: 'payroll', label: 'Payroll History', icon: '💰' },
    { id: 'details', label: 'Payroll Details', icon: '💳' },
    { id: 'schedule', label: 'Scheduling', icon: '📅' },
    { id: 'leave', label: 'Leave', icon: '🏖️' },
    { id: 'events', label: 'Events', icon: '📢' },
  ]

  if (loading || !selectedEmployee) {
    return (
      <div className="min-h-screen bg-[#d8d8d8] dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2c5f9b]"></div>
      </div>
    )
  }

  const employee = selectedEmployee

  return (
    <div className="min-h-screen bg-[#d8d8d8] dark:bg-slate-900 font-['Inter'] transition-colors duration-300">
      <Navbar />
      <main className="max-w-7xl mx-auto px-2 sm:px-4 pt-4 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-2 text-sm px-2">
          <Link to="/hr" className="text-[#2c5f9b] hover:underline">HR</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/hr/employees" className="text-[#2c5f9b] hover:underline">Employees</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300">{employee.first_name} {employee.last_name}</span>
        </div>

        {/* Title */}
        <div className="flex items-center justify-center relative mb-3">
          <div className="absolute left-4 text-[50px] text-[#2f5f9b]">👥</div>
          <h1 className="text-[50px] md:text-[60px] text-[#2c5f9b] tracking-wider font-black uppercase" style={{ fontFamily: "'Alumni Sans Pinstripe', sans-serif" }}>
            Employee Manager
          </h1>
        </div>

        {/* Top Bar */}
        <div className="flex items-center gap-2 mb-3 flex-wrap px-2">
          <span className="text-base font-bold text-slate-700 dark:text-slate-300">Employee:</span>
          <input 
            value={`${editData?.first_name || employee.first_name} ${editData?.last_name || employee.last_name}`} 
            readOnly={!isEditing}
            onChange={e => { const [first, ...last] = e.target.value.split(' '); setEditData({...editData, first_name: first || '', last_name: last.join(' ') || ''}) }}
            className="border border-[#2c73b6] bg-white dark:bg-slate-700 h-7 px-2 outline-none w-[340px] text-sm" 
          />
          {isEditing ? (
            <>
              <button onClick={handleSave} className="neo-btn h-8 px-4 rounded-md bg-gradient-to-b from-[#4f8fd0] to-[#2d5f98] text-white font-bold text-sm">💾 Save</button>
              <button onClick={handleCancelEdit} className="neo-btn h-8 px-4 rounded-md bg-gradient-to-b from-gray-400 to-gray-600 text-white font-bold text-sm">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="neo-btn h-8 px-4 rounded-md bg-gradient-to-b from-[#4f8fd0] to-[#2d5f98] text-white font-bold text-sm">✏️ Edit</button>
              <button onClick={handleDelete} className="neo-btn h-8 px-4 rounded-md bg-gradient-to-b from-red-500 to-red-700 text-white font-bold text-sm">🗑 Terminate</button>
            </>
          )}
          <span className="text-base font-bold text-slate-700 dark:text-slate-300 ml-4">ID:</span>
          <input value={employee.employee_code || ''} className="border border-[#2c73b6] bg-white dark:bg-slate-700 h-7 px-2 outline-none w-[140px] text-sm" readOnly />
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-3 px-2">
          {[
            { label: 'Hours/Week', value: stats.totalHoursThisWeek.toFixed(1) },
            { label: 'Overtime', value: stats.overtimeHours.toFixed(1) + 'h' },
            { label: 'Leave Bal', value: stats.leaveBalance + 'd' },
            { label: 'Attendance', value: stats.attendanceRate + '%' },
            { label: 'Active Jobs', value: stats.activeJobs },
            { label: 'Completed', value: stats.completedJobs },
            { label: 'Upcoming Leave', value: stats.upcomingLeave },
            { label: 'Status', value: employee.employment_status?.replace('_', ' ') },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-slate-700 border border-[#2f77bb] rounded-md p-1.5 text-center">
              <p className="text-[10px] text-slate-500">{s.label}</p>
              <p className="text-sm font-bold text-slate-800 dark:text-white capitalize">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-7 border border-[#2f77bb] mb-0">
          {tabs.map(tab => (
            <div key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`text-center py-2 text-sm font-bold cursor-pointer border-r border-[#2f77bb] last:border-r-0 transition-colors ${
                activeTab === tab.id ? 'bg-[#f4f4f4] dark:bg-slate-600 text-slate-800 dark:text-white' : 'bg-[#d3e1ef] dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-[#c5d8ec]'
              }`}>
              {tab.icon} {tab.label}
            </div>
          ))}
        </div>

        {/* Tab Content */}
        <div className="border border-[#2f77bb] bg-[#d7e5f2] dark:bg-slate-800 p-2.5 min-h-[400px]">
          
          {/* GENERAL INFO TAB */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_170px] gap-5">
              <div>
                <div className="grid grid-cols-[140px_1fr_140px_1fr] border-t border-l border-[#2f77bb]">
                  <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Last Name:</div>
                  <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                    {isEditing ? <input value={editData?.last_name || ''} onChange={e => setEditData({...editData, last_name: e.target.value})} className={inputClass} /> : <span>{employee.last_name}</span>}
                  </div>
                  <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>First Name:</div>
                  <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                    {isEditing ? <input value={editData?.first_name || ''} onChange={e => setEditData({...editData, first_name: e.target.value})} className={inputClass} /> : <span>{employee.first_name}</span>}
                  </div>
                  <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Email:</div>
                  <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"} style={{gridColumn: 'span 3'}}>
                    {isEditing ? <input value={editData?.email || ''} onChange={e => setEditData({...editData, email: e.target.value})} className={inputClass} /> : <span>{employee.email}</span>}
                  </div>
                  <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Phone:</div>
                  <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                    {isEditing ? <input value={editData?.phone || ''} onChange={e => setEditData({...editData, phone: e.target.value})} className={inputClass} /> : <span>{employee.phone || '-'}</span>}
                  </div>
                  <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Position:</div>
                  <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                    {isEditing ? <input value={editData?.position || ''} onChange={e => setEditData({...editData, position: e.target.value})} className={inputClass} /> : <span>{employee.position || '-'}</span>}
                  </div>
                  <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Department:</div>
                  <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                    {isEditing ? <input value={editData?.department || ''} onChange={e => setEditData({...editData, department: e.target.value})} className={inputClass} /> : <span>{employee.department || '-'}</span>}
                  </div>
                  <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Status:</div>
                  <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                    {isEditing ? (
                      <select value={editData?.employment_status || ''} onChange={e => setEditData({...editData, employment_status: e.target.value})} className={inputClass}>
                        <option value="active">Active</option><option value="on_leave">On Leave</option><option value="inactive">Inactive</option>
                      </select>
                    ) : <span className="capitalize">{employee.employment_status?.replace('_', ' ')}</span>}
                  </div>
                  <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Date Hired:</div>
                  <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                    {isEditing ? <input type="date" value={editData?.date_of_hire || ''} onChange={e => setEditData({...editData, date_of_hire: e.target.value})} className={inputClass} /> : <span>{formatDate(employee.date_of_hire)}</span>}
                  </div>
                  <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Address:</div>
                  <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"} style={{gridColumn: 'span 3'}}>
                    {isEditing ? <input value={editData?.address_line1 || ''} onChange={e => setEditData({...editData, address_line1: e.target.value})} className={inputClass} /> : <span>{employee.address_line1 || '-'}</span>}
                  </div>
                </div>
              </div>
              <div className="border border-[#2f77bb] bg-[#dce8f5] dark:bg-slate-700 flex flex-col items-center justify-center p-2.5">
                <div className="w-[150px] h-[170px] border-[3px] border-[#3569a3] bg-[#edf3f9] dark:bg-slate-600 flex items-center justify-center overflow-hidden">
                  {employee.profile_photo_url ? <img src={employee.profile_photo_url} alt="" className="w-full h-full object-cover" />
                    : <img src="https://cdn-icons-png.flaticon.com/512/847/847969.png" alt="" className="w-full h-full object-contain p-4" />}
                </div>
                <button onClick={() => photoInputRef.current?.click()} className="mt-2.5 text-[#0066cc] font-bold cursor-pointer text-sm">📷 {uploading ? 'Uploading...' : 'Add Picture'}</button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
            </div>
          )}

          {/* TIME CLOCK HISTORY TAB */}
          {activeTab === 'attendance' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-700 dark:text-slate-300">⏰ Time Clock History</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{attendanceRecords.length} records</span>
                  <button onClick={() => refreshTab('attendance')} disabled={refreshingTab === 'attendance'} className="p-1.5 rounded-lg hover:bg-white/50 transition-colors" title="Refresh">
                    <RefreshCw className={`w-4 h-4 ${refreshingTab === 'attendance' ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#2e75b6] text-white">
                      <th className="p-2 text-left border border-[#1a5fa0]">Date</th>
                      <th className="p-2 text-left border border-[#1a5fa0]">Clock In</th>
                      <th className="p-2 text-left border border-[#1a5fa0]">Clock Out</th>
                      <th className="p-2 text-left border border-[#1a5fa0]">Hours</th>
                      <th className="p-2 text-left border border-[#1a5fa0]">Method</th>
                      <th className="p-2 text-left border border-[#1a5fa0]">Status</th>
                      <th className="p-2 text-left border border-[#1a5fa0]">GPS Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map(record => (
                      <tr key={record.id} className="bg-white dark:bg-slate-700 even:bg-slate-50 dark:even:bg-slate-600">
                        <td className="p-2 border border-[#b8ccdc]">{formatDate(record.attendance_date)}</td>
                        <td className="p-2 border border-[#b8ccdc]">{formatTime(record.clock_in_time)}</td>
                        <td className="p-2 border border-[#b8ccdc]">{formatTime(record.clock_out_time)}</td>
                        <td className="p-2 border border-[#b8ccdc] font-bold">{record.total_hours?.toFixed(1) || '-'}</td>
                        <td className="p-2 border border-[#b8ccdc] capitalize">{record.check_in_method?.replace('_', ' ') || '-'}</td>
                        <td className="p-2 border border-[#b8ccdc]">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${record.status === 'present' ? 'bg-emerald-100 text-emerald-700' : record.is_late ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {record.is_late ? 'Late' : record.status}
                          </span>
                        </td>
                        <td className="p-2 border border-[#b8ccdc] text-xs">
                          {record.check_in_latitude ? (
                            <a href={`https://www.google.com/maps?q=${record.check_in_latitude},${record.check_in_longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {record.check_in_latitude.toFixed(4)}, {record.check_in_longitude.toFixed(4)}
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {attendanceRecords.length === 0 && (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No attendance records found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PAYROLL HISTORY TAB */}
          {activeTab === 'payroll' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-700 dark:text-slate-300">💰 Payroll History</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{payrollHistory.length} payslips</span>
                  <button onClick={() => refreshTab('payroll')} disabled={refreshingTab === 'payroll'} className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${refreshingTab === 'payroll' ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#2e75b6] text-white">
                      <th className="p-2 text-left border border-[#1a5fa0]">Period</th>
                      <th className="p-2 text-left border border-[#1a5fa0]">Basic Salary</th>
                      <th className="p-2 text-left border border-[#1a5fa0]">Overtime</th>
                      <th className="p-2 text-left border border-[#1a5fa0]">Deductions</th>
                      <th className="p-2 text-left border border-[#1a5fa0]">Tax</th>
                      <th className="p-2 text-left border border-[#1a5fa0]">Net Pay</th>
                      <th className="p-2 text-left border border-[#1a5fa0]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollHistory.map(payslip => (
                      <tr key={payslip.id} className="bg-white dark:bg-slate-700 even:bg-slate-50 dark:even:bg-slate-600">
                        <td className="p-2 border border-[#b8ccdc]">{payslip.payroll_periods?.period_name || payslip.payslip_number}</td>
                        <td className="p-2 border border-[#b8ccdc]">{formatCurrency(payslip.basic_salary)}</td>
                        <td className="p-2 border border-[#b8ccdc]">{formatCurrency(payslip.overtime_amount)}</td>
                        <td className="p-2 border border-[#b8ccdc] text-red-600">{formatCurrency(payslip.total_deductions)}</td>
                        <td className="p-2 border border-[#b8ccdc]">{formatCurrency(payslip.paye_tax)}</td>
                        <td className="p-2 border border-[#b8ccdc] font-bold text-emerald-600">{formatCurrency(payslip.net_salary)}</td>
                        <td className="p-2 border border-[#b8ccdc]">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${payslip.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{payslip.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payrollHistory.length === 0 && <p className="text-center text-slate-400 py-8">No payroll records found</p>}
              </div>
            </div>
          )}

          {/* PAYROLL DETAILS TAB */}
          {activeTab === 'details' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-700 dark:text-slate-300">💳 Payroll Details</h3>
                <button onClick={() => refreshTab('details')} disabled={refreshingTab === 'details'} className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                  <RefreshCw className={`w-4 h-4 ${refreshingTab === 'details' ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {payrollDetails ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Salary Type', value: payrollDetails.payment_method || 'N/A' },
                    { label: 'Basic Salary', value: formatCurrency(payrollDetails.basic_salary) },
                    { label: 'Housing Allowance', value: formatCurrency(payrollDetails.housing_allowance) },
                    { label: 'Transport', value: formatCurrency(payrollDetails.transport_allowance) },
                    { label: 'Medical', value: formatCurrency(payrollDetails.medical_allowance) },
                    { label: 'Total Earnings', value: formatCurrency(payrollDetails.total_earnings) },
                    { label: 'Pension', value: formatCurrency(payrollDetails.pension_contribution) },
                    { label: 'Medical Aid', value: formatCurrency(payrollDetails.medical_aid) },
                    { label: 'Tax Number', value: payrollDetails.tax_reference_number || employee.tax_number || 'N/A' },
                    { label: 'Bank', value: payrollDetails.bank_name || employee.bank_name || 'N/A' },
                    { label: 'Account', value: payrollDetails.bank_account_number || employee.bank_account_number || 'N/A' },
                    { label: 'Effective Date', value: formatDate(payrollDetails.effective_date) },
                  ].map((item, i) => (
                    <div key={i} className="bg-white dark:bg-slate-700 border border-[#b8ccdc] rounded p-3">
                      <p className="text-xs text-slate-500">{item.label}</p>
                      <p className="font-semibold text-slate-800 dark:text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No payroll details configured</p>
                </div>
              )}
            </div>
          )}

          {/* SCHEDULING TAB */}
          {activeTab === 'schedule' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-700 dark:text-slate-300">📅 Upcoming Schedule</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{schedules.length} shifts</span>
                  <button onClick={() => refreshTab('schedule')} disabled={refreshingTab === 'schedule'} className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${refreshingTab === 'schedule' ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              {schedules.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#2e75b6] text-white">
                        <th className="p-2 text-left border border-[#1a5fa0]">Date</th>
                        <th className="p-2 text-left border border-[#1a5fa0]">Shift</th>
                        <th className="p-2 text-left border border-[#1a5fa0]">Time</th>
                        <th className="p-2 text-left border border-[#1a5fa0]">Job/Client</th>
                        <th className="p-2 text-left border border-[#1a5fa0]">Location</th>
                        <th className="p-2 text-left border border-[#1a5fa0]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map(shift => (
                        <tr key={shift.id} className="bg-white dark:bg-slate-700 even:bg-slate-50 dark:even:bg-slate-600">
                          <td className="p-2 border border-[#b8ccdc]">{formatDate(shift.shift_date)}</td>
                          <td className="p-2 border border-[#b8ccdc]">{shift.shift_types?.name || 'Standard'}</td>
                          <td className="p-2 border border-[#b8ccdc]">{shift.shift_types?.start_time?.slice(0,5)} - {shift.shift_types?.end_time?.slice(0,5)}</td>
                          <td className="p-2 border border-[#b8ccdc]">{shift.jobs?.title || shift.jobs?.clients?.company_name || 'N/A'}</td>
                          <td className="p-2 border border-[#b8ccdc] text-xs">{shift.jobs?.site_address?.slice(0, 30) || 'N/A'}</td>
                          <td className="p-2 border border-[#b8ccdc]">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${shift.status === 'checked_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{shift.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-center text-slate-400 py-8">No upcoming schedules</p>}
            </div>
          )}

          {/* LEAVE TAB */}
          {activeTab === 'leave' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-700 dark:text-slate-300">🏖️ Leave Records</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Balance: {stats.leaveBalance}d</span>
                  <button onClick={() => refreshTab('leave')} disabled={refreshingTab === 'leave'} className="p-1.5 rounded-lg hover:bg-white/50 transition-colors" title="Refresh">
                    <RefreshCw className={`w-4 h-4 ${refreshingTab === 'leave' ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <button onClick={() => setLeaveSubTab('history')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${leaveSubTab === 'history' ? 'bg-[#2e75b6] text-white' : 'bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
                  📋 Leave History
                </button>
                <button onClick={() => setLeaveSubTab('balances')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${leaveSubTab === 'balances' ? 'bg-[#2e75b6] text-white' : 'bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
                  📊 Leave Balances
                </button>
              </div>

              {/* LEAVE HISTORY */}
              {leaveSubTab === 'history' && (
                <div>
                  {leaveRecords.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-[#2e75b6] text-white">
                            <th className="p-2 text-left border border-[#1a5fa0]">Type</th>
                            <th className="p-2 text-left border border-[#1a5fa0]">Start</th>
                            <th className="p-2 text-left border border-[#1a5fa0]">End</th>
                            <th className="p-2 text-left border border-[#1a5fa0]">Days</th>
                            <th className="p-2 text-left border border-[#1a5fa0]">Status</th>
                            <th className="p-2 text-left border border-[#1a5fa0]">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaveRecords.map(leave => (
                            <tr key={leave.id} className="bg-white dark:bg-slate-700 even:bg-slate-50 dark:even:bg-slate-600">
                              <td className="p-2 border border-[#b8ccdc]">{leave.leave_types?.name || 'N/A'}</td>
                              <td className="p-2 border border-[#b8ccdc]">{formatDate(leave.start_date)}</td>
                              <td className="p-2 border border-[#b8ccdc]">{formatDate(leave.end_date)}</td>
                              <td className="p-2 border border-[#b8ccdc] font-bold">{leave.total_days}</td>
                              <td className="p-2 border border-[#b8ccdc]">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                                  leave.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {leave.status}
                                </span>
                              </td>
                              <td className="p-2 border border-[#b8ccdc] text-xs">{leave.reason?.slice(0, 40) || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No leave records found</p>
                      <p className="text-slate-400 text-xs mt-1">Leave requests will appear here when submitted</p>
                    </div>
                  )}
                </div>
              )}

              {/* LEAVE BALANCES */}
              {leaveSubTab === 'balances' && (
                <div>
                  {leaveBalances.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {leaveBalances.map((balance, i) => {
                        const typeName = balance.leave_type || balance.leave_type_id || 'Leave'
                        const typeDef = LEAVE_TYPE_DEFINITIONS.find(lt => lt.name === typeName)
                        const color = typeDef?.color || '#10b981'
                        const allocated = Number(balance.allocated_days) || 0
                        const used = Number(balance.used_days) || 0
                        const pending = Number(balance.pending_days) || 0
                        const remaining = Number(balance.remaining_days) || (allocated - used - pending)
                        
                        return (
                          <div key={balance.id || i} 
                            className="bg-white dark:bg-slate-700 border border-[#b8ccdc] rounded-xl p-4" 
                            style={{ borderLeftColor: color, borderLeftWidth: '4px' }}>
                            <p className="font-bold text-slate-800 dark:text-white text-sm mb-2">{typeName}</p>
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-full mb-2 overflow-hidden">
                              <div className="h-full rounded-full transition-all" 
                                style={{ width: `${allocated > 0 ? Math.min(((used + pending) / allocated) * 100, 100) : 0}%`, backgroundColor: color }}>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-center"><p className="text-slate-500">Remaining</p><p className="text-lg font-bold" style={{ color }}>{remaining}</p></div>
                              <div className="text-center"><p className="text-slate-500">Allocated</p><p className="text-lg font-bold text-slate-600">{allocated}</p></div>
                              <div className="text-center"><p className="text-slate-500">Used</p><p className="text-sm font-bold text-red-500">{used}</p></div>
                              <div className="text-center"><p className="text-slate-500">Pending</p><p className="text-sm font-bold text-amber-500">{pending}</p></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No leave balances yet</p>
                      <p className="text-slate-400 text-xs mt-1">Click below to create leave balances</p>
                      <button 
                        onClick={async () => {
                          try {
                            const { error } = await supabase.rpc('sync_leave_balances', { p_employee_id: id })
                            if (!error) {
                              toast.success('Leave balances synced!')
                              await loadLeaveBalances()
                            } else {
                              toast.error('Failed: ' + error.message)
                            }
                          } catch (e) {
                            toast.error('Run the SQL setup in Supabase first')
                          }
                        }}
                        className="mt-3 px-4 py-2 bg-[#2e75b6] text-white rounded-lg text-sm hover:bg-[#1a5fa0] transition-colors"
                      >
                        🔄 Sync Leave Balances
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* EVENTS TAB */}
          {activeTab === 'events' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-700 dark:text-slate-300">📢 Upcoming Events / Jobs</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{events.length} events</span>
                  <button onClick={() => refreshTab('events')} disabled={refreshingTab === 'events'} className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${refreshingTab === 'events' ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              {events.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#2e75b6] text-white">
                        <th className="p-2 text-left border">Event</th>
                        <th className="p-2 text-left border">Date</th>
                        <th className="p-2 text-left border">Time</th>
                        <th className="p-2 text-left border">Location</th>
                        <th className="p-2 text-left border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map(event => (
                        <tr key={event.id} className="bg-white dark:bg-slate-700 even:bg-slate-50 dark:even:bg-slate-600">
                          <td className="p-2 border font-medium">{event.title}</td>
                          <td className="p-2 border">{formatDate(event.scheduled_date)}</td>
                          <td className="p-2 border">{event.scheduled_start_time?.slice(0,5)} - {event.scheduled_end_time?.slice(0,5)}</td>
                          <td className="p-2 border text-xs">{event.site_address?.slice(0, 30) || 'N/A'}</td>
                          <td className="p-2 border">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${event.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{event.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-center text-slate-400 py-8">No upcoming events</p>}
            </div>
          )}
        </div>

        {/* Attachments Section */}
        <div className="mt-4 border border-[#2f77bb]">
          <div className="flex gap-1.5 p-1.5 bg-[#c9dff2] dark:bg-slate-700 border-b border-[#2f77bb] flex-wrap">
            <button onClick={() => fileInputRef.current?.click()} className="neo-btn h-8 px-3 rounded-md bg-gradient-to-b from-[#4f8fd0] to-[#2d5f98] text-white font-bold text-xs">📎 Add Att.</button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleAttachmentUpload} />
          </div>
          <table className="w-full border-collapse bg-white dark:bg-slate-800">
            <thead>
              <tr>
                <th className="bg-[#d4e6f7] dark:bg-slate-600 border border-[#2f77bb] p-2 text-sm">File Name</th>
                <th className="bg-[#d4e6f7] dark:bg-slate-600 border border-[#2f77bb] p-2 text-sm">Type</th>
                <th className="bg-[#d4e6f7] dark:bg-slate-600 border border-[#2f77bb] p-2 text-sm">Added On</th>
                <th className="bg-[#d4e6f7] dark:bg-slate-600 border border-[#2f77bb] p-2 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attachments.length > 0 ? attachments.map(doc => (
                <tr key={doc.id}>
                  <td className="border border-[#b8ccdc] p-2 text-sm">{doc.document_name}</td>
                  <td className="border border-[#b8ccdc] p-2 text-sm capitalize">{doc.document_type}</td>
                  <td className="border border-[#b8ccdc] p-2 text-sm">{formatDate(doc.uploaded_at)}</td>
                  <td className="border border-[#b8ccdc] p-2 text-sm">
                    <div className="flex gap-1">
                      <a href={doc.document_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-blue-100"><Eye className="w-4 h-4 text-blue-600" /></a>
                      <a href={doc.document_url} download className="p-1 rounded hover:bg-emerald-100"><Download className="w-4 h-4 text-emerald-600" /></a>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="border border-[#b8ccdc] p-4 text-center text-slate-400 italic bg-[#f7fbff]">No attachments available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
