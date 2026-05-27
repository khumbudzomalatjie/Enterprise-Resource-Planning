import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useOperationsStore from '../store/operationsStore'
import useCRMStore from '../../crm/store/crmStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Briefcase, Calendar, Clock, MapPin, Users, Phone,
  Save, ArrowLeft, ChevronRight, Pencil, Trash2,
  Sun, Moon, Sparkles, CheckCircle2, Play, XCircle,
  DollarSign, ClipboardList, AlertTriangle
} from 'lucide-react'

export default function JobDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEditMode = searchParams.get('edit') === 'true'
  
  const { selectedJob, fetchJob, updateJob, updateJobStatus, deleteJob, fetchJobCategories, jobCategories, loading } = useOperationsStore()
  const { clients, fetchClients } = useCRMStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [editMode, setEditMode] = useState(isEditMode)
  const [jobData, setJobData] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [statusConfirm, setStatusConfirm] = useState(null)

  useEffect(() => {
    loadJob()
    fetchClients({ status: 'active' })
    fetchJobCategories()
  }, [id])

  const loadJob = async () => {
    const result = await fetchJob(id)
    if (result.success) {
      setJobData(result.data)
    } else {
      toast.error('Job not found')
      navigate('/operations/jobs')
    }
  }

  const handleSave = async () => {
    if (!jobData) return
    const result = await updateJob(id, jobData)
    if (result.success) {
      toast.success('Job updated successfully')
      setEditMode(false)
      loadJob()
    } else {
      toast.error('Failed to update job')
    }
  }

  const handleStatusChange = async (newStatus) => {
    const result = await updateJobStatus(id, newStatus)
    if (result.success) {
      toast.success(`Job marked as ${newStatus.replace('_', ' ')}`)
      setStatusConfirm(null)
      loadJob()
    } else {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    const result = await deleteJob(id)
    if (result.success) {
      toast.success('Job cancelled')
      navigate('/operations/jobs')
    } else {
      toast.error('Failed to cancel job')
    }
  }

  const handleCategorySelect = (categoryId) => {
    const category = jobCategories.find(c => c.id === categoryId)
    if (category) {
      setJobData({
        ...jobData,
        job_category_id: category.id,
        estimated_duration_minutes: category.estimated_duration_minutes || jobData.estimated_duration_minutes,
        cleaners_required: category.default_cleaners_required || jobData.cleaners_required,
      })
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return 'Not set'
    return new Date(date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-slate-100 text-slate-700',
      scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
      overdue: 'bg-red-100 text-red-700',
    }
    return colors[status] || 'bg-slate-100 text-slate-700'
  }

  if (loading || !jobData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/operations" className="text-slate-500 hover:text-emerald-600">Operations</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/operations/jobs" className="text-slate-500 hover:text-emerald-600">Jobs</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">{jobData.job_number}</span>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-emerald-600" />
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{jobData.title}</h1>
                <p className="text-sm text-slate-500">{jobData.job_number} · {jobData.clients?.company_name}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!editMode ? (
              <>
                <button onClick={() => setEditMode(true)} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
                  <Pencil className="w-4 h-4" /><span>Edit</span>
                </button>
                <button onClick={() => setDeleteConfirm(true)} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /><span>Cancel Job</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditMode(false)} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-500 text-white hover:bg-slate-600">Cancel</button>
                <button onClick={handleSave} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
                  <Save className="w-4 h-4" /><span>Save Changes</span>
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Status Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="neu-raised rounded-2xl p-4 mb-6 flex flex-wrap gap-3">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(jobData.status)} capitalize`}>
            {jobData.status?.replace(/_/g, ' ')}
          </span>
          {jobData.status === 'pending' && (
            <button onClick={() => handleStatusChange('scheduled')} className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Mark Scheduled
            </button>
          )}
          {(jobData.status === 'scheduled' || jobData.status === 'pending') && (
            <button onClick={() => handleStatusChange('in_progress')} className="px-4 py-1.5 rounded-xl bg-amber-600 text-white text-sm hover:bg-amber-700 flex items-center gap-1">
              <Play className="w-4 h-4" /> Start Job
            </button>
          )}
          {jobData.status === 'in_progress' && (
            <button onClick={() => handleStatusChange('completed')} className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Complete Job
            </button>
          )}
          {jobData.status !== 'cancelled' && jobData.status !== 'completed' && (
            <button onClick={() => setStatusConfirm('cancelled')} className="px-4 py-1.5 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700 flex items-center gap-1">
              <XCircle className="w-4 h-4" /> Cancel
            </button>
          )}
        </motion.div>

        {/* Job Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Job Info */}
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-600" /> Job Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500">Category</label>
                {editMode ? (
                  <select value={jobData.job_category_id || ''} onChange={(e) => handleCategorySelect(e.target.value)} className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50">
                    <option value="">Select Category</option>
                    {jobCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                ) : (
                  <p className="text-slate-800 dark:text-white">{jobData.job_categories?.name || 'Not set'}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500">Title</label>
                {editMode ? (
                  <input type="text" value={jobData.title} onChange={(e) => setJobData({...jobData, title: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50" />
                ) : (
                  <p className="text-slate-800 dark:text-white">{jobData.title}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500">Description</label>
                {editMode ? (
                  <textarea value={jobData.description || ''} onChange={(e) => setJobData({...jobData, description: e.target.value})} rows={3} className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50" />
                ) : (
                  <p className="text-slate-800 dark:text-white">{jobData.description || 'No description'}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500">Quoted Amount</label>
                {editMode ? (
                  <input type="number" value={jobData.quoted_amount || 0} onChange={(e) => setJobData({...jobData, quoted_amount: parseFloat(e.target.value) || 0})} className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50" />
                ) : (
                  <p className="text-slate-800 dark:text-white font-semibold">{formatCurrency(jobData.quoted_amount)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" /> Location
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500">Site Address</label>
                {editMode ? (
                  <input type="text" value={jobData.site_address || ''} onChange={(e) => setJobData({...jobData, site_address: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50" />
                ) : (
                  <p className="text-slate-800 dark:text-white">{jobData.site_address || 'Not set'}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">City</label>
                  {editMode ? (
                    <input type="text" value={jobData.site_city || ''} onChange={(e) => setJobData({...jobData, site_city: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50" />
                  ) : (
                    <p className="text-slate-800 dark:text-white">{jobData.site_city || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500">Postal Code</label>
                  {editMode ? (
                    <input type="text" value={jobData.site_postal_code || ''} onChange={(e) => setJobData({...jobData, site_postal_code: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" />
                  ) : (
                    <p className="text-slate-800 dark:text-white">{jobData.site_postal_code || '-'}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">Contact</label>
                {editMode ? (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <input type="text" value={jobData.site_contact_name || ''} onChange={(e) => setJobData({...jobData, site_contact_name: e.target.value})} placeholder="Name" className="p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50" />
                    <input type="text" value={jobData.site_contact_phone || ''} onChange={(e) => setJobData({...jobData, site_contact_phone: e.target.value})} placeholder="Phone" className="p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50" />
                  </div>
                ) : (
                  <p className="text-slate-800 dark:text-white">
                    {jobData.site_contact_name || 'No contact'} {jobData.site_contact_phone && `· ${jobData.site_contact_phone}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" /> Schedule
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500">Date</label>
                {editMode ? (
                  <input type="date" value={jobData.scheduled_date || ''} onChange={(e) => setJobData({...jobData, scheduled_date: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50" />
                ) : (
                  <p className="text-slate-800 dark:text-white">{formatDate(jobData.scheduled_date)}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Start Time</label>
                  {editMode ? (
                    <input type="time" value={jobData.scheduled_start_time || ''} onChange={(e) => setJobData({...jobData, scheduled_start_time: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50" />
                  ) : (
                    <p className="text-slate-800 dark:text-white">{jobData.scheduled_start_time?.slice(0,5) || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500">End Time</label>
                  {editMode ? (
                    <input type="time" value={jobData.scheduled_end_time || ''} onChange={(e) => setJobData({...jobData, scheduled_end_time: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50" />
                  ) : (
                    <p className="text-slate-800 dark:text-white">{jobData.scheduled_end_time?.slice(0,5) || 'Not set'}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Duration (min)</label>
                  {editMode ? (
                    <input type="number" value={jobData.estimated_duration_minutes || 0} onChange={(e) => setJobData({...jobData, estimated_duration_minutes: parseInt(e.target.value) || 0})} className="w-full p-3 neu-inset rounded-xl mt-1" />
                  ) : (
                    <p className="text-slate-800 dark:text-white">{jobData.estimated_duration_minutes || '-'} min</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500">Priority</label>
                  {editMode ? (
                    <select value={jobData.priority} onChange={(e) => setJobData({...jobData, priority: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option>
                    </select>
                  ) : (
                    <p className="text-slate-800 dark:text-white capitalize">{jobData.priority}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" /> Assignment
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500">Cleaners Required</label>
                {editMode ? (
                  <input type="number" value={jobData.cleaners_required || 1} onChange={(e) => setJobData({...jobData, cleaners_required: parseInt(e.target.value) || 1})} className="w-full p-3 neu-inset rounded-xl mt-1" />
                ) : (
                  <p className="text-slate-800 dark:text-white">{jobData.cleaners_required || 1}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500">Assigned Cleaners</label>
                <p className="text-slate-800 dark:text-white">{jobData.cleaners_assigned || 0} / {jobData.cleaners_required || 0}</p>
              </div>
              {jobData.job_assignments?.length > 0 && (
                <div className="space-y-2">
                  {jobData.job_assignments.map(assignment => (
                    <div key={assignment.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <span className="text-emerald-600 text-xs font-semibold">
                          {assignment.employees?.first_name?.[0]}{assignment.employees?.last_name?.[0]}
                        </span>
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {assignment.employees?.first_name} {assignment.employees?.last_name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Special Instructions</h2>
            {editMode ? (
              <textarea value={jobData.special_instructions || ''} onChange={(e) => setJobData({...jobData, special_instructions: e.target.value})} rows={3} className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50" />
            ) : (
              <p className="text-slate-600 dark:text-slate-400">{jobData.special_instructions || 'No special instructions'}</p>
            )}
          </div>
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Internal Notes</h2>
            {editMode ? (
              <textarea value={jobData.notes || ''} onChange={(e) => setJobData({...jobData, notes: e.target.value})} rows={3} className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50" />
            ) : (
              <p className="text-slate-600 dark:text-slate-400">{jobData.notes || 'No notes'}</p>
            )}
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="neu-raised rounded-3xl p-8 max-w-md mx-4 bg-white dark:bg-slate-800">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white text-center mb-2">Cancel Job?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-6">This will mark the job as cancelled.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirm(false)} className="px-6 py-2 rounded-xl bg-slate-200 dark:bg-slate-700">Keep</button>
              <button onClick={handleDelete} className="px-6 py-2 rounded-xl bg-red-600 text-white">Cancel Job</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Status Confirmation Modal */}
      {statusConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="neu-raised rounded-3xl p-8 max-w-md mx-4 bg-white dark:bg-slate-800">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-white text-center mb-2">Change Status?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-6">Mark job as <strong className="capitalize">{statusConfirm.replace('_', ' ')}</strong>?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setStatusConfirm(null)} className="px-6 py-2 rounded-xl bg-slate-200 dark:bg-slate-700">Cancel</button>
              <button onClick={() => handleStatusChange(statusConfirm)} className="px-6 py-2 rounded-xl bg-emerald-600 text-white">Confirm</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
