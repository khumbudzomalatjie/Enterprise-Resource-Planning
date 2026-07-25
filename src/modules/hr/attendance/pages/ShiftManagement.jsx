import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useAttendanceStore from '../store/attendanceStore'
import useThemeStore from '../../../../store/themeStore'
import toast from 'react-hot-toast'
import { supabase } from '../../../../lib/supabaseClient'
import { 
  Calendar, Users, Clock, Plus, Edit, Trash2, Search,
  ChevronRight, ArrowLeft, Sun, Moon, Sparkles,
  CheckCircle2, XCircle, Save, RotateCw, AlertTriangle
} from 'lucide-react'

export default function ShiftManagement() {
  const { shiftTemplates, shiftAssignments, fetchShiftTemplates, fetchShiftAssignments, createShiftTemplate, assignShift, loading } = useAttendanceStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [employees, setEmployees] = useState([])
  const [templateForm, setTemplateForm] = useState({ shift_name: '', start_time: '08:00', end_time: '17:00', break_duration_minutes: 60, color: '#10b981', department: '' })
  const [assignForm, setAssignForm] = useState({ employee_id: '', shift_template_id: '', effective_date: new Date().toISOString().split('T')[0], status: 'active' })

  useEffect(() => {
    fetchShiftTemplates()
    fetchShiftAssignments()
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    const { data } = await supabase.from('employees').select('id, first_name, last_name, department').eq('employment_status', 'active').order('first_name')
    setEmployees(data || [])
  }

  const handleCreateTemplate = async () => {
    if (!templateForm.shift_name) { toast.error('Shift name required'); return }
    await createShiftTemplate(templateForm)
    setShowTemplateModal(false)
    setTemplateForm({ shift_name: '', start_time: '08:00', end_time: '17:00', break_duration_minutes: 60, color: '#10b981', department: '' })
  }

  const handleAssignShift = async () => {
    if (!assignForm.employee_id || !assignForm.shift_template_id) { toast.error('Select employee and shift'); return }
    await assignShift(assignForm)
    setShowAssignModal(false)
  }

  const formatTime = (t) => t ? t.slice(0, 5) : '-'

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/hr/attendance" className="text-slate-500 hover:text-emerald-600">Attendance</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Shift Management</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><Calendar className="w-8 h-8 text-emerald-600" />Shift Management</h1>
            <p className="text-slate-500 mt-1">{shiftTemplates.length} templates · {shiftAssignments.length} assignments</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowTemplateModal(true)} className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"><Plus className="w-5 h-5" /> New Template</button>
            <button onClick={() => setShowAssignModal(true)} className="neu-raised neu-btn px-5 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"><Users className="w-5 h-5" /> Assign Shift</button>
          </div>
        </motion.div>

        {/* Templates */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Shift Templates</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {shiftTemplates.map(template => (
              <div key={template.id} className="neu-raised rounded-2xl p-4" style={{ borderLeft: `4px solid ${template.color}` }}>
                <h3 className="font-bold text-slate-800 dark:text-white">{template.shift_name}</h3>
                <p className="text-sm text-slate-500">{formatTime(template.start_time)} - {formatTime(template.end_time)}</p>
                <p className="text-xs text-slate-400">{template.working_hours?.toFixed(1)}h · {template.break_duration_minutes}min break</p>
                {template.is_night_shift && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 mt-1 inline-block">Night</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Assignments */}
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Current Assignments</h2>
          <div className="neu-raised rounded-3xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left py-3 px-4 text-xs text-slate-500">Employee</th>
                  <th className="text-left py-3 px-4 text-xs text-slate-500">Shift</th>
                  <th className="text-left py-3 px-4 text-xs text-slate-500 hidden md:table-cell">Time</th>
                  <th className="text-left py-3 px-4 text-xs text-slate-500">Effective</th>
                  <th className="text-left py-3 px-4 text-xs text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {shiftAssignments.map(a => (
                  <tr key={a.id} className="border-t border-slate-100 dark:border-slate-700/30">
                    <td className="py-3 px-4 font-medium">{a.employees?.first_name} {a.employees?.last_name}</td>
                    <td className="py-3 px-4">{a.shift_templates?.shift_name}</td>
                    <td className="py-3 px-4 text-xs hidden md:table-cell">{formatTime(a.shift_templates?.start_time)} - {formatTime(a.shift_templates?.end_time)}</td>
                    <td className="py-3 px-4 text-xs">{new Date(a.effective_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[10px] ${a.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Template Modal */}
        <AnimatePresence>
          {showTemplateModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTemplateModal(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">New Shift Template</h3>
                <div className="space-y-3">
                  <input type="text" value={templateForm.shift_name} onChange={e => setTemplateForm({...templateForm, shift_name: e.target.value})} placeholder="Shift Name" className="w-full p-3 neu-inset rounded-xl" />
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-slate-500">Start</label><input type="time" value={templateForm.start_time} onChange={e => setTemplateForm({...templateForm, start_time: e.target.value})} className="w-full p-2 neu-inset rounded-xl mt-1" /></div>
                    <div><label className="text-xs text-slate-500">End</label><input type="time" value={templateForm.end_time} onChange={e => setTemplateForm({...templateForm, end_time: e.target.value})} className="w-full p-2 neu-inset rounded-xl mt-1" /></div>
                  </div>
                  <div><label className="text-xs text-slate-500">Break (minutes)</label><input type="number" value={templateForm.break_duration_minutes} onChange={e => setTemplateForm({...templateForm, break_duration_minutes: parseInt(e.target.value)})} className="w-full p-2 neu-inset rounded-xl mt-1" /></div>
                  <div><label className="text-xs text-slate-500">Color</label><input type="color" value={templateForm.color} onChange={e => setTemplateForm({...templateForm, color: e.target.value})} className="w-full h-10 rounded-xl mt-1" /></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowTemplateModal(false)} className="flex-1 neu-raised neu-btn py-3 rounded-xl bg-slate-600 text-white">Cancel</button>
                  <button onClick={handleCreateTemplate} className="flex-1 neu-raised neu-btn py-3 rounded-xl bg-emerald-600 text-white flex items-center justify-center gap-1"><Save className="w-4 h-4" /> Save</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Assign Modal */}
        <AnimatePresence>
          {showAssignModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Assign Shift</h3>
                <div className="space-y-3">
                  <select value={assignForm.employee_id} onChange={e => setAssignForm({...assignForm, employee_id: e.target.value})} className="w-full p-3 neu-inset rounded-xl">
                    <option value="">Select Employee</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.department})</option>)}
                  </select>
                  <select value={assignForm.shift_template_id} onChange={e => setAssignForm({...assignForm, shift_template_id: e.target.value})} className="w-full p-3 neu-inset rounded-xl">
                    <option value="">Select Shift</option>
                    {shiftTemplates.map(s => <option key={s.id} value={s.id}>{s.shift_name} ({formatTime(s.start_time)}-{formatTime(s.end_time)})</option>)}
                  </select>
                  <input type="date" value={assignForm.effective_date} onChange={e => setAssignForm({...assignForm, effective_date: e.target.value})} className="w-full p-3 neu-inset rounded-xl" />
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setShowAssignModal(false)} className="flex-1 neu-raised neu-btn py-3 rounded-xl bg-slate-600 text-white">Cancel</button>
                  <button onClick={handleAssignShift} className="flex-1 neu-raised neu-btn py-3 rounded-xl bg-emerald-600 text-white flex items-center justify-center gap-1"><Users className="w-4 h-4" /> Assign</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
