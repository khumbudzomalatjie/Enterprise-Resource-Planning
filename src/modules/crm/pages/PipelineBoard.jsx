import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useCRMStore from '../store/crmStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  TrendingUp, Plus, Search, ChevronRight,
  Sun, Moon, Sparkles, X, Check, Building2
} from 'lucide-react'

const STAGES = [
  { id: 'lead', label: 'Lead', color: 'bg-slate-500', border: 'border-l-slate-500' },
  { id: 'qualified', label: 'Qualified', color: 'bg-blue-500', border: 'border-l-blue-500' },
  { id: 'proposal_sent', label: 'Proposal Sent', color: 'bg-amber-500', border: 'border-l-amber-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-purple-500', border: 'border-l-purple-500' },
  { id: 'contract_sent', label: 'Contract Sent', color: 'bg-indigo-500', border: 'border-l-indigo-500' },
  { id: 'won', label: 'Won', color: 'bg-emerald-500', border: 'border-l-emerald-500' },
  { id: 'lost', label: 'Lost', color: 'bg-red-500', border: 'border-l-red-500' },
]

export default function PipelineBoard() {
  const { pipeline, fetchPipeline, clients, fetchClients, createPipelineItem, updatePipelineItem, loading } = useCRMStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const [formData, setFormData] = useState({
    client_id: '', opportunity_name: '', description: '',
    estimated_value: 0, probability_percentage: 50,
    stage: 'lead', priority: 'medium',
    expected_close_date: '', competitors: '', notes: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    await Promise.all([fetchPipeline(), fetchClients({ status: 'active' })])
  }

  const resetForm = () => {
    setFormData({
      client_id: '', opportunity_name: '', description: '',
      estimated_value: 0, probability_percentage: 50,
      stage: 'lead', priority: 'medium',
      expected_close_date: '', competitors: '', notes: ''
    })
  }

  const openNewForm = () => { resetForm(); setEditingItem(null); setShowForm(true) }

  const openEditForm = (item) => {
    setFormData({
      client_id: item.client_id || '',
      opportunity_name: item.opportunity_name || '',
      description: item.description || '',
      estimated_value: item.estimated_value || 0,
      probability_percentage: item.probability_percentage || 50,
      stage: item.stage || 'lead',
      priority: item.priority || 'medium',
      expected_close_date: item.expected_close_date || '',
      competitors: item.competitors || '',
      notes: item.notes || ''
    })
    setEditingItem(item)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.opportunity_name || !formData.client_id) {
      toast.error('Client and opportunity name required')
      return
    }

    setFormLoading(true)
    try {
      let result
      if (editingItem) {
        result = await updatePipelineItem(editingItem.id, formData)
        if (result.success) toast.success('Deal updated!')
      } else {
        result = await createPipelineItem(formData)
        if (result.success) toast.success('Deal created!')
      }
      if (result.success) {
        setShowForm(false)
        resetForm()
        setEditingItem(null)
        await fetchPipeline()
      } else {
        toast.error(result.error || 'Failed')
      }
    } catch (err) {
      toast.error('Error saving deal')
    } finally {
      setFormLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0 }).format(amount || 0)
  }

  const grouped = STAGES.reduce((acc, stage) => {
    acc[stage.id] = (pipeline || []).filter(item => {
      if (item.stage !== stage.id) return false
      if (search) {
        const s = search.toLowerCase()
        return (item.opportunity_name || '').toLowerCase().includes(s) ||
               (item.clients?.company_name || '').toLowerCase().includes(s)
      }
      return true
    })
    return acc
  }, {})

  const totalValue = (pipeline || []).reduce((sum, i) => sum + (i.estimated_value || 0), 0)
  const wonValue = (pipeline || []).filter(i => i.stage === 'won').reduce((sum, i) => sum + (i.estimated_value || 0), 0)

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
          <span className="text-slate-800 dark:text-white font-medium">Sales Pipeline</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-emerald-600" />Sales Pipeline
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {(pipeline || []).length} deals · Total: {formatCurrency(totalValue)} · Won: {formatCurrency(wonValue)}
            </p>
          </div>
          <button onClick={openNewForm} className="neu-raised neu-btn px-6 py-3 rounded-2xl flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
            <Plus className="w-5 h-5" /><span>Add Deal</span>
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deals or clients..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
        </motion.div>

        <div className="overflow-x-auto custom-scrollbar pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => (
              <div key={stage.id} className="w-72 flex-shrink-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${stage.color}`}></span>
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">{stage.label}</h3>
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                    {grouped[stage.id]?.length || 0}
                  </span>
                </div>

                <div className="space-y-3 min-h-[200px]">
                  {(grouped[stage.id] || []).map(item => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`neu-raised rounded-xl p-4 border-l-4 ${stage.border} cursor-pointer hover:scale-[1.02] transition-transform`} onClick={() => openEditForm(item)}>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm text-slate-800 dark:text-white line-clamp-2 flex-1">{item.opportunity_name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${item.priority === 'critical' ? 'bg-red-100 text-red-700' : item.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                        <Building2 className="w-3 h-3" />
                        {item.clients?.company_name || 'No client'}
                      </p>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-bold text-emerald-600">{formatCurrency(item.estimated_value)}</span>
                        <span className="text-xs text-slate-500">{item.probability_percentage || 50}%</span>
                      </div>
                    </motion.div>
                  ))}

                  {(grouped[stage.id] || []).length === 0 && (
                    <div className="neu-inset rounded-xl p-4 text-center text-xs text-slate-400 italic">No deals</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="neu-raised rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingItem ? 'Edit Deal' : 'Add New Deal'}</h3>
                <button onClick={() => { setShowForm(false); resetForm(); setEditingItem(null) }} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
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
                    <label className="text-sm text-slate-500 mb-1 block">Opportunity Name *</label>
                    <input type="text" value={formData.opportunity_name} onChange={(e) => setFormData({...formData, opportunity_name: e.target.value})} placeholder="e.g., Office Cleaning Contract Q1" className="w-full p-3 neu-inset rounded-xl" required />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Estimated Value (ZAR)</label>
                    <input type="number" value={formData.estimated_value} onChange={(e) => setFormData({...formData, estimated_value: parseFloat(e.target.value) || 0})} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Probability %</label>
                    <input type="number" min="0" max="100" value={formData.probability_percentage} onChange={(e) => setFormData({...formData, probability_percentage: parseInt(e.target.value) || 0})} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Stage</label>
                    <select value={formData.stage} onChange={(e) => setFormData({...formData, stage: e.target.value})} className="w-full p-3 neu-inset rounded-xl">
                      {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Priority</label>
                    <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full p-3 neu-inset rounded-xl">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Expected Close Date</label>
                    <input type="date" value={formData.expected_close_date} onChange={(e) => setFormData({...formData, expected_close_date: e.target.value})} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Competitors</label>
                    <input type="text" value={formData.competitors} onChange={(e) => setFormData({...formData, competitors: e.target.value})} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-500 mb-1 block">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-500 mb-1 block">Notes</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); setEditingItem(null) }} className="neu-raised neu-btn px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-700">Cancel</button>
                  <button type="submit" disabled={formLoading} className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
                    {formLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Check className="w-4 h-4" />}
                    {editingItem ? 'Update' : 'Create'}
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
