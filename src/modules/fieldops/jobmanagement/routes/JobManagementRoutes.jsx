import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../../components/RoleBasedRoute'
import JobManagement from '../pages/JobManagement'
import { USER_ROLES } from '../../../../types/authTypes'

export default function JobManagementRoutes() {
  const allowedRoles = [
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.OPERATIONS_MANAGER,
    USER_ROLES.SUPERVISOR,
    USER_ROLES.HR_MANAGER,
  ]

  return (
    <Routes>
      <Route path="/" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allowedRoles}>
            <JobManagement />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
