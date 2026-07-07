import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useIncidentStore from '../store/incidentStore'
import useThemeStore from '../../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  ArrowLeft, ChevronRight, Sun, Moon, Sparkles, Shield, 
  Clock, MapPin, User, AlertTriangle, Edit, Save, X, 
  CheckCircle2, Wrench, History, Building2, Phone, Mail,
  Briefcase, Calendar, Camera
} from 'lucide-react'

export default function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { selectedIncident, fetchIncident, updateIncident, updateStatus, loading } = useIncidentStore()
  const { isDark, toggleTheme } = useThemeStore()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id) fetchIncident(id)
  }, [id])

  useEffect(() => {
    if (selectedIncident) {
      setEditData({ ...selectedIncident })
    }
  }, [selectedIncident])

  const handleSave = async () => {
    if (!editData) return
    setSaving(true)
    
    const result = await updateIncident(id, editData)
    if (result.success) {
      toast.success('Incident updated successfully!')
      setIsEditing(false)
      fetchIncident(id)
    } else {
      toast.error(result.error || 'Failed to update incident')
    }
    setSaving(false)
  }

  const handleCancel = () => {
    setEditData({ ...selectedIncident })
    setIsEditing(false)
  }

  const handleStatusChange = async (newStatus) => {
    const result = await updateStatus(id, newStatus)
    if (result.success) {
      toast.success(`Status changed to ${newStatus.replace(/_/g, ' ')}`)
      fetchIncident(id)
    }
  }

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
          <button onClick={() => navigate('/fieldops/incidents/list')} className="mt-4 neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white">
            Go to Incidents List
          </button>
        </div>
      </div>
    )
  }

  const inc = isEditing ? editData : selectedIncident

  const getRiskColor = (r) => {
    const c = { green: 'bg-green-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500', red: 'bg-red-500', critical: 'bg-red-700' }
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

  const categories = ['safety','cleaning','security','vehicle','equipment','property_damage','client_complaint','environmental','medical','near_miss','fire','chemical_spill','theft','violence','harassment','other']

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops/incidents" className="text-slate-500 hover:text-emerald-600">Incidents</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/fieldops/incidents/list" className="text-slate-500 hover:text-emerald-600">All</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">{selectedIncident.incident_number}</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header with Edit/Save buttons */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded-full ${getRiskColor(inc.risk_level)}`}></span>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{selectedIncident.incident_number}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSeverityColor(inc.severity)}`}>
                  {inc.severity?.toUpperCase()}
                </span>
                <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 capitalize">
                  {inc.status?.replace(/_/g, ' ')}
                </span>
              </div>
              {isEditing ? (
                <input 
                  type="text" 
                  value={editData?.title || ''} 
                  onChange={(e) => setEditData({...editData, title: e.target.value})}
                  className="text-xl text-slate-600 dark:text-slate-400 mt-1 p-2 neu-inset rounded-xl w-full"
                />
              ) : (
                <h2 className="text-xl text-slate-600 dark:text-slate-400 mt-1">{inc.title}</h2>
              )}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button onClick={handleSave} disabled={saving}
                    className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={handleCancel}
                    className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2">
                    <X className="w-5 h-5" /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditing(true)}
                    className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
                    <Edit className="w-5 h-5" /> Edit
                  </button>
                  {/* Status change buttons */}
                  <select 
                    onChange={(e) => { if (e.target.value) handleStatusChange(e.target.value) }}
                    className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 cursor-pointer"
                    value=""
                  >
                    <option value="">Change Status</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="under_investigation">Under Investigation</option>
                    <option value="awaiting_approval">Awaiting Approval</option>
                    <option value="approved">Approved</option>
                    <option value="closed">Closed</option>
                    <option value="reopened">Reopened</option>
                  </select>
                </>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Incident Info */}
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" />Incident Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  {isEditing ? (
                    <select value={editData?.incident_category || 'safety'} onChange={(e) => setEditData({...editData, incident_category: e.target.value})} className="p-2 neu-inset rounded-lg text-sm">
                      {categories.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ').toUpperCase()}</option>)}
                    </select>
                  ) : (
                    <span className="capitalize">{inc.incident_category?.replace(/_/g, ' ')}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  {isEditing ? (
                    <input type="date" value={editData?.incident_date || ''} onChange={(e) => setEditData({...editData, incident_date: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" />
                  ) : (
                    <span>{new Date(inc.incident_date).toLocaleDateString()} at {inc.incident_time?.slice(0,5)}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Severity:</span>
                  {isEditing ? (
                    <select value={editData?.severity || 'medium'} onChange={(e) => setEditData({...editData, severity: e.target.value})} className="p-2 neu-inset rounded-lg text-sm">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getSeverityColor(inc.severity)}`}>{inc.severity?.toUpperCase()}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Likelihood:</span>
                  {isEditing ? (
                    <select value={editData?.likelihood || 'possible'} onChange={(e) => setEditData({...editData, likelihood: e.target.value})} className="p-2 neu-inset rounded-lg text-sm">
                      <option value="rare">Rare</option><option value="possible">Possible</option><option value="likely">Likely</option><option value="almost_certain">Almost Certain</option>
                    </select>
                  ) : (
                    <span className="capitalize">{inc.likelihood?.replace(/_/g, ' ')}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Risk Score:</span>
                  <span className="font-bold">{inc.risk_score} ({inc.risk_level})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reported By:</span>
                  {isEditing ? (
                    <input type="text" value={editData?.employee_name || ''} onChange={(e) => setEditData({...editData, employee_name: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" />
                  ) : (
                    <span>{inc.employee_name || 'N/A'}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department:</span>
                  {isEditing ? (
                    <input type="text" value={editData?.department || ''} onChange={(e) => setEditData({...editData, department: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" />
                  ) : (
                    <span>{inc.department || 'N/A'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600" />Location</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Site:</span>
                  {isEditing ? (
                    <input type="text" value={editData?.site || ''} onChange={(e) => setEditData({...editData, site: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" />
                  ) : (
                    <span>{inc.site || 'N/A'}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Address:</span>
                  {isEditing ? (
                    <input type="text" value={editData?.site_address || ''} onChange={(e) => setEditData({...editData, site_address: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" />
                  ) : (
                    <span>{inc.site_address || 'N/A'}</span>
                  )}
                </div>
                {inc.gps_latitude && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">GPS:</span>
                    <span className="text-xs">{inc.gps_latitude?.toFixed(6)}, {inc.gps_longitude?.toFixed(6)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="neu-raised rounded-3xl p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Description</h3>
              {isEditing ? (
                <textarea value={editData?.description || ''} onChange={(e) => setEditData({...editData, description: e.target.value})} rows={5} className="w-full p-4 neu-inset rounded-xl text-sm" />
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{inc.description}</p>
              )}
            </div>

            {/* People */}
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-purple-600" />People</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-500">Involved:</span>
                  {isEditing ? (
                    <input type="text" value={editData?.people_involved || ''} onChange={(e) => setEditData({...editData, people_involved: e.target.value})} className="w-full p-2 neu-inset rounded-lg mt-1" />
                  ) : (
                    <p>{inc.people_involved || 'None listed'}</p>
                  )}
                </div>
                <div>
                  <span className="text-slate-500">Witnesses:</span>
                  {isEditing ? (
                    <input type="text" value={editData?.witnesses || ''} onChange={(e) => setEditData({...editData, witnesses: e.target.value})} className="w-full p-2 neu-inset rounded-lg mt-1" />
                  ) : (
                    <p>{inc.witnesses || 'None listed'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Injuries & Damage */}
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-pink-600" />Injuries & Damage</h3>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editData?.injury_reported || false} onChange={(e) => isEditing && setEditData({...editData, injury_reported: e.target.checked})} className="w-4 h-4" disabled={!isEditing} />
                  Injury Reported
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editData?.medical_treatment || false} onChange={(e) => isEditing && setEditData({...editData, medical_treatment: e.target.checked})} className="w-4 h-4" disabled={!isEditing} />
                  Medical Treatment
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editData?.hospital_visit || false} onChange={(e) => isEditing && setEditData({...editData, hospital_visit: e.target.checked})} className="w-4 h-4" disabled={!isEditing} />
                  Hospital Visit
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={editData?.emergency_services || false} onChange={(e) => isEditing && setEditData({...editData, emergency_services: e.target.checked})} className="w-4 h-4" disabled={!isEditing} />
                  Emergency Services Called
                </label>
                {inc.injury_reported && (
                  <div>
                    <span className="text-slate-500">Injury Details:</span>
                    {isEditing ? (
                      <textarea value={editData?.injury_details || ''} onChange={(e) => setEditData({...editData, injury_details: e.target.value})} rows={2} className="w-full p-2 neu-inset rounded-lg mt-1 text-sm" />
                    ) : (
                      <p className="text-sm mt-1">{inc.injury_details || 'None'}</p>
                    )}
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Equipment:</span>
                  {isEditing ? (
                    <input type="text" value={editData?.equipment_involved || ''} onChange={(e) => setEditData({...editData, equipment_involved: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" />
                  ) : (
                    <span>{inc.equipment_involved || 'N/A'}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vehicle:</span>
                  {isEditing ? (
                    <input type="text" value={editData?.vehicle_involved || ''} onChange={(e) => setEditData({...editData, vehicle_involved: e.target.value})} className="p-2 neu-inset rounded-lg text-sm" />
                  ) : (
                    <span>{inc.vehicle_involved || 'N/A'}</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Est. Cost:</span>
                  {isEditing ? (
                    <input type="number" value={editData?.estimated_cost || 0} onChange={(e) => setEditData({...editData, estimated_cost: parseFloat(e.target.value) || 0})} className="p-2 neu-inset rounded-lg text-sm w-32" />
                  ) : (
                    <span>R {inc.estimated_cost?.toLocaleString() || '0'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Immediate Actions */}
            <div className="neu-raised rounded-3xl p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-amber-600" />Immediate Actions</h3>
              {isEditing ? (
                <textarea value={editData?.immediate_actions || ''} onChange={(e) => setEditData({...editData, immediate_actions: e.target.value})} rows={3} className="w-full p-4 neu-inset rounded-xl text-sm" />
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{inc.immediate_actions || 'None recorded'}</p>
              )}
            </div>

            {/* Investigation Findings */}
            <div className="neu-raised rounded-3xl p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-purple-600" />Investigation Findings</h3>
              {isEditing ? (
                <textarea value={editData?.investigation_findings || ''} onChange={(e) => setEditData({...editData, investigation_findings: e.target.value})} rows={4} className="w-full p-4 neu-inset rounded-xl text-sm" />
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{inc.investigation_findings || 'No findings recorded yet'}</p>
              )}
              {inc.root_causes && inc.root_causes.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-slate-500">Root Causes:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {inc.root_causes.map((cause, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 capitalize">{cause.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="neu-raised rounded-3xl p-6 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Additional Notes</h3>
              {isEditing ? (
                <textarea value={editData?.notes || ''} onChange={(e) => setEditData({...editData, notes: e.target.value})} rows={3} className="w-full p-4 neu-inset rounded-xl text-sm" />
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{inc.notes || 'No additional notes'}</p>
              )}
            </div>
          </div>

          {/* Bottom Actions */}
          {isEditing && (
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={handleCancel}
                className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2">
                <X className="w-5 h-5" /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="neu-raised neu-btn px-8 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 text-lg font-semibold">
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

// Fix missing Search import
import { Search } from 'lucide-react'
