import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../../components/Navbar'
import useAttendanceStore from '../store/attendanceStore'
import useHRStore from '../../store/hrStore'
import useThemeStore from '../../../../store/themeStore'
import toast from 'react-hot-toast'
import { Calendar, Clock, Users, Plus, ChevronRight, Sun, Moon, Sparkles } from 'lucide-react'

export default function ShiftManagement() {
  const { shiftTypes, employeeShifts, fetchShiftTypes, fetchEmployeeShifts, assignShift, loading } = useAttendanceStore()
  const { employees, fetchEmployees } = useHRStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedShift, setSelectedShift] = useState('')

  useEffect(() => {
    fetchShiftTypes()
    fetchEmployees()
    loadShifts()
  }, [selectedDate])

  const loadShifts = async () => {
    await fetchEmployeeShifts({ date_from: selectedDate, date_to: selectedDate })
  }

  const handleAssignShift = async () => {
    if (!selectedEmployee || !selectedShift) {
      toast.error('Please select employee and shift')
      return
    }
    const result = await assignShift({
      employee_id: selectedEmployee,
      shift_type_id: selectedShift,
      shift_date: selectedDate,
      status: 'scheduled'
    })
    if (result.success) {
      toast.success('Shift assigned successfully!')
      loadShifts()
    } else {
      toast.error('Failed to assign shift')
    }
  }

  const formatTime = (time) => {
    if (!time) return ''
    return time.slice(0, 5)
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><Calendar className="w-8 h-8 text-emerald-600" />Shift Management</h1>
          <p className="text-slate-500 mt-1">Assign and manage employee shifts</p>
        </motion.div>

        {/* Assign Shift */}
        <div className="neu-raised rounded-3xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-600" />Assign Shift</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
              <option value="">Select Employee</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>)}
            </select>
            <select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)} className="p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
              <option value="">Select Shift</option>
              {shiftTypes.map(st => <option key={st.id} value={st.id}>{st.name} ({formatTime(st.start_time)}-{formatTime(st.end_time)})</option>)}
            </select>
            <button onClick={handleAssignShift} className="neu-raised neu-btn py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">Assign Shift</button>
          </div>
        </div>

        {/* Shifts for selected date */}
        <div className="neu-raised rounded-3xl p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Shifts for {new Date(selectedDate).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employeeShifts.map(shift => (
              <div key={shift.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{shift.employees?.first_name} {shift.employees?.last_name}</p>
                    <p className="text-xs text-slate-500">{shift.employees?.employee_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(shift.shift_types?.start_time)} - {formatTime(shift.shift_types?.end_time)}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full text-xs" style={{ backgroundColor: shift.shift_types?.color + '20', color: shift.shift_types?.color }}>{shift.shift_types?.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${shift.status === 'checked_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{shift.status}</span>
                </div>
              </div>
            ))}
          </div>
          {employeeShifts.length === 0 && <p className="text-center text-slate-500 py-8">No shifts assigned for this date</p>}
        </div>
      </main>
    </div>
  )
}
