import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import FieldOpsDashboard from '../pages/FieldOpsDashboard'
import MessagesDashboard from '../messages/pages/MessagesDashboard'

export default function FieldOpsRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><FieldOpsDashboard /></ProtectedRoute>} />
      <Route path="/messages" element={<ProtectedRoute><MessagesDashboard /></ProtectedRoute>} />
      <Route path="/messages/:conversationId" element={<ProtectedRoute><MessagesDashboard /></ProtectedRoute>} />
    </Routes>
  )
}
