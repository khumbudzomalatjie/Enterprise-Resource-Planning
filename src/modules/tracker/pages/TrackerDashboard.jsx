import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useTrackerStore from '../store/trackerStore'
import useThemeStore from '../../../store/themeStore'
import { 
  Search, ArrowLeft, Sun, Moon, Sparkles, Activity,
  Briefcase, Building2, ShoppingCart, Package, Truck,
  Users, UserCheck, Clock, AlertCircle, CheckCircle2,
  ChevronRight, Eye, MapPin, Phone
} from 'lucide-react'

export default function TrackerDashboard() {
  const { summary, fetchSummary, loading } = useTrackerStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchSummary()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSummary, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const trackingCategories = [
    { 
      id: 'jobs', label: 'Jobs', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30',
      active: summary.activeJobs || 0, completed: summary.completedJobs || 0,
      desc: 'Track all job statuses and progress'
    },
    { 
      id: 'vendors', label: 'Vendors', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30',
      pending: summary.pendingVendors || 0,
      desc: 'Monitor vendor approvals and status'
    },
    { 
      id: 'procurement', label: 'Purchase Orders', icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30',
      active: summary.activePOs || 0,
      desc: 'Track purchase orders and deliveries'
    },
    { 
      id: 'inventory', label: 'Inventory', icon: Package, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30',
      lowStock: summary.lowStockItems || 0,
      desc: 'Monitor stock levels and movements'
    },
    { 
      id: 'vehicles', label: 'Vehicles', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      active: summary.activeVehicles || 0, service: summary.vehiclesInService || 0,
      desc: 'Track fleet status and maintenance'
    },
    { 
      id: 'employees', label: 'Employees', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      active: summary.activeEmployees || 0, working: summary.cleanersWorking || 0,
      desc: 'Monitor staff attendance and status'
    },
    { 
      id: 'clients', label: 'Clients', icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30',
      active: summary.activeClients || 0,
      desc: 'Track client accounts and activity'
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
          <p className="text-slate-500 dark:text-slate-400 ml-11">Track everything across the entire ERP system in one place</p>
        </motion.div>

        {/* Live Stats Banner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="neu-raised rounded-3xl p-6 mb-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold">{summary.activeJobs || 0}</p>
              <p className="text-xs opacity-80">Active Jobs</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{summary.cleanersWorking || 0}</p>
              <p className="text-xs opacity-80">Cleaners Working</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{summary.activePOs || 0}</p>
              <p className="text-xs opacity-80">Active P.O.s</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{summary.lowStockItems || 0}</p>
              <p className="text-xs opacity-80">Low Stock Items</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{summary.pendingVendors || 0}</p>
              <p className="text-xs opacity-80">Pending Vendors</p>
            </div>
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
                onClick={() => setActiveTab(cat.id)}
                className="neu-raised rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all">
                <div className={`w-12 h-12 rounded-xl ${cat.bg} flex items-center justify-center mb-3`}>
                  <cat.icon className={`w-6 h-6 ${cat.color}`} />
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">{cat.label}</h3>
                <p className="text-xs text-slate-500 mt-1">{cat.desc}</p>
                <div className="flex gap-3 mt-3">
                  {cat.active !== undefined && <span className="text-xs font-medium text-blue-600">{cat.active} active</span>}
                  {cat.completed !== undefined && <span className="text-xs font-medium text-emerald-600">{cat.completed} done</span>}
                  {cat.pending !== undefined && <span className="text-xs font-medium text-amber-600">{cat.pending} pending</span>}
                  {cat.lowStock !== undefined && <span className="text-xs font-medium text-red-600">{cat.lowStock} low</span>}
                  {cat.service !== undefined && <span className="text-xs font-medium text-orange-600">{cat.service} in service</span>}
                  {cat.working !== undefined && <span className="text-xs font-medium text-emerald-600">{cat.working} working</span>}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2"><Briefcase className="w-5 h-5 text-blue-600" />Job Tracking</h2>
              <Link to="/operations" className="text-sm text-emerald-600 hover:underline">View All Jobs</Link>
            </div>
            <p className="text-slate-500 text-sm mb-4">Track all jobs across the system. Click on any job to view details.</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">{summary.activeJobs || 0}</p><p className="text-xs">Active</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600">{summary.completedJobs || 0}</p><p className="text-xs">Completed</p>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <p className="text-2xl font-bold text-purple-600">{(summary.activeJobs || 0) + (summary.completedJobs || 0)}</p><p className="text-xs">Total</p>
              </div>
            </div>
            <button onClick={() => navigate('/operations')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
              Go to Job Management
            </button>
          </div>
        )}

        {/* Vendors Tab */}
        {activeTab === 'vendors' && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2"><Building2 className="w-5 h-5 text-amber-600" />Vendor Tracking</h2>
              <Link to="/procurement/vendors" className="text-sm text-emerald-600 hover:underline">View All Vendors</Link>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl mb-4">
              <p className="text-2xl font-bold text-amber-600">{summary.pendingVendors || 0}</p><p className="text-xs">Pending Approval</p>
            </div>
            <button onClick={() => navigate('/procurement/vendors')} className="w-full py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700">
              Manage Vendors
            </button>
          </div>
        )}

        {/* Procurement Tab */}
        {activeTab === 'procurement' && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-purple-600" />Purchase Order Tracking</h2>
              <Link to="/procurement/po" className="text-sm text-emerald-600 hover:underline">View All POs</Link>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl mb-4">
              <p className="text-2xl font-bold text-purple-600">{summary.activePOs || 0}</p><p className="text-xs">Active Purchase Orders</p>
            </div>
            <button onClick={() => navigate('/procurement/po')} className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700">
              View Purchase Orders
            </button>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2"><Package className="w-5 h-5 text-red-600" />Inventory Tracking</h2>
              <Link to="/inventory/items" className="text-sm text-emerald-600 hover:underline">View Inventory</Link>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl mb-4">
              <p className="text-2xl font-bold text-red-600">{summary.lowStockItems || 0}</p><p className="text-xs">Low Stock Items</p>
            </div>
            <button onClick={() => navigate('/inventory')} className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700">
              Manage Inventory
            </button>
          </div>
        )}

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2"><Truck className="w-5 h-5 text-indigo-600" />Vehicle Tracking</h2>
              <Link to="/fleet" className="text-sm text-emerald-600 hover:underline">View Fleet</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <p className="text-2xl font-bold text-indigo-600">{summary.activeVehicles || 0}</p><p className="text-xs">Active</p>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <p className="text-2xl font-bold text-orange-600">{summary.vehiclesInService || 0}</p><p className="text-xs">In Service</p>
              </div>
            </div>
            <button onClick={() => navigate('/fleet')} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">
              Go to Fleet Management
            </button>
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600" />Employee Tracking</h2>
              <Link to="/hr/employees" className="text-sm text-emerald-600 hover:underline">View Employees</Link>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600">{summary.activeEmployees || 0}</p><p className="text-xs">Active Employees</p>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">{summary.cleanersWorking || 0}</p><p className="text-xs">Working Now</p>
              </div>
            </div>
            <button onClick={() => navigate('/hr/employees')} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700">
              Manage Employees
            </button>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className="neu-raised rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2"><UserCheck className="w-5 h-5 text-teal-600" />Client Tracking</h2>
              <Link to="/crm/clients" className="text-sm text-emerald-600 hover:underline">View Clients</Link>
            </div>
            <div className="text-center p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl mb-4">
              <p className="text-2xl font-bold text-teal-600">{summary.activeClients || 0}</p><p className="text-xs">Active Clients</p>
            </div>
            <button onClick={() => navigate('/crm/clients')} className="w-full py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700">
              Manage Clients
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
