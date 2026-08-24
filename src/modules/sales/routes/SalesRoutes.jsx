import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import SalesDashboard from '../pages/SalesDashboard'
import CreateQuotation from '../pages/CreateQuotation'
import QuotationList from '../pages/QuotationList'
import QuotationDetail from '../pages/QuotationDetail'
import InvoiceList from '../pages/InvoiceList'
import SalesReports from '../pages/SalesReports'
import PaymentList from '../pages/PaymentList'
import { USER_ROLES } from '../../../types/authTypes'

export default function SalesRoutes() {
  const salesRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SALES_AGENT, USER_ROLES.FINANCE_OFFICER]
  const createRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SALES_AGENT]

  return (
    <Routes>
      {/* ============================================ */}
      {/* SALES DASHBOARD                              */}
      {/* ============================================ */}
      <Route path="/" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={salesRoles}>
            <SalesDashboard />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      
      {/* ============================================ */}
      {/* QUOTATIONS                                   */}
      {/* ============================================ */}
      
      {/* Quotation List */}
      <Route path="/quotations" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={salesRoles}>
            <QuotationList />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      
      {/* New Quotation */}
      <Route path="/quotations/new" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={createRoles}>
            <CreateQuotation />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      
      {/* Edit Quotation - opens CreateQuotation in edit mode */}
      <Route path="/quotations/:id/edit" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={createRoles}>
            <CreateQuotation />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      
      {/* View Quotation Detail */}
      <Route path="/quotations/:id" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={salesRoles}>
            <QuotationDetail />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* ============================================ */}
      {/* INVOICES                                     */}
      {/* ============================================ */}
      <Route path="/invoices" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={salesRoles}>
            <InvoiceList />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* ============================================ */}
      {/* SALES REPORTS                                */}
      {/* ============================================ */}
      <Route path="/reports" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={salesRoles}>
            <SalesReports />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* ============================================ */}
      {/* PAYMENTS                                     */}
      {/* ============================================ */}
      <Route path="/payments" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={salesRoles}>
            <PaymentList />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
