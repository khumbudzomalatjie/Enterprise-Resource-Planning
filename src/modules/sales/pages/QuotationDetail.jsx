import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useSalesStore from '../store/salesStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  Download, Edit, FileText, Printer, X, Trash2, AlertTriangle,
  Sun, Moon, Sparkles, ChevronRight,
  CheckCircle, XCircle, Send, Maximize2, Briefcase
} from 'lucide-react'

const COMPANY = {
  name: 'NDANDULENI GROUP',
  tagline: 'Professional Cleaning & Hygiene Services',
  address: '2220 Manthata Street, Midrand, 1685',
  phone: '070 419 9457',
  fax: '086 555 1234',
  email: 'account@ndandulenigroup.co.za',
  website: 'www.ndandulenigroup.co.za',
  registration: '2020/123456/07',
  vatNumber: '4567890123',
  bank: 'First National Bank (FNB)',
  branch: 'Midrand (250655)',
  accountNumber: '6277 123 45678',
  accountType: 'Business Cheque Account',
}

const DEFAULT_TERMS = [
  'Prices subject to change without prior notice.',
  'Goods supplied remain company property until fully paid.',
  'Returns subject to company policy.',
  'Quote valid for 30 days from date of issue.',
  'Errors and omissions excepted (E&OE).',
]

const A4_WIDTH_PX = 794
const A4_HEIGHT_PX = 1123

