import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  AlertCircle, ArrowLeft, Search, Filter, Eye, 
  CheckCircle2, XCircle, Clock, MapPin, User,
  Sun, Moon, Sparkles, ChevronRight
} from 'lucide-react'

export default function IncidentReports() {
  const { isDark, toggleTheme } = useThemeStore()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [selectedIncident, setSelectedIncident] = useState(null)

  useEffect(() => { loadIncidents() }, [statusFilter, severityFilter])

  const loadIncidents = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('incident_reports')
        .select('*, employees(first_name, last_name, employee_code, phone), jobs(title, job_number, site_address)')
        .order('incident_date', { ascending: false })
        .limit(50)

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (severityFilter !== 'all') query = query.eq('severity', severityFilter)

      const { data, error } = await query
      
      if (error) {
        console.error('Error loading incidents:', error)
        toast.error('Failed to load incidents')
      } else {
        console.log('Incidents loaded:', data?.length || 0)
        setIncidents(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const handleResolve = async (id) => {
    if (!window.confirm('Mark this incident as resolved?')) return
    try {
      await supabase.from('incident_reports').update({ 
        status: 'resolved',
        resolved_at: new Date().toISOString()
      }).eq('id', id)
      toast.success('Incident resolved!')
      loadIncidents()
    } catch (error) {
      toast.error('Failed to resolve incident')
    }
  }

  const handleClose = async (id) => {
    if (!window.confirm('Close this incident?')) return
    try {
      await supabase.from('incident_reports').update({ 
        status: 'closed'
      }).eq('id', id)
      toast.success('Incident closed!')
      loadIncidents()
    } catch (error) {
      toast.error('Failed to close incident')
    }
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', { 
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    }
    return colors[severity] || 'bg-slate-100 text-slate-600'
  }

  const getStatusColor = (status) => {
    const colors = {
      reported: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      investigating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      closed: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
    }
    return colors[status] || 'bg-slate-100 text-slate-600'
  }

  const filteredIncidents = incidents.filter(incident => {
    if (!search) return true
    const s = search.toLowerCase()
    return (incident.employees?.first_name || '').toLowerCase().includes(s) ||
           (incident.employees?.last_name || '').toLowerCase().includes(s) ||
           (incident.description || '').toLowerCase().includes(s) ||
           (incident.incident_type || '').toLowerCase().includes(s) ||
           (incident.jobs?.title || '').toLowerCase().includes(s)
  })

  const stats = {
    total: incidents.length,
    reported: incidents.filter(i => i.status === 'reported').length,
    investigating: incidents.filter(i => i.status === 'investigating').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    critical: incidents.filter(i => i.severity === 'critical').length
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
        <Link to="/mobile/field" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Field Operations</span>
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-600" />Incident Reports
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {incidents.length} incidents · {stats.reported} reported · {stats.critical} critical
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadIncidents} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700">
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-700' },
            { label: 'Reported', value: stats.reported, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
            { label: 'Investigating', value: stats.investigating, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
            { label: 'Resolved', value: stats.resolved, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { label: 'Critical', value: stats.critical, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by cleaner name, type, or description..." 
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" 
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-sm">
            <option value="all">All Status</option>
            <option value="reported">Reported</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-sm">
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Incidents List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading incidents...</p>
          </div>
        ) : filteredIncidents.length > 0 ? (
          <div className="space-y-4">
            {filteredIncidents.map(incident => (
              <motion.div key={incident.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="neu-raised rounded-2xl p-5 hover:shadow-lg transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      incident.severity === 'critical' ? 'bg-red-100' :
                      incident.severity === 'high' ? 'bg-orange-100' : 'bg-amber-100'
                    }`}>
                      <AlertCircle className={`w-5 h-5 ${
                        incident.severity === 'critical' ? 'text-red-600' :
                        incident.severity === 'high' ? 'text-orange-600' : 'text-amber-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-white capitalize">{incident.incident_type}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getSeverityColor(incident.severity)}`}>
                          {incident.severity}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(incident.status)}`}>
                          {incident.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Reported by: {incident.employees?.first_name} {incident.employees?.last_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {incident.status !== 'resolved' && incident.status !== 'closed' && (
                      <>
                        <button onClick={() => handleResolve(incident.id)}
                          className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Resolve
                        </button>
                        <button onClick={() => handleClose(incident.id)}
                          className="px-3 py-1.5 bg-slate-500 text-white rounded-lg text-xs font-medium hover:bg-slate-600">
                          Close
                        </button>
                      </>
                    )}
                    <button onClick={() => setSelectedIncident(selectedIncident?.id === incident.id ? null : incident)}
                      className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{incident.description?.slice(0, 200)}</p>

                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(incident.incident_date)}</span>
                  {incident.jobs?.job_number && (
                    <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />Job: {incident.jobs.job_number}</span>
                  )}
                  {incident.jobs?.site_address && (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{incident.jobs.site_address}</span>
                  )}
                  {incident.employees?.phone && (
                    <a href={`tel:${incident.employees.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                      <Phone className="w-3 h-3" /> Call Cleaner
                    </a>
                  )}
                </div>

                {/* Expanded Details */}
                {selectedIncident?.id === incident.id && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 space-y-2">
                    <p className="text-sm"><strong>Full Description:</strong> {incident.description}</p>
                    {incident.resolution_notes && (
                      <p className="text-sm"><strong>Resolution:</strong> {incident.resolution_notes}</p>
                    )}
                    {incident.photo_url && (
                      <img src={incident.photo_url} alt="Incident" className="rounded-xl max-h-48 object-cover" />
                    )}
                    <p className="text-xs text-slate-400">Incident ID: {incident.id}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="neu-raised rounded-3xl p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <p className="text-slate-500 text-lg mb-2">No incidents found</p>
            <p className="text-slate-400 text-sm">
              {search || statusFilter !== 'all' || severityFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'All clear! No incidents have been reported.'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

// Fix the missing imports
import { Briefcase, Phone } from 'lucide-react'
