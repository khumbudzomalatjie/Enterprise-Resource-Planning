import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useSalesStore from '../store/salesStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  ArrowLeft, Download, Edit, FileText, Printer, X, Trash2, AlertTriangle,
  Sun, Moon, Sparkles, ChevronRight,
  CheckCircle, XCircle, Send, Maximize2, Briefcase
} from 'lucide-react'

// ═══════════════════════════════════════════════
// SAME COMPANY CONFIG AS CREATE QUOTATION
// ═══════════════════════════════════════════════
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

// ═══════════════════════════════════════════════
// SAME buildQuotationHTML AS CREATE PAGE
// ═══════════════════════════════════════════════
function buildQuotationHTML(quotation, items) {
  const fmt = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(amount || 0)
  const fmtDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  const lineTotal = (item) => (item.quantity || 0) * (item.unit_price || 0)
  const discountAmount = (item) => lineTotal(item) * ((item.discount_percent || 0) / 100)
  const lineAfterDiscount = (item) => lineTotal(item) - discountAmount(item)
  const vatAmount = (item) => lineAfterDiscount(item) * ((item.tax_percent || 15) / 100)
  const lineGrandTotal = (item) => lineAfterDiscount(item) + vatAmount(item)

  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0)
  const totalDiscount = items.reduce((s, i) => s + discountAmount(i), 0)
  const totalVAT = items.reduce((s, i) => s + vatAmount(i), 0)
  const grandTotal = subtotal - totalDiscount + totalVAT

  const quoteNum = quotation?.quotation_number || 'DRAFT'
  const creatorName = quotation?.created_by_name || quotation?.prepared_by_name || 'Sales Department'

  const productRows = items.map((item, i) => `
    <tr>
      <td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:center">${i + 1}</td>
      <td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:center">${item.code || ''}</td>
      <td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:left">${item.description}${item.unit_price === 0 ? ' <span style="color:#059669;font-weight:bold;">(FREE)</span>' : ''}</td>
      <td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
      <td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:center">${item.unit || 'each'}</td>
      <td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:right">${fmt(item.unit_price)}</td>
      <td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:center">${item.discount_percent || 0}%</td>
      <td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:center">${item.tax_percent || 15}%</td>
      <td style="padding:3px 5px;font-size:7px;border-bottom:1px solid #e5e7eb;text-align:right"><strong>${fmt(lineGrandTotal(item))}</strong></td>
    </tr>`).join('')

  return `<div style="width:${A4_WIDTH_PX}px;padding:24px 36px;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:9px;color:#1a1a1a;line-height:1.3;box-sizing:border-box">
<div style="display:flex;justify-content:space-between;border-bottom:2px solid #1B5080;padding-bottom:8px;margin-bottom:6px">
<div style="display:flex;align-items:flex-start;gap:14px">
<img src="/logo.png" alt="Logo" style="width:90px;height:auto;object-fit:contain" onerror="this.style.display='none'" />
<div>
<h1 style="font-size:18px;font-weight:bold;color:#0D2D4A;margin:0;line-height:1.1">${COMPANY.name}</h1>
<p style="font-size:7px;color:#64748b;margin:0">${COMPANY.tagline}</p>
<p style="font-size:7px;color:#64748b;margin:0">${COMPANY.address}</p>
<p style="font-size:7px;color:#64748b;margin:0">Tel: ${COMPANY.phone} | Fax: ${COMPANY.fax}</p>
<p style="font-size:7px;color:#64748b;margin:0">Email: ${COMPANY.email} | Web: ${COMPANY.website}</p>
<p style="font-size:7px;color:#64748b;margin:0">Reg: ${COMPANY.registration} | VAT: ${COMPANY.vatNumber}</p>
</div>
</div>
<div style="text-align:right">
<h2 style="font-size:26px;font-weight:bold;color:#0D2D4A;margin:0;letter-spacing:2px">QUOTATION</h2>
<p style="font-size:12px;color:#1B5080;font-weight:bold;margin:2px 0">Quotation No: ${quoteNum}</p>
<div style="font-size:7px;color:#64748b">
<p style="margin:0">Date: ${fmtDate(quotation?.quotation_date)}</p>
<p style="margin:0">Expiry: ${fmtDate(quotation?.valid_until)}</p>
<p style="margin:0">Salesperson: ${creatorName}</p>
<p style="margin:0">Branch: Johannesburg</p>
<p style="margin:0">Currency: ZAR</p>
<p style="margin:0">Status: ${quotation?.status || 'Draft'}</p>
</div>
</div>
</div>
<div style="display:flex;gap:6px;margin-bottom:5px">
<div style="flex:1;border:1px solid #d1d5db;border-radius:3px;padding:5px 7px">
<div style="font-size:7px;font-weight:bold;color:#1B5080;text-transform:uppercase;margin-bottom:2px;border-bottom:1px solid #e5e7eb;padding-bottom:1px">Customer Details</div>
<p style="font-size:7px;margin:1px 0"><strong>Customer:</strong> ${quotation?.client_name || ''}</p>
<p style="font-size:7px;margin:1px 0"><strong>Phone:</strong> ${quotation?.client_phone || ''}</p>
<p style="font-size:7px;margin:1px 0"><strong>Email:</strong> ${quotation?.client_email || ''}</p>
<p style="font-size:7px;margin:1px 0"><strong>Address:</strong> ${quotation?.client_address || ''}</p>
</div>
<div style="flex:1;border:1px solid #d1d5db;border-radius:3px;padding:5px 7px">
<div style="font-size:7px;font-weight:bold;color:#1B5080;text-transform:uppercase;margin-bottom:2px;border-bottom:1px solid #e5e7eb;padding-bottom:1px">Quote Information</div>
<p style="font-size:7px;margin:1px 0"><strong>Quote No:</strong> ${quoteNum}</p>
<p style="font-size:7px;margin:1px 0"><strong>Date:</strong> ${fmtDate(quotation?.quotation_date)}</p>
<p style="font-size:7px;margin:1px 0"><strong>Terms:</strong> ${quotation?.payment_terms || '50% Deposit'}</p>
<p style="font-size:7px;margin:1px 0"><strong>Sales Rep:</strong> ${creatorName}</p>
<p style="font-size:7px;margin:1px 0"><strong>Branch:</strong> Johannesburg</p>
</div>
</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:5px">
<thead><tr style="background:#1B5080;color:#fff">
<th style="padding:4px 5px;font-size:7px;font-weight:bold;text-transform:uppercase;text-align:center">No</th>
<th style="padding:4px 5px;font-size:7px;font-weight:bold;text-transform:uppercase;text-align:center">Code</th>
<th style="padding:4px 5px;font-size:7px;font-weight:bold;text-transform:uppercase;text-align:left">Description</th>
<th style="padding:4px 5px;font-size:7px;font-weight:bold;text-transform:uppercase;text-align:center">Qty</th>
<th style="padding:4px 5px;font-size:7px;font-weight:bold;text-transform:uppercase;text-align:center">Unit</th>
<th style="padding:4px 5px;font-size:7px;font-weight:bold;text-transform:uppercase;text-align:right">Unit Price</th>
<th style="padding:4px 5px;font-size:7px;font-weight:bold;text-transform:uppercase;text-align:center">Disc</th>
<th style="padding:4px 5px;font-size:7px;font-weight:bold;text-transform:uppercase;text-align:center">VAT</th>
<th style="padding:4px 5px;font-size:7px;font-weight:bold;text-transform:uppercase;text-align:right">Total</th>
</tr></thead>
<tbody>${productRows || '<tr><td colspan="9" style="padding:15px;text-align:center;font-size:7px;color:#94a3b8">No items</td></tr>'}</tbody>
</table>
<div style="display:flex;justify-content:flex-end;margin-bottom:5px">
<div style="width:220px;border:1px solid #d1d5db;border-radius:3px;overflow:hidden">
<div style="display:flex;justify-content:space-between;padding:3px 8px;border-bottom:1px solid #e5e7eb;font-size:7px"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
<div style="display:flex;justify-content:space-between;padding:3px 8px;border-bottom:1px solid #e5e7eb;font-size:7px"><span>Discount</span><span>-${fmt(totalDiscount)}</span></div>
<div style="display:flex;justify-content:space-between;padding:3px 8px;border-bottom:1px solid #e5e7eb;font-size:7px"><span>VAT (15%)</span><span>${fmt(totalVAT)}</span></div>
<div style="display:flex;justify-content:space-between;padding:6px 8px;font-size:12px;font-weight:bold;background:#eaf1f8"><span>Grand Total</span><span>${fmt(grandTotal)}</span></div>
</div>
</div>
${quotation?.notes ? `<div style="border:1px solid #d1d5db;border-radius:3px;padding:5px 7px;margin-bottom:4px"><div style="font-size:7px;font-weight:bold;color:#1B5080;text-transform:uppercase;margin-bottom:2px;border-bottom:1px solid #e5e7eb;padding-bottom:1px">Notes</div><p style="font-size:7px;white-space:pre-line;margin:0">${quotation.notes}</p></div>` : ''}
<div style="display:flex;gap:6px;margin-bottom:3px">
<div style="flex:1;font-size:6px"><div style="font-size:7px;font-weight:bold;color:#1B5080;text-transform:uppercase;margin-bottom:1px">Terms & Conditions</div><p style="white-space:pre-line;font-size:6px;color:#64748b;margin:0">${quotation?.terms_and_conditions || DEFAULT_TERMS.join('\n')}</p></div>
<div style="flex:1;font-size:6px"><div style="font-size:7px;font-weight:bold;color:#1B5080;text-transform:uppercase;margin-bottom:1px">Banking Details</div><p style="font-size:6px;margin:0"><strong>Bank:</strong> ${COMPANY.bank}</p><p style="font-size:6px;margin:0"><strong>Branch:</strong> ${COMPANY.branch}</p><p style="font-size:6px;margin:0"><strong>Account:</strong> ${COMPANY.accountNumber}</p><p style="font-size:6px;margin:0"><strong>Type:</strong> ${COMPANY.accountType}</p><p style="font-size:6px;margin:0"><strong>Ref:</strong> ${quoteNum}</p></div>
</div>
<div style="border-top:1px solid #d1d5db;padding-top:3px;text-align:center;font-size:6px;color:#94a3b8;margin-top:3px"><p style="margin:0">${COMPANY.website} | ${COMPANY.email} | ${COMPANY.phone}</p><p style="margin:0">Page 1 of 1</p></div>
</div>`
}

