import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
  Sun, Moon, Shield, Workflow, Activity
} from 'lucide-react'

export default function Dashboard() {
  const { user, profile } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const userRole = profile?.role

  const allModules = [
    { 
      icon: Users, 
      label: 'Human Resources', 
      description: 'Staff lifecycle, recruitment',
      path: '/hr',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.HR_MANAGER, USER_ROLES.OPERATIONS_MANAGER]
    },
    { 
      icon: CreditCard, 
      label: 'Payroll', 
      description: 'Salary, taxes, compliance',
      path: '/payroll',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_OFFICER, USER_ROLES.HR_MANAGER]
    },
    { 
      icon: TrendingUp, 
      label: 'CRM & Clients', 
      description: 'Client management, pipeline',
      path: '/crm',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SALES_AGENT]
    },
    { 
      icon: FileText, 
      label: 'Sales & Quotations', 
      description: 'Quotes, invoices, A4 PDF',
      path: '/sales',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SALES_AGENT, USER_ROLES.FINANCE_OFFICER]
    },
    { 
      icon: Briefcase, 
      label: 'Operations', 
      description: 'Job management, scheduling',
      path: '/operations',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR]
    },
    { 
      icon: Package, 
      label: 'Inventory', 
      description: 'Stock, supplies, warehouses',
      path: '/inventory',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR]
    },
    { 
      icon: ShoppingCart, 
      label: 'Procurement', 
      description: 'Purchase orders, vendors, RFQs',
      path: '/procurement',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.FINANCE_OFFICER]
    },
    { 
      icon: Shield, 
      label: 'Audit Trail', 
      description: 'Full system activity log',
      path: '/audit',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.HR_MANAGER, USER_ROLES.FINANCE_OFFICER]
    },
    { 
      icon: Landmark, 
      label: 'Finance', 
      description: 'Accounting, approvals, budgets',
      path: '/finance',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_OFFICER, USER_ROLES.OPERATIONS_MANAGER]
    },
    { 
      icon: Truck, 
      label: 'Fleet Management', 
      description: 'Vehicle tracking, fuel, maintenance',
      path: '/fleet',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR]
    },
    { 
      icon: BarChart3, 
      label: 'Reporting & Analytics', 
      description: 'BI dashboards, KPI tracking, export',
      path: '/reports',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.FINANCE_OFFICER, USER_ROLES.HR_MANAGER]
    },
    { 
      icon: Workflow, 
      label: 'Workflow Automation', 
      description: 'Approvals, triggers, business processes',
      path: '/workflow',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.FINANCE_OFFICER]
    },
    { 
      icon: FolderOpen, 
      label: 'Document Management', 
      description: 'Contracts, policies, SOPs, storage',
      path: '/documents',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.HR_MANAGER]
    },
    { 
      icon: Database, 
      label: 'Assets Management', 
      description: 'Asset register, depreciation, maintenance',
      path: '/assets',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_OFFICER, USER_ROLES.OPERATIONS_MANAGER]
    },
    { 
      icon: Activity, 
      label: 'Tracker', 
      description: 'Track jobs, vendors, POs, inventory, vehicles, staff',
      path: '/tracker',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.FINANCE_OFFICER, USER_ROLES.HR_MANAGER, USER_ROLES.SUPERVISOR]
    },
    { 
      icon: Smartphone, 
      label: 'Field Operations', 
      description: 'Messages, live jobs, GPS tracking',
      path: '/fieldops',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR, USER_ROLES.HR_MANAGER, USER_ROLES.FINANCE_OFFICER, USER_ROLES.SALES_AGENT, USER_ROLES.CLEANER]
    },
    { 
      icon: Smartphone, 
      label: 'Mobile App', 
      description: 'Cleaner dashboard, jobs, clock in/out',
      path: '/mobile',
      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR, USER_ROLES.HR_MANAGER, USER_ROLES.FINANCE_OFFICER, USER_ROLES.SALES_AGENT, USER_ROLES.CLEANER]
    },
  ]

  const modules = allModules.filter(module => {
    if (userRole === USER_ROLES.SUPER_ADMIN) return true
    return module.roles.includes(userRole)
  })

  const isModuleBuilt = (module) => {
    const builtModules = [
      '/hr', '/payroll', '/crm', '/sales', '/operations', 
      '/inventory', '/procurement', '/audit', '/finance', '/fleet', 
      '/reports', '/workflow', '/documents', '/assets', 
      '/tracker', '/fieldops', '/mobile'
    ]
    return builtModules.includes(module.path)
  }

  const handleModuleClick = (module) => {
    const availableModules = [
      '/hr', '/payroll', '/crm', '/sales', '/operations', 
      '/inventory', '/procurement', '/audit', '/finance', '/fleet', 
      '/reports', '/workflow', '/documents', '/assets', 
      '/tracker', '/fieldops', '/mobile', '/dashboard', '/users'
    ]
    
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
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-800 dark:text-white">Welcome {userName}</h1>
            <p className="text-base text-slate-500 dark:text-slate-400 font-medium mt-1">Innovation Without End</p>
          </div>
        </div>
      </header>

      <main id="main-dashboard" className="max-w-7xl mx-auto px-4 pb-16 pt-4">
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
      </main>
    </div>
  )
}
