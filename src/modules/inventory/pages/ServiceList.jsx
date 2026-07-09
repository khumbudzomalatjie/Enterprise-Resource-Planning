import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Search, Plus, Edit, ChevronRight, 
  Sun, Moon, Sparkles, Home, Building2,
  DollarSign, Tag
} from 'lucide-react'

// ═══════════════════════════════════════════════
// YOUR ACTUAL SERVICES FROM QUOTATIONS
// ═══════════════════════════════════════════════
const SERVICES = [
  { code: 'CLN-001', category: 'Once-Off Cleaning', name: '1 Bedroom - Once-Off', unit_price: 1304.35, unit: 'per_service' },
  { code: 'CLN-002', category: 'Once-Off Cleaning', name: '2 Bedroom - Once-Off', unit_price: 1739.13, unit: 'per_service' },
  { code: 'CLN-003', category: 'Once-Off Cleaning', name: '3 Bedroom - Once-Off', unit_price: 2347.83, unit: 'per_service' },
  { code: 'CLN-004', category: 'Once-Off Cleaning', name: '4 Bedroom - Once-Off', unit_price: 3043.48, unit: 'per_service' },
  { code: 'CLN-005', category: 'Once-Off Cleaning', name: '5 Bedroom - Once-Off', unit_price: 3478.26, unit: 'per_service' },
  { code: 'CLN-101', category: 'Monthly (1x Week)', name: '1 Bedroom - 1x Week', unit_price: 869.57, unit: 'per_month' },
  { code: 'CLN-102', category: 'Monthly (1x Week)', name: '2 Bedroom - 1x Week', unit_price: 1043.48, unit: 'per_month' },
  { code: 'CLN-103', category: 'Monthly (1x Week)', name: '3 Bedroom - 1x Week', unit_price: 1391.30, unit: 'per_month' },
  { code: 'CLN-104', category: 'Monthly (1x Week)', name: '4 Bedroom - 1x Week', unit_price: 1739.13, unit: 'per_month' },
  { code: 'CLN-105', category: 'Monthly (1x Week)', name: '5 Bedroom - 1x Week', unit_price: 2173.91, unit: 'per_month' },
  { code: 'CLN-201', category: 'Monthly (2x Week)', name: '1 Bedroom - 2x Week', unit_price: 1565.22, unit: 'per_month' },
  { code: 'CLN-202', category: 'Monthly (2x Week)', name: '2 Bedroom - 2x Week', unit_price: 1913.04, unit: 'per_month' },
  { code: 'CLN-203', category: 'Monthly (2x Week)', name: '3 Bedroom - 2x Week', unit_price: 2434.78, unit: 'per_month' },
  { code: 'CLN-204', category: 'Monthly (2x Week)', name: '4 Bedroom - 2x Week', unit_price: 3130.43, unit: 'per_month' },
  { code: 'CLN-205', category: 'Monthly (2x Week)', name: '5 Bedroom - 2x Week', unit_price: 3913.04, unit: 'per_month' },
  { code: 'CLN-301', category: 'Monthly (3x Week)', name: '1 Bedroom - 3x Week', unit_price: 2173.91, unit: 'per_month' },
  { code: 'CLN-302', category: 'Monthly (3x Week)', name: '2 Bedroom - 3x Week', unit_price: 2608.70, unit: 'per_month' },
  { code: 'CLN-303', category: 'Monthly (3x Week)', name: '3 Bedroom - 3x Week', unit_price: 3043.48, unit: 'per_month' },
  { code: 'CLN-304', category: 'Monthly (3x Week)', name: '4 Bedroom - 3x Week', unit_price: 3913.04, unit: 'per_month' },
  { code: 'CLN-305', category: 'Monthly (3x Week)', name: '5 Bedroom - 3x Week', unit_price: 4782.61, unit: 'per_month' },
]

export default function ServiceList() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [services, setServices] = useState(SERVICES)
  const [editingId, setEditingId] = useState(null)
  const [editPrice, setEditPrice] = useState('')

  const categories = [...new Set(SERVICES.map(s => s.category))]

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
    setEditingId(service.code)
    setEditPrice(service.unit_price.toString())
  }

  const savePrice = (code) => {
    const newPrice = parseFloat(editPrice)
    if (isNaN(newPrice) || newPrice <= 0) {
      toast.error('Please enter a valid price')
      return
    }
    setServices(prev => prev.map(s => s.code === code ? { ...s, unit_price: newPrice } : s))
    setEditingId(null)
    toast.success(`Price updated to ${formatCurrency(newPrice)}`)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditPrice('')
  }

  const getCategoryIcon = (cat) => {
    if (!cat) return <Tag className="w-4 h-4" />
    if (cat.includes('Once-Off')) return <Home className="w-4 h-4 text-blue-500" />
    if (cat.includes('Monthly')) return <Building2 className="w-4 h-4 text-purple-500" />
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
            <p className="text-slate-500 mt-1">{SERVICES.length} services • Used in jobs & quotations</p>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, code, or category..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Services by Category */}
        {(categoryFilter === 'all' ? categories : [categoryFilter]).map(cat => {
          const catServices = filteredServices.filter(s => s.category === cat)
          if (catServices.length === 0) return null
          return (
            <div key={cat} className="mb-8">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                {getCategoryIcon(cat)}
                {cat}
                <span className="text-sm font-normal text-slate-500">({catServices.length} services)</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {catServices.map(service => (
                  <motion.div key={service.code} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="neu-raised rounded-2xl p-5 transition-all hover:scale-[1.02]">
                    <p className="text-xs text-slate-400 mb-1">{service.code}</p>
                    <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-2">{service.name}</h3>
                    
                    {/* Price - Edit Mode or Display */}
                    {editingId === service.code ? (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-slate-500">R</span>
                        <input 
                          type="number" 
                          value={editPrice} 
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-28 p-2 neu-inset rounded-lg text-lg font-bold text-emerald-600"
                          step="0.01"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') savePrice(service.code)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-emerald-600 mb-1">{formatCurrency(service.unit_price)}</p>
                    )}
                    <p className="text-xs text-slate-500 mb-3">per {service.unit?.replace('_', ' ')}</p>

                    {/* Actions */}
                    {editingId === service.code ? (
                      <div className="flex gap-2">
                        <button onClick={() => savePrice(service.code)} className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
                          Save
                        </button>
                        <button onClick={cancelEdit} className="flex-1 py-2 rounded-xl bg-slate-400 text-white text-sm font-medium hover:bg-slate-500">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(service)} className="w-full py-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-medium flex items-center justify-center gap-1">
                        <Edit className="w-4 h-4" /> Change Price
                      </button>
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
            <p className="text-slate-500 text-lg">No services match your search</p>
          </div>
        )}
      </main>
    </div>
  )
}
