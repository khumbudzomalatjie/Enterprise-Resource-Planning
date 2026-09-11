import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useCRMStore from '../store/crmStore'
import useThemeStore from '../../../store/themeStore'
import { crmApi } from '../api/crmApi'
import toast from 'react-hot-toast'
import { 
  Briefcase, Plus, Search, ChevronRight,
  Sun, Moon, Sparkles, X, Check, Building2,
  DollarSign, Package, ClipboardList
} from 'lucide-react'

export default function ServiceList() {
  const { serviceTypes, clientServices, fetchServiceTypes, fetchClientServices, clients, fetchClients, loading } = useCRMStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [activeTab, setActiveTab] = useState('services') // 'services' or 'types'
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  const [formData, setFormData] = useState({
    client_id: '', service_type_id: '', service_name: '', description: '',
    price: 0, pricing_unit: 'per_month', billing_frequency: 'monthly',
    service_day: '', service_time: '', frequency_per_week: 1,
    square_meters: '', number_of_cleaners: 1, special_instructions: '',
    status: 'active', start_date: new Date().toISOString().split('T')[0], end_date: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    await Promise.all([
      fetchServiceTypes(),
      fetchClientServices(),
      fetchClients({ status: 'active' })
    ])
  }

  const resetForm = () => {
    setFormData({
      client_id: '', service_type_id: '', service_name: '', description: '',
      price: 0, pricing_unit: 'per_month', billing_frequency: 'monthly',
      service_day: '', service_time: '', frequency_per_week: 1,
      square_meters: '', number_of_cleaners: 1, special_instructions: '',
      status: 'active', start_date: new Date().toISOString().split('T')[0], end_date: ''
    })
  }

  const handleServiceTypeSelect = (typeId) => {
    const type = serviceTypes.find(t => t.id === typeId)
    if (type) {
      setFormData(prev => ({
        ...prev,
        service_type_id: typeId,
        service_name: type.name,
        description: type.description || '',
        price: type.default_price || 0,
        pricing_unit: type.pricing_unit || 'per_month'
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.client_id || !formData.service_name) {
      toast.error('Client and service name required')
      return
    }

    setFormLoading(true)
    try {
      const result = await crmApi.createClientService(formData)
      if (result.error) {
        toast.error(result.error.message || 'Failed to add service')
      } else {
        toast.success('Service added!')
        setShowForm(false)
        resetForm()
        await fetchClientServices()
      }
    } catch (err) {
      toast.error('Error adding service')
    } finally {
      setFormLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  const getClientName = (clientId) => {
    const client = clients?.find(c => c.id === clientId)
    return client?.company_name || 'Unknown'
  }

  const filteredServices = (clientServices || []).filter(s => {
    if (!search) return true
    const s2 = search.toLowerCase()
    return (s.service_name || '').toLowerCase().includes(s2) ||
           getClientName(s.client_id).toLowerCase().includes(s2)
  })

  const filteredTypes = (serviceTypes || []).filter(t => {
    if (!search) return true
    const s2 = search.toLowerCase()
    return (t.name || '').toLowerCase().includes(s2) ||
           (t.category || '').toLowerCase().includes(s2)
  })

  const categoryColors = {
    cleaning: 'bg-emerald-100 text-emerald-700',
    maintenance: 'bg-blue-100 text-blue-700',
    sanitation: 'bg-purple-100 text-purple-700',
    pest_control: 'bg-red-100 text-red-700',
    waste_management: 'bg-amber-100 text-amber-700',
    other: 'bg-slate-100 text-slate-700'
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
          <Link to="/crm" className="text-slate-500 hover:text-emerald-600">CRM Dashboard</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Services</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-emerald-600" />Services
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {filteredTypes.length} service types · {filteredServices.length} active subscriptions
            </p>
          </div>
          {activeTab === 'services' && (
            <button onClick={() => { resetForm(); setShowForm(true) }} className="neu-raised neu-btn px-6 py-3 rounded-2xl flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
              <Plus className="w-5 h-5" /><span>Add Service</span>
            </button>
          )}
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
          <div className="inline-flex gap-2 p-1 neu-inset rounded-2xl">
            <button onClick={() => setActiveTab('services')} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${activeTab === 'services' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}>
              <ClipboardList className="w-4 h-4" /> Client Services ({clientServices?.length || 0})
            </button>
            <button onClick={() => setActiveTab('types')} className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${activeTab === 'types' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}>
              <Package className="w-4 h-4" /> Service Types ({serviceTypes?.length || 0})
            </button>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
        </motion.div>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : activeTab === 'types' ? (
          /* SERVICE TYPES */
          filteredTypes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTypes.map((type, i) => (
                <motion.div key={type.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="neu-raised rounded-2xl p-5 stat-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-emerald-600" />
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs capitalize ${categoryColors[type.category] || 'bg-slate-100 text-slate-700'}`}>
                      {type.category?.replace('_', ' ') || 'Other'}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white mb-1">{type.name}</h3>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{type.description || 'No description'}</p>
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs text-slate-500">{type.pricing_unit?.replace('_', ' ') || 'per service'}</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(type.default_price)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 neu-raised rounded-3xl">
              <Package className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-xl">No service types</p>
            </div>
          )
        ) : (
          /* CLIENT SERVICES */
          filteredServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((service, i) => (
                <motion.div key={service.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="neu-raised rounded-2xl p-5 stat-card">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 dark:text-white truncate">{service.service_name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Building2 className="w-3 h-3" />{getClientName(service.client_id)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${service.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {service.status}
                    </span>
                  </div>
                  {service.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{service.description}</p>}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div><span className="text-slate-500">Price:</span> <span className="font-medium">{formatCurrency(service.price)}</span></div>
                    <div><span className="text-slate-500">Freq:</span> <span className="font-medium capitalize">{service.billing_frequency || 'N/A'}</span></div>
                    {service.service_day && <div><span className="text-slate-500">Day:</span> <span className="font-medium">{service.service_day}</span></div>}
                    {service.frequency_per_week && <div><span className="text-slate-500">Weekly:</span> <span className="font-medium">{service.frequency_per_week}x</span></div>}
                  </div>
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                    Started: {service.start_date ? new Date(service.start_date).toLocaleDateString() : 'N/A'}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 neu-raised rounded-3xl">
              <ClipboardList className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-xl mb-2">No services yet</p>
              <button onClick={() => { resetForm(); setShowForm(true) }} className="mt-4 neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white inline-flex items-center gap-2">
                <Plus className="w-5 h-5" /><span>Add First Service</span>
              </button>
            </div>
          )
        )}
      </main>

      {/* Add Service Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="neu-raised rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Add Client Service</h3>
                <button onClick={() => { setShowForm(false); resetForm() }} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-500 mb-1 block">Client *</label>
                    <select value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} className="w-full p-3 neu-inset rounded-xl" required>
                      <option value="">Select Client</option>
                      {clients?.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-500 mb-1 block">Service Type</label>
                    <select value={formData.service_type_id} onChange={(e) => handleServiceTypeSelect(e.target.value)} className="w-full p-3 neu-inset rounded-xl">
                      <option value="">Select Type (optional)</option>
                      {serviceTypes?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-500 mb-1 block">Service Name *</label>
                    <input type="text" value={formData.service_name} onChange={(e) => setFormData({...formData, service_name: e.target.value})} className="w-full p-3 neu-inset rounded-xl" required />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Price (ZAR)</label>
                    <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Billing Frequency</label>
                    <select value={formData.billing_frequency} onChange={(e) => setFormData({...formData, billing_frequency: e.target.value})} className="w-full p-3 neu-inset rounded-xl">
                      <option value="once_off">Once Off</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="bi_weekly">Bi-Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Start Date</label>
                    <input type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">End Date</label>
                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-500 mb-1 block">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="neu-raised neu-btn px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-700">Cancel</button>
                  <button type="submit" disabled={formLoading} className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
                    {formLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Check className="w-4 h-4" />}
                    Add Service
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
