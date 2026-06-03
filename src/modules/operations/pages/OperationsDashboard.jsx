import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useOperationsStore from '../store/operationsStore'
import useThemeStore from '../../../store/themeStore'
import useAuthStore from '../../../store/authStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Briefcase, Calendar, Clock, CheckCircle2, AlertTriangle,
  Users, MapPin, BarChart3, Plus, TrendingUp,
  Sparkles, Sun, Moon, ChevronRight, ArrowLeft,
  Truck, ClipboardCheck, Map, Pause, Play,
  Search, Eye, Edit3, X, Save, Timer, Building2,
  Phone, FileText, Camera, Package, User, UserPlus,
  UserCheck, Shield, Mail, Hash
} from 'lucide-react'

export default function OperationsDashboard() {
  const { stats, fetchOperationsStats, fetchJobs, fetchJobCategories, jobCategories, loading } = useOperationsStore()
  const { isDark, toggleTheme } = useThemeStore()
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [todayJobs, setTodayJobs] = useState([])
  const [recentJobs, setRecentJobs] = useState([])
  
  // Edit Modal State
  const [editingJob, setEditingJob] = useState(null)
  const [editForm, setEditForm] = useState({
    title: '', status: '', priority: '', scheduled_date: '',
    scheduled_start_time: '', scheduled_end_time: '', site_address: '', notes: ''
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Job Tracker State
  const [showTracker, setShowTracker] = useState(false)
  const [trackerJobNumber, setTrackerJobNumber] = useState('')
  const [trackedJob, setTrackedJob] = useState(null)
  const [trackerLoading, setTrackerLoading] = useState(false)
  const [trackerError, setTrackerError] = useState(null)

  const canManageJobs = ['super_admin', 'operations_manager', 'supervisor'].includes(profile?.role)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const statsData = await fetchOperationsStats()
    setTodayJobs(statsData?.todayJobs || [])
    setRecentJobs(statsData?.recentJobs || [])
    await fetchJobCategories()
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  // JOB TRACKER - Enhanced with all user information
  const handleTrackJob = async () => {
    if (!trackerJobNumber.trim()) {
      toast.error('Please enter a job number')
      return
    }

    setTrackerLoading(true)
    setTrackerError(null)
    setTrackedJob(null)

    try {
      // Get the job
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('job_number', trackerJobNumber.trim())
        .single()

      if (jobError || !job) {
        setTrackerError('Job not found. Please check the job number.')
        setTrackerLoading(false)
        return
      }

      // Get client info
      let clientInfo = null
      if (job.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('company_name, phone, email, address_line1, city, postal_code')
          .eq('id', job.client_id)
          .single()
        clientInfo = client
      }

      // Get category info
      let categoryInfo = null
      if (job.job_category_id) {
        const { data: cat } = await supabase
          .from('job_categories')
          .select('name, color, description')
          .eq('id', job.job_category_id)
          .single()
        categoryInfo = cat
      }

      // Get CREATOR info (who created the job)
      let creatorInfo = null
      if (job.created_by) {
        const { data: creator } = await supabase
          .from('profiles')
          .select('full_name, email, role')
          .eq('id', job.created_by)
          .single()
        creatorInfo = creator
      }

      // Get APPROVED BY info
      let approverInfo = null
      if (job.approved_by) {
        const { data: approver } = await supabase
          .from('profiles')
          .select('full_name, email, role')
          .eq('id', job.approved_by)
          .single()
        approverInfo = approver
      }

      // Get ASSIGNED EMPLOYEE info (who selected/working on the job)
      let assignedInfo = null
      if (job.assigned_to) {
        const { data: emp } = await supabase
          .from('employees')
          .select('first_name, last_name, employee_code, phone, email, department, position')
          .eq('id', job.assigned_to)
          .single()
        assignedInfo = emp
      }

      // Get ASSIGNED SUPERVISOR info
      let supervisorInfo = null
      if (job.assigned_supervisor) {
        const { data: supv } = await supabase
          .from('profiles')
          .select('full_name, email, role')
          .eq('id', job.assigned_supervisor)
          .single()
        supervisorInfo = supv
      }

      // Get job assignments (who worked on this job)
      const { data: assignments } = await supabase
        .from('job_assignments')
        .select('*, employees(first_name, last_name, employee_code)')
        .eq('job_id', job.id)

      // Get photos
      const { data: photos } = await supabase
        .from('job_photos')
        .select('*, employees(first_name, last_name)')
        .eq('job_id', job.id)
        .order('taken_at', { ascending: false })

      // Get tasks
      const { data: tasks } = await supabase
        .from('job_task_items')
        .select('*')
        .eq('job_id', job.id)
        .order('task_number')

      // Get signature
      const { data: signature } = await supabase
        .from('client_signatures')
        .select('*')
        .eq('job_id', job.id)
        .single()

      // Get incidents
      const { data: incidents } = await supabase
        .from('incident_reports')
        .select('*, employees(first_name, last_name)')
        .eq('job_id', job.id)

      // Get supplies
      const { data: supplies } = await supabase
        .from('supplies_requests')
        .select('*, supplies_request_items(*)')
        .eq('job_id', job.id)

      // Get invoice
      let invoiceInfo = null
      if (job.quotation_id) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('*')
          .eq('quotation_id', job.quotation_id)
          .single()
        invoiceInfo = invoice
      }

      // Get quotation
      let quotationInfo = null
      if (job.quotation_id) {
        const { data: quote } = await supabase
          .from('quotations')
          .select('*')
          .eq('id', job.quotation_id)
          .single()
        quotationInfo = quote
      }

      // Get attendance records for this job's date
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('*, employees(first_name, last_name)')
        .eq('attendance_date', job.scheduled_date)

      // Get who completed the job (from notes or actual_end_time)
      let completedByInfo = null
      if (job.status === 'completed') {
        // Check if there's a signature or the assigned person completed it
        if (signature?.signed_by) {
          completedByInfo = { name: signature.signed_by, type: 'client_signature' }
        } else if (assignedInfo) {
          completedByInfo = { 
            name: `${assignedInfo.first_name} ${assignedInfo.last_name}`,
            type: 'assigned_cleaner',
            code: assignedInfo.employee_code
          }
        }
      }

      // Build comprehensive job tracker data
      setTrackedJob({
        ...job,
        clients: clientInfo,
        job_categories: categoryInfo,
        creator: creatorInfo,
        approver: approverInfo,
        assigned_employee: assignedInfo,
        supervisor: supervisorInfo,
        assignments: assignments || [],
        photos: photos || [],
        tasks: tasks || [],
        signature: signature,
        incidents: incidents || [],
        supplies: supplies || [],
        invoice: invoiceInfo,
        quotation: quotationInfo,
        attendance: attendance || [],
        completed_by: completedByInfo
      })

    } catch (error) {
      console.error('Tracker error:', error)
      setTrackerError('Error loading job details: ' + error.message)
    } finally {
      setTrackerLoading(false)
    }
  }

  const handleOpenEdit = (job, e) => {
    e.stopPropagation()
    setEditingJob(job)
    setEditForm({
      title: job.title || '', status: job.status || 'pending', priority: job.priority || 'medium',
      scheduled_date: job.scheduled_date || '', scheduled_start_time: job.scheduled_start_time?.slice(0,5) || '',
      scheduled_end_time: job.scheduled_end_time?.slice(0,5) || '', site_address: job.site_address || '', notes: job.notes || ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingJob) return
    setSavingEdit(true)
    try {
      const updates = {
        title: editForm.title, status: editForm.status, priority: editForm.priority,
        scheduled_date: editForm.scheduled_date, scheduled_start_time: editForm.scheduled_start_time,
        scheduled_end_time: editForm.scheduled_end_time, site_address: editForm.site_address,
        notes: editForm.notes, updated_at: new Date().toISOString()
      }
      if (editForm.status === 'completed' && editingJob.status !== 'completed') updates.actual_end_time = new Date().toISOString()
      if (editForm.status === 'in_progress' && editingJob.status !== 'in_progress') updates.actual_start_time = new Date().toISOString()
      await supabase.from('jobs').update(updates).eq('id', editingJob.id)
      toast.success('Job updated! ✅')
      setEditingJob(null)
      loadData()
    } catch { toast.error('Failed to update job') }
    finally { setSavingEdit(false) }
  }

  const handleHoldJob = async (jobId, e) => {
    e.stopPropagation()
    const reason = prompt('Reason for putting job on hold:')
    if (reason === null) return
    try { await supabase.from('jobs').update({ status: 'on_hold', updated_at: new Date().toISOString() }).eq('id', jobId); toast.success('Job on hold ⏸️'); loadData() } catch { toast.error('Failed') }
  }

  const handleResumeJob = async (jobId, e) => {
    e.stopPropagation()
    try { await supabase.from('jobs').update({ status: 'scheduled', updated_at: new Date().toISOString() }).eq('id', jobId); toast.success('Job resumed ▶️'); loadData() } catch { toast.error('Failed') }
  }

  const handleCancelJob = async (jobId, e) => {
    e.stopPropagation()
    if (!window.confirm('Cancel this job?')) return
    try { await supabase.from('jobs').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', jobId); toast.success('Job cancelled'); loadData() } catch { toast.error('Failed') }
  }

  const getStatusColor = (status) => {
    const c = { pending: 'bg-slate-100 text-slate-700', scheduled: 'bg-blue-100 text-blue-700', in_progress: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700', overdue: 'bg-red-100 text-red-700', on_hold: 'bg-purple-100 text-purple-700' }
    return c[status] || 'bg-slate-100 text-slate-700'
  }

  const getPriorityColor = (p) => ({ low: 'text-slate-500', medium: 'text-blue-600', high: 'text-amber-600', urgent: 'text-red-600', emergency: 'text-red-600 animate-pulse' }[p] || 'text-slate-500')

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'
  const formatDateOnly = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
  const formatTimeOnly = (d) => d ? new Date(d).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : 'N/A'

  const statCards = [
    { icon: Briefcase, label: 'Total Jobs', value: stats.totalJobs || 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: Calendar, label: 'Scheduled Today', value: stats.scheduledToday || 0, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: Clock, label: 'In Progress', value: stats.inProgress || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { icon: CheckCircle2, label: 'Completed Today', value: stats.completedToday || 0, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: AlertTriangle, label: 'Overdue', value: stats.overdueJobs || 0, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { icon: TrendingUp, label: 'Completion Rate', value: `${stats.completionRate || 0}%`, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Main Dashboard</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2"><Briefcase className="w-8 h-8 text-emerald-600" /><h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Jobs & Operations</h1></div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">Job management, team scheduling, routes, and quality control</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/operations/jobs/new')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"><Plus className="w-5 h-5" /><span>New Job</span></button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="neu-raised rounded-2xl p-4 stat-card">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'All Jobs', icon: Briefcase, path: '/operations/jobs' },
            { label: 'Calendar', icon: Calendar, path: '/operations/calendar' },
            { label: 'Quality Checks', icon: ClipboardCheck, path: '/operations/quality' },
            { label: 'Job Tracker', icon: Search, path: null, onClick: () => setShowTracker(true) },
          ].map(action => (
            <button key={action.label} onClick={() => action.path ? navigate(action.path) : action.onClick?.()}
              className="neu-raised neu-btn rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-105">
              <action.icon className="w-6 h-6 text-emerald-600" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Job Categories */}
        <div className="neu-raised rounded-3xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-600" />Job Categories ({jobCategories.length})</h2>
          <div className="flex flex-wrap gap-2">
            {jobCategories.map(cat => (
              <span key={cat.id} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: cat.color + '20', color: cat.color, border: '1px solid ' + cat.color + '40' }}>{cat.name}</span>
            ))}
          </div>
        </div>

        {/* Today's Jobs */}
        <div className="neu-raised rounded-3xl p-6 mb-8">
          <div className="flex justify-between mb-4"><h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-600" />Today's Schedule</h2><Link to="/operations/calendar" className="text-sm text-emerald-600 flex items-center gap-1">Calendar <ChevronRight className="w-4 h-4" /></Link></div>
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-200 dark:border-slate-700"><th className="text-left text-sm font-medium text-slate-500 py-3 px-2">Job #</th><th className="text-left text-sm font-medium text-slate-500 py-3 px-2">Client</th><th className="text-left text-sm font-medium text-slate-500 py-3 px-2">Category</th><th className="text-left text-sm font-medium text-slate-500 py-3 px-2">Time</th><th className="text-left text-sm font-medium text-slate-500 py-3 px-2">Priority</th><th className="text-left text-sm font-medium text-slate-500 py-3 px-2">Status</th><th className="text-left text-sm font-medium text-slate-500 py-3 px-2">Location</th>{canManageJobs && <th className="text-center text-sm font-medium text-slate-500 py-3 px-2">Actions</th>}</tr></thead>
            <tbody>{todayJobs.map(job => (
              <tr key={job.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-3 px-2 text-sm font-medium cursor-pointer" onClick={() => navigate(`/operations/jobs/${job.id}`)}>{job.job_number}</td>
                <td className="py-3 px-2 text-sm">{job.clients?.company_name || '-'}</td>
                <td className="py-3 px-2">{job.job_categories ? <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: job.job_categories.color + '20', color: job.job_categories.color }}>{job.job_categories.name}</span> : '-'}</td>
                <td className="py-3 px-2 text-sm">{job.scheduled_start_time?.slice(0,5) || '-'}</td>
                <td className="py-3 px-2"><span className={`text-xs font-medium ${getPriorityColor(job.priority)}`}>{job.priority}</span></td>
                <td className="py-3 px-2"><span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(job.status)}`}>{job.status.replace('_', ' ')}</span></td>
                <td className="py-3 px-2 text-sm flex items-center gap-1"><MapPin className="w-3 h-3" />{job.site_city || 'N/A'}</td>
                {canManageJobs && (
                  <td className="py-3 px-2 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={e => handleOpenEdit(job, e)} className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs hover:bg-blue-200 flex items-center gap-1"><Edit3 className="w-3 h-3" /> Edit</button>
                      {job.status === 'on_hold' ? <button onClick={e => handleResumeJob(job.id, e)} className="px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs hover:bg-green-200 flex items-center gap-1"><Play className="w-3 h-3" /> Resume</button>
                       : job.status !== 'completed' && job.status !== 'cancelled' ? <><button onClick={e => handleHoldJob(job.id, e)} className="px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs hover:bg-purple-200 flex items-center gap-1"><Pause className="w-3 h-3" /> Hold</button><button onClick={e => handleCancelJob(job.id, e)} className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs hover:bg-red-200">✕</button></> : null}
                    </div>
                  </td>
                )}
              </tr>
            ))}</tbody></table></div>
          {todayJobs.length === 0 && <p className="text-center text-slate-500 py-8">No jobs scheduled for today</p>}
        </div>

        {/* Recent Jobs */}
        <div className="neu-raised rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-emerald-600" />Recent Jobs</h2>
          <div className="space-y-3">{recentJobs.map(job => (
            <div key={job.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => navigate(`/operations/jobs/${job.id}`)}>
              <div><p className="font-medium text-slate-800 dark:text-white text-sm">{job.title}</p><p className="text-xs text-slate-500">{job.clients?.company_name} · {job.job_number}</p></div>
              <div className="flex items-center gap-2"><span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(job.status)}`}>{job.status.replace('_', ' ')}</span>{canManageJobs && <button onClick={e => handleOpenEdit(job, e)} className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs hover:bg-blue-200"><Edit3 className="w-3 h-3" /></button>}</div>
            </div>
          ))}</div>
        </div>
      </main>

      {/* JOB TRACKER MODAL */}
      <AnimatePresence>
        {showTracker && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => { setShowTracker(false); setTrackedJob(null); setTrackerError(null); setTrackerJobNumber('') }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              
              <div className="sticky top-0 bg-white dark:bg-slate-800 z-10 p-5 border-b">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2"><Search className="w-5 h-5 text-blue-600" /> Job Tracker</h3>
                  <button onClick={() => { setShowTracker(false); setTrackedJob(null); setTrackerError(null); setTrackerJobNumber('') }} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={trackerJobNumber} onChange={e => setTrackerJobNumber(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTrackJob()}
                      placeholder="Enter Job Number (e.g., JOB-2506-0001)..." className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm" />
                  </div>
                  <button onClick={handleTrackJob} disabled={trackerLoading}
                    className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                    {trackerLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Search className="w-4 h-4" />} Track
                  </button>
                </div>
              </div>

              <div className="p-5">
                {trackerError && <div className="text-center py-8"><AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" /><p className="text-red-500 font-medium">{trackerError}</p></div>}

                {trackedJob && (
                  <div className="space-y-4">
                    {/* JOB OVERVIEW HEADER */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-5 border border-blue-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h2 className="text-xl font-bold">{trackedJob.title}</h2>
                          <p className="text-sm text-slate-500">{trackedJob.job_number} · {trackedJob.job_categories?.name || 'N/A'}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(trackedJob.status)}`}>{trackedJob.status?.replace('_', ' ')}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-slate-500">Priority:</span> <span className={`font-semibold ${getPriorityColor(trackedJob.priority)}`}>{trackedJob.priority}</span></div>
                        <div><span className="text-slate-500">Date:</span> <span className="font-semibold">{formatDateOnly(trackedJob.scheduled_date)}</span></div>
                        <div><span className="text-slate-500">Time:</span> <span className="font-semibold">{trackedJob.scheduled_start_time?.slice(0,5)} - {trackedJob.scheduled_end_time?.slice(0,5)}</span></div>
                        <div><span className="text-slate-500">Cleaners:</span> <span className="font-semibold">{trackedJob.cleaners_required || 1}</span></div>
                      </div>
                      <div className="mt-2 text-sm"><MapPin className="w-3.5 h-3.5 inline mr-1" />{trackedJob.site_address}</div>
                      {trackedJob.description && <p className="text-sm text-slate-500 mt-2">{trackedJob.description}</p>}
                    </div>

                    {/* PEOPLE INVOLVED */}
                    <div className="bg-white dark:bg-slate-700 rounded-2xl p-5 border">
                      <h3 className="font-bold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" />People Involved</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {trackedJob.creator && (
                          <PeopleCard icon={UserPlus} label="Created By" name={trackedJob.creator.full_name} detail={trackedJob.creator.email} role={trackedJob.creator.role} color="text-blue-600" bg="bg-blue-50" />
                        )}
                        {trackedJob.approver && (
                          <PeopleCard icon={Shield} label="Approved By" name={trackedJob.approver.full_name} detail={trackedJob.approver.email} role={trackedJob.approver.role} color="text-green-600" bg="bg-green-50" />
                        )}
                        {trackedJob.supervisor && (
                          <PeopleCard icon={UserCheck} label="Supervisor" name={trackedJob.supervisor.full_name} detail={trackedJob.supervisor.email} role={trackedJob.supervisor.role} color="text-purple-600" bg="bg-purple-50" />
                        )}
                        {trackedJob.assigned_employee && (
                          <PeopleCard icon={User} label="Assigned Cleaner" name={`${trackedJob.assigned_employee.first_name} ${trackedJob.assigned_employee.last_name}`} detail={trackedJob.assigned_employee.employee_code} role={trackedJob.assigned_employee.position || 'Cleaner'} color="text-amber-600" bg="bg-amber-50" />
                        )}
                      </div>
                      {trackedJob.completed_by && (
                        <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200">
                          <p className="text-xs text-emerald-600 font-semibold">✅ COMPLETED BY</p>
                          <p className="font-medium">{trackedJob.completed_by.name}</p>
                          {trackedJob.completed_by.code && <p className="text-xs text-slate-500">{trackedJob.completed_by.code}</p>}
                        </div>
                      )}
                      {trackedJob.notes?.includes('SELECTED BY:') && (
                        <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200">
                          <p className="text-xs text-blue-600 font-semibold">✋ SELECTED BY (Mobile)</p>
                          <p className="font-medium">{trackedJob.notes.split('at')[0].replace('SELECTED BY:', '').trim()}</p>
                          <p className="text-xs text-slate-500">{trackedJob.notes.split('at')[1]?.trim()}</p>
                        </div>
                      )}
                    </div>

                    {/* TIMELINE */}
                    <div className="bg-white dark:bg-slate-700 rounded-2xl p-5 border">
                      <h3 className="font-bold mb-3 flex items-center gap-2"><Timer className="w-4 h-4 text-blue-600" />Timeline</h3>
                      <div className="space-y-1">
                        <TlItem icon="📝" label="Created" value={formatDate(trackedJob.created_at)} />
                        {trackedJob.scheduled_date && <TlItem icon="📅" label="Scheduled" value={formatDateOnly(trackedJob.scheduled_date)} />}
                        {trackedJob.actual_start_time && <TlItem icon="🚀" label="Started" value={formatDate(trackedJob.actual_start_time)} />}
                        {trackedJob.actual_end_time && <TlItem icon="✅" label="Completed" value={formatDate(trackedJob.actual_end_time)} />}
                        <TlItem icon="🔄" label="Last Updated" value={formatDate(trackedJob.updated_at)} />
                      </div>
                    </div>

                    {/* CLIENT INFO */}
                    {trackedJob.clients && (
                      <div className="bg-white dark:bg-slate-700 rounded-2xl p-5 border">
                        <h3 className="font-bold mb-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-600" />Client</h3>
                        <p className="font-semibold">{trackedJob.clients.company_name}</p>
                        {trackedJob.clients.phone && <p className="text-sm"><Phone className="w-3 h-3 inline mr-1" />{trackedJob.clients.phone}</p>}
                        {trackedJob.clients.email && <p className="text-sm text-slate-500"><Mail className="w-3 h-3 inline mr-1" />{trackedJob.clients.email}</p>}
                        <p className="text-sm text-slate-500">{[trackedJob.clients.address_line1, trackedJob.clients.city].filter(Boolean).join(', ')}</p>
                      </div>
                    )}

                    {/* PHOTOS */}
                    {trackedJob.photos?.length > 0 && (
                      <div className="bg-white dark:bg-slate-700 rounded-2xl p-5 border">
                        <h3 className="font-bold mb-3 flex items-center gap-2"><Camera className="w-4 h-4 text-blue-600" />Photos ({trackedJob.photos.length})</h3>
                        <div className="grid grid-cols-3 gap-2">
                          {trackedJob.photos.map(p => (
                            <a key={p.id} href={p.photo_url} target="_blank" rel="noopener noreferrer" className="rounded-xl overflow-hidden">
                              <img src={p.photo_url} alt="" className="w-full h-24 object-cover" />
                              <div className="text-[9px] text-center p-1">
                                <span className="capitalize">{p.photo_type}</span>
                                {p.employees && <span className="block text-slate-400">by {p.employees.first_name}</span>}
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TASKS */}
                    {trackedJob.tasks?.length > 0 && (
                      <div className="bg-white dark:bg-slate-700 rounded-2xl p-5 border">
                        <h3 className="font-bold mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600" />Tasks ({trackedJob.tasks.filter(t => t.is_completed).length}/{trackedJob.tasks.length})</h3>
                        {trackedJob.tasks.map(t => (
                          <div key={t.id} className="flex items-center gap-2 text-sm py-1">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${t.is_completed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                              {t.is_completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <span className={t.is_completed ? 'line-through text-slate-400' : ''}>{t.description}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SIGNATURE */}
                    {trackedJob.signature && (
                      <div className="bg-white dark:bg-slate-700 rounded-2xl p-5 border">
                        <h3 className="font-bold mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" />Client Signature</h3>
                        <p className="text-sm">Signed by: <span className="font-semibold">{trackedJob.signature.signed_by || trackedJob.signature.client_name}</span></p>
                        <p className="text-xs">Rating: {'⭐'.repeat(trackedJob.signature.satisfaction_rating || 0)}</p>
                        {trackedJob.signature.signature_url && <img src={trackedJob.signature.signature_url} alt="Signature" className="mt-2 max-h-20 border rounded-lg" />}
                      </div>
                    )}

                    {/* INCIDENTS */}
                    {trackedJob.incidents?.length > 0 && (
                      <div className="bg-white dark:bg-slate-700 rounded-2xl p-5 border">
                        <h3 className="font-bold mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-600" />Incidents ({trackedJob.incidents.length})</h3>
                        {trackedJob.incidents.map(inc => (
                          <div key={inc.id} className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3 mb-2 text-sm">
                            <p className="font-medium capitalize">{inc.incident_type} - <span className="text-red-600">{inc.severity}</span></p>
                            <p className="text-slate-600 mt-1">{inc.description}</p>
                            {inc.employees && <p className="text-xs text-slate-400 mt-1">Reported by: {inc.employees.first_name} {inc.employees.last_name}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* INVOICE */}
                    {trackedJob.invoice && (
                      <div className="bg-white dark:bg-slate-700 rounded-2xl p-5 border">
                        <h3 className="font-bold mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-600" />Invoice</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-slate-500">Invoice #:</span> <span className="font-semibold">{trackedJob.invoice.invoice_number}</span></div>
                          <div><span className="text-slate-500">Status:</span> <span className="font-semibold capitalize">{trackedJob.invoice.status}</span></div>
                          <div><span className="text-slate-500">Amount:</span> <span className="font-semibold">{formatCurrency(trackedJob.invoice.total_amount)}</span></div>
                          <div><span className="text-slate-500">Due:</span> <span className="font-semibold">{formatDateOnly(trackedJob.invoice.due_date)}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!trackedJob && !trackerError && (
                  <div className="text-center py-12">
                    <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Enter a job number to track</p>
                    <p className="text-slate-400 text-sm mt-1">Shows who created, selected, completed, and all job history</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditingJob(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white dark:bg-slate-800"><div><h3 className="text-lg font-bold">Edit Job</h3><p className="text-xs text-slate-500">{editingJob.job_number}</p></div><button onClick={() => setEditingJob(null)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button></div>
              <div className="p-5 space-y-4">
                <div><label className="text-xs font-semibold mb-1 block">Title</label><input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full p-3 rounded-xl border text-sm" /></div>
                <div><label className="text-xs font-semibold mb-1 block">Status</label><select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full p-3 rounded-xl border text-sm"><option value="pending">Pending</option><option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="on_hold">On Hold</option><option value="cancelled">Cancelled</option></select></div>
                <div><label className="text-xs font-semibold mb-1 block">Priority</label><select value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value})} className="w-full p-3 rounded-xl border text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                <div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-semibold mb-1 block">Date</label><input type="date" value={editForm.scheduled_date} onChange={e => setEditForm({...editForm, scheduled_date: e.target.value})} className="w-full p-3 rounded-xl border text-sm" /></div><div><label className="text-xs font-semibold mb-1 block">Start</label><input type="time" value={editForm.scheduled_start_time} onChange={e => setEditForm({...editForm, scheduled_start_time: e.target.value})} className="w-full p-3 rounded-xl border text-sm" /></div><div><label className="text-xs font-semibold mb-1 block">End</label><input type="time" value={editForm.scheduled_end_time} onChange={e => setEditForm({...editForm, scheduled_end_time: e.target.value})} className="w-full p-3 rounded-xl border text-sm" /></div></div>
                <div><label className="text-xs font-semibold mb-1 block">Address</label><input type="text" value={editForm.site_address} onChange={e => setEditForm({...editForm, site_address: e.target.value})} className="w-full p-3 rounded-xl border text-sm" /></div>
                <div><label className="text-xs font-semibold mb-1 block">Notes</label><textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} rows={3} className="w-full p-3 rounded-xl border text-sm resize-none" /></div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t"><button onClick={() => setEditingJob(null)} className="px-5 py-2.5 rounded-xl bg-slate-200 text-sm">Cancel</button><button onClick={handleSaveEdit} disabled={savingEdit} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">{savingEdit ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save className="w-4 h-4" />} Save</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// People Card Component
function PeopleCard({ icon: Icon, label, name, detail, role, color, bg }) {
  return (
    <div className={`${bg} dark:bg-opacity-10 rounded-xl p-3 border`}>
      <p className={`text-xs font-semibold ${color} mb-1`}>{label}</p>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <div>
          <p className="font-medium text-sm">{name || 'N/A'}</p>
          {detail && <p className="text-xs text-slate-500">{detail}</p>}
          {role && <p className="text-[10px] text-slate-400 capitalize">{role?.replace(/_/g, ' ')}</p>}
        </div>
      </div>
    </div>
  )
}

// Timeline Item Component
function TlItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2 border-l-2 border-blue-200 dark:border-blue-800 pl-4">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium">{value || 'N/A'}</p>
      </div>
    </div>
  )
}
