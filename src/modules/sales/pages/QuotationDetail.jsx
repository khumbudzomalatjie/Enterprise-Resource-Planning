import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../../../components/Navbar'
import useSalesStore from '../store/salesStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  FileText, Edit, ChevronRight, Sun, Moon, Sparkles, 
  User, Calendar, Building2, Phone, Mail, MapPin, Download,
  ArrowLeft
} from 'lucide-react'

const COMPANY = {
  name: 'NDANDULENI GROUP',
  tagline: 'Innovation Without End',
  address: '2220 Manthata Street, Midrand, 1685',
  phone: '070 419 9457',
  email: 'account@ndandulenigroup.co.za',
  website: 'www.ndandulenigroup.co.za',
  taxRegNumber: '2025/842857/07',
  taxRefNumber: '9983138190',
  bank: 'Capitec Business',
  branch: '450105',
  accountNumber: '1054498946',
  accountType: 'Transact',
}

export default function QuotationDetail() {
  const { id } = useParams()
  const { selectedQuotation, fetchQuotation, loading } = useSalesStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (id) fetchQuotation(id)
  }, [id])

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'

  const getStatusBadge = (status) => {
    const b = { 
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', 
      sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', 
      accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', 
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', 
      expired: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', 
      converted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', 
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
    }
    return b[status] || 'bg-gray-100'
  }

  // DOWNLOAD PDF - Opens in new window with auto-print
  const handleDownloadPDF = () => {
    if (!selectedQuotation) return
    
    const q = selectedQuotation
    const items = q.quotation_items || []
    
    const fmt = (a) => 'R ' + (Number(a) || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
    
    const itemRows = items.map((item, i) => 
      `<tr><td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:center">${i+1}</td><td style="padding:5px 8px;border-bottom:1px solid #ddd">${item.description||''}</td><td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:center">${item.quantity||0}</td><td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:right">${fmt(item.unit_price||0)}</td><td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:right"><b>${fmt((item.quantity||0)*(item.unit_price||0))}</b></td></tr>`
    ).join('')
    
    const st = items.reduce((s,i) => s + (Number(i.quantity)||0)*(Number(i.unit_price)||0), 0)
    const tv = st * 0.15
    const gt = st + tv

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Quotation ${q.quotation_number}</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: Arial, Helvetica, sans-serif; 
    font-size: 13px; 
    color: #1a1a1a; 
    background: white; 
    line-height: 1.4;
    padding: 20px;
  }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1B5080; padding-bottom: 8px; margin-bottom: 10px; }
  .header-left { flex: 1; }
  .company-name { font-size: 20px; font-weight: bold; color: #0D2D4A; margin: 0; }
  .company-detail { font-size: 10px; color: #555; margin: 1px 0; }
  .header-right { text-align: right; }
  .quote-title { font-size: 24px; font-weight: bold; color: #0D2D4A; margin: 0; letter-spacing: 2px; }
  .quote-number { font-size: 14px; color: #1B5080; font-weight: bold; margin: 2px 0; }
  .quote-info { font-size: 10px; color: #333; }
  .section { border: 1px solid #ddd; padding: 8px 12px; margin-bottom: 8px; border-radius: 4px; }
  .section-title { font-weight: bold; color: #1B5080; border-bottom: 1px solid #eee; padding-bottom: 3px; margin-bottom: 5px; font-size: 11px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { background: #1B5080; color: white; padding: 6px 8px; font-size: 10px; text-align: center; }
  .totals { display: flex; justify-content: flex-end; margin-top: 8px; }
  .totals-box { width: 220px; border: 1px solid #ddd; border-radius: 4px; }
  .total-row { display: flex; justify-content: space-between; padding: 4px 10px; border-bottom: 1px solid #ddd; font-size: 11px; }
  .grand-total { display: flex; justify-content: space-between; padding: 8px 10px; font-size: 14px; font-weight: bold; background: #eaf1f8; color: #0D2D4A; }
  .footer { border-top: 1px solid #ddd; padding-top: 8px; text-align: center; font-size: 9px; color: #888; margin-top: 12px; }
  .print-btn { display: block; margin: 15px auto; padding: 10px 25px; background: #1B5080; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; }
  .print-btn:hover { background: #0D2D4A; }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1 class="company-name">${COMPANY.name}</h1>
    <p class="company-detail">${COMPANY.tagline}</p>
    <p class="company-detail">${COMPANY.address}</p>
    <p class="company-detail">Tel: ${COMPANY.phone} | Email: ${COMPANY.email}</p>
    <p class="company-detail">Tax Reg: ${COMPANY.taxRegNumber} | Tax Ref: ${COMPANY.taxRefNumber}</p>
  </div>
  <div class="header-right">
    <h2 class="quote-title">QUOTATION</h2>
    <p class="quote-number">No: ${q.quotation_number}</p>
    <div class="quote-info">
      <p>Date: ${fmtDate(q.quotation_date)}</p>
      <p>Expiry: ${fmtDate(q.valid_until)}</p>
      <p>Created By: ${q.created_by_name || 'N/A'}</p>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">Customer Details</div>
  <p><b>Customer:</b> ${q.client_name || q.clients?.company_name || 'N/A'}</p>
  <p><b>Phone:</b> ${q.client_phone || q.clients?.phone || 'N/A'}</p>
  <p><b>Email:</b> ${q.client_email || q.clients?.email || 'N/A'}</p>
  <p><b>Address:</b> ${q.client_address || 'N/A'}</p>
</div>

<div class="section">
  <div class="section-title">Items / Services</div>
  ${items.length > 0 ? `
  <table>
    <thead><tr><th>No</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    <div class="totals-box">
      <div class="total-row"><span>Subtotal</span><span>${fmt(st)}</span></div>
      <div class="total-row"><span>VAT (15%)</span><span>${fmt(tv)}</span></div>
      <div class="grand-total"><span>Grand Total</span><span>${fmt(gt)}</span></div>
    </div>
  </div>
  ` : '<p style="color:#999;text-align:center;padding:15px;">No items</p>'}
</div>

${q.notes ? `<div class="section"><div class="section-title">Notes</div><p style="font-size:11px;white-space:pre-line;">${q.notes}</p></div>` : ''}

<div class="section">
  <div class="section-title">Banking Details</div>
  <p style="font-size:11px"><b>Bank:</b> ${COMPANY.bank} | <b>Branch Code:</b> ${COMPANY.branch}</p>
  <p style="font-size:11px"><b>Account No:</b> ${COMPANY.accountNumber} | <b>Type:</b> ${COMPANY.accountType}</p>
  <p style="font-size:11px"><b>Reference:</b> ${q.quotation_number}</p>
</div>

<div class="footer">
  <p>${COMPANY.website} | ${COMPANY.email} | ${COMPANY.phone} | Page 1 of 1</p>
</div>

<button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>

<script>
  // Auto-open print dialog after page loads
  window.onload = function() {
    setTimeout(function() {
      window.print();
    }, 500);
  };
</script>

</body>
</html>`

    // Open in new window - this ALWAYS works because browser renders HTML natively
    const w = window.open('', '_blank', 'width=900,height=800')
    if (w) {
      w.document.write(html)
      w.document.close()
      toast.success('Quotation opened! Press Ctrl+P or click Print button to save as PDF')
    } else {
      toast.error('Please allow pop-ups for this site to download PDF')
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  )

  if (!selectedQuotation) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 text-lg">Quotation not found</p>
        <Link to="/sales/quotations" className="text-emerald-600 hover:text-emerald-700 mt-2 inline-block flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Quotations
        </Link>
      </div>
    </div>
  )

  const q = selectedQuotation
  const items = q.quotation_items || []

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
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

      <main className="max-w-4xl mx-auto px-4 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/sales" className="text-slate-500 hover:text-emerald-600">Sales</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/sales/quotations" className="text-slate-500 hover:text-emerald-600">Quotations</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{q.quotation_number}</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-emerald-600" />
              Quotation {q.quotation_number}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(q.status)}`}>
                {q.status?.replace('_', ' ')}
              </span>
            </h1>
            <p className="text-slate-500 mt-1">
              Created by {q.created_by_name || 'Unknown'} on {formatDate(q.quotation_date || q.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDownloadPDF} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
              <Download className="w-4 h-4" />Download PDF
            </button>
            {(q.status === 'draft' || q.status === 'sent') && (
              <button onClick={() => navigate(`/sales/quotations/${q.id}/edit`)} 
                className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
                <Edit className="w-4 h-4" />Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="neu-raised rounded-2xl p-4 text-center"><p className="text-xs text-slate-500">Date</p><p className="font-semibold flex items-center justify-center gap-1"><Calendar className="w-4 h-4" />{formatDate(q.quotation_date)}</p></div>
          <div className="neu-raised rounded-2xl p-4 text-center"><p className="text-xs text-slate-500">Expiry</p><p className="font-semibold">{formatDate(q.valid_until)}</p></div>
          <div className="neu-raised rounded-2xl p-4 text-center"><p className="text-xs text-slate-500">Created By</p><p className="font-semibold flex items-center justify-center gap-1"><User className="w-4 h-4" />{q.created_by_name || 'N/A'}</p></div>
          <div className="neu-raised rounded-2xl p-4 text-center"><p className="text-xs text-slate-500">Total</p><p className="font-bold text-emerald-600 text-lg">{formatCurrency(q.total_amount)}</p></div>
        </div>

        <div className="neu-raised rounded-3xl p-6 mb-6"><h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-600" />Client Details</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><p className="flex items-center gap-2"><Building2 className="w-4 h-4 text-slate-400" /><b>{q.client_name || q.clients?.company_name || 'N/A'}</b></p><p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{q.client_phone || q.clients?.phone || 'N/A'}</p><p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" />{q.client_email || q.clients?.email || 'N/A'}</p><p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" />{q.client_address || 'N/A'}</p></div></div>

        <div className="neu-raised rounded-3xl p-6 mb-6"><h2 className="text-lg font-bold mb-3">Items / Services</h2>
          {items.length > 0 ? <table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left py-2">#</th><th className="text-left py-2">Description</th><th className="text-center py-2">Qty</th><th className="text-center py-2">Unit</th><th className="text-right py-2">Unit Price</th><th className="text-right py-2">Total</th></tr></thead><tbody>{items.map((item, i) => (<tr key={i} className="border-b"><td className="py-2">{i+1}</td><td className="py-2">{item.description}</td><td className="py-2 text-center">{item.quantity}</td><td className="py-2 text-center">{item.unit||'each'}</td><td className="py-2 text-right">{formatCurrency(item.unit_price)}</td><td className="py-2 text-right font-medium">{formatCurrency((item.quantity||0)*(item.unit_price||0))}</td></tr>))}</tbody></table> : <p className="text-slate-500 text-center py-4">No items</p>}
          <div className="flex justify-end mt-4"><div className="w-56 space-y-2"><div className="flex justify-between text-sm"><span>Subtotal:</span><span>{formatCurrency(q.subtotal || 0)}</span></div><div className="flex justify-between text-sm"><span>Discount:</span><span className="text-red-500">-{formatCurrency(q.discount_amount || 0)}</span></div><div className="flex justify-between text-sm"><span>VAT:</span><span>{formatCurrency(q.tax_amount || 0)}</span></div><div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Grand Total:</span><span className="text-emerald-600">{formatCurrency(q.total_amount || 0)}</span></div></div></div>
        </div>

        {q.notes && <div className="neu-raised rounded-3xl p-6 mb-6"><h2 className="text-lg font-bold mb-2">Notes</h2><p className="text-sm text-slate-600 whitespace-pre-line">{q.notes}</p></div>}

        <div className="neu-raised rounded-3xl p-6"><h2 className="text-lg font-bold mb-3">Banking Details</h2><div className="text-sm space-y-1"><p><b>Bank:</b> {COMPANY.bank}</p><p><b>Branch Code:</b> {COMPANY.branch}</p><p><b>Account No:</b> {COMPANY.accountNumber}</p><p><b>Type:</b> {COMPANY.accountType}</p><p><b>Reference:</b> {q.quotation_number}</p></div></div>
      </main>
    </div>
  )
}
