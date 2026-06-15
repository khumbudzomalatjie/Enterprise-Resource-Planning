import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import ReportsDashboard from '../pages/ReportsDashboard'
import SalesReports from '../pages/SalesReports'
import OperationsReports from '../pages/OperationsReports'
import FinancialReports from '../pages/FinancialReports'
import HRReports from '../pages/HRReports'
import FleetReports from '../pages/FleetReports'
import KPIPerformance from '../pages/KPIPerformance'

export default function ReportsRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><ReportsDashboard /></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute><SalesReports /></ProtectedRoute>} />
      <Route path="/operations" element={<ProtectedRoute><OperationsReports /></ProtectedRoute>} />
      <Route path="/financial" element={<ProtectedRoute><FinancialReports /></ProtectedRoute>} />
      <Route path="/hr" element={<ProtectedRoute><HRReports /></ProtectedRoute>} />
      <Route path="/fleet" element={<ProtectedRoute><FleetReports /></ProtectedRoute>} />
      <Route path="/kpi" element={<ProtectedRoute><KPIPerformance /></ProtectedRoute>} />
    </Routes>
  )
}
