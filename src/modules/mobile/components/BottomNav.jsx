import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Briefcase, Clock, Camera, User } from 'lucide-react'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentPath = location.pathname

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', path: '/mobile' },
    { id: 'jobs', icon: Briefcase, label: 'Jobs', path: '/mobile/jobs' },
    { id: 'clock', icon: Clock, label: 'Clock', path: '/mobile/clock' },
    { id: 'photos', icon: Camera, label: 'Photos', path: '/mobile/photos' },
    { id: 'profile', icon: User, label: 'Profile', path: '/mobile/profile' },
  ]

  const isActive = (path) => {
    if (path === '/mobile') return currentPath === '/mobile' || currentPath === '/mobile/'
    return currentPath.startsWith(path)
  }

  const handleTap = (path) => {
    if (currentPath === path || (path === '/mobile' && (currentPath === '/mobile' || currentPath === '/mobile/'))) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate(path)
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleTap(item.path)}
            className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-all duration-200 active:scale-90 ${
              isActive(item.path) ? 'text-emerald-600' : 'text-slate-400'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className={`relative p-1 rounded-full transition-all ${isActive(item.path) ? 'bg-emerald-50' : ''}`}>
              <item.icon className="w-6 h-6" strokeWidth={isActive(item.path) ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-semibold">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
