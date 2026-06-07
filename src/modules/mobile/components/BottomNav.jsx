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

  const currentPath = location.pathname
  const getActiveTab = () => {
    if (active) return active
    if (currentPath === '/mobile' || currentPath === '/mobile/') return 'home'
    if (currentPath.includes('/mobile/jobs')) return 'jobs'
    if (currentPath.includes('/mobile/clock')) return 'clock'
    if (currentPath.includes('/mobile/photos')) return 'photos'
    if (currentPath.includes('/mobile/profile')) return 'profile'
    return 'home'
  }

  const currentActive = getActiveTab()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[60px] ${
              currentActive === item.id ? 'text-emerald-600 scale-110' : 'text-slate-400 hover:text-slate-600 active:scale-95'
            }`}
          >
            <item.icon className={`w-6 h-6 ${currentActive === item.id ? 'fill-emerald-100' : ''}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
