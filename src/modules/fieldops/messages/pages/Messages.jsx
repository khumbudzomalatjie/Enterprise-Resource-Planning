import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useMessageStore from '../store/messageStore'
import useAuthStore from '../../../../store/authStore'
import { supabase } from '../../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  MessageSquare, Plus, Search, User, Users, Send,
  ArrowLeft, Paperclip, CheckCircle2, X, Sun, Moon, Sparkles
} from 'lucide-react'
import useThemeStore from '../../../../store/themeStore'

export default function Messages() {
  const { conversations, messages, activeConversation, sendMessage, fetchConversations, fetchMessages, fetchUnreadCount } = useMessageStore()
  const { user } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const messagesEndRef = useRef(null)
  
  const [view, setView] = useState('inbox')
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [availableUsers, setAvailableUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchConversations()
    fetchUnreadCount()

    const channel = supabase
      .channel('messages-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new
        fetchConversations()
        fetchUnreadCount()
        if (activeConversation && 
            (newMsg.sender_id === activeConversation.id || newMsg.receiver_id === activeConversation.id)) {
          fetchMessages(activeConversation.id)
        }
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
      receiver_id: activeConversation.id,
      content: newMessage.trim()
    })
    if (result.success) {
      setNewMessage('')
    } else {
      toast.error('Failed to send')
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

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, role').order('full_name')
    setAvailableUsers(data || [])
    setShowNewChat(true)
  }

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Select at least one person')
      return
    }
    setCreating(true)
    
    const result = await useMessageStore.getState().createConversation({}, selectedUsers)
    
    if (result.success) {
      toast.success('Chat opened!')
      setShowNewChat(false)
      setSelectedUsers([])
      await fetchConversations()
      if (result.data) {
        handleOpenChat(result.data)
      }
    } else {
      toast.error('Failed to open chat')
    }
    setCreating(false)
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
    const s = searchTerm.toLowerCase()
    return (c.display_name || '').toLowerCase().includes(s) ||
           (c.last_message || '').toLowerCase().includes(s)
  })

  const getChatHeaderInfo = () => {
    if (!activeConversation) return { name: 'Chat', subtitle: '' }
    return {
      name: activeConversation.display_name || 'Chat',
      subtitle: 'Direct message',
      isGroup: false
    }
  }

  const chatInfo = getChatHeaderInfo()

  // ============================================
  // INBOX VIEW
  // ============================================
  if (view === 'inbox') {
    return (
      <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
        <Navbar />
        
        <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
          <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
            {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
          </button>
        </div>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-emerald-600" />Messages
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Team communication - Synced with mobile</p>
            </div>
            <button onClick={loadUsers}
              className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-5 h-5" /> New Message
            </button>
          </div>

          {/* Search */}
          <div className="neu-raised rounded-2xl p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search conversations..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300" />
            </div>
          </div>

          {/* Conversations */}
          {filteredConversations.length > 0 ? (
            <div className="space-y-2">
              {filteredConversations.map((conv) => (
                <motion.div key={conv.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleOpenChat(conv)}
                  className="neu-raised rounded-2xl p-4 cursor-pointer hover:scale-[1.01] transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                          {(conv.display_name || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-slate-800 dark:text-white text-sm">
                            {conv.display_name || 'Unknown'}
                          </h3>
                          <span className="text-xs text-slate-400">{formatTime(conv.last_message_time)}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {conv.last_sender && conv.last_sender !== 'You' ? `${conv.last_sender}: ` : ''}
                          {conv.last_message || 'No messages'}
                        </p>
                      </div>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="bg-emerald-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 ml-2">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 neu-raised rounded-3xl">
              <MessageSquare className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 text-lg">No messages yet</p>
              <button onClick={loadUsers} className="mt-4 neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white">
                Start a conversation
              </button>
            </div>
          )}

          {/* New Chat Modal */}
          <AnimatePresence>
            {showNewChat && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                onClick={() => setShowNewChat(false)}>
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                  className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
                  onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">New Message</h3>
                    <button onClick={() => setShowNewChat(false)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">Select a person to message:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
                    {availableUsers.filter(u => u.id !== user?.id).map(u => (
                      <label key={u.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedUsers.includes(u.id) ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedUsers.includes(u.id) ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                          {selectedUsers.includes(u.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <input type="checkbox" checked={selectedUsers.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedUsers([...selectedUsers, u.id])
                            else setSelectedUsers(selectedUsers.filter(id => id !== u.id))
                          }} className="hidden" />
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-white">{u.full_name}</p>
                          <p className="text-xs text-slate-500 capitalize">{u.role?.replace(/_/g, ' ')}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button onClick={handleCreateChat} disabled={creating || selectedUsers.length === 0}
                    className="w-full py-3.5 bg-emerald-500 text-white rounded-2xl text-base font-bold active:scale-95 transition-transform shadow-lg disabled:opacity-50">
                    {creating ? 'Opening...' : 'Start Chat'}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    )
  }

  // ============================================
  // CHAT VIEW
  // ============================================
  return (
    <div className={`min-h-screen font-['Inter'] flex flex-col transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      {/* Chat Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-4 flex items-center gap-3">
        <button onClick={handleBackToInbox} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
            {chatInfo.name[0]?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800 dark:text-white">{chatInfo.name}</h3>
          <p className="text-xs text-slate-500">{chatInfo.subtitle}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50 dark:bg-slate-900">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No messages yet</p>
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.sender_id === user?.id
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3.5 rounded-2xl ${
                isMine 
                  ? 'bg-emerald-500 text-white rounded-br-md' 
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md shadow-sm'
              }`}>
                {!isMine && <p className="text-xs font-semibold mb-1 text-emerald-600">{msg.sender_name}</p>}
                <p className="text-sm">{msg.content || msg.message}</p>
                <p className={`text-xs mt-1 ${isMine ? 'text-white/70' : 'text-slate-400'}`}>
                  {formatMessageTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3">
        <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex items-center gap-2">
          <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
            placeholder={`Message ${chatInfo.name}...`}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <button type="submit" disabled={sending || !newMessage.trim()}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-medium active:scale-95 disabled:opacity-40 flex items-center gap-1">
            <Send className="w-4 h-4" /> Send
          </button>
        </form>
      </div>
    </div>
  )
}
