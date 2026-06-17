import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useAuthStore from '../../../store/authStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import {
  Calendar, Clock, CheckCircle2, XCircle, Plus,
  ArrowLeft, Sun, Moon, Sparkles, Send, TrendingUp
} from 'lucide-react'

export default function LeaveManagement() {
  const { isDark, toggleTheme } = useThemeStore()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('my-leave')
  const [leaveBalances, setLeaveBalances] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [leaveTypes, setLeaveTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [applyForm, setApplyForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
  const [calculatedDays, setCalculatedDays] = useState(0)

  useEffect(() => { loadAllData() }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const { data: employee } = await supabase.from('employees').select('id').eq('user_id', user?.id).single()
      const employeeId = employee?.id
      const { data: types } = await supabase.from('leave_types').select('*').eq('is_active', true).order('display_order')
      setLeaveTypes(types || [])
      if (employeeId) {
        const { data: balances } = await supabase.from('employee_leave_balances').select('*, leave_types(name, code, color, days_allowed)').eq('employee_id', employeeId)
        setLeaveBalances(balances || [])
        const { data: requests } = await supabase.from('leave_requests').select('*, leave_types(name, code, color)').eq('employee_id', employeeId).order('created_at', { ascending: false })
        setLeaveRequests(requests || [])
        if (['super_admin', 'hr_manager', 'operations_manager'].includes(profile?.role)) {
          const { data: pending } = await supabase.from('leave_requests').select('*, leave_types(name, code, color), employees(first_name, last_name, employee_code)').eq('status', 'pending').order('submitted_at', { ascending: false })
          setPendingApprovals(pending || [])
        }
      }
    } catch (error) { console.error('Error:', error) }
    setLoading(false)
  }

  useEffect(() => {
    if (applyForm.start_date && applyForm.end_date) {
      let days = 0
      const start = new Date(applyForm.start_date)
      const end = new Date(applyForm.end_date)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) days++
      }
      setCalculatedDays(days)
    }
  }, [applyForm.start_date, applyForm.end_date])

  const handleApplyLeave = async (e) => {
    e.preventDefault()
    if (!applyForm.leave_type_id || !applyForm.start_date || !applyForm.end_date) { toast.error('Fill all fields'); return }
    setSubmitting(true)
    try {
      const { data: employee } = await supabase.from('employees').select('id').eq('user_id', user?.id).single()
      const { error } = await supabase.from('leave_requests').insert([{ employee_id: employee.id, leave_type_id: applyForm.leave_type_id, start_date: applyForm.start_date, end_date: applyForm.end_date, total_days: calculatedDays, reason: applyForm.reason, status: 'pending' }])
      if (error) throw error
      toast.success('Leave request submitted! 🎉')
      setShowApplyForm(false)
      setApplyForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' })
      loadAllData()
    } catch (error) { toast.error('Failed: ' + error.message) }
    setSubmitting(false)
  }

  const handleApprove = async (id) => {
    await supabase.from('leave_requests').update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() }).eq('id', id)
    toast.success('Approved!')
    loadAllData()
  }

  const handleReject = async (id) => {
    const reason = prompt('Reason:')
    if (!reason) return
    await supabase.from('leave_requests').update({ status: 'rejected', rejection_reason: reason }).eq('id', id)
    toast.success('Rejected')
    loadAllData()
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
  const getBadge = (s) => ({ pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' }[s] || 'bg-slate-100')
  const isHR = ['super_admin', 'hr_manager'].includes(profile?.role)

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">{isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}</button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/hr" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6"><ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to HR</span></Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
          <div><h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><Calendar className="w-8 h-8 text-emerald-600" />Leave Management</h1><p className="text-slate-500 mt-1">SA BCEA Compliant Leave System</p></div>
          <button onClick={() => setShowApplyForm(!showApplyForm)} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-medium flex items-center gap-2 hover:bg-emerald-700"><Plus className="w-5 h-5" /> Apply Leave</button>
        </motion.div>

        {/* TABS */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[{ id: 'my-leave', label: 'My Leave', icon: Calendar },{ id: 'balances', label: 'Balances', icon: TrendingUp },{ id: 'history', label: 'History', icon: Clock },...(isHR ? [{ id: 'approvals', label: `Approvals (${pendingApprovals.length})`, icon: CheckCircle2 }] : [])].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${activeTab === tab.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
          ))}
        </div>

        {/* APPLY FORM */}
        {showApplyForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-3xl p-6 mb-6 border-2 border-emerald-200">
            <h2 className="text-lg font-bold mb-4">Apply for Leave</h2>
            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm text-slate-500">Leave Type *</label><select value={applyForm.leave_type_id} onChange={e => setApplyForm({...applyForm, leave_type_id: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" required><option value="">Select...</option>{leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} ({lt.days_allowed} days)</option>)}</select></div>
                <div><label className="text-sm text-slate-500">Reason</label><input type="text" value={applyForm.reason} onChange={e => setApplyForm({...applyForm, reason: e.target.value})} placeholder="Reason..." className="w-full p-3 neu-inset rounded-xl mt-1" /></div>
                <div><label className="text-sm text-slate-500">Start Date *</label><input type="date" value={applyForm.start_date} onChange={e => setApplyForm({...applyForm, start_date: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" required /></div>
                <div><label className="text-sm text-slate-500">End Date *</label><input type="date" value={applyForm.end_date} onChange={e => setApplyForm({...applyForm, end_date: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" required /></div>
              </div>
              {calculatedDays > 0 && <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center"><p className="text-blue-700 font-semibold">{calculatedDays} working day{calculatedDays > 1 ? 's' : ''}</p></div>}
              <div className="flex gap-3 justify-end"><button type="button" onClick={() => setShowApplyForm(false)} className="px-4 py-2 bg-slate-200 rounded-xl">Cancel</button><button type="submit" disabled={submitting} className="px-6 py-2 bg-emerald-600 text-white rounded-xl flex items-center gap-2 disabled:opacity-50">{submitting ? 'Submitting...' : <><Send className="w-4 h-4" />Submit</>}</button></div>
            </form>
          </motion.div>
        )}

        {/* MY LEAVE */}
        {activeTab === 'my-leave' && (
          <div className="neu-raised rounded-3xl p-6"><h2 className="text-lg font-bold mb-4">My Leave Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {leaveBalances.slice(0, 8).map(b => (
                <div key={b.id} className="rounded-xl p-4 text-center border" style={{ borderColor: b.leave_types?.color || '#10b981' }}>
                  <p className="text-xs text-slate-500">{b.leave_types?.name}</p>
                  <div className="w-full h-2 bg-slate-200 rounded-full mt-2 mb-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${b.allocated_days > 0 ? (b.used_days / b.allocated_days) * 100 : 0}%`, backgroundColor: b.leave_types?.color || '#10b981' }}></div></div>
                  <p className="text-2xl font-bold mt-1" style={{ color: b.leave_types?.color }}>{b.remaining_days || 0}</p>
                  <p className="text-[10px] text-slate-400">of {b.allocated_days} days</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BALANCES */}
        {activeTab === 'balances' && (
          <div className="neu-raised rounded-3xl p-6"><h2 className="text-lg font-bold mb-4">Leave Balances</h2>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-slate-50"><th className="text-left py-3 px-4">Leave Type</th><th className="text-right py-3 px-4">Allocated</th><th className="text-right py-3 px-4">Used</th><th className="text-right py-3 px-4">Pending</th><th className="text-right py-3 px-4">Remaining</th><th className="text-left py-3 px-4">Cycle</th></tr></thead>
              <tbody>{leaveBalances.map(b => (
                <tr key={b.id} className="border-b"><td className="py-3 px-4"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.leave_types?.color }}></span><span className="font-medium">{b.leave_types?.name}</span></div></td><td className="py-3 px-4 text-right">{b.allocated_days}</td><td className="py-3 px-4 text-right text-red-600">{b.used_days}</td><td className="py-3 px-4 text-right text-amber-600">{b.pending_days}</td><td className="py-3 px-4 text-right font-bold text-emerald-600">{b.remaining_days}</td><td className="py-3 px-4 text-xs">{formatDate(b.cycle_start)} - {formatDate(b.cycle_end)}</td></tr>
              ))}</tbody></table></div>
          </div>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <div className="neu-raised rounded-3xl p-6"><div className="flex justify-between mb-4"><h2 className="text-lg font-bold">Leave History</h2><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 neu-inset rounded-lg text-sm"><option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-slate-50"><th className="text-left py-3 px-4">Type</th><th className="text-left py-3 px-4">Dates</th><th className="text-right py-3 px-4">Days</th><th className="text-left py-3 px-4">Reason</th><th className="text-center py-3 px-4">Status</th><th className="text-left py-3 px-4">Submitted</th></tr></thead>
              <tbody>{leaveRequests.filter(lr => statusFilter === 'all' || lr.status === statusFilter).map(lr => (
                <tr key={lr.id} className="border-b"><td className="py-3 px-4"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: lr.leave_types?.color }}></span><span>{lr.leave_types?.name}</span></div></td><td className="py-3 px-4 text-xs">{formatDate(lr.start_date)} - {formatDate(lr.end_date)}</td><td className="py-3 px-4 text-right font-semibold">{lr.total_days}</td><td className="py-3 px-4 text-xs max-w-[200px] truncate">{lr.reason || '-'}</td><td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded-full text-xs ${getBadge(lr.status)}`}>{lr.status}</span></td><td className="py-3 px-4 text-xs">{formatDate(lr.submitted_at)}</td></tr>
              ))}</tbody></table></div>
          </div>
        )}

        {/* APPROVALS */}
        {activeTab === 'approvals' && isHR && (
          <div className="neu-raised rounded-3xl p-6"><h2 className="text-lg font-bold mb-4">Pending Approvals ({pendingApprovals.length})</h2>
            {pendingApprovals.length > 0 ? <div className="space-y-3">{pendingApprovals.map(req => (
              <div key={req.id} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: req.leave_types?.color }}></span><span className="font-semibold">{req.employees?.first_name} {req.employees?.last_name}</span><span className="text-xs text-slate-500">{req.employees?.employee_code}</span></div><p className="text-sm mt-1">{req.leave_types?.name}: {formatDate(req.start_date)} - {formatDate(req.end_date)} ({req.total_days} days)</p>{req.reason && <p className="text-xs text-slate-500 mt-1">Reason: {req.reason}</p>}</div>
                  <div className="flex gap-2"><button onClick={() => handleApprove(req.id)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm hover:bg-emerald-700"><CheckCircle2 className="w-4 h-4 inline mr-1" />Approve</button><button onClick={() => handleReject(req.id)} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700"><XCircle className="w-4 h-4 inline mr-1" />Reject</button></div>
                </div>
              </div>
            ))}</div> : <div className="text-center py-12 text-slate-400"><CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" /><p>No pending requests</p></div>}
          </div>
        )}
      </main>
    </div>
  )
}
