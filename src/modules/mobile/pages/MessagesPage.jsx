import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../../store/authStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { ArrowLeft, Send, User, CheckCheck, ChevronRight, MessageCircle } from 'lucide-react'

export default function MessagesPage() {
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  
  const [contacts, setContacts] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedContact, setSelectedContact] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('contacts')

  useEffect(() => {
    loadContacts()
    
    // Subscribe to real-time messages
    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new
          // Add message if it's between current user and selected contact
          if (selectedContact && 
             ((newMsg.sender_id === user?.id && newMsg.receiver_id === selectedContact.id) ||
              (newMsg.sender_id === selectedContact.id && newMsg.receiver_id === user?.id))) {
            setMessages(prev => [...prev, newMsg])
            scrollToBottom()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedContact])

  useEffect(() => {
    if (selectedContact) {
      loadMessages()
    }
  }, [selectedContact])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const loadContacts = async () => {
    setLoading(true)
    try {
      // Get all employees
      const { data: employees } = await supabase
        .from('employees')
        .select('*')
        .eq('employment_status', 'active')
        .order('first_name')

      // Get all profiles (admins/managers)
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id)

      // Build contacts list (deduplicate)
      const contactMap = new Map()
      
      employees?.forEach(emp => {
        if (emp.user_id && emp.user_id !== user?.id) {
          contactMap.set(emp.user_id, {
            id: emp.user_id,
            name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || 'Unknown',
            role: emp.position || 'Cleaner',
            email: emp.email,
            type: 'employee'
          })
        }
      })

      allProfiles?.forEach(prof => {
        if (prof.id !== user?.id && !contactMap.has(prof.id)) {
          contactMap.set(prof.id, {
            id: prof.id,
            name: prof.full_name || prof.email?.split('@')[0] || 'User',
            role: (prof.role || 'staff').replace(/_/g, ' '),
            email: prof.email,
            type: 'staff'
          })
        }
      })

      setContacts(Array.from(contactMap.values()))
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    if (!selectedContact) return

    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: true })
        .limit(50)

      setMessages(data || [])

      // Mark messages as read
      const unreadIds = data
        ?.filter(msg => msg.sender_id === selectedContact.id && !msg.is_read)
        .map(msg => msg.id) || []

      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedContact) return
    setSending(true)

    try {
      const { error } = await supabase.from('messages').insert([{
        sender_id: user?.id,
        receiver_id: selectedContact.id,
        message_text: newMessage.trim(),
        is_read: false
      }])

      if (error) throw error
      setNewMessage('')
      scrollToBottom()
    } catch (error) {
      console.error('Send error:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) + ' ' + 
           date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-slate-50 font-['Inter'] pb-20">
      {/* Header - Contacts View */}
      {view === 'contacts' && (
        <div className="bg-gradient-to-b from-blue-500 to-blue-600 px-4 pt-8 pb-6 text-white">
          <button onClick={() => navigate('/mobile')} className="p-1 rounded-lg hover:bg-white/20 mb-4">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-blue-100 text-sm">{contacts.length} contacts available</p>
        </div>
      )}

      {/* Header - Chat View */}
      {view === 'chat' && selectedContact && (
        <div className="bg-gradient-to-b from-blue-500 to-blue-600 px-4 pt-8 pb-4 text-white">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => { setView('contacts'); setSelectedContact(null); setMessages([]) }} className="p-1 rounded-lg hover:bg-white/20">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{selectedContact?.name}</h1>
              <p className="text-blue-100 text-xs capitalize">{selectedContact?.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contacts List */}
      {view === 'contacts' && (
        <div className="px-4 -mt-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-slate-500 text-sm">Loading contacts...</p>
            </div>
          ) : contacts.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
              {contacts.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => { setSelectedContact(contact); setView('chat') }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{contact.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{contact.role}</p>
                  </div>
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
              <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No contacts available</p>
              <p className="text-slate-400 text-sm mt-1">Contacts will appear here when added</p>
            </div>
          )}
        </div>
      )}

      {/* Chat View */}
      {view === 'chat' && selectedContact && (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
          {/* Messages List */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No messages yet</p>
                <p className="text-slate-400 text-xs mt-1">Send a message to start the conversation</p>
              </div>
            )}
            {messages.map(msg => {
              const isMine = msg.sender_id === user?.id
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isMine 
                      ? 'bg-blue-500 text-white rounded-br-md' 
                      : 'bg-white border border-slate-200 rounded-bl-md shadow-sm'
                  }`}>
                    <p className="text-sm">{msg.message_text}</p>
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className={`text-[10px] ${isMine ? 'text-blue-100' : 'text-slate-400'}`}>
                        {formatTime(msg.created_at)}
                      </span>
                      {isMine && (
                        <CheckCheck className={`w-3 h-3 ${msg.is_read ? 'text-white' : 'text-blue-200'}`} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="px-4 py-3 bg-white border-t border-slate-200 safe-area-bottom">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 rounded-full bg-slate-100 border border-slate-200 text-sm focus:outline-none focus:border-blue-400 focus:bg-white"
                autoFocus
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="home" />
    </div>
  )
}
