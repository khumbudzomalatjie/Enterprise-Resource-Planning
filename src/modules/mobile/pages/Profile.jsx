import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import { User, Mail, Phone, MapPin, Briefcase, LogOut, Clock, Shield } from 'lucide-react'

export default function Profile() {
  const { user, signOut } = useAuthStore()
  const { employee, auditLog, fetchAuditLog, init } = useMobileStore()
  const navigate = useNavigate()

  useEffect(() => { if (employee?.id) fetchAuditLog(employee.id) }, [employee?.id])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-100 font-['Inter'] pb-20">
      <div className="bg-blue-600 text-white px-5 pt-8 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {employee?.first_name?.[0]}{employee?.last_name?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold">{employee?.first_name} {employee?.last_name}</h1>
            <p className="text-blue-100 text-sm">{employee?.employee_code} · {employee?.position || 'Cleaner'}</p>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4">
        <div className="bg-white rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-slate-400" /><span>{employee?.email || user?.email}</span></div>
          <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-slate-400" /><span>{employee?.phone || 'N/A'}</span></div>
          <div className="flex items-center gap-3 text-sm"><MapPin className="w-4 h-4 text-slate-400" /><span>{employee?.city || 'N/A'}</span></div>
          <div className="flex items-center gap-3 text-sm"><Briefcase className="w-4 h-4 text-slate-400" /><span>{employee?.department || 'N/A'}</span></div>
        </div>
      </div>

      <div className="px-5 mt-4">
        <h3 className="font-semibold text-slate-700 mb-2">Recent Activity</h3>
        {auditLog.slice(0, 10).map(log => (
          <div key={log.id} className="bg-white rounded-xl p-3 shadow-sm mb-2 flex items-center gap-3">
            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-slate-700">{log.action_description}</p>
              <p className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 mt-4">
        <button onClick={handleLogout} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
          <LogOut className="w-5 h-5" /> Logout
        </button>
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
