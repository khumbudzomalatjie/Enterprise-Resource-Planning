import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useTrackerStore from '../store/trackerStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Search, ArrowLeft, Sun, Moon, Sparkles, Activity,
  Briefcase, Building2, ShoppingCart, Package, Truck,
  Users, UserCheck, Clock, AlertCircle, CheckCircle2,
  ChevronRight, Eye, MapPin, Phone, Hash, Barcode,
  Car, User, Mail, CreditCard, Loader2, X
} from 'lucide-react'

export default function TrackerDashboard() {
  const { summary, fetchSummary, loading } = useTrackerStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  
  // Search states
  const [searchType, setSearchType] = useState('job') // job, inventory, fleet, employee, vendor, client, po
  const [searchValue, setSearchValue] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState(null)
  const [searchError, setSearchError] = useState(null)

  useEffect(() => {
    fetchSummary()
    const interval = setInterval(fetchSummary, 30000)
    return () => clearInterval(interval)
  }, [])

  // ═══════════════════════════════════════════
  // UNIVERSAL SEARCH FUNCTION
  // ═══════════════════════════════════════════
  const handleSearch = async (e) => {
    e?.preventDefault()
    if (!searchValue.trim()) {
      toast.error('Please enter a search value')
      return
    }

    setSearching(true)
    setSearchResult(null)
    setSearchError(null)

    try {
      let result = null

      switch (searchType) {
        // JOB SEARCH - by Job Number
        case 'job':
          const { data: job, error: jobError } = await supabase
            .from('jobs')
            .select('*, clients(company_name, phone), job_categories(name), employees!jobs_assigned_to_fkey(first_name, last_name)')
            .ilike('job_number', `%${searchValue}%`)
            .limit(5)
          
          if (jobError) throw jobError
          if (!job || job.length === 0) {
            setSearchError(`No job found with number "${searchValue}"`)
          } else {
            result = { type: 'job', data: job, count: job.length }
          }
          break

        // INVENTORY SEARCH - by Item Code or Barcode
        case 'inventory':
          const { data: items, error: invError } = await supabase
            .from('inventory_items')
            .select('*, item_categories(name), warehouses(name)')
            .or(`item_code.ilike.%${searchValue}%,barcode.ilike.%${searchValue}%,name.ilike.%${searchValue}%`)
            .limit(10)
          
          if (invError) throw invError
          if (!items || items.length === 0) {
            setSearchError(`No inventory item found for "${searchValue}"`)
          } else {
            result = { type: 'inventory', data: items, count: items.length }
          }
          break

        // FLEET SEARCH - by Plate Number
        case 'fleet':
          const { data: vehicles, error: fleetError } = await supabase
            .from('vehicles')
            .select('*, employees(first_name, last_name)')
            .or(`plate_number.ilike.%${searchValue}%,name.ilike.%${searchValue}%,vehicle_code.ilike.%${searchValue}%`)
            .limit(5)
          
          if (fleetError) throw fleetError
          if (!vehicles || vehicles.length === 0) {
            setSearchError(`No vehicle found with plate "${searchValue}"`)
          } else {
            result = { type: 'fleet', data: vehicles, count: vehicles.length }
          }
          break

        // EMPLOYEE SEARCH - by Employee Code or Name
        case 'employee':
          const { data: employees, error: empError } = await supabase
            .from('employees')
            .select('*')
            .or(`employee_code.ilike.%${searchValue}%,first_name.ilike.%${searchValue}%,last_name.ilike.%${searchValue}%,email.ilike.%${searchValue}%`)
            .limit(10)
          
          if (empError) throw empError
          if (!employees || employees.length === 0) {
            setSearchError(`No employee found for "${searchValue}"`)
          } else {
            // Get today's attendance for found employees
            const today = new Date().toISOString().split('T')[0]
            const employeeIds = employees.map(e => e.id)
            const { data: attendance } = await supabase
              .from('attendance_records')
              .select('*')
              .eq('attendance_date', today)
              .in('employee_id', employeeIds)
            
            const attendanceMap = {}
            attendance?.forEach(a => { attendanceMap[a.employee_id] = a })
            
            const enriched = employees.map(emp => ({
              ...emp,
              today_attendance: attendanceMap[emp.id] || null
            }))
            
            result = { type: 'employee', data: enriched, count: enriched.length }
          }
          break

        // VENDOR SEARCH - by Vendor Code or Company Name
        case 'vendor':
          const { data: vendors, error: vendError } = await supabase
            .from('vendors')
            .select('*')
            .or(`vendor_code.ilike.%${searchValue}%,company_name.ilike.%${searchValue}%`)
            .limit(10)
          
          if (vendError) throw vendError
          if (!vendors || vendors.length === 0) {
            setSearchError(`No vendor found for "${searchValue}"`)
          } else {
            result = { type: 'vendor', data: vendors, count: vendors.length }
          }
          break

        // CLIENT SEARCH - by Client Code or Company Name
        case 'client':
          const { data: clients, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .or(`client_code.ilike.%${searchValue}%,company_name.ilike.%${searchValue}%`)
            .limit(10)
          
          if (clientError) throw clientError
          if (!clients || clients.length === 0) {
            setSearchError(`No client found for "${searchValue}"`)
          } else {
            result = { type: 'client', data: clients, count: clients.length }
          }
          break

        // PURCHASE ORDER SEARCH - by PO Number
        case 'po':
          const { data: pos, error: poError } = await supabase
            .from('purchase_orders')
            .select('*, vendors(company_name, vendor_code)')
            .ilike('po_number', `%${searchValue}%`)
            .limit(5)
          
          if (poError) throw poError
          if (!pos || pos.length === 0) {
            setSearchError(`No purchase order found with number "${searchValue}"`)
          } else {
            result = { type: 'po', data: pos, count: pos.length }
          }
          break

        default:
          setSearchError('Please select a search type')
      }

      if (result) {
        setSearchResult(result)
        toast.success(`Found ${result.count} ${searchType}${result.count > 1 ? 's' : ''}`)
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchError('Search failed: ' + error.message)
    } finally {
      setSearching(false)
    }
  }

  const clearSearch = () => {
    setSearchResult(null)
    setSearchError(null)
    setSearchValue('')
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'

  const trackingCategories = [
    { id: 'jobs', label: 'Jobs', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30',
      active: summary.activeJobs || 0, completed: summary.completedJobs || 0,
      desc: 'Track all job statuses and progress', searchType: 'job', searchPlaceholder: 'Enter job number...'
    },
    { id: 'vendors', label: 'Vendors', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30',
      pending: summary.pendingVendors || 0,
      desc: 'Monitor vendor approvals and status', searchType: 'vendor', searchPlaceholder: 'Enter vendor code or name...'
    },
    { id: 'procurement', label: 'Purchase Orders', icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30',
      active: summary.activePOs || 0,
      desc: 'Track purchase orders and deliveries', searchType: 'po', searchPlaceholder: 'Enter PO number...'
    },
    { id: 'inventory', label: 'Inventory', icon: Package, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30',
      lowStock: summary.lowStockItems || 0,
      desc: 'Monitor stock levels and movements', searchType: 'inventory', searchPlaceholder: 'Enter item code or barcode...'
    },
    { id: 'vehicles', label: 'Vehicles', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      active: summary.activeVehicles || 0, service: summary.vehiclesInService || 0,
      desc: 'Track fleet status and maintenance', searchType: 'fleet', searchPlaceholder: 'Enter plate number...'
    },
    { id: 'employees', label: 'Employees', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      active: summary.activeEmployees || 0, working: summary.cleanersWorking || 0,
      desc: 'Monitor staff attendance and status', searchType: 'employee', searchPlaceholder: 'Enter employee code or name...'
    },
    { id: 'clients', label: 'Clients', icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30',
      active: summary.activeClients || 0,
      desc: 'Track client accounts and activity', searchType: 'client', searchPlaceholder: 'Enter client code or name...'
    },
  ]

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'vendors', label: 'Vendors', icon: Building2 },
    { id: 'procurement', label: 'P.O.s', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'vehicles', label: 'Vehicles', icon: Truck },
    { id: 'employees', label: 'Staff', icon: Users },
    { id: 'clients', label: 'Clients', icon: UserCheck },
  ]

  const getStatusBadge = (status) => {
    const badges = {
      active: 'bg-emerald-100 text-emerald-700', in_use: 'bg-blue-100 text-blue-700',
      pending: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700',
      sent: 'bg-blue-100 text-blue-700', confirmed: 'bg-purple-100 text-purple-700',
      received: 'bg-emerald-100 text-emerald-700', pending_approval: 'bg-amber-100 text-amber-700',
      in_progress: 'bg-amber-100 text-amber-700', scheduled: 'bg-blue-100 text-blue-700',
      in_service: 'bg-orange-100 text-orange-700'
    }
    return badges[status] || 'bg-slate-100 text-slate-600'
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
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Main Dashboard</span>
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">ERP Tracker</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-11">Track everything by number, code, plate, or barcode</p>
        </motion.div>

        {/* ═══════════════════════════════════════════ */}
        {/* UNIVERSAL SEARCH BAR */}
        {/* ═══════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="neu-raised rounded-3xl p-6 mb-8 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 text-white">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Search className="w-6 h-6" /> Quick Tracker Search
          </h2>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <select
              value={searchType}
              onChange={(e) => { setSearchType(e.target.value); clearSearch() }}
              className="px-4 py-3 rounded-xl bg-white/20 text-white font-medium text-sm border border-white/30 focus:outline-none"
            >
              <option value="job" className="text-slate-800">🔍 Job Number</option>
              <option value="inventory" className="text-slate-800">📦 Item Code / Barcode</option>
              <option value="fleet" className="text-slate-800">🚗 Plate Number</option>
              <option value="employee" className="text-slate-800">👤 Employee Code / Name</option>
              <option value="vendor" className="text-slate-800">🏢 Vendor Code / Name</option>
              <option value="client" className="text-slate-800">💼 Client Code / Name</option>
              <option value="po" className="text-slate-800">📋 PO Number</option>
            </select>
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={
                  searchType === 'job' ? 'Enter job number (e.g., JOB-2506-0001)...' :
                  searchType === 'inventory' ? 'Enter item code or barcode...' :
                  searchType === 'fleet' ? 'Enter plate number (e.g., ABC123GP)...' :
                  searchType === 'employee' ? 'Enter employee code or name...' :
                  searchType === 'vendor' ? 'Enter vendor code or company name...' :
                  searchType === 'client' ? 'Enter client code or company name...' :
                  'Enter PO number...'
                }
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 text-sm border border-white/30 focus:outline-none focus:bg-white/30"
              />
            </div>
            <button type="submit" disabled={searching}
              className="px-6 py-3 rounded-xl bg-white text-emerald-700 font-bold text-sm hover:bg-white/90 disabled:opacity-50 flex items-center gap-2">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {searching ? 'Searching...' : 'Track'}
            </button>
            {(searchResult || searchError) && (
              <button type="button" onClick={clearSearch}
                className="px-3 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
        </motion.div>

        {/* ═══════════════════════════════════════════ */}
        {/* SEARCH RESULTS */}
        {/* ═══════════════════════════════════════════ */}
        {searchError && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="neu-raised rounded-3xl p-8 mb-8 text-center border-2 border-red-200 dark:border-red-800">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 font-semibold">{searchError}</p>
            <p className="text-slate-500 text-sm mt-1">Try a different search term or check the spelling</p>
          </motion.div>
        )}

        {searchResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="neu-raised rounded-3xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Search Results: <span className="text-emerald-600 capitalize">{searchResult.type}</span>
                <span className="text-sm text-slate-500 ml-2">({searchResult.count} found)</span>
              </h3>
            </div>

            {/* JOB RESULTS */}
            {searchResult.type === 'job' && (
              <div className="space-y-3">
                {searchResult.data.map(job => (
                  <div key={job.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100"
                    onClick={() => navigate(`/operations/jobs/${job.id}`)}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-blue-600">{job.job_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(job.status)}`}>{job.status?.replace('_', ' ')}</span>
                      </div>
                      <p className="font-medium text-sm mt-1">{job.title}</p>
                      <div className="flex gap-4 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{job.clients?.company_name || 'No client'}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.site_address?.slice(0, 30)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(job.scheduled_date)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/operations/jobs/${job.id}`) }}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs">View Job</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* INVENTORY RESULTS */}
            {searchResult.type === 'inventory' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 dark:bg-slate-700/30">
                      <th className="text-left py-2 px-3">Item Code</th>
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-left py-2 px-3">Category</th>
                      <th className="text-right py-2 px-3">Stock</th>
                      <th className="text-right py-2 px-3">Unit Cost</th>
                      <th className="text-center py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResult.data.map(item => (
                      <tr key={item.id} className="border-b hover:bg-slate-50 cursor-pointer"
                        onClick={() => navigate(`/inventory/items/${item.id}`)}>
                        <td className="py-2 px-3 font-mono text-xs">{item.item_code}</td>
                        <td className="py-2 px-3 font-medium">{item.name}</td>
                        <td className="py-2 px-3 text-xs">{item.item_categories?.name}</td>
                        <td className="py-2 px-3 text-right">
                          <span className={item.current_stock <= item.reorder_point ? 'text-red-600 font-bold' : ''}>
                            {item.current_stock} {item.unit}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">{formatCurrency(item.unit_cost)}</td>
                        <td className="py-2 px-3 text-center">
                          {item.current_stock <= 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Out of Stock</span>
                          ) : item.current_stock <= item.reorder_point ? (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">Low Stock</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">In Stock</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* FLEET RESULTS */}
            {searchResult.type === 'fleet' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResult.data.map(vehicle => (
                  <div key={vehicle.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 cursor-pointer hover:bg-slate-100"
                    onClick={() => navigate(`/fleet/vehicles/${vehicle.id}`)}>
                    <div className="flex items-center gap-3 mb-2">
                      <Truck className="w-8 h-8 text-indigo-600" />
                      <div>
                        <p className="font-bold text-sm">{vehicle.name}</p>
                        <p className="font-mono text-xs text-slate-500">{vehicle.plate_number}</p>
                      </div>
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-xs ${getStatusBadge(vehicle.status)}`}>{vehicle.status}</span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>{vehicle.make} {vehicle.model} · {vehicle.vehicle_type}</p>
                      <p>Mileage: {vehicle.current_mileage?.toLocaleString() || 0} km</p>
                      {vehicle.employees && <p>Driver: {vehicle.employees.first_name} {vehicle.employees.last_name}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* EMPLOYEE RESULTS */}
            {searchResult.type === 'employee' && (
              <div className="space-y-3">
                {searchResult.data.map(emp => (
                  <div key={emp.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100"
                    onClick={() => navigate(`/hr/employees/${emp.id}`)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <span className="text-emerald-600 font-bold">{emp.first_name?.[0]}{emp.last_name?.[0]}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-slate-500">{emp.employee_code} · {emp.position || 'No position'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <p className="text-slate-500">Status</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(emp.employment_status)}`}>{emp.employment_status}</span>
                      </div>
                      {emp.today_attendance?.clock_in_time && !emp.today_attendance?.clock_out_time && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Working now"></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VENDOR RESULTS */}
            {searchResult.type === 'vendor' && (
              <div className="space-y-3">
                {searchResult.data.map(vendor => (
                  <div key={vendor.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100"
                    onClick={() => navigate(`/procurement/vendors/${vendor.id}`)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-amber-600" />
                        <p className="font-semibold text-sm">{vendor.company_name}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{vendor.vendor_code} · {vendor.email} · {vendor.city}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(vendor.status)}`}>{vendor.status?.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* CLIENT RESULTS */}
            {searchResult.type === 'client' && (
              <div className="space-y-3">
                {searchResult.data.map(client => (
                  <div key={client.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100"
                    onClick={() => navigate(`/crm/clients/${client.id}`)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-teal-600" />
                        <p className="font-semibold text-sm">{client.company_name}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{client.client_code} · {client.email} · {client.city}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(client.client_status)}`}>{client.client_status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* PO RESULTS */}
            {searchResult.type === 'po' && (
              <div className="space-y-3">
                {searchResult.data.map(po => (
                  <div key={po.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100"
                    onClick={() => navigate(`/procurement/po/${po.id}`)}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-purple-600">{po.po_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(po.status)}`}>{po.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{po.vendors?.company_name || 'No vendor'} · {formatCurrency(po.total_amount)}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>Ordered: {formatDate(po.order_date)}</p>
                      {po.expected_delivery_date && <p>Expected: {formatDate(po.expected_delivery_date)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Live Stats Banner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="neu-raised rounded-3xl p-6 mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 text-center">
            <div><p className="text-3xl font-bold">{summary.activeJobs || 0}</p><p className="text-xs opacity-80">Active Jobs</p></div>
            <div><p className="text-3xl font-bold">{summary.cleanersWorking || 0}</p><p className="text-xs opacity-80">Cleaners Working</p></div>
            <div><p className="text-3xl font-bold">{summary.activePOs || 0}</p><p className="text-xs opacity-80">Active P.O.s</p></div>
            <div><p className="text-3xl font-bold">{summary.lowStockItems || 0}</p><p className="text-xs opacity-80">Low Stock Items</p></div>
            <div><p className="text-3xl font-bold">{summary.pendingVendors || 0}</p><p className="text-xs opacity-80">Pending Vendors</p></div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {trackingCategories.map((cat, i) => (
              <motion.div key={cat.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => { setActiveTab(cat.id); setSearchType(cat.searchType); setSearchValue('') }}
                className="neu-raised rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all">
                <div className={`w-12 h-12 rounded-xl ${cat.bg} flex items-center justify-center mb-3`}>
                  <cat.icon className={`w-6 h-6 ${cat.color}`} />
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{cat.label}</h3>
                <p className="text-xs text-slate-500 mt-1">{cat.desc}</p>
                <div className="flex gap-3 mt-3 flex-wrap">
                  {cat.active !== undefined && <span className="text-xs font-medium text-blue-600">{cat.active} active</span>}
                  {cat.completed !== undefined && <span className="text-xs font-medium text-emerald-600">{cat.completed} done</span>}
                  {cat.pending !== undefined && <span className="text-xs font-medium text-amber-600">{cat.pending} pending</span>}
                  {cat.lowStock !== undefined && <span className="text-xs font-medium text-red-600">{cat.lowStock} low</span>}
                  {cat.service !== undefined && <span className="text-xs font-medium text-orange-600">{cat.service} in service</span>}
                  {cat.working !== undefined && <span className="text-xs font-medium text-emerald-600">{cat.working} working</span>}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-600">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Search className="w-3 h-3" />
                    <span>Search by {cat.id === 'jobs' ? 'job number' : cat.id === 'inventory' ? 'item code/barcode' : cat.id === 'vehicles' ? 'plate number' : cat.id === 'employees' ? 'employee code' : 'code/name'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Individual Tab Quick Actions */}
        {activeTab !== 'overview' && (
          <div className="neu-raised rounded-3xl p-6 text-center">
            <p className="text-slate-500 mb-4">
              Use the <strong>Quick Tracker Search</strong> above to find specific {activeTab} by {
                activeTab === 'jobs' ? 'job number' :
                activeTab === 'inventory' ? 'item code or barcode' :
                activeTab === 'vehicles' ? 'plate number' :
                activeTab === 'employees' ? 'employee code or name' :
                activeTab === 'vendors' ? 'vendor code or name' :
                activeTab === 'clients' ? 'client code or name' :
                'PO number'
              }.
            </p>
            <button onClick={() => { setSearchType(activeTab === 'procurement' ? 'po' : activeTab === 'employees' ? 'employee' : activeTab); setSearchValue(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700">
              Track {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
