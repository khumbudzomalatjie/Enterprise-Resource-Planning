import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { MessageCircle, Send, User } from 'lucide-react'

export default function Messages() {
  const { user } = useAuthStore()
  const { messages, fetchMessages, sendMessage } = useMobileStore()
  const navigate = useNavigate()
  const [newMsg, setNewMsg] = useState('')

  useEffect(() => { if (user?.id) fetchMessages(user.id) }, [user?.id])

  const handleSend = async () => {
    if (!newMsg.trim()) return
    const result = await sendMessage({ sender_id: user.id, receiver_id: null, message: newMsg, is_read: false })
    if (result.error) toast.error('Failed to send')
    else { setNewMsg(''); fetchMessages(user.id); toast.success('Sent!') }
  }

  return (
    <div className="min-h-screen bg-slate-100 font-['Inter'] pb-20">
      <div className="bg-blue-600 text-white px-5 pt-8 pb-5">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-blue-100 text-sm">Synced with ERP</p>
      </div>

      <div className="px-5 mt-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-12"><MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" /><p className="text-slate-500">No messages yet</p></div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`bg-white rounded-2xl p-4 shadow-sm ${msg.sender_id === user?.id ? 'ml-8 bg-blue-50' : 'mr-8'}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center"><User className="w-3 h-3 text-blue-600" /></div>
              <span className="text-xs font-medium text-slate-600">{msg.sender_id === user?.id ? 'You' : msg.sender_name}</span>
              <span className="text-[10px] text-slate-400 ml-auto">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="text-sm text-slate-700">{msg.message}</p>
          </div>
        ))}
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-slate-200 p-3 flex gap-2">
        <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message..." className="flex-1 p-2 border rounded-xl text-sm" onKeyDown={e => e.key === 'Enter' && handleSend()} />
        <button onClick={handleSend} className="bg-blue-600 text-white p-2 rounded-xl"><Send className="w-5 h-5" /></button>
      </div>

      <BottomNav active="messages" />
    </div>
  )
}
