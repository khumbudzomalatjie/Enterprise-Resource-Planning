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
import FleetRoutes from '../modules/fleet/routes/FleetRoutes'
import ReportsRoutes from '../modules/reports/routes/ReportsRoutes'
import WorkflowRoutes from '../modules/workflow/routes/WorkflowRoutes'
import DocumentsRoutes from '../modules/documents/routes/DocumentsRoutes'
import AssetsRoutes from '../modules/assets/routes/AssetsRoutes'
import MobileRoutes from '../modules/mobile/routes/MobileRoutes'

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
      {/* MODULE 1 - HR MANAGEMENT                     */}
      {/* ============================================ */}
      <Route 
        path="/hr/*" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[
              USER_ROLES.SUPER_ADMIN, 
              USER_ROLES.HR_MANAGER, 
              USER_ROLES.OPERATIONS_MANAGER
            ]}>
              <HRRoutes />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      
      {/* ============================================ */}
      {/* MODULE 2 - PAYROLL MANAGEMENT                */}
      {/* ============================================ */}
      <Route 
        path="/payroll/*" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[
              USER_ROLES.SUPER_ADMIN, 
              USER_ROLES.FINANCE_OFFICER, 
              USER_ROLES.HR_MANAGER
            ]}>
              <PayrollRoutes />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      
      {/* ============================================ */}
      {/* MODULE 4 - CRM & CLIENT MANAGEMENT           */}
      {/* ============================================ */}
      <Route 
        path="/crm/*" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[
              USER_ROLES.SUPER_ADMIN, 
              USER_ROLES.OPERATIONS_MANAGER, 
              USER_ROLES.SALES_AGENT
            ]}>
              <CRMRoutes />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      
      {/* ============================================ */}
      {/* MODULE 5 - SALES & QUOTATIONS                */}
      {/* ============================================ */}
      <Route 
        path="/sales/*" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[
              USER_ROLES.SUPER_ADMIN, 
              USER_ROLES.OPERATIONS_MANAGER, 
              USER_ROLES.SALES_AGENT,
              USER_ROLES.FINANCE_OFFICER
            ]}>
              <SalesRoutes />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      
      {/* ============================================ */}
      {/* MODULE 6 - OPERATIONS & SCHEDULING           */}
      {/* ============================================ */}
      <Route 
        path="/operations/*" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[
              USER_ROLES.SUPER_ADMIN, 
              USER_ROLES.OPERATIONS_MANAGER, 
              USER_ROLES.SUPERVISOR
            ]}>
              <OperationsRoutes />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* MODULE 7 - INVENTORY MANAGEMENT              */}
      {/* ============================================ */}
      <Route 
        path="/inventory/*" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[
              USER_ROLES.SUPER_ADMIN, 
              USER_ROLES.OPERATIONS_MANAGER, 
              USER_ROLES.SUPERVISOR
            ]}>
              <InventoryRoutes />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* MODULE 8 - PROCUREMENT MANAGEMENT            */}
      {/* ============================================ */}
      <Route 
        path="/procurement/*" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[
              USER_ROLES.SUPER_ADMIN, 
              USER_ROLES.OPERATIONS_MANAGER, 
              USER_ROLES.FINANCE_OFFICER
            ]}>
              <ProcurementRoutes />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* MODULE 9 - FINANCE & ACCOUNTING              */}
      {/* ============================================ */}
      <Route 
        path="/finance/*" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[
              USER_ROLES.SUPER_ADMIN, 
              USER_ROLES.FINANCE_OFFICER, 
              USER_ROLES.OPERATIONS_MANAGER
            ]}>
              <FinanceRoutes />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* MODULE 10 - FLEET MANAGEMENT                 */}
      {/* ============================================ */}
      <Route 
        path="/fleet/*" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[
              USER_ROLES.SUPER_ADMIN, 
              USER_ROLES.OPERATIONS_MANAGER, 
              USER_ROLES.SUPERVISOR
            ]}>
              <FleetRoutes />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* MODULE 12 - REPORTING & ANALYTICS            */}
      {/* ============================================ */}
      <Route 
        path="/reports/*" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[
              USER_ROLES.SUPER_ADMIN, 
              USER_ROLES.OPERATIONS_MANAGER, 
              USER_ROLES.FINANCE_OFFICER,
              USER_ROLES.HR_MANAGER
            ]}>
              <ReportsRoutes />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* MODULE 16 - WORKFLOW AUTOMATION              */}
      {/* ============================================ */}
      <Route 
        path="/workflow/*" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[
              USER_ROLES.SUPER_ADMIN, 
              USER_ROLES.OPERATIONS_MANAGER, 
              USER_ROLES.FINANCE_OFFICER
            ]}>
              <WorkflowRoutes />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* MODULE 17 - DOCUMENT MANAGEMENT              */}
      {/* ============================================ */}
      <Route 
        path="/documents/*" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[
              USER_ROLES.SUPER_ADMIN, 
              USER_ROLES.OPERATIONS_MANAGER, 
              USER_ROLES.HR_MANAGER
            ]}>
              <DocumentsRoutes />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* ASSETS MANAGEMENT                            */}
      {/* ============================================ */}
      <Route 
        path="/assets/*" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[
              USER_ROLES.SUPER_ADMIN, 
              USER_ROLES.OPERATIONS_MANAGER, 
              USER_ROLES.FINANCE_OFFICER
            ]}>
              <AssetsRoutes />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* MODULE 14 - MOBILE WORKFORCE                 */}
      {/* FIXED: Only ProtectedRoute, NO RoleBasedRoute */}
      {/* This allows cleaners to access /mobile       */}
      {/* ============================================ */}
      <Route 
        path="/mobile/*" 
        element={
          <ProtectedRoute>
            <MobileRoutes />
          </ProtectedRoute>
        } 
      />
      
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
