import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useProcurementStore from '../store/procurementStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Search, Users, Plus, Eye, Edit, Trash2, Star, 
  ChevronRight, Sun, Moon, Sparkles, Mail, Phone, MapPin,
  Ban, CheckCircle2
} from 'lucide-react'

export default function VendorManagement() {
  const { 
    vendors, fetchVendors, updateVendor, deleteVendor, loading 
  } = useProcurementStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Modal states
  const [vendorToDelete, setVendorToDelete] = useState(null)
  const [vendorToDeactivate, setVendorToDeactivate] = useState(null)
  const [processing, setProcessing] = useState(null)

  useEffect(() => { loadData() }, [statusFilter, categoryFilter])

  const loadData = async () => {
    const filters = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    if (categoryFilter !== 'all') filters.category = categoryFilter
    await fetchVendors(filters)
  }

  // ─── Deactivate (soft) ─────────────────────────────
  const handleDeactivate = (vendor, e) => {
    e.stopPropagation()
    setVendorToDeactivate(vendor)
  }

  const confirmDeactivate = async () => {
    if (!vendorToDeactivate) return
    setProcessing(vendorToDeactivate.id)
    const result = await updateVendor(vendorToDeactivate.id, { status: 'inactive' })
    setProcessing(null)
    if (result.success) {
      toast.success(`${vendorToDeactivate.company_name} marked as inactive`)
      setVendorToDeactivate(null)
      loadData()
    } else {
      toast.error(result.error || 'Failed to deactivate vendor')
    }
  }

  // ─── Activate ──────────────────────────────────────
  const handleActivate = async (vendor, e) => {
    e.stopPropagation()
    setProcessing(vendor.id)
    const result = await updateVendor(vendor.id, { status: 'active' })
    setProcessing(null)
    if (result.success) {
      toast.success(`${vendor.company_name} activated`)
      loadData()
    } else {
      toast.error(result.error || 'Failed to activate vendor')
    }
  }

  // ─── Delete (hard) ─────────────────────────────────
  const handleDelete = (vendor, e) => {
    e.stopPropagation()
    setVendorToDelete(vendor)
  }

  const confirmDelete = async () => {
    if (!vendorToDelete) return
    setProcessing(vendorToDelete.id)
    const result = await deleteVendor(vendorToDelete.id)
    setProcessing(null)
    if (result.success) {
      toast.success(`Vendor "${vendorToDelete.company_name}" deleted permanently!`)
      setVendorToDelete(null)
      loadData()
    } else {
      toast.error(result.error || 'Failed to delete vendor')
    }
  }

  // ─── Navigation ────────────────────────────────────
  const handleEdit = (id, e) => {
    e.stopPropagation()
    navigate(`/procurement/vendors/${id}/edit`)
  }

  const handleView = (id) => {
    navigate(`/procurement/vendors/${id}`)
  }

  // ─── Filtering & helpers (unchanged from previous) ──
  const filteredVendors = (vendors || []).filter(v => {
    if (!search) return true
    return v.company_name?.toLowerCase().includes(search.toLowerCase()) ||
           v.vendor_code?.toLowerCase().includes(search.toLowerCase()) ||
           v.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
           v.email?.toLowerCase().includes(search.toLowerCase())
  })

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3 h-3 ${i < (rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300 dark:text-slate-600'}`} />
    ))
  }

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      inactive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      pending_approval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      blacklisted: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    }
    return badges[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
  }

  const getCategoryLabel = (category) => {
    const labels = {
      cleaning_chemicals: 'Cleaning Chemicals',
      equipment: 'Equipment',
      ppe: 'PPE & Safety',
      consumables: 'Consumables',
      uniforms: 'Uniforms',
      vehicle_maintenance: 'Vehicle Maintenance',
      office_supplies: 'Office Supplies',
      other: 'Other'
    }
    return labels[category] || category?.replace('_', ' ') || 'N/A'
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/procurement" className="text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">Procurement</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Vendors</span>
        </div>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-600" />
              Vendor Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{(vendors || []).length} vendors total</p>
          </div>
          <button 
            onClick={() => navigate('/procurement/vendors/new')} 
            className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Vendor</span>
          </button>
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="neu-raised rounded-2xl p-4 mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search by name, code, contact, email..." 
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
              <option value="pending_approval">Pending Approval</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)} 
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Categories</option>
              <option value="cleaning_chemicals">Cleaning Chemicals</option>
              <option value="equipment">Equipment</option>
              <option value="ppe">PPE & Safety</option>
              <option value="consumables">Consumables</option>
              <option value="uniforms">Uniforms</option>
              <option value="vehicle_maintenance">Vehicle Maintenance</option>
              <option value="office_supplies">Office Supplies</option>
            </select>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading vendors...</p>
          </div>
        )}

        {/* Vendor Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVendors.map((vendor, index) => (
              <motion.div 
                key={vendor.id} 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: index * 0.03 }}
                className="neu-raised rounded-2xl p-5 transition-all hover:scale-[1.02] cursor-pointer"
                onClick={() => handleView(vendor.id)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800 dark:text-white text-lg">
                      {vendor.company_name}
                    </h3>
                    {vendor.trading_name && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{vendor.trading_name}</p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{vendor.vendor_code}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(vendor.status)}`}>
                      {vendor.status?.replace('_', ' ')}
                    </span>
                    {vendor.is_preferred && (
                      <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        Preferred
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                      {getCategoryLabel(vendor.vendor_category)}
                    </span>
                  </div>
                  {vendor.contact_person && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Users className="w-3.5 h-3.5" />
                      <span className="truncate">{vendor.contact_person}</span>
                    </div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  {vendor.city && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{vendor.city}</span>
                    </div>
                  )}
                </div>

                {/* Footer with Rating and Actions */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {renderStars(vendor.vendor_rating)}
                    <span className="text-xs text-slate-400 ml-1">
                      {vendor.vendor_rating ? `${vendor.vendor_rating}/5` : 'Unrated'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleView(vendor.id) }}
                      className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleEdit(vendor.id, e)}
                      className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Edit Vendor"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Deactivate / Activate toggle */}
                    {vendor.status === 'active' && (
                      <button 
                        onClick={(e) => handleDeactivate(vendor, e)}
                        className="p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                        title="Deactivate Vendor"
                        disabled={processing === vendor.id}
                      >
                        {processing === vendor.id ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Ban className="w-4 h-4" />}
                      </button>
                    )}
                    {vendor.status === 'inactive' && (
                      <button 
                        onClick={(e) => handleActivate(vendor, e)}
                        className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        title="Activate Vendor"
                        disabled={processing === vendor.id}
                      >
                        {processing === vendor.id ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Hard Delete */}
                    <button 
                      onClick={(e) => handleDelete(vendor, e)}
                      className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete Permanently"
                      disabled={processing === vendor.id}
                    >
                      {processing === vendor.id ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredVendors.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="text-center py-16 neu-raised rounded-3xl"
          >
            <Users className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">No vendors found</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">
              {search || statusFilter !== 'all' || categoryFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Start by adding your first vendor'}
            </p>
            {!search && statusFilter === 'all' && categoryFilter === 'all' && (
              <button 
                onClick={() => navigate('/procurement/vendors/new')} 
                className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add First Vendor</span>
              </button>
            )}
          </motion.div>
        )}
      </main>

      {/* Deactivate Confirmation Modal */}
      {vendorToDeactivate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="text-center">
              <Ban className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Deactivate Vendor?</h3>
              <p className="text-slate-500 mb-1">Mark as inactive:</p>
              <p className="font-semibold text-lg text-slate-800 dark:text-white">{vendorToDeactivate.company_name}</p>
              <p className="text-xs text-slate-400 mt-2 mb-4">The vendor will no longer appear in active lists but can be reactivated later.</p>
              <div className="flex gap-3">
                <button onClick={() => setVendorToDeactivate(null)} className="flex-1 py-3 rounded-xl bg-slate-300 dark:bg-slate-600 font-semibold">Cancel</button>
                <button onClick={confirmDeactivate} disabled={processing === vendorToDeactivate.id} className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50">
                  {processing === vendorToDeactivate.id ? 'Processing...' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {vendorToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="text-center">
              <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Delete Vendor?</h3>
              <p className="text-slate-500 mb-1">You are about to permanently delete:</p>
              <p className="font-semibold text-lg text-slate-800 dark:text-white">{vendorToDelete.company_name}</p>
              <p className="text-xs text-slate-400 mt-2 mb-4">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setVendorToDelete(null)} className="flex-1 py-3 rounded-xl bg-slate-300 dark:bg-slate-600 font-semibold">Cancel</button>
                <button onClick={confirmDelete} disabled={processing === vendorToDelete.id} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50">
                  {processing === vendorToDelete.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
