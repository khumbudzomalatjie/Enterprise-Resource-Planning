import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useIncidentStore from '../store/incidentStore'
import useThemeStore from '../../../../store/themeStore'
import { 
  AlertTriangle, Shield, Activity, Clock, CheckCircle2,
  Car, Wrench, Building2, UserX, TreePine, Eye,
  Sun, Moon, Sparkles, ChevronRight, ArrowLeft,
  UserCheck, History, Camera
} from 'lucide-react'

export default function IncidentDashboard() {
  const { stats, fetchStats } = useIncidentStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => { fetchStats() }, [])

  const mainStats = [
    { icon: AlertTriangle, label: 'Total Incidents', value: stats.total || 0, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },
    { icon: Activity, label: 'Open', value: stats.open || 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: Shield, label: 'Investigating', value: stats.investigating || 0, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: Clock, label: 'Awaiting Approval', value: stats.awaitingApproval || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { icon: CheckCircle2, label: 'Closed', value: stats.closed || 0, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: AlertTriangle, label: 'High Risk', value: stats.highRisk || 0, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { icon: Shield, label: 'Critical', value: stats.critical || 0, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { icon: UserX, label: 'Injuries', value: stats.injuries || 0, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
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
        <Link to="/fieldops" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Field Ops</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-red-600" />
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Incident Management</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">Enterprise incident reporting, investigation & resolution</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate('/fieldops/incidents/my')} className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
              <UserCheck className="w-5 h-5" /><span>My Incidents</span>
            </button>
            <button onClick={() => navigate('/fieldops/incidents/tracker')} className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2">
              <History className="w-5 h-5" /><span>Track</span>
            </button>
            <button onClick={() => navigate('/fieldops/photos')} className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2">
              <Camera className="w-5 h-5" /><span>Photos</span>
            </button>
            <button onClick={() => navigate('/fieldops/incidents/report')} className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-red-600 text-white hover:bg-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /><span>Report</span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          {mainStats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
              className="neu-raised rounded-2xl p-4 text-center">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="neu-raised rounded-3xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Incident Categories</h2>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="neu-raised rounded-3xl p-6">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />Recent Incidents
            </h2>
            <Link to="/fieldops/incidents/list" className="text-sm text-emerald-600 flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {(stats.recentIncidents || []).map(inc => (
              <div key={inc.incident_number}
                onClick={() => navigate(`/fieldops/incidents/list`)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/30 cursor-pointer">
                <div>
                  <p className="font-medium text-sm text-slate-800 dark:text-white">{inc.incident_number}</p>
                  <p className="text-xs text-slate-500">{inc.title}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  inc.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  inc.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {inc.severity}
                </span>
              </div>
            ))}
            {(stats.recentIncidents || []).length === 0 && (
              <p className="text-center text-slate-500 py-8">No recent incidents</p>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
