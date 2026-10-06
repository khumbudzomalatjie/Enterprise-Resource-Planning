import { supabase } from './supabaseClient'

// ═══════════════════════════════════════════════
// USER ADMIN API
// Centralizes all writes to public.profiles for admin purposes.
// ═══════════════════════════════════════════════
export const userAdminApi = {
  // ---------------------------------------------------------------
  // LIST
  // ---------------------------------------------------------------
  async listUsers({ includeDeleted = false } = {}) {
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    const { data, error } = await query
    return { data: data || [], error }
  },

  // ---------------------------------------------------------------
  // ACTIVATE / DEACTIVATE
  // ---------------------------------------------------------------
  async setActive(userId, isActive) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId)
    return { success: !error, error }
  },

  // ---------------------------------------------------------------
  // ROLE
  // ---------------------------------------------------------------
  async setRole(userId, role) {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
    return { success: !error, error }
  },

  // ---------------------------------------------------------------
  // CUSTOMIZE WHAT A USER SEES (hides)
  // hidden_modules: array of route paths to hide, e.g. ['/workflow']
  // ---------------------------------------------------------------
  async setHiddenModules(userId, hiddenModules) {
    const { error } = await supabase
      .from('profiles')
      .update({ hidden_modules: hiddenModules || [] })
      .eq('id', userId)
    return { success: !error, error }
  },

  // ---------------------------------------------------------------
  // EXTRA MODULE GRANTS
  // Array of route paths to allow on top of the user's role.
  // Example: give a cleaner access to /inventory
  // ---------------------------------------------------------------
  async setExtraModules(userId, extraModules) {
    const { error } = await supabase
      .from('profiles')
      .update({ extra_modules: extraModules || [] })
      .eq('id', userId)
    return { success: !error, error }
  },

  // ---------------------------------------------------------------
  // SOFT DELETE — hides user, blocks login, keeps the row
  // ---------------------------------------------------------------
  async softDelete(userId) {
    const { error } = await supabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false
      })
      .eq('id', userId)
    return { success: !error, error }
  },

  // ---------------------------------------------------------------
  // RESTORE a soft-deleted user
  // ---------------------------------------------------------------
  async restore(userId) {
    const { error } = await supabase
      .from('profiles')
      .update({
        deleted_at: null,
        is_active: true
      })
      .eq('id', userId)
    return { success: !error, error }
  },

  // ---------------------------------------------------------------
  // HARD DELETE — requires the Edge Function "admin-user-ops"
  // ---------------------------------------------------------------
  async hardDelete(userId) {
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-ops', {
        body: { action: 'delete', userId }
      })
      if (error) {
        return {
          success: false,
          error: error.message,
          hint: 'Deploy the "admin-user-ops" Edge Function or use soft delete instead.'
        }
      }
      return { success: true, data }
    } catch (err) {
      return {
        success: false,
        error: err.message,
        hint: 'Edge Function not reachable. Use soft delete instead.'
      }
    }
  }
}
