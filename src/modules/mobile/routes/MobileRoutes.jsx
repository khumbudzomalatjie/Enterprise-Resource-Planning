import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import MobileDashboard from '../pages/MobileDashboard'
import JobDetail from '../pages/JobDetail'

// Import the existing MyJobs page
import MyJobs from '../pages/MyJobs'

export default function MobileRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><MobileDashboard /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><MyJobs /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
    </Routes>
  )
}
