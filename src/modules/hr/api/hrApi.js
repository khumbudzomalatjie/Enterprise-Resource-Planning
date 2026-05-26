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
    const { data, error } = await supabase
      .from('employees')
      .select('*, contracts(*), leave_requests(*), training_records(*), disciplinary_records(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createEmployee(employeeData) {
    const { data, error } = await supabase
      .from('employees')
      .insert([employeeData])
      .select()
      .single()
    return { data, error }
  },

  async updateEmployee(id, updates) {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async deleteEmployee(id) {
    const { error } = await supabase
      .from('employees')
      .update({ employment_status: 'terminated', date_of_termination: new Date().toISOString().split('T')[0] })
      .eq('id', id)
    return { error }
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
      .order('name')
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
  // PERFORMANCE REVIEWS
  // ============================================

  async getPerformanceReviews(employeeId = null) {
    let query = supabase
      .from('performance_reviews')
      .select('*, employees(first_name, last_name)')
      .order('review_date', { ascending: false })

    if (employeeId) query = query.eq('employee_id', employeeId)

    const { data, error } = await query
    return { data, error }
  },

  async createPerformanceReview(reviewData) {
    const { data, error } = await supabase
      .from('performance_reviews')
      .insert([reviewData])
      .select()
      .single()
    return { data, error }
  },

  async updatePerformanceReview(id, updates) {
    const { data, error } = await supabase
      .from('performance_reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // ============================================
  // STORAGE FUNCTIONS - PHOTO UPLOAD
  // ============================================

  async uploadEmployeePhoto(employeeId, file) {
    try {
      if (!employeeId) {
        console.error('No employee ID provided')
        return { error: { message: 'Employee ID is required' } }
      }
      
      if (!file) {
        console.error('No file provided')
        return { error: { message: 'No file provided' } }
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        console.error('Invalid file type:', file.type)
        return { error: { message: `Invalid file type: ${file.type}. Only JPG, PNG, GIF, WebP allowed.` } }
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        console.error('File too large:', file.size)
        return { error: { message: 'File too large. Maximum size is 5MB.' } }
      }

      // Clean filename
      const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const cleanFileName = `photo_${Date.now()}.${fileExt}`
      const filePath = `${employeeId}/${cleanFileName}`
      
      console.log('Uploading photo:', {
        bucket: 'employee-photos',
        path: filePath,
        type: file.type,
        size: `${(file.size / 1024).toFixed(1)} KB`
      })
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('employee-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        })

      if (error) {
        console.error('Photo upload error:', error.message, error)
        
        if (error.message.includes('bucket') || error.message.includes('not found')) {
          return { error: { message: 'Storage bucket "employee-photos" not found. Please create it in Supabase Storage dashboard.' } }
        }
        if (error.message.includes('policy') || error.message.includes('permission')) {
          return { error: { message: 'Permission denied. Check storage RLS policies for employee-photos bucket.' } }
        }
        if (error.message.includes('duplicate')) {
          return { error: { message: 'A file with this name already exists.' } }
        }
        
        return { error: { message: `Upload failed: ${error.message}` } }
      }

      console.log('Photo uploaded successfully:', data)
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(filePath)
      
      const publicUrl = urlData?.publicUrl
      console.log('Public URL:', publicUrl)
      
      if (!publicUrl) {
        return { error: { message: 'Failed to get public URL for uploaded photo' } }
      }
      
      // Update employee record with photo URL
      const { error: updateError } = await supabase
        .from('employees')
        .update({ profile_photo_url: publicUrl })
        .eq('id', employeeId)

      if (updateError) {
        console.error('Failed to update employee record:', updateError)
        return { 
          data: { path: filePath, url: publicUrl }, 
          error: null,
          warning: 'Photo uploaded but profile record update failed' 
        }
      }

      return { data: { path: filePath, url: publicUrl }, error: null }
      
    } catch (err) {
      console.error('Unexpected error in uploadEmployeePhoto:', err)
      return { error: { message: err.message || 'Unknown error during photo upload' } }
    }
  },

  // ============================================
  // STORAGE FUNCTIONS - DOCUMENT UPLOAD
  // ============================================

  async uploadEmployeeDocument(employeeId, file) {
    try {
      if (!employeeId) {
        console.error('No employee ID provided')
        return { error: { message: 'Employee ID is required' } }
      }
      
      if (!file) {
        console.error('No file provided')
        return { error: { message: 'No file provided' } }
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        console.error('File too large:', file.size)
        return { error: { message: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.` } }
      }

      // Clean filename - remove special characters
      const timestamp = Date.now()
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${employeeId}/${timestamp}_${safeFileName}`
      
      console.log('Uploading document:', {
        bucket: 'employee-documents',
        path: filePath,
        type: file.type,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        originalName: file.name
      })
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream'
        })

      if (error) {
        console.error('Document upload error:', error.message, error)
        
        if (error.message.includes('bucket') || error.message.includes('not found')) {
          return { error: { message: 'Storage bucket "employee-documents" not found. Please create it in Supabase Storage dashboard.' } }
        }
        if (error.message.includes('policy') || error.message.includes('permission')) {
          return { error: { message: 'Permission denied. Check storage RLS policies for employee-documents bucket.' } }
        }
        if (error.message.includes('duplicate')) {
          return { error: { message: 'A file with this name already exists.' } }
        }
        
        return { error: { message: `Upload failed: ${error.message}` } }
      }

      console.log('Document uploaded successfully:', data)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(filePath)
      
      const publicUrl = urlData?.publicUrl
      
      if (!publicUrl) {
        return { error: { message: 'Failed to get public URL for uploaded document' } }
      }
      
      // Get current user for uploaded_by
      const { data: { user } } = await supabase.auth.getUser()
      
      // Create document record in database
      const { data: docData, error: docError } = await supabase
        .from('employee_documents')
        .insert([{
          employee_id: employeeId,
          document_type: 'other',
          document_name: file.name,
          document_url: publicUrl,
          uploaded_by: user?.id
        }])
        .select()
        .single()

      if (docError) {
        console.error('Failed to create document record:', docError)
        return { 
          data: { url: publicUrl, document_name: file.name, path: filePath }, 
          error: null,
          warning: 'File uploaded but database record creation failed' 
        }
      }

      return { data: { ...docData, url: publicUrl }, error: null }
      
    } catch (err) {
      console.error('Unexpected error in uploadEmployeeDocument:', err)
      return { error: { message: err.message || 'Unknown error during document upload' } }
    }
  },

  // ============================================
  // STORAGE FUNCTIONS - GET / DELETE
  // ============================================

  async getEmployeeDocuments(employeeId) {
    const { data, error } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', employeeId)
      .order('uploaded_at', { ascending: false })

    return { data, error }
  },

  async deleteEmployeeDocument(documentId) {
    try {
      // First get the document to find the storage path
      const { data: doc, error: fetchError } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (fetchError) {
        console.error('Document not found:', fetchError)
        return { error: fetchError }
      }
      
      if (!doc) {
        return { error: { message: 'Document not found' } }
      }

      // Extract storage path from URL
      const url = doc.document_url
      if (url) {
        const urlParts = url.split('/')
        const bucketIndex = urlParts.indexOf('employee-documents')
        
        if (bucketIndex !== -1) {
          const storagePath = urlParts.slice(bucketIndex + 1).join('/')
          
          console.log('Deleting from storage:', storagePath)
          
          // Delete from storage
          const { error: storageError } = await supabase.storage
            .from('employee-documents')
            .remove([storagePath])
            
          if (storageError) {
            console.error('Failed to delete from storage:', storageError)
            // Continue to delete the database record even if storage delete fails
          }
        }
      }

      // Delete record from database
      const { error } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', documentId)

      if (error) {
        console.error('Failed to delete document record:', error)
        return { error }
      }

      return { error: null }
      
    } catch (err) {
      console.error('Error deleting document:', err)
      return { error: { message: err.message } }
    }
  },

  async getDocumentForView(documentId) {
    const { data: doc, error } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error) return { error }
    return { data: doc, error: null }
  },

  // ============================================
  // DASHBOARD STATS
  // ============================================

  async getHRStats() {
    try {
      const [
        { count: totalEmployees },
        { count: activeEmployees },
        { count: pendingLeave },
        { count: activeContracts },
        { count: ongoingTraining },
        { count: disciplinaryCases }
      ] = await Promise.all([
        supabase.from('employees').select('*', { count: 'exact', head: true }),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active'),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('training_records').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('disciplinary_records').select('*', { count: 'exact', head: true }),
      ])

      return {
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        pendingLeave: pendingLeave || 0,
        activeContracts: activeContracts || 0,
        ongoingTraining: ongoingTraining || 0,
        disciplinaryCases: disciplinaryCases || 0,
      }
    } catch (error) {
      console.error('Error fetching HR stats:', error)
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        pendingLeave: 0,
        activeContracts: 0,
        ongoingTraining: 0,
        disciplinaryCases: 0,
      }
    }
  },

  // ============================================
  // BULK OPERATIONS
  // ============================================

  async bulkUpdateEmployeeStatus(employeeIds, status) {
    const { data, error } = await supabase
      .from('employees')
      .update({ employment_status: status })
      .in('id', employeeIds)
      .select()

    return { data, error }
  },

  async getEmployeesByDepartment() {
    const { data, error } = await supabase
      .from('employees')
      .select('department, count')
      .not('department', 'is', null)
      .order('department')

    return { data, error }
  },

  async searchEmployees(query) {
    const { data, error } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_code, email, position, department')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,employee_code.ilike.%${query}%`)
      .limit(20)

    return { data, error }
  },
}
