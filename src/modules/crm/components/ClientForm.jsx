import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Save, Upload, ChevronDown, ChevronUp, User, Building2 } from 'lucide-react'

export default function ClientForm({ onSubmit, onCancel, initialData = null, loading = false }) {
  const [clientType, setClientType] = useState(initialData?.client_type || 'business')
  const [activeTab, setActiveTab] = useState('basic')
  const [expandedSections, setExpandedSections] = useState({
    contacts: true,
    address: true,
    financial: true,
    crm: true,
    documents: true,
  })

  const [formData, setFormData] = useState({
    // Basic Info
    client_type: initialData?.client_type || 'business',
    company_name: initialData?.company_name || '',
    trading_name: initialData?.trading_name || '',
    registration_number: initialData?.registration_number || '',
    tax_number: initialData?.tax_number || '',
    vat_number: initialData?.vat_number || '',
    industry: initialData?.industry || '',
    website: initialData?.website || '',
    
    // Personal Info
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    gender: initialData?.gender || '',
    date_of_birth: initialData?.date_of_birth || '',
    nationality: initialData?.nationality || '',
    id_number: initialData?.id_number || '',
    
    // Primary Contact
    contact_full_name: initialData?.contact_full_name || '',
    contact_position: initialData?.contact_position || '',
    contact_mobile: initialData?.contact_mobile || '',
    contact_email: initialData?.contact_email || '',
    
    // Contact Information
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    mobile: initialData?.mobile || '',
    alternative_phone: initialData?.alternative_phone || '',
    whatsapp_number: initialData?.whatsapp_number || '',
    preferred_contact_method: initialData?.preferred_contact_method || 'email',
    
    // Address
    address_line1: initialData?.address_line1 || '',
    address_line2: initialData?.address_line2 || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    postal_code: initialData?.postal_code || '',
    country: initialData?.country || 'South Africa',
    postal_address: initialData?.postal_address || '',
    
    // Work/Business Info
    occupation: initialData?.occupation || '',
    employer: initialData?.employer || '',
    work_address: initialData?.work_address || '',
    work_phone: initialData?.work_phone || '',
    
    // Financial
    payment_terms: initialData?.payment_terms || '30_days',
    credit_limit: initialData?.credit_limit || '',
    preferred_payment_method: initialData?.preferred_payment_method || '',
    tax_exempt: initialData?.tax_exempt || false,
    currency: initialData?.currency || 'ZAR',
    billing_cycle: initialData?.billing_cycle || 'monthly',
    bank_name: initialData?.bank_name || '',
    bank_account_number: initialData?.bank_account_number || '',
    bank_branch_code: initialData?.bank_branch_code || '',
    
    // CRM Details
    client_status: initialData?.client_status || 'active',
    client_rating: initialData?.client_rating || 'unrated',
    lead_source: initialData?.lead_source || '',
    assigned_to: initialData?.assigned_to || '',
    pipeline_stage: initialData?.pipeline_stage || 'lead',
    estimated_value: initialData?.estimated_value || '',
    contract_start_date: initialData?.contract_start_date || '',
    contract_end_date: initialData?.contract_end_date || '',
    renewal_date: initialData?.renewal_date || '',
    
    // Additional Contacts (Business)
    accounts_contact: initialData?.accounts_contact || '',
    hr_contact: initialData?.hr_contact || '',
    technical_contact: initialData?.technical_contact || '',
    support_contact: initialData?.support_contact || '',
    
    // Services
    products_purchased: initialData?.products_purchased || '',
    services_subscribed: initialData?.services_subscribed || '',
    support_package: initialData?.support_package || '',
    sla_details: initialData?.sla_details || '',
    
    // System Fields (auto-filled)
    notes: initialData?.notes || '',
    tags: initialData?.tags || '',
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleClientTypeChange = (type) => {
    setClientType(type)
    setFormData(prev => ({ ...prev, client_type: type }))
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const inputClass = "w-full px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
  const selectClass = "w-full px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
  const textareaClass = "w-full px-4 py-3 neu-inset rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm resize-none"

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: clientType === 'personal' ? '👤' : '🏢' },
    { id: 'contacts', label: 'Contacts', icon: '📞' },
    { id: 'address', label: 'Address', icon: '📍' },
    { id: 'financial', label: 'Financial', icon: '💰' },
    { id: 'crm', label: 'CRM Details', icon: '📊' },
    { id: 'documents', label: 'Documents', icon: '📁' },
    { id: 'notes', label: 'Notes', icon: '📝' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="neu-raised rounded-3xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            {initialData ? 'Edit Client' : 'Add New Client'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {clientType === 'personal' ? 'Personal/Individual Client' : 'Business/Corporate Client'}
          </p>
        </div>
        <button onClick={onCancel} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Client Type Selector */}
      <div className="px-6 pt-6">
        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => handleClientTypeChange('business')}
            className={`flex-1 p-4 rounded-2xl flex items-center gap-3 transition-all ${
              clientType === 'business'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'neu-raised text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Building2 className="w-6 h-6" />
            <div className="text-left">
              <p className="font-semibold">Business Client</p>
              <p className="text-xs opacity-75">Company/Organization</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleClientTypeChange('personal')}
            className={`flex-1 p-4 rounded-2xl flex items-center gap-3 transition-all ${
              clientType === 'personal'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'neu-raised text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <User className="w-6 h-6" />
            <div className="text-left">
              <p className="font-semibold">Personal Client</p>
              <p className="text-xs opacity-75">Individual/Person</p>
            </div>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 mb-6">
        <nav className="flex overflow-x-auto custom-scrollbar gap-1 p-1 neu-inset rounded-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white/10'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit}>
        <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          
          {/* BASIC INFO TAB */}
          {activeTab === 'basic' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {clientType === 'business' ? (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Company Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className={labelClass}>Company Name *</label>
                      <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} required className={inputClass} placeholder="Enter company name" />
                    </div>
                    <div>
                      <label className={labelClass}>Trading Name</label>
                      <input type="text" name="trading_name" value={formData.trading_name} onChange={handleChange} className={inputClass} placeholder="Trading as..." />
                    </div>
                    <div>
                      <label className={labelClass}>Registration Number</label>
                      <input type="text" name="registration_number" value={formData.registration_number} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>VAT/Tax Number</label>
                      <input type="text" name="tax_number" value={formData.tax_number} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Industry Type</label>
                      <select name="industry" value={formData.industry} onChange={handleChange} className={selectClass}>
                        <option value="">Select Industry</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="education">Education</option>
                        <option value="finance">Finance & Banking</option>
                        <option value="retail">Retail</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="technology">Technology</option>
                        <option value="hospitality">Hospitality</option>
                        <option value="real_estate">Real Estate</option>
                        <option value="government">Government</option>
                        <option value="ngo">NGO/Non-Profit</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Website</label>
                      <input type="url" name="website" value={formData.website} onChange={handleChange} className={inputClass} placeholder="https://" />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white pt-4">Primary Contact Person</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Full Name *</label>
                      <input type="text" name="contact_full_name" value={formData.contact_full_name} onChange={handleChange} required className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Position/Role</label>
                      <input type="text" name="contact_position" value={formData.contact_position} onChange={handleChange} className={inputClass} placeholder="e.g., CEO, Manager" />
                    </div>
                    <div>
                      <label className={labelClass}>Mobile Number</label>
                      <input type="text" name="contact_mobile" value={formData.contact_mobile} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Email Address</label>
                      <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>First Name *</label>
                      <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Last Name *</label>
                      <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Gender</label>
                      <select name="gender" value={formData.gender} onChange={handleChange} className={selectClass}>
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Date of Birth</label>
                      <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Nationality</label>
                      <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className={inputClass} placeholder="e.g., South African" />
                    </div>
                    <div>
                      <label className={labelClass}>ID/Passport Number</label>
                      <input type="text" name="id_number" value={formData.id_number} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white pt-4">Work Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Occupation</label>
                      <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Employer</label>
                      <input type="text" name="employer" value={formData.employer} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Work Address</label>
                      <input type="text" name="work_address" value={formData.work_address} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Work Phone</label>
                      <input type="text" name="work_phone" value={formData.work_phone} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* CONTACTS TAB */}
          {activeTab === 'contacts' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Mobile Number</label>
                  <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Alternative Number</label>
                  <input type="text" name="alternative_phone" value={formData.alternative_phone} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>WhatsApp Number</label>
                  <input type="text" name="whatsapp_number" value={formData.whatsapp_number} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Preferred Contact Method</label>
                  <select name="preferred_contact_method" value={formData.preferred_contact_method} onChange={handleChange} className={selectClass}>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>

              {clientType === 'business' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white pt-4">Additional Contacts</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Accounts Contact</label>
                      <input type="text" name="accounts_contact" value={formData.accounts_contact} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>HR Contact</label>
                      <input type="text" name="hr_contact" value={formData.hr_contact} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Technical Contact</label>
                      <input type="text" name="technical_contact" value={formData.technical_contact} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Support Contact</label>
                      <input type="text" name="support_contact" value={formData.support_contact} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ADDRESS TAB */}
          {activeTab === 'address' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                {clientType === 'business' ? 'Business Address' : 'Residential Address'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Address Line 1 *</label>
                  <input type="text" name="address_line1" value={formData.address_line1} onChange={handleChange} required className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Address Line 2</label>
                  <input type="text" name="address_line2" value={formData.address_line2} onChange={handleChange} className={inputClass} />
                </div>
                {clientType === 'business' && (
                  <div className="md:col-span-2">
                    <label className={labelClass}>Postal Address</label>
                    <input type="text" name="postal_address" value={formData.postal_address} onChange={handleChange} className={inputClass} />
                  </div>
                )}
                <div>
                  <label className={labelClass}>City *</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Province/State</label>
                  <input type="text" name="state" value={formData.state} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Postal Code</label>
                  <input type="text" name="postal_code" value={formData.postal_code} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input type="text" name="country" value={formData.country} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            </motion.div>
          )}

          {/* FINANCIAL TAB */}
          {activeTab === 'financial' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Financial Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Payment Terms</label>
                  <select name="payment_terms" value={formData.payment_terms} onChange={handleChange} className={selectClass}>
                    <option value="immediate">Immediate</option>
                    <option value="7_days">7 Days</option>
                    <option value="15_days">15 Days</option>
                    <option value="30_days">30 Days</option>
                    <option value="60_days">60 Days</option>
                    <option value="90_days">90 Days</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Credit Limit (ZAR)</label>
                  <input type="number" name="credit_limit" value={formData.credit_limit} onChange={handleChange} className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>Preferred Payment Method</label>
                  <select name="preferred_payment_method" value={formData.preferred_payment_method} onChange={handleChange} className={selectClass}>
                    <option value="">Select Method</option>
                    <option value="eft">EFT/Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_order">Debit Order</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Currency</label>
                  <select name="currency" value={formData.currency} onChange={handleChange} className={selectClass}>
                    <option value="ZAR">ZAR - South African Rand</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Billing Cycle</label>
                  <select name="billing_cycle" value={formData.billing_cycle} onChange={handleChange} className={selectClass}>
                    <option value="once_off">Once Off</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi_weekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
                <div className="flex items-center pt-8">
                  <input type="checkbox" name="tax_exempt" checked={formData.tax_exempt} onChange={handleChange} className="w-4 h-4 text-emerald-600 rounded" />
                  <label className="ml-2 text-sm text-slate-700 dark:text-slate-300">Tax Exempt</label>
                </div>
              </div>

              {clientType === 'business' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white pt-4">Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Bank Name</label>
                      <input type="text" name="bank_name" value={formData.bank_name} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Account Number</label>
                      <input type="text" name="bank_account_number" value={formData.bank_account_number} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Branch Code</label>
                      <input type="text" name="bank_branch_code" value={formData.bank_branch_code} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* CRM DETAILS TAB */}
          {activeTab === 'crm' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">CRM & Sales Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Client Status</label>
                  <select name="client_status" value={formData.client_status} onChange={handleChange} className={selectClass}>
                    <option value="lead">Lead</option>
                    <option value="active">Active</option>
                    <option value="vip">VIP</option>
                    <option value="inactive">Inactive</option>
                    <option value="former">Former</option>
                    <option value="blacklisted">Blacklisted</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Client Rating</label>
                  <select name="client_rating" value={formData.client_rating} onChange={handleChange} className={selectClass}>
                    <option value="unrated">Unrated</option>
                    <option value="A">A - Excellent</option>
                    <option value="B">B - Good</option>
                    <option value="C">C - Average</option>
                    <option value="D">D - Poor</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Lead Source</label>
                  <select name="lead_source" value={formData.lead_source} onChange={handleChange} className={selectClass}>
                    <option value="">Select Source</option>
                    <option value="facebook">Facebook</option>
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="walk_in">Walk-in</option>
                    <option value="email_campaign">Email Campaign</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="exhibition">Exhibition/Event</option>
                    <option value="cold_call">Cold Call</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Pipeline Stage</label>
                  <select name="pipeline_stage" value={formData.pipeline_stage} onChange={handleChange} className={selectClass}>
                    <option value="lead">Lead</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal_sent">Proposal Sent</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="contract_sent">Contract Sent</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Estimated Deal Value (ZAR)</label>
                  <input type="number" name="estimated_value" value={formData.estimated_value} onChange={handleChange} className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>Assigned Salesperson</label>
                  <input type="text" name="assigned_to" value={formData.assigned_to} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Contract Start Date</label>
                  <input type="date" name="contract_start_date" value={formData.contract_start_date} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Contract End Date</label>
                  <input type="date" name="contract_end_date" value={formData.contract_end_date} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Renewal Date</label>
                  <input type="date" name="renewal_date" value={formData.renewal_date} onChange={handleChange} className={inputClass} />
                </div>
              </div>

              {clientType === 'business' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white pt-4">Services & Products</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Products Purchased</label>
                      <textarea name="products_purchased" value={formData.products_purchased} onChange={handleChange} rows={2} className={textareaClass}></textarea>
                    </div>
                    <div>
                      <label className={labelClass}>Services Subscribed</label>
                      <textarea name="services_subscribed" value={formData.services_subscribed} onChange={handleChange} rows={2} className={textareaClass}></textarea>
                    </div>
                    <div>
                      <label className={labelClass}>Support Package</label>
                      <input type="text" name="support_package" value={formData.support_package} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>SLA Details</label>
                      <input type="text" name="sla_details" value={formData.sla_details} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Documents</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Upload client documents (coming soon)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'ID Copy / Passport', name: 'id_document' },
                  { label: 'Proof of Address', name: 'proof_address' },
                  { label: 'Company Registration', name: 'registration_doc' },
                  { label: 'Tax Certificate', name: 'tax_cert' },
                  { label: 'Signed Contract', name: 'contract' },
                  { label: 'Other Documents', name: 'other' },
                ].map((doc) => (
                  <div key={doc.name} className="neu-raised rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-slate-700 dark:text-slate-300">{doc.label}</p>
                      <p className="text-xs text-slate-400">No file uploaded</p>
                    </div>
                    <button type="button" className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-200 transition-colors">
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Notes & Tags</h3>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Notes/Comments</label>
                  <textarea name="notes" value={formData.notes} onChange={handleChange} rows={6} className={textareaClass} placeholder="Add any notes or comments about this client..."></textarea>
                </div>
                <div>
                  <label className={labelClass}>Tags</label>
                  <input type="text" name="tags" value={formData.tags} onChange={handleChange} className={inputClass} placeholder="e.g., VIP, Urgent, Follow-up (comma separated)" />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Form Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-4">
          <button type="submit" disabled={loading}
            className="neu-raised neu-btn px-6 py-3 rounded-2xl flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
            <Save className="w-5 h-5" />
            <span>{loading ? 'Saving...' : initialData ? 'Update Client' : 'Add Client'}</span>
          </button>
          <button type="button" onClick={onCancel}
            className="neu-raised neu-btn px-6 py-3 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  )
}
