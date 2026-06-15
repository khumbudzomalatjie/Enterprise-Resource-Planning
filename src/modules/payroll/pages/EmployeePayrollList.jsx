import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Search, Users, Eye, ChevronRight, ArrowLeft,
  Sun, Moon, Sparkles, CreditCard, Mail, Phone,
  Briefcase, Plus
} from 'lucide-react'

export default function EmployeePayrollList() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState(null)

  useEffect(() => { loadEmployees() }, [statusFilter])

  const loadEmployees = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Get ALL employees from HR database
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .order('first_name')

      if (empError) {
        console.error('Error loading employees:', empError)
        setError(empError.message)
        setLoading(false)
        return
      }

      if (!empData || empData.length === 0) {
        setEmployees([])
        setLoading(false)
        return
      }

      // Filter by status if needed
      let filteredData = empData
      if (statusFilter !== 'all') {
        filteredData = empData.filter(emp => emp.employment_status === statusFilter)
      }

      // Get payroll profiles for these employees
      const employeeIds = filteredData.map(e => e.id)
      
      let profileData = []
      if (employeeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('payroll_profiles')
          .select('*')
          .in('employee_id', employeeIds)
        profileData = profiles || []
      }

      // Merge profiles with employees
      const merged = filteredData.map(emp => ({
        ...emp,
        payroll_profile: profileData?.find(p => p.employee_id === emp.id) || null
      }))

      setEmployees(merged)
      console.log('Employees loaded:', merged.length)
      
    } catch (error) {
      console.error('Error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (!search.trim()) {
      loadEmployees()
      return
    }
    
    const s = search.toLowerCase()
    const filtered = employees.filter(emp => 
      (emp.first_name || '').toLowerCase().includes(s) ||
      (emp.last_name || '').toLowerCase().includes(s) ||
      (emp.employee_code || '').toLowerCase().includes(s) ||
      (emp.email || '').toLowerCase().includes(s) ||
      (emp.department || '').toLowerCase().includes(s)
    )
    
    return filtered
  }

  const displayEmployees = search.trim() ? handleSearch() : employees

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
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/payroll" className="text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">Payroll</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Employee Payroll Profiles</span>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-600" />
              Employee Payroll Profiles
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {employees.length} employees · {employees.filter(e => e.payroll_profile).length} with payroll profiles
            </p>
          </div>
          <button onClick={loadEmployees} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700">
            Refresh
          </button>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="neu-raised rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search by name, code, email, or department..." 
                className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 text-sm" 
              />
            </div>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
              <option value="terminated">Terminated</option>
            </select>
            <button 
              onClick={loadEmployees}
              className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
            >
              Search
            </button>
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <div className="neu-raised rounded-3xl p-8 mb-6 text-center border-2 border-red-200">
            <p className="text-red-600 font-semibold mb-2">Error loading employees</p>
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <button onClick={loadEmployees} className="px-6 py-2 rounded-xl bg-red-600 text-white text-sm">Try Again</button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading employees from HR database...</p>
          </div>
        )}

        {/* Employee Grid */}
        {!loading && !error && (
          <>
            {displayEmployees && displayEmployees.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayEmployees.map((emp, index) => (
                  <motion.div
                    key={emp.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => navigate(`/payroll/employees/${emp.id}`)}
                    className="neu-raised rounded-2xl p-5 stat-card cursor-pointer hover:scale-[1.02] transition-all"
                  >
                    {/* Employee Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        {emp.profile_photo_url ? (
                          <img src={emp.profile_photo_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-lg">
                            {emp.first_name?.[0]}{emp.last_name?.[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 dark:text-white">
                          {emp.first_name} {emp.last_name}
                        </h3>
                        <p className="text-xs text-slate-500">{emp.employee_code}</p>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        emp.employment_status === 'active' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : emp.employment_status === 'on_leave'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {emp.employment_status?.replace('_', ' ') || 'Unknown'}
                      </span>
                      {emp.payroll_profile ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Profile Set
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          No Profile
                        </span>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{emp.email || 'No email'}</span>
                      </div>
                      {emp.phone && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{emp.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{emp.position || 'No position'}</span>
                      </div>
                    </div>

                    {/* Payroll Info */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-600">
                      {emp.payroll_profile ? (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Basic Salary:</span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(emp.payroll_profile.basic_salary)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">Payroll profile not set</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/payroll/employees/${emp.id}`) }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Setup
                          </button>
                        </div>
                      )}
                    </div>

                    {/* View Button */}
                    <div className="mt-3 flex justify-end">
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/payroll/employees/${emp.id}`) }}
                        className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 transition-colors"
                        title="View Payroll Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-16 neu-raised rounded-3xl">
                <Users className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">No employees found</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">
                  {search || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Add employees in the HR module first'}
                </p>
                {!search && statusFilter === 'all' && (
                  <button 
                    onClick={() => navigate('/hr/employees/new')}
                    className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Employee in HR</span>
                  </button>
                )}
              </motion.div>
            )}
          </>
        )}

        {/* Stats Summary */}
        {!loading && !error && employees.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="neu-raised rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-500">Total Employees</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{employees.length}</p>
            </div>
            <div className="neu-raised rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-500">Active</p>
              <p className="text-2xl font-bold text-emerald-600">{employees.filter(e => e.employment_status === 'active').length}</p>
            </div>
            <div className="neu-raised rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-500">With Payroll Profile</p>
              <p className="text-2xl font-bold text-blue-600">{employees.filter(e => e.payroll_profile).length}</p>
            </div>
            <div className="neu-raised rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-500">Missing Profile</p>
              <p className="text-2xl font-bold text-red-600">{employees.filter(e => !e.payroll_profile).length}</p>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
