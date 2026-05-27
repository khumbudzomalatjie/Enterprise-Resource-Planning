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
  CheckCircle, XCircle, Clock, Send
} from 'lucide-react'

export default function QuotationList() {
  const { quotations, fetchQuotations, updateQuotationStatus, loading } = useSalesStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [actionMenu, setActionMenu] = useState(null)

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

  const handleStatusChange = async (id, newStatus) => {
    const result = await updateQuotationStatus(id, newStatus)
    if (result.success) {
      toast.success(`Quotation ${newStatus.replace('_', ' ')}`)
      loadQuotations()
    } else {
      toast.error('Failed to update status')
    }
    setActionMenu(null)
  }

  const handleDownloadPDF = async (quotation) => {
    try {
      const html2pdf = (await import('html2pdf.js')).default
      // Create a temporary element for PDF
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = `<div style="padding:20px;font-family:Arial;">
        <h2>Quotation ${quotation.quotation_number}</h2>
        <p>Client: ${quotation.client_name}</p>
        <p>Total: ${formatCurrency(quotation.total_amount)}</p>
        <p>Status: ${quotation.status}</p>
      </div>`
      
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
    }
    return badges[status] || badges.draft
  }

  const getStatusIcon = (status) => {
    const icons = {
      draft: <Clock className="w-4 h-4" />,
      sent: <Send className="w-4 h-4" />,
      accepted: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
      converted: <CheckCircle className="w-4 h-4" />,
    }
    return icons[status] || <Clock className="w-4 h-4" />
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
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/sales" className="text-slate-500 hover:text-emerald-600">Sales</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">Quotations</span>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-emerald-600" />
              Quotations
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and track all quotations</p>
          </div>
          
          <Link
            to="/sales/quotations/new"
            className="neu-raised neu-btn px-6 py-3 rounded-2xl flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <FileText className="w-5 h-5" />
            <span>New Quotation</span>
          </Link>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="neu-raised rounded-2xl p-4 mb-6"
        >
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by quote number or client..."
                className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
              <option value="converted">Converted</option>
            </select>

            <button type="submit" className="neu-raised neu-btn px-6 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
              Search
            </button>
          </form>
        </motion.div>

        {/* Quotations Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="neu-raised rounded-3xl overflow-hidden"
        >
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-slate-500">Loading quotations...</p>
            </div>
          ) : quotations.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 text-lg">No quotations found</p>
              <Link to="/sales/quotations/new" className="mt-4 inline-flex neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700">
                Create First Quotation
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider py-4 px-4">Quote #</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider py-4 px-4">Client</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider py-4 px-4">Date</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider py-4 px-4">Total</th>
                    <th className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider py-4 px-4">Status</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider py-4 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quote) => (
                    <tr 
                      key={quote.id}
                      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800 dark:text-white text-sm">{quote.quotation_number}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {quote.clients?.company_name || quote.client_name || 'N/A'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(quote.quotation_date)}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className="font-semibold text-sm text-slate-800 dark:text-white">
                          {formatCurrency(quote.total_amount)}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(quote.status)}`}>
                          {getStatusIcon(quote.status)}
                          {quote.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* VIEW Button (Eye) */}
                          <button
                            onClick={() => navigate(`/sales/quotations/${quote.id}`)}
                            className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 transition-colors"
                            title="View Quotation"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* EDIT Button (Pen) */}
                          <button
                            onClick={() => navigate(`/sales/quotations/${quote.id}/edit`)}
                            className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 transition-colors"
                            title="Edit Quotation"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* DOWNLOAD PDF */}
                          <button
                            onClick={() => handleDownloadPDF(quote)}
                            className="p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-slate-400 hover:text-purple-600 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* STATUS CHANGE Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActionMenu(actionMenu === quote.id ? null : quote.id)}
                              className="p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-slate-400 hover:text-amber-600 transition-colors"
                              title="Change Status"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            
                            {actionMenu === quote.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 neu-raised rounded-xl p-2 z-50 bg-white dark:bg-slate-800 shadow-xl">
                                <p className="text-xs text-slate-500 px-3 py-1 mb-1">Change Status:</p>
                                {['draft', 'sent', 'accepted', 'rejected', 'expired'].map(status => (
                                  <button
                                    key={status}
                                    onClick={() => handleStatusChange(quote.id, status)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                                      quote.status === status 
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <span className={`w-2 h-2 rounded-full ${
                                      status === 'accepted' ? 'bg-emerald-500' :
                                      status === 'sent' ? 'bg-blue-500' :
                                      status === 'rejected' ? 'bg-red-500' :
                                      status === 'expired' ? 'bg-amber-500' :
                                      'bg-gray-400'
                                    }`}></span>
                                    {status.replace('_', ' ')}
                                    {quote.status === status && ' ✓'}
                                  </button>
                                ))}
                                <button
                                  onClick={() => setActionMenu(null)}
                                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 mt-1 border-t border-slate-200 dark:border-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
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

      {/* Close menu on outside click */}
      {actionMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setActionMenu(null)}
        ></div>
      )}
    </div>
  )
}
