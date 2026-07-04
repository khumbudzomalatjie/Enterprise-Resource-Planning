import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Briefcase, MessageCircle, Calendar, User } from 'lucide-react'

export default function BottomNav({ active }) {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { id: 'home', icon: Home, label: 'Home', path: '/mobile' },
    { id: 'jobs', icon: Briefcase, label: 'Jobs', path: '/mobile/jobs' },
    { id: 'messages', icon: MessageCircle, label: 'Messages', path: '/mobile/messages' },
    { id: 'leave', icon: Calendar, label: 'Leave', path: '/mobile/leave' },
    { id: 'profile', icon: User, label: 'Profile', path: '/mobile/profile' },
  ]

  const currentTab = active || tabs.find(t => location.pathname.startsWith(t.path))?.id || 'home'

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              currentTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon className={`w-5 h-5 mb-1 ${currentTab === tab.id ? 'text-blue-600' : ''}`} />
            <span className={`text-[10px] font-medium ${currentTab === tab.id ? 'text-blue-600' : ''}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
