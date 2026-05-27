import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import SalesDashboard from '../pages/SalesDashboard'
import CreateQuotation from '../pages/CreateQuotation'
import { USER_ROLES } from '../../../types/authTypes'

export default function SalesRoutes() {
  return (
    <Routes>
      <Route path="/" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={[USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SALES_AGENT, USER_ROLES.FINANCE_OFFICER]}>
            <SalesDashboard />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      <Route path="/quotations/new" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={[USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SALES_AGENT]}>
            <CreateQuotation />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
