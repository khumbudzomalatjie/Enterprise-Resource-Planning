import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { ROLE_PERMISSIONS } from '../types/authTypes'

export default function RoleBasedRoute({ children, requiredRoles = [] }) {
  const { user, profile, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRoles.length > 0 && profile) {
    const hasRequiredRole = requiredRoles.includes(profile.role)
    
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return children
}
