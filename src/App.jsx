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
    if (user) {
      initSession(user.id)
    }
  }, [user, initSession])

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
          },
        }}
      />
      <AppRoutes />
      <AIFloatButton />
      <AIChatWindow />
    </>
  )
}