// ═══════════════════════════════════════════════
// BUILD HTML STRING
// ═══════════════════════════════════════════════
function buildHTML(quotation, items) {
  const fmt = (a) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(a || 0)
  const fd = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  const lt = (i) => (i.quantity||0)*(i.unit_price||0)
  const da = (i) => lt(i)*((i.discount_percent||0)/100)
  const ad = (i) => lt(i)-da(i)
  const va = (i) => ad(i)*((i.tax_percent||15)/100)
  const gt = (i) => ad(i)+va(i)
  const sub = items.reduce((s,i)=>s+lt(i),0)
  const tdisc = items.reduce((s,i)=>s+da(i),0)
  const tvat = items.reduce((s,i)=>s+va(i),0)
  const total = sub-tdisc+tvat

  const qn = quotation?.quotation_number||'DRAFT'
  const cn = quotation?.created_by_name||quotation?.prepared_by_name||'Sales Department'

  const rows = items.map((item,i)=>`<tr><td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:center">${i+1}</td><td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:center">${item.code||''}</td><td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:left">${item.description}${item.unit_price===0?' <span style="color:#059669;font-weight:bold">(FREE)</span>':''}</td><td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td><td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:center">${item.unit||'each'}</td><td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(item.unit_price)}</td><td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:center">${item.discount_percent||0}%</td><td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:center">${item.tax_percent||15}%</td><td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>${fmt(gt(item))}</strong></td></tr>`).join('')

  return `<div style="width:${A4_WIDTH_PX}px;min-height:${A4_HEIGHT_PX}px;padding:28px 40px;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#1a1a1a;line-height:1.3;box-sizing:border-box;display:flex;flex-direction:column">
<div style="display:flex;justify-content:space-between;border-bottom:2px solid #1B5080;padding-bottom:8px;margin-bottom:8px">
<div style="display:flex;align-items:flex-start;gap:14px">
<img src="/logo.png" alt="Logo" style="width:90px;height:auto;object-fit:contain" onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<div style=width:90px;height:50px;background:#e8f0f8;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:16px;font-weight:bold;color:#1B5080;border:1px solid #c5d5e8;flex-shrink:0>NG</div>')" />
<div>
<h1 style="font-size:20px;font-weight:bold;color:#0D2D4A;margin:0">${COMPANY.name}</h1>
<p style="font-size:7px;color:#64748b;margin:0">${COMPANY.tagline}</p>
<p style="font-size:7px;color:#64748b;margin:0">${COMPANY.address}</p>
<p style="font-size:7px;color:#64748b;margin:0">Tel: ${COMPANY.phone} | Email: ${COMPANY.email}</p>
<p style="font-size:7px;color:#64748b;margin:0">Reg: ${COMPANY.registration} | VAT: ${COMPANY.vatNumber}</p>
</div>
</div>
<div style="text-align:right;flex-shrink:0">
<h2 style="font-size:28px;font-weight:bold;color:#0D2D4A;margin:0;letter-spacing:2px">QUOTATION</h2>
<p style="font-size:14px;color:#1B5080;font-weight:bold;margin:3px 0">Quotation No: ${qn}</p>
<div style="font-size:8px;color:#64748b"><p style="margin:0">Date: ${fd(quotation?.quotation_date)}</p><p style="margin:0">Expiry: ${fd(quotation?.valid_until)}</p><p style="margin:0">Salesperson: ${cn}</p><p style="margin:0">Branch: Johannesburg</p><p style="margin:0">Currency: ZAR</p><p style="margin:0">Status: ${quotation?.status||'Draft'}</p></div>
</div>
</div>
<div style="display:flex;gap:8px;margin-bottom:6px">
<div style="flex:1;border:1px solid #d1d5db;border-radius:4px;padding:6px 8px"><div style="font-size:8px;font-weight:bold;color:#1B5080;text-transform:uppercase;margin-bottom:3px;border-bottom:1px solid #e5e7eb;padding-bottom:2px">Customer Details</div><p style="font-size:8px;margin:2px 0"><strong>Customer:</strong> ${quotation?.client_name||''}</p><p style="font-size:8px;margin:2px 0"><strong>Phone:</strong> ${quotation?.client_phone||''}</p><p style="font-size:8px;margin:2px 0"><strong>Email:</strong> ${quotation?.client_email||''}</p><p style="font-size:8px;margin:2px 0"><strong>Address:</strong> ${quotation?.client_address||''}</p></div>
<div style="flex:1;border:1px solid #d1d5db;border-radius:4px;padding:6px 8px"><div style="font-size:8px;font-weight:bold;color:#1B5080;text-transform:uppercase;margin-bottom:3px;border-bottom:1px solid #e5e7eb;padding-bottom:2px">Quote Information</div><p style="font-size:8px;margin:2px 0"><strong>Quote No:</strong> ${qn}</p><p style="font-size:8px;margin:2px 0"><strong>Date:</strong> ${fd(quotation?.quotation_date)}</p><p style="font-size:8px;margin:2px 0"><strong>Terms:</strong> ${quotation?.payment_terms||'50% Deposit'}</p><p style="font-size:8px;margin:2px 0"><strong>Sales Rep:</strong> ${cn}</p><p style="font-size:8px;margin:2px 0"><strong>Branch:</strong> Johannesburg</p></div>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:6px"><thead><tr style="background:#1B5080;color:#fff"><th style="padding:5px 6px;font-size:8px;font-weight:bold;text-transform:uppercase;text-align:center">No</th><th style="padding:5px 6px;font-size:8px;font-weight:bold;text-transform:uppercase;text-align:center">Code</th><th style="padding:5px 6px;font-size:8px;font-weight:bold;text-transform:uppercase;text-align:left">Description</th><th style="padding:5px 6px;font-size:8px;font-weight:bold;text-transform:uppercase;text-align:center">Qty</th><th style="padding:5px 6px;font-size:8px;font-weight:bold;text-transform:uppercase;text-align:center">Unit</th><th style="padding:5px 6px;font-size:8px;font-weight:bold;text-transform:uppercase;text-align:right">Unit Price</th><th style="padding:5px 6px;font-size:8px;font-weight:bold;text-transform:uppercase;text-align:center">Disc</th><th style="padding:5px 6px;font-size:8px;font-weight:bold;text-transform:uppercase;text-align:center">VAT</th><th style="padding:5px 6px;font-size:8px;font-weight:bold;text-transform:uppercase;text-align:right">Total</th></tr></thead><tbody>${rows||'<tr><td colspan="9" style="padding:20px;text-align:center;font-size:9px;color:#94a3b8">No items</td></tr>'}</tbody></table>
<div style="display:flex;justify-content:flex-end;margin-bottom:6px"><div style="width:240px;border:1px solid #d1d5db;border-radius:4px;overflow:hidden"><div style="display:flex;justify-content:space-between;padding:5px 10px;border-bottom:1px solid #e5e7eb;font-size:8px"><span>Subtotal</span><span style="font-weight:600">${fmt(sub)}</span></div><div style="display:flex;justify-content:space-between;padding:5px 10px;border-bottom:1px solid #e5e7eb;font-size:8px"><span>Discount</span><span style="color:#ef4444">-${fmt(tdisc)}</span></div><div style="display:flex;justify-content:space-between;padding:5px 10px;border-bottom:1px solid #e5e7eb;font-size:8px"><span>VAT (15%)</span><span>${fmt(tvat)}</span></div><div style="display:flex;justify-content:space-between;padding:8px 10px;font-size:14px;font-weight:bold;background:#eaf1f8"><span style="color:#0D2D4A">Grand Total</span><span style="color:#0D2D4A;font-size:16px">${fmt(total)}</span></div></div></div>
${quotation?.notes?`<div style="border:1px solid #d1d5db;border-radius:4px;padding:6px 8px;margin-bottom:6px"><div style="font-size:8px;font-weight:bold;color:#1B5080;text-transform:uppercase;margin-bottom:2px;border-bottom:1px solid #e5e7eb;padding-bottom:2px">Notes</div><p style="font-size:8px;white-space:pre-line;margin:0">${quotation.notes}</p></div>`:''}
<div style="display:flex;gap:8px;margin-bottom:4px;margin-top:auto">
<div style="flex:1"><div style="font-size:8px;font-weight:bold;color:#1B5080;text-transform:uppercase;margin-bottom:2px">Terms & Conditions</div><p style="white-space:pre-line;font-size:7px;color:#64748b;margin:0">${quotation?.terms_and_conditions||DEFAULT_TERMS.join('\n')}</p></div>
<div style="flex:1"><div style="font-size:8px;font-weight:bold;color:#1B5080;text-transform:uppercase;margin-bottom:2px">Banking Details</div><p style="font-size:7px;margin:0"><strong>Bank:</strong> ${COMPANY.bank}</p><p style="font-size:7px;margin:0"><strong>Branch:</strong> ${COMPANY.branch}</p><p style="font-size:7px;margin:0"><strong>Account:</strong> ${COMPANY.accountNumber}</p><p style="font-size:7px;margin:0"><strong>Type:</strong> ${COMPANY.accountType}</p><p style="font-size:7px;margin:0"><strong>Ref:</strong> ${qn}</p></div>
</div>
<div style="border-top:1px solid #d1d5db;padding-top:4px;text-align:center;font-size:7px;color:#94a3b8"><p style="margin:0">${COMPANY.website} | ${COMPANY.email} | ${COMPANY.phone}</p><p style="margin:0">Page 1 of 1</p></div>
</div>`
}

