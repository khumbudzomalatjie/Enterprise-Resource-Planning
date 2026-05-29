import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import { MapPin, Clock, Users, Phone, ArrowLeft, Sun, Moon, Sparkles, Navigation } from 'lucide-react'

export default function LiveMap() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [cleaners, setCleaners] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCleaner, setSelectedCleaner] = useState(null)

  useEffect(() => {
    loadCleaners()
    const interval = setInterval(loadCleaners, 15000) // Refresh every 15 seconds
    return () => clearInterval(interval)
  }, [])

  const loadCleaners = async () => {
    const today = new Date().toISOString().split('T')[0]
    
    const { data } = await supabase
      .from('attendance_records')
      .select('*, employees(first_name, last_name, phone, employee_code)')
      .eq('attendance_date', today)
      .not('clock_in_time', 'is', null)
      .not('check_in_latitude', 'is', null)
      .is('clock_out_time', null)
      .order('clock_in_time', { ascending: false })

    setCleaners(data || [])
    setLoading(false)
  }

  const openGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
  }

  const openGoogleMapsDirections = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')
  }

  // Generate map URL with markers for all cleaners
  const generateMapUrl = () => {
    if (cleaners.length === 0) return ''
    
    const markers = cleaners
      .filter(c => c.check_in_latitude && c.check_in_longitude)
      .map(c => `${c.check_in_latitude},${c.check_in_longitude}`)
      .join('|')

    return `https://maps.googleapis.com/maps/api/staticmap?size=800x400&maptype=roadmap&markers=color:green%7C${markers}&key=YOUR_API_KEY`
  }

  // Use OpenStreetMap static map (free, no API key needed)
  const generateOSMUrl = () => {
    if (cleaners.length === 0) return ''
    const markers = cleaners
      .filter(c => c.check_in_latitude && c.check_in_longitude)
      .map(c => `pin-s-circle+green(${c.check_in_longitude},${c.check_in_latitude})`)
      .join(',')

    return `https://staticmap.openstreetmap.de/staticmap.php?center=-26.2041,28.0473&zoom=11&size=800x400&maptype=mapnik&markers=${markers}`
  }

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
        <Link to="/mobile/field" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Field Operations</span>
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Navigation className="w-8 h-8 text-blue-600" />Live Cleaner Map
            </h1>
            <p className="text-slate-500 mt-1">Real-time GPS locations of active cleaners</p>
          </div>
          <button onClick={loadCleaners} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700">
            Refresh Map
          </button>
        </div>

        {/* Map Container */}
        <div className="neu-raised rounded-3xl overflow-hidden mb-6">
          {cleaners.length > 0 ? (
            <div className="relative">
              <img 
                src={generateOSMUrl()} 
                alt="Cleaner locations map" 
                className="w-full h-[400px] object-cover"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.parentNode.innerHTML = `
                    <div class="h-[400px] bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                      <p class="text-slate-500">Map could not be loaded. Click on individual cleaners for Google Maps.</p>
                    </div>
                  `
                }}
              />
              <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-800/90 rounded-lg px-3 py-1.5 text-xs font-medium">
                {cleaners.length} Cleaners Active
              </div>
            </div>
          ) : (
            <div className="h-[400px] bg-slate-100 dark:bg-slate-700 flex flex-col items-center justify-center">
              <MapPin className="w-16 h-16 text-slate-300 dark:text-slate-500 mb-4" />
              <p className="text-slate-500 text-lg">No cleaners currently active</p>
              <p className="text-slate-400 text-sm mt-1">Check back when cleaners have clocked in</p>
            </div>
          )}
        </div>

        {/* Cleaner List with Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : cleaners.map(cleaner => (
            <motion.div key={cleaner.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="neu-raised rounded-2xl p-5 hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center relative">
                  <Users className="w-6 h-6 text-emerald-600" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-white">{cleaner.employees?.first_name} {cleaner.employees?.last_name}</h3>
                  <p className="text-xs text-slate-500">{cleaner.employees?.employee_code}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-500 mb-3">
                <div className="flex items-center gap-1"><Clock className="w-3 h-3" />Clocked in: {new Date(cleaner.clock_in_time).toLocaleTimeString()}</div>
                {cleaner.check_in_latitude ? (
                  <div className="flex items-center gap-1 text-emerald-600">
                    <MapPin className="w-3 h-3" />
                    <span>GPS: {cleaner.check_in_latitude.toFixed(5)}, {cleaner.check_in_longitude.toFixed(5)}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-amber-600">
                    <MapPin className="w-3 h-3" />
                    <span>No GPS data</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {cleaner.check_in_latitude && (
                  <>
                    <button onClick={() => openGoogleMaps(cleaner.check_in_latitude, cleaner.check_in_longitude)}
                      className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-xs font-medium hover:bg-blue-600 flex items-center justify-center gap-1">
                      <MapPin className="w-3 h-3" /> View Location
                    </button>
                    <button onClick={() => openGoogleMapsDirections(cleaner.check_in_latitude, cleaner.check_in_longitude)}
                      className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-xs font-medium hover:bg-emerald-600 flex items-center justify-center gap-1">
                      <Navigation className="w-3 h-3" /> Navigate
                    </button>
                  </>
                )}
                {cleaner.employees?.phone && (
                  <a href={`tel:${cleaner.employees.phone}`}
                    className="flex-1 py-2 bg-purple-500 text-white rounded-xl text-xs font-medium hover:bg-purple-600 flex items-center justify-center gap-1">
                    <Phone className="w-3 h-3" /> Call
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  )
}
