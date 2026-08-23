import { supabase } from '../../../lib/supabaseClient'

export const mobileApi = {
  // ============================================
  // EMPLOYEE
  // ============================================
  async getEmployee(userId) {
    let { data } = await supabase.from('employees').select('*, teams:team_id(team_name)').eq('user_id', userId).single()
    if (!data) {
      const { data: user } = await supabase.auth.getUser()
      const email = user?.user?.email
      const { data: byEmail } = await supabase.from('employees').select('*').eq('email', email).single()
      if (byEmail) {
        await supabase.from('employees').update({ user_id: userId }).eq('id', byEmail.id)
        data = byEmail
      } else {
        // ✅ Sequential employee code: NG0001, NG0002, etc.
        const { data: lastEmp } = await supabase
          .from('employees')
          .select('employee_code')
          .like('employee_code', 'NG%')
          .order('employee_code', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        let nextNum = 1
        if (lastEmp?.employee_code) {
          const match = lastEmp.employee_code.match(/NG(\d+)/)
          if (match) nextNum = parseInt(match[1]) + 1
        }
        
        const newCode = 'NG' + String(nextNum).padStart(4, '0')
        
        const { data: created } = await supabase.from('employees').insert([{
          user_id: userId, email, first_name: email?.split('@')[0] || 'Worker',
          last_name: '', employment_status: 'active', department: 'Cleaning',
          employee_code: newCode
        }]).select().single()
        data = created
      }
    }
    try {
      await supabase.rpc('log_employee_action', { p_employee_id: data?.id, p_action_type: 'mobile_login', p_description: 'Logged into mobile app', p_module: 'mobile' })
    } catch {}
    return { data }
  },

  async logAction(employeeId, actionType, description, refId = null, refType = null, lat = null, lng = null) {
    try {
      await supabase.rpc('log_employee_action', { p_employee_id: employeeId, p_action_type: actionType, p_description: description, p_module: 'mobile', p_reference_id: refId, p_reference_type: refType, p_lat: lat, p_lng: lng })
    } catch (err) {
      console.warn('logAction error (non-critical):', err.message)
    }
  },

  // ============================================
  // JOBS
  // ============================================
  async getOpenJobs() {
    // Get all available jobs
    const { data: availableJobs } = await supabase
      .from('jobs')
      .select('*')
      .in('status', ['pending', 'scheduled'])
      .order('scheduled_date')
      .limit(50)

    if (!availableJobs?.length) return { data: [] }

    // Get job IDs
    const jobIds = availableJobs.map(j => j.id)

    // Get clients separately
    const clientIds = [...new Set(availableJobs.map(j => j.client_id).filter(Boolean))]
    const { data: clients } = await supabase.from('clients').select('id, company_name, phone, city').in('id', clientIds)

    // Get categories separately
    const catIds = [...new Set(availableJobs.map(j => j.job_category_id).filter(Boolean))]
    const { data: categories } = await supabase.from('job_categories').select('id, name, color').in('id', catIds)

    // Get active assignments
    const { data: activeAssignments } = await supabase
      .from('field_job_assignments')
      .select('job_id, employee_id, assignment_status')
      .in('job_id', jobIds)
      .in('assignment_status', ['assigned', 'accepted', 'in_progress'])

    const assignedJobIds = new Set((activeAssignments || []).map(a => a.job_id))
    const trulyOpenJobs = availableJobs
      .filter(j => !assignedJobIds.has(j.id))
      .map(j => ({
        ...j,
        clients: (clients || []).find(c => c.id === j.client_id) || null,
        job_categories: (categories || []).find(c => c.id === j.job_category_id) || null
      }))

    return { data: trulyOpenJobs }
  },

  async getMyJobs(employeeId) {
    const { data: assignments } = await supabase
      .from('field_job_assignments')
      .select('job_id, assignment_status, assigned_at, started_at, completed_at')
      .eq('employee_id', employeeId)
      .in('assignment_status', ['assigned', 'accepted', 'in_progress'])
    
    if (!assignments?.length) return { data: [] }
    
    const jobIds = assignments.map(a => a.job_id).filter(Boolean)
    if (jobIds.length === 0) return { data: [] }
    
    const { data: jobs } = await supabase.from('jobs').select('*').in('id', jobIds)

    // Get clients
    const clientIds = [...new Set((jobs || []).map(j => j.client_id).filter(Boolean))]
    const { data: clients } = await supabase.from('clients').select('id, company_name, phone, city').in('id', clientIds)

    // Get categories
    const catIds = [...new Set((jobs || []).map(j => j.job_category_id).filter(Boolean))]
    const { data: categories } = await supabase.from('job_categories').select('id, name, color').in('id', catIds)
    
    const activeJobs = (jobs || [])
      .filter(j => j.status !== 'completed' && j.status !== 'cancelled')
      .map(j => ({
        ...j,
        clients: (clients || []).find(c => c.id === j.client_id) || null,
        job_categories: (categories || []).find(c => c.id === j.job_category_id) || null,
        assignment_status: assignments.find(a => a.job_id === j.id)?.assignment_status
      }))

    return { data: activeJobs }
  },

  async getCompletedJobs(employeeId) {
    const { data: assignments } = await supabase.from('field_job_assignments')
      .select('job_id, completed_at')
      .eq('employee_id', employeeId)
      .eq('assignment_status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(50)
    
    if (!assignments?.length) return { data: [] }
    
    const jobIds = assignments.map(a => a.job_id).filter(Boolean)
    const { data: jobs } = await supabase.from('jobs').select('*').in('id', jobIds)

    // Get clients
    const clientIds = [...new Set((jobs || []).map(j => j.client_id).filter(Boolean))]
    const { data: clients } = await supabase.from('clients').select('id, company_name').in('id', clientIds)

    // Get categories
    const catIds = [...new Set((jobs || []).map(j => j.job_category_id).filter(Boolean))]
    const { data: categories } = await supabase.from('job_categories').select('id, name, color').in('id', catIds)

    return { 
      data: (jobs || []).map(j => ({ 
        ...j, 
        clients: (clients || []).find(c => c.id === j.client_id) || null,
        job_categories: (categories || []).find(c => c.id === j.job_category_id) || null,
        completed_at: assignments.find(a => a.job_id === j.id)?.completed_at 
      })) 
    }
  },

  async getJobDetail(jobId) {
    const { data: job } = await supabase.from('jobs').select('*').eq('id', jobId).single()
    if (!job) return { data: null }

    // Get all related data separately
    const [clientsResult, categoriesResult, assignmentsResult, checklistsResult, photosResult, reportsResult] = await Promise.all([
      job.client_id ? supabase.from('clients').select('*').eq('id', job.client_id).single() : { data: null },
      job.job_category_id ? supabase.from('job_categories').select('*').eq('id', job.job_category_id).single() : { data: null },
      supabase.from('field_job_assignments').select('*').eq('job_id', jobId),
      supabase.from('job_checklist_items').select('*').eq('job_id', jobId),
      supabase.from('job_photos').select('*').eq('job_id', jobId),
      supabase.from('job_reports').select('*').eq('job_id', jobId)
    ])

    // Get employee names for assignments
    let assignmentsWithNames = assignmentsResult.data || []
    if (assignmentsWithNames.length > 0) {
      const empIds = [...new Set(assignmentsWithNames.map(a => a.employee_id).filter(Boolean))]
      const { data: emps } = await supabase.from('employees').select('id, first_name, last_name, phone, employee_code').in('id', empIds)
      const empMap = {}
      ;(emps || []).forEach(e => { empMap[e.id] = e })
      assignmentsWithNames = assignmentsWithNames.map(a => ({ ...a, employees: empMap[a.employee_id] || null }))
    }

    return {
      data: {
        ...job,
        clients: clientsResult.data || null,
        job_categories: categoriesResult.data || null,
        field_job_assignments: assignmentsWithNames,
        job_checklist_items: checklistsResult.data || [],
        job_photos: photosResult.data || [],
        job_reports: reportsResult.data || []
      }
    }
  },

  async selectJob(jobId, employeeId) {
    const { data: existingAssignments } = await supabase
      .from('field_job_assignments')
      .select('id, employee_id')
      .eq('job_id', jobId)
      .in('assignment_status', ['assigned', 'accepted', 'in_progress'])

    if (existingAssignments && existingAssignments.length > 0) {
      if (existingAssignments.some(a => a.employee_id === employeeId)) {
        return { success: false, error: 'You already have this job' }
      }
      return { success: false, error: 'This job is already taken by another cleaner' }
    }

    const { error: aErr } = await supabase
      .from('field_job_assignments')
      .upsert({ 
        job_id: jobId, 
        employee_id: employeeId, 
        assignment_status: 'assigned', 
        assigned_at: new Date().toISOString() 
      }, { onConflict: 'job_id,employee_id' })
    
    if (aErr) return { success: false, error: aErr.message }

    const { error: jobErr } = await supabase
      .from('jobs')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', jobId)
    
    if (jobErr) console.error('Job status update error:', jobErr)

    await mobileApi.logAction(employeeId, 'job_selected', 'Selected job', jobId, 'job')
    return { success: true }
  },

  async startJob(jobId, employeeId, lat, lng) {
    const updates = { assignment_status: 'in_progress', started_at: new Date().toISOString() }
    if (lat) { updates.check_in_latitude = lat; updates.check_in_longitude = lng; updates.check_in_time = new Date().toISOString() }
    await supabase.from('field_job_assignments').update(updates).eq('job_id', jobId).eq('employee_id', employeeId)
    await mobileApi.logAction(employeeId, 'job_started', 'Started job', jobId, 'job', lat, lng)
    return { success: true }
  },

  // ═══════════════════════════════════════════════
  // ✅ COMPLETE JOB - Links invoice to Finance
  // ═══════════════════════════════════════════════
  async completeJob(jobId, employeeId, lat, lng) {
    console.log('🔄 Completing job:', jobId, 'Employee:', employeeId)
    
    // 1. Update assignment to completed
    const { error: assignError } = await supabase
      .from('field_job_assignments')
      .update({
        assignment_status: 'completed',
        completed_at: new Date().toISOString(),
        check_out_time: new Date().toISOString(),
        check_out_latitude: lat,
        check_out_longitude: lng
      })
      .eq('job_id', jobId)
      .eq('employee_id', employeeId)

    if (assignError) return { success: false, error: assignError.message }

    // 2. Get job details
    const { data: job, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (fetchError) return { success: false, error: fetchError.message }

    // Get client info separately
    let clientInfo = null
    if (job.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('company_name, email, phone, address_line1, city')
        .eq('id', job.client_id)
        .single()
      clientInfo = client
    }

    // 3. Mark job as completed
    const { error: jobError } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        actual_end_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completion_notes: `Completed via mobile on ${new Date().toLocaleString()}`
      })
      .eq('id', jobId)

    if (jobError) return { success: false, error: jobError.message }

    // 4. ✅ CREATE INVOICE AND LINK TO JOB
    let invoiceId = null
    if (job && job.quoted_amount && job.quoted_amount > 0) {
      const invoiceResult = await mobileApi.createInvoiceForJob(job, clientInfo)
      
      if (invoiceResult.success && invoiceResult.invoice) {
        invoiceId = invoiceResult.invoice.id
        
        // ✅ LINK INVOICE TO JOB
        const { error: linkError } = await supabase
          .from('jobs')
          .update({ invoice_id: invoiceId, updated_at: new Date().toISOString() })
          .eq('id', jobId)
        
        if (linkError) {
          console.warn('⚠️ Failed to link invoice to job:', linkError.message)
        } else {
          console.log('✅ Invoice linked to job:', invoiceResult.invoice.invoice_number)
        }
      }
    }

    // 5. Log action
    await mobileApi.logAction(employeeId, 'job_completed', `Completed ${job?.job_number || jobId}`, jobId, 'job', lat, lng)

    return { success: true, job: { ...job, invoice_id: invoiceId } }
  },

  // ═══════════════════════════════════════════════
  // ✅ CREATE INVOICE - Properly linked with job_id
  // ═══════════════════════════════════════════════
  async createInvoiceForJob(job, clientInfo = null) {
    console.log('📄 Creating invoice for:', job?.job_number)
    
    try {
      const yr = new Date().getFullYear().toString().slice(-2)
      const num = String(Math.floor(Math.random() * 99999)).padStart(5, '0')
      const invoiceNumber = `INV-${yr}${num}`

      const amount = parseFloat((job.quoted_amount || 0).toFixed(2))
      const taxRate = 15
      const taxAmount = parseFloat((amount * (taxRate / 100)).toFixed(2))
      const totalAmount = parseFloat((amount + taxAmount).toFixed(2))

      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoiceNumber,
          job_id: job.id,
          client_id: job.client_id || null,
          client_name: clientInfo?.company_name || job.client_name || 'Client',
          client_email: clientInfo?.email || '',
          client_phone: clientInfo?.phone || '',
          client_address: clientInfo?.address_line1 || job.site_address || '',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          subtotal: amount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          amount_paid: 0,
          status: 'sent',
          notes: `Job: ${job.job_number} - ${job.title || 'Cleaning Service'}`
        }])
        .select()
        .single()

      if (error) {
        console.error('❌ Invoice insert error:', error.message)
        return { success: false, error: error.message }
      }

      console.log('✅ Invoice created:', invoice?.invoice_number, 'Amount: R', totalAmount)

      // Insert invoice item
      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert([{
          invoice_id: invoice.id,
          item_number: 1,
          description: `${job.title || 'Cleaning Service'}`,
          quantity: 1,
          unit: 'service',
          unit_price: amount,
          tax_percent: taxRate,
          total_price: amount
        }])

      if (itemError) console.error('❌ Invoice item error:', itemError.message)

      // Update quotation if exists
      if (job.quotation_id) {
        await supabase.from('quotations').update({
          status: 'converted', converted_to_invoice: true, invoice_id: invoice.id
        }).eq('id', job.quotation_id)
      }

      return { success: true, invoice }
    } catch (err) {
      console.error('❌ Invoice exception:', err)
      return { success: false, error: err.message }
    }
  },

  // ============================================
  // ATTENDANCE
  // ============================================
  async clockIn(employeeId, lat, lng) {
    const today = new Date().toISOString().split('T')[0]
    const record = { employee_id: employeeId, attendance_date: today, clock_in_time: new Date().toISOString(), check_in_method: lat ? 'gps' : 'mobile_app', status: 'present' }
    if (lat) { record.check_in_latitude = lat; record.check_in_longitude = lng }
    const { data: existing } = await supabase.from('attendance_records').select('id').eq('employee_id', employeeId).eq('attendance_date', today).maybeSingle()
    if (existing) { await supabase.from('attendance_records').update(record).eq('id', existing.id) }
    else { await supabase.from('attendance_records').insert([record]) }
    await mobileApi.logAction(employeeId, 'clock_in', 'Clocked in', null, null, lat, lng)
    return { success: true }
  },

  async clockOut(employeeId, lat, lng) {
    const today = new Date().toISOString().split('T')[0]
    const record = { clock_out_time: new Date().toISOString(), check_out_method: lat ? 'gps' : 'mobile_app' }
    if (lat) { record.check_out_latitude = lat; record.check_out_longitude = lng }
    await supabase.from('attendance_records').update(record).eq('employee_id', employeeId).eq('attendance_date', today)
    await mobileApi.logAction(employeeId, 'clock_out', 'Clocked out', null, null, lat, lng)
    return { success: true }
  },

  async getTodayAttendance(employeeId) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('attendance_records').select('*').eq('employee_id', employeeId).eq('attendance_date', today).maybeSingle()
    return { data }
  },

  async getWeeklyAttendance(employeeId) {
    const now = new Date()
    const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1); start.setHours(0, 0, 0, 0)
    const end = new Date(now); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
    const { data } = await supabase.from('attendance_records').select('*').eq('employee_id', employeeId).gte('attendance_date', start.toISOString().split('T')[0]).lte('attendance_date', end.toISOString().split('T')[0]).order('attendance_date')
    return { data: data || [] }
  },

  // ============================================
  // PHOTOS
  // ============================================
  async uploadPhoto(jobId, employeeId, file, type, caption) {
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const fileName = `${jobId}/${type}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('job-photos').upload(fileName, file, { cacheControl: '3600', upsert: true, contentType: file.type || 'image/jpeg' })
      if (uploadError) return { error: uploadError.message || 'Upload failed' }
      const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(fileName)
      const publicUrl = urlData?.publicUrl
      if (!publicUrl) return { error: 'Failed to get public URL' }
      const { data, error: dbError } = await supabase.from('job_photos').insert([{ job_id: jobId, employee_id: employeeId, photo_type: type, photo_url: publicUrl, caption: caption || '' }]).select().single()
      if (dbError) return { error: dbError.message }
      await mobileApi.logAction(employeeId, 'photo_uploaded', `Uploaded ${type} photo`, jobId, 'job')
      return { data, error: null }
    } catch (err) { return { error: err.message || 'Upload failed' } }
  },

  // ============================================
  // INCIDENT
  // ============================================
  async reportIncident(data) {
    const { data: result, error } = await supabase.from('incidents').insert([data]).select().single()
    if (!error) await mobileApi.logAction(data.employee_id, 'incident_reported', `Reported incident: ${data.title}`, result?.id, 'incident')
    return { data: result, error }
  },

  // ============================================
  // JOB REPORT
  // ============================================
  async saveJobReport(reportData) {
    const { data, error } = await supabase.from('job_reports').upsert(reportData, { onConflict: 'job_id,employee_id' }).select().single()
    if (!error) await mobileApi.logAction(reportData.employee_id, 'report_saved', 'Saved job report', reportData.job_id, 'job')
    return { data, error }
  },

  async getJobReport(jobId, employeeId) {
    const { data } = await supabase.from('job_reports').select('*').eq('job_id', jobId).eq('employee_id', employeeId).maybeSingle()
    return { data }
  },

  // ============================================
  // LEAVE
  // ============================================
  async getLeaveRequests(employeeId) {
    const { data } = await supabase.from('leave_requests').select('*, leave_types(name)').eq('employee_id', employeeId).order('created_at', { ascending: false })
    return { data: data || [] }
  },

  async getLeaveTypes() {
    const { data } = await supabase.from('leave_types').select('*').eq('is_active', true).order('sort_order')
    return { data: data || [] }
  },

  async getLeaveBalances(employeeId) {
    const year = new Date().getFullYear()
    const { data } = await supabase.from('leave_balances').select('*, leave_types(name, days_per_year, color)').eq('employee_id', employeeId).eq('year', year)
    return { data: data || [] }
  },

  async applyLeave(leaveData) {
    if (leaveData.leave_type_id) {
      const { data: lt } = await supabase.from('leave_types').select('id').eq('id', leaveData.leave_type_id).single()
      if (!lt) {
        const { data: byName } = await supabase.from('leave_types').select('id').eq('name', leaveData.leave_type_id).single()
        if (byName) leaveData.leave_type_id = byName.id
      }
    }
    const { data, error } = await supabase.from('leave_requests').insert([leaveData]).select('*, leave_types(name)').single()
    if (!error && data) await mobileApi.logAction(leaveData.employee_id, 'leave_applied', 'Applied for leave: ' + (data.leave_types?.name || ''), data.id, 'leave')
    return { data, error }
  },

  // ============================================
  // MESSAGES
  // ============================================
  async getMessages(userId) {
    const { data: directMessages } = await supabase.from('messages').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }).limit(50)
    const { data: myConversations } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', userId)
    const convIds = (myConversations || []).map(p => p.conversation_id)
    let conversationMessages = []
    if (convIds.length > 0) {
      const { data: convMsgs } = await supabase.from('messages').select('*').in('conversation_id', convIds).order('created_at', { ascending: false }).limit(50)
      conversationMessages = convMsgs || []
    }
    const allMessages = [...(directMessages || []), ...conversationMessages]
    const uniqueMessages = allMessages.filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)
    const userIds = [...new Set(uniqueMessages.flatMap(m => [m.sender_id, m.receiver_id].filter(Boolean)))]
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds)
    const nameMap = {}; (profiles || []).forEach(p => { nameMap[p.id] = p.full_name || 'Unknown' })
    return { data: uniqueMessages.map(m => ({ ...m, sender_name: nameMap[m.sender_id] || m.sender_name || 'Unknown', receiver_name: nameMap[m.receiver_id] || 'Unknown' })) }
  },

  async sendMessage(messageData) {
    const payload = { sender_id: messageData.sender_id, sender_name: messageData.sender_name || 'User', content: messageData.content || messageData.message || '', message: messageData.content || messageData.message || '', message_type: messageData.message_type || 'text' }
    if (messageData.conversation_id) payload.conversation_id = messageData.conversation_id
    if (messageData.receiver_id) payload.receiver_id = messageData.receiver_id
    const { data, error } = await supabase.from('messages').insert([payload]).select().single()
    return { data, error }
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================
  async getNotifications(userId) {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
    return { data: data || [] }
  },

  // ============================================
  // PROFILE
  // ============================================
  async getEmployeeProfile(employeeId) {
    const { data } = await supabase.from('employees').select('*, teams:team_id(team_name)').eq('id', employeeId).single()
    return { data }
  },

  async getEmployeeAuditLog(employeeId) {
    const { data } = await supabase.from('employee_audit_log').select('*').eq('employee_id', employeeId).order('created_at', { ascending: false }).limit(50)
    return { data: data || [] }
  },

  // ============================================
  // INVENTORY BARCODE SCANNING
  // ============================================
  async searchInventoryByBarcode(barcode) {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, name, item_code, barcode, unit, current_stock, unit_cost')
      .or(`barcode.eq."${barcode}",item_code.eq."${barcode}"`)
      .maybeSingle()
    return { data, error }
  },

  async recordInventoryUsage(jobId, employeeId, inventoryItemId, quantity, notes = '') {
    try {
      const { data: item, error: itemError } = await supabase
        .from('inventory_items')
        .select('id, name, item_code, barcode, current_stock, unit, unit_cost')
        .eq('id', inventoryItemId)
        .single()

      if (itemError) return { success: false, error: itemError.message }
      if (!item) return { success: false, error: 'Item not found' }
      if (item.current_stock < quantity) return { success: false, error: `Not enough stock. Available: ${item.current_stock}` }

      const { data: userData } = await supabase.auth.getUser()

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          item_id: inventoryItemId,
          movement_type: 'job_usage',
          quantity: -quantity,
          unit_cost: item.unit_cost || 0,
          reference_type: 'job',
          reference_id: jobId,
          job_id: jobId,
          performed_by: userData?.user?.id || null,
          movement_date: new Date().toISOString().split('T')[0],
          status: 'completed',
          notes: notes || 'Scanned out for job'
        }])

      if (movementError) return { success: false, error: movementError.message }

      const newStock = parseFloat(item.current_stock) - quantity
      await supabase.from('inventory_items').update({ current_stock: newStock, updated_at: new Date().toISOString() }).eq('id', inventoryItemId)

      try {
        await supabase.from('job_supplies_used').insert([{
          job_id: jobId, supply_id: inventoryItemId, quantity_used: quantity,
          used_by: userData?.user?.id || null, used_at: new Date().toISOString(),
          notes: notes || 'Barcode scan out'
        }])
      } catch (suppliesError) { console.warn('Supplies log error:', suppliesError) }

      await mobileApi.logAction(employeeId, 'inventory_scanned', `Scanned out ${quantity} x ${item.name}`, jobId, 'job')
      return { success: true, item, quantity }
    } catch (error) {
      return { success: false, error: error.message || 'Unexpected error' }
    }
  },

  async getJobInventoryUsage(jobId) {
    const { data, error } = await supabase
      .from('job_supplies_used')
      .select('*, inventory_items(name, unit, item_code)')
      .eq('job_id', jobId)
      .order('used_at', { ascending: false })
    return { data, error }
  },

  // ============================================
  // STATS
  // ============================================
  async getMobileStats(employeeId) {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1); weekStart.setHours(0, 0, 0, 0)
    const [{ data: myJobs }, { data: todayAttendance }, { data: weeklyAttendance }, { data: completedToday }] = await Promise.all([
      mobileApi.getMyJobs(employeeId), mobileApi.getTodayAttendance(employeeId), mobileApi.getWeeklyAttendance(employeeId),
      supabase.from('field_job_assignments').select('id, completed_at').eq('employee_id', employeeId).eq('assignment_status', 'completed').gte('completed_at', `${today}T00:00:00`).lte('completed_at', `${today}T23:59:59`)
    ])
    const totalWeekMs = (weeklyAttendance || []).reduce((sum, a) => {
      if (a.clock_in_time && a.clock_out_time) return sum + (new Date(a.clock_out_time) - new Date(a.clock_in_time))
      return sum
    }, 0)
    return {
      myJobsCount: myJobs?.length || 0, weeklyHours: Math.round((totalWeekMs / 3600000) * 10) / 10,
      completedToday: completedToday?.length || 0, isClockedIn: !!todayAttendance?.clock_in_time && !todayAttendance?.clock_out_time,
      clockInTime: todayAttendance?.clock_in_time || null, clockOutTime: todayAttendance?.clock_out_time || null
    }
  },

  async getKPIData(employeeId) {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const [{ data: completedToday }, { data: completedMonth }, { data: allCompleted }] = await Promise.all([
      supabase.from('field_job_assignments').select('id').eq('employee_id', employeeId).eq('assignment_status', 'completed').gte('completed_at', `${today}T00:00:00`),
      supabase.from('field_job_assignments').select('id').eq('employee_id', employeeId).eq('assignment_status', 'completed').gte('completed_at', `${monthStart}T00:00:00`),
      supabase.from('field_job_assignments').select('id').eq('employee_id', employeeId).eq('assignment_status', 'completed')
    ])
    return {
      completedToday: completedToday?.length || 0,
      completedMonth: completedMonth?.length || 0,
      totalCompleted: allCompleted?.length || 0
    }
  }
}
