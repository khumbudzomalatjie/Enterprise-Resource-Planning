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

// Pre-defined services with prices
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

const COLORS = {
  main: '#1B5080', dark: '#0D2D4A', light: '#2B6FA8',
  lightBg: '#e8f0f8', lightBorder: '#c5d5e8',
  tableHeader: '#1B5080', totalBg: '#eaf1f8',
}

// ═══════════════════════════════════════════════
// Build compact single-page A4 quotation HTML
// ═══════════════════════════════════════════════
function buildQuotationHTML(quotation, items, scale = 1) {
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(amount || 0)
  const formatDate = (date) => {
    if (!date) return '__________'
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const calcLineTotal = (item) => (item.quantity || 0) * (item.unit_price || 0)
  const subtotal = (items || []).reduce((s, i) => s + calcLineTotal(i), 0)
  const vatAmount = subtotal * 0.15
  const totalAmount = subtotal + vatAmount

  const creatorName = quotation?.created_by_name || quotation?.prepared_by_name || 'Ndanduleni Group Sales'
  const quoteNumber = quotation?.quotation_number || 'DRAFT'
  const clientName = quotation?.client_name || 'Client'
  const clientEmail = quotation?.client_email || ''
  const clientAddress = quotation?.client_address || ''
  const paymentTerms = quotation?.payment_terms || '50% Deposit, Balance on Completion'
  const validUntil = formatDate(quotation?.valid_until)
  const quoteDate = formatDate(quotation?.quotation_date || new Date())
  const notes = quotation?.notes || ''

  // Scale factor for fonts and spacing
  const s = scale
  const baseFont = Math.round(10 * s)
  const smallFont = Math.round(8 * s)
  const tinyFont = Math.round(7 * s)
  const headerFont = Math.round(22 * s)
  const bigFont = Math.round(28 * s)
  const sectionPad = Math.round(6 * s)
  const rowPad = Math.round(4 * s)

  const itemsHTML = (items || []).filter(item => item.description).map((item, i) => `
    <tr>
      <td style="padding:${rowPad}px 8px;font-size:${smallFont}px;color:#64748b;border-bottom:1px solid #e2e8f0;">${i + 1}</td>
      <td style="padding:${rowPad}px 8px;font-size:${smallFont}px;color:#1e293b;font-weight:500;border-bottom:1px solid #e2e8f0;">${item.description}</td>
      <td style="padding:${rowPad}px 8px;font-size:${smallFont}px;color:#1e293b;text-align:center;border-bottom:1px solid #e2e8f0;">${item.quantity}</td>
      <td style="padding:${rowPad}px 8px;font-size:${smallFont}px;color:#1e293b;text-align:right;border-bottom:1px solid #e2e8f0;">${formatCurrency(item.unit_price)}</td>
      <td style="padding:${rowPad}px 8px;font-size:${smallFont}px;color:#1e293b;text-align:right;font-weight:600;border-bottom:1px solid #e2e8f0;">${formatCurrency(calcLineTotal(item))}</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', Arial, sans-serif; color: #1e293b; }
  </style>
</head>
<body>
<div style="width:794px;padding:20px 35px;background:white;">

  <!-- HEADER - Compact -->
  <div style="display:flex;justify-content:space-between;border-bottom:3px solid ${COLORS.main};padding-bottom:8px;margin-bottom:10px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:45px;height:45px;border-radius:50%;background:${COLORS.lightBg};display:flex;align-items:center;justify-content:center;border:2px solid ${COLORS.lightBorder};overflow:hidden;flex-shrink:0;">
        <img src="/logo.png" alt="Logo" style="width:80%;height:80%;object-fit:contain;" onerror="this.style.display='none';this.parentElement.innerHTML='<span style=font-size:18px;font-weight:bold;color:${COLORS.main}>NG</span>'" />
      </div>
      <div>
        <h1 style="font-size:${headerFont}px;font-weight:bold;color:${COLORS.dark};margin:0;line-height:1.1;">${COMPANY.name}</h1>
        <p style="font-size:${tinyFont}px;color:#64748b;margin:1px 0;">${COMPANY.tagline}</p>
        <p style="font-size:${tinyFont - 1}px;color:#94a3b8;margin:0;">${COMPANY.address} | Tel: ${COMPANY.phone} | ${COMPANY.email}</p>
      </div>
    </div>
    <div style="text-align:right;flex-shrink:0;">
      <h2 style="font-size:${bigFont}px;font-weight:bold;color:${COLORS.dark};margin:0;letter-spacing:1px;line-height:1;">QUOTATION</h2>
      <p style="font-size:${Math.round(16 * s)}px;color:${COLORS.main};margin:2px 0;font-weight:bold;">#${quoteNumber}</p>
      <div style="margin-top:3px;font-size:${tinyFont}px;color:#64748b;">
        <p style="margin:1px 0;">Date: ${quoteDate}</p>
        <p style="margin:1px 0;">Valid Until: ${validUntil}</p>
      </div>
    </div>
  </div>

  <!-- BILL TO & DETAILS - Compact -->
  <div style="display:flex;gap:20px;margin-bottom:10px;">
    <div style="flex:1;">
      <h3 style="font-size:${tinyFont}px;font-weight:bold;color:#64748b;text-transform:uppercase;margin-bottom:2px;letter-spacing:1px;">Bill To:</h3>
      <p style="font-size:${Math.round(13 * s)}px;font-weight:bold;color:#1e293b;margin:0;">${clientName}</p>
      ${clientEmail ? `<p style="font-size:${tinyFont}px;color:#64748b;margin:1px 0;">${clientEmail}</p>` : ''}
      <p style="font-size:${tinyFont}px;color:#64748b;margin:1px 0;white-space:pre-line;">${clientAddress}</p>
    </div>
    <div style="flex:1;">
      <h3 style="font-size:${tinyFont}px;font-weight:bold;color:#64748b;text-transform:uppercase;margin-bottom:2px;letter-spacing:1px;">Details:</h3>
      <p style="font-size:${Math.round(11 * s)}px;color:#1e293b;margin:1px 0;"><strong>Prepared By:</strong> ${creatorName}</p>
      <p style="font-size:${tinyFont}px;color:#64748b;margin:1px 0;"><strong>Payment Terms:</strong> ${paymentTerms}</p>
      <p style="font-size:${tinyFont}px;color:#64748b;margin:1px 0;"><strong>Validity:</strong> 30 Days from date of issue</p>
    </div>
  </div>

  <!-- ITEMS TABLE - Compact -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    <thead>
      <tr style="background:${COLORS.tableHeader};color:white;">
        <th style="padding:${rowPad}px 8px;text-align:left;font-size:${tinyFont}px;font-weight:bold;text-transform:uppercase;">#</th>
        <th style="padding:${rowPad}px 8px;text-align:left;font-size:${tinyFont}px;font-weight:bold;text-transform:uppercase;">Description</th>
        <th style="padding:${rowPad}px 8px;text-align:center;font-size:${tinyFont}px;font-weight:bold;text-transform:uppercase;width:40px;">Qty</th>
        <th style="padding:${rowPad}px 8px;text-align:right;font-size:${tinyFont}px;font-weight:bold;text-transform:uppercase;width:85px;">Unit Price</th>
        <th style="padding:${rowPad}px 8px;text-align:right;font-size:${tinyFont}px;font-weight:bold;text-transform:uppercase;width:85px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML || '<tr><td colspan="5" style="padding:15px;text-align:center;color:#94a3b8;font-size:' + tinyFont + 'px;">No items</td></tr>'}
    </tbody>
  </table>

  <!-- TOTALS - Compact -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
    <div style="width:240px;border:1px solid #e2e8f0;border-radius:3px;overflow:hidden;">
      <div style="display:flex;justify-content:space-between;padding:${rowPad}px 10px;border-bottom:1px solid #e2e8f0;font-size:${tinyFont}px;background:#f8fafc;">
        <span style="color:#64748b;">Subtotal (Excl. VAT):</span>
        <span style="color:#1e293b;font-weight:600;">${formatCurrency(subtotal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:${rowPad}px 10px;border-bottom:1px solid #e2e8f0;font-size:${tinyFont}px;background:#f8fafc;">
        <span style="color:#64748b;">VAT (15%):</span>
        <span style="color:#1e293b;">${formatCurrency(vatAmount)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:${Math.round(8 * s)}px 10px;font-size:${Math.round(13 * s)}px;font-weight:bold;background:${COLORS.totalBg};">
        <span style="color:${COLORS.dark};">TOTAL (Incl. VAT):</span>
        <span style="color:${COLORS.dark};font-size:${Math.round(15 * s)}px;">${formatCurrency(totalAmount)}</span>
      </div>
    </div>
  </div>

  <!-- TERMS - Compact -->
  <div style="margin-bottom:${sectionPad}px;">
    <h3 style="font-size:${tinyFont - 1}px;font-weight:bold;color:#64748b;text-transform:uppercase;margin-bottom:1px;letter-spacing:1px;">Terms & Conditions</h3>
    <p style="font-size:${tinyFont - 1}px;color:#94a3b8;line-height:1.3;margin:0;">
      1. Valid 30 days. 2. Payment: ${paymentTerms}. 3. Prices include 15% VAT. 4. Services per agreed schedule. 5. 30 days cancellation notice. 6. Ndanduleni Group reserves right to adjust pricing for scope changes.
    </p>
  </div>

  <!-- BANKING - Compact -->
  <div style="margin-bottom:${sectionPad}px;padding:${sectionPad}px 10px;background:#f8fafc;border-radius:3px;border:1px solid #e2e8f0;">
    <h3 style="font-size:${tinyFont - 1}px;font-weight:bold;color:${COLORS.main};margin-bottom:2px;text-transform:uppercase;letter-spacing:1px;">Banking Details</h3>
    <div style="display:flex;gap:20px;font-size:${tinyFont - 1}px;color:#64748b;">
      <div><p style="margin:0;"><strong>Bank:</strong> ${COMPANY.bank}</p><p style="margin:0;"><strong>Account:</strong> ${COMPANY.accountName}</p></div>
      <div><p style="margin:0;"><strong>Acc #:</strong> ${COMPANY.accountNumber}</p><p style="margin:0;"><strong>Branch:</strong> ${COMPANY.branchCode}</p></div>
      <div><p style="margin:0;"><strong>Ref:</strong> ${quoteNumber}</p></div>
    </div>
  </div>

  ${notes ? `
  <div style="margin-bottom:${sectionPad}px;padding:${sectionPad - 1}px 10px;background:#f8fafc;border-radius:3px;">
    <p style="font-size:${tinyFont - 1}px;color:#64748b;margin:0;"><strong>Notes:</strong> ${notes}</p>
  </div>` : ''}

  <!-- FOOTER - Directly below content, no auto margin -->
  <div style="margin-top:15px;border-top:2px solid ${COLORS.main};padding-top:6px;text-align:center;">
    <p style="font-size:${tinyFont - 1}px;color:#94a3b8;margin:0;">
      ${COMPANY.name} (Pty) Ltd | Reg: ${COMPANY.registration} | VAT: ${COMPANY.vatNumber}
    </p>
    <p style="font-size:${tinyFont - 1}px;color:#94a3b8;margin:1px 0;">
      ${COMPANY.address} | Tel: ${COMPANY.phone} | Email: ${COMPANY.email}
    </p>
    <p style="font-size:${Math.round(10 * s)}px;color:${COLORS.main};margin:4px 0 0 0;font-weight:bold;">
      Thank you for your business!
    </p>
  </div>

</div>
</body>
</html>`
}

// ═══════════════════════════════════════════════
// Auto-compress layout if content exceeds one page
// ═══════════════════════════════════════════════
async function autoCompressLayout(quotation, items) {
  const A4_HEIGHT = 1123
  let scale = 1
  let fits = false
  let attempts = 0

  while (!fits && attempts < 10) {
    const html = buildQuotationHTML(quotation, items, scale)
    const height = await measureContentHeight(html)
    
    if (height <= A4_HEIGHT) {
      fits = true
    } else {
      scale -= 0.05 // Reduce by 5% each attempt
      attempts++
    }
  }

  return Math.max(scale, 0.7) // Don't go below 70%
}

async function measureContentHeight(html) {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    container.innerHTML = html
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '0'
    container.style.width = '794px'
    container.style.visibility = 'hidden'
    document.body.appendChild(container)
    
    // Wait for render
    setTimeout(() => {
      const height = container.scrollHeight
      document.body.removeChild(container)
      resolve(height)
    }, 300)
  })
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

  const calculateLineTotal = (item) => (item.quantity || 0) * (item.unit_price || 0)
  const calculateSubtotal = () => items.reduce((sum, item) => sum + calculateLineTotal(item), 0)
  const calculateVAT = () => calculateSubtotal() * 0.15
  const calculateTotal = () => calculateSubtotal() + calculateVAT()

  const subtotal = calculateSubtotal()
  const vatAmount = calculateVAT()
  const totalAmount = calculateTotal()

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
    if (user && !quotationData.created_by_name) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      userName = profile?.full_name || user.email?.split('@')[0] || 'Unknown'
    }

    const cleanItems = items.filter(i => i.description).map(i => ({
      description: i.description, quantity: i.quantity || 1, unit: i.unit || 'per_service',
      unit_price: i.unit_price || 0, tax_percent: i.tax_percent ?? 15, discount_percent: i.discount_percent ?? 0
    }))

    const quotePayload = { ...quotationData, subtotal, tax_amount: vatAmount, discount_amount: 0, total_amount: totalAmount, status, created_by: user?.id, created_by_name: userName, prepared_by: user?.id, prepared_by_name: userName }

    if (isEditMode) {
      const result = await updateQuotation(id, quotePayload)
      if (!result.success) { toast.error('Failed to update'); return }
      toast.success(status === 'sent' ? 'Updated & sent!' : 'Updated!')
    } else {
      const result = await createQuotation(quotePayload, cleanItems)
      if (!result.success) { toast.error('Failed to save'); return }
      setSavedQuotationId(result.data.id)
      toast.success(status === 'sent' ? 'Sent!' : 'Saved!')
    }
  }

  // ═══════════════════════════════════════════════
  // PDF DOWNLOAD - Auto-compress to fit one page
  // ═══════════════════════════════════════════════
  const downloadPDF = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default
      toast.loading('Generating PDF...')

      const activeItems = items.filter(item => item.description)
      
      // Auto-compress to fit single page
      const optimalScale = await autoCompressLayout(quotationData, activeItems)
      
      // Build final HTML at optimal scale
      const htmlContent = buildQuotationHTML(quotationData, activeItems, optimalScale)

      const container = document.createElement('div')
      container.innerHTML = htmlContent
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.width = '794px'
      document.body.appendChild(container)

      await new Promise(resolve => setTimeout(resolve, 400))

      const opt = {
        margin: [0, 0, 0, 0],
        filename: `Quotation_${(quotationData.client_name || 'client').replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, width: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css'] }
      }

      await html2pdf().set(opt).from(container).save()
      document.body.removeChild(container)

      toast.dismiss()
      toast.success('PDF downloaded! 📄')
    } catch (error) {
      console.error('PDF error:', error)
      toast.dismiss()
      toast.error('Failed to generate PDF')
    }
  }

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0)

  const serviceCategories = [...new Set(SERVICES.map((s) => s.category))]

  if (loadingQuote) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div><p className="text-slate-500">Loading...</p></div></div>
  }

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">Enterprise Resource Planning</span>
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
          <span className="text-slate-800 dark:text-white font-medium">{isEditMode ? 'Edit' : 'New Quotation'}</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3"><FileText className="w-8 h-8 text-emerald-600" />{isEditMode ? 'Edit' : 'Create'} Quotation</h1>
          <div className="flex gap-3">
            <button onClick={downloadPDF} className="neu-raised neu-btn px-4 py-2 rounded-xl flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"><Download className="w-4 h-4" /><span className="hidden sm:inline">PDF</span></button>
            <button onClick={() => handleSave('draft')} className="neu-raised neu-btn px-4 py-2 rounded-xl flex items-center gap-2 bg-slate-600 text-white hover:bg-slate-700"><Save className="w-4 h-4" /><span className="hidden sm:inline">Save</span></button>
            <button onClick={() => handleSave('sent')} className="neu-raised neu-btn px-4 py-2 rounded-xl flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"><Send className="w-4 h-4" /><span className="hidden sm:inline">Send</span></button>
          </div>
        </div>

        {savedQuotationId && !isEditMode && (
          <div className="mb-6 p-4 neu-raised rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 flex items-center justify-between">
            <div><p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Saved!</p></div>
            <button onClick={() => navigate('/operations/jobs/new')} className="px-5 py-2.5 rounded-xl bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-2"><Briefcase className="w-4 h-4" /><span>Convert to Job</span></button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="space-y-6">
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold mb-4">Client Information</h2>
              <div className="space-y-4">
                <select value={quotationData.client_id} onChange={(e) => handleClientSelect(e.target.value)} className="w-full p-3 neu-inset rounded-xl"><option value="">Select Client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select>
                <input type="text" value={quotationData.client_name} onChange={(e) => setQuotationData({...quotationData, client_name: e.target.value})} placeholder="Client Name" className="w-full p-3 neu-inset rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="email" value={quotationData.client_email} onChange={(e) => setQuotationData({...quotationData, client_email: e.target.value})} placeholder="Email" className="p-3 neu-inset rounded-xl" />
                  <input type="text" value={quotationData.client_phone} onChange={(e) => setQuotationData({...quotationData, client_phone: e.target.value})} placeholder="Phone" className="p-3 neu-inset rounded-xl" />
                </div>
                <textarea value={quotationData.client_address} onChange={(e) => setQuotationData({...quotationData, client_address: e.target.value})} placeholder="Address" rows={2} className="w-full p-3 neu-inset rounded-xl" />
              </div>
            </div>
            <div className="neu-raised rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Services</h2><button onClick={addItem} className="text-emerald-600 flex items-center gap-1 text-sm"><Plus className="w-4 h-4" /> Add</button></div>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 space-y-3">
                    <div className="flex justify-between"><span className="text-sm">Service {index+1}</span><button onClick={() => removeItem(index)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></div>
                    <select value={item.description} onChange={(e) => handleServiceSelect(index, e.target.value)} className="w-full p-2 neu-inset rounded-lg text-sm"><option value="">Select Service</option>{serviceCategories.map(cat => (<optgroup key={cat} label={cat}>{SERVICES.filter(s=>s.category===cat).map(s=>(<option key={s.name} value={s.name}>{s.name} - {formatCurrency(s.unit_price)}</option>))}</optgroup>))}</select>
                    <div className="grid grid-cols-2 gap-2"><div><label className="text-xs">Qty</label><input type="number" value={item.quantity} onChange={(e) => updateItem(index,'quantity',parseInt(e.target.value)||1)} min="1" className="w-full p-2 neu-inset rounded-lg text-sm mt-1" /></div><div><label className="text-xs">Unit Price</label><input type="number" value={item.unit_price} onChange={(e) => updateItem(index,'unit_price',parseFloat(e.target.value)||0)} className="w-full p-2 neu-inset rounded-lg text-sm mt-1" /></div></div>
                    <div className="flex justify-between pt-2 border-t"><span className="text-xs">Line Total:</span><span className="text-sm font-bold">{formatCurrency(calculateLineTotal(item))}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold mb-4">Details</h2>
              <div className="space-y-4"><div><label className="text-sm">Valid Until</label><input type="date" value={quotationData.valid_until} onChange={(e) => setQuotationData({...quotationData, valid_until: e.target.value})} className="w-full p-3 neu-inset rounded-xl mt-1" /></div>
              <textarea value={quotationData.notes} onChange={(e) => setQuotationData({...quotationData, notes: e.target.value})} placeholder="Additional notes..." rows={2} className="w-full p-3 neu-inset rounded-xl" /></div>
            </div>
          </div>
          <div className="lg:sticky lg:top-24 h-fit space-y-4">
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4">Summary</h3>
              <div className="space-y-3"><div className="flex justify-between text-sm"><span>Subtotal:</span><span className="font-medium">{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-sm"><span>VAT (15%):</span><span className="font-medium">{formatCurrency(vatAmount)}</span></div><div className="flex justify-between text-base font-bold pt-2 border-t"><span>Total:</span><span className="text-emerald-600">{formatCurrency(totalAmount)}</span></div></div>
            </div>
            <div className="neu-raised rounded-3xl p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Eye className="w-5 h-5 text-emerald-600" />Preview</h2>
              <div className="bg-white rounded-xl overflow-hidden shadow-inner" style={{ maxHeight: '500px', overflow: 'auto' }}>
                <div style={{ transform: 'scale(0.33)', transformOrigin: 'top left', width: '303%' }}>
                  <div dangerouslySetInnerHTML={{ __html: buildQuotationHTML({ ...quotationData, quotation_number: 'PREVIEW' }, items.filter(i => i.description)) }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
