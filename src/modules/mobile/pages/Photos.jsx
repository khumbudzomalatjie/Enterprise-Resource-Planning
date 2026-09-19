import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Camera, Upload, ArrowLeft, Trash2, Eye, X, Download, Loader2 
} from 'lucide-react'

export default function Photos() {
  const { user, profile } = useAuthStore()
  const { myJobs } = useMobileStore()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadForm, setUploadForm] = useState({ jobId: '', photoType: 'before', caption: '' })
  const [myEmployeeId, setMyEmployeeId] = useState(null)

  useEffect(() => { setupAndLoad() }, [])

  const setupAndLoad = async () => {
    const empId = await findEmployee()
    setMyEmployeeId(empId)
    if (empId) await loadPhotos(empId)
    setLoading(false)
  }

  const findEmployee = async () => {
    let { data: emp } = await supabase.from('employees').select('id').eq('user_id', user?.id).single()
    return emp?.id || null
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
    if (!uploadForm.jobId) {
      toast.error('Please select a job first')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `job-photos/${uploadForm.jobId}/${Date.now()}.${fileExt}`

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
          job_id: uploadForm.jobId,
          employee_id: myEmployeeId,
          photo_type: uploadForm.photoType,
          photo_url: publicUrl,
          caption: uploadForm.caption
        }])

      if (dbError) throw dbError

      toast.success('Photo uploaded!')
      setShowUploadModal(false)
      setUploadForm({ jobId: '', photoType: 'before', caption: '' })
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Photos</h1>
            <p className="text-blue-100 text-sm mt-1">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
          </div>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="w-12 h-12 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Camera className="w-6 h-6" />
          </button>
        </div>
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
            <button 
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 rounded-2xl bg-white text-blue-600 font-bold shadow-lg active:scale-95"
            >
              Upload Photo
            </button>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
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

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Job *</label>
                <select 
                  value={uploadForm.jobId} 
                  onChange={e => setUploadForm({...uploadForm, jobId: e.target.value})}
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-sm"
                >
                  <option value="">Select Job</option>
                  {(myJobs || []).map(j => (
                    <option key={j.id} value={j.id}>{j.job_number} - {j.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Photo Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {['before','after','incident','other'].map(type => (
                    <button
                      key={type}
                      onClick={() => setUploadForm({...uploadForm, photoType: type})}
                      className={`py-2 rounded-xl text-xs font-medium capitalize ${
                        uploadForm.photoType === type 
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
                  value={uploadForm.caption}
                  onChange={e => setUploadForm({...uploadForm, caption: e.target.value})}
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
                onClick={() => {
                  if (!uploadForm.jobId) { toast.error('Please select a job'); return }
                  fileInputRef.current?.click()
                }}
                disabled={uploading || !uploadForm.jobId}
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
