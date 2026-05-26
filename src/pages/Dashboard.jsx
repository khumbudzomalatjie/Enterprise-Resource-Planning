import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import useAuthStore from '../store/authStore'
import Navbar from '../components/Navbar'
import { 
  Users, 
  Key, 
  Shield, 
  Activity,
  Clock,
  UserCheck,
  UserX,
  TrendingUp
} from 'lucide-react'

export default function Dashboard() {
  const { user, profile } = useAuthStore()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    lastLogin: null,
    roleDistribution: {}
  })

  useEffect(() => {
    // Here you would fetch dashboard statistics
    // For now, setting example data
    setStats({
      totalUsers: 125,
      activeSessions: 42,
      lastLogin: new Date(),
      roleDistribution: {
        super_admin: 1,
        operations_manager: 3,
        hr_manager: 2,
        finance_officer: 2,
        supervisor: 15,
        cleaner: 80,
        sales_agent: 10,
        customer: 12
      }
    })
  }, [])

  const statCards = [
    {
      icon: Users,
      label: 'Total Users',
      value: stats.totalUsers,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Activity,
      label: 'Active Sessions',
      value: stats.activeSessions,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: UserCheck,
      label: 'Active Users',
      value: 98,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: Shield,
      label: 'Roles',
      value: 8,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
  ]

  return (
    <div className="min-h-screen bg-[#333]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {profile?.full_name || user?.email}
          </h1>
          <p className="text-gray-400">
            Here's what's happening with your authentication system today.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="
                bg-[#3a3a3a] 
                rounded-[2em] 
                p-6
                shadow-[5px_5px_20px_#2a2a2a,-5px_-5px_20px_#4a4a4a]
                hover:shadow-[-5px_-5px_20px_#2a2a2a,5px_5px_10px_#4a4a4a,3px_3px_15px_#99b9ff,-5px_-5px_25px_#2a2a2a]
                transition-all duration-300
              "
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                <p className="text-white text-3xl font-bold">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Info Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="
              bg-[#3a3a3a] 
              rounded-[2em] 
              p-6
              shadow-[5px_5px_20px_#2a2a2a,-5px_-5px_20px_#4a4a4a]
            "
          >
            <div className="flex items-center space-x-3 mb-6">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-white text-xl font-semibold">Recent Activity</h2>
            </div>
            
            <div className="space-y-4">
              {[
                { user: 'John Doe', action: 'Logged in', time: '2 minutes ago' },
                { user: 'Jane Smith', action: 'Password changed', time: '15 minutes ago' },
                { user: 'Mike Johnson', action: 'Session expired', time: '1 hour ago' },
                { user: 'Sarah Wilson', action: 'Role updated', time: '2 hours ago' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{activity.user}</p>
                    <p className="text-gray-400 text-xs">{activity.action}</p>
                  </div>
                  <span className="text-gray-500 text-xs">{activity.time}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Role Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="
              bg-[#3a3a3a] 
              rounded-[2em] 
              p-6
              shadow-[5px_5px_20px_#2a2a2a,-5px_-5px_20px_#4a4a4a]
            "
          >
            <div className="flex items-center space-x-3 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-white text-xl font-semibold">Role Distribution</h2>
            </div>
            
            <div className="space-y-4">
              {Object.entries(stats.roleDistribution).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <span className="text-white text-sm capitalize">{role.replace('_', ' ')}</span>
                      <span className="text-gray-400 text-sm">{count}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(count / stats.totalUsers) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-[#3a3a3a] rounded-[2em] p-6 shadow-[5px_5px_20px_#2a2a2a,-5px_-5px_20px_#4a4a4a]"
        >
          <h2 className="text-white text-xl font-semibold mb-6">Your Profile</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Email</label>
              <p className="text-white">{user?.email}</p>
            </div>
            
            <div>
              <label className="text-gray-400 text-sm block mb-1">Role</label>
              <p className="text-white capitalize">{profile?.role?.replace('_', ' ') || 'Not assigned'}</p>
            </div>
            
            <div>
              <label className="text-gray-400 text-sm block mb-1">Full Name</label>
              <p className="text-white">{profile?.full_name || 'Not set'}</p>
            </div>
            
            <div>
              <label className="text-gray-400 text-sm block mb-1">Last Sign In</label>
              <p className="text-white">{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
