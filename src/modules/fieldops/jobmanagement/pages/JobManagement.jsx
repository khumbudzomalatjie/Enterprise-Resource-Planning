import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useJobManagementStore from '../store/jobManagementStore'
import useThemeStore from '../../../../store/themeStore'
import useAuthStore from '../../../../store/authStore'
import toast from 'react-hot-toast'
import {
  Briefcase, Search, Filter, ArrowLeft, ChevronRight,
  Calendar, Clock, User, Users, MapPin, AlertTriangle,
  CheckCircle2, XCircle, Edit, RotateCcw, Pause, 
  UserCog, Flag, Eye, History, Sun, Moon, Sparkles,
  Loader2, X, Save, TrendingUp, RefreshCw
} from 'lucide-react'

export default function JobManagement() {
  const {
    jobs, stats, jobHistory, teams, employees,
    fetchJobs, fetchStats, fetchJobHistory, fetchTeams, fetchEmployees,
    editJob, rescheduleJob, postponeJob, reassignJob, changePriority, cancelJob
  } = useJobManagementStore()
  const { isDark, toggleTheme } = useThemeStore()
  const { user, profile } = useAuthStore()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [saving, setSaving] = useState(false)

  // Modal states
  const [showActionModal, setShowActionModal] = useState(null) // 'edit' | 'reschedule' | 'postpone' | 'reassign' | 'priority' | 'cancel' | 'view' | 'history'
  const [selectedJob, setSelectedJob] = useState(null)

  // Form state
  const [editForm, setEditForm] = useState({})
  const [rescheduleForm, setRescheduleForm] = useState({ newDate: '', newTime: '', reason: '', notes: '' })
  const [postponeForm, setPostponeForm] = useState({ reason: '', notes: '', expectedDate: '' })
  const [reassignForm, setReassignForm] = useState({ newTeamId: '', newEmployeeId: '', reason: '' })
  const [cancelForm, setCancelForm] = useState({ reason: '', notes: '' })

  // RBAC
  const userRole = profile?.role
  const canEdit = ['super_admin', 'operations_manager'].includes(userRole)
  const canReschedule = ['super_admin', 'operations_manager', 'supervisor'].includes(userRole)
  const canPostpone = ['super_admin', 'operations_manager', 'supervisor'].includes(userRole)
  const canReassign = ['super_admin', 'operations_manager'].includes(userRole)
  const canCancel = ['super_admin', 'operations_manager'].includes(userRole)
  const canChangePriority = ['super_admin', 'operations_manager', 'supervisor'].includes(userRole)

  useEffect(() => {
    loadData()
    fetchTeams()
    fetchEmployees()
  }, [statusFilter, priorityFilter, dateFrom, dateTo])

  const loadData = () => {
    fetchJobs({
      search,
      status: statusFilter,
      priority: priorityFilter,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    })
    fetchStats()
  }

  const handleSearch = (e) => { e.preventDefault(); loadData() }

  const openAction = (job, action) => {
    setSelectedJob(job)
    if (action === 'edit') {
      setEditForm({
        title: job.title || '',
        description: job.description || '',
        site_address: job.site_address || '',
        site_city: job.site_city || '',
        priority: job.priority || 'medium',
        notes: job.notes || '',
      })
    }
    if (action === 'reschedule') {
      setRescheduleForm({
        newDate: job.scheduled_date || '',
        newTime: job.scheduled_start_time?.slice(0, 5) || '',
        reason: '',
        notes: '',
      })
    }
    if (action === 'postpone') setPostponeForm({ reason: '', notes: '', expectedDate: '' })
    if (action === 'reassign') setReassignForm({ newTeamId: job.team_id || '', newEmployeeId: '', reason: '' })
    if (action === 'cancel') setCancelForm({ reason: '', notes: '' })
    if (action === 'history') fetchJobHistory(job.id)
    setShowActionModal(action)
  }

  const closeModal = () => { setShowActionModal(null); setSelectedJob(null) }

  const currentUser = { ...user, ...profile }

  const handleEditSave = async () => {
    setSaving(true)
    const result = await editJob(selectedJob.id, editForm, currentUser)
    setSaving(false)
    if (result.success) closeModal()
    else toast.error(result.error)
  }

  const handleReschedule = async () => {
    if (!rescheduleForm.newDate || !rescheduleForm.reason) { toast.error('Date and reason are required'); return }
    setSaving(true)
    const result = await rescheduleJob(selectedJob.id, rescheduleForm, currentUser)
    setSaving(false)
    if (result.success) closeModal()
    else toast.error(result.error)
  }

  const handlePostpone = async () => {
    if (!postponeForm.reason) { toast.error('Reason required'); return }
    setSaving(true)
    const result = await postponeJob(selectedJob.id, postponeForm, currentUser)
    setSaving(false)
    if (result.success) closeModal()
    else toast.error(result.error)
  }

  const handleReassign = async () => {
    if (!reassignForm.reason) { toast.error('Reason required'); return }
    setSaving(true)
    const result = await reassignJob(selectedJob.id, reassignForm, currentUser)
    setSaving(false)
    if (result.success) closeModal()
    else toast.error(result.error)
  }

  const handlePriority = async (priority) => {
    setSaving(true)
    const result = await changePriority(selectedJob.id, priority, currentUser)
    setSaving(false)
    if (result.success) closeModal()
    else toast.error(result.error)
  }

  const handleCancel = async () => {
    if (!cancelForm.reason) { toast.error('Reason required'); return }
    if (!window.confirm('Are you sure you want to cancel this job? This cannot be undone.')) return
    setSaving(true)
    const result = await cancelJob(selectedJob.id, cancelForm, currentUser)
    setSaving(false)
    if (result.success) closeModal()
    else toast.error(result.error)
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      assigned: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      rescheduled: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      postponed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }
    return colors[status] || colors.draft
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-slate-100 text-slate-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-amber-100 text-amber-600',
      urgent: 'bg-red-100 text-red-700',
      emergency: 'bg-red-200 text-red-800',
    }
    return colors[priority] || colors.low
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  const filteredJobs = jobs.filter(j => {
    if (!search) return true
    const s = search.toLowerCase()
    return j.job_number?.toLowerCase().includes(s) ||
           j.title?.toLowerCase().includes(s) ||
           j.clients?.company_name?.toLowerCase().includes(s) ||
           j.site_address?.toLowerCase().includes(s)
  })

  const statCards = [
    { label: 'Total', value: stats.total || 0, icon: Briefcase, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },
    { label: 'Scheduled', value: stats.scheduled || 0, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Rescheduled', value: stats.rescheduled || 0, icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { label: 'Postponed', value: stats.postponed || 0, icon: Pause, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    { label: 'Completed', value: stats.completed || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Cancelled', value: stats.cancelled || 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
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
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Ops</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Job Management</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-emerald-600" />Job Management
          </h1>
          <p className="text-slate-500 mt-1 ml-11">Edit, reschedule, postpone, reassign and track jobs</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
              className="neu-raised rounded-2xl p-4 text-center">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by job#, customer, address..."
                className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="postponed">Postponed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <button type="submit" className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white flex items-center justify-center gap-2">
              <Filter className="w-4 h-4" /> Apply
            </button>
          </form>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">From:</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="flex-1 px-3 py-2 neu-inset rounded-xl text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">To:</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="flex-1 px-3 py-2 neu-inset rounded-xl text-sm" />
            </div>
          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden lg:block neu-raised rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Job ID</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Customer</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Service</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Location</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Cleaner/Team</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Date</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Time</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Priority</th>
                  <th className="text-right py-3 px-3 text-slate-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(job => {
                  const activeAssignment = (job.field_job_assignments || []).find(a => a.assignment_status !== 'released' && a.assignment_status !== 'completed')
                  return (
                    <tr key={job.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-white">{job.job_number}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{job.clients?.company_name || '—'}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{job.title}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{job.site_address || '—'}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {activeAssignment?.employees ? `${activeAssignment.employees.first_name} ${activeAssignment.employees.last_name}` : (job.teams?.team_name || '—')}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{formatDate(job.scheduled_date)}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{job.scheduled_start_time?.slice(0,5) || '—'}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(job.status)}`}>
                          {job.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getPriorityColor(job.priority)}`}>
                          {job.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openAction(job, 'view')} className="p-2 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button onClick={() => openAction(job, 'edit')} className="p-2 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canReschedule && (
                            <button onClick={() => openAction(job, 'reschedule')} className="p-2 rounded-lg hover:bg-orange-100 text-slate-400 hover:text-orange-600" title="Reschedule">
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          {canPostpone && (
                            <button onClick={() => openAction(job, 'postpone')} className="p-2 rounded-lg hover:bg-yellow-100 text-slate-400 hover:text-yellow-600" title="Postpone">
                              <Pause className="w-4 h-4" />
                            </button>
                          )}
                          {canReassign && (
                            <button onClick={() => openAction(job, 'reassign')} className="p-2 rounded-lg hover:bg-purple-100 text-slate-400 hover:text-purple-600" title="Reassign">
                              <UserCog className="w-4 h-4" />
                            </button>
                          )}
                          {canChangePriority && (
                            <button onClick={() => openAction(job, 'priority')} className="p-2 rounded-lg hover:bg-amber-100 text-slate-400 hover:text-amber-600" title="Change Priority">
                              <Flag className="w-4 h-4" />
                            </button>
                          )}
                          {canCancel && (
                            <button onClick={() => openAction(job, 'cancel')} className="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600" title="Cancel">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => openAction(job, 'history')} className="p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700" title="History">
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredJobs.length === 0 && (
                  <tr><td colSpan="10" className="text-center py-12 text-slate-400">No jobs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOBILE CARDS */}
        <div className="lg:hidden space-y-4">
          {filteredJobs.map(job => (
            <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="neu-raised rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{job.job_number}</p>
                  <p className="text-xs text-slate-500">{job.clients?.company_name || '—'}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(job.status)}`}>
                  {job.status?.replace('_', ' ')}
                </span>
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-2">{job.title}</h3>
              <div className="space-y-1 text-xs text-slate-500 mb-3">
                <p className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.site_address || '—'}</p>
                <p className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(job.scheduled_date)} at {job.scheduled_start_time?.slice(0,5) || '—'}</p>
                <p className="flex items-center gap-1"><User className="w-3 h-3" />{job.teams?.team_name || 'No team'}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => openAction(job, 'view')} className="flex-1 py-2 rounded-xl bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3" /> View
                </button>
                {canReschedule && (
                  <button onClick={() => openAction(job, 'reschedule')} className="flex-1 py-2 rounded-xl bg-orange-100 text-orange-700 text-xs font-medium flex items-center justify-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Reschedule
                  </button>
                )}
                {canPostpone && (
                  <button onClick={() => openAction(job, 'postpone')} className="flex-1 py-2 rounded-xl bg-yellow-100 text-yellow-700 text-xs font-medium flex items-center justify-center gap-1">
                    <Pause className="w-3 h-3" /> Postpone
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {filteredJobs.length === 0 && (
            <div className="text-center py-12 neu-raised rounded-3xl">
              <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No jobs found</p>
            </div>
          )}
        </div>
      </main>

      {/* MODALS */}
      <AnimatePresence>
        {showActionModal && selectedJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={closeModal}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>

              {/* EDIT */}
              {showActionModal === 'edit' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Edit Job</h3>
                    <button onClick={closeModal} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-3">
                    <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Job Title" className="w-full p-3 neu-inset rounded-xl" />
                    <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} placeholder="Description" rows={3} className="w-full p-3 neu-inset rounded-xl resize-none" />
                    <input value={editForm.site_address} onChange={e => setEditForm({...editForm, site_address: e.target.value})} placeholder="Site Address" className="w-full p-3 neu-inset rounded-xl" />
                    <input value={editForm.site_city} onChange={e => setEditForm({...editForm, site_city: e.target.value})} placeholder="City" className="w-full p-3 neu-inset rounded-xl" />
                    <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} placeholder="Notes" rows={2} className="w-full p-3 neu-inset rounded-xl resize-none" />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-slate-200 font-medium">Cancel</button>
                    <button onClick={handleEditSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                    </button>
                  </div>
                </>
              )}

              {/* RESCHEDULE */}
              {showActionModal === 'reschedule' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Reschedule Job</h3>
                    <button onClick={closeModal} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{selectedJob.job_number} — Currently: {formatDate(selectedJob.scheduled_date)} at {selectedJob.scheduled_start_time?.slice(0,5)}</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500">New Date *</label>
                      <input type="date" value={rescheduleForm.newDate} onChange={e => setRescheduleForm({...rescheduleForm, newDate: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">New Time</label>
                      <input type="time" value={rescheduleForm.newTime} onChange={e => setRescheduleForm({...rescheduleForm, newTime: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Reason *</label>
                      <textarea value={rescheduleForm.reason} onChange={e => setRescheduleForm({...rescheduleForm, reason: e.target.value})} rows={3} placeholder="Why is this being rescheduled?" className="w-full p-3 neu-inset rounded-xl mt-1 resize-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Internal Notes</label>
                      <textarea value={rescheduleForm.notes} onChange={e => setRescheduleForm({...rescheduleForm, notes: e.target.value})} rows={2} className="w-full p-3 neu-inset rounded-xl mt-1 resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-slate-200 font-medium">Cancel</button>
                    <button onClick={handleReschedule} disabled={saving} className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Reschedule
                    </button>
                  </div>
                </>
              )}

              {/* POSTPONE */}
              {showActionModal === 'postpone' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Postpone Job</h3>
                    <button onClick={closeModal} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{selectedJob.job_number}</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500">Reason *</label>
                      <textarea value={postponeForm.reason} onChange={e => setPostponeForm({...postponeForm, reason: e.target.value})} rows={3} placeholder="Why is this being postponed?" className="w-full p-3 neu-inset rounded-xl mt-1 resize-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Expected New Date (optional)</label>
                      <input type="date" value={postponeForm.expectedDate} onChange={e => setPostponeForm({...postponeForm, expectedDate: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Notes</label>
                      <textarea value={postponeForm.notes} onChange={e => setPostponeForm({...postponeForm, notes: e.target.value})} rows={2} className="w-full p-3 neu-inset rounded-xl mt-1 resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-slate-200 font-medium">Cancel</button>
                    <button onClick={handlePostpone} disabled={saving} className="flex-1 py-3 rounded-xl bg-yellow-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />} Postpone
                    </button>
                  </div>
                </>
              )}

              {/* REASSIGN */}
              {showActionModal === 'reassign' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Reassign Job</h3>
                    <button onClick={closeModal} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{selectedJob.job_number} — Currently: {selectedJob.teams?.team_name || 'No team'}</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500">New Team</label>
                      <select value={reassignForm.newTeamId} onChange={e => setReassignForm({...reassignForm, newTeamId: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1">
                        <option value="">— No team —</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">New Cleaner</label>
                      <select value={reassignForm.newEmployeeId} onChange={e => setReassignForm({...reassignForm, newEmployeeId: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1">
                        <option value="">— No cleaner —</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Reason *</label>
                      <textarea value={reassignForm.reason} onChange={e => setReassignForm({...reassignForm, reason: e.target.value})} rows={3} placeholder="Why is this being reassigned?" className="w-full p-3 neu-inset rounded-xl mt-1 resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-slate-200 font-medium">Cancel</button>
                    <button onClick={handleReassign} disabled={saving} className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCog className="w-4 h-4" />} Reassign
                    </button>
                  </div>
                </>
              )}

              {/* CHANGE PRIORITY */}
              {showActionModal === 'priority' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Change Priority</h3>
                    <button onClick={closeModal} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{selectedJob.job_number}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['low', 'medium', 'high', 'urgent'].map(p => (
                      <button key={p} onClick={() => handlePriority(p)} disabled={saving}
                        className={`py-4 rounded-xl font-semibold capitalize transition-all ${
                          selectedJob.priority === p ? 'bg-emerald-600 text-white shadow-lg' : 'neu-raised text-slate-700 hover:bg-slate-100'
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <button onClick={closeModal} className="w-full mt-4 py-3 rounded-xl bg-slate-200 font-medium">Close</button>
                </>
              )}

              {/* CANCEL */}
              {showActionModal === 'cancel' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-red-600">Cancel Job</h3>
                    <button onClick={closeModal} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{selectedJob.job_number} — This action cannot be undone.</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500">Cancellation Reason *</label>
                      <textarea value={cancelForm.reason} onChange={e => setCancelForm({...cancelForm, reason: e.target.value})} rows={3} placeholder="Why is this job being cancelled?" className="w-full p-3 neu-inset rounded-xl mt-1 resize-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Notes</label>
                      <textarea value={cancelForm.notes} onChange={e => setCancelForm({...cancelForm, notes: e.target.value})} rows={2} className="w-full p-3 neu-inset rounded-xl mt-1 resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-slate-200 font-medium">Keep Job</button>
                    <button onClick={handleCancel} disabled={saving} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Cancel Job
                    </button>
                  </div>
                </>
              )}

              {/* VIEW */}
              {showActionModal === 'view' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Job Details</h3>
                    <button onClick={closeModal} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500">Job Number</p>
                      <p className="font-bold text-slate-800 dark:text-white">{selectedJob.job_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Title</p>
                      <p className="text-slate-700 dark:text-slate-300">{selectedJob.title}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Customer</p>
                      <p className="text-slate-700 dark:text-slate-300">{selectedJob.clients?.company_name || '—'}</p>
                      {selectedJob.clients?.phone && <p className="text-xs text-slate-500">📞 {selectedJob.clients.phone}</p>}
                      {selectedJob.clients?.email && <p className="text-xs text-slate-500">📧 {selectedJob.clients.email}</p>}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Location</p>
                      <p className="text-slate-700 dark:text-slate-300">{selectedJob.site_address || '—'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Date</p>
                        <p className="text-slate-700 dark:text-slate-300">{formatDate(selectedJob.scheduled_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Time</p>
                        <p className="text-slate-700 dark:text-slate-300">{selectedJob.scheduled_start_time?.slice(0,5) || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Status</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(selectedJob.status)}`}>{selectedJob.status}</span>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Priority</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(selectedJob.priority)}`}>{selectedJob.priority}</span>
                      </div>
                    </div>
                    {selectedJob.description && (
                      <div>
                        <p className="text-xs text-slate-500">Description</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{selectedJob.description}</p>
                      </div>
                    )}
                  </div>
                  <button onClick={closeModal} className="w-full mt-4 py-3 rounded-xl bg-slate-200 font-medium">Close</button>
                </>
              )}

              {/* HISTORY */}
              {showActionModal === 'history' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <History className="w-5 h-5" /> Job History
                    </h3>
                    <button onClick={closeModal} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">{selectedJob.job_number}</p>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {jobHistory.map(h => (
                      <div key={h.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border-l-4 border-emerald-500">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold uppercase text-emerald-600">{h.action_type?.replace('_', ' ')}</span>
                          <span className="text-xs text-slate-500">{new Date(h.created_at).toLocaleString('en-ZA')}</span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{h.action_description}</p>
                        {h.reason && <p className="text-xs text-slate-500 mt-1">Reason: {h.reason}</p>}
                        <p className="text-xs text-slate-500 mt-1">By: {h.performed_by_name || 'System'}</p>
                      </div>
                    ))}
                    {jobHistory.length === 0 && <p className="text-center text-slate-400 py-8">No history yet</p>}
                  </div>
                  <button onClick={closeModal} className="w-full mt-4 py-3 rounded-xl bg-slate-200 font-medium">Close</button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
