import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Briefcase, Calendar, MessageCircle, User } from 'lucide-react'

export default function BottomNav({ active, onNavigate }) {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Home', path: '/mobile' },
    { id: 'jobs', icon: Briefcase, label: 'Jobs', path: '/mobile/jobs' },
    { id: 'schedule', icon: Calendar, label: 'Schedule', path: '/mobile/schedule' },
    { id: 'messages', icon: MessageCircle, label: 'Messages', path: '/mobile/messages' },
    { id: 'profile', icon: User, label: 'Profile', path: '/mobile/profile' },
  ]

  const currentPath = location.pathname
  const getActiveTab = () => {
    if (active) return active
    if (currentPath === '/mobile' || currentPath === '/mobile/') return 'dashboard'
    if (currentPath.includes('/mobile/jobs')) return 'jobs'
    if (currentPath.includes('/mobile/schedule')) return 'schedule'
    if (currentPath.includes('/mobile/messages')) return 'messages'
    if (currentPath.includes('/mobile/profile')) return 'profile'
    return 'dashboard'
  }

  const currentActive = getActiveTab()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#e9edf2] px-3 pb-3 pt-2 rounded-t-[36px] shadow-[0_-8px_18px_rgba(0,0,0,0.05),0_-4px_8px_#bcc3cf] z-50">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {navItems.map(item => (
          <button key={item.id} onClick={() => onNavigate ? onNavigate(item.id) : navigate(item.path)}
            className="flex flex-col items-center gap-1">
            <div className={`p-2 rounded-[18px] shadow-[3px_3px_6px_#bcc3cf,-3px_-3px_6px_#ffffff] transition-all ${
              currentActive === item.id ? 'bg-[#5f7d9c] text-white shadow-[inset_2px_2px_5px_#3e5268,inset_-2px_-2px_5px_#7a94ae]' : 'bg-[#eef1f6] text-[#5e6f82]'
            }`}>
              <item.icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-[#5e6f82]">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