// ═══════════════════════════════════════════════
// QUOTATION DETAIL PAGE
// ═══════════════════════════════════════════════
export default function QuotationDetail() {
  const { id } = useParams()
  const { selectedQuotation, fetchQuotation, updateQuotationStatus, deleteQuotation, acceptQuotation, loading } = useSalesStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const previewRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false)
  const [scale, setScale] = useState(0.55)

  useEffect(() => { if (id) fetchQuotation(id) }, [id])

  useEffect(() => {
    const calc = () => {
      if (previewRef.current) {
        const w = previewRef.current.clientWidth - 32
        setScale(Math.max(0.25, Math.min(w / A4_WIDTH_PX, 0.65)))
      }
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  const fc = (a) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(a || 0)
  const fd = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'

  const handleStatusChange = async (s) => {
    if (s === 'accepted') { setShowAcceptConfirm(true); return }
    const r = await updateQuotationStatus(id, s)
    r.success ? (toast.success('Updated'), fetchQuotation(id)) : toast.error('Failed')
  }
  const handleAccept = async () => {
    const r = await acceptQuotation(id)
    r.success ? (toast.success('Accepted! 🎉'), navigate('/sales/quotations')) : toast.error('Failed')
    setShowAcceptConfirm(false)
  }
  const handleDelete = async () => {
    const r = await deleteQuotation(id)
    r.success ? (toast.success('Deleted'), navigate('/sales/quotations')) : toast.error('Failed')
    setShowDeleteConfirm(false)
  }

  // ═══════════════════════════════════════════════
  // PDF & PRINT - Renders full A4 temporarily
  // ═══════════════════════════════════════════════
  const captureAndDownload = async () => {
    if (!selectedQuotation) return
    toast.loading('Generating PDF...')

    try {
      const html = buildHTML(selectedQuotation, selectedQuotation.quotation_items || [])

      // Create a FULL-SIZE visible container at the top of the page
      const container = document.createElement('div')
      container.innerHTML = html
      container.id = 'pdf-capture-' + Date.now()
      container.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: ${A4_WIDTH_PX}px;
        z-index: 99999;
        background: white;
        overflow: visible;
      `
      document.body.appendChild(container)

      // Wait for render
      await new Promise(r => setTimeout(r, 600))

      // Capture with html2canvas
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: A4_WIDTH_PX,
        logging: false
      })

      // Remove the temporary container
      document.body.removeChild(container)

      // Create PDF from canvas
      const { default: jsPDF } = await import('jspdf')
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // If content fits on one page, put it on one page
      if (imgHeight <= 297) {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
      } else {
        // Multiple pages if needed
        let heightLeft = imgHeight
        let position = 0
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
        heightLeft -= 297
        while (heightLeft > 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
          heightLeft -= 297
        }
      }

      pdf.save(`Quotation_${selectedQuotation.quotation_number || 'download'}.pdf`)
      toast.dismiss()
      toast.success('PDF downloaded! 📄')
    } catch (e) {
      console.error('PDF error:', e)
      toast.dismiss()
      toast.error('Failed: ' + e.message)
    }
  }

  const printQuotation = () => {
    if (!selectedQuotation) return
    const html = buildHTML(selectedQuotation, selectedQuotation.quotation_items || [])
    const w = window.open('', '_blank')
    if (!w) { toast.error('Allow popups'); return }
    w.document.write(`<!DOCTYPE html><html><head><title>Quotation</title><style>@page{size:A4 portrait;margin:0}*{margin:0;padding:0;box-sizing:border-box}body{display:flex;justify-content:center;background:white;font-family:Arial,sans-serif}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>${html}</body></html>`)
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 800)
  }

  if (loading || !selectedQuotation) {
    return (
      <div className={`min-h-screen font-['Inter'] ${isDark ? 'dark' : ''}`}>
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div><p className="text-slate-500 text-lg">Loading...</p></div>
      </div>
    )
  }

  const quote = selectedQuotation
  const quoteHTML = buildHTML(quote, quote.quotation_items || [])

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-gray-900/95 flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700">
            <span className="text-white font-semibold">{quote.quotation_number}</span>
            <div className="flex gap-3">
              <button onClick={captureAndDownload} className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm"><Download className="w-4 h-4" /> PDF</button>
              <button onClick={() => setIsFullscreen(false)} className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 text-sm"><X className="w-4 h-4" /> Close</button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-gray-900">
            <div className="bg-white shadow-2xl" style={{ transform: `scale(${Math.min(1, (window.innerHeight - 100) / A4_HEIGHT_PX)})`, transformOrigin: 'center center' }} dangerouslySetInnerHTML={{ __html: quoteHTML }} />
          </div>
        </div>
      )}

      {showAcceptConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="neu-raised rounded-3xl p-8 max-w-lg w-full bg-white dark:bg-slate-800">
            <div className="text-center"><div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4"><Briefcase className="w-10 h-10 text-emerald-600" /></div><h3 className="text-2xl font-bold mb-2">Accept & Create Job?</h3><div className="bg-amber-50 rounded-2xl p-4 mb-4 text-left"><div className="flex items-start gap-2"><AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" /><div><p className="text-sm font-semibold text-amber-800">Important:</p><ul className="text-xs text-amber-700 mt-1 list-disc list-inside"><li>Quotation marked as <strong>Accepted</strong></li><li>A <strong>Job</strong> will be created</li></ul></div></div></div><div className="flex gap-3"><button onClick={() => setShowAcceptConfirm(false)} className="flex-1 neu-raised neu-btn px-6 py-3 rounded-xl">Cancel</button><button onClick={handleAccept} className="flex-1 neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" />Yes, Accept</button></div></div>
          </motion.div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="neu-raised rounded-3xl p-8 max-w-md w-full bg-white dark:bg-slate-800">
            <div className="text-center"><div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8 text-red-600" /></div><h3 className="text-xl font-bold mb-2">Delete?</h3><p className="text-slate-500 mb-6">Cannot be undone.</p><div className="flex gap-3"><button onClick={() => setShowDeleteConfirm(false)} className="flex-1 neu-raised neu-btn px-6 py-3 rounded-xl">Cancel</button><button onClick={handleDelete} className="flex-1 neu-raised neu-btn px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" />Delete</button></div></div>
          </motion.div>
        </div>
      )}

      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /><span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span></div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">{isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}</button>
      </div>

      <main className="max-w-7xl mx-auto px-4 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/sales" className="text-slate-500 hover:text-emerald-600">Sales</Link><ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/sales/quotations" className="text-slate-500 hover:text-emerald-600">Quotations</Link><ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{quote.quotation_number}</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-3xl font-bold flex items-center gap-3"><FileText className="w-8 h-8 text-emerald-600" />{quote.quotation_number}</h1><p className="text-slate-500 mt-1">{quote.client_name} · {fd(quote.quotation_date)} · <span className="font-semibold text-emerald-600 ml-2">{fc(quote.total_amount)}</span></p></div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setIsFullscreen(true)} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"><Maximize2 className="w-4 h-4" /></button>
            <button onClick={captureAndDownload} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"><Download className="w-4 h-4" />PDF</button>
            <button onClick={printQuotation} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"><Printer className="w-4 h-4" />Print</button>
            <button onClick={() => navigate(`/sales/quotations/${id}/edit`)} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2"><Edit className="w-4 h-4" /></button>
            <button onClick={() => setShowDeleteConfirm(true)} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-4">
          <span className="text-sm">Status:</span><span className={`px-3 py-1 rounded-full text-sm font-medium ${quote.status==='accepted'?'bg-emerald-100 text-emerald-700':quote.status==='sent'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-700'}`}>{quote.status?.replace('_',' ')}</span>
          <div className="border-l pl-4 flex gap-2">
            {quote.status!=='sent'&&<button onClick={()=>handleStatusChange('sent')} className="px-3 py-1 rounded-lg text-xs hover:bg-blue-100"><Send className="w-3 h-3 inline mr-1"/>Mark Sent</button>}
            {quote.status!=='accepted'&&<button onClick={()=>handleStatusChange('accepted')} className="px-3 py-1 rounded-lg text-xs hover:bg-emerald-100"><Briefcase className="w-3 h-3 inline mr-1"/>Accept→Job</button>}
            {quote.status!=='rejected'&&<button onClick={()=>handleStatusChange('rejected')} className="px-3 py-1 rounded-lg text-xs hover:bg-red-100"><XCircle className="w-3 h-3 inline mr-1"/>Reject</button>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[{l:'Client',v:quote.client_name},{l:'Date',v:fd(quote.quotation_date)},{l:'Valid Until',v:fd(quote.valid_until)},{l:'Total',v:fc(quote.total_amount),hl:true}].map((c,i)=>(<div key={i} className="neu-raised rounded-2xl p-4"><p className="text-xs uppercase text-slate-500">{c.l}</p><p className={`font-semibold mt-1 ${c.hl?'text-emerald-600 text-lg':''}`}>{c.v}</p></div>))}
        </div>

        <div className="neu-raised rounded-3xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Items</h2>
          <table className="w-full"><thead><tr className="border-b"><th className="text-left text-xs py-3 px-3">#</th><th className="text-left text-xs py-3 px-3">Description</th><th className="text-center text-xs py-3 px-3">Qty</th><th className="text-right text-xs py-3 px-3">Unit Price</th><th className="text-right text-xs py-3 px-3">Total</th></tr></thead><tbody>{(quote.quotation_items||[]).map((item,i)=>(<tr key={i} className="border-b"><td className="py-3 px-3 text-sm">{i+1}</td><td className="py-3 px-3 text-sm font-medium">{item.description}</td><td className="py-3 px-3 text-sm text-center">{item.quantity}</td><td className="py-3 px-3 text-sm text-right">{fc(item.unit_price)}</td><td className="py-3 px-3 text-sm font-semibold text-right">{fc(item.total_price||item.quantity*item.unit_price)}</td></tr>))}</tbody><tfoot><tr className="border-t-2"><td colSpan="4" className="py-3 px-3 text-sm font-semibold text-right">Subtotal:</td><td className="py-3 px-3 text-sm font-semibold text-right">{fc(quote.subtotal)}</td></tr><tr><td colSpan="4" className="py-2 px-3 text-sm text-right">VAT:</td><td className="py-2 px-3 text-sm text-right">{fc(quote.tax_amount)}</td></tr><tr><td colSpan="4" className="py-3 px-3 text-lg font-bold text-emerald-600 text-right">TOTAL:</td><td className="py-3 px-3 text-lg font-bold text-emerald-600 text-right">{fc(quote.total_amount)}</td></tr></tfoot></table>
        </div>

        <div className="neu-raised rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-lg font-semibold flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600" />A4 Document Preview</h2></div>
          <div ref={previewRef} className="bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-auto" style={{minHeight:'500px',maxHeight:'80vh',padding:'20px'}}>
            <div style={{transform:`scale(${scale})`,transformOrigin:'center center',boxShadow:'0 4px 20px rgba(0,0,0,0.15)'}} dangerouslySetInnerHTML={{__html:quoteHTML}}/>
          </div>
        </div>
      </main>
    </div>
  )
}
