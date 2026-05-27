import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Save } from 'lucide-react'

export default function ContactForm({ clients, onSubmit, onCancel, initialData = null, loading = false }) {
  const [formData, setFormData] = useState({
    client_id: initialData?.client_id || '',
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    job_title: initialData?.job_title || '',
    department: initialData?.department || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    mobile: initialData?.mobile || '',
    is_primary: initialData?.is_primary || false,
    is_decision_maker: initialData?.is_decision_maker || false,
    contact_type: initialData?.contact_type || 'operations',
    preferred_contact_method: initialData?.preferred_contact_method || 'email',
    preferred_contact_time: initialData?.preferred_contact_time || '',
    birthday: initialData?.birthday || '',
    notes: initialData?.notes || '',
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const inputClass = "w-full px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/50 transition-all"
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
  const selectClass = "w-full px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500/50 transition-all"

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="neu-raised rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          {initialData ? 'Edit Contact' : 'Add New Contact'}
        </h2>
        <button onClick={onCancel} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Client *</label>
            <select name="client_id" value={formData.client_id} onChange={handleChange} required className={selectClass}>
              <option value="">Select Client</option>
              {clients?.map(client => (
                <option key={client.id} value={client.id}>{client.company_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Contact Type</label>
            <select name="contact_type" value={formData.contact_type} onChange={handleChange} className={selectClass}>
              <option value="operations">Operations</option>
              <option value="billing">Billing</option>
              <option value="management">Management</option>
              <option value="technical">Technical</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>First Name *</label>
            <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Last Name *</label>
            <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Job Title</label>
            <input type="text" name="job_title" value={formData.job_title} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Department</label>
            <input type="text" name="department" value={formData.department} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Mobile</label>
            <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Preferred Contact Method</label>
            <select name="preferred_contact_method" value={formData.preferred_contact_method} onChange={handleChange} className={selectClass}>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Preferred Contact Time</label>
            <input type="text" name="preferred_contact_time" value={formData.preferred_contact_time} onChange={handleChange} className={inputClass} placeholder="e.g., Morning, After 2pm" />
          </div>
          <div>
            <label className={labelClass}>Birthday</label>
            <input type="date" name="birthday" value={formData.birthday} onChange={handleChange} className={inputClass} />
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex items-center">
            <input type="checkbox" name="is_primary" checked={formData.is_primary} onChange={handleChange} className="w-4 h-4 text-emerald-600 rounded" />
            <label className="ml-2 text-sm text-slate-700 dark:text-slate-300">Primary Contact</label>
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="is_decision_maker" checked={formData.is_decision_maker} onChange={handleChange} className="w-4 h-4 text-emerald-600 rounded" />
            <label className="ml-2 text-sm text-slate-700 dark:text-slate-300">Decision Maker</label>
          </div>
        </div>

        <div>
          <label className={labelClass}>Notes</label>
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className={inputClass}></textarea>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="submit" disabled={loading}
            className="neu-raised neu-btn px-6 py-3 rounded-2xl flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
            <Save className="w-5 h-5" />
            <span>{loading ? 'Saving...' : initialData ? 'Update Contact' : 'Add Contact'}</span>
          </button>
          <button type="button" onClick={onCancel}
            className="neu-raised neu-btn px-6 py-3 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  )
}
