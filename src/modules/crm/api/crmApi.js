import { supabase } from '../../../lib/supabaseClient'

/**
 * Helper function: Convert empty/undefined values to null
 * PostgreSQL requires null for empty UUID, date, numeric fields
 */
const cleanValue = (value, type = 'string') => {
  if (value === '' || value === undefined || value === null || value === 'undefined' || value === 'null') {
    return null
  }

  if (type === 'number') {
    const num = Number(value)
    return isNaN(num) ? null : num
  }

  if (type === 'boolean') {
    return value === true || value === 'true' || value === 1
  }

  return value
}

/**
 * Helper function: Clean an object for database insert/update
 * Removes empty strings for UUID, date, and numeric fields
 */
const cleanObjectForDb = (data) => {
  const cleaned = {}

  const textFields = [
    'client_code', 'company_name', 'trading_name', 'registration_number',
    'tax_number', 'vat_number', 'industry', 'website',
    'first_name', 'last_name', 'gender', 'nationality', 'id_number',
    'contact_full_name', 'contact_position', 'contact_mobile', 'contact_email',
    'email', 'phone', 'mobile', 'alternative_phone', 'whatsapp_number',
    'preferred_contact_method', 'address_line1', 'address_line2',
    'city', 'state', 'postal_code', 'country', 'postal_address',
    'occupation', 'employer', 'work_address', 'work_phone',
    'payment_terms', 'preferred_payment_method', 'currency',
    'billing_cycle', 'billing_address', 'bank_name', 'bank_account_number',
    'bank_branch_code', 'lead_source', 'pipeline_stage',
    'accounts_contact', 'hr_contact', 'technical_contact', 'support_contact',
    'products_purchased', 'services_subscribed', 'support_package',
    'sla_details', 'notes', 'tags', 'client_type', 'client_status', 'client_rating'
  ]

  const dateFields = [
    'date_of_birth', 'contract_start_date', 'contract_end_date',
    'renewal_date', 'acquired_date'
  ]

  const numericFields = [
    'credit_limit', 'estimated_value', 'contract_value', 'annual_revenue'
  ]

  const uuidFields = [
    'assigned_to', 'account_manager_id', 'created_by'
  ]

  const booleanFields = ['tax_exempt']

  textFields.forEach(field => {
    if (data[field] !== undefined && data[field] !== null) {
      cleaned[field] = data[field]
    }
  })

  dateFields.forEach(field => {
    const value = data[field]
    if (value && value !== '' && value !== null && value !== undefined) {
      cleaned[field] = value
    }
  })

  numericFields.forEach(field => {
    const value = data[field]
    if (value !== undefined && value !== null && value !== '') {
      const num = Number(value)
      if (!isNaN(num)) {
        cleaned[field] = num
      }
    }
  })

  uuidFields.forEach(field => {
    const value = data[field]
    if (value && value !== '' && value !== null && value !== undefined) {
      cleaned[field] = value
    }
  })

  booleanFields.forEach(field => {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      cleaned[field] = data[field] === true || data[field] === 'true' || data[field] === 1
    }
  })

  return cleaned
}

