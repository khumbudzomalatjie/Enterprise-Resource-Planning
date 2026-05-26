import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import RoleBasedRoute from '../components/RoleBasedRoute'
import Login from '../pages/Login'
import ForgotPassword from '../pages/ForgotPassword'
import ResetPassword from '../pages/ResetPassword'
import Dashboard from '../pages/Dashboard'
import UserManagement from '../pages/UserManagement'
import Unauthorized from '../pages/Unauthorized'
import { USER_ROLES } from '../types/authTypes'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes - No authentication required */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Protected Routes - Authentication required */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      {/* Admin Routes - Super Admin only */}
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
      
      {/* Error Routes */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      
      {/* Default Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
