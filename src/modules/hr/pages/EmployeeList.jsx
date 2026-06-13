import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useHRStore from '../store/hrStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Search, Plus, Users, UserPlus, ChevronRight,
  Mail, Phone, MapPin, Briefcase, Sun, Moon, Sparkles,
  Pencil, Eye, Trash2
} from 'lucide-react'

export default function EmployeeList() {
  const { employees, fetchEmployees, deleteEmployee, loading } = useHRStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('all')
  const [status, setStatus] = useState('all')

  useEffect(() => {
    loadEmployees()
  }, [department, status])

  const loadEmployees = async () => {
    const filters = {}
    if (search) filters.search = search
    if (department !== 'all') filters.department = department
    // We'll fetch all and filter terminated client‑side to ensure they never appear
    if (status !== 'all') filters.status = status
    await fetchEmployees(filters)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadEmployees()
  }

  // Filter out terminated employees ALWAYS, regardless of status filter
  const activeEmployees = (employees || []).filter(emp => emp.employment_status !== 'terminated')

  const handleEdit = (e, employeeId) => {
    e.stopPropagation()
    navigate(`/hr/employees/${employeeId}`)
  }

  const handleView = (employeeId) => {
    navigate(`/hr/employees/${employeeId}`)
  }

  const handleDelete = async (e, employeeId, employeeName) => {
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to permanently remove ${employeeName}?`)) {
      const result = await deleteEmployee(employeeId)
      if (result.success) {
        toast.success(`${employeeName} has been removed`)
        // The store already removes it from state; no need to reload but we can
      } else {
        toast.error('Failed to remove employee')
      }
    }
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
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
          <Link to="/hr" className="text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">HR Dashboard</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Employees</span>
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
              Employees
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{activeEmployees.length} active employee records</p>
          </div>
          
          <button
            onClick={() => navigate('/hr/employees/new')}
            className="neu-raised neu-btn px-6 py-3 rounded-2xl flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Employee</span>
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
                placeholder="Search employees by name, email, or code..."
                className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
            
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Departments</option>
              <option value="Operations">Operations</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Administration">Administration</option>
              <option value="Sales">Sales</option>
              <option value="HR">Human Resources</option>
              <option value="Finance">Finance</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Active Status</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              {/* Terminated removed – they are permanently hidden */}
            </select>

            <button
              type="submit"
              className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              Search
            </button>
          </form>
        </motion.div>

        {/* Employee Grid – only non‑terminated */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading employees...</p>
          </div>
        ) : activeEmployees.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeEmployees.map((emp, index) => (
              <motion.div
                key={emp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="neu-raised rounded-2xl p-5 stat-card hover:scale-[1.02] transition-transform"
              >
                {/* Top section - Avatar and Actions */}
                <div className="flex items-start justify-between mb-3">
                  <div 
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => handleView(emp.id)}
                  >
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
                      <p className="text-xs text-slate-500 dark:text-slate-400">{emp.employee_code}</p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleView(emp.id)}
                      className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                      title="View Employee Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={(e) => handleEdit(e, emp.id)}
                      className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      title="Edit Employee"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete Button – always visible for non‑terminated */}
                    <button
                      onClick={(e) => handleDelete(e, emp.id, `${emp.first_name} ${emp.last_name}`)}
                      className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      title="Remove Employee Permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    emp.employment_status === 'active' 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : emp.employment_status === 'on_leave'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : emp.employment_status === 'suspended'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                  }`}>
                    {emp.employment_status?.replace('_', ' ') || 'Unknown'}
                  </span>
                  {emp.department && (
                    <span className="ml-2 px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                      {emp.department}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Briefcase className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{emp.position || 'No position'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  {emp.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>{emp.phone}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="text-center py-16 neu-raised rounded-3xl"
          >
            <Users className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">No employees found</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">
              {search || department !== 'all' || status !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Start by adding your first employee'}
            </p>
            {!search && department === 'all' && status === 'all' && (
              <button
                onClick={() => navigate('/hr/employees/new')}
                className="mt-2 neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add First Employee</span>
              </button>
            )}
          </motion.div>
        )}

        {/* Stats Summary – only for non‑terminated */}
        {!loading && activeEmployees.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.3 }}
            className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <div className="neu-raised rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Active</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{activeEmployees.length}</p>
            </div>
            <div className="neu-raised rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
              <p className="text-2xl font-bold text-emerald-600">{activeEmployees.filter(e => e.employment_status === 'active').length}</p>
            </div>
            <div className="neu-raised rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">On Leave</p>
              <p className="text-2xl font-bold text-amber-600">{activeEmployees.filter(e => e.employment_status === 'on_leave').length}</p>
            </div>
            <div className="neu-raised rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">Inactive/Suspended</p>
              <p className="text-2xl font-bold text-red-600">{activeEmployees.filter(e => e.employment_status === 'inactive' || e.employment_status === 'suspended').length}</p>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
