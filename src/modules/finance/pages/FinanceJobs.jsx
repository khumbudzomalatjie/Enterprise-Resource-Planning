import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import { 
  Briefcase, DollarSign, CheckCircle2, 
  Search, ArrowLeft, Sun, Moon, Sparkles,
  Building2, MapPin, Clock, Receipt, RefreshCw,
  Eye, Download, X
} from 'lucide-react'

// A4 Invoice Template Component - BLUE THEME
function InvoiceTemplate({ invoice, job }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }
  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div style={{
      width: '210mm',
      minHeight: '297mm',
      padding: '20mm',
      backgroundColor: 'white',
      fontFamily: 'Inter, Arial, sans-serif',
      color: '#1e293b',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '3px solid #2563eb', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb' }}>NG</span>
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af', margin: '0' }}>NDANDULENI GROUP</h1>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '5px 0' }}>Professional Cleaning & Hygiene Services</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0' }}>123 Main Street, Johannesburg, 2000</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0' }}>Tel: +27 11 234 5678 | info@ndanduleni.co.za</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a5f', margin: '0', letterSpacing: '2px' }}>INVOICE</h2>
          <p style={{ fontSize: '18px', color: '#2563eb', margin: '5px 0', fontWeight: 'bold' }}>#{invoice?.invoice_number || 'N/A'}</p>
          <div style={{ marginTop: '15px', fontSize: '11px', color: '#64748b' }}>
            <p style={{ margin: '2px 0' }}>Date: {formatDate(invoice?.invoice_date)}</p>
            <p style={{ margin: '2px 0' }}>Due Date: {formatDate(invoice?.due_date)}</p>
          </div>
        </div>
      </div>

      {/* Bill To & Job Reference */}
      <div style={{ marginBottom: '30px', display: 'flex', gap: '40px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>Bill To:</h3>
          <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', margin: '0' }}>{invoice?.client_name || job?.clients?.company_name || 'Client'}</p>
          {invoice?.client_email && <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0' }}>{invoice.client_email}</p>}
          <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0', whiteSpace: 'pre-line' }}>{invoice?.client_address || ''}</p>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>Job Reference:</h3>
          <p style={{ fontSize: '14px', color: '#1e293b', margin: '0', fontWeight: '500' }}>{job?.job_number || 'N/A'}</p>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0' }}>{job?.title || 'Cleaning Service'}</p>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0' }}>{job?.site_address || ''}</p>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
        <thead>
          <tr style={{ backgroundColor: '#1e40af', color: 'white' }}>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>#</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Qty</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unit</th>
            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unit Price</th>
            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b' }}>1</td>
            <td style={{ padding: '12px 16px', fontSize: '12px', color: '#1e293b' }}>
              <p style={{ margin: '0', fontWeight: '500' }}>{job?.title || 'Cleaning Service'}</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#94a3b8' }}>Job Ref: {job?.job_number || 'N/A'}</p>
            </td>
            <td style={{ padding: '12px 16px', fontSize: '12px', color: '#1e293b', textAlign: 'center' }}>1</td>
            <td style={{ padding: '12px 16px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>service</td>
            <td style={{ padding: '12px 16px', fontSize: '12px', color: '#1e293b', textAlign: 'right' }}>{formatCurrency(invoice?.subtotal || job?.quoted_amount)}</td>
            <td style={{ padding: '12px 16px', fontSize: '12px', color: '#1e293b', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(invoice?.subtotal || job?.quoted_amount)}</td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
        <div style={{ width: '320px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', backgroundColor: '#f8fafc' }}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>Subtotal:</span>
            <span style={{ color: '#1e293b', fontWeight: '600' }}>{formatCurrency(invoice?.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', backgroundColor: '#f8fafc' }}>
            <span style={{ color: '#64748b', fontWeight: '500' }}>VAT (15%):</span>
            <span style={{ color: '#1e293b' }}>{formatCurrency(invoice?.tax_amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#eff6ff' }}>
            <span style={{ color: '#1e40af' }}>TOTAL DUE:</span>
            <span style={{ color: '#1e40af', fontSize: '20px' }}>{formatCurrency(invoice?.total_amount)}</span>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div style={{ marginBottom: '30px', padding: '15px 20px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Payment Information</h3>
        <div style={{ display: 'flex', gap: '40px', fontSize: '11px', color: '#64748b' }}>
          <div>
            <p style={{ margin: '2px 0' }}><strong>Bank:</strong> First National Bank (FNB)</p>
            <p style={{ margin: '2px 0' }}><strong>Account Name:</strong> Ndanduleni Group (Pty) Ltd</p>
          </div>
          <div>
            <p style={{ margin: '2px 0' }}><strong>Account Number:</strong> 6277 123 45678</p>
            <p style={{ margin: '2px 0' }}><strong>Branch Code:</strong> 250655</p>
          </div>
          <div>
            <p style={{ margin: '2px 0' }}><strong>Payment Terms:</strong> 30 Days</p>
            <p style={{ margin: '2px 0' }}><strong>Reference:</strong> {invoice?.invoice_number || job?.job_number}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', borderTop: '2px solid #2563eb', paddingTop: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '10px', color: '#94a3b8', margin: '0' }}>Ndanduleni Group (Pty) Ltd | Reg: 2020/123456/07</p>
            <p style={{ fontSize: '10px', color: '#94a3b8', margin: '2px 0' }}>VAT Registration: 4567890123</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '10px', color: '#94a3b8', margin: '0' }}>123 Main Street, Johannesburg, 2000</p>
            <p style={{ fontSize: '10px', color: '#94a3b8', margin: '2px 0' }}>Tel: +27 11 234 5678 | info@ndanduleni.co.za</p>
          </div>
        </div>
        <p style={{ fontSize: '14px', color: '#2563eb', textAlign: 'center', margin: '15px 0 0 0', fontWeight: 'bold', letterSpacing: '1px' }}>
          Thank you for your business!
        </p>
      </div>
    </div>
  )
}

export default function FinanceJobs() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [generatingInvoice, setGeneratingInvoice] = useState(null)
  const [error, setError] = useState(null)
  const [viewingInvoice, setViewingInvoice] = useState(null)
  const [downloadingInvoice, setDownloadingInvoice] = useState(null)

  useEffect(() => {
    loadCompletedJobs()
  }, [])

  const loadCompletedJobs = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data: completedJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'completed')
        .order('actual_end_time', { ascending: false })
        .limit(50)

      if (jobsError) { setError(jobsError.message); setLoading(false); return }

      if (!completedJobs || completedJobs.length === 0) {
        setJobs([]); setLoading(false); return
      }

      const jobsWithDetails = await Promise.all(
        completedJobs.map(async (job) => {
          let clientInfo = null, categoryInfo = null, invoiceInfo = null

          if (job.client_id) {
            try {
              const { data: client } = await supabase.from('clients').select('company_name, email, phone, address_line1, city, postal_code').eq('id', job.client_id).single()
              clientInfo = client
            } catch (e) {}
          }

          if (job.job_category_id) {
            try {
              const { data: category } = await supabase.from('job_categories').select('name').eq('id', job.job_category_id).single()
              categoryInfo = category
            } catch (e) {}
          }

          if (job.quotation_id) {
            try {
              const { data: invoice } = await supabase.from('invoices').select('*').eq('quotation_id', job.quotation_id).single()
              invoiceInfo = invoice
            } catch (e) {}
          }

          return { ...job, clients: clientInfo, job_categories: categoryInfo, invoice: invoiceInfo }
        })
      )

      setJobs(jobsWithDetails)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  const generateInvoice = async (job) => {
    if (!job.client_id) { toast.error('This job has no client assigned.'); return }
    setGeneratingInvoice(job.id)

    try {
      const quotationNumber = 'Q-' + new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()
      const quotationAmount = job.quoted_amount || job.actual_cost || 500
      
      const { data: quotation, error: qError } = await supabase.from('quotations').insert([{
        quotation_number: quotationNumber, client_id: job.client_id,
        client_name: job.clients?.company_name || 'Client',
        client_email: job.clients?.email || '',
        client_address: [job.clients?.address_line1, job.clients?.city, job.clients?.postal_code].filter(Boolean).join(', ') || '',
        quotation_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: quotationAmount, tax_rate: 15, tax_amount: quotationAmount * 0.15, total_amount: quotationAmount * 1.15,
        status: 'accepted', notes: `Generated from completed job: ${job.job_number} - ${job.title}`, payment_terms: '30 Days'
      }]).select().single()
      if (qError) throw qError

      await supabase.from('quotation_items').insert([{
        quotation_id: quotation.id, item_number: 1,
        description: `${job.title || 'Cleaning Service'} - ${job.job_categories?.name || 'Service'}`,
        quantity: 1, unit: 'service', unit_price: quotationAmount, tax_percent: 15
      }])

      const invoiceNumber = 'INV-' + new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()
      const totalAmount = quotationAmount * 1.15
      
      const { data: invoice, error: iError } = await supabase.from('invoices').insert([{
        invoice_number: invoiceNumber, quotation_id: quotation.id, client_id: job.client_id,
        client_name: job.clients?.company_name || 'Client', client_email: job.clients?.email || '',
        client_address: [job.clients?.address_line1, job.clients?.city].filter(Boolean).join(', ') || '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: quotationAmount, tax_rate: 15, tax_amount: quotationAmount * 0.15, total_amount: totalAmount,
        status: 'sent', notes: `Invoice for job: ${job.job_number} - ${job.title}`
      }]).select().single()
      if (iError) throw iError

      await supabase.from('invoice_items').insert([{
        invoice_id: invoice.id, item_number: 1,
        description: `${job.title || 'Cleaning Service'} - ${job.job_categories?.name || 'Service'}`,
        quantity: 1, unit: 'service', unit_price: quotationAmount, tax_percent: 15
      }])

      await supabase.from('jobs').update({ quotation_id: quotation.id }).eq('id', job.id)
      toast.success(`Invoice ${invoiceNumber} generated! ✅`)
      loadCompletedJobs()
    } catch (error) {
      toast.error('Failed to generate invoice: ' + (error.message || 'Unknown error'))
    } finally {
      setGeneratingInvoice(null)
    }
  }

  const handleViewInvoice = (job) => {
    setViewingInvoice(job)
  }

  const handleDownloadInvoice = async (job) => {
    setDownloadingInvoice(job.id)
    
    try {
      const element = document.getElementById(`invoice-preview-${job.id}`)
      if (!element) { toast.error('Invoice preview not found'); setDownloadingInvoice(null); return }

      const opt = {
        margin: [0, 0, 0, 0],
        filename: `Invoice_${job.invoice?.invoice_number || job.job_number}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' }
      }

      await html2pdf().set(opt).from(element).save()
      toast.success('Invoice downloaded! 📄')
    } catch (error) {
      toast.error('Failed to download invoice')
    } finally {
      setDownloadingInvoice(null)
    }
  }

  const filteredJobs = jobs.filter(job => {
    if (!search) return true
    const s = search.toLowerCase()
    return (job.title || '').toLowerCase().includes(s) ||
           (job.job_number || '').toLowerCase().includes(s) ||
           (job.clients?.company_name || '').toLowerCase().includes(s) ||
           (job.site_address || '').toLowerCase().includes(s)
  })

  const totalValue = jobs.reduce((sum, job) => sum + (job.quoted_amount || job.actual_cost || 0), 0)
  const invoicedCount = jobs.filter(j => j.quotation_id).length
  const readyToInvoice = jobs.filter(j => !j.quotation_id).length

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <Link to="/finance" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Finance</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-8 h-8 text-emerald-600" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Completed Jobs - Invoice Generation</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">
              {jobs.length} completed · {readyToInvoice} ready · {invoicedCount} invoiced · Total: <span className="font-bold text-emerald-600">{formatCurrency(totalValue)}</span>
            </p>
          </div>
          <button onClick={loadCompletedJobs} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </motion.div>

        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Briefcase, label: 'Completed', value: jobs.length, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
            { icon: Receipt, label: 'Ready', value: readyToInvoice, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
            { icon: CheckCircle2, label: 'Invoiced', value: invoicedCount, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { icon: DollarSign, label: 'Total Value', value: formatCurrency(totalValue), color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="neu-raised rounded-2xl p-4">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <p className="text-lg font-bold text-slate-800 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {error && (
          <div className="neu-raised rounded-3xl p-8 mb-6 text-center border-2 border-red-200">
            <p className="text-red-600 font-semibold mb-2">Error loading jobs</p>
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <button onClick={loadCompletedJobs} className="px-6 py-2 rounded-xl bg-red-600 text-white text-sm">Try Again</button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading completed jobs...</p>
          </div>
        )}

        {!loading && !error && (
          <div className="neu-raised rounded-3xl overflow-hidden">
            {filteredJobs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="text-left py-3 px-4 text-slate-500">Job #</th>
                      <th className="text-left py-3 px-4 text-slate-500">Title / Client</th>
                      <th className="text-left py-3 px-4 text-slate-500">Location</th>
                      <th className="text-left py-3 px-4 text-slate-500">Completed</th>
                      <th className="text-right py-3 px-4 text-slate-500">Amount</th>
                      <th className="text-center py-3 px-4 text-slate-500">Status</th>
                      <th className="text-center py-3 px-4 text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map(job => (
                      <tr key={job.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-3 px-4 font-mono text-xs">{job.job_number || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800 dark:text-white">{job.title || 'Untitled'}</p>
                          <p className="text-xs text-slate-500">{job.clients?.company_name || 'No client'}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.site_address?.slice(0, 25) || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(job.actual_end_time)}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">{formatCurrency(job.quoted_amount || job.actual_cost)}</td>
                        <td className="py-3 px-4 text-center">
                          {job.quotation_id ? (
                            <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Invoiced
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">Ready</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {job.quotation_id ? (
                              <>
                                <button onClick={() => handleViewInvoice(job)} className="p-2 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600" title="View Invoice">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDownloadInvoice(job)} disabled={downloadingInvoice === job.id}
                                  className="p-2 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 disabled:opacity-50" title="Download A4 PDF">
                                  {downloadingInvoice === job.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            ) : (
                              <button onClick={() => generateInvoice(job)} disabled={generatingInvoice === job.id}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
                                {generatingInvoice === job.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                ) : (
                                  <Receipt className="w-3 h-3" />
                                )}
                                Generate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <p className="text-slate-500 text-lg mb-2">No completed jobs found</p>
                <p className="text-slate-400 text-sm">Jobs will appear here once marked as completed.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Invoice View Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setViewingInvoice(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg">Invoice Preview - {viewingInvoice.invoice?.invoice_number}</h3>
              <div className="flex gap-2">
                <button onClick={() => handleDownloadInvoice(viewingInvoice)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm flex items-center gap-2 hover:bg-blue-700">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button onClick={() => setViewingInvoice(null)} className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-100">
              <div className="bg-white shadow-lg" id={`invoice-preview-${viewingInvoice.id}`}>
                <InvoiceTemplate invoice={viewingInvoice.invoice} job={viewingInvoice} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden invoice templates for download */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {jobs.filter(j => j.quotation_id).map(job => (
          <div key={`hidden-${job.id}`} id={`invoice-preview-${job.id}`}>
            <InvoiceTemplate invoice={job.invoice} job={job} />
          </div>
        ))}
      </div>
    </div>
  )
}
