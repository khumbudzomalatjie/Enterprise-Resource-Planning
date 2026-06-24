import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFieldOpsStore from '../store/fieldOpsStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { 
  Radio, Search, Users, UserPlus, UserX, MapPin, 
  Clock, Play, CheckCircle2, ChevronRight,
  Sun, Moon, Sparkles, Briefcase
} from 'lucide-react'

export default function LiveJobs() {
  const { liveJobs, fetchLiveJobs, assignEmployee, releaseEmployee, updateJobStatus, loading } = useFieldOpsStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [availableEmployees, setAvailableEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')

  useEffect(() => {
    fetchLiveJobs()
    fetchAvailableEmployees()
  }, [])

  const fetchAvailableEmployees = async () => {
    const { data } = await supabase.from('employees').select('*').eq('employment_status', 'active').order('first_name')
    setAvailableEmployees(data || [])
  }

  const filteredJobs = liveJobs.filter(job => {
    if (!search) return true
    const s = search.toLowerCase()
    return job.job_number?.toLowerCase().includes(s) ||
           job.title?.toLowerCase().includes(s) ||
           job.clients?.company_name?.toLowerCase().includes(s) ||
           job.site_city?.toLowerCase().includes(s)
  })

  const handleAssign = async () => {
    if (!selectedJob || !selectedEmployee) return
    await assignEmployee(selectedJob.id, selectedEmployee)
    setShowAssignModal(false)
    setSelectedEmployee('')
  }

  const handleRelease = async (assignmentId, employeeName) => {
    if (window.confirm(`Release ${employeeName} from this job?`)) {
      await releaseEmployee(assignmentId, 'Manually released')
    }
  }

  const handleStartJob = async (jobId) => {
    await updateJobStatus(jobId, 'in_progress')
  }

  const handleCompleteJob = async (jobId) => {
    if (window.confirm('Mark this job as completed? This will remove it from live jobs.')) {
      await updateJobStatus(jobId, 'completed')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
      scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      assigned: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      on_hold: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    }
    return colors[status] || 'bg-slate-100 text-slate-700'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-slate-100 text-slate-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-amber-100 text-amber-600',
      urgent: 'bg-red-100 text-red-600',
      emergency: 'bg-red-200 text-red-700 animate-pulse',
    }
    return colors[priority] || ''
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
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Ops</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Live Jobs</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Radio className="w-8 h-8 text-emerald-600" />Live Jobs
            </h1>
            <span className="text-sm text-slate-500">{filteredJobs.length} active jobs</span>
          </div>
          <p className="text-slate-500 mb-8">Only open jobs are shown. Completed and cancelled jobs are excluded.</p>
        </motion.div>

        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job number, title, client, or city..."
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredJobs.map(job => (
              <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 dark:text-white">{job.job_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(job.status)}`}>{job.status?.replace('_', ' ')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(job.priority)}`}>{job.priority}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mt-1">{job.title}</h3>
                    <p className="text-sm text-slate-500">{job.clients?.company_name}</p>
                  </div>
                  <div className="flex gap-1">
                    {(job.status === 'scheduled' || job.status === 'assigned') && (
                      <button onClick={() => handleStartJob(job.id)} className="p-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200" title="Start Job"><Play className="w-4 h-4" /></button>
                    )}
                    {job.status === 'in_progress' && (
                      <button onClick={() => handleCompleteJob(job.id)} className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200" title="Complete Job"><CheckCircle2 className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => { setSelectedJob(job); setShowAssignModal(true) }} className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200" title="Assign Staff"><UserPlus className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className="flex items-center gap-1 text-slate-500"><MapPin className="w-3.5 h-3.5" />{job.site_city || 'N/A'}</div>
                  <div className="flex items-center gap-1 text-slate-500"><Clock className="w-3.5 h-3.5" />{job.scheduled_start_time?.slice(0,5) || 'N/A'}</div>
                  <div className="flex items-center gap-1 text-slate-500"><Briefcase className="w-3.5 h-3.5" />{job.cleaners_required || 1} needed</div>
                  <div className="flex items-center gap-1 text-slate-500"><Users className="w-3.5 h-3.5" />{job.field_job_assignments?.filter(a => a.assignment_status !== 'released').length || 0} assigned</div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h4 className="text-sm font-semibold text-slate-500 mb-2">Assigned Staff:</h4>
                  {job.field_job_assignments?.filter(a => a.assignment_status !== 'released').length > 0 ? (
                    <div className="space-y-2">
                      {job.field_job_assignments.filter(a => a.assignment_status !== 'released').map(assignment => (
                        <div key={assignment.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/30">
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-white">
                              {assignment.employees?.first_name} {assignment.employees?.last_name}
                            </p>
                            <p className="text-xs text-slate-500">{assignment.employees?.employee_code} · {assignment.assignment_status}</p>
                          </div>
                          <button onClick={() => handleRelease(assignment.id, `${assignment.employees?.first_name} ${assignment.employees?.last_name}`)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600" title="Release">
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No staff assigned yet</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filteredJobs.length === 0 && (
          <div className="text-center py-12 neu-raised rounded-3xl">
            <Radio className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No live jobs found</p>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showAssignModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="neu-raised rounded-3xl p-6 max-w-md w-full bg-white dark:bg-slate-800" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Assign Staff to {selectedJob?.job_number}</h3>
              <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full p-3 neu-inset rounded-xl mb-4 text-slate-700 dark:text-slate-300">
                <option value="">Select Employee</option>
                {availableEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.employee_code})</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button onClick={() => setShowAssignModal(false)} className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-slate-600 text-white">Cancel</button>
                <button onClick={handleAssign} disabled={!selectedEmployee} className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-emerald-600 text-white disabled:opacity-50">Assign</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
