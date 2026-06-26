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
  Save, Send, Briefcase
} from 'lucide-react'

// Pre-defined services
const SERVICES = [
  { category: 'Once-Off Cleaning', name: '1 Bedroom - Once-Off', unit_price: 1304.35, unit: 'per_service' },
  { category: 'Once-Off Cleaning', name: '2 Bedroom - Once-Off', unit_price: 1739.13, unit: 'per_service' },
  { category: 'Once-Off Cleaning', name: '3 Bedroom - Once-Off', unit_price: 2347.83, unit: 'per_service' },
  { category: 'Once-Off Cleaning', name: '4 Bedroom - Once-Off', unit_price: 3043.48, unit: 'per_service' },
  { category: 'Once-Off Cleaning', name: '5 Bedroom - Once-Off', unit_price: 3478.26, unit: 'per_service' },
  { category: 'Monthly Contract (1x Week)', name: '1 Bedroom - 1x Week', unit_price: 869.57, unit: 'per_month' },
  { category: 'Monthly Contract (1x Week)', name: '2 Bedroom - 1x Week', unit_price: 1043.48, unit: 'per_month' },
  { category: 'Monthly Contract (1x Week)', name: '3 Bedroom - 1x Week', unit_price: 1391.30, unit: 'per_month' },
  { category: 'Monthly Contract (1x Week)', name: '4 Bedroom - 1x Week', unit_price: 1739.13, unit: 'per_month' },
  { category: 'Monthly Contract (1x Week)', name: '5 Bedroom - 1x Week', unit_price: 2173.91, unit: 'per_month' },
  { category: 'Monthly Contract (2x Week)', name: '1 Bedroom - 2x Week', unit_price: 1565.22, unit: 'per_month' },
  { category: 'Monthly Contract (2x Week)', name: '2 Bedroom - 2x Week', unit_price: 1913.04, unit: 'per_month' },
  { category: 'Monthly Contract (2x Week)', name: '3 Bedroom - 2x Week', unit_price: 2434.78, unit: 'per_month' },
  { category: 'Monthly Contract (2x Week)', name: '4 Bedroom - 2x Week', unit_price: 3130.43, unit: 'per_month' },
  { category: 'Monthly Contract (2x Week)', name: '5 Bedroom - 2x Week', unit_price: 3913.04, unit: 'per_month' },
  { category: 'Monthly Contract (3x Week)', name: '1 Bedroom - 3x Week', unit_price: 2173.91, unit: 'per_month' },
  { category: 'Monthly Contract (3x Week)', name: '2 Bedroom - 3x Week', unit_price: 2608.70, unit: 'per_month' },
  { category: 'Monthly Contract (3x Week)', name: '3 Bedroom - 3x Week', unit_price: 3043.48, unit: 'per_month' },
  { category: 'Monthly Contract (3x Week)', name: '4 Bedroom - 3x Week', unit_price: 3913.04, unit: 'per_month' },
  { category: 'Monthly Contract (3x Week)', name: '5 Bedroom - 3x Week', unit_price: 4782.61, unit: 'per_month' },
]

const COMPANY = {
  name: 'NDANDULENI GROUP',
  tagline: 'Professional Cleaning & Hygiene Services',
  address: '2220 Manthata Street, Midrand, 1685',
  phone: '070 419 9457',
  email: 'account@ndandulenigroup.co.za',
  website: 'www.ndandulenigroup.co.za',
  registration: '2020/123456/07',
  vatNumber: '4567890123',
  bank: 'First National Bank (FNB)',
  accountName: 'Ndanduleni Group (Pty) Ltd',
  accountNumber: '6277 123 45678',
  branchCode: '250655',
}

