import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../../../components/Navbar'
import useSalesStore from '../store/salesStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  FileText, Edit, ChevronRight, Sun, Moon, Sparkles, 
  User, Calendar, Building2, Phone, Mail, MapPin, Printer,
  DollarSign
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

const FULL_TERMS = `BOOKING & PAYMENT
1. 50% deposit required to secure booking
2. Balance payable upon completion
3. Payment methods: EFT and card. No cash.

CANCELLATION & RESCHEDULING
1. 24-hour notice required for full refund
2. Rescheduling subject to availability

LIABILITY & INSURANCE
Clients responsible for removing valuables and fragile items as company will not be liable for damages.

CLIENT RESPONSIBILITIES
1. Provide access to premises
2. Ensure pets are secured or removed
3. Remove clutter and obstacles

SATISFACTION GUARANTEE
1. 100% satisfaction guaranteed
2. Re-cleaning provided if not satisfied

TENDERS & CALL-OUTS
The company is available for short- and long-term tenders.`

function buildPrintHTML(quotation) {
  const fmt = (a) => 'R ' + (Number(a) || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const items = quotation?.quotation_items || []
  const st = items.reduce((s,i) => s + (Number(i.quantity)||0)*(Number(i.unit_price)||0), 0)
  const tv = st * 0.15
  const gt = st + tv
  const rows = items.map((item, i) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:center">${i+1}</td><td style="padding:4px 8px;border-bottom:1px solid #ddd">${item.description||''}</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:center">${item.quantity||0}</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right">${fmt(item.unit_price||0)}</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;text-align:right"><b>${fmt((item.quantity||0)*(item.unit_price||0))}</b></td></tr>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Quotation ${quotation.quotation_number}</title>
<style>@page{size:A4;margin:10mm}*{margin:0;padding:0}body{font-family:Arial;font-size:13px;color:#1a1a1a;background:#fff;padding:20px}
.header{border-bottom:2px solid #1B5080;padding-bottom:8px;margin-bottom:10px;display:flex;justify-content:space-between}
h1{font-size:20px;color:#0D2D4A}h2{font-size:14px;color:#1B5080}
.section{border:1px solid #ddd;padding:8px 12px;margin-bottom:8px;border-radius:4px}
.section-title{font-weight:bold;color:#1B5080;border-bottom:1px solid #eee;padding-bottom:3px;margin-bottom:5px;font-size:11px;text-transform:uppercase}
table{width:100%;border-collapse:collapse;margin-bottom:10px}
th{background:#1B5080;color:#fff;padding:6px 8px;font-size:10px;text-align:center}
.totals{display:flex;justify-content:flex-end}
.totals-box{width:220px;border:1px solid #ddd;border-radius:4px}
.total-row{display:flex;justify-content:space-between;padding:4px 10px;border-bottom:1px solid #ddd;font-size:11px}
.grand-total{display:flex;justify-content:space-between;padding:8px 10px;font-size:14px;font-weight:bold;background:#eaf1f8;color:#0D2D4A}
.footer{border-top:1px solid #ddd;padding-top:6px;text-align:center;font-size:9px;color:#888;margin-top:10px}
</style></head><body>
<div class="header"><div><h1>${COMPANY.name}</h1><p>${COMPANY.tagline} | ${COMPANY.address}</p><p>Tel: ${COMPANY.phone} | ${COMPANY.email}</p></div><div style="text-align:right"><h2>QUOTATION</h2><p><b>No: ${quotation.quotation_number}</b></p><p>Date: ${fmtDate(quotation.quotation_date)}</p><p>Created By: ${quotation.created_by_name||'N/A'}</p></div></div>
<div class="section"><div class="section-title">Customer Details</div><p><b>Customer:</b> ${quotation.client_name||quotation.clients?.company_name||'N/A'}</p><p><b>Phone:</b> ${quotation.client_phone||quotation.clients?.phone||'N/A'}</p><p><b>Email:</b> ${quotation.client_email||quotation.clients?.email||'N/A'}</p></div>
<table><thead><tr><th>No</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${rows||'<tr><td colspan="5" style="padding:15px;text-align:center">No items</td></tr>'}</tbody></table>
<div class="totals"><div class="totals-box"><div class="total-row"><span>Subtotal</span><span>${fmt(st)}</span></div><div class="total-row"><span>VAT (15%)</span><span>${fmt(tv)}</span></div><div class="grand-total"><span>Grand Total</span><span>${fmt(gt)}</span></div></div></div>
<div class="footer"><p>${COMPANY.website} | ${COMPANY.email} | ${COMPANY.phone} | Page 1 of 1</p></div>
<script>window.onload=function(){setTimeout(window.print,500)}</script>
</body></html>`
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
    const b = { draft: 'bg-gray-100 text-gray-700', sent: 'bg-blue-100 text-blue-700', accepted: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700', expired: 'bg-amber-100 text-amber-700', converted: 'bg-purple-100 text-purple-700', cancelled: 'bg-red-100 text-red-700' }
    return b[status] || 'bg-gray-100'
  }

  const handlePrint = () => {
    if (!selectedQuotation) return
    const html = buildPrintHTML(selectedQuotation)
    const w = window.open('', '_blank', 'width=900,height=800')
    if (w) { w.document.write(html); w.document.close() }
    else { toast.error('Please allow pop-ups') }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>
  if (!selectedQuotation) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 text-lg">Quotation not found</p><Link to="/sales/quotations" className="text-emerald-600 hover:text-emerald-700 mt-2 inline-block">← Back to Quotations</Link></div></div>

  const q = selectedQuotation
  const items = q.quotation_items || []

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /><span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span></div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">{isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}</button>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/sales" className="text-slate-500 hover:text-emerald-600">Sales</Link><ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/sales/quotations" className="text-slate-500 hover:text-emerald-600">Quotations</Link><ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{q.quotation_number}</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-emerald-600" />
              Quotation {q.quotation_number}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(q.status)}`}>{q.status}</span>
            </h1>
            <p className="text-slate-500 mt-1">Created by {q.created_by_name || 'Unknown'} on {formatDate(q.quotation_date || q.created_at)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
              <Printer className="w-4 h-4" />Print / PDF
            </button>
            {(q.status === 'draft' || q.status === 'sent') && (
              <button onClick={() => navigate(`/sales/quotations/${q.id}/edit`)} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
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

        <div className="neu-raised rounded-3xl p-6 mb-6">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-600" />Client Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <p className="flex items-center gap-2"><Building2 className="w-4 h-4 text-slate-400" /><b>{q.client_name || q.clients?.company_name || 'N/A'}</b></p>
            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{q.client_phone || q.clients?.phone || 'N/A'}</p>
            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" />{q.client_email || q.clients?.email || 'N/A'}</p>
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" />{q.client_address || 'N/A'}</p>
          </div>
        </div>

        <div className="neu-raised rounded-3xl p-6 mb-6">
          <h2 className="text-lg font-bold mb-3">Items / Services</h2>
          {items.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2">#</th><th className="text-left py-2">Description</th><th className="text-center py-2">Qty</th><th className="text-center py-2">Unit</th><th className="text-right py-2">Unit Price</th><th className="text-right py-2">Total</th></tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b"><td className="py-2">{i+1}</td><td className="py-2">{item.description}</td><td className="py-2 text-center">{item.quantity}</td><td className="py-2 text-center">{item.unit||'each'}</td><td className="py-2 text-right">{formatCurrency(item.unit_price)}</td><td className="py-2 text-right font-medium">{formatCurrency((item.quantity||0)*(item.unit_price||0))}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-slate-500 text-center py-4">No items</p>}
          
          <div className="flex justify-end mt-4">
            <div className="w-56 space-y-2">
              <div className="flex justify-between text-sm"><span>Subtotal:</span><span>{formatCurrency(q.subtotal || 0)}</span></div>
              <div className="flex justify-between text-sm"><span>Discount:</span><span className="text-red-500">-{formatCurrency(q.discount_amount || 0)}</span></div>
              <div className="flex justify-between text-sm"><span>VAT:</span><span>{formatCurrency(q.tax_amount || 0)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Grand Total:</span><span className="text-emerald-600">{formatCurrency(q.total_amount || 0)}</span></div>
            </div>
          </div>
        </div>

        {q.notes && (
          <div className="neu-raised rounded-3xl p-6 mb-6">
            <h2 className="text-lg font-bold mb-2">Notes</h2>
            <p className="text-sm text-slate-600 whitespace-pre-line">{q.notes}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-bold mb-3">Terms & Conditions</h2>
            <p className="text-xs text-slate-600 whitespace-pre-line">{q.terms_and_conditions || FULL_TERMS}</p>
          </div>
          <div className="neu-raised rounded-3xl p-6">
            <h2 className="text-lg font-bold mb-3">Banking Details</h2>
            <div className="text-sm space-y-1">
              <p><b>Bank:</b> {COMPANY.bank}</p>
              <p><b>Branch Code:</b> {COMPANY.branch}</p>
              <p><b>Account No:</b> {COMPANY.accountNumber}</p>
              <p><b>Type:</b> {COMPANY.accountType}</p>
              <p><b>Reference:</b> {q.quotation_number}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
