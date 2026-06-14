import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import PayrollDashboard from '../pages/PayrollDashboard'
import EmployeePayrollList from '../pages/EmployeePayrollList'
import EmployeePayrollDetail from '../pages/EmployeePayrollDetail'
import PayslipList from '../pages/PayslipList'
import PayslipView from '../pages/PayslipView'
import PayrollRun from '../pages/PayrollRun'
import PayrollReports from '../pages/PayrollReports'
import PayrollSettings from '../pages/PayrollSettings'
import PayrollAudit from '../pages/PayrollAudit'
import { USER_ROLES } from '../../../types/authTypes'

export default function PayrollRoutes() {
  const allowedRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_OFFICER, USER_ROLES.HR_MANAGER]

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayrollDashboard /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/employees" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><EmployeePayrollList /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/employees/:id" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><EmployeePayrollDetail /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/payslips" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayslipList /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/payslips/:id" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayslipView /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/run" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayrollRun /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/run/new" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayrollRun /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayrollReports /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayrollSettings /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayrollAudit /></RoleBasedRoute></ProtectedRoute>} />
    </Routes>
  )
}
