import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import usePayrollStore from '../store/payrollStore'
import useThemeStore from '../../../store/themeStore'
import { 
  Search, Users, Eye, ChevronRight, ArrowLeft,
  Sun, Moon, Sparkles, CreditCard, Mail, Phone
} from 'lucide-react'

export default function EmployeePayrollList() {
  const { employees, fetchEmployees, loading } = usePayrollStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => { loadEmployees() }, [statusFilter])

  const loadEmployees = async () => {
    const filters = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    if (search) filters.search = search
    await fetchEmployees(filters)
  }

  const filteredEmployees = (employees || []).filter(emp => {
    if (!search) return true
    const s = search.toLowerCase()
    return (emp.first_name || '').toLowerCase().includes(s) ||
           (emp.last_name || '').toLowerCase().includes(s) ||
           (emp.employee_code || '').toLowerCase().includes(s)
  })

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

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
          <Link to="/payroll" className="text-slate-500 hover:text-emerald-600">Payroll</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Employees</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-600" />Employee Payroll Profiles
          </h1>
          <p className="text-slate-500 mt-1">{filteredEmployees.length} employees</p>
        </motion.div>

        <div className="neu-raised rounded-2xl p-4 mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." 
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" onKeyDown={e => e.key === 'Enter' && loadEmployees()} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-sm">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp, i) => (
            <motion.div key={emp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/payroll/employees/${emp.id}`)}
              className="neu-raised rounded-2xl p-5 stat-card cursor-pointer hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <span className="text-emerald-600 font-semibold">{emp.first_name?.[0]}{emp.last_name?.[0]}</span>
                </div>
                <div>
                  <h3 className="font-semibold">{emp.first_name} {emp.last_name}</h3>
                  <p className="text-xs text-slate-500">{emp.employee_code}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{emp.email}</div>
                {emp.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone}</div>}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-600 flex justify-between items-center">
                <span className="text-xs text-slate-500">{emp.position || 'No position'}</span>
                <button className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600"><Eye className="w-4 h-4" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  )
}
