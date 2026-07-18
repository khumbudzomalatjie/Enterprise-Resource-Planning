import { supabase } from '../../../lib/supabaseClient'

export const aiApi = {
  async getQuickPrompts(role) {
    const { data, error } = await supabase
      .from('ai_quick_prompts')
      .select('*')
      .eq('is_active', true)
      .contains('roles', [role])
      .order('sort_order')
    return { data, error }
  },

  async getChatHistory(userId, limit = 50) {
    const { data, error } = await supabase
      .from('ai_chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit)
    return { data, error }
  },

  async saveChatMessage(messageData) {
    const { data, error } = await supabase
      .from('ai_chat_history')
      .insert([messageData])
      .select()
      .single()
    return { data, error }
  },

  async getInsights(limit = 20) {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  async markInsightRead(insightId) {
    const { error } = await supabase
      .from('ai_insights')
      .update({ is_read: true })
      .eq('id', insightId)
    return { error }
  },

  async getUnreadInsightsCount() {
    const { count, error } = await supabase
      .from('ai_insights')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
    return { count: count || 0, error }
  },

  async clearChatHistory(userId) {
    const { error } = await supabase
      .from('ai_chat_history')
      .delete()
      .eq('user_id', userId)
    return { error }
  }
}
