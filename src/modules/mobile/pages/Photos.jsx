import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { Camera, Trash2, X, Download, Loader2, Briefcase } from 'lucide-react'

export default function Photos() {
  const { user } = useAuthStore()
  const { myJobs, fetchMyJobs } = useMobileStore()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [photoType, setPhotoType] = useState('before')
  const [caption, setCaption] = useState('')
  const [myEmployeeId, setMyEmployeeId] = useState(null)

  // ✅ Active job = first job in My Jobs
  const activeJob = myJobs && myJobs.length > 0 ? myJobs[0] : null

  useEffect(() => { setupAndLoad() }, [])

  const setupAndLoad = async () => {
    const { data: emp } = await supabase.from('employees').select('id').eq('user_id', user?.id).single()
    setMyEmployeeId(emp?.id || null)
    if (emp?.id) {
      await fetchMyJobs(emp.id)
      await loadPhotos(emp.id)
    }
    setLoading(false)
  }

  const loadPhotos = async (empId) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('job_photos')
      .select('*, jobs(title, job_number, site_address)')
      .eq('employee_id', empId)
      .order('taken_at', { ascending: false })
      .limit(50)

    if (error) console.error(error)
    setPhotos(data || [])
    setLoading(false)
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ✅ Auto-use active job — no need to select
    if (!activeJob) {
      toast.error('No active job. Select a job first from My Jobs.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (!myEmployeeId) {
      toast.error('Profile not ready')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `job-photos/${activeJob.id}/${Date.now()}.${fileExt}`

      try {
        await supabase.storage.createBucket('fleet', { public: true, fileSizeLimit: 10485760 })
      } catch (err) { /* Bucket exists */ }

      const { error: uploadError } = await supabase.storage
        .from('fleet')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('fleet').getPublicUrl(fileName)

      const { error: dbError } = await supabase
        .from('job_photos')
        .insert([{
          job_id: activeJob.id,
          employee_id: myEmployeeId,
          photo_type: photoType,
          photo_url: publicUrl,
          caption
        }])

      if (dbError) throw dbError

      toast.success(`Photo uploaded to ${activeJob.job_number}`)
      setShowUploadModal(false)
      setPhotoType('before')
      setCaption('')
      await loadPhotos(myEmployeeId)
    } catch (err) {
      console.error(err)
      toast.error('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (photo) => {
    if (!window.confirm('Delete this photo?')) return
    try {
      if (photo.photo_url?.includes('supabase')) {
        const urlParts = photo.photo_url.split('/')
        const bucketIndex = urlParts.indexOf('fleet')
        if (bucketIndex !== -1) {
          const filePath = urlParts.slice(bucketIndex + 1).join('/')
          await supabase.storage.from('fleet').remove([filePath]).catch(() => {})
        }
      }
      const { error } = await supabase.from('job_photos').delete().eq('id', photo.id)
      if (error) throw error
      toast.success('Deleted!')
      setSelectedPhoto(null)
      await loadPhotos(myEmployeeId)
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const formatDate = (date) => date
    ? new Date(date).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 via-blue-600 to-indigo-700 font-['Inter'] flex flex-col"
      style={{ minHeight: '100dvh' }}>

      {/* Header */}
      <div className="px-5 pt-8 pb-5 text-white flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold">Photos</h1>
            <p className="text-blue-100 text-sm mt-1">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => {
              if (!activeJob) {
                toast.error('Select a job from My Jobs first')
                navigate('/mobile/jobs')
                return
              }
              setShowUploadModal(true)
            }}
            className="w-12 h-12 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>

        {/* ✅ Active Job Banner */}
        {activeJob ? (
          <div className="bg-white/15 border border-white/20 rounded-xl p-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-white/80 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs opacity-70">Current Job</p>
              <p className="text-white font-semibold text-sm truncate">
                {activeJob.job_number} · {activeJob.title}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-amber-300 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-amber-200 text-xs font-semibold">No active job</p>
              <button onClick={() => navigate('/mobile/jobs')} className="text-amber-100 text-xs underline">
                Select a job →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5 pb-24 flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white mx-auto" />
          </div>
        ) : photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, i) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="relative rounded-2xl overflow-hidden shadow-lg bg-white/10"
              >
                <img
                  src={photo.photo_url}
                  alt={photo.caption || 'Job photo'}
                  className="w-full h-40 object-cover"
                  onClick={() => setSelectedPhoto(photo)}
                />
                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                  photo.photo_type === 'before' ? 'bg-blue-500 text-white' :
                  photo.photo_type === 'after' ? 'bg-emerald-500 text-white' :
                  photo.photo_type === 'incident' ? 'bg-red-500 text-white' :
                  'bg-slate-500 text-white'
                }`}>
                  {photo.photo_type}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(photo) }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md active:scale-90"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-white text-[10px] font-medium truncate">
                    {photo.jobs?.title || 'No job'}
                  </p>
                  <p className="text-white/60 text-[9px]">{formatDate(photo.taken_at)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white/10 rounded-3xl">
            <Camera className="w-16 h-16 text-white/50 mx-auto mb-3" />
            <p className="text-white font-semibold">No photos yet</p>
            <p className="text-white/60 text-sm mt-1 mb-4">Tap the camera button to take your first photo</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && activeJob && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center"
          onClick={() => !uploading && setShowUploadModal(false)}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            className="bg-white dark:bg-slate-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 pb-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Upload Photo</h3>
              <button onClick={() => setShowUploadModal(false)} disabled={uploading}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ✅ Job is auto-selected — just display it */}
            <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Active Job</p>
                  <p className="text-sm text-slate-800 dark:text-white font-semibold truncate">
                    {activeJob.job_number} · {activeJob.title}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Photo Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {['before','after','incident','other'].map(type => (
                    <button
                      key={type}
                      onClick={() => setPhotoType(type)}
                      className={`py-2 rounded-xl text-xs font-medium capitalize ${
                        photoType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Caption</label>
                <input
                  type="text"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Optional description..."
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm"
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleUpload}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    Take / Choose Photo
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Photo Viewer */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}>
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="w-full max-w-2xl"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={selectedPhoto.photo_url}
              alt="Full size"
              className="w-full max-h-[70vh] object-contain rounded-2xl"
            />
            <div className="flex justify-center gap-3 mt-4">
              <a
                href={selectedPhoto.photo_url}
                download
                className="px-5 py-3 bg-white text-slate-800 rounded-xl font-medium flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download
              </a>
              <button
                onClick={() => handleDelete(selectedPhoto)}
                className="px-5 py-3 bg-red-600 text-white rounded-xl font-medium flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="px-5 py-3 bg-slate-700 text-white rounded-xl font-medium flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <BottomNav active="photos" />
    </div>
  )
}
