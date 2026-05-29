import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Briefcase, Clock, Camera, User } from 'lucide-react'

export default function BottomNav({ active }) {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', path: '/mobile' },
    { id: 'jobs', icon: Briefcase, label: 'Jobs', path: '/mobile/jobs' },
    { id: 'clock', icon: Clock, label: 'Clock', path: '/mobile/clock' },
    { id: 'photos', icon: Camera, label: 'Photos', path: '/mobile/photos' },
    { id: 'profile', icon: User, label: 'Profile', path: '/mobile/profile' },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${
              active === item.id ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
