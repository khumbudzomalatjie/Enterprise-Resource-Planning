import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useSalesStore from '../store/salesStore'
import useCRMStore from '../../crm/store/crmStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import {
  FileText, Plus, Trash2, Download, Eye,
  Sun, Moon, Sparkles, ChevronRight,
  Save, Send
} from 'lucide-react'

// ═══════════════════════════════════════════════
// FALLBACK SERVICES (used if database is empty)
// ═══════════════════════════════════════════════
const FALLBACK_SERVICES = [
  { code: 'CLN-001', category: 'Once-Off Cleaning', name: '1 Bedroom - Once-Off', unit_price: 1304.35, unit: 'per_service' },
  { code: 'CLN-002', category: 'Once-Off Cleaning', name: '2 Bedroom - Once-Off', unit_price: 1739.13, unit: 'per_service' },
  { code: 'CLN-003', category: 'Once-Off Cleaning', name: '3 Bedroom - Once-Off', unit_price: 2347.83, unit: 'per_service' },
  { code: 'CLN-004', category: 'Once-Off Cleaning', name: '4 Bedroom - Once-Off', unit_price: 3043.48, unit: 'per_service' },
  { code: 'CLN-005', category: 'Once-Off Cleaning', name: '5 Bedroom - Once-Off', unit_price: 3478.26, unit: 'per_service' },
  { code: 'CLN-101', category: 'Monthly (1x Week)', name: '1 Bedroom - 1x Week', unit_price: 869.57, unit: 'per_month' },
  { code: 'CLN-102', category: 'Monthly (1x Week)', name: '2 Bedroom - 1x Week', unit_price: 1043.48, unit: 'per_month' },
  { code: 'CLN-103', category: 'Monthly (1x Week)', name: '3 Bedroom - 1x Week', unit_price: 1391.30, unit: 'per_month' },
  { code: 'CLN-104', category: 'Monthly (1x Week)', name: '4 Bedroom - 1x Week', unit_price: 1739.13, unit: 'per_month' },
  { code: 'CLN-105', category: 'Monthly (1x Week)', name: '5 Bedroom - 1x Week', unit_price: 2173.91, unit: 'per_month' },
  { code: 'CLN-201', category: 'Monthly (2x Week)', name: '1 Bedroom - 2x Week', unit_price: 1565.22, unit: 'per_month' },
  { code: 'CLN-202', category: 'Monthly (2x Week)', name: '2 Bedroom - 2x Week', unit_price: 1913.04, unit: 'per_month' },
  { code: 'CLN-203', category: 'Monthly (2x Week)', name: '3 Bedroom - 2x Week', unit_price: 2434.78, unit: 'per_month' },
  { code: 'CLN-204', category: 'Monthly (2x Week)', name: '4 Bedroom - 2x Week', unit_price: 3130.43, unit: 'per_month' },
  { code: 'CLN-205', category: 'Monthly (2x Week)', name: '5 Bedroom - 2x Week', unit_price: 3913.04, unit: 'per_month' },
  { code: 'CLN-301', category: 'Monthly (3x Week)', name: '1 Bedroom - 3x Week', unit_price: 2173.91, unit: 'per_month' },
  { code: 'CLN-302', category: 'Monthly (3x Week)', name: '2 Bedroom - 3x Week', unit_price: 2608.70, unit: 'per_month' },
  { code: 'CLN-303', category: 'Monthly (3x Week)', name: '3 Bedroom - 3x Week', unit_price: 3043.48, unit: 'per_month' },
  { code: 'CLN-304', category: 'Monthly (3x Week)', name: '4 Bedroom - 3x Week', unit_price: 3913.04, unit: 'per_month' },
  { code: 'CLN-305', category: 'Monthly (3x Week)', name: '5 Bedroom - 3x Week', unit_price: 4782.61, unit: 'per_month' },
  { code: 'CLN-401', category: 'Moving In/Out Cleaning', name: '1 Bedroom - Moving', unit_price: 434.78, unit: 'per_service' },
  { code: 'CLN-402', category: 'Moving In/Out Cleaning', name: '2 Bedroom - Moving', unit_price: 782.61, unit: 'per_service' },
  { code: 'CLN-403', category: 'Moving In/Out Cleaning', name: '3 Bedroom - Moving', unit_price: 1043.48, unit: 'per_service' },
  { code: 'CLN-404', category: 'Moving In/Out Cleaning', name: '4 Bedroom - Moving', unit_price: 1304.35, unit: 'per_service' },
  { code: 'CLN-405', category: 'Moving In/Out Cleaning', name: '5+ Bedroom - Moving', unit_price: 1739.13, unit: 'per_service' },
]

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
Clients responsible for removing valuables and fragile items as company will not be liable for damages. The company shall not be held liable for any loss or damage to such items.

