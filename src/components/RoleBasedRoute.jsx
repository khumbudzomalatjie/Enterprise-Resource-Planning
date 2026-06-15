import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function RoleBasedRoute({ children, requiredRoles = [] }) {
  const { user, profile, loading } = useAuthStore()

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

  // Only check roles if requiredRoles is provided and not empty
  if (requiredRoles.length > 0 && profile) {
    const hasRequiredRole = requiredRoles.includes(profile.role)
    
    if (!hasRequiredRole) {
      // If cleaner tries to access restricted page, send them to mobile
      if (profile.role === 'cleaner') {
        return <Navigate to="/mobile" replace />
      }
      // Other roles go to unauthorized page
      return <Navigate to="/unauthorized" replace />
    }
  }

  return children
}
