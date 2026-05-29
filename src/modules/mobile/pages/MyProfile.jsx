import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import { User, Mail, Phone, MapPin, Briefcase, Shield, LogOut, ChevronRight } from 'lucide-react'

export default function MyProfile() {
  const { user, profile, signOut } = useAuthStore()
  const { myProfile, fetchMyProfile } = useMobileStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.id) fetchMyProfile(user.id)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 font-['Inter'] pb-20">
      <div className="bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 pt-8 pb-10 text-white">
        <h1 className="text-2xl font-bold mb-4">My Profile</h1>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xl font-bold">{myProfile?.first_name} {myProfile?.last_name}</p>
            <p className="text-emerald-100 text-sm capitalize">{profile?.role?.replace('_', ' ') || 'Cleaner'}</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-1">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {[
            { icon: Mail, label: 'Email', value: myProfile?.email || user?.email },
            { icon: Phone, label: 'Phone', value: myProfile?.phone || 'Not set' },
            { icon: MapPin, label: 'City', value: myProfile?.city || 'Not set' },
            { icon: Briefcase, label: 'Department', value: myProfile?.department || 'Not assigned' },
            { icon: Shield, label: 'Employee Code', value: myProfile?.employee_code || 'N/A' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-slate-400" />
                <span className="text-sm text-slate-500">{item.label}</span>
              </div>
              <span className="text-sm font-medium text-slate-700">{item.value}</span>
            </div>
          ))}
        </div>

        <button onClick={handleSignOut}
          className="w-full bg-white rounded-2xl p-4 mt-4 flex items-center justify-between shadow-sm hover:bg-red-50 transition-colors">
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-red-500" />
            <span className="text-red-500 font-medium">Sign Out</span>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <BottomNav active="profile" />
    </div>
  )
}
