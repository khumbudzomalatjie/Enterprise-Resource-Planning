import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { Settings, Plus, Trash2, Save, ArrowLeft, Sun, Moon, Sparkles } from 'lucide-react'

export default function PayrollSettings() {
  const { isDark, toggleTheme } = useThemeStore()
  const [earningTypes, setEarningTypes] = useState([])
  const [deductionTypes, setDeductionTypes] = useState([])
  const [showAddEarning, setShowAddEarning] = useState(false)
  const [showAddDeduction, setShowAddDeduction] = useState(false)
  const [newEarning, setNewEarning] = useState({ name: '', code: '', category: 'fixed', is_taxable: true })
  const [newDeduction, setNewDeduction] = useState({ name: '', code: '', category: 'statutory', is_pretax: false })

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    const { data: earn } = await supabase.from('earning_types').select('*').order('display_order')
    setEarningTypes(earn || [])
    const { data: deduct } = await supabase.from('deduction_types').select('*').order('display_order')
    setDeductionTypes(deduct || [])
  }

  const handleAddEarning = async () => {
    if (!newEarning.name) { toast.error('Name is required'); return }
    await supabase.from('earning_types').insert([newEarning])
    toast.success('Earning type added!')
    setShowAddEarning(false)
    setNewEarning({ name: '', code: '', category: 'fixed', is_taxable: true })
    loadSettings()
  }

  const handleAddDeduction = async () => {
    if (!newDeduction.name) { toast.error('Name is required'); return }
    await supabase.from('deduction_types').insert([newDeduction])
    toast.success('Deduction type added!')
    setShowAddDeduction(false)
    setNewDeduction({ name: '', code: '', category: 'statutory', is_pretax: false })
    loadSettings()
  }

  const handleDeleteEarning = async (id) => {
    if (window.confirm('Delete this earning type?')) {
      await supabase.from('earning_types').delete().eq('id', id)
      toast.success('Deleted')
      loadSettings()
    }
  }

  const handleDeleteDeduction = async (id) => {
    if (window.confirm('Delete this deduction type?')) {
      await supabase.from('deduction_types').delete().eq('id', id)
      toast.success('Deleted')
      loadSettings()
    }
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/payroll" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Payroll</span>
        </Link>

        <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-emerald-600" />Payroll Settings
        </h1>

        {/* Earning Types */}
        <div className="neu-raised rounded-3xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Earning Types ({earningTypes.length})</h2>
            <button onClick={() => setShowAddEarning(!showAddEarning)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {showAddEarning && (
            <div className="flex gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
              <input type="text" value={newEarning.name} onChange={e => setNewEarning({...newEarning, name: e.target.value})} placeholder="Name" className="flex-1 p-2 neu-inset rounded-lg text-sm" />
              <input type="text" value={newEarning.code} onChange={e => setNewEarning({...newEarning, code: e.target.value})} placeholder="Code" className="w-24 p-2 neu-inset rounded-lg text-sm" />
              <select value={newEarning.category} onChange={e => setNewEarning({...newEarning, category: e.target.value})} className="p-2 neu-inset rounded-lg text-sm">
                <option value="fixed">Fixed</option><option value="variable">Variable</option><option value="allowance">Allowance</option><option value="overtime">Overtime</option><option value="bonus">Bonus</option>
              </select>
              <button onClick={handleAddEarning} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">Save</button>
            </div>
          )}
          <div className="space-y-2">
            {earningTypes.map(et => (
              <div key={et.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-medium text-sm">{et.name} <span className="text-xs text-slate-400">({et.code})</span></p>
                  <p className="text-xs text-slate-500 capitalize">{et.category} · {et.is_taxable ? 'Taxable' : 'Non-taxable'}</p>
                </div>
                <button onClick={() => handleDeleteEarning(et.id)} className="p-1 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Deduction Types */}
        <div className="neu-raised rounded-3xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Deduction Types ({deductionTypes.length})</h2>
            <button onClick={() => setShowAddDeduction(!showAddDeduction)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {showAddDeduction && (
            <div className="flex gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
              <input type="text" value={newDeduction.name} onChange={e => setNewDeduction({...newDeduction, name: e.target.value})} placeholder="Name" className="flex-1 p-2 neu-inset rounded-lg text-sm" />
              <input type="text" value={newDeduction.code} onChange={e => setNewDeduction({...newDeduction, code: e.target.value})} placeholder="Code" className="w-24 p-2 neu-inset rounded-lg text-sm" />
              <select value={newDeduction.category} onChange={e => setNewDeduction({...newDeduction, category: e.target.value})} className="p-2 neu-inset rounded-lg text-sm">
                <option value="statutory">Statutory</option><option value="company">Company</option><option value="employee">Employee</option><option value="union">Union</option><option value="court_order">Court Order</option>
              </select>
              <button onClick={handleAddDeduction} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Save</button>
            </div>
          )}
          <div className="space-y-2">
            {deductionTypes.map(dt => (
              <div key={dt.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-medium text-sm">{dt.name} <span className="text-xs text-slate-400">({dt.code})</span></p>
                  <p className="text-xs text-slate-500 capitalize">{dt.category} · {dt.is_pretax ? 'Pre-tax' : 'Post-tax'}</p>
                </div>
                <button onClick={() => handleDeleteDeduction(dt.id)} className="p-1 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
