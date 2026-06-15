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
      {/* Main Reports Dashboard */}
      <Route path="/" element={
        <ProtectedRoute>
          <ReportsDashboard />
        </ProtectedRoute>
      } />
      
      {/* Sales Report */}
      <Route path="/sales" element={
        <ProtectedRoute>
          <SalesReports />
        </ProtectedRoute>
      } />
      
      {/* Operations Report */}
      <Route path="/operations" element={
        <ProtectedRoute>
          <OperationsReports />
        </ProtectedRoute>
      } />
      
      {/* Financial Report */}
      <Route path="/financial" element={
        <ProtectedRoute>
          <FinancialReports />
        </ProtectedRoute>
      } />
      
      {/* HR Report */}
      <Route path="/hr" element={
        <ProtectedRoute>
          <HRReports />
        </ProtectedRoute>
      } />
      
      {/* Fleet Report */}
      <Route path="/fleet" element={
        <ProtectedRoute>
          <FleetReports />
        </ProtectedRoute>
      } />
      
      {/* KPI Performance - Individual & Group */}
      <Route path="/kpi" element={
        <ProtectedRoute>
          <KPIPerformance />
        </ProtectedRoute>
      } />
    </Routes>
  )
}
