import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import ProcurementDashboard from '../pages/ProcurementDashboard'
import PurchaseRequests from '../pages/PurchaseRequests'
import CreatePurchaseRequest from '../pages/CreatePurchaseRequest'
import PurchaseOrders from '../pages/PurchaseOrders'
import CreatePurchaseOrder from '../pages/CreatePurchaseOrder'
import RFQManagement from '../pages/RFQManagement'
import CreateRFQ from '../pages/CreateRFQ'
import VendorManagement from '../pages/VendorManagement'
import CreateVendor from '../pages/CreateVendor'
import GoodsReceipts from '../pages/GoodsReceipts'
import CreateGoodsReceipt from '../pages/CreateGoodsReceipt'
import { USER_ROLES } from '../../../types/authTypes'

export default function ProcurementRoutes() {
  const allowedRoles = [
    USER_ROLES.SUPER_ADMIN, 
    USER_ROLES.OPERATIONS_MANAGER, 
    USER_ROLES.FINANCE_OFFICER
  ]

  return (
    <Routes>
      {/* ============================================ */}
      {/* PROCUREMENT DASHBOARD                        */}
      {/* ============================================ */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <ProcurementDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* PURCHASE REQUISITIONS (PR)                   */}
      {/* ============================================ */}
      <Route 
        path="/pr" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <PurchaseRequests />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pr/new" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <CreatePurchaseRequest />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pr/:id" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <CreatePurchaseRequest />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* PURCHASE ORDERS (PO)                         */}
      {/* ============================================ */}
      <Route 
        path="/po" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <PurchaseOrders />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/po/new" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <CreatePurchaseOrder />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/po/:id" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <CreatePurchaseOrder />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* REQUEST FOR QUOTATIONS (RFQ)                 */}
      {/* ============================================ */}
      <Route 
        path="/rfq" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <RFQManagement />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/rfq/new" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <CreateRFQ />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/rfq/:id" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <CreateRFQ />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* VENDOR MANAGEMENT                            */}
      {/* ============================================ */}
      <Route 
        path="/vendors" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <VendorManagement />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendors/new" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <CreateVendor />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendors/:id" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <CreateVendor />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/vendors/:id/edit" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <CreateVendor />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* GOODS RECEIPTS                               */}
      {/* ============================================ */}
      <Route 
        path="/receipts" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <GoodsReceipts />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/receipts/new" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <CreateGoodsReceipt />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/receipts/:id" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <CreateGoodsReceipt />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* VENDOR EVALUATIONS                           */}
      {/* ============================================ */}
      <Route 
        path="/evaluations" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <VendorManagement />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* PROCUREMENT BUDGETS                          */}
      {/* ============================================ */}
      <Route 
        path="/budgets" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <ProcurementDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />

      {/* ============================================ */}
      {/* PROCUREMENT REPORTS                          */}
      {/* ============================================ */}
      <Route 
        path="/reports" 
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allowedRoles}>
              <ProcurementDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}
