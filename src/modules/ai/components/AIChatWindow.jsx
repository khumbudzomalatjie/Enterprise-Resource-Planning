import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAIStore from '../store/aiStore'
import useAuthStore from '../../../store/authStore'
import { Send, Sparkles, Trash2, X, Zap, Bot, Copy, Check, ArrowRight } from 'lucide-react'

export default function AIChatWindow() {
  const { isOpen, messages, loading, quickPrompts, sendMessage, sendQuickPrompt, toggleChat, clearChat, updateContext } = useAIStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (user && profile) {
      updateContext({
        userId: user.id,
        userName: profile.full_name || user.email?.split('@')[0],
        role: profile.role,
        currentPage: window.location.pathname
      })
    }
  }, [user, profile])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (isOpen && inputRef.current) inputRef.current.focus() }, [isOpen])

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input)
    setInput('')
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }
  const handleClearChat = () => { if (window.confirm('Clear chat history?')) clearChat(user?.id) }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(Date.now())
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleAction = (action) => {
    if (action?.navigate) {
      toggleChat()
      setTimeout(() => navigate(action.navigate), 200)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.2 }}
          className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[95vw] h-[600px] max-h-[80vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-teal-700 animate-pulse"></span>
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Khumo</h3>
                <p className="text-white/70 text-xs">ERP Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleClearChat} className="text-white/50 hover:text-white/80 p-1"><Trash2 className="w-4 h-4" /></button>
              <button onClick={toggleChat} className="text-white/70 hover:text-white p-1"><X className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                    <Bot className="w-4 h-4 text-emerald-600" />
                  </div>
                )}
                <div className={`max-w-[82%] ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-2xl rounded-br-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl rounded-bl-md'} px-4 py-3 text-sm relative group`}>
                  <div className="whitespace-pre-wrap">{msg.message}</div>
                  
                  {/* Action Button */}
                  {msg.action && (
                    <button
                      onClick={() => handleAction(msg.action)}
                      className="mt-3 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      {msg.action.label} <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <p className={`text-[10px] ${msg.role === 'user' ? 'text-white/60' : 'text-slate-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {msg.role === 'assistant' && (
                      <button onClick={() => handleCopy(msg.message)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mr-2 mt-1"><Bot className="w-4 h-4 text-emerald-600" /></div>
                <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 1 && quickPrompts.length > 0 && (
            <div className="px-4 pb-2 flex-shrink-0">
              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> Suggestions</p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {quickPrompts.slice(0, 8).map((prompt) => (
                  <button key={prompt.id} onClick={() => sendQuickPrompt(prompt.prompt_text)}
                    className="px-3 py-1.5 rounded-full text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
                    {prompt.icon} {prompt.prompt_text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
            <div className="flex gap-2">
              <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Ask Khumo anything..." disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
              <button onClick={handleSend} disabled={!input.trim() || loading}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
