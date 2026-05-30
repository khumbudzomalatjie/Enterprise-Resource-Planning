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
    // Exact match for home
    if (currentPath === '/mobile' || currentPath === '/mobile/') return 'home'
    if (currentPath.startsWith('/mobile/jobs')) return 'jobs'
    if (currentPath.startsWith('/mobile/clock')) return 'clock'
    if (currentPath.startsWith('/mobile/photos')) return 'photos'
    if (currentPath.startsWith('/mobile/profile')) return 'profile'
    return 'home'
  }

  const currentActive = getActiveTab()

  const handleNavigation = (path) => {
    console.log('Navigating to:', path, 'Current:', currentPath)
    if (path === currentPath) {
      // Already on this page - force refresh
      window.location.reload()
    } else {
      navigate(path)
    }
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50" 
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
            onTouchEnd={(e) => {
              e.preventDefault()
              handleNavigation(item.path)
            }}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[60px] cursor-pointer select-none ${
              currentActive === item.id 
                ? 'text-emerald-600' 
                : 'text-slate-400 hover:text-slate-600 active:scale-95'
            }`}
            type="button"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
