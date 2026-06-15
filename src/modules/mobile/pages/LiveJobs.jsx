import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Briefcase, Search, ArrowLeft, Sun, Moon, Sparkles,
  Clock, MapPin, User, CheckCircle2, Play, AlertCircle,
  Calendar, Eye, Building2, Phone, RefreshCw, Camera,
  Package, FileText, DollarSign, Clock3,
  Users, ClipboardList, History, Receipt,
  X, Download, Wrench
} from 'lucide-react'

export default function LiveJobs() {
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [jobNumber, setJobNumber] = useState('')
  const [searching, setSearching] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [availableJobs, setAvailableJobs] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => { loadAvailableJobs() }, [])

  const loadAvailableJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('job_number, title, status')
      .order('created_at', { ascending: false })
      .limit(50)
    setAvailableJobs(data || [])
  }

  const searchJob = async (number) => {
    const searchNumber = (number || jobNumber).trim()
    if (!searchNumber) { toast.error('Please enter a job number'); return }
    setSearching(true); setLoading(true); setShowDropdown(false)
    try {
      const { data: job, error } = await supabase.from('jobs').select('*').eq('job_number', searchNumber.toUpperCase()).single()
      if (error || !job) {
        const { data: jobs } = await supabase.from('jobs').select('*').ilike('job_number', `%${searchNumber}%`).limit(1)
        if (jobs && jobs.length > 0) { await loadJobDetails(jobs[0]); return }
        toast.error(`Job "${searchNumber}" not found`); setSelectedJob(null); setLoading(false); setSearching(false); return
      }
      await loadJobDetails(job)
    } catch (error) { toast.error('Error: ' + error.message); setLoading(false); setSearching(false) }
  }

  const loadJobDetails = async (job) => {
    try {
      const [clientRes, categoryRes, assignmentsRes, photosRes, tasksRes, inspectionsRes, quotationsRes, invoicesRes, suppliesRes, incidentsRes] = await Promise.all([
        job.client_id ? supabase.from('clients').select('*').eq('id', job.client_id).single() : Promise.resolve({ data: null }),
        job.job_category_id ? supabase.from('job_categories').select('*').eq('id', job.job_category_id).single() : Promise.resolve({ data: null }),
        supabase.from('job_assignments').select('*').eq('job_id', job.id),
        supabase.from('job_photos').select('*').eq('job_id', job.id).order('taken_at', { ascending: false }),
        supabase.from('job_task_items').select('*').eq('job_id', job.id).order('task_number'),
        supabase.from('quality_inspections').select('*').eq('job_id', job.id),
        job.quotation_id ? supabase.from('quotations').select('*').eq('id', job.quotation_id).single() : Promise.resolve({ data: null }),
        supabase.from('invoices').select('*').eq('quotation_id', job.quotation_id).limit(5),
        supabase.from('supplies_requests').select('*, supplies_request_items(*)').eq('job_id', job.id),
        supabase.from('incident_reports').select('*').eq('job_id', job.id),
      ])

      // === COLLECT ALL USER IDs FOR NAME RESOLUTION ===
      const userIds = new Set()
      if (job.created_by) userIds.add(job.created_by)
      if (job.assigned_supervisor) userIds.add(job.assigned_supervisor)
      if (job.approved_by) userIds.add(job.approved_by)
      inspectionsRes.data?.forEach(i => { if (i.inspector_id) userIds.add(i.inspector_id) })
      invoicesRes.data?.forEach(i => { if (i.created_by) userIds.add(i.created_by); if (i.approved_by) userIds.add(i.approved_by) })
      const uniqueUserIds = [...userIds].filter(Boolean)

      let usersMap = {}
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', uniqueUserIds)
        profiles?.forEach(p => { usersMap[p.id] = p })
      }

      // Get employee details for assignments
      let assignmentsWithEmployees = assignmentsRes.data || []
      if (assignmentsWithEmployees.length > 0) {
        const eIds = assignmentsWithEmployees.map(a => a.employee_id).filter(Boolean)
        if (eIds.length > 0) {
          const { data: emps } = await supabase.from('employees').select('*').in('id', eIds)
          assignmentsWithEmployees = assignmentsWithEmployees.map(a => ({ ...a, employees: emps?.find(e => e.id === a.employee_id) || null }))
        }
      }

      // Get attendance for assigned employees
      const eIds = assignmentsWithEmployees.map(a => a.employee_id).filter(Boolean)
      let attendanceData = []
      if (eIds.length > 0) {
        const { data: att } = await supabase.from('attendance_records').select('*').in('employee_id', eIds).order('attendance_date', { ascending: false }).limit(50)
        attendanceData = att || []
      }

      // Get payments for invoices
      let invoicesWithPayments = invoicesRes.data || []
      if (invoicesWithPayments.length > 0) {
        const invIds = invoicesWithPayments.map(inv => inv.id)
        const { data: payments } = await supabase.from('payments').select('*').in('invoice_id', invIds)
        invoicesWithPayments = invoicesWithPayments.map(inv => ({ ...inv, payments: payments?.filter(p => p.invoice_id === inv.id) || [] }))
      }

      setSelectedJob({
        ...job, clients: clientRes.data, job_categories: categoryRes.data,
        job_assignments: assignmentsWithEmployees, job_photos: photosRes.data || [],
        job_task_items: tasksRes.data || [], quality_inspections: inspectionsRes.data || [],
        quotations: quotationsRes.data ? [quotationsRes.data] : [], invoices: invoicesWithPayments,
        supplies: suppliesRes.data || [], incidents: incidentsRes.data || [], attendance: attendanceData,
        usersMap: usersMap
      })
      setActiveTab('overview'); toast.success(`Job ${job.job_number} loaded!`)
    } catch (error) {
      console.error(error)
      setSelectedJob({ ...job, clients: null, job_categories: null, job_assignments: [], job_photos: [], job_task_items: [], quality_inspections: [], quotations: [], invoices: [], supplies: [], incidents: [], attendance: [], usersMap: {} })
      setActiveTab('overview')
    } finally { setLoading(false); setSearching(false) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') { setShowDropdown(false); searchJob() } }
  const formatCurrency = (a) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(a || 0)
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'
  const formatTime = (t) => t ? t.slice(0, 5) : ''

  const getStatusBadge = (s) => {
    const b = { pending: 'bg-slate-100 text-slate-700', scheduled: 'bg-blue-100 text-blue-700', in_progress: 'bg-amber-100 text-amber-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700', on_hold: 'bg-purple-100 text-purple-700' }
    return b[s] || 'bg-slate-100 text-slate-700'
  }

  // === AUDIT TRAIL WITH REAL USER NAMES ===
  const generateAuditTrail = (job) => {
    const trail = []
    const users = job.usersMap || {}
    
    // Helper to get user's real name from profiles
    const getUserName = (userId, fallback) => {
      if (!userId) return fallback
      const user = users[userId]
      if (user?.full_name && user.full_name.trim()) return user.full_name.trim()
      if (user?.email) return user.email.split('@')[0]
      return fallback
    }
    
    // 1. Who created the job
    const creatorName = getUserName(job.created_by, 'System')
    trail.push({ 
      action: 'Job Created', user: creatorName, date: job.created_at, icon: Briefcase,
      details: `Job #${job.job_number} was created`
    })
    
    // 2. Who scheduled
    if (job.scheduled_date) {
      trail.push({ 
        action: 'Job Scheduled', user: creatorName, date: job.scheduled_date, icon: Calendar,
        details: `Scheduled for ${formatDate(job.scheduled_date)} at ${formatTime(job.scheduled_start_time)} - ${formatTime(job.scheduled_end_time)}`
      })
    }
    
    // 3. Who assigned cleaners (use actual supervisor name from profiles)
    job.job_assignments?.forEach(a => {
      const assignerName = getUserName(job.assigned_supervisor, 'Supervisor')
      const assignedCleanerName = a.employees?.first_name 
        ? `${a.employees.first_name} ${a.employees.last_name || ''}`.trim() 
        : 'Cleaner'
      trail.push({ 
        action: `Assigned Cleaner: ${assignedCleanerName}`, user: assignerName, date: a.created_at || job.scheduled_date, icon: User,
        details: `${assignedCleanerName} was assigned to this job by ${assignerName}`
      })
    })
    
    // 4. Who started the job
    if (job.actual_start_time) {
      const assignedCleaner = job.job_assignments?.[0]
      const starterName = assignedCleaner?.employees?.first_name 
        ? `${assignedCleaner.employees.first_name} ${assignedCleaner.employees.last_name || ''}`.trim()
        : getUserName(job.created_by, 'Cleaner')
      trail.push({ 
        action: 'Job Started (In Progress)', user: starterName, date: job.actual_start_time, icon: Play,
        details: 'Work began on site - status changed to In Progress'
      })
    }
    
    // 5. Photos uploaded - use cleaner name from assignments
    const cleanerOnJob = job.job_assignments?.[0]?.employees
    const cleanerName = cleanerOnJob?.first_name 
      ? `${cleanerOnJob.first_name} ${cleanerOnJob.last_name || ''}`.trim()
      : 'Cleaner'
    
    job.job_photos?.forEach(p => {
      trail.push({ 
        action: `Photo Uploaded (${p.photo_type})`, user: cleanerName, date: p.taken_at, icon: Camera,
        details: p.caption || `${p.photo_type} photo uploaded`
      })
    })
    
    // 6. Quality inspections - use actual inspector name from profiles
    job.quality_inspections?.forEach(q => {
      const inspectorName = getUserName(q.inspector_id, 'Quality Inspector')
      trail.push({ 
        action: 'Quality Inspection Completed', user: inspectorName, date: q.inspection_date || q.created_at, icon: CheckCircle2,
        details: `Overall: ${q.overall_rating || 'N/A'}/5 | Cleanliness: ${q.cleanliness_score || 'N/A'}/5 | Safety: ${q.safety_compliance_score || 'N/A'}/5`
      })
    })
    
    // 7. Who completed the job
    if (job.status === 'completed' || job.actual_end_time) {
      const completedAssignment = job.job_assignments?.find(a => a.status === 'completed')
      const completerName = completedAssignment?.employees?.first_name
        ? `${completedAssignment.employees.first_name} ${completedAssignment.employees.last_name || ''}`.trim()
        : cleanerName
      trail.push({ 
        action: 'Job Completed', user: completerName, date: job.actual_end_time || job.updated_at, icon: CheckCircle2,
        details: job.completion_notes || 'Job was marked as completed'
      })
    }
    
    // 8. Who generated invoice - use actual invoice creator from profiles
    job.invoices?.forEach(inv => {
      const invoicerName = getUserName(inv.created_by, 'Finance Officer')
      trail.push({ 
        action: `Invoice Generated: ${inv.invoice_number}`, user: invoicerName, date: inv.created_at, icon: Receipt,
        details: `Amount: ${formatCurrency(inv.total_amount)} | Status: ${inv.status}`
      })
    })

    // 9. Who approved (if applicable)
    if (job.approved_by) {
      const approverName = getUserName(job.approved_by, 'Manager')
      trail.push({
        action: 'Job Approved', user: approverName, date: job.updated_at, icon: CheckCircle2,
        details: 'Job was reviewed and approved'
      })
    }

    trail.sort((a, b) => new Date(a.date) - new Date(b.date))
    return trail
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'details', label: 'Job Details', icon: ClipboardList },
    { id: 'staff', label: 'Assigned Staff', icon: Users },
    { id: 'timeline', label: 'Timeline', icon: History },
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'time', label: 'Time Tracking', icon: Clock3 },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'customer', label: 'Customer', icon: Building2 },
    { id: 'audit', label: 'Audit Log', icon: FileText },
  ]

  const filteredSuggestions = availableJobs.filter(j => (j.job_number || '').toLowerCase().includes(jobNumber.toLowerCase()) || (j.title || '').toLowerCase().includes(jobNumber.toLowerCase())).slice(0, 10)

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
        <Link to="/mobile/field" className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-emerald-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">Back to Field Operations</span>
        </Link>

        {/* Header Search */}
        <div className="neu-raised rounded-3xl p-6 mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-4">
            <Briefcase className="w-8 h-8 text-blue-600" />Job Tracker
          </h1>
          <p className="text-slate-500 mb-6">Enter a Job Number to view the complete job history, who did what and when</p>
          <div className="flex gap-3 relative">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              <input type="text" value={jobNumber} onChange={e => { setJobNumber(e.target.value); setShowDropdown(true) }} onFocus={() => setShowDropdown(true)} onKeyDown={handleKeyDown} placeholder="Enter Job Number..." className="w-full pl-12 pr-4 py-4 neu-inset rounded-xl text-lg font-mono" />
              {showDropdown && jobNumber.length > 0 && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border z-50 max-h-[250px] overflow-y-auto">
                  {filteredSuggestions.map(job => (
                    <button key={job.job_number} onClick={() => { setJobNumber(job.job_number); setShowDropdown(false); searchJob(job.job_number) }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between border-b">
                      <div><span className="font-mono font-bold text-blue-600">{job.job_number}</span><span className="text-sm text-slate-500 ml-2">{job.title}</span></div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(job.status)}`}>{job.status?.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => { setShowDropdown(false); searchJob() }} disabled={searching} className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {searching ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}Search
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <p className="text-xs text-slate-400">Available:</p>
            {availableJobs.slice(0, 8).map(job => (
              <button key={job.job_number} onClick={() => { setJobNumber(job.job_number); searchJob(job.job_number) }} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-mono text-blue-600 hover:bg-blue-50">{job.job_number}</button>
            ))}
          </div>
        </div>

        {loading && <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div><p className="text-slate-500">Loading...</p></div>}

        {selectedJob && !loading && (
          <div>
            {/* Job Header */}
            <div className="neu-raised rounded-2xl p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedJob.title}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedJob.status)}`}>{selectedJob.status?.replace('_', ' ')}</span>
                    {selectedJob.job_categories && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: selectedJob.job_categories.color + '20', color: selectedJob.job_categories.color }}>{selectedJob.job_categories.name}</span>}
                  </div>
                  <p className="text-slate-500"><span className="font-mono font-bold">{selectedJob.job_number}</span> · Priority: <span className={`font-bold ${selectedJob.priority === 'urgent' ? 'text-red-600' : 'text-slate-600'}`}>{selectedJob.priority}</span></p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  <tab.icon className="w-4 h-4" />{tab.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: Briefcase, label: 'Job Number', value: selectedJob.job_number },
                  { icon: Calendar, label: 'Scheduled Date', value: formatDate(selectedJob.scheduled_date) },
                  { icon: Clock, label: 'Time', value: `${formatTime(selectedJob.scheduled_start_time)} - ${formatTime(selectedJob.scheduled_end_time)}` },
                  { icon: MapPin, label: 'Location', value: selectedJob.site_address || 'N/A' },
                  { icon: Building2, label: 'Client', value: selectedJob.clients?.company_name || 'N/A' },
                  { icon: Users, label: 'Cleaners Assigned', value: `${selectedJob.job_assignments?.length || 0} cleaner(s)` },
                  { icon: CheckCircle2, label: 'Status', value: selectedJob.status?.replace('_', ' ') },
                  { icon: DollarSign, label: 'Quoted Amount', value: formatCurrency(selectedJob.quoted_amount || selectedJob.actual_cost) },
                  { icon: Camera, label: 'Photos', value: `${selectedJob.job_photos?.length || 0} uploaded` },
                  { icon: FileText, label: 'Tasks', value: `${selectedJob.job_task_items?.length || 0} checklist items` },
                  { icon: Wrench, label: 'Inspections', value: `${selectedJob.quality_inspections?.length || 0} quality checks` },
                  { icon: Package, label: 'Supply Requests', value: `${selectedJob.supplies?.length || 0} requests` },
                ].map((item, i) => (
                  <div key={i} className="neu-raised rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1"><item.icon className="w-4 h-4 text-blue-600" /><span className="text-xs text-slate-500">{item.label}</span></div>
                    <p className="font-semibold text-slate-800 dark:text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* JOB DETAILS TAB */}
            {activeTab === 'details' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Job Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    {[['Title', selectedJob.title], ['Description', selectedJob.description || 'N/A'], ['Category', selectedJob.job_categories?.name || 'N/A'], ['Priority', selectedJob.priority], ['Status', selectedJob.status?.replace('_', ' ')], ['Cleaners Required', selectedJob.cleaners_required || 1], ['Est. Duration', `${selectedJob.estimated_duration_minutes || 'N/A'} min`]].map(([l, v]) => (
                      <div key={l} className="flex justify-between p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg"><span className="text-slate-500">{l}</span><span className="font-medium capitalize">{v}</span></div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[['Site Address', selectedJob.site_address || 'N/A'], ['City', selectedJob.site_city || 'N/A'], ['Site Contact', selectedJob.site_contact_name || 'N/A'], ['Contact Phone', selectedJob.site_contact_phone || 'N/A'], ['Access Instructions', selectedJob.access_instructions || 'None'], ['Recurring', selectedJob.is_recurring ? 'Yes' : 'No']].map(([l, v]) => (
                      <div key={l} className="flex justify-between p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg"><span className="text-slate-500">{l}</span><span className="font-medium">{v}</span></div>
                    ))}
                  </div>
                </div>
                {selectedJob.special_instructions && (
                  <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200">
                    <p className="text-sm font-semibold text-amber-700 mb-1">📝 Special Instructions</p>
                    <p className="text-sm text-amber-600">{selectedJob.special_instructions}</p>
                  </div>
                )}
                {selectedJob.notes && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200">
                    <p className="text-sm font-semibold text-blue-700 mb-1">📋 Notes</p>
                    <p className="text-sm text-blue-600">{selectedJob.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* ASSIGNED STAFF TAB */}
            {activeTab === 'staff' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Assigned Staff ({selectedJob.job_assignments?.length || 0})</h3>
                {selectedJob.job_assignments?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedJob.job_assignments.map(assign => (
                      <div key={assign.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <User className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-lg">{assign.employees?.first_name} {assign.employees?.last_name}</p>
                            <p className="text-xs text-slate-500">{assign.employees?.employee_code} · {assign.employees?.position || 'Cleaner'} · {assign.employees?.department || 'N/A'}</p>
                            <div className="flex gap-3 mt-1 text-xs text-slate-500">
                              {assign.employees?.email && <span>📧 {assign.employees.email}</span>}
                              {assign.employees?.phone && <a href={`tel:${assign.employees.phone}`} className="text-blue-600 hover:underline">📞 {assign.employees.phone}</a>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${assign.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : assign.status === 'accepted' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{assign.status}</span>
                            {assign.check_in_time && <p className="text-xs text-slate-500 mt-1">In: {new Date(assign.check_in_time).toLocaleTimeString()}</p>}
                            {assign.check_out_time && <p className="text-xs text-slate-500">Out: {new Date(assign.check_out_time).toLocaleTimeString()}</p>}
                            {assign.hours_worked && <p className="text-xs font-bold text-slate-600">{assign.hours_worked} hrs</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-center py-8 text-slate-400"><Users className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No staff assigned to this job</p></div>}
              </div>
            )}

            {/* TIMELINE TAB */}
            {activeTab === 'timeline' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Job Timeline</h3>
                <div className="relative">
                  {generateAuditTrail(selectedJob).map((step, i) => (
                    <div key={i} className="flex items-start gap-4 mb-4 relative">
                      {i < generateAuditTrail(selectedJob).length - 1 && <div className="absolute left-5 top-10 w-0.5 h-full bg-slate-300 dark:bg-slate-600"></div>}
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 z-10 shadow-lg"><step.icon className="w-5 h-5 text-white" /></div>
                      <div className="flex-1 bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3">
                        <p className="font-semibold text-sm text-slate-800 dark:text-white">{step.action}</p>
                        <p className="text-xs text-slate-500 mt-1">{step.details}</p>
                        <div className="flex justify-between mt-2">
                          <span className="text-xs text-slate-500 font-medium">{step.user}</span>
                          <span className="text-xs text-slate-400">{formatDateTime(step.date)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {generateAuditTrail(selectedJob).length === 0 && <p className="text-center text-slate-400 py-4">No timeline events</p>}
                </div>
              </div>
            )}

            {/* PHOTOS TAB */}
            {activeTab === 'photos' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Job Photos ({selectedJob.job_photos?.length || 0})</h3>
                {selectedJob.job_photos?.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {selectedJob.job_photos.map(photo => (
                      <div key={photo.id} className="relative rounded-xl overflow-hidden cursor-pointer group bg-slate-200 dark:bg-slate-700" onClick={() => setSelectedPhoto(photo)}>
                        <img src={photo.photo_url} alt={photo.photo_type} className="w-full h-44 object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${photo.photo_type === 'before' ? 'bg-blue-500' : photo.photo_type === 'after' ? 'bg-emerald-500' : 'bg-red-500'}`}>{photo.photo_type}</span>
                          <p className="text-white/80 text-[10px] mt-1">{formatDateTime(photo.taken_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-center py-8 text-slate-400"><Camera className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No photos uploaded</p></div>}
              </div>
            )}

            {/* INVENTORY TAB */}
            {activeTab === 'inventory' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Supplies & Inventory ({selectedJob.supplies?.length || 0})</h3>
                {selectedJob.supplies?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedJob.supplies.map(supply => (
                      <div key={supply.id} className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                        <div className="flex justify-between items-center mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${supply.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : supply.status === 'fulfilled' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{supply.status}</span>
                          <span className="text-xs text-slate-500">{formatDate(supply.created_at)}</span>
                        </div>
                        <div className="space-y-1.5">
                          {supply.supplies_request_items?.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                              <span>• {item.item_name}</span>
                              <span className="font-medium">x{item.quantity} {item.unit}</span>
                            </div>
                          ))}
                        </div>
                        {supply.notes && <p className="text-xs text-slate-500 mt-2">Notes: {supply.notes}</p>}
                      </div>
                    ))}
                  </div>
                ) : <div className="text-center py-8 text-slate-400"><Package className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No supplies requested</p></div>}
              </div>
            )}

            {/* TIME TRACKING TAB */}
            {activeTab === 'time' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Time Tracking</h3>
                {selectedJob.attendance?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-slate-50 dark:bg-slate-700/30"><th className="text-left py-3 px-4">Date</th><th className="text-left py-3 px-4">Clock In</th><th className="text-left py-3 px-4">Clock Out</th><th className="text-right py-3 px-4">Hours</th><th className="text-left py-3 px-4">Status</th></tr></thead>
                      <tbody>
                        {selectedJob.attendance.map(a => (
                          <tr key={a.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-700/20">
                            <td className="py-3 px-4 font-medium">{formatDate(a.attendance_date)}</td>
                            <td className="py-3 px-4">{a.clock_in_time ? new Date(a.clock_in_time).toLocaleTimeString() : '-'}</td>
                            <td className="py-3 px-4">{a.clock_out_time ? new Date(a.clock_out_time).toLocaleTimeString() : '-'}</td>
                            <td className="py-3 px-4 text-right font-bold">{a.total_hours?.toFixed(1) || '-'}</td>
                            <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${a.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{a.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 dark:bg-slate-700/30 font-bold">
                          <td className="py-3 px-4" colSpan={3}>Total Hours</td>
                          <td className="py-3 px-4 text-right">{selectedJob.attendance.reduce((s, a) => s + (a.total_hours || 0), 0).toFixed(1)}</td>
                          <td className="py-3 px-4"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : <div className="text-center py-8 text-slate-400"><Clock3 className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No time records available</p></div>}
              </div>
            )}

            {/* FINANCIALS TAB */}
            {activeTab === 'financials' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3"><FileText className="w-5 h-5 text-blue-600" /><h4 className="font-semibold text-blue-700">Quotation</h4></div>
                    {selectedJob.quotations?.length > 0 ? selectedJob.quotations.map(q => (
                      <div key={q.id}>
                        <p className="text-sm font-mono">#{q.quotation_number}</p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div><span className="text-slate-500">Subtotal:</span> <span className="font-medium">{formatCurrency(q.subtotal)}</span></div>
                          <div><span className="text-slate-500">VAT (15%):</span> <span>{formatCurrency(q.tax_amount)}</span></div>
                          <div className="col-span-2 pt-2 border-t"><span className="font-bold text-blue-700">Total:</span> <span className="font-bold text-lg text-blue-700">{formatCurrency(q.total_amount)}</span></div>
                        </div>
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs ${q.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{q.status}</span>
                      </div>
                    )) : <p className="text-sm text-slate-500">No quotation generated</p>}
                  </div>
                  <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 mb-3"><Receipt className="w-5 h-5 text-emerald-600" /><h4 className="font-semibold text-emerald-700">Invoice</h4></div>
                    {selectedJob.invoices?.length > 0 ? selectedJob.invoices.map(inv => (
                      <div key={inv.id}>
                        <p className="text-sm font-mono">#{inv.invoice_number}</p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div><span className="text-slate-500">Amount:</span> <span className="font-medium">{formatCurrency(inv.total_amount)}</span></div>
                          <div><span className="text-slate-500">Paid:</span> <span className="font-medium text-emerald-600">{formatCurrency(inv.amount_paid)}</span></div>
                          <div className="col-span-2 pt-2 border-t"><span className="font-bold text-emerald-700">Balance:</span> <span className="font-bold text-lg text-emerald-700">{formatCurrency((inv.total_amount || 0) - (inv.amount_paid || 0))}</span></div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span>
                          <span className="text-xs text-slate-500">Due: {formatDate(inv.due_date)}</span>
                        </div>
                        {inv.payments?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-700">
                            <p className="text-xs font-semibold text-slate-500 mb-1">Payment History</p>
                            {inv.payments.map(p => (
                              <div key={p.id} className="flex justify-between text-xs">
                                <span>{formatDate(p.payment_date)} - {p.payment_method}</span>
                                <span className="font-medium text-emerald-600">{formatCurrency(p.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )) : <p className="text-sm text-slate-500">No invoice generated</p>}
                  </div>
                </div>
              </div>
            )}

            {/* CUSTOMER TAB */}
            {activeTab === 'customer' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
                {selectedJob.clients ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Building2 className="w-6 h-6 text-blue-600" /></div>
                          <div><p className="font-bold text-lg">{selectedJob.clients.company_name}</p></div>
                        </div>
                        <div className="space-y-2 text-sm">
                          {selectedJob.clients.email && <div className="flex items-center gap-2"><span className="text-slate-500">Email:</span><a href={`mailto:${selectedJob.clients.email}`} className="text-blue-600 hover:underline">{selectedJob.clients.email}</a></div>}
                          {selectedJob.clients.phone && <div className="flex items-center gap-2"><span className="text-slate-500">Phone:</span><a href={`tel:${selectedJob.clients.phone}`} className="text-blue-600 hover:underline">{selectedJob.clients.phone}</a></div>}
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                        <h4 className="font-semibold text-sm mb-3">Site Contact</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-slate-500">Name:</span> <span className="font-medium">{selectedJob.site_contact_name || 'N/A'}</span></div>
                          <div><span className="text-slate-500">Phone:</span> {selectedJob.site_contact_phone ? <a href={`tel:${selectedJob.site_contact_phone}`} className="text-blue-600 hover:underline">{selectedJob.site_contact_phone}</a> : 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : <div className="text-center py-8 text-slate-400"><Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No client assigned</p></div>}
              </div>
            )}

            {/* AUDIT LOG TAB */}
            {activeTab === 'audit' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Audit Trail</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 dark:bg-slate-700/30">
                        <th className="text-left py-3 px-4 w-[40px]">#</th>
                        <th className="text-left py-3 px-4">Action</th>
                        <th className="text-left py-3 px-4">Performed By</th>
                        <th className="text-left py-3 px-4">Details</th>
                        <th className="text-left py-3 px-4">Date/Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generateAuditTrail(selectedJob).map((item, i) => (
                        <tr key={i} className="border-b hover:bg-slate-50 dark:hover:bg-slate-700/20">
                          <td className="py-3 px-4 text-slate-400 text-xs">{i + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <item.icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <span className="font-medium">{item.action}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                <User className="w-3 h-3 text-purple-600" />
                              </div>
                              <span className="text-slate-700 dark:text-slate-300 font-medium">{item.user}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 max-w-[250px]">{item.details || '-'}</td>
                          <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(item.date)}</td>
                        </tr>
                      ))}
                      {generateAuditTrail(selectedJob).length === 0 && (
                        <tr><td colSpan={5} className="text-center py-8 text-slate-400">No audit records available</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Job Selected */}
        {!selectedJob && !loading && (
          <div className="neu-raised rounded-3xl p-12 text-center">
            <Search className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-500 mb-2">Search for a Job</h3>
            <p className="text-slate-400 max-w-md mx-auto">Enter a job number above or click an available job to view its complete profile</p>
          </div>
        )}

        {/* Photo Preview Modal */}
        {selectedPhoto && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
            <div className="max-w-3xl w-full bg-white dark:bg-slate-800 rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="font-bold capitalize">{selectedPhoto.photo_type} Photo</h3>
                <div className="flex gap-2">
                  <a href={selectedPhoto.photo_url} download className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs flex items-center gap-1"><Download className="w-3 h-3" /> Download</a>
                  <button onClick={() => setSelectedPhoto(null)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <img src={selectedPhoto.photo_url} alt={selectedPhoto.photo_type} className="w-full max-h-[70vh] object-contain bg-black" />
              <div className="p-4 text-sm">
                <p>Uploaded: {formatDateTime(selectedPhoto.taken_at)}</p>
                {selectedPhoto.caption && <p className="text-slate-500 mt-1">Caption: {selectedPhoto.caption}</p>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
