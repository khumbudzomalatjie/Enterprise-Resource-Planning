import { motion } from 'framer-motion'
import useAIStore from '../store/aiStore'
import { Bot, X } from 'lucide-react'

export default function AIFloatButton() {
  const { isOpen, toggleChat, unreadInsights, loading } = useAIStore()

  return (
    <motion.button
      onClick={toggleChat}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className="fixed bottom-6 right-6 z-50 group"
      title="Chat with KHUMO - AI Assistant"
      aria-label="Open KHUMO AI Chat"
    >
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-30"></span>
      
      {/* Main button */}
      <span 
        className="relative rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center border-2 border-white/20"
        style={{ width: '58px', height: '58px' }}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <Bot className="w-7 h-7" />
            {unreadInsights > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-white">
                {unreadInsights > 9 ? '9+' : unreadInsights}
              </span>
            )}
          </>
        )}
      </span>

      {/* Label on hover */}
      <span className="absolute -top-10 right-0 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none">
        Chat with KHUMO 🤖
      </span>

      {/* Online indicator */}
      <span className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse"></span>
    </motion.button>
  )
}
