import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function RoleBasedRoute({ children, requiredRoles = [] }) {
  const { user, profile, loading, signOut } = useAuthStore()
  const location = useLocation()

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

  // Block deactivated / deleted users — sign them out and send to login
  const blocked = profile && (profile.is_active === false || profile.deleted_at)
  if (blocked) {
    setTimeout(() => signOut(), 0)
    return <Navigate to="/login" replace />
  }

  if (requiredRoles.length > 0 && profile) {
    const hasRequiredRole = requiredRoles.includes(profile.role)

    // ✅ Extra grants — admin can give a user access beyond their role
    const extraGranted = Array.isArray(profile.extra_modules) ? profile.extra_modules : []
    const path = location.pathname
    const hasExtraGrant = extraGranted.some(
      p => path === p || path.startsWith(p + '/')
    )

    if (!hasRequiredRole && !hasExtraGrant) {
      // If cleaner tries to access restricted page, send them to mobile
      if (profile.role === 'cleaner') {
        return <Navigate to="/mobile" replace />
      }
      return <Navigate to="/unauthorized" replace />
    }
  }

  return children
}
