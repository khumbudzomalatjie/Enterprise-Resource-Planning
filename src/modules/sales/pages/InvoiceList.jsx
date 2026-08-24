import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import { 
  Receipt, Search, Eye, Download, ChevronRight, 
  Sun, Moon, Sparkles, ArrowLeft, RefreshCw,
  DollarSign, X
} from 'lucide-react'

// A4 Invoice Template (Compact - Single Page)
function InvoiceTemplate({ invoice }) {
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
      width: '794px',
      height: '1123px',
      padding: '35px 45px',
      backgroundColor: 'white',
      fontFamily: 'Inter, Arial, sans-serif',
      color: '#1e293b',
      boxSizing: 'border-box',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `3px solid ${colors.main}`, paddingBottom: '10px', marginBottom: '15px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '55px', height: '55px', borderRadius: '50%', backgroundColor: colors.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: `2px solid ${colors.lightBorder}` }}>
            <img src="/logo.png" alt="Logo" style={{ width: '85%', height: '85%', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<span style="font-size:20px;font-weight:bold;color:${colors.main}">NG</span>` }} />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 'bold', color: colors.dark, margin: '0' }}>NDANDULENI GROUP</h1>
            <p style={{ fontSize: '8px', color: '#64748b', margin: '2px 0' }}>Professional Cleaning & Hygiene Services</p>
            <p style={{ fontSize: '7px', color: '#94a3b8', margin: '0' }}>2220 Manthata Street, Midrand | Tel: 070 419 9457</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: colors.dark, margin: '0', letterSpacing: '2px' }}>INVOICE</h2>
          <p style={{ fontSize: '13px', color: colors.main, margin: '2px 0', fontWeight: 'bold' }}>#{invoice?.invoice_number || 'N/A'}</p>
          <p style={{ fontSize: '8px', color: '#64748b', margin: '1px 0' }}>Date: {formatDate(invoice?.invoice_date)}</p>
          <p style={{ fontSize: '8px', color: '#64748b', margin: '1px 0' }}>Due: {formatDate(invoice?.due_date)}</p>
        </div>
      </div>

      <div style={{ marginBottom: '15px', flexShrink: 0 }}>
        <h3 style={{ fontSize: '8px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '3px' }}>Bill To:</h3>
        <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b', margin: '0' }}>{invoice?.client_name || 'Client'}</p>
        {invoice?.client_email && <p style={{ fontSize: '8px', color: '#64748b', margin: '1px 0' }}>{invoice.client_email}</p>}
        <p style={{ fontSize: '8px', color: '#64748b', margin: '1px 0' }}>{invoice?.client_address || ''}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', flexShrink: 0 }}>
        <thead>
          <tr style={{ backgroundColor: colors.main, color: 'white' }}>
            <th style={{ padding: '5px 8px', textAlign: 'left', fontSize: '8px', fontWeight: 'bold' }}>Description</th>
            <th style={{ padding: '5px 8px', textAlign: 'center', fontSize: '8px', fontWeight: 'bold' }}>Qty</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: '8px', fontWeight: 'bold' }}>Unit Price</th>
            <th style={{ padding: '5px 8px', textAlign: 'right', fontSize: '8px', fontWeight: 'bold' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '5px 8px', fontSize: '8px', color: '#1e293b', fontWeight: '500' }}>{invoice?.notes || 'Cleaning Service'}</td>
            <td style={{ padding: '5px 8px', fontSize: '8px', color: '#1e293b', textAlign: 'center' }}>1</td>
            <td style={{ padding: '5px 8px', fontSize: '8px', color: '#1e293b', textAlign: 'right' }}>{formatCurrency(invoice?.subtotal)}</td>
            <td style={{ padding: '5px 8px', fontSize: '8px', color: '#1e293b', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(invoice?.subtotal)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px', flexShrink: 0 }}>
        <div style={{ width: '220px', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '8px', backgroundColor: '#f8fafc' }}>
            <span style={{ color: '#64748b' }}>Subtotal:</span>
            <span>{formatCurrency(invoice?.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '8px', backgroundColor: '#f8fafc' }}>
            <span style={{ color: '#64748b' }}>VAT (15%):</span>
            <span>{formatCurrency(invoice?.tax_amount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', backgroundColor: colors.totalBg }}>
            <span style={{ color: colors.dark }}>TOTAL DUE:</span>
            <span style={{ color: colors.dark }}>{formatCurrency(invoice?.total_amount)}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '6px 12px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', marginBottom: '15px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '20px', fontSize: '7px', color: '#64748b', flexWrap: 'wrap' }}>
          <span><strong>Bank:</strong> Capitec Business</span>
          <span><strong>Account:</strong> 1054498946</span>
          <span><strong>Branch:</strong> 450105</span>
          <span><strong>Ref:</strong> {invoice?.invoice_number}</span>
        </div>
      </div>

      <div style={{ marginTop: 'auto', borderTop: `2px solid ${colors.main}`, paddingTop: '8px', textAlign: 'center', flexShrink: 0 }}>
        <p style={{ fontSize: '6px', color: '#94a3b8', margin: '0' }}>
          Ndanduleni Group (Pty) Ltd | 2220 Manthata Street, Midrand | Tel: 070 419 9457
        </p>
        <p style={{ fontSize: '10px', color: colors.main, margin: '4px 0 0 0', fontWeight: 'bold' }}>
          Thank you for your business!
        </p>
      </div>
    </div>
  )
}

export default function InvoiceList() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewingInvoice, setViewingInvoice] = useState(null)
  const [downloadingInvoice, setDownloadingInvoice] = useState(null)

  useEffect(() => {
    loadInvoices()
  }, [statusFilter])

  const loadInvoices = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      const { data, error } = await query
      if (error) throw error
      setInvoices(data || [])
    } catch (err) {
      console.error('Error:', err)
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getStatusBadge = (status) => {
    if (!status) return 'bg-slate-100 text-slate-600'
    if (status === 'paid') return 'bg-emerald-100 text-emerald-700'
    if (status === 'sent') return 'bg-blue-100 text-blue-700'
    if (status === 'overdue') return 'bg-red-100 text-red-700'
    if (status === 'partially_paid') return 'bg-amber-100 text-amber-700'
    return 'bg-slate-100 text-slate-600'
  }

  const handleViewInvoice = (invoice) => {
    setViewingInvoice(invoice)
  }

  const handleDownloadInvoice = async (invoice) => {
    setDownloadingInvoice(invoice.id)
    try {
      const element = document.getElementById(`invoice-download-${invoice.id}`)
      if (!element) { toast.error('Preview not found'); setDownloadingInvoice(null); return }

      const opt = {
        margin: [0, 0, 0, 0],
        filename: `Invoice_${invoice.invoice_number}.pdf`,
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

  const filteredInvoices = invoices.filter(inv => {
    if (!search) return true
    const s = search.toLowerCase()
    return (inv.invoice_number || '').toLowerCase().includes(s) ||
           (inv.client_name || '').toLowerCase().includes(s)
  })

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  const outstanding = totalAmount - paidAmount

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <div className="fixed top-20 right-4 z-30 flex items-center gap-4">
        <div className="neu-inset px-5 py-2 rounded-full flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold tracking-wide text-emerald-800 dark:text-emerald-200 hidden sm:inline">ERP</span>
        </div>
        <button onClick={toggleTheme} className="neu-raised neu-btn w-12 h-12 rounded-2xl flex items-center justify-center">
          {isDark ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-slate-600" />}
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/sales" className="text-slate-500 hover:text-emerald-600">Sales</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Invoices</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <Receipt className="w-8 h-8 text-emerald-600" />Invoices
            </h1>
            <p className="text-slate-500 mt-1">{invoices.length} invoices found</p>
          </div>
          <button onClick={loadInvoices} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="neu-raised rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(totalAmount)}</p>
            <p className="text-xs text-slate-500">Total Invoiced</p>
          </div>
          <div className="neu-raised rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(paidAmount)}</p>
            <p className="text-xs text-slate-500">Paid</p>
          </div>
          <div className="neu-raised rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{formatCurrency(outstanding)}</p>
            <p className="text-xs text-slate-500">Outstanding</p>
          </div>
        </div>

        {/* Filters */}
        <div className="neu-raised rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by invoice # or client..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-sm">
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="partially_paid">Partially Paid</option>
          </select>
        </div>

        {/* Invoices Table */}
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12 neu-raised rounded-3xl">
            <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No invoices found</p>
          </div>
        ) : (
          <div className="neu-raised rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left py-3 px-4 text-slate-500">Invoice #</th>
                    <th className="text-left py-3 px-4 text-slate-500">Client</th>
                    <th className="text-left py-3 px-4 text-slate-500">Date</th>
                    <th className="text-left py-3 px-4 text-slate-500">Due</th>
                    <th className="text-right py-3 px-4 text-slate-500">Amount</th>
                    <th className="text-center py-3 px-4 text-slate-500">Status</th>
                    <th className="text-center py-3 px-4 text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-white">{inv.invoice_number}</td>
                      <td className="py-3 px-4">{inv.client_name || 'N/A'}</td>
                      <td className="py-3 px-4 text-xs">{formatDate(inv.invoice_date)}</td>
                      <td className="py-3 px-4 text-xs">{formatDate(inv.due_date)}</td>
                      <td className="py-3 px-4 text-right font-bold">{formatCurrency(inv.total_amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(inv.status)}`}>
                          {inv.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleViewInvoice(inv)} className="p-2 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600" title="View Invoice">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDownloadInvoice(inv)} disabled={downloadingInvoice === inv.id}
                            className="p-2 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 disabled:opacity-50" title="Download PDF">
                            {downloadingInvoice === inv.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Hidden invoice templates for download */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          {invoices.map(inv => (
            <div key={`hidden-${inv.id}`} id={`invoice-download-${inv.id}`}>
              <InvoiceTemplate invoice={inv} />
            </div>
          ))}
        </div>
      </main>

      {/* Invoice View Modal */}
      <AnimatePresence>
        {viewingInvoice && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" 
            onClick={() => setViewingInvoice(null)}
          >
            <motion.div 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
                <h3 className="font-bold text-lg">Invoice - {viewingInvoice.invoice_number}</h3>
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
                <div className="bg-white shadow-lg" id={`invoice-view-${viewingInvoice.id}`}>
                  <InvoiceTemplate invoice={viewingInvoice} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
