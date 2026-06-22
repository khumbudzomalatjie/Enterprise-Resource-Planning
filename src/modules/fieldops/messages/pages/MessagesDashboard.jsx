import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useMessagesStore from '../store/messagesStore'
import useAuthStore from '../../../../store/authStore'
import useThemeStore from '../../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  MessageSquare, Users, Bell, Search, Plus, 
  ChevronRight, ArrowLeft, Send, Paperclip,
  Sparkles, Sun, Moon, User,
  CheckCheck, Clock, X
} from 'lucide-react'

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🔥', '👏', '✅', '🙏']

export default function MessagesDashboard() {
  const { 
    conversations, messages, contacts, notifications, unreadCount,
    fetchConversations, selectConversation, selectedConversation,
    sendMessage, fetchContacts, fetchNotifications,
    getOrCreateDirectConversation, addReaction, deleteMessage,
    markNotificationRead, markAllNotificationsRead
  } = useMessagesStore()
  const { user } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [messageInput, setMessageInput] = useState('')
  const [showContacts, setShowContacts] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredMessage, setHoveredMessage] = useState(null)

  useEffect(() => {
    fetchConversations()
    fetchContacts()
    fetchNotifications()
  }, [])

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
    const result = await getOrCreateDirectConversation(contactId)
    if (result.success) setShowContacts(false)
  }

  const formatTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString()
  }

  const getRoleBadge = (role) => {
    const colors = {
      super_admin: 'bg-red-100 text-red-700', operations_manager: 'bg-blue-100 text-blue-700',
      hr_manager: 'bg-purple-100 text-purple-700', finance_officer: 'bg-yellow-100 text-yellow-700',
      supervisor: 'bg-green-100 text-green-700', cleaner: 'bg-cyan-100 text-cyan-700',
      sales_agent: 'bg-pink-100 text-pink-700', customer: 'bg-orange-100 text-orange-700',
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

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-emerald-600" />Messages & Contacts
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">All users appear here - start conversations with anyone</p>
          </div>
          <button onClick={() => setShowContacts(true)} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
            <Plus className="w-5 h-5" /><span>New Chat</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 h-[calc(100vh-280px)] min-h-[500px]">
          {/* Conversations List */}
          <div className="neu-raised rounded-3xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 neu-inset rounded-xl text-sm text-slate-700 dark:text-slate-300" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.filter(c => {
                if (!searchTerm) return true
                const participants = c.conversation_participants || []
                return participants.some(p => p.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
              }).map(conv => {
                const isSelected = selectedConversation?.id === conv.id
                const otherUser = (conv.conversation_participants || []).find(p => p.user_id !== user?.id)
                return (
                  <div key={conv.id} onClick={() => selectConversation(conv.id)}
                    className={`p-4 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm text-slate-800 dark:text-white truncate">
                            {conv.conversation_type === 'direct' ? otherUser?.profiles?.full_name || 'Unknown' : conv.subject || 'Group'}
                          </p>
                          <span className="text-xs text-slate-400">{formatTime(conv.last_message_at)}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-1">{conv.last_message || 'No messages yet'}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              {conversations.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No conversations yet</p>
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
                      <p className="font-medium text-slate-800 dark:text-white">{otherParticipants[0]?.profiles?.full_name || 'Chat'}</p>
                      <p className="text-xs text-slate-500">{otherParticipants[0]?.profiles?.role?.replace('_', ' ') || ''}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map(msg => {
                    const isMine = msg.sender_id === user?.id
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        onMouseEnter={() => setHoveredMessage(msg.id)} onMouseLeave={() => setHoveredMessage(null)}>
                        <div className={`max-w-[70%]`}>
                          {!isMine && <p className="text-xs text-slate-500 mb-1 ml-1">{msg.sender?.full_name}</p>}
                          <div className={`p-3 rounded-2xl ${isMine ? 'bg-emerald-600 text-white rounded-br-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-bl-md'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div className={`flex items-center gap-2 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-xs text-slate-400">{formatTime(msg.created_at)}</span>
                            {isMine && <CheckCheck className="w-3 h-3 text-slate-400" />}
                          </div>
                          {msg.reactions?.length > 0 && (
                            <div className={`flex gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                              {msg.reactions.map((r, i) => <span key={i} className="text-sm bg-white dark:bg-slate-600 px-1.5 py-0.5 rounded-full shadow-sm">{r.reaction}</span>)}
                            </div>
                          )}
                          {hoveredMessage === msg.id && (
                            <div className={`flex gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                              {EMOJI_LIST.slice(0, 4).map(emoji => (
                                <button key={emoji} onClick={() => addReaction(msg.id, emoji)} className="hover:scale-125 transition-transform text-sm">{emoji}</button>
                              ))}
                              {isMine && <button onClick={() => deleteMessage(msg.id)} className="text-xs text-red-400 hover:text-red-600 ml-2"><X className="w-3 h-3" /></button>}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
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
                  <p className="text-slate-400 text-sm mt-1">or click "New Chat" to start one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Contacts Modal - Shows ALL Users */}
      {showContacts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowContacts(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600" />All Users</h2>
              <button onClick={() => setShowContacts(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Click on any user to start a conversation</p>
            <div className="space-y-2">
              {contacts.map(contact => (
                <div key={contact.id} 
                  className={`flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer ${contact.id === user?.id ? 'opacity-50' : ''}`}
                  onClick={() => contact.id !== user?.id && handleStartChat(contact.id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-800 dark:text-white">
                        {contact.full_name || contact.email}
                        {contact.id === user?.id && ' (You)'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getRoleBadge(contact.role)}`}>
                          {contact.role?.replace('_', ' ')}
                        </span>
                        {contact.is_active && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active"></span>}
                      </div>
                    </div>
                  </div>
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed right-20 top-20 z-50 w-96 max-h-[70vh] overflow-y-auto neu-raised rounded-3xl bg-white dark:bg-slate-800 shadow-2xl">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2"><Bell className="w-4 h-4" />Notifications</h3>
            <div className="flex gap-2">
              <button onClick={markAllNotificationsRead} className="text-xs text-emerald-600">Mark all read</button>
              <button onClick={() => setShowNotifications(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="divide-y">
            {notifications.map(n => (
              <div key={n.id} onClick={() => { markNotificationRead(n.id); setShowNotifications(false) }}
                className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 ${!n.is_read ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
