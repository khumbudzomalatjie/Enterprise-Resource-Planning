import { Routes, Route } from 'react-router-dom'
import TenderDashboard from '../pages/TenderDashboard'
import CreateTender from '../pages/CreateTender'
import TenderDetails from '../pages/TenderDetails'

export default function TenderRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TenderDashboard />} />
      <Route path="/new" element={<CreateTender />} />
      <Route path="/:id" element={<TenderDetails />} />
    </Routes>
  )
}
