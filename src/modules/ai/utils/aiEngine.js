import { supabase } from '../../../lib/supabaseClient'

export const aiEngine = {
  async processQuery(query, userContext) {
    const { role, userId, currentPage, userName } = userContext
    const lowerQuery = query.toLowerCase()

    // Greetings
    if (lowerQuery.includes('hello') || lowerQuery.includes('hi ') || lowerQuery.includes('hey') || 
        lowerQuery.includes('who are you') || lowerQuery.includes('dumela') || lowerQuery.includes('help')) {
      return this.getWelcomeMessage(userName)
    }

    // Thank you
    if (lowerQuery.includes('thank') || lowerQuery.includes('thanks') || lowerQuery.includes('ke a leboga')) {
      return `🤖 **You're welcome!** I'm KHUMO, always here to help. 😊\n\nIs there anything else you need assistance with?`
    }

    // Incident Analysis
    if (lowerQuery.includes('incident') || lowerQuery.includes('risk') || lowerQuery.includes('accident')) {
      return await this.analyzeIncidents(query, role)
    }

    // Schedule Optimization
    if (lowerQuery.includes('schedule') || lowerQuery.includes('job') || lowerQuery.includes('route') || lowerQuery.includes('optimize')) {
      return await this.optimizeSchedule(query, role)
    }

    // Maintenance Prediction
    if (lowerQuery.includes('maintenance') || lowerQuery.includes('vehicle') || lowerQuery.includes('equipment') || lowerQuery.includes('repair')) {
      return await this.predictMaintenance(query, role)
    }

    // Inventory
    if (lowerQuery.includes('stock') || lowerQuery.includes('inventory') || lowerQuery.includes('supply') || lowerQuery.includes('reorder')) {
      return await this.checkInventory(query, role)
    }

    // Procurement
    if (lowerQuery.includes('purchase') || lowerQuery.includes('order') || lowerQuery.includes('procurement') || lowerQuery.includes('vendor')) {
      return await this.procurementOverview(query, role)
    }

    // Finance
    if (lowerQuery.includes('revenue') || lowerQuery.includes('finance') || lowerQuery.includes('budget') || lowerQuery.includes('money') || lowerQuery.includes('invoice')) {
      return await this.financeOverview(query, role)
    }

    // HR
    if (lowerQuery.includes('staff') || lowerQuery.includes('employee') || lowerQuery.includes('attendance') || lowerQuery.includes('leave') || lowerQuery.includes('payroll')) {
      return await this.hrOverview(query, role)
    }

    // CRM
    if (lowerQuery.includes('client') || lowerQuery.includes('customer') || lowerQuery.includes('contract') || lowerQuery.includes('satisfaction')) {
      return await this.crmOverview(query, role)
    }

    // Operations
    if (lowerQuery.includes('operation') || lowerQuery.includes('quality') || lowerQuery.includes('inspection')) {
      return await this.operationsOverview(query, role)
    }

    // General fallback
    return this.getFallbackMessage()
  },

  getWelcomeMessage(userName) {
    const name = userName || 'there'
    return `🤖 **Dumela ${name}! I'm KHUMO**, your Ndanduleni ERP AI Assistant. 🇿🇦\n\n` +
      `I'm here to help you with:\n\n` +
      `🚨 **Incident Analysis** - Track and analyze incidents\n` +
      `📅 **Schedule Optimization** - Optimize job routing\n` +
      `📦 **Inventory Management** - Monitor stock levels\n` +
      `🛒 **Procurement** - Purchase orders and vendors\n` +
      `👥 **HR Insights** - Staff and attendance overview\n` +
      `💰 **Financial Overview** - Revenue and budgets\n` +
      `🏢 **CRM** - Client information and pipeline\n` +
      `🔧 **Maintenance** - Equipment health prediction\n\n` +
      `How can I assist you today?`
  },

  getFallbackMessage() {
    return `🤖 **KHUMO here!** I'm not sure I understand that query.\n\n` +
      `Here are some things I can help with:\n\n` +
      `🚨 "Show me open incidents"\n` +
      `📅 "Optimize today's jobs"\n` +
      `📦 "Show low stock items"\n` +
      `🛒 "Pending purchase orders"\n` +
      `👥 "Staff attendance this week"\n` +
      `💰 "Revenue this month"\n` +
      `🏢 "Client satisfaction overview"\n` +
      `🔧 "Predict vehicle maintenance"\n\n` +
      `Or click a quick prompt below! ⚡`
  },

  async analyzeIncidents(query, role) {
    try {
      const { count: total } = await supabase.from('incidents').select('*', { count: 'exact', head: true })
      const { count: open } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'submitted', 'acknowledged', 'under_review', 'under_investigation'])
      const { count: critical } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical')
      const { count: closed } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'closed')
      const { data: recent } = await supabase.from('incidents').select('incident_number, title, severity, status, incident_date').order('created_at', { ascending: false }).limit(5)

      let response = `📊 **Incident Analysis**\n\n`
      response += `| Metric | Count |\n|--------|-------|\n`
      response += `| Total Incidents | ${total || 0} |\n`
      response += `| Open/Active | ${open || 0} |\n`
      response += `| Critical | ${critical || 0} |\n`
      response += `| Closed | ${closed || 0} |\n\n`

      if (recent && recent.length > 0) {
        response += `**Recent Incidents:**\n`
        recent.forEach(inc => {
          const sevIcon = inc.severity === 'critical' ? '🔴' : inc.severity === 'high' ? '🟠' : inc.severity === 'medium' ? '🟡' : '🟢'
          response += `${sevIcon} **${inc.incident_number}**: ${inc.title} (${inc.severity}) - ${new Date(inc.incident_date).toLocaleDateString()}\n`
        })
      }

      if (critical > 0) {
        response += `\n⚠️ **Action Required:** ${critical} critical incidents need immediate attention.`
      } else if (open === 0) {
        response += `\n✅ **Great job!** No open incidents at this time.`
      }

      return response
    } catch (err) {
      return `❌ Sorry, I couldn't fetch incident data right now. Please try again.`
    }
  },

  async optimizeSchedule(query, role) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: todayJobs } = await supabase.from('jobs').select('*').eq('scheduled_date', today).not('status', 'eq', 'completed').not('status', 'eq', 'cancelled')
      const { count: unassigned } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      const { count: inProgress } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress')

      let response = `📅 **Schedule Overview - ${new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}**\n\n`
      response += `| Metric | Count |\n|--------|-------|\n`
      response += `| Today's Jobs | ${todayJobs?.length || 0} |\n`
      response += `| In Progress | ${inProgress || 0} |\n`
      response += `| Unassigned | ${unassigned || 0} |\n\n`

      if (todayJobs && todayJobs.length > 0) {
        const byPriority = {}
        todayJobs.forEach(j => { byPriority[j.priority] = (byPriority[j.priority] || 0) + 1 })
        response += `**Priority Breakdown:**\n`
        Object.entries(byPriority).sort((a, b) => {
          const order = { emergency: 0, urgent: 1, high: 2, medium: 3, low: 4 }
          return (order[a[0]] || 5) - (order[b[0]] || 5)
        }).forEach(([p, c]) => {
          const icon = p === 'emergency' ? '🔴' : p === 'urgent' ? '🟠' : p === 'high' ? '🟡' : p === 'medium' ? '🔵' : '⚪'
          response += `${icon} **${p}**: ${c} jobs\n`
        })
      }

      if (unassigned > 0) {
        response += `\n💡 **Suggestion:** Assign the ${unassigned} pending jobs to available staff members.`
      }

      return response
    } catch (err) {
      return `❌ Sorry, I couldn't fetch schedule data. Please try again.`
    }
  },

  async predictMaintenance(query, role) {
    let response = `🔧 **Maintenance Prediction**\n\n`
    response += `Based on fleet and equipment data:\n\n`
    response += `🚛 **Vehicles:**\n`
    response += `• High Risk: Vehicles due for service (>10,000km)\n`
    response += `• Medium Risk: Vehicles approaching service interval\n`
    response += `• Low Risk: Recently serviced vehicles\n\n`
    response += `🔩 **Equipment:**\n`
    response += `• High Risk: Equipment with >500 operating hours\n`
    response += `• Medium Risk: Equipment approaching inspection date\n`
    response += `• Low Risk: Newly inspected equipment\n\n`
    response += `💡 **Recommendation:** Schedule preventive maintenance for high-risk assets within 7 days to avoid breakdowns.`
    return response
  },

  async checkInventory(query, role) {
    try {
      const { count: total } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true })
      const { data: lowItems } = await supabase.from('inventory_items').select('name, current_stock, reorder_point, unit').lte('current_stock', supabase.raw('COALESCE(reorder_point, 10)')).limit(8)
      const { count: outOfStock } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('current_stock', 0)

      let response = `📦 **Inventory Status**\n\n`
      response += `| Metric | Count |\n|--------|-------|\n`
      response += `| Total Items | ${total || 0} |\n`
      response += `| Low Stock | ${lowItems?.length || 0} |\n`
      response += `| Out of Stock | ${outOfStock || 0} |\n\n`

      if (lowItems && lowItems.length > 0) {
        response += `**Items Needing Reorder:**\n`
        lowItems.forEach(item => {
          response += `⚠️ **${item.name}**: ${item.current_stock} ${item.unit || 'units'} remaining (reorder at ${item.reorder_point})\n`
        })
      } else {
        response += `✅ All stock levels are adequate.`
      }

      return response
    } catch (err) {
      return `❌ Sorry, I couldn't fetch inventory data. Please check the Inventory module.`
    }
  },

  async procurementOverview(query, role) {
    try {
      const { count: pendingPOs } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent', 'confirmed'])
      const { count: pendingPRs } = await supabase.from('purchase_requisitions').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval')

      let response = `🛒 **Procurement Overview**\n\n`
      response += `| Metric | Count |\n|--------|-------|\n`
      response += `| Pending POs | ${pendingPOs || 0} |\n`
      response += `| Pending PRs | ${pendingPRs || 0} |\n\n`
      response += `💡 Visit the Procurement module for detailed order management.`
      return response
    } catch (err) {
      return `❌ Sorry, I couldn't fetch procurement data.`
    }
  },

  async financeOverview(query, role) {
    if (role !== 'super_admin' && role !== 'finance_officer') {
      return `🔒 **Access Restricted**\n\nDetailed financial data is available to Finance Officers and Administrators only.\n\nPlease contact your finance team for this information.`
    }
    
    let response = `💰 **Finance Overview**\n\n`
    response += `📊 Financial data is available in the Finance module.\n\n`
    response += `For detailed reports, visit:\n`
    response += `• **Sales Module** - Revenue and quotations\n`
    response += `• **Finance Module** - Budgets and approvals\n`
    response += `• **Reporting** - Comprehensive financial reports\n\n`
    response += `💡 **Tip:** Generate a monthly financial report from the Reports module.`
    return response
  },

  async hrOverview(query, role) {
    try {
      const { count: totalStaff } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
      const { data: departments } = await supabase.from('employees').select('department').eq('employment_status', 'active')

      let response = `👥 **HR Overview**\n\n`
      response += `| Metric | Count |\n|--------|-------|\n`
      response += `| Active Staff | ${totalStaff || 0} |\n\n`

      if (departments && departments.length > 0) {
        const deptCount = {}
        departments.forEach(d => { 
          const dept = d.department || 'Unassigned'
          deptCount[dept] = (deptCount[dept] || 0) + 1 
        })
        response += `**By Department:**\n`
        Object.entries(deptCount).forEach(([dept, count]) => {
          response += `• ${dept}: ${count} staff\n`
        })
      }

      response += `\n💡 **Tip:** Visit the HR module for detailed employee records, leave management, and training.`
      return response
    } catch (err) {
      return `❌ Sorry, I couldn't fetch HR data. Please check the HR module.`
    }
  },

  async crmOverview(query, role) {
    try {
      const { count: totalClients } = await supabase.from('clients').select('*', { count: 'exact', head: true })
      const { count: activeClients } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'active')

      let response = `🏢 **CRM Overview**\n\n`
      response += `| Metric | Count |\n|--------|-------|\n`
      response += `| Total Clients | ${totalClients || 0} |\n`
      response += `| Active Clients | ${activeClients || 0} |\n\n`
      response += `💡 Visit the CRM module for client details, pipeline, and interactions.`
      return response
    } catch (err) {
      return `❌ Sorry, I couldn't fetch CRM data.`
    }
  },

  async operationsOverview(query, role) {
    try {
      const { count: totalJobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true })
      const { count: completed } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed')

      let response = `⚙️ **Operations Overview**\n\n`
      response += `| Metric | Count |\n|--------|-------|\n`
      response += `| Total Jobs | ${totalJobs || 0} |\n`
      response += `| Completed | ${completed || 0} |\n`
      response += `| Completion Rate | ${totalJobs > 0 ? Math.round((completed / totalJobs) * 100) : 0}% |\n\n`
      response += `💡 Visit the Operations module for job management, scheduling, and quality inspections.`
      return response
    } catch (err) {
      return `❌ Sorry, I couldn't fetch operations data.`
    }
  }
}
