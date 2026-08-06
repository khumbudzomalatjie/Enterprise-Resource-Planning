import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import BookkeepingDashboard from '../pages/BookkeepingDashboard'
import { USER_ROLES } from '../../../types/authTypes'

export default function BookkeepingRoutes() {
  const financeRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_OFFICER, USER_ROLES.OPERATIONS_MANAGER]

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><RoleBasedRoute requiredRoles={financeRoles}><BookkeepingDashboard /></RoleBasedRoute></ProtectedRoute>} />
    </Routes>
  )
}
