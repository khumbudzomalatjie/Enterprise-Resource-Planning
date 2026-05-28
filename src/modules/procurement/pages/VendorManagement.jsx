import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useProcurementStore from '../store/procurementStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { Search, Users, Plus, Eye, Edit, Trash2, Star, ChevronRight, Sun, Moon, Sparkles } from 'lucide-react'

export default function VendorManagement() {
  const { vendors, fetchVendors, updateVendor, loading } = useProcurementStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => { loadData() }, [statusFilter])

  const loadData = async () => {
    const filters = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    await fetchVendors(filters)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Deactivate this vendor?')) {
      await updateVendor(id, { status: 'inactive' })
      toast.success('Vendor deactivated')
      loadData()
    }
  }

  const filteredVendors = vendors.filter(v => {
    if (!search) return true
    return v.company_name?.toLowerCase().includes(search.toLowerCase()) ||
           v.vendor_code?.toLowerCase().includes(search.toLowerCase())
  })

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3 h-3 ${i < (rating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'}`} />
    ))
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
          <Link to="/procurement" className="text-slate-500 hover:text-emerald-600">Procurement</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Vendors</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-600" />Vendor Management
            </h1>
            <p className="text-slate-500 mt-1">{vendors.length} vendors</p>
          </div>
          <button onClick={() => navigate('/procurement/vendors/new')} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-5 h-5" /><span>Add Vendor</span>
          </button>
        </motion.div>

        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending_approval">Pending</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map(vendor => (
            <motion.div key={vendor.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-2xl p-5 stat-card cursor-pointer hover:scale-[1.02]" onClick={() => navigate(`/procurement/vendors/${vendor.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-white">{vendor.company_name}</h3>
                  <p className="text-xs text-slate-500">{vendor.vendor_code}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${vendor.status === 'active' ? 'bg-emerald-100 text-emerald-700' : vendor.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  {vendor.status.replace('_', ' ')}
                </span>
              </div>
              <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                <p>{vendor.contact_person || 'No contact'}</p>
                <p>{vendor.email || 'No email'}</p>
                <p>{vendor.city || 'No location'}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-1">{renderStars(vendor.vendor_rating)}</div>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/procurement/vendors/${vendor.id}/edit`) }} className="p-1.5 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600"><Edit className="w-3.5 h-3.5" /></button>
                  {vendor.status === 'active' && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(vendor.id) }} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  )
}
