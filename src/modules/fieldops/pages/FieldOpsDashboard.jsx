import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import { 
  MessageSquare, Users, Bell, Smartphone, MapPin, 
  ClipboardCheck, Radio,
  Sparkles, Sun, Moon, ArrowLeft,
  CheckCircle2, Truck, Briefcase, Clock, AlertTriangle
} from 'lucide-react'

export default function FieldOpsDashboard() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const [jobStats, setJobStats] = useState({ total: 0, inProgress: 0, pending: 0, completed: 0, overdue: 0 })
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    loadJobStats()
    loadUnreadCount()
  }, [])

  const loadJobStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: jobs } = await supabase.from('jobs').select('id, status, scheduled_date')
      if (jobs) {
        setJobStats({
          total: jobs.length,
          inProgress: jobs.filter(j => j.status === 'in_progress').length,
          pending: jobs.filter(j => j.status === 'pending' || j.status === 'scheduled').length,
          completed: jobs.filter(j => j.status === 'completed').length,
          overdue: jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled' && j.scheduled_date && j.scheduled_date < today).length,
        })
      }
    } catch (e) { console.error('Stats error:', e) }
  }

  const loadUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.rpc('get_unread_count', { p_user_id: user.id })
        setUnreadCount(data || 0)
      }
    } catch (e) { console.error('Unread error:', e) }
  }

  const modules = [
    { icon: MessageSquare, label: 'Messages & Contacts', desc: 'Chat with team, view employees', path: '/fieldops/messages', badge: unreadCount > 0 ? unreadCount : null, color: '#2563eb', bg: '#dbeafe' },
    { icon: ClipboardCheck, label: 'Live Jobs', desc: `${jobStats.inProgress} active, ${jobStats.total} total`, path: '/fieldops/jobs', badge: jobStats.inProgress > 0 ? jobStats.inProgress : null, color: '#d97706', bg: '#fef3c7' },
    { icon: Smartphone, label: 'Mobile Workforce', desc: 'Field app, routes, clock in/out', path: '/fieldops/mobile', badge: null, color: '#059669', bg: '#d1fae5' },
    { icon: MapPin, label: 'GPS Tracking', desc: 'Live location tracking', path: '/fieldops/tracking', badge: null, color: '#7c3aed', bg: '#ede9fe' },
    { icon: Truck, label: 'Fleet Tracking', desc: 'Vehicle locations & routes', path: '/fieldops/fleet', badge: null, color: '#4f46e5', bg: '#e0e7ff' },
    { icon: Bell, label: 'Notifications', desc: 'Alerts & system updates', path: '/fieldops/notifications', badge: unreadCount > 0 ? unreadCount : null, color: '#dc2626', bg: '#fee2e2' },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: isDark ? '#1e293b' : '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>
      <Navbar />
      
      {/* Fixed header buttons */}
      <div style={{ position: 'fixed', top: '80px', right: '16px', zIndex: 30, display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: isDark ? '#334155' : '#e2e8f0', padding: '8px 20px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.1)' }}>
          <Sparkles size={16} color="#059669" />
          <span style={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#a7f3d0' : '#065f46' }}>Field Operations</span>
        </div>
        <button onClick={toggleTheme} style={{ width: '48px', height: '48px', borderRadius: '16px', border: 'none', cursor: 'pointer', background: isDark ? '#334155' : '#fff', boxShadow: '4px 4px 10px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isDark ? <Sun size={24} color="#fbbf24" /> : <Moon size={24} color="#475569" />}
        </button>
      </div>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' }}>
        {/* Back link */}
        <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', color: isDark ? '#94a3b8' : '#64748b', textDecoration: 'none', marginBottom: '24px', fontSize: '14px' }}>
          <ArrowLeft size={16} style={{ marginRight: '4px' }} />Back to Main Dashboard
        </Link>

        {/* Title */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Radio size={32} color="#059669" />
            <h1 style={{ fontSize: '36px', fontWeight: 800, color: isDark ? '#fff' : '#1e293b', margin: 0 }}>Field Operations Management</h1>
          </div>
          <p style={{ color: isDark ? '#94a3b8' : '#64748b', margin: '0 0 0 44px', fontSize: '16px' }}>Live jobs, messages, GPS tracking, mobile workforce</p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {[
            { icon: Briefcase, label: 'Total Jobs', value: jobStats.total, color: '#2563eb', onClick: () => navigate('/fieldops/jobs') },
            { icon: Clock, label: 'In Progress', value: jobStats.inProgress, color: '#d97706', onClick: () => navigate('/fieldops/jobs') },
            { icon: CheckCircle2, label: 'Completed', value: jobStats.completed, color: '#059669', onClick: () => navigate('/fieldops/jobs') },
            { icon: AlertTriangle, label: 'Overdue', value: jobStats.overdue, color: '#dc2626', onClick: () => navigate('/fieldops/jobs') },
            { icon: MessageSquare, label: 'Messages', value: `${unreadCount} Unread`, color: '#7c3aed', onClick: () => navigate('/fieldops/messages') },
          ].map((s, i) => (
            <div key={i} onClick={s.onClick} style={{ cursor: 'pointer', background: isDark ? '#1e293b' : '#fff', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '4px 4px 10px rgba(0,0,0,0.08)', border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>{s.label}</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: isDark ? '#fff' : '#1e293b', margin: 0 }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Module Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {modules.map((mod, index) => (
            <div 
              key={mod.label}
              onClick={() => navigate(mod.path)}
              style={{ 
                cursor: 'pointer', 
                background: isDark ? '#1e293b' : '#fff', 
                borderRadius: '20px', 
                padding: '24px', 
                position: 'relative',
                boxShadow: '4px 4px 10px rgba(0,0,0,0.08)', 
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: mod.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <mod.icon size={24} color={mod.color} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: isDark ? '#fff' : '#1e293b', margin: '0 0 4px 0' }}>{mod.label}</h3>
              <p style={{ fontSize: '14px', color: isDark ? '#94a3b8' : '#64748b', margin: 0 }}>{mod.desc}</p>
              {mod.badge && (
                <span style={{ position: 'absolute', top: '16px', right: '16px', minWidth: '24px', height: '24px', background: '#ef4444', color: '#fff', fontSize: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                  {mod.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
