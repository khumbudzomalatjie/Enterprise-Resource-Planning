import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import useAuthStore from '../../../store/authStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Users, MapPin, Clock, Camera, AlertCircle, 
  Package, CheckCircle2, Briefcase, Phone,
  Sparkles, Sun, Moon, ChevronRight, ArrowLeft,
  Activity, Eye, Navigation, MessageCircle
} from 'lucide-react'

export default function FieldDashboard() {
  const { isDark, toggleTheme } = useThemeStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState({})
  const [activeCleaners, setActiveCleaners] = useState([])
  const [recentPhotos, setRecentPhotos] = useState([])
  const [recentIncidents, setRecentIncidents] = useState([])
  const [supplyRequests, setSupplyRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllData()
    const interval = setInterval(loadAllData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([
      loadStats(),
      loadActiveCleaners(),
      loadRecentPhotos(),
      loadIncidents(),
      loadSupplyRequests()
    ])
    setLoading(false)
  }

  const loadStats = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    const [
      { data: cleaners },
      { data: activeAttendance },
      { data: todayJobs },
      { data: completedJobs },
      { data: pendingSupplies },
      { data: openIncidents },
      { data: todayPhotos }
    ] = await Promise.all([
      supabase.from('employees').select('*').eq('employment_status', 'active'),
      supabase.from('attendance_records').select('*').eq('attendance_date', today).not('clock_in_time', 'is', null).is('clock_out_time', null),
      supabase.from('job_assignments').select('*').eq('status', 'assigned'),
      supabase.from('jobs').select('*').eq('status', 'completed').gte('actual_end_time', `${today}T00:00:00`),
      supabase.from('supplies_requests').select('*').eq('status', 'pending'),
      supabase.from('incident_reports').select('*').in('status', ['reported', 'investigating']),
      supabase.from('job_photos').select('*').gte('taken_at', `${today}T00:00:00`)
    ])

    setStats({
      totalCleaners: cleaners?.length || 0,
      activeNow: activeAttendance?.length || 0,
      assignedJobs: todayJobs?.length || 0,
      completedToday: completedJobs?.length || 0,
      pendingSupplies: pendingSupplies?.length || 0,
      openIncidents: openIncidents?.length || 0,
      photosToday: todayPhotos?.length || 0
    })
  }

  const loadActiveCleaners = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    const { data: attendance } = await supabase
      .from('attendance_records')
      .select('*, employees(first_name, last_name, phone, employee_code)')
      .eq('attendance_date', today)
      .not('clock_in_time', 'is', null)
      .order('clock_in_time', { ascending: false })

    setActiveCleaners(attendance || [])
  }

  const loadRecentPhotos = async () => {
    const { data } = await supabase
      .from('job_photos')
      .select('*, jobs(title, job_number), employees(first_name, last_name)')
      .order('taken_at', { ascending: false })
      .limit(8)

    setRecentPhotos(data || [])
  }

  const loadIncidents = async () => {
    const { data } = await supabase
      .from('incident_reports')
      .select('*, employees(first_name, last_name), jobs(title, job_number, site_address)')
      .order('incident_date', { ascending: false })
      .limit(10)

    setRecentIncidents(data || [])
  }

  const loadSupplyRequests = async () => {
    const { data } = await supabase
      .from('supplies_requests')
      .select('*, employees(first_name, last_name), supplies_request_items(*)')
      .order('created_at', { ascending: false })
      .limit(10)

    setSupplyRequests(data || [])
  }

  const handleApproveSupply = async (id) => {
    await supabase.from('supplies_requests').update({ status: 'approved' }).eq('id', id)
    toast.success('Supply request approved!')
    loadSupplyRequests()
    loadStats()
  }

  const handleResolveIncident = async (id) => {
    await supabase.from('incident_reports').update({ status: 'resolved' }).eq('id', id)
    toast.success('Incident marked as resolved')
    loadIncidents()
    loadStats()
  }

  const statCards = [
    { icon: Users, label: 'Total Cleaners', value: stats.totalCleaners || 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: Activity, label: 'Active Now', value: stats.activeNow || 0, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { icon: Briefcase, label: 'Assigned Jobs', value: stats.assignedJobs || 0, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: CheckCircle2, label: 'Completed Today', value: stats.completedToday || 0, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
    { icon: Camera, label: 'Photos Today', value: stats.photosToday || 0, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { icon: AlertCircle, label: 'Open Incidents', value: stats.openIncidents || 0, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { icon: Package, label: 'Supply Requests', value: stats.pendingSupplies || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ]

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Main Dashboard</span>
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Field Operations Management</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">Monitor cleaners, jobs, photos, incidents, supplies & messages in real-time</p>
          </div>
          <button onClick={loadAllData} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Refresh Live
          </button>
        </motion.div>

        {/* Quick Nav - 6 Buttons with Messages */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'Active Cleaners', icon: Activity, path: '/mobile/field/cleaners', color: 'bg-emerald-600' },
            { label: 'Job Photos', icon: Camera, path: '/mobile/field/photos', color: 'bg-indigo-600' },
            { label: 'Incidents', icon: AlertCircle, path: '/mobile/field/incidents', color: 'bg-red-600' },
            { label: 'Supply Orders', icon: Package, path: '/mobile/field/supplies', color: 'bg-amber-600' },
            { label: 'Live Map', icon: Navigation, path: '/mobile/field/map', color: 'bg-blue-600' },
            { label: 'Messages', icon: MessageCircle, path: '/mobile/field/messages', color: 'bg-purple-600' },
          ].map(item => (
            <button key={item.label} onClick={() => navigate(item.path)}
              className={`${item.color} text-white rounded-2xl p-3 flex flex-col items-center gap-1 hover:scale-105 transition-transform text-sm font-medium shadow-lg`}>
              <item.icon className="w-6 h-6" />
              {item.label}
            </button>
          ))}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="neu-raised rounded-2xl p-4 stat-card">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Active Cleaners Live */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="neu-raised rounded-3xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />Cleaners Working Now
            </h2>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-medium">
              {activeCleaners.length} Active
            </span>
          </div>
          
          {activeCleaners.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeCleaners.map(cleaner => (
                <div key={cleaner.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 border border-slate-100 dark:border-slate-600">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center relative">
                      <Users className="w-5 h-5 text-emerald-600" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white text-sm">{cleaner.employees?.first_name} {cleaner.employees?.last_name}</p>
                      <p className="text-xs text-slate-500">{cleaner.employees?.employee_code}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(cleaner.clock_in_time).toLocaleTimeString()}</div>
                    {cleaner.check_in_latitude && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <a href={`https://www.google.com/maps?q=${cleaner.check_in_latitude},${cleaner.check_in_longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          View on Map
                        </a>
                      </div>
                    )}
                  </div>
                  {cleaner.employees?.phone && (
                    <a href={`tel:${cleaner.employees.phone}`} className="mt-2 inline-flex items-center gap-1 text-emerald-600 text-xs font-medium hover:underline">
                      <Phone className="w-3 h-3" /> Call
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500">No cleaners currently active</p>
            </div>
          )}
        </motion.div>

        {/* Two Column Layout: Incidents + Supply Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Recent Incidents */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="neu-raised rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />Recent Incidents
              </h2>
              <Link to="/mobile/field/incidents" className="text-sm text-emerald-600 flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link>
            </div>
            
            {recentIncidents.length > 0 ? (
              <div className="space-y-3">
                {recentIncidents.map(incident => (
                  <div key={incident.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 border border-slate-100 dark:border-slate-600">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-white capitalize">{incident.incident_type}</p>
                        <p className="text-xs text-slate-500">{incident.employees?.first_name} {incident.employees?.last_name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        incident.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        incident.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>{incident.severity}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{incident.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-slate-400">{new Date(incident.incident_date).toLocaleString()}</span>
                      {incident.status !== 'resolved' && (
                        <button onClick={() => handleResolveIncident(incident.id)} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Mark Resolved</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No open incidents 🎉</p>
              </div>
            )}
          </motion.div>

          {/* Supply Requests */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="neu-raised rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />Supply Requests
              </h2>
              <Link to="/mobile/field/supplies" className="text-sm text-emerald-600 flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link>
            </div>
            
            {supplyRequests.length > 0 ? (
              <div className="space-y-3">
                {supplyRequests.map(request => (
                  <div key={request.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 border border-slate-100 dark:border-slate-600">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-white">{request.employees?.first_name} {request.employees?.last_name}</p>
                        <p className="text-xs text-slate-500">{request.supplies_request_items?.length || 0} items requested</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        request.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        request.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>{request.status}</span>
                    </div>
                    <div className="space-y-1">
                      {request.supplies_request_items?.slice(0, 3).map((item, i) => (
                        <p key={i} className="text-xs text-slate-600 dark:text-slate-400">• {item.item_name} x{item.quantity} {item.unit}</p>
                      ))}
                    </div>
                    {request.status === 'pending' && (
                      <button onClick={() => handleApproveSupply(request.id)} className="mt-2 w-full py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600">Approve Request</button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No pending requests</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent Photos Gallery */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="neu-raised rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600" />Recent Job Photos
            </h2>
            <Link to="/mobile/field/photos" className="text-sm text-emerald-600 flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></Link>
          </div>
          
          {recentPhotos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {recentPhotos.map(photo => (
                <div key={photo.id} className="relative group cursor-pointer rounded-xl overflow-hidden" onClick={() => window.open(photo.photo_url, '_blank')}>
                  <img src={photo.photo_url} alt={photo.caption || 'Job photo'} className="w-full h-40 object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs font-medium">{photo.employees?.first_name} {photo.employees?.last_name}</p>
                    <p className="text-white/70 text-[10px]">{photo.jobs?.title?.slice(0, 30)}</p>
                  </div>
                  <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                    photo.photo_type === 'before' ? 'bg-blue-500 text-white' :
                    photo.photo_type === 'after' ? 'bg-emerald-500 text-white' :
                    photo.photo_type === 'incident' ? 'bg-red-500 text-white' : 'bg-slate-500 text-white'
                  }`}>{photo.photo_type}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No photos uploaded yet</p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
