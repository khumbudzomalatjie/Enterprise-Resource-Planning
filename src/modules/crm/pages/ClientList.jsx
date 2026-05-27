import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useCRMStore from '../store/crmStore'
import useThemeStore from '../../../store/themeStore'
import ClientForm from '../components/ClientForm'
import toast from 'react-hot-toast'
import { 
  Search, Building2, Plus, Star, MapPin, 
  Phone, Mail, ChevronRight, Sun, Moon, Sparkles,
  Edit, Trash2, Filter, X
} from 'lucide-react'

export default function ClientList() {
  const { clients, fetchClients, createClient, updateClient, loading } = useCRMStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  // Search & Filter State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  
  // Form State
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  
  // Delete Confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    loadClients()
  }, [statusFilter, typeFilter])

  const loadClients = async () => {
    const filters = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    if (typeFilter !== 'all') filters.type = typeFilter
    if (search) filters.search = search
    await fetchClients(filters)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadClients()
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setTypeFilter('all')
  }

  // Create Client Handler
  const handleCreateClient = async (formData) => {
    setFormLoading(true)
    const result = await createClient(formData)
    setFormLoading(false)
    if (result.success) {
      toast.success('Client added successfully!')
      setShowForm(false)
      loadClients()
    } else {
      toast.error(result.error || 'Failed to add client')
    }
  }

  // Update Client Handler
  const handleUpdateClient = async (formData) => {
    setFormLoading(true)
    const result = await updateClient(editingClient.id, formData)
    setFormLoading(false)
    if (result.success) {
      toast.success('Client updated successfully!')
      setEditingClient(null)
      loadClients()
    } else {
      toast.error(result.error || 'Failed to update client')
    }
  }

  // Delete Client Handler
  const handleDeleteClient = async (clientId) => {
    const result = await updateClient(clientId, { client_status: 'former' })
    if (result.success) {
      toast.success('Client removed successfully')
      setDeleteConfirm(null)
      loadClients()
    } else {
      toast.error('Failed to remove client')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
      prospect: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      former: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
      blacklisted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }
    return colors[status] || colors.inactive
  }

  const getRatingStars = (rating) => {
    if (rating === 'A') return '⭐⭐⭐⭐⭐'
    if (rating === 'B') return '⭐⭐⭐⭐'
    if (rating === 'C') return '⭐⭐⭐'
    if (rating === 'D') return '⭐⭐'
    if (rating === 'unrated') return '—'
    return '⭐'
  }

  const formatCurrency = (amount) => {
    if (!amount) return '—'
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      {/* Theme Toggle + ERP Label */}
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">
            Enterprise Resource Planning
          </span>
        </div>
        <button 
          onClick={toggleTheme}
          className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform"
        >
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/crm" className="text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            CRM Dashboard
          </Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Clients</span>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-emerald-600" />
              Clients
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {clients.length} client{clients.length !== 1 ? 's' : ''} in portfolio
            </p>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="neu-raised neu-btn px-6 py-3 rounded-2xl flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Add Client</span>
          </button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="neu-raised rounded-2xl p-4 mb-6"
        >
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by company name, code, or trading name..."
                className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="prospect">Prospect</option>
              <option value="former">Former</option>
              <option value="blacklisted">Blacklisted</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Types</option>
              <option value="corporate">Corporate</option>
              <option value="government">Government</option>
              <option value="retail">Retail</option>
              <option value="industrial">Industrial</option>
              <option value="residential">Residential</option>
              <option value="other">Other</option>
            </select>

            <div className="flex gap-2">
              <button
                type="submit"
                className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Search
              </button>
              {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="neu-raised neu-btn px-4 py-3 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </form>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap gap-3 mb-6"
        >
          {[
            { label: 'All', count: clients.length, active: statusFilter === 'all' && typeFilter === 'all' },
            { label: 'Active', count: clients.filter(c => c.client_status === 'active').length, active: statusFilter === 'active' },
            { label: 'Prospects', count: clients.filter(c => c.client_status === 'prospect').length, active: statusFilter === 'prospect' },
            { label: 'Former', count: clients.filter(c => c.client_status === 'former').length, active: statusFilter === 'former' },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={() => setStatusFilter(stat.active ? 'all' : stat.label.toLowerCase())}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                stat.active
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'neu-raised text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {stat.label} ({stat.count})
            </button>
          ))}
        </motion.div>

        {/* Client Grid */}
        {loading && !showForm ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading clients...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client, index) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="neu-raised rounded-2xl p-5 stat-card hover:scale-[1.02] transition-transform"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="font-semibold text-slate-800 dark:text-white text-lg truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      onClick={() => navigate(`/crm/clients/${client.id}`)}
                    >
                      {client.company_name}
                    </h3>
                    {client.trading_name && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{client.trading_name}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{client.client_code}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(client.client_status)}`}>
                    {client.client_status?.replace('_', ' ')}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 text-sm mb-3">
                  {client.city && (
                    <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{[client.city, client.state].filter(Boolean).join(', ')}</span>
                    </p>
                  )}
                  {client.phone && (
                    <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{client.phone}</span>
                    </p>
                  )}
                  {client.email && (
                    <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {getRatingStars(client.client_rating)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingClient(client)
                      }}
                      className="p-2 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Edit Client"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirm(client.id)
                      }}
                      className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete Client"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && clients.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 neu-raised rounded-3xl"
          >
            <Building2 className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-xl mb-2">No clients found</p>
            <p className="text-slate-400 dark:text-slate-500 mb-6">
              {search || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Start by adding your first client'}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="neu-raised neu-btn px-8 py-4 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-2 text-lg"
            >
              <Plus className="w-6 h-6" />
              <span>Add First Client</span>
            </button>
          </motion.div>
        )}
      </main>

      {/* Add Client Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowForm(false)
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-3xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <ClientForm 
                onSubmit={handleCreateClient} 
                onCancel={() => setShowForm(false)} 
                loading={formLoading} 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Client Modal */}
      <AnimatePresence>
        {editingClient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setEditingClient(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-3xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <ClientForm 
                initialData={editingClient}
                onSubmit={handleUpdateClient} 
                onCancel={() => setEditingClient(null)} 
                loading={formLoading} 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="neu-raised rounded-3xl p-8 max-w-md w-full text-center"
            >
              <Trash2 className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Delete Client?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                This will mark the client as former. You can restore them later if needed.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => handleDeleteClient(deleteConfirm)}
                  className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Yes, Remove
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="neu-raised neu-btn px-6 py-3 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
