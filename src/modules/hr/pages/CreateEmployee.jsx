import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useHRStore from '../store/hrStore'
import useThemeStore from '../../../store/themeStore'
import { supabase } from '../../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { 
  Save, Upload, ChevronRight, UserPlus, Users
} from 'lucide-react'

export default function CreateEmployee() {
  const { createEmployee } = useHRStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const photoInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    alternative_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    department: '',
    position: '',
    employment_type: 'full_time',
    employment_status: 'active',
    date_of_hire: new Date().toISOString().split('T')[0],
    date_of_birth: '',
    gender: '',
    marital_status: '',
    id_number: '',
    tax_number: '',
    bank_name: '',
    bank_account_number: '',
    bank_branch_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    notes: '',
    profile_photo_url: ''
  })

  const [tempPhoto, setTempPhoto] = useState(null)

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Photo Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview locally
    const reader = new FileReader()
    reader.onload = (event) => setTempPhoto(event.target.result)
    reader.readAsDataURL(file)

    // Upload to Supabase
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `employee-photos/new-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('fleet')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('fleet').getPublicUrl(fileName)
      setFormData(prev => ({ ...prev, profile_photo_url: publicUrl }))
      toast.success('Photo ready!')
    } catch (error) {
      toast.error('Photo upload failed - will save without photo')
    }
    setUploading(false)
  }

  // Save Employee - SAFE VERSION
  const handleSave = async () => {
    // Validation
    if (!formData.first_name || !formData.last_name) {
      toast.error('First name and last name are required')
      return
    }
    if (!formData.email) {
      toast.error('Email is required')
      return
    }

    setSaving(true)
    
    // Only send fields that have values (filter out empty strings, null, undefined)
    const cleanData = {}
    Object.keys(formData).forEach(key => {
      const value = formData[key]
      if (value !== '' && value !== null && value !== undefined) {
        cleanData[key] = value
      }
    })

    // Ensure required fields are present
    cleanData.first_name = formData.first_name
    cleanData.last_name = formData.last_name
    cleanData.email = formData.email
    cleanData.employment_status = formData.employment_status || 'active'

    console.log('Saving employee with data:', cleanData)

    const result = await createEmployee(cleanData)
    
    if (result.success) {
      toast.success('Employee added successfully! 🎉')
      navigate(`/hr/employees/${result.data.id}`)
    } else {
      toast.error(result.error || 'Failed to create employee')
    }
    setSaving(false)
  }

  const inputClass = "w-full border border-[#2c73b6] bg-[#f7f7c2] h-[30px] px-2 outline-none text-sm"
  const labelCellClass = "cell label-cell justify-end font-bold bg-[#d7e5f2] dark:bg-slate-700"
  const valueCellClass = "cell bg-[#dce8f5] dark:bg-slate-600"

  const tabs = [
    { id: 'general', label: 'General Info' },
    { id: 'attendance', label: 'Time Clock History' },
    { id: 'payroll', label: 'Payroll History' },
    { id: 'details', label: 'Payroll & Details' },
    { id: 'schedule', label: 'Scheduling' },
    { id: 'leave', label: 'Leave' },
    { id: 'events', label: 'Events' },
  ]

  return (
    <div className="min-h-screen bg-[#d8d8d8] dark:bg-slate-900 font-['Inter'] transition-colors duration-300">
      <Navbar />

      <main className="max-w-7xl mx-auto px-2 sm:px-4 pt-4 pb-16">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-2 text-sm px-2">
          <Link to="/hr" className="text-[#2c5f9b] hover:underline">HR Management</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <Link to="/hr/employees" className="text-[#2c5f9b] hover:underline">Employees</Link>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-700 dark:text-slate-300 font-medium">Add New Employee</span>
        </div>

        {/* Title */}
        <div className="flex items-center justify-center relative mb-3">
          <div className="absolute left-4 text-[50px] text-[#2f5f9b]">👥</div>
          <h1 className="text-[50px] md:text-[60px] text-[#2c5f9b] tracking-wider font-black uppercase" 
            style={{ fontFamily: "'Alumni Sans Pinstripe', sans-serif" }}>
            Add New Employee
          </h1>
        </div>

        {/* Top Bar */}
        <div className="flex items-center gap-2 mb-3 flex-wrap px-2">
          <span className="text-base font-bold text-slate-700 dark:text-slate-300">Employee:</span>
          <input 
            value={`${formData.first_name} ${formData.last_name}`.trim() || 'New Employee'}
            onChange={e => {
              const [first, ...last] = e.target.value.split(' ')
              updateField('first_name', first || '')
              updateField('last_name', last.join(' ') || '')
            }}
            className="border border-[#2c73b6] bg-[#f7f7c2] dark:bg-slate-700 h-7 px-2 outline-none w-[340px] text-sm"
            placeholder="Type full name..."
          />

          <button 
            onClick={handleSave} 
            disabled={saving}
            className="neo-btn h-8 px-4 rounded-md bg-gradient-to-b from-[#4f8fd0] to-[#2d5f98] text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
            style={{
              boxShadow: '3px 3px 6px rgba(0,0,0,0.35), inset 1px 1px 2px rgba(255,255,255,0.5)'
            }}
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Employee'}
          </button>

          <button 
            onClick={() => navigate('/hr/employees')} 
            className="neo-btn h-8 px-4 rounded-md bg-gradient-to-b from-gray-400 to-gray-600 text-white font-bold text-sm"
            style={{
              boxShadow: '3px 3px 6px rgba(0,0,0,0.35), inset 1px 1px 2px rgba(255,255,255,0.5)'
            }}
          >
            Cancel
          </button>

          <span className="text-base font-bold text-slate-700 dark:text-slate-300 ml-4">Empl. ID:</span>
          <input 
            value="Auto-generated" 
            className="border border-[#2c73b6] bg-white dark:bg-slate-700 h-7 px-2 outline-none w-[140px] text-sm text-slate-400 italic" 
            readOnly 
          />
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-7 border border-[#2f77bb] mb-0">
          {tabs.map((tab, i) => (
            <div key={tab.id} 
              className={`text-center py-2 text-sm font-bold border-r border-[#2f77bb] last:border-r-0 ${
                i === 0 
                  ? 'bg-[#f4f4f4] dark:bg-slate-600 text-slate-800 dark:text-white' 
                  : 'bg-[#d3e1ef] dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
              {tab.label}
            </div>
          ))}
        </div>

        {/* Content - General Info Form */}
        <div className="border border-[#2f77bb] bg-[#d7e5f2] dark:bg-slate-800 grid grid-cols-1 lg:grid-cols-[1fr_170px] gap-5 p-2.5">
          {/* Form Grid */}
          <div>
            <div className="grid grid-cols-[140px_1fr_140px_1fr] border-t border-l border-[#2f77bb]">
              
              {/* Last Name */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Last Name: *</div>
              <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.last_name} onChange={e => updateField('last_name', e.target.value)} className={inputClass} placeholder="Required" />
              </div>

              {/* First Name */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>First Name: *</div>
              <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.first_name} onChange={e => updateField('first_name', e.target.value)} className={inputClass} placeholder="Required" />
              </div>

              {/* Address */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Address:</div>
              <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"} style={{gridColumn: 'span 3'}}>
                <input value={formData.address_line1} onChange={e => updateField('address_line1', e.target.value)} className={inputClass} placeholder="Street address" />
              </div>

              {/* City */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>City:</div>
              <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.city} onChange={e => updateField('city', e.target.value)} className={inputClass} />
              </div>

              {/* State */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>State:</div>
              <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.state} onChange={e => updateField('state', e.target.value)} className={inputClass} />
              </div>

              {/* Zip Code */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Zip Code:</div>
              <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.postal_code} onChange={e => updateField('postal_code', e.target.value)} className={inputClass} />
              </div>

              {/* Email */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Email: *</div>
              <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"} style={{gridColumn: 'span 3'}}>
                <input type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} className={inputClass} placeholder="Required" />
              </div>

              {/* Cell Phone */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Cell Phone:</div>
              <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.phone} onChange={e => updateField('phone', e.target.value)} className={inputClass} />
              </div>

              {/* Status */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Status:</div>
              <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <select value={formData.employment_status} onChange={e => updateField('employment_status', e.target.value)} className={inputClass}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Other Phone */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Other Phone:</div>
              <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.alternative_phone} onChange={e => updateField('alternative_phone', e.target.value)} className={inputClass} />
              </div>

              {/* Type / Position */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Type / Position:</div>
              <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.position} onChange={e => updateField('position', e.target.value)} className={inputClass} placeholder="e.g., Cleaner, Supervisor" />
              </div>

              {/* Department */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Department:</div>
              <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <select value={formData.department} onChange={e => updateField('department', e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Operations">Operations</option>
                  <option value="Administration">Administration</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">Human Resources</option>
                  <option value="Finance">Finance</option>
                </select>
              </div>

              {/* Date Hired */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Date Hired:</div>
              <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input type="date" value={formData.date_of_hire} onChange={e => updateField('date_of_hire', e.target.value)} className={inputClass} />
              </div>

              {/* Employment Type */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Emp. Type:</div>
              <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <select value={formData.employment_type} onChange={e => updateField('employment_type', e.target.value)} className={inputClass}>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="temporary">Temporary</option>
                  <option value="intern">Intern</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Date of Birth:</div>
              <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input type="date" value={formData.date_of_birth} onChange={e => updateField('date_of_birth', e.target.value)} className={inputClass} />
              </div>

              {/* ID Number */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>ID Number:</div>
              <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.id_number} onChange={e => updateField('id_number', e.target.value)} className={inputClass} />
              </div>

              {/* Tax Number */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Tax Number:</div>
              <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.tax_number} onChange={e => updateField('tax_number', e.target.value)} className={inputClass} />
              </div>

              {/* Gender */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Gender:</div>
              <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <select value={formData.gender} onChange={e => updateField('gender', e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Marital Status */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Marital Status:</div>
              <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <select value={formData.marital_status} onChange={e => updateField('marital_status', e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>

              {/* Bank Name */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Bank Name:</div>
              <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.bank_name} onChange={e => updateField('bank_name', e.target.value)} className={inputClass} />
              </div>

              {/* Account Number */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Account #:</div>
              <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.bank_account_number} onChange={e => updateField('bank_account_number', e.target.value)} className={inputClass} />
              </div>

              {/* Branch Code */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Branch Code:</div>
              <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.bank_branch_code} onChange={e => updateField('bank_branch_code', e.target.value)} className={inputClass} />
              </div>

              {/* Emergency Contact */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Emerg. Contact:</div>
              <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.emergency_contact_name} onChange={e => updateField('emergency_contact_name', e.target.value)} className={inputClass} />
              </div>

              {/* Emergency Phone */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Emerg. Phone:</div>
              <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.emergency_contact_phone} onChange={e => updateField('emergency_contact_phone', e.target.value)} className={inputClass} />
              </div>

              {/* Emergency Relation */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Emerg. Relation:</div>
              <div className={valueCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"}>
                <input value={formData.emergency_contact_relation} onChange={e => updateField('emergency_contact_relation', e.target.value)} className={inputClass} placeholder="e.g., Spouse, Parent" />
              </div>

              {/* Notes */}
              <div className={labelCellClass + " border-r border-b border-[#2f77bb] min-h-[38px] flex items-center justify-end px-2"}>Notes:</div>
              <div className={valueCellClass + " border-b border-[#2f77bb] min-h-[38px] flex items-center px-2"} style={{gridColumn: 'span 3'}}>
                <input value={formData.notes} onChange={e => updateField('notes', e.target.value)} className={inputClass} placeholder="Additional notes..." />
              </div>
            </div>

            {/* Attachments Placeholder */}
            <div className="mt-4 border border-[#2f77bb]">
              <div className="flex gap-1.5 p-1.5 bg-[#c9dff2] dark:bg-slate-700 border-b border-[#2f77bb] flex-wrap">
                <button className="neo-btn h-8 px-3 rounded-md bg-gradient-to-b from-[#4f8fd0] to-[#2d5f98] text-white font-bold text-xs opacity-50 cursor-not-allowed">📎 Add Att.</button>
                <button className="neo-btn h-8 px-3 rounded-md bg-gradient-to-b from-[#4f8fd0] to-[#2d5f98] text-white font-bold text-xs opacity-50 cursor-not-allowed">👁 Show All</button>
              </div>
              <table className="w-full border-collapse bg-white dark:bg-slate-800">
                <thead>
                  <tr>
                    <th className="bg-[#d4e6f7] dark:bg-slate-600 border border-[#2f77bb] dark:border-slate-500 p-2 text-sm">File Name</th>
                    <th className="bg-[#d4e6f7] dark:bg-slate-600 border border-[#2f77bb] dark:border-slate-500 p-2 text-sm">File Type</th>
                    <th className="bg-[#d4e6f7] dark:bg-slate-600 border border-[#2f77bb] dark:border-slate-500 p-2 text-sm">File Path</th>
                    <th className="bg-[#d4e6f7] dark:bg-slate-600 border border-[#2f77bb] dark:border-slate-500 p-2 text-sm">Added On</th>
                    <th className="bg-[#d4e6f7] dark:bg-slate-600 border border-[#2f77bb] dark:border-slate-500 p-2 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="border border-[#2f77bb] dark:border-slate-500 p-4 text-center text-slate-400 italic bg-[#f7fbff] dark:bg-slate-700">
                      Attachments can be added after saving the employee
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Photo Panel */}
          <div className="border border-[#2f77bb] bg-[#dce8f5] dark:bg-slate-700 flex flex-col items-center justify-center p-2.5">
            <div className="w-[150px] h-[170px] border-[3px] border-[#3569a3] dark:border-slate-500 bg-[#edf3f9] dark:bg-slate-600 flex items-center justify-center overflow-hidden">
              {tempPhoto || formData.profile_photo_url ? (
                <img src={tempPhoto || formData.profile_photo_url} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <img src="https://cdn-icons-png.flaticon.com/512/847/847969.png" alt="Default" className="w-full h-full object-contain p-4" />
              )}
            </div>
            <button 
              onClick={() => photoInputRef.current?.click()} 
              className="mt-2.5 text-[#0066cc] dark:text-blue-400 font-bold cursor-pointer text-sm hover:underline flex items-center gap-1"
              disabled={uploading}
            >
              <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Add Picture'}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
        </div>

        {/* Bottom Save Button */}
        <div className="flex justify-end mt-4 gap-3 px-2">
          <button 
            onClick={() => navigate('/hr/employees')} 
            className="neo-btn h-10 px-6 rounded-md bg-gradient-to-b from-gray-400 to-gray-600 text-white font-bold"
            style={{ boxShadow: '3px 3px 6px rgba(0,0,0,0.35), inset 1px 1px 2px rgba(255,255,255,0.5)' }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="neo-btn h-10 px-8 rounded-md bg-gradient-to-b from-[#4f8fd0] to-[#2d5f98] text-white font-bold text-lg disabled:opacity-50 flex items-center gap-2"
            style={{ boxShadow: '3px 3px 6px rgba(0,0,0,0.35), inset 1px 1px 2px rgba(255,255,255,0.5)' }}
          >
            <UserPlus className="w-5 h-5" /> {saving ? 'Creating Employee...' : 'Add Employee'}
          </button>
        </div>
      </main>
    </div>
  )
}
