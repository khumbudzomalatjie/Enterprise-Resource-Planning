import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'
import { USER_ROLES, ROLE_LABELS } from '../types/authTypes'
import { 
  Users, Search, Edit, Trash2, Shield, ChevronDown, 
  Plus, Mail, Phone, Calendar, X, Check, Sun, Moon, 
  Sparkles, Eye, EyeOff, Key, AlertCircle
} from 'lucide-react'

export default function UserManagement() {
  const { profile } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [editingUser, setEditingUser] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [savingRole, setSavingRole] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'cleaner' })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
      console.log(`📊 Loaded ${data?.length || 0} users`)
    } catch (err) {
      console.error('Failed to load users:', err)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // ✅ FIXED: Actually saves role to Supabase
  // ============================================
  const handleUpdateRole = async () => {
    if (!editingUser || !editRole) {
      toast.error('Please select a role')
      return
    }

    setSavingRole(true)
    try {
      console.log(`🔄 Updating role for ${editingUser.email} to ${editRole}`)

      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          role: editRole,
          updated_at: new Date().toISOString() 
        })
        .eq('id', editingUser.id)
        .select()
        .single()

      if (error) {
        console.error('Update error:', error)
        toast.error(`Failed to update role: ${error.message}`)
        return
      }

      console.log('✅ Role updated successfully:', data)
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, role: editRole } : u))
      
      toast.success(`Role updated to ${ROLE_LABELS[editRole] || editRole}!`)
      setEditingUser(null)
      setEditRole('')
      
      // Reload to confirm
      await loadUsers()
    } catch (err) {
      console.error('Exception:', err)
      toast.error('Failed to update role')
    } finally {
      setSavingRole(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast.error('Email and password are required')
      return
    }

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
        user_metadata: { full_name: newUser.full_name, role: newUser.role }
      })

      if (authError) {
        toast.error(`Failed to create user: ${authError.message}`)
        return
      }

      // Update profile with role
      if (authData?.user) {
        await supabase.from('profiles').update({ 
          role: newUser.role, 
          full_name: newUser.full_name 
        }).eq('id', authData.user.id)
      }

      toast.success('User created!')
      setShowAddModal(false)
      setNewUser({ email: '', password: '', full_name: '', role: 'cleaner' })
      loadUsers()
    } catch (err) {
      toast.error('Failed to create user')
    }
  }

  const handleDeactivate = async (userId) => {
    if (!window.confirm('Deactivate this user? They will no longer be able to log in.')) return
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error
      toast.success('User deactivated')
      loadUsers()
    } catch (err) {
      toast.error('Failed to deactivate')
    }
  }

  const handleReactivate = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error
      toast.success('User reactivated')
      loadUsers()
    } catch (err) {
      toast.error('Failed to reactivate')
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    return matchesSearch && matchesRole
  })

  const getRoleBadge = (role) => {
    const colors = {
      super_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      operations_manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      hr_manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      finance_officer: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      supervisor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      cleaner: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      sales_agent: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      customer: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    }
    return colors[role] || 'bg-slate-100 text-slate-600'
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
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-emerald-600" />User Management
            </h1>
            <p className="text-slate-500 mt-1">{users.length} users in system</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddModal(true)} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-5 h-5" /><span>Add User</span>
            </button>
            <button onClick={loadUsers} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-slate-600 text-white hover:bg-slate-700">
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name or email..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
          <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="px-4 py-3 neu-inset rounded-xl">
            <option value="all">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : (
          <div className="neu-raised rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">User</th>
                    <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Email</th>
                    <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Role</th>
                    <th className="text-left text-sm font-medium text-slate-500 py-4 px-4">Status</th>
                    <th className="text-right text-sm font-medium text-slate-500 py-4 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <span className="text-emerald-600 font-semibold text-sm">
                              {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-white text-sm">{user.full_name || 'Unnamed User'}</p>
                            <p className="text-xs text-slate-500">ID: {user.id?.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{user.email}</td>
                      <td className="py-3 px-4">
                        {editingUser?.id === user.id ? (
                          <div className="flex items-center gap-2">
                            <select value={editRole} onChange={e => setEditRole(e.target.value)} className="p-2 neu-inset rounded-lg text-sm">
                              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                            <button onClick={handleUpdateRole} disabled={savingRole} className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setEditingUser(null); setEditRole('') }} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs ${getRoleBadge(user.role)}`}>
                            {ROLE_LABELS[user.role] || user.role || 'No Role'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`flex items-center gap-1 text-xs ${user.is_active !== false ? 'text-emerald-600' : 'text-red-600'}`}>
                          <span className={`w-2 h-2 rounded-full ${user.is_active !== false ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          {user.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingUser?.id !== user.id && (
                            <button onClick={() => { setEditingUser(user); setEditRole(user.role || 'cleaner') }} className="p-2 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600" title="Edit Role">
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {user.is_active !== false ? (
                            <button onClick={() => handleDeactivate(user.id)} className="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600" title="Deactivate">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => handleReactivate(user.id)} className="p-2 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600" title="Reactivate">
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No users found</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="neu-raised rounded-3xl p-6 max-w-md w-full bg-white dark:bg-slate-800" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Add New User</h3>
              <div className="space-y-3">
                <input type="text" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} placeholder="Full Name" className="w-full p-3 neu-inset rounded-xl" />
                <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="Email" className="w-full p-3 neu-inset rounded-xl" />
                <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="Password" className="w-full p-3 neu-inset rounded-xl" />
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full p-3 neu-inset rounded-xl">
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
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
