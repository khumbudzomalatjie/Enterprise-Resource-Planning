import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useTenderStore from '../store/tenderStore'
import useThemeStore from '../../../store/themeStore'
import useCRMStore from '../../crm/store/crmStore'
import toast from 'react-hot-toast'
import { 
  ArrowLeft, Save, Plus, Trash2, 
  Building2, DollarSign, FileText, CheckCircle2, ChevronRight
} from 'lucide-react'

export default function CreateTender() {
  const { createTender } = useTenderStore()
  const { clients } = useCRMStore()
  const { isDark } = useThemeStore()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('details')
  const [saving, setSaving] = useState(false)

  // ── FORM STATE ──
  const [form, setForm] = useState({
    title: '', reference_number: '', client_id: '', client_name: '',
    contact_person: '', contact_email: '', contact_phone: '',
    description: '', service_category: '',
    publication_date: '', site_briefing_date: '', site_briefing_mandatory: false,
    clarification_deadline: '', closing_date: '', closing_time: '',
    commencement_date: '', end_date: '',
    submission_method: 'Email', estimated_value: 0, notes: '', status: 'draft'
  })

  // ── PRICING STATE (BoQ) ──
  const [pricing, setPricing] = useState([
    { description: '', quantity: 1, unit_of_measure: 'Month', labour_cost: 0, material_cost: 0, equipment_cost: 0, transport_cost: 0, overhead_cost: 0, profit_margin_percent: 20, vat_percent: 15 }
  ])

  // ── COMPLIANCE STATE ──
  const [compliance, setCompliance] = useState([
    { requirement_name: 'CIPC Registration Documents', is_mandatory: true, status: 'pending' },
    { requirement_name: 'SARS Tax Compliance Status PIN', is_mandatory: true, status: 'pending' },
    { requirement_name: 'CSD Registration Report', is_mandatory: true, status: 'pending' },
    { requirement_name: 'B-BBEE Affidavit/Certificate', is_mandatory: true, status: 'pending' },
  ])

  // ── HANDLERS ──
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleClientSelect = (e) => {
    const cid = e.target.value
    const client = clients.find(c => c.id === cid)
    setForm(prev => ({
      ...prev,
      client_id: cid,
      client_name: client ? (client.company_name || `${client.first_name} ${client.last_name}`) : ''
    }))
  }

  // ── PRICING CALCULATIONS ──
  const calcUnitPrice = (item) => {
    const directCost = Number(item.labour_cost) + Number(item.material_cost) + Number(item.equipment_cost) + Number(item.transport_cost) + Number(item.overhead_cost)
    const margin = directCost * (Number(item.profit_margin_percent) / 100)
    return directCost + margin
  }

  const calcTotal = (item) => {
    return calcUnitPrice(item) * Number(item.quantity)
  }

  const updatePricing = (index, field, value) => {
    const newPricing = [...pricing]
    newPricing[index][field] = value
    setPricing(newPricing)
  }

  const addPricingRow = () => {
    setPricing([...pricing, { description: '', quantity: 1, unit_of_measure: 'Month', labour_cost: 0, material_cost: 0, equipment_cost: 0, transport_cost: 0, overhead_cost: 0, profit_margin_percent: 20, vat_percent: 15 }])
  }

  const removePricingRow = (index) => {
    if (pricing.length === 1) return
    setPricing(pricing.filter((_, i) => i !== index))
  }

  // ── SAVE ALL ──
  const handleSave = async () => {
    if (!form.title) { toast.error('Tender Title is required'); return }
    
    setSaving(true)
    
    // 1. Calculate total estimated value from pricing
    const totalEstimated = pricing.reduce((sum, item) => sum + calcTotal(item), 0)
    const finalForm = { ...form, estimated_value: totalEstimated }

    // 2. Create the Tender
    const result = await createTender(finalForm)
    
    if (result.success) {
      // 3. We will save pricing and compliance in the next phase (TenderDetails)
      // For now, navigate to the detail page
      toast.success('Tender created! Now add pricing and documents.')
      navigate(`/tenders/${result.data.id}`)
    } else {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'details', label: '1. Details', icon: FileText },
    { id: 'costing', label: '2. Costing (BoQ)', icon: DollarSign },
    { id: 'compliance', label: '3. Compliance', icon: CheckCircle2 },
  ]

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 font-['Inter'] ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/tenders" className="text-slate-500 hover:text-emerald-600">Tenders</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="font-medium">Create New</span>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Create Tender / RFQ</h1>
            <p className="text-slate-500 text-sm mt-1">Capture details, build your BoQ, and prepare compliance docs.</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
            <Save className="w-5 h-5" /> {saving ? 'Saving...' : 'Save Tender'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                activeTab === tab.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: DETAILS */}
        {activeTab === 'details' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="neu-raised rounded-3xl p-6 space-y-4 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-semibold mb-2">Tender Information</h2>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Tender Title *</label>
                <input name="title" value={form.title} onChange={handleChange} className="w-full p-3 neu-inset rounded-xl" placeholder="e.g. Office Cleaning Services 2025" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Reference No.</label>
                  <input name="reference_number" value={form.reference_number} onChange={handleChange} className="w-full p-3 neu-inset rounded-xl" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Service Category</label>
                  <input name="service_category" value={form.service_category} onChange={handleChange} className="w-full p-3 neu-inset rounded-xl" placeholder="e.g. Deep Cleaning" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Client / Organisation</label>
                <select value={form.client_id} onChange={handleClientSelect} className="w-full p-3 neu-inset rounded-xl mb-2">
                  <option value="">-- Select Existing Client --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
                <input name="client_name" value={form.client_name} onChange={handleChange} placeholder="Or type client name..." className="w-full p-3 neu-inset rounded-xl" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full p-3 neu-inset rounded-xl" placeholder="Scope of work..." />
              </div>
            </div>

            <div className="neu-raised rounded-3xl p-6 space-y-4 bg-white dark:bg-slate-800">
              <h2 className="text-lg font-semibold mb-2">Dates & Deadlines</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Closing Date</label>
                  <input type="date" name="closing_date" value={form.closing_date} onChange={handleChange} className="w-full p-3 neu-inset rounded-xl" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Closing Time</label>
                  <input type="time" name="closing_time" value={form.closing_time} onChange={handleChange} className="w-full p-3 neu-inset rounded-xl" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Site Briefing Date</label>
                  <input type="date" name="site_briefing_date" value={form.site_briefing_date} onChange={handleChange} className="w-full p-3 neu-inset rounded-xl" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Clarification Deadline</label>
                  <input type="date" name="clarification_deadline" value={form.clarification_deadline} onChange={handleChange} className="w-full p-3 neu-inset rounded-xl" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" name="site_briefing_mandatory" checked={form.site_briefing_mandatory} onChange={handleChange} className="w-4 h-4" />
                <label className="text-sm">Site briefing attendance is mandatory</label>
              </div>
              <h2 className="text-lg font-semibold mb-2 pt-4 border-t border-slate-200 dark:border-slate-700">Contact Person</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><input name="contact_person" value={form.contact_person} onChange={handleChange} placeholder="Name" className="w-full p-3 neu-inset rounded-xl" /></div>
                <div><input name="contact_phone" value={form.contact_phone} onChange={handleChange} placeholder="Phone" className="w-full p-3 neu-inset rounded-xl" /></div>
                <div className="col-span-2"><input name="contact_email" value={form.contact_email} onChange={handleChange} placeholder="Email" className="w-full p-3 neu-inset rounded-xl" /></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: COSTING */}
        {activeTab === 'costing' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 bg-white dark:bg-slate-800">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">Pricing & Bill of Quantities</h2>
                <p className="text-sm text-slate-500">Build your pricing schedule. Profit and Unit Price calculate automatically.</p>
              </div>
              <button onClick={addPricingRow} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-semibold flex items-center gap-1 text-sm">
                <Plus className="w-4 h-4" /> Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700 text-left">
                    <th className="p-2 rounded-tl-lg">Description</th>
                    <th className="p-2 w-20">Qty</th>
                    <th className="p-2 w-28">Labour (R)</th>
                    <th className="p-2 w-28">Materials (R)</th>
                    <th className="p-2 w-28">Equipment (R)</th>
                    <th className="p-2 w-28">Overhead (R)</th>
                    <th className="p-2 w-20">Margin %</th>
                    <th className="p-2 w-32 text-right bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">Unit Price</th>
                    <th className="p-2 w-32 text-right bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300">Total</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {pricing.map((item, i) => (
                    <tr key={i} className="border-b dark:border-slate-700">
                      <td className="p-2"><input value={item.description} onChange={e => updatePricing(i, 'description', e.target.value)} placeholder="e.g. Daily office cleaning" className="w-full p-2 border rounded" /></td>
                      <td className="p-2"><input type="number" value={item.quantity} onChange={e => updatePricing(i, 'quantity', e.target.value)} className="w-full p-2 border rounded" /></td>
                      <td className="p-2"><input type="number" value={item.labour_cost} onChange={e => updatePricing(i, 'labour_cost', e.target.value)} className="w-full p-2 border rounded" /></td>
                      <td className="p-2"><input type="number" value={item.material_cost} onChange={e => updatePricing(i, 'material_cost', e.target.value)} className="w-full p-2 border rounded" /></td>
                      <td className="p-2"><input type="number" value={item.equipment_cost} onChange={e => updatePricing(i, 'equipment_cost', e.target.value)} className="w-full p-2 border rounded" /></td>
                      <td className="p-2"><input type="number" value={item.overhead_cost} onChange={e => updatePricing(i, 'overhead_cost', e.target.value)} className="w-full p-2 border rounded" /></td>
                      <td className="p-2"><input type="number" value={item.profit_margin_percent} onChange={e => updatePricing(i, 'profit_margin_percent', e.target.value)} className="w-full p-2 border rounded" /></td>
                      <td className="p-2 text-right font-mono bg-blue-50 dark:bg-blue-900/20 font-bold text-blue-700">R {calcUnitPrice(item).toFixed(2)}</td>
                      <td className="p-2 text-right font-mono bg-emerald-50 dark:bg-emerald-900/20 font-bold text-emerald-700">R {calcTotal(item).toFixed(2)}</td>
                      <td className="p-2 text-center">
                        <button onClick={() => removePricingRow(i)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl w-72">
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">Subtotal:</span><span>R {pricing.reduce((s, i) => s + calcTotal(i), 0).toFixed(2)}</span></div>
                <div className="flex justify-between text-sm mb-2"><span className="text-slate-500">VAT (15%):</span><span>R {(pricing.reduce((s, i) => s + calcTotal(i), 0) * 0.15).toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t dark:border-slate-600"><span>Grand Total:</span><span className="text-emerald-600">R {(pricing.reduce((s, i) => s + calcTotal(i), 0) * 1.15).toFixed(2)}</span></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: COMPLIANCE */}
        {activeTab === 'compliance' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 bg-white dark:bg-slate-800">
            <h2 className="text-xl font-bold mb-2">Compliance Checklist</h2>
            <p className="text-sm text-slate-500 mb-4">Tender returnable documents. You must upload these before submission.</p>
            <div className="space-y-3">
              {compliance.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={item.is_mandatory} onChange={e => {
                      const newC = [...compliance]; newC[i].is_mandatory = e.target.checked; setCompliance(newC)
                    }} className="w-4 h-4" />
                    <input value={item.requirement_name} onChange={e => {
                      const newC = [...compliance]; newC[i].requirement_name = e.target.value; setCompliance(newC)
                    }} className="bg-transparent border-b border-slate-300 dark:border-slate-600 focus:outline-none focus:border-emerald-500 w-64 font-medium" />
                    <span className="text-xs text-slate-500">(Required)</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <select value={item.status} onChange={e => {
                      const newC = [...compliance]; newC[i].status = e.target.value; setCompliance(newC)
                    }} className="p-2 border rounded-lg text-sm bg-white dark:bg-slate-800">
                      <option value="pending">Pending Upload</option>
                      <option value="uploaded">Uploaded</option>
                      <option value="verified">Verified</option>
                    </select>
                    <button onClick={() => {
                      const newC = compliance.filter((_, idx) => idx !== i); setCompliance(newC)
                    }} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setCompliance([...compliance, { requirement_name: '', is_mandatory: true, status: 'pending' }])} className="mt-4 px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:text-emerald-600 hover:border-emerald-300 w-full flex justify-center items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Custom Requirement
            </button>
          </motion.div>
        )}
      </main>
    </div>
  )
}
