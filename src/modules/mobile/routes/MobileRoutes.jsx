import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import MobileDashboard from '../pages/MobileDashboard'
import MyJobs from '../pages/MyJobs'
import JobDetail from '../pages/JobDetail'
import ClockInOut from '../pages/ClockInOut'
import LeaveManagement from '../pages/LeaveManagement'
import Messages from '../pages/Messages'
import Notifications from '../pages/Notifications'

export default function MobileRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><MobileDashboard /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><MyJobs /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><ClockInOut /></ProtectedRoute>} />
      <Route path="/leave" element={<ProtectedRoute><LeaveManagement /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
    </Routes>
  )
}
