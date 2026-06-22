import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useMessagesStore from '../messages/store/messagesStore'
import useAuthStore from '../../../store/authStore'
import useThemeStore from '../../../store/themeStore'
import { 
  MessageSquare, Users, Bell, Smartphone, MapPin, 
  ClipboardCheck, Radio, Signal,
  Sparkles, Sun, Moon, ArrowLeft,
  CheckCircle2, Truck
} from 'lucide-react'

export default function FieldOpsDashboard() {
  const { unreadCount, fetchNotifications, fetchConversations } = useMessagesStore()
  const { user, profile } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchNotifications()
    fetchConversations()
  }, [])

  const modules = [
    {
      icon: MessageSquare,
      label: 'Messages & Contacts',
      description: 'Chat with team members, view all contacts',
      path: '/fieldops/messages',
      badge: unreadCount > 0 ? unreadCount : null,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      icon: Smartphone,
      label: 'Mobile Workforce',
      description: 'Field app, route updates, GPS tracking',
      path: '/fieldops/mobile',
      badge: null,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30'
    },
    {
      icon: MapPin,
      label: 'GPS Tracking',
      description: 'Live location tracking for field staff',
      path: '/fieldops/tracking',
      badge: null,
      color: 'text-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      icon: ClipboardCheck,
      label: 'Job Updates',
      description: 'Real-time job status from the field',
      path: '/fieldops/jobs',
      badge: null,
      color: 'text-amber-600',
      bg: 'bg-amber-100 dark:bg-amber-900/30'
    },
    {
      icon: Truck,
      label: 'Fleet Tracking',
      description: 'Vehicle locations and route monitoring',
      path: '/fieldops/fleet',
      badge: null,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100 dark:bg-indigo-900/30'
    },
    {
      icon: Bell,
      label: 'Notifications',
      description: 'Alerts, reminders, and system updates',
      path: '/fieldops/notifications',
      badge: unreadCount > 0 ? unreadCount : null,
      color: 'text-red-600',
      bg: 'bg-red-100 dark:bg-red-900/30'
    },
  ]

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">Field Operations</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Main Dashboard</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Radio className="w-8 h-8 text-emerald-600" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white">Field Operations Management</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 ml-11">Mobile workforce, messages, GPS tracking, and field communications</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="neu-raised rounded-2xl p-4 flex items-center gap-3">
            <Signal className="w-5 h-5 text-emerald-600" />
            <div><p className="text-xs text-slate-500">System Status</p><p className="font-semibold text-emerald-600">Online</p></div>
          </div>
          <div className="neu-raised rounded-2xl p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div><p className="text-xs text-slate-500">Field Staff</p><p className="font-semibold text-slate-800 dark:text-white">Active</p></div>
          </div>
          <div className="neu-raised rounded-2xl p-4 flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            <div><p className="text-xs text-slate-500">Messages</p><p className="font-semibold text-slate-800 dark:text-white">{unreadCount} Unread</p></div>
          </div>
          <div className="neu-raised rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-amber-600" />
            <div><p className="text-xs text-slate-500">Jobs Today</p><p className="font-semibold text-slate-800 dark:text-white">Scheduled</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((mod, index) => (
            <motion.div key={mod.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
              onClick={() => navigate(mod.path)}
              className="neu-raised rounded-2xl p-6 cursor-pointer hover:scale-[1.02] transition-all relative">
              <div className={`w-12 h-12 rounded-xl ${mod.bg} flex items-center justify-center mb-4`}>
                <mod.icon className={`w-6 h-6 ${mod.color}`} />
              </div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">{mod.label}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{mod.description}</p>
              {mod.badge && (
                <span className="absolute top-4 right-4 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {mod.badge}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  )
}
