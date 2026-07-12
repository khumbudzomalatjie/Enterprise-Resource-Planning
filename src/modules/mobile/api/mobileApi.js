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
        const { data: created } = await supabase.from('employees').insert([{
          user_id: userId, email, first_name: email?.split('@')[0] || 'Worker',
          last_name: '', employment_status: 'active', department: 'Cleaning',
          employee_code: 'MOB-' + Date.now().toString(36).toUpperCase().slice(-4)
        }]).select().single()
        data = created
      }
    }
    await supabase.rpc('log_employee_action', { p_employee_id: data?.id, p_action_type: 'mobile_login', p_description: 'Logged into mobile app', p_module: 'mobile' })
    return { data }
  },

  async logAction(employeeId, actionType, description, refId = null, refType = null, lat = null, lng = null) {
    await supabase.rpc('log_employee_action', { p_employee_id: employeeId, p_action_type: actionType, p_description: description, p_module: 'mobile', p_reference_id: refId, p_reference_type: refType, p_lat: lat, p_lng: lng })
  },

  // ============================================
  // JOBS
  // ============================================
  async getOpenJobs() {
    const { data } = await supabase.from('jobs').select('*, clients(company_name, phone, city), job_categories(name, color)').in('status', ['pending', 'scheduled']).order('scheduled_date').limit(50)
    return { data: data || [] }
  },

  async getMyJobs(employeeId) {
    const { data: assignments } = await supabase.from('field_job_assignments').select('job_id, assignment_status, assigned_at, started_at, completed_at').eq('employee_id', employeeId).in('assignment_status', ['assigned', 'accepted', 'in_progress'])
    if (!assignments?.length) return { data: [] }
    const jobIds = assignments.map(a => a.job_id).filter(Boolean)
    if (jobIds.length === 0) return { data: [] }
    const { data: jobs } = await supabase.from('jobs').select('*, clients(company_name, phone, city), job_categories(name, color)').in('id', jobIds)
    const activeJobs = (jobs || []).filter(j => j.status !== 'completed' && j.status !== 'cancelled')
    return { data: activeJobs.map(j => ({ ...j, assignment_status: assignments.find(a => a.job_id === j.id)?.assignment_status })) }
  },

  async getCompletedJobs(employeeId) {
    const { data: assignments } = await supabase.from('field_job_assignments').select('job_id, completed_at').eq('employee_id', employeeId).eq('assignment_status', 'completed').order('completed_at', { ascending: false }).limit(50)
    if (!assignments?.length) return { data: [] }
    const jobIds = assignments.map(a => a.job_id)
    const { data: jobs } = await supabase.from('jobs').select('*, clients(company_name), job_categories(name, color)').in('id', jobIds)
    return { data: (jobs || []).map(j => ({ ...j, completed_at: assignments.find(a => a.job_id === j.id)?.completed_at })) }
  },

  async getJobDetail(jobId) {
    const { data } = await supabase.from('jobs').select('*, clients(*), job_categories(*), field_job_assignments(*, employees(first_name, last_name, phone, employee_code)), job_checklist_items(*), job_photos(*), job_reports(*)').eq('id', jobId).single()
    return { data }
  },

  async selectJob(jobId, employeeId) {
    const { error: aErr } = await supabase.from('field_job_assignments').upsert({ job_id: jobId, employee_id: employeeId, assignment_status: 'assigned', assigned_at: new Date().toISOString() }, { onConflict: 'job_id,employee_id' })
    if (aErr) return { success: false, error: aErr.message }
    await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', jobId)
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
  // COMPLETE JOB - Marks done + creates invoice for finance
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

    if (assignError) {
      console.error('❌ Assignment error:', assignError)
      return { success: false, error: assignError.message }
    }
    console.log('✅ Assignment updated')

    // 2. Get job details
    const { data: job, error: fetchError } = await supabase
      .from('jobs')
      .select('*, clients(company_name, client_code, email), job_categories(name)')
      .eq('id', jobId)
      .single()

    if (fetchError) {
      console.error('❌ Fetch job error:', fetchError)
      return { success: false, error: fetchError.message }
    }

    console.log('📋 Job:', job?.job_number, 'Amount:', job?.quoted_amount)

    // 3. Update job status to completed
    const { error: jobError } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        actual_end_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completion_notes: `Completed via mobile on ${new Date().toLocaleString()}`
      })
      .eq('id', jobId)

    if (jobError) {
      console.error('❌ Job update error:', jobError)
      return { success: false, error: jobError.message }
    }
    console.log('✅ Job marked as completed')

    // 4. Create invoice for finance if job has value
    if (job && job.quoted_amount && job.quoted_amount > 0) {
      const invoiceResult = await mobileApi.createInvoiceForJob(job)
      console.log('📄 Invoice result:', invoiceResult.success ? 'Created: ' + invoiceResult.invoice?.invoice_number : 'Failed: ' + invoiceResult.error)
    } else {
      console.log('ℹ️ No invoice needed - zero amount')
    }

    // 5. Log action
    await mobileApi.logAction(employeeId, 'job_completed', `Completed ${job?.job_number || jobId}`, jobId, 'job', lat, lng)

    return { success: true, job }
  },

  // ═══════════════════════════════════════════════
  // CREATE INVOICE FOR FINANCE
  // ═══════════════════════════════════════════════
  async createInvoiceForJob(job) {
    console.log('📄 Creating invoice for:', job?.job_number)
    
    try {
      const yr = new Date().getFullYear().toString().slice(-2)
      const num = String(Math.floor(Math.random() * 99999)).padStart(5, '0')
      const invoiceNumber = `INV-${yr}${num}`

      const amount = parseFloat((job.quoted_amount || 0).toFixed(2))
      const taxRate = 15
      const taxAmount = parseFloat((amount * (taxRate / 100)).toFixed(2))
      const totalAmount = parseFloat((amount + taxAmount).toFixed(2))

      // Create invoice record
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoiceNumber,
          client_id: job.client_id,
          client_name: job.clients?.company_name || 'Client',
          client_email: job.clients?.email || '',
          client_address: job.site_address || '',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          subtotal: amount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total_amount: totalAmount,
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

      // Create invoice line item
      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert([{
          invoice_id: invoice.id,
          item_number: 1,
          description: `${job.job_categories?.name || 'Cleaning Service'}: ${job.title || job.job_number}`,
          quantity: 1,
          unit: 'service',
          unit_price: amount,
          tax_percent: taxRate
        }])

      if (itemError) {
        console.error('❌ Invoice item error:', itemError.message)
      }

      // Update quotation if exists
      if (job.quotation_id) {
        await supabase
          .from('quotations')
          .update({
            status: 'converted',
            converted_to_invoice: true,
            invoice_id: invoice.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.quotation_id)
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
      if (!error) await mobileApi.logAction(employeeId, 'photo_uploaded', `Uploaded ${type} photo`, jobId, 'job')
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

  async uploadLeaveAttachment(leaveRequestId, employeeId, file) {
    const ext = file.name.split('.').pop()
    const path = `leave/${employeeId}/${leaveRequestId}-${Date.now()}.${ext}`
    try { await supabase.storage.createBucket('leave-attachments', { public: true, fileSizeLimit: 10485760 }) } catch {}
    const { error: upErr } = await supabase.storage.from('leave-attachments').upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) return { error: upErr.message }
    const { data: { publicUrl } } = supabase.storage.from('leave-attachments').getPublicUrl(path)
    const { data, error } = await supabase.from('leave_requests').update({ attachment_url: publicUrl, attachment_name: file.name, attachment_type: file.type, attachment_size: file.size }).eq('id', leaveRequestId).select().single()
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

  async getConversations(userId) {
    const { data: participations } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', userId)
    const convIds = (participations || []).map(p => p.conversation_id)
    if (convIds.length === 0) {
      const { data: messages } = await supabase.from('messages').select('sender_id, receiver_id').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).limit(100)
      const otherUserIds = [...new Set((messages || []).flatMap(m => [m.sender_id, m.receiver_id]).filter(id => id !== userId))]
      if (otherUserIds.length === 0) return { data: [] }
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, role').in('id', otherUserIds)
      return { data: (profiles || []).map(p => ({ id: p.id, display_name: p.full_name, role: p.role, is_direct: true })) }
    }
    const { data: conversations } = await supabase.from('conversations').select('*').in('id', convIds)
    const enriched = await Promise.all((conversations || []).map(async (conv) => {
      const { data: participants } = await supabase.from('conversation_participants').select('user_id').eq('conversation_id', conv.id).neq('user_id', userId)
      const ids = (participants || []).map(p => p.user_id)
      const { data: profiles } = await supabase.from('profiles').select('full_name').in('id', ids)
      const names = (profiles || []).map(p => p.full_name).join(', ')
      const { data: lastMsg } = await supabase.from('messages').select('content, created_at').eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      return { ...conv, display_name: names || conv.title, last_message: lastMsg?.content?.substring(0, 60), last_time: lastMsg?.created_at }
    }))
    return { data: enriched }
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
  // STATS
  // ============================================
  async getMobileStats(employeeId) {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1); weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(now); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59, 999)
    const [{ data: myJobs }, { data: todayAttendance }, { data: weeklyAttendance }, { data: completedToday }, { data: notifications }] = await Promise.all([
      mobileApi.getMyJobs(employeeId), mobileApi.getTodayAttendance(employeeId), mobileApi.getWeeklyAttendance(employeeId),
      supabase.from('field_job_assignments').select('id, completed_at').eq('employee_id', employeeId).eq('assignment_status', 'completed').gte('completed_at', `${today}T00:00:00`).lte('completed_at', `${today}T23:59:59`),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', employeeId).eq('is_read', false)
    ])
    const totalWeekMs = (weeklyAttendance || []).reduce((sum, a) => {
      if (a.clock_in_time && a.clock_out_time) return sum + (new Date(a.clock_out_time) - new Date(a.clock_in_time))
      return sum
    }, 0)
    return {
      myJobsCount: myJobs?.length || 0, weeklyHours: Math.round((totalWeekMs / 3600000) * 10) / 10,
      completedToday: completedToday?.length || 0, isClockedIn: !!todayAttendance?.clock_in_time && !todayAttendance?.clock_out_time,
      clockInTime: todayAttendance?.clock_in_time || null, clockOutTime: todayAttendance?.clock_out_time || null,
      unreadNotifications: notifications?.count || 0
    }
  },

  async getKPIData(employeeId) {
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1); weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    const [{ data: completedToday }, { data: completedWeek }, { data: completedMonth }, { data: completedYear }, { data: allCompleted }] = await Promise.all([
      supabase.from('field_job_assignments').select('id').eq('employee_id', employeeId).eq('assignment_status', 'completed').gte('completed_at', `${today}T00:00:00`),
      supabase.from('field_job_assignments').select('id').eq('employee_id', employeeId).eq('assignment_status', 'completed').gte('completed_at', weekStart.toISOString()),
      supabase.from('field_job_assignments').select('id').eq('employee_id', employeeId).eq('assignment_status', 'completed').gte('completed_at', `${monthStart}T00:00:00`),
      supabase.from('field_job_assignments').select('id').eq('employee_id', employeeId).eq('assignment_status', 'completed').gte('completed_at', `${yearStart}T00:00:00`),
      supabase.from('field_job_assignments').select('id').eq('employee_id', employeeId).eq('assignment_status', 'completed')
    ])
    return {
      completedToday: completedToday?.length || 0, completedWeek: completedWeek?.length || 0,
      completedMonth: completedMonth?.length || 0, completedYear: completedYear?.length || 0,
      totalCompleted: allCompleted?.length || 0,
      avgPerDay: allCompleted?.length > 0 ? Math.round((allCompleted.length / Math.max(1, Math.ceil((now - new Date(yearStart)) / 86400000))) * 10) / 10 : 0
    }
  }
}
