import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../../components/ProtectedRoute'
import IncidentDashboard from '../pages/IncidentDashboard'
import ReportIncident from '../pages/ReportIncident'

export default function IncidentRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><IncidentDashboard /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><ReportIncident /></ProtectedRoute>} />
      <Route path="/list" element={<ProtectedRoute><IncidentDashboard /></ProtectedRoute>} />
      <Route path="/:id" element={<ProtectedRoute><IncidentDashboard /></ProtectedRoute>} />
    </Routes>
  )
}
