import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import MessagesDashboard from '../pages/MessagesDashboard'

export default function MessagesRoutes() {
  return (
    <Routes>
      <Route path="/" element={
        <ProtectedRoute><MessagesDashboard /></ProtectedRoute>
      } />
      <Route path="/:conversationId" element={
        <ProtectedRoute><MessagesDashboard /></ProtectedRoute>
      } />
    </Routes>
  )
}
