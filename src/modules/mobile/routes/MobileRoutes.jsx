import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import MobileDashboard from '../pages/MobileDashboard'
import MyJobs from '../pages/MyJobs'
import JobDetail from '../pages/JobDetail'
import Messages from '../pages/Messages'
import LeaveManagement from '../pages/LeaveManagement'
import Profile from '../pages/Profile'

export default function MobileRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><MobileDashboard /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><MyJobs /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/leave" element={<ProtectedRoute><LeaveManagement /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<ProtectedRoute><MobileDashboard /></ProtectedRoute>} />
    </Routes>
  )
}
