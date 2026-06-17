import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import TrackerDashboard from '../pages/TrackerDashboard'
import JobTracker from '../pages/JobTracker'

export default function TrackerRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><TrackerDashboard /></ProtectedRoute>} />
      <Route path="/job" element={<ProtectedRoute><JobTracker /></ProtectedRoute>} />
    </Routes>
  )
}
