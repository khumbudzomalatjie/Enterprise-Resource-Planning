import { useState, useEffect } from 'react'
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
  Save, Send, Briefcase, Printer
} from 'lucide-react'

// ═══════════════════════════════════════════════
// COMPANY CONFIGURATION
// ═══════════════════════════════════════════════
const COMPANY = {
  name: 'NDANDULENI GROUP',
  tagline: 'Professional Cleaning & Hygiene Services',
  address: '2220 Manthata Street, Midrand, 1685',
  postalAddress: 'P.O. Box 1234, Midrand, 1685',
  phone: '070 419 9457',
  fax: '086 555 1234',
  email: 'account@ndandulenigroup.co.za',
  accountsEmail: 'accounts@ndandulenigroup.co.za',
  website: 'www.ndandulenigroup.co.za',
  registration: '2020/123456/07',
  vatNumber: '4567890123',
  bank: 'First National Bank (FNB)',
  branch: 'Midrand (250655)',
  accountNumber: '6277 123 45678',
  accountType: 'Business Cheque Account',
  reference: 'Quote Number',
}

// ═══════════════════════════════════════════════
// PRE-DEFINED SERVICES
// ═══════════════════════════════════════════════
const SERVICES = [
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
]

const DEFAULT_TERMS = [
  'Prices subject to change without prior notice.',
  'Goods supplied remain company property until fully paid.',
  'Returns subject to company policy and management approval.',
  'Quote valid for 30 days from date of issue.',
  'Errors and omissions excepted (E&OE).',
  'Delivery subject to stock availability.',
]

