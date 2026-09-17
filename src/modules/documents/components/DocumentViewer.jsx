import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Download, FileText, Lock, Unlock, ZoomIn, ZoomOut, 
  RotateCw, Printer, AlertCircle, FileSpreadsheet, File 
} from 'lucide-react'
import { documentsApi } from '../api/documentsApi'
import toast from 'react-hot-toast'

export default function DocumentViewer({ document: doc, userRole, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [blobUrl, setBlobUrl] = useState(null)
  const [fileBlob, setFileBlob] = useState(null)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [convertingPdf, setConvertingPdf] = useState(false)
  const [renderKey, setRenderKey] = useState(0)
  const docxContainerRef = useRef(null)
  const iframeRef = useRef(null)

  // Determine file type
  const fileType = (doc?.file_type || '').toLowerCase()
  const fileName = (doc?.document_name || '').toLowerCase()
  const ext = fileName.split('.').pop() || ''
  
  const isPdf = fileType === 'application/pdf' || ext === 'pdf'
  const isImage = fileType.startsWith('image/') || ['png','jpg','jpeg','gif','webp','bmp','svg'].includes(ext)
  const isText = fileType.startsWith('text/') || ['txt','md','log','json','xml','csv'].includes(ext)
  const isDocx = ext === 'docx' || fileType.includes('wordprocessingml')
  const isDoc = ext === 'doc' || fileType === 'application/msword'
  const isXlsx = ['xlsx','xls'].includes(ext) || fileType.includes('spreadsheetml') || fileType.includes('ms-excel')

  // Load document on mount
  useEffect(() => {
    if (!doc) return
    loadDocument()
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [doc])

  // Re-render docx when zoom changes
  useEffect(() => {
    if (isDocx && fileBlob && docxContainerRef.current) {
      renderDocx()
    }
  }, [zoom, renderKey])

  const loadDocument = async () => {
    setLoading(true)
    setError(null)
    console.log('🔍 Loading document:', doc.document_name, '| Type:', doc.file_type, '| Encrypted:', doc.is_encrypted)

    const result = await documentsApi.getDocumentBlob(doc, userRole)
    
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    const blob = result.data.blob
    setFileBlob(blob)
    const url = URL.createObjectURL(blob)
    setBlobUrl(url)
    setLoading(false)

    // If DOCX, render after mount
    if (isDocx) {
      setTimeout(() => renderDocx(blob), 100)
    }
  }

  const renderDocx = async (blobOverride = null) => {
    const sourceBlob = blobOverride || fileBlob
    if (!sourceBlob || !docxContainerRef.current) return

    try {
      const { renderAsync } = await import('docx-preview')
      docxContainerRef.current.innerHTML = ''
      
      await renderAsync(sourceBlob, docxContainerRef.current, null, {
        className: 'docx-preview',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: true,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: true,
        experimental: true,
        useBase64URL: true
      })
      
      console.log('✅ DOCX rendered successfully')
    } catch (err) {
      console.error('DOCX render error:', err)
      setError('Failed to render Word document. Try downloading it instead.')
    }
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
    if (isPdf && iframeRef.current?.contentWindow) {
      try { iframeRef.current.contentWindow.print() } catch (e) { window.print() }
    } else if (isDocx && docxContainerRef.current) {
      // Print DOCX rendered HTML
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const styles = Array.from(document.querySelectorAll('style')).map(s => s.innerHTML).join('')
        printWindow.document.write(`
          <html><head><title>${doc.document_name}</title>
          <style>${styles} body { padding: 20px; } .docx-preview { padding: 0; }</style>
          </head><body>${docxContainerRef.current.innerHTML}</body></html>
        `)
        printWindow.document.close()
        setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
      }
    } else {
      window.print()
    }
  }

  // ============================================
  // RENDER PREVIEW BASED ON FILE TYPE
  // ============================================
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
            <div className="flex gap-2 justify-center flex-wrap">
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

    // PDF
    if (isPdf && blobUrl) {
      return (
        <div className="flex-1 bg-slate-100 dark:bg-slate-900 overflow-hidden">
          <div className="w-full h-full flex items-center justify-center p-2"
            style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, transition: 'transform 0.2s', transformOrigin: 'center center' }}>
            <iframe
              ref={iframeRef}
              src={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-full h-full rounded-lg border-0 bg-white shadow-lg"
              title={doc.document_name}
            />
          </div>
        </div>
      )
    }

    // Image
    if (isImage && blobUrl) {
      return (
        <div className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 p-4 flex items-center justify-center">
          <img src={blobUrl} alt={doc.document_name}
            className="max-w-none shadow-lg rounded-lg"
            style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)`, transition: 'transform 0.2s' }} />
        </div>
      )
    }

    // Text
    if (isText && blobUrl) {
      return <TextPreview url={blobUrl} zoom={zoom} />
    }

    // DOCX - Client-side rendering
    if (isDocx) {
      return (
        <div className="flex-1 overflow-auto bg-slate-200 dark:bg-slate-900 p-4">
          <div className="mx-auto bg-white shadow-2xl" 
            style={{ 
              transform: `scale(${zoom / 100})`, 
              transformOrigin: 'top center',
              transition: 'transform 0.2s',
              width: 'fit-content'
            }}>
            <div 
              ref={docxContainerRef}
              className="docx-wrapper"
              style={{ padding: '20px', minWidth: '700px' }}
            />
          </div>
          <style>{`
            .docx-wrapper { background: white !important; padding: 20px !important; }
            .docx-wrapper > section.docx { 
              box-shadow: none !important; 
              margin-bottom: 20px !important; 
              padding: 40px !important;
              background: white !important;
            }
            .docx-preview { background: white !important; }
          `}</style>
        </div>
      )
    }

    // XLSX / XLS
    if (isXlsx && fileBlob) {
      return <SpreadsheetPreview blob={fileBlob} />
    }

    // DOC (old format) & others - can't render inline
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md">
          <File className="w-20 h-20 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{doc.document_name}</h3>
          <p className="text-slate-500 text-sm mb-6">
            {isDoc 
              ? 'Legacy .doc format cannot be previewed. Please download it or convert to PDF.'
              : 'This file type cannot be previewed inline. Download it or convert to PDF.'}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={handleDownloadOriginal} disabled={downloading}
              className="px-5 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download Original'}
            </button>
            <button onClick={handleDownloadPdf} disabled={convertingPdf}
              className="px-5 py-3 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50">
              <FileText className="w-4 h-4" />
              {convertingPdf ? 'Converting...' : 'Download as PDF'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const canZoom = !loading && !error && (isPdf || isImage || isDocx)

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
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
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
              {canZoom && (
                <>
                  <button onClick={() => setZoom(z => Math.max(25, z - 25))} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Zoom Out">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button onClick={() => setZoom(100)} className="text-xs text-slate-500 w-12 text-center hover:text-slate-800" title="Reset Zoom">
                    {zoom}%
                  </button>
                  <button onClick={() => setZoom(z => Math.min(300, z + 25))} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Zoom In">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  {(isPdf || isImage) && (
                    <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Rotate">
                      <RotateCw className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500" title="Print">
                    <Printer className="w-4 h-4" />
                  </button>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                </>
              )}

              <button onClick={handleDownloadPdf} disabled={convertingPdf}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 text-xs font-medium disabled:opacity-50"
                title="Download as PDF">
                <FileText className="w-3.5 h-3.5" />
                {convertingPdf ? 'PDF...' : 'PDF'}
              </button>
              <button onClick={handleDownloadOriginal} disabled={downloading}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium disabled:opacity-50"
                title="Download Original">
                <Download className="w-3.5 h-3.5" />
                {downloading ? '...' : 'Download'}
              </button>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-600" title="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preview */}
          {renderPreview()}

          {/* Mobile Footer */}
          <div className="sm:hidden flex gap-2 p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <button onClick={handleDownloadPdf} disabled={convertingPdf}
              className="flex-1 py-3 rounded-xl bg-purple-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
              <FileText className="w-4 h-4" /> {convertingPdf ? '...' : 'PDF'}
            </button>
            <button onClick={handleDownloadOriginal} disabled={downloading}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
              <Download className="w-4 h-4" /> {downloading ? '...' : 'Original'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================
// TEXT PREVIEW
// ============================================
function TextPreview({ url, zoom }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(url)
        const txt = await res.text()
        setText(txt)
      } catch (e) {
        setText('Failed to load text content')
      }
      setLoading(false)
    }
    load()
  }, [url])

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-4">
      <pre className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono"
        style={{ fontSize: `${zoom}%` }}>
        {text}
      </pre>
    </div>
  )
}

// ============================================
// SPREADSHEET PREVIEW (XLSX/XLS)
// ============================================
function SpreadsheetPreview({ blob }) {
  const [html, setHtml] = useState('')
  const [sheets, setSheets] = useState([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const XLSX = await import('xlsx')
        const arrayBuffer = await blob.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetNames = workbook.SheetNames
        setSheets(sheetNames)
        
        const firstSheet = workbook.Sheets[sheetNames[0]]
        const htmlContent = XLSX.utils.sheet_to_html(firstSheet, { editable: false })
        setHtml(htmlContent)
      } catch (e) {
        console.error('Spreadsheet render error:', e)
        setHtml('<p style="padding:20px;color:#ef4444;">Failed to render spreadsheet</p>')
      }
      setLoading(false)
    }
    load()
  }, [blob])

  const switchSheet = async (idx) => {
    setActiveSheet(idx)
    try {
      const XLSX = await import('xlsx')
      const arrayBuffer = await blob.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheet = workbook.Sheets[sheets[idx]]
      const htmlContent = XLSX.utils.sheet_to_html(sheet, { editable: false })
      setHtml(htmlContent)
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>

  return (
    <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
      {sheets.length > 1 && (
        <div className="flex gap-1 p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {sheets.map((s, i) => (
            <button key={i} onClick={() => switchSheet(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${activeSheet === i ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">
        <div className="spreadsheet-preview" dangerouslySetInnerHTML={{ __html: html }} />
        <style>{`
          .spreadsheet-preview table { border-collapse: collapse; font-family: 'Inter', sans-serif; font-size: 13px; }
          .spreadsheet-preview td, .spreadsheet-preview th { 
            border: 1px solid #e2e8f0; padding: 6px 10px; color: #1e293b; 
          }
          .spreadsheet-preview tr:nth-child(even) td { background: #f8fafc; }
          .dark .spreadsheet-preview td, .dark .spreadsheet-preview th {
            border-color: #334155; color: #e2e8f0;
          }
          .dark .spreadsheet-preview tr:nth-child(even) td { background: #1e293b; }
        `}</style>
      </div>
    </div>
  )
}
