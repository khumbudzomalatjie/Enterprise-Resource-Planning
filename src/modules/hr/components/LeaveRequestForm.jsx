import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'

export default function LeaveRequestForm({ employeeId, onSuccess }) {
  const [form, setForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const leaveTypes = [
    'Annual Leave',
    'Sick Leave',
    'Family Responsibility',
    'Maternity Leave',
    'Study Leave',
    'Unpaid Leave'
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.leave_type_id || !form.start_date || !form.end_date) {
      toast.error('Please fill in all required fields')
      return
    }

    const start = new Date(form.start_date)
    const end = new Date(form.end_date)
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1

    setSubmitting(true)
    const { error } = await supabase
      .from('leave_requests')
      .insert([{
        employee_id: employeeId,
        leave_type_id: form.leave_type_id,   // TEXT – name of leave type
        start_date: form.start_date,
        end_date: form.end_date,
        total_days: diffDays,
        reason: form.reason,
        status: 'pending'
      }])

    if (error) {
      toast.error(error.message)
      console.error(error)
    } else {
      toast.success('Leave request submitted!')
      setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
      if (onSuccess) onSuccess()
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white dark:bg-slate-700 rounded-xl border border-[#b8ccdc] mt-4">
      <h4 className="font-semibold text-sm">📝 Apply for Leave</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500">Leave Type *</label>
          <select
            value={form.leave_type_id}
            onChange={(e) => setForm({...form, leave_type_id: e.target.value})}
            className="w-full p-2 neu-inset rounded-lg text-sm"
            required
          >
            <option value="">Select type</option>
            {leaveTypes.map(lt => (
              <option key={lt} value={lt}>{lt}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Start Date *</label>
          <input type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} className="w-full p-2 neu-inset rounded-lg text-sm" required />
        </div>
        <div>
          <label className="text-xs text-slate-500">End Date *</label>
          <input type="date" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} className="w-full p-2 neu-inset rounded-lg text-sm" required />
        </div>
        <div>
          <label className="text-xs text-slate-500">Reason (optional)</label>
          <input type="text" value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} className="w-full p-2 neu-inset rounded-lg text-sm" />
        </div>
      </div>
      <button type="submit" disabled={submitting}
        className="neo-btn h-8 px-4 rounded-md bg-gradient-to-b from-[#4f8fd0] to-[#2d5f98] text-white font-bold text-sm">
        {submitting ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  )
}
