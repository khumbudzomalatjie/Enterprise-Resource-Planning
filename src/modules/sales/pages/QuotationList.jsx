import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useSalesStore from '../store/salesStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  FileText, Search, Eye, Edit, ChevronRight,
  Sun, Moon, Sparkles, Download, MoreVertical,
  CheckCircle, XCircle, Send, Trash2, AlertTriangle,
  Briefcase
} from 'lucide-react'

export default function QuotationList() {
  const { quotations, fetchQuotations, updateQuotationStatus, loading } = useSalesStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionMenu, setActionMenu] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [acceptConfirm, setAcceptConfirm] = useState(null)
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    loadQuotations()
  }, [statusFilter])

  const loadQuotations = async () => {
    const filters = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    if (search) filters.search = search
    await fetchQuotations(filters)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadQuotations()
  }

  // Status change handler - FIXED
  const handleStatusChange = async (id, newStatus) => {
    setActionMenu(null)
    
    if (newStatus === 'accepted') {
      setAcceptConfirm(id)
      return
    }

    setProcessingId(id)
    const result = await updateQuotationStatus(id, newStatus)
    setProcessingId(null)
    
    if (result.success) {
      toast.success(`Quotation marked as ${newStatus.replace('_', ' ')}`)
      loadQuotations()
    } else {
      toast.error(result.error || 'Failed to update status')
    }
  }

  // Accept quotation and create job
  const handleAcceptQuotation = async () => {
    if (!acceptConfirm) return
    
    setProcessingId(acceptConfirm)
    const result = await updateQuotationStatus(acceptConfirm, 'accepted')
    setProcessingId(null)
    
    if (result.success) {
      toast.success('Quotation accepted! ✅')
      loadQuotations()
    } else {
      toast.error(result.error || 'Failed to accept quotation')
    }
    setAcceptConfirm(null)
  }

  // Delete quotation
  const handleDelete = async (id) => {
    setDeleteConfirm(null)
    setProcessingId(id)
    const result = await updateQuotationStatus(id, 'cancelled')
    setProcessingId(null)
    if (result.success) {
      toast.success('Quotation deleted')
      loadQuotations()
    } else {
      toast.error(result.error || 'Failed to delete')
    }
  }

  // Edit quotation - FIXED: navigate to the quotation detail/edit page
  const handleEdit = (quote) => {
    navigate(`/sales/quotations/${quote.id}`)
  }

  // View quotation
  const handleView = (quote) => {
    navigate(`/sales/quotations/${quote.id}`)
  }

  const handleDownloadPDF = async (quotation) => {
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = `
        <div style="padding:20px;font-family:Arial;width:210mm;">
          <h2 style="color:#2563eb;">NDANDULENI GROUP</h2>
          <h3>Quotation ${quotation.quotation_number}</h3>
          <p><strong>Client:</strong> ${quotation.client_name || quotation.clients?.company_name || 'N/A'}</p>
          <p><strong>Date:</strong> ${formatDate(quotation.quotation_date)}</p>
          <p><strong>Total:</strong> ${formatCurrency(quotation.total_amount)}</p>
          <p><strong>Status:</strong> ${quotation.status}</p>
        </div>
      `
      
      const opt = {
        margin: 10,
        filename: `Quotation_${quotation.quotation_number}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }

      await html2pdf().set(opt).from(tempDiv).save()
      toast.success('PDF downloaded')
    } catch (error) {
      toast.error('Failed to download PDF')
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      expired: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      converted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }
    return badges[status] || badges.draft
  }

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
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/sales" className="text-slate-500 hover:text-emerald-600">Sales</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Quotations</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-emerald-600" />Quotations
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and track quotations</p>
          </div>
          
          <Link to="/sales/quotations/new" className="neu-raised neu-btn px-6 py-3 rounded-2xl flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
            <FileText className="w-5 h-5" /><span>New Quotation</span>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="neu-raised rounded-2xl p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by quote # or client..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300">
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
              <option value="converted">Converted</option>
            </select>
            <button type="submit" className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">Search</button>
          </form>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="neu-raised rounded-3xl overflow-hidden">
          {loading ? (
            <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div><p className="text-slate-500">Loading...</p></div>
          ) : quotations.length === 0 ? (
            <div className="text-center py-12"><FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 text-lg">No quotations found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left text-xs font-medium text-slate-500 py-4 px-4">Quote #</th>
                    <th className="text-left text-xs font-medium text-slate-500 py-4 px-4">Client</th>
                    <th className="text-left text-xs font-medium text-slate-500 py-4 px-4">Date</th>
                    <th className="text-right text-xs font-medium text-slate-500 py-4 px-4">Total</th>
                    <th className="text-center text-xs font-medium text-slate-500 py-4 px-4">Status</th>
                    <th className="text-right text-xs font-medium text-slate-500 py-4 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quote) => (
                    <tr key={quote.id} className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${processingId === quote.id ? 'opacity-50' : ''}`}>
                      <td className="py-3 px-4"><p className="font-medium text-slate-800 dark:text-white text-sm">{quote.quotation_number}</p></td>
                      <td className="py-3 px-4"><p className="text-sm text-slate-700 dark:text-slate-300">{quote.clients?.company_name || quote.client_name || 'N/A'}</p></td>
                      <td className="py-3 px-4"><p className="text-sm text-slate-600">{formatDate(quote.quotation_date)}</p></td>
                      <td className="py-3 px-4 text-right"><p className="font-semibold text-sm text-slate-800 dark:text-white">{formatCurrency(quote.total_amount)}</p></td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(quote.status)}`}>
                          {quote.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Button */}
                          <button onClick={() => handleView(quote)} className="p-2 rounded-lg hover:bg-blue-100 text-slate-400 hover:text-blue-600" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {/* Edit Button - FIXED: goes to quotation detail page */}
                          <button onClick={() => handleEdit(quote)} className="p-2 rounded-lg hover:bg-emerald-100 text-slate-400 hover:text-emerald-600" title="Edit Quotation">
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          {/* Download PDF */}
                          <button onClick={() => handleDownloadPDF(quote)} className="p-2 rounded-lg hover:bg-purple-100 text-slate-400 hover:text-purple-600" title="Download PDF">
                            <Download className="w-4 h-4" />
                          </button>
                          
                          {/* Status Change Menu */}
                          {(quote.status === 'draft' || quote.status === 'sent') && (
                            <div className="relative">
                              <button onClick={() => setActionMenu(actionMenu === quote.id ? null : quote.id)} className="p-2 rounded-lg hover:bg-amber-100 text-slate-400 hover:text-amber-600" title="Change Status">
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {actionMenu === quote.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 neu-raised rounded-xl p-2 z-50 bg-white dark:bg-slate-800 shadow-xl">
                                  <p className="text-xs text-slate-500 px-3 py-1 mb-1">Change Status:</p>
                                  {quote.status === 'draft' && (
                                    <button onClick={() => handleStatusChange(quote.id, 'sent')} className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-50">
                                      <Send className="w-3 h-3 text-blue-500" /> Mark as Sent
                                    </button>
                                  )}
                                  <button onClick={() => handleStatusChange(quote.id, 'accepted')} className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-emerald-50">
                                    <CheckCircle className="w-3 h-3 text-emerald-500" /> Accept & Create Job
                                  </button>
                                  <button onClick={() => handleStatusChange(quote.id, 'rejected')} className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-red-50">
                                    <XCircle className="w-3 h-3 text-red-500" /> Mark as Rejected
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Delete Button */}
                          {(quote.status === 'draft' || quote.status === 'sent') && (
                            <button onClick={() => setDeleteConfirm(quote.id)} className="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>

      {/* Accept Confirmation Modal */}
      {acceptConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="neu-raised rounded-3xl p-8 max-w-lg w-full bg-white dark:bg-slate-800">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Accept Quotation?</h3>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 mb-4 text-left">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">This will:</p>
                    <ul className="text-xs text-amber-700 dark:text-amber-400 mt-1 space-y-1 list-disc list-inside">
                      <li>Mark quotation as <strong>Accepted</strong></li>
                      <li>Update the quotation status</li>
                    </ul>
                  </div>
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                Are you sure you want to accept this quotation?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setAcceptConfirm(null)} className="flex-1 neu-raised neu-btn px-6 py-3 rounded-xl text-slate-600 hover:bg-slate-100">Cancel</button>
                <button onClick={handleAcceptQuotation} className="flex-1 neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />Accept
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="neu-raised rounded-3xl p-8 max-w-md w-full bg-white dark:bg-slate-800">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Delete Quotation?</h3>
              <p className="text-slate-500 mb-6">This quotation will be cancelled. This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 neu-raised neu-btn px-6 py-3 rounded-xl">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 neu-raised neu-btn px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" />Delete</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {actionMenu && <div className="fixed inset-0 z-40" onClick={() => setActionMenu(null)}></div>}
    </div>
  )
}
