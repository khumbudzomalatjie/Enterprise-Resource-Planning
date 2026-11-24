import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useTenderStore from '../store/tenderStore'
import useThemeStore from '../../../store/themeStore'
import { 
  FileText, ArrowLeft, Plus, Briefcase, 
  Clock, CheckCircle2, TrendingUp, Sparkles, Sun, Moon
} from 'lucide-react'

export default function TenderDashboard() {
  const { tenders, fetchTenders, stats, fetchStats, loading } = useTenderStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchTenders()
    fetchStats()
  }, [])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">Enterprise Resource Planning</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/sales" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Sales Dashboard</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Tender & RFQ Management</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">Track opportunities, prepare BoQs, and submit tenders</p>
          </div>
          <button onClick={() => navigate('/tenders/new')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-5 h-5" /><span>New Tender</span>
          </button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Tenders', value: stats.total || 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
            { label: 'In Draft', value: stats.draft || 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
            { label: 'Submitted', value: stats.submitted || 0, icon: CheckCircle2, color: 'text-purple-600', bg: 'bg-purple-100' },
            { label: 'Pipeline Value', value: formatCurrency(stats.pipelineValue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="neu-raised rounded-2xl p-4">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tender List */}
        <div className="neu-raised rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Active Opportunities</h2>
          {loading ? (
            <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div></div>
          ) : tenders.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No tenders found. Create your first one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-slate-700 text-left text-slate-500">
                    <th className="pb-3 px-2">Tender No.</th>
                    <th className="pb-3 px-2">Title</th>
                    <th className="pb-3 px-2">Client</th>
                    <th className="pb-3 px-2">Closing Date</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2 text-right">Est. Value</th>
                  </tr>
                </thead>
                <tbody>
                  {tenders.map(t => (
                    <tr key={t.id} onClick={() => navigate(`/tenders/${t.id}`)} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                      <td className="py-3 px-2 font-mono text-xs">{t.tender_number}</td>
                      <td className="py-3 px-2 font-medium">{t.title}</td>
                      <td className="py-3 px-2">{t.client_name || t.clients?.company_name || '-'}</td>
                      <td className="py-3 px-2">{t.closing_date || '-'}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                          t.status === 'draft' ? 'bg-slate-100 text-slate-600' : 
                          t.status === 'submitted' ? 'bg-purple-100 text-purple-700' : 
                          'bg-emerald-100 text-emerald-700'
                        }`}>{t.status}</span>
                      </td>
                      <td className="py-3 px-2 text-right font-bold text-emerald-600">{formatCurrency(t.estimated_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
