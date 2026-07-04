import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import MobileDashboard from '../pages/MobileDashboard'
import MyJobs from '../pages/MyJobs'
import JobDetail from '../pages/JobDetail'

export default function MobileRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><MobileDashboard /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><MyJobs /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
      <Route path="*" element={<ProtectedRoute><MobileDashboard /></ProtectedRoute>} />
    </Routes>
  )
}
