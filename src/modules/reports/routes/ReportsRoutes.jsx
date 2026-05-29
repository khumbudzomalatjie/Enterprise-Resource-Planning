import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import ReportsDashboard from '../pages/ReportsDashboard'

export default function ReportsRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><ReportsDashboard /></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute><ReportsDashboard /></ProtectedRoute>} />
      <Route path="/operations" element={<ProtectedRoute><ReportsDashboard /></ProtectedRoute>} />
      <Route path="/financial" element={<ProtectedRoute><ReportsDashboard /></ProtectedRoute>} />
      <Route path="/hr" element={<ProtectedRoute><ReportsDashboard /></ProtectedRoute>} />
      <Route path="/fleet" element={<ProtectedRoute><ReportsDashboard /></ProtectedRoute>} />
    </Routes>
  )
}
