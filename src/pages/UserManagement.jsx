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
  
  // Add/Edit Modal
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
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Check if current user is super admin
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
      // Get all profiles from the database
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading profiles:', error)
        toast.error('Failed to load users')
        setLoading(false)
        return
      }

      setUsers(profiles || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setFormData({ email: '', password: '', full_name: '', role: 'cleaner', module_permissions: [] })
    setShowPassword(false)
    setShowModal(true)
  }

  const handleEditUser = (userData) => {
    setEditingUser(userData)
    setFormData({
      email: userData.email || '',
      password: '',
      full_name: userData.full_name || '',
      role: userData.role || 'cleaner',
      module_permissions: userData.module_permissions || []
    })
    setShowPassword(false)
    setShowModal(true)
  }

  const handleSaveUser = async () => {
    if (!formData.email.trim()) { 
      toast.error('Email is required')
      return 
    }
    if (!editingUser && !formData.password) { 
      toast.error('Password is required for new users')
      return 
    }
    if (!editingUser && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    setSaving(true)

    try {
      if (editingUser) {
        // UPDATE EXISTING USER
        console.log('Updating user:', editingUser.id)
        
        // Update profile in database
        const updates = {
          email: formData.email.trim(),
          full_name: formData.full_name.trim(),
          role: formData.role,
          module_permissions: formData.module_permissions,
          updated_at: new Date().toISOString()
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', editingUser.id)

        if (profileError) throw profileError

        // Update password if provided
        if (formData.password) {
          const { error: pwError } = await supabase.auth.updateUser({
            password: formData.password
          })
          if (pwError) {
            console.log('Password update note:', pwError.message)
            // Continue anyway - password update might fail but profile is updated
          }
        }

        // Log the action
        await supabase.from('user_management_log').insert([{
          action_type: 'user_updated',
          target_user_id: editingUser.id,
          performed_by: user?.id,
          details: { changes: updates }
        }]).then(() => {}, () => {}) // Ignore log errors

        toast.success('User updated successfully! ✅')
      } else {
        // CREATE NEW USER
        console.log('Creating new user:', formData.email)
        
        // Use Supabase Auth signUp
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name.trim(),
              role: formData.role
            }
          }
        })

        if (authError) {
          console.error('Auth error:', authError)
          
          // If user already exists, try to update their profile
          if (authError.message?.includes('already') || authError.message?.includes('exists')) {
            toast.error('A user with this email already exists')
            setSaving(false)
            return
          }
          
          throw authError
        }

        if (authData?.user) {
          // Update the profile with role and permissions
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              role: formData.role,
              full_name: formData.full_name.trim(),
              module_permissions: formData.module_permissions,
              is_active: true
            })
            .eq('id', authData.user.id)

          if (updateError) {
            console.error('Profile update error:', updateError)
            // Profile might not exist yet, try insert
            const { error: insertError } = await supabase
              .from('profiles')
              .upsert({
                id: authData.user.id,
                email: formData.email.trim(),
                full_name: formData.full_name.trim(),
                role: formData.role,
                module_permissions: formData.module_permissions,
                is_active: true
              })
            
            if (insertError) {
              console.error('Profile insert error:', insertError)
            }
          }

          // Log
          await supabase.from('user_management_log').insert([{
            action_type: 'user_created',
            target_user_id: authData.user.id,
            performed_by: user?.id,
            details: { email: formData.email, role: formData.role }
          }]).then(() => {}, () => {})

          toast.success('User created successfully! ✅')
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
      // Soft delete - deactivate the user
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_active: false, 
          role: 'customer',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      // Log
      await supabase.from('user_management_log').insert([{
        action_type: 'user_deactivated',
        target_user_id: userId,
        performed_by: user?.id,
        details: { deactivated_at: new Date().toISOString() }
      }]).then(() => {}, () => {})

      toast.success('User deactivated')
      setDeleteConfirm(null)
      loadUsers()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to deactivate user')
    }
  }

  const toggleModulePermission = (moduleId) => {
    const current = formData.module_permissions || []
    if (current.includes(moduleId)) {
      setFormData({ ...formData, module_permissions: current.filter(m => m !== moduleId) })
    } else {
      setFormData({ ...formData, module_permissions: [...current, moduleId] })
    }
  }

  const selectAllModules = () => {
    setFormData({ ...formData, module_permissions: ALL_MODULES.map(m => m.id) })
  }

  const clearAllModules = () => {
    setFormData({ ...formData, module_permissions: [] })
  }

  const getRoleBadge = (role) => {
    const found = ROLES.find(r => r.value === role)
    return found?.color || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
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
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">Only Super Admin can access User Management</p>
            <button onClick={() => navigate('/dashboard')} className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium">
              Back to Dashboard
            </button>
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
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Breadcrumb */}
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Dashboard</span>
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">User Management</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">
              {users.length} users · Manage roles and module permissions
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadUsers} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={handleAddUser} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
              <UserPlus className="w-5 h-5" /><span>Add User</span>
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Users, label: 'Total Users', value: users.length, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
            { icon: UserCheck, label: 'Active', value: users.filter(u => u.is_active !== false).length, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { icon: UserX, label: 'Inactive', value: users.filter(u => u.is_active === false).length, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
            { icon: Shield, label: 'Super Admins', value: users.filter(u => u.role === 'super_admin').length, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="neu-raised rounded-2xl p-4">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="neu-raised rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 text-sm" />
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 text-sm">
              <option value="all">All Roles</option>
              {ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
            </select>
          </div>
        </motion.div>

        {/* Users Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Loading users...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u, i) => (
              <motion.div key={u.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="neu-raised rounded-2xl p-5 stat-card hover:scale-[1.02] transition-transform">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">{u.full_name || 'No Name'}</h3>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEditUser(u)} className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200" title="Edit User">
                      <Edit className="w-4 h-4" />
                    </button>
                    {u.id !== user?.id && (
                      <button onClick={() => setDeleteConfirm(u)} className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200" title="Deactivate User">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getRoleBadge(u.role)}`}>{getRoleLabel(u.role)}</span>
                    <span className={`flex items-center gap-1 text-xs ${u.is_active !== false ? 'text-emerald-600' : 'text-red-600'}`}>
                      {u.is_active !== false ? <><CheckCircle2 className="w-3 h-3" /> Active</> : <><AlertCircle className="w-3 h-3" /> Inactive</>}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    <span className="font-medium">Modules:</span> {(u.module_permissions?.length || 0)} of {ALL_MODULES.length}
                  </p>
                  {u.module_permissions?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {u.module_permissions.slice(0, 4).map(m => (
                        <span key={m} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                          {ALL_MODULES.find(mod => mod.id === m)?.label?.split(' ')[0] || m}
                        </span>
                      ))}
                      {u.module_permissions.length > 4 && <span className="text-[10px] text-slate-400">+{u.module_permissions.length - 4} more</span>}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 neu-raised rounded-3xl">
            <Users className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">No users found</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">
              {search || roleFilter !== 'all' ? 'Try adjusting your search or filters' : 'Start by adding your first user'}
            </p>
            {!search && roleFilter === 'all' && (
              <button onClick={handleAddUser} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white inline-flex items-center gap-2">
                <Plus className="w-5 h-5" /><span>Add First User</span>
              </button>
            )}
          </motion.div>
        )}
      </main>

      {/* Add/Edit User Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 rounded-t-2xl">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{editingUser ? 'Edit User' : 'Add New User'}</h3>
                  {editingUser && <p className="text-xs text-slate-500">{editingUser.email}</p>}
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white" placeholder="user@example.com" />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Full Name</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white" placeholder="John Doe" />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                    {editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white" placeholder={editingUser ? '••••••••' : 'Min 6 characters'} />
                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Role</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white appearance-none">
                      {ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Module Permissions */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Module Permissions</label>
                    <div className="flex gap-2">
                      <button onClick={selectAllModules} className="text-xs text-blue-600 hover:underline">Select All</button>
                      <button onClick={clearAllModules} className="text-xs text-red-600 hover:underline">Clear</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto p-2 border border-slate-200 dark:border-slate-600 rounded-xl">
                    {ALL_MODULES.map(mod => (
                      <label key={mod.id} 
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                          (formData.module_permissions || []).includes(mod.id) 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
                            : 'bg-slate-50 dark:bg-slate-700/50 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-600'
                        }`}>
                        <input 
                          type="checkbox" 
                          checked={(formData.module_permissions || []).includes(mod.id)} 
                          onChange={() => toggleModulePermission(mod.id)} 
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" 
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300">{mod.icon} {mod.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
                <button onClick={() => setShowModal(false)} 
                  className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSaveUser} disabled={saving} 
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
                  {saving ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4" /> {editingUser ? 'Update User' : 'Create User'}</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Deactivate User?</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-1 font-medium">{deleteConfirm.email}</p>
              <p className="text-slate-500 dark:text-slate-500 text-xs mb-6">The user will no longer be able to log in. This action can be reversed by an admin.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteConfirm(null)} 
                  className="px-6 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                  Cancel
                </button>
                <button onClick={() => handleDeleteUser(deleteConfirm.id)} 
                  className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">
                  Deactivate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
