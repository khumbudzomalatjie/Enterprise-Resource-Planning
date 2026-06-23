import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFieldOpsStore from '../store/fieldOpsStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  AlertTriangle, Plus, Search, Eye, Filter, ChevronRight,
  Sun, Moon, Sparkles, Shield, Clock
} from 'lucide-react'

export default function Incidents() {
  const { incidents, fetchIncidents, loading } = useFieldOpsStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')

  useEffect(() => {
    const filters = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    if (severityFilter !== 'all') filters.severity = severityFilter
    fetchIncidents(filters)
  }, [statusFilter, severityFilter])

  const filteredIncidents = incidents.filter(inc => {
    if (!search) return true
    return inc.title?.toLowerCase().includes(search.toLowerCase()) ||
           inc.incident_number?.toLowerCase().includes(search.toLowerCase()) ||
           inc.employees?.first_name?.toLowerCase().includes(search.toLowerCase())
  })

  const getSeverityColor = (severity) => {
    const colors = {
      low: 'bg-slate-100 text-slate-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-amber-100 text-amber-700',
      critical: 'bg-red-100 text-red-700',
      fatal: 'bg-red-200 text-red-800',
    }
    return colors[severity] || 'bg-slate-100'
  }

  const getStatusColor = (status) => {
    const colors = {
      reported: 'bg-amber-100 text-amber-700',
      under_investigation: 'bg-blue-100 text-blue-700',
      resolved: 'bg-emerald-100 text-emerald-700',
      closed: 'bg-slate-100 text-slate-600',
      escalated: 'bg-purple-100 text-purple-700',
    }
    return colors[status] || 'bg-slate-100'
  }

  const getTypeIcon = (type) => {
    const icons = {
      accident: '💥', injury: '🏥', property_damage: '🏚️', equipment_failure: '🔧',
      chemical_spill: '🧪', near_miss: '⚠️', security: '🔒', customer_complaint: '📢',
      vehicle_accident: '🚗', weather: '🌩️', theft: '🔫', other: '📋'
    }
    return icons[type] || '📋'
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
          <span className="text-slate-800 dark:text-white font-medium">Incidents</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />Incidents
            </h1>
            <p className="text-slate-500 mt-1">{incidents.length} incidents reported</p>
          </div>
          <button onClick={() => navigate('/fieldops/incidents/new')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-red-600 text-white hover:bg-red-700 flex items-center gap-2">
            <Plus className="w-5 h-5" /><span>Report Incident</span>
          </button>
        </motion.div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search incidents..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Status</option>
            <option value="reported">Reported</option>
            <option value="under_investigation">Under Investigation</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
            <option value="fatal">Fatal</option>
          </select>
        </div>

        {/* Incidents List */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : (
          <div className="space-y-4">
            {filteredIncidents.map(inc => (
              <motion.div key={inc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/fieldops/incidents/${inc.id}`)}
                className="neu-raised rounded-2xl p-5 cursor-pointer hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl">{getTypeIcon(inc.incident_type)}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-800 dark:text-white">{inc.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getSeverityColor(inc.severity)}`}>{inc.severity}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(inc.status)}`}>{inc.status?.replace('_', ' ')}</span>
                      </div>
                      <p className="text-sm text-slate-500 mb-2">{inc.incident_number} · {new Date(inc.incident_date).toLocaleDateString()}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{inc.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        {inc.employees && <span>👤 {inc.employees.first_name} {inc.employees.last_name}</span>}
                        {inc.jobs && <span>📋 {inc.jobs.job_number}</span>}
                        {inc.clients && <span>🏢 {inc.clients.company_name}</span>}
                      </div>
                    </div>
                  </div>
                  <button className="p-2 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filteredIncidents.length === 0 && (
          <div className="text-center py-12 neu-raised rounded-3xl">
            <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No incidents found</p>
            <button onClick={() => navigate('/fieldops/incidents/new')} className="mt-4 neu-raised neu-btn px-6 py-3 rounded-2xl bg-red-600 text-white">Report First Incident</button>
          </div>
        )}
      </main>
    </div>
  )
}
