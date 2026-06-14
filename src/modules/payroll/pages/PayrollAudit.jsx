import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import { Search, ArrowLeft, Sun, Moon, Sparkles, Clock, User, FileText } from 'lucide-react'

export default function PayrollAudit() {
  const { isDark, toggleTheme } = useThemeStore()
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadAuditLogs() }, [])

  const loadAuditLogs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('payroll_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setAuditLogs(data || [])
    setLoading(false)
  }

  const formatDate = (date) => date ? new Date(date).toLocaleString('en-ZA') : ''

  const filteredLogs = auditLogs.filter(log => {
    if (!search) return true
    const s = search.toLowerCase()
    return (log.action || '').toLowerCase().includes(s) ||
           (log.entity_type || '').toLowerCase().includes(s)
  })

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
        <Link to="/payroll" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Payroll</span>
        </Link>

        <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-8">
          <Clock className="w-8 h-8 text-emerald-600" />Payroll Audit Log
        </h1>

        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search audit logs..."
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : (
          <div className="neu-raised rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-700/30">
                    <th className="text-left py-3 px-4">Date/Time</th>
                    <th className="text-left py-3 px-4">Action</th>
                    <th className="text-left py-3 px-4">Entity</th>
                    <th className="text-left py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4 text-xs">{formatDate(log.created_at)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">{log.action}</span>
                      </td>
                      <td className="py-3 px-4 text-xs capitalize">{log.entity_type}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {log.old_values && <span className="text-red-500">Old: {JSON.stringify(log.old_values).slice(0, 50)}</span>}
                        {log.new_values && <span className="text-emerald-500 ml-2">New: {JSON.stringify(log.new_values).slice(0, 50)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredLogs.length === 0 && <p className="text-center py-8 text-slate-400">No audit logs found</p>}
          </div>
        )}
      </main>
    </div>
  )
}
