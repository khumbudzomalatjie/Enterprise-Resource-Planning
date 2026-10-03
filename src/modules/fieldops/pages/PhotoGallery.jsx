import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import {
  Camera, Search, ChevronRight, Sun, Moon, Sparkles,
  Download, X, RefreshCw, Image as ImageIcon
} from 'lucide-react'

// ✅ Resolve public URL → signed URL (works on private buckets)
const resolvePhotoUrl = async (photoUrl) => {
  if (!photoUrl) return null
  try {
    const match = photoUrl.match(/\/job-photos\/(.+?)(?:\?|$)/)
    if (!match) return photoUrl
    const path = decodeURIComponent(match[1])
    const { data: signed } = await supabase.storage
      .from('job-photos')
      .createSignedUrl(path, 3600)
    return signed?.signedUrl || photoUrl
  } catch {
    return photoUrl
  }
}

export default function PhotoGallery() {
  const { isDark, toggleTheme } = useThemeStore()
  const [photos, setPhotos] = useState([])
  const [jobs, setJobs] = useState({})       // job_id → { job_number, title }
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  useEffect(() => { loadPhotos() }, [])

  const loadPhotos = async () => {
    setLoading(true)
    try {
      // 1. Load all photos (newest first)
      const { data: photoRows, error: photoErr } = await supabase
        .from('job_photos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (photoErr) throw photoErr

      // 2. Load jobs referenced by the photos (for job_number / title)
      const jobIds = [...new Set((photoRows || []).map(p => p.job_id).filter(Boolean))]
      let jobMap = {}
      if (jobIds.length > 0) {
        const { data: jobRows } = await supabase
          .from('jobs')
          .select('id, job_number, title')
          .in('id', jobIds)
        ;(jobRows || []).forEach(j => { jobMap[j.id] = j })
      }

      // 3. Resolve signed URLs
      const withUrls = await Promise.all((photoRows || []).map(async (p) => ({
        ...p,
        display_url: await resolvePhotoUrl(p.photo_url)
      })))

      setPhotos(withUrls)
      setJobs(jobMap)
    } catch (err) {
      console.error('Load photos error:', err)
      toast.error('Failed to load photos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (d) => d
    ? new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  const filtered = photos.filter(p => {
    if (filterType !== 'all' && p.photo_type !== filterType) return false
    if (!search) return true
    const s = search.toLowerCase()
    const job = jobs[p.job_id]
    return (
      (job?.job_number || '').toLowerCase().includes(s) ||
      (job?.title || '').toLowerCase().includes(s) ||
      (p.caption || '').toLowerCase().includes(s) ||
      (p.photo_type || '').toLowerCase().includes(s)
    )
  })

  const types = ['all', 'before', 'after', 'incident', 'general']

  return (
    <div className={'min-h-screen font-Inter transition-colors duration-300 ' + (isDark ? 'dark' : '')}>
      <Navbar />

      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/fieldops" className="text-slate-500 hover:text-emerald-600">Field Ops</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Photo Gallery</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Camera className="w-8 h-8 text-indigo-600" />Photo Gallery
            </h1>
            <p className="text-slate-500 mt-1">{filtered.length} of {photos.length} photos</p>
          </div>
          <button onClick={loadPhotos} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-slate-600 text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5" /> Refresh
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="neu-raised rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by job #, title, caption, or type..."
                className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 capitalize"
            >
              {types.map(t => (
                <option key={t} value={t} className="capitalize">{t === 'all' ? 'All Types' : t}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading photos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 neu-raised rounded-3xl">
            <ImageIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No photos found</p>
            <p className="text-slate-400 text-sm mt-1">Photos uploaded from the mobile app will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(photo => {
              const job = jobs[photo.job_id]
              return (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="neu-raised rounded-2xl overflow-hidden group cursor-pointer"
                  onClick={() => setSelectedPhoto({ ...photo, job })}
                >
                  <div className="relative aspect-square bg-slate-100 dark:bg-slate-700">
                    <img
                      src={photo.display_url || photo.photo_url}
                      alt={photo.caption || 'Photo'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.opacity = '0.2' }}
                    />
                    <span className={'absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize text-white ' + (
                      photo.photo_type === 'before' ? 'bg-blue-500' :
                      photo.photo_type === 'after' ? 'bg-emerald-500' :
                      photo.photo_type === 'incident' ? 'bg-red-500' : 'bg-slate-500'
                    )}>
                      {photo.photo_type || 'general'}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {job?.job_number || 'Job'} {job?.title ? '– ' + job.title : ''}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(photo.created_at)}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </main>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="max-w-4xl w-full"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={selectedPhoto.display_url || selectedPhoto.photo_url}
                alt="Full size"
                className="w-full max-h-[75vh] object-contain rounded-2xl"
              />
              <div className="mt-4 text-center text-white/80 text-sm">
                {selectedPhoto.job && (
                  <p className="font-semibold text-white">
                    {selectedPhoto.job.job_number} – {selectedPhoto.job.title}
                  </p>
                )}
                <p className="mt-1">
                  <span className="capitalize">{selectedPhoto.photo_type || 'general'}</span>
                  {selectedPhoto.caption ? ' · ' + selectedPhoto.caption : ''}
                </p>
                <p className="text-xs text-white/60 mt-1">{formatDate(selectedPhoto.created_at)}</p>
              </div>
              <div className="flex justify-center gap-3 mt-4">
                <a
                  href={selectedPhoto.display_url || selectedPhoto.photo_url}
                  download target="_blank" rel="noopener noreferrer"
                  className="px-5 py-3 bg-white text-slate-800 rounded-xl font-medium flex items-center gap-2 hover:bg-slate-100"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="px-5 py-3 bg-slate-700 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-slate-600"
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
