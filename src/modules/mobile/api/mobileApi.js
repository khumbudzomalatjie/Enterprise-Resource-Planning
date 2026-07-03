import { supabase } from '../../../lib/supabaseClient'

export const mobileApi = {
  // Get open jobs
  getOpenJobs: async () => {
    const { data, error } = await supabase.from('jobs').select('*, clients(company_name), job_categories(name, color)').in('status', ['pending', 'scheduled']).order('scheduled_date').limit(50)
    return { data, error }
  },

  // Get my jobs
  getMyJobs: async (employeeId) => {
    if (!employeeId) return { data: [] }
    const { data: assignments } = await supabase.from('field_job_assignments').select('job_id, assignment_status').eq('employee_id', employeeId).in('assignment_status', ['assigned', 'accepted', 'in_progress'])
    if (!assignments?.length) return { data: [] }
    const jobIds = assignments.map(a => a.job_id)
    const { data: jobs } = await supabase.from('jobs').select('*, clients(company_name), job_categories(name, color)').in('id', jobIds).eq('status', 'in_progress')
    return { data: (jobs || []).map(j => ({ ...j, assignment_status: assignments.find(a => a.job_id === j.id)?.assignment_status })) }
  },

  // Select job - Direct write
  selectJob: async (jobId, employeeId) => {
    // 1. Insert/update assignment
    const { error: assignError } = await supabase.from('field_job_assignments').upsert({
      job_id: jobId, employee_id: employeeId,
      assignment_status: 'assigned',
      assigned_at: new Date().toISOString()
    }, { onConflict: 'job_id,employee_id' })
    
    if (assignError) {
      console.error('Select error:', assignError)
      return { success: false, error: assignError.message }
    }

    // 2. Update job status
    const { error: jobError } = await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', jobId)
    
    if (jobError) {
      console.error('Job update error:', jobError)
      return { success: false, error: jobError.message }
    }

    return { success: true }
  },

  // Start job
  startJob: async (jobId, employeeId) => {
    const { error } = await supabase.from('field_job_assignments').update({
      assignment_status: 'in_progress',
      started_at: new Date().toISOString()
    }).eq('job_id', jobId).eq('employee_id', employeeId)
    
    if (error) {
      console.error('Start error:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  },

  // Complete job
  completeJob: async (jobId, employeeId) => {
    // 1. Update assignment
    const { error: assignError } = await supabase.from('field_job_assignments').update({
      assignment_status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('job_id', jobId).eq('employee_id', employeeId)
    
    if (assignError) {
      console.error('Complete assign error:', assignError)
      return { success: false, error: assignError.message }
    }

    // 2. Update job status
    const { error: jobError } = await supabase.from('jobs').update({ status: 'completed' }).eq('id', jobId)
    
    if (jobError) {
      console.error('Complete job error:', jobError)
      return { success: false, error: jobError.message }
    }

    return { success: true }
  },

  // Upload photo
  uploadPhoto: async (jobId, employeeId, file, type, caption) => {
    const fileName = `jobs/${jobId}/${type}-${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage.from('job-photos').upload(fileName, file)
    if (uploadError) return { error: uploadError.message }
    const { data: { publicUrl } } = supabase.storage.from('job-photos').getPublicUrl(fileName)
    const { error } = await supabase.from('job_photos').insert({ job_id: jobId, employee_id: employeeId, photo_type: type, photo_url: publicUrl, caption })
    return { success: !error, error: error?.message }
  },

  // Get profile
  getMyProfile: async (userId) => {
    const { data } = await supabase.from('employees').select('*').eq('user_id', userId).single()
    return { data }
  }
}