CLIENT RESPONSIBILITIES
1. Provide access to premises
2. Ensure pets are secured or removed
3. Remove clutter and obstacles

SATISFACTION GUARANTEE
1. 100% satisfaction guaranteed
2. Re-cleaning provided if not satisfied

TENDERS & CALL-OUTS
The company is available for short- and long-term tenders and can provide services on an as-needed, call-out basis.`

const A4_WIDTH_PX = 794

// ... buildQuotationHTML function stays the same ...

function buildQuotationHTML(quotation, items) {
  const fmt = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(amount || 0)
  const fmtDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  const lt = (i) => (i.quantity || 0) * (i.unit_price || 0)
  const disc = (i) => lt(i) * ((i.discount_percent || 0) / 100)
  const ad = (i) => lt(i) - disc(i)
  const vat = (i) => ad(i) * ((i.tax_percent || 15) / 100)
  const grand = (i) => ad(i) + vat(i)

  const subtotal = items.reduce((s, i) => s + lt(i), 0)
  const totalDisc = items.reduce((s, i) => s + disc(i), 0)
  const totalVAT = items.reduce((s, i) => s + vat(i), 0)
  const grandTotal = subtotal - totalDisc + totalVAT

  const quoteNum = quotation?.quotation_number || 'DRAFT'
  const creator = quotation?.created_by_name || 'Sales'

  const rows = items.filter(i => i.description).map((item, i) => `
    <tr>
      <td class="tc">${i+1}</td>
      <td class="tl">${item.code||''}</td>
      <td class="tl">${item.description}${item.unit_price===0?' <b style="color:#059669">(FREE)</b>':''}</td>
      <td class="tc">${item.quantity}</td>
      <td class="tc">${item.unit||'each'}</td>
      <td class="tr">${fmt(item.unit_price)}</td>
      <td class="tc">${item.discount_percent||0}%</td>
      <td class="tc">${item.tax_percent||15}%</td>
      <td class="tr"><b>${fmt(grand(item))}</b></td>
    </tr>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:9px;color:#111;background:#fff;line-height:1.2}
