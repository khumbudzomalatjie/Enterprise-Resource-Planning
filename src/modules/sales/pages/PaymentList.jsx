import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  DollarSign, Search, Plus, ChevronRight, Sun, Moon, 
  Sparkles, ArrowLeft, RefreshCw, CreditCard, CheckCircle2
} from 'lucide-react'

export default function PaymentList() {
  const { isDark, toggleTheme } = useThemeStore()
  const [payments, setPayments] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    invoice_id: '',
    amount: '',
    payment_method: 'eft',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Get payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false })
        .limit(50)

      // Get unpaid invoices for the form
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, invoice_number, client_name, total_amount, amount_paid')
        .in('status', ['sent', 'partially_paid'])
        .order('created_at', { ascending: false })

      setPayments(paymentsData || [])
      setInvoices(invoicesData || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!paymentForm.invoice_id || !paymentForm.amount) {
      toast.error('Select invoice and enter amount')
      return
    }

    setSaving(true)
    try {
      const amount = parseFloat(paymentForm.amount)
      
      // Insert payment
      const { error: payError } = await supabase.from('payments').insert([{
        invoice_id: paymentForm.invoice_id,
        amount: amount,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number || null,
        notes: paymentForm.notes || null
      }])

      if (payError) throw payError

      // Update invoice amount_paid
      const selectedInvoice = invoices.find(i => i.id === paymentForm.invoice_id)
      const newAmountPaid = (selectedInvoice?.amount_paid || 0) + amount
      const newStatus = newAmountPaid >= (selectedInvoice?.total_amount || 0) ? 'paid' : 'partially_paid'

      await supabase.from('invoices').update({
        amount_paid: newAmountPaid,
        status: newStatus
      }).eq('id', paymentForm.invoice_id)

      toast.success('Payment recorded! ✅')
      setShowModal(false)
      setPaymentForm({
        invoice_id: '', amount: '', payment_method: 'eft',
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: '', notes: ''
      })
      loadData()
    } catch (err) {
      console.error('Error:', err)
      toast.error('Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const filteredPayments = payments.filter(p => {
    if (!search) return true
    const s = search.toLowerCase()
    return (p.reference_number || '').toLowerCase().includes(s)
  })

  const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

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
          <span className="text-slate-800 dark:text-white font-medium">Payments</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-emerald-600" />Payment Records
            </h1>
            <p className="text-slate-500 mt-1">{payments.length} payments · Total: <span className="font-bold">{formatCurrency(totalPayments)}</span></p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowModal(true)} className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2">
              <Plus className="w-5 h-5" /><span>Record Payment</span>
            </button>
            <button onClick={loadData} className="neu-raised neu-btn px-4 py-3 rounded-2xl bg-blue-600 text-white">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        <div className="neu-raised rounded-2xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by reference number..." className="w-full pl-10 pr-4 py-3 neu-inset rounded-xl text-sm" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div></div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12 neu-raised rounded-3xl">
            <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No payments recorded yet</p>
          </div>
        ) : (
          <div className="neu-raised rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left py-3 px-4 text-slate-500">Date</th>
                    <th className="text-left py-3 px-4 text-slate-500">Invoice</th>
                    <th className="text-left py-3 px-4 text-slate-500">Method</th>
                    <th className="text-left py-3 px-4 text-slate-500">Reference</th>
                    <th className="text-right py-3 px-4 text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map(payment => (
                    <tr key={payment.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-4 text-xs">{formatDate(payment.payment_date)}</td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          {payment.invoice_id?.slice(0, 8) || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 capitalize">{payment.payment_method?.replace(/_/g, ' ')}</td>
                      <td className="py-3 px-4 text-xs">{payment.reference_number || 'N/A'}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">{formatCurrency(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Record Payment</h3>
            <div className="space-y-3">
              <select value={paymentForm.invoice_id} onChange={e => setPaymentForm({...paymentForm, invoice_id: e.target.value})} className="w-full p-3 neu-inset rounded-xl">
                <option value="">Select Invoice</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} - {inv.client_name} ({formatCurrency(inv.total_amount - (inv.amount_paid || 0))} due)
                  </option>
                ))}
              </select>
              <input type="number" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} placeholder="Amount" className="w-full p-3 neu-inset rounded-xl" />
              <select value={paymentForm.payment_method} onChange={e => setPaymentForm({...paymentForm, payment_method: e.target.value})} className="w-full p-3 neu-inset rounded-xl">
                <option value="eft">EFT</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </select>
              <input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({...paymentForm, payment_date: e.target.value})} className="w-full p-3 neu-inset rounded-xl" />
              <input type="text" value={paymentForm.reference_number} onChange={e => setPaymentForm({...paymentForm, reference_number: e.target.value})} placeholder="Reference Number" className="w-full p-3 neu-inset rounded-xl" />
              <div className="flex gap-2">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl bg-slate-300 dark:bg-slate-600 font-semibold">Cancel</button>
                <button onClick={handleRecordPayment} disabled={saving} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50">
                  {saving ? 'Saving...' : 'Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