// ═══════════════════════════════════════════════
// BUILD FRESH HTML FOR PDF - EVERY TIME
// ═══════════════════════════════════════════════
function buildPDFHTML(quotation, items) {
  const fmt = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(amount || 0)
  const fmtDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : '__________'

  const lineTotal = (item) => (item.quantity || 0) * (item.unit_price || 0)
  const subtotal = (items || []).reduce((s, i) => s + lineTotal(i), 0)
  const vat = subtotal * 0.15
  const total = subtotal + vat

  const creator = quotation?.created_by_name || quotation?.prepared_by_name || 'Ndanduleni Group Sales'
  const qNum = quotation?.quotation_number || 'DRAFT'
  const client = quotation?.client_name || 'Client'
  const clientEmail = quotation?.client_email || ''
  const clientAddr = quotation?.client_address || ''
  const payTerms = quotation?.payment_terms || '50% Deposit, Balance on Completion'
  const vUntil = fmtDate(quotation?.valid_until)
  const qDate = fmtDate(quotation?.quotation_date || new Date())
  const notes = quotation?.notes || ''

  const itemRows = (items || []).filter(i => i.description).map((item, i) => `
    <tr>
      <td class="td">${i + 1}</td>
      <td class="td" style="font-weight:500;">${item.description}</td>
      <td class="td" style="text-align:center;">${item.quantity}</td>
      <td class="td" style="text-align:right;">${fmt(item.unit_price)}</td>
      <td class="td" style="text-align:right;font-weight:600;">${fmt(lineTotal(item))}</td>
    </tr>
  `).join('')

  // Build COMPLETELY fresh HTML string
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;background:white}
  .td{padding:4px 8px;font-size:9px;color:#1e293b;border-bottom:1px solid #e2e8f0}
  .th{padding:5px 8px;font-size:8px;font-weight:bold;text-transform:uppercase;text-align:left}
  .section-title{font-size:8px;font-weight:bold;color:#64748b;text-transform:uppercase;margin-bottom:2px;letter-spacing:1px}
  .small-text{font-size:7px;color:#94a3b8}
  .tiny-text{font-size:6px;color:#94a3b8}
</style>
</head>
<body>
<div style="width:794px;padding:18px 32px;background:white;">

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;border-bottom:3px solid #1B5080;padding-bottom:6px;margin-bottom:8px;">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:40px;height:40px;border-radius:50%;background:#e8f0f8;display:flex;align-items:center;justify-content:center;border:2px solid #c5d5e8;font-size:16px;font-weight:bold;color:#1B5080;">NG</div>
      <div>
        <h1 style="font-size:20px;font-weight:bold;color:#0D2D4A;margin:0;line-height:1.1;">${COMPANY.name}</h1>
        <p class="tiny-text" style="margin:1px 0;">${COMPANY.tagline}</p>
        <p class="tiny-text" style="margin:0;">${COMPANY.address} | Tel: ${COMPANY.phone} | ${COMPANY.email}</p>
      </div>
    </div>
    <div style="text-align:right;">
      <h2 style="font-size:26px;font-weight:bold;color:#0D2D4A;margin:0;letter-spacing:1px;line-height:1;">QUOTATION</h2>
      <p style="font-size:14px;color:#1B5080;margin:2px 0;font-weight:bold;">#${qNum}</p>
      <p class="tiny-text" style="margin:1px 0;">Date: ${qDate}</p>
      <p class="tiny-text" style="margin:1px 0;">Valid Until: ${vUntil}</p>
    </div>
  </div>

  <!-- BILL TO & DETAILS -->
  <div style="display:flex;gap:20px;margin-bottom:8px;">
    <div style="flex:1;">
      <p class="section-title">Bill To:</p>
      <p style="font-size:13px;font-weight:bold;margin:0;">${client}</p>
      ${clientEmail ? `<p class="tiny-text" style="margin:1px 0;">${clientEmail}</p>` : ''}
      <p class="tiny-text" style="margin:1px 0;white-space:pre-line;">${clientAddr}</p>
    </div>
    <div style="flex:1;">
      <p class="section-title">Details:</p>
      <p style="font-size:10px;margin:1px 0;"><strong>Prepared By:</strong> ${creator}</p>
      <p class="tiny-text" style="margin:1px 0;"><strong>Payment Terms:</strong> ${payTerms}</p>
      <p class="tiny-text" style="margin:1px 0;"><strong>Validity:</strong> 30 Days</p>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
    <thead>
      <tr style="background:#1B5080;color:white;">
        <th class="th">#</th>
        <th class="th">Description</th>
        <th class="th" style="text-align:center;width:35px;">Qty</th>
        <th class="th" style="text-align:right;width:80px;">Unit Price</th>
        <th class="th" style="text-align:right;width:80px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="5" style="padding:12px;text-align:center;font-size:9px;color:#94a3b8;">No items</td></tr>'}
    </tbody>
  </table>

  <!-- TOTALS -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
    <div style="width:220px;border:1px solid #e2e8f0;border-radius:3px;">
      <div style="display:flex;justify-content:space-between;padding:4px 10px;border-bottom:1px solid #e2e8f0;font-size:8px;background:#f8fafc;">
        <span>Subtotal (Excl. VAT):</span><span style="font-weight:600;">${fmt(subtotal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:4px 10px;border-bottom:1px solid #e2e8f0;font-size:8px;background:#f8fafc;">
        <span>VAT (15%):</span><span>${fmt(vat)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:7px 10px;font-size:13px;font-weight:bold;background:#eaf1f8;">
        <span style="color:#0D2D4A;">TOTAL (Incl. VAT):</span><span style="color:#0D2D4A;font-size:14px;">${fmt(total)}</span>
      </div>
    </div>
  </div>

  <!-- TERMS -->
  <div style="margin-bottom:5px;">
    <p class="section-title">Terms & Conditions</p>
    <p class="small-text" style="line-height:1.3;margin:0;">1. Valid 30 days. 2. Payment: ${payTerms}. 3. Prices include 15% VAT. 4. Services per agreed schedule. 5. 30 days cancellation notice. 6. Ndanduleni Group reserves right to adjust pricing for scope changes.</p>
  </div>

  <!-- BANKING -->
  <div style="margin-bottom:5px;padding:4px 10px;background:#f8fafc;border-radius:3px;border:1px solid #e2e8f0;">
    <p class="section-title" style="color:#1B5080;">Banking Details</p>
    <div style="display:flex;gap:18px;">
      <div class="tiny-text"><p style="margin:0;"><strong>Bank:</strong> ${COMPANY.bank}</p><p style="margin:0;"><strong>Account:</strong> ${COMPANY.accountName}</p></div>
      <div class="tiny-text"><p style="margin:0;"><strong>Acc #:</strong> ${COMPANY.accountNumber}</p><p style="margin:0;"><strong>Branch:</strong> ${COMPANY.branchCode}</p></div>
      <div class="tiny-text"><p style="margin:0;"><strong>Ref:</strong> ${qNum}</p></div>
    </div>
  </div>

  ${notes ? `<div style="margin-bottom:5px;padding:3px 10px;background:#f8fafc;border-radius:3px;"><p class="tiny-text" style="margin:0;"><strong>Notes:</strong> ${notes}</p></div>` : ''}

  <!-- FOOTER -->
  <div style="margin-top:10px;border-top:2px solid #1B5080;padding-top:5px;text-align:center;">
    <p class="tiny-text" style="margin:0;">${COMPANY.name} (Pty) Ltd | Reg: ${COMPANY.registration} | VAT: ${COMPANY.vatNumber}</p>
    <p class="tiny-text" style="margin:1px 0;">${COMPANY.address} | Tel: ${COMPANY.phone} | Email: ${COMPANY.email}</p>
    <p style="font-size:9px;color:#1B5080;margin:3px 0 0 0;font-weight:bold;">Thank you for your business!</p>
  </div>

</div>
</body>
</html>`
}

// ═══════════════════════════════════════════════
// Create/Edit Quotation Page
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
    payment_terms: '50% Deposit, Balance on Completion', tax_rate: 15,
    discount_type: 'none', discount_value: 0, notes: '', status: 'draft',
    created_by_name: '', prepared_by_name: ''
  })

  const [items, setItems] = useState([
    { description: '', quantity: 1, unit: 'per_service', unit_price: 0, tax_percent: 15, discount_percent: 0 }
  ])

  const [savedQuotationId, setSavedQuotationId] = useState(null)
  const [loadingQuote, setLoadingQuote] = useState(false)

  useEffect(() => {
    fetchClients({ status: 'active' })
    setCurrentUserName()
  }, [])

  const setCurrentUserName = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      const userName = profile?.full_name || user.email?.split('@')[0] || 'Unknown'
      setQuotationData(prev => ({ ...prev, created_by_name: userName, prepared_by_name: userName }))
    }
  }

  useEffect(() => { if (id) loadExistingQuotation(id) }, [id])

  const loadExistingQuotation = async (quotationId) => {
    setLoadingQuote(true)
    const result = await fetchQuotation(quotationId)
    if (result.success && result.data) {
      const quote = result.data
      setQuotationData({
        client_id: quote.client_id || '', client_name: quote.client_name || quote.clients?.company_name || '',
        client_email: quote.client_email || quote.clients?.email || '',
        client_phone: quote.client_phone || quote.clients?.phone || '',
        client_address: quote.client_address || '',
        valid_until: quote.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_terms: quote.payment_terms || '50% Deposit, Balance on Completion',
        tax_rate: quote.tax_rate || 15, discount_type: quote.discount_type || 'none',
        discount_value: quote.discount_value || 0, notes: quote.notes || '', status: quote.status || 'draft',
        created_by_name: quote.created_by_name || quote.prepared_by_name || '',
        prepared_by_name: quote.prepared_by_name || quote.created_by_name || ''
      })
      if (quote.quotation_items?.length > 0) {
        setItems(quote.quotation_items.map(item => ({
          description: item.description || '', quantity: item.quantity || 1,
          unit: item.unit || 'per_service', unit_price: item.unit_price || 0,
          tax_percent: item.tax_percent || 15, discount_percent: item.discount_percent || 0
        })))
      }
      setSavedQuotationId(quote.id)
    } else { toast.error('Failed to load'); navigate('/sales/quotations') }
    setLoadingQuote(false)
  }

  const calcLineTotal = (item) => (item.quantity || 0) * (item.unit_price || 0)
  const calcSubtotal = () => items.reduce((sum, item) => sum + calcLineTotal(item), 0)
  const calcVAT = () => calcSubtotal() * 0.15
  const calcTotal = () => calcSubtotal() + calcVAT()

  const handleClientSelect = (clientId) => {
    const client = clients.find((c) => c.id === clientId)
    if (client) setQuotationData({ ...quotationData, client_id: client.id, client_name: client.company_name || '', client_email: client.email || '', client_phone: client.phone || '', client_address: `${client.address_line1 || ''}, ${client.city || ''}, ${client.postal_code || ''}` })
  }

  const handleServiceSelect = (index, serviceName) => {
    const service = SERVICES.find((s) => s.name === serviceName)
    if (service) {
      const newItems = [...items]
      newItems[index] = { ...newItems[index], description: service.name, unit: service.unit, unit_price: service.unit_price, tax_percent: 15 }
      setItems(newItems)
    }
  }

  const addItem = () => setItems([...items, { description: '', quantity: 1, unit: 'per_service', unit_price: 0, tax_percent: 15, discount_percent: 0 }])
  const removeItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)) }
  const updateItem = (index, field, value) => { const newItems = [...items]; newItems[index] = { ...newItems[index], [field]: value }; setItems(newItems) }

  const handleSave = async (status = 'draft') => {
    if (!quotationData.client_name) { toast.error('Please select a client'); return }
    if (!items.some(i => i.description && i.unit_price > 0)) { toast.error('Add at least one service'); return }

    const { data: { user } } = await supabase.auth.getUser()
    let userName = quotationData.created_by_name || 'Unknown'

    const cleanItems = items.filter(i => i.description).map(i => ({
      description: i.description, quantity: i.quantity || 1, unit: i.unit || 'per_service',
      unit_price: i.unit_price || 0, tax_percent: i.tax_percent ?? 15, discount_percent: i.discount_percent ?? 0
    }))

    const payload = { ...quotationData, subtotal: calcSubtotal(), tax_amount: calcVAT(), discount_amount: 0, total_amount: calcTotal(), status, created_by: user?.id, created_by_name: userName, prepared_by: user?.id, prepared_by_name: userName }

    if (isEditMode) {
      const result = await updateQuotation(id, payload)
      if (!result.success) { toast.error('Failed to update'); return }
      toast.success('Updated!')
    } else {
      const result = await createQuotation(payload, cleanItems)
      if (!result.success) { toast.error('Failed to save'); return }
      setSavedQuotationId(result.data.id)
      toast.success('Saved!')
    }
  }

  // ═══════════════════════════════════════════════
  // PDF DOWNLOAD - FRESH BUILD EVERY TIME
  // ═══════════════════════════════════════════════
  const downloadPDF = async () => {
    try {
      toast.loading('Generating PDF...')

      // Build FRESH HTML from current state
      const freshHTML = buildPDFHTML(quotationData, items.filter(i => i.description))

      // Create a unique container
      const containerId = 'pdf-container-' + Date.now()
      const container = document.createElement('div')
      container.id = containerId
      container.innerHTML = freshHTML
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.width = '794px'
      container.style.backgroundColor = 'white'
      document.body.appendChild(container)

      // Wait for fonts/images to load
      await new Promise(resolve => setTimeout(resolve, 600))

      const html2pdf = (await import('html2pdf.js')).default

      const opt = {
        margin: [0, 0, 0, 0],
        filename: `Quotation_${(quotationData.client_name || 'client').replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true, 
          width: 794,
          windowWidth: 794,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css'] }
      }

      await html2pdf().set(opt).from(container).save()

      // Clean up
      document.body.removeChild(container)
      toast.dismiss()
      toast.success('PDF downloaded! 📄')
    } catch (error) {
      console.error('PDF error:', error)
      toast.dismiss()
      toast.error('Failed to generate PDF: ' + error.message)
    }
  }

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(amount || 0)

  const serviceCategories = [...new Set(SERVICES.map((s) => s.category))]

  if (loadingQuote) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
  }

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/sales" className="text-slate-500 hover:text-emerald-600">Sales</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/sales/quotations" className="text-slate-500 hover:text-emerald-600">Quotations</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{isEditMode ? 'Edit' : 'New'}</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3"><FileText className="w-8 h-8 text-emerald-600" />{isEditMode ? 'Edit' : 'Create'} Quotation</h1>
          <div className="flex gap-3">
            <button onClick={downloadPDF} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"><Download className="w-4 h-4" />PDF</button>
            <button onClick={() => handleSave('draft')} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-700 flex items-center gap-2"><Save className="w-4 h-4" />Save</button>
            <button onClick={() => handleSave('sent')} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"><Send className="w-4 h-4" />Send</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold mb-4">Client</h2>
              <select value={quotationData.client_id} onChange={(e) => handleClientSelect(e.target.value)} className="w-full p-3 neu-inset rounded-xl mb-3"><option value="">Select Client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select>
              <input type="text" value={quotationData.client_name} onChange={(e) => setQuotationData({...quotationData, client_name: e.target.value})} placeholder="Client Name" className="w-full p-3 neu-inset rounded-xl mb-3" />
              <div className="grid grid-cols-2 gap-3 mb-3"><input type="email" value={quotationData.client_email} onChange={(e) => setQuotationData({...quotationData, client_email: e.target.value})} placeholder="Email" className="p-3 neu-inset rounded-xl" /><input type="text" value={quotationData.client_phone} onChange={(e) => setQuotationData({...quotationData, client_phone: e.target.value})} placeholder="Phone" className="p-3 neu-inset rounded-xl" /></div>
              <textarea value={quotationData.client_address} onChange={(e) => setQuotationData({...quotationData, client_address: e.target.value})} placeholder="Address" rows={2} className="w-full p-3 neu-inset rounded-xl" />
            </div>
            <div className="neu-raised rounded-3xl p-6">
              <div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">Services</h2><button onClick={addItem} className="text-emerald-600 flex items-center gap-1 text-sm"><Plus className="w-4 h-4" />Add</button></div>
              {items.map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 mb-3">
                  <div className="flex justify-between mb-2"><span>Service {i+1}</span><button onClick={() => removeItem(i)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></div>
                  <select value={item.description} onChange={(e) => handleServiceSelect(i, e.target.value)} className="w-full p-2 neu-inset rounded-lg text-sm mb-2"><option value="">Select</option>{serviceCategories.map(cat => (<optgroup key={cat} label={cat}>{SERVICES.filter(s=>s.category===cat).map(s=>(<option key={s.name} value={s.name}>{s.name}</option>))}</optgroup>))}</select>
                  <div className="grid grid-cols-2 gap-2"><input type="number" value={item.quantity} onChange={(e) => updateItem(i,'quantity',parseInt(e.target.value)||1)} placeholder="Qty" className="p-2 neu-inset rounded-lg text-sm" /><input type="number" value={item.unit_price} onChange={(e) => updateItem(i,'unit_price',parseFloat(e.target.value)||0)} placeholder="Price" className="p-2 neu-inset rounded-lg text-sm" /></div>
                  <p className="text-right text-sm font-bold mt-2">{formatCurrency(calcLineTotal(item))}</p>
                </div>
              ))}
            </div>
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold mb-4">Details</h2>
              <input type="date" value={quotationData.valid_until} onChange={(e) => setQuotationData({...quotationData, valid_until: e.target.value})} className="w-full p-3 neu-inset rounded-xl mb-3" />
              <textarea value={quotationData.notes} onChange={(e) => setQuotationData({...quotationData, notes: e.target.value})} placeholder="Notes" rows={2} className="w-full p-3 neu-inset rounded-xl" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4">Summary</h3>
              <p className="flex justify-between text-sm mb-2"><span>Subtotal:</span><span>{formatCurrency(calcSubtotal())}</span></p>
              <p className="flex justify-between text-sm mb-2"><span>VAT (15%):</span><span>{formatCurrency(calcVAT())}</span></p>
              <p className="flex justify-between text-base font-bold pt-2 border-t"><span>Total:</span><span className="text-emerald-600">{formatCurrency(calcTotal())}</span></p>
            </div>
            <div className="neu-raised rounded-3xl p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Eye className="w-5 h-5 text-emerald-600" />Preview</h2>
              <div className="bg-white rounded-xl overflow-hidden shadow-inner" style={{ maxHeight: '500px', overflow: 'auto' }}>
                <div style={{ transform: 'scale(0.33)', transformOrigin: 'top left', width: '303%' }}>
                  <div dangerouslySetInnerHTML={{ __html: buildPDFHTML(quotationData, items.filter(i => i.description)) }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
