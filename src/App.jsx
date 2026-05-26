import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import AppRoutes from './routes/AppRoutes'
import useAuthStore from './store/authStore'
import useThemeStore from './store/themeStore'

export default function App() {
  const initialize = useAuthStore(state => state.initialize)
  const initTheme = useThemeStore(state => state.initTheme)

  useEffect(() => {
    initialize()
    initTheme()
  }, [initialize, initTheme])

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
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <AppRoutes />
    </>
  )
}
