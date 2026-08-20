import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import { supabase } from '../lib/supabaseClient'
import toast from 'react-hot-toast'
import { USER_ROLES, ROLE_LABELS } from '../types/authTypes'
import { 
  Users, Search, Edit, Trash2, Plus, X, Check, Sun, Moon, 
  Sparkles, RefreshCw, Mail, Shield, AlertCircle
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

  // ============================================
  // LOAD USERS
  // ============================================
  const loadUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) {
        console.error('Load error:', error)
        toast.error(`Failed: ${error.message}`)
        setLoading(false)
        return
      }

      console.log(`📊 Loaded ${data?.length || 0} users`)
      setUsers(data || [])
    } catch (err) {
      console.error('Exception:', err)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // UPDATE ROLE - Direct supabase update with verification
  // ============================================
  const handleUpdateRole = async () => {
    if (!editingUser || !editRole) {
      toast.error('Please select a role')
      return
    }

    setSavingRole(true)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔄 STARTING ROLE UPDATE')
    console.log('User ID:', editingUser.id)
    console.log('User Email:', editingUser.email)
    console.log('Current Role:', editingUser.role)
    console.log('New Role:', editRole)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      // Direct update - no .single(), no .select()
      const { error } = await supabase
        .from('profiles')
        .update({ role: editRole })
        .eq('id', editingUser.id)

      if (error) {
        console.error('❌ Update error:', error.message, error.details, error.hint)
        toast.error(`Failed: ${error.message}`)
        setSavingRole(false)
        return
      }

      // Verify the update worked by fetching the user
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', editingUser.id)
        .maybeSingle()

      if (verifyError) {
        console.error('❌ Verify error:', verifyError)
      }

      console.log('✅ Verified role:', verifyData?.role)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === editingUser.id ? { ...u, role: editRole } : u
      ))

      toast.success(`Role updated to ${ROLE_LABELS[editRole] || editRole}!`)
      setEditingUser(null)
      setEditRole('')
    } catch (err) {
      console.error('❌ Exception:', err)
      toast.error('Exception occurred')
    } finally {
      setSavingRole(false)
    }
  }

  // ============================================
  // ADD USER
  // ============================================
  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast.error('Email and password required')
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
        toast.error(authError.message)
        return
      }

      console.log('✅ Auth user created:', authData?.user?.id)

      // Try to insert profile if it doesn't exist yet
      const { error: insertError } = await supabase
        .from('profiles')
        .upsert([{
          id: authData.user.id,
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role,
          is_active: true
        }], { onConflict: 'id' })

      if (insertError) {
        console.error('Profile insert error:', insertError)
      }

      toast.success('User created!')
      setShowAddModal(false)
      setNewUser({ email: '', password: '', full_name: '', role: 'cleaner' })
      loadUsers()
    } catch (err) {
      console.error('Exception:', err)
      toast.error('Failed')
    }
  }

  // ============================================
  // DEACTIVATE / REACTIVATE
  // ============================================
  const handleToggleActive = async (user) => {
    const newStatus = !user.is_active
    const action = newStatus ? 'Reactivate' : 'Deactivate'
    
    if (!window.confirm(`${action} ${user.full_name || user.email}?`)) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', user.id)

      if (error) {
        toast.error(error.message)
        return
      }

      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, is_active: newStatus } : u
      ))
      toast.success(`${action}d successfully`)
    } catch (err) {
      console.error(err)
      toast.error('Failed')
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

  const roleOptions = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'operations_manager', label: 'Operations Manager' },
    { value: 'hr_manager', label: 'HR Manager' },
    { value: 'finance_officer', label: 'Finance Officer' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'cleaner', label: 'Cleaner' },
    { value: 'sales_agent', label: 'Sales Agent' },
    { value: 'customer', label: 'Customer' },
  ]

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
            <p className="text-slate-500 mt-1">{users.length} users</p>
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
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
          <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="all">All Roles</option>
            {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {/* Users Table */}
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
                    <th className="text-right py-4 px-4 text-sm font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <span className="text-emerald-600 font-semibold text-sm">
                              {user.full_name?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm text-slate-800 dark:text-white">{user.full_name || 'Unnamed'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{user.email}</td>
                      <td className="py-3 px-4">
                        {editingUser?.id === user.id ? (
                          <div className="flex items-center gap-2">
                            <select value={editRole} onChange={e => setEditRole(e.target.value)} className="p-2 neu-inset rounded-lg text-sm text-slate-700 dark:text-slate-300" autoFocus>
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
                        <span className={`flex items-center gap-1 text-xs ${user.is_active !== false ? 'text-emerald-600' : 'text-red-600'}`}>
                          <span className={`w-2 h-2 rounded-full ${user.is_active !== false ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          {user.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleToggleActive(user)} className={`p-2 rounded-lg transition-colors ${user.is_active !== false ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={user.is_active !== false ? 'Deactivate' : 'Reactivate'}>
                          {user.is_active !== false ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
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

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="neu-raised rounded-3xl p-6 max-w-md w-full bg-white dark:bg-slate-800" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Add User</h3>
              <div className="space-y-3">
                <input type="text" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} placeholder="Full Name" className="w-full p-3 neu-inset rounded-xl" />
                <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="Email" className="w-full p-3 neu-inset rounded-xl" />
                <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="Password (min 6 chars)" className="w-full p-3 neu-inset rounded-xl" />
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full p-3 neu-inset rounded-xl">
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
