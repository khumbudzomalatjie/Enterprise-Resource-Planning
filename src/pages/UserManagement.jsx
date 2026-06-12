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
  UserPlus, UserCheck, UserX, Eye, EyeOff, ChevronDown
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
  { value: 'super_admin', label: 'Super Admin', color: 'bg-red-100 text-red-700' },
  { value: 'operations_manager', label: 'Operations Manager', color: 'bg-blue-100 text-blue-700' },
  { value: 'hr_manager', label: 'HR Manager', color: 'bg-purple-100 text-purple-700' },
  { value: 'finance_officer', label: 'Finance Officer', color: 'bg-amber-100 text-amber-700' },
  { value: 'supervisor', label: 'Supervisor', color: 'bg-green-100 text-green-700' },
  { value: 'sales_agent', label: 'Sales Agent', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'cleaner', label: 'Cleaner', color: 'bg-teal-100 text-teal-700' },
  { value: 'customer', label: 'Customer', color: 'bg-slate-100 text-slate-700' },
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
      // Get all profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get auth users for last sign in
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      
      const enrichedUsers = (profiles || []).map(prof => {
        const authUser = authUsers?.users?.find(u => u.id === prof.id)
        return {
          ...prof,
          last_sign_in: authUser?.last_sign_in_at || null,
          email_confirmed: authUser?.email_confirmed_at ? true : false
        }
      })

      setUsers(enrichedUsers)
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setFormData({ email: '', password: '', full_name: '', role: 'cleaner', module_permissions: [] })
    setShowModal(true)
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setFormData({
      email: user.email || '',
      password: '',
      full_name: user.full_name || '',
      role: user.role || 'cleaner',
      module_permissions: user.module_permissions || []
    })
    setShowModal(true)
  }

  const handleSaveUser = async () => {
    if (!formData.email) { toast.error('Email is required'); return }
    if (!editingUser && !formData.password) { toast.error('Password is required for new users'); return }
    
    setSaving(true)

    try {
      if (editingUser) {
        // Update existing user
        const updates = {
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          module_permissions: formData.module_permissions
        }

        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', editingUser.id)

        if (profileError) throw profileError

        // Update password if provided
        if (formData.password) {
          const { error: pwError } = await supabase.auth.admin.updateUserById(
            editingUser.id,
            { password: formData.password }
          )
          if (pwError) throw pwError
        }

        // Update user metadata
        const { error: metaError } = await supabase.auth.admin.updateUserById(
          editingUser.id,
          { user_metadata: { role: formData.role, full_name: formData.full_name } }
        )
        if (metaError) console.log('Metadata update note:', metaError.message)

        // Log the action
        await supabase.from('user_management_log').insert([{
          action_type: 'user_updated',
          target_user_id: editingUser.id,
          performed_by: user?.id,
          details: { changes: updates }
        }])

        toast.success('User updated!')
      } else {
        // Create new user via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true,
          user_metadata: { role: formData.role, full_name: formData.full_name }
        })

        if (authError) {
          // If admin API not available, try signUp
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: { data: { role: formData.role, full_name: formData.full_name } }
          })

          if (signUpError) throw signUpError

          // Update profile with role and permissions
          if (signUpData?.user) {
            await supabase.from('profiles').update({
              role: formData.role,
              full_name: formData.full_name,
              module_permissions: formData.module_permissions,
              is_active: true
            }).eq('id', signUpData.user.id)

            // Log
            await supabase.from('user_management_log').insert([{
              action_type: 'user_created',
              target_user_id: signUpData.user.id,
              performed_by: user?.id,
              details: { email: formData.email, role: formData.role }
            }])
          }
        } else if (authData?.user) {
          // Update profile
          await supabase.from('profiles').update({
            role: formData.role,
            full_name: formData.full_name,
            module_permissions: formData.module_permissions,
            is_active: true
          }).eq('id', authData.user.id)

          await supabase.from('user_management_log').insert([{
            action_type: 'user_created',
            target_user_id: authData.user.id,
            performed_by: user?.id,
            details: { email: formData.email, role: formData.role }
          }])
        }

        toast.success('User created!')
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
      // Deactivate the user (soft delete)
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false, role: 'customer' })
        .eq('id', userId)

      if (error) throw error

      await supabase.from('user_management_log').insert([{
        action_type: 'user_deactivated',
        target_user_id: userId,
        performed_by: user?.id,
        details: { deactivated_at: new Date().toISOString() }
      }])

      toast.success('User deactivated')
      setDeleteConfirm(null)
      loadUsers()
    } catch (error) {
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
    return found?.color || 'bg-slate-100 text-slate-700'
  }

  const getRoleLabel = (role) => {
    const found = ROLES.find(r => r.value === role)
    return found?.label || role?.replace('_', ' ') || 'Unknown'
  }

  const filteredUsers = users.filter(u => {
    if (search && !u.email?.toLowerCase().includes(search.toLowerCase()) && !u.full_name?.toLowerCase().includes(search.toLowerCase())) return false
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    return true
  })

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center"><Shield className="w-16 h-16 text-red-400 mx-auto mb-4" /><p className="text-slate-500">Access Denied</p></div>
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><Users className="w-8 h-8 text-emerald-600" />User Management</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage users, roles, and module permissions</p>
          </div>
          <button onClick={handleAddUser} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
            <UserPlus className="w-5 h-5" /><span>Add User</span>
          </button>
        </motion.div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" /></div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-sm">
            <option value="all">All Roles</option>
            {ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
          </select>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div><p className="text-slate-500">Loading users...</p></div>
        ) : (
          <div className="neu-raised rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"><th className="text-left py-3 px-4 text-slate-500">User</th><th className="text-left py-3 px-4 text-slate-500">Email</th><th className="text-left py-3 px-4 text-slate-500">Role</th><th className="text-left py-3 px-4 text-slate-500">Status</th><th className="text-left py-3 px-4 text-slate-500">Permissions</th><th className="text-right py-3 px-4 text-slate-500">Actions</th></tr></thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-600" /></div><div><p className="font-medium text-slate-800 dark:text-white">{u.full_name || 'No Name'}</p><p className="text-xs text-slate-500">ID: {u.id?.slice(0, 8)}...</p></div></div></td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{u.email}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs ${getRoleBadge(u.role)}`}>{getRoleLabel(u.role)}</span></td>
                      <td className="py-3 px-4"><span className={`flex items-center gap-1 text-xs ${u.is_active !== false ? 'text-emerald-600' : 'text-red-600'}`}>{u.is_active !== false ? <><CheckCircle2 className="w-3 h-3" /> Active</> : <><AlertCircle className="w-3 h-3" /> Inactive</>}</span></td>
                      <td className="py-3 px-4"><span className="text-xs text-slate-500">{(u.module_permissions?.length || 0)} modules</span></td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEditUser(u)} className="p-2 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600" title="Edit"><Edit className="w-4 h-4" /></button>
                          {u.id !== user?.id && (
                            <button onClick={() => setDeleteConfirm(u)} className="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600" title="Deactivate"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (<div className="text-center py-12"><Users className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No users found</p></div>)}
          </div>
        )}
      </main>

      {/* Add/Edit User Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white dark:bg-slate-800 z-10">
                <h3 className="text-lg font-bold">{editingUser ? 'Edit User' : 'Add New User'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-5 space-y-4">
                {/* Email */}
                <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Email *</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm" placeholder="user@example.com" /></div>
                
                {/* Full Name */}
                <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Full Name</label><input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm" placeholder="John Doe" /></div>
                
                {/* Password */}
                <div><label className="text-xs font-semibold text-slate-500 mb-1 block">{editingUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                  <div className="relative"><input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm pr-10" /><button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
                
                {/* Role */}
                <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Role</label><select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm">{ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}</select></div>

                {/* Module Permissions */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-slate-500">Module Permissions</label>
                    <div className="flex gap-2">
                      <button onClick={selectAllModules} className="text-xs text-blue-600 hover:underline">Select All</button>
                      <button onClick={clearAllModules} className="text-xs text-red-600 hover:underline">Clear All</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-xl">
                    {ALL_MODULES.map(mod => (
                      <label key={mod.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                        (formData.module_permissions || []).includes(mod.id) ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200' : 'bg-slate-50 dark:bg-slate-700 border border-transparent hover:bg-slate-100'
                      }`}>
                        <input type="checkbox" checked={(formData.module_permissions || []).includes(mod.id)} onChange={() => toggleModulePermission(mod.id)} className="w-4 h-4 text-emerald-600 rounded" />
                        <span className="text-xs">{mod.icon} {mod.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-5 border-t">
                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-sm font-medium">Cancel</button>
                <button onClick={handleSaveUser} disabled={saving} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save className="w-4 h-4" />}
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
              <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">Deactivate User?</h3>
              <p className="text-slate-500 text-sm mb-1">{deleteConfirm.email}</p>
              <p className="text-slate-400 text-xs mb-4">The user will no longer be able to log in.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 rounded-xl bg-slate-200 text-sm">Cancel</button>
                <button onClick={() => handleDeleteUser(deleteConfirm.id)} className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold">Deactivate</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
