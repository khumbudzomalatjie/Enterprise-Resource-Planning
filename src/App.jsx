import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import AppRoutes from './routes/AppRoutes'
import useAuthStore from './store/authStore'

export default function App() {
  const initialize = useAuthStore(state => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#3a3a3a',
            color: '#fff',
            borderRadius: '25px',
            border: '1px solid #4a4a4a',
            boxShadow: '5px 5px 20px #2a2a2a, -5px -5px 20px #4a4a4a',
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
