import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useIncidentStore from '../store/incidentStore'
import useThemeStore from '../../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  ChevronRight, Sun, Moon, Shield, Clock, MapPin, User, 
  AlertTriangle, Edit, Save, X, Search, CheckCircle2,
  ArrowRight, RotateCcw
} from 'lucide-react'

export default function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { 
    selectedIncident, fetchIncident, updateIncident, updateStatus,
    acknowledgeIncident, startInvestigation, submitForApproval,
    approveIncident, closeIncident, reopenIncident, approveByRole, loading 
  } = useIncidentStore()
  const { isDark, toggleTheme } = useThemeStore()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => { if (id) fetchIncident(id) }, [id])
  useEffect(() => { if (selectedIncident) setEditData({ ...selectedIncident }) }, [selectedIncident])

  const handleSave = async () => {
    if (!editData || !id) return
    setSaving(true)
    const cleanData = { ...editData }
    delete cleanData.corrective_actions; delete cleanData.incident_audit_log
    delete cleanData.clients; delete cleanData.jobs; delete cleanData.employees
    delete cleanData.created_at; delete cleanData.incident_number
    const result = await updateIncident(id, cleanData)
    if (result.success) { toast.success('Updated!'); setIsEditing(false); fetchIncident(id) }
    else toast.error(result.error || 'Failed')
    setSaving(false)
  }

  const handleAction = async (action, actionName) => {
    setActionLoading(actionName)
    await action(id)
    setActionLoading('')
    fetchIncident(id)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>
  if (!selectedIncident) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 text-lg">Incident not found</p></div></div>

  const inc = isEditing ? editData : selectedIncident
  const getRiskColor = (r) => ({ green: 'bg-green-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500', red: 'bg-red-500', critical: 'bg-red-700' })[r] || 'bg-slate-400'
  const getSeverityColor = (s) => ({ low: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' })[s] || 'bg-slate-100'
  const categories = ['safety','cleaning','security','vehicle','equipment','property_damage','client_complaint','environmental','medical','near_miss','fire','chemical_spill','theft','violence','harassment','other']

  // Determine available next status
  const canAcknowledge = ['reported', 'submitted'].includes(inc.status)
  const canInvestigate = ['acknowledged', 'assigned', 'under_review'].includes(inc.status)
  const canSubmitForApproval = inc.status === 'under_investigation'
  const canApprove = inc.status === 'awaiting_approval'
  const canClose = inc.status === 'approved'
  const canReopen = inc.status === 'closed'

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops/incidents" className="text-slate-500 hover:text-emerald-600">Incidents</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/fieldops/incidents/list" className="text-slate-500 hover:text-emerald-600">All</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">{selectedIncident.incident_number}</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded-full ${getRiskColor(inc.risk_level)}`}></span>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{selectedIncident.incident_number}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSeverityColor(inc.severity)}`}>{inc.severity?.toUpperCase()}</span>
                <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 capitalize">{inc.status?.replace(/_/g, ' ')}</span>
              </div>
              {isEditing ? <input type="text" value={editData?.title || ''} onChange={(e) => setEditData({...editData, title: e.target.value})} className="text-xl text-slate-600 dark:text-slate-400 mt-1 p-2 neu-inset rounded-xl w-full" /> : <h2 className="text-xl text-slate-600 dark:text-slate-400 mt-1">{inc.title}</h2>}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button onClick={handleSave} disabled={saving} className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"><Save className="w-5 h-5" />{saving ? 'Saving...' : 'Save'}</button>
                  <button onClick={() => { setEditData({ ...selectedIncident }); setIsEditing(false) }} className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-slate-600 text-white flex items-center gap-2"><X className="w-5 h-5" />Cancel</button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"><Edit className="w-5 h-5" />Edit</button>
              )}
            </div>
          </div>

          {/* AUTO-PROGRESSION WORKFLOW BAR */}
          <div className="neu-raised rounded-3xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2"><ArrowRight className="w-4 h-4 text-purple-600" />Status Progression</h3>
            <div className="flex flex-wrap items-center gap-2">
              {/* Step indicators */}
              {['reported', 'acknowledged', 'under_investigation', 'awaiting_approval', 'approved', 'closed'].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    inc.status === step ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500' :
                    ['reported','submitted'].includes(inc.status) && step === 'reported' ? 'bg-green-100 text-green-700' :
                    ['acknowledged','assigned','under_review'].includes(inc.status) && ['reported','acknowledged'].includes(step) ? 'bg-green-100 text-green-700' :
                    inc.status === 'under_investigation' && ['reported','acknowledged','under_investigation'].includes(step) ? 'bg-green-100 text-green-700' :
                    inc.status === 'awaiting_approval' && step !== 'closed' ? 'bg-green-100 text-green-700' :
                    inc.status === 'approved' ? 'bg-green-100 text-green-700' :
                    inc.status === 'closed' ? 'bg-green-100 text-green-700' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {step === 'reported' ? '📝 Reported' :
                     step === 'acknowledged' ? '👁 Acknowledged' :
                     step === 'under_investigation' ? '🔍 Investigating' :
                     step === 'awaiting_approval' ? '⏳ Awaiting Approval' :
                     step === 'approved' ? '✅ Approved' : '🔒 Closed'}
                  </span>
                  {i < 5 && <ArrowRight className="w-3 h-3 text-slate-400" />}
                </div>
              ))}
            </div>
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              {canAcknowledge && (
                <button onClick={() => handleAction(acknowledgeIncident, 'acknowledge')} disabled={actionLoading === 'acknowledge'}
                  className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading === 'acknowledge' ? '...' : '👁 Acknowledge'}
                </button>
              )}
              {canInvestigate && (
                <button onClick={() => handleAction(startInvestigation, 'investigate')} disabled={actionLoading === 'investigate'}
                  className="neu-raised neu-btn px-4 py-2 rounded-xl bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50">
                  {actionLoading === 'investigate' ? '...' : '🔍 Start Investigation'}
                </button>
              )}
              {canSubmitForApproval && (
                <button onClick={() => handleAction(submitForApproval, 'submit')} disabled={actionLoading === 'submit'}
                  className="neu-raised neu-btn px-4 py-2 rounded-xl bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-50">
                  {actionLoading === 'submit' ? '...' : '⏳ Submit for Approval'}
                </button>
              )}
              {canApprove && (
                <button onClick={() => handleAction(approveIncident, 'approve')} disabled={actionLoading === 'approve'}
                  className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50">
                  {actionLoading === 'approve' ? '...' : '✅ Approve'}
                </button>
              )}
              {canClose && (
                <button onClick={() => handleAction(closeIncident, 'close')} disabled={actionLoading === 'close'}
                  className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-700 text-white text-sm hover:bg-slate-800 disabled:opacity-50">
                  {actionLoading === 'close' ? '...' : '🔒 Close Incident'}
                </button>
              )}
              {canReopen && (
                <button onClick={() => handleAction(reopenIncident, 'reopen')} disabled={actionLoading === 'reopen'}
                  className="neu-raised neu-btn px-4 py-2 rounded-xl bg-orange-600 text-white text-sm hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1">
                  <RotateCcw className="w-4 h-4" /> Reopen
                </button>
              )}
            </div>
          </div>

          {/* APPROVAL BUTTONS */}
          <div className="neu-raised rounded-3xl p-4 mb-6">
            <h3 className="text-sm font-semibold text-slate-500 mb-3">Quick Approvals</h3>
            <div className="flex flex-wrap gap-2">
              {['supervisor', 'hse', 'ops_manager', 'hr', 'md'].map(role => {
                const fieldMap = { supervisor: 'supervisor_approved', hse: 'hse_approved', ops_manager: 'ops_manager_approved', hr: 'hr_approved', md: 'md_approved' }
                const isApproved = inc[fieldMap[role]]
                return (
                  <button key={role} onClick={() => !isApproved && approveByRole(id, role)} disabled={isApproved}
                    className={`neu-raised neu-btn px-4 py-2 rounded-xl text-sm ${isApproved ? 'bg-emerald-100 text-emerald-700 cursor-default' : 'bg-slate-600 text-white hover:bg-slate-700'}`}>
                    {isApproved ? '✅' : '⬜'} {role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Details Grid - Same as before */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" />Incident Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Category:</span>{isEditing ? <select value={editData?.incident_category || 'safety'} onChange={(e) => setEditData({...editData, incident_category: e.target.value})} className="p-2 neu-inset rounded-lg text-sm">{categories.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ').toUpperCase()}</option>)}</select> : <span className="capitalize">{inc.incident_category?.replace(/_/g, ' ')}</span>}</div>
                <div className="flex justify-between"><span className="text-slate-500">Date:</span>{isEditing ? <input type="date" value={editData?.incident_date || ''} onChange={(e) => setEditData({...editData, incident_date: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" /> : <span>{new Date(inc.incident_date).toLocaleDateString()} at {inc.incident_time?.slice(0,5)}</span>}</div>
                <div className="flex justify-between"><span className="text-slate-500">Severity:</span>{isEditing ? <select value={editData?.severity || 'medium'} onChange={(e) => setEditData({...editData, severity: e.target.value})} className="p-2 neu-inset rounded-lg text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select> : <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getSeverityColor(inc.severity)}`}>{inc.severity?.toUpperCase()}</span>}</div>
                <div className="flex justify-between"><span className="text-slate-500">Risk:</span><span className="font-bold">{inc.risk_score} ({inc.risk_level})</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Reported By:</span>{isEditing ? <input type="text" value={editData?.employee_name || ''} onChange={(e) => setEditData({...editData, employee_name: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" /> : <span>{inc.employee_name || 'N/A'}</span>}</div>
              </div>
            </div>
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" />Location</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Site:</span>{isEditing ? <input type="text" value={editData?.site || ''} onChange={(e) => setEditData({...editData, site: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" /> : <span>{inc.site || 'N/A'}</span>}</div>
                {inc.gps_latitude && <div className="flex justify-between"><span className="text-slate-500">GPS:</span><span className="text-xs">{inc.gps_latitude?.toFixed(6)}, {inc.gps_longitude?.toFixed(6)}</span></div>}
              </div>
            </div>
            <div className="neu-raised rounded-3xl p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Description</h3>
              {isEditing ? <textarea value={editData?.description || ''} onChange={(e) => setEditData({...editData, description: e.target.value})} rows={4} className="w-full p-4 neu-inset rounded-xl text-sm" /> : <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{inc.description}</p>}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
