import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { Save, ArrowLeft, ChevronRight, DollarSign, Sun, Moon, Sparkles } from 'lucide-react'

export default function ServiceForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const source = searchParams.get('source') || 'products_services'
  const isEditing = !!id
  
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Cleaning',
    unit_price: 0,
    default_price: 0,
    unit: 'per_service',
    pricing_unit: 'per_service',
    is_active: true
  })

  useEffect(() => {
    if (isEditing && id) {
      loadService()
    }
  }, [id])

  const loadService = async () => {
    try {
      const table = source === 'products_services' ? 'products_services' : 'service_types'
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
      if (error) throw error
      if (data) {
        setForm({
          name: data.name || '',
          description: data.description || '',
          category: data.category || 'Cleaning',
          unit_price: data.unit_price || data.default_price || 0,
          default_price: data.default_price || data.unit_price || 0,
          unit: data.unit || data.pricing_unit || 'per_service',
          pricing_unit: data.pricing_unit || data.unit || 'per_service',
          is_active: data.is_active !== false
        })
      }
    } catch (err) {
      toast.error('Failed to load service')
      navigate('/inventory/services')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name) { toast.error('Service name is required'); return }
    
    setSaving(true)
    try {
      const table = source === 'products_services' ? 'products_services' : 'service_types'
      
      const data = {
        name: form.name,
        description: form.description,
        category: form.category,
        is_active: form.is_active
      }

      if (table === 'products_services') {
        data.unit_price = parseFloat(form.unit_price) || 0
        data.unit = form.unit
      } else {
        data.default_price = parseFloat(form.default_price) || 0
        data.pricing_unit = form.pricing_unit
      }

      let result
      if (isEditing) {
        result = await supabase.from(table).update(data).eq('id', id).select().single()
      } else {
        result = await supabase.from(table).insert([data]).select().single()
      }

      if (result.error) throw result.error

      toast.success(isEditing ? 'Service updated!' : 'Service created!')
      navigate('/inventory/services')
    } catch (err) {
      toast.error('Failed to save: ' + err.message)
    }
    setSaving(false)
  }

  const categories = ['Cleaning', 'Maintenance', 'Sanitation', 'Pest Control', 'Waste Management', 'Other']
  const units = ['per_service', 'per_hour', 'per_sqm', 'per_month', 'per_bedroom', 'per_day', 'fixed', 'each']

  const price = form.unit_price || form.default_price || 0

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/inventory" className="text-slate-500 hover:text-emerald-600">Inventory</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/inventory/services" className="text-slate-500 hover:text-emerald-600">Services</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">{isEditing ? 'Edit' : 'Add'} Service</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-8">
            <DollarSign className="w-8 h-8 text-emerald-600" />
            {isEditing ? 'Edit Service' : 'Add New Service'}
          </h1>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="neu-raised rounded-3xl p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-500">Service Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} 
                    placeholder="e.g., 1 Bedroom Apartment Cleaning" 
                    className="w-full p-4 neu-inset rounded-xl mt-1 text-lg font-semibold" required />
                </div>
                <div>
                  <label className="text-sm text-slate-500">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} 
                    placeholder="Describe what this service includes..." rows={3}
                    className="w-full p-4 neu-inset rounded-xl mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-500">Category</label>
                    <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} 
                      className="w-full p-4 neu-inset rounded-xl mt-1">
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Pricing Unit</label>
                    <select value={form.unit || form.pricing_unit} onChange={(e) => setForm({...form, unit: e.target.value, pricing_unit: e.target.value})} 
                      className="w-full p-4 neu-inset rounded-xl mt-1">
                      {units.map(u => <option key={u} value={u}>{u.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-600" />Pricing</h3>
              <div>
                <label className="text-sm text-slate-500">Price (ZAR) *</label>
                <input type="number" value={price} onChange={(e) => setForm({...form, unit_price: parseFloat(e.target.value) || 0, default_price: parseFloat(e.target.value) || 0})} 
                  placeholder="0.00" step="0.01" min="0"
                  className="w-full p-4 neu-inset rounded-xl mt-1 text-2xl font-bold text-emerald-600" required />
                <p className="text-xs text-slate-400 mt-1">
                  {formatCurrency(price)} per {form.unit || form.pricing_unit || 'unit'}
                </p>
              </div>
            </div>

            <div className="flex gap-4 justify-end">
              <button type="button" onClick={() => navigate('/inventory/services')} 
                className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-slate-600 text-white">Cancel</button>
              <button type="submit" disabled={saving}
                className="neu-raised neu-btn px-8 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 text-lg font-semibold">
                <Save className="w-5 h-5" />{saving ? 'Saving...' : isEditing ? 'Update Service' : 'Add Service'}
              </button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  )
}

// Helper function for currency display
function formatCurrency(amount) {
  if (!amount && amount !== 0) return 'R 0.00'
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}