.pg{width:${A4_WIDTH_PX}px;padding:20px 30px;background:#fff}
.hd{display:flex;justify-content:space-between;border-bottom:2px solid #1B5080;padding-bottom:5px;margin-bottom:4px}
.hl{display:flex;align-items:flex-start;gap:10px}
.lg{width:75px;flex-shrink:0}
.lg img{width:75px;height:auto}
.cn{font-size:16px;font-weight:bold;color:#0D2D4A;margin:0}
.cd{font-size:6px;color:#444;margin:0}
.hr{text-align:right}
.qt{font-size:22px;font-weight:bold;color:#0D2D4A;margin:0;letter-spacing:1px}
.qn{font-size:10px;color:#1B5080;font-weight:bold;margin:1px 0}
.qi{font-size:6px;color:#444}
.qi p{margin:0}
.bx{border:1px solid #ccc;border-radius:3px;padding:3px 5px;margin-bottom:3px}
.bt{font-size:6px;font-weight:bold;color:#1B5080;border-bottom:1px solid #ddd;padding-bottom:1px;margin-bottom:1px;text-transform:uppercase}
.bx p{font-size:6px;margin:1px 0}
table{width:100%;border-collapse:collapse;margin-bottom:3px}
th{background:#1B5080;color:#fff;padding:3px 4px;font-size:6px;font-weight:bold;text-align:center}
.tl{padding:2px 4px;font-size:6px;border-bottom:1px solid #ddd;text-align:left}
.tc{padding:2px 4px;font-size:6px;border-bottom:1px solid #ddd;text-align:center}
.tr{padding:2px 4px;font-size:6px;border-bottom:1px solid #ddd;text-align:right}
.ft{display:flex;justify-content:flex-end;margin-bottom:3px}
.ftb{width:180px;border:1px solid #ccc;border-radius:3px}
.ftl{display:flex;justify-content:space-between;padding:2px 6px;border-bottom:1px solid #ddd;font-size:6px}
.ftlg{display:flex;justify-content:space-between;padding:4px 6px;font-size:10px;font-weight:bold;background:#eaf1f8;color:#0D2D4A}
.btm{display:flex;gap:4px;margin-bottom:2px}
.bb{flex:1;font-size:5px}
.bbt{font-size:6px;font-weight:bold;color:#1B5080;text-transform:uppercase;margin-bottom:1px}
.ftr{border-top:1px solid #ccc;padding-top:2px;text-align:center;font-size:5px;color:#888;margin-top:2px}
</style></head><body>
<div class="pg">
<div class="hd">
<div class="hl">
<div class="lg"><img src="/logo.png" alt="Logo" /></div>
<div>
<h1 class="cn">${COMPANY.name}</h1>
<p class="cd">${COMPANY.tagline}</p>
<p class="cd">${COMPANY.address}</p>
<p class="cd">Tel: ${COMPANY.phone} | Email: ${COMPANY.email} | Web: ${COMPANY.website}</p>
<p class="cd">Tax Reg: ${COMPANY.taxRegNumber} | Tax Ref: ${COMPANY.taxRefNumber}</p>
</div>
</div>
<div class="hr">
<h2 class="qt">QUOTATION</h2>
<p class="qn">No: ${quoteNum}</p>
<div class="qi"><p>Date: ${fmtDate(quotation?.quotation_date||new Date())}</p><p>Expiry: ${fmtDate(quotation?.valid_until)}</p><p>Created By: ${creator}</p></div>
</div>
</div>
<div class="bx"><div class="bt">Customer Details</div><p><b>Customer:</b> ${quotation?.client_name||''}</p><p><b>Phone:</b> ${quotation?.client_phone||''}</p><p><b>Email:</b> ${quotation?.client_email||''}</p><p><b>Address:</b> ${quotation?.client_address||''}</p></div>
<table><thead><tr><th>No</th><th>Code</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Disc</th><th>VAT</th><th>Total</th></tr></thead><tbody>${rows||'<tr><td colspan="9" class="tc" style="padding:10px">No items</td></tr>'}</tbody></table>
<div class="ft"><div class="ftb"><div class="ftl"><span>Subtotal</span><span>${fmt(subtotal)}</span></div><div class="ftl"><span>Discount</span><span>-${fmt(totalDisc)}</span></div><div class="ftl"><span>VAT (15%)</span><span>${fmt(totalVAT)}</span></div><div class="ftlg"><span>Grand Total</span><span>${fmt(grandTotal)}</span></div></div></div>
${quotation?.notes?`<div class="bx"><div class="bt">Notes</div><p style="font-size:6px">${quotation.notes}</p></div>`:''}
<div class="btm"><div class="bb"><div class="bbt">Terms & Conditions</div><p style="white-space:pre-line;font-size:5px">${FULL_TERMS}</p></div><div class="bb"><div class="bbt">Banking Details</div><p style="font-size:5px"><b>Bank:</b> ${COMPANY.bank}</p><p style="font-size:5px"><b>Branch:</b> ${COMPANY.branch}</p><p style="font-size:5px"><b>Account:</b> ${COMPANY.accountNumber}</p><p style="font-size:5px"><b>Type:</b> ${COMPANY.accountType}</p><p style="font-size:5px"><b>Ref:</b> ${quoteNum}</p></div></div>
<div class="ftr"><p>${COMPANY.website} | ${COMPANY.email} | ${COMPANY.phone} | Page 1 of 1</p></div>
</div></body></html>`
}

// ═══════════════════════════════════════════════
// CREATE/EDIT QUOTATION PAGE
// ═══════════════════════════════════════════════
export default function CreateQuotation() {
  const { id } = useParams()
  const isEditMode = Boolean(id)
  const previewRef = useRef(null)
  const [previewScale, setPreviewScale] = useState(0.4)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // ✅ Services now loaded from database
  const [servicesList, setServicesList] = useState(FALLBACK_SERVICES)

  const fetchQuotation = useSalesStore((state) => state.fetchQuotation)
  const clients = useCRMStore((state) => state.clients)
  const fetchClients = useCRMStore((state) => state.fetchClients)
  const isDark = useThemeStore((state) => state.isDark)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const navigate = useNavigate()

  const [quotationData, setQuotationData] = useState({
    client_id: '', client_name: '', client_email: '', client_phone: '', client_address: '',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_terms: '50% Deposit, Balance on Completion',
    notes: '', terms_and_conditions: FULL_TERMS,
    status: 'draft', created_by_name: '', prepared_by_name: ''
  })

  const [items, setItems] = useState([
    { code: '', description: '', quantity: 1, unit: 'per_service', unit_price: 0, tax_percent: 15, discount_percent: 0 }
  ])
  const [loadingQuote, setLoadingQuote] = useState(false)

  // ✅ Load services from database
  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true })
      
      if (!error && data && data.length > 0) {
        // Map database fields to expected format
        const mapped = data.map(s => ({
          code: s.item_code || s.code || '',
          category: s.category || 'Other',
          name: s.name,
          unit_price: s.unit_price || 0,
          unit: s.unit || 'per_service'
        }))
        console.log('📦 Loaded', mapped.length, 'services from database')
        setServicesList(mapped)
      } else {
        console.log('📦 Using fallback services (', FALLBACK_SERVICES.length, 'services)')
        setServicesList(FALLBACK_SERVICES)
      }
    } catch (err) {
      console.log('📦 Error loading services, using fallback:', err)
      setServicesList(FALLBACK_SERVICES)
    }
  }

  const updatePreviewScale = useCallback(() => {
    if (previewRef.current) {
      setPreviewScale(Math.min((previewRef.current.clientWidth - 8) / A4_WIDTH_PX, 0.7))
    }
  }, [])

  useEffect(() => {
    fetchClients({ status: 'active' })
    loadServices() // ✅ Load services from DB
    setCurrentUserName()
    updatePreviewScale()
    window.addEventListener('resize', updatePreviewScale)
    return () => window.removeEventListener('resize', updatePreviewScale)
  }, [updatePreviewScale])

  const setCurrentUserName = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setQuotationData(prev => ({ ...prev, created_by_name: profile?.full_name || user.email?.split('@')[0] || 'Unknown', prepared_by_name: profile?.full_name || user.email?.split('@')[0] || 'Unknown' }))
    }
  }

  useEffect(() => { if (id) loadExisting(id) }, [id])

  const loadExisting = async (qid) => {
    setLoadingQuote(true)
    const r = await fetchQuotation(qid)
    if (r.success && r.data) {
      const q = r.data
      setQuotationData({
        client_id: q.client_id || '', client_name: q.client_name || q.clients?.company_name || '',
        client_email: q.client_email || '', client_phone: q.client_phone || '',
        client_address: q.client_address || '',
        valid_until: q.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_terms: q.payment_terms || '50% Deposit, Balance on Completion',
        notes: q.notes || '', terms_and_conditions: q.terms_and_conditions || FULL_TERMS,
        status: q.status || 'draft', created_by_name: q.created_by_name || '', prepared_by_name: q.prepared_by_name || ''
      })
      if (q.quotation_items?.length) setItems(q.quotation_items.map(i => ({
        code: i.code || '', description: i.description || '', quantity: i.quantity || 1,
        unit: i.unit || 'per_service', unit_price: i.unit_price || 0,
        tax_percent: i.tax_percent || 15, discount_percent: i.discount_percent || 0
      })))
    }
    setLoadingQuote(false)
  }

  const handleClientSelect = (cid) => {
    const c = clients.find(x => x.id === cid)
    if (c) setQuotationData(prev => ({ ...prev, client_id: c.id, client_name: c.company_name || '', client_email: c.email || '', client_phone: c.phone || '', client_address: `${c.address_line1 || ''}, ${c.city || ''}` }))
  }

  // ✅ Uses servicesList (from DB or fallback)
  const handleServiceSelect = (idx, name) => {
    const s = servicesList.find(x => x.name === name)
    if (s) { const ni = [...items]; ni[idx] = { ...ni[idx], code: s.code, description: s.name, unit: s.unit, unit_price: s.unit_price }; setItems(ni) }
  }

  const addItem = () => setItems([...items, { code: '', description: '', quantity: 1, unit: 'per_service', unit_price: 0, tax_percent: 15, discount_percent: 0 }])
  const removeItem = (i) => { if (items.length > 1) setItems(items.filter((_, x) => x !== i)) }
  const updateItem = (i, f, v) => { const ni = [...items]; ni[i] = { ...ni[i], [f]: v }; setItems(ni) }

  // SAVE function (unchanged)
  const handleSave = async (status = 'draft') => {
    if (!quotationData.client_name) { toast.error('Select a client'); return }
    if (!items.some(i => i.description && i.unit_price > 0)) { toast.error('Add at least one service'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Not logged in'); setSaving(false); return }
      const ci = items.filter(i => i.description).map((item, i) => ({ item_number: i + 1, description: item.description, quantity: item.quantity || 1, unit: item.unit || 'per_service', unit_price: item.unit_price || 0, tax_percent: item.tax_percent ?? 15, discount_percent: item.discount_percent ?? 0 }))
      const lt = (i) => i.quantity * i.unit_price
      const disc = (i) => lt(i) * (i.discount_percent / 100)
      const ad = (i) => lt(i) - disc(i)
      const vat = (i) => ad(i) * (i.tax_percent / 100)
      const st = ci.reduce((s, i) => s + lt(i), 0)
      const td = ci.reduce((s, i) => s + disc(i), 0)
      const tv = ci.reduce((s, i) => s + vat(i), 0)
      const gt = st - td + tv
      const vs = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted']
      const ss = vs.includes(status) ? status : 'draft'

      const payload = {
        client_name: quotationData.client_name, client_email: quotationData.client_email || null,
        client_phone: quotationData.client_phone || null, client_address: quotationData.client_address || null,
        valid_until: quotationData.valid_until, payment_terms: quotationData.payment_terms,
        notes: quotationData.notes || null, terms_and_conditions: quotationData.terms_and_conditions || null,
        subtotal: st, tax_amount: tv, tax_rate: 15, discount_amount: td,
        discount_type: td > 0 ? 'fixed' : 'none', discount_value: td,
        total_amount: gt, status: ss
      }

      if (isEditMode) {
        await supabase.from('quotations').update({ ...payload, prepared_by_name: quotationData.prepared_by_name, updated_at: new Date().toISOString() }).eq('id', id)
        await supabase.from('quotation_items').delete().eq('quotation_id', id)
        if (ci.length) await supabase.from('quotation_items').insert(ci.map(x => ({ ...x, quotation_id: id })))
        toast.success('Updated!')
      } else {
        const { data: nq } = await supabase.from('quotations').insert([{ ...payload, client_id: quotationData.client_id || null, quotation_date: new Date().toISOString().split('T')[0], created_by: user.id, created_by_name: quotationData.created_by_name || 'Unknown', prepared_by: user.id, prepared_by_name: quotationData.prepared_by_name || 'Unknown' }]).select().single()
        if (ci.length && nq) await supabase.from('quotation_items').insert(ci.map(x => ({ ...x, quotation_id: nq.id })))
        toast.success('Saved!')
      }
      navigate('/sales/quotations')
    } catch (e) { toast.error('Failed: ' + (e.message || 'Error')) }
    finally { setSaving(false) }
  }

  // PDF DOWNLOAD (unchanged)
  const downloadPDF = async () => {
    if (downloading) return
    setDownloading(true)
    toast.loading('Generating PDF...')
    try {
      const html = buildQuotationHTML(quotationData, items.filter(i => i.description))
      const container = document.createElement('div')
      container.innerHTML = html
      container.style.cssText = `position: absolute; left: 0; top: 0; width: ${A4_WIDTH_PX}px; background: white; z-index: 99999;`
      document.body.appendChild(container)
      await new Promise(r => setTimeout(r, 1000))
      const html2pdf = (await import('html2pdf.js')).default
      const opt = {
        margin: [0, 0, 0, 0],
        filename: `Quotation_${(quotationData.client_name || 'draft').replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', width: A4_WIDTH_PX, windowWidth: A4_WIDTH_PX },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all'] }
      }
      await html2pdf().set(opt).from(container).save()
      document.body.removeChild(container)
      toast.dismiss()
      toast.success('PDF downloaded!')
    } catch (e) {
      console.error('PDF error:', e)
      toast.dismiss()
      toast.error('PDF failed: ' + (e.message || 'Unknown'))
    } finally { setDownloading(false) }
  }

  const fmt = (a) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(a || 0)
  // ✅ Uses servicesList
  const cats = [...new Set(servicesList.map(s => s.category))]
  const cl = (i) => (i.quantity || 0) * (i.unit_price || 0)

  if (loadingQuote) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /><span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span></div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">{isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}</button>
      </div>

      <main className="max-w-7xl mx-auto px-4 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm"><Link to="/sales" className="text-slate-500 hover:text-emerald-600">Sales</Link><ChevronRight className="w-4 h-4 text-slate-400" /><Link to="/sales/quotations" className="text-slate-500 hover:text-emerald-600">Quotations</Link><ChevronRight className="w-4 h-4 text-slate-400" /><span className="font-medium">{isEditMode ? 'Edit' : 'New'}</span></div>
        
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3"><FileText className="w-8 h-8 text-emerald-600" />{isEditMode ? 'Edit' : 'Create'} Quotation</h1>
          <div className="flex gap-2">
            <button onClick={downloadPDF} disabled={downloading} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"><Download className="w-4 h-4" />{downloading ? '...' : 'PDF'}</button>
            <button onClick={() => handleSave('draft')} disabled={saving} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" />{saving ? '...' : 'Save'}</button>
            <button onClick={() => handleSave('sent')} disabled={saving} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"><Send className="w-4 h-4" />{saving ? '...' : 'Send'}</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold mb-3">Customer</h2>
              <select value={quotationData.client_id} onChange={(e) => handleClientSelect(e.target.value)} className="w-full p-3 neu-inset rounded-xl mb-3"><option value="">Select Client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select>
              <input type="text" value={quotationData.client_name} onChange={(e) => setQuotationData({...quotationData, client_name: e.target.value})} placeholder="Customer Name" className="w-full p-3 neu-inset rounded-xl mb-3" />
              <div className="grid grid-cols-2 gap-3 mb-3"><input type="email" value={quotationData.client_email} onChange={(e) => setQuotationData({...quotationData, client_email: e.target.value})} placeholder="Email" className="p-3 neu-inset rounded-xl" /><input type="text" value={quotationData.client_phone} onChange={(e) => setQuotationData({...quotationData, client_phone: e.target.value})} placeholder="Phone" className="p-3 neu-inset rounded-xl" /></div>
              <textarea value={quotationData.client_address} onChange={(e) => setQuotationData({...quotationData, client_address: e.target.value})} placeholder="Address" rows={2} className="w-full p-3 neu-inset rounded-xl" />
            </div>
            <div className="neu-raised rounded-3xl p-6">
              <div className="flex justify-between mb-3"><h2 className="text-lg font-semibold">Products</h2><button onClick={addItem} className="text-emerald-600 flex items-center gap-1 text-sm"><Plus className="w-4 h-4" />Add</button></div>
              {items.map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 mb-3">
                  <div className="flex justify-between mb-2"><span className="text-sm">Item {i+1}</span><button onClick={() => removeItem(i)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></div>
                  {/* ✅ Uses servicesList (from DB or fallback) */}
                  <select value={item.description} onChange={(e) => handleServiceSelect(i, e.target.value)} className="w-full p-2 neu-inset rounded-lg text-sm mb-2"><option value="">Select</option>{cats.map(cat => (<optgroup key={cat} label={cat}>{servicesList.filter(s=>s.category===cat).map(s=>(<option key={s.name} value={s.name}>{s.code} - {s.name}</option>))}</optgroup>))}</select>
                  <div className="grid grid-cols-4 gap-2"><input type="number" value={item.quantity} onChange={(e) => updateItem(i,'quantity',parseInt(e.target.value)||1)} placeholder="Qty" className="p-2 neu-inset rounded-lg text-sm" /><input type="number" value={item.unit_price} onChange={(e) => updateItem(i,'unit_price',parseFloat(e.target.value)||0)} placeholder="Price" className="p-2 neu-inset rounded-lg text-sm" /><input type="number" value={item.discount_percent} onChange={(e) => updateItem(i,'discount_percent',parseFloat(e.target.value)||0)} placeholder="Disc%" className="p-2 neu-inset rounded-lg text-sm" /><input type="number" value={item.tax_percent} onChange={(e) => updateItem(i,'tax_percent',parseFloat(e.target.value)||15)} placeholder="VAT%" className="p-2 neu-inset rounded-lg text-sm" /></div>
                  <p className="text-right text-sm font-bold mt-1">{fmt(cl(item))}</p>
                </div>
              ))}
            </div>
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold mb-3">Details</h2>
              <input type="date" value={quotationData.valid_until} onChange={(e) => setQuotationData({...quotationData, valid_until: e.target.value})} className="w-full p-3 neu-inset rounded-xl mb-3" />
              <textarea value={quotationData.notes} onChange={(e) => setQuotationData({...quotationData, notes: e.target.value})} placeholder="Notes" rows={2} className="w-full p-3 neu-inset rounded-xl" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-3">Totals</h3>
              {(() => {
                const ai = items.filter(i => i.description)
                const st = ai.reduce((s,i) => s + (i.quantity||0)*(i.unit_price||0), 0)
                const dc = ai.reduce((s,i) => s + (i.quantity||0)*(i.unit_price||0)*(i.discount_percent||0)/100, 0)
                const ad = st - dc
                const vt = ai.reduce((s,i) => {const lt=(i.quantity||0)*(i.unit_price||0);const a=lt-lt*(i.discount_percent||0)/100;return s+a*(i.tax_percent||15)/100}, 0)
                return <div className="space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal:</span><span>{fmt(st)}</span></div><div className="flex justify-between"><span>Discount:</span><span className="text-red-500">-{fmt(dc)}</span></div><div className="flex justify-between"><span>VAT:</span><span>{fmt(vt)}</span></div><div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Grand Total:</span><span className="text-emerald-600">{fmt(ad+vt)}</span></div></div>
              })()}
            </div>
            <div className="neu-raised rounded-3xl p-4">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Eye className="w-5 h-5 text-emerald-600" />Preview</h2>
              <div ref={previewRef} className="bg-slate-100 dark:bg-slate-700 rounded-xl overflow-auto flex items-center justify-center" style={{ minHeight: '400px', maxHeight: '600px' }}>
                <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'center center', width: A4_WIDTH_PX + 'px', backgroundColor: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', margin: '10px 0' }} dangerouslySetInnerHTML={{ __html: buildQuotationHTML(quotationData, items.filter(i => i.description)) }} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
