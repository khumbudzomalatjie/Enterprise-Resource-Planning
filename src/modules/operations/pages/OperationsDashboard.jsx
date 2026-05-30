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
  Truck, ClipboardCheck, Map, Pause, Play, Edit3, X, Save
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
    title: '',
    status: '',
    priority: '',
    scheduled_date: '',
    scheduled_start_time: '',
    scheduled_end_time: '',
    site_address: '',
    notes: ''
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Check if user can manage jobs
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

  // OPEN EDIT MODAL
  const handleOpenEdit = (job, e) => {
    e.stopPropagation()
    setEditingJob(job)
    setEditForm({
      title: job.title || '',
      status: job.status || 'pending',
      priority: job.priority || 'medium',
      scheduled_date: job.scheduled_date || '',
      scheduled_start_time: job.scheduled_start_time?.slice(0,5) || '',
      scheduled_end_time: job.scheduled_end_time?.slice(0,5) || '',
      site_address: job.site_address || '',
      notes: job.notes || ''
    })
  }

  // SAVE EDIT
  const handleSaveEdit = async () => {
    if (!editingJob) return
    setSavingEdit(true)
    
    try {
      const updates = {
        title: editForm.title,
        status: editForm.status,
        priority: editForm.priority,
        scheduled_date: editForm.scheduled_date,
        scheduled_start_time: editForm.scheduled_start_time,
        scheduled_end_time: editForm.scheduled_end_time,
        site_address: editForm.site_address,
        notes: editForm.notes,
        updated_at: new Date().toISOString()
      }

      // If status changed to completed, set actual_end_time
      if (editForm.status === 'completed' && editingJob.status !== 'completed') {
        updates.actual_end_time = new Date().toISOString()
      }
      // If status changed to in_progress, set actual_start_time
      if (editForm.status === 'in_progress' && editingJob.status !== 'in_progress') {
        updates.actual_start_time = new Date().toISOString()
      }

      const { error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', editingJob.id)

      if (error) throw error

      toast.success('Job updated successfully! ✅')
      setEditingJob(null)
      loadData()
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Failed to update job')
    } finally {
      setSavingEdit(false)
    }
  }

  // HOLD JOB
  const handleHoldJob = async (jobId, e) => {
    e.stopPropagation()
    const reason = prompt('Reason for putting job on hold:')
    if (reason === null) return
    
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'on_hold', 
          notes: `HOLD: ${reason}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
      if (error) throw error
      toast.success('Job put on hold ⏸️')
      loadData()
    } catch (error) {
      toast.error('Failed to hold job')
    }
  }

  // RESUME JOB
  const handleResumeJob = async (jobId, e) => {
    e.stopPropagation()
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'scheduled', 
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
      if (error) throw error
      toast.success('Job resumed ▶️')
      loadData()
    } catch (error) {
      toast.error('Failed to resume job')
    }
  }

  // CANCEL JOB
  const handleCancelJob = async (jobId, e) => {
    e.stopPropagation()
    if (!window.confirm('Cancel this job? This cannot be undone.')) return
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', jobId)
      if (error) throw error
      toast.success('Job cancelled')
      loadData()
    } catch (error) {
      toast.error('Failed to cancel job')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      on_hold: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    }
    return colors[status] || 'bg-slate-100 text-slate-700'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-slate-500',
      medium: 'text-blue-600',
      high: 'text-amber-600',
      urgent: 'text-red-600',
      emergency: 'text-red-600 animate-pulse',
    }
    return colors[priority] || 'text-slate-500'
  }

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
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Jobs & Operations</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">Job management, team scheduling, routes, and quality control</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/operations/jobs/new')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-5 h-5" /><span>New Job</span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="neu-raised rounded-2xl p-4 stat-card">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'All Jobs', icon: Briefcase, path: '/operations/jobs' },
            { label: 'Calendar', icon: Calendar, path: '/operations/calendar' },
            { label: 'Quality Checks', icon: ClipboardCheck, path: '/operations/quality' },
            { label: 'Map', icon: Map, path: '/operations/routes' },
          ].map(action => (
            <button key={action.label} onClick={() => navigate(action.path)} className="neu-raised neu-btn rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-105">
              <action.icon className="w-6 h-6 text-emerald-600" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Job Categories */}
        <div className="neu-raised rounded-3xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />Job Categories ({jobCategories.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {jobCategories.map(cat => (
              <span key={cat.id} className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: cat.color + '20', color: cat.color, border: '1px solid ' + cat.color + '40' }}>
                {cat.name}
              </span>
            ))}
          </div>
        </div>

        {/* Today's Jobs Table */}
        <div className="neu-raised rounded-3xl p-6 mb-8">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-600" />Today's Schedule</h2>
            <Link to="/operations/calendar" className="text-sm text-emerald-600 flex items-center gap-1">Calendar <ChevronRight className="w-4 h-4" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left text-sm font-medium text-slate-500 py-3 px-2">Job #</th>
                  <th className="text-left text-sm font-medium text-slate-500 py-3 px-2">Client</th>
                  <th className="text-left text-sm font-medium text-slate-500 py-3 px-2">Category</th>
                  <th className="text-left text-sm font-medium text-slate-500 py-3 px-2">Time</th>
                  <th className="text-left text-sm font-medium text-slate-500 py-3 px-2">Priority</th>
                  <th className="text-left text-sm font-medium text-slate-500 py-3 px-2">Status</th>
                  <th className="text-left text-sm font-medium text-slate-500 py-3 px-2">Location</th>
                  {canManageJobs && <th className="text-center text-sm font-medium text-slate-500 py-3 px-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {todayJobs.map(job => (
                  <tr key={job.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-2 text-sm font-medium text-slate-800 dark:text-white cursor-pointer" onClick={() => navigate(`/operations/jobs/${job.id}`)}>{job.job_number}</td>
                    <td className="py-3 px-2 text-sm text-slate-600 dark:text-slate-400">{job.clients?.company_name || '-'}</td>
                    <td className="py-3 px-2">
                      {job.job_categories ? (
                        <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: job.job_categories.color + '20', color: job.job_categories.color }}>{job.job_categories.name}</span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-2 text-sm text-slate-600">{job.scheduled_start_time?.slice(0,5) || '-'}</td>
                    <td className="py-3 px-2"><span className={`text-xs font-medium ${getPriorityColor(job.priority)}`}>{job.priority}</span></td>
                    <td className="py-3 px-2"><span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(job.status)}`}>{job.status.replace('_', ' ')}</span></td>
                    <td className="py-3 px-2 text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{job.site_city || 'N/A'}</td>
                    {canManageJobs && (
                      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* EDIT BUTTON - Opens modal to change everything including status */}
                          <button onClick={(e) => handleOpenEdit(job, e)}
                            className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs hover:bg-blue-200 flex items-center gap-1"
                            title="Edit Job">
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          {job.status === 'on_hold' ? (
                            <button onClick={(e) => handleResumeJob(job.id, e)}
                              className="px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs hover:bg-green-200 flex items-center gap-1"
                              title="Resume Job">
                              <Play className="w-3 h-3" /> Resume
                            </button>
                          ) : job.status !== 'completed' && job.status !== 'cancelled' ? (
                            <>
                              <button onClick={(e) => handleHoldJob(job.id, e)}
                                className="px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs hover:bg-purple-200 flex items-center gap-1"
                                title="Put on Hold">
                                <Pause className="w-3 h-3" /> Hold
                              </button>
                              <button onClick={(e) => handleCancelJob(job.id, e)}
                                className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs hover:bg-red-200"
                                title="Cancel Job">✕</button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {todayJobs.length === 0 && <p className="text-center text-slate-500 py-8">No jobs scheduled for today</p>}
        </div>

        {/* Recent Jobs */}
        <div className="neu-raised rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-emerald-600" />Recent Jobs</h2>
          <div className="space-y-3">
            {recentJobs.map(job => (
              <div key={job.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50">
                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/operations/jobs/${job.id}`)}>
                  <p className="font-medium text-slate-800 dark:text-white text-sm">{job.title}</p>
                  <p className="text-xs text-slate-500">{job.clients?.company_name} · {job.job_number}</p>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(job.status)}`}>{job.status.replace('_', ' ')}</span>
                  {canManageJobs && (
                    <button onClick={(e) => handleOpenEdit(job, e)}
                      className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs hover:bg-blue-200 flex items-center gap-1"
                      title="Edit Job">
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* EDIT JOB MODAL */}
      <AnimatePresence>
        {editingJob && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingJob(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Edit Job</h3>
                  <p className="text-xs text-slate-500">{editingJob.job_number}</p>
                </div>
                <button onClick={() => setEditingJob(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {/* Title */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Job Title</label>
                  <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm" />
                </div>

                {/* Status - KEY FIELD */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm font-medium">
                    <option value="pending">Pending</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Priority</label>
                  <select value={editForm.priority} onChange={e => setEditForm({...editForm, priority: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Date</label>
                    <input type="date" value={editForm.scheduled_date} onChange={e => setEditForm({...editForm, scheduled_date: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Start Time</label>
                    <input type="time" value={editForm.scheduled_start_time} onChange={e => setEditForm({...editForm, scheduled_start_time: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">End Time</label>
                    <input type="time" value={editForm.scheduled_end_time} onChange={e => setEditForm({...editForm, scheduled_end_time: e.target.value})}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm" />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Site Address</label>
                  <input type="text" value={editForm.site_address} onChange={e => setEditForm({...editForm, site_address: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm" />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Notes</label>
                  <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} rows={3}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm resize-none" />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
                <button onClick={() => setEditingJob(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-300">
                  Cancel
                </button>
                <button onClick={handleSaveEdit} disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                  {savingEdit ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
