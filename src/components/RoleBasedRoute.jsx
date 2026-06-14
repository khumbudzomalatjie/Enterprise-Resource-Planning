import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function RoleBasedRoute({ children, requiredRoles = [] }) {
  const { user, profile, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#333] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If no specific roles required, allow access
  if (!requiredRoles || requiredRoles.length === 0) {
    return children
  }

  // Super admin can access everything
  if (profile?.role === 'super_admin') {
    return children
  }

  // Check if user's role is in the required roles
  if (profile?.role && requiredRoles.includes(profile.role)) {
    return children
  }

  // Access denied
  return <Navigate to="/unauthorized" replace />
}
