import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useMessageStore from '../store/messageStore'
import useAuthStore from '../../../../store/authStore'
import useThemeStore from '../../../../store/themeStore'
import { supabase } from '../../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  MessageSquare, Plus, Search, User, Users, Send,
  ArrowLeft, Phone, MapPin, Camera, Paperclip,
  CheckCircle2, Circle, Clock, ChevronRight, X
} from 'lucide-react'

export default function Messages() {
  const { conversations, messages, activeConversation, sendMessage, fetchConversations, fetchMessages, fetchUnreadCount } = useMessageStore()
  const { user, profile } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  
  const [view, setView] = useState('inbox') // 'inbox' | 'chat' | 'new'
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [newChatTitle, setNewChatTitle] = useState('')

  useEffect(() => {
    fetchConversations()
    fetchUnreadCount()

    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchConversations()
        fetchUnreadCount()
        if (activeConversation) fetchMessages(activeConversation.id)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConversation) return
    setSending(true)
    const result = await sendMessage({
      conversation_id: activeConversation.id,
      message_type: 'text',
      content: newMessage.trim()
    })
    if (result.success) {
      setNewMessage('')
      fetchConversations()
    }
    setSending(false)
  }

  const handleOpenChat = async (conv) => {
    useMessageStore.setState({ activeConversation: conv })
    await fetchMessages(conv.id)
    setView('chat')
  }

  const handleBackToInbox = () => {
    useMessageStore.setState({ activeConversation: null })
    setView('inbox')
    fetchConversations()
  }

  const handleCreateChat = async () => {
    if (!newChatTitle || selectedUsers.length === 0) {
      toast.error('Enter title and select recipients')
      return
    }
    const result = await useMessageStore.getState().createConversation(
      { title: newChatTitle, type: selectedUsers.length > 1 ? 'group' : 'direct' },
      selectedUsers
    )
    if (result.success) {
      toast.success('Chat created!')
      setShowNewChat(false)
      setNewChatTitle('')
      setSelectedUsers([])
      setView('inbox')
      fetchConversations()
    }
  }

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, role').order('full_name')
    setAvailableUsers(data || [])
    setShowNewChat(true)
  }

  const formatTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  const formatMessageTime = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const filteredConversations = (conversations || []).filter(c => {
    if (!searchTerm) return true
    return (c.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  })

  // ============================================
  // INBOX VIEW
  // ============================================
  if (view === 'inbox') {
    return (
      <div className={`min-h-screen bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-700 font-['Inter'] ${isDark ? 'dark' : ''}`}>
        <Navbar />
        
        <div className="px-5 pt-8 pb-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Messages</h1>
              <p className="text-blue-100 text-sm mt-1">Team communication</p>
            </div>
            <button onClick={loadUsers}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition-transform">
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 -mt-2 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search messages..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/15 text-white placeholder-white/40 text-sm border border-white/10" />
          </div>
        </div>

        {/* Conversations List */}
        <div className="px-5">
          {filteredConversations.length > 0 ? (
            <div className="space-y-1">
              {filteredConversations.map((conv, i) => (
                <motion.div key={conv.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  onClick={() => handleOpenChat(conv)}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-all border border-white/10 hover:bg-white/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        {conv.type === 'group' ? (
                          <Users className="w-5 h-5 text-white" />
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-white text-sm truncate">{conv.title || 'Chat'}</h3>
                          <span className="text-xs text-white/60 flex-shrink-0 ml-2">{formatTime(conv.last_message_time)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-white/70 truncate max-w-[180px]">{conv.last_message || 'No messages'}</p>
                          {conv.unread_count > 0 && (
                            <span className="bg-emerald-400 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-8 h-8 text-white/50" />
              </div>
              <p className="text-white font-semibold">No messages yet</p>
              <p className="text-white/50 text-xs mt-1">Start a conversation with your team</p>
            </div>
          )}
        </div>

        {/* New Chat Modal */}
        <AnimatePresence>
          {showNewChat && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
              onClick={() => setShowNewChat(false)}>
              <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }}
                className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">New Message</h3>
                  <button onClick={() => setShowNewChat(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <input type="text" value={newChatTitle} onChange={e => setNewChatTitle(e.target.value)}
                  placeholder="Subject (e.g., Team Update)" className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-700 mb-4 text-sm" />
                <p className="text-xs text-slate-500 mb-2">Select recipients:</p>
                <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
                  {availableUsers.filter(u => u.id !== user?.id).map(u => (
                    <label key={u.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedUsers.includes(u.id) ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedUsers.includes(u.id) ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                        {selectedUsers.includes(u.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <input type="checkbox" checked={selectedUsers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedUsers([...selectedUsers, u.id])
                          else setSelectedUsers(selectedUsers.filter(id => id !== u.id))
                        }} className="hidden" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-white">{u.full_name}</p>
                        <p className="text-xs text-slate-500 capitalize">{u.role?.replace(/_/g, ' ')}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <button onClick={handleCreateChat}
                  className="w-full py-3.5 bg-emerald-500 text-white rounded-2xl text-base font-bold active:scale-95 transition-transform shadow-lg">
                  Create Chat
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ============================================
  // CHAT VIEW (looks like mobile)
  // ============================================
  return (
    <div className={`min-h-screen bg-gradient-to-b from-blue-500 via-blue-600 to-indigo-700 font-['Inter'] flex flex-col ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      {/* Chat Header */}
      <div className="px-4 pt-4 pb-3 text-white flex items-center gap-3 border-b border-white/10">
        <button onClick={handleBackToInbox} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center active:scale-90">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          {activeConversation?.type === 'group' ? (
            <Users className="w-5 h-5 text-white" />
          ) : (
            <User className="w-5 h-5 text-white" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{activeConversation?.title || 'Chat'}</h3>
          <p className="text-xs text-white/60 capitalize">{activeConversation?.type}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-white/30 mx-auto mb-2" />
            <p className="text-white/50 text-sm">No messages yet</p>
            <p className="text-white/30 text-xs mt-1">Start the conversation</p>
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_id === user?.id
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3.5 rounded-2xl ${
                isMine 
                  ? 'bg-emerald-400 text-white rounded-br-md shadow-md' 
                  : 'bg-white text-slate-800 rounded-bl-md shadow-sm'
              }`}>
                {!isMine && (
                  <p className="text-xs font-semibold mb-1 text-emerald-600">{msg.sender_name}</p>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-white/70' : 'text-slate-400'}`}>
                  <span className="text-xs">{formatMessageTime(msg.created_at)}</span>
                  {isMine && <CheckCircle2 className="w-3 h-3" />}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="px-4 py-3 border-t border-white/10 bg-white/5">
        <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex items-center gap-2">
          <button type="button" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
            <Paperclip className="w-4 h-4 text-white/70" />
          </button>
          <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..." 
            className="flex-1 px-4 py-2.5 rounded-full bg-white/15 text-white placeholder-white/40 text-sm border border-white/10 focus:outline-none focus:border-white/30" />
          <button type="submit" disabled={sending || !newMessage.trim()}
            className="w-10 h-10 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0 active:scale-90 disabled:opacity-40 transition-all">
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  )
}
