import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import FinanceDashboard from '../pages/FinanceDashboard'
import FinanceJobs from '../pages/FinanceJobs'
import { USER_ROLES } from '../../../types/authTypes'

export default function FinanceRoutes() {
  const allowedRoles = [
    USER_ROLES.SUPER_ADMIN, 
    USER_ROLES.FINANCE_OFFICER, 
    USER_ROLES.OPERATIONS_MANAGER
  ]

  return (
    <Routes>
      {/* ============================================ */}
      {/* FINANCE DASHBOARD                            */}
      {/* ============================================ */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <FinanceDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* VENDOR APPROVALS                             */}
      {/* ============================================ */}
      <Route 
        path="/approvals" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <FinanceDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* ACCOUNTS PAYABLE                            */}
      {/* ============================================ */}
      <Route 
        path="/payables" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <FinanceDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* ACCOUNTS RECEIVABLE                         */}
      {/* ============================================ */}
      <Route 
        path="/receivables" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <FinanceDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* BUDGETS                                      */}
      {/* ============================================ */}
      <Route 
        path="/budgets" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <FinanceDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* GENERAL LEDGER                              */}
      {/* ============================================ */}
      <Route 
        path="/ledger" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <FinanceDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* PAYMENTS                                     */}
      {/* ============================================ */}
      <Route 
        path="/payments" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <FinanceDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* JOBS → INVOICE GENERATION                   */}
      {/* ============================================ */}
      <Route 
        path="/jobs" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <FinanceJobs />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}
