import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/authStore'
import useMobileStore from '../store/mobileStore'
import BottomNav from '../components/BottomNav'
import toast from 'react-hot-toast'
import { Camera, Upload, ArrowLeft, CheckCircle2, Image } from 'lucide-react'

export default function PhotoUpload() {
  const { profile } = useAuthStore()
  const { myJobs, fetchMyJobs, uploadPhoto } = useMobileStore()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [selectedJob, setSelectedJob] = useState('')
  const [photoType, setPhotoType] = useState('before')
  const [caption, setCaption] = useState('')
  const [preview, setPreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedPhotos, setUploadedPhotos] = useState([])

  useEffect(() => {
    if (profile?.id) fetchMyJobs(profile.id)
  }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedJob) { toast.error('Please select a job'); return }
    if (!selectedFile) { toast.error('Please select a photo'); return }

    setUploading(true)
    const result = await uploadPhoto(selectedJob, profile.id, selectedFile, photoType, caption)
    
    if (result.success) {
      toast.success('Photo uploaded! 📸')
      setUploadedPhotos([...uploadedPhotos, { url: preview, type: photoType, caption }])
      setPreview(null)
      setSelectedFile(null)
      setCaption('')
    } else {
      toast.error(result.error || 'Upload failed')
    }
    setUploading(false)
  }

  const openCamera = () => {
    cameraInputRef.current?.click()
  }

  return (
    <div className="min-h-screen bg-slate-50 font-['Inter'] pb-20">
      <div className="bg-gradient-to-b from-blue-500 to-blue-600 px-4 pt-8 pb-6 text-white">
        <button onClick={() => navigate('/mobile')} className="p-1 rounded-lg hover:bg-white/20 mb-4">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Upload Photos</h1>
        <p className="text-blue-100 text-sm">Before & after job photos</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Job Selection */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-500 mb-2 block">Select Job</label>
          <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
            <option value="">Choose a job...</option>
            {myJobs.map(job => <option key={job.id} value={job.id}>{job.title} - {job.site_address}</option>)}
          </select>
        </div>

        {/* Photo Type */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-500 mb-2 block">Photo Type</label>
          <div className="flex gap-2">
            {['before', 'after', 'incident', 'other'].map(type => (
              <button key={type} onClick={() => setPhotoType(type)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                  photoType === type ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Photo Preview */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full h-64 object-cover rounded-xl" />
              <button onClick={() => { setPreview(null); setSelectedFile(null) }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center">✕</button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-300 rounded-xl h-64 flex flex-col items-center justify-center gap-3">
              <Image className="w-12 h-12 text-slate-300" />
              <p className="text-slate-400 text-sm">No photo selected</p>
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <input type="text" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption..." className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm" />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={openCamera} className="bg-blue-500 text-white rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-blue-600 active:scale-95 transition-all">
            <Camera className="w-8 h-8" />
            <span className="font-semibold">Take Photo</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-500 text-white rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-emerald-600 active:scale-95 transition-all">
            <Upload className="w-8 h-8" />
            <span className="font-semibold">Choose File</span>
          </button>
        </div>

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

        {selectedFile && (
          <button onClick={handleUpload} disabled={uploading}
            className="w-full bg-emerald-500 text-white rounded-2xl p-4 font-bold text-lg hover:bg-emerald-600 disabled:opacity-50 active:scale-95 transition-all">
            {uploading ? 'Uploading...' : '📤 Upload Photo'}
          </button>
        )}

        {/* Uploaded Photos */}
        {uploadedPhotos.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-3">Uploaded ({uploadedPhotos.length})</h3>
            <div className="grid grid-cols-3 gap-2">
              {uploadedPhotos.map((p, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden">
                  <img src={p.url} alt={p.type} className="w-full h-24 object-cover" />
                  <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full capitalize">{p.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav active="photos" />
    </div>
  )
}
