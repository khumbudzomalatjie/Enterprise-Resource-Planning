import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../../store/authStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { ArrowLeft, Send, User, CheckCheck } from 'lucide-react'

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
  const [view, setView] = useState('contacts') // 'contacts' or 'chat'

  useEffect(() => {
    loadContacts()
    subscribeToMessages()
  }, [])

  useEffect(() => {
    if (selectedContact) {
      loadMessages()
    }
  }, [selectedContact])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadContacts = async () => {
    // Get all employees and their profiles
    const { data: employees } = await supabase
      .from('employees')
      .select('*, profiles:user_id(full_name)')
      .eq('employment_status', 'active')
      .order('first_name')

    // Get all profiles (admins/managers)
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user?.id)

    // Combine contacts (deduplicate)
    const contactMap = new Map()
    
    employees?.forEach(emp => {
      if (emp.user_id !== user?.id) {
        contactMap.set(emp.user_id, {
          id: emp.user_id,
          name: emp.first_name + ' ' + emp.last_name,
          role: 'Cleaner',
          email: emp.email
        })
      }
    })

    allProfiles?.forEach(prof => {
      if (!contactMap.has(prof.id)) {
        contactMap.set(prof.id, {
          id: prof.id,
          name: prof.full_name || prof.email?.split('@')[0] || 'User',
          role: prof.role?.replace('_', ' ') || 'Staff',
          email: prof.email
        })
      }
    })

    setContacts(Array.from(contactMap.values()))
    setLoading(false)
  }

  const loadMessages = async () => {
    if (!selectedContact) return

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
      .or(`sender_id.eq.${selectedContact.id},receiver_id.eq.${selectedContact.id}`)
      .order('created_at', { ascending: true })
      .limit(50)

    // Filter to only show messages between these two users
    const filtered = data?.filter(msg => 
      (msg.sender_id === user?.id && msg.receiver_id === selectedContact.id) ||
      (msg.sender_id === selectedContact.id && msg.receiver_id === user?.id)
    ) || []

    setMessages(filtered)
    
    // Mark as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', selectedContact.id)
      .eq('receiver_id', user?.id)
      .eq('is_read', false)
  }

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new
          if (selectedContact && 
             ((newMsg.sender_id === user?.id && newMsg.receiver_id === selectedContact.id) ||
              (newMsg.sender_id === selectedContact.id && newMsg.receiver_id === user?.id))) {
            setMessages(prev => [...prev, newMsg])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
    } catch (error) {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateStr) => {
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
      {/* Header */}
      {view === 'contacts' ? (
        <div className="bg-gradient-to-b from-blue-500 to-blue-600 px-4 pt-8 pb-6 text-white">
          <button onClick={() => navigate('/mobile')} className="p-1 rounded-lg hover:bg-white/20 mb-4">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-blue-100 text-sm">{contacts.length} contacts</p>
        </div>
      ) : (
        <div className="bg-gradient-to-b from-blue-500 to-blue-600 px-4 pt-8 pb-4 text-white">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => { setView('contacts'); setSelectedContact(null) }} className="p-1 rounded-lg hover:bg-white/20">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">{selectedContact?.name}</h1>
              <p className="text-blue-100 text-xs">{selectedContact?.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Contacts List */}
      {view === 'contacts' && (
        <div className="px-4 -mt-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
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
                  <div className="text-xs text-slate-400">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
              {contacts.length === 0 && (
                <div className="text-center py-8">
                  <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No contacts available</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chat View */}
      {view === 'chat' && selectedContact && (
        <div className="flex flex-col h-[calc(100vh-180px)]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
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
                        <CheckCheck className={`w-3 h-3 ${msg.is_read ? 'text-blue-200' : 'text-blue-300'}`} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 bg-white border-t border-slate-200">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 rounded-full bg-slate-100 border border-slate-200 text-sm focus:outline-none focus:border-blue-400"
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="home" />
    </div>
  )
}

// Missing import
import { ChevronRight } from 'lucide-react'
