import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useOperationsStore from '../store/operationsStore'
import useCRMStore from '../../crm/store/crmStore'
import useThemeStore from '../../../store/themeStore'
import useAuthStore from '../../../store/authStore'
import toast from 'react-hot-toast'
import { Briefcase, Save, Send, Calendar, MapPin, Clock, Users, Sun, Moon, Sparkles, ArrowLeft } from 'lucide-react'

export default function CreateJob() {
  const { createJob, fetchJobCategories, jobCategories } = useOperationsStore()
  const { clients, fetchClients } = useCRMStore()
  const { isDark, toggleTheme } = useThemeStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [jobData, setJobData] = useState({
    client_id: '',
    job_category_id: '',
    title: '',
    description: '',
    site_address: '',
    site_city: '',
    site_postal_code: '',
    site_contact_name: '',
    site_contact_phone: '',
    access_instructions: '',
    scheduled_date: '',
    scheduled_start_time: '',
    scheduled_end_time: '',
    estimated_duration_minutes: 120,
    priority: 'medium',
    cleaners_required: 2,
    special_instructions: '',
    notes: '',
    quoted_amount: 0
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    const clientsResult = await fetchClients({ status: 'active' })
    if (!clientsResult.success) {
      toast.error('Failed to load clients')
    }

    const categoriesResult = await fetchJobCategories()
    if (!categoriesResult.success) {
      toast.error('Failed to load services')
    }
  }

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setJobData({
        ...jobData,
        client_id: client.id,
        site_address: client.address_line1 || '',
        site_city: client.city || '',
        site_postal_code: client.postal_code || '',
        site_contact_name: '',
        site_contact_phone: client.phone || '',
      })
    }
  }

  const handleCategorySelect = (categoryId) => {
    const category = jobCategories.find(c => c.id === categoryId)
    if (category) {
      setJobData({
        ...jobData,
        job_category_id: category.id,
        estimated_duration_minutes: category.estimated_duration_minutes || 120,
        cleaners_required: category.default_cleaners_required || 2,
      })
    }
  }

  const handleSubmit = async (status = 'pending') => {
    if (!jobData.title || !jobData.client_id) {
      toast.error('Please fill in all required fields (Title and Client)')
      return
    }

    if (!jobData.site_address) {
      toast.error('Please enter a site address')
      return
    }

    const selectedClient = clients.find(c => c.id === jobData.client_id)

    const submitData = {
      ...jobData,
      status,
      created_by: user?.id || null,
      client_name: selectedClient?.company_name || null,
      scheduled_date: jobData.scheduled_date || null,
      scheduled_start_time: jobData.scheduled_start_time || null,
      scheduled_end_time: jobData.scheduled_end_time || null,
    }

    const result = await createJob(submitData)
    if (result.success) {
      toast.success(status === 'scheduled' ? 'Job created and scheduled!' : 'Job saved as draft!')
      navigate(`/operations/jobs/${result.data.id}`)
    } else {
      console.error('Create job failed:', result.error)
      toast.error(result.error || 'Failed to create job', { duration: 8000 })
    }
  }

  const formatCategoryColor = (color) => {
    return { backgroundColor: color + '20', color: color, borderColor: color + '40' }
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link to="/operations" className="text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">
            Operations
          </Link>
          <span className="text-slate-400">/</span>
          <Link to="/operations/jobs" className="text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400">
            Jobs
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-800 dark:text-white font-medium">New Job</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Create New Job</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Schedule a new cleaning or maintenance job</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Job Details */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                Job Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={jobData.client_id}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  >
                    <option value="">Select a client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name} {c.client_code ? `(${c.client_code})` : ''}</option>
                    ))}
                  </select>
                  {clients.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No active clients found. Add clients in CRM first.</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                    Service <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={jobData.job_category_id}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  >
                    <option value="">Select a service...</option>
                    {jobCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {jobCategories.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No services loaded. Check Inventory &gt; Services &amp; Pricing.</p>
                  )}
                </div>

                {/* ✅ CHIP — now shows only the service name */}
                {jobData.job_category_id && (
                  <div className="md:col-span-2 flex flex-wrap gap-2">
                    {jobCategories.filter(c => c.id === jobData.job_category_id).map(cat => (
                      <span
                        key={cat.id}
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: cat.color + '20', color: cat.color, border: '1px solid ' + cat.color + '40' }}
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={jobData.title}
                    onChange={(e) => setJobData({...jobData, title: e.target.value})}
                    placeholder="e.g., Weekly Office Cleaning - Sandton Branch"
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                    Description
                  </label>
                  <textarea
                    value={jobData.description}
                    onChange={(e) => setJobData({...jobData, description: e.target.value})}
                    rows={3}
                    placeholder="Detailed description of the work to be done..."
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Location Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                    Site Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={jobData.site_address}
                    onChange={(e) => setJobData({...jobData, site_address: e.target.value})}
                    placeholder="Full street address"
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">City</label>
                  <input
                    type="text"
                    value={jobData.site_city}
                    onChange={(e) => setJobData({...jobData, site_city: e.target.value})}
                    placeholder="City"
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Postal Code</label>
                  <input
                    type="text"
                    value={jobData.site_postal_code}
                    onChange={(e) => setJobData({...jobData, site_postal_code: e.target.value})}
                    placeholder="Postal code"
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Site Contact Name</label>
                  <input
                    type="text"
                    value={jobData.site_contact_name}
                    onChange={(e) => setJobData({...jobData, site_contact_name: e.target.value})}
                    placeholder="Contact person on site"
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Site Contact Phone</label>
                  <input
                    type="text"
                    value={jobData.site_contact_phone}
                    onChange={(e) => setJobData({...jobData, site_contact_phone: e.target.value})}
                    placeholder="Phone number"
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Access Instructions</label>
                  <textarea
                    value={jobData.access_instructions}
                    onChange={(e) => setJobData({...jobData, access_instructions: e.target.value})}
                    rows={2}
                    placeholder="Gate code, parking info, key location, security instructions..."
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
              </div>
            </div>

            {/* Scheduling */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Scheduling
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={jobData.scheduled_date}
                    onChange={(e) => setJobData({...jobData, scheduled_date: e.target.value})}
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Start Time</label>
                  <input
                    type="time"
                    value={jobData.scheduled_start_time}
                    onChange={(e) => setJobData({...jobData, scheduled_start_time: e.target.value})}
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">End Time</label>
                  <input
                    type="time"
                    value={jobData.scheduled_end_time}
                    onChange={(e) => setJobData({...jobData, scheduled_end_time: e.target.value})}
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Est. Duration (minutes)</label>
                  <input
                    type="number"
                    value={jobData.estimated_duration_minutes}
                    onChange={(e) => setJobData({...jobData, estimated_duration_minutes: parseInt(e.target.value) || 0})}
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Priority</label>
                  <select
                    value={jobData.priority}
                    onChange={(e) => setJobData({...jobData, priority: e.target.value})}
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Cleaners Required</label>
                  <input
                    type="number"
                    value={jobData.cleaners_required}
                    onChange={(e) => setJobData({...jobData, cleaners_required: parseInt(e.target.value) || 1})}
                    min="1"
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="neu-raised rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Additional Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Quoted Amount (ZAR)</label>
                  <input
                    type="number"
                    value={jobData.quoted_amount}
                    onChange={(e) => setJobData({...jobData, quoted_amount: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Special Instructions</label>
                  <textarea
                    value={jobData.special_instructions}
                    onChange={(e) => setJobData({...jobData, special_instructions: e.target.value})}
                    rows={3}
                    placeholder="Special cleaning instructions, areas to focus on, chemicals to use/avoid..."
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Internal Notes</label>
                  <textarea
                    value={jobData.notes}
                    onChange={(e) => setJobData({...jobData, notes: e.target.value})}
                    rows={2}
                    placeholder="Notes for team and management (not visible to client)..."
                    className="w-full p-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => navigate('/operations')}
                className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-slate-500 text-white hover:bg-slate-600 transition-colors flex items-center gap-2"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit('pending')}
                className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-slate-600 text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                <span>Save as Draft</span>
              </button>
              <button
                onClick={() => handleSubmit('scheduled')}
                className="neu-raised neu-btn px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                <span>Create & Schedule</span>
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
