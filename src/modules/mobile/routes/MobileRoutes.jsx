import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../../../components/ProtectedRoute'
import MobileDashboard from '../pages/MobileDashboard'
import JobDetail from '../pages/JobDetail'

// Lazy load pages that may not exist yet
const MyJobs = () => {
  const { default: Component } = await import('../pages/MyJobs')
  return <Component />
}
const WrappedMyJobs = () => {
  const [Comp, setComp] = useState(null)
  useEffect(() => { import('../pages/MyJobs').then(m => setComp(() => m.default)) }, [])
  return Comp ? <Comp /> : <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div></div>
}

import { useState, useEffect } from 'react'

export default function MobileRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><MobileDashboard /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><WrappedMyJobs /></ProtectedRoute>} />
      <Route path="/jobs/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
    </Routes>
  )
}
