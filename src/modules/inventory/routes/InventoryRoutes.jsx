import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import InventoryDashboard from '../pages/InventoryDashboard'
import StockList from '../pages/StockList'
import ServiceList from '../pages/ServiceList'
import ServiceForm from '../pages/ServiceForm'
import ProductList from '../pages/ProductList'
import { USER_ROLES } from '../../../types/authTypes'

export default function InventoryRoutes() {
  const allowedRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR]

  return (
    <Routes>
      {/* Dashboard */}
      <Route path="/" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><InventoryDashboard /></RoleBasedRoute></ProtectedRoute>} />
      
      {/* Stock/Items */}
      <Route path="/items" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><StockList /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/items/:id" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><StockList /></RoleBasedRoute></ProtectedRoute>} />

      {/* Services & Pricing */}
      <Route path="/services" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><ServiceList /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/services/new" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><ServiceForm /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/services/:id/edit" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><ServiceForm /></RoleBasedRoute></ProtectedRoute>} />

      {/* Consumable Products */}
      <Route path="/products" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><ProductList /></RoleBasedRoute></ProtectedRoute>} />
    </Routes>
  )
}
