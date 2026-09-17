import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, FileText, Lock, Unlock, ZoomIn, ZoomOut, RotateCw, Printer, AlertCircle } from 'lucide-react'
import { documentsApi } from '../api/documentsApi'
import toast from 'react-hot-toast'

export default function DocumentViewer({ document: doc, userRole, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewData, setViewData] = useState(null)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [convertingPdf, setConvertingPdf] = useState(false)
  const iframeRef = useRef(null)

  useEffect(() => {
    if (!doc) return
    loadDocument()
    return () => {
      // Cleanup blob URLs
      if (viewData?.isBlob && viewData?.viewUrl) {
        URL.revokeObjectURL(viewData.viewUrl)
      }
    }
  }, [doc])

  const loadDocument = async () => {
    setLoading(true)
    setError(null)
    console.log('🔍 Loading document for viewer:', doc.document_name)

    const result = await documentsApi.getDocumentForViewing(doc, userRole)
    
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setViewData(result.data)
    setLoading(false)
  }

  const handleDownloadOriginal = async () => {
    setDownloading(true)
    const result = await documentsApi.downloadDocument(doc, userRole)
    if (result.error) toast.error(result.error)
    else toast.success('Downloaded!')
    setDownloading(false)
  }

  const handleDownloadPdf = async () => {
    setConvertingPdf(true)
    const result = await documentsApi.downloadAsPdf(doc, userRole)
    if (result.error) toast.error(result.error)
    else if (result.note) toast.success(result.note, { duration: 5000 })
    else toast.success('PDF downloaded!')
    setConvertingPdf(false)
  }

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      try { iframeRef.current.contentWindow.print() } catch (e) { window.print() }
    } else {
      window.print()
    }
  }

  // Determine file type category
  const fileType = doc?.file_type || ''
  const fileName = (doc?.document_name || '').toLowerCase()
  const isPdf = fileType === 'application/pdf' || fileName.endsWith('.pdf')
  const isImage = fileType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(fileName)
  const isText = fileType.startsWith('text/') || /\.(txt|md|csv|json|log)$/i.test(fileName)

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-500 text-sm">Loading document...</p>
            {doc?.is_encrypted && <p className="text-xs text-amber-600 mt-2">🔓 Decrypting securely...</p>}
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Cannot View Document</h3>
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <button onClick={handleDownloadOriginal} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">
                Download Original
              </button>
              <button onClick={handleDownloadPdf} className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium">
                Download as PDF
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (!viewData?.viewUrl) return null

    // PDF viewer
    if (isPdf) {
      return (
        <div className="flex-1 relative bg-slate-100 dark:bg-slate-900 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center p-2"
            style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, transition: 'transform 0.2s' }}>
            <iframe
              ref={iframeRef}
              src={`${viewData.viewUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=${zoom}`}
              className="w-full h-full rounded-lg border-0 bg-white shadow-lg"
              title={doc.document_name}
            />
          </div>
        </div>
      )
    }

    // Image viewer
    if (isImage) {
      return (
        <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 p-4 flex items-center justify-center">
          <img
            src={viewData.viewUrl}
            alt={doc.document_name}
            className="max-w-none shadow-lg rounded-lg"
            style={{ 
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s'
            }}
          />
        </div>
      )
    }

    // Text viewer
    if (isText) {
      return <TextPreview viewData={viewData} zoom={zoom} />
    }

    // Office documents & other formats - offer options
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <FileText className="w-20 h-20 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{doc.document_name}</h3>
          <p className="text-slate-500 text-sm mb-6">
            This file type cannot be previewed inline. You can download it or convert it to PDF.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button 
              onClick={handleDownloadOriginal} 
              disabled={downloading}
              className="px-5 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download Original'}
            </button>
            <button 
              onClick={handleDownloadPdf} 
              disabled={convertingPdf}
              className="px-5 py-3 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {convertingPdf ? 'Converting...' : 'Download as PDF'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-800 w-full h-full sm:rounded-2xl sm:max-w-6xl sm:max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex-1 min-w-0 mr-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-800 dark:text-white truncate text-sm sm:text-base">
                  {doc?.document_name}
                </h3>
                {doc?.is_encrypted ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex-shrink-0">
                    <Lock className="w-3 h-3" /> Encrypted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 flex-shrink-0">
                    <Unlock className="w-3 h-3" /> Plain
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                {doc?.document_folders?.folder_name && `📁 ${doc.document_folders.folder_name} • `}
                {doc?.document_type} • v{doc?.version_number || 1}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Zoom controls for PDF/Image */}
              {(isPdf || isImage) && !loading && !error && (
                <>
                  <button onClick={() => setZoom(z => Math.max(25, z - 25))} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Zoom Out">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-500 w-10 text-center">{zoom}%</span>
                  <button onClick={() => setZoom(z => Math.min(300, z + 25))} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Zoom In">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Rotate">
                    <RotateCw className="w-4 h-4" />
                  </button>
                  {isPdf && (
                    <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Print">
                      <Printer className="w-4 h-4" />
                    </button>
                  )}
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                </>
              )}

              {/* Download buttons */}
              <button
                onClick={handleDownloadPdf}
                disabled={convertingPdf}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-medium disabled:opacity-50"
                title="Download as PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                {convertingPdf ? 'PDF...' : 'PDF'}
              </button>
              <button
                onClick={handleDownloadOriginal}
                disabled={downloading}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium disabled:opacity-50"
                title="Download Original"
              >
                <Download className="w-3.5 h-3.5" />
                {downloading ? '...' : 'Download'}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-600"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preview Area */}
          {renderPreview()}

          {/* Footer actions (mobile) */}
          <div className="sm:hidden flex gap-2 p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <button
              onClick={handleDownloadPdf}
              disabled={convertingPdf}
              className="flex-1 py-3 rounded-xl bg-purple-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" /> {convertingPdf ? '...' : 'Download PDF'}
            </button>
            <button
              onClick={handleDownloadOriginal}
              disabled={downloading}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> {downloading ? '...' : 'Original'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Text file preview with dynamic content loading
function TextPreview({ viewData, zoom }) {
  const [text, setText] = useState('')
  const [loadingText, setLoadingText] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(viewData.viewUrl)
        const txt = await res.text()
        setText(txt)
      } catch (e) {
        setText('Failed to load text content')
      }
      setLoadingText(false)
    }
    load()
  }, [viewData.viewUrl])

  if (loadingText) return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-4">
      <pre className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono"
        style={{ fontSize: `${zoom}%` }}>
        {text}
      </pre>
    </div>
  )
}
