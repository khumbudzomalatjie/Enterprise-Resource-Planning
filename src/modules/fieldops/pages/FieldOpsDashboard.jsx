import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFieldOpsStore from '../store/fieldOpsStore'
import useThemeStore from '../../../store/themeStore'
import { 
  Radio, AlertTriangle, Search, Users, Clock, Shield,
  Sparkles, Sun, Moon, ChevronRight, ArrowLeft
} from 'lucide-react'

export default function FieldOpsDashboard() {
  const { stats, fetchFieldOpsStats } = useFieldOpsStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchFieldOpsStats()
  }, [])

  const statCards = [
    { icon: Radio, label: 'Active Jobs', value: stats.activeJobs || 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', path: '/fieldops/live-jobs' },
    { icon: Users, label: 'Assigned Staff', value: stats.assignedEmployees || 0, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', path: '/fieldops/live-jobs' },
    { icon: AlertTriangle, label: 'Open Incidents', value: stats.openIncidents || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', path: '/fieldops/incidents' },
    { icon: Shield, label: 'Critical', value: stats.criticalIncidents || 0, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', path: '/fieldops/incidents' },
    { icon: Search, label: 'Job Tracker', value: 'Search', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', path: '/fieldops/job-tracker' },
    { icon: Clock, label: 'Today', value: new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' }), color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', path: null },
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
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Main Dashboard</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Radio className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Field Operations</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-11">Live job monitoring, incidents, and job tracking</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: Radio, label: 'Live Jobs', desc: 'Monitor active jobs & assignments', path: '/fieldops/live-jobs', bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600', stats: `${stats.activeJobs || 0} active · ${stats.assignedEmployees || 0} assigned` },
            { icon: AlertTriangle, label: 'Incidents', desc: 'Report & manage field incidents', path: '/fieldops/incidents', bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-600', stats: `${stats.openIncidents || 0} open · ${stats.criticalIncidents || 0} critical` },
            { icon: Search, label: 'Job Tracker', desc: 'Full audit trail by job number', path: '/fieldops/job-tracker', bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-600', stats: 'Who · What · When · How' },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
              onClick={() => navigate(card.path)}
              className="neu-raised rounded-3xl p-8 cursor-pointer hover:scale-[1.02] transition-transform text-center">
              <div className={`w-20 h-20 rounded-2xl ${card.bg} flex items-center justify-center mx-auto mb-4`}>
                <card.icon className={`w-10 h-10 ${card.color}`} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{card.label}</h2>
              <p className="text-slate-500 mb-4">{card.desc}</p>
              <span className="text-sm px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">{card.stats}</span>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
              onClick={() => stat.path && navigate(stat.path)}
              className={`neu-raised rounded-2xl p-4 ${stat.path ? 'cursor-pointer stat-card' : ''}`}>
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  )
}
