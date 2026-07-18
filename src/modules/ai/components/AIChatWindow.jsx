import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAIStore from '../store/aiStore'
import useAuthStore from '../../../store/authStore'
import { Send, Sparkles, Trash2, X, Zap, Bot } from 'lucide-react'

export default function AIChatWindow() {
  const { isOpen, messages, loading, quickPrompts, sendMessage, sendQuickPrompt, toggleChat, clearChat } = useAIStore()
  const { user, profile } = useAuthStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input, {
      userId: user?.id,
      role: profile?.role,
      userName: profile?.full_name || user?.email?.split('@')[0],
      currentPage: window.location.pathname
    })
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearChat = () => {
    if (window.confirm('Clear all chat history?')) {
      clearChat(user?.id)
    }
  }

  const formatMessage = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #7c3aed;">$1</strong>')
      .replace(/\n/g, '<br/>')
      .replace(/\|/g, '')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-24 right-6 z-50 w-[400px] max-w-[95vw] h-[600px] max-h-[80vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-purple-700 animate-pulse"></span>
              </div>
              <div>
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  KHUMO
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-normal">AI</span>
                </h3>
                <p className="text-white/70 text-xs">Ndanduleni ERP Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleClearChat} className="text-white/50 hover:text-white/80 p-1 transition-colors" title="Clear chat">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={toggleChat} className="text-white/70 hover:text-white p-1 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Status Bar */}
          <div className="bg-purple-50 dark:bg-purple-900/10 px-4 py-1.5 flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 border-b border-purple-100 dark:border-purple-900/20 flex-shrink-0">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>KHUMO is online</span>
            <span className="text-purple-300 dark:text-purple-600">•</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Powered</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" style={{ scrollBehavior: 'smooth' }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                    <Bot className="w-4 h-4 text-purple-600" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-purple-600 text-white rounded-br-md' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-md'
                }`}>
                  {msg.role === 'assistant' && (
                    <p className="text-[10px] font-bold text-purple-500 dark:text-purple-400 mb-1">KHUMO</p>
                  )}
                  <div 
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.message) }} 
                    className="prose prose-sm dark:prose-invert max-w-none"
                  />
                  <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-white/60' : 'text-slate-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 ml-2 mt-1">
                    <span className="text-white text-[10px] font-bold">
                      {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                  <Bot className="w-4 h-4 text-purple-600" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                  <p className="text-[10px] font-bold text-purple-500 mb-2">KHUMO is thinking...</p>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 1 && quickPrompts.length > 0 && (
            <div className="px-4 pb-2 flex-shrink-0">
              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" /> Quick Prompts
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => sendQuickPrompt(prompt.prompt_text, {
                      userId: user?.id,
                      role: profile?.role,
                      userName: profile?.full_name || user?.email?.split('@')[0],
                      currentPage: window.location.pathname
                    })}
                    className="px-2.5 py-1.5 rounded-full text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                  >
                    {prompt.icon} {prompt.prompt_text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-800">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask KHUMO anything..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="px-4 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                title="Send to KHUMO"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              KHUMO can analyze data, provide insights, and answer ERP questions
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
