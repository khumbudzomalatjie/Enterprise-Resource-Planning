import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import FieldOpsDashboard from '../pages/FieldOpsDashboard'
import LiveJobs from '../pages/LiveJobs'
import Incidents from '../pages/Incidents'
import ReportIncident from '../pages/ReportIncident'
import JobTracker from '../pages/JobTracker'

export default function FieldOpsRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><FieldOpsDashboard /></ProtectedRoute>} />
      <Route path="/live-jobs" element={<ProtectedRoute><LiveJobs /></ProtectedRoute>} />
      <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
      <Route path="/incidents/new" element={<ProtectedRoute><ReportIncident /></ProtectedRoute>} />
      <Route path="/incidents/:id" element={<ProtectedRoute><ReportIncident /></ProtectedRoute>} />
      <Route path="/job-tracker" element={<ProtectedRoute><JobTracker /></ProtectedRoute>} />
    </Routes>
  )
}
