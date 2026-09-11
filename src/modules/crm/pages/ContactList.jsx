import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useCRMStore from '../store/crmStore'
import useThemeStore from '../../../store/themeStore'
import { crmApi } from '../api/crmApi'
import toast from 'react-hot-toast'
import { 
  Search, Users, Plus, Phone, Mail, 
  ChevronRight, Sun, Moon, Sparkles, Edit, Trash2, X,
  Building2, Check
} from 'lucide-react'

export default function ContactList() {
  const { contacts, fetchContacts, clients, fetchClients, createContact, loading } = useCRMStore()
  const { isDark, toggleTheme } = useThemeStore()
  
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  const [formData, setFormData] = useState({
    client_id: '', first_name: '', last_name: '', job_title: '', department: '',
    email: '', phone: '', mobile: '',
    is_primary: false, is_decision_maker: false,
    contact_type: 'operations', preferred_contact_method: 'email',
    birthday: '', notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([
      fetchContacts(),
      fetchClients({ status: 'active' })
    ])
  }

  const resetForm = () => {
    setFormData({
      client_id: '', first_name: '', last_name: '', job_title: '', department: '',
      email: '', phone: '', mobile: '',
      is_primary: false, is_decision_maker: false,
      contact_type: 'operations', preferred_contact_method: 'email',
      birthday: '', notes: ''
    })
  }

  const openNewForm = () => {
    resetForm()
    setEditingContact(null)
    setShowForm(true)
  }

  const openEditForm = (contact) => {
    setFormData({
      client_id: contact.client_id || '',
      first_name: contact.first_name || '',
      last_name: contact.last_name || '',
      job_title: contact.job_title || '',
      department: contact.department || '',
      email: contact.email || '',
      phone: contact.phone || '',
      mobile: contact.mobile || '',
      is_primary: contact.is_primary || false,
      is_decision_maker: contact.is_decision_maker || false,
      contact_type: contact.contact_type || 'operations',
      preferred_contact_method: contact.preferred_contact_method || 'email',
      birthday: contact.birthday || '',
      notes: contact.notes || ''
    })
    setEditingContact(contact)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.first_name || !formData.last_name) {
      toast.error('First name and last name are required')
      return
    }

    setFormLoading(true)
    try {
      if (editingContact) {
        const result = await crmApi.updateContact(editingContact.id, formData)
        if (result.error) throw result.error
        toast.success('Contact updated!')
      } else {
        const result = await createContact(formData)
        if (!result.success) throw new Error(result.error)
        toast.success('Contact created!')
      }
      setShowForm(false)
      resetForm()
      setEditingContact(null)
      await fetchContacts()
    } catch (err) {
      toast.error(err.message || 'Failed to save contact')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      const { error } = await crmApi.updateContact(deleteConfirm, { is_active: false })
      if (error) throw error
      toast.success('Contact deactivated')
      setDeleteConfirm(null)
      await fetchContacts()
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const filteredContacts = (contacts || []).filter(c => {
    if (search) {
      const s = search.toLowerCase()
      const matches = 
        (c.first_name || '').toLowerCase().includes(s) ||
        (c.last_name || '').toLowerCase().includes(s) ||
        (c.email || '').toLowerCase().includes(s) ||
        (c.job_title || '').toLowerCase().includes(s)
      if (!matches) return false
    }
    if (clientFilter !== 'all' && c.client_id !== clientFilter) return false
    return true
  })

  const getClientName = (clientId) => {
    const client = clients?.find(c => c.id === clientId)
    return client?.company_name || 'Unknown Client'
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
          <span className="text-slate-800 dark:text-white font-medium">Contacts</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-600" />Contacts
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={openNewForm} className="neu-raised neu-btn px-6 py-3 rounded-2xl flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
            <Plus className="w-5 h-5" /><span>Add Contact</span>
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="neu-raised rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
            </div>
            <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
              <option value="all">All Clients</option>
              {clients?.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
        </motion.div>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div><p className="text-slate-500">Loading contacts...</p></div>
        ) : filteredContacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact, i) => (
              <motion.div key={contact.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="neu-raised rounded-2xl p-5 stat-card hover:scale-[1.02] transition-transform">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-600 font-bold text-lg">
                        {contact.first_name?.[0]}{contact.last_name?.[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-800 dark:text-white truncate">{contact.first_name} {contact.last_name}</h3>
                      {contact.job_title && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{contact.job_title}</p>}
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {contact.is_primary && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700">Primary</span>}
                        {contact.is_decision_maker && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-700">Decision Maker</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate text-xs">{getClientName(contact.client_id)}</span>
                  </div>
                  {contact.email && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate text-xs">{contact.email}</span>
                    </div>
                  )}
                  {(contact.phone || contact.mobile) && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs">{contact.mobile || contact.phone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-slate-500 capitalize">{contact.contact_type || 'contact'}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditForm(contact)} className="p-2 rounded-xl hover:bg-emerald-100 text-slate-400 hover:text-emerald-600" title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteConfirm(contact.id)} className="p-2 rounded-xl hover:bg-red-100 text-slate-400 hover:text-red-600" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 neu-raised rounded-3xl">
            <Users className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-xl mb-2">No contacts found</p>
            <button onClick={openNewForm} className="mt-4 neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white inline-flex items-center gap-2">
              <Plus className="w-5 h-5" /><span>Add First Contact</span>
            </button>
          </div>
        )}
      </main>

      {/* Contact Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="neu-raised rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingContact ? 'Edit Contact' : 'Add New Contact'}</h3>
                <button onClick={() => { setShowForm(false); resetForm(); setEditingContact(null) }} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-slate-500 mb-1 block">Client *</label>
                  <select value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} className="w-full p-3 neu-inset rounded-xl" required>
                    <option value="">Select Client</option>
                    {clients?.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">First Name *</label>
                    <input type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="w-full p-3 neu-inset rounded-xl" required />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Last Name *</label>
                    <input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="w-full p-3 neu-inset rounded-xl" required />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Job Title</label>
                    <input type="text" value={formData.job_title} onChange={(e) => setFormData({...formData, job_title: e.target.value})} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Department</label>
                    <input type="text" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Phone</label>
                    <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Mobile</label>
                    <input type="text" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} className="w-full p-3 neu-inset rounded-xl" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-500 mb-1 block">Contact Type</label>
                    <select value={formData.contact_type} onChange={(e) => setFormData({...formData, contact_type: e.target.value})} className="w-full p-3 neu-inset rounded-xl">
                      <option value="billing">Billing</option>
                      <option value="operations">Operations</option>
                      <option value="management">Management</option>
                      <option value="technical">Technical</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_primary} onChange={(e) => setFormData({...formData, is_primary: e.target.checked})} className="w-5 h-5" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">Primary Contact</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_decision_maker} onChange={(e) => setFormData({...formData, is_decision_maker: e.target.checked})} className="w-5 h-5" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">Decision Maker</span>
                  </label>
                </div>

                <div>
                  <label className="text-sm text-slate-500 mb-1 block">Notes</label>
                  <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} className="w-full p-3 neu-inset rounded-xl" />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button type="button" onClick={() => { setShowForm(false); resetForm(); setEditingContact(null) }} className="neu-raised neu-btn px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-700">Cancel</button>
                  <button type="submit" disabled={formLoading} className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
                    {formLoading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Check className="w-4 h-4" />}
                    {editingContact ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="neu-raised rounded-3xl p-8 max-w-md w-full text-center bg-white dark:bg-slate-800" onClick={e => e.stopPropagation()}>
              <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Deactivate Contact?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">This contact will be marked as inactive.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteConfirm(null)} className="neu-raised neu-btn px-6 py-3 rounded-2xl">Cancel</button>
                <button onClick={handleDelete} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-red-600 text-white">Deactivate</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
