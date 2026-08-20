import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { documentsApi } from '../api/documentsApi'
import toast from 'react-hot-toast'
import { 
  FolderOpen, FileText, Upload, FileCheck, Shield, 
  BookOpen, Clock, Plus, Search, ArrowLeft, X,
  Sparkles, Sun, Moon, Download, Trash2, Edit, Eye,
  ChevronRight, ChevronLeft, FolderPlus,
  File, Image, FileSpreadsheet, Lock, Unlock
} from 'lucide-react'

export default function DocumentsDashboard() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  
  const [stats, setStats] = useState({})
  const [folders, setFolders] = useState([])
  const [documents, setDocuments] = useState([])
  const [currentFolder, setCurrentFolder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [showAddFolder, setShowAddFolder] = useState(false)
  const [showEditDoc, setShowEditDoc] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  const [newFolder, setNewFolder] = useState({ folder_name: '', folder_type: 'general', description: '' })
  const [editDocData, setEditDocData] = useState({ document_name: '', description: '', document_type: 'other', tags: '', folder_id: '' })

  useEffect(() => {
    loadData()
  }, [currentFolder])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, { data: f }, { data: docs }] = await Promise.all([
        documentsApi.getStats(),
        documentsApi.getFolders(),
        documentsApi.getDocuments(currentFolder?.id || null, { search, type: typeFilter })
      ])
      setStats(statsData)
      setFolders(f || [])
      setDocuments(docs || [])
    } catch (error) {
      console.error('Load error:', error)
    }
    setLoading(false)
  }

  const handleCreateFolder = async () => {
    if (!newFolder.folder_name.trim()) { toast.error('Folder name is required'); return }
    const { data, error } = await documentsApi.createFolder(newFolder)
    if (error) { toast.error('Failed to create folder'); return }
    toast.success('Folder created!')
    setShowAddFolder(false)
    setNewFolder({ folder_name: '', folder_type: 'general', description: '' })
    loadData()
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('File must be less than 20MB'); return }

    setUploading(true)
    try {
      const result = await documentsApi.uploadDocument(file, {
        document_name: file.name,
        folder_id: currentFolder?.id || null,
        document_type: 'other'
      })
      if (result.error) { toast.error(result.error) }
      else { toast.success('Document uploaded successfully!'); loadData() }
    } catch (error) {
      toast.error('Failed to upload document')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleEditDocument = (doc) => {
    setEditDocData({
      document_name: doc.document_name,
      description: doc.description || '',
      document_type: doc.document_type || 'other',
      tags: (doc.tags || []).join(', '),
      folder_id: doc.folder_id || ''
    })
    setShowEditDoc(doc)
  }

  const handleSaveEdit = async () => {
    if (!showEditDoc) return
    const updates = {
      document_name: editDocData.document_name,
      description: editDocData.description,
      document_type: editDocData.document_type,
      tags: editDocData.tags.split(',').map(t => t.trim()).filter(Boolean),
      folder_id: editDocData.folder_id || null,
      updated_at: new Date().toISOString()
    }
    const { error } = await documentsApi.updateDocument(showEditDoc.id, updates)
    if (error) { toast.error('Failed to update'); return }
    toast.success('Document updated!')
    setShowEditDoc(null)
    loadData()
  }

  const handleDeleteDocument = async () => {
    if (!showDeleteConfirm) return
    const { error } = await documentsApi.deleteDocument(showDeleteConfirm.id)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Document moved to archive')
    setShowDeleteConfirm(null)
    loadData()
  }

  const openFolder = (folder) => setCurrentFolder(folder)
  const goBack = () => setCurrentFolder(null)

  const getFileIcon = (fileType) => {
    if (!fileType) return File
    if (fileType.includes('image')) return Image
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return FileSpreadsheet
    if (fileType.includes('pdf')) return FileText
    return File
  }

  const folderIcons = {
    contracts: FileCheck, policies: Shield, sops: BookOpen,
    hr: FileText, finance: FileText, operations: FileText, general: FolderOpen,
  }

  const folderColors = {
    contracts: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    policies: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    sops: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
    hr: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    finance: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    operations: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30',
    general: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30',
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
        <Link to="/dashboard" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Main Dashboard</span>
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FolderOpen className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Document Management</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">Contracts, policies, SOPs, and secure encrypted document storage</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddFolder(true)} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
              <FolderPlus className="w-5 h-5" /><span>New Folder</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
              {uploading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Upload className="w-5 h-5" />}
              <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
          </div>
        </motion.div>

        {/* Breadcrumb */}
        {currentFolder && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <button onClick={goBack} className="text-slate-500 hover:text-emerald-600 flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> All Folders
            </button>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-slate-800 dark:text-white font-medium">{currentFolder.folder_name}</span>
            {currentFolder.is_encrypted && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                <Lock className="w-3 h-3" /> Encrypted
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { icon: FileText, label: 'Total Docs', value: stats.totalDocs || 0, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
            { icon: FileCheck, label: 'Contracts', value: stats.contracts || 0, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { icon: Shield, label: 'Policies', value: stats.policies || 0, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
            { icon: BookOpen, label: 'SOPs', value: stats.sops || 0, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
            { icon: Lock, label: 'Encrypted', value: stats.encryptedDocs || 0, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="neu-raised rounded-2xl p-4">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadData()} placeholder="Search documents..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
            <option value="">All Types</option>
            <option value="contract">Contracts</option>
            <option value="policy">Policies</option>
            <option value="sop">SOPs</option>
            <option value="form">Forms</option>
            <option value="report">Reports</option>
            <option value="manual">Manuals</option>
            <option value="certificate">Certificates</option>
            <option value="other">Other</option>
          </select>
          <button onClick={loadData} className="neu-raised neu-btn px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">Search</button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div><p className="text-slate-500">Loading...</p></div>
        ) : !currentFolder ? (
          /* FOLDERS */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-emerald-600" />Folders ({folders.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {folders.map((folder, i) => {
                const Icon = folderIcons[folder.folder_type] || FolderOpen
                return (
                  <motion.div key={folder.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.03 }} onClick={() => openFolder(folder)}
                    className={`neu-raised rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-all ${folder.is_encrypted ? 'border-l-4 border-amber-500' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className={`w-14 h-14 rounded-xl ${folderColors[folder.folder_type]} flex items-center justify-center`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      {folder.is_encrypted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                          <Lock className="w-3 h-3" /> Encrypted
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-white text-lg">{folder.folder_name}</h3>
                    <p className="text-xs text-slate-500 mt-1 capitalize">{folder.folder_type}</p>
                    {folder.description && <p className="text-xs text-slate-400 mt-1 truncate">{folder.description}</p>}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-slate-400">{folder.created_at ? new Date(folder.created_at).toLocaleDateString() : ''}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        ) : (
          /* DOCUMENTS */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />Documents ({documents.length})
            </h2>
            {documents.length === 0 ? (
              <div className="text-center py-12 neu-raised rounded-3xl">
                <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No documents in this folder</p>
              </div>
            ) : (
              <div className="neu-raised rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <th className="text-left py-3 px-4 text-slate-500 font-medium">Name</th>
                        <th className="text-left py-3 px-4 text-slate-500 font-medium">Type</th>
                        <th className="text-left py-3 px-4 text-slate-500 font-medium">Size</th>
                        <th className="text-left py-3 px-4 text-slate-500 font-medium">Security</th>
                        <th className="text-left py-3 px-4 text-slate-500 font-medium">Status</th>
                        <th className="text-right py-3 px-4 text-slate-500 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map(doc => {
                        const FileIcon = getFileIcon(doc.file_type)
                        return (
                          <tr key={doc.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <FileIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-slate-800 dark:text-white">{doc.document_name}</p>
                                  {doc.description && <p className="text-xs text-slate-500">{doc.description}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4"><span className="px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 capitalize">{doc.document_type}</span></td>
                            <td className="py-3 px-4 text-slate-600">{formatFileSize(doc.file_size)}</td>
                            <td className="py-3 px-4">
                              {doc.is_encrypted ? (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                  <Lock className="w-3 h-3" /> AES-256
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                  <Unlock className="w-3 h-3" /> Plain
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs ${doc.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{doc.status}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => window.open(doc.file_url, '_blank')} className="p-2 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600" title="View"><Eye className="w-4 h-4" /></button>
                                <button onClick={() => handleEditDocument(doc)} className="p-2 rounded-lg hover:bg-purple-100 text-slate-400 hover:text-purple-600" title="Edit"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => setShowDeleteConfirm(doc)} className="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* ADD FOLDER MODAL */}
      <AnimatePresence>
        {showAddFolder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddFolder(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Create New Folder</h3>
                <button onClick={() => setShowAddFolder(false)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <input type="text" value={newFolder.folder_name} onChange={e => setNewFolder({...newFolder, folder_name: e.target.value})} placeholder="Folder Name *" className="w-full p-3 neu-inset rounded-xl" />
                <select value={newFolder.folder_type} onChange={e => setNewFolder({...newFolder, folder_type: e.target.value})} className="w-full p-3 neu-inset rounded-xl">
                  <option value="general">General (No Encryption)</option>
                  <option value="contracts">🔐 Contracts (Encrypted)</option>
                  <option value="finance">🔐 Financial (Encrypted)</option>
                  <option value="hr">🔐 HR Documents (Encrypted)</option>
                  <option value="policies">Policies (No Encryption)</option>
                  <option value="sops">SOPs (No Encryption)</option>
                  <option value="operations">Operations (No Encryption)</option>
                </select>
                <textarea value={newFolder.description} onChange={e => setNewFolder({...newFolder, description: e.target.value})} rows={2} placeholder="Description..." className="w-full p-3 neu-inset rounded-xl" />
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowAddFolder(false)} className="px-4 py-2 rounded-xl bg-slate-300">Cancel</button>
                  <button onClick={handleCreateFolder} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Create</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT DOCUMENT MODAL */}
      <AnimatePresence>
        {showEditDoc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditDoc(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Edit Document</h3>
              <div className="space-y-3">
                <input type="text" value={editDocData.document_name} onChange={e => setEditDocData({...editDocData, document_name: e.target.value})} className="w-full p-3 neu-inset rounded-xl" />
                <select value={editDocData.document_type} onChange={e => setEditDocData({...editDocData, document_type: e.target.value})} className="w-full p-3 neu-inset rounded-xl">
                  <option value="contract">Contract</option><option value="policy">Policy</option><option value="sop">SOP</option>
                  <option value="form">Form</option><option value="report">Report</option><option value="other">Other</option>
                </select>
                <select value={editDocData.folder_id} onChange={e => setEditDocData({...editDocData, folder_id: e.target.value})} className="w-full p-3 neu-inset rounded-xl">
                  <option value="">No Folder</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.folder_name}{f.is_encrypted ? ' 🔐' : ''}</option>)}
                </select>
                <textarea value={editDocData.description} onChange={e => setEditDocData({...editDocData, description: e.target.value})} rows={2} className="w-full p-3 neu-inset rounded-xl" />
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowEditDoc(null)} className="px-4 py-2 rounded-xl bg-slate-300">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-4 py-2 rounded-xl bg-emerald-600 text-white">Save</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
              <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">Delete Document?</h3>
              <p className="text-slate-500 text-sm mb-4">"{showDeleteConfirm.document_name}"</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-xl bg-slate-300">Cancel</button>
                <button onClick={handleDeleteDocument} className="px-4 py-2 rounded-xl bg-red-600 text-white">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
