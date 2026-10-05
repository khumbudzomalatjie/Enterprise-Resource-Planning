import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function RoleBasedRoute({ children, requiredRoles = [] }) {
  const { user, profile, loading, signOut } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#333] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white text-lg">Checking permissions...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // ✅ Block deactivated / deleted users — sign them out and send to login
  const blocked = profile && (profile.is_active === false || profile.deleted_at)
  if (blocked) {
    // Fire-and-forget signOut (don't await — we're inside render)
    setTimeout(() => signOut(), 0)
    return <Navigate to="/login" replace />
  }

  if (requiredRoles.length > 0 && profile) {
    const hasRequiredRole = requiredRoles.includes(profile.role)
    if (!hasRequiredRole) {
      if (profile.role === 'cleaner') {
        return <Navigate to="/mobile" replace />
      }
      return <Navigate to="/unauthorized" replace />
    }
  }

  return children
}
