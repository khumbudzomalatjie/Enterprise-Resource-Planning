import { supabase } from '../../../lib/supabaseClient'

export const hrApi = {
  // ============================================
  // EMPLOYEE CRUD
  // ============================================

  async getEmployees(filters = {}) {
    let query = supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.department) query = query.eq('department', filters.department)
    if (filters.status) query = query.eq('employment_status', filters.status)
    if (filters.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }
    if (filters.limit) query = query.limit(filters.limit)

    const { data, error } = await query
    return { data, error }
  },

  async getEmployee(id) {
    // Fetch employee without joins to avoid missing table errors
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) return { data: null, error }
    if (!employee) return { data: null, error: { message: 'Employee not found' } }

    // Try to fetch related data separately (won't break if tables don't exist)
    let contracts = [], leaveRequests = [], leaveBalances = [], trainingRecords = [], disciplinaryRecords = [], attendanceRecords = [], auditLog = []

    try {
      const { data: c } = await supabase.from('contracts').select('*').eq('employee_id', id).order('created_at', { ascending: false })
      contracts = c || []
    } catch (e) {}

    try {
      const { data: l } = await supabase.from('leave_requests').select('*, leave_types(name)').eq('employee_id', id).order('created_at', { ascending: false })
      leaveRequests = l || []
    } catch (e) {}

    try {
      const year = new Date().getFullYear()
      const { data: lb } = await supabase.from('leave_balances').select('*, leave_types(name, color, icon, days_per_year)').eq('employee_id', id).eq('year', year)
      leaveBalances = lb || []
    } catch (e) {}

    try {
      const { data: t } = await supabase.from('training_records').select('*').eq('employee_id', id).order('created_at', { ascending: false })
      trainingRecords = t || []
    } catch (e) {}

    try {
      const { data: d } = await supabase.from('disciplinary_records').select('*').eq('employee_id', id).order('created_at', { ascending: false })
      disciplinaryRecords = d || []
    } catch (e) {}

    try {
      const { data: a } = await supabase.from('attendance_records').select('*').eq('employee_id', id).order('attendance_date', { ascending: false }).limit(30)
      attendanceRecords = a || []
    } catch (e) {}

    try {
      const { data: al } = await supabase.from('employee_audit_log').select('*').eq('employee_id', id).order('created_at', { ascending: false }).limit(50)
      auditLog = al || []
    } catch (e) {}

    return {
      data: {
        ...employee,
        contracts,
        leave_requests: leaveRequests,
        leave_balances: leaveBalances,
        training_records: trainingRecords,
        disciplinary_records: disciplinaryRecords,
        attendance_records: attendanceRecords,
        audit_log: auditLog
      },
      error: null
    }
  },

  async createEmployee(employeeData) {
    // Only include fields that exist in the employees table
    const safeData = {
      first_name: employeeData.first_name,
      last_name: employeeData.last_name,
      email: employeeData.email,
      phone: employeeData.phone || null,
      alternative_phone: employeeData.alternative_phone || null,
      address_line1: employeeData.address_line1 || null,
      address_line2: employeeData.address_line2 || null,
      city: employeeData.city || null,
      state: employeeData.state || null,
      postal_code: employeeData.postal_code || null,
      department: employeeData.department || null,
      position: employeeData.position || null,
      employment_type: employeeData.employment_type || 'full_time',
      employment_status: employeeData.employment_status || 'active',
      date_of_hire: employeeData.date_of_hire || null,
      date_of_birth: employeeData.date_of_birth || null,
      gender: employeeData.gender || null,
      marital_status: employeeData.marital_status || null,
      id_number: employeeData.id_number || null,
      tax_number: employeeData.tax_number || null,
      bank_name: employeeData.bank_name || null,
      bank_account_number: employeeData.bank_account_number || null,
      bank_branch_code: employeeData.bank_branch_code || null,
      emergency_contact_name: employeeData.emergency_contact_name || null,
      emergency_contact_phone: employeeData.emergency_contact_phone || null,
      emergency_contact_relation: employeeData.emergency_contact_relation || null,
      notes: employeeData.notes || null,
      profile_photo_url: employeeData.profile_photo_url || null
    }

    const { data, error } = await supabase
      .from('employees')
      .insert([safeData])
      .select()
      .single()
    
    // Note: Leave balances are auto-created by PostgreSQL trigger
    
    return { data, error }
  },

  async updateEmployee(id, updates) {
    // Only include allowed fields that exist in the employees table
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'alternative_phone',
      'address_line1', 'address_line2', 'city', 'state', 'postal_code',
      'department', 'position', 'employment_type', 'employment_status',
      'date_of_hire', 'date_of_birth', 'gender', 'marital_status',
      'id_number', 'tax_number', 'bank_name', 'bank_account_number',
      'bank_branch_code', 'emergency_contact_name', 'emergency_contact_phone',
      'emergency_contact_relation', 'notes', 'profile_photo_url',
      'date_of_termination', 'termination_reason'
    ]

    const safeUpdates = { updated_at: new Date().toISOString() }
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field] || null
      }
    })

    const { data, error } = await supabase
      .from('employees')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteEmployee(id) {
    const { error } = await supabase
      .from('employees')
      .update({ 
        employment_status: 'terminated', 
        date_of_termination: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    return { error }
  },

  async bulkUpdateEmployeeStatus(employeeIds, status) {
    const { data, error } = await supabase.from('employees').update({ employment_status: status }).in('id', employeeIds).select()
    return { data, error }
  },

  async searchEmployees(query) {
    const { data, error } = await supabase.from('employees').select('id, first_name, last_name, employee_code, email, position, department').or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,employee_code.ilike.%${query}%`).limit(20)
    return { data, error }
  },

  // ============================================
  // CONTRACTS
  // ============================================

  async getContracts(employeeId = null) {
    let query = supabase
      .from('contracts')
      .select('*, employees(first_name, last_name, employee_code)')
      .order('created_at', { ascending: false })

    if (employeeId) query = query.eq('employee_id', employeeId)

    const { data, error } = await query
    return { data, error }
  },

  async createContract(contractData) {
    const { data, error } = await supabase
      .from('contracts')
      .insert([contractData])
      .select()
      .single()
    return { data, error }
  },

  async updateContract(id, updates) {
    const { data, error } = await supabase
      .from('contracts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // LEAVE MANAGEMENT
  // ============================================

  async getLeaveRequests(filters = {}) {
    let query = supabase
      .from('leave_requests')
      .select('*, employees(first_name, last_name, employee_code), leave_types(name)')
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
    if (filters.limit) query = query.limit(filters.limit)

    const { data, error } = await query
    return { data, error }
  },

  async createLeaveRequest(requestData) {
    const { data, error } = await supabase
      .from('leave_requests')
      .insert([requestData])
      .select()
      .single()
    return { data, error }
  },

  async updateLeaveRequest(id, updates) {
    const { data, error } = await supabase
      .from('leave_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async getLeaveTypes() {
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .order('sort_order')
    return { data, error }
  },

  async getEmployeeLeaveBalances(employeeId) {
    const year = new Date().getFullYear()
    const { data, error } = await supabase
      .from('leave_balances')
      .select('*, leave_types(name, color, icon, days_per_year)')
      .eq('employee_id', employeeId)
      .eq('year', year)
      .order('created_at')
    return { data, error }
  },

  async updateLeaveBalance(id, updates) {
    const { data, error } = await supabase
      .from('leave_balances')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // TRAINING RECORDS
  // ============================================

  async getTrainingRecords(employeeId = null) {
    let query = supabase
      .from('training_records')
      .select('*, employees(first_name, last_name)')
      .order('created_at', { ascending: false })

    if (employeeId) query = query.eq('employee_id', employeeId)

    const { data, error } = await query
    return { data, error }
  },

  async createTrainingRecord(trainingData) {
    const { data, error } = await supabase
      .from('training_records')
      .insert([trainingData])
      .select()
      .single()
    return { data, error }
  },

  async updateTrainingRecord(id, updates) {
    const { data, error } = await supabase
      .from('training_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // DISCIPLINARY RECORDS
  // ============================================

  async getDisciplinaryRecords(employeeId = null) {
    let query = supabase
      .from('disciplinary_records')
      .select('*, employees(first_name, last_name)')
      .order('created_at', { ascending: false })

    if (employeeId) query = query.eq('employee_id', employeeId)

    const { data, error } = await query
    return { data, error }
  },

  async createDisciplinaryRecord(recordData) {
    const { data, error } = await supabase
      .from('disciplinary_records')
      .insert([recordData])
      .select()
      .single()
    return { data, error }
  },

  async updateDisciplinaryRecord(id, updates) {
    const { data, error } = await supabase
      .from('disciplinary_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // ATTENDANCE RECORDS
  // ============================================

  async getEmployeeAttendance(employeeId, filters = {}) {
    let query = supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .order('attendance_date', { ascending: false })

    if (filters.date_from) query = query.gte('attendance_date', filters.date_from)
    if (filters.date_to) query = query.lte('attendance_date', filters.date_to)
    if (filters.limit) query = query.limit(filters.limit)

    const { data, error } = await query
    return { data, error }
  },

  // ============================================
  // STORAGE FUNCTIONS - PHOTO UPLOAD
  // ============================================

  async uploadEmployeePhoto(employeeId, file) {
    try {
      if (!employeeId || !file) return { error: { message: 'Employee ID and file are required' } }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
      if (!allowedTypes.includes(file.type)) return { error: { message: 'Invalid file type' } }
      if (file.size > 5 * 1024 * 1024) return { error: { message: 'File too large. Max 5MB.' } }

      const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const filePath = `${employeeId}/photo_${Date.now()}.${fileExt}`
      
      const { error } = await supabase.storage.from('employee-photos').upload(filePath, file, { cacheControl: '3600', upsert: true, contentType: file.type })
      if (error) return { error: { message: error.message } }

      const { data: urlData } = supabase.storage.from('employee-photos').getPublicUrl(filePath)
      const publicUrl = urlData?.publicUrl
      if (!publicUrl) return { error: { message: 'Failed to get public URL' } }
      
      await supabase.from('employees').update({ profile_photo_url: publicUrl }).eq('id', employeeId)
      return { data: { url: publicUrl }, error: null }
    } catch (err) {
      return { error: { message: err.message } }
    }
  },

  async uploadEmployeeDocument(employeeId, file) {
    try {
      if (!employeeId || !file) return { error: { message: 'Required data missing' } }
      if (file.size > 10 * 1024 * 1024) return { error: { message: 'File too large. Max 10MB.' } }

      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${employeeId}/${Date.now()}_${safeFileName}`
      
      const { error } = await supabase.storage.from('employee-documents').upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'application/octet-stream' })
      if (error) return { error: { message: error.message } }

      const { data: urlData } = supabase.storage.from('employee-documents').getPublicUrl(filePath)
      const publicUrl = urlData?.publicUrl
      if (!publicUrl) return { error: { message: 'Failed to get public URL' } }
      
      const { data: { user } } = await supabase.auth.getUser()
      const { data: docData, error: docError } = await supabase.from('employee_documents').insert([{
        employee_id: employeeId, document_type: 'other', document_name: file.name, document_url: publicUrl, uploaded_by: user?.id
      }]).select().single()

      return { data: { ...docData, url: publicUrl }, error: docError }
    } catch (err) {
      return { error: { message: err.message } }
    }
  },

  async getEmployeeDocuments(employeeId) {
    const { data, error } = await supabase.from('employee_documents').select('*').eq('employee_id', employeeId).order('uploaded_at', { ascending: false })
    return { data, error }
  },

  async deleteEmployeeDocument(documentId) {
    try {
      const { data: doc } = await supabase.from('employee_documents').select('*').eq('id', documentId).single()
      if (!doc) return { error: { message: 'Document not found' } }
      if (doc.document_url) {
        const urlParts = doc.document_url.split('/')
        const bucketIndex = urlParts.indexOf('employee-documents')
        if (bucketIndex !== -1) await supabase.storage.from('employee-documents').remove([urlParts.slice(bucketIndex + 1).join('/')])
      }
      const { error } = await supabase.from('employee_documents').delete().eq('id', documentId)
      return { error }
    } catch (err) {
      return { error: { message: err.message } }
    }
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================

  async getHRStats() {
    try {
      const [
        { count: totalEmployees }, { count: activeEmployees }, { count: pendingLeave },
        { count: activeContracts }, { count: ongoingTraining }, { count: disciplinaryCases }
      ] = await Promise.all([
        supabase.from('employees').select('*', { count: 'exact', head: true }),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active'),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('training_records').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('disciplinary_records').select('*', { count: 'exact', head: true }),
      ])
      return { totalEmployees: totalEmployees || 0, activeEmployees: activeEmployees || 0, pendingLeave: pendingLeave || 0, activeContracts: activeContracts || 0, ongoingTraining: ongoingTraining || 0, disciplinaryCases: disciplinaryCases || 0 }
    } catch (error) {
      return { totalEmployees: 0, activeEmployees: 0, pendingLeave: 0, activeContracts: 0, ongoingTraining: 0, disciplinaryCases: 0 }
    }
  },
}
