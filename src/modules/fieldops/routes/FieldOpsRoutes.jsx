import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import FieldOpsDashboard from '../pages/FieldOpsDashboard'
import LiveJobs from '../pages/LiveJobs'
import JobTracker from '../pages/JobTracker'
import PhotoGallery from '../pages/PhotoGallery'

// Enterprise Incident Management
import IncidentDashboard from '../incidents/pages/IncidentDashboard'
import ReportIncident from '../incidents/pages/ReportIncident'
import IncidentList from '../incidents/pages/IncidentList'
import IncidentDetail from '../incidents/pages/IncidentDetail'
import IncidentTracker from '../incidents/pages/IncidentTracker'
import MyIncidents from '../incidents/pages/MyIncidents'
import AllCapas from '../incidents/pages/AllCapas'

// Field Ops Messaging System
import Messages from '../messages/pages/Messages'

import { USER_ROLES } from '../../../types/authTypes'

export default function FieldOpsRoutes() {
  const allRoles = [
    USER_ROLES.SUPER_ADMIN, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR,
    USER_ROLES.HR_MANAGER, USER_ROLES.FINANCE_OFFICER, USER_ROLES.SALES_AGENT, USER_ROLES.CLEANER
  ]

  return (
    <Routes>
      {/* ============================================ */}
      {/* MAIN DASHBOARD                                */}
      {/* ============================================ */}
      <Route path="/" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allRoles}>
            <FieldOpsDashboard />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      
      {/* ============================================ */}
      {/* LIVE JOBS                                     */}
      {/* ============================================ */}
      <Route path="/live-jobs" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allRoles}>
            <LiveJobs />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      
      {/* ============================================ */}
      {/* JOB TRACKER                                   */}
      {/* ============================================ */}
      <Route path="/job-tracker" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allRoles}>
            <JobTracker />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* ============================================ */}
      {/* PHOTO GALLERY                                 */}
      {/* ============================================ */}
      <Route path="/photos" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allRoles}>
            <PhotoGallery />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* ============================================ */}
      {/* MESSAGING                                     */}
      {/* ============================================ */}
      <Route path="/messages" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allRoles}>
            <Messages />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* ============================================ */}
      {/* ENTERPRISE INCIDENT MANAGEMENT               */}
      {/* ============================================ */}
      <Route path="/incidents" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allRoles}>
            <IncidentDashboard />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/incidents/report" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allRoles}>
            <ReportIncident />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/incidents/list" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allRoles}>
            <IncidentList />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/incidents/tracker" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allRoles}>
            <IncidentTracker />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* My Incidents - Assigned to me */}
      <Route path="/incidents/my" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allRoles}>
            <MyIncidents />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />

      {/* All CAPAs tracker */}
      <Route path="/incidents/capas" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allRoles}>
            <AllCapas />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
      
      <Route path="/incidents/:id" element={
        <ProtectedRoute>
          <RoleBasedRoute requiredRoles={allRoles}>
            <IncidentDetail />
          </RoleBasedRoute>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
