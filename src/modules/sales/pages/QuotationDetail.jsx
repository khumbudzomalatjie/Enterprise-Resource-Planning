import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../../../components/Navbar'
import useSalesStore from '../store/salesStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  FileText, Edit, ChevronRight, Sun, Moon, Sparkles, 
  User, Calendar, Building2, Phone, Mail, MapPin, Download,
  ArrowLeft, Briefcase
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

const IMPORTANT_TERMS = [
  '50% deposit required to secure booking.',
  'Balance payable upon completion.',
  'Payment methods: EFT and card. No cash.',
  '24-hour notice required for cancellation.',
  'Clients responsible for removing valuables.',
  '100% satisfaction guaranteed.',
  'Available for short and long-term tenders.',
]

async function getLogoBase64() {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = '/logo.png'
  })
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

  // ═══════════════════════════════════════════════
  // CONVERT ACCEPTED QUOTATION TO JOB
  // ═══════════════════════════════════════════════
  const handleConvertToJob = async () => {
    if (!selectedQuotation) return
    const q = selectedQuotation
    
    try {
      toast.loading('Creating job from quotation...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.dismiss()
        toast.error('You must be logged in')
        return
      }
      
      // Get client info if client_id exists
      let clientInfo = {}
      if (q.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('company_name, phone, email, address_line1, city')
          .eq('id', q.client_id)
          .single()
        if (client) clientInfo = client
      }
      
      const jobData = {
        title: q.client_name ? `Service - ${q.client_name}` : `Job from ${q.quotation_number}`,
        description: q.notes || `Created from quotation ${q.quotation_number}`,
        client_id: q.client_id || null,
        site_address: q.client_address || clientInfo.address_line1 || '',
        site_city: q.client_address?.split(',').pop()?.trim() || clientInfo.city || 'Midrand',
        site_contact_name: q.client_name || clientInfo.company_name || '',
        site_contact_phone: q.client_phone || clientInfo.phone || '',
        quoted_amount: q.total_amount || 0,
        quotation_id: q.id,
        scheduled_date: q.valid_until || new Date().toISOString().split('T')[0],
        scheduled_start_time: '08:00',
        scheduled_end_time: '17:00',
        estimated_duration_minutes: 480,
        priority: 'medium',
        status: 'pending',
        cleaners_required: 1,
        notes: `Auto-created from quotation ${q.quotation_number}. Client: ${q.client_name || 'N/A'}`,
        created_by: user.id
      }
      
      console.log('Creating job with data:', jobData)
      
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single()
      
      if (jobError) {
        console.error('Job creation error:', jobError)
        toast.dismiss()
        toast.error('Failed to create job: ' + jobError.message)
        return
      }
      
      console.log('Job created:', newJob)
      
      // Update quotation status to converted
      const { error: updateError } = await supabase
        .from('quotations')
        .update({ 
          status: 'converted',
          updated_at: new Date().toISOString()
        })
        .eq('id', q.id)
      
      if (updateError) {
        console.error('Status update error:', updateError)
      }
      
      toast.dismiss()
      toast.success(`Job ${newJob.job_number} created! ✅`)
      
      setTimeout(() => {
        navigate(`/operations/jobs/${newJob.id}`)
      }, 1000)
      
    } catch (error) {
      console.error('Convert to job error:', error)
      toast.dismiss()
      toast.error('Failed: ' + (error.message || 'Unknown error'))
    }
  }

  // ═══════════════════════════════════════════════
  // CONVERT TO JOB + INVOICE
  // ═══════════════════════════════════════════════
  const handleConvertToJobAndInvoice = async () => {
    if (!selectedQuotation) return
    const q = selectedQuotation
    
    try {
      toast.loading('Creating job and invoice...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.dismiss()
        toast.error('You must be logged in')
        return
      }
      
      let clientInfo = {}
      if (q.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('company_name, phone, email, address_line1, city')
          .eq('id', q.client_id)
          .single()
        if (client) clientInfo = client
      }
      
      // Create job
      const jobData = {
        title: q.client_name ? `Service - ${q.client_name}` : `Job from ${q.quotation_number}`,
        description: q.notes || `Created from quotation ${q.quotation_number}`,
        client_id: q.client_id || null,
        site_address: q.client_address || clientInfo.address_line1 || '',
        site_city: q.client_address?.split(',').pop()?.trim() || clientInfo.city || 'Midrand',
        site_contact_name: q.client_name || clientInfo.company_name || '',
        site_contact_phone: q.client_phone || clientInfo.phone || '',
        quoted_amount: q.total_amount || 0,
        quotation_id: q.id,
        scheduled_date: q.valid_until || new Date().toISOString().split('T')[0],
        scheduled_start_time: '08:00',
        scheduled_end_time: '17:00',
        estimated_duration_minutes: 480,
        priority: 'medium',
        status: 'pending',
        cleaners_required: 1,
        notes: `Created from quotation ${q.quotation_number}`,
        created_by: user.id
      }
      
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert([jobData])
        .select()
        .single()
      
      if (jobError) {
        toast.dismiss()
        toast.error('Job creation failed: ' + jobError.message)
        return
      }
      
      // Create invoice
      const invoiceData = {
        client_id: q.client_id || null,
        client_name: q.client_name || clientInfo.company_name || '',
        client_email: q.client_email || clientInfo.email || '',
        client_address: q.client_address || clientInfo.address_line1 || '',
        quotation_id: q.id,
        subtotal: q.subtotal || 0,
        tax_rate: q.tax_rate || 15,
        tax_amount: q.tax_amount || 0,
        discount_amount: q.discount_amount || 0,
        total_amount: q.total_amount || 0,
        amount_paid: 0,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        invoice_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        notes: `Invoice for quotation ${q.quotation_number} - Job ${newJob.job_number}`
      }
      
      const { data: newInvoice, error: invError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single()
      
      if (!invError && newInvoice && q.quotation_items?.length > 0) {
        const invoiceItems = q.quotation_items.map((item, i) => ({
          invoice_id: newInvoice.id,
          item_number: i + 1,
          description: item.description || '',
          quantity: item.quantity || 1,
          unit: item.unit || 'each',
          unit_price: item.unit_price || 0,
          tax_percent: item.tax_percent || 15,
          discount_percent: item.discount_percent || 0
        }))
        await supabase.from('invoice_items').insert(invoiceItems)
      }
      
      // Update quotation
      await supabase
        .from('quotations')
        .update({ 
          status: 'converted',
          converted_to_invoice: true,
          invoice_id: newInvoice?.id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', q.id)
      
      toast.dismiss()
      toast.success(`Job ${newJob.job_number} + Invoice created! ✅`)
      
      setTimeout(() => {
        navigate(`/operations/jobs/${newJob.id}`)
      }, 1000)
      
    } catch (error) {
      console.error('Convert error:', error)
      toast.dismiss()
      toast.error('Failed: ' + (error.message || 'Unknown error'))
    }
  }

  const handleDownloadPDF = async () => {
    if (!selectedQuotation) return
    const q = selectedQuotation
    
    try {
      toast.loading('Generating PDF...')
      
      const logoBase64 = await getLogoBase64()
      
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      
      const fmt = (a) => (Number(a) || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
      
      let y = 12
      const leftMargin = 15
      const rightMargin = 195
      const pageWidth = 180
      
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', leftMargin, y, 18, 18)
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(13, 45, 74)
        doc.text(COMPANY.name, leftMargin + 22, y + 6)
        y += 10
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(85, 85, 85)
        doc.text(`${COMPANY.tagline} | ${COMPANY.address}`, leftMargin + 22, y)
      } else {
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(13, 45, 74)
        doc.text(COMPANY.name, leftMargin, y)
        y += 6
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(85, 85, 85)
        doc.text(`${COMPANY.tagline} | ${COMPANY.address}`, leftMargin, y)
      }
      
      y += 4
      doc.text(`Tel: ${COMPANY.phone} | Email: ${COMPANY.email} | Web: ${COMPANY.website}`, logoBase64 ? leftMargin + 22 : leftMargin, y)
      y += 4
      doc.text(`Tax Reg: ${COMPANY.taxRegNumber} | Tax Ref: ${COMPANY.taxRefNumber}`, logoBase64 ? leftMargin + 22 : leftMargin, y)
      y += 5
      
      doc.setDrawColor(27, 80, 128)
      doc.setLineWidth(0.5)
      doc.line(leftMargin, y, rightMargin, y)
      y += 6
      
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(13, 45, 74)
      doc.text('QUOTATION', leftMargin, y)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(27, 80, 128)
      doc.text(`No: ${q.quotation_number || 'N/A'}`, rightMargin, y, { align: 'right' })
      y += 7
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 51, 51)
      doc.text(`Date: ${fmtDate(q.quotation_date)}`, leftMargin, y)
      doc.text(`Expiry: ${fmtDate(q.valid_until)}`, leftMargin + 60, y)
      doc.text(`Status: ${q.status?.replace('_', ' ')}`, leftMargin + 120, y)
      y += 4
      doc.text(`Client: ${q.client_name || q.clients?.company_name || 'N/A'}`, leftMargin, y)
      doc.text(`Created By: ${q.created_by_name || 'N/A'}`, leftMargin + 60, y)
      y += 6
      
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.line(leftMargin, y, rightMargin, y)
      y += 5
      
      const items = q.quotation_items || []
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.setFillColor(27, 80, 128)
      doc.rect(leftMargin, y - 4, pageWidth, 6, 'F')
      doc.text('No', leftMargin + 2, y)
      doc.text('Description', leftMargin + 10, y)
      doc.text('Qty', leftMargin + 115, y)
      doc.text('Unit Price', leftMargin + 130, y)
      doc.text('Total', rightMargin, y, { align: 'right' })
      y += 6
      
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(26, 26, 26)
      
      if (items.length > 0) {
        items.forEach((item, i) => {
          if (y > 240) { doc.addPage(); y = 15 }
          doc.setFontSize(8)
          doc.text(`${i + 1}`, leftMargin + 2, y)
          doc.text(`${(item.description || '').substring(0, 50)}`, leftMargin + 10, y)
          doc.text(`${item.quantity || 0}`, leftMargin + 115, y)
          doc.text(`R ${fmt(item.unit_price || 0)}`, leftMargin + 130, y)
          doc.text(`R ${fmt((item.quantity || 0) * (item.unit_price || 0))}`, rightMargin, y, { align: 'right' })
          doc.setDrawColor(230, 230, 230)
          doc.setLineWidth(0.1)
          doc.line(leftMargin, y + 1, rightMargin, y + 1)
          y += 5
        })
      } else {
        doc.setFontSize(9)
        doc.setTextColor(150, 150, 150)
        doc.text('No items added', leftMargin + 60, y)
        y += 5
      }
      
      y += 3
      
      const st = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)
      const disc = Number(q.discount_amount) || 0
      const vat = Number(q.tax_amount) || st * 0.15
      const total = Number(q.total_amount) || st - disc + vat
      
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      const totalsHeight = disc > 0 ? 24 : 20
      doc.rect(leftMargin + 90, y - 4, pageWidth - 90, totalsHeight)
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 51, 51)
      doc.text('Subtotal:', leftMargin + 95, y)
      doc.text(`R ${fmt(st)}`, rightMargin - 2, y, { align: 'right' })
      y += 4
      
      if (disc > 0) {
        doc.text('Discount:', leftMargin + 95, y)
        doc.setTextColor(200, 50, 50)
        doc.text(`-R ${fmt(disc)}`, rightMargin - 2, y, { align: 'right' })
        doc.setTextColor(51, 51, 51)
        y += 4
      }
      
      doc.text('VAT (15%):', leftMargin + 95, y)
      doc.text(`R ${fmt(vat)}`, rightMargin - 2, y, { align: 'right' })
      y += 4
      
      doc.setFillColor(234, 241, 248)
      doc.rect(leftMargin + 90, y - 4, pageWidth - 90, 8, 'F')
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(13, 45, 74)
      doc.text('GRAND TOTAL:', leftMargin + 95, y + 1)
      doc.text(`R ${fmt(total)}`, rightMargin - 2, y + 1, { align: 'right' })
      y += 10
      
      if (q.notes) {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(27, 80, 128)
        doc.text('Notes:', leftMargin, y)
        y += 4
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(51, 51, 51)
        doc.text(q.notes.substring(0, 100), leftMargin, y)
        y += 6
      }
      
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.line(leftMargin, y, rightMargin, y)
      y += 3
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(27, 80, 128)
      doc.text('Banking Details', leftMargin, y)
      y += 5
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 51, 51)
      doc.text(`Bank: ${COMPANY.bank}`, leftMargin, y)
      doc.text(`Branch Code: ${COMPANY.branch}`, leftMargin + 70, y)
      y += 4
      doc.text(`Account No: ${COMPANY.accountNumber}`, leftMargin, y)
      doc.text(`Account Type: ${COMPANY.accountType}`, leftMargin + 70, y)
      y += 4
      doc.text(`Reference: ${q.quotation_number}`, leftMargin, y)
      y += 6
      
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.2)
      doc.line(leftMargin, y, rightMargin, y)
      y += 3
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(27, 80, 128)
      doc.text('Terms & Conditions', leftMargin, y)
      y += 5
      
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      
      IMPORTANT_TERMS.forEach((term, i) => {
        if (y > 280) { doc.addPage(); y = 15 }
        doc.text(`${i + 1}. ${term}`, leftMargin, y)
        y += 3.5
      })
      
      y += 2
      
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(136, 136, 136)
      doc.text(`${COMPANY.website} | ${COMPANY.email} | ${COMPANY.phone}`, 105, 288, { align: 'center' })
      doc.text('Page 1 of 1', 105, 292, { align: 'center' })
      
      doc.save(`Quotation_${q.quotation_number || 'quote'}.pdf`)
      
      toast.dismiss()
      toast.success('PDF downloaded! 📄')
      
    } catch (error) {
      console.error('PDF Error:', error)
      toast.dismiss()
      toast.error('Failed to generate PDF: ' + error.message)
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
            {q.status === 'accepted' && (
              <>
                <button onClick={handleConvertToJob} 
                  className="neu-raised neu-btn px-4 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />Create Job
                </button>
                <button onClick={handleConvertToJobAndInvoice} 
                  className="neu-raised neu-btn px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />Job + Invoice
                </button>
              </>
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
