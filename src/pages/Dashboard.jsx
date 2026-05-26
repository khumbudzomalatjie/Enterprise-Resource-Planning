import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../store/authStore'
import Navbar from '../components/Navbar'
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  CreditCard, 
  Package, 
  ShoppingCart, 
  Landmark, 
  Database,
  Smartphone,
  FileText,
  Calendar,
  FolderOpen,
  Truck,
  Clock,
  UserCheck,
  DollarSign,
  BarChart3,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react'

export default function Dashboard() {
  const { user, profile } = useAuthStore()
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('ndanduleni-theme') === 'dark' || false
  })
  const [activeTab, setActiveTab] = useState('job')
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('ndanduleni-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User'

  const tabs = [
    { id: 'job', label: 'JOB', icon: '📋' },
    { id: 'sales', label: 'Sales', icon: '💰' },
    { id: 'events', label: 'Events', icon: '🎉' },
    { id: 'hr', label: 'Human Resources', icon: '👥' },
  ]

  const modules = [
    { icon: Users, label: 'Human Resources', description: 'Staff lifecycle, recruitment' },
    { icon: CreditCard, label: 'Payroll', description: 'Salary, taxes, compliance' },
    { icon: Truck, label: 'Fleet Management', description: 'Vehicle tracking, maintenance' },
    { icon: Package, label: 'Inventory', description: 'Stock, supplies, warehouses' },
    { icon: ShoppingCart, label: 'Procurement', description: 'Purchase orders, vendors' },
    { icon: Landmark, label: 'Finance', description: 'Accounting, ledgers, budget' },
    { icon: TrendingUp, label: 'Sales', description: 'Orders, CRM, invoicing' },
    { icon: Database, label: 'Assets', description: 'Depreciation, asset register' },
    { icon: Briefcase, label: 'Jobs', description: 'Work orders, task scheduling' },
    { icon: Smartphone, label: 'Mobile Cleaner', description: 'Field app, route updates' },
    { icon: FileText, label: 'Reporting', description: 'BI dashboards, export analytics' },
    { icon: Calendar, label: 'Events', description: 'Scheduling, logistics, tasks' },
    { icon: FolderOpen, label: 'Documents', description: 'DMS, contracts, cloud storage' },
  ]

  return (
    <div className="min-h-screen font-['Inter']">
      {/* Skip to main content */}
      <a href="#main-dashboard" className="skip-link">Skip to main content</a>

      <Navbar />

      {/* Theme Toggle + ERP Label */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200">
            Enterprise Resource Planning
          </span>
        </div>
        <button 
          onClick={() => setIsDark(!isDark)}
          className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center"
        >
          {isDark ? (
            <Moon className="w-6 h-6 text-slate-200" />
          ) : (
            <Sun className="w-6 h-6 text-slate-700" />
          )}
        </button>
      </div>

      {/* Header */}
      <header className="pt-8 pb-4 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-start">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800 dark:text-white">
              Welcome={userName}
            </h1>
            <p className="text-base text-slate-500 dark:text-slate-400 font-medium mt-1">
              Innovation Without End
            </p>
          </div>
        </div>
      </header>

      <main id="main-dashboard" className="max-w-7xl mx-auto px-4 pb-16">
        {/* Space between header and tabs */}
        <div className="h-32 md:h-48"></div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="overflow-x-auto custom-scrollbar">
            <div className="flex gap-2 p-2 rounded-2xl w-fit min-w-max neu-inset" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-btn px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id 
                      ? 'bg-gradient-to-br from-emerald-700 to-emerald-800 text-white shadow-lg' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Modules Grid */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-semibold tracking-tight text-slate-700 dark:text-slate-100">
              Core & Extended Modules
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {modules.map((module, index) => (
              <motion.div
                key={module.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="neu-raised rounded-2xl p-5 transition-all flex items-start gap-3 hover:scale-[1.02] cursor-pointer"
              >
                <module.icon className="w-8 h-8 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">{module.label}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{module.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tab Panels */}
        <AnimatePresence mode="wait">
          {/* JOB PANEL */}
          {activeTab === 'job' && (
            <motion.section
              key="job"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="neu-raised p-6 rounded-3xl stat-card">
                  <h2 className="text-xl font-semibold flex gap-2 items-center text-slate-800 dark:text-white">
                    <Briefcase className="w-6 h-6 text-emerald-600" />
                    Active Jobs
                  </h2>
                  <p className="text-3xl font-bold mt-3 text-slate-800 dark:text-white">24</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Open work orders</p>
                  <div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full">
                    <div className="h-2 w-2/3 bg-emerald-500 rounded-full"></div>
                  </div>
                  <p className="text-xs mt-2 text-slate-500 dark:text-slate-400">67% completion rate</p>
                </div>

                <div className="neu-raised p-6 rounded-3xl stat-card">
                  <h2 className="text-xl font-semibold flex gap-2 text-slate-800 dark:text-white">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    Job Categories
                  </h2>
                  <p className="text-3xl font-bold mt-2 text-slate-800 dark:text-white">12</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Residential · Commercial · Industrial</p>
                  <button className="mt-4 w-full py-2 rounded-xl bg-emerald-700 text-white text-sm shadow-md opacity-80 cursor-default">
                    View Details
                  </button>
                </div>

                <div className="neu-raised p-6 rounded-3xl stat-card">
                  <h2 className="text-xl font-semibold flex gap-2 text-slate-800 dark:text-white">
                    <Calendar className="w-6 h-6 text-emerald-600" />
                    Scheduled Jobs
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex justify-between">
                      <span>Office Clean - Main St</span>
                      <span className="text-emerald-600 dark:text-emerald-400">Today</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Parking Lot Sweep</span>
                      <span className="text-emerald-600 dark:text-emerald-400">Tomorrow</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Window Washing - Tower B</span>
                      <span className="text-slate-500 dark:text-slate-400">Jun 15</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.section>
          )}

          {/* SALES PANEL */}
          {activeTab === 'sales' && (
            <motion.section
              key="sales"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="neu-raised p-6 rounded-3xl stat-card">
                  <TrendingUp className="w-8 h-8 text-emerald-600 mb-2" />
                  <p className="text-2xl font-bold mt-2 text-slate-800 dark:text-white">$189,450</p>
                  <p className="text-slate-500 dark:text-slate-400">Total Sales (YTD)</p>
                  <button className="mt-4 w-full py-2 rounded-xl bg-emerald-700 text-white text-sm shadow-md opacity-80 cursor-default">
                    Sales Report
                  </button>
                </div>

                <div className="neu-raised p-6 rounded-3xl stat-card">
                  <Users className="w-8 h-8 text-emerald-600 mb-2" />
                  <p className="text-2xl font-bold mt-2 text-slate-800 dark:text-white">47</p>
                  <p className="text-slate-500 dark:text-slate-400">Active Clients</p>
                  <button className="mt-4 w-full py-2 rounded-xl bg-emerald-700 text-white text-sm shadow-md opacity-80 cursor-default">
                    CRM
                  </button>
                </div>

                <div className="neu-raised p-6 rounded-3xl stat-card">
                  <DollarSign className="w-8 h-8 text-emerald-600 mb-2" />
                  <p className="text-2xl font-bold mt-2 text-slate-800 dark:text-white">$32,800</p>
                  <p className="text-slate-500 dark:text-slate-400">Pending Invoices</p>
                  <button className="mt-4 w-full py-2 rounded-xl bg-emerald-700 text-white text-sm shadow-md opacity-80 cursor-default">
                    Follow Up
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {/* EVENTS PANEL */}
          {activeTab === 'events' && (
            <motion.section
              key="events"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="neu-raised p-6 rounded-3xl">
                  <h2 className="text-xl flex gap-2 items-center text-slate-800 dark:text-white">
                    <Calendar className="w-6 h-6 text-emerald-600" />
                    Upcoming Events
                  </h2>
                  <div className="mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                    <p>🎉 Annual Gala · Dec 15</p>
                    <p>🏆 Team Building · Jan 10</p>
                    <p>📢 Expo 2025 · Feb 5</p>
                  </div>
                  <button className="mt-4 w-full py-2 rounded-xl bg-emerald-700 text-white opacity-80 cursor-default">
                    Manage Events
                  </button>
                </div>

                <div className="neu-raised p-6 rounded-3xl">
                  <h2 className="text-xl flex gap-2 text-slate-800 dark:text-white">
                    <Database className="w-6 h-6 text-emerald-600" />
                    Event Logistics
                  </h2>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    3 venues booked | 12 vendors confirmed
                  </p>
                  <div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full">
                    <div className="h-2 w-4/5 bg-emerald-500 rounded-full"></div>
                  </div>
                  <p className="text-xs mt-2 text-slate-500 dark:text-slate-400">80% preparation complete</p>
                  <button className="mt-4 w-full py-2 rounded-xl bg-emerald-700 text-white opacity-80 cursor-default">
                    Logistics Dashboard
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {/* HUMAN RESOURCES PANEL */}
          {activeTab === 'hr' && (
            <motion.section
              key="hr"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="neu-raised p-6 rounded-3xl stat-card">
                  <h2 className="text-xl font-semibold flex gap-2 items-center text-slate-800 dark:text-white">
                    <Users className="w-6 h-6 text-emerald-600" />
                    Staff Overview
                  </h2>
                  <p className="text-3xl font-bold mt-3 text-slate-800 dark:text-white">28</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Active cleaners + 7 admins</p>
                  <div className="mt-4 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full">
                    <div className="h-2 w-3/4 bg-emerald-500 rounded-full"></div>
                  </div>
                  <p className="text-xs mt-2 text-slate-500 dark:text-slate-400">75% attendance this week</p>
                </div>

                <div className="neu-raised p-6 rounded-3xl stat-card">
                  <h2 className="text-xl font-semibold flex gap-2 text-slate-800 dark:text-white">
                    <CreditCard className="w-6 h-6 text-emerald-600" />
                    Payroll Summary
                  </h2>
                  <p className="text-3xl font-bold mt-2 text-slate-800 dark:text-white">$47,280</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Monthly payroll</p>
                  <button className="mt-4 w-full py-2 rounded-xl bg-emerald-700 text-white text-sm shadow-md opacity-80 cursor-default">
                    Process Payroll
                  </button>
                </div>

                <div className="neu-raised p-6 rounded-3xl stat-card">
                  <h2 className="text-xl font-semibold flex gap-2 text-slate-800 dark:text-white">
                    <Clock className="w-6 h-6 text-emerald-600" />
                    Time Tracking
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex justify-between">
                      <span>Sarah K.</span>
                      <span className="text-emerald-600 dark:text-emerald-400">42 hrs</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Miguel R.</span>
                      <span className="text-emerald-600 dark:text-emerald-400">38 hrs</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Lisa M.</span>
                      <span className="text-slate-500 dark:text-slate-400">35 hrs</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
