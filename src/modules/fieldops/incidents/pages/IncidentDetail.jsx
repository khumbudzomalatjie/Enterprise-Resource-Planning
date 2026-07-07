import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useIncidentStore from '../store/incidentStore'
import useThemeStore from '../../../../store/themeStore'
import useAuthStore from '../../../../store/authStore'
import toast from 'react-hot-toast'
import { 
  ArrowLeft, ChevronRight, Sun, Moon, Sparkles, Shield, Clock, MapPin, User, 
  AlertTriangle, CheckCircle2, XCircle, Edit, Save, Search, Eye, 
  Wrench, ClipboardCheck, Send, History, Play, Pause, RotateCcw, Lock
} from 'lucide-react'

export default function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { selectedIncident, fetchIncident, updateIncident, updateStatus, createCorrectiveAction, loading } = useIncidentStore()
  const { user, profile } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState('')
  const [actionComment, setActionComment] = useState('')
  const [showCAPAModal, setShowCAPAModal] = useState(false)
  const [capaData, setCapaData] = useState({
    title: '', description: '', action_type: 'corrective', priority: 'medium',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    department: ''
  })

  useEffect(() => {
    if (id) fetchIncident(id)
  }, [id])

  useEffect(() => {
    if (selectedIncident) setEditData({ ...selectedIncident })
  }, [selectedIncident])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!selectedIncident) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">Incident not found</p>
          <button onClick={() => navigate('/fieldops/incidents')} className="mt-4 text-emerald-600 hover:underline">Back to Incidents</button>
        </div>
      </div>
    )
  }

  const inc = selectedIncident
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'operations_manager'
  const canEdit = !inc.is_locked || isAdmin
  const canApprove = isAdmin || profile?.role === 'supervisor' || profile?.role === 'hr_manager'

  // ============================================
  // ACTION HANDLERS
  // ============================================
  const handleStatusChange = async (newStatus) => {
    const result = await updateStatus(inc.id, newStatus)
    if (result.success) {
      toast.success(`Status changed to ${newStatus.replace(/_/g, ' ')}`)
      setShowActionModal(false)
      setActionComment('')
      fetchIncident(id)
    }
  }

  const handleSave = async () => {
    if (!editData) return
    const result = await updateIncident(inc.id, editData)
    if (result.success) {
      toast.success('Incident updated!')
      setIsEditing(false)
      fetchIncident(id)
    }
  }

  const handleApprove = async (role) => {
    const updates = {}
    const now = new Date().toISOString()
    if (role === 'supervisor') { updates.supervisor_approved = true; updates.supervisor_id = user?.id; updates.supervisor_approved_at = now; updates.supervisor_comments = actionComment }
    if (role === 'hse') { updates.hse_approved = true; updates.hse_id = user?.id; updates.hse_approved_at = now; updates.hse_comments = actionComment }
    if (role === 'ops_manager') { updates.ops_manager_approved = true; updates.ops_manager_id = user?.id; updates.ops_manager_approved_at = now; updates.ops_manager_comments = actionComment }
    if (role === 'hr') { updates.hr_approved = true; updates.hr_id = user?.id; updates.hr_approved_at = now; updates.hr_comments = actionComment }
    if (role === 'md') { updates.md_approved = true; updates.md_id = user?.id; updates.md_approved_at = now; updates.md_comments = actionComment }
    
    const result = await updateIncident(inc.id, updates)
    if (result.success) {
      toast.success(`${role.replace(/_/g, ' ')} approved!`)
      setShowActionModal(false)
      setActionComment('')
      fetchIncident(id)
    }
  }

  const handleAssignInvestigator = async () => {
    if (!actionComment) { toast.error('Please enter investigator name'); return }
    const result = await updateIncident(inc.id, { 
      investigator_id: user?.id, 
      investigation_started_at: new Date().toISOString(),
      status: 'under_investigation'
    })
    if (result.success) {
      toast.success('Investigation started!')
      setShowActionModal(false)
      setActionComment('')
      fetchIncident(id)
    }
  }

  const handleSaveInvestigation = async () => {
    const result = await updateIncident(inc.id, {
      investigation_findings: actionComment,
      investigation_completed_at: new Date().toISOString(),
      status: 'awaiting_approval'
    })
    if (result.success) {
      toast.success('Investigation findings saved!')
      setShowActionModal(false)
      setActionComment('')
      fetchIncident(id)
    }
  }

  const handleCreateCAPA = async () => {
    if (!capaData.title) { toast.error('Title is required'); return }
    const result = await createCorrectiveAction({ ...capaData, incident_id: inc.id })
    if (result.success) {
      toast.success('Action created!')
      setShowCAPAModal(false)
      setCapaData({ title: '', description: '', action_type: 'corrective', priority: 'medium', due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], department: '' })
      fetchIncident(id)
    }
  }

  const getRiskColor = (r) => {
    const c = { green: 'bg-green-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500', red: 'bg-red-500', critical: 'bg-red-700 animate-pulse' }
    return c[r] || 'bg-slate-400'
  }

  const getSeverityColor = (s) => {
    const c = { low: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' }
    return c[s] || 'bg-slate-100'
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatDateTime = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops/incidents" className="text-slate-500 hover:text-emerald-600">Incidents</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/fieldops/incidents/list" className="text-slate-500 hover:text-emerald-600">All</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">{inc.incident_number}</span>
        </div>

        {/* HEADER WITH ACTIONS */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className={`w-4 h-4 rounded-full ${getRiskColor(inc.risk_level)}`}></span>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">{inc.incident_number}</h1>
                <p className="text-slate-500">{inc.title}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSeverityColor(inc.severity)}`}>{inc.severity?.toUpperCase()}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${inc.risk_level === 'critical' || inc.risk_level === 'red' ? 'bg-red-100 text-red-700' : inc.risk_level === 'orange' ? 'bg-orange-100 text-orange-700' : inc.risk_level === 'yellow' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                Risk: {inc.risk_level?.toUpperCase()} ({inc.risk_score})
              </span>
              <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 capitalize">{inc.status?.replace(/_/g, ' ')}</span>
              {inc.is_locked && <Lock className="w-5 h-5 text-slate-400" />}
            </div>
          </div>

          {/* ACTION BUTTONS ROW */}
          <div className="flex flex-wrap gap-2 mb-6">
            {!inc.is_locked && (
              <button onClick={() => setIsEditing(!isEditing)} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm">
                <Edit className="w-4 h-4" /> {isEditing ? 'Cancel Edit' : 'Edit'}
              </button>
            )}
            {isEditing && (
              <button onClick={handleSave} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm">
                <Save className="w-4 h-4" /> Save Changes
              </button>
            )}
            
            {/* Status Actions */}
            {inc.status !== 'under_investigation' && inc.status !== 'closed' && (
              <button onClick={() => { setActionType('investigate'); setShowActionModal(true) }} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2 text-sm">
                <Search className="w-4 h-4" /> Investigate
              </button>
            )}
            {inc.status === 'under_investigation' && (
              <button onClick={() => { setActionType('findings'); setActionComment(inc.investigation_findings || ''); setShowActionModal(true) }} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2 text-sm">
                <ClipboardCheck className="w-4 h-4" /> Save Findings
              </button>
            )}
            
            {/* Approvals */}
            {canApprove && !inc.supervisor_approved && (
              <button onClick={() => { setActionType('approve_supervisor'); setShowActionModal(true) }} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Supervisor Approve
              </button>
            )}
            {canApprove && inc.supervisor_approved && !inc.hse_approved && (
              <button onClick={() => { setActionType('approve_hse'); setShowActionModal(true) }} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4" /> HSE Approve
              </button>
            )}
            {canApprove && inc.hse_approved && !inc.ops_manager_approved && (
              <button onClick={() => { setActionType('approve_ops'); setShowActionModal(true) }} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Ops Manager Approve
              </button>
            )}
            
            {/* Close/Reopen */}
            {inc.status !== 'closed' && (
              <button onClick={() => handleStatusChange('closed')} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2 text-sm">
                <XCircle className="w-4 h-4" /> Close
              </button>
            )}
            {inc.status === 'closed' && (
              <button onClick={() => handleStatusChange('reopened')} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-2 text-sm">
                <RotateCcw className="w-4 h-4" /> Reopen
              </button>
            )}
            
            {/* Add CAPA */}
            <button onClick={() => setShowCAPAModal(true)} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-2 text-sm">
              <Wrench className="w-4 h-4" /> Add Action
            </button>
            
            {/* Track */}
            <button onClick={() => navigate('/fieldops/incidents/tracker')} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2 text-sm">
              <History className="w-4 h-4" /> Track
            </button>
          </div>
        </motion.div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Incident Info */}
          <div className="neu-raised rounded-3xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" />Incident Info</h3>
            <div className="space-y-3 text-sm">
              {isEditing ? (
                <>
                  <div><label className="text-xs text-slate-500">Category</label>
                    <select value={editData?.incident_category} onChange={e => setEditData({...editData, incident_category: e.target.value})} className="w-full p-2 neu-inset rounded-lg mt-1">
                      {['safety','cleaning','security','vehicle','equipment','property_damage','client_complaint','environmental','medical','near_miss','fire','chemical_spill','theft','violence','harassment','other'].map(c => <option key={c} value={c}>{c.replace(/_/g,' ').toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-slate-500">Severity</label>
                    <select value={editData?.severity} onChange={e => setEditData({...editData, severity: e.target.value})} className="w-full p-2 neu-inset rounded-lg mt-1">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                  <div><label className="text-xs text-slate-500">Title</label><input type="text" value={editData?.title} onChange={e => setEditData({...editData, title: e.target.value})} className="w-full p-2 neu-inset rounded-lg mt-1" /></div>
                </>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-slate-500">Category:</span><span className="capitalize">{inc.incident_category?.replace(/_/g, ' ')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Date:</span><span>{formatDate(inc.incident_date)} at {inc.incident_time?.slice(0,5)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Risk Score:</span><span className="font-bold">{inc.risk_score} ({inc.risk_level})</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Reported By:</span><span>{inc.employee_name || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Department:</span><span>{inc.department || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">SLA Due:</span><span className={new Date(inc.sla_due_date) < new Date() ? 'text-red-600 font-semibold' : ''}>{formatDateTime(inc.sla_due_date)}</span></div>
                </>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="neu-raised rounded-3xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" />Location</h3>
            {isEditing ? (
              <div className="space-y-3">
                <input type="text" value={editData?.site} onChange={e => setEditData({...editData, site: e.target.value})} placeholder="Site" className="w-full p-2 neu-inset rounded-lg" />
                <input type="text" value={editData?.site_address} onChange={e => setEditData({...editData, site_address: e.target.value})} placeholder="Address" className="w-full p-2 neu-inset rounded-lg" />
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Site:</span><span>{inc.site || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Address:</span><span>{inc.site_address || 'N/A'}</span></div>
                {inc.gps_latitude && <div className="flex justify-between"><span className="text-slate-500">GPS:</span><span>{inc.gps_latitude?.toFixed(6)}, {inc.gps_longitude?.toFixed(6)}</span></div>}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="neu-raised rounded-3xl p-6 md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Description</h3>
            {isEditing ? (
              <textarea value={editData?.description} onChange={e => setEditData({...editData, description: e.target.value})} rows={5} className="w-full p-3 neu-inset rounded-xl text-sm" />
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{inc.description}</p>
            )}
          </div>

          {/* People & Injuries */}
          <div className="neu-raised rounded-3xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-purple-600" />People</h3>
            {isEditing ? (
              <div className="space-y-3">
                <input type="text" value={editData?.people_involved} onChange={e => setEditData({...editData, people_involved: e.target.value})} placeholder="People Involved" className="w-full p-2 neu-inset rounded-lg" />
                <input type="text" value={editData?.witnesses} onChange={e => setEditData({...editData, witnesses: e.target.value})} placeholder="Witnesses" className="w-full p-2 neu-inset rounded-lg" />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div><span className="text-slate-500">Involved:</span> {inc.people_involved || 'None listed'}</div>
                <div><span className="text-slate-500">Witnesses:</span> {inc.witnesses || 'None listed'}</div>
              </div>
            )}
          </div>

          {/* Injuries & Damage */}
          <div className="neu-raised rounded-3xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-pink-600" />Injuries & Damage</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">{inc.injury_reported ? '✅' : '❌'} Injury Reported</div>
              <div className="flex items-center gap-2">{inc.medical_treatment ? '✅' : '❌'} Medical Treatment</div>
              <div className="flex items-center gap-2">{inc.hospital_visit ? '✅' : '❌'} Hospital Visit</div>
              <div className="flex items-center gap-2">{inc.emergency_services ? '✅' : '❌'} Emergency Services</div>
              {inc.equipment_involved && <div><span className="text-slate-500">Equipment:</span> {inc.equipment_involved}</div>}
              {inc.vehicle_involved && <div><span className="text-slate-500">Vehicle:</span> {inc.vehicle_involved}</div>}
              <div><span className="text-slate-500">Est. Cost:</span> R {inc.estimated_cost?.toLocaleString() || '0'}</div>
            </div>
          </div>

          {/* Immediate Actions */}
          {inc.immediate_actions && (
            <div className="neu-raised rounded-3xl p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-amber-600" />Immediate Actions</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{inc.immediate_actions}</p>
            </div>
          )}

          {/* Investigation Findings */}
          {inc.investigation_findings && (
            <div className="neu-raised rounded-3xl p-6 md:col-span-2 border-l-4 border-purple-500">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-purple-600" />Investigation Findings</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{inc.investigation_findings}</p>
              {inc.root_causes && inc.root_causes.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-slate-500 mb-2">Root Causes:</p>
                  <div className="flex flex-wrap gap-2">
                    {inc.root_causes.map((cause, i) => (
                      <span key={i} className="px-3 py-1 rounded-full text-xs bg-red-100 text-red-700 capitalize">{cause.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Corrective Actions */}
          <div className="neu-raised rounded-3xl p-6 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Wrench className="w-5 h-5 text-orange-600" />Corrective Actions</h3>
              <button onClick={() => setShowCAPAModal(true)} className="text-sm text-orange-600 hover:text-orange-700 font-semibold">+ Add Action</button>
            </div>
            {(inc.corrective_actions || []).length > 0 ? (
              <div className="space-y-3">
                {(inc.corrective_actions || []).map(action => (
                  <div key={action.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${action.status === 'completed' ? 'bg-emerald-500' : action.status === 'in_progress' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                      <div>
                        <p className="font-medium text-sm">{action.title}</p>
                        <p className="text-xs text-slate-500 capitalize">{action.action_type} • {action.priority} • Due: {formatDate(action.due_date)}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${action.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : action.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{action.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No corrective actions yet</p>
            )}
          </div>

          {/* Approval Status */}
          <div className="neu-raised rounded-3xl p-6 md:col-span-2">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-emerald-600" />Approval Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Supervisor', approved: inc.supervisor_approved, date: inc.supervisor_approved_at, comments: inc.supervisor_comments },
                { label: 'HSE Officer', approved: inc.hse_approved, date: inc.hse_approved_at, comments: inc.hse_comments },
                { label: 'Ops Manager', approved: inc.ops_manager_approved, date: inc.ops_manager_approved_at, comments: inc.ops_manager_comments },
                { label: 'HR', approved: inc.hr_approved, date: inc.hr_approved_at, comments: inc.hr_comments },
                { label: 'MD', approved: inc.md_approved, date: inc.md_approved_at, comments: inc.md_comments },
              ].map(approval => (
                <div key={approval.label} className={`p-3 rounded-xl text-center ${approval.approved ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-slate-50 dark:bg-slate-700/30'}`}>
                  <p className="text-xs text-slate-500 mb-1">{approval.label}</p>
                  {approval.approved ? <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" /> : <Clock className="w-6 h-6 text-slate-400 mx-auto" />}
                  <p className="text-xs mt-1 font-medium">{approval.approved ? 'Approved' : 'Pending'}</p>
                  {approval.date && <p className="text-xs text-slate-400 mt-1">{formatDate(approval.date)}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ACTION MODAL */}
      <AnimatePresence>
        {showActionModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowActionModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="neu-raised rounded-3xl p-6 max-w-md w-full bg-white dark:bg-slate-800"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 capitalize">
                {actionType.replace(/_/g, ' ')}
              </h3>
              <textarea
                value={actionComment}
                onChange={e => setActionComment(e.target.value)}
                placeholder={actionType === 'investigate' ? 'Assign investigator or add notes...' : actionType === 'findings' ? 'Enter investigation findings...' : 'Add comments...'}
                rows={4}
                className="w-full p-3 neu-inset rounded-xl mb-4 text-sm"
              />
              <div className="flex gap-2">
                <button onClick={() => { setShowActionModal(false); setActionComment('') }}
                  className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-slate-600 text-white">Cancel</button>
                {actionType === 'investigate' && (
                  <button onClick={handleAssignInvestigator} className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-purple-600 text-white">Start Investigation</button>
                )}
                {actionType === 'findings' && (
                  <button onClick={handleSaveInvestigation} className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-purple-600 text-white">Save Findings</button>
                )}
                {actionType.startsWith('approve_') && (
                  <button onClick={() => handleApprove(actionType.replace('approve_', ''))} className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-emerald-600 text-white">Approve</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CAPA MODAL */}
      <AnimatePresence>
        {showCAPAModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCAPAModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="neu-raised rounded-3xl p-6 max-w-md w-full bg-white dark:bg-slate-800"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Add Corrective Action</h3>
              <div className="space-y-3">
                <input type="text" value={capaData.title} onChange={e => setCapaData({...capaData, title: e.target.value})} placeholder="Action Title *" className="w-full p-3 neu-inset rounded-xl" />
                <textarea value={capaData.description} onChange={e => setCapaData({...capaData, description: e.target.value})} placeholder="Description" rows={3} className="w-full p-3 neu-inset rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={capaData.action_type} onChange={e => setCapaData({...capaData, action_type: e.target.value})} className="p-3 neu-inset rounded-xl">
                    <option value="corrective">Corrective</option><option value="preventive">Preventive</option>
                  </select>
                  <select value={capaData.priority} onChange={e => setCapaData({...capaData, priority: e.target.value})} className="p-3 neu-inset rounded-xl">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                  </select>
                </div>
                <input type="date" value={capaData.due_date} onChange={e => setCapaData({...capaData, due_date: e.target.value})} className="w-full p-3 neu-inset rounded-xl" />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowCAPAModal(false)} className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-slate-600 text-white">Cancel</button>
                <button onClick={handleCreateCAPA} className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-orange-600 text-white">Create Action</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
