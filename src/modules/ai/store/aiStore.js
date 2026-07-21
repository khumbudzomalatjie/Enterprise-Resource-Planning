import { create } from 'zustand'
import { supabase } from '../../../lib/supabaseClient'
import { khumoEngine } from '../engine/khumoEngine'

const useAIStore = create((set, get) => ({
  isOpen: false,
  messages: [],
  loading: false,
  quickPrompts: [],
  context: {},

  toggleChat: () => set(state => ({ isOpen: !state.isOpen })),

  initSession: async (userId, userContext) => {
    set({ context: userContext || {} })
    try {
      const { data: prompts } = await supabase.from('ai_quick_prompts').select('*').eq('is_active', true).order('sort_order')
      set({ quickPrompts: prompts || [] })
      const hour = new Date().getHours()
      const g = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
      set({
        messages: [{
          id: 'welcome',
          role: 'assistant',
          message: `${g}! I'm Khumo, your ERP assistant. How can I help?`,
          action: null,
          created_at: new Date().toISOString()
        }]
      })
    } catch (err) {
      console.error('Init error:', err)
      set({
        messages: [{ id: 'welcome', role: 'assistant', message: 'Hello! How can I help?', action: null, created_at: new Date().toISOString() }]
      })
    }
  },

  sendMessage: async (message) => {
    const { messages, context } = get()
    if (!message?.trim()) return

    const userMsg = { id: Date.now().toString(), role: 'user', message, created_at: new Date().toISOString() }
    set({ messages: [...messages, userMsg], loading: true })

    try {
      const response = await khumoEngine.processQuery(message, context)
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        message: response?.text || 'How can I help?',
        action: response?.action || null,
        created_at: new Date().toISOString()
      }
      set(state => ({ messages: [...state.messages, aiMsg], loading: false }))
    } catch (err) {
      console.error('Send error:', err)
      set(state => ({
        messages: [...state.messages, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          message: 'Sorry, something went wrong. Please try again.',
          action: null,
          created_at: new Date().toISOString()
        }],
        loading: false
      }))
    }
  },

  sendQuickPrompt: async (text) => { await get().sendMessage(text) },
  clearChat: () => set({ messages: [{ id: 'welcome', role: 'assistant', message: 'Chat cleared. How can I help?', action: null, created_at: new Date().toISOString() }] }),
  updateContext: (ctx) => set({ context: { ...get().context, ...ctx } }),
}))

export default useAIStore