export const crmApi = {
  // ============================================
  // CLIENTS
  // ============================================
  async getClients(filters = {}) {
    let query = supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    // ✅ Status handling:
    //   - explicit status (e.g. 'active', 'former', 'prospect') → filter to that status
    //   - no status / 'all' → HIDE soft-deleted ('former') clients by default
    //   This means a soft-deleted client disappears from the main list
    //   but can still be found by selecting "Former" in the status dropdown.
    if (filters.status && filters.status !== 'all') {
      query = query.eq('client_status', filters.status)
    } else {
      query = query.neq('client_status', 'former')
    }

    if (filters.type && filters.type !== 'all') query = query.eq('client_type', filters.type)
    if (filters.search) {
      query = query.or(`company_name.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error('getClients error:', error)
      return { data: [], error }
    }
    return { data: data || [], error: null }
  },

  async getClient(id) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async createClient(clientData) {
    console.log('API createClient - raw data:', JSON.stringify(clientData, null, 2))

    const cleanData = cleanObjectForDb(clientData)

    console.log('API createClient - cleaned data:', JSON.stringify(cleanData, null, 2))

    const { data, error } = await supabase
      .from('clients')
      .insert([cleanData])
      .select('*')
      .single()

    if (error) {
      console.error('API createClient error:', error.message)
      console.error('Error code:', error.code)
      console.error('Error details:', error.details)
      return { data: null, error }
    }

    console.log('API createClient success:', data?.id)
    return { data, error: null }
  },

  async updateClient(id, updates) {
    console.log('API updateClient - raw updates:', JSON.stringify(updates, null, 2))

    const cleanUpdates = cleanObjectForDb(updates)

    cleanUpdates.updated_at = new Date().toISOString()

    console.log('API updateClient - cleaned updates:', JSON.stringify(cleanUpdates, null, 2))

    const { data, error } = await supabase
      .from('clients')
      .update(cleanUpdates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('API updateClient error:', error.message)
      console.error('Error code:', error.code)
      console.error('Error details:', error.details)
      return { data: null, error }
    }

    console.log('API updateClient success:', data?.id)
    return { data, error: null }
  },

  async deleteClient(id) {
    // Soft delete — consistent with ClientList's remove flow.
    const { error } = await supabase
      .from('clients')
      .update({ client_status: 'former', updated_at: new Date().toISOString() })
      .eq('id', id)
    return { error }
  },

  // ============================================
  // CONTACTS
  // ============================================
  async getContacts(clientId = null) {
    let query = supabase
      .from('client_contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)

    const { data, error } = await query
    return { data: data || [], error }
  },

  async createContact(contactData) {
    const cleanData = { ...contactData }
    if (!cleanData.client_id || cleanData.client_id === '') delete cleanData.client_id
    if (!cleanData.birthday || cleanData.birthday === '') delete cleanData.birthday

    const { data, error } = await supabase
      .from('client_contacts')
      .insert([cleanData])
      .select('*')
      .single()
    return { data, error }
  },

  async updateContact(id, updates) {
    const cleanUpdates = { ...updates }
    if (cleanUpdates.birthday === '') delete cleanUpdates.birthday

    const { data, error } = await supabase
      .from('client_contacts')
      .update(cleanUpdates)
      .eq('id', id)
      .select('*')
      .single()
    return { data, error }
  },

  // ============================================
  // INTERACTIONS
  // ============================================
  async getInteractions(clientId = null) {
    let query = supabase
      .from('client_interactions')
      .select('*')
      .order('scheduled_date', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)

    const { data, error } = await query
    return { data: data || [], error }
  },

  async createInteraction(interactionData) {
    const cleanData = { ...interactionData }
    ['client_id', 'contact_id', 'attended_by', 'created_by'].forEach(field => {
      if (!cleanData[field] || cleanData[field] === '') delete cleanData[field]
    })
    ['scheduled_date', 'completed_date', 'follow_up_date'].forEach(field => {
      if (cleanData[field] === '' || cleanData[field] === null) delete cleanData[field]
    })

    const { data, error } = await supabase
      .from('client_interactions')
      .insert([cleanData])
      .select('*')
      .single()
    return { data, error }
  },

  // ============================================
  // SERVICES
  // ============================================
  async getServiceTypes() {
    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('is_active', true)
      .order('name')
    return { data: data || [], error }
  },

  async getClientServices(clientId = null) {
    let query = supabase
      .from('client_services')
      .select('*')
      .order('created_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)

    const { data, error } = await query
    return { data: data || [], error }
  },

  async createClientService(serviceData) {
    const cleanData = { ...serviceData }
    ['client_id', 'service_type_id', 'created_by'].forEach(field => {
      if (!cleanData[field] || cleanData[field] === '') delete cleanData[field]
    })
    ['start_date', 'end_date'].forEach(field => {
      if (cleanData[field] === '' || cleanData[field] === null) delete cleanData[field]
    })
    ['price', 'square_meters', 'number_of_cleaners', 'frequency_per_week'].forEach(field => {
      if (cleanData[field] !== undefined && cleanData[field] !== null && cleanData[field] !== '') {
        cleanData[field] = Number(cleanData[field])
      }
    })

    const { data, error } = await supabase
      .from('client_services')
      .insert([cleanData])
      .select('*')
      .single()
    return { data, error }
  },

  // ============================================
  // PIPELINE
  // ============================================
  async getPipeline(filters = {}) {
    let query = supabase
      .from('sales_pipeline')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters.stage && filters.stage !== 'all') query = query.eq('stage', filters.stage)
    if (filters.client_id) query = query.eq('client_id', filters.client_id)

    const { data, error } = await query
    return { data: data || [], error }
  },

  async createPipelineItem(itemData) {
    const cleanData = { ...itemData }
    ['client_id', 'assigned_to', 'created_by'].forEach(field => {
      if (!cleanData[field] || cleanData[field] === '') delete cleanData[field]
    })
    ['expected_close_date', 'actual_close_date'].forEach(field => {
      if (cleanData[field] === '' || cleanData[field] === null) delete cleanData[field]
    })
    ['estimated_value', 'actual_value', 'probability_percentage'].forEach(field => {
      if (cleanData[field] !== undefined && cleanData[field] !== null && cleanData[field] !== '') {
        cleanData[field] = Number(cleanData[field])
      }
    })

    const { data, error } = await supabase
      .from('sales_pipeline')
      .insert([cleanData])
      .select('*')
      .single()
    return { data, error }
  },

  async updatePipelineItem(id, updates) {
    const cleanUpdates = { ...updates }
    ['expected_close_date', 'actual_close_date'].forEach(field => {
      if (cleanUpdates[field] === '') delete cleanUpdates[field]
    })

    const { data, error } = await supabase
      .from('sales_pipeline')
      .update(cleanUpdates)
      .eq('id', id)
      .select('*')
      .single()
    return { data, error }
  },

  // ============================================
  // FEEDBACK
  // ============================================
  async getFeedback(clientId = null) {
    let query = supabase
      .from('client_feedback')
      .select('*')
      .order('created_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)

    const { data, error } = await query
    return { data: data || [], error }
  },

  async createFeedback(feedbackData) {
    const cleanData = { ...feedbackData }
    ['client_id', 'resolved_by'].forEach(field => {
      if (!cleanData[field] || cleanData[field] === '') delete cleanData[field]
    })
    if (cleanData.rating !== undefined && cleanData.rating !== null && cleanData.rating !== '') {
      cleanData.rating = Number(cleanData.rating)
    }

    const { data, error } = await supabase
      .from('client_feedback')
      .insert([cleanData])
      .select('*')
      .single()
    return { data, error }
  },

  // ============================================
  // DOCUMENTS
  // ============================================
  async getDocuments(clientId = null) {
    let query = supabase
      .from('client_documents')
      .select('*')
      .order('created_at', { ascending: false })

    if (clientId) query = query.eq('client_id', clientId)

    const { data, error } = await query
    return { data: data || [], error }
  },

  // ============================================
  // DASHBOARD STATS
  // ✅ Excludes soft-deleted (former) clients
  // ============================================
  async getCRMStats() {
    try {
      const { count: totalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .neq('client_status', 'former')

      const { count: activeClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('client_status', 'active')

      const { data: recentClients } = await supabase
        .from('clients')
        .select('*')
        .neq('client_status', 'former')
        .order('created_at', { ascending: false })
        .limit(5)

      return {
        totalClients: totalClients || 0,
        activeClients: activeClients || 0,
        recentClients: recentClients || []
      }
    } catch (error) {
      console.error('getCRMStats error:', error)
      return { totalClients: 0, activeClients: 0, recentClients: [] }
    }
  }
}
