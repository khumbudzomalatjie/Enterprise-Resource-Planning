import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import FinanceDashboard from '../pages/FinanceDashboard'
import FinanceJobs from '../pages/FinanceJobs'
import VendorApprovals from '../pages/VendorApprovals'
import AccountsPayable from '../pages/AccountsPayable'
import AccountsReceivable from '../pages/AccountsReceivable'
import BudgetManagement from '../pages/BudgetManagement'
import GeneralLedger from '../pages/GeneralLedger'
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
      {/* VENDOR APPROVALS - Dedicated Page            */}
      {/* ============================================ */}
      <Route 
        path="/approvals" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <VendorApprovals />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* ACCOUNTS PAYABLE - Supplier Invoices         */}
      {/* ============================================ */}
      <Route 
        path="/payables" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <AccountsPayable />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* ACCOUNTS RECEIVABLE - Customer Invoices      */}
      {/* ============================================ */}
      <Route 
        path="/receivables" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <AccountsReceivable />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* BUDGETS - Budget Planning & Tracking         */}
      {/* ============================================ */}
      <Route 
        path="/budgets" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <BudgetManagement />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* GENERAL LEDGER - Financial Transactions      */}
      {/* ============================================ */}
      <Route 
        path="/ledger" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <GeneralLedger />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* PAYMENTS - Payment Tracking                  */}
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
