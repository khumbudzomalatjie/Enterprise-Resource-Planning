import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import AppRoutes from './routes/AppRoutes'
import useAuthStore from './store/authStore'
import useThemeStore from './store/themeStore'
import useAIStore from './modules/ai/store/aiStore'
import AIFloatButton from './modules/ai/components/AIFloatButton'
import AIChatWindow from './modules/ai/components/AIChatWindow'

export default function App() {
  const initialize = useAuthStore(state => state.initialize)
  const initTheme = useThemeStore(state => state.initTheme)
  const initSession = useAIStore(state => state.initSession)
  const { user } = useAuthStore()

  useEffect(() => {
    initialize()
    initTheme()
  }, [initialize, initTheme])

  useEffect(() => {
    if (user?.id) {
      initSession(user.id)
    }
  }, [user?.id, initSession])

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            borderRadius: '25px',
            border: '1px solid #334155',
            boxShadow: '8px 8px 16px #020617, -8px -8px 16px #334155',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#fff' },
          },
        }}
      />
      <AppRoutes />
      {/* KHUMO AI Assistant - Available on every page */}
      <AIFloatButton />
      <AIChatWindow />
    </>
  )
}
