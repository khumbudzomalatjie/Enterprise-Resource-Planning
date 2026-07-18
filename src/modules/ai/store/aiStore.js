import { create } from 'zustand'
import { supabase } from '../../../lib/supabaseClient'
import { aiEngine } from '../utils/aiEngine'
import { aiApi } from '../api/aiApi'

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
    const sessionId = `khumo-${userId}-${Date.now()}`
    set({ sessionId, messages: [], loading: true })

    try {
      // Load quick prompts
      const { data: prompts } = await supabase
        .from('ai_quick_prompts')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      set({ quickPrompts: prompts || [] })

      // Load insights
      const { data: insights } = await supabase
        .from('ai_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      const unreadCount = (insights || []).filter(i => !i.is_read).length
      set({ insights: insights || [], unreadInsights: unreadCount })

      // Load chat history
      const { data: history } = await supabase
        .from('ai_chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(50)

      if (history && history.length > 0) {
        set({
          messages: history.map(m => ({
            id: m.id,
            role: m.role,
            message: m.message,
            created_at: m.created_at
          }))
        })
      } else {
        // Welcome message
        set({
          messages: [{
            id: 'welcome',
            role: 'assistant',
            message: "🤖 **Dumela! I'm KHUMO**, your Ndanduleni ERP AI Assistant. 🇿🇦\n\n" +
              "I'm here to help you with:\n\n" +
              "🚨 **Incident Analysis** - Track and analyze incidents\n" +
              "📅 **Schedule Optimization** - Optimize job routing\n" +
              "📦 **Inventory Management** - Monitor stock levels\n" +
              "🛒 **Procurement** - Purchase orders and vendors\n" +
              "👥 **HR Insights** - Staff and attendance overview\n" +
              "💰 **Financial Overview** - Revenue and budgets\n" +
              "🏢 **CRM** - Client information and pipeline\n" +
              "🔧 **Maintenance** - Equipment health prediction\n\n" +
              "How can I assist you today?",
            created_at: new Date().toISOString()
          }]
        })
      }
    } catch (err) {
      console.error('KHUMO init error:', err)
    }
    set({ loading: false })
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

    // Save user message
    await aiApi.saveChatMessage({
      user_id: userContext.userId,
      session_id: sessionId,
      role: 'user',
      message,
      context: userContext
    })

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
    await aiApi.saveChatMessage({
      user_id: userContext.userId,
      session_id: sessionId,
      role: 'assistant',
      message: response
    })
  },

  sendQuickPrompt: async (promptText, userContext) => {
    await get().sendMessage(promptText, userContext)
  },

  markInsightRead: async (insightId) => {
    await aiApi.markInsightRead(insightId)
    set(state => ({
      insights: state.insights.map(i => i.id === insightId ? { ...i, is_read: true } : i),
      unreadInsights: Math.max(0, state.unreadInsights - 1)
    }))
  },

  clearChat: async (userId) => {
    await aiApi.clearChatHistory(userId)
    set({ messages: [{
      id: 'welcome',
      role: 'assistant',
      message: "🤖 **Chat cleared!** How can KHUMO help you now?",
      created_at: new Date().toISOString()
    }]})
  },

  loadChatHistory: async (userId) => {
    const { data } = await aiApi.getChatHistory(userId)
    if (data && data.length > 0) {
      set({ messages: data.map(m => ({ id: m.id, role: m.role, message: m.message, created_at: m.created_at })) })
    }
  }
}))

export default useAIStore
