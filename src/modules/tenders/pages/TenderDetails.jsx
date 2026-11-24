import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useTenderStore from '../store/tenderStore'
import useThemeStore from '../../../store/themeStore'
import useSalesStore from '../../sales/store/salesStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  ArrowLeft, FileText, CheckCircle2, Upload, Download, 
  Trash2, DollarSign, Building2, Calendar, ShieldCheck, 
  ExternalLink, FileSignature, RefreshCw
} from 'lucide-react'

export default function TenderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { selectedTender, fetchTender, loading, updateStatus, savePricing } = useTenderStore()
  const { isDark } = useThemeStore()
  
  const [activeTab, setActiveTab] = useState('overview')
  const [uploading, setUploading] = useState(false)
  const [generatingQuote, setGeneratingQuote] = useState(false)
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    if (id) {
      fetchTender(id)
      loadDocuments(id)
    }
  }, [id])

  const loadDocuments = async (tenderId) => {
    const { data } = await supabase.storage.from('tender-docs').list(tenderId)
    setDocuments(data || [])
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const filePath = `${id}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('tender-docs').upload(filePath, file)
      if (error) throw error
      toast.success('Document uploaded!')
      loadDocuments(id)
    } catch (error) {
      toast.error('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDoc = async (fileName) => {
    if (!window.confirm('Delete this document?')) return
    await supabase.storage.from('tender-docs').remove([`${id}/${fileName}`])
    loadDocuments(id)
  }

  const handleGenerateQuotation = async () => {
    if (!selectedTender?.pricing_items || selectedTender.pricing_items.length === 0) {
      toast.error('Please add pricing items before generating a quotation.')
      return
    }

    if (window.confirm('Generate a Sales Quotation from this Tender? This will create a new quotation in your Sales module.')) {
      setGeneratingQuote(true)
      
      try {
        // 1. Map Tender Pricing Items to Quotation Items
        const quotationItems = selectedTender.pricing_items.map((item, index) => ({
          item_number: index + 1,
          description: item.description,
          quantity: Number(item.quantity) || 1,
          unit: item.unit_of_measure || 'Month',
          unit_price: Number(item.unit_price) || 0,
          discount_percent: 0,
          tax_percent: Number(item.vat_percent) || 15
        }))

        // 2. Calculate Totals
        const subtotal = quotationItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
        const tax_amount = quotationItems.reduce((sum, item) => sum + ((item.quantity * item.unit_price) * (item.tax_percent / 100)), 0)
        const grand_total = subtotal + tax_amount

        // 3. Create the Quotation payload
        const quotationData = {
          tender_id: selectedTender.id,
          client_id: selectedTender.client_id || null,
          client_name: selectedTender.client_name || 'Tender Client',
          client_email: selectedTender.contact_email || '',
          client_phone: selectedTender.contact_phone || '',
          client_address: '',
          quotation_date: new Date().toISOString().split('T')[0],
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          subtotal,
          tax_rate: 15,
          tax_amount,
          total_amount: grand_total,
          notes: `Generated from Tender: ${selectedTender.tender_number} - ${selectedTender.title}`,
          status: 'draft',
          payment_terms: '50% Deposit, Balance on Completion'
        }

        // 4. Insert Quotation
        const { data: newQuote, error: qError } = await supabase
          .from('quotations')
          .insert([quotationData])
          .select()
          .single()

        if (qError) throw qError

        // 5. Insert Quotation Items
        const itemsWithId = quotationItems.map(i => ({ ...i, quotation_id: newQuote.id }))
        const { error: iError } = await supabase.from('quotation_items').insert(itemsWithId)
        if (iError) throw iError

        // 6. Update Tender Status
        await updateStatus(id, 'quotation_generated')
        
        toast.success('Quotation generated successfully!')
        navigate(`/sales/quotations/${newQuote.id}/edit`) // Take them to the Sales module

      } catch (error) {
        console.error(error)
        toast.error('Failed to generate quotation: ' + error.message)
      } finally {
        setGeneratingQuote(false)
      }
    }
  }

  const formatCurrency = (val) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val || 0)

  if (loading || !selectedTender) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>
  }

  const totalValue = selectedTender.pricing_items?.reduce((sum, item) => sum + Number(item.total_amount), 0) || 0

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 font-['Inter'] ${isDark ? 'dark' : ''}`}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        
        {/* Header */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/tenders" className="text-slate-500 hover:text-emerald-600">Tenders</Link>
          <span className="text-slate-400">/</span>
          <span className="font-medium">{selectedTender.tender_number}</span>
        </div>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{selectedTender.title}</h1>
            <p className="text-slate-500 font-mono text-sm">{selectedTender.tender_number} • Ref: {selectedTender.reference_number || 'N/A'}</p>
          </div>
          <div className="flex gap-3">
            <select 
              value={selectedTender.status} 
              onChange={(e) => updateStatus(id, e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white font-semibold capitalize text-sm"
            >
              <option value="draft">Draft</option>
              <option value="costing_in_progress">Costing in Progress</option>
              <option value="submitted">Submitted</option>
              <option value="awarded">Awarded</option>
              <option value="quotation_generated">Quotation Generated</option>
            </select>
            
            <button 
              onClick={handleGenerateQuotation} 
              disabled={generatingQuote || selectedTender.quotation}
              className="neu-raised neu-btn px-6 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2 font-semibold disabled:opacity-50"
            >
              {generatingQuote ? <RefreshCw className="animate-spin w-5 h-5" /> : <FileSignature className="w-5 h-5" />}
              {selectedTender.quotation ? 'Quotation Already Generated' : 'Generate Quotation'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="neu-raised rounded-2xl p-4 bg-white dark:bg-slate-800">
            <p className="text-xs text-slate-500 mb-1">Estimated Value</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalValue)}</p>
          </div>
          <div className="neu-raised rounded-2xl p-4 bg-white dark:bg-slate-800">
            <p className="text-xs text-slate-500 mb-1">Closing Date</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{selectedTender.closing_date || 'TBD'}</p>
          </div>
          <div className="neu-raised rounded-2xl p-4 bg-white dark:bg-slate-800">
            <p className="text-xs text-slate-500 mb-1">Client</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{selectedTender.client_name || 'Not set'}</p>
          </div>
          <div className="neu-raised rounded-2xl p-4 bg-white dark:bg-slate-800">
            <p className="text-xs text-slate-500 mb-1">Linked Quotation</p>
            {selectedTender.quotation ? (
              <Link to={`/sales/quotations/${selectedTender.quotation.id}/edit`} className="text-xl font-bold text-blue-600 flex items-center gap-1 hover:underline">
                {selectedTender.quotation.quotation_number} <ExternalLink className="w-4 h-4" />
              </Link>
            ) : (
              <p className="text-sm font-medium text-slate-400 mt-1">Not generated yet</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
          {['overview', 'pricing', 'documents'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 capitalize ${
                activeTab === tab ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="neu-raised rounded-3xl p-6 bg-white dark:bg-slate-800">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-600" /> Client Details</h3>
              <p className="text-sm mb-2"><span className="text-slate-500">Name:</span> {selectedTender.client_name}</p>
              <p className="text-sm mb-2"><span className="text-slate-500">Contact:</span> {selectedTender.contact_person}</p>
              <p className="text-sm mb-2"><span className="text-slate-500">Email:</span> {selectedTender.contact_email}</p>
              <p className="text-sm mb-2"><span className="text-slate-500">Phone:</span> {selectedTender.contact_phone}</p>
            </div>
            <div className="neu-raised rounded-3xl p-6 bg-white dark:bg-slate-800">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-600" /> Dates</h3>
              <p className="text-sm mb-2"><span className="text-slate-500">Published:</span> {selectedTender.publication_date || '-'}</p>
              <p className="text-sm mb-2"><span className="text-slate-500">Briefing:</span> {selectedTender.site_briefing_date || '-'}</p>
              <p className="text-sm mb-2"><span className="text-slate-500">Closing:</span> {selectedTender.closing_date} at {selectedTender.closing_time}</p>
              <p className="text-sm mb-2"><span className="text-slate-500">Notes:</span> {selectedTender.notes || '-'}</p>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="neu-raised rounded-3xl p-6 bg-white dark:bg-slate-800">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-600" /> Pricing Summary</h3>
            {selectedTender.pricing_items?.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-slate-700 text-left">
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Qty</th>
                    <th className="pb-3">Unit Price</th>
                    <th className="pb-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTender.pricing_items.map(item => (
                    <tr key={item.id} className="border-b dark:border-slate-700">
                      <td className="py-3">{item.description}</td>
                      <td className="py-3">{item.quantity}</td>
                      <td className="py-3">{formatCurrency(item.unit_price)}</td>
                      <td className="py-3 text-right font-bold">{formatCurrency(item.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-slate-500 text-sm">No pricing items added yet.</p>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="neu-raised rounded-3xl p-6 bg-white dark:bg-slate-800">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600" /> Tender Documents</h3>
                <p className="text-sm text-slate-500">Upload the original RFQ, BOQ, and specifications here.</p>
              </div>
              <div>
                <input type="file" id="doc-upload" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                <label htmlFor="doc-upload" className="cursor-pointer px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-emerald-700">
                  <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Document'}
                </label>
              </div>
            </div>
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <span className="font-medium text-sm">{doc.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        const { data } = await supabase.storage.from('tender-docs').createSignedUrl(`${id}/${doc.name}`, 60)
                        if (data) window.open(data.signedUrl, '_blank')
                      }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Download className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteDoc(doc.name)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No documents uploaded yet.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
