import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import MobileHome from '../pages/MobileHome'
import MyJobs from '../pages/MyJobs'
import ClockInOut from '../pages/ClockInOut'
import PhotoUpload from '../pages/PhotoUpload'
import SuppliesRequest from '../pages/SuppliesRequest'
import MyProfile from '../pages/MyProfile'

export default function MobileRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><MobileHome /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><MyJobs /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute><MyJobs /></ProtectedRoute>} />
      <Route path="/clock" element={<ProtectedRoute><ClockInOut /></ProtectedRoute>} />
      <Route path="/photos" element={<ProtectedRoute><PhotoUpload /></ProtectedRoute>} />
      <Route path="/supplies" element={<ProtectedRoute><SuppliesRequest /></ProtectedRoute>} />
      <Route path="/incident" element={<ProtectedRoute><SuppliesRequest /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
    </Routes>
  )
}
