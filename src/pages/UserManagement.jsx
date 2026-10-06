import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import { userAdminApi } from '../lib/userAdminApi'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'
import { USER_ROLES, ROLE_LABELS } from '../types/authTypes'
import {
  Users, Search, Edit, Trash2, Plus, X, Check, Sun, Moon,
  Sparkles, RefreshCw, AlertCircle, Eye, EyeOff,
  RotateCcw, Sliders, Lock, ShieldCheck, PlusCircle, Ban
} from 'lucide-react'

// ═══════════════════════════════════════════════
// Every module + its role access (SAME as Dashboard.jsx)
// ═══════════════════════════════════════════════
const ALL_MODULES = [
  { path: '/hr',         label: 'Human Resources',         roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.HR_MANAGER, USER_ROLES.OPERATIONS_MANAGER] },
  { path: '/payroll',    label: 'Payroll',                 roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_OFFICER, USER_ROLES.HR_MANAGER] },
  { path: '/crm',        label: 'CRM & Clients',           roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SALES_AGENT] },
  { path: '/sales',      label: 'Sales & Quotations',      roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SALES_AGENT, USER_ROLES.FINANCE_OFFICER] },
  { path: '/operations', label: 'Operations',              roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR] },
  { path: '/inventory',  label: 'Inventory',               roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR] },
  { path: '/procurement',label: 'Procurement',             roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.FINANCE_OFFICER] },
  { path: '/audit',      label: 'Audit Trail',             roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.HR_MANAGER, USER_ROLES.FINANCE_OFFICER] },
  { path: '/finance',    label: 'Finance',                 roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_OFFICER, USER_ROLES.OPERATIONS_MANAGER] },
  { path: '/fleet',      label: 'Fleet Management',        roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR] },
  { path: '/reports',    label: 'Reporting & Analytics',   roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.FINANCE_OFFICER, USER_ROLES.HR_MANAGER] },
  { path: '/workflow',   label: 'Workflow Automation',     roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.FINANCE_OFFICER] },
  { path: '/documents',  label: 'Document Management',     roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.HR_MANAGER] },
  { path: '/assets',     label: 'Assets Management',       roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_OFFICER, USER_ROLES.OPERATIONS_MANAGER] },
  { path: '/tracker',    label: 'Tracker',                 roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.FINANCE_OFFICER, USER_ROLES.HR_MANAGER, USER_ROLES.SUPERVISOR] },
  { path: '/fieldops',   label: 'Field Operations',        roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR, USER_ROLES.HR_MANAGER, USER_ROLES.FINANCE_OFFICER, USER_ROLES.SALES_AGENT, USER_ROLES.CLEANER] },
  { path: '/mobile',     label: 'Mobile App',              roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR, USER_ROLES.HR_MANAGER, USER_ROLES.FINANCE_OFFICER, USER_ROLES.SALES_AGENT, USER_ROLES.CLEANER] },
  { path: '/users',      label: 'User Management',         roles: [USER_ROLES.SUPER_ADMIN] },
]

// Compute what a user can ACTUALLY see:
//   (role-permitted  OR  extra-granted)  minus  hidden_modules
const getEffectiveAccess = (user) => {
  if (!user) return { visible: 0, roleAllowed: 0, hidden: 0, granted: 0, blocked: 0, total: ALL_MODULES.length }

  const roleAllowed = ALL_MODULES.filter(m =>
    user.role === USER_ROLES.SUPER_ADMIN || m.roles.includes(user.role)
  )
  const hiddenList = Array.isArray(user.hidden_modules) ? user.hidden_modules : []
  const extraList  = Array.isArray(user.extra_modules)  ? user.extra_modules  : []

  // Role-permitted minus hidden
  const visibleFromRole = roleAllowed.filter(m => !hiddenList.includes(m.path))

  // Role-blocked but admin granted
  const visibleFromExtra = ALL_MODULES.filter(m =>
    !roleAllowed.some(r => r.path === m.path) && extraList.includes(m.path)
  )

  return {
    visible:    visibleFromRole.length + visibleFromExtra.length,
    roleAllowed: roleAllowed.length,
    hidden:     roleAllowed.length - visibleFromRole.length,
    granted:    visibleFromExtra.length,
    blocked:    ALL_MODULES.length - roleAllowed.length - visibleFromExtra.length,
    total:      ALL_MODULES.length
  }
}

