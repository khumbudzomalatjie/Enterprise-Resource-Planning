import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  X, Save, Plus, Trash2, Briefcase, MapPin, Calendar,
  Clock, DollarSign, Loader2, AlertCircle, ListPlus,
  Tag, ChevronDown
} from 'lucide-react'

const emptyItem = () => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  description: '',
  quantity: 1,
  unit: 'service',
  unit_price: 0
})

export default function JobEditorModal({ job, services, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    site_address: '',
    site_city: '',
    priority: 'medium',
    notes: ''
  })
  const [schedule, setSchedule] = useState({
    scheduled_date: '',
    scheduled_start_time: '',
    scheduled_end_time: ''
  })
  const [items, setItems] = useState([])
  const [originalItemIds, setOriginalItemIds] = useState([])
  const [showServicePicker, setShowServicePicker] = useState(false)

  useEffect(() => {
    if (!job) return
    setForm({
      title: job.title || '',
      description: job.description || '',
      site_address: job.site_address || '',
      site_city: job.site_city || '',
      priority: job.priority || 'medium',
      notes: job.notes || ''
    })
    setSchedule({
      scheduled_date: job.scheduled_date || '',
      scheduled_start_time: job.scheduled_start_time?.slice(0, 5) || '',
      scheduled_end_time: job.scheduled_end_time?.slice(0, 5) || ''
    })
    const loadedItems = (job.job_items || []).map(it => ({
      id: it.id,
      description: it.description || '',
      quantity: it.quantity || 1,
      unit: it.unit || 'service',
      unit_price: it.unit_price || 0
    }))
    setItems(loadedItems)
    setOriginalItemIds(loadedItems.map(i => i.id))
  }, [job])

  const formatCurrency = (n) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n || 0)

  const lineTotal = (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0)
  const taxAmount = subtotal * 0.15
  const totalAmount = subtotal + taxAmount

  const addBlankItem = () => {
    setItems(prev => [...prev, emptyItem()])
    setShowServicePicker(false)
  }

  const addServiceFromCatalog = (service) => {
    setItems(prev => [...prev, {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      description: service.name,
      quantity: 1,
      unit: service.unit || 'service',
      unit_price: service.price || 0
    }])
    setShowServicePicker(false)
  }

  const updateItem = (idx, patch) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  const removeItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error('Job title is required')
      return
    }
    onSave({
      jobData: form,
      schedule: {
        scheduled_date: schedule.scheduled_date || null,
        scheduled_start_time: schedule.scheduled_start_time || null,
        scheduled_end_time: schedule.scheduled_end_time || null
      },
      items,
      originalItemIds
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full my-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 rounded-t-3xl border-b border-slate-200 dark:border-slate-700 p-5 z-10 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-600" />
              Edit Job — {job?.job_number}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {job?.clients?.company_name || 'No client'}
              {job?.job_categories?.name && <> · {job.job_categories.name}</>}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* ─── Section 1: Job Details ─── */}
          <section>
            <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" /> Job Details
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
                  placeholder="Job title"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 resize-none"
                  placeholder="Job description"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Site Address
                  </label>
                  <input
                    value={form.site_address}
                    onChange={e => setForm({ ...form, site_address: e.target.value })}
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">City</label>
                  <input
                    value={form.site_city}
                    onChange={e => setForm({ ...form, site_city: e.target.value })}
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
                    placeholder="City"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Internal Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 resize-none"
                  placeholder="Notes visible to staff only"
                />
              </div>
            </div>
          </section>

          {/* ─── Section 2: Services & Items ─── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-2">
                <ListPlus className="w-4 h-4" /> Services & Items ({items.length})
              </h4>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowServicePicker(v => !v)}
                  className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-emerald-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Service
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showServicePicker && (
                  <div className="absolute right-0 top-full mt-2 w-72 max-h-72 overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-20">
                    <div className="p-2">
                      <button
                        onClick={addBlankItem}
                        className="w-full text-left p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Custom line item
                      </button>
                      <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                      {(services || []).length === 0 && (
                        <p className="p-3 text-xs text-slate-400 text-center">No services found</p>
                      )}
                      {(services || []).map(s => (
                        <button
                          key={s.id}
                          onClick={() => addServiceFromCatalog(s)}
                          className="w-full text-left p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-sm"
                        >
                          <p className="font-medium text-slate-800 dark:text-white">{s.name}</p>
                          <p className="text-xs text-slate-500">{formatCurrency(s.price)} / {s.unit}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="neu-inset rounded-2xl p-3 space-y-2">
              {items.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-6">
                  No services added yet. Click <strong>Add Service</strong> above.
                </p>
              )}
              {items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-700/30 rounded-xl p-2">
                  <input
                    value={item.description}
                    onChange={e => updateItem(idx, { description: e.target.value })}
                    placeholder="Description"
                    className="col-span-12 sm:col-span-5 p-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white border border-transparent focus:border-emerald-400 outline-none"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    min="0"
                    step="0.5"
                    onChange={e => updateItem(idx, { quantity: e.target.value })}
                    placeholder="Qty"
                    className="col-span-4 sm:col-span-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white border border-transparent focus:border-emerald-400 outline-none"
                  />
                  <input
                    type="number"
                    value={item.unit_price}
                    min="0"
                    step="0.01"
                    onChange={e => updateItem(idx, { unit_price: e.target.value })}
                    placeholder="Unit price"
                    className="col-span-4 sm:col-span-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white border border-transparent focus:border-emerald-400 outline-none"
                  />
                  <span className="col-span-3 sm:col-span-2 text-sm font-semibold text-slate-700 dark:text-slate-300 text-right">
                    {formatCurrency(lineTotal(item))}
                  </span>
                  <button
                    onClick={() => removeItem(idx)}
                    className="col-span-1 p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-center"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-3 flex justify-end">
              <div className="w-full sm:w-64 space-y-1 text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>VAT (15%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ─── Section 3: Schedule ─── */}
          <section>
            <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Schedule
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Date</label>
                <input
                  type="date"
                  value={schedule.scheduled_date}
                  onChange={e => setSchedule({ ...schedule, scheduled_date: e.target.value })}
                  className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Start Time
                </label>
                <input
                  type="time"
                  value={schedule.scheduled_start_time}
                  onChange={e => setSchedule({ ...schedule, scheduled_start_time: e.target.value })}
                  className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                  <Clock className="w-3 h-3" /> End Time
                </label>
                <input
                  type="time"
                  value={schedule.scheduled_end_time}
                  onChange={e => setSchedule({ ...schedule, scheduled_end_time: e.target.value })}
                  className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>
          </section>

          {/* Info banner */}
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              Saving will update the job row, sync all services (add/remove/edit), recalculate the quoted amount
              from services subtotal, and log this change to job history.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-800 rounded-b-3xl border-t border-slate-200 dark:border-slate-700 p-5 flex justify-end gap-2 z-10">
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
