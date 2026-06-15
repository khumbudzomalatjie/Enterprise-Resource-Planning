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
  Package, FileText, DollarSign, Star, Clock3,
  Users, ClipboardList, History, Receipt,
  ChevronDown, ChevronUp, X, Download
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

  // Load available job numbers for suggestions
  useEffect(() => {
    loadAvailableJobs()
  }, [])

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
    
    if (!searchNumber) {
      toast.error('Please enter a job number')
      return
    }

    setSearching(true)
    setLoading(true)
    try {
      // Try exact match first
      let { data: job, error } = await supabase
        .from('jobs')
        .select(`
          *,
          clients(*),
          job_categories(*),
          job_assignments(*, employees(*)),
          job_photos(*),
          job_task_items(*),
          quality_inspections(*),
          quotations(*, quotation_items(*)),
          invoices(*, invoice_items(*), payments(*))
        `)
        .eq('job_number', searchNumber.toUpperCase())
        .single()

      // If not found, try case-insensitive partial match
      if (error || !job) {
        const { data: jobILike, error: ilikeError } = await supabase
          .from('jobs')
          .select(`
            *,
            clients(*),
            job_categories(*),
            job_assignments(*, employees(*)),
            job_photos(*),
            job_task_items(*),
            quality_inspections(*),
            quotations(*, quotation_items(*)),
            invoices(*, invoice_items(*), payments(*))
          `)
          .ilike('job_number', `%${searchNumber}%`)
          .limit(1)
          .single()

        if (!ilikeError && jobILike) {
          job = jobILike
        }
      }

      if (!job) {
        toast.error(`Job "${searchNumber}" not found. Check the job number and try again.`)
        setSelectedJob(null)
        setLoading(false)
        setSearching(false)
        return
      }

      // Fetch additional data
      const employeeIds = job.job_assignments?.map(a => a.employee_id) || []
      
      let attendanceData = { data: [] }
      if (employeeIds.length > 0) {
        attendanceData = await supabase
          .from('attendance_records')
          .select('*')
          .in('employee_id', employeeIds)
          .order('attendance_date', { ascending: false })
          .limit(50)
      }

      const [suppliesData, incidentsData] = await Promise.all([
        supabase.from('supplies_requests').select('*, supplies_request_items(*)').eq('job_id', job.id),
        supabase.from('incident_reports').select('*, employees(first_name, last_name)').eq('job_id', job.id),
      ])

      setSelectedJob({
        ...job,
        attendance: attendanceData?.data || [],
        supplies: suppliesData?.data || [],
        incidents: incidentsData?.data || [],
      })
      setActiveTab('overview')
      setShowDropdown(false)
      toast.success(`Job ${job.job_number} loaded!`)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Error searching for job')
    } finally {
      setSearching(false)
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setShowDropdown(false)
      searchJob()
    }
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0)
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
  const formatDateTime = (date) => date ? new Date(date).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'
  const formatTime = (time) => time ? time.slice(0, 5) : ''

  const getStatusBadge = (status) => {
    const b = {
      pending: 'bg-slate-100 text-slate-700',
      scheduled: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700',
      on_hold: 'bg-purple-100 text-purple-700',
    }
    return b[status] || 'bg-slate-100 text-slate-700'
  }

  const generateAuditTrail = (job) => {
    const trail = []
    if (job.created_at) trail.push({ action: 'Job Created', user: 'System', date: job.created_at, icon: Briefcase })
    if (job.scheduled_date) trail.push({ action: 'Job Scheduled', user: 'Operations', date: job.scheduled_date, icon: Calendar })
    job.job_assignments?.forEach(a => {
      trail.push({ action: `Assigned to ${a.employees?.first_name || 'Cleaner'} ${a.employees?.last_name || ''}`, user: 'Supervisor', date: a.created_at || job.scheduled_date, icon: User })
    })
    if (job.actual_start_time) trail.push({ action: 'Status: In Progress', user: 'Cleaner', date: job.actual_start_time, icon: Play })
    job.job_photos?.forEach(p => {
      trail.push({ action: `Photo Uploaded (${p.photo_type})`, user: 'Cleaner', date: p.taken_at, icon: Camera })
    })
    if (job.quality_inspections?.length > 0) {
      job.quality_inspections.forEach(q => {
        trail.push({ action: `Quality Check: ${q.overall_rating}/5`, user: 'Inspector', date: q.created_at, icon: CheckCircle2 })
      })
    }
    if (job.status === 'completed') trail.push({ action: 'Job Completed', user: 'Cleaner', date: job.actual_end_time, icon: CheckCircle2 })
    if (job.invoices?.length > 0) {
      job.invoices.forEach(inv => {
        trail.push({ action: `Invoice Generated: ${inv.invoice_number}`, user: 'Finance', date: inv.created_at, icon: Receipt })
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

  const filteredSuggestions = availableJobs.filter(j => 
    (j.job_number || '').toLowerCase().includes(jobNumber.toLowerCase()) || 
    (j.title || '').toLowerCase().includes(jobNumber.toLowerCase())
  ).slice(0, 10)

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

        {/* Header with Search */}
        <div className="neu-raised rounded-3xl p-6 mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-4">
            <Briefcase className="w-8 h-8 text-blue-600" />Job Tracker
          </h1>
          <p className="text-slate-500 mb-6">Enter a Job Number to view the complete job history, audit trail, and all related information</p>
          
          {/* Search with Autocomplete */}
          <div className="flex gap-3 relative">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              <input
                type="text"
                value={jobNumber}
                onChange={e => { setJobNumber(e.target.value); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder="Enter Job Number (e.g., JOB-2506-0001)..."
                className="w-full pl-12 pr-4 py-4 neu-inset rounded-xl text-lg font-mono"
              />
              
              {/* Autocomplete Dropdown */}
              {showDropdown && jobNumber.length > 0 && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 z-50 max-h-[250px] overflow-y-auto">
                  {filteredSuggestions.map(job => (
                    <button
                      key={job.job_number}
                      onClick={() => { setJobNumber(job.job_number); setShowDropdown(false); searchJob(job.job_number) }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between border-b border-slate-100 dark:border-slate-700"
                    >
                      <div>
                        <span className="font-mono font-bold text-blue-600">{job.job_number}</span>
                        <span className="text-sm text-slate-500 ml-2">{job.title}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(job.status)}`}>
                        {job.status?.replace('_', ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => { setShowDropdown(false); searchJob() }} disabled={searching}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {searching ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              Search
            </button>
          </div>

          {/* Browse Available Jobs */}
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <p className="text-xs text-slate-400">Browse:</p>
            {availableJobs.slice(0, 8).map(job => (
              <button key={job.job_number}
                onClick={() => { setJobNumber(job.job_number); searchJob(job.job_number) }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-mono text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors">
                {job.job_number}
              </button>
            ))}
            {availableJobs.length > 8 && (
              <span className="text-xs text-slate-400">+{availableJobs.length - 8} more</span>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading job data...</p>
          </div>
        )}

        {/* Job Found - Display Complete Profile */}
        {selectedJob && !loading && (
          <div>
            {/* Job Header */}
            <div className="neu-raised rounded-2xl p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedJob.title}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedJob.status)}`}>
                      {selectedJob.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-500">
                    <span className="font-mono font-bold">{selectedJob.job_number}</span>
                    {selectedJob.job_categories && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium" 
                        style={{ backgroundColor: selectedJob.job_categories.color + '20', color: selectedJob.job_categories.color }}>
                        {selectedJob.job_categories.name}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="text-sm text-slate-500">Priority: <span className={`font-bold ${selectedJob.priority === 'urgent' ? 'text-red-600' : selectedJob.priority === 'high' ? 'text-orange-600' : 'text-slate-600'}`}>{selectedJob.priority}</span></span>
                  <span className="text-sm text-slate-500">Created: {formatDate(selectedJob.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}>
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
                  { icon: MapPin, label: 'Location', value: selectedJob.site_address },
                  { icon: Building2, label: 'Client', value: selectedJob.clients?.company_name || 'N/A' },
                  { icon: Users, label: 'Assigned Cleaners', value: `${selectedJob.job_assignments?.length || 0} cleaner(s)` },
                  { icon: CheckCircle2, label: 'Status', value: selectedJob.status?.replace('_', ' ') },
                  { icon: DollarSign, label: 'Quoted Amount', value: formatCurrency(selectedJob.quoted_amount || selectedJob.actual_cost) },
                  { icon: Camera, label: 'Photos', value: `${selectedJob.job_photos?.length || 0} uploaded` },
                ].map((item, i) => (
                  <div key={i} className="neu-raised rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <item.icon className="w-4 h-4 text-blue-600" />
                      <span className="text-xs text-slate-500">{item.label}</span>
                    </div>
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
                    {[
                      ['Title', selectedJob.title],
                      ['Description', selectedJob.description || 'N/A'],
                      ['Category', selectedJob.job_categories?.name || 'N/A'],
                      ['Priority', selectedJob.priority],
                      ['Status', selectedJob.status?.replace('_', ' ')],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                        <span className="text-slate-500">{label}</span><span className="font-medium capitalize">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[
                      ['Site Address', selectedJob.site_address],
                      ['Access Instructions', selectedJob.access_instructions || 'None'],
                      ['Site Contact', selectedJob.site_contact_name || 'N/A'],
                      ['Contact Phone', selectedJob.site_contact_phone || 'N/A'],
                      ['Cleaners Required', selectedJob.cleaners_required || 1],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                        <span className="text-slate-500">{label}</span><span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {selectedJob.special_instructions && (
                  <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200">
                    <p className="text-sm font-semibold text-amber-700 mb-1">Special Instructions</p>
                    <p className="text-sm text-amber-600">{selectedJob.special_instructions}</p>
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
                      <div key={assign.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <User className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{assign.employees?.first_name} {assign.employees?.last_name}</p>
                            <p className="text-xs text-slate-500">{assign.employees?.employee_code} · {assign.employees?.position || 'Cleaner'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs ${assign.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{assign.status}</span>
                          {assign.employees?.phone && (
                            <a href={`tel:${assign.employees.phone}`} className="block text-xs text-blue-600 hover:underline mt-1">📞 Call</a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-400 text-center py-4">No staff assigned</p>}
              </div>
            )}

            {/* TIMELINE TAB */}
            {activeTab === 'timeline' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Job Timeline</h3>
                <div className="relative">
                  {generateAuditTrail(selectedJob).map((step, i) => (
                    <div key={i} className="flex items-start gap-3 mb-4 relative">
                      {i < generateAuditTrail(selectedJob).length - 1 && (
                        <div className="absolute left-4 top-8 w-0.5 h-full bg-slate-300 dark:bg-slate-600"></div>
                      )}
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 z-10">
                        <step.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{step.action}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(step.date)}</p>
                      </div>
                    </div>
                  ))}
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
                      <div key={photo.id} className="relative rounded-xl overflow-hidden cursor-pointer group"
                        onClick={() => setSelectedPhoto(photo)}>
                        <img src={photo.photo_url} alt={photo.photo_type} className="w-full h-40 object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-2">
                          <span className="text-white text-xs font-medium capitalize">{photo.photo_type}</span>
                          <p className="text-white/70 text-[10px]">{formatDateTime(photo.taken_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-400 text-center py-4">No photos uploaded</p>}
              </div>
            )}

            {/* INVENTORY TAB */}
            {activeTab === 'inventory' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Supplies & Inventory</h3>
                {selectedJob.supplies?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedJob.supplies.map(supply => (
                      <div key={supply.id} className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                        <div className="flex justify-between mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${supply.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{supply.status}</span>
                          <span className="text-xs text-slate-500">{formatDate(supply.created_at)}</span>
                        </div>
                        {supply.supplies_request_items?.map((item, i) => (
                          <p key={i} className="text-sm">• {item.item_name} x{item.quantity} {item.unit}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-400 text-center py-4">No supplies requested</p>}
              </div>
            )}

            {/* TIME TRACKING TAB */}
            {activeTab === 'time' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Time Tracking</h3>
                {selectedJob.attendance?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-slate-50"><th className="text-left py-2 px-3">Date</th><th className="text-left py-2 px-3">Clock In</th><th className="text-left py-2 px-3">Clock Out</th><th className="text-right py-2 px-3">Hours</th></tr></thead>
                      <tbody>
                        {selectedJob.attendance.map(a => (
                          <tr key={a.id} className="border-b">
                            <td className="py-2 px-3">{formatDate(a.attendance_date)}</td>
                            <td className="py-2 px-3">{a.clock_in_time ? new Date(a.clock_in_time).toLocaleTimeString() : '-'}</td>
                            <td className="py-2 px-3">{a.clock_out_time ? new Date(a.clock_out_time).toLocaleTimeString() : '-'}</td>
                            <td className="py-2 px-3 text-right">{a.total_hours?.toFixed(1) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="text-slate-400 text-center py-4">No time records</p>}
              </div>
            )}

            {/* FINANCIALS TAB */}
            {activeTab === 'financials' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Financial Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <p className="text-sm text-blue-600 font-semibold">Quotation</p>
                    {selectedJob.quotations?.length > 0 ? (
                      selectedJob.quotations.map(q => (
                        <div key={q.id} className="mt-2">
                          <p className="text-xs">#{q.quotation_number}</p>
                          <p className="text-lg font-bold">{formatCurrency(q.total_amount)}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${q.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{q.status}</span>
                        </div>
                      ))
                    ) : <p className="text-xs text-slate-500 mt-2">No quotation</p>}
                  </div>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <p className="text-sm text-emerald-600 font-semibold">Invoice</p>
                    {selectedJob.invoices?.length > 0 ? (
                      selectedJob.invoices.map(inv => (
                        <div key={inv.id} className="mt-2">
                          <p className="text-xs">#{inv.invoice_number}</p>
                          <p className="text-lg font-bold">{formatCurrency(inv.total_amount)}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span>
                        </div>
                      ))
                    ) : <p className="text-xs text-slate-500 mt-2">No invoice</p>}
                  </div>
                </div>
              </div>
            )}

            {/* CUSTOMER TAB */}
            {activeTab === 'customer' && (
              <div className="neu-raised rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
                {selectedJob.clients ? (
                  <div className="space-y-2">
                    {[
                      ['Company', selectedJob.clients.company_name],
                      ['Phone', selectedJob.clients.phone],
                      ['Email', selectedJob.clients.email],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-medium">{value || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-400 text-center py-4">No client assigned</p>}
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
                        <th className="text-left py-3 px-4">Action</th>
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Date/Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generateAuditTrail(selectedJob).map((item, i) => (
                        <tr key={i} className="border-b hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <item.icon className="w-4 h-4 text-blue-600" />
                              <span className="font-medium">{item.action}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{item.user}</td>
                          <td className="py-3 px-4 text-xs">{formatDateTime(item.date)}</td>
                        </tr>
                      ))}
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
            <p className="text-slate-400 max-w-md mx-auto">
              Enter a job number above or click one of the available jobs below to view the complete job profile.
            </p>
          </div>
        )}

        {/* Photo Preview Modal */}
        {selectedPhoto && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
            <div className="max-w-3xl w-full bg-white dark:bg-slate-800 rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="font-bold capitalize">{selectedPhoto.photo_type} Photo</h3>
                <button onClick={() => setSelectedPhoto(null)} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
              </div>
              <img src={selectedPhoto.photo_url} alt={selectedPhoto.photo_type} className="w-full max-h-[70vh] object-contain bg-black" />
              <div className="p-4 text-sm">
                <p>Uploaded: {formatDateTime(selectedPhoto.taken_at)}</p>
                <a href={selectedPhoto.photo_url} download className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:underline text-sm">
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
