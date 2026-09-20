import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useThemeStore from '../../../../store/themeStore'
import { supabase } from '../../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Search, ChevronRight, Sun, Moon, Sparkles, Eye, 
  Wrench, CheckCircle2, Clock, AlertTriangle, 
  User, Calendar, MessageSquare, Filter
} from 'lucide-react'

export default function AllCapas() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [capas, setCapas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, completed: 0, overdue: 0 })

  useEffect(() => { loadCapas() }, [statusFilter, typeFilter])

  const loadCapas = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('corrective_actions')
        .select('*, incidents(incident_number, title, severity, id), employees:assigned_employee_id(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(200)

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (typeFilter !== 'all') query = query.eq('action_type', typeFilter)

      const { data, error } = await query
      if (error) throw error
      setCapas(data || [])

      // Stats
      const today = new Date().toISOString().split('T')[0]
      const { data: allCapas } = await supabase.from('corrective_actions').select('status, due_date')
      if (allCapas) {
        setStats({
          total: allCapas.length,
          open: allCapas.filter(c => c.status === 'open').length,
          in_progress: allCapas.filter(c => c.status === 'in_progress').length,
          completed: allCapas.filter(c => c.status === 'completed').length,
          overdue: allCapas.filter(c => c.status !== 'completed' && c.due_date && c.due_date < today).length
        })
      }
    } catch (err) {
      console.error('Load error:', err)
      toast.error('Failed to load CAPAs')
    } finally {
      setLoading(false)
    }
  }

  const filteredCapas = capas.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    return c.title?.toLowerCase().includes(s) ||
           c.description?.toLowerCase().includes(s) ||
           c.incidents?.incident_number?.toLowerCase().includes(s)
  })

  const getStatusColor = (s) => {
    if (s === 'completed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    if (s === 'in_progress') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    if (s === 'overdue') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    if (s === 'cancelled') return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  }

  const isOverdue = (capa) => {
    if (capa.status === 'completed') return false
    const today = new Date().toISOString().split('T')[0]
    return capa.due_date && capa.due_date < today
  }

  const statCards = [
    { label: 'Total', value: stats.total, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800', filter: 'all' },
    { label: 'Open', value: stats.open, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', filter: 'open' },
    { label: 'In Progress', value: stats.in_progress, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', filter: 'in_progress' },
    { label: 'Completed', value: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', filter: 'completed' },
    { label: 'Overdue', value: stats.overdue, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', filter: 'overdue' },
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
          <span className="text-slate-800 dark:text-white font-medium">All CAPAs</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Wrench className="w-8 h-8 text-orange-600" />All Corrective & Preventive Actions
          </h1>
          <p className="text-slate-500 mt-1">Every CAPA across all incidents — track, filter and manage</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {statCards.map((s, i) => (
            <motion.button
              key={s.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
              onClick={() => setStatusFilter(s.filter === 'overdue' ? 'all' : s.filter)}
              className={`neu-raised rounded-2xl p-4 text-center hover:scale-105 transition-transform ${statusFilter === s.filter ? 'ring-2 ring-emerald-500' : ''}`}
            >
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                {s.label === 'Completed' ? <CheckCircle2 className={`w-5 h-5 ${s.color}`} /> :
                 s.label === 'Overdue' ? <AlertTriangle className={`w-5 h-5 ${s.color}`} /> :
                 s.label === 'In Progress' ? <Clock className={`w-5 h-5 ${s.color}`} /> :
                 <Wrench className={`w-5 h-5 ${s.color}`} />}
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </motion.button>
          ))}
        </div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, incident, or description..."
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Types</option>
            <option value="corrective">Corrective</option>
            <option value="preventive">Preventive</option>
          </select>
        </div>

        {/* CAPA List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCapas.map(capa => {
              const overdue = isOverdue(capa)
              return (
                <motion.div
                  key={capa.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className={`neu-raised rounded-2xl p-5 border-l-4 ${
                    capa.status === 'completed' ? 'border-l-emerald-500' :
                    overdue ? 'border-l-red-500' :
                    capa.status === 'in_progress' ? 'border-l-amber-500' :
                    'border-l-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${getStatusColor(capa.status)}`}>
                          {capa.status?.replace(/_/g, ' ')}
                        </span>
                        {overdue && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            ⚠️ OVERDUE
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          capa.priority === 'critical' ? 'bg-red-100 text-red-700' :
                          capa.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          capa.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
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
                      {capa.description && (
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{capa.description}</p>
                      )}

                      {capa.completion_notes && (
                        <div className="mt-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-700/30 border-l-2 border-blue-400">
                          <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line line-clamp-3">
                            💬 {capa.completion_notes}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                        {capa.incidents && (
                          <span
                            className="text-purple-600 font-medium cursor-pointer hover:underline"
                            onClick={() => navigate(`/fieldops/incidents/${capa.incidents.id}`)}
                          >
                            🔗 {capa.incidents.incident_number}
                          </span>
                        )}
                        {capa.employees && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {capa.employees.first_name} {capa.employees.last_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {capa.due_date ? new Date(capa.due_date).toLocaleDateString() : 'N/A'}
                        </span>
                        {capa.completed_date && (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Done: {new Date(capa.completed_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => capa.incidents?.id && navigate(`/fieldops/incidents/${capa.incidents.id}`)}
                      className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 flex-shrink-0"
                      title="View Incident"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
            {filteredCapas.length === 0 && (
              <div className="text-center py-16 neu-raised rounded-3xl">
                <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No CAPAs found</p>
                <p className="text-slate-400 text-sm mt-1">
                  {search || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'CAPAs created from incidents will appear here'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
