import { useEffect, useState } from 'react'
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

// A4 Invoice Template Component
function InvoiceTemplate({ invoice, job }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }
  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const colors = {
    main: '#1B5080',
    dark: '#0D2D4A',
    lightBg: '#e8f0f8',
    lightBorder: '#c5d5e8',
    totalBg: '#eaf1f8'
  }

  return (
    <div style={{
      width: '210mm', height: '297mm', padding: '15mm 20mm',
      backgroundColor: 'white', fontFamily: 'Inter, Arial, sans-serif',
      color: '#1e293b', boxSizing: 'border-box', overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px', borderBottom: `3px solid ${colors.main}`, paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '65px', height: '65px', borderRadius: '50%', backgroundColor: colors.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: `2px solid ${colors.lightBorder}` }}>
            <img src="/logo.png" alt="Logo" style={{ width: '85%', height: '85%', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<span style="font-size:22px;font-weight:bold;color:${colors.main}">NG</span>` }} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: colors.dark, margin: '0' }}>NDANDULENI GROUP</h1>
            <p style={{ fontSize: '9px', color: '#64748b', margin: '2px 0' }}>Professional Cleaning & Hygiene Services</p>
            <p style={{ fontSize: '8px', color: '#94a3b8', margin: '0' }}>2220 Manthata Street, Midrand | Tel: 070 419 9457</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <h2 style={{ fontSize: '26px', fontWeight: 'bold', color: colors.dark, margin: '0', letterSpacing: '2px' }}>INVOICE</h2>
          <p style={{ fontSize: '15px', color: colors.main, margin: '2px 0', fontWeight: 'bold' }}>#{invoice?.invoice_number || 'N/A'}</p>
          <div style={{ marginTop: '6px', fontSize: '9px', color: '#64748b' }}>
            <p style={{ margin: '1px 0' }}>Date: {formatDate(invoice?.invoice_date)}</p>
            <p style={{ margin: '1px 0' }}>Due: {formatDate(invoice?.due_date)}</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '18px', display: 'flex', gap: '30px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Bill To:</h3>
          <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', margin: '0' }}>{invoice?.client_name || job?.clients?.company_name || 'Client'}</p>
          {invoice?.client_email && <p style={{ fontSize: '9px', color: '#64748b', margin: '1px 0' }}>{invoice.client_email}</p>}
          <p style={{ fontSize: '9px', color: '#64748b', margin: '1px 0' }}>{invoice?.client_address || job?.site_address || ''}</p>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '9px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Reference:</h3>
          <p style={{ fontSize: '12px', color: '#1e293b', margin: '0', fontWeight: '500' }}>Job: {job?.job_number || 'N/A'}</p>
          <p style={{ fontSize: '9px', color: '#64748b', margin: '1px 0' }}>{job?.title || 'Cleaning Service'}</p>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '18px' }}>
        <thead>
          <tr style={{ backgroundColor: colors.main, color: 'white' }}>
            <th style={{ padding: '7px 10px', textAlign: 'left', fontSize: '9px', fontWeight: 'bold' }}>#</th>
            <th style={{ padding: '7px 10px', textAlign: 'left', fontSize: '9px', fontWeight: 'bold' }}>Description</th>
            <th style={{ padding: '7px 10px', textAlign: 'center', fontSize: '9px', fontWeight: 'bold' }}>Qty</th>
            <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: '9px', fontWeight: 'bold' }}>Unit Price</th>
            <th style={{ padding: '7px 10px', textAlign: 'right', fontSize: '9px', fontWeight: 'bold' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '7px 10px', fontSize: '9px', color: '#64748b' }}>1</td>
            <td style={{ padding: '7px 10px', fontSize: '9px', color: '#1e293b', fontWeight: '500' }}>
              {job?.title || 'Cleaning Service'}
              <div style={{ fontSize: '7px', color: '#94a3b8' }}>Job: {job?.job_number || 'N/A'}</div>
            </td>
            <td style={{ padding: '7px 10px', fontSize: '9px', color: '#1e293b', textAlign: 'center' }}>1</td>
            <td style={{ padding: '7px 10px', fontSize: '9px', color: '#1e293b', textAlign: 'right' }}>{formatCurrency(invoice?.subtotal || job?.quoted_amount)}</td>
            <td style={{ padding: '7px 10px', fontSize: '9px', color: '#1e293b', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(invoice?.subtotal || job?.quoted_amount)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '18px' }}>
        <div style={{ width: '260px', border: '1px solid #e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '9px', backgroundColor: '#f8fafc' }}>
            <span style={{ color: '#64748b' }}>Subtotal:</span>
            <span style={{ color: '#1e293b', fontWeight: '600' }}>{formatCurrency(invoice?.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '9px', backgroundColor: '#f8fafc' }}>
            <span style={{ color: '#64748b' }}>VAT (15%):</span>
            <span style={{ color: '#1e293b' }}>{formatCurrency(invoice?.tax_amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: '13px', fontWeight: 'bold', backgroundColor: colors.totalBg }}>
            <span style={{ color: colors.dark }}>TOTAL DUE:</span>
            <span style={{ color: colors.dark, fontSize: '15px' }}>{formatCurrency(invoice?.total_amount)}</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '15px', padding: '8px 14px', backgroundColor: '#f8fafc', borderRadius: '5px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '9px', fontWeight: 'bold', color: colors.dark, marginBottom: '4px', textTransform: 'uppercase' }}>Payment Information</h3>
        <div style={{ display: 'flex', gap: '25px', fontSize: '8px', color: '#64748b' }}>
          <div>
            <p style={{ margin: '1px 0' }}><strong>Bank:</strong> Capitec Business</p>
            <p style={{ margin: '1px 0' }}><strong>Account:</strong> 1054498946</p>
          </div>
          <div>
            <p style={{ margin: '1px 0' }}><strong>Branch:</strong> 450105</p>
            <p style={{ margin: '1px 0' }}><strong>Terms:</strong> 30 Days</p>
          </div>
          <div>
            <p style={{ margin: '1px 0' }}><strong>Ref:</strong> {invoice?.invoice_number || job?.job_number}</p>
          </div>
        </div>
      </div>

      <div style={{ borderTop: `2px solid ${colors.main}`, paddingTop: '8px', textAlign: 'center' }}>
        <p style={{ fontSize: '7px', color: '#94a3b8', margin: '0' }}>
          Ndanduleni Group (Pty) Ltd | 2220 Manthata Street, Midrand | Tel: 070 419 9457
        </p>
        <p style={{ fontSize: '11px', color: colors.main, margin: '6px 0 0 0', fontWeight: 'bold' }}>
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
      // Get ALL jobs (not just completed - show everything)
      const { data: allJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100)

      if (jobsError) { setError(jobsError.message); setLoading(false); return }

      if (!allJobs || allJobs.length === 0) {
        setJobs([]); setLoading(false); return
      }

      // Get ALL invoices
      const { data: allInvoices } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      // Get ALL clients
      const clientIds = [...new Set(allJobs.map(j => j.client_id).filter(Boolean))]
      const { data: clients } = await supabase.from('clients').select('*').in('id', clientIds)

      // Merge: every job with its invoice if exists
      const merged = allJobs.map(job => {
        const invoice = (allInvoices || []).find(i => i.job_id === job.id) || 
                       (allInvoices || []).find(i => i.id === job.invoice_id) || null
        return {
          ...job,
          clients: (clients || []).find(c => c.id === job.client_id) || null,
          invoice: invoice,
          hasInvoice: !!invoice
        }
      })

      setJobs(merged)
      console.log(`✅ Loaded ${merged.length} jobs, ${merged.filter(j => j.hasInvoice).length} with invoices`)
    } catch (err) {
      console.error('Error:', err)
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
    setGeneratingInvoice(job.id)

    try {
      const amount = parseFloat((job.quoted_amount || 0).toFixed(2))
      if (amount <= 0) {
        toast.error('This job has no quoted amount. Cannot generate invoice.')
        setGeneratingInvoice(null)
        return
      }

      const taxAmount = parseFloat((amount * 0.15).toFixed(2))
      const totalAmount = parseFloat((amount + taxAmount).toFixed(2))

      const { data: invoice, error: iError } = await supabase.from('invoices').insert([{
        invoice_number: 'INV-' + Date.now().toString(36).toUpperCase().slice(-8),
        job_id: job.id,
        client_id: job.client_id || null,
        client_name: job.clients?.company_name || 'Client',
        client_email: job.clients?.email || '',
        client_phone: job.clients?.phone || '',
        client_address: job.clients?.address_line1 || job.site_address || '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: amount,
        tax_rate: 15,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: 'sent',
        notes: `Job: ${job.job_number || 'N/A'} - ${job.title || 'Cleaning Service'}`
      }]).select().single()
      
      if (iError) throw iError

      // Link invoice to job
      await supabase.from('jobs').update({ invoice_id: invoice.id }).eq('id', job.id)

      // Insert invoice item
      await supabase.from('invoice_items').insert([{
        invoice_id: invoice.id,
        item_number: 1,
        description: `${job.title || 'Cleaning Service'}`,
        quantity: 1,
        unit: 'service',
        unit_price: amount,
        tax_percent: 15
      }])

      toast.success(`Invoice ${invoice.invoice_number} generated! ✅`)
      loadCompletedJobs()
    } catch (error) {
      console.error('Generate error:', error)
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
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 794, windowHeight: 1123 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all'] }
      }

      await html2pdf().set(opt).from(element).save()
      toast.success('Invoice downloaded! 📄')
    } catch (error) {
      console.error('Download error:', error)
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

  const completedCount = jobs.filter(j => j.status === 'completed').length
  const totalValue = jobs.reduce((sum, job) => sum + (job.quoted_amount || 0), 0)
  const invoicedCount = jobs.filter(j => j.hasInvoice).length

  const getStatusBadge = (status) => {
    if (!status) return 'bg-slate-100 text-slate-600'
    if (status === 'completed') return 'bg-emerald-100 text-emerald-700'
    if (status === 'in_progress') return 'bg-amber-100 text-amber-700'
    if (status === 'pending') return 'bg-blue-100 text-blue-700'
    if (status === 'scheduled') return 'bg-purple-100 text-purple-700'
    if (status === 'cancelled') return 'bg-red-100 text-red-700'
    return 'bg-slate-100 text-slate-600'
  }

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
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Jobs & Invoice Generation</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 ml-11">
              {jobs.length} jobs · {completedCount} completed · {invoicedCount} invoiced · Total: <span className="font-bold text-emerald-600">{formatCurrency(totalValue)}</span>
            </p>
          </div>
          <button onClick={loadCompletedJobs} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </motion.div>

        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by job #, title, or client..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Briefcase, label: 'All Jobs', value: jobs.length, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
            { icon: CheckCircle2, label: 'Completed', value: completedCount, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
            { icon: Receipt, label: 'Invoiced', value: invoicedCount, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
            { icon: DollarSign, label: 'Total Value', value: formatCurrency(totalValue), color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
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
            <p className="text-slate-500">Loading jobs...</p>
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
                      <th className="text-left py-3 px-4 text-slate-500">Status</th>
                      <th className="text-right py-3 px-4 text-slate-500">Amount</th>
                      <th className="text-center py-3 px-4 text-slate-500">Invoice</th>
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
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(job.status)}`}>
                            {job.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">{formatCurrency(job.quoted_amount)}</td>
                        <td className="py-3 px-4 text-center">
                          {job.hasInvoice ? (
                            <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">
                              {job.invoice?.invoice_number}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-500">No Invoice</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {job.hasInvoice ? (
                              <>
                                <button onClick={() => handleViewInvoice(job)} className="p-2 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600" title="View">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDownloadInvoice(job)} disabled={downloadingInvoice === job.id}
                                  className="p-2 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 disabled:opacity-50" title="Download PDF">
                                  {downloadingInvoice === job.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            ) : (
                              <button onClick={() => generateInvoice(job)} disabled={generatingInvoice === job.id || !job.quoted_amount}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                                title={!job.quoted_amount ? 'No quoted amount - add one in Operations' : 'Generate Invoice'}>
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
                <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg mb-2">No jobs found</p>
                <p className="text-slate-400 text-sm">Create jobs in Operations and they will appear here.</p>
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
              <h3 className="font-bold text-lg">Invoice - {viewingInvoice.invoice?.invoice_number}</h3>
              <div className="flex gap-2">
                <button onClick={() => handleDownloadInvoice(viewingInvoice)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm flex items-center gap-2 hover:bg-blue-700">
                  <Download className="w-4 h-4" /> PDF
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
        {jobs.filter(j => j.hasInvoice).map(job => (
          <div key={`hidden-${job.id}`} id={`invoice-preview-${job.id}`}>
            <InvoiceTemplate invoice={job.invoice} job={job} />
          </div>
        ))}
      </div>
    </div>
  )
}
