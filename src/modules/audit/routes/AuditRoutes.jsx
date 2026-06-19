import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import AuditTrailDashboard from '../pages/AuditTrailDashboard'
import { USER_ROLES } from '../../../types/authTypes'

export default function AuditRoutes() {
  const allowedRoles = [
    USER_ROLES.SUPER_ADMIN, 
    USER_ROLES.OPERATIONS_MANAGER, 
    USER_ROLES.HR_MANAGER,
    USER_ROLES.FINANCE_OFFICER
  ]

  return (
    <Routes>
      <Route path="/" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allowedRoles}>
            <AuditTrailDashboard />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      <Route path="/:id" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allowedRoles}>
            <AuditTrailDashboard />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
