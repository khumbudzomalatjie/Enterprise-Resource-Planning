import { create } from 'zustand'
import { crmApi } from '../api/crmApi'

const useCRMStore = create((set, get) => ({
  // State
  clients: [],
  selectedClient: null,
  contacts: [],
  interactions: [],
  serviceTypes: [],
  clientServices: [],
  pipeline: [],
  feedback: [],
  documents: [],
  stats: {},
  loading: false,
  error: null,

  // Client Actions
  fetchClients: async (filters = {}) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await crmApi.getClients(filters)
      if (error) throw error
      set({ clients: data || [], loading: false })
      return { success: true, data }
    } catch (error) {
      console.error('Fetch clients error:', error)
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
  },

  fetchClient: async (id) => {
    set({ loading: true })
    try {
      const { data, error } = await crmApi.getClient(id)
      if (error) throw error
      set({ selectedClient: data, loading: false })
      return { success: true, data }
    } catch (error) {
      console.error('Fetch client error:', error)
      set({ error: error.message, loading: false })
      return { success: false, error: error.message }
    }
  },

  createClient: async (clientData) => {
    try {
      console.log('Creating client with data:', clientData) // Debug log
      const { data, error } = await crmApi.createClient(clientData)
      if (error) throw error
      set(state => ({ clients: [data, ...(state.clients || [])] }))
      return { success: true, data }
    } catch (error) {
      console.error('Create client error:', error)
      return { success: false, error: error.message }
    }
  },

  updateClient: async (id, updates) => {
    try {
      const { data, error } = await crmApi.updateClient(id, updates)
      if (error) throw error
      set(state => ({
        clients: state.clients.map(c => c.id === id ? data : c),
        selectedClient: state.selectedClient?.id === id ? data : state.selectedClient
      }))
      return { success: true, data }
    } catch (error) {
      console.error('Update client error:', error)
      return { success: false, error: error.message }
    }
  },

  // Contact Actions
  fetchContacts: async (clientId = null) => {
    try {
      const { data, error } = await crmApi.getContacts(clientId)
      if (error) throw error
      set({ contacts: data || [] })
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  createContact: async (contactData) => {
    try {
      const { data, error } = await crmApi.createContact(contactData)
      if (error) throw error
      set(state => ({ contacts: [data, ...(state.contacts || [])] }))
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Interaction Actions
  fetchInteractions: async (clientId = null) => {
    try {
      const { data, error } = await crmApi.getInteractions(clientId)
      if (error) throw error
      set({ interactions: data || [] })
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  createInteraction: async (interactionData) => {
    try {
      const { data, error } = await crmApi.createInteraction(interactionData)
      if (error) throw error
      set(state => ({ interactions: [data, ...(state.interactions || [])] }))
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Service Actions
  fetchServiceTypes: async () => {
    try {
      const { data, error } = await crmApi.getServiceTypes()
      if (error) throw error
      set({ serviceTypes: data || [] })
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  fetchClientServices: async (clientId = null) => {
    try {
      const { data, error } = await crmApi.getClientServices(clientId)
      if (error) throw error
      set({ clientServices: data || [] })
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  createClientService: async (serviceData) => {
    try {
      const { data, error } = await crmApi.createClientService(serviceData)
      if (error) throw error
      set(state => ({ clientServices: [data, ...(state.clientServices || [])] }))
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Pipeline Actions
  fetchPipeline: async (filters = {}) => {
    try {
      const { data, error } = await crmApi.getPipeline(filters)
      if (error) throw error
      set({ pipeline: data || [] })
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  createPipelineItem: async (itemData) => {
    try {
      const { data, error } = await crmApi.createPipelineItem(itemData)
      if (error) throw error
      set(state => ({ pipeline: [data, ...(state.pipeline || [])] }))
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  updatePipelineItem: async (id, updates) => {
    try {
      const { data, error } = await crmApi.updatePipelineItem(id, updates)
      if (error) throw error
      set(state => ({
        pipeline: state.pipeline.map(p => p.id === id ? data : p)
      }))
      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Stats
  fetchCRMStats: async () => {
    try {
      const stats = await crmApi.getCRMStats()
      set({ stats })
      return stats
    } catch (error) {
      console.error('Fetch stats error:', error)
      return {}
    }
  },

  clearError: () => set({ error: null }),
}))

export default useCRMStore
