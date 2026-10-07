import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import InvoicePDF from '../../sales/components/InvoicePDF'
import {
  Briefcase, DollarSign, CheckCircle2,
  Search, ArrowLeft, Sun, Moon, Sparkles,
  Receipt, RefreshCw, Eye, Download, X
} from 'lucide-react'

export default function FinanceJobs() {
  const { isDark, toggleTheme } = useThemeStore()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [generatingInvoice, setGeneratingInvoice] = useState(null)
  const [error, setError] = useState(null)
  const [viewingInvoice, setViewingInvoice] = useState(null)
  const [downloadingInvoice, setDownloadingInvoice] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const downloadRefs = useRef({})

  useEffect(() => {
    loadCompletedJobs()
  }, [statusFilter])

  const loadCompletedJobs = async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('jobs')
        .select('*')
        .not('status', 'eq', 'cancelled')
        .order('updated_at', { ascending: false })
        .limit(100)

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      const { data: allJobs, error: jobsError } = await query
      if (jobsError) { setError(jobsError.message); setLoading(false); return }
      if (!allJobs || allJobs.length === 0) { setJobs([]); setLoading(false); return }

      const { data: allInvoices } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .order('created_at', { ascending: false })
        .limit(200)

      const clientIds = [...new Set(allJobs.map(j => j.client_id).filter(Boolean))]
      const { data: clients } = await supabase.from('clients').select('*').in('id', clientIds)

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
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  const generateInvoice = async (job) => {
    if (job.status === 'cancelled') { toast.error('Cannot generate invoice for a cancelled job.'); return }
    if (!job.quoted_amount || job.quoted_amount <= 0) { toast.error('This job has no quoted amount.'); return }
    if (job.hasInvoice) { toast.error('Invoice already exists for this job.'); return }

    setGeneratingInvoice(job.id)
    try {
      const amount = parseFloat((job.quoted_amount || 0).toFixed(2))
      const taxAmount = parseFloat((amount * 0.15).toFixed(2))
      const totalAmount = parseFloat((amount + taxAmount).toFixed(2))

      const { data: invoice, error: iError } = await supabase.from('invoices').insert([{
        invoice_number: 'INV-' + Date.now().toString(36).toUpperCase().slice(-8),
        job_id: job.id,
        client_id: job.client_id || null,
        client_name: job.clients?.company_name || 'Client',
        client_email: job.clients?.email || '',
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

      await supabase.from('jobs').update({ invoice_id: invoice.id }).eq('id', job.id)

      await supabase.from('invoice_items').insert([{
        invoice_id: invoice.id,
        item_number: 1,
        description: `${job.title || 'Cleaning Service'}`,
        quantity: 1,
        unit: 'service',
        unit_price: amount,
        tax_percent: 15,
        total_price: amount
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

  const handleViewInvoice = (job) => setViewingInvoice(job)

  // ═══════════════════════════════════════════════════════════
  // ✅ BULLETPROOF 1-PAGE PDF — canvas + jsPDF direct
  //    scale: 3 for crisp logo and text
  // ═══════════════════════════════════════════════════════════
  const handleDownloadInvoice = async (job) => {
    setDownloadingInvoice(job.id)
    try {
      const element = downloadRefs.current[job.id]
      if (!element) { toast.error('Preview not ready'); setDownloadingInvoice(null); return }

      const canvas = await html2canvas(element, {
        scale: 3,                    // ✅ 3x for crisp logo
        useCORS: true,
        letterRendering: false,
        scrollX: 0,
        scrollY: 0,
        width: 794,
        height: 1122,
        windowWidth: 794,
        windowHeight: 1122,
        backgroundColor: '#ffffff',
        logging: false
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.98)
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')

      pdf.save(`Invoice_${job.invoice?.invoice_number || job.job_number}.pdf`)
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

        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { value: 'all', label: 'All Jobs' },
            { value: 'completed', label: 'Completed' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'pending', label: 'Pending' },
            { value: 'scheduled', label: 'Scheduled' },
          ].map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                statusFilter === s.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

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
                              <button
                                onClick={() => generateInvoice(job)}
                                disabled={generatingInvoice === job.id || !job.quoted_amount || job.hasInvoice}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
                                title={!job.quoted_amount ? 'No quoted amount' : job.hasInvoice ? 'Already invoiced' : 'Generate Invoice'}
                              >
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

      <AnimatePresence>
        {viewingInvoice && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setViewingInvoice(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
                <h3 className="font-bold text-lg">Invoice — {viewingInvoice.invoice?.invoice_number}</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleDownloadInvoice(viewingInvoice)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm flex items-center gap-2 hover:bg-blue-700">
                    <Download className="w-4 h-4" /> PDF
                  </button>
                  <button onClick={() => setViewingInvoice(null)} className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 bg-slate-100 overflow-x-auto">
                <div className="mx-auto" style={{ width: '794px', transform: 'scale(0.9)', transformOrigin: 'top center' }}>
                  <InvoicePDF
                    invoice={viewingInvoice.invoice}
                    items={viewingInvoice.invoice?.invoice_items || []}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: '-10000px',
          width: '794px',
          pointerEvents: 'none',
          zIndex: -1
        }}
      >
        {jobs.filter(j => j.hasInvoice).map(job => (
          <div
            key={`hidden-${job.id}`}
            ref={el => { if (el) downloadRefs.current[job.id] = el }}
            style={{
              width: '794px',
              height: '1122px',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <InvoicePDF
              invoice={job.invoice}
              items={job.invoice?.invoice_items || []}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
