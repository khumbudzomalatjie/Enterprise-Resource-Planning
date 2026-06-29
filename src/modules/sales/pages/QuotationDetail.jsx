import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Navbar from '../../../components/Navbar'
import useSalesStore from '../store/salesStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { 
  FileText, Edit, ChevronRight, Sun, Moon, Sparkles, 
  User, Calendar, Building2, Phone, Mail, MapPin, Printer,
  ArrowLeft
} from 'lucide-react'

const COMPANY = {
  name: 'NDANDULENI GROUP',
  tagline: 'Innovation Without End',
  address: '2220 Manthata Street, Midrand, 1685',
  phone: '070 419 9457',
  email: 'account@ndandulenigroup.co.za',
  website: 'www.ndandulenigroup.co.za',
  bank: 'Capitec Business',
  branch: '450105',
  accountNumber: '1054498946',
  accountType: 'Transact',
}

export default function QuotationDetail() {
  const { id } = useParams()
  const { selectedQuotation, fetchQuotation, loading } = useSalesStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => {
    console.log('QuotationDetail mounted, id:', id)
    if (id) {
      fetchQuotation(id)
    }
  }, [id])

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'

  const getStatusBadge = (status) => {
    const b = { 
      draft: 'bg-gray-100 text-gray-700', 
      sent: 'bg-blue-100 text-blue-700', 
      accepted: 'bg-emerald-100 text-emerald-700', 
      rejected: 'bg-red-100 text-red-700', 
      expired: 'bg-amber-100 text-amber-700', 
      converted: 'bg-purple-100 text-purple-700', 
      cancelled: 'bg-red-100 text-red-700' 
    }
    return b[status] || 'bg-gray-100'
  }

  const handlePrint = () => {
    if (!selectedQuotation) return
    window.print()
  }

  console.log('selectedQuotation:', selectedQuotation)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!selectedQuotation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">Quotation not found</p>
          <p className="text-slate-400 text-sm mt-1">ID: {id}</p>
          <Link to="/sales/quotations" className="text-emerald-600 hover:text-emerald-700 mt-3 inline-block">
            ← Back to Quotations
          </Link>
        </div>
      </div>
    )
  }

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
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/sales" className="text-slate-500 hover:text-emerald-600">Sales</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/sales/quotations" className="text-slate-500 hover:text-emerald-600">Quotations</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="font-medium">{q.quotation_number}</span>
        </div>

        {/* Header */}
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
            {(q.status === 'draft' || q.status === 'sent') && (
              <button onClick={() => navigate(`/sales/quotations/${q.id}/edit`)} 
                className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
                <Edit className="w-4 h-4" />Edit
              </button>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="neu-raised rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-500">Date</p>
            <p className="font-semibold flex items-center justify-center gap-1">
              <Calendar className="w-4 h-4" />{formatDate(q.quotation_date)}
            </p>
          </div>
          <div className="neu-raised rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-500">Expiry</p>
            <p className="font-semibold">{formatDate(q.valid_until)}</p>
          </div>
          <div className="neu-raised rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-500">Created By</p>
            <p className="font-semibold flex items-center justify-center gap-1">
              <User className="w-4 h-4" />{q.created_by_name || 'N/A'}
            </p>
          </div>
          <div className="neu-raised rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-500">Total</p>
            <p className="font-bold text-emerald-600 text-lg">{formatCurrency(q.total_amount)}</p>
          </div>
        </div>

        {/* Client Info */}
        <div className="neu-raised rounded-3xl p-6 mb-6">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />Client Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <p className="flex items-center gap-2"><Building2 className="w-4 h-4 text-slate-400" /><b>{q.client_name || q.clients?.company_name || 'N/A'}</b></p>
            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{q.client_phone || q.clients?.phone || 'N/A'}</p>
            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" />{q.client_email || q.clients?.email || 'N/A'}</p>
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" />{q.client_address || 'N/A'}</p>
          </div>
        </div>

        {/* Items */}
        <div className="neu-raised rounded-3xl p-6 mb-6">
          <h2 className="text-lg font-bold mb-3">Items / Services</h2>
          {items.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2">#</th><th className="text-left py-2">Description</th><th className="text-center py-2">Qty</th><th className="text-center py-2">Unit</th><th className="text-right py-2">Unit Price</th><th className="text-right py-2">Total</th></tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">{i+1}</td>
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-center">{item.unit||'each'}</td>
                    <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency((item.quantity||0)*(item.unit_price||0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-slate-500 text-center py-4">No items</p>}
          
          <div className="flex justify-end mt-4">
            <div className="w-56 space-y-2">
              <div className="flex justify-between text-sm"><span>Subtotal:</span><span>{formatCurrency(q.subtotal || 0)}</span></div>
              <div className="flex justify-between text-sm"><span>Discount:</span><span className="text-red-500">-{formatCurrency(q.discount_amount || 0)}</span></div>
              <div className="flex justify-between text-sm"><span>VAT:</span><span>{formatCurrency(q.tax_amount || 0)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Grand Total:</span><span className="text-emerald-600">{formatCurrency(q.total_amount || 0)}</span></div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {q.notes && (
          <div className="neu-raised rounded-3xl p-6 mb-6">
            <h2 className="text-lg font-bold mb-2">Notes</h2>
            <p className="text-sm text-slate-600 whitespace-pre-line">{q.notes}</p>
          </div>
        )}

        {/* Banking */}
        <div className="neu-raised rounded-3xl p-6">
          <h2 className="text-lg font-bold mb-3">Banking Details</h2>
          <div className="text-sm space-y-1">
            <p><b>Bank:</b> {COMPANY.bank}</p>
            <p><b>Branch Code:</b> {COMPANY.branch}</p>
            <p><b>Account No:</b> {COMPANY.accountNumber}</p>
            <p><b>Type:</b> {COMPANY.accountType}</p>
            <p><b>Reference:</b> {q.quotation_number}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
