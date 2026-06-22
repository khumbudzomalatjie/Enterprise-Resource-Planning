import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useMessagesStore from '../store/messagesStore'
import useAuthStore from '../../../../store/authStore'
import useThemeStore from '../../../../store/themeStore'
import { supabase } from '../../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  MessageSquare, Users, Bell, Search, 
  ChevronRight, Send, ChevronDown, ChevronUp,
  Sparkles, Sun, Moon, User, UserCircle,
  CheckCheck, X, RefreshCw, Phone, Mail,
  Building2, Briefcase, Circle,
  MessageCircle, Star
} from 'lucide-react'

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🔥', '👏', '✅', '🙏']

export default function MessagesDashboard() {
  const { 
    conversations, messages, notifications, unreadCount,
    fetchConversations, selectConversation, selectedConversation,
    sendMessage, fetchNotifications,
    getOrCreateDirectConversation, addReaction, deleteMessage,
    markNotificationRead, markAllNotificationsRead
  } = useMessagesStore()
  const { user, profile } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [messageInput, setMessageInput] = useState('')
  const [showContacts, setShowContacts] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredMessage, setHoveredMessage] = useState(null)
  const [contacts, setContacts] = useState([])
  const [contactsLoading, setContactsLoading] = useState(false)
  const [expandedDepts, setExpandedDepts] = useState({})

  useEffect(() => {
    fetchConversations()
    fetchNotifications()
  }, [])

  // Load contacts directly when modal opens
  const loadContacts = async () => {
    setContactsLoading(true)
    console.log('🔍 Loading contacts directly from employees table...')
    
    try {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .order('department')
        .order('first_name')

      console.log('📊 Employees result:', { 
        count: employees?.length || 0, 
        error: error?.message || 'none',
        first: employees?.[0] 
      })

      if (!error && employees && employees.length > 0) {
        const mappedContacts = employees.map(emp => ({
          id: emp.user_id || emp.id,
          contact_type: 'employee',
          full_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unnamed',
          email: emp.email || '',
          phone: emp.phone || '',
          department: emp.department || 'Unassigned',
          position: emp.position || 'Staff',
          profile_photo_url: emp.profile_photo_url || null,
          is_active: emp.employment_status === 'active',
          employee_code: emp.employee_code || '',
          employment_status: emp.employment_status || 'active'
        }))
        console.log(`✅ Loaded ${mappedContacts.length} contacts`)
        setContacts(mappedContacts)
      } else if (error) {
        console.error('❌ Error:', error.message)
        toast.error('Failed to load contacts: ' + error.message)
        setContacts([])
      } else {
        console.warn('⚠️ No employees found')
        // Try profiles as fallback
        const { data: profiles } = await supabase.from('profiles').select('*').order('full_name')
        if (profiles && profiles.length > 0) {
          const mappedProfiles = profiles.map(p => ({
            id: p.id,
            contact_type: 'user',
            full_name: p.full_name || p.email || 'Unknown',
            email: p.email || '',
            phone: '',
            department: 'General',
            position: p.role || 'User',
            profile_photo_url: null,
            is_active: p.is_active !== false,
            employee_code: '',
            employment_status: 'active'
          }))
          setContacts(mappedProfiles)
          console.log(`✅ Loaded ${mappedProfiles.length} profiles as contacts`)
        } else {
          setContacts([])
        }
      }
    } catch (e) {
      console.error('❌ Error:', e)
      setContacts([])
    }
    setContactsLoading(false)
  }

  // Group contacts by department
  const groupedContacts = useMemo(() => {
    const groups = {}
    contacts.forEach(contact => {
      const dept = contact.department || 'Unassigned'
      if (!groups[dept]) groups[dept] = []
      groups[dept].push(contact)
    })
    return groups
  }, [contacts])

  // Filter contacts
  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts
    const term = searchTerm.toLowerCase()
    return contacts.filter(c => 
      c.full_name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.department?.toLowerCase().includes(term) ||
      c.position?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.employee_code?.toLowerCase().includes(term)
    )
  }, [contacts, searchTerm])

  const stats = useMemo(() => ({
    totalContacts: contacts.length,
    onlineCount: contacts.filter(c => c.is_active).length,
    departments: Object.keys(groupedContacts).length,
    activeConversations: conversations.length,
  }), [contacts, groupedContacts, conversations])

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return
    const result = await sendMessage({
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      message_type: 'text',
      content: messageInput.trim()
    })
    if (result.success) setMessageInput('')
    else toast.error('Failed to send')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
  }

  const handleStartChat = async (contactId) => {
    if (!contactId || contactId === user?.id) return
    const result = await getOrCreateDirectConversation(contactId)
    if (result.success) setShowContacts(false)
    else toast.error('Failed to start conversation')
  }

  const toggleDepartment = (dept) => {
    setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }))
  }

  const formatTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString()
  }

  const getRoleBadge = (role) => {
    const colors = {
      super_admin: 'bg-red-100 text-red-700', operations_manager: 'bg-blue-100 text-blue-700',
      hr_manager: 'bg-purple-100 text-purple-700', finance_officer: 'bg-yellow-100 text-yellow-700',
      supervisor: 'bg-green-100 text-green-700', cleaner: 'bg-cyan-100 text-cyan-700',
      sales_agent: 'bg-pink-100 text-pink-700', customer: 'bg-orange-100 text-orange-700',
      employee: 'bg-slate-100 text-slate-700',
    }
    return colors[role] || 'bg-slate-100 text-slate-700'
  }

  const otherParticipants = selectedConversation?.conversation_participants?.filter(p => p.user_id !== user?.id) || []

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <button onClick={() => setShowNotifications(!showNotifications)} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center relative">
          <Bell className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadCount}</span>}
        </button>
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">Field Ops</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Operations</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Messages & Contacts</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-emerald-600" />Messages & Contacts
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Employee directory with direct messaging</p>
          </div>
          <button onClick={() => { setShowContacts(true); loadContacts() }} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
            <Users className="w-5 h-5" /><span>Directory ({contacts.length})</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Users, label: 'Contacts', value: stats.totalContacts, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
            { icon: Circle, label: 'Active', value: stats.onlineCount, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { icon: Building2, label: 'Departments', value: stats.departments, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
            { icon: MessageCircle, label: 'Chats', value: stats.activeConversations, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
          ].map((s, i) => (
            <div key={i} className="neu-raised rounded-xl p-3 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <div><p className="text-xs text-slate-500">{s.label}</p><p className="text-lg font-bold text-slate-800 dark:text-white">{s.value}</p></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 h-[calc(100vh-380px)] min-h-[500px]">
          {/* Conversations List */}
          <div className="neu-raised rounded-3xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search conversations..." className="w-full pl-10 pr-4 py-2 neu-inset rounded-xl text-sm" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map(conv => {
                const isSelected = selectedConversation?.id === conv.id
                const otherUser = (conv.conversation_participants || []).find(p => p.user_id !== user?.id)
                return (
                  <div key={conv.id} onClick={() => selectConversation(conv.id)}
                    className={`p-4 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-l-emerald-600' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{otherUser?.profiles?.full_name || 'Unknown'}</p>
                          <span className="text-xs text-slate-400">{formatTime(conv.last_message_at)}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-1">{conv.last_message || 'No messages'}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              {conversations.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No conversations yet</p>
                  <button onClick={() => { setShowContacts(true); loadContacts() }} className="mt-2 text-emerald-600 text-sm hover:underline">Open Directory</button>
                </div>
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="neu-raised rounded-3xl overflow-hidden flex flex-col">
            {selectedConversation ? (
              <>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">{otherParticipants[0]?.profiles?.full_name || 'Chat'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map(msg => {
                    const isMine = msg.sender_id === user?.id
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        onMouseEnter={() => setHoveredMessage(msg.id)} onMouseLeave={() => setHoveredMessage(null)}>
                        <div className="max-w-[70%]">
                          {!isMine && <p className="text-xs text-slate-500 mb-1 ml-1">{msg.sender?.full_name}</p>}
                          <div className={`p-3 rounded-2xl ${isMine ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div className={`flex items-center gap-2 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-xs text-slate-400">{formatTime(msg.created_at)}</span>
                          </div>
                          {hoveredMessage === msg.id && (
                            <div className="flex gap-1 mt-1">
                              {EMOJI_LIST.slice(0, 4).map(emoji => (
                                <button key={emoji} onClick={() => addReaction(msg.id, emoji)} className="hover:scale-125 text-sm">{emoji}</button>
                              ))}
                              {isMine && <button onClick={() => deleteMessage(msg.id)} className="text-xs text-red-400 ml-2"><X className="w-3 h-3" /></button>}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="p-4 border-t">
                  <div className="flex items-center gap-2">
                    <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyPress={handleKeyPress}
                      placeholder="Type a message..." className="flex-1 p-3 neu-inset rounded-xl text-sm" />
                    <button onClick={handleSendMessage} disabled={!messageInput.trim()}
                      className="p-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageSquare className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">Select a conversation</p>
                  <p className="text-slate-400 text-sm mt-1">or open the directory to start one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* EMPLOYEE DIRECTORY MODAL */}
      <AnimatePresence>
        {showContacts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowContacts(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              
              <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600" />Employee Directory</h2>
                  <button onClick={() => setShowContacts(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Search by name, department, position..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
                </div>
                <div className="flex gap-4 mt-3 text-xs text-slate-500">
                  <span>{contacts.length} contacts</span><span>•</span>
                  <span>{Object.keys(groupedContacts).length} departments</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {contactsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                  </div>
                ) : filteredContacts.length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(
                      filteredContacts.reduce((groups, contact) => {
                        const dept = contact.department || 'Unassigned'
                        if (!groups[dept]) groups[dept] = []
                        groups[dept].push(contact)
                        return groups
                      }, {})
                    ).map(([dept, members]) => (
                      <div key={dept} className="neu-raised rounded-2xl overflow-hidden">
                        <button onClick={() => toggleDepartment(dept)}
                          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <div className="flex items-center gap-3">
                            <Building2 className="w-5 h-5 text-emerald-600" />
                            <div className="text-left">
                              <p className="font-semibold">{dept}</p>
                              <p className="text-xs text-slate-500">{members.length} {members.length === 1 ? 'member' : 'members'}</p>
                            </div>
                          </div>
                          {expandedDepts[dept] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </button>
                        {expandedDepts[dept] && (
                          <div className="px-4 pb-3 space-y-1">
                            {members.map(contact => (
                              <div key={contact.id}
                                className={`flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 ${contact.id === user?.id ? 'opacity-60' : 'cursor-pointer'}`}
                                onClick={() => handleStartChat(contact.id)}>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <UserCircle className="w-5 h-5 text-emerald-600" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm">{contact.full_name || 'Unknown'}{contact.id === user?.id && ' (You)'}</p>
                                      {contact.employee_code && <span className="text-xs text-slate-400">#{contact.employee_code}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-slate-500 flex items-center gap-1"><Briefcase className="w-3 h-3" />{contact.position || 'Staff'}</span>
                                      {contact.email && <span className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${contact.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {contact.is_active ? 'Active' : 'Inactive'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={(e) => { e.stopPropagation() }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><Phone className="w-4 h-4" /></button>
                                  <button onClick={(e) => { e.stopPropagation() }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><Mail className="w-4 h-4" /></button>
                                  {contact.id !== user?.id && (
                                    <button onClick={(e) => { e.stopPropagation(); handleStartChat(contact.id) }}
                                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs hover:bg-emerald-700 flex items-center gap-1">
                                      <MessageSquare className="w-3.5 h-3.5" />Chat
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Users className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-lg">No contacts found</p>
                    <p className="text-slate-400 text-sm mt-1">{searchTerm ? 'Try a different search' : 'No employees in the database yet'}</p>
                    <button onClick={loadContacts} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm flex items-center gap-2 mx-auto">
                      <RefreshCw className="w-4 h-4" />Refresh
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
            className="fixed right-20 top-20 z-50 w-96 max-h-[70vh] overflow-y-auto neu-raised rounded-3xl bg-white dark:bg-slate-800 shadow-2xl">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 rounded-t-3xl z-10">
              <h3 className="font-bold flex items-center gap-2"><Bell className="w-4 h-4 text-emerald-600" />Notifications</h3>
              <div className="flex gap-2">
                <button onClick={markAllNotificationsRead} className="text-xs text-emerald-600">Mark all read</button>
                <button onClick={() => setShowNotifications(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="divide-y">
              {notifications.length > 0 ? notifications.map(n => (
                <div key={n.id} onClick={() => { markNotificationRead(n.id); setShowNotifications(false) }}
                  className={`p-4 cursor-pointer hover:bg-slate-50 ${!n.is_read ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${!n.is_read ? 'bg-amber-100' : 'bg-slate-100'}`}>
                      <Bell className={`w-4 h-4 ${!n.is_read ? 'text-amber-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{n.body}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatTime(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8"><Bell className="w-12 h-12 text-slate-300 mx-auto mb-2" /><p className="text-slate-500 text-sm">No notifications</p></div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
