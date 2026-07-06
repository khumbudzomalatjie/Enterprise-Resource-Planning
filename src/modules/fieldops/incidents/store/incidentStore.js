import { create } from 'zustand'
import { incidentApi } from '../api/incidentApi'
import toast from 'react-hot-toast'

const useIncidentStore = create((set, get) => ({
  incidents: [],
  selectedIncident: null,
  correctiveActions: [],
  auditLog: [],
  stats: {},
  loading: false,
  error: null,

  fetchIncidents: async (filters = {}) => {
    set({ loading: true, error: null })
    const { data, error } = await incidentApi.getIncidents(filters)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ incidents: data || [], loading: false })
    return { success: true, data }
  },

  fetchIncident: async (id) => {
    set({ loading: true })
    const { data, error } = await incidentApi.getIncident(id)
    if (error) { set({ error: error.message, loading: false }); return { success: false } }
    set({ selectedIncident: data, correctiveActions: data?.corrective_actions || [], auditLog: data?.incident_audit_log || [], loading: false })
    return { success: true, data }
  },

  createIncident: async (incidentData) => {
    set({ loading: true, error: null })
    const { data, error } = await incidentApi.createIncident(incidentData)
    if (error) { set({ error: error.message, loading: false }); return { success: false, error: error.message } }
    set(state => ({ incidents: [data, ...state.incidents], loading: false }))
    toast.success(`Incident ${data.incident_number} reported!`)
    return { success: true, data }
  },

  updateIncident: async (id, updates) => {
    const { data, error } = await incidentApi.updateIncident(id, updates)
    if (error) return { success: false, error: error.message }
    set(state => ({ incidents: state.incidents.map(i => i.id === id ? data : i), selectedIncident: state.selectedIncident?.id === id ? data : state.selectedIncident }))
    toast.success('Updated!')
    return { success: true, data }
  },

  updateStatus: async (id, status) => {
    const { data, error } = await incidentApi.updateStatus(id, status)
    if (error) return { success: false }
    set(state => ({ incidents: state.incidents.map(i => i.id === id ? data : i), selectedIncident: state.selectedIncident?.id === id ? data : state.selectedIncident }))
    toast.success(`Status: ${status.replace(/_/g, ' ')}`)
    return { success: true, data }
  },

  createCorrectiveAction: async (actionData) => {
    const { data, error } = await incidentApi.createCorrectiveAction(actionData)
    if (error) return { success: false }
    set(state => ({ correctiveActions: [...state.correctiveActions, data] }))
    toast.success('Action created!')
    return { success: true, data }
  },

  updateCorrectiveAction: async (id, updates) => {
    const { data, error } = await incidentApi.updateCorrectiveAction(id, updates)
    if (error) return { success: false }
    set(state => ({ correctiveActions: state.correctiveActions.map(a => a.id === id ? data : a) }))
    return { success: true, data }
  },

  fetchStats: async () => {
    const stats = await incidentApi.getIncidentStats()
    set({ stats })
    return stats
  },

  clearError: () => set({ error: null }),
}))

export default useIncidentStore
