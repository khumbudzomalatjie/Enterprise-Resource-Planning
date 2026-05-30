import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import MobileHome from '../pages/MobileHome'
import MyJobs from '../pages/MyJobs'
import ClockInOut from '../pages/ClockInOut'
import PhotoUpload from '../pages/PhotoUpload'
import SuppliesRequest from '../pages/SuppliesRequest'
import MyProfile from '../pages/MyProfile'
import FieldDashboard from '../pages/FieldDashboard'
import ActiveCleaners from '../pages/ActiveCleaners'
import JobPhotos from '../pages/JobPhotos'
import LiveMap from '../pages/LiveMap'
import IncidentReports from '../pages/IncidentReports'
import SupplyOrders from '../pages/SupplyOrders'

export default function MobileRoutes() {
  return (
    <Routes>
      {/* Cleaner Mobile Routes - Order matters! Specific routes first */}
      <Route path="/jobs" element={<ProtectedRoute><MyJobs /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute><MyJobs /></ProtectedRoute>} />
      <Route path="/clock" element={<ProtectedRoute><ClockInOut /></ProtectedRoute>} />
      <Route path="/photos" element={<ProtectedRoute><PhotoUpload /></ProtectedRoute>} />
      <Route path="/supplies" element={<ProtectedRoute><SuppliesRequest /></ProtectedRoute>} />
      <Route path="/incident" element={<ProtectedRoute><SuppliesRequest /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />

      {/* Manager Field Operations Routes */}
      <Route path="/field" element={<ProtectedRoute><FieldDashboard /></ProtectedRoute>} />
      <Route path="/field/cleaners" element={<ProtectedRoute><ActiveCleaners /></ProtectedRoute>} />
      <Route path="/field/photos" element={<ProtectedRoute><JobPhotos /></ProtectedRoute>} />
      <Route path="/field/incidents" element={<ProtectedRoute><IncidentReports /></ProtectedRoute>} />
      <Route path="/field/supplies" element={<ProtectedRoute><SupplyOrders /></ProtectedRoute>} />
      <Route path="/field/map" element={<ProtectedRoute><LiveMap /></ProtectedRoute>} />

      {/* Home route - MUST be last to not override other routes */}
      <Route path="/" element={<ProtectedRoute><MobileHome /></ProtectedRoute>} />
      
      {/* Catch-all redirect to home */}
      <Route path="*" element={<Navigate to="/mobile" replace />} />
    </Routes>
  )
}
