import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useAssetsStore from '../store/assetsStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Database, Package, Wrench, Truck, Plus, Search,
  Sparkles, Sun, Moon, ChevronRight, ArrowLeft,
  DollarSign, BarChart3, MapPin, User, Calendar,
  AlertCircle
} from 'lucide-react'

export default function AssetsDashboard() {
  const { assets, stats, categories, fetchAssets, fetchCategories, fetchAssetsStats, loading } = useAssetsStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    fetchAssetsStats()
    fetchCategories()
    loadAssets()
  }, [statusFilter, categoryFilter])

  const loadAssets = async () => {
    const filters = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    if (categoryFilter !== 'all') filters.category_id = categoryFilter
    if (search) filters.search = search
    await fetchAssets(filters)
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      in_use: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      available: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      retired: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
      disposed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }
    return colors[status] || 'bg-slate-100 text-slate-600'
  }

  const statCards = [
    { icon: Database, label: 'Total Assets', value: stats.totalAssets || 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: Package, label: 'Active Assets', value: stats.activeAssets || 0, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: Wrench, label: 'In Maintenance', value: stats.maintenanceAssets || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { icon: DollarSign, label: 'Total Value', value: formatCurrency(stats.totalCurrentValue), color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: AlertCircle, label: 'Disposed', value: stats.disposedAssets || 0, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { icon: Calendar, label: 'Upcoming Service', value: stats.upcomingMaintenance?.length || 0, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Assets Management</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">Asset register, depreciation, maintenance & transfers</p>
          </div>
          <button onClick={() => navigate('/assets/new')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-5 h-5" /><span>Add Asset</span>
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="neu-raised rounded-2xl p-4 stat-card">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, code, serial..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" onKeyDown={e => e.key === 'Enter' && loadAssets()} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="in_use">In Use</option>
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
            <option value="disposed">Disposed</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={loadAssets} className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white">Search</button>
        </div>

        {/* Asset Grid */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div><p className="text-slate-500">Loading...</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset, i) => (
              <motion.div key={asset.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/assets/${asset.id}`)}
                className="neu-raised rounded-2xl p-5 stat-card cursor-pointer hover:scale-[1.02]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{asset.name}</h3>
                    <p className="text-xs text-slate-500">{asset.asset_code}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(asset.status)}`}>{asset.status?.replace('_', ' ')}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Category:</span><span className="font-medium">{asset.asset_categories?.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Value:</span><span className="font-medium">{formatCurrency(asset.current_value)}</span></div>
                  <div className="flex items-center gap-1 text-slate-500"><MapPin className="w-3.5 h-3.5" />{asset.location || 'No location'}</div>
                  {asset.assigned_to && <div className="flex items-center gap-1 text-slate-500"><User className="w-3.5 h-3.5" />{asset.employees?.first_name} {asset.employees?.last_name}</div>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
