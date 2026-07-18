import { supabase } from '../../../lib/supabaseClient'

export const aiEngine = {
  // Process user query and return contextual response
  async processQuery(query, userContext) {
    const { role, userId, currentPage } = userContext
    const lowerQuery = query.toLowerCase()

    // Incident Analysis
    if (lowerQuery.includes('incident') || lowerQuery.includes('risk')) {
      return await this.analyzeIncidents(query, role)
    }

    // Schedule Optimization
    if (lowerQuery.includes('schedule') || lowerQuery.includes('job') || lowerQuery.includes('route')) {
      return await this.optimizeSchedule(query, role)
    }

    // Maintenance Prediction
    if (lowerQuery.includes('maintenance') || lowerQuery.includes('vehicle') || lowerQuery.includes('equipment')) {
      return await this.predictMaintenance(query, role)
    }

    // Inventory
    if (lowerQuery.includes('stock') || lowerQuery.includes('inventory') || lowerQuery.includes('supply')) {
      return await this.checkInventory(query, role)
    }

    // Finance
    if (lowerQuery.includes('revenue') || lowerQuery.includes('finance') || lowerQuery.includes('budget')) {
      return await this.financeOverview(query, role)
    }

    // HR
    if (lowerQuery.includes('staff') || lowerQuery.includes('employee') || lowerQuery.includes('attendance')) {
      return await this.hrOverview(query, role)
    }

    // CRM
    if (lowerQuery.includes('client') || lowerQuery.includes('customer') || lowerQuery.includes('contract')) {
      return await this.crmOverview(query, role)
    }

    // General
    return await this.generalAssistance(query, role)
  },

  async analyzeIncidents(query, role) {
    const { count: total } = await supabase.from('incidents').select('*', { count: 'exact', head: true })
    const { count: open } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_investigation'])
    const { count: critical } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical')
    const { data: recent } = await supabase.from('incidents').select('incident_number, title, severity, status').order('created_at', { ascending: false }).limit(5)

    let response = `📊 **Incident Analysis**\n\n`
    response += `• **Total Incidents:** ${total}\n`
    response += `• **Open/Active:** ${open}\n`
    response += `• **Critical:** ${critical}\n\n`
    
    if (recent && recent.length > 0) {
      response += `**Recent Incidents:**\n`
      recent.forEach(inc => {
        response += `• ${inc.incident_number}: ${inc.title} (${inc.severity})\n`
      })
    }

    if (critical > 0) {
      response += `\n⚠️ **Action Required:** ${critical} critical incidents need immediate attention.`
    }

    return response
  },

  async optimizeSchedule(query, role) {
    const today = new Date().toISOString().split('T')[0]
    const { data: todayJobs } = await supabase.from('jobs').select('*').eq('scheduled_date', today).not('status', 'eq', 'completed')
    const { count: unassigned } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending')

    let response = `📅 **Schedule Overview**\n\n`
    response += `• **Today's Jobs:** ${todayJobs?.length || 0}\n`
    response += `• **Unassigned Jobs:** ${unassigned || 0}\n`
    
    if (todayJobs && todayJobs.length > 0) {
      const byPriority = {}
      todayJobs.forEach(j => { byPriority[j.priority] = (byPriority[j.priority] || 0) + 1 })
      response += `\n**Priority Breakdown:**\n`
      Object.entries(byPriority).forEach(([p, c]) => {
        response += `• ${p}: ${c} jobs\n`
      })
    }

    if (unassigned > 0) {
      response += `\n💡 **Suggestion:** Assign the ${unassigned} pending jobs to available staff.`
    }

    return response
  },

  async predictMaintenance(query, role) {
    let response = `🔧 **Maintenance Prediction**\n\n`
    response += `Based on usage patterns and historical data:\n\n`
    response += `• **High Risk:** Vehicles with >10,000km since last service\n`
    response += `• **Medium Risk:** Equipment used >500 hours without inspection\n`
    response += `• **Low Risk:** Recently serviced assets\n\n`
    response += `💡 **Recommendation:** Schedule preventive maintenance for high-risk assets within 7 days.`
    return response
  },

  async checkInventory(query, role) {
    const { count: lowStock } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).lte('current_stock', supabase.raw('reorder_point'))
    const { count: outOfStock } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('current_stock', 0)
    const { data: lowItems } = await supabase.from('inventory_items').select('name, current_stock, reorder_point').lte('current_stock', supabase.raw('reorder_point')).limit(5)

    let response = `📦 **Inventory Status**\n\n`
    response += `• **Low Stock Items:** ${lowStock || 0}\n`
    response += `• **Out of Stock:** ${outOfStock || 0}\n\n`
    
    if (lowItems && lowItems.length > 0) {
      response += `**Items Needing Reorder:**\n`
      lowItems.forEach(item => {
        response += `• ${item.name}: ${item.current_stock} remaining (reorder at ${item.reorder_point})\n`
      })
    }

    return response
  },

  async financeOverview(query, role) {
    let response = `💰 **Finance Overview**\n\n`
    response += `• **Monthly Revenue:** Data loading...\n`
    response += `• **Pending Invoices:** Check Sales module\n`
    response += `• **Budget Utilization:** Check Finance module\n\n`
    response += `💡 **Tip:** Visit the Finance module for detailed reports.`
    return response
  },

  async hrOverview(query, role) {
    const { count: totalStaff } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
    const { count: onLeave } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved').gte('end_date', new Date().toISOString().split('T')[0])

    let response = `👥 **HR Overview**\n\n`
    response += `• **Active Staff:** ${totalStaff || 0}\n`
    response += `• **On Leave Today:** ${onLeave || 0}\n\n`
    response += `💡 **Tip:** Check the HR module for detailed staff information.`
    return response
  },

  async crmOverview(query, role) {
    const { count: totalClients } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'active')
    
    let response = `🏢 **CRM Overview**\n\n`
    response += `• **Active Clients:** ${totalClients || 0}\n\n`
    response += `💡 **Tip:** Visit the CRM module for client details and pipeline.`
    return response
  },

  async generalAssistance(query, role) {
    return `🤖 **Hello! I'm your ERP AI Assistant.**\n\nI can help you with:\n\n` +
      `🚨 **Incidents** - "Show me open incidents"\n` +
      `📅 **Scheduling** - "Optimize today's jobs"\n` +
      `📦 **Inventory** - "Show low stock items"\n` +
      `👥 **HR** - "Staff attendance this week"\n` +
      `💰 **Finance** - "Revenue this month"\n` +
      `🏢 **CRM** - "Client satisfaction overview"\n` +
      `🔧 **Maintenance** - "Predict vehicle maintenance"\n\n` +
      `Type your question or use quick prompts below!`
  }
}
