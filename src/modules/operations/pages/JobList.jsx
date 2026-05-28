import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useOperationsStore from '../store/operationsStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Search, Plus, Eye, Pencil, Trash2,
  Calendar, Clock, Briefcase, ChevronRight,
  Sun, Moon, Sparkles, AlertTriangle, RefreshCw
} from 'lucide-react'

export default function JobList() {
  const { jobs, fetchJobs, deleteJob, fetchJobCategories, jobCategories, loading, error } = useOperationsStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const filters = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    if (categoryFilter !== 'all') filters.category_id = categoryFilter
    if (search.trim()) filters.search = search.trim()
    
    console.log('JobList: Loading jobs with filters:', filters)
    const result = await fetchJobs(filters)
    console.log('JobList: Jobs loaded:', { success: result?.success, count: result?.data?.length, jobs: result?.data })
    
    await fetchJobCategories()
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadData()
  }

  const handleFilterChange = (filterType, value) => {
    if (filterType === 'status') setStatusFilter(value)
    if (filterType === 'category') setCategoryFilter(value)
    // Reload will happen via useEffect if we add them as dependencies
    setTimeout(() => loadData(), 100)
  }

  const handleDelete = async (jobId) => {
    const result = await deleteJob(jobId)
    if (result.success) {
      toast.success('Job cancelled successfully')
      setDeleteConfirm(null)
      loadData()
    } else {
      toast.error('Failed to cancel job')
    }
  }

  const handleRefresh = () => {
    setSearch('')
    setStatusFilter('all')
    setCategoryFilter('all')
    loadData()
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      in_progress: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const formatDate = (date) => {
    if (!date) return 'Not scheduled'
    return new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
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
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/operations" className="text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">Operations</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">All Jobs</span>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-emerald-600" />
              All Jobs
              {jobs.length > 0 && (
                <span className="text-lg font-normal text-slate-500">({jobs.length})</span>
              )}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">View, edit, reschedule and manage all jobs</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleRefresh} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-slate-500 text-white hover:bg-slate-600 flex items-center gap-2" title="Refresh list">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/operations/jobs/new')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-5 h-5" /><span>New Job</span>
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="neu-raised rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                placeholder="Search jobs by title or number..." 
                className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50" 
              />
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setTimeout(loadData, 50) }} 
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select 
              value={categoryFilter} 
              onChange={(e) => { setCategoryFilter(e.target.value); setTimeout(loadData, 50) }} 
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
            >
              <option value="all">All Categories</option>
              {jobCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <button onClick={loadData} className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">Search</button>
          </div>
        </motion.div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-700 dark:text-red-400 text-sm">
            Error: {error}
          </div>
        )}

        {/* Jobs Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="neu-raised rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 py-4 px-4">Job #</th>
                  <th className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 py-4 px-4">Title</th>
                  <th className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 py-4 px-4">Schedule</th>
                  <th className="text-left text-sm font-medium text-slate-500 dark:text-slate-400 py-4 px-4">Status</th>
                  <th className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 py-4 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                      <p className="text-slate-500 mt-2">Loading jobs...</p>
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">No jobs found</p>
                      <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">Create your first job or check your filters</p>
                      <button 
                        onClick={() => navigate('/operations/jobs/new')} 
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition-colors"
                      >
                        + Create Job
                      </button>
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="py-4 px-4">
                        <span className="text-sm font-mono font-medium text-slate-800 dark:text-white">{job.job_number || 'N/A'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-slate-800 dark:text-white text-sm">{job.title || 'Untitled'}</p>
                        <p className="text-xs text-slate-500">{job.site_city || 'No location'}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          <p className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDate(job.scheduled_date)}
                          </p>
                          {job.scheduled_start_time && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {job.scheduled_start_time?.slice(0,5)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(job.status)}`}>
                          {(job.status || 'pending').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => navigate(`/operations/jobs/${job.id}`)} className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 transition-colors" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => navigate(`/operations/jobs/${job.id}?edit=true`)} className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 transition-colors" title="Edit / Reschedule">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(job.id)} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 transition-colors" title="Cancel Job">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="neu-raised rounded-3xl p-8 max-w-md mx-4 bg-white dark:bg-slate-800">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Cancel Job?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">This will mark the job as cancelled. This action cannot be undone.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteConfirm(null)} className="px-6 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors">Keep Job</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="px-6 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors">Cancel Job</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
