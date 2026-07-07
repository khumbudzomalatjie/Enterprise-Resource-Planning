import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useIncidentStore from '../store/incidentStore'
import useThemeStore from '../../../../store/themeStore'
import { 
  AlertTriangle, Shield, Activity, Clock, CheckCircle2,
  Flame, Siren, Heart, Car, Wrench, Building2, UserX,
  TreePine, Eye, FileText, Search, History,
  Sun, Moon, Sparkles, ChevronRight, ArrowLeft,
  BarChart3, PieChart, Plus, List
} from 'lucide-react'

export default function IncidentDashboard() {
  const { stats, fetchStats, loading } = useIncidentStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => { fetchStats() }, [])

  const mainStats = [
    { icon: AlertTriangle, label: 'Total Incidents', value: stats.total || 0, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },
    { icon: Activity, label: 'Open', value: stats.open || 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: Search, label: 'Investigating', value: stats.investigating || 0, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: Clock, label: 'Awaiting Approval', value: stats.awaitingApproval || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { icon: CheckCircle2, label: 'Closed', value: stats.closed || 0, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: Flame, label: 'High Risk', value: stats.highRisk || 0, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { icon: Siren, label: 'Critical', value: stats.critical || 0, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { icon: Heart, label: 'Injuries', value: stats.injuries || 0, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  ]

  const categoryStats = [
    { icon: Car, label: 'Vehicle', value: stats.vehicle || 0 },
    { icon: Wrench, label: 'Equipment', value: stats.equipment || 0 },
    { icon: Building2, label: 'Property', value: stats.propertyDamage || 0 },
    { icon: UserX, label: 'Complaints', value: stats.clientComplaints || 0 },
    { icon: TreePine, label: 'Environmental', value: stats.environmental || 0 },
    { icon: Eye, label: 'Near Miss', value: stats.nearMiss || 0 },
  ]

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      {/* Top Right Bar */}
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
        {/* Breadcrumb */}
        <Link to="/fieldops" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Field Ops</span>
        </Link>

        {/* Header with Action Buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-red-600" />
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Incident Management</h1>
              </div>
              <p className="text-slate-500 dark:text-slate-400 ml-11">Enterprise incident reporting, investigation & resolution</p>
            </div>
            
            {/* ============================================ */}
            {/* ACTION BUTTONS - VISIBLE AND PROMINENT */}
            {/* ============================================ */}
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => navigate('/fieldops/incidents/report')} 
                className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 font-semibold shadow-lg">
                <Plus className="w-5 h-5" /><span>Report Incident</span>
              </button>
              <button 
                onClick={() => navigate('/fieldops/incidents/tracker')} 
                className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2 font-semibold shadow-lg">
                <History className="w-5 h-5" /><span>Track Incident</span>
              </button>
              <button 
                onClick={() => navigate('/fieldops/incidents/list')} 
                className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2 font-semibold">
                <List className="w-5 h-5" /><span>View All</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Quick Action Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          
          {/* Report Incident Card */}
          <div onClick={() => navigate('/fieldops/incidents/report')}
            className="neu-raised rounded-3xl p-6 cursor-pointer hover:scale-[1.02] transition-transform border-l-4 border-red-500 bg-gradient-to-r from-red-50 to-white dark:from-red-900/10 dark:to-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Report New Incident</h3>
                <p className="text-sm text-slate-500">Submit in under 60 seconds</p>
              </div>
            </div>
          </div>

          {/* Track Incident Card */}
          <div onClick={() => navigate('/fieldops/incidents/tracker')}
            className="neu-raised rounded-3xl p-6 cursor-pointer hover:scale-[1.02] transition-transform border-l-4 border-purple-500 bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/10 dark:to-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <History className="w-7 h-7 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Track Incident</h3>
                <p className="text-sm text-slate-500">Full audit trail by INC number</p>
              </div>
            </div>
          </div>

          {/* View All Card */}
          <div onClick={() => navigate('/fieldops/incidents/list')}
            className="neu-raised rounded-3xl p-6 cursor-pointer hover:scale-[1.02] transition-transform border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/10 dark:to-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText className="w-7 h-7 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">View All Incidents</h3>
                <p className="text-sm text-slate-500">Search, filter & manage</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {mainStats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.03 }}
              className="neu-raised rounded-2xl p-4 text-center stat-card">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Category Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="neu-raised rounded-3xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-600" />Incident Categories
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {categoryStats.map(cat => (
              <div key={cat.label} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                <cat.icon className="w-6 h-6 text-slate-600 dark:text-slate-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-800 dark:text-white">{cat.value}</p>
                <p className="text-xs text-slate-500">{cat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Incidents */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="neu-raised rounded-3xl p-6">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />Recent Incidents
            </h2>
            <div className="flex gap-2">
              <Link to="/fieldops/incidents/tracker" className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
                <History className="w-4 h-4" /> Tracker
              </Link>
              <Link to="/fieldops/incidents/list" className="text-sm text-emerald-600 flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-3 text-slate-500">Incident #</th>
                  <th className="text-left py-3 px-3 text-slate-500">Title</th>
                  <th className="text-left py-3 px-3 text-slate-500">Category</th>
                  <th className="text-left py-3 px-3 text-slate-500">Severity</th>
                  <th className="text-left py-3 px-3 text-slate-500">Risk</th>
                  <th className="text-left py-3 px-3 text-slate-500">Status</th>
                  <th className="text-left py-3 px-3 text-slate-500">Date</th>
                  <th className="text-center py-3 px-3 text-slate-500">Track</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recentIncidents || []).map(inc => (
                  <tr key={inc.incident_number} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-white">{inc.incident_number}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{inc.title}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                        {(inc.incident_category || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        inc.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        inc.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        inc.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>{inc.severity}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`w-3 h-3 rounded-full inline-block ${
                        inc.risk_level === 'critical' || inc.risk_level === 'red' ? 'bg-red-500' :
                        inc.risk_level === 'orange' ? 'bg-orange-500' :
                        inc.risk_level === 'yellow' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        (inc.status || '').includes('closed') ? 'bg-emerald-100 text-emerald-700' :
                        (inc.status || '').includes('investigation') ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>{(inc.status || '').replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500">
                      {inc.incident_date ? new Date(inc.incident_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/fieldops/incidents/tracker`) }}
                        className="p-1.5 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
                        title="Track this incident">
                        <History className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!stats.recentIncidents || stats.recentIncidents.length === 0) && (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No incidents reported yet</p>
              <button onClick={() => navigate('/fieldops/incidents/report')} className="mt-3 text-sm text-red-600 hover:text-red-700 font-semibold">
                Report First Incident →
              </button>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
