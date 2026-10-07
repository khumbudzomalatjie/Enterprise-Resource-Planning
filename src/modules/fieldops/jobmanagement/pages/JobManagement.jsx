import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useJobManagementStore from '../store/jobManagementStore'
import useThemeStore from '../../../../store/themeStore'
import useAuthStore from '../../../../store/authStore'
import JobEditorModal from '../components/JobEditorModal'
import toast from 'react-hot-toast'
import {
  Briefcase, Search, ChevronRight,
  Calendar, Clock,
  CheckCircle2, XCircle, Edit, RotateCcw, Pause,
  UserCog, Flag, Eye, History, Sun, Moon, Sparkles,
  Loader2, X, Save, Hash, ArrowRight
} from 'lucide-react'

export default function JobManagement() {
  const {
    jobHistory, teams, employees, availableServices, editingJob,
    fetchStats, fetchJobHistory, fetchTeams, fetchEmployees,
    editJob, rescheduleJob, postponeJob, reassignJob, changePriority, cancelJob,
    searchByJobNumber, loadJobForEditing, clearEditingJob, fetchAvailableServices,
    saveFullJob
  } = useJobManagementStore()
  const { isDark, toggleTheme } = useThemeStore()
  const { user, profile } = useAuthStore()

  const [saving, setSaving] = useState(false)

  const [lookupInput, setLookupInput] = useState('')
  const [lookupResults, setLookupResults] = useState([])
  const [lookupLoading, setLookupLoading] = useState(false)
  const [showEditor, setShowEditor] = useState(false)

  const [showActionModal, setShowActionModal] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)

  const [editForm, setEditForm] = useState({})
  const [rescheduleForm, setRescheduleForm] = useState({ newDate: '', newTime: '', reason: '', notes: '' })
  const [postponeForm, setPostponeForm] = useState({ reason: '', notes: '', expectedDate: '' })
  const [reassignForm, setReassignForm] = useState({ newTeamId: '', newEmployeeId: '', reason: '' })
  const [cancelForm, setCancelForm] = useState({ reason: '', notes: '' })

  const userRole = profile?.role
  const canEdit = ['super_admin', 'operations_manager'].includes(userRole)
  const canReschedule = ['super_admin', 'operations_manager', 'supervisor'].includes(userRole)
  const canPostpone = ['super_admin', 'operations_manager', 'supervisor'].includes(userRole)
  const canReassign = ['super_admin', 'operations_manager'].includes(userRole)
  const canCancel = ['super_admin', 'operations_manager'].includes(userRole)
  const canChangePriority = ['super_admin', 'operations_manager', 'supervisor'].includes(userRole)

  useEffect(() => {
    // Preload lookups the modals need
    fetchStats()
    fetchTeams()
    fetchEmployees()
    fetchAvailableServices()
  }, [])

  const handleLookup = async () => {
    const query = lookupInput.trim()
    if (!query) { toast.error('Enter a job number'); return }

    setLookupLoading(true)
    const result = await searchByJobNumber(query)
    setLookupLoading(false)

    if (!result.success) {
      toast.error('Lookup failed: ' + (result.error || 'unknown'))
      return
    }

    const matches = result.data || []
    if (matches.length === 0) {
      toast.error(`No job found matching "${query}"`)
      setLookupResults([])
      return
    }

    const exact = matches.find(m => m.job_number?.toUpperCase() === query.toUpperCase())
    if (exact) { await openEditor(exact.id); return }
    if (matches.length === 1) { await openEditor(matches[0].id); return }

    setLookupResults(matches)
  }

  const openEditor = async (jobId) => {
    setLookupLoading(true)
    const result = await loadJobForEditing(jobId)
    setLookupLoading(false)
    if (!result.success) {
      toast.error(result.error || 'Failed to load job')
      return
    }
    setLookupResults([])
    setShowEditor(true)
  }

  const closeEditor = () => {
    setShowEditor(false)
    clearEditingJob()
  }

  const handleSaveEditor = async (payload) => {
    if (!editingJob?.id) return
    setSaving(true)
    const currentUser = { ...user, ...profile }
    const result = await saveFullJob(editingJob.id, payload, currentUser)
    setSaving(false)
    if (result.success) {
      closeEditor()
      setLookupInput('')
    } else {
      toast.error(result.error || 'Save failed')
    }
  }

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
    if (action === 'reassign') setReassignForm({ newTeamId: job.teams?.id || '', newEmployeeId: '', reason: '' })
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Ops</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Job Management</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-emerald-600" />Job Management
          </h1>
          <p className="text-slate-500 mt-1 ml-11">Look up a job to edit, reschedule, or manage</p>
        </motion.div>

        {/* Lookup Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="neu-raised rounded-3xl p-6 border-l-4 border-emerald-500"
        >
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-800 dark:text-white">Look Up a Job</h2>
          </div>
          <p className="text-sm text-slate-500 mb-5">
            Type a job number to open the editor. You'll be able to update details,
            add or remove services, and change the schedule.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                value={lookupInput}
                onChange={e => setLookupInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
                placeholder="e.g. JOB-2610-0004 or 2610"
                className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 font-mono"
                autoComplete="off"
                autoFocus
              />
            </div>
            <button
              onClick={handleLookup}
              disabled={lookupLoading}
              className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Open Job
            </button>
          </div>

          {/* Results picker */}
          {lookupResults.length > 0 && (
            <div className="mt-5 neu-inset rounded-2xl p-3 max-h-96 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-2 px-1">
                {lookupResults.length} match{lookupResults.length !== 1 ? 'es' : ''} — pick one:
              </p>
              <div className="space-y-1">
                {lookupResults.map(r => (
                  <button
                    key={r.id}
                    onClick={() => openEditor(r.id)}
                    className="w-full text-left p-3 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-slate-800 dark:text-white text-sm">{r.job_number}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {r.title}
                        {r.clients?.company_name && <> · {r.clients.company_name}</>}
                        {r.scheduled_date && <> · {formatDate(r.scheduled_date)}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${getStatusColor(r.status)}`}>
                        {r.status?.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${getPriorityColor(r.priority)}`}>
                        {r.priority}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Job Editor Modal */}
      <AnimatePresence>
        {showEditor && editingJob && (
          <JobEditorModal
            job={editingJob}
            services={availableServices}
            saving={saving}
            onClose={closeEditor}
            onSave={handleSaveEditor}
          />
        )}
      </AnimatePresence>

      {/* Action Modals */}
      <AnimatePresence>
        {showActionModal && selectedJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={closeModal}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>

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
                        <p className="text-xs text-slate-500 mt-1">
                          By: <span className="font-medium text-slate-700 dark:text-slate-300">{h.performed_by_name || 'Unknown'}</span>
                        </p>
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
