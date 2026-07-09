import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Search, Plus, Edit, Trash2, Eye, ChevronRight, 
  Sun, Moon, Sparkles, Package, Wrench, Home, Building2,
  DollarSign, Tag, Filter, ArrowLeft
} from 'lucide-react'

export default function ServiceList() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [categories, setCategories] = useState([])
  const [activeTab, setActiveTab] = useState('all') // 'all', 'products_services', 'service_types'
  const [showDeleteModal, setShowDeleteModal] = useState(null)

  useEffect(() => {
    loadServices()
  }, [activeTab, categoryFilter])

  const loadServices = async () => {
    setLoading(true)
    try {
      let allServices = []

      if (activeTab === 'all' || activeTab === 'products_services') {
        const { data: ps } = await supabase
          .from('products_services')
          .select('*')
          .order('category', { ascending: true })
          .order('name', { ascending: true })
        
        if (ps) {
          allServices.push(...ps.map(s => ({ ...s, source: 'products_services', price: s.unit_price, unit_type: s.unit })))
        }
      }

      if (activeTab === 'all' || activeTab === 'service_types') {
        const { data: st } = await supabase
          .from('service_types')
          .select('*')
          .order('category', { ascending: true })
          .order('name', { ascending: true })
        
        if (st) {
          allServices.push(...st.map(s => ({ ...s, source: 'service_types', price: s.default_price, unit_type: s.pricing_unit })))
        }
      }

      // Get unique categories
      const cats = [...new Set(allServices.map(s => s.category).filter(Boolean))]
      setCategories(cats.sort())

      // Filter
      let filtered = allServices
      if (categoryFilter !== 'all') {
        filtered = filtered.filter(s => s.category === categoryFilter)
      }
      if (search) {
        const s = search.toLowerCase()
        filtered = filtered.filter(svc => 
          (svc.name || '').toLowerCase().includes(s) || 
          (svc.description || '').toLowerCase().includes(s) ||
          (svc.category || '').toLowerCase().includes(s)
        )
      }

      setServices(filtered)
    } catch (err) {
      console.error('Error loading services:', err)
      toast.error('Failed to load services')
    }
    setLoading(false)
  }

  const handleDelete = async (service) => {
    if (!window.confirm(`Delete "${service.name}"? This cannot be undone.`)) return
    
    try {
      const table = service.source === 'products_services' ? 'products_services' : 'service_types'
      const { error } = await supabase.from(table).delete().eq('id', service.id)
      
      if (error) throw error
      
      toast.success(`"${service.name}" deleted!`)
      loadServices()
    } catch (err) {
      toast.error('Failed to delete: ' + err.message)
    }
  }

  const handleToggleActive = async (service) => {
    try {
      const table = service.source === 'products_services' ? 'products_services' : 'service_types'
      const { error } = await supabase
        .from(table)
        .update({ is_active: !service.is_active })
        .eq('id', service.id)
      
      if (error) throw error
      
      toast.success(service.is_active ? 'Service deactivated' : 'Service activated')
      loadServices()
    } catch (err) {
      toast.error('Failed to update')
    }
  }

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A'
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
  }

  const getCategoryIcon = (cat) => {
    if (!cat) return <Package className="w-4 h-4" />
    const c = cat.toLowerCase()
    if (c.includes('clean')) return <Home className="w-4 h-4 text-blue-500" />
    if (c.includes('commercial') || c.includes('office')) return <Building2 className="w-4 h-4 text-purple-500" />
    if (c.includes('industrial')) return <Wrench className="w-4 h-4 text-orange-500" />
    return <Tag className="w-4 h-4 text-emerald-500" />
  }

  const getSourceBadge = (source) => {
    return source === 'products_services' 
      ? 'bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full'
      : 'bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full'
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
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/inventory" className="text-slate-500 hover:text-emerald-600">Inventory</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Services & Pricing</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-emerald-600" />Services & Pricing
            </h1>
            <p className="text-slate-500 mt-1">{services.length} services • Used in jobs & quotations</p>
          </div>
          <button onClick={() => navigate('/inventory/services/new')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-5 h-5" /><span>Add Service</span>
          </button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'all', label: 'All Services' },
            { id: 'products_services', label: 'Quotation Items' },
            { id: 'service_types', label: 'Service Types' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white' : 'neu-raised text-slate-600 dark:text-slate-300'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Services List */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, i) => (
              <motion.div key={`${service.source}-${service.id}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={`neu-raised rounded-2xl p-5 transition-all ${!service.is_active ? 'opacity-50' : ''}`}>
                
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      {getCategoryIcon(service.category)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">{service.name}</h3>
                      <p className="text-xs text-slate-500 capitalize">{service.category || 'Uncategorized'}</p>
                    </div>
                  </div>
                  <span className={getSourceBadge(service.source)}>
                    {service.source === 'products_services' ? 'Quote' : 'Service'}
                  </span>
                </div>

                <p className="text-sm text-slate-500 mb-3 line-clamp-2">{service.description || 'No description'}</p>

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(service.price)}</p>
                    <p className="text-xs text-slate-500">per {service.unit_type || 'unit'}</p>
                  </div>
                  {!service.is_active && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Inactive</span>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button onClick={() => navigate(`/inventory/services/${service.id}/edit?source=${service.source}`)} 
                    className="flex-1 py-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium flex items-center justify-center gap-1">
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button onClick={() => handleToggleActive(service)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1 ${service.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                    {service.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(service)}
                    className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && services.length === 0 && (
          <div className="text-center py-12 neu-raised rounded-3xl">
            <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No services found</p>
            <button onClick={() => navigate('/inventory/services/new')} className="mt-4 neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white">
              Add First Service
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
