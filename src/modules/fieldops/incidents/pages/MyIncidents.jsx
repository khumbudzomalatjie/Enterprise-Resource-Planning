import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useThemeStore from '../../../../store/themeStore'
import useAuthStore from '../../../../store/authStore'
import { supabase } from '../../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Search, AlertTriangle, ChevronRight, Sun, Moon, Sparkles, 
  Eye, Camera, User, Clock, CheckCircle2, UserCheck, Wrench
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

  useEffect(() => { loadData() }, [activeTab, user?.id])

  const loadData = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      // Get employee record
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (activeTab === 'investigating') {
        // Incidents where I am the investigator
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .eq('investigator_id', user.id)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        setIncidents(data || [])
      } else if (activeTab === 'reported') {
        // Incidents I reported
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .eq('reported_by', user.id)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        setIncidents(data || [])
      } else if (activeTab === 'capa') {
        // CAPAs assigned to me
        const { data, error } = await supabase
          .from('corrective_actions')
          .select('*, incidents(incident_number, title, severity)')
          .or(`assigned_to.eq.${user.id}${emp?.id ? `,assigned_employee_id.eq.${emp.id}` : ''}`)
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
    { id: 'investigating', label: 'Investigating', icon: Search, count: activeTab === 'investigating' ? incidents.length : null },
    { id: 'capa', label: 'My Actions', icon: Wrench, count: activeTab === 'capa' ? capas.length : null },
    { id: 'reported', label: 'Reported', icon: User, count: activeTab === 'reported' ? incidents.length : null },
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

        {/* Tabs */}
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

        {/* Search */}
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

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : activeTab === 'capa' ? (
          <div className="space-y-4">
            {filteredCapas.map(capa => (
              <motion.div 
                key={capa.id} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                onClick={() => capa.incident_id && navigate(`/fieldops/incidents/${capa.incident_id}`)}
                className="neu-raised rounded-2xl p-5 cursor-pointer hover:scale-[1.01] transition-transform border-l-4 border-orange-500"
              >
                <div className="flex items-start justify-between gap-4">
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
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{capa.title}</h3>
                    {capa.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{capa.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                      {capa.incidents && (
                        <span className="text-purple-600 font-medium">
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
          <div className="space-y-4">
            {filteredIncidents.map(inc => (
              <motion.div 
                key={inc.id} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/fieldops/incidents/${inc.id}`)}
                className="neu-raised rounded-2xl p-5 cursor-pointer hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-start justify-between gap-4">
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
                  <Eye className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                </div>
              </motion.div>
            ))}
            {filteredIncidents.length === 0 && (
              <div className="text-center py-16 neu-raised rounded-3xl">
                <AlertTriangle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">
                  {activeTab === 'investigating' ? 'No incidents assigned to you' : 'You haven\'t reported any incidents'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
