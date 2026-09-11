import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import CRMDashboard from '../pages/CRMDashboard'
import ClientList from '../pages/ClientList'
import ClientDetail from '../pages/ClientDetail'
import ContactList from '../pages/ContactList'
import PipelineBoard from '../pages/PipelineBoard'
import ServiceList from '../pages/ServiceList'
import { USER_ROLES } from '../../../types/authTypes'

export default function CRMRoutes() {
  const allowedRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SALES_AGENT]

  return (
    <Routes>
      {/* Dashboard */}
      <Route path="/" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allowedRoles}>
            <CRMDashboard />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      
      {/* Client List - MUST come before /:id */}
      <Route path="/clients" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allowedRoles}>
            <ClientList />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      
      {/* Client Detail */}
      <Route path="/clients/:id" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allowedRoles}>
            <ClientDetail />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* ✅ NEW: Contacts */}
      <Route path="/contacts" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allowedRoles}>
            <ContactList />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* ✅ NEW: Pipeline */}
      <Route path="/pipeline" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allowedRoles}>
            <PipelineBoard />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* ✅ NEW: Services */}
      <Route path="/services" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allowedRoles}>
            <ServiceList />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/crm" replace />} />
    </Routes>
  )
}