export default function QuotationDetail() {
  const { id } = useParams()
  const { selectedQuotation, fetchQuotation, updateQuotationStatus, deleteQuotation, acceptQuotation, loading } = useSalesStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const pdfContainerRef = useRef(null)
  const previewWrapperRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false)
  const [scale, setScale] = useState(0.55)

  useEffect(() => {
    if (id) fetchQuotation(id)
  }, [id])

  // Calculate scale to fit container
  useEffect(() => {
    const calculateScale = () => {
      const wrapper = previewWrapperRef.current
      if (!wrapper) return
      const containerWidth = wrapper.clientWidth - 32
      const newScale = Math.min(containerWidth / A4_WIDTH_PX, 0.7)
      setScale(Math.max(0.3, newScale))
    }
    calculateScale()
    window.addEventListener('resize', calculateScale)
    return () => window.removeEventListener('resize', calculateScale)
  }, [])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'accepted') { setShowAcceptConfirm(true); return }
    const result = await updateQuotationStatus(id, newStatus)
    if (result.success) { toast.success(`Status updated`); fetchQuotation(id) }
    else { toast.error('Failed to update status') }
  }

  const handleAcceptQuotation = async () => {
    const result = await acceptQuotation(id)
    if (result.success) { toast.success('Quotation accepted! 🎉'); navigate('/sales/quotations') }
    else { toast.error('Failed to accept') }
    setShowAcceptConfirm(false)
  }

  const handleDelete = async () => {
    const result = await deleteQuotation(id)
    if (result.success) { toast.success('Deleted'); navigate('/sales/quotations') }
    else { toast.error('Failed to delete') }
    setShowDeleteConfirm(false)
  }

  const downloadPDF = async () => {
    try {
      if (!selectedQuotation) return
      toast.loading('Generating PDF...')
      const html = buildQuotationHTML(selectedQuotation, selectedQuotation.quotation_items || [])
      const container = document.createElement('div')
      container.innerHTML = html
      container.style.cssText = 'position:absolute;left:-9999px;top:0;width:' + A4_WIDTH_PX + 'px;background:white;'
      document.body.appendChild(container)
      await new Promise(r => setTimeout(r, 500))
      const html2pdf = (await import('html2pdf.js')).default
      await html2pdf().set({
        margin: [0, 0, 0, 0], filename: `Quotation_${selectedQuotation.quotation_number || 'download'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, letterRendering: true, width: A4_WIDTH_PX },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css'] }
      }).from(container).save()
      document.body.removeChild(container)
      toast.dismiss(); toast.success('PDF downloaded!')
    } catch (e) { toast.dismiss(); toast.error('PDF failed') }
  }

  const printQuotation = () => {
    if (!selectedQuotation) return
    const html = buildQuotationHTML(selectedQuotation, selectedQuotation.quotation_items || [])
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`<html><head><title>Quotation ${selectedQuotation.quotation_number}</title><style>@page{size:A4;margin:0}body{margin:0;display:flex;justify-content:center}@media print{body{-webkit-print-color-adjust:exact}}</style></head><body>${html}</body></html>`)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  if (loading || !selectedQuotation) {
    return (
      <div className={`min-h-screen font-['Inter'] ${isDark ? 'dark' : ''}`}>
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-500 text-lg">Loading quotation...</p>
          </div>
        </div>
      </div>
    )
  }

  const quote = selectedQuotation
  const quoteHTML = buildQuotationHTML(quote, quote.quotation_items || [])

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-gray-900/95 flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700">
            <span className="text-white font-semibold">{quote.quotation_number}</span>
            <div className="flex gap-3">
              <button onClick={downloadPDF} className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 text-sm"><Download className="w-4 h-4" /> PDF</button>
              <button onClick={printQuotation} className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 text-sm"><Printer className="w-4 h-4" /> Print</button>
              <button onClick={() => setIsFullscreen(false)} className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 text-sm"><X className="w-4 h-4" /> Close</button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-gray-900">
            <div className="bg-white shadow-2xl" style={{ transform: `scale(${Math.min(1, (window.innerHeight - 100) / 1123)})`, transformOrigin: 'center center' }}
              dangerouslySetInnerHTML={{ __html: quoteHTML }} />
          </div>
        </div>
      )}

      {/* Accept Modal */}
      {showAcceptConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="neu-raised rounded-3xl p-8 max-w-lg w-full bg-white dark:bg-slate-800">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4"><Briefcase className="w-10 h-10 text-emerald-600" /></div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Accept & Create Job?</h3>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 mb-4 text-left">
                <div className="flex items-start gap-2"><AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" /><div><p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Important:</p><ul className="text-xs text-amber-700 dark:text-amber-400 mt-1 space-y-1 list-disc list-inside"><li>Quotation marked as <strong>Accepted</strong></li><li>A <strong>Job</strong> will be created</li></ul></div></div>
              </div>
              <div className="flex gap-3"><button onClick={() => setShowAcceptConfirm(false)} className="flex-1 neu-raised neu-btn px-6 py-3 rounded-xl">Cancel</button><button onClick={handleAcceptQuotation} className="flex-1 neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" />Yes, Accept</button></div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="neu-raised rounded-3xl p-8 max-w-md w-full bg-white dark:bg-slate-800">
            <div className="text-center"><div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8 text-red-600" /></div><h3 className="text-xl font-bold mb-2">Delete?</h3><p className="text-slate-500 mb-6">Cannot be undone.</p>
              <div className="flex gap-3"><button onClick={() => setShowDeleteConfirm(false)} className="flex-1 neu-raised neu-btn px-6 py-3 rounded-xl">Cancel</button><button onClick={handleDelete} className="flex-1 neu-raised neu-btn px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" />Delete</button></div>
            </div>
          </motion.div>
        </div>
      )}

      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /><span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span></div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">{isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}</button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/sales" className="text-slate-500 hover:text-emerald-600">Sales</Link><ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/sales/quotations" className="text-slate-500 hover:text-emerald-600">Quotations</Link><ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">{quote.quotation_number}</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><FileText className="w-8 h-8 text-emerald-600" />{quote.quotation_number}</h1>
            <p className="text-slate-500 mt-1">{quote.client_name} · {formatDate(quote.quotation_date)} · <span className="font-semibold text-emerald-600 ml-2">{formatCurrency(quote.total_amount)}</span></p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setIsFullscreen(true)} className="neu-raised neu-btn px-4 py-2 rounded-xl flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"><Maximize2 className="w-4 h-4" /><span className="hidden sm:inline">Full Preview</span></button>
            <button onClick={downloadPDF} className="neu-raised neu-btn px-4 py-2 rounded-xl flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"><Download className="w-4 h-4" /><span className="hidden sm:inline">PDF</span></button>
            <button onClick={printQuotation} className="neu-raised neu-btn px-4 py-2 rounded-xl flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700"><Printer className="w-4 h-4" /><span className="hidden sm:inline">Print</span></button>
            <button onClick={() => navigate(`/sales/quotations/${id}/edit`)} className="neu-raised neu-btn px-4 py-2 rounded-xl flex items-center gap-2 bg-slate-600 text-white hover:bg-slate-700"><Edit className="w-4 h-4" /><span className="hidden sm:inline">Edit</span></button>
            <button onClick={() => setShowDeleteConfirm(true)} className="neu-raised neu-btn px-4 py-2 rounded-xl flex items-center gap-2 bg-red-600 text-white hover:bg-red-700"><Trash2 className="w-4 h-4" /><span className="hidden sm:inline">Delete</span></button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="neu-raised rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-4">
          <span className="text-sm text-slate-500">Status:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${quote.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : quote.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{quote.status?.replace('_', ' ')}</span>
          <div className="border-l border-slate-300 pl-4 flex flex-wrap gap-2">
            {quote.status !== 'sent' && <button onClick={() => handleStatusChange('sent')} className="px-3 py-1 rounded-lg text-xs font-medium hover:bg-blue-100 text-slate-600"><Send className="w-3 h-3 inline mr-1" />Mark Sent</button>}
            {quote.status !== 'accepted' && <button onClick={() => handleStatusChange('accepted')} className="px-3 py-1 rounded-lg text-xs font-medium hover:bg-emerald-100 text-slate-600"><Briefcase className="w-3 h-3 inline mr-1" />Accept → Job</button>}
            {quote.status !== 'rejected' && <button onClick={() => handleStatusChange('rejected')} className="px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-100 text-slate-600"><XCircle className="w-3 h-3 inline mr-1" />Reject</button>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[{ label: 'Client', value: quote.client_name }, { label: 'Date', value: formatDate(quote.quotation_date) }, { label: 'Valid Until', value: formatDate(quote.valid_until) }, { label: 'Total (Incl. VAT)', value: formatCurrency(quote.total_amount), highlight: true }].map((card, i) => (
            <div key={i} className="neu-raised rounded-2xl p-4"><p className="text-xs text-slate-500 uppercase">{card.label}</p><p className={`font-semibold mt-1 ${card.highlight ? 'text-emerald-600 text-lg' : 'text-slate-800 dark:text-white'}`}>{card.value}</p></div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="neu-raised rounded-3xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-200 dark:border-slate-700"><th className="text-left text-xs font-medium text-slate-500 py-3 px-3">#</th><th className="text-left text-xs font-medium text-slate-500 py-3 px-3">Description</th><th className="text-center text-xs font-medium text-slate-500 py-3 px-3">Qty</th><th className="text-right text-xs font-medium text-slate-500 py-3 px-3">Unit Price</th><th className="text-right text-xs font-medium text-slate-500 py-3 px-3">Total</th></tr></thead>
              <tbody>
                {(quote.quotation_items || []).map((item, index) => (
                  <tr key={item.id || index} className="border-b border-slate-100 dark:border-slate-700/50"><td className="py-3 px-3 text-sm text-slate-500">{index + 1}</td><td className="py-3 px-3 text-sm text-slate-800 dark:text-white font-medium">{item.description}</td><td className="py-3 px-3 text-sm text-center">{item.quantity}</td><td className="py-3 px-3 text-sm text-right">{formatCurrency(item.unit_price)}</td><td className="py-3 px-3 text-sm font-semibold text-right">{formatCurrency(item.total_price || item.quantity * item.unit_price)}</td></tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-600"><td colSpan="4" className="py-3 px-3 text-sm font-semibold text-right">Subtotal:</td><td className="py-3 px-3 text-sm font-semibold text-right">{formatCurrency(quote.subtotal)}</td></tr>
                <tr><td colSpan="4" className="py-2 px-3 text-sm text-slate-500 text-right">VAT (15%):</td><td className="py-2 px-3 text-sm text-right">{formatCurrency(quote.tax_amount)}</td></tr>
                <tr><td colSpan="4" className="py-3 px-3 text-lg font-bold text-emerald-600 text-right">TOTAL:</td><td className="py-3 px-3 text-lg font-bold text-emerald-600 text-right">{formatCurrency(quote.total_amount)}</td></tr>
              </tfoot>
            </table>
          </div>
        </motion.div>

        {/* A4 PREVIEW - NOW USES SAME buildQuotationHTML AS CREATE PAGE */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="neu-raised rounded-3xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600" />A4 Document Preview</h2>
            <button onClick={() => setIsFullscreen(true)} className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"><Maximize2 className="w-4 h-4" /> Full Screen</button>
          </div>
          <div ref={previewWrapperRef} className="bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-auto" style={{ minHeight: '500px', maxHeight: '80vh', padding: '20px' }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
              dangerouslySetInnerHTML={{ __html: quoteHTML }} />
          </div>
        </motion.div>
      </main>
    </div>
  )
}
