import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import RoleBasedRoute from '../../../components/RoleBasedRoute'
import PayrollDashboard from '../pages/PayrollDashboard'
import EmployeePayrollList from '../pages/EmployeePayrollList'
import PayslipList from '../pages/PayslipList'
import PayslipView from '../pages/PayslipView'
import PayrollRun from '../pages/PayrollRun'
import { USER_ROLES } from '../../../types/authTypes'

export default function PayrollRoutes() {
  const allowedRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_OFFICER, USER_ROLES.HR_MANAGER]

  return (
    <Routes>
      {/* Dashboard */}
      <Route path="/" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayrollDashboard /></RoleBasedRoute></ProtectedRoute>} />
      
      {/* Employee Payroll Profiles */}
      <Route path="/employees" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><EmployeePayrollList /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/employees/:id" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayrollDashboard /></RoleBasedRoute></ProtectedRoute>} />
      
      {/* Payslips */}
      <Route path="/payslips" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayslipList /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/payslips/:id" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayslipView /></RoleBasedRoute></ProtectedRoute>} />
      
      {/* Payroll Run */}
      <Route path="/run" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayrollRun /></RoleBasedRoute></ProtectedRoute>} />
      <Route path="/run/new" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayrollRun /></RoleBasedRoute></ProtectedRoute>} />
      
      {/* Reports */}
      <Route path="/reports" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayrollDashboard /></RoleBasedRoute></ProtectedRoute>} />
      
      {/* Settings */}
      <Route path="/settings" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayrollDashboard /></RoleBasedRoute></ProtectedRoute>} />
      
      {/* Audit */}
      <Route path="/audit" element={<ProtectedRoute><RoleBasedRoute requiredRoles={allowedRoles}><PayrollDashboard /></RoleBasedRoute></ProtectedRoute>} />
    </Routes>
  )
}
