import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useIncidentStore from '../store/incidentStore'
import useThemeStore from '../../../../store/themeStore'
import useAuthStore from '../../../../store/authStore'
import { supabase } from '../../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { ChevronRight, Sun, Moon, Shield, Clock, MapPin, User, AlertTriangle, Camera, X, CheckCircle2, UserPlus, Wrench, Briefcase, Loader2, Search, Activity, Download } from 'lucide-react'

export default function IncidentDetail() {
  const { id } = useParams()
  const { selectedIncident, fetchIncident, loading } = useIncidentStore()
  const { isDark, toggleTheme } = useThemeStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()

  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showCapaModal, setShowCapaModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState([])
  const [newStatus, setNewStatus] = useState('')
  const [comment, setComment] = useState('')
  const [investigatorId, setInvestigatorId] = useState('')
  const [capaForm, setCapaForm] = useState({ title: '', description: '', action_type: 'corrective', priority: 'medium', assigned_to: '', due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] })

  const userRole = profile?.role
  const isSuperAdmin = userRole === 'super_admin'
  const isManager = ['super_admin', 'operations_manager', 'hr_manager'].includes(userRole)
  const isHSE = ['super_admin', 'hr_manager'].includes(userRole)

  useEffect(() => {
    if (id) { fetchIncident(id); loadEmployees() }
  }, [id])

  const loadEmployees = async () => {
    const { data } = await supabase.from('employees').select('id, first_name, last_name, employee_code, user_id').eq('employment_status', 'active').order('first_name')
    setEmployees(data || [])
  }

  const refresh = async () => { await fetchIncident(id) }

  const handleStatusChange = async () => {
    if (!newStatus) { toast.error('Select a status'); return }
    setSaving(true)
    try {
      const updates = { status: newStatus, updated_at: new Date().toISOString() }
      if (newStatus === 'closed') updates.closed_at = new Date().toISOString()
      const { error } = await supabase.from('incidents').update(updates).eq('id', id)
      if (error) throw error
      await supabase.from('incident_audit_log').insert([{ incident_id: id, action_type: 'status_change', action_description: `Status changed to "${newStatus.replace(/_/g, ' ')}"`, performed_by: user?.id, performed_by_name: profile?.full_name || user?.email, performed_by_role: userRole }])
      toast.success('Status updated!')
      setShowStatusModal(false); setComment(''); setNewStatus('')
      refresh()
    } catch (err) { toast.error('Failed: ' + err.message) } finally { setSaving(false) }
  }

  const handleAssignInvestigator = async () => {
    if (!investigatorId) { toast.error('Select an investigator'); return }
    setSaving(true)
    try {
      const emp = employees.find(e => e.id === investigatorId)
      const { error } = await supabase.from('incidents').update({ investigator_id: emp?.user_id || null, investigation_started_at: new Date().toISOString(), status: 'under_investigation', updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      await supabase.from('incident_audit_log').insert([{ incident_id: id, action_type: 'assigned', action_description: `${emp?.first_name} ${emp?.last_name} assigned as investigator`, performed_by: user?.id, performed_by_name: profile?.full_name || user?.email, performed_by_role: userRole }])
      toast.success('Investigator assigned!')
      setShowAssignModal(false); setInvestigatorId('')
      refresh()
    } catch (err) { toast.error('Failed: ' + err.message) } finally { setSaving(false) }
  }

  const handleApproval = async (approvalType, approve) => {
    setSaving(true)
    try {
      const updates = { updated_at: new Date().toISOString() }
      const map = {
        supervisor: { approved: 'supervisor_approved', by: 'supervisor_id', at: 'supervisor_approved_at', comments: 'supervisor_comments' },
        hse: { approved: 'hse_approved', by: 'hse_id', at: 'hse_approved_at', comments: 'hse_comments' },
        ops: { approved: 'ops_manager_approved', by: 'ops_manager_id', at: 'ops_manager_approved_at', comments: 'ops_manager_comments' },
        hr: { approved: 'hr_approved', by: 'hr_id', at: 'hr_approved_at', comments: 'hr_comments' },
        md: { approved: 'md_approved', by: 'md_id', at: 'md_approved_at', comments: 'md_comments' }
      }
      const m = map[approvalType]
      if (!m) return
      updates[m.approved] = approve
      updates[m.by] = user?.id
      updates[m.at] = new Date().toISOString()
      updates[m.comments] = comment || (approve ? 'Approved' : 'Rejected')
      if (approve) updates.status = 'awaiting_approval'
      const { error } = await supabase.from('incidents').update(updates).eq('id', id)
      if (error) throw error
      await supabase.from('incident_audit_log').insert([{ incident_id: id, action_type: approve ? 'approved' : 'rejected', action_description: `${approvalType.toUpperCase()} ${approve ? 'approved' : 'rejected'}`, performed_by: user?.id, performed_by_name: profile?.full_name || user?.email, performed_by_role: userRole }])
      toast.success(`${approvalType.toUpperCase()} ${approve ? 'approved' : 'rejected'}!`)
      setShowApprovalModal(null); setComment('')
      refresh()
    } catch (err) { toast.error('Failed: ' + err.message) } finally { setSaving(false) }
  }

  const handleCreateCapa = async () => {
    if (!capaForm.title || !capaForm.due_date) { toast.error('Title and due date required'); return }
    setSaving(true)
    try {
      const emp = employees.find(e => e.id === capaForm.assigned_to)
      const { error } = await supabase.from('corrective_actions').insert([{ 
        incident_id: id, 
        title: capaForm.title, 
        description: capaForm.description, 
        action_type: capaForm.action_type, 
        priority: capaForm.priority, 
        assigned_employee_id: capaForm.assigned_to || null, 
        assigned_to: emp?.user_id || null, 
        due_date: capaForm.due_date, 
        status: 'open', 
        created_by: user?.id 
      }])
      if (error) throw error
      await supabase.from('incident_audit_log').insert([{ 
        incident_id: id, 
        action_type: 'corrective_action_created', 
        action_description: `${capaForm.action_type} action created: "${capaForm.title}"`, 
        performed_by: user?.id, 
        performed_by_name: profile?.full_name || user?.email, 
        performed_by_role: userRole 
      }])
      toast.success('Action created!')
      setShowCapaModal(false)
      setCapaForm({ title: '', description: '', action_type: 'corrective', priority: 'medium', assigned_to: '', due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] })
      refresh()
    } catch (err) { toast.error('Failed: ' + err.message) } finally { setSaving(false) }
  }

  const handleClose = async () => {
    if (!window.confirm('Mark this incident as CLOSED?')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('incidents').update({ status: 'closed', closed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      await supabase.from('incident_audit_log').insert([{ incident_id: id, action_type: 'closed', action_description: 'Incident closed', performed_by: user?.id, performed_by_name: profile?.full_name || user?.email, performed_by_role: userRole }])
      toast.success('Incident closed!')
      refresh()
    } catch (err) { toast.error('Failed: ' + err.message) } finally { setSaving(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>
  if (!selectedIncident) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">Incident not found</p></div>

  const inc = selectedIncident
  const allPhotos = [...(inc.before_photos || []), ...(inc.after_photos || []), ...(inc.photos || [])]
  const isClosed = inc.status === 'closed' || inc.status === 'cancelled'
  const getRiskColor = (r) => ({ green: 'bg-green-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500', red: 'bg-red-500', critical: 'bg-red-700' }[r] || 'bg-slate-400')

  // CAPA stats
  const capaList = inc.corrective_actions || []
  const openCount = capaList.filter(a => a.status === 'open').length
  const progressCount = capaList.filter(a => a.status === 'in_progress').length
  const completedCount = capaList.filter(a => a.status === 'completed').length

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30">
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops/incidents" className="text-slate-500 hover:text-emerald-600">Incidents</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/fieldops/incidents/list" className="text-slate-500 hover:text-emerald-600">All</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">{inc.incident_number}</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded-full ${getRiskColor(inc.risk_level)}`}></span>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{inc.incident_number}</h1>
              </div>
              <h2 className="text-xl text-slate-600 dark:text-slate-400 mt-1">{inc.title}</h2>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${inc.severity === 'critical' ? 'bg-red-100 text-red-700' : inc.severity === 'high' ? 'bg-orange-100 text-orange-700' : inc.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{inc.severity?.toUpperCase()}</span>
              <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 capitalize">{inc.status?.replace(/_/g, ' ')}</span>
            </div>
          </div>

          {!isClosed && (
            <div className="neu-raised rounded-3xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Available Actions</h3>
              <div className="flex flex-wrap gap-2">
                {isManager && <button onClick={() => { setNewStatus(inc.status); setShowStatusModal(true) }} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"><Activity className="w-4 h-4" /> Change Status</button>}
                {isManager && <button onClick={() => setShowAssignModal(true)} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2 text-sm font-medium"><UserPlus className="w-4 h-4" /> Assign Investigator</button>}
                {isManager && <button onClick={() => setShowCapaModal(true)} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-2 text-sm font-medium"><Wrench className="w-4 h-4" /> Add Action (CAPA)</button>}
                {isManager && !inc.supervisor_approved && <button onClick={() => setShowApprovalModal('supervisor')} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="w-4 h-4" /> Supervisor Approve</button>}
                {isHSE && !inc.hse_approved && <button onClick={() => setShowApprovalModal('hse')} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium"><Shield className="w-4 h-4" /> HSE Approve</button>}
                {isManager && !inc.ops_manager_approved && <button onClick={() => setShowApprovalModal('ops')} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium"><Briefcase className="w-4 h-4" /> Ops Manager Approve</button>}
                {isSuperAdmin && inc.severity === 'critical' && !inc.md_approved && <button onClick={() => setShowApprovalModal('md')} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 text-sm font-medium"><Shield className="w-4 h-4" /> MD Approve</button>}
                {isManager && <button onClick={handleClose} disabled={saving} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-slate-700 text-white hover:bg-slate-800 flex items-center gap-2 text-sm font-medium disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Close Incident</button>}
                <button onClick={() => navigate('/fieldops/incidents/tracker')} className="neu-raised neu-btn px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium"><Search className="w-4 h-4" /> Track Audit</button>
              </div>
            </div>
          )}

          {isClosed && (
            <div className="neu-raised rounded-3xl p-5 mb-6 bg-emerald-50 dark:bg-emerald-900/10 border-l-4 border-emerald-500">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">This incident is closed</p>
                  {inc.closed_at && <p className="text-xs text-emerald-600 dark:text-emerald-400">Closed on {new Date(inc.closed_at).toLocaleString()}</p>}
                </div>
              </div>
            </div>
          )}

          {allPhotos.length > 0 && (
            <div className="neu-raised rounded-3xl p-6 mb-6 border-l-4 border-indigo-500">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Camera className="w-5 h-5 text-indigo-600" />Photos ({allPhotos.length})</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {allPhotos.map((url, idx) => (
                  <div key={idx} onClick={() => setSelectedPhoto(url)} className="relative rounded-xl overflow-hidden cursor-pointer group bg-slate-200">
                    <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-32 object-cover group-hover:scale-110 transition-transform" loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ✅ CORRECTIVE ACTIONS - Show ALL (open, in-progress, completed) */}
          {capaList.length > 0 && (
            <div className="neu-raised rounded-3xl p-6 mb-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-orange-600" />
                  Corrective & Preventive Actions ({capaList.length})
                </h3>
                <div className="flex gap-2 text-xs flex-wrap">
                  {openCount > 0 && (
                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                      📋 {openCount} Open
                    </span>
                  )}
                  {progressCount > 0 && (
                    <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                      ⏳ {progressCount} In Progress
                    </span>
                  )}
                  {completedCount > 0 && (
                    <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      ✅ {completedCount} Completed
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {capaList.map(action => (
                  <div 
                    key={action.id} 
                    className={`p-4 rounded-xl border-l-4 ${
                      action.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-l-emerald-500' :
                      action.status === 'in_progress' ? 'bg-amber-50 dark:bg-amber-900/10 border-l-amber-500' :
                      'bg-slate-50 dark:bg-slate-700/30 border-l-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          action.status === 'completed' ? 'bg-emerald-500' :
                          action.status === 'in_progress' ? 'bg-amber-500' :
                          'bg-blue-500'
                        }`}>
                          {action.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : action.status === 'in_progress' ? (
                            <Clock className="w-4 h-4 text-white" />
                          ) : (
                            <Wrench className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800 dark:text-white">
                            {action.title}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">
                            {action.action_type} • {action.priority} priority
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize flex-shrink-0 ${
                        action.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        action.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {action.status?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {action.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 ml-12">
                        {action.description}
                      </p>
                    )}

                    {(action.progress_percentage > 0 || action.status === 'completed') && (
                      <div className="ml-12 mb-2">
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full">
                          <div 
                            className={`h-1.5 rounded-full transition-all ${
                              action.status === 'completed' ? 'bg-emerald-500' :
                              'bg-amber-500'
                            }`}
                            style={{ width: `${action.progress_percentage || (action.status === 'completed' ? 100 : 0)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {action.completion_notes && (
                      <div className="ml-12 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-2">
                        <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line">
                          💬 {action.completion_notes}
                        </p>
                      </div>
                    )}

                    <div className="ml-12 flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <span>📅 Due: {action.due_date ? new Date(action.due_date).toLocaleDateString() : 'N/A'}</span>
                      {action.completed_date && (
                        <span className="text-emerald-600 font-medium">
                          ✅ Completed: {new Date(action.completed_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" />Incident Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Category:</span><span className="capitalize">{inc.incident_category?.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Date:</span><span>{new Date(inc.incident_date).toLocaleDateString()} at {inc.incident_time?.slice(0, 5)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Risk Score:</span><span className="font-bold">{inc.risk_score} ({inc.risk_level})</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Reported By:</span><span>{inc.employee_name || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Department:</span><span>{inc.department || 'N/A'}</span></div>
                {inc.job_number && <div className="flex justify-between"><span className="text-slate-500">Job:</span><span className="text-purple-600 font-medium">{inc.job_number}</span></div>}
              </div>
            </div>
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" />Location</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Site:</span><span>{inc.site || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Address:</span><span>{inc.site_address || 'N/A'}</span></div>
                {inc.gps_latitude && <div className="flex justify-between"><span className="text-slate-500">GPS:</span><span className="text-xs">{inc.gps_latitude?.toFixed(6)}, {inc.gps_longitude?.toFixed(6)}</span></div>}
              </div>
            </div>
            <div className="neu-raised rounded-3xl p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Description</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{inc.description}</p>
            </div>
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-purple-600" />People</h3>
              <div className="space-y-3 text-sm">
                <div><span className="text-slate-500">Involved:</span><p>{inc.people_involved || 'None'}</p></div>
                <div><span className="text-slate-500">Witnesses:</span><p>{inc.witnesses || 'None'}</p></div>
              </div>
            </div>
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-pink-600" />Injuries</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">{inc.injury_reported ? '✅' : '❌'} Injury</div>
                <div className="flex items-center gap-2">{inc.medical_treatment ? '✅' : '❌'} Medical</div>
                <div className="flex items-center gap-2">{inc.hospital_visit ? '✅' : '❌'} Hospital</div>
                <div className="flex items-center gap-2">{inc.emergency_services ? '✅' : '❌'} Emergency Services</div>
              </div>
            </div>
            {inc.immediate_actions && (
              <div className="neu-raised rounded-3xl p-6 md:col-span-2">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-amber-600" />Immediate Actions</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{inc.immediate_actions}</p>
              </div>
            )}
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
              <img src={selectedPhoto} alt="Full size" className="w-full max-h-[75vh] object-contain rounded-2xl" />
              <div className="flex justify-center gap-3 mt-4">
                <a href={selectedPhoto} download target="_blank" rel="noopener noreferrer" className="px-5 py-3 bg-white text-slate-800 rounded-xl font-medium flex items-center gap-2"><Download className="w-4 h-4" /> Download</a>
                <button onClick={() => setSelectedPhoto(null)} className="px-5 py-3 bg-slate-700 text-white rounded-xl font-medium flex items-center gap-2"><X className="w-4 h-4" /> Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStatusModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowStatusModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Change Status</h3>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full p-3 neu-inset rounded-xl mb-3 text-sm text-slate-700 dark:text-slate-300">
                <option value="reported">Reported</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="assigned">Assigned</option>
                <option value="under_review">Under Review</option>
                <option value="under_investigation">Under Investigation</option>
                <option value="corrective_in_progress">Corrective In Progress</option>
                <option value="awaiting_approval">Awaiting Approval</option>
                <option value="approved">Approved</option>
              </select>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Comment..." rows={3} className="w-full p-3 neu-inset rounded-xl mb-3 text-sm resize-none text-slate-700 dark:text-slate-300" />
              <div className="flex gap-2">
                <button onClick={() => setShowStatusModal(false)} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 font-medium text-slate-700 dark:text-slate-300">Cancel</button>
                <button onClick={handleStatusChange} disabled={saving} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Update
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAssignModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowAssignModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Assign Investigator</h3>
              <select value={investigatorId} onChange={e => setInvestigatorId(e.target.value)} className="w-full p-3 neu-inset rounded-xl mb-4 text-sm text-slate-700 dark:text-slate-300">
                <option value="">Select Investigator</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={() => setShowAssignModal(false)} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 font-medium text-slate-700 dark:text-slate-300">Cancel</button>
                <button onClick={handleAssignInvestigator} disabled={saving} className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Assign
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCapaModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowCapaModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Add Action (CAPA)</h3>
              <div className="space-y-3">
                <input type="text" placeholder="Action title *" value={capaForm.title} onChange={e => setCapaForm({ ...capaForm, title: e.target.value })} className="w-full p-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300" />
                <textarea placeholder="Description" value={capaForm.description} onChange={e => setCapaForm({ ...capaForm, description: e.target.value })} rows={3} className="w-full p-3 neu-inset rounded-xl text-sm resize-none text-slate-700 dark:text-slate-300" />
                <select value={capaForm.action_type} onChange={e => setCapaForm({ ...capaForm, action_type: e.target.value })} className="w-full p-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300">
                  <option value="corrective">Corrective</option>
                  <option value="preventive">Preventive</option>
                </select>
                <select value={capaForm.priority} onChange={e => setCapaForm({ ...capaForm, priority: e.target.value })} className="w-full p-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300">
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical Priority</option>
                </select>
                <select value={capaForm.assigned_to} onChange={e => setCapaForm({ ...capaForm, assigned_to: e.target.value })} className="w-full p-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300">
                  <option value="">Assign To (optional)</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>)}
                </select>
                <input type="date" value={capaForm.due_date} onChange={e => setCapaForm({ ...capaForm, due_date: e.target.value })} className="w-full p-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300" />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowCapaModal(false)} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 font-medium text-slate-700 dark:text-slate-300">Cancel</button>
                <button onClick={handleCreateCapa} disabled={saving} className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />} Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showApprovalModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowApprovalModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white capitalize">{showApprovalModal} Approval</h3>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Comments..." rows={3} className="w-full p-3 neu-inset rounded-xl mb-4 text-sm resize-none text-slate-700 dark:text-slate-300" />
              <div className="flex gap-2">
                <button onClick={() => handleApproval(showApprovalModal, false)} disabled={saving} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium disabled:opacity-50">Reject</button>
                <button onClick={() => handleApproval(showApprovalModal, true)} disabled={saving} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
