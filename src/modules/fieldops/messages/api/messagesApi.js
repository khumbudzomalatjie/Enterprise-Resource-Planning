import { supabase } from '../../../../lib/supabaseClient'

export const messagesApi = {
  // ============================================
  // CONVERSATIONS
  // ============================================
  async getConversations() {
    const { data, error } = await supabase
      .from('conversations')
      .select('*, conversation_participants(*, profiles:user_id(full_name, email, role)), last_message_by_user:last_message_by(full_name)')
      .order('last_message_at', { ascending: false })
    return { data, error }
  },

  async getOrCreateDirectConversation(otherUserId) {
    const currentUser = (await supabase.auth.getUser()).data.user
    if (!currentUser) return { error: 'Not authenticated' }

    // Check if direct conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('*, conversation_participants!inner(*)')
      .eq('conversation_type', 'direct')
      .eq('conversation_participants.user_id', currentUser.id)
    
    const existingConv = existing?.find(conv => 
      conv.conversation_participants.some(p => p.user_id === otherUserId)
    )
    if (existingConv) return { data: existingConv }

    // Create new direct conversation
    const { data: conv, error } = await supabase
      .from('conversations')
      .insert([{ conversation_type: 'direct', created_by: currentUser.id }])
      .select().single()
    if (error) return { error }

    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: currentUser.id },
      { conversation_id: conv.id, user_id: otherUserId }
    ])
    return { data: conv }
  },

  // ============================================
  // MESSAGES
  // ============================================
  async getMessages(conversationId, limit = 50) {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:sender_id(full_name, email, role), reactions:message_reactions(*), read_by:message_read_status(*)')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data: data?.reverse(), error }
  },

  async sendMessage(messageData) {
    const { data, error } = await supabase
      .from('messages')
      .insert([messageData])
      .select('*, sender:sender_id(full_name, email)')
      .single()
    
    if (!error) {
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', messageData.conversation_id)
        .neq('user_id', messageData.sender_id)

      if (participants?.length) {
        await supabase.from('notifications').insert(participants.map(p => ({
          user_id: p.user_id,
          notification_type: 'message',
          title: 'New Message',
          body: messageData.content?.substring(0, 100),
          link_url: `/fieldops/messages`,
          metadata: { conversation_id: messageData.conversation_id, sender_id: messageData.sender_id }
        })))
      }
    }
    return { data, error }
  },

  async deleteMessage(id) {
    const { error } = await supabase.from('messages').update({ is_deleted: true }).eq('id', id)
    return { error }
  },

  async addReaction(messageId, reaction) {
    const user = (await supabase.auth.getUser()).data.user
    const { data, error } = await supabase
      .from('message_reactions')
      .upsert([{ message_id: messageId, user_id: user.id, reaction }], { onConflict: 'message_id,user_id,reaction' })
      .select().single()
    return { data, error }
  },

  // ============================================
  // CONTACTS - EMPLOYEE DIRECTORY
  // ============================================
  async getContacts() {
    try {
      // Try the RPC function first
      const { data, error } = await supabase.rpc('get_all_contacts')
      
      if (!error && data && data.length > 0) {
        console.log('Contacts loaded via RPC:', data.length)
        return { data, error: null }
      }

      // Fallback: Query employees directly
      const { data: employees } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, phone, department, position, profile_photo_url, employment_status, employee_code, user_id')
        .neq('employment_status', 'terminated')
        .order('department')
        .order('first_name')

      if (employees?.length) {
        const contacts = employees.map(emp => ({
          id: emp.user_id || emp.id,
          contact_type: 'employee',
          full_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unnamed',
          email: emp.email || '',
          phone: emp.phone || '',
          department: emp.department || 'Unassigned',
          position: emp.position || 'Staff',
          profile_photo_url: emp.profile_photo_url || null,
          role: 'employee',
          is_active: emp.employment_status === 'active',
          is_online: false,
          employee_code: emp.employee_code || '',
          last_login: null
        }))
        console.log('Contacts loaded from employees table:', contacts.length)
        return { data: contacts, error: null }
      }

      // Last resort: Get from profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')

      if (profiles?.length) {
        const contacts = profiles.map(p => ({
          id: p.id,
          contact_type: 'user',
          full_name: p.full_name || p.email || 'Unknown',
          email: p.email || '',
          phone: '',
          department: 'Management',
          position: p.role || 'Staff',
          profile_photo_url: null,
          role: p.role || 'customer',
          is_active: p.is_active !== false,
          is_online: false,
          employee_code: '',
          last_login: p.last_login
        }))
        console.log('Contacts loaded from profiles:', contacts.length)
        return { data: contacts, error: null }
      }

      return { data: [], error: null }
    } catch (e) {
      console.error('Error loading contacts:', e)
      return { data: [], error: null }
    }
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================
  async getNotifications(limit = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  async getUnreadCount() {
    try {
      const user = (await supabase.auth.getUser()).data.user
      const { data } = await supabase.rpc('get_unread_count', { p_user_id: user.id })
      return data || 0
    } catch { return 0 }
  },

  async markNotificationRead(id) {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
  },

  async markAllNotificationsRead() {
    const user = (await supabase.auth.getUser()).data.user
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', user.id).eq('is_read', false)
  }
}
