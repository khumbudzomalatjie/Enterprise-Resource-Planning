import { useEffect } from 'react'
import useAuthStore from '../store/authStore'
import { supabase } from '../lib/supabaseClient'

export function useAuth() {
  const store = useAuthStore()
  const { initialize, fetchProfile } = store

  useEffect(() => {
    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.setState({
          user: null,
          profile: null,
          session: null,
        })
      } else if (event === 'TOKEN_REFRESHED' && session) {
        useAuthStore.setState({
          user: session.user,
          session: session,
        })
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [initialize, fetchProfile])

  return store
}
