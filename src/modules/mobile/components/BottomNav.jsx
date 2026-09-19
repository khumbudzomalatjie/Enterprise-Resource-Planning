import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Briefcase, Camera, Package, User } from 'lucide-react'

export default function BottomNav({ active }) {
  const navigate = useNavigate()
  const location = useLocation()

  // ✅ Scan is now under Request Supplies
  // ✅ Photos tab replaces Messages tab
  const tabs = [
    { id: 'home', icon: Home, label: 'Home', path: '/mobile' },
    { id: 'jobs', icon: Briefcase, label: 'Jobs', path: '/mobile/jobs' },
    { id: 'photos', icon: Camera, label: 'Photos', path: '/mobile/photos' },
    { id: 'supplies', icon: Package, label: 'Supplies', path: '/mobile/supplies' },
    { id: 'profile', icon: User, label: 'Profile', path: '/mobile/profile' },
  ]

  const currentTab = active || tabs.find(t => 
    location.pathname === t.path || location.pathname.startsWith(t.path + '/')
  )?.id || 'home'

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 z-50"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)'
      }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(tab => {
          const isActive = currentTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors relative ${
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className={`w-5 h-5 mb-1`} />
              <span className={`text-[10px] font-medium`}>{tab.label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-b-full"></span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
