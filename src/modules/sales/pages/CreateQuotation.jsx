import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useSalesStore from '../store/salesStore'
import useCRMStore from '../../crm/store/crmStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import {
  FileText, Plus, Trash2, Download, Eye,
  Sun, Moon, Sparkles, ChevronRight,
  Save, Send, Briefcase
} from 'lucide-react'

// Pre-defined services with prices (moved inside component to avoid global scope issues)
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

// Steel Blue Color Palette
const COLORS = {
  main: '#1B5080',
  dark: '#0D2D4A',
  light: '#2B6FA8',
  lightBg: '#e8f0f8',
  lightBorder: '#c5d5e8',
  tableHeader: '#1B5080',
  totalBg: '#eaf1f8',
}

// A4 Quotation Template - Single Page with Logo
function QuotationTemplate({ quotation, items }) {
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(amount || 0)
  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const calcLineTotal = (item) => (item.quantity || 0) * (item.unit_price || 0)
  const subtotal = (items || []).reduce((s, i) => s + calcLineTotal(i), 0)
  const vatAmount = subtotal * 0.15
  const totalAmount = subtotal + vatAmount

  return (
    <div style={{
      width: '210mm',
      height: '297mm',
      padding: '12mm 18mm',
      backgroundColor: 'white',
      fontFamily: 'Inter, Arial, sans-serif',
      color: '#1e293b',
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Header with Logo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: `3px solid ${COLORS.main}`, paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: COLORS.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: `2px solid ${COLORS.lightBorder}` }}>
            <img src="/logo.png" alt="Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; if (e.target.parentElement) e.target.parentElement.innerHTML = '<span style="font-size:16px;font-weight:bold;color:' + COLORS.main + '">NG</span>' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: 'bold', color: COLORS.dark, margin: '0' }}>NDANDULENI GROUP</h1>
            <p style={{ fontSize: '7px', color: '#64748b', margin: '1px 0' }}>Professional Cleaning & Hygiene Services</p>
            <p style={{ fontSize: '6px', color: '#94a3b8', margin: '0' }}>123 Main Street, Johannesburg | Tel: +27 11 234 5678</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: COLORS.dark, margin: '0', letterSpacing: '2px' }}>QUOTATION</h2>
          <p style={{ fontSize: '13px', color: COLORS.main, margin: '1px 0', fontWeight: 'bold' }}>#{quotation?.quotation_number || 'DRAFT'}</p>
          <div style={{ marginTop: '3px', fontSize: '7px', color: '#64748b' }}>
            <p style={{ margin: '0' }}>Date: {formatDate(quotation?.quotation_date)}</p>
            <p style={{ margin: '0' }}>Valid: {formatDate(quotation?.valid_until)}</p>
          </div>
        </div>
      </div>

      {/* Bill To & Details */}
      <div style={{ marginBottom: '10px', display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Bill To:</h3>
          <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b', margin: '0' }}>{quotation?.client_name || 'Client'}</p>
          {quotation?.client_email && <p style={{ fontSize: '7px', color: '#64748b', margin: '0' }}>{quotation.client_email}</p>}
          <p style={{ fontSize: '7px', color: '#64748b', margin: '0' }}>{quotation?.client_address || ''}</p>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Details:</h3>
          <p style={{ fontSize: '9px', color: '#1e293b', margin: '0' }}>Prepared: Ndanduleni Group Sales</p>
          <p style={{ fontSize: '8px', color: '#64748b', margin: '0' }}>Terms: {quotation?.payment_terms || '50% Deposit'}</p>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: COLORS.tableHeader, color: 'white' }}>
            <th style={{ padding: '4px 6px', textAlign: 'left', fontSize: '7px', fontWeight: 'bold' }}>#</th>
            <th style={{ padding: '4px 6px', textAlign: 'left', fontSize: '7px', fontWeight: 'bold' }}>Description</th>
            <th style={{ padding: '4px 6px', textAlign: 'center', fontSize: '7px', fontWeight: 'bold', width: '40px' }}>Qty</th>
            <th style={{ padding: '4px 6px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', width: '80px' }}>Unit Price</th>
            <th style={{ padding: '4px 6px', textAlign: 'right', fontSize: '7px', fontWeight: 'bold', width: '80px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {(items || []).filter(item => item.description).map((item, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '3px 6px', fontSize: '7px', color: '#64748b' }}>{i + 1}</td>
              <td style={{ padding: '3px 6px', fontSize: '7px', color: '#1e293b', fontWeight: '500' }}>{item.description}</td>
              <td style={{ padding: '3px 6px', fontSize: '7px', color: '#1e293b', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ padding: '3px 6px', fontSize: '7px', color: '#1e293b', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
              <td style={{ padding: '3px 6px', fontSize: '7px', color: '#1e293b', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(calcLineTotal(item))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <div style={{ width: '220px', border: '1px solid #e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 10px', borderBottom: '1px solid #e2e8f0', fontSize: '7px', backgroundColor: '#f8fafc' }}>
            <span style={{ color: '#64748b' }}>Subtotal (Excl. VAT):</span>
            <span style={{ color: '#1e293b', fontWeight: '600' }}>{formatCurrency(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 10px', borderBottom: '1px solid #e2e8f0', fontSize: '7px', backgroundColor: '#f8fafc' }}>
            <span style={{ color: '#64748b' }}>VAT (15%):</span>
            <span style={{ color: '#1e293b' }}>{formatCurrency(vatAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', fontSize: '11px', fontWeight: 'bold', backgroundColor: COLORS.totalBg }}>
            <span style={{ color: COLORS.dark }}>TOTAL (Incl. VAT):</span>
            <span style={{ color: COLORS.dark, fontSize: '13px' }}>{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div style={{ marginBottom: '8px' }}>
        <h3 style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Terms & Conditions</h3>
        <p style={{ fontSize: '6px', color: '#94a3b8', lineHeight: '1.3', margin: '0' }}>
          1. Valid for 30 days. 2. Payment: {quotation?.payment_terms || '50% Deposit, Balance on Completion'}. 3. Prices include VAT at 15%. 4. Services rendered per agreed schedule. 5. 30 days cancellation notice.
        </p>
      </div>

      {/* Notes */}
      {quotation?.notes && (
        <div style={{ marginBottom: '8px', padding: '4px 8px', backgroundColor: '#f8fafc', borderRadius: '3px' }}>
          <p style={{ fontSize: '6px', color: '#64748b', margin: '0' }}><strong>Notes:</strong> {quotation.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: '12mm', left: '18mm', right: '18mm', borderTop: `2px solid ${COLORS.main}`, paddingTop: '5px', textAlign: 'center' }}>
        <p style={{ fontSize: '6px', color: '#94a3b8', margin: '0' }}>
          Ndanduleni Group (Pty) Ltd | Reg: 2020/123456/07 | VAT: 4567890123 | 123 Main Street, Johannesburg
        </p>
        <p style={{ fontSize: '9px', color: COLORS.main, margin: '3px 0 0 0', fontWeight: 'bold' }}>
          Thank you for your business!
        </p>
      </div>
    </div>
  )
}

export default function CreateQuotation() {
  const createQuotation = useSalesStore((state) => state.createQuotation)
  const clients = useCRMStore((state) => state.clients)
  const fetchClients = useCRMStore((state) => state.fetchClients)
  const isDark = useThemeStore((state) => state.isDark)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const navigate = useNavigate()
  const pdfRef = useRef(null)

  const [quotationData, setQuotationData] = useState({
    client_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_terms: '50% Deposit, Balance on Completion',
    tax_rate: 15,
    discount_type: 'none',
    discount_value: 0,
    notes: '',
    status: 'draft'
  })

  const [items, setItems] = useState([
    { description: '', quantity: 1, unit: 'per_service', unit_price: 0, tax_percent: 15, discount_percent: 0 }
  ])

  const [savedQuotationId, setSavedQuotationId] = useState(null)

  useEffect(() => {
    fetchClients({ status: 'active' })
  }, [fetchClients])

  // Calculator functions
  const calculateLineTotal = (item) => (item.quantity || 0) * (item.unit_price || 0)
  const calculateSubtotal = () => items.reduce((sum, item) => sum + calculateLineTotal(item), 0)
  const calculateVAT = () => calculateSubtotal() * 0.15
  const calculateTotal = () => calculateSubtotal() + calculateVAT()

  const subtotal = calculateSubtotal()
  const vatAmount = calculateVAT()
  const totalAmount = calculateTotal()

  const handleClientSelect = (clientId) => {
    const client = clients.find((c) => c.id === clientId)
    if (client) {
      setQuotationData({
        ...quotationData,
        client_id: client.id,
        client_name: client.company_name || '',
        client_email: client.email || '',
        client_phone: client.phone || '',
        client_address: `${client.address_line1 || ''}, ${client.city || ''}, ${client.postal_code || ''}`
      })
    }
  }

  const handleServiceSelect = (index, serviceName) => {
    const service = SERVICES.find((s) => s.name === serviceName)
    if (service) {
      const newItems = [...items]
      newItems[index] = {
        ...newItems[index],
        description: service.name,
        unit: service.unit,
        unit_price: service.unit_price,
        tax_percent: 15
      }
      setItems(newItems)
    }
  }

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit: 'per_service', unit_price: 0, tax_percent: 15, discount_percent: 0 }])
  }

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index, field, value) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const handleSave = async (status = 'draft') => {
    if (!quotationData.client_name) {
      toast.error('Please select a client')
      return
    }

    const hasItems = items.some((item) => item.description && item.unit_price > 0)
    if (!hasItems) {
      toast.error('Please add at least one service with a price')
      return
    }

    // Prepare clean items for the API
    const cleanItems = items
      .filter((item) => item.description)
      .map((item) => ({
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit || 'per_service',
        unit_price: item.unit_price || 0,
        tax_percent: item.tax_percent ?? 15,
        discount_percent: item.discount_percent ?? 0
      }))

    const result = await createQuotation(
      {
        ...quotationData,
        subtotal,
        tax_amount: vatAmount,
        discount_amount: 0,
        total_amount: totalAmount,
        status
      },
      cleanItems
    )

    if (!result.success) {
      toast.error('Failed to save quotation: ' + (result.error || 'Unknown error'))
      return
    }

    setSavedQuotationId(result.data.id)
    toast.success(status === 'sent' ? 'Quotation sent!' : 'Quotation saved as draft!')
  }

  const downloadPDF = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default

      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '0'
      tempDiv.style.width = '794px'
      document.body.appendChild(tempDiv)

      const ReactDOM = (await import('react-dom/client')).default
      const React = (await import('react'))
      const root = ReactDOM.createRoot(tempDiv)
      root.render(
        React.createElement(QuotationTemplate, {
          quotation: { ...quotationData },
          items: items.filter((item) => item.description)
        })
      )

      await new Promise((resolve) => setTimeout(resolve, 500))

      const opt = {
        margin: [0, 0, 0, 0],
        filename: `Quotation_${(quotationData.client_name || 'client').replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 794, windowHeight: 1123 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        pagesplit: false
      }

      await html2pdf().set(opt).from(tempDiv).toPdf().get('pdf').then((pdf) => {
        if (pdf.internal.getNumberOfPages() > 1) {
          for (let i = pdf.internal.getNumberOfPages(); i > 1; i--) {
            pdf.deletePage(i)
          }
        }
        pdf.save(opt.filename)
      })

      root.unmount()
      document.body.removeChild(tempDiv)
      toast.success('PDF downloaded successfully!')
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error('Failed to generate PDF')
    }
  }

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0)

  const serviceCategories = [...new Set(SERVICES.map((s) => s.category))]

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />

      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">
            Enterprise Resource Planning
          </span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/sales" className="text-slate-500 hover:text-emerald-600">Sales</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">New Quotation</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-emerald-600" />
            Create Quotation
          </h1>

          <div className="flex gap-3">
            <button onClick={downloadPDF} className="neu-raised neu-btn px-4 py-2 rounded-xl flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>
            <button onClick={() => handleSave('draft')} className="neu-raised neu-btn px-4 py-2 rounded-xl flex items-center gap-2 bg-slate-600 text-white hover:bg-slate-700">
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save Draft</span>
            </button>
            <button onClick={() => handleSave('sent')} className="neu-raised neu-btn px-4 py-2 rounded-xl flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Save & Send</span>
            </button>
          </div>
        </div>

        {/* Convert to Job Button */}
        {savedQuotationId && (
          <div className="mb-6 p-4 neu-raised rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Quotation Saved!</p>
              <p className="text-xs text-orange-600 dark:text-orange-400">You can now convert this quotation to a job or continue editing.</p>
            </div>
            <button onClick={() => navigate('/operations/jobs/new')} className="px-5 py-2.5 rounded-xl bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-2 transition-colors">
              <Briefcase className="w-4 h-4" />
              <span>Convert to Job</span>
            </button>
          </div>
        )}

        {/* Quotation Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Form - Left Side */}
          <div className="space-y-6">
            {/* Client Selection */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Client Information</h2>
              <div className="space-y-4">
                <select
                  value={quotationData.client_id}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
                >
                  <option value="">Select Client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.company_name || 'Client'}</option>
                  ))}
                </select>
                <input type="text" value={quotationData.client_name} onChange={(e) => setQuotationData({ ...quotationData, client_name: e.target.value })} placeholder="Client Name" className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="email" value={quotationData.client_email} onChange={(e) => setQuotationData({ ...quotationData, client_email: e.target.value })} placeholder="Email" className="p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
                  <input type="text" value={quotationData.client_phone} onChange={(e) => setQuotationData({ ...quotationData, client_phone: e.target.value })} placeholder="Phone" className="p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
                </div>
                <textarea value={quotationData.client_address} onChange={(e) => setQuotationData({ ...quotationData, client_address: e.target.value })} placeholder="Address" rows={2} className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
              </div>
            </div>

            {/* Services */}
            <div className="neu-raised rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Services</h2>
                <button onClick={addItem} className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-sm">
                  <Plus className="w-4 h-4" /> Add Service
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-500">Service {index + 1}</span>
                      <button onClick={() => removeItem(index)} className="text-red-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <select
                      value={item.description}
                      onChange={(e) => handleServiceSelect(index, e.target.value)}
                      className="w-full p-2 neu-inset rounded-lg text-sm text-slate-700 dark:text-slate-300"
                    >
                      <option value="">Select Service</option>
                      {serviceCategories.map((category) => (
                        <optgroup key={category} label={category}>
                          {SERVICES.filter((s) => s.category === category).map((service) => (
                            <option key={service.name} value={service.name}>
                              {service.name} - {formatCurrency(service.unit_price)}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-full p-2 neu-inset rounded-lg text-sm text-slate-700 dark:text-slate-300 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Unit Price (Excl. VAT)</label>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full p-2 neu-inset rounded-lg text-sm text-slate-700 dark:text-slate-300 mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-600">
                      <span className="text-xs text-slate-500">Line Total (Excl. VAT):</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {formatCurrency(calculateLineTotal(item))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dates & Notes */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-500">Valid Until</label>
                  <input
                    type="date"
                    value={quotationData.valid_until}
                    onChange={(e) => setQuotationData({ ...quotationData, valid_until: e.target.value })}
                    className="w-full p-3 neu-inset rounded-xl mt-1 text-slate-700 dark:text-slate-300"
                  />
                </div>
                <textarea
                  value={quotationData.notes}
                  onChange={(e) => setQuotationData({ ...quotationData, notes: e.target.value })}
                  placeholder="Additional notes for client..."
                  rows={2}
                  className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Preview - Right Side */}
          <div className="lg:sticky lg:top-24 h-fit space-y-4">
            {/* Totals Summary */}
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Quotation Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal (Excl. VAT):</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">VAT (15%):</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200 dark:border-slate-600">
                  <span className="text-slate-800 dark:text-white">Total (Incl. VAT):</span>
                  <span className="text-emerald-600">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="neu-raised rounded-3xl p-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-600" />
                Preview
              </h2>
              <div className="bg-white rounded-xl overflow-hidden shadow-inner" style={{ maxHeight: '500px', overflow: 'auto' }}>
                <div style={{ transform: 'scale(0.45)', transformOrigin: 'top left', width: '222%' }}>
                  <QuotationTemplate
                    quotation={{ ...quotationData, quotation_number: 'PREVIEW' }}
                    items={items.filter((item) => item.description)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Hidden PDF element (for download) */}
      <div ref={pdfRef} style={{ position: 'absolute', left: '-9999px', top: 0, width: '794px' }}>
        <QuotationTemplate
          quotation={{ ...quotationData, quotation_number: 'DRAFT' }}
          items={items.filter((item) => item.description)}
        />
      </div>
    </div>
  )
}