// ═══════════════════════════════════════════════
// BUILD A4 QUOTATION HTML
// ═══════════════════════════════════════════════
function buildQuotationHTML(quotation, items, companyInfo = COMPANY) {
  const fmt = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(amount || 0)
  const fmtDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const lineTotal = (item) => (item.quantity || 0) * (item.unit_price || 0)
  const discountAmount = (item) => lineTotal(item) * ((item.discount_percent || 0) / 100)
  const lineAfterDiscount = (item) => lineTotal(item) - discountAmount(item)
  const vatAmount = (item) => lineAfterDiscount(item) * ((item.tax_percent || 15) / 100)
  const lineGrandTotal = (item) => lineAfterDiscount(item) + vatAmount(item)

  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0)
  const totalDiscount = items.reduce((s, i) => s + discountAmount(i), 0)
  const totalAfterDiscount = subtotal - totalDiscount
  const totalVAT = items.reduce((s, i) => s + vatAmount(i), 0)
  const grandTotal = totalAfterDiscount + totalVAT
  const freight = 0

  const quoteNum = quotation?.quotation_number || 'DRAFT'
  const quoteDate = fmtDate(quotation?.quotation_date || new Date())
  const validUntil = fmtDate(quotation?.valid_until)
  const creatorName = quotation?.created_by_name || quotation?.prepared_by_name || 'Sales Department'
  const clientName = quotation?.client_name || ''
  const clientEmail = quotation?.client_email || ''
  const clientPhone = quotation?.client_phone || ''
  const clientAddress = quotation?.client_address || ''
  const notes = quotation?.notes || ''
  const terms = quotation?.terms_and_conditions || DEFAULT_TERMS.join('\n')
  const paymentTerms = quotation?.payment_terms || '50% Deposit, Balance on Completion'

  // Build product rows
  const productRows = items.filter(i => i.description).map((item, i) => {
    const isFree = item.unit_price === 0
    return `
    <tr>
      <td class="td-center">${i + 1}</td>
      <td class="td-left">${item.code || ''}</td>
      <td class="td-left desc-col">
        ${item.description}
        ${isFree ? '<br><span style="color:#059669;font-weight:bold;font-size:8px;">FREE ITEM / BUNDLE</span>' : ''}
      </td>
      <td class="td-center">${item.quantity}</td>
      <td class="td-center">${item.unit || 'each'}</td>
      <td class="td-right">${isFree ? '0.00' : fmt(item.unit_price)}</td>
      <td class="td-center">${item.discount_percent || 0}%</td>
      <td class="td-center">${item.tax_percent || 15}%</td>
      <td class="td-right"><strong>${fmt(lineGrandTotal(item))}</strong></td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: Arial, Helvetica, sans-serif; 
    font-size: 9px; 
    color: #1a1a1a; 
    background: white;
    line-height: 1.3;
  }
  .page { width: 190mm; padding: 0; }
  
  /* HEADER */
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1B5080; padding-bottom: 8px; margin-bottom: 6px; }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .logo-box { width: 50px; height: 50px; border-radius: 50%; background: #e8f0f8; display: flex; align-items: center; justify-content: center; border: 2px solid #c5d5e8; font-size: 18px; font-weight: bold; color: #1B5080; flex-shrink: 0; }
  .company-name { font-size: 18px; font-weight: bold; color: #0D2D4A; margin: 0; }
  .company-detail { font-size: 7px; color: #64748b; margin: 0; }
  
  .header-right { text-align: right; flex-shrink: 0; }
  .quote-title { font-size: 26px; font-weight: bold; color: #0D2D4A; margin: 0; letter-spacing: 2px; }
  .quote-number { font-size: 12px; color: #1B5080; font-weight: bold; margin: 2px 0; }
  .quote-info { font-size: 7px; color: #64748b; }
  .quote-info p { margin: 0; }
  
  /* INFO BOXES */
  .info-row { display: flex; gap: 8px; margin-bottom: 6px; }
  .info-box { flex: 1; border: 1px solid #d1d5db; border-radius: 4px; padding: 6px 8px; }
  .info-box-title { font-size: 7px; font-weight: bold; color: #1B5080; text-transform: uppercase; margin-bottom: 3px; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; }
  .info-box p { font-size: 7px; margin: 1px 0; }
  .info-box strong { color: #374151; }
  
  /* TABLE */
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  thead th { background: #1B5080; color: white; padding: 5px 6px; font-size: 7px; font-weight: bold; text-transform: uppercase; text-align: center; }
  .td-left { padding: 4px 6px; font-size: 7px; border-bottom: 1px solid #e5e7eb; text-align: left; }
  .td-center { padding: 4px 6px; font-size: 7px; border-bottom: 1px solid #e5e7eb; text-align: center; }
  .td-right { padding: 4px 6px; font-size: 7px; border-bottom: 1px solid #e5e7eb; text-align: right; }
  .desc-col { max-width: 200px; word-wrap: break-word; }
  
  /* TOTALS */
  .totals-row { display: flex; justify-content: flex-end; margin-bottom: 6px; }
  .totals-box { width: 240px; border: 1px solid #d1d5db; border-radius: 4px; overflow: hidden; }
  .total-line { display: flex; justify-content: space-between; padding: 4px 10px; border-bottom: 1px solid #e5e7eb; font-size: 7px; }
  .total-line-grand { display: flex; justify-content: space-between; padding: 7px 10px; font-size: 12px; font-weight: bold; background: #eaf1f8; }
  
  /* BANKING & TERMS ROW */
  .bottom-row { display: flex; gap: 8px; margin-bottom: 4px; }
  .bottom-box { flex: 1; font-size: 6px; }
  .bottom-title { font-size: 7px; font-weight: bold; color: #1B5080; text-transform: uppercase; margin-bottom: 2px; }
  
  /* FOOTER */
  .footer { border-top: 1px solid #d1d5db; padding-top: 4px; text-align: center; font-size: 6px; color: #94a3b8; margin-top: 4px; }
  .footer a { color: #1B5080; text-decoration: none; }
</style>
</head>
<body>
<div class="page">

  <!-- SECTION 1: HEADER -->
  <div class="header">
    <div class="header-left">
      <div class="logo-box">NG</div>
      <div>
        <h1 class="company-name">${companyInfo.name}</h1>
        <p class="company-detail">${companyInfo.tagline}</p>
        <p class="company-detail">${companyInfo.address}</p>
        <p class="company-detail">Tel: ${companyInfo.phone} | Fax: ${companyInfo.fax}</p>
        <p class="company-detail">Email: ${companyInfo.email} | Web: ${companyInfo.website}</p>
        <p class="company-detail">Reg: ${companyInfo.registration} | VAT: ${companyInfo.vatNumber}</p>
      </div>
    </div>
    <div class="header-right">
      <h2 class="quote-title">QUOTATION</h2>
      <p class="quote-number">Quotation No: ${quoteNum}</p>
      <div class="quote-info">
        <p>Date: ${quoteDate}</p>
        <p>Expiry: ${validUntil}</p>
        <p>Salesperson: ${creatorName}</p>
        <p>Branch: Johannesburg</p>
        <p>Currency: ZAR</p>
        <p>Status: ${quotation?.status || 'Draft'}</p>
      </div>
    </div>
  </div>

  <!-- SECTION 2 & 3: CUSTOMER & QUOTE INFO -->
  <div class="info-row">
    <div class="info-box">
      <div class="info-box-title">Customer Details</div>
      <p><strong>Customer:</strong> ${clientName}</p>
      <p><strong>Contact:</strong> ${clientName}</p>
      <p><strong>Phone:</strong> ${clientPhone || 'N/A'}</p>
      <p><strong>Email:</strong> ${clientEmail || 'N/A'}</p>
      <p><strong>Address:</strong> ${clientAddress || 'N/A'}</p>
    </div>
    <div class="info-box">
      <div class="info-box-title">Quote Information</div>
      <p><strong>Quotation No:</strong> ${quoteNum}</p>
      <p><strong>Order Date:</strong> ${quoteDate}</p>
      <p><strong>Terms:</strong> ${paymentTerms}</p>
      <p><strong>Delivery Method:</strong> On-site Service</p>
      <p><strong>Sales Rep:</strong> ${creatorName}</p>
      <p><strong>Branch:</strong> Johannesburg</p>
    </div>
  </div>

  <!-- SECTION 4: PRODUCTS TABLE -->
  <table>
    <thead>
      <tr>
        <th>No</th><th>Item Code</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Disc</th><th>VAT</th><th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${productRows || '<tr><td colspan="9" class="td-center" style="padding:20px;color:#94a3b8;">No items added</td></tr>'}
    </tbody>
  </table>

  <!-- SECTION 5: TOTALS -->
  <div class="totals-row">
    <div class="totals-box">
      <div class="total-line"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
      <div class="total-line"><span>Discount</span><span>-${fmt(totalDiscount)}</span></div>
      <div class="total-line"><span>Freight</span><span>${fmt(freight)}</span></div>
      <div class="total-line"><span>VAT (15%)</span><span>${fmt(totalVAT)}</span></div>
      <div class="total-line-grand"><span>Grand Total</span><span>${fmt(grandTotal)}</span></div>
    </div>
  </div>

  <!-- SECTION 6: NOTES -->
  ${notes ? `<div class="info-box" style="margin-bottom:4px;"><div class="info-box-title">Notes</div><p style="font-size:7px;white-space:pre-line;">${notes}</p></div>` : ''}

  <!-- SECTION 7 & 8: TERMS & BANKING -->
  <div class="bottom-row">
    <div class="bottom-box">
      <div class="bottom-title">Terms & Conditions</div>
      <p style="white-space:pre-line;font-size:6px;color:#64748b;">${terms}</p>
    </div>
    <div class="bottom-box">
      <div class="bottom-title">Banking Details</div>
      <p style="font-size:6px;"><strong>Bank:</strong> ${companyInfo.bank}</p>
      <p style="font-size:6px;"><strong>Branch:</strong> ${companyInfo.branch}</p>
      <p style="font-size:6px;"><strong>Account No:</strong> ${companyInfo.accountNumber}</p>
      <p style="font-size:6px;"><strong>Type:</strong> ${companyInfo.accountType}</p>
      <p style="font-size:6px;"><strong>Reference:</strong> ${quoteNum}</p>
      <p style="font-size:6px;"><strong>Email:</strong> ${companyInfo.email}</p>
    </div>
  </div>

  <!-- SECTION 9: FOOTER -->
  <div class="footer">
    <p>${companyInfo.website} | ${companyInfo.email} | ${companyInfo.phone}</p>
    <p>Page 1 of 1</p>
  </div>

</div>
</body>
</html>`
}

// ═══════════════════════════════════════════════
// CREATE/EDIT QUOTATION PAGE
// ═══════════════════════════════════════════════
export default function CreateQuotation() {
  const { id } = useParams()
  const isEditMode = Boolean(id)

  const createQuotation = useSalesStore((state) => state.createQuotation)
  const updateQuotation = useSalesStore((state) => state.updateQuotation)
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
    notes: '', terms_and_conditions: DEFAULT_TERMS.join('\n'),
    status: 'draft', created_by_name: '', prepared_by_name: ''
  })

  const [items, setItems] = useState([
    { code: '', description: '', quantity: 1, unit: 'per_service', unit_price: 0, tax_percent: 15, discount_percent: 0 }
  ])

  const [savedQuotationId, setSavedQuotationId] = useState(null)
  const [loadingQuote, setLoadingQuote] = useState(false)

  useEffect(() => { fetchClients({ status: 'active' }); setCurrentUserName() }, [])
  
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
        notes: q.notes || '', terms_and_conditions: q.terms_and_conditions || DEFAULT_TERMS.join('\n'),
        status: q.status || 'draft', created_by_name: q.created_by_name || '', prepared_by_name: q.prepared_by_name || ''
      })
      if (q.quotation_items?.length) setItems(q.quotation_items.map(i => ({ code: i.code || '', description: i.description || '', quantity: i.quantity || 1, unit: i.unit || 'per_service', unit_price: i.unit_price || 0, tax_percent: i.tax_percent || 15, discount_percent: i.discount_percent || 0 })))
      setSavedQuotationId(q.id)
    }
    setLoadingQuote(false)
  }

  const handleClientSelect = (cid) => {
    const c = clients.find(x => x.id === cid)
    if (c) setQuotationData(prev => ({ ...prev, client_id: c.id, client_name: c.company_name || '', client_email: c.email || '', client_phone: c.phone || '', client_address: `${c.address_line1 || ''}, ${c.city || ''}` }))
  }

  const handleServiceSelect = (idx, svcName) => {
    const svc = SERVICES.find(s => s.name === svcName)
    if (svc) {
      const ni = [...items]
      ni[idx] = { ...ni[idx], code: svc.code, description: svc.name, unit: svc.unit, unit_price: svc.unit_price }
      setItems(ni)
    }
  }

  const addItem = () => setItems([...items, { code: '', description: '', quantity: 1, unit: 'per_service', unit_price: 0, tax_percent: 15, discount_percent: 0 }])
  const removeItem = (i) => { if (items.length > 1) setItems(items.filter((_, idx) => idx !== i)) }
  const updateItem = (i, f, v) => { const ni = [...items]; ni[i] = { ...ni[i], [f]: v }; setItems(ni) }

  const handleSave = async (status = 'draft') => {
    if (!quotationData.client_name) { toast.error('Select a client'); return }
    if (!items.some(i => i.description)) { toast.error('Add at least one service'); return }
    
    const { data: { user } } = await supabase.auth.getUser()
    const cleanItems = items.filter(i => i.description).map(i => ({ code: i.code, description: i.description, quantity: i.quantity || 1, unit: i.unit || 'per_service', unit_price: i.unit_price || 0, tax_percent: i.tax_percent ?? 15, discount_percent: i.discount_percent ?? 0 }))
    
    const lineTotal = (i) => i.quantity * i.unit_price
    const disc = (i) => lineTotal(i) * (i.discount_percent / 100)
    const afterDisc = (i) => lineTotal(i) - disc(i)
    const vat = (i) => afterDisc(i) * (i.tax_percent / 100)
    const subtotal = cleanItems.reduce((s, i) => s + lineTotal(i), 0)
    const totalDiscount = cleanItems.reduce((s, i) => s + disc(i), 0)
    const totalVAT = cleanItems.reduce((s, i) => s + vat(i), 0)
    
    const payload = { ...quotationData, subtotal, tax_amount: totalVAT, discount_amount: totalDiscount, total_amount: subtotal - totalDiscount + totalVAT, status, created_by: user?.id, created_by_name: quotationData.created_by_name, prepared_by: user?.id, prepared_by_name: quotationData.prepared_by_name }

    if (isEditMode) {
      const r = await updateQuotation(id, payload)
      if (!r.success) { toast.error('Update failed'); return }
      toast.success('Updated!')
    } else {
      const r = await createQuotation(payload, cleanItems)
      if (!r.success) { toast.error('Save failed'); return }
      setSavedQuotationId(r.data.id)
      toast.success('Saved!')
    }
  }

  const downloadPDF = async () => {
    try {
      toast.loading('Generating PDF...')
      const freshHTML = buildQuotationHTML(quotationData, items.filter(i => i.description))
      const container = document.createElement('div')
      container.id = 'pdf-' + Date.now()
      container.innerHTML = freshHTML
      container.style.position = 'absolute'; container.style.left = '-9999px'; container.style.width = '210mm'
      document.body.appendChild(container)
      await new Promise(r => setTimeout(r, 500))
      
      const html2pdf = (await import('html2pdf.js')).default
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `Quotation_${quotationData.quotation_number || 'draft'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css'] }
      }).from(container).save()
      
      document.body.removeChild(container)
      toast.dismiss(); toast.success('PDF downloaded! 📄')
    } catch (e) { toast.dismiss(); toast.error('PDF failed') }
  }

  const fmt = (a) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(a || 0)
  const cats = [...new Set(SERVICES.map(s => s.category))]
  const calcLine = (i) => (i.quantity || 0) * (i.unit_price || 0)

  if (loadingQuote) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>

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

      <main className="max-w-7xl mx-auto px-4 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/sales" className="text-slate-500 hover:text-emerald-600">Sales</Link><ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/sales/quotations" className="text-slate-500 hover:text-emerald-600">Quotations</Link><ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{isEditMode ? 'Edit' : 'New'}</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3"><FileText className="w-8 h-8 text-emerald-600" />{isEditMode ? 'Edit' : 'Create'} Quotation</h1>
          <div className="flex gap-2">
            <button onClick={downloadPDF} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"><Download className="w-4 h-4" />PDF</button>
            <button onClick={() => handleSave('draft')} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2"><Save className="w-4 h-4" />Save</button>
            <button onClick={() => handleSave('sent')} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"><Send className="w-4 h-4" />Send</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold mb-3">Customer Details</h2>
              <select value={quotationData.client_id} onChange={(e) => handleClientSelect(e.target.value)} className="w-full p-3 neu-inset rounded-xl mb-3"><option value="">Select Client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select>
              <input type="text" value={quotationData.client_name} onChange={(e) => setQuotationData({...quotationData, client_name: e.target.value})} placeholder="Customer Name" className="w-full p-3 neu-inset rounded-xl mb-3" />
              <div className="grid grid-cols-2 gap-3 mb-3"><input type="email" value={quotationData.client_email} onChange={(e) => setQuotationData({...quotationData, client_email: e.target.value})} placeholder="Email" className="p-3 neu-inset rounded-xl" /><input type="text" value={quotationData.client_phone} onChange={(e) => setQuotationData({...quotationData, client_phone: e.target.value})} placeholder="Phone" className="p-3 neu-inset rounded-xl" /></div>
              <textarea value={quotationData.client_address} onChange={(e) => setQuotationData({...quotationData, client_address: e.target.value})} placeholder="Address" rows={2} className="w-full p-3 neu-inset rounded-xl" />
            </div>

            <div className="neu-raised rounded-3xl p-6">
              <div className="flex justify-between mb-3"><h2 className="text-lg font-semibold">Products/Services</h2><button onClick={addItem} className="text-emerald-600 flex items-center gap-1 text-sm"><Plus className="w-4 h-4" />Add</button></div>
              {items.map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 mb-3">
                  <div className="flex justify-between mb-2"><span className="text-sm font-medium">Item {i+1}</span><button onClick={() => removeItem(i)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></div>
                  <select value={item.description} onChange={(e) => handleServiceSelect(i, e.target.value)} className="w-full p-2 neu-inset rounded-lg text-sm mb-2"><option value="">Select Service</option>{cats.map(cat => (<optgroup key={cat} label={cat}>{SERVICES.filter(s=>s.category===cat).map(s=>(<option key={s.name} value={s.name}>{s.code} - {s.name}</option>))}</optgroup>))}</select>
                  <div className="grid grid-cols-4 gap-2">
                    <input type="number" value={item.quantity} onChange={(e) => updateItem(i,'quantity',parseInt(e.target.value)||1)} placeholder="Qty" className="p-2 neu-inset rounded-lg text-sm" />
                    <input type="number" value={item.unit_price} onChange={(e) => updateItem(i,'unit_price',parseFloat(e.target.value)||0)} placeholder="Price" className="p-2 neu-inset rounded-lg text-sm" />
                    <input type="number" value={item.discount_percent} onChange={(e) => updateItem(i,'discount_percent',parseFloat(e.target.value)||0)} placeholder="Disc%" className="p-2 neu-inset rounded-lg text-sm" />
                    <input type="number" value={item.tax_percent} onChange={(e) => updateItem(i,'tax_percent',parseFloat(e.target.value)||15)} placeholder="VAT%" className="p-2 neu-inset rounded-lg text-sm" />
                  </div>
                  <p className="text-right text-sm font-bold mt-1">{fmt(calcLine(item))}</p>
                </div>
              ))}
            </div>

            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold mb-3">Quote Details</h2>
              <input type="date" value={quotationData.valid_until} onChange={(e) => setQuotationData({...quotationData, valid_until: e.target.value})} className="w-full p-3 neu-inset rounded-xl mb-3" />
              <textarea value={quotationData.notes} onChange={(e) => setQuotationData({...quotationData, notes: e.target.value})} placeholder="Notes for customer..." rows={2} className="w-full p-3 neu-inset rounded-xl mb-3" />
              <textarea value={quotationData.terms_and_conditions} onChange={(e) => setQuotationData({...quotationData, terms_and_conditions: e.target.value})} placeholder="Terms & Conditions" rows={3} className="w-full p-3 neu-inset rounded-xl text-xs" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-3">Totals</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal:</span><span>{fmt(items.reduce((s,i)=>s+calcLine(i),0))}</span></div>
                <div className="flex justify-between"><span>Discount:</span><span className="text-red-500">-{fmt(items.reduce((s,i)=>s+calcLine(i)*(i.discount_percent||0)/100,0))}</span></div>
                <div className="flex justify-between"><span>VAT:</span><span>{fmt(items.reduce((s,i)=>{const lt=calcLine(i);const ad=lt-lt*(i.discount_percent||0)/100;return s+ad*(i.tax_percent||15)/100},0))}</span></div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Grand Total:</span><span className="text-emerald-600">{fmt(items.reduce((s,i)=>{const lt=calcLine(i);const ad=lt-lt*(i.discount_percent||0)/100;return s+ad+ad*(i.tax_percent||15)/100},0))}</span></div>
              </div>
            </div>

            <div className="neu-raised rounded-3xl p-4">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Eye className="w-5 h-5 text-emerald-600" />Preview</h2>
              <div className="bg-white rounded-xl overflow-hidden shadow-inner border" style={{ maxHeight: '500px', overflow: 'auto' }}>
                <div style={{ transform: 'scale(0.33)', transformOrigin: 'top left', width: '303%' }}>
                  <div dangerouslySetInnerHTML={{ __html: buildQuotationHTML(quotationData, items.filter(i => i.description)) }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
