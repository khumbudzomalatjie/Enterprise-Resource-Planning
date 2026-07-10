import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useMessageStore from '../store/messageStore'
import useAuthStore from '../../../../store/authStore'
import useThemeStore from '../../../../store/themeStore'
import { supabase } from '../../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  MessageSquare, Plus, Search, User, Users, Briefcase,
  AlertTriangle, ChevronRight, ArrowLeft, Sun, Moon,
  Sparkles, Phone, Mail, Clock, CheckCircle2, Circle,
  Send, Paperclip, Image, MapPin
} from 'lucide-react'

export default function Messages() {
  const { conversations, messages, activeConversation, sendMessage, fetchConversations, fetchMessages, fetchUnreadCount, loading } = useMessageStore()
  const { user, profile } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  
  const [newMessage, setNewMessage] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [newChatTitle, setNewChatTitle] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchConversations()
    fetchUnreadCount()

    // Realtime subscription for new messages
    const channel = supabase
      .channel('messages-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchConversations()
        fetchUnreadCount()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

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
  }

  const handleCreateChat = async () => {
    if (!newChatTitle || selectedUsers.length === 0) {
      toast.error('Please enter a title and select recipients')
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
      fetchConversations()
    }
  }

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, role').order('full_name')
    setAvailableUsers(data || [])
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

  const filteredConversations = (conversations || []).filter(c => {
    if (!searchTerm) return true
    return (c.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/fieldops" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Field Ops</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-emerald-600" />Messages
            </h1>
            <p className="text-slate-500 mt-1">Communicate with your team</p>
          </div>
          <button onClick={() => { setShowNewChat(true); loadUsers() }}
            className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-5 h-5" /><span>New Chat</span>
          </button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: '70vh' }}>
          {/* Conversation List */}
          <div className="neu-raised rounded-3xl p-4 flex flex-col" style={{ maxHeight: '70vh' }}>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search chats..." className="w-full pl-9 pr-3 py-2 neu-inset rounded-xl text-sm" />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredConversations.map(conv => (
                <div key={conv.id}
                  onClick={() => handleOpenChat(conv)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    activeConversation?.id === conv.id 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700/30'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        {conv.type === 'group' ? <Users className="w-4 h-4 text-emerald-600" /> : <User className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-slate-800 dark:text-white">{conv.title || 'Chat'}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[150px]">{conv.last_message}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{formatTime(conv.last_message_time)}</p>
                      {conv.unread_count > 0 && (
                        <span className="inline-block bg-emerald-500 text-white text-xs rounded-full px-1.5 py-0.5 mt-1">{conv.unread_count}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredConversations.length === 0 && (
                <p className="text-center text-slate-400 text-sm py-8">No conversations yet</p>
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="md:col-span-2 neu-raised rounded-3xl flex flex-col" style={{ maxHeight: '70vh' }}>
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{activeConversation.title || 'Chat'}</h3>
                    <p className="text-xs text-slate-500 capitalize">{activeConversation.type}</p>
                  </div>
                  <button onClick={() => useMessageStore.setState({ activeConversation: null })}
                    className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] p-3 rounded-2xl ${
                        msg.sender_id === user?.id 
                          ? 'bg-emerald-500 text-white rounded-br-md' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-bl-md'
                      }`}>
                        {msg.sender_id !== user?.id && (
                          <p className="text-xs font-semibold mb-1 opacity-70">{msg.sender_name}</p>
                        )}
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs mt-1 opacity-60 text-right">{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="text-center text-slate-400 py-8">No messages yet. Start the conversation!</p>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                  <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex gap-2">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type a message..." className="flex-1 p-3 neu-inset rounded-xl text-sm" />
                    <button type="submit" disabled={sending || !newMessage.trim()}
                      className="neu-raised neu-btn px-4 py-3 rounded-xl bg-emerald-600 text-white disabled:opacity-50">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Select a conversation or start a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNewChat(false)}>
          <div className="neu-raised rounded-3xl p-6 max-w-md w-full bg-white dark:bg-slate-800" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">New Message</h3>
            <input type="text" value={newChatTitle} onChange={e => setNewChatTitle(e.target.value)}
              placeholder="Chat title (e.g., Team Update)" className="w-full p-3 neu-inset rounded-xl mb-4" />
            <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
              {availableUsers.filter(u => u.id !== user?.id).map(u => (
                <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                  <input type="checkbox" checked={selectedUsers.includes(u.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedUsers([...selectedUsers, u.id])
                      else setSelectedUsers(selectedUsers.filter(id => id !== u.id))
                    }} className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{u.full_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{u.role?.replace(/_/g, ' ')}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowNewChat(false)}
                className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-slate-600 text-white">Cancel</button>
              <button onClick={handleCreateChat}
                className="flex-1 neu-raised neu-btn px-4 py-3 rounded-xl bg-emerald-600 text-white">Create Chat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
