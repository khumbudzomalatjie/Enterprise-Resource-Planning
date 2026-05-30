import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { 
  Briefcase, MapPin, Clock, ArrowLeft, CheckCircle2, 
  Calendar, Phone, Play, Pause, RefreshCw
} from 'lucide-react'

export default function MyJobs() {
  const { profile } = useAuthStore()
  const { myJobs, fetchMyJobs, jobTasks, fetchJobTasks, updateTaskItem } = useMobileStore()
  const navigate = useNavigate()
  const [selectedJob, setSelectedJob] = useState(null)
  const [updatingJob, setUpdatingJob] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { if (profile?.id) fetchMyJobs(profile.id) }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchMyJobs(profile.id)
    setRefreshing(false)
    toast.success('Refreshed!')
  }

  const handleJobClick = (job) => {
    setSelectedJob(job)
    fetchJobTasks(job.id)
  }

  const handleCompleteTask = async (taskId) => {
    await updateTaskItem(taskId, { is_completed: true, completed_at: new Date().toISOString() })
    toast.success('Task done!')
    if (selectedJob) fetchJobTasks(selectedJob.id)
  }

  const handleStartJob = async (jobId) => {
    setUpdatingJob(jobId)
    try { await supabase.from('jobs').update({ status: 'in_progress', actual_start_time: new Date().toISOString() }).eq('id', jobId); toast.success('Started!'); fetchMyJobs(profile.id) }
    catch { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  const handleCompleteJob = async (jobId) => {
    if (!window.confirm('Complete this job?')) return
    setUpdatingJob(jobId)
    try { await supabase.from('jobs').update({ status: 'completed', actual_end_time: new Date().toISOString() }).eq('id', jobId); toast.success('Completed! ✅'); setSelectedJob(null); fetchMyJobs(profile.id) }
    catch { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  const handlePauseJob = async (jobId) => {
    setUpdatingJob(jobId)
    try { await supabase.from('jobs').update({ status: 'on_hold' }).eq('id', jobId); toast.success('Paused'); fetchMyJobs(profile.id) }
    catch { toast.error('Failed') }
    finally { setUpdatingJob(null) }
  }

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }) : ''
  const activeJobs = (myJobs || []).filter(job => job.status !== 'completed')

  // Job Detail View
  if (selectedJob) {
    return (
      <div className="min-h-screen bg-slate-50 font-['Inter'] pb-20">
        <div className="bg-gradient-to-b from-blue-500 to-blue-600 px-5 pt-6 pb-6 text-white safe-area-top">
          <button onClick={() => setSelectedJob(null)} className="p-1.5 rounded-lg hover:bg-white/20 mb-3">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">{selectedJob.title}</h1>
          <p className="text-blue-100 text-xs">{selectedJob.job_number}</p>
        </div>

        <div className="px-5 -mt-3 space-y-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-slate-400" />{selectedJob.site_address}</div>
            <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-slate-400" />{selectedJob.scheduled_start_time?.slice(0,5)} - {selectedJob.scheduled_end_time?.slice(0,5)}</div>
            <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-slate-400" />{formatDate(selectedJob.scheduled_date)}</div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-2 text-sm">Status</h3>
            <div className="flex gap-2">
              {(selectedJob.status === 'scheduled' || selectedJob.status === 'pending') && (
                <button onClick={() => handleStartJob(selectedJob.id)} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Play className="w-4 h-4" />Start</button>
              )}
              {selectedJob.status === 'in_progress' && (
                <>
                  <button onClick={() => handleCompleteJob(selectedJob.id)} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" />Complete</button>
                  <button onClick={() => handlePauseJob(selectedJob.id)} className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Pause className="w-4 h-4" />Pause</button>
                </>
              )}
              {selectedJob.status === 'on_hold' && (
                <button onClick={() => handleStartJob(selectedJob.id)} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold text-sm"><Play className="w-4 h-4 inline mr-1" />Resume</button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-2 text-sm">Tasks</h3>
            {jobTasks.length > 0 ? (
              <div className="space-y-1.5">
                {jobTasks.map(task => (
                  <div key={task.id} className={`flex items-center justify-between p-2.5 rounded-xl ${task.is_completed ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${task.is_completed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                        {task.is_completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-xs ${task.is_completed ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>{task.description}</span>
                    </div>
                    {!task.is_completed && (
                      <button onClick={() => handleCompleteTask(task.id)} className="text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-full font-bold">Done</button>
                    )}
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-400 text-xs text-center py-4">No tasks</p>}
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  // Job List View
  return (
    <div className="min-h-screen bg-slate-50 font-['Inter'] pb-20">
      <div className="bg-gradient-to-b from-blue-500 to-blue-600 px-5 pt-6 pb-6 text-white safe-area-top">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">My Jobs</h1>
            <p className="text-blue-100 text-xs">{activeJobs.length} active</p>
          </div>
          <button onClick={handleRefresh} className="p-2 rounded-xl bg-white/20">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-5 -mt-3 pt-4 space-y-2.5">
        {activeJobs.length > 0 ? activeJobs.map((job, i) => (
          <motion.div key={job.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => handleJobClick(job)}
            className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:scale-[0.98] transition-all">
            <div className="flex justify-between items-start mb-1.5">
              <h3 className="font-semibold text-slate-800 text-sm flex-1">{job.title}</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ml-2 ${
                job.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
              }`}>{(job.status || 'pending').replace('_', ' ')}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="w-3 h-3" />{job.site_address?.slice(0, 30)}
              <span className="mx-1">·</span>
              <Clock className="w-3 h-3" />{job.scheduled_start_time?.slice(0,5)}
            </div>
          </motion.div>
        )) : (
          <div className="text-center py-16">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-500 font-semibold text-lg">All Done! 🎉</p>
            <p className="text-slate-400 text-sm">No active jobs right now.</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
