import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Search, Plus, Edit, Trash2, ChevronRight, 
  Sun, Moon, Sparkles, Home, Building2,
  DollarSign, Tag, Truck, RefreshCw
} from 'lucide-react'

export default function ServiceList() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editPrice, setEditPrice] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newService, setNewService] = useState({
    name: '', category: 'Once-Off Cleaning', unit_price: 0, unit: 'per_service', description: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadServices()
  }, [])

  const loadServices = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      const mapped = (data || []).map(s => ({
        id: s.id,
        code: s.id?.toString().substring(0, 8).toUpperCase() || '',
        category: s.category || 'Other',
        name: s.name,
        unit_price: s.unit_price || 0,
        unit: s.unit || 'per_service',
        description: s.description || ''
      }))

      setServices(mapped)
      const cats = [...new Set(mapped.map(s => s.category).filter(Boolean))]
      setCategories(cats.sort())
    } catch (err) {
      console.error('Error loading services:', err)
      toast.error('Failed to load services')
    }
    setLoading(false)
  }

  const filteredServices = services.filter(s => {
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    }
    return true
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(amount || 0)
  }

  const startEdit = (service) => {
    setEditingId(service.id)
    setEditPrice(service.unit_price.toString())
  }

  const savePrice = async (serviceId) => {
    const newPrice = parseFloat(editPrice)
    if (isNaN(newPrice) || newPrice <= 0) {
      toast.error('Please enter a valid price')
      return
    }
    try {
      const { error } = await supabase
        .from('products_services')
        .update({ unit_price: newPrice })
        .eq('id', serviceId)

      if (error) throw error

      setServices(prev => prev.map(s => s.id === serviceId ? { ...s, unit_price: newPrice } : s))
      setEditingId(null)
      toast.success(`Price updated to ${formatCurrency(newPrice)}`)
    } catch (err) {
      toast.error('Failed to update price')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditPrice('')
  }

  const handleDelete = async (serviceId, serviceName) => {
    if (!window.confirm(`Delete "${serviceName}"? This cannot be undone.`)) return
    try {
      const { error } = await supabase
        .from('products_services')
        .update({ is_active: false })
        .eq('id', serviceId)

      if (error) throw error

      setServices(prev => prev.filter(s => s.id !== serviceId))
      toast.success(`"${serviceName}" deleted`)
    } catch (err) {
      toast.error('Failed to delete service')
    }
  }

  const handleAddService = async () => {
    if (!newService.name || newService.unit_price <= 0) {
      toast.error('Name and price are required')
      return
    }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('products_services')
        .insert([{
          name: newService.name,
          category: newService.category,
          unit_price: newService.unit_price,
          unit: newService.unit,
          description: newService.description,
          is_active: true
        }])
        .select()
        .single()

      if (error) throw error

      toast.success('Service added!')
      setShowAddModal(false)
      setNewService({ name: '', category: 'Once-Off Cleaning', unit_price: 0, unit: 'per_service', description: '' })
      loadServices()
    } catch (err) {
      toast.error('Failed to add service: ' + err.message)
    }
    setSaving(false)
  }

  const getCategoryIcon = (cat) => {
    if (!cat) return <Tag className="w-4 h-4" />
    if (cat.includes('Once-Off')) return <Home className="w-4 h-4 text-blue-500" />
    if (cat.includes('Monthly')) return <Building2 className="w-4 h-4 text-purple-500" />
    if (cat.includes('Moving')) return <Truck className="w-4 h-4 text-orange-500" />
    return <Tag className="w-4 h-4 text-emerald-500" />
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
            <p className="text-slate-500 mt-1">{services.length} services across {categories.length} categories</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadServices} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-slate-600 text-white flex items-center gap-2 text-sm">
              <RefreshCw className="w-5 h-5" /><span>Refresh</span>
            </button>
            <button onClick={() => setShowAddModal(true)} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-emerald-600 text-white flex items-center gap-2 text-sm">
              <Plus className="w-5 h-5" /><span>Add Service</span>
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or category..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : (
          <>
            {/* Services by Category */}
            {(categoryFilter === 'all' ? categories : [categoryFilter]).map(cat => {
              const catServices = filteredServices.filter(s => s.category === cat)
              if (catServices.length === 0) return null
              return (
                <div key={cat} className="mb-8">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    {getCategoryIcon(cat)}
                    {cat}
                    <span className="text-sm font-normal text-slate-500">({catServices.length})</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {catServices.map(service => (
                      <motion.div key={service.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="neu-raised rounded-2xl p-5 transition-all hover:scale-[1.02]">
                        <p className="text-xs text-slate-400 mb-1">{service.code}</p>
                        <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-2">{service.name}</h3>
                        
                        {editingId === service.id ? (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-slate-500">R</span>
                            <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                              className="w-28 p-2 neu-inset rounded-lg text-lg font-bold text-emerald-600" step="0.01" autoFocus
                              onKeyDown={(e) => { if (e.key === 'Enter') savePrice(service.id); if (e.key === 'Escape') cancelEdit() }} />
                          </div>
                        ) : (
                          <p className="text-2xl font-bold text-emerald-600 mb-1">{formatCurrency(service.unit_price)}</p>
                        )}
                        <p className="text-xs text-slate-500 mb-3">per {service.unit?.replace('_', ' ')}</p>

                        {editingId === service.id ? (
                          <div className="flex gap-2">
                            <button onClick={() => savePrice(service.id)} className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">Save</button>
                            <button onClick={cancelEdit} className="flex-1 py-2 rounded-xl bg-slate-400 text-white text-sm font-medium">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => startEdit(service)} className="flex-1 py-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium flex items-center justify-center gap-1">
                              <Edit className="w-4 h-4" /> Price
                            </button>
                            <button onClick={() => handleDelete(service.id, service.name)} className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )
            })}

            {filteredServices.length === 0 && (
              <div className="text-center py-12 neu-raised rounded-3xl">
                <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No services found</p>
                <button onClick={() => { setSearch(''); setCategoryFilter('all') }} className="mt-4 neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white">Reset Filters</button>
              </div>
            )}
          </>
        )}

        {/* Add Service Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <div className="neu-raised rounded-3xl p-6 max-w-md w-full bg-white dark:bg-slate-800" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Add New Service</h3>
              <div className="space-y-4">
                <input type="text" value={newService.name} onChange={(e) => setNewService({...newService, name: e.target.value})} placeholder="Service Name *" className="w-full p-3 neu-inset rounded-xl" />
                <select value={newService.category} onChange={(e) => setNewService({...newService, category: e.target.value})} className="w-full p-3 neu-inset rounded-xl">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" value={newService.unit_price} onChange={(e) => setNewService({...newService, unit_price: parseFloat(e.target.value) || 0})} placeholder="Price *" className="p-3 neu-inset rounded-xl" step="0.01" />
                  <select value={newService.unit} onChange={(e) => setNewService({...newService, unit: e.target.value})} className="p-3 neu-inset rounded-xl">
                    <option value="per_service">per service</option>
                    <option value="per_month">per month</option>
                  </select>
                </div>
                <textarea value={newService.description} onChange={(e) => setNewService({...newService, description: e.target.value})} placeholder="Description (optional)" rows={2} className="w-full p-3 neu-inset rounded-xl" />
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAddModal(false)} className="flex-1 neu-raised neu-btn py-3 rounded-xl bg-slate-600 text-white">Cancel</button>
                <button onClick={handleAddService} disabled={saving} className="flex-1 neu-raised neu-btn py-3 rounded-xl bg-emerald-600 text-white disabled:opacity-50">
                  {saving ? 'Adding...' : 'Add Service'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
