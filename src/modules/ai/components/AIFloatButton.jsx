import { motion } from 'framer-motion'
import useAIStore from '../store/aiStore'
import { MessageCircle, X } from 'lucide-react'

export default function AIFloatButton() {
  const { isOpen, toggleChat, unreadInsights, loading } = useAIStore()

  return (
    <motion.button
      onClick={toggleChat}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
      title="AI Assistant"
    >
      {isOpen ? (
        <X className="w-6 h-6" />
      ) : (
        <>
          <MessageCircle className="w-6 h-6" />
          {unreadInsights > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadInsights}
            </span>
          )}
          {loading && (
            <span className="absolute inset-0 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
          )}
        </>
      )}
      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
    </motion.button>
  )
}
