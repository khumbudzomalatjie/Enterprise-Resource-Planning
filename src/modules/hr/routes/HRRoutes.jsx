import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import HRDashboard from '../pages/HRDashboard'
import EmployeeList from '../pages/EmployeeList'
import EmployeeDetail from '../pages/EmployeeDetail'
import CreateEmployee from '../pages/CreateEmployee'
import LeaveManagement from '../pages/LeaveManagement'
import AttendanceDashboard from '../attendance/pages/AttendanceDashboard'
import Timesheets from '../attendance/pages/Timesheets'
import ShiftManagement from '../attendance/pages/ShiftManagement'
import AttendanceReports from '../attendance/pages/AttendanceReports'
import { USER_ROLES } from '../../../types/authTypes'

export default function HRRoutes() {
  const hrRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.HR_MANAGER]
  const hrOpsRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.HR_MANAGER, USER_ROLES.OPERATIONS_MANAGER]
  const attendanceRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.HR_MANAGER, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR]
  const allStaffRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.HR_MANAGER, USER_ROLES.OPERATIONS_MANAGER, USER_ROLES.SUPERVISOR, USER_ROLES.CLEANER]

  return (
    <Routes>
      {/* ============================================ */}
      {/* HR MAIN DASHBOARD                            */}
      {/* ============================================ */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={hrOpsRoles}>
              <HRDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />

      {/* ============================================ */}
      {/* EMPLOYEE MANAGEMENT                          */}
      {/* ============================================ */}
      <Route
        path="/employees"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={hrRoles}>
              <EmployeeList />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/new"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={hrRoles}>
              <CreateEmployee />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:id"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={hrRoles}>
              <EmployeeDetail />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />

      {/* ============================================ */}
      {/* ATTENDANCE TRACKING                          */}
      {/* ============================================ */}
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allStaffRoles}>
              <AttendanceDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />

      {/* Timesheets */}
      <Route
        path="/attendance/timesheets"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={attendanceRoles}>
              <Timesheets />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />

      {/* Shifts */}
      <Route
        path="/attendance/shifts"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={attendanceRoles}>
              <ShiftManagement />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />

      {/* ✅ Reports - Now connected to AttendanceReports page */}
      <Route
        path="/attendance/reports"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={hrOpsRoles}>
              <AttendanceReports />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />

      {/* QR Code */}
      <Route
        path="/attendance/qr"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={[USER_ROLES.SUPER_ADMIN, USER_ROLES.HR_MANAGER, USER_ROLES.SUPERVISOR]}>
              <AttendanceDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />

      {/* Records */}
      <Route
        path="/attendance/records"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={attendanceRoles}>
              <AttendanceDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />

      {/* ============================================ */}
      {/* LEAVE MANAGEMENT                             */}
      {/* ============================================ */}
      <Route
        path="/leave"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allStaffRoles}>
              <LeaveManagement />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leave/new"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={allStaffRoles}>
              <LeaveManagement />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />

      {/* ============================================ */}
      {/* CONTRACT ROUTES                              */}
      {/* ============================================ */}
      <Route
        path="/contracts"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={hrRoles}>
              <HRDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracts/new"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={hrRoles}>
              <HRDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />

      {/* ============================================ */}
      {/* TRAINING ROUTES                              */}
      {/* ============================================ */}
      <Route
        path="/training"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={hrRoles}>
              <HRDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/training/new"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={hrRoles}>
              <HRDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />

      {/* ============================================ */}
      {/* DISCIPLINARY ROUTES                          */}
      {/* ============================================ */}
      <Route
        path="/disciplinary"
        element={
          <ProtectedRoute>
            <RoleBasedRoute requiredRoles={hrRoles}>
              <HRDashboard />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      />

      {/* ============================================ */}
      {/* REDIRECTS                                    */}
      {/* ============================================ */}
      <Route path="/jobs" element={<Navigate to="/operations" replace />} />
      <Route path="*" element={<Navigate to="/hr" replace />} />
    </Routes>
  )
}