const roleOptions = [
  { value: 'super_admin',        label: 'Super Admin' },
  { value: 'operations_manager', label: 'Operations Manager' },
  { value: 'hr_manager',         label: 'HR Manager' },
  { value: 'finance_officer',    label: 'Finance Officer' },
  { value: 'supervisor',         label: 'Supervisor' },
  { value: 'cleaner',            label: 'Cleaner' },
  { value: 'sales_agent',        label: 'Sales Agent' },
  { value: 'customer',           label: 'Customer' },
]

export default function UserManagement() {
  const { isDark, toggleTheme } = useThemeStore()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [showDeleted, setShowDeleted] = useState(false)

  const [editingUser, setEditingUser] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [savingRole, setSavingRole] = useState(false)

  const [customizingUser, setCustomizingUser] = useState(null)
  const [hiddenModules, setHiddenModules] = useState([])   // role-permitted but hidden
  const [extraModules,  setExtraModules]  = useState([])   // role-blocked but granted
  const [savingAccess, setSavingAccess] = useState(false)

  const [showAddModal, setShowAddModal] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'cleaner' })

  useEffect(() => { loadUsers() }, [showDeleted])

  const loadUsers = async () => {
    setLoading(true)
    const { data, error } = await userAdminApi.listUsers({ includeDeleted: showDeleted })
    if (error) {
      toast.error(`Failed to load users: ${error.message}`)
    } else {
      setUsers(data)
    }
    setLoading(false)
  }

  // ============================================
  // ROLE
  // ============================================
  const handleUpdateRole = async () => {
    if (!editingUser || !editRole) return
    setSavingRole(true)
    const { success, error } = await userAdminApi.setRole(editingUser.id, editRole)
    if (!success) {
      toast.error(`Failed: ${error?.message || 'Unknown error'}`)
    } else {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, role: editRole } : u))
      toast.success(`Role updated to ${ROLE_LABELS[editRole] || editRole}`)
      setEditingUser(null)
      setEditRole('')
    }
    setSavingRole(false)
  }

  // ============================================
  // ACTIVATE / DEACTIVATE
  // ============================================
  const handleToggleActive = async (user) => {
    const newStatus = !user.is_active
    const action = newStatus ? 'Reactivate' : 'Deactivate'
    if (!window.confirm(`${action} ${user.full_name || user.email}?`)) return

    const { success, error } = await userAdminApi.setActive(user.id, newStatus)
    if (!success) { toast.error(error?.message || 'Failed'); return }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u))
    toast.success(`${action}d successfully`)
  }

  // ============================================
  // SOFT DELETE / RESTORE
  // ============================================
  const handleSoftDelete = async (user) => {
    if (!window.confirm(`Delete ${user.full_name || user.email}?\n\nThis hides the user and blocks their login.`)) return
    const { success, error } = await userAdminApi.softDelete(user.id)
    if (!success) { toast.error(error?.message || 'Failed'); return }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: false, deleted_at: new Date().toISOString() } : u))
    toast.success('User deleted')
  }

  const handleRestore = async (user) => {
    if (!window.confirm(`Restore ${user.full_name || user.email}?`)) return
    const { success, error } = await userAdminApi.restore(user.id)
    if (!success) { toast.error(error?.message || 'Failed'); return }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: true, deleted_at: null } : u))
    toast.success('User restored')
  }

  // ============================================
  // CUSTOMIZE ACCESS
  // ============================================
  const openCustomize = (user) => {
    setCustomizingUser(user)
    setHiddenModules(Array.isArray(user.hidden_modules) ? user.hidden_modules : [])
    setExtraModules(Array.isArray(user.extra_modules) ? user.extra_modules : [])
  }

  const roleAllows = (user, mod) =>
    user.role === USER_ROLES.SUPER_ADMIN || mod.roles.includes(user.role)

  const getModuleState = (user, mod) => {
    const roleOk   = roleAllows(user, mod)
    const isHidden = hiddenModules.includes(mod.path)
    const isGrant  = extraModules.includes(mod.path)

    if (roleOk) return isHidden ? 'hidden' : 'visible'      // 🟢 / 🟡
    return isGrant ? 'granted' : 'blocked'                  // 🔵 / ⚪
  }

  const toggleModule = (mod) => {
    const roleOk = roleAllows(customizingUser, mod)

    if (roleOk) {
      setHiddenModules(prev =>
        prev.includes(mod.path) ? prev.filter(p => p !== mod.path) : [...prev, mod.path]
      )
    } else {
      setExtraModules(prev =>
        prev.includes(mod.path) ? prev.filter(p => p !== mod.path) : [...prev, mod.path]
      )
    }
  }

  const handleSaveAccess = async () => {
    if (!customizingUser) return
    setSavingAccess(true)

    const roleAllowedPaths = ALL_MODULES
      .filter(m => roleAllows(customizingUser, m))
      .map(m => m.path)

    // Sanity: hidden only applies to role-permitted; extra only applies to role-blocked
    const cleanHidden = hiddenModules.filter(p => roleAllowedPaths.includes(p))
    const cleanExtra  = extraModules.filter(p => !roleAllowedPaths.includes(p))

    const [r1, r2] = await Promise.all([
      userAdminApi.setHiddenModules(customizingUser.id, cleanHidden),
      userAdminApi.setExtraModules(customizingUser.id, cleanExtra)
    ])

    if (!r1.success || !r2.success) {
      toast.error((r1.error || r2.error)?.message || 'Failed')
    } else {
      setUsers(prev => prev.map(u => u.id === customizingUser.id
        ? { ...u, hidden_modules: cleanHidden, extra_modules: cleanExtra }
        : u))
      const parts = []
      if (cleanHidden.length) parts.push(`${cleanHidden.length} hidden`)
      if (cleanExtra.length)  parts.push(`${cleanExtra.length} granted`)
      toast.success(parts.length ? `Access updated — ${parts.join(', ')}` : 'Access reset')
      setCustomizingUser(null)
    }
    setSavingAccess(false)
  }

  // ============================================
  // ADD USER
  // ============================================
  const handleAddUser = async () => {
    if (!newUser.email) { toast.error('Email is required'); return }
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-ops', {
        body: { action: 'create', email: newUser.email, password: newUser.password || undefined, full_name: newUser.full_name, role: newUser.role }
      })
      if (error || data?.error) {
        toast.error('Could not create auth user. Deploy admin-user-ops Edge Function or use the Supabase dashboard.')
        return
      }
      toast.success('User created!')
      setShowAddModal(false)
      setNewUser({ email: '', password: '', full_name: '', role: 'cleaner' })
      loadUsers()
    } catch (err) {
      toast.error('Failed to create user')
    }
  }

  // ============================================
  // FILTER
  // ============================================
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    return matchesSearch && matchesRole
  })

  const getRoleBadge = (role) => {
    const colors = {
      super_admin: 'bg-red-100 text-red-700',
      operations_manager: 'bg-blue-100 text-blue-700',
      hr_manager: 'bg-purple-100 text-purple-700',
      finance_officer: 'bg-yellow-100 text-yellow-700',
      supervisor: 'bg-green-100 text-green-700',
      cleaner: 'bg-cyan-100 text-cyan-700',
      sales_agent: 'bg-pink-100 text-pink-700',
      customer: 'bg-orange-100 text-orange-700',
    }
    return colors[role] || 'bg-slate-100 text-slate-600'
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />

      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold hidden sm:inline text-emerald-800 dark:text-emerald-200">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-600" />User Management
            </h1>
            <p className="text-slate-500 mt-1">
              {filteredUsers.length} of {users.length} users{showDeleted ? ' (including deleted)' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddModal(true)} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-5 h-5" /><span>Add User</span>
            </button>
            <button onClick={loadUsers} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-slate-600 text-white hover:bg-slate-700">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
            />
          </div>
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
            className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Roles</option>
            {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button
            onClick={() => setShowDeleted(v => !v)}
            className={`px-4 py-3 neu-inset rounded-xl flex items-center gap-2 text-sm font-medium ${showDeleted ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}
          >
            {showDeleted ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{showDeleted ? 'Hide Deleted' : 'Show Deleted'}</span>
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        ) : (
          <div className="neu-raised rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-4 px-4 text-sm font-medium text-slate-500">User</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-slate-500">Email</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-slate-500">Role</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-slate-500">Status</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-slate-500">Access</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => {
                    const isDeleted = !!user.deleted_at
                    const access = getEffectiveAccess(user)

                    const accessChip =
                      access.visible === access.total
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : access.visible === 0
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : (access.hidden > 0 || access.granted > 0)
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'

                    return (
                      <tr key={user.id} className={`border-b border-slate-100 dark:border-slate-700/50 ${isDeleted ? 'opacity-50' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                              <span className="text-emerald-600 font-semibold text-sm">
                                {user.full_name?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <p className="font-medium text-sm text-slate-800 dark:text-white">
                              {user.full_name || 'Unnamed'}
                              {isDeleted && <span className="ml-2 text-xs text-red-500">(deleted)</span>}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{user.email}</td>
                        <td className="py-3 px-4">
                          {editingUser?.id === user.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={editRole}
                                onChange={e => setEditRole(e.target.value)}
                                className="p-2 neu-inset rounded-lg text-sm text-slate-700 dark:text-slate-300"
                                autoFocus
                              >
                                {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                              </select>
                              <button onClick={handleUpdateRole} disabled={savingRole} className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50">
                                {savingRole ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button onClick={() => { setEditingUser(null); setEditRole('') }} className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                                {user.role?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'No Role'}
                              </span>
                              <button onClick={() => { setEditingUser(user); setEditRole(user.role || 'cleaner') }} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" title="Edit Role">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`flex items-center gap-1 text-xs ${user.is_active !== false && !isDeleted ? 'text-emerald-600' : 'text-red-600'}`}>
                            <span className={`w-2 h-2 rounded-full ${user.is_active !== false && !isDeleted ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                            {isDeleted ? 'Deleted' : (user.is_active !== false ? 'Active' : 'Inactive')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => openCustomize(user)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${accessChip}`}
                            title={`Visible: ${access.visible}/${access.total} · Role-limited: ${access.blocked} · Admin-hidden: ${access.hidden} · Granted: ${access.granted}`}
                          >
                            <Sliders className="w-3 h-3" />
                            <span>{access.visible}/{access.total}</span>
                            {access.granted > 0 && <span className="text-[10px] opacity-75">· +{access.granted}</span>}
                            {access.hidden > 0  && <span className="text-[10px] opacity-75">· -{access.hidden}</span>}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {isDeleted ? (
                              <button onClick={() => handleRestore(user)} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" title="Restore">
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            ) : (
                              <>
                                <button onClick={() => handleToggleActive(user)} className={`p-2 rounded-lg transition-colors ${user.is_active !== false ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={user.is_active !== false ? 'Deactivate' : 'Activate'}>
                                  {user.is_active !== false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button onClick={() => handleSoftDelete(user)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No users found</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════
          CUSTOMIZE ACCESS MODAL — 4 states
      ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {customizingUser && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setCustomizingUser(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="neu-raised rounded-3xl p-6 max-w-2xl w-full bg-white dark:bg-slate-800 max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-emerald-600" />
                    Customize Access
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {customizingUser.full_name || customizingUser.email}
                    {' · '}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getRoleBadge(customizingUser.role)}`}>
                      {ROLE_LABELS[customizingUser.role] || customizingUser.role}
                    </span>
                  </p>
                </div>
                <button onClick={() => setCustomizingUser(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Legend */}
              <div className="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-500"></span>
                  <span className="text-slate-600 dark:text-slate-300"><strong>Allowed by role</strong> — user can see this module</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-amber-500"></span>
                  <span className="text-slate-600 dark:text-slate-300"><strong>Hidden by admin</strong> — role permits it, but you've hidden it</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-indigo-500"></span>
                  <span className="text-slate-600 dark:text-slate-300"><strong>Granted by admin</strong> — role doesn't permit, but you've granted it</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-slate-400"></span>
                  <span className="text-slate-600 dark:text-slate-300"><strong>Blocked</strong> — role doesn't permit and not granted</span>
                </div>
              </div>

              {/* Summary */}
              {(() => {
                const access = getEffectiveAccess({ ...customizingUser, hidden_modules: hiddenModules, extra_modules: extraModules })
                return (
                  <div className="mb-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                    <span>
                      <strong>{access.visible}</strong> of <strong>{access.total}</strong> visible
                      {' · '}<strong>{access.roleAllowed}</strong> role-allowed
                      {access.granted > 0 && <> · <strong>{access.granted}</strong> granted</>}
                      {access.hidden > 0 && <> · <strong>{access.hidden}</strong> hidden</>}
                      {' · '}<strong>{access.blocked}</strong> blocked
                    </span>
                  </div>
                )
              })()}

              <div className="flex-1 overflow-y-auto mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_MODULES.map(mod => {
                    const state = getModuleState(customizingUser, mod)

                    const bg =
                      state === 'blocked'
                        ? 'bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 opacity-70'
                        : state === 'hidden'
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                          : state === 'granted'
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'

                    const textClass =
                      state === 'blocked' ? 'text-slate-500 dark:text-slate-400' :
                      state === 'hidden'  ? 'text-amber-700 dark:text-amber-400 line-through' :
                      state === 'granted' ? 'text-indigo-700 dark:text-indigo-300' :
                                            'text-slate-800 dark:text-white'

                    return (
                      <label
                        key={mod.path}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${bg}`}
                      >
                        <input
                          type="checkbox"
                          checked={state === 'visible' || state === 'granted'}
                          onChange={() => toggleModule(mod)}
                          className="w-4 h-4 rounded accent-emerald-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {state === 'granted' && <PlusCircle className="w-3 h-3 text-indigo-500 flex-shrink-0" />}
                            {state === 'blocked' && <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                            {state === 'hidden'  && <Ban className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                            <p className={`text-sm font-medium truncate ${textClass}`}>
                              {mod.label}
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            {mod.path}
                            {state === 'blocked' && ' — role-restricted'}
                            {state === 'hidden'  && ' — hidden'}
                            {state === 'granted' && ' — granted'}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => { setHiddenModules([]); setExtraModules([]) }}
                  className="px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Reset to role defaults
                </button>
                <div className="flex gap-2">
                  <button onClick={() => setCustomizingUser(null)} className="px-5 py-2.5 rounded-xl bg-slate-600 text-white text-sm font-medium">
                    Cancel
                  </button>
                  <button onClick={handleSaveAccess} disabled={savingAccess} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                    {savingAccess && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════
          ADD USER MODAL
      ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="neu-raised rounded-3xl p-6 max-w-md w-full bg-white dark:bg-slate-800"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Add User</h3>
              <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  Creating an auth user requires the <code>admin-user-ops</code> Edge Function to be deployed.
                  Without it, use the Supabase dashboard to create users.
                </div>
              </div>
              <div className="space-y-3">
                <input type="text" value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="Full Name" className="w-full p-3 neu-inset rounded-xl" />
                <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email" className="w-full p-3 neu-inset rounded-xl" />
                <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Password (min 6 chars)" className="w-full p-3 neu-inset rounded-xl" />
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="w-full p-3 neu-inset rounded-xl">
                  {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl bg-slate-600 text-white">Cancel</button>
                <button onClick={handleAddUser} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold">Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
