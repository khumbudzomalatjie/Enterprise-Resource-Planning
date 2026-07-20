import { create } from 'zustand'
import { supabase } from '../../../lib/supabaseClient'
import { khumoEngine } from '../engine/khumoEngine'
import { aiApi } from '../api/aiApi'

const useAIStore = create((set, get) => ({
  isOpen: false,
  messages: [],
  sessionId: null,
  loading: false,
  quickPrompts: [],
  unreadInsights: 0,
  context: {},

  toggleChat: () => set(state => ({ isOpen: !state.isOpen })),

  initSession: async (userId, userContext) => {
    const sessionId = `khumo-${userId}-${Date.now()}`
    set({ sessionId, messages: [], loading: true, context: userContext })

    try {
      const { data: prompts } = await supabase.from('ai_quick_prompts').select('*').eq('is_active', true).order('sort_order')
      set({ quickPrompts: prompts || [] })

      const welcome = khumoEngine.greet(userContext?.userName, userContext?.role)
      set({
        messages: [{
          id: 'welcome',
          role: 'assistant',
          message: welcome.text,
          action: null,
          created_at: new Date().toISOString()
        }]
      })
    } catch (err) {
      console.error('Khumo init error:', err)
    }
    set({ loading: false })
  },

  sendMessage: async (message) => {
    const { messages, context } = get()
    if (!message.trim()) return

    const userMsg = { id: Date.now().toString(), role: 'user', message, created_at: new Date().toISOString() }
    set({ messages: [...messages, userMsg], loading: true })

    const response = await khumoEngine.processQuery(message, context)

    const aiMsg = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      message: response.text || response,
      action: response.action || null,
      created_at: new Date().toISOString()
    }
    set(state => ({ messages: [...state.messages, aiMsg], loading: false }))
  },

  sendQuickPrompt: async (promptText) => {
    await get().sendMessage(promptText)
  },

  clearChat: async (userId) => {
    set({ messages: [{
      id: 'welcome',
      role: 'assistant',
      message: "Chat cleared! How can Khumo help you?",
      action: null,
      created_at: new Date().toISOString()
    }]})
  },

  updateContext: (context) => set({ context: { ...get().context, ...context } }),
}))

export default useAIStore
