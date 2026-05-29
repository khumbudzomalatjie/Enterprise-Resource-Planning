import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../../../components/Navbar'
import useHRStore from '../store/hrStore'
import useThemeStore from '../../../store/themeStore'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabaseClient'
import { 
  Users, Save, Plus, Archive, IdCard, Camera, Upload, X,
  ChevronRight
} from 'lucide-react'

export default function EmployeeDetail() {
  const { id } = useParams()
  const { selectedEmployee, fetchEmployee, updateEmployee, deleteEmployee, loading } = useHRStore()
  const { isDark, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState('general')
  const [isEditing, setIsEditing] = useState(id === 'new')
  const [uploading, setUploading] = useState(false)
  const [editData, setEditData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    alternative_phone: '',
    date_of_birth: '',
    gender: '',
    marital_status: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    department: '',
    position: '',
    employment_type: 'full_time',
    employment_status: 'active',
    date_of_hire: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    bank_name: '',
    bank_account_number: '',
    bank_branch_code: '',
    id_number: '',
    tax_number: '',
    notes: '',
    profile_photo_url: ''
  })

  const isNewEmployee = id === 'new'

  useEffect(() => {
    if (id && id !== 'new') {
      fetchEmployee(id)
    }
  }, [id])

  useEffect(() => {
    if (selectedEmployee && !isNewEmployee) {
      setEditData({
        first_name: selectedEmployee.first_name || '',
        last_name: selectedEmployee.last_name || '',
        email: selectedEmployee.email || '',
        phone: selectedEmployee.phone || '',
        alternative_phone: selectedEmployee.alternative_phone || '',
        date_of_birth: selectedEmployee.date_of_birth || '',
        gender: selectedEmployee.gender || '',
        marital_status: selectedEmployee.marital_status || '',
        address_line1: selectedEmployee.address_line1 || '',
        address_line2: selectedEmployee.address_line2 || '',
        city: selectedEmployee.city || '',
        state: selectedEmployee.state || '',
        postal_code: selectedEmployee.postal_code || '',
        department: selectedEmployee.department || '',
        position: selectedEmployee.position || '',
        employment_type: selectedEmployee.employment_type || 'full_time',
        employment_status: selectedEmployee.employment_status || 'active',
        date_of_hire: selectedEmployee.date_of_hire || '',
        emergency_contact_name: selectedEmployee.emergency_contact_name || '',
        emergency_contact_phone: selectedEmployee.emergency_contact_phone || '',
        emergency_contact_relation: selectedEmployee.emergency_contact_relation || '',
        bank_name: selectedEmployee.bank_name || '',
        bank_account_number: selectedEmployee.bank_account_number || '',
        bank_branch_code: selectedEmployee.bank_branch_code || '',
        id_number: selectedEmployee.id_number || '',
        tax_number: selectedEmployee.tax_number || '',
        notes: selectedEmployee.notes || '',
        profile_photo_url: selectedEmployee.profile_photo_url || ''
      })
    }
  }, [selectedEmployee])

  const handleSave = async () => {
    if (!editData.first_name || !editData.last_name) {
      toast.error('First name and last name are required')
      return
    }

    let result
    if (isNewEmployee) {
      result = await useHRStore.getState().createEmployee(editData)
    } else {
      result = await updateEmployee(id, editData)
    }

    if (result.success) {
      toast.success(isNewEmployee ? 'Employee created!' : 'Employee updated!')
      if (isNewEmployee) {
        navigate(`/hr/employees/${result.data.id}`)
      } else {
        setIsEditing(false)
        fetchEmployee(id)
      }
    } else {
      toast.error(result.error || 'Failed to save employee')
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to terminate this employee?')) {
      const result = await deleteEmployee(id)
      if (result.success) {
        toast.success('Employee terminated')
        navigate('/hr/employees')
      }
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `employee-photos/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('fleet')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('fleet')
        .getPublicUrl(fileName)

      setEditData({ ...editData, profile_photo_url: publicUrl })
      toast.success('Photo uploaded!')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  const updateField = (field, value) => {
    setEditData({ ...editData, [field]: value })
  }

  const tabs = [
    { id: 'general', label: 'General Info' },
    { id: 'employment', label: 'Employment' },
    { id: 'contact', label: 'Emergency' },
    { id: 'banking', label: 'Banking' },
    { id: 'documents', label: 'Documents' },
  ]

  // Loading State
  if (loading && !isNewEmployee) {
    return (
      <div className={`min-h-screen font-['Arial',sans-serif] transition-colors duration-300 ${isDark ? 'dark' : ''}`} style={{ background: isDark ? '#1a1a2e' : '#d8d8d8' }}>
        <Navbar />
        <div className="min-h-[80vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#2c5f9b]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen font-['Arial',sans-serif] transition-colors duration-300 ${isDark ? 'dark' : ''}`} style={{ background: isDark ? '#1a1a2e' : '#d8d8d8' }}>
      <Navbar />
      
      <div className="w-full min-h-screen p-1.5">
        {/* Title */}
        <div className="flex items-center justify-center relative mb-2.5">
          <div className="absolute left-4 top-1 text-[60px] text-[#2f5f9b]">👥</div>
          <h1 className="font-['Alumni_Sans_Pinstripe',sans-serif] text-[70px] text-[#2c5f9b] tracking-[3px] font-black uppercase"
            style={{ color: isDark ? '#5b9bd5' : '#2c5f9b' }}>
            Employee Manager
          </h1>
        </div>

        {/* Top Bar */}
        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
          <Link to="/hr/employees" className="text-sm text-[#2c5f9b] hover:underline font-bold">
            ← Back to List
          </Link>
          
          <span className="text-base font-bold" style={{ color: isDark ? '#ccc' : '#333' }}>Employee:</span>
          <input 
            className="h-7 border border-[#2c73b6] bg-white dark:bg-slate-700 dark:text-white px-2 py-1 outline-none text-sm"
            style={{ width: '340px' }}
            value={`${editData.first_name} ${editData.last_name}`}
            onChange={(e) => {
              const [first, ...last] = e.target.value.split(' ')
              updateField('first_name', first || '')
              updateField('last_name', last.join(' ') || '')
            }}
            placeholder="Employee Name"
          />

          {!isNewEmployee ? (
            <>
              <button onClick={() => setIsEditing(!isEditing)} className="neo-btn">
                {isEditing ? '👁️ View Mode' : '✏️ Edit'}
              </button>
              {isEditing && (
                <button onClick={handleSave} className="neo-btn">
                  💾 Save
                </button>
              )}
              <button onClick={handleDelete} className="neo-btn" style={{ background: 'linear-gradient(to bottom,#d94f4f,#982d2d)' }}>
                📦 Archive
              </button>
            </>
          ) : (
            <button onClick={handleSave} className="neo-btn">
              💾 Create Employee
            </button>
          )}

          <span className="text-base font-bold ml-4" style={{ color: isDark ? '#ccc' : '#333' }}>Empl. ID:</span>
          <input 
            className="h-7 border border-[#2c73b6] bg-white dark:bg-slate-700 dark:text-white px-2 py-1 outline-none text-sm"
            style={{ width: '140px' }}
            value={selectedEmployee?.employee_code || ''}
            readOnly
          />

          <button className="neo-btn">🪪 ID Cards</button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-5 border border-[#2f77bb] mb-0">
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-center py-2 text-sm font-bold cursor-pointer border-r border-[#2f77bb] last:border-r-0 transition-colors ${
                activeTab === tab.id 
                  ? 'bg-[#f4f4f4] dark:bg-slate-600' 
                  : 'bg-[#d3e1ef] dark:bg-slate-700'
              }`}
              style={{ color: isDark ? '#ddd' : '#333' }}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="border border-[#2f77bb] bg-[#d7e5f2] dark:bg-slate-700 grid grid-cols-[1fr_170px] gap-5 p-2.5"
          style={{ gridTemplateColumns: '1fr 170px' }}>
          
          <div>
            {/* General Info Tab */}
            {activeTab === 'general' && (
              <div className="grid grid-cols-[140px_1fr_140px_1fr] border-t border-l border-[#2f77bb]"
                style={{ gridTemplateColumns: '140px 1fr 140px 1fr' }}>
                
                <div className="cell label-cell">Last Name:</div>
                <div className="cell">
                  <input value={editData.last_name} onChange={e => updateField('last_name', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
                <div className="cell label-cell">First Name:</div>
                <div className="cell">
                  <input value={editData.first_name} onChange={e => updateField('first_name', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>

                <div className="cell label-cell">Address:</div>
                <div className="cell" style={{ gridColumn: 'span 3' }}>
                  <input value={editData.address_line1} onChange={e => updateField('address_line1', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>

                <div className="cell label-cell">City:</div>
                <div className="cell">
                  <input value={editData.city} onChange={e => updateField('city', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
                <div className="cell label-cell">State:</div>
                <div className="cell">
                  <input value={editData.state} onChange={e => updateField('state', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>

                <div className="cell label-cell">Zip Code:</div>
                <div className="cell">
                  <input value={editData.postal_code} onChange={e => updateField('postal_code', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
                <div className="cell label-cell">Email:</div>
                <div className="cell">
                  <input type="email" value={editData.email} onChange={e => updateField('email', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>

                <div className="cell label-cell">Cell Phone:</div>
                <div className="cell">
                  <input value={editData.phone} onChange={e => updateField('phone', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
                <div className="cell label-cell">Status:</div>
                <div className="cell">
                  {isEditing || isNewEmployee ? (
                    <select value={editData.employment_status} onChange={e => updateField('employment_status', e.target.value)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  ) : (
                    <input value={editData.employment_status?.replace('_', ' ')} readOnly />
                  )}
                </div>

                <div className="cell label-cell">Other Phone:</div>
                <div className="cell">
                  <input value={editData.alternative_phone} onChange={e => updateField('alternative_phone', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
                <div className="cell label-cell">Type / Position:</div>
                <div className="cell">
                  <input value={editData.position} onChange={e => updateField('position', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
              </div>
            )}

            {/* Employment Tab */}
            {activeTab === 'employment' && (
              <div className="grid grid-cols-[140px_1fr_140px_1fr] border-t border-l border-[#2f77bb]"
                style={{ gridTemplateColumns: '140px 1fr 140px 1fr' }}>
                
                <div className="cell label-cell">Department:</div>
                <div className="cell">
                  <input value={editData.department} onChange={e => updateField('department', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
                <div className="cell label-cell">Position:</div>
                <div className="cell">
                  <input value={editData.position} onChange={e => updateField('position', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>

                <div className="cell label-cell">Emp. Type:</div>
                <div className="cell">
                  {isEditing || isNewEmployee ? (
                    <select value={editData.employment_type} onChange={e => updateField('employment_type', e.target.value)}>
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="temporary">Temporary</option>
                      <option value="intern">Intern</option>
                    </select>
                  ) : (
                    <input value={editData.employment_type?.replace('_', ' ')} readOnly />
                  )}
                </div>
                <div className="cell label-cell">Status:</div>
                <div className="cell">
                  {isEditing || isNewEmployee ? (
                    <select value={editData.employment_status} onChange={e => updateField('employment_status', e.target.value)}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  ) : (
                    <input value={editData.employment_status?.replace('_', ' ')} readOnly />
                  )}
                </div>

                <div className="cell label-cell">Date Hired:</div>
                <div className="cell">
                  <input type="date" value={editData.date_of_hire} onChange={e => updateField('date_of_hire', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
                <div className="cell label-cell">Gender:</div>
                <div className="cell">
                  {isEditing || isNewEmployee ? (
                    <select value={editData.gender} onChange={e => updateField('gender', e.target.value)}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <input value={editData.gender || ''} readOnly />
                  )}
                </div>

                <div className="cell label-cell">Date of Birth:</div>
                <div className="cell">
                  <input type="date" value={editData.date_of_birth} onChange={e => updateField('date_of_birth', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
                <div className="cell label-cell">ID Number:</div>
                <div className="cell">
                  <input value={editData.id_number} onChange={e => updateField('id_number', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
              </div>
            )}

            {/* Emergency Contact Tab */}
            {activeTab === 'contact' && (
              <div className="grid grid-cols-[140px_1fr_140px_1fr] border-t border-l border-[#2f77bb]"
                style={{ gridTemplateColumns: '140px 1fr 140px 1fr' }}>
                
                <div className="cell label-cell">Contact Name:</div>
                <div className="cell">
                  <input value={editData.emergency_contact_name} onChange={e => updateField('emergency_contact_name', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
                <div className="cell label-cell">Relationship:</div>
                <div className="cell">
                  <input value={editData.emergency_contact_relation} onChange={e => updateField('emergency_contact_relation', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>

                <div className="cell label-cell">Phone:</div>
                <div className="cell">
                  <input value={editData.emergency_contact_phone} onChange={e => updateField('emergency_contact_phone', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
                <div className="cell label-cell">Tax Number:</div>
                <div className="cell">
                  <input value={editData.tax_number} onChange={e => updateField('tax_number', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
              </div>
            )}

            {/* Banking Tab */}
            {activeTab === 'banking' && (
              <div className="grid grid-cols-[140px_1fr_140px_1fr] border-t border-l border-[#2f77bb]"
                style={{ gridTemplateColumns: '140px 1fr 140px 1fr' }}>
                
                <div className="cell label-cell">Bank Name:</div>
                <div className="cell">
                  <input value={editData.bank_name} onChange={e => updateField('bank_name', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
                <div className="cell label-cell">Account Number:</div>
                <div className="cell">
                  <input value={editData.bank_account_number} onChange={e => updateField('bank_account_number', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>

                <div className="cell label-cell">Branch Code:</div>
                <div className="cell">
                  <input value={editData.bank_branch_code} onChange={e => updateField('bank_branch_code', e.target.value)} disabled={!isEditing && !isNewEmployee} />
                </div>
                <div className="cell label-cell">Notes:</div>
                <div className="cell" style={{ gridColumn: 'span 3' }}>
                  <textarea 
                    value={editData.notes} 
                    onChange={e => updateField('notes', e.target.value)} 
                    disabled={!isEditing && !isNewEmployee}
                    style={{ width: '100%', height: '60px', border: 'none', background: '#f7f7c2', padding: '5px', outline: 'none', resize: 'vertical' }}
                  />
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="p-5 text-center" style={{ color: isDark ? '#ccc' : '#666' }}>
                <p className="text-lg">📄 Document management for this employee</p>
                <p className="text-sm mt-2">Upload contracts, ID documents, certificates, and more</p>
                <button className="neo-btn mt-4">📤 Upload Document</button>
              </div>
            )}
          </div>

          {/* Photo Panel */}
          <div className="border border-[#2f77bb] bg-[#dce8f5] dark:bg-slate-600 flex flex-col items-center justify-center p-2.5">
            <div className="w-[150px] h-[170px] border-[3px] border-[#3569a3] bg-[#edf3f9] dark:bg-slate-500 flex items-center justify-center overflow-hidden">
              {editData.profile_photo_url ? (
                <img src={editData.profile_photo_url} alt="Employee" className="w-full h-full object-cover" />
              ) : (
                <img src="https://cdn-icons-png.flaticon.com/512/847/847969.png" alt="Default" className="w-20 h-20 opacity-50" />
              )}
            </div>

            {(isEditing || isNewEmployee) && (
              <div className="mt-2.5 flex flex-col gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[#0066cc] font-bold cursor-pointer hover:underline text-sm flex items-center gap-1"
                  disabled={uploading}
                >
                  {uploading ? '⏳ Uploading...' : '➕ Add Picture'}
                </button>
                {editData.profile_photo_url && (
                  <button 
                    onClick={() => updateField('profile_photo_url', '')}
                    className="text-red-500 font-bold cursor-pointer hover:underline text-sm"
                  >
                    ✕ Remove
                  </button>
                )}
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Bottom */}
        {(isEditing || isNewEmployee) && (
          <div className="flex gap-3 mt-3 justify-end">
            <button onClick={() => { isNewEmployee ? navigate('/hr/employees') : setIsEditing(false) }} 
              className="neo-btn" style={{ background: 'linear-gradient(to bottom,#888,#555)' }}>
              ❌ Cancel
            </button>
            <button onClick={handleSave} className="neo-btn">
              💾 {isNewEmployee ? 'Create Employee' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Neo Button Styles */}
      <style>{`
        .neo-btn {
          height: 32px;
          padding: 0 16px;
          border: none;
          border-radius: 7px;
          background: linear-gradient(to bottom, #4f8fd0, #2d5f98);
          color: white;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 3px 3px 6px rgba(0,0,0,0.35), inset 1px 1px 2px rgba(255,255,255,0.5);
          transition: 0.2s;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .neo-btn:hover {
          transform: translateY(1px);
          box-shadow: inset 3px 3px 6px rgba(0,0,0,0.3), inset -2px -2px 5px rgba(255,255,255,0.5);
        }
        .cell {
          border-right: 1px solid #2f77bb;
          border-bottom: 1px solid #2f77bb;
          min-height: 38px;
          display: flex;
          align-items: center;
          padding: 6px;
          background: #dce8f5;
        }
        .cell.label-cell {
          justify-content: flex-end;
          font-weight: bold;
          background: #d7e5f2;
        }
        .cell input, .cell select {
          width: 100%;
          border: none;
          background: #f7f7c2;
          height: 25px;
          padding: 5px;
          outline: none;
        }
        .cell input:disabled, .cell select:disabled {
          background: #e8e8e8;
          color: #666;
        }
        @media (max-width: 900px) {
          .content {
            grid-template-columns: 1fr !important;
          }
          .form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
