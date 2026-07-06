import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useIncidentStore from '../store/incidentStore'
import useThemeStore from '../../../../store/themeStore'
import { Search, Filter, AlertTriangle, ChevronRight, ArrowLeft, Sun, Moon, Sparkles, Eye } from 'lucide-react'

export default function IncidentList() {
  const { incidents, fetchIncidents, loading } = useIncidentStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')

  useEffect(() => {
    const filters = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    if (severityFilter !== 'all') filters.severity = severityFilter
    if (search) filters.search = search
    fetchIncidents(filters)
  }, [statusFilter, severityFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    const filters = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    if (severityFilter !== 'all') filters.severity = severityFilter
    if (search) filters.search = search
    fetchIncidents(filters)
  }

  const getSeverityColor = (s) => {
    const c = { low: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' }
    return c[s] || 'bg-slate-100'
  }

  const getRiskColor = (r) => {
    const c = { green: 'bg-green-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500', red: 'bg-red-500', critical: 'bg-red-700 animate-pulse' }
    return c[r] || 'bg-slate-400'
  }

  const getStatusColor = (s) => {
    if (!s) return 'bg-slate-100 text-slate-700'
    if (s.includes('closed')) return 'bg-emerald-100 text-emerald-700'
    if (s.includes('investigation')) return 'bg-purple-100 text-purple-700'
    if (s.includes('approval')) return 'bg-amber-100 text-amber-700'
    return 'bg-blue-100 text-blue-700'
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
          <Link to="/fieldops/incidents" className="text-slate-500 hover:text-emerald-600">Incidents</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">All Incidents</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />All Incidents
            </h1>
            <p className="text-slate-500 mt-1">{incidents.length} incidents found</p>
          </div>
          <button onClick={() => navigate('/fieldops/incidents/report')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-red-600 text-white hover:bg-red-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /><span>Report New</span>
          </button>
        </motion.div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by number, title, or description..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl">
              <option value="all">All Status</option>
              <option value="reported">Reported</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="awaiting_approval">Awaiting Approval</option>
              <option value="closed">Closed</option>
            </select>
            <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl">
              <option value="all">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <button type="submit" className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white">Search</button>
          </form>
        </div>

        {/* Incidents List */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : (
          <div className="space-y-4">
            {incidents.map(inc => (
              <motion.div key={inc.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/fieldops/incidents/${inc.id}`)}
                className="neu-raised rounded-2xl p-5 cursor-pointer hover:scale-[1.01] transition-transform">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <span className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${getRiskColor(inc.risk_level)}`}></span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-slate-800 dark:text-white">{inc.incident_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getSeverityColor(inc.severity)}`}>{inc.severity}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(inc.status)}`}>{inc.status?.replace(/_/g, ' ')}</span>
                        {inc.incident_category && <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 capitalize">{inc.incident_category.replace(/_/g, ' ')}</span>}
                      </div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">{inc.title}</h3>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{inc.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>📅 {new Date(inc.incident_date).toLocaleDateString()}</span>
                        {inc.employee_name && <span>👤 {inc.employee_name}</span>}
                        {inc.site && <span>📍 {inc.site}</span>}
                      </div>
                    </div>
                  </div>
                  <Eye className="w-5 h-5 text-slate-400 flex-shrink-0" />
                </div>
              </motion.div>
            ))}
            {incidents.length === 0 && (
              <div className="text-center py-12 neu-raised rounded-3xl">
                <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No incidents found</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
