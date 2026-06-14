import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Users, Search, Plus, Edit, Trash2, Shield, Save, X,
  Sun, Moon, Sparkles, Mail, Key, CheckCircle2, AlertCircle,
  UserPlus, UserCheck, UserX, Eye, EyeOff, ChevronDown,
  ArrowLeft, RefreshCw
} from 'lucide-react'

const ALL_MODULES = [
  { id: 'hr', label: 'HR Management', icon: '👥' },
  { id: 'payroll', label: 'Payroll', icon: '💰' },
  { id: 'attendance', label: 'Attendance', icon: '⏰' },
  { id: 'crm', label: 'CRM & Clients', icon: '🏢' },
  { id: 'sales', label: 'Sales & Quotations', icon: '📄' },
  { id: 'operations', label: 'Operations', icon: '🔧' },
  { id: 'inventory', label: 'Inventory', icon: '📦' },
  { id: 'procurement', label: 'Procurement', icon: '🛒' },
  { id: 'finance', label: 'Finance', icon: '💳' },
  { id: 'fleet', label: 'Fleet Management', icon: '🚛' },
  { id: 'reports', label: 'Reporting', icon: '📊' },
  { id: 'workflow', label: 'Workflow Automation', icon: '⚙️' },
  { id: 'documents', label: 'Document Management', icon: '📁' },
  { id: 'assets', label: 'Assets Management', icon: '🏗️' },
  { id: 'mobile', label: 'Field Operations', icon: '📱' },
]

// Default module permissions for each role
const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: ['hr', 'payroll', 'attendance', 'crm', 'sales', 'operations', 'inventory', 'procurement', 'finance', 'fleet', 'reports', 'workflow', 'documents', 'assets', 'mobile'],
  operations_manager: ['hr', 'attendance', 'crm', 'sales', 'operations', 'inventory', 'procurement', 'finance', 'fleet', 'reports', 'workflow', 'documents', 'assets', 'mobile'],
  hr_manager: ['hr', 'payroll', 'attendance', 'documents', 'reports'],
  finance_officer: ['payroll', 'sales', 'procurement', 'finance', 'assets', 'reports', 'workflow'],
  supervisor: ['attendance', 'operations', 'inventory', 'fleet', 'mobile'],
  sales_agent: ['crm', 'sales', 'documents'],
  cleaner: ['mobile'],
  customer: ['crm'],
}

const ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'operations_manager', label: 'Operations Manager', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'hr_manager', label: 'HR Manager', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'finance_officer', label: 'Finance Officer', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'supervisor', label: 'Supervisor', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'sales_agent', label: 'Sales Agent', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { value: 'cleaner', label: 'Cleaner', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  { value: 'customer', label: 'Customer', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
]

export default function UserManagement() {
  const { user, profile } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'cleaner',
    module_permissions: []
  })
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  
  // Track if permissions were manually changed by user
  const [manuallyChanged, setManuallyChanged] = useState(false)

  const isSuperAdmin = profile?.role === 'super_admin'

  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admin can access User Management')
      navigate('/dashboard')
      return
    }
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setUsers(profiles || [])
    } catch (error) {
      console.error('Error loading profiles:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  // 🔥 FIX: Auto-set permissions when role changes
  const handleRoleChange = (newRole) => {
    console.log('🔄 Role changed to:', newRole)
    console.log('📋 Default permissions:', DEFAULT_ROLE_PERMISSIONS[newRole])
    
    if (!manuallyChanged) {
      // Auto-set permissions based on role
      setFormData({
        ...formData,
        role: newRole,
        module_permissions: [...(DEFAULT_ROLE_PERMISSIONS[newRole] || [])]
      })
      console.log('✅ Auto-set permissions for role:', newRole)
    } else {
      // Only update role, keep manual permissions
      setFormData({
        ...formData,
        role: newRole
      })
      console.log('🔒 Keeping manual permissions')
    }
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setManuallyChanged(false)
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS['cleaner'] || ['mobile']
    setFormData({ 
      email: '', 
      password: '', 
      full_name: '', 
      role: 'cleaner', 
      module_permissions: [...defaultPerms] 
    })
    setShowPassword(false)
    setShowModal(true)
    console.log('➕ Add new user - default permissions:', defaultPerms)
  }

  const handleEditUser = (userData) => {
    setEditingUser(userData)
    setManuallyChanged(true) // Don't auto-change when editing existing
    setFormData({
      email: userData.email || '',
      password: '',
      full_name: userData.full_name || '',
      role: userData.role || 'cleaner',
      module_permissions: [...(userData.module_permissions || DEFAULT_ROLE_PERMISSIONS[userData.role] || [])]
    })
    setShowPassword(false)
    setShowModal(true)
    console.log('✏️ Edit user - permissions:', userData.module_permissions?.length)
  }

  const handleSaveUser = async () => {
    if (!formData.email.trim()) { toast.error('Email is required'); return }
    if (!editingUser && !formData.password) { toast.error('Password is required'); return }
    if (!editingUser && formData.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    
    setSaving(true)
    try {
      if (editingUser) {
        const updates = {
          email: formData.email.trim(),
          full_name: formData.full_name.trim(),
          role: formData.role,
          module_permissions: formData.module_permissions,
          updated_at: new Date().toISOString()
        }
        const { error: profileError } = await supabase.from('profiles').update(updates).eq('id', editingUser.id)
        if (profileError) throw profileError
        if (formData.password) {
          await supabase.auth.updateUser({ password: formData.password })
        }
        toast.success('User updated! ✅')
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: { data: { full_name: formData.full_name.trim(), role: formData.role } }
        })
        if (authError) {
          if (authError.message?.includes('already')) { toast.error('User already exists'); throw authError }
          throw authError
        }
        if (authData?.user) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            email: formData.email.trim(),
            full_name: formData.full_name.trim(),
            role: formData.role,
            module_permissions: formData.module_permissions,
            is_active: true
          })
          toast.success('User created! ✅')
        }
      }
      setShowModal(false)
      loadUsers()
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error.message || 'Failed to save user')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    try {
      await supabase.from('profiles').update({ is_active: false, role: 'customer', updated_at: new Date().toISOString() }).eq('id', userId)
      toast.success('User deactivated')
      setDeleteConfirm(null)
      loadUsers()
    } catch (error) {
      toast.error('Failed to deactivate user')
    }
  }

  // 🔥 FIX: Mark as manually changed when user clicks a checkbox
  const toggleModulePermission = (moduleId) => {
    console.log('🖐️ Manual permission change:', moduleId)
    setManuallyChanged(true)
    const current = formData.module_permissions || []
    if (current.includes(moduleId)) {
      setFormData({ ...formData, module_permissions: current.filter(m => m !== moduleId) })
    } else {
      setFormData({ ...formData, module_permissions: [...current, moduleId] })
    }
  }

  const selectAllModules = () => {
    setManuallyChanged(true)
    setFormData({ ...formData, module_permissions: ALL_MODULES.map(m => m.id) })
  }

  const clearAllModules = () => {
    setManuallyChanged(true)
    setFormData({ ...formData, module_permissions: [] })
  }

  const getRoleBadge = (role) => {
    const found = ROLES.find(r => r.value === role)
    return found?.color || 'bg-slate-100 text-slate-700'
  }

  const getRoleLabel = (role) => {
    const found = ROLES.find(r => r.value === role)
    return found?.label || role?.replace(/_/g, ' ') || 'Unknown'
  }

  const filteredUsers = users.filter(u => {
    if (search && !u.email?.toLowerCase().includes(search.toLowerCase()) && !u.full_name?.toLowerCase().includes(search.toLowerCase())) return false
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    return true
  })

  if (!isSuperAdmin) {
    return (
      <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
        <Navbar />
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-20 h-20 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <button onClick={() => navigate('/dashboard')} className="px-6 py-3 rounded-xl bg-emerald-600 text-white">Back to Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 pt-8 pb-16">
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Dashboard</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2"><Users className="w-8 h-8 text-emerald-600" /><h1 className="text-3xl font-bold">User Management</h1></div>
            <p className="text-slate-500 ml-11">{users.length} users</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadUsers} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm"><RefreshCw className="w-4 h-4 inline mr-1" />Refresh</button>
            <button onClick={handleAddUser} className="px-6 py-3 rounded-2xl bg-emerald-600 text-white flex items-center gap-2"><UserPlus className="w-5 h-5" />Add User</button>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-sm">
            <option value="all">All Roles</option>
            {ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
          </select>
        </div>

        {/* Users Grid */}
        {loading ? (
          <div className="text-center py-16"><div className="animate-spin rounded-full h-14 w-14 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u, i) => (
              <motion.div key={u.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="neu-raised rounded-2xl p-5">
                <div className="flex justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center"><Shield className="w-6 h-6 text-emerald-600" /></div>
                    <div><h3 className="font-semibold">{u.full_name || 'No Name'}</h3><p className="text-xs text-slate-500">{u.email}</p></div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEditUser(u)} className="p-2 rounded-xl bg-blue-100 text-blue-600"><Edit className="w-4 h-4" /></button>
                    {u.id !== user?.id && <button onClick={() => setDeleteConfirm(u)} className="p-2 rounded-xl bg-red-100 text-red-600"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getRoleBadge(u.role)}`}>{getRoleLabel(u.role)}</span>
                    <span className={`text-xs ${u.is_active !== false ? 'text-emerald-600' : 'text-red-600'}`}>{u.is_active !== false ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="text-xs text-slate-500">Modules: {(u.module_permissions?.length || 0)} of {ALL_MODULES.length}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16"><Users className="w-20 h-20 text-slate-300 mx-auto mb-4" /><p className="text-slate-500">No users found</p></div>
        )}
      </main>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
                <div><h3 className="text-lg font-bold">{editingUser ? 'Edit User' : 'Add New User'}</h3></div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div><label className="text-xs font-semibold mb-1 block">Email *</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 rounded-xl border bg-slate-50 text-sm" placeholder="user@example.com" /></div>
                <div><label className="text-xs font-semibold mb-1 block">Full Name</label><input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full p-3 rounded-xl border bg-slate-50 text-sm" placeholder="John Doe" /></div>
                <div><label className="text-xs font-semibold mb-1 block">{editingUser ? 'New Password (leave blank)' : 'Password *'}</label><input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 rounded-xl border bg-slate-50 text-sm" /></div>
                
                {/* 🔥 ROLE DROPDOWN - Triggers auto-check */}
                <div>
                  <label className="text-xs font-semibold mb-1 block">Role</label>
                  <select 
                    value={formData.role} 
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full p-3 rounded-xl border bg-slate-50 text-sm"
                  >
                    {ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
                  </select>
                </div>

                {/* Module Permissions */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold">Module Permissions ({formData.module_permissions?.length || 0}/{ALL_MODULES.length})</label>
                    <div className="flex gap-2">
                      <button onClick={selectAllModules} className="text-xs text-blue-600 hover:underline">All</button>
                      <button onClick={clearAllModules} className="text-xs text-red-600 hover:underline">Clear</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto p-2 border rounded-xl">
                    {ALL_MODULES.map(mod => {
                      const isChecked = (formData.module_permissions || []).includes(mod.id)
                      return (
                        <label key={mod.id} 
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                            isChecked ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-transparent hover:bg-slate-100'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => toggleModulePermission(mod.id)} 
                            className="w-4 h-4 text-emerald-600 rounded" 
                          />
                          <span className="text-xs">{mod.icon} {mod.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t">
                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl bg-slate-200 text-sm">Cancel</button>
                <button onClick={handleSaveUser} disabled={saving} className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">
                  {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 className="w-7 h-7 text-red-500" /></div>
              <h3 className="text-lg font-bold mb-2">Deactivate User?</h3>
              <p className="text-sm mb-1">{deleteConfirm.email}</p>
              <div className="flex gap-3 justify-center mt-4">
                <button onClick={() => setDeleteConfirm(null)} className="px-6 py-2.5 rounded-xl bg-slate-200 text-sm">Cancel</button>
                <button onClick={() => handleDeleteUser(deleteConfirm.id)} className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold">Deactivate</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
