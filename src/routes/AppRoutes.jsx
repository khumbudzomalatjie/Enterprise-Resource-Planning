import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import RoleBasedRoute from '../components/RoleBasedRoute'
import Login from '../pages/Login'
import ForgotPassword from '../pages/ForgotPassword'
import ResetPassword from '../pages/ResetPassword'
import Dashboard from '../pages/Dashboard'
import UserManagement from '../pages/UserManagement'
import Unauthorized from '../pages/Unauthorized'

// Module Routes
import HRRoutes from '../modules/hr/routes/HRRoutes'
import PayrollRoutes from '../modules/payroll/routes/PayrollRoutes'
import CRMRoutes from '../modules/crm/routes/CRMRoutes'
import SalesRoutes from '../modules/sales/routes/SalesRoutes'
import OperationsRoutes from '../modules/operations/routes/OperationsRoutes'
import InventoryRoutes from '../modules/inventory/routes/InventoryRoutes'
import ProcurementRoutes from '../modules/procurement/routes/ProcurementRoutes'
import FinanceRoutes from '../modules/finance/routes/FinanceRoutes'

import { USER_ROLES } from '../types/authTypes'

export default function AppRoutes() {
  return (
    <Routes>
      {/* ============================================ */}
      {/* PUBLIC ROUTES - No Authentication Required   */}
      {/* ============================================ */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* ============================================ */}
      {/* PROTECTED ROUTES - Authentication Required    */}
      {/* ============================================ */}
      
      {/* Main Dashboard - All authenticated users */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      {/* ============================================ */}
      {/* MODULE 0 - AUTHENTICATION & ACCESS CONTROL   */}
      {/* (Handled by Supabase Auth + ProtectedRoute)  */}
      {/* ============================================ */}
      
      {/* ============================================ */}
      {/* MODULE 1 - HR MANAGEMENT                     */}
      {/* Access: Super Admin, HR Manager, Ops Manager */}
      {/* ============================================ */}
      <Route 
        path="/hr/*" 
        element={
          <ProtectedRoute>
            <HRRoutes />
          </ProtectedRoute>
        } 
      />
      
      {/* ============================================ */}
      {/* MODULE 2 - PAYROLL MANAGEMENT                */}
      {/* Access: Super Admin, Finance Officer, HR Mgr */}
      {/* ============================================ */}
      <Route 
        path="/payroll/*" 
        element={
          <ProtectedRoute>
            <PayrollRoutes />
          </ProtectedRoute>
        } 
      />
      
      {/* ============================================ */}
      {/* MODULE 3 - ATTENDANCE TRACKING               */}
      {/* (Integrated under HR Module /hr/attendance)  */}
      {/* ============================================ */}
      
      {/* ============================================ */}
      {/* MODULE 4 - CRM & CLIENT MANAGEMENT           */}
      {/* Access: Super Admin, Ops Manager, Sales Agent*/}
      {/* ============================================ */}
      <Route 
        path="/crm/*" 
        element={
          <ProtectedRoute>
            <CRMRoutes />
          </ProtectedRoute>
        } 
      />
      
      {/* ============================================ */}
      {/* MODULE 5 - SALES & QUOTATIONS                */}
      {/* Access: Super Admin, Ops Mgr, Sales, Finance */}
      {/* ============================================ */}
      <Route 
        path="/sales/*" 
        element={
          <ProtectedRoute>
            <SalesRoutes />
          </ProtectedRoute>
        } 
      />
      
      {/* ============================================ */}
      {/* MODULE 6 - OPERATIONS & SCHEDULING           */}
      {/* Access: Super Admin, Ops Manager, Supervisor */}
      {/* ============================================ */}
      <Route 
        path="/operations/*" 
        element={
          <ProtectedRoute>
            <OperationsRoutes />
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* MODULE 7 - INVENTORY MANAGEMENT              */}
      {/* Access: Super Admin, Ops Manager, Supervisor */}
      {/* ============================================ */}
      <Route 
        path="/inventory/*" 
        element={
          <ProtectedRoute>
            <InventoryRoutes />
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* MODULE 8 - PROCUREMENT MANAGEMENT            */}
      {/* Access: Super Admin, Ops Manager, Finance    */}
      {/* ============================================ */}
      <Route 
        path="/procurement/*" 
        element={
          <ProtectedRoute>
            <ProcurementRoutes />
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* MODULE 9 - FINANCE & ACCOUNTING              */}
      {/* Access: Super Admin, Finance Officer, Ops Mgr */}
      {/* ============================================ */}
      <Route 
        path="/finance/*" 
        element={
          <ProtectedRoute>
            <FinanceRoutes />
          </ProtectedRoute>
        } 
      />
      
      {/* ============================================ */}
      {/* MODULE 10 - FLEET MANAGEMENT                 */}
      {/* (Coming Soon)                                */}
      {/* ============================================ */}
      
      {/* ============================================ */}
      {/* MODULE 11 - QUALITY CONTROL                  */}
      {/* (Coming Soon)                                */}
      {/* ============================================ */}
      
      {/* ============================================ */}
      {/* MODULE 12 - REPORTING & ANALYTICS            */}
      {/* (Coming Soon)                                */}
      {/* ============================================ */}
      
      {/* ============================================ */}
      {/* MODULE 13 - CUSTOMER PORTAL                  */}
      {/* (Coming Soon)                                */}
      {/* ============================================ */}
      
      {/* ============================================ */}
      {/* MODULE 14 - MOBILE WORKFORCE                 */}
      {/* (Coming Soon)                                */}
      {/* ============================================ */}
      
      {/* ============================================ */}
      {/* MODULE 15 - NOTIFICATIONS & COMMUNICATION    */}
      {/* (Coming Soon)                                */}
      {/* ============================================ */}
      
      {/* ============================================ */}
      {/* MODULE 16 - WORKFLOW AUTOMATION              */}
      {/* (Coming Soon)                                */}
      {/* ============================================ */}
      
      {/* ============================================ */}
      {/* MODULE 17 - DOCUMENT MANAGEMENT              */}
      {/* (Coming Soon)                                */}
      {/* ============================================ */}
      
      {/* ============================================ */}
      {/* ADMIN ROUTES - Super Admin Only              */}
      {/* ============================================ */}
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[USER_ROLES.SUPER_ADMIN]}>
              <UserManagement />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />
      
      {/* ============================================ */}
      {/* ERROR ROUTES                                 */}
      {/* ============================================ */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      {/* ============================================ */}
      {/* DEFAULT REDIRECTS                            */}
      {/* ============================================ */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
