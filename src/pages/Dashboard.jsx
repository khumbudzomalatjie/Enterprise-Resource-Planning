import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import Navbar from '../components/Navbar'
import { USER_ROLES } from '../types/authTypes'
import toast from 'react-hot-toast'
import { 
  Users, Briefcase, TrendingUp, CreditCard, Package, 
  ShoppingCart, Landmark, Database, Smartphone,
  FileText, Calendar, FolderOpen, Truck, Clock,
  DollarSign, BarChart3, CheckCircle2, Sparkles,
  Sun, Moon, Shield, Workflow
} from 'lucide-react'

export default function Dashboard() {
  const { user, profile } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('job')

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const userRole = profile?.role

  const tabs = [
    { id: 'job', label: 'JOB', icon: '📋' },
    { id: 'sales', label: 'Sales', icon: '💰' },
    { id: 'events', label: 'Events', icon: '🎉' },
    { id: 'hr', label: 'Human Resources', icon: '👥' },
  ]

  // ALL modules defined
  const allModules = [
    { icon: Users, label: 'Human Resources', description: 'Staff lifecycle, recruitment', path: '/hr', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.HR_MANAGER, USER_ROLES.OPERATIONS_MANAGER] },
    { icon: CreditCard, label: 'Payroll', description: 'Salary, taxes, compliance', path: '/payroll', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_OFFICER, USER_ROLES.HR_MANAGER] },
    { icon: TrendingUp, label: 'CRM & Clients', description: 'Client management, pipeline', path: '/crm', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SALES_AGENT] },
    { icon: FileText, label: 'Sales & Quotations', description: 'Quotes, invoices, A4 PDF', path: '/sales', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SALES_AGENT, USER_ROLES.FINANCE_OFFICER] },
    { icon: Briefcase, label: 'Operations', description: 'Job management, scheduling', path: '/operations', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR] },
    { icon: Package, label: 'Inventory', description: 'Stock, supplies, warehouses', path: '/inventory', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR] },
    { icon: ShoppingCart, label: 'Procurement', description: 'Purchase orders, vendors, RFQs', path: '/procurement', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.FINANCE_OFFICER] },
    { icon: Landmark, label: 'Finance', description: 'Accounting, approvals, budgets', path: '/finance', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_OFFICER, USER_ROLES.OPERATIONS_MANAGER] },
    { icon: Truck, label: 'Fleet Management', description: 'Vehicle tracking, fuel, maintenance', path: '/fleet', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR] },
    { icon: BarChart3, label: 'Reporting & Analytics', description: 'BI dashboards, KPI tracking, export', path: '/reports', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.FINANCE_OFFICER, USER_ROLES.HR_MANAGER] },
    { icon: Workflow, label: 'Workflow Automation', description: 'Approvals, triggers, business processes', path: '/workflow', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.FINANCE_OFFICER] },
    { icon: FolderOpen, label: 'Document Management', description: 'Contracts, policies, SOPs, storage', path: '/documents', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.HR_MANAGER] },
    { icon: Database, label: 'Assets Management', description: 'Asset register, depreciation, maintenance', path: '/assets', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_OFFICER, USER_ROLES.OPERATIONS_MANAGER] },
    { icon: Smartphone, label: 'Field Operations', description: 'Monitor cleaners, photos, incidents, supplies', path: '/mobile/field', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR] },
  ]

  // FILTER: Only show modules the user has access to
  const modules = allModules.filter(module => {
    if (userRole === USER_ROLES.SUPER_ADMIN) return true
    return module.roles.includes(userRole)
  })

  const isModuleBuilt = (module) => {
    const builtModules = ['/hr', '/payroll', '/crm', '/sales', '/operations', '/inventory', '/procurement', '/finance', '/fleet', '/reports', '/workflow', '/documents', '/assets', '/mobile/field']
    return builtModules.includes(module.path)
  }

  const handleModuleClick = (module) => {
    const availableModules = ['/hr', '/payroll', '/crm', '/sales', '/operations', '/inventory', '/procurement', '/finance', '/fleet', '/reports', '/workflow', '/documents', '/assets', '/mobile/field', '/dashboard', '/users']
    if (availableModules.includes(module.path)) {
      navigate(module.path)
    } else {
      toast.success(`${module.label} module coming soon!`, { icon: '🚧', duration: 3000 })
    }
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <a href="#main-dashboard" className="skip-link">Skip to main content</a>
      <Navbar />

      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">Enterprise Resource Planning</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform" title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <header className="pt-8 pb-4 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-start">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800 dark:text-white">Welcome={userName}</h1>
            <p className="text-base text-slate-500 dark:text-slate-400 font-medium mt-1">Innovation Without End</p>
          </div>
        </div>
      </header>

      <main id="main-dashboard" className="max-w-7xl mx-auto px-4 pb-16">
        <div className="h-24 md:h-36"></div>

        <div className="mb-8">
          <nav className="overflow-x-auto custom-scrollbar">
            <div className="flex gap-2 p-2 rounded-2xl w-fit min-w-max neu-inset" role="tablist">
              {tabs.map((tab) => (
                <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`tab-btn px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === tab.id ? 'bg-gradient-to-br from-emerald-700 to-emerald-800 text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:bg-white/10'}`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>

        <div className="mb-12">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-semibold tracking-tight text-slate-700 dark:text-slate-100">
              Your Modules ({modules.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {modules.map((module, index) => {
              const built = isModuleBuilt(module)
              return (
                <motion.div key={module.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  onClick={() => handleModuleClick(module)}
                  className={`neu-raised rounded-2xl p-5 transition-all flex items-start gap-3 cursor-pointer hover:scale-[1.02] hover:shadow-lg ${!built ? 'opacity-75' : ''}`}
                  title={!built ? 'Coming soon!' : `Go to ${module.label}`}>
                  <module.icon className="w-8 h-8 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">{module.label}</h3>
                      {built && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Available"></span>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{module.description}</p>
                    {!built && <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Coming Soon</span>}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'job' && (
            <motion.section key="job" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="neu-raised p-6 rounded-3xl stat-card">
                  <h2 className="text-xl font-semibold flex gap-2 items-center text-slate-800 dark:text-white"><Briefcase className="w-6 h-6 text-emerald-600" />Active Jobs</h2>
                  <p className="text-3xl font-bold mt-3 text-slate-800 dark:text-white">24</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Open work orders</p>
                  <div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full"><div className="h-2 w-2/3 bg-emerald-500 rounded-full"></div></div>
                  <p className="text-xs mt-2 text-slate-500 dark:text-slate-400">67% completion rate</p>
                </div>
                <div className="neu-raised p-6 rounded-3xl stat-card">
                  <h2 className="text-xl font-semibold flex gap-2 text-slate-800 dark:text-white"><CheckCircle2 className="w-6 h-6 text-emerald-600" />Job Categories</h2>
                  <p className="text-3xl font-bold mt-2 text-slate-800 dark:text-white">12</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Residential · Commercial · Industrial</p>
                  <button className="mt-4 w-full py-2 rounded-xl bg-emerald-700 text-white text-sm shadow-md opacity-80 cursor-default">View Details</button>
                </div>
                <div className="neu-raised p-6 rounded-3xl stat-card">
                  <h2 className="text-xl font-semibold flex gap-2 text-slate-800 dark:text-white"><Calendar className="w-6 h-6 text-emerald-600" />Scheduled Jobs</h2>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex justify-between"><span>Office Clean - Main St</span><span className="text-emerald-600 dark:text-emerald-400">Today</span></li>
                    <li className="flex justify-between"><span>Parking Lot Sweep</span><span className="text-emerald-600 dark:text-emerald-400">Tomorrow</span></li>
                    <li className="flex justify-between"><span>Window Washing - Tower B</span><span className="text-slate-500 dark:text-slate-400">Jun 15</span></li>
                  </ul>
                </div>
              </div>
            </motion.section>
          )}
          {activeTab === 'sales' && (
            <motion.section key="sales" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="neu-raised p-6 rounded-3xl stat-card"><TrendingUp className="w-8 h-8 text-emerald-600 mb-2" /><p className="text-2xl font-bold mt-2 text-slate-800 dark:text-white">$189,450</p><p className="text-slate-500 dark:text-slate-400">Total Sales (YTD)</p></div>
                <div className="neu-raised p-6 rounded-3xl stat-card"><Users className="w-8 h-8 text-emerald-600 mb-2" /><p className="text-2xl font-bold mt-2 text-slate-800 dark:text-white">47</p><p className="text-slate-500 dark:text-slate-400">Active Clients</p></div>
                <div className="neu-raised p-6 rounded-3xl stat-card"><DollarSign className="w-8 h-8 text-emerald-600 mb-2" /><p className="text-2xl font-bold mt-2 text-slate-800 dark:text-white">$32,800</p><p className="text-slate-500 dark:text-slate-400">Pending Invoices</p></div>
              </div>
            </motion.section>
          )}
          {activeTab === 'events' && (
            <motion.section key="events" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="neu-raised p-6 rounded-3xl"><h2 className="text-xl flex gap-2 items-center text-slate-800 dark:text-white"><Calendar className="w-6 h-6 text-emerald-600" />Upcoming Events</h2><div className="mt-3 space-y-2 text-slate-600 dark:text-slate-300"><p>🎉 Annual Gala · Dec 15</p><p>🏆 Team Building · Jan 10</p><p>📢 Expo 2025 · Feb 5</p></div></div>
                <div className="neu-raised p-6 rounded-3xl"><h2 className="text-xl flex gap-2 text-slate-800 dark:text-white"><Database className="w-6 h-6 text-emerald-600" />Event Logistics</h2><p className="mt-3 text-sm text-slate-500 dark:text-slate-400">3 venues booked | 12 vendors confirmed</p><div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full"><div className="h-2 w-4/5 bg-emerald-500 rounded-full"></div></div><p className="text-xs mt-2">80% preparation complete</p></div>
              </div>
            </motion.section>
          )}
          {activeTab === 'hr' && (
            <motion.section key="hr" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="neu-raised p-6 rounded-3xl stat-card"><h2 className="text-xl font-semibold flex gap-2 items-center text-slate-800 dark:text-white"><Users className="w-6 h-6 text-emerald-600" />Staff Overview</h2><p className="text-3xl font-bold mt-3">28</p><p className="text-sm text-slate-500">Active cleaners + 7 admins</p><div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full"><div className="h-2 w-3/4 bg-emerald-500 rounded-full"></div></div><p className="text-xs mt-2">75% attendance</p></div>
                <div className="neu-raised p-6 rounded-3xl stat-card"><h2 className="text-xl font-semibold flex gap-2 text-slate-800 dark:text-white"><CreditCard className="w-6 h-6 text-emerald-600" />Payroll Summary</h2><p className="text-3xl font-bold mt-2">$47,280</p><button onClick={() => navigate('/payroll')} className="mt-4 w-full py-2 rounded-xl bg-emerald-700 text-white text-sm shadow-md hover:bg-emerald-600 cursor-pointer">Process Payroll</button></div>
                <div className="neu-raised p-6 rounded-3xl stat-card"><h2 className="text-xl font-semibold flex gap-2 text-slate-800 dark:text-white"><Clock className="w-6 h-6 text-emerald-600" />Time Tracking</h2><ul className="mt-3 space-y-2 text-sm"><li className="flex justify-between"><span>Sarah K.</span><span className="text-emerald-600">42 hrs</span></li><li className="flex justify-between"><span>Miguel R.</span><span className="text-emerald-600">38 hrs</span></li><li className="flex justify-between"><span>Lisa M.</span><span className="text-slate-500">35 hrs</span></li></ul></div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
