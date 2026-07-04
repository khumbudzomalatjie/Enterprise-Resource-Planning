import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { ArrowLeft, Search, Send, Paperclip, Check, CheckCheck, User, Users, Phone, MoreVertical } from 'lucide-react'

export default function Messages() {
  const { user } = useAuthStore()
  const { employee, messages, fetchMessages, sendMessage } = useMobileStore()
  const navigate = useNavigate()
  const [view, setView] = useState('list') // 'list' or 'chat'
  const [contacts, setContacts] = useState([])
  const [selectedContact, setSelectedContact] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const chatEndRef = useRef(null)
  const [unreadCounts, setUnreadCounts] = useState({})

  useEffect(() => {
    if (user?.id) {
      fetchMessages(user.id)
      fetchContacts()
      subscribeToMessages()
    }
  }, [user?.id])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const fetchContacts = async () => {
    // Get all employees as contacts
    const { data } = await supabase.from('employees').select('id, first_name, last_name, employee_code, position, department, phone, user_id').eq('employment_status', 'active').order('first_name')
    // Get profiles for avatars
    const userIds = (data || []).map(e => e.user_id).filter(Boolean)
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds)
    const profileMap = {}; (profiles || []).forEach(p => { profileMap[p.id] = p })

    // Get last message and unread count for each contact
    const contactsWithPreview = await Promise.all((data || []).map(async (emp) => {
      const { data: lastMsgs } = await supabase.from('messages')
        .select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .or(`sender_id.eq.${emp.user_id},receiver_id.eq.${emp.user_id}`)
        .order('created_at', { ascending: false }).limit(1)

      const lastMsg = lastMsgs?.[0]

      const { count } = await supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', emp.user_id).eq('receiver_id', user.id).eq('is_read', false)

      return {
        ...emp,
        profile: profileMap[emp.user_id] || null,
        lastMessage: lastMsg?.message?.slice(0, 50) || null,
        lastMessageTime: lastMsg?.created_at || null,
        unreadCount: count || 0
      }
    }))

    setContacts(contactsWithPreview.filter(c => c.user_id !== user.id))
  }

  const subscribeToMessages = () => {
    const channel = supabase.channel('mobile-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new
        if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
          fetchMessages(user.id)
          fetchContacts()
          if (selectedContact && (newMsg.sender_id === selectedContact.user_id || newMsg.receiver_id === selectedContact.user_id)) {
            setChatMessages(prev => [...prev, { ...newMsg, sender_name: newMsg.sender_id === user.id ? 'You' : selectedContact.first_name, receiver_name: newMsg.receiver_id === user.id ? 'You' : selectedContact.first_name }])
          }
        }
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }

  const openChat = async (contact) => {
    setSelectedContact(contact)
    setView('chat')
    // Get conversation
    const { data } = await supabase.from('messages').select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .or(`sender_id.eq.${contact.user_id},receiver_id.eq.${contact.user_id}`)
      .order('created_at', { ascending: true })

    // Filter only messages between these two
    const conversation = (data || []).filter(m =>
      (m.sender_id === user.id && m.receiver_id === contact.user_id) ||
      (m.sender_id === contact.user_id && m.receiver_id === user.id)
    )

    setChatMessages(conversation.map(m => ({
      ...m,
      sender_name: m.sender_id === user.id ? 'You' : contact.first_name,
      receiver_name: m.receiver_id === user.id ? 'You' : contact.first_name
    })))

    // Mark as read
    await supabase.from('messages').update({ is_read: true }).eq('sender_id', contact.user_id).eq('receiver_id', user.id).eq('is_read', false)
    fetchContacts()
  }

  const handleSend = async () => {
    if (!newMsg.trim() || !selectedContact) return
    const result = await sendMessage({
      sender_id: user.id,
      receiver_id: selectedContact.user_id,
      message: newMsg.trim(),
      is_read: false
    })
    if (!result.error) {
      setNewMsg('')
      scrollToBottom()
    } else {
      toast.error('Failed to send')
    }
  }

  const formatTime = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
  }

  const filteredContacts = contacts.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.department?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-100 font-['Inter'] pb-20">
      {/* Header */}
      {view === 'list' ? (
        <div className="bg-blue-600 text-white px-5 pt-8 pb-5">
          <h1 className="text-2xl font-bold">Messages</h1>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search contacts..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/15 text-white placeholder-white/40 text-sm" />
          </div>
        </div>
      ) : (
        <div className="bg-blue-600 text-white px-5 pt-8 pb-5 flex items-center gap-3">
          <button onClick={() => { setView('list'); setSelectedContact(null) }}><ArrowLeft className="w-6 h-6" /></button>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
            {selectedContact?.first_name?.[0]}{selectedContact?.last_name?.[0]}
          </div>
          <div>
            <p className="font-semibold">{selectedContact?.first_name} {selectedContact?.last_name}</p>
            <p className="text-xs text-blue-100">{selectedContact?.position || 'Employee'} · {selectedContact?.department || 'N/A'}</p>
          </div>
        </div>
      )}

      {/* Contact List */}
      {view === 'list' && (
        <div className="divide-y divide-slate-100">
          {filteredContacts.length === 0 && (
            <div className="text-center py-12"><Users className="w-12 h-12 text-slate-300 mx-auto mb-2" /><p className="text-slate-500">No contacts found</p></div>
          )}
          {filteredContacts.map(contact => (
            <motion.div key={contact.id} whileTap={{ scale: 0.98 }} onClick={() => openChat(contact)}
              className="bg-white px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-lg">
                  {contact.first_name?.[0]}{contact.last_name?.[0]}
                </div>
                {contact.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {contact.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-slate-800 text-sm">{contact.first_name} {contact.last_name}</p>
                  <span className="text-[10px] text-slate-400">{formatTime(contact.lastMessageTime)}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{contact.position || 'Employee'}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{contact.lastMessage || 'No messages yet'}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Chat View */}
      {view === 'chat' && selectedContact && (
        <>
          <div className="flex-1 px-4 py-3 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {chatMessages.length === 0 && (
              <div className="text-center py-12"><p className="text-slate-400 text-sm">Start a conversation with {selectedContact.first_name}</p></div>
            )}
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.sender_id === user.id ? 'bg-blue-500 text-white rounded-br-md' : 'bg-white text-slate-700 rounded-bl-md shadow-sm'}`}>
                  <p className="text-sm">{msg.message}</p>
                  <div className={`flex items-center gap-1 mt-1 ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[10px] ${msg.sender_id === user.id ? 'text-blue-100' : 'text-slate-400'}`}>
                      {formatTime(msg.created_at)}
                    </span>
                    {msg.sender_id === user.id && (
                      msg.is_read ? <CheckCheck className="w-3 h-3 text-blue-200" /> : <Check className="w-3 h-3 text-blue-200" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-slate-200 p-3 flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-blue-500"><Paperclip className="w-5 h-5" /></button>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Message..."
              className="flex-1 p-2.5 bg-slate-100 rounded-full text-sm" onKeyDown={e => e.key === 'Enter' && handleSend()} />
            <button onClick={handleSend} disabled={!newMsg.trim()} className="p-2.5 bg-blue-500 text-white rounded-full disabled:opacity-50">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </>
      )}

      <BottomNav active="messages" />
    </div>
  )
}
