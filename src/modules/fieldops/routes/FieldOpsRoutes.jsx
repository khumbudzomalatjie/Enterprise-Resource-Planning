import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import FieldOpsDashboard from '../pages/FieldOpsDashboard'
import LiveJobs from '../pages/LiveJobs'
import Incidents from '../pages/Incidents'
import ReportIncident from '../pages/ReportIncident'
import JobTracker from '../pages/JobTracker'
import { USER_ROLES } from '../../../types/authTypes'

export default function FieldOpsRoutes() {
  const allowedRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR, USER_ROLES.CLEANER]

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><FieldOpsDashboard /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/live-jobs" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><LiveJobs /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/incidents" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><Incidents /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/incidents/new" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><ReportIncident /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/incidents/:id" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><ReportIncident /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/job-tracker" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><JobTracker /></RoleBasedRoute></ProtectedRoute>} />
    </Routes>
  )
}
