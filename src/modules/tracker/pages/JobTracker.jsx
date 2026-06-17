import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import html2pdf from 'html2pdf.js'
import {
  Search, ArrowLeft, Sun, Moon, Sparkles,
  Briefcase, Building2, Users, Clock, CheckCircle2,
  Camera, Package, AlertCircle, DollarSign,
  MessageCircle, Shield, FileText, Loader2, X,
  History, Plus, Edit, MoveRight, RefreshCw,
  CreditCard, Phone, MapPin, Calendar, Download,
  Printer, User, Activity, Play, Pause, StopCircle,
  Mail, MessageSquare, Image, ShoppingCart
} from 'lucide-react'

export default function JobTracker() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [searchValue, setSearchValue] = useState(searchParams.get('job') || '')
  const [searching, setSearching] = useState(false)
  const [jobData, setJobData] = useState(null)
  const [jobHistory, setJobHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [activeTab, setActiveTab] = useState('timeline')
  const [downloading, setDownloading] = useState(false)

  // Auto-search if job number is in URL
  useEffect(() => {
    const jobFromUrl = searchParams.get('job')
    if (jobFromUrl) {
      setSearchValue(jobFromUrl)
      searchJob(jobFromUrl)
    }
  }, [])

  const getUserEmail = async (userId) => {
    if (!userId) return 'N/A'
    try {
      const { data } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single()
      return data?.full_name || data?.email || 'Unknown'
    } catch { return 'Unknown' }
  }

  const formatCurrency = (a) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(a || 0)
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : 'N/A'

  // ═══════════════════════════════════════════
  // SEARCH JOB & FETCH ALL DATA
  // ═══════════════════════════════════════════
  const searchJob = async (jobNumber) => {
    if (!jobNumber?.trim()) {
      toast.error('Please enter a job number')
      return
    }

    setSearching(true)
    setJobData(null)
    setJobHistory([])

    try {
      // 1. GET JOB DETAILS
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          clients(*),
          job_categories(name, color),
          teams(team_name)
        `)
        .ilike('job_number', `%${jobNumber}%`)
        .single()

      if (jobError || !job) {
        toast.error('Job not found')
        setSearching(false)
        return
      }

      // 2. GET JOB ASSIGNMENTS
      const { data: assignments } = await supabase
        .from('job_assignments')
        .select('*, employees(first_name, last_name, employee_code, phone)')
        .eq('job_id', job.id)
        .order('assigned_date', { ascending: true })

      // 3. GET CHECKLIST ITEMS
      const { data: checklists } = await supabase
        .from('job_checklist_items')
        .select('*')
        .eq('job_id', job.id)
        .order('item_number', { ascending: true })

      // 4. GET PHOTOS
      const { data: photos } = await supabase
        .from('job_photos')
        .select('*, employees(first_name, last_name)')
        .eq('job_id', job.id)
        .order('taken_at', { ascending: true })

      // 5. GET CLIENT SIGNATURES
      const { data: signatures } = await supabase
        .from('client_signatures')
        .select('*')
        .eq('job_id', job.id)

      // 6. GET SUPPLIES USED
      const { data: suppliesUsed } = await supabase
        .from('job_supplies_used')
        .select('*, equipment_supplies(name, category)')
        .eq('job_id', job.id)

      // 7. GET INCIDENT REPORTS
      const { data: incidents } = await supabase
        .from('incident_reports')
        .select('*, employees(first_name, last_name)')
        .eq('job_id', job.id)
        .order('incident_date', { ascending: true })

      // 8. GET QUALITY INSPECTIONS
      const { data: inspections } = await supabase
        .from('quality_inspections')
        .select('*')
        .eq('job_id', job.id)
        .order('inspection_date', { ascending: true })

      // 9. GET QUOTATIONS & INVOICES
      let quotation = null, invoice = null, payments = []
      if (job.quotation_id) {
        const { data: q } = await supabase.from('quotations').select('*').eq('id', job.quotation_id).single()
        quotation = q
        const { data: inv } = await supabase.from('invoices').select('*').eq('quotation_id', job.quotation_id).single()
        invoice = inv
        if (inv) {
          const { data: pays } = await supabase.from('payments').select('*').eq('invoice_id', inv.id).order('payment_date', { ascending: true })
          payments = pays || []
        }
      }

      // 10. GET ATTENDANCE RECORDS for assigned employees
      const employeeIds = assignments?.map(a => a.employee_id).filter(Boolean) || []
      let attendanceRecords = []
      if (employeeIds.length > 0) {
        const { data: att } = await supabase
          .from('attendance_records')
          .select('*, employees(first_name, last_name)')
          .in('employee_id', employeeIds)
          .gte('attendance_date', job.scheduled_date || job.created_at?.split('T')[0])
          .order('attendance_date', { ascending: true })
        attendanceRecords = att || []
      }

      // 11. GET COMMUNICATIONS (client interactions)
      const { data: communications } = await supabase
        .from('client_interactions')
        .select('*, client_contacts(first_name, last_name)')
        .eq('client_id', job.client_id)
        .order('scheduled_date', { ascending: false })
        .limit(20)

      // 12. BUILD COMPLETE JOB DATA
      const enrichedJob = {
        ...job,
        assignments: assignments || [],
        checklists: checklists || [],
        photos: photos || [],
        signatures: signatures || [],
        suppliesUsed: suppliesUsed || [],
        incidents: incidents || [],
        inspections: inspections || [],
        quotation,
        invoice,
        payments: payments || [],
        attendanceRecords,
        communications: communications || []
      }

      setJobData(enrichedJob)
      
      // BUILD HISTORY TIMELINE
      await buildJobHistory(enrichedJob)
      
      toast.success(`Job ${job.job_number} loaded with full history`)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to load job data')
    } finally {
      setSearching(false)
    }
  }

  // ═══════════════════════════════════════════
  // BUILD COMPLETE JOB HISTORY TIMELINE
  // ═══════════════════════════════════════════
  const buildJobHistory = async (job) => {
    setLoadingHistory(true)
    let history = []

    // 1. JOB CREATED
    history.push({
      id: 'created',
      action: 'job_created',
      icon: Plus,
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
      user_email: await getUserEmail(job.created_by),
      created_at: job.created_at,
      title: 'Job Created',
      details: `Job "${job.title}" created with status "${job.status}"`,
      extra: {
        priority: job.priority,
        department: job.department,
        client: job.clients?.company_name,
        site: job.site_address,
        scheduled: `${formatDate(job.scheduled_date)} ${job.scheduled_start_time?.slice(0,5) || ''} - ${job.scheduled_end_time?.slice(0,5) || ''}`
      }
    })

    // 2. STATUS CHANGES (tracked via updated_at vs created_at)
    if (job.status !== 'pending' && job.updated_at !== job.created_at) {
      history.push({
        id: 'status-change',
        action: 'status_change',
        icon: RefreshCw,
        color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
        user_email: 'System',
        created_at: job.updated_at,
        title: `Status: ${job.status?.replace('_', ' ')}`,
        details: `Job status updated to "${job.status?.replace('_', ' ')}"`
      })
    }

    // 3. JOB STARTED
    if (job.actual_start_time) {
      history.push({
        id: 'started',
        action: 'job_started',
        icon: Play,
        color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
        user_email: 'Field Team',
        created_at: job.actual_start_time,
        title: 'Work Started',
        details: `Job work started at ${formatDateTime(job.actual_start_time)}`
      })
    }

    // 4. JOB COMPLETED
    if (job.actual_end_time) {
      history.push({
        id: 'completed',
        action: 'job_completed',
        icon: CheckCircle2,
        color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
        user_email: 'Field Team',
        created_at: job.actual_end_time,
        title: 'Work Completed',
        details: `Job completed at ${formatDateTime(job.actual_end_time)}`
      })
    }

    // 5. ASSIGNMENTS
    if (job.assignments?.length > 0) {
      for (const a of job.assignments) {
        history.push({
          id: `assign-${a.id}`,
          action: 'assignment',
          icon: Users,
          color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30',
          user_email: a.employees ? `${a.employees.first_name} ${a.employees.last_name}` : 'Unknown',
          created_at: a.assigned_date || a.created_at,
          title: `Assigned to ${a.employees?.first_name || 'Unknown'} ${a.employees?.last_name || ''}`,
          details: `Employee assigned | Status: ${a.status}${a.notes ? ` | Notes: ${a.notes}` : ''}`
        })
      }
    }

    // 6. CHECKLIST COMPLETIONS
    if (job.checklists?.length > 0) {
      for (const c of job.checklists.filter(cl => cl.is_completed)) {
        history.push({
          id: `check-${c.id}`,
          action: 'task_completed',
          icon: CheckCircle2,
          color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
          user_email: await getUserEmail(c.completed_by),
          created_at: c.completed_at,
          title: 'Task Completed',
          details: `"${c.description}" marked as completed`
        })
      }
    }

    // 7. PHOTOS UPLOADED
    if (job.photos?.length > 0) {
      for (const p of job.photos) {
        history.push({
          id: `photo-${p.id}`,
          action: 'photo_uploaded',
          icon: Camera,
          color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
          user_email: p.employees ? `${p.employees.first_name} ${p.employees.last_name}` : 'Unknown',
          created_at: p.taken_at,
          title: `${p.photo_type?.charAt(0).toUpperCase() + p.photo_type?.slice(1)} Photo`,
          details: p.caption || 'No caption',
          photo_url: p.photo_url
        })
      }
    }

    // 8. CLIENT SIGNATURES
    if (job.signatures?.length > 0) {
      for (const s of job.signatures) {
        history.push({
          id: `sig-${s.id}`,
          action: 'client_signoff',
          icon: Shield,
          color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30',
          user_email: s.signed_by || 'Client',
          created_at: s.signed_at,
          title: 'Client Sign-off',
          details: `Signed by: ${s.signed_by || 'Client'}${s.satisfaction_rating ? ` | Rating: ${s.satisfaction_rating}/5` : ''}${s.comments ? ` | Comments: ${s.comments}` : ''}`
        })
      }
    }

    // 9. SUPPLIES/MATERIALS USED
    if (job.suppliesUsed?.length > 0) {
      for (const s of job.suppliesUsed) {
        history.push({
          id: `supply-${s.id}`,
          action: 'material_used',
          icon: Package,
          color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
          user_email: await getUserEmail(s.used_by),
          created_at: s.used_at,
          title: 'Material Used',
          details: `${s.equipment_supplies?.name || 'Supply'}: ${s.quantity_used} units${s.notes ? ` | ${s.notes}` : ''}`
        })
      }
    }

    // 10. INCIDENTS
    if (job.incidents?.length > 0) {
      for (const inc of job.incidents) {
        history.push({
          id: `incident-${inc.id}`,
          action: 'incident_reported',
          icon: AlertCircle,
          color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
          user_email: inc.employees ? `${inc.employees.first_name} ${inc.employees.last_name}` : 'Unknown',
          created_at: inc.incident_date,
          title: `${inc.incident_type?.replace('_', ' ')} Incident`,
          details: `Severity: ${inc.severity} | ${inc.description}${inc.status !== 'reported' ? ` | Status: ${inc.status}` : ''}`
        })
      }
    }

    // 11. QUALITY INSPECTIONS
    if (job.inspections?.length > 0) {
      for (const insp of job.inspections) {
        history.push({
          id: `inspection-${insp.id}`,
          action: 'quality_inspection',
          icon: Shield,
          color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
          user_email: await getUserEmail(insp.inspector_id),
          created_at: insp.inspection_date,
          title: 'Quality Inspection',
          details: `Overall: ${insp.overall_rating}/5 | Cleanliness: ${insp.cleanliness_score}/5 | ${insp.issues_found ? `Issues: ${insp.issues_found}` : 'No issues'}`
        })
      }
    }

    // 12. FINANCIAL - QUOTATION
    if (job.quotation) {
      history.push({
        id: `quote-${job.quotation.id}`,
        action: 'quotation',
        icon: FileText,
        color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
        user_email: await getUserEmail(job.quotation.created_by || job.quotation.prepared_by),
        created_at: job.quotation.created_at,
        title: 'Quotation Generated',
        details: `Quote #${job.quotation.quotation_number} | Amount: ${formatCurrency(job.quotation.total_amount)} | Status: ${job.quotation.status}`
      })
    }

    // 13. FINANCIAL - INVOICE
    if (job.invoice) {
      history.push({
        id: `invoice-${job.invoice.id}`,
        action: 'invoice',
        icon: CreditCard,
        color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
        user_email: 'Finance System',
        created_at: job.invoice.created_at,
        title: 'Invoice Generated',
        details: `Invoice #${job.invoice.invoice_number} | Amount: ${formatCurrency(job.invoice.total_amount)} | Status: ${job.invoice.status}`
      })
    }

    // 14. PAYMENTS
    if (job.payments?.length > 0) {
      for (const pay of job.payments) {
        history.push({
          id: `payment-${pay.id}`,
          action: 'payment',
          icon: DollarSign,
          color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
          user_email: await getUserEmail(pay.recorded_by),
          created_at: pay.payment_date,
          title: 'Payment Received',
          details: `Amount: ${formatCurrency(pay.amount)} | Method: ${pay.payment_method}${pay.reference_number ? ` | Ref: ${pay.reference_number}` : ''}`
        })
      }
    }

    // 15. COMMUNICATIONS
    if (job.communications?.length > 0) {
      for (const comm of job.communications) {
        history.push({
          id: `comm-${comm.id}`,
          action: 'communication',
          icon: comm.interaction_type === 'email' ? Mail : comm.interaction_type === 'call' ? Phone : MessageSquare,
          color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30',
          user_email: await getUserEmail(comm.created_by || comm.attended_by),
          created_at: comm.scheduled_date || comm.created_at,
          title: `${comm.interaction_type?.replace('_', ' ')}`,
          details: `${comm.subject}${comm.outcome ? ` | Outcome: ${comm.outcome}` : ''}`
        })
      }
    }

    // Sort by date
    history.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setJobHistory(history)
    setLoadingHistory(false)
  }

  const handleSearch = (e) => {
    e?.preventDefault()
    searchJob(searchValue)
  }

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const element = document.getElementById('job-tracker-print')
      const opt = {
        margin: 10,
        filename: `Job_History_${jobData?.job_number}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }
      await html2pdf().set(opt).from(element).save()
      toast.success('Report downloaded!')
    } catch (error) {
      toast.error('Failed to download')
    } finally {
      setDownloading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-slate-100 text-slate-700', scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700', on_hold: 'bg-purple-100 text-purple-700',
      overdue: 'bg-red-100 text-red-700'
    }
    return colors[status] || 'bg-slate-100 text-slate-600'
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
        <Link to="/tracker" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Tracker</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-600" />Job Tracker
          </h1>
          <p className="text-slate-500 ml-11">Complete job audit trail & lifecycle management</p>
        </motion.div>

        {/* SEARCH BAR */}
        <div className="neu-raised rounded-3xl p-6 mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Search className="w-6 h-6" /> Search Job Number
          </h2>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input type="text" value={searchValue} onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Enter job number (e.g., JOB-2605-0004)..."
              className="flex-1 px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 text-sm border border-white/30 focus:outline-none focus:bg-white/30" />
            <button type="submit" disabled={searching}
              className="px-6 py-3 rounded-xl bg-white text-blue-700 font-bold text-sm hover:bg-white/90 disabled:opacity-50 flex items-center gap-2">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Track Job
            </button>
          </form>
        </div>

        {/* LOADING */}
        {searching && (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-slate-500">Searching job records...</p>
          </div>
        )}

        {/* JOB DATA DISPLAY */}
        {jobData && !searching && (
          <div id="job-tracker-print">
            {/* JOB HEADER */}
            <div className="neu-raised rounded-3xl p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-2xl font-bold text-blue-600">{jobData.job_number}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(jobData.status)}`}>
                      {jobData.status?.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      jobData.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      jobData.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}>{jobData.priority}</span>
                  </div>
                  <h2 className="text-xl font-bold mt-2">{jobData.title}</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleDownloadPDF} disabled={downloading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm flex items-center gap-2">
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download PDF
                  </button>
                  <button onClick={() => window.print()} className="px-4 py-2 bg-slate-600 text-white rounded-xl text-sm flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                </div>
              </div>

              {/* QUICK STATS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">Client</p>
                  <p className="font-semibold text-sm">{jobData.clients?.company_name || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="font-semibold text-sm truncate">{jobData.site_address || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">Created</p>
                  <p className="font-semibold text-sm">{formatDateTime(jobData.created_at)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">Category</p>
                  <p className="font-semibold text-sm" style={{color: jobData.job_categories?.color}}>{jobData.job_categories?.name || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* TABS */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[
                { id: 'timeline', label: 'Timeline', icon: History },
                { id: 'details', label: 'Details', icon: FileText },
                { id: 'people', label: 'People', icon: Users },
                { id: 'photos', label: 'Photos', icon: Camera },
                { id: 'materials', label: 'Materials', icon: Package },
                { id: 'financial', label: 'Financial', icon: DollarSign },
                { id: 'incidents', label: 'Incidents', icon: AlertCircle },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
                    activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                  <tab.icon className="w-4 h-4" />{tab.label}
                </button>
              ))}
            </div>

            {/* TIMELINE TAB */}
            {activeTab === 'timeline' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-600" />Complete Job Timeline ({jobHistory.length} events)
                </h3>
                {loadingHistory ? (
                  <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" /></div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-blue-200 dark:border-blue-800 space-y-4 pb-4">
                    {jobHistory.map((event, i) => {
                      const EventIcon = event.icon || RefreshCw
                      return (
                        <div key={event.id || i} className="relative">
                          <div className={`absolute -left-[25px] w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${event.color.split(' ')[1] || 'bg-slate-400'}`}></div>
                          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <EventIcon className={`w-5 h-5 ${event.color.split(' ')[0] || 'text-slate-500'}`} />
                              <span className="font-bold text-sm">{event.title}</span>
                              <span className="text-xs text-slate-400 ml-auto">{formatDateTime(event.created_at)}</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{event.details}</p>
                            <p className="text-xs text-slate-500 mt-1">👤 {event.user_email}</p>
                            {event.photo_url && (
                              <img src={event.photo_url} alt="Job photo" className="mt-2 rounded-lg max-h-40 object-cover" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <div className="text-center text-xs text-slate-400 pt-2">── End of timeline ──</div>
                  </div>
                )}
              </div>
            )}

            {/* DETAILS TAB */}
            {activeTab === 'details' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Job Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                    <p className="font-semibold mb-2">General Information</p>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-slate-500">Title:</span><span>{jobData.title}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Description:</span><span>{jobData.description || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Category:</span><span>{jobData.job_categories?.name || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Priority:</span><span className="capitalize">{jobData.priority}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Cleaners Required:</span><span>{jobData.cleaners_required}</span></div>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                    <p className="font-semibold mb-2">Schedule</p>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-slate-500">Scheduled Date:</span><span>{formatDate(jobData.scheduled_date)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Time:</span><span>{jobData.scheduled_start_time?.slice(0,5)} - {jobData.scheduled_end_time?.slice(0,5)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Started:</span><span>{jobData.actual_start_time ? formatDateTime(jobData.actual_start_time) : 'Not started'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Completed:</span><span>{jobData.actual_end_time ? formatDateTime(jobData.actual_end_time) : 'Not completed'}</span></div>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                    <p className="font-semibold mb-2">Client & Location</p>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-slate-500">Client:</span><span>{jobData.clients?.company_name || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Contact:</span><span>{jobData.site_contact_name || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Phone:</span><span>{jobData.site_contact_phone || jobData.clients?.phone || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Address:</span><span>{jobData.site_address || 'N/A'}</span></div>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                    <p className="font-semibold mb-2">Access & Notes</p>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-slate-500">Access:</span><span>{jobData.access_instructions || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Special Instructions:</span><span>{jobData.special_instructions || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Notes:</span><span>{jobData.notes || 'N/A'}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PEOPLE TAB */}
            {activeTab === 'people' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">People & Assignments</h3>
                {jobData.assignments?.length > 0 ? (
                  <div className="space-y-3">
                    {jobData.assignments.map(a => (
                      <div key={a.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <User className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{a.employees?.first_name} {a.employees?.last_name}</p>
                            <p className="text-xs text-slate-500">{a.employees?.employee_code}</p>
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <span className={`px-2 py-1 rounded-full ${a.status === 'assigned' ? 'bg-blue-100 text-blue-700' : a.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{a.status}</span>
                          <p className="text-slate-400 mt-1">{formatDate(a.assigned_date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-400 text-center py-8">No assignments</p>}
              </div>
            )}

            {/* PHOTOS TAB */}
            {activeTab === 'photos' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Job Photos</h3>
                {jobData.photos?.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {jobData.photos.map(p => (
                      <div key={p.id} className="relative rounded-xl overflow-hidden cursor-pointer" onClick={() => window.open(p.photo_url, '_blank')}>
                        <img src={p.photo_url} alt={p.caption || 'Photo'} className="w-full h-40 object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-2">
                          <span className="text-white text-xs font-medium capitalize">{p.photo_type}</span>
                          <p className="text-white/70 text-[10px]">{formatDateTime(p.taken_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-400 text-center py-8">No photos</p>}
              </div>
            )}

            {/* MATERIALS TAB */}
            {activeTab === 'materials' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Materials & Supplies Used</h3>
                {jobData.suppliesUsed?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-slate-50"><th className="text-left py-2 px-3">Item</th><th className="text-left py-2 px-3">Category</th><th className="text-right py-2 px-3">Quantity</th><th className="text-left py-2 px-3">Date</th></tr></thead>
                      <tbody>
                        {jobData.suppliesUsed.map(s => (
                          <tr key={s.id} className="border-b">
                            <td className="py-2 px-3 font-medium">{s.equipment_supplies?.name || 'Unknown'}</td>
                            <td className="py-2 px-3 text-xs">{s.equipment_supplies?.category || 'N/A'}</td>
                            <td className="py-2 px-3 text-right">{s.quantity_used}</td>
                            <td className="py-2 px-3 text-xs">{formatDateTime(s.used_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-slate-400 text-center py-8">No materials used</p>}
              </div>
            )}

            {/* FINANCIAL TAB */}
            {activeTab === 'financial' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobData.quotation && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                      <p className="font-semibold text-blue-700 mb-2">Quotation</p>
                      <p className="text-sm">#{jobData.quotation.quotation_number}</p>
                      <p className="text-lg font-bold">{formatCurrency(jobData.quotation.total_amount)}</p>
                      <p className="text-xs text-slate-500">Status: {jobData.quotation.status}</p>
                    </div>
                  )}
                  {jobData.invoice && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                      <p className="font-semibold text-purple-700 mb-2">Invoice</p>
                      <p className="text-sm">#{jobData.invoice.invoice_number}</p>
                      <p className="text-lg font-bold">{formatCurrency(jobData.invoice.total_amount)}</p>
                      <p className="text-xs text-slate-500">Status: {jobData.invoice.status}</p>
                    </div>
                  )}
                  {jobData.payments?.length > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 md:col-span-2">
                      <p className="font-semibold text-emerald-700 mb-2">Payments ({jobData.payments.length})</p>
                      {jobData.payments.map(p => (
                        <div key={p.id} className="flex justify-between text-sm py-1 border-b border-emerald-100 last:border-0">
                          <span>{formatDate(p.payment_date)} - {p.payment_method}</span>
                          <span className="font-bold">{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!jobData.quotation && !jobData.invoice && (
                    <p className="text-slate-400 text-center py-8 md:col-span-2">No financial records</p>
                  )}
                </div>
              </div>
            )}

            {/* INCIDENTS TAB */}
            {activeTab === 'incidents' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-bold mb-4">Incidents & Issues</h3>
                {jobData.incidents?.length > 0 ? (
                  <div className="space-y-3">
                    {jobData.incidents.map(inc => (
                      <div key={inc.id} className={`p-4 rounded-xl border ${
                        inc.severity === 'critical' ? 'bg-red-50 border-red-200' :
                        inc.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                        'bg-amber-50 border-amber-200'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-semibold capitalize">{inc.incident_type?.replace('_', ' ')}</span>
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${inc.severity === 'critical' ? 'bg-red-100 text-red-700' : inc.severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>{inc.severity}</span>
                          </div>
                          <span className="text-xs text-slate-500">{formatDateTime(inc.incident_date)}</span>
                        </div>
                        <p className="text-sm mt-2">{inc.description}</p>
                        {inc.employees && <p className="text-xs text-slate-500 mt-1">Reported by: {inc.employees.first_name} {inc.employees.last_name}</p>}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-400 text-center py-8">No incidents reported</p>}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
