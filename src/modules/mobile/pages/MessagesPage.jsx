import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../../store/authStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { ArrowLeft, Send, User, CheckCheck, MessageCircle, Search } from 'lucide-react'

export default function MessagesPage() {
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const messagesEndRef = useRef(null)
  
  const [contacts, setContacts] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedContact, setSelectedContact] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('contacts')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    console.log('📱 Messages page loaded')
    loadContacts()
    
    // Subscribe to real-time messages for current user
    const channel = supabase
      .channel('messages-realtime-' + user?.id)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user?.id}` },
        (payload) => {
          console.log('📨 New message received:', payload.new)
          const newMsg = payload.new
          // If we're in chat with this sender, add message
          if (selectedContact && newMsg.sender_id === selectedContact.id) {
            setMessages(prev => [...prev, newMsg])
            scrollToBottom()
            // Mark as read
            supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then()
          }
          toast.success(`New message from ${newMsg.sender_id === selectedContact?.id ? selectedContact.name : 'someone'}`, {
            duration: 2000
          })
        }
      )
      .subscribe()

    console.log('📡 Subscribed to real-time messages')

    return () => { 
      console.log('📡 Unsubscribing from messages')
      supabase.removeChannel(channel) 
    }
  }, [selectedContact, user?.id])

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
    console.log('🔍 Loading contacts for:', user?.email)
    
    try {
      // Get ALL profiles (not just employees)
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id)
        .order('full_name')

      if (profilesError) {
        console.error('❌ Profiles error:', profilesError)
      }

      // Get all employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .order('first_name')

      if (empError) {
        console.error('❌ Employees error:', empError)
      }

      console.log('📋 Profiles found:', allProfiles?.length || 0)
      console.log('👥 Employees found:', employees?.length || 0)

      // Build contacts from profiles
      const contactList = (allProfiles || []).map(prof => ({
        id: prof.id,
        name: prof.full_name || prof.email?.split('@')[0] || 'User',
        role: (prof.role || 'staff').replace(/_/g, ' '),
        email: prof.email
      }))

      setContacts(contactList)
      console.log('✅ Contacts loaded:', contactList.length)
    } catch (error) {
      console.error('❌ Error loading contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    if (!selectedContact) return
    console.log('💬 Loading messages with:', selectedContact.name)

    try {
      // Get messages between current user and selected contact
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) {
        console.error('❌ Load messages error:', error)
        return
      }

      console.log('📨 Messages loaded:', data?.length || 0)
      setMessages(data || [])

      // Mark received messages as read
      const unreadIds = data
        ?.filter(msg => msg.sender_id === selectedContact.id && !msg.is_read)
        .map(msg => msg.id) || []

      if (unreadIds.length > 0) {
        console.log('✅ Marking', unreadIds.length, 'messages as read')
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds)
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedContact) return
    
    const messageText = newMessage.trim()
    setNewMessage('')
    setSending(true)

    console.log('📤 Sending message to:', selectedContact.name, ':', messageText)

    try {
      const { data, error } = await supabase.from('messages').insert([{
        sender_id: user?.id,
        receiver_id: selectedContact.id,
        message_text: messageText,
        is_read: false
      }]).select().single()

      if (error) {
        console.error('❌ Send error:', error)
        toast.error('Failed to send: ' + error.message)
        setNewMessage(messageText) // Restore message
        return
      }

      console.log('✅ Message sent:', data)
      // Add to local messages immediately
      setMessages(prev => [...prev, data])
      scrollToBottom()
    } catch (error) {
      console.error('❌ Send exception:', error)
      toast.error('Failed to send message')
      setNewMessage(messageText)
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
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
  }

  const filteredContacts = contacts.filter(c => {
    if (!searchTerm) return true
    const s = searchTerm.toLowerCase()
    return c.name.toLowerCase().includes(s) || c.role.toLowerCase().includes(s)
  })

  return (
    <div className="min-h-screen bg-slate-50 font-['Inter'] pb-20">
      {/* Header - Contacts View */}
      {view === 'contacts' && (
        <>
          <div className="bg-gradient-to-b from-blue-500 to-blue-600 px-4 pt-8 pb-6 text-white">
            <button onClick={() => navigate('/mobile')} className="p-1 rounded-lg hover:bg-white/20 mb-4">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-blue-100 text-sm">{contacts.length} contacts</p>
          </div>

          <div className="px-4 -mt-4">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm shadow-sm"
              />
            </div>

            {/* Contacts */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-slate-500 text-sm">Loading contacts...</p>
              </div>
            ) : filteredContacts.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
                {filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => { setSelectedContact(contact); setView('chat'); console.log('👤 Selected contact:', contact.name) }}
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
                <p className="text-slate-500 font-medium">No contacts found</p>
                <p className="text-slate-400 text-sm mt-1">No users available to message</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Chat View */}
      {view === 'chat' && selectedContact && (
        <>
          {/* Chat Header */}
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

          {/* Messages */}
          <div className="flex flex-col bg-slate-50" style={{ height: 'calc(100vh - 260px)' }}>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No messages yet</p>
                  <p className="text-slate-400 text-xs mt-1">Send a message to start</p>
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

            {/* Input */}
            <div className="px-4 py-3 bg-white border-t border-slate-200">
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
                  className="flex-1 px-4 py-3 rounded-full bg-slate-100 border border-slate-200 text-sm focus:outline-none focus:border-blue-400"
                  autoFocus
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 active:scale-95 transition-all flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <BottomNav active="home" />
    </div>
  )
}
