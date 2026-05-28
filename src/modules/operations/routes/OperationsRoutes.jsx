import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import OperationsDashboard from '../pages/OperationsDashboard'
import CreateJob from '../pages/CreateJob'
import JobList from '../pages/JobList'
import JobDetail from '../pages/JobDetail'
import SchedulingCalendar from '../pages/SchedulingCalendar'
import QualityInspections from '../pages/QualityInspections'
import RoutePlanning from '../pages/RoutePlanning'
import { USER_ROLES } from '../../../types/authTypes'

export default function OperationsRoutes() {
  return (
    <Routes>
      {/* Operations Main Dashboard */}
      <Route path="/" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={[
            USER_ROLES.SUPER_ADMIN, 
            USER_ROLES.OPERATIONS_MANAGER, 
            USER_ROLES.SUPERVISOR,
            USER_ROLES.HR_MANAGER
          ]}>
            <OperationsDashboard />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* Jobs Management */}
      <Route path="/jobs" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={[
            USER_ROLES.SUPER_ADMIN, 
            USER_ROLES.OPERATIONS_MANAGER, 
            USER_ROLES.SUPERVISOR
          ]}>
            <JobList />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      <Route path="/jobs/new" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={[
            USER_ROLES.SUPER_ADMIN, 
            USER_ROLES.OPERATIONS_MANAGER, 
            USER_ROLES.SUPERVISOR
          ]}>
            <CreateJob />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      <Route path="/jobs/:id" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={[
            USER_ROLES.SUPER_ADMIN, 
            USER_ROLES.OPERATIONS_MANAGER, 
            USER_ROLES.SUPERVISOR,
            USER_ROLES.CLEANER
          ]}>
            <JobDetail />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* Calendar & Scheduling */}
      <Route path="/calendar" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={[
            USER_ROLES.SUPER_ADMIN, 
            USER_ROLES.OPERATIONS_MANAGER, 
            USER_ROLES.SUPERVISOR
          ]}>
            <SchedulingCalendar />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* Quality Inspections */}
      <Route path="/quality" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={[
            USER_ROLES.SUPER_ADMIN, 
            USER_ROLES.OPERATIONS_MANAGER, 
            USER_ROLES.SUPERVISOR
          ]}>
            <QualityInspections />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* Route Planning / Map */}
      <Route path="/routes" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={[
            USER_ROLES.SUPER_ADMIN, 
            USER_ROLES.OPERATIONS_MANAGER, 
            USER_ROLES.SUPERVISOR
          ]}>
            <RoutePlanning />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* Teams - Coming Soon */}
      <Route path="/teams" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={[
            USER_ROLES.SUPER_ADMIN, 
            USER_ROLES.OPERATIONS_MANAGER, 
            USER_ROLES.SUPERVISOR
          ]}>
            <OperationsDashboard />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/operations" replace />} />
    </Routes>
  )
}
