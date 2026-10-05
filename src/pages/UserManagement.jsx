import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import { userAdminApi } from '../lib/userAdminApi'
import toast from 'react-hot-toast'
import { USER_ROLES, ROLE_LABELS } from '../types/authTypes'
import {
  Users, Search, Edit, Trash2, Plus, X, Check, Sun, Moon,
  Sparkles, RefreshCw, Shield, AlertCircle, Eye, EyeOff,
  RotateCcw, Sliders
} from 'lucide-react'

// Every module that can appear on the Dashboard
const ALL_MODULES = [
  { path: '/hr',           label: 'Human Resources' },
  { path: '/payroll',      label: 'Payroll' },
  { path: '/crm',          label: 'CRM & Clients' },
  { path: '/sales',        label: 'Sales & Quotations' },
  { path: '/operations',   label: 'Operations' },
  { path: '/inventory',    label: 'Inventory' },
  { path: '/procurement',  label: 'Procurement' },
  { path: '/audit',        label: 'Audit Trail' },
  { path: '/finance',      label: 'Finance' },
  { path: '/fleet',        label: 'Fleet Management' },
  { path: '/reports',      label: 'Reporting & Analytics' },
  { path: '/workflow',     label: 'Workflow Automation' },
  { path: '/documents',    label: 'Document Management' },
  { path: '/assets',       label: 'Assets Management' },
  { path: '/tracker',      label: 'Tracker' },
  { path: '/fieldops',     label: 'Field Operations' },
  { path: '/mobile',       label: 'Mobile App' },
  { path: '/users',        label: 'User Management' },
]

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

  // Role editing
  const [editingUser, setEditingUser] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [savingRole, setSavingRole] = useState(false)

  // Customize access
  const [customizingUser, setCustomizingUser] = useState(null)
  const [hiddenModules, setHiddenModules] = useState([])
  const [savingAccess, setSavingAccess] = useState(false)

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'cleaner' })

  useEffect(() => { loadUsers() }, [showDeleted])

  // ============================================
  // LOAD
  // ============================================
  const loadUsers = async () => {
    setLoading(true)
    const { data, error } = await userAdminApi.listUsers({ includeDeleted: showDeleted })
    if (error) {
      console.error('Load error:', error)
      toast.error(`Failed to load users: ${error.message}`)
    } else {
      console.log(`📊 Loaded ${data.length} users${showDeleted ? ' (incl. deleted)' : ''}`)
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
    if (!success) {
      toast.error(error?.message || 'Failed')
      return
    }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u))
    toast.success(`${action}d successfully`)
  }

  // ============================================
  // SOFT DELETE
  // ============================================
  const handleSoftDelete = async (user) => {
    if (!window.confirm(`Delete ${user.full_name || user.email}?\n\nThis hides the user and blocks their login. You can restore them from "Show Deleted".`)) return
    const { success, error } = await userAdminApi.softDelete(user.id)
    if (!success) {
      toast.error(error?.message || 'Failed')
      return
    }
    setUsers(prev => prev.map(u => u.id === user.id
      ? { ...u, is_active: false, deleted_at: new Date().toISOString() }
      : u))
    toast.success('User deleted')
  }

  const handleRestore = async (user) => {
    if (!window.confirm(`Restore ${user.full_name || user.email}?`)) return
    const { success, error } = await userAdminApi.restore(user.id)
    if (!success) {
      toast.error(error?.message || 'Failed')
      return
    }
    setUsers(prev => prev.map(u => u.id === user.id
      ? { ...u, is_active: true, deleted_at: null }
      : u))
    toast.success('User restored')
  }

  // ============================================
  // CUSTOMIZE ACCESS
  // ============================================
  const openCustomize = (user) => {
    setCustomizingUser(user)
    setHiddenModules(Array.isArray(user.hidden_modules) ? user.hidden_modules : [])
  }

  const toggleHiddenModule = (path) => {
    setHiddenModules(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    )
  }

  const handleSaveAccess = async () => {
    if (!customizingUser) return
    setSavingAccess(true)
    const { success, error } = await userAdminApi.setHiddenModules(customizingUser.id, hiddenModules)
    if (!success) {
      toast.error(error?.message || 'Failed')
    } else {
      setUsers(prev => prev.map(u => u.id === customizingUser.id
        ? { ...u, hidden_modules: hiddenModules }
        : u))
      toast.success(`Access customized — ${hiddenModules.length} module(s) hidden`)
      setCustomizingUser(null)
    }
    setSavingAccess(false)
  }

  // ============================================
  // ADD USER (uses upsert on profiles as fallback —
  // real auth creation needs the Edge Function)
  // ============================================
  const handleAddUser = async () => {
    if (!newUser.email) {
      toast.error('Email is required')
      return
    }
    try {
      // Attempt to create the auth user via the Edge Function
      const { data, error } = await supabase.functions.invoke('admin-user-ops', {
        body: {
          action: 'create',
          email: newUser.email,
          password: newUser.password || undefined,
          full_name: newUser.full_name,
          role: newUser.role
        }
      })

      if (error || data?.error) {
        console.error('Admin create error:', error || data?.error)
        // Fallback: just add a profile row
        toast.error('Could not create auth user. Use Supabase dashboard or deploy admin-user-ops Edge Function.')
        return
      }

      toast.success('User created!')
      setShowAddModal(false)
      setNewUser({ email: '', password: '', full_name: '', role: 'cleaner' })
      loadUsers()
    } catch (err) {
      console.error('Exception:', err)
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
        {/* Header */}
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
            title={showDeleted ? 'Hide deleted users' : 'Show deleted users'}
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
                    const hiddenCount = Array.isArray(user.hidden_modules) ? user.hidden_modules.length : 0
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
                              <button
                                onClick={handleUpdateRole}
                                disabled={savingRole}
                                className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                              >
                                {savingRole ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => { setEditingUser(null); setEditRole('') }}
                                className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                                {user.role?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'No Role'}
                              </span>
                              <button
                                onClick={() => { setEditingUser(user); setEditRole(user.role || 'cleaner') }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                title="Edit Role"
                              >
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
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                              hiddenCount > 0
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title="Customize which modules this user sees"
                          >
                            <Sliders className="w-3 h-3" />
                            {hiddenCount > 0 ? `${hiddenCount} hidden` : 'Full'}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {isDeleted ? (
                              <button
                                onClick={() => handleRestore(user)}
                                className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                title="Restore"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleToggleActive(user)}
                                  className={`p-2 rounded-lg transition-colors ${user.is_active !== false ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                  title={user.is_active !== false ? 'Deactivate' : 'Activate'}
                                >
                                  {user.is_active !== false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleSoftDelete(user)}
                                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  title="Delete"
                                >
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
          CUSTOMIZE ACCESS MODAL
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
                  </p>
                </div>
                <button
                  onClick={() => setCustomizingUser(null)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Unchecked</strong> modules will be hidden from this user's dashboard.
                  Their role still determines what they can <em>do</em>; this controls what they <em>see</em>.
                  Super Admins always see everything.
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_MODULES.map(mod => {
                    const isHidden = hiddenModules.includes(mod.path)
                    return (
                      <label
                        key={mod.path}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${
                          isHidden
                            ? 'bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!isHidden}
                          onChange={() => toggleHiddenModule(mod.path)}
                          className="w-4 h-4 rounded accent-emerald-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isHidden ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>
                            {mod.label}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{mod.path}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setHiddenModules([])}
                  className="px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Reset (show everything)
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCustomizingUser(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-600 text-white text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAccess}
                    disabled={savingAccess}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                  >
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
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="Full Name"
                  className="w-full p-3 neu-inset rounded-xl"
                />
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Email"
                  className="w-full p-3 neu-inset rounded-xl"
                />
                <input
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Password (min 6 chars)"
                  className="w-full p-3 neu-inset rounded-xl"
                />
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full p-3 neu-inset rounded-xl"
                >
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
