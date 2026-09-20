import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useThemeStore from '../../../../store/themeStore'
import useAuthStore from '../../../../store/authStore'
import { supabase } from '../../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Search, AlertTriangle, ChevronRight, Sun, Moon, Sparkles, 
  Eye, User, CheckCircle2, UserCheck, Wrench, X, Loader2,
  Activity, Play, ClipboardCheck, Clock
} from 'lucide-react'

export default function MyIncidents() {
  const { isDark, toggleTheme } = useThemeStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('investigating')
  const [incidents, setIncidents] = useState([])
  const [capas, setCapas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [comment, setComment] = useState('')

  const userRole = profile?.role
  const isManager = ['super_admin', 'operations_manager', 'hr_manager'].includes(userRole)

  useEffect(() => { loadData() }, [activeTab, user?.id])

  const loadData = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (activeTab === 'investigating') {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .eq('investigator_id', user.id)
          .order('created_at', { ascending: false })
        if (error) throw error
        setIncidents(data || [])
      } else if (activeTab === 'reported') {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .eq('reported_by', user.id)
          .order('created_at', { ascending: false })
        if (error) throw error
        setIncidents(data || [])
      } else if (activeTab === 'capa') {
        let orClause = `assigned_to.eq.${user.id}`
        if (emp?.id) orClause += `,assigned_employee_id.eq.${emp.id}`
        
        const { data, error } = await supabase
          .from('corrective_actions')
          .select('*, incidents(incident_number, title, severity, id)')
          .or(orClause)
          .order('created_at', { ascending: false })
        if (error) throw error
        setCapas(data || [])
      }
    } catch (err) {
      console.error('Load error:', err)
      toast.error('Failed to load')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // ✅ ACTION: Change Incident Status
  // ============================================
  const handleStatusChange = async () => {
    if (!newStatus || !showStatusModal) { toast.error('Select status'); return }
    setSaving(true)
    try {
      const updates = { status: newStatus, updated_at: new Date().toISOString() }
      if (newStatus === 'under_investigation') updates.investigation_started_at = new Date().toISOString()
      if (newStatus === 'awaiting_approval') updates.investigation_completed_at = new Date().toISOString()

      const { error } = await supabase.from('incidents').update(updates).eq('id', showStatusModal.id)
      if (error) throw error

      await supabase.from('incident_audit_log').insert([{
        incident_id: showStatusModal.id,
        action_type: 'status_change',
        action_description: `Status changed to "${newStatus.replace(/_/g, ' ')}"${comment ? ': ' + comment : ''}`,
        performed_by: user?.id,
        performed_by_name: profile?.full_name || user?.email,
        performed_by_role: userRole
      }])

      toast.success('Status updated!')
      setShowStatusModal(null)
      setComment('')
      setNewStatus('')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // ✅ ACTION: Update CAPA status
  // ============================================
  const handleCapaStatus = async (capa, newStatus) => {
    setSaving(true)
    try {
      const updates = { status: newStatus, updated_at: new Date().toISOString() }
      if (newStatus === 'completed') {
        updates.completed_date = new Date().toISOString().split('T')[0]
        updates.progress_percentage = 100
      }
      if (newStatus === 'in_progress') {
        updates.progress_percentage = 50
      }

      const { error } = await supabase.from('corrective_actions').update(updates).eq('id', capa.id)
      if (error) throw error

      await supabase.from('incident_audit_log').insert([{
        incident_id: capa.incident_id,
        action_type: newStatus === 'completed' ? 'capa_completed' : 'capa_updated',
        action_description: `CAPA "${capa.title}" marked as ${newStatus.replace(/_/g, ' ')}`,
        performed_by: user?.id,
        performed_by_name: profile?.full_name || user?.email,
        performed_by_role: userRole
      }])

      toast.success(`Action marked as ${newStatus.replace(/_/g, ' ')}!`)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const getRiskColor = (r) => {
    const c = { green: 'bg-green-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500', red: 'bg-red-500', critical: 'bg-red-700' }
    return c[r] || 'bg-slate-400'
  }

  const getSeverityColor = (s) => {
    const c = { low: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' }
    return c[s] || 'bg-slate-100'
  }

  const getStatusColor = (s) => {
    if (!s) return 'bg-slate-100 text-slate-700'
    if (s.includes('closed') || s === 'completed') return 'bg-emerald-100 text-emerald-700'
    if (s.includes('investigation') || s === 'in_progress') return 'bg-purple-100 text-purple-700'
    if (s.includes('approval')) return 'bg-amber-100 text-amber-700'
    if (s === 'open') return 'bg-blue-100 text-blue-700'
    return 'bg-blue-100 text-blue-700'
  }

  const filteredIncidents = incidents.filter(i => {
    if (!search) return true
    const s = search.toLowerCase()
    return i.title?.toLowerCase().includes(s) ||
           i.incident_number?.toLowerCase().includes(s) ||
           i.site?.toLowerCase().includes(s)
  })

  const filteredCapas = capas.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    return c.title?.toLowerCase().includes(s) ||
           c.description?.toLowerCase().includes(s) ||
           c.incidents?.incident_number?.toLowerCase().includes(s)
  })

  const tabs = [
    { id: 'investigating', label: 'Investigating', icon: Search },
    { id: 'capa', label: 'My Actions', icon: Wrench },
    { id: 'reported', label: 'Reported', icon: User },
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
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops/incidents" className="text-slate-500 hover:text-emerald-600">Incidents</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">My Incidents</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <UserCheck className="w-8 h-8 text-emerald-600" />My Incidents
          </h1>
          <p className="text-slate-500 mt-1">Incidents assigned to you, actions you need to take</p>
        </motion.div>

        <div className="neu-raised rounded-2xl p-2 mb-6 flex gap-2 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[140px] py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === tab.id 
                  ? 'bg-emerald-600 text-white shadow-lg' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search..." 
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" 
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : activeTab === 'capa' ? (
          /* ============================================ */
          /* MY ACTIONS (CAPA) - with working buttons       */
          /* ============================================ */
          <div className="space-y-4">
            {filteredCapas.map(capa => (
              <motion.div 
                key={capa.id} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="neu-raised rounded-2xl p-5 border-l-4 border-orange-500"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${getStatusColor(capa.status)}`}>
                        {capa.status?.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${capa.priority === 'critical' ? 'bg-red-100 text-red-700' : capa.priority === 'high' ? 'bg-orange-100 text-orange-700' : capa.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {capa.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 capitalize">
                        {capa.action_type}
                      </span>
                      {capa.progress_percentage > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                          {capa.progress_percentage}%
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{capa.title}</h3>
                    {capa.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{capa.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                      {capa.incidents && (
                        <span className="text-purple-600 font-medium cursor-pointer hover:underline"
                          onClick={() => navigate(`/fieldops/incidents/${capa.incidents.id}`)}>
                          🔗 {capa.incidents.incident_number}
                        </span>
                      )}
                      <span>📅 Due: {capa.due_date ? new Date(capa.due_date).toLocaleDateString() : 'N/A'}</span>
                      {capa.incidents?.severity && (
                        <span className={`px-2 py-0.5 rounded-full ${getSeverityColor(capa.incidents.severity)}`}>
                          {capa.incidents.severity}
                        </span>
                      )}
                    </div>
                  </div>
                  <Wrench className="w-5 h-5 text-orange-500 flex-shrink-0" />
                </div>

                {/* ✅ ACTION BUTTONS FOR CAPA */}
                {capa.status !== 'completed' && capa.status !== 'cancelled' && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                    {capa.status === 'open' && (
                      <button
                        onClick={() => handleCapaStatus(capa, 'in_progress')}
                        disabled={saving}
                        className="neu-raised neu-btn px-4 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                      >
                        <Play className="w-4 h-4" /> Start Action
                      </button>
                    )}
                    {capa.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => handleCapaStatus(capa, 'completed')}
                          disabled={saving}
                          className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Mark Complete
                        </button>
                        <button
                          onClick={() => navigate(`/fieldops/incidents/${capa.incidents?.id}`)}
                          className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" /> View Incident
                        </button>
                      </>
                    )}
                    {capa.status !== 'in_progress' && capa.incidents?.id && (
                      <button
                        onClick={() => navigate(`/fieldops/incidents/${capa.incidents.id}`)}
                        className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" /> View Incident
                      </button>
                    )}
                  </div>
                )}
                {capa.status === 'completed' && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Completed on {capa.completed_date ? new Date(capa.completed_date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                )}
              </motion.div>
            ))}
            {filteredCapas.length === 0 && (
              <div className="text-center py-16 neu-raised rounded-3xl">
                <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No actions assigned to you</p>
                <p className="text-slate-400 text-sm mt-1">CAPAs assigned to you will appear here</p>
              </div>
            )}
          </div>
        ) : (
          /* ============================================ */
          /* INCIDENTS - with action buttons              */
          /* ============================================ */
          <div className="space-y-4">
            {filteredIncidents.map(inc => (
              <motion.div 
                key={inc.id} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="neu-raised rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <span className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${getRiskColor(inc.risk_level)}`}></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-slate-800 dark:text-white">{inc.incident_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getSeverityColor(inc.severity)}`}>{inc.severity}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(inc.status)}`}>{inc.status?.replace(/_/g, ' ')}</span>
                      </div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">{inc.title}</h3>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{inc.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                        <span>📅 {new Date(inc.incident_date).toLocaleDateString()}</span>
                        {inc.employee_name && <span>👤 {inc.employee_name}</span>}
                        {inc.site && <span>📍 {inc.site}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ ACTION BUTTONS FOR INCIDENT */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => navigate(`/fieldops/incidents/${inc.id}`)}
                    className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" /> View Details
                  </button>

                  {activeTab === 'investigating' && inc.status !== 'closed' && (
                    <>
                      <button
                        onClick={() => { setShowStatusModal(inc); setNewStatus(inc.status) }}
                        className="neu-raised neu-btn px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2 text-sm font-medium"
                      >
                        <Activity className="w-4 h-4" /> Update Status
                      </button>

                      {inc.status === 'assigned' && (
                        <button
                          onClick={async () => {
                            const { error } = await supabase.from('incidents').update({ 
                              status: 'under_investigation',
                              investigation_started_at: new Date().toISOString()
                            }).eq('id', inc.id)
                            if (error) { toast.error('Failed'); return }
                            await supabase.from('incident_audit_log').insert([{
                              incident_id: inc.id, action_type: 'investigation_started',
                              action_description: 'Investigation started',
                              performed_by: user?.id, performed_by_name: profile?.full_name || user?.email, performed_by_role: userRole
                            }])
                            toast.success('Investigation started!')
                            loadData()
                          }}
                          className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium"
                        >
                          <Play className="w-4 h-4" /> Start Investigation
                        </button>
                      )}

                      {inc.status === 'under_investigation' && (
                        <button
                          onClick={() => { setShowStatusModal(inc); setNewStatus('awaiting_approval') }}
                          className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm font-medium"
                        >
                          <ClipboardCheck className="w-4 h-4" /> Submit Findings
                        </button>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            ))}
            {filteredIncidents.length === 0 && (
              <div className="text-center py-16 neu-raised rounded-3xl">
                <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">
                  {activeTab === 'investigating' ? 'No incidents assigned to you' : 'You have not reported any incidents'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* STATUS CHANGE MODAL */}
      <AnimatePresence>
        {showStatusModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => !saving && setShowStatusModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Update Status</h3>
                <button onClick={() => setShowStatusModal(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3">{showStatusModal.incident_number}</p>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full p-3 neu-inset rounded-xl mb-3 text-sm text-slate-700 dark:text-slate-300">
                <option value="acknowledged">Acknowledged</option>
                <option value="under_review">Under Review</option>
                <option value="under_investigation">Under Investigation</option>
                <option value="awaiting_info">Awaiting Information</option>
                <option value="corrective_in_progress">Corrective Action In Progress</option>
                <option value="awaiting_approval">Awaiting Approval</option>
              </select>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Comment (optional)..." rows={3}
                className="w-full p-3 neu-inset rounded-xl mb-3 text-sm resize-none text-slate-700 dark:text-slate-300" />
              <div className="flex gap-2">
                <button onClick={() => setShowStatusModal(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 font-medium text-slate-700 dark:text-slate-300">
                  Cancel
                </button>
                <button onClick={handleStatusChange} disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Update
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
