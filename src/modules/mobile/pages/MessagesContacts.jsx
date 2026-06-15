import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import useAuthStore from '../../../store/authStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  MessageCircle, Phone, Mail, Search, ArrowLeft, 
  Send, User, Users, Sun, Moon, 
  Sparkles, MapPin, Briefcase, CheckCheck,
  X
} from 'lucide-react'

export default function MessagesContacts() {
  const { isDark, toggleTheme } = useThemeStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  
  const [activeTab, setActiveTab] = useState('messages')
  const [threads, setThreads] = useState([])
  const [employees, setEmployees] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchContacts, setSearchContacts] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    loadData()
    
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user?.id}` },
        () => {
          toast.success('New message received!', { duration: 3000 })
          loadThreads()
          if (selectedChat?.id) loadMessages(selectedChat.id)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id)
      const interval = setInterval(() => loadMessages(selectedChat.id), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedChat])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadData = async () => {
    setLoading(true)
    await Promise.all([loadThreads(), loadEmployees()])
    setLoading(false)
  }

  const loadThreads = async () => {
    if (!user?.id) return
    
    try {
      const { data } = await supabase
        .from('message_threads')
        .select('*')
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false })

      const threadsWithUsers = await Promise.all((data || []).map(async (thread) => {
        const otherUserId = thread.participant_1 === user.id ? thread.participant_2 : thread.participant_1
        
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single()

        const { data: emp } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', otherUserId)
          .single()

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', otherUserId)
          .eq('receiver_id', user.id)
          .eq('is_read', false)

        return { 
          ...thread, 
          otherUser: userProfile, 
          employee: emp, 
          unreadCount: count || 0 
        }
      }))

      setThreads(threadsWithUsers)
      setUnreadCount(threadsWithUsers.reduce((sum, t) => sum + (t.unreadCount || 0), 0))
    } catch (error) {
      console.error('Error loading threads:', error)
    }
  }

  const loadEmployees = async () => {
    try {
      const { data } = await supabase
        .from('employees')
        .select('*, profiles(*)')
        .eq('employment_status', 'active')
        .order('department')
        .order('first_name')
      setEmployees(data || [])
    } catch (error) {
      console.error('Error loading employees:', error)
    }
  }

  const loadMessages = async (otherUserId) => {
    if (!user?.id) return
    
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(100)

      setMessages(data || [])

      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', user.id)
        .eq('is_read', false)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return

    try {
      await supabase.from('messages').insert([{
        sender_id: user.id,
        receiver_id: selectedChat.id,
        message: newMessage.trim()
      }])

      const { data: existingThread } = await supabase
        .from('message_threads')
        .select('*')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${selectedChat.id}),and(participant_1.eq.${selectedChat.id},participant_2.eq.${user.id})`)
        .single()

      if (existingThread) {
        await supabase.from('message_threads')
          .update({ last_message: newMessage.trim(), last_message_at: new Date().toISOString() })
          .eq('id', existingThread.id)
      } else {
        await supabase.from('message_threads').insert([{
          participant_1: user.id,
          participant_2: selectedChat.id,
          last_message: newMessage.trim()
        }])
      }

      setNewMessage('')
      loadMessages(selectedChat.id)
      loadThreads()
    } catch (error) {
      toast.error('Failed to send message')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const startChat = (employee) => {
    if (employee.profiles?.id) {
      setSelectedChat({ 
        id: employee.profiles.id, 
        name: `${employee.first_name} ${employee.last_name}`, 
        employee 
      })
      setActiveTab('messages')
    } else {
      toast.error('This employee is not registered as a user')
    }
  }

  const formatTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
    if (diff < 604800000) return d.toLocaleDateString('en-ZA', { weekday: 'short' })
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  const filteredThreads = threads.filter(t => {
    if (!search) return true
    const s = search.toLowerCase()
    return (t.otherUser?.full_name || '').toLowerCase().includes(s) ||
           (t.employee?.first_name || '').toLowerCase().includes(s) ||
           (t.employee?.last_name || '').toLowerCase().includes(s)
  })

  const filteredContacts = employees.filter(emp => {
    if (!searchContacts) return true
    const s = searchContacts.toLowerCase()
    return (emp.first_name || '').toLowerCase().includes(s) ||
           (emp.last_name || '').toLowerCase().includes(s) ||
           (emp.department || '').toLowerCase().includes(s) ||
           (emp.position || '').toLowerCase().includes(s)
  })

  const contactsByDept = {}
  filteredContacts.forEach(emp => {
    const dept = emp.department || 'Other'
    if (!contactsByDept[dept]) contactsByDept[dept] = []
    contactsByDept[dept].push(emp)
  })

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
        <Link to="/mobile/field" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Field Operations</span>
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-purple-600" />Messages & Contacts
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => { setActiveTab('messages'); setSelectedChat(null) }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'messages' ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
            <MessageCircle className="w-5 h-5" />
            Messages
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => { setActiveTab('contacts'); setSelectedChat(null) }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'contacts' ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
            <Users className="w-5 h-5" />
            Contacts ({employees.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-1">
            {activeTab === 'messages' ? (
              <div className="neu-raised rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-slate-200 dark:border-slate-600">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} 
                      placeholder="Search conversations..." className="w-full pl-9 pr-3 py-2 neu-inset rounded-lg text-sm" />
                  </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[500px] overflow-y-auto">
                  {filteredThreads.map(thread => (
                    <div key={thread.id}
                      onClick={() => setSelectedChat({ 
                        id: thread.otherUser?.id, 
                        name: thread.otherUser?.full_name || `${thread.employee?.first_name || ''} ${thread.employee?.last_name || ''}`.trim() || 'Unknown',
                        employee: thread.employee 
                      })}
                      className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${
                        selectedChat?.id === thread.otherUser?.id ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500' : ''
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <User className="w-5 h-5 text-purple-600" />
                          </div>
                          {thread.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                              {thread.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <p className="font-medium text-sm truncate">
                              {thread.otherUser?.full_name || `${thread.employee?.first_name || ''} ${thread.employee?.last_name || ''}`.trim() || 'Unknown User'}
                            </p>
                            <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{formatTime(thread.last_message_at)}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{thread.last_message || 'No messages yet'}</p>
                          {thread.employee && (
                            <p className="text-[10px] text-slate-400 truncate">{thread.employee.position || ''}{thread.employee.department ? ` · ${thread.employee.department}` : ''}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredThreads.length === 0 && !loading && (
                    <div className="text-center py-12 text-slate-400">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No conversations yet</p>
                      <p className="text-xs mt-1">Go to Contacts to start a chat</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="neu-raised rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-slate-200 dark:border-slate-600">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={searchContacts} onChange={e => setSearchContacts(e.target.value)} 
                      placeholder="Search by name, department, position..." className="w-full pl-9 pr-3 py-2 neu-inset rounded-lg text-sm" />
                  </div>
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                  {Object.keys(contactsByDept).length > 0 ? (
                    Object.entries(contactsByDept).map(([dept, emps]) => (
                      <div key={dept}>
                        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 text-xs font-semibold text-slate-500 uppercase flex items-center justify-between">
                          <span>{dept}</span>
                          <span className="bg-slate-200 dark:bg-slate-600 px-2 py-0.5 rounded-full text-[10px]">{emps.length}</span>
                        </div>
                        {emps.map(emp => (
                          <div key={emp.id}
                            onClick={() => startChat(emp)}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-600 font-bold text-sm">{emp.first_name?.[0]}{emp.last_name?.[0]}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                              <p className="text-xs text-slate-500">{emp.position || 'No position'}</p>
                            </div>
                            <div className="flex gap-1">
                              {emp.phone && (
                                <a href={`tel:${emp.phone}`} onClick={e => e.stopPropagation()} 
                                  className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600" title="Call">
                                  <Phone className="w-4 h-4" />
                                </a>
                              )}
                              {emp.email && (
                                <a href={`mailto:${emp.email}`} onClick={e => e.stopPropagation()}
                                  className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600" title="Email">
                                  <Mail className="w-4 h-4" />
                                </a>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); startChat(emp) }}
                                className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-slate-400 hover:text-purple-600" title="Message">
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No contacts found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Chat Window */}
          <div className="lg:col-span-2">
            {selectedChat ? (
              <div className="neu-raised rounded-2xl overflow-hidden flex flex-col h-[600px]">
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedChat(null)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 lg:hidden">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{selectedChat.name}</p>
                      {selectedChat.employee && (
                        <p className="text-xs text-slate-500">
                          {selectedChat.employee.position}{selectedChat.employee.department ? ` · ${selectedChat.employee.department}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {selectedChat.employee?.phone && (
                      <a href={`tel:${selectedChat.employee.phone}`} className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600" title="Call">
                        <Phone className="w-5 h-5" />
                      </a>
                    )}
                    {selectedChat.employee?.email && (
                      <a href={`mailto:${selectedChat.employee.email}`} className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600" title="Email">
                        <Mail className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-800/50">
                  {messages.map((msg, i) => {
                    const isMine = msg.sender_id === user?.id
                    const showTime = i === messages.length - 1 || 
                      (i < messages.length - 1 && 
                       new Date(msg.created_at).getTime() - new Date(messages[i + 1]?.created_at).getTime() > 300000)
                    
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%]`}>
                          <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                            isMine 
                              ? 'bg-purple-600 text-white rounded-br-md' 
                              : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-md shadow-sm'
                          }`}>
                            <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          </div>
                          {showTime && (
                            <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[10px] text-slate-400">{formatTime(msg.created_at)}</span>
                              {isMine && msg.is_read && <CheckCheck className="w-3 h-3 text-blue-500" />}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {messages.length === 0 && (
                    <div className="text-center py-16 text-slate-400">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-1">Send a message to start the conversation</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 p-3 neu-inset rounded-xl text-sm"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="neu-raised rounded-2xl p-8 flex flex-col items-center justify-center h-[600px] text-center">
                {activeTab === 'messages' ? (
                  <>
                    <MessageCircle className="w-20 h-20 text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-500 mb-2">Your Messages</h3>
                    <p className="text-slate-400 text-sm max-w-md">
                      Select a conversation from the left to view and reply to messages.
                    </p>
                    <p className="text-slate-400 text-xs mt-2 max-w-md">
                      Or go to the <strong>Contacts</strong> tab to find employees and start a new chat.
                    </p>
                  </>
                ) : (
                  <>
                    <Users className="w-20 h-20 text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-500 mb-2">Employee Directory</h3>
                    <p className="text-slate-400 text-sm max-w-md">
                      Browse all employees grouped by department. Click the message icon to start a chat.
                    </p>
                    <p className="text-slate-400 text-xs mt-2 max-w-md">
                      Use the phone or email icons to contact employees directly.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
