import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import TrackerDashboard from '../pages/TrackerDashboard'

export default function TrackerRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><TrackerDashboard /></ProtectedRoute>} />
    </Routes>
  )
}
