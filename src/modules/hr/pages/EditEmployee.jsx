import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useHRStore from '../store/hrStore'
import useThemeStore from '../../../store/themeStore'
import { hrApi } from '../api/hrApi'
import toast from 'react-hot-toast'
import { 
  ChevronRight, Users, Camera, Paperclip,
  Eye, Trash2, Save, Sun, Moon,
  Sparkles, Upload, FileText, File, FileImage,
  ExternalLink, Loader, ArrowLeft
} from 'lucide-react'

export default function EditEmployee() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { selectedEmployee, fetchEmployee, updateEmployee, loading: storeLoading } = useHRStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [activeTab, setActiveTab] = useState('general')
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const attachmentInputRef = useRef(null)
  const photoInputRef = useRef(null)
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    email: '',
    phone: '',
    alternative_phone: '',
    employment_status: 'active',
    position: '',
    department: '',
    employment_type: 'full_time',
    date_of_hire: '',
    gender: 'male',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    bank_name: '',
    bank_account_number: '',
    bank_branch_code: '',
    id_number: '',
    tax_number: '',
  })

  const tabs = [
    { id: 'general', label: 'General Info' },
    { id: 'employment', label: 'Employment' },
    { id: 'emergency', label: 'Emergency' },
    { id: 'banking', label: 'Banking' },
    { id: 'documents', label: 'Documents' },
  ]

  // Load employee data
  useEffect(() => {
    if (id) {
      loadEmployee()
    }
  }, [id])

  const loadEmployee = async () => {
    const result = await fetchEmployee(id)
    if (result.success && result.data) {
      const emp = result.data
      setFormData({
        first_name: emp.first_name || '',
        last_name: emp.last_name || '',
        address_line1: emp.address_line1 || '',
        address_line2: emp.address_line2 || '',
        city: emp.city || '',
        state: emp.state || '',
        postal_code: emp.postal_code || '',
        email: emp.email || '',
        phone: emp.phone || '',
        alternative_phone: emp.alternative_phone || '',
        employment_status: emp.employment_status || 'active',
        position: emp.position || '',
        department: emp.department || '',
        employment_type: emp.employment_type || 'full_time',
        date_of_hire: emp.date_of_hire || '',
        gender: emp.gender || 'male',
        emergency_contact_name: emp.emergency_contact_name || '',
        emergency_contact_phone: emp.emergency_contact_phone || '',
        emergency_contact_relation: emp.emergency_contact_relation || '',
        bank_name: emp.bank_name || '',
        bank_account_number: emp.bank_account_number || '',
        bank_branch_code: emp.bank_branch_code || '',
        id_number: emp.id_number || '',
        tax_number: emp.tax_number || '',
      })
      
      if (emp.profile_photo_url) {
        setPhotoPreview(emp.profile_photo_url)
      }
      
      // Load documents
      loadAttachments()
    } else {
      toast.error('Employee not found')
      navigate('/hr/employees')
    }
  }

  const loadAttachments = async () => {
    const result = await hrApi.getEmployeeDocuments(id)
    if (result.data) {
      setAttachments(result.data.map(doc => ({
        id: doc.id,
        name: doc.document_name,
        type: doc.document_type,
        url: doc.document_url,
        document_url: doc.document_url,
        uploaded_at: doc.uploaded_at,
        size: null
      })))
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Photo upload
  const handlePhotoClick = () => {
    if (photoInputRef.current) photoInputRef.current.click()
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result)
    reader.readAsDataURL(file)
    toast.success('Photo selected')
    e.target.value = ''
  }

  // Attachments
  const handleAddAttachmentClick = () => {
    if (attachmentInputRef.current) attachmentInputRef.current.click()
  }

  const handleFileSelect = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingFiles(true)
    let successCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 10MB.`)
        continue
      }

      const result = await hrApi.uploadEmployeeDocument(id, file)
      if (result.error) {
        toast.error(`Failed to upload ${file.name}`)
      } else {
        setAttachments(prev => [...prev, {
          id: result.data.id,
          name: file.name,
          type: file.type,
          size: file.size,
          url: result.data.url || result.data.document_url,
          uploaded_at: new Date().toISOString()
        }])
        successCount++
      }
    }

    setUploadingFiles(false)
    if (successCount > 0) toast.success(`${successCount} file(s) uploaded`)
    e.target.value = ''
  }

  const handleViewDocument = (attachment) => {
    const url = attachment.url || attachment.document_url
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm('Delete this attachment?')) return
    const result = await hrApi.deleteEmployeeDocument(attachmentId)
    if (result.error) {
      toast.error('Failed to delete')
    } else {
      setAttachments(prev => prev.filter(att => att.id !== attachmentId))
      toast.success('Attachment deleted')
    }
  }

  // Save changes
  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    
    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast.error('First Name, Last Name, and Email are required')
      return
    }

    setSaving(true)

    const result = await updateEmployee(id, formData)
    
    if (result.success) {
      toast.success('Employee updated successfully!')
      
      // Upload new photo if selected
      if (photoFile) {
        const photoResult = await hrApi.uploadEmployeePhoto(id, photoFile)
        if (photoResult.error) {
          toast.error('Photo upload failed')
        } else {
          toast.success('Photo updated')
        }
      }
      
      setTimeout(() => navigate(`/hr/employees/${id}`), 1000)
    } else {
      toast.error(result.error || 'Failed to update employee')
    }
    
    setSaving(false)
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (type) => {
    if (!type) return <File className="w-4 h-4" />
    if (type.startsWith('image/')) return <FileImage className="w-4 h-4 text-blue-500" />
    if (type.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />
    return <File className="w-4 h-4" />
  }

  if (storeLoading && !selectedEmployee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">
            Enterprise Resource Planning
          </span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/hr" className="text-slate-500 hover:text-emerald-600">HR Dashboard</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/hr/employees" className="text-slate-500 hover:text-emerald-600">Employees</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to={`/hr/employees/${id}`} className="text-slate-500 hover:text-emerald-600">
            {formData.first_name} {formData.last_name}
          </Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Edit</span>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="text-5xl">✏️</div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-wide text-[#2c5f9b] dark:text-[#6ba3d6] uppercase"
                style={{ fontFamily: "'Alumni Sans Pinstripe', sans-serif", letterSpacing: '3px' }}>
                Edit Employee
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Editing: {formData.first_name} {formData.last_name} ({selectedEmployee?.employee_code})
              </p>
            </div>
          </div>
        </motion.div>

        {/* Top Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="neu-raised rounded-2xl p-4 mb-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={handleSubmit}
              disabled={saving}
              className="neu-btn px-4 py-2 rounded-xl bg-gradient-to-b from-[#4f8fd0] to-[#2d5f98] text-white font-bold hover:from-[#5a9ad6] hover:to-[#3569a3] transition-all disabled:opacity-50 flex items-center gap-2"
              style={{ boxShadow: '3px 3px 6px rgba(0,0,0,0.35), inset 1px 1px 2px rgba(255,255,255,0.5)' }}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>

            <button 
              onClick={() => navigate(`/hr/employees/${id}`)}
              className="neu-btn px-4 py-2 rounded-xl bg-gradient-to-b from-slate-500 to-slate-700 text-white font-bold flex items-center gap-2"
              style={{ boxShadow: '3px 3px 6px rgba(0,0,0,0.35)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </button>

            <span className="font-bold text-slate-700 dark:text-slate-300 ml-auto">Empl. ID:</span>
            <span className="text-slate-600 dark:text-slate-400 font-mono">
              {selectedEmployee?.employee_code || id?.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 md:grid-cols-5 border border-[#2f77bb] dark:border-[#4a90c4] rounded-t-xl overflow-hidden"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 font-bold text-sm transition-colors border-r border-[#2f77bb] dark:border-[#4a90c4] last:border-r-0 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white'
                  : 'bg-[#d3e1ef] dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-[#e8eff7] dark:hover:bg-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Content Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-t-0 border-[#2f77bb] dark:border-[#4a90c4] bg-[#d7e5f2] dark:bg-slate-700 rounded-b-xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_170px] gap-5 p-4">
            <div>
              {/* General Info Tab */}
              {activeTab === 'general' && (
                <div className="grid grid-cols-[140px_1fr_140px_1fr] border-t border-l border-[#2f77bb] dark:border-[#4a90c4]">
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Last Name:*</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="last_name" value={formData.last_name} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" required />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">First Name:*</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="first_name" value={formData.first_name} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" required />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Address:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600" style={{ gridColumn: 'span 3' }}>
                    <input name="address_line1" value={formData.address_line1} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">City:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="city" value={formData.city} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">State:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="state" value={formData.state} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Zip Code:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="postal_code" value={formData.postal_code} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Email:*</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" required />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Cell Phone:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="phone" value={formData.phone} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Status:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <select name="employment_status" value={formData.employment_status} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                      <option value="suspended">Suspended</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Other Phone:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="alternative_phone" value={formData.alternative_phone} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Position:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="position" value={formData.position} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" placeholder="e.g., Cleaner, Supervisor" />
                  </div>
                </div>
              )}

              {/* Employment Tab */}
              {activeTab === 'employment' && (
                <div className="grid grid-cols-[140px_1fr_140px_1fr] border-t border-l border-[#2f77bb] dark:border-[#4a90c4]">
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Department:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <select name="department" value={formData.department} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none">
                      <option value="">Select Department</option>
                      <option value="operations">Operations</option>
                      <option value="cleaning">Cleaning</option>
                      <option value="administration">Administration</option>
                      <option value="sales">Sales</option>
                      <option value="hr">Human Resources</option>
                      <option value="finance">Finance</option>
                    </select>
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Emp. Type:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <select name="employment_type" value={formData.employment_type} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none">
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="temporary">Temporary</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Date Hired:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input type="date" name="date_of_hire" value={formData.date_of_hire} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Gender:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <select name="gender" value={formData.gender} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Emergency Tab */}
              {activeTab === 'emergency' && (
                <div className="grid grid-cols-[140px_1fr_140px_1fr] border-t border-l border-[#2f77bb] dark:border-[#4a90c4]">
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Contact Name:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Phone:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Relation:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600" style={{ gridColumn: 'span 3' }}>
                    <input name="emergency_contact_relation" value={formData.emergency_contact_relation} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" />
                  </div>
                </div>
              )}

              {/* Banking Tab */}
              {activeTab === 'banking' && (
                <div className="grid grid-cols-[140px_1fr_140px_1fr] border-t border-l border-[#2f77bb] dark:border-[#4a90c4]">
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Bank Name:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="bank_name" value={formData.bank_name} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Account No:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="bank_account_number" value={formData.bank_account_number} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">Branch Code:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="bank_branch_code" value={formData.bank_branch_code} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" />
                  </div>
                  <div className="cell label-cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center justify-end px-4 bg-[#d7e5f2] dark:bg-slate-600 font-bold text-slate-700 dark:text-slate-200">ID Number:</div>
                  <div className="cell border-r border-b border-[#2f77bb] dark:border-[#4a90c4] min-h-[38px] flex items-center px-2 bg-[#dce8f5] dark:bg-slate-600">
                    <input name="id_number" value={formData.id_number} onChange={handleChange} className="w-full border-none bg-[#f7f7c2] dark:bg-yellow-50 dark:text-slate-800 h-[25px] px-2 outline-none" />
                  </div>
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="p-4">
                  <button onClick={handleAddAttachmentClick} disabled={uploadingFiles}
                    className="neu-btn px-6 py-3 rounded-xl bg-gradient-to-b from-[#4f8fd0] to-[#2d5f98] text-white font-bold flex items-center gap-2 mb-4"
                    style={{ boxShadow: '3px 3px 6px rgba(0,0,0,0.35)' }}>
                    {uploadingFiles ? <><Loader className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-5 h-5" /> Select Files from Device</>}
                  </button>
                </div>
              )}

              {/* Hidden file inputs */}
              <input type="file" multiple ref={attachmentInputRef} onChange={handleFileSelect} className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv,.ppt,.pptx" />

              {/* Attachments Table */}
              <div className="mt-4 border border-[#2f77bb] dark:border-[#4a90c4] rounded-lg overflow-hidden">
                <div className="flex flex-wrap gap-2 p-3 bg-[#c9dff2] dark:bg-slate-600 border-b border-[#2f77bb] dark:border-[#4a90c4]">
                  <button onClick={handleAddAttachmentClick} disabled={uploadingFiles}
                    className="neu-btn px-3 py-1.5 rounded-lg bg-gradient-to-b from-[#4f8fd0] to-[#2d5f98] text-white text-sm font-bold flex items-center gap-1 disabled:opacity-50"
                    style={{ boxShadow: '3px 3px 6px rgba(0,0,0,0.35)' }}>
                    <Paperclip className="w-4 h-4" /> Add Att.
                  </button>
                </div>
                <table className="w-full border-collapse bg-white dark:bg-slate-800">
                  <thead>
                    <tr>
                      <th className="border border-[#2f77bb] dark:border-[#4a90c4] p-2 bg-[#d4e6f7] dark:bg-slate-600 text-sm text-left">File Name</th>
                      <th className="border border-[#2f77bb] dark:border-[#4a90c4] p-2 bg-[#d4e6f7] dark:bg-slate-600 text-sm text-left">Type</th>
                      <th className="border border-[#2f77bb] dark:border-[#4a90c4] p-2 bg-[#d4e6f7] dark:bg-slate-600 text-sm text-left">Size</th>
                      <th className="border border-[#2f77bb] dark:border-[#4a90c4] p-2 bg-[#d4e6f7] dark:bg-slate-600 text-sm text-center">👁 View</th>
                      <th className="border border-[#2f77bb] dark:border-[#4a90c4] p-2 bg-[#d4e6f7] dark:bg-slate-600 text-sm text-center">🗑</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.length === 0 ? (
                      <tr><td colSpan="5" className="border border-[#2f77bb] dark:border-[#4a90c4] p-4 text-center text-slate-500 italic bg-[#f7fbff] dark:bg-slate-700">No attachments</td></tr>
                    ) : (
                      attachments.map((att) => (
                        <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="border border-[#2f77bb] dark:border-[#4a90c4] p-2 text-sm">
                            <div className="flex items-center gap-2">{getFileIcon(att.type)}<span className="truncate max-w-[180px]" title={att.name}>{att.name}</span></div>
                          </td>
                          <td className="border border-[#2f77bb] dark:border-[#4a90c4] p-2 text-sm">{att.type || 'FILE'}</td>
                          <td className="border border-[#2f77bb] dark:border-[#4a90c4] p-2 text-sm">{formatFileSize(att.size)}</td>
                          <td className="border border-[#2f77bb] dark:border-[#4a90c4] p-2 text-center">
                            <button onClick={() => handleViewDocument(att)} className="text-[#0066cc] hover:text-[#004499] inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50">
                              <ExternalLink className="w-4 h-4" /><span className="text-xs">View</span>
                            </button>
                          </td>
                          <td className="border border-[#2f77bb] dark:border-[#4a90c4] p-2 text-center">
                            <button onClick={() => handleDeleteAttachment(att.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Photo Panel */}
            <div className="border border-[#2f77bb] dark:border-[#4a90c4] bg-[#dce8f5] dark:bg-slate-600 flex flex-col items-center justify-center p-4 rounded-lg">
              <div className="w-[150px] h-[170px] border-[3px] border-[#3569a3] dark:border-[#4a90c4] bg-[#edf3f9] dark:bg-slate-700 flex items-center justify-center overflow-hidden rounded-lg">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <img src="https://cdn-icons-png.flaticon.com/512/847/847969.png" alt="Default" className="w-20 h-20 opacity-50" />
                )}
              </div>
              <button onClick={handlePhotoClick} className="mt-4 text-[#0066cc] dark:text-[#6ba3d6] font-bold cursor-pointer hover:underline flex items-center gap-1 bg-transparent border-none">
                <Camera className="w-4 h-4" /> Change Picture
              </button>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" ref={photoInputRef} />
              {photoFile && <p className="text-xs text-emerald-600 mt-1">📷 New photo ready</p>}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
