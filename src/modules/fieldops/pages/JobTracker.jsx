import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useFieldOpsStore from '../store/fieldOpsStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Search, FileText, Clock, User, CheckCircle2, 
  XCircle, AlertTriangle, Truck, DollarSign,
  Sun, Moon, Sparkles, ChevronRight, ArrowLeft,
  Users, Calendar, MapPin, Briefcase
} from 'lucide-react'

export default function JobTracker() {
  const { jobAuditData, fetchJobAuditTrail, loading, clearAuditData } = useFieldOpsStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [jobNumber, setJobNumber] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!jobNumber.trim()) {
      toast.error('Please enter a job number')
      return
    }
    await fetchJobAuditTrail(jobNumber.trim().toUpperCase())
  }

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-ZA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  const getActionIcon = (actionType) => {
    const icons = {
      created: <FileText className="w-4 h-4 text-blue-600" />,
      assigned: <Users className="w-4 h-4 text-purple-600" />,
      accepted: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      started: <Clock className="w-4 h-4 text-amber-600" />,
      completed: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      released: <XCircle className="w-4 h-4 text-red-600" />,
      cancelled: <XCircle className="w-4 h-4 text-red-600" />,
      quality_checked: <AlertTriangle className="w-4 h-4 text-purple-600" />,
      invoiced: <DollarSign className="w-4 h-4 text-emerald-600" />,
      paid: <DollarSign className="w-4 h-4 text-emerald-600" />,
      updated: <FileText className="w-4 h-4 text-slate-600" />,
    }
    return icons[actionType] || <FileText className="w-4 h-4 text-slate-600" />
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Ops</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Job Tracker</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-2">
            <Search className="w-8 h-8 text-purple-600" />Job Tracker
          </h1>
          <p className="text-slate-500">Enter a job number to view complete audit trail</p>
        </motion.div>

        {/* Search Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
              <input
                type="text"
                value={jobNumber}
                onChange={(e) => setJobNumber(e.target.value)}
                placeholder="Enter Job Number (e.g., JOB-2506-0001)"
                className="w-full pl-14 pr-4 py-5 text-lg neu-inset rounded-2xl text-slate-700 dark:text-slate-300 uppercase placeholder:text-sm"
              />
            </div>
            <button type="submit" disabled={loading} className="neu-raised neu-btn px-8 py-5 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 text-lg font-semibold disabled:opacity-50">
              {loading ? 'Searching...' : 'Track Job'}
            </button>
          </form>
        </motion.div>

        {/* Results */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading job audit trail...</p>
          </div>
        )}

        {jobAuditData && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Job Summary */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Job Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Job Number</p>
                  <p className="font-bold text-slate-800 dark:text-white">{jobAuditData.job.job_number}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${jobAuditData.job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {jobAuditData.job.status?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Client</p>
                  <p className="font-medium text-sm">{jobAuditData.client?.company_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Value</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(jobAuditData.job.quoted_amount)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm text-slate-500"><Calendar className="w-4 h-4" />{new Date(jobAuditData.job.scheduled_date).toLocaleDateString()}</div>
                <div className="flex items-center gap-2 text-sm text-slate-500"><MapPin className="w-4 h-4" />{jobAuditData.job.site_city || 'N/A'}</div>
                <div className="flex items-center gap-2 text-sm text-slate-500"><Briefcase className="w-4 h-4" />{jobAuditData.job.cleaners_required} cleaners</div>
                <div className="flex items-center gap-2 text-sm text-slate-500"><User className="w-4 h-4" />{jobAuditData.assignments?.length || 0} assigned</div>
              </div>
            </div>

            {/* Audit Timeline */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />Complete Audit Trail
              </h2>
              
              {jobAuditData.auditLogs?.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                  <div className="space-y-4">
                    {jobAuditData.auditLogs.map((log, i) => (
                      <div key={log.id} className="relative pl-10">
                        <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full bg-purple-500 border-2 border-white dark:border-slate-800"></div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                          <div className="flex items-center gap-2 mb-1">
                            {getActionIcon(log.action_type)}
                            <span className="font-semibold text-sm capitalize">{log.action_type?.replace('_', ' ')}</span>
                            <span className="text-xs text-slate-500 ml-auto">{formatDateTime(log.created_at)}</span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{log.action_description}</p>
                          <p className="text-xs text-slate-500 mt-1">By: {log.performed_by_name || 'System'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No audit logs available</p>
              )}
            </div>

            {/* Status History */}
            {jobAuditData.statusHistory?.length > 0 && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Status Changes</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-3 text-slate-500">From</th>
                        <th className="text-left py-2 px-3 text-slate-500">To</th>
                        <th className="text-left py-2 px-3 text-slate-500">Changed By</th>
                        <th className="text-left py-2 px-3 text-slate-500">Date</th>
                        <th className="text-left py-2 px-3 text-slate-500">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobAuditData.statusHistory.map(h => (
                        <tr key={h.id} className="border-b border-slate-100 dark:border-slate-700/50">
                          <td className="py-2 px-3">{h.previous_status?.replace('_', ' ') || 'N/A'}</td>
                          <td className="py-2 px-3 font-medium">{h.new_status?.replace('_', ' ')}</td>
                          <td className="py-2 px-3">{h.changed_by_name || 'System'}</td>
                          <td className="py-2 px-3 text-xs">{formatDateTime(h.changed_at)}</td>
                          <td className="py-2 px-3 text-xs text-slate-500">{h.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Assignments */}
            {jobAuditData.assignments?.length > 0 && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />Staff Assignments
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {jobAuditData.assignments.map(a => (
                    <div key={a.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{a.employees?.first_name} {a.employees?.last_name}</p>
                        <p className="text-xs text-slate-500">{a.employees?.employee_code}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${a.assignment_status === 'completed' ? 'bg-emerald-100 text-emerald-700' : a.assignment_status === 'released' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {a.assignment_status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quotation/Invoice Info */}
            {jobAuditData.quotation && (
              <div className="neu-raised rounded-3xl p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />Financial Information
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Quotation #</p>
                    <p className="font-medium">{jobAuditData.quotation.quotation_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Amount</p>
                    <p className="font-bold text-emerald-600">{formatCurrency(jobAuditData.quotation.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{jobAuditData.quotation.status}</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Date</p>
                    <p className="text-sm">{new Date(jobAuditData.quotation.quotation_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {!loading && !jobAuditData && (
          <div className="text-center py-12 neu-raised rounded-3xl">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Enter a job number to view its complete audit trail</p>
            <p className="text-slate-400 text-sm mt-2">Example: JOB-2506-0001</p>
          </div>
        )}
      </main>
    </div>
  )
}
