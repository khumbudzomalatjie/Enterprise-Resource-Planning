import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useAuditStore from '../store/auditStore'
import useThemeStore from '../../../store/themeStore'
import { 
  Shield, Search, Eye, Clock, User, 
  Activity, AlertTriangle, CheckCircle2, XCircle,
  Sparkles, Sun, Moon, ChevronRight, ArrowLeft,
  BarChart3, RefreshCw
} from 'lucide-react'

export default function AuditTrailDashboard() {
  const { auditEntries, stats, fetchAuditTrail, fetchAuditStats, loading } = useAuditStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    loadData()
  }, [moduleFilter, severityFilter, page])

  const loadData = async () => {
    const filters = { limit: 50, offset: page * 50 }
    if (moduleFilter !== 'all') filters.module = moduleFilter
    if (severityFilter !== 'all') filters.severity = severityFilter
    if (search) filters.search = search
    if (dateFrom) filters.date_from = dateFrom
    if (dateTo) filters.date_to = dateTo
    await fetchAuditTrail(filters)
    await fetchAuditStats()
  }

  const modules = [
    'Authentication', 'HR Management', 'Payroll', 'Attendance',
    'CRM', 'Sales', 'Operations', 'Inventory', 'Procurement', 'Finance'
  ]

  const getSeverityColor = (severity) => {
    const colors = {
      info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      critical: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    }
    return colors[severity] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
  }

  const getStatusIcon = (status) => {
    if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-600" />
    return <Clock className="w-4 h-4 text-amber-600" />
  }

  const formatDate = (date) => date ? new Date(date).toLocaleString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }) : '-'

  const getActionColor = (action) => {
    if (action?.includes('Created')) return 'text-emerald-600 dark:text-emerald-400'
    if (action?.includes('Updated')) return 'text-blue-600 dark:text-blue-400'
    if (action?.includes('Deleted') || action?.includes('Cancelled')) return 'text-red-600 dark:text-red-400'
    if (action?.includes('Approved')) return 'text-purple-600 dark:text-purple-400'
    return 'text-slate-600 dark:text-slate-400'
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Dashboard</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-emerald-600" />
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Audit Trail</h1>
              </div>
              <p className="text-slate-500 dark:text-slate-400 ml-11">Complete system activity log - track every action from start to finish</p>
            </div>
            <button onClick={loadData} className="neu-raised neu-btn px-4 py-2 rounded-xl flex items-center gap-2 text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="neu-raised rounded-2xl p-4 text-center">
            <Activity className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.totalEntries || 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Entries</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="neu-raised rounded-2xl p-4 text-center">
            <Clock className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.todayEntries || 0}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Today</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="neu-raised rounded-2xl p-4 text-center">
            <BarChart3 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{Object.keys(stats.moduleCounts || {}).length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Modules Tracked</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="neu-raised rounded-2xl p-4 text-center">
            <User className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {new Set(auditEntries?.map(e => e.user_email).filter(Boolean)).size || 0}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Unique Users</p>
          </motion.div>
        </div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="neu-raised rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by description, entity, user..."
                className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 text-sm placeholder-slate-400 dark:placeholder-slate-500"
                onKeyDown={(e) => e.key === 'Enter' && loadData()} />
            </div>
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 text-sm">
              <option value="all">All Modules</option>
              {modules.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 text-sm">
              <option value="all">All Severity</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 text-sm" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 text-sm" />
            <button onClick={loadData}
              className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-sm transition-colors">
              Filter
            </button>
          </div>
        </motion.div>

        {/* Audit Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="neu-raised rounded-3xl overflow-hidden">
          
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-slate-500 dark:text-slate-400">Loading audit trail...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 py-3 px-3">Time</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 py-3 px-3">Module</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 py-3 px-3">Action</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 py-3 px-3">Entity</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 py-3 px-3">User</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 py-3 px-3">Description</th>
                    <th className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-3 px-3">Severity</th>
                    <th className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEntries?.map((entry, index) => (
                    <tr key={entry.id} 
                      className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors ${
                        index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'
                      }`}
                      onClick={() => navigate(`/audit/${entry.id}`)}>
                      <td className="py-2 px-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(entry.created_at)}</td>
                      <td className="py-2 px-3 text-xs font-medium text-slate-700 dark:text-slate-300">{entry.module}</td>
                      <td className="py-2 px-3 text-xs">
                        <span className={`font-medium ${getActionColor(entry.action)}`}>{entry.action}</span>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{entry.entity_type}</span>
                        {entry.entity_name && (
                          <span className="text-slate-400 dark:text-slate-500 ml-1">({entry.entity_name.length > 25 ? entry.entity_name.substring(0, 25) + '...' : entry.entity_name})</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-500 dark:text-slate-400">{entry.user_email || 'System'}</td>
                      <td className="py-2 px-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">{entry.description}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getSeverityColor(entry.severity)}`}>{entry.severity}</span>
                      </td>
                      <td className="py-2 px-3 text-center">{getStatusIcon(entry.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {!loading && (!auditEntries || auditEntries.length === 0) && (
            <div className="text-center py-16">
              <Shield className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 text-lg">No audit entries found</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                {search || moduleFilter !== 'all' || severityFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Activity will appear here as users interact with the system'}
              </p>
            </div>
          )}
        </motion.div>

        {/* Pagination */}
        {auditEntries && auditEntries.length > 0 && (
          <div className="flex items-center justify-between mt-4 px-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {auditEntries.length} entries
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="neu-raised neu-btn px-4 py-2 rounded-xl text-sm disabled:opacity-50">
                Previous
              </button>
              <button 
                onClick={() => setPage(page + 1)}
                disabled={auditEntries.length < 50}
                className="neu-raised neu-btn px-4 py-2 rounded-xl text-sm disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        )}

        {/* Module Distribution */}
        {Object.keys(stats.moduleCounts || {}).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="mt-8 neu-raised rounded-3xl p-6">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Activity by Module
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(stats.moduleCounts).map(([module, count]) => (
                <div key={module} className="bg-white/50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{module}</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{count}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
