import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFieldOpsStore from '../store/fieldOpsStore'
import useAuthStore from '../../../store/authStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Radio, Search, Users, UserPlus, UserX, MapPin, 
  Clock, Play, CheckCircle2, XCircle, ChevronRight,
  Sun, Moon, Sparkles, Building2, Calendar, Eye, 
  Wifi, WifiOff, RefreshCw, Camera
} from 'lucide-react'

export default function LiveJobs() {
  const { liveJobs, myAssignedJobs, fetchLiveJobs, fetchMyAssignedJobs, assignEmployee, releaseEmployee, updateJobStatus } = useFieldOpsStore()
  const { user, profile } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [search, setSearch] = useState('')
  const [filterView, setFilterView] = useState('all')
  const [sortBy, setSortBy] = useState('priority')
  const [selectedJob, setSelectedJob] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showJobDetail, setShowJobDetail] = useState(null)
  const [availableEmployees, setAvailableEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastSync, setLastSync] = useState(new Date())
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    const hO = () => { setIsOnline(true); loadAllData() }
    const hF = () => setIsOnline(false)
    window.addEventListener('online', hO); window.addEventListener('offline', hF)
    return () => { window.removeEventListener('online', hO); window.removeEventListener('offline', hF) }
  }, [])

  useEffect(() => {
    loadAllData(); fetchAvailableEmployees()
    const ch = supabase.channel('lj').on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => { loadAllData(); setLastSync(new Date()) }).on('postgres_changes', { event: '*', schema: 'public', table: 'field_job_assignments' }, () => { loadAllData(); setLastSync(new Date()) }).subscribe()
    const iv = setInterval(() => { loadAllData(); setLastSync(new Date()) }, 10000)
    return () => { supabase.removeChannel(ch); clearInterval(iv) }
  }, [])

  const loadAllData = async () => {
    try {
      const uid = profile?.id || user?.id
      await Promise.all([fetchLiveJobs(), uid ? fetchMyAssignedJobs(uid) : Promise.resolve()])
      setDataLoaded(true)
    } catch (e) { console.error(e) }
  }

  const fetchAvailableEmployees = async () => {
    const { data } = await supabase.from('employees').select('*').eq('employment_status', 'active').order('first_name')
    setAvailableEmployees(data || [])
  }

  const jobs = useCallback(() => {
    const a = [...(liveJobs || [])]
    const m = new Set((myAssignedJobs || []).map(x => x.job_id || x.jobs?.id))
    return a.map(j => ({ ...j, isMyJob: m.has(j.id), myAssignment: (myAssignedJobs || []).find(x => (x.job_id || x.jobs?.id) === j.id) }))
  }, [liveJobs, myAssignedJobs])()

  const filteredJobs = jobs.filter(j => {
    if (search) { const s = search.toLowerCase(); if (!j.job_number?.toLowerCase().includes(s) && !j.title?.toLowerCase().includes(s) && !j.clients?.company_name?.toLowerCase().includes(s) && !j.site_city?.toLowerCase().includes(s)) return false }
    switch (filterView) { case 'mine': return j.isMyJob; case 'unassigned': return (j.field_job_assignments?.filter(a => a.assignment_status !== 'released').length || 0) === 0; case 'in_progress': return j.status === 'in_progress'; default: return true }
  })

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const po = { emergency: 0, urgent: 1, high: 2, medium: 3, low: 4 }
    const so = { in_progress: 0, scheduled: 1, pending: 2 }
    switch (sortBy) { case 'priority': return (po[a.priority] || 5) - (po[b.priority] || 5); case 'date': return new Date(a.scheduled_date) - new Date(b.scheduled_date); case 'client': return (a.clients?.company_name || '').localeCompare(b.clients?.company_name || ''); case 'status': return (so[a.status] || 4) - (so[b.status] || 4); default: return 0 }
  })

  const handleAssign = async () => {
    if (!selectedJob || !selectedEmployee) { toast.error('Select employee'); return }
    const r = await assignEmployee(selectedJob.id, selectedEmployee)
    if (r.success) { toast.success('Assigned!'); setShowAssignModal(false); setSelectedEmployee(''); setSelectedJob(null); await loadAllData() }
    else toast.error(r.error || 'Failed')
  }

  const handleRelease = async (aid, name, jnum) => {
    if (!window.confirm(`Release ${name} from ${jnum}?`)) return
    const r = await releaseEmployee(aid, 'Released from Live Jobs')
    if (r.success) { toast.success(`${name} released`); await loadAllData() }
    else toast.error('Failed')
  }

  const handleStartJob = async (jid) => { const r = await updateJobStatus(jid, 'in_progress'); if (r.success) { toast.success('Started!'); await loadAllData() } }
  
  const handleCompleteJob = async (jid) => {
    if (!window.confirm('Mark as completed?')) return
    const job = jobs.find(j => j.id === jid)
    const aa = job?.field_job_assignments?.find(a => ['assigned', 'accepted', 'in_progress'].includes(a.assignment_status))
    const eid = aa?.employee_id || null
    const r = await updateJobStatus(jid, 'completed', eid)
    if (r.success) { toast.success('Completed!'); await loadAllData() }
    else toast.error(r.error || 'Failed')
  }

  const handleRefresh = () => { loadAllData(); setLastSync(new Date()); toast.success('Refreshed!') }

  const gsc = (s) => { const c = { pending: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', assigned: 'bg-purple-100 text-purple-700', in_progress: 'bg-amber-100 text-amber-700 animate-pulse', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' }; return c[s] || 'bg-slate-100 text-slate-700' }
  const gasc = (s) => { const c = { assigned: 'bg-blue-100 text-blue-700', accepted: 'bg-purple-100 text-purple-700', in_progress: 'bg-amber-100 text-amber-700 ring-2 ring-amber-500', completed: 'bg-emerald-100 text-emerald-700', released: 'bg-red-100 text-red-700' }; return c[s] || 'bg-slate-100 text-slate-700' }
  const gpc = (p) => { const c = { low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-600', high: 'bg-amber-100 text-amber-600', urgent: 'bg-red-100 text-red-700', emergency: 'bg-red-200 text-red-800 animate-pulse' }; return c[p] || '' }
  const gpi = (p) => { const i = { emergency: '🔴', urgent: '🟠', high: '🟡', medium: '🔵', low: '⚪' }; return i[p] || '⚪' }

  const mjc = jobs.filter(j => j.isMyJob).length
  const ipc = jobs.filter(j => j.status === 'in_progress').length
  const uac = jobs.filter(j => (j.field_job_assignments?.filter(a => a.assignment_status !== 'released').length || 0) === 0).length
  const hpc = jobs.filter(j => ['urgent', 'emergency', 'high'].includes(j.priority)).length

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-3 py-2 rounded-full flex items-center gap-2 text-xs">{isOnline ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-red-500" />}<span className="text-slate-500 hidden sm:inline">{isOnline ? 'Live' : 'Offline'} • {lastSync.toLocaleTimeString()}</span></div>
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /><span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span></div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">{isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}</button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm"><Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Ops</Link><ChevronRight className="w-4 h-4 text-slate-400" /><span className="text-slate-800 dark:text-white font-medium">Live Jobs</span></div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div><h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><Radio className="w-8 h-8 text-emerald-600" />Live Jobs</h1><p className="text-slate-500 mt-1">{jobs.length} total • {mjc} my jobs • {ipc} in progress{!dataLoaded && <span className="ml-2 text-amber-500">(Loading...)</span>}</p></div>
          <button onClick={handleRefresh} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2"><RefreshCw className="w-5 h-5" /><span>Refresh</span></button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[{ label: 'All Open', value: jobs.length, active: filterView === 'all', onClick: () => setFilterView('all'), color: 'bg-blue-500' },{ label: 'My Jobs', value: mjc, active: filterView === 'mine', onClick: () => setFilterView('mine'), color: 'bg-emerald-500' },{ label: 'Unassigned', value: uac, active: filterView === 'unassigned', onClick: () => setFilterView('unassigned'), color: 'bg-amber-500' },{ label: 'In Progress', value: ipc, active: filterView === 'in_progress', onClick: () => setFilterView('in_progress'), color: 'bg-purple-500' },{ label: 'High Priority', value: hpc, onClick: () => setSortBy('priority'), color: 'bg-red-500' }].map(s => (
            <button key={s.label} onClick={s.onClick} className={`neu-raised rounded-xl p-3 text-center transition-all hover:scale-105 ${s.active ? 'ring-2 ring-emerald-500' : ''}`}><div className={`w-3 h-3 rounded-full ${s.color} mx-auto mb-1`}></div><p className="text-2xl font-bold text-slate-800 dark:text-white">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></button>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" /></div><select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"><option value="priority">Priority</option><option value="date">Date</option><option value="client">Client</option><option value="status">Status</option></select></div>
        </motion.div>

        {!dataLoaded ? <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div><p className="text-slate-500">Loading...</p></div> :
        sortedJobs.length === 0 ? <div className="text-center py-12 neu-raised rounded-3xl"><Radio className="w-16 h-16 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 text-lg">No live jobs</p></div> :
        <div className="space-y-4">
          {sortedJobs.map(job => {
            const allA = (job.field_job_assignments || [])
            return (
              <motion.div key={job.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} layout className={`neu-raised rounded-2xl p-5 transition-all ${job.isMyJob ? 'border-l-4 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/5' : ''} ${job.status === 'in_progress' ? 'border-r-4 border-amber-500' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1"><span className="text-xl mt-1">{gpi(job.priority)}</span><div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-slate-800 dark:text-white text-lg">{job.job_number}</span><span className={`px-2 py-0.5 rounded-full text-xs ${gsc(job.status)}`}>{job.status?.replace('_', ' ')}</span><span className={`px-2 py-0.5 rounded-full text-xs ${gpc(job.priority)}`}>{job.priority}</span>{job.isMyJob && <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">🔒 My Job</span>}{job.job_categories && <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: (job.job_categories.color || '#10b981') + '20', color: job.job_categories.color || '#10b981' }}>{job.job_categories.name}</span>}</div><h3 className="text-lg font-semibold text-slate-800 dark:text-white mt-1">{job.title}</h3><div className="flex items-center gap-4 mt-2 text-sm text-slate-500 flex-wrap">{job.clients && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{job.clients.company_name}</span>}<span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.site_city || 'N/A'}</span><span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(job.scheduled_date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}</span><span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{job.scheduled_start_time?.slice(0, 5) || 'N/A'}</span></div></div></div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(job.status === 'scheduled' || job.status === 'pending') && <button onClick={() => handleStartJob(job.id)} className="p-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200"><Play className="w-4 h-4" /></button>}
                    {job.status === 'in_progress' && <button onClick={() => handleCompleteJob(job.id)} className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200"><CheckCircle2 className="w-4 h-4" /></button>}
                    <button onClick={() => { setSelectedJob(job); setShowAssignModal(true) }} className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"><UserPlus className="w-4 h-4" /></button>
                    <button onClick={() => setShowJobDetail(showJobDetail === job.id ? null : job.id)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><Eye className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-semibold text-slate-500 flex items-center gap-2"><Users className="w-4 h-4" />Staff ({allA.length}/{job.cleaners_required || 1})</h4></div>
                  {allA.length > 0 ? <div className="flex flex-wrap gap-2">{allA.map(a => { const sc = gasc(a.assignment_status); const ia = ['assigned', 'accepted', 'in_progress'].includes(a.assignment_status); return (<div key={a.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${sc}`}><div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-xs font-bold">{a.employees?.first_name?.[0] || '?'}{a.employees?.last_name?.[0] || '?'}</div><span className="font-medium">{a.employees?.first_name || '?'} {a.employees?.last_name || ''}</span><span className="text-xs opacity-75">({a.assignment_status})</span>{ia && <button onClick={() => handleRelease(a.id, `${a.employees?.first_name || '?'} ${a.employees?.last_name || ''}`, job.job_number)} className="ml-1 p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200"><XCircle className="w-4 h-4" /></button>}</div>)})}</div> : <p className="text-sm text-slate-400 italic">No staff assigned</p>}
                </div>

                <AnimatePresence>
                  {showJobDetail === job.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm"><div><p className="text-xs text-slate-500">Cleaners</p><p className="font-medium">{job.cleaners_required}</p></div><div><p className="text-xs text-slate-500">Duration</p><p className="font-medium">{job.estimated_duration_minutes || 'N/A'} min</p></div><div><p className="text-xs text-slate-500">Amount</p><p className="font-medium text-emerald-600">{new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(job.quoted_amount || 0)}</p></div><div><p className="text-xs text-slate-500">Contact</p><p className="font-medium">{job.site_contact_name || 'N/A'}</p></div></div>
                      {job.job_photos && job.job_photos.length > 0 && (
                        <div className="mt-3"><p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Camera className="w-3 h-3" /> Job Photos ({job.job_photos.length})</p><div className="grid grid-cols-3 gap-2">{job.job_photos.map(p => (<a key={p.id} href={p.photo_url} target="_blank" rel="noopener noreferrer" className="block"><img src={p.photo_url} alt={p.photo_type || 'photo'} className="w-full h-24 object-cover rounded-lg hover:opacity-80 border border-slate-200" /><span className="text-[10px] text-slate-500 capitalize mt-1 block text-center">{p.photo_type || 'photo'}</span></a>))}</div></div>
                      )}
                      <button onClick={() => navigate(`/fieldops/job-tracker`)} className="mt-3 text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"><Search className="w-3 h-3" /> Track Job Audit</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>}
      </main>

      <AnimatePresence>
        {showAssignModal && selectedJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowAssignModal(false); setSelectedEmployee('') }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="neu-raised rounded-3xl p-6 max-w-md w-full bg-white dark:bg-slate-800" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Assign Staff</h3><p className="text-sm text-slate-500 mb-4">Job: <span className="font-medium">{selectedJob.job_number}</span> - {selectedJob.title}</p>
              <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="w-full p-3 neu-inset rounded-xl mb-4 text-slate-700 dark:text-slate-300"><option value="">Select Employee</option>{availableEmployees.map(e => (<option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>))}</select>
              <div className="flex gap-2"><button onClick={() => { setShowAssignModal(false); setSelectedEmployee('') }} className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-slate-600 text-white">Cancel</button><button onClick={handleAssign} disabled={!selectedEmployee} className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-emerald-600 text-white disabled:opacity-50">Assign</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
