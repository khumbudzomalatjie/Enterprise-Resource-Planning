import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { Calendar, Plus, Clock } from 'lucide-react'

export default function LeaveManagement() {
  const { user } = useAuthStore()
  const { employee, leaveRequests, leaveTypes, leaveBalances, fetchLeaveRequests, fetchLeaveTypes, fetchLeaveBalances, applyLeave } = useMobileStore()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' })

  useEffect(() => {
    if (employee?.id) { fetchLeaveRequests(employee.id); fetchLeaveBalances(employee.id) }
    fetchLeaveTypes()
  }, [employee?.id])

  const handleApply = async () => {
    if (!form.leave_type_id || !form.start_date || !form.end_date) { toast.error('Fill all fields'); return }
    const days = Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / 86400000) + 1
    const result = await applyLeave({ ...form, employee_id: employee.id, total_days: days, status: 'pending' })
    result.error ? toast.error('Failed') : (toast.success('Leave applied!'), setShowForm(false), fetchLeaveRequests(employee.id))
  }

  return (
    <div className="min-h-screen bg-slate-100 font-['Inter'] pb-20">
      <div className="bg-blue-600 text-white px-5 pt-8 pb-5">
        <h1 className="text-2xl font-bold">Leave</h1>
        <p className="text-blue-100 text-sm">Balances & Requests</p>
      </div>

      {/* Balances */}
      <div className="px-5 mt-4">
        <h3 className="font-semibold text-slate-700 mb-2">Balances</h3>
        <div className="grid grid-cols-2 gap-2">
          {leaveBalances.map(b => (
            <div key={b.id} className="bg-white rounded-xl p-3 shadow-sm">
              <p className="text-xs text-slate-500">{b.leave_types?.name}</p>
              <p className="text-lg font-bold text-slate-800">{b.remaining_days || b.total_days} <span className="text-xs font-normal text-slate-500">days</span></p>
            </div>
          ))}
        </div>
      </div>

      {/* Apply Button */}
      <div className="px-5 mt-4">
        <button onClick={() => setShowForm(true)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> Apply for Leave</button>
      </div>

      {/* Leave History */}
      <div className="px-5 mt-4">
        <h3 className="font-semibold text-slate-700 mb-2">History</h3>
        {leaveRequests.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No leave requests</p>}
        {leaveRequests.map(lr => (
          <div key={lr.id} className="bg-white rounded-xl p-3 shadow-sm mb-2">
            <div className="flex justify-between">
              <p className="font-medium text-sm">{lr.leave_types?.name}</p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${lr.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : lr.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{lr.status}</span>
            </div>
            <p className="text-xs text-slate-500">{lr.start_date} → {lr.end_date} · {lr.total_days} days</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-t-3xl p-5 w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3">Apply Leave</h3>
            <select value={form.leave_type_id} onChange={e => setForm({...form, leave_type_id: e.target.value})} className="w-full p-2 border rounded-lg mb-2 text-sm">
              <option value="">Select type</option>
              {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.days_per_year} days/yr)</option>)}
            </select>
            <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full p-2 border rounded-lg mb-2 text-sm" />
            <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full p-2 border rounded-lg mb-2 text-sm" />
            <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Reason" rows={2} className="w-full p-2 border rounded-lg mb-3 text-sm" />
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 bg-slate-200 rounded-xl font-bold">Cancel</button>
              <button onClick={handleApply} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Submit</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="leave" />
    </div>
  )
}
