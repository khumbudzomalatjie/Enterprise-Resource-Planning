import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useProcurementStore from '../store/procurementStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { FileText, Edit, Trash2, CheckCircle2, XCircle, ShoppingCart, ChevronRight, ArrowLeft } from 'lucide-react'

export default function PRDetail() {
  const { id } = useParams()
  const { selectedPR, fetchPR, updatePRStatus, convertPRToPO, loading } = useProcurementStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (id && id !== 'new') fetchPR(id)
  }, [id])

  const handleApprove = async () => {
    const result = await updatePRStatus(id, 'approved')
    if (result.success) {
      toast.success('PR approved!')
      fetchPR(id)
    }
  }

  const handleReject = async () => {
    const reason = prompt('Rejection reason:')
    if (reason) {
      await updatePRStatus(id, 'rejected')
      toast.success('PR rejected')
      fetchPR(id)
    }
  }

  const handleConvertToPO = async () => {
    if (window.confirm('Convert this PR to a Purchase Order?')) {
      const result = await convertPRToPO(id)
      if (result.success) {
        toast.success('Converted to PO!')
        navigate('/procurement/po')
      } else {
        toast.error('Conversion failed')
      }
    }
  }

  const handleCancel = async () => {
    if (window.confirm('Cancel this PR?')) {
      await updatePRStatus(id, 'cancelled')
      toast.success('PR cancelled')
      fetchPR(id)
    }
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>
  if (!selectedPR) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">PR not found</p></div>

  const pr = selectedPR

  return (
    <div className={`min-h-screen font-['Inter'] transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/procurement" className="text-slate-500 hover:text-emerald-600">Procurement</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/procurement/pr" className="text-slate-500 hover:text-emerald-600">Purchase Requests</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-800 dark:text-white font-medium">{pr.pr_number}</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                <FileText className="w-8 h-8 text-emerald-600" />{pr.pr_number}
              </h1>
              <p className="text-slate-500 mt-1">{pr.purpose}</p>
            </div>
            <div className="flex gap-2">
              {pr.status === 'pending_approval' && (
                <>
                  <button onClick={handleApprove} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-emerald-600 text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /><span>Approve</span>
                  </button>
                  <button onClick={handleReject} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-red-600 text-white flex items-center gap-2">
                    <XCircle className="w-4 h-4" /><span>Reject</span>
                  </button>
                </>
              )}
              {pr.status === 'approved' && (
                <button onClick={handleConvertToPO} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-blue-600 text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /><span>Convert to PO</span>
                </button>
              )}
              {(pr.status === 'draft' || pr.status === 'pending_approval') && (
                <button onClick={handleCancel} className="neu-raised neu-btn px-4 py-2 rounded-xl bg-red-600 text-white flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /><span>Cancel</span>
                </button>
              )}
            </div>
          </div>

          {/* Status & Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="neu-raised rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-500">Status</p>
              <span className={`px-2 py-1 rounded-full text-xs ${pr.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : pr.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                {pr.status?.replace('_', ' ')}
              </span>
            </div>
            <div className="neu-raised rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-500">Priority</p>
              <p className="font-semibold capitalize">{pr.priority}</p>
            </div>
            <div className="neu-raised rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-500">Department</p>
              <p className="font-semibold">{pr.department}</p>
            </div>
            <div className="neu-raised rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-500">Date Required</p>
              <p className="font-semibold">{new Date(pr.date_required).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Line Items */}
          <div className="neu-raised rounded-3xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Line Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left text-sm font-medium text-slate-500 py-2 px-3">#</th>
                    <th className="text-left text-sm font-medium text-slate-500 py-2 px-3">Description</th>
                    <th className="text-right text-sm font-medium text-slate-500 py-2 px-3">Qty</th>
                    <th className="text-right text-sm font-medium text-slate-500 py-2 px-3">Unit Price</th>
                    <th className="text-right text-sm font-medium text-slate-500 py-2 px-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pr.purchase_requisition_items?.map((item, i) => (
                    <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="py-2 px-3 text-sm text-slate-500">{i + 1}</td>
                      <td className="py-2 px-3 text-sm">{item.description}</td>
                      <td className="py-2 px-3 text-sm text-right">{item.quantity} {item.unit}</td>
                      <td className="py-2 px-3 text-sm text-right">{formatCurrency(item.estimated_unit_price)}</td>
                      <td className="py-2 px-3 text-sm text-right font-medium">{formatCurrency(item.quantity * item.estimated_unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-right font-semibold">Total:</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600">{formatCurrency(pr.estimated_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {pr.notes && (
            <div className="neu-raised rounded-3xl p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Notes</h3>
              <p className="text-sm text-slate-600">{pr.notes}</p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
