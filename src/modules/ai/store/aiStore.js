import { create } from 'zustand'
import { supabase } from '../../../lib/supabaseClient'
import { aiEngine } from '../utils/aiEngine'

const useAIStore = create((set, get) => ({
  isOpen: false,
  messages: [],
  sessionId: null,
  loading: false,
  quickPrompts: [],
  insights: [],
  unreadInsights: 0,

  toggleChat: () => set(state => ({ isOpen: !state.isOpen })),

  initSession: async (userId) => {
    const sessionId = `session-${userId}-${Date.now()}`
    set({ sessionId, messages: [] })
    
    // Load quick prompts
    const { data: prompts } = await supabase.from('ai_quick_prompts').select('*').eq('is_active', true).order('sort_order')
    set({ quickPrompts: prompts || [] })

    // Load recent insights
    const { data: insights } = await supabase.from('ai_insights').select('*').order('created_at', { ascending: false }).limit(10)
    const { count: unread } = await supabase.from('ai_insights').select('*', { count: 'exact', head: true }).eq('is_read', false)
    set({ insights: insights || [], unreadInsights: unread || 0 })

    // Welcome message
    set(state => ({
      messages: [{
        id: 'welcome',
        role: 'assistant',
        message: "🤖 **Hello! I'm your ERP AI Assistant.**\n\nI can analyze incidents, optimize schedules, predict maintenance, check inventory, and more!\n\nType your question or use a quick prompt below.",
        created_at: new Date().toISOString()
      }]
    }))
  },

  sendMessage: async (message, userContext) => {
    const { sessionId, messages } = get()
    if (!message.trim()) return

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      message,
      created_at: new Date().toISOString()
    }

    set({ messages: [...messages, userMsg], loading: true })

    // Save to history
    await supabase.from('ai_chat_history').insert([{
      user_id: userContext.userId,
      session_id: sessionId,
      role: 'user',
      message,
      context: userContext
    }])

    // Process with AI engine
    const response = await aiEngine.processQuery(message, userContext)

    const aiMsg = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      message: response,
      created_at: new Date().toISOString()
    }

    set(state => ({ messages: [...state.messages, aiMsg], loading: false }))

    // Save AI response
    await supabase.from('ai_chat_history').insert([{
      user_id: userContext.userId,
      session_id: sessionId,
      role: 'assistant',
      message: response
    }])
  },

  sendQuickPrompt: async (promptText, userContext) => {
    await get().sendMessage(promptText, userContext)
  },

  markInsightRead: async (insightId) => {
    await supabase.from('ai_insights').update({ is_read: true }).eq('id', insightId)
    set(state => ({
      insights: state.insights.map(i => i.id === insightId ? { ...i, is_read: true } : i),
      unreadInsights: Math.max(0, state.unreadInsights - 1)
    }))
  },

  loadChatHistory: async (userId) => {
    const { data } = await supabase.from('ai_chat_history').select('*').eq('user_id', userId).order('created_at', { ascending: true }).limit(50)
    if (data && data.length > 0) {
      set({ messages: data.map(m => ({ id: m.id, role: m.role, message: m.message, created_at: m.created_at })) })
    }
  }
}))

export default useAIStore
