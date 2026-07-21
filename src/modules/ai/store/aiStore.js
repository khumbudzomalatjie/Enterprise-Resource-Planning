import { create } from 'zustand'
import { supabase } from '../../../lib/supabaseClient'
import { khumoEngine } from '../engine/khumoEngine'

const useAIStore = create((set, get) => ({
  isOpen: false,
  messages: [],
  sessionId: null,
  loading: false,
  quickPrompts: [],
  context: {},

  toggleChat: () => set(state => ({ isOpen: !state.isOpen })),

  initSession: async (userId, userContext) => {
    const sessionId = `khumo-${userId}-${Date.now()}`
    set({ sessionId, context: userContext || {} })

    try {
      const { data: prompts } = await supabase.from('ai_quick_prompts').select('*').eq('is_active', true).order('sort_order')
      set({ quickPrompts: prompts || [] })

      const welcome = khumoEngine.greet(userContext?.userName, userContext?.role)
      set({
        messages: [{
          id: 'welcome',
          role: 'assistant',
          message: welcome?.text || 'Hello! How can I help you?',
          action: welcome?.action || null,
          created_at: new Date().toISOString()
        }]
      })
    } catch (err) {
      console.error('Khumo init error:', err)
      set({
        messages: [{
          id: 'welcome',
          role: 'assistant',
          message: 'Hello! How can I help you with the ERP?',
          action: null,
          created_at: new Date().toISOString()
        }]
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
        message: response?.text || 'I received your message. How can I help?',
        action: response?.action || null,
        created_at: new Date().toISOString()
      }
      set(state => ({ messages: [...state.messages, aiMsg], loading: false }))
    } catch (err) {
      console.error('Khumo response error:', err)
      set(state => ({
        messages: [...state.messages, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          message: 'Sorry, I encountered an error. Please try again.',
          action: null,
          created_at: new Date().toISOString()
        }],
        loading: false
      }))
    }
  },

  sendQuickPrompt: async (promptText) => {
    await get().sendMessage(promptText)
  },

  clearChat: () => {
    set({
      messages: [{
        id: 'welcome',
        role: 'assistant',
        message: 'Chat cleared. How can I help?',
        action: null,
        created_at: new Date().toISOString()
      }]
    })
  },

  updateContext: (ctx) => set({ context: { ...get().context, ...ctx } }),
}))

export default useAIStore
