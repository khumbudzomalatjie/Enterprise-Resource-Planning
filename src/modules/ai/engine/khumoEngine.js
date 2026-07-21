import { supabase } from '../../../lib/supabaseClient'
import { intentMapper } from './intentMapper'
import { contextManager } from './contextManager'
import { dataFetcher } from './dataFetcher'
import { erpKnowledge } from './erpKnowledge'

export const khumoEngine = {
  async processQuery(query, context) {
    const { userId, userName, role } = context || {}
    if (!query?.trim()) return { text: 'How can I help you?' }
    
    const q = query.toLowerCase().trim()

    try {
      // Get conversation session
      const session = contextManager.getSession(userId || 'anonymous')

      // Check for pronoun references
      const reference = contextManager.resolveReference(userId || 'anonymous', q)
      if (reference?.resolved) {
        return this.handleReference(reference, q, context)
      }

      // Detect intent
      const intent = intentMapper.detectIntent(q)
      const actionType = intentMapper.getActionType(q)

      // Update context
      contextManager.updateContext(userId || 'anonymous', { currentIntent: intent, lastQuery: q })

      // Greetings
      if (this.isGreeting(q)) return this.greet(userName, role)

      // Casual
      if (this.isCasual(q)) return this.casualResponse(q, userName)

      // Dashboard overview
      if (this.matchAny(q, ['dashboard', 'overview', 'summary', 'what is happening', 'how is business', 'status update'])) {
        return await this.getDashboardResponse()
      }

      // Route based on action type
      switch (actionType) {
        case 'data': return await this.handleDataQuery(q, intent, context, session)
        case 'search': return await this.handleSearch(q, context, session)
        case 'guide': return this.handleGuide(q, intent, context)
        case 'navigate': return this.handleNavigate(q, intent, context)
        case 'create': return this.handleCreate(q, intent, context)
        case 'explain': return this.handleExplain(q, intent, context)
        case 'report': return this.handleReport(q, intent, context)
        default: return await this.handleGeneralQuery(q, intent, context)
      }
    } catch (err) {
      console.error('Khumo error:', err)
      return { text: 'I encountered an error. Please try again.' }
    }
  },

  matchAny(text, keywords) { return keywords.some(kw => text?.includes(kw)) },
  isGreeting(q) { return this.matchAny(q, ['hello', 'hi', 'hey', 'dumela', 'good morning', 'good afternoon', 'good evening']) },
  isCasual(q) { return this.matchAny(q, ['how are you', 'who are you', 'thank', 'bye', 'goodbye']) },

  greet(userName, role) {
    const name = userName || 'there'
    const hour = new Date().getHours()
    const g = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    return { text: `${g}, ${name}. I'm Khumo, your ERP assistant. How can I help?` }
  },

  casualResponse(q, userName) {
    if (this.matchAny(q, ['how are you'])) return { text: `I'm ready to help, ${userName || 'friend'}. What do you need?` }
    if (this.matchAny(q, ['who are you'])) return { text: `I'm Khumo, the ERP assistant. I know every module and can help with anything.` }
    if (this.matchAny(q, ['thank'])) return { text: `You're welcome. Anything else?` }
    if (this.matchAny(q, ['bye', 'goodbye'])) return { text: `Goodbye. I'm here when you need me.` }
    return { text: `How can I help you with the ERP?` }
  },

  async getDashboardResponse() {
    try {
      const summary = await dataFetcher.getDashboardSummary()
      return {
        text: `Here's your ERP overview:\n\n` +
          `👥 Employees: ${summary.employees}\n` +
          `📅 Open Jobs: ${summary.openJobs} (${summary.inProgressJobs} in progress)\n` +
          `🚨 Incidents: ${summary.openIncidents} open (${summary.criticalIncidents} critical)\n` +
          `🏢 Active Clients: ${summary.activeClients}\n` +
          `📦 Inventory Items: ${summary.inventoryItems}\n` +
          `🛒 Pending POs: ${summary.pendingPOs}\n` +
          `💰 Overdue Invoices: ${summary.overdueInvoices}\n` +
          `🏖️ Pending Leave: ${summary.pendingLeave}\n\n` +
          `What would you like to look into?`,
        action: { label: 'Open Dashboard', navigate: '/dashboard' }
      }
    } catch (err) {
      return { text: 'Unable to load dashboard data. Please try again.' }
    }
  },

  async handleDataQuery(q, intent, context, session) {
    try {
      if (intent === 'employee') {
        const result = await dataFetcher.searchEmployees()
        return { text: `There are ${result?.count || 0} active employees.`, action: { label: 'View Employees', navigate: '/hr/employees' } }
      }
      if (intent === 'incident') {
        const result = await dataFetcher.getIncidents()
        return { text: `${result?.count || 0} incidents on record.`, action: { label: 'View Incidents', navigate: '/fieldops/incidents' } }
      }
      if (intent === 'job') {
        const result = await dataFetcher.getJobs()
        return { text: `${result?.count || 0} open jobs.`, action: { label: 'View Jobs', navigate: '/operations' } }
      }
      if (intent === 'client') {
        const result = await dataFetcher.getClients()
        return { text: `${result?.count || 0} active clients.`, action: { label: 'View Clients', navigate: '/crm' } }
      }
      if (intent === 'inventory') {
        const result = await dataFetcher.getInventory()
        return { text: `${result?.count || 0} items in inventory.${result?.lowStock > 0 ? ` ${result.lowStock} low stock.` : ''}`, action: { label: 'View Inventory', navigate: '/inventory' } }
      }
      if (intent === 'quotation') {
        const result = await dataFetcher.getQuotations({ status: 'sent' })
        return { text: `${result?.count || 0} quotations pending.`, action: { label: 'View Quotations', navigate: '/sales' } }
      }
      if (intent === 'invoice') {
        const result = await dataFetcher.getInvoices({ overdue: true })
        return { text: result?.count > 0 ? `${result.count} overdue invoices.` : `No overdue invoices.`, action: result?.count > 0 ? { label: 'View Invoices', navigate: '/sales' } : null }
      }
      if (intent === 'attendance') {
        const result = await dataFetcher.getAttendance()
        return { text: `${result?.present || 0} out of ${result?.total || 0} clocked in today.`, action: { label: 'View Attendance', navigate: '/hr/attendance' } }
      }
      if (intent === 'leave') {
        const result = await dataFetcher.getLeave()
        return { text: `${result?.pending || 0} pending leave requests. ${result?.onLeave || 0} on leave.`, action: { label: 'View Leave', navigate: '/hr' } }
      }
      if (intent === 'payroll') {
        const result = await dataFetcher.getPayroll()
        return { text: `${result?.employees || 0} employees on payroll.`, action: { label: 'Open Payroll', navigate: '/payroll' } }
      }
      if (intent === 'purchase') {
        const result = await dataFetcher.getProcurement()
        return { text: `${result?.pendingPOs || 0} POs pending. ${result?.pendingPRs || 0} PRs awaiting approval.`, action: { label: 'Open Procurement', navigate: '/procurement' } }
      }
    } catch (err) {
      console.error('Data query error:', err)
    }
    return { text: `What specific data would you like to see?` }
  },

  async handleSearch(q, context, session) {
    const searchTerm = q.replace(/search|find|lookup|look for|who is|where is/gi, '').trim()
    if (!searchTerm) return { text: `Who or what are you looking for?` }
    try {
      const detail = await dataFetcher.getEmployeeDetail(searchTerm)
      if (detail) {
        let text = `${detail.first_name} ${detail.last_name}\n${detail.position || 'Staff'} · ${detail.department || 'N/A'}\n`
        if (detail.attendance?.clock_in_time) text += `\n⏰ Clocked in today at ${new Date(detail.attendance.clock_in_time).toLocaleTimeString()}`
        else text += `\n⏰ Not clocked in today`
        return { text, action: { label: 'View Employee', navigate: '/hr/employees' } }
      }
      return { text: `I couldn't find "${searchTerm}". Try a different name.`, action: { label: 'View All Employees', navigate: '/hr/employees' } }
    } catch (err) {
      return { text: `Search failed. Please try again.` }
    }
  },

  handleGuide(q, intent, context) {
    if (intent === 'quotation') return { text: `To create a quotation:\n1. Open Sales & Quotations\n2. Click New Quotation\n3. Select client\n4. Add services with prices\n5. Save or send`, action: { label: 'Create Quotation', navigate: '/sales/quotations/new' } }
    if (intent === 'incident') return { text: `To report an incident:\n1. Open Field Ops → Incidents\n2. Click Report Incident\n3. Fill details\n4. Submit`, action: { label: 'Report Incident', navigate: '/fieldops/incidents/report' } }
    if (intent === 'leave') return { text: `To apply for leave:\n1. Open HR → Leave Management\n2. Click New Leave Request\n3. Select type and dates\n4. Submit for approval`, action: { label: 'Apply Leave', navigate: '/hr' } }
    if (intent === 'job') return { text: `To create a job:\n1. Open Operations\n2. Click New Job\n3. Fill details\n4. Schedule`, action: { label: 'Create Job', navigate: '/operations/jobs/new' } }
    if (intent === 'attendance') return { text: `To clock in:\n1. Open HR → Attendance\n2. Click Clock In\n3. GPS auto-captured`, action: { label: 'Clock In', navigate: '/hr/attendance' } }
    if (intent === 'employee') return { text: `To add an employee:\n1. Open HR → Employees\n2. Click Add Employee\n3. Fill details\n4. Save`, action: { label: 'Add Employee', navigate: '/hr/employees' } }
    if (intent === 'payroll') return { text: `To run payroll:\n1. Open Payroll\n2. Create payroll period\n3. Process salaries\n4. Generate payslips\n\nRequires Finance Officer or Admin access.`, action: { label: 'Open Payroll', navigate: '/payroll' } }
    if (intent === 'purchase') return { text: `To create a PO:\n1. Open Procurement\n2. Click New PO\n3. Select vendor\n4. Add items\n5. Send`, action: { label: 'Create PO', navigate: '/procurement/po/new' } }
    return { text: `What would you like to learn?` }
  },

  handleNavigate(q, intent, context) {
    const nav = {
      employee: { text: `Employees are under HR Management.`, action: { label: 'Open Employees', navigate: '/hr/employees' } },
      incident: { text: `Incidents are under Field Operations.`, action: { label: 'Open Incidents', navigate: '/fieldops/incidents' } },
      job: { text: `Jobs are under Operations.`, action: { label: 'Open Operations', navigate: '/operations' } },
      client: { text: `Clients are under CRM & Clients.`, action: { label: 'Open CRM', navigate: '/crm' } },
      quotation: { text: `Sales is in the main menu.`, action: { label: 'Open Sales', navigate: '/sales' } },
      invoice: { text: `Invoices are under Sales.`, action: { label: 'Open Sales', navigate: '/sales' } },
      inventory: { text: `Inventory is in the main menu.`, action: { label: 'Open Inventory', navigate: '/inventory' } },
      purchase: { text: `Procurement is in the main menu.`, action: { label: 'Open Procurement', navigate: '/procurement' } },
      payroll: { text: `Payroll is in the main menu.`, action: { label: 'Open Payroll', navigate: '/payroll' } },
      attendance: { text: `Attendance is under HR.`, action: { label: 'Open Attendance', navigate: '/hr/attendance' } },
      leave: { text: `Leave is under HR.`, action: { label: 'Open Leave', navigate: '/hr' } },
      report: { text: `Reports are in the main menu.`, action: { label: 'Open Reports', navigate: '/reports' } },
    }
    if (intent && nav[intent]) return nav[intent]
    return { text: `What are you looking for?` }
  },

  handleCreate(q, intent, context) {
    if (intent === 'quotation') return { text: `Open Sales and click New Quotation.`, action: { label: 'New Quotation', navigate: '/sales/quotations/new' } }
    if (intent === 'incident') return { text: `Open Incidents and click Report Incident.`, action: { label: 'Report Incident', navigate: '/fieldops/incidents/report' } }
    if (intent === 'job') return { text: `Open Operations and click New Job.`, action: { label: 'New Job', navigate: '/operations/jobs/new' } }
    if (intent === 'client') return { text: `Open CRM and click Add Client.`, action: { label: 'Add Client', navigate: '/crm/clients/new' } }
    if (intent === 'employee') return { text: `Open HR → Employees and click Add Employee.`, action: { label: 'Add Employee', navigate: '/hr/employees' } }
    if (intent === 'invoice') return { text: `Open Sales to create an invoice.`, action: { label: 'Open Sales', navigate: '/sales' } }
    if (intent === 'purchase') return { text: `Open Procurement and click New PO.`, action: { label: 'New PO', navigate: '/procurement/po/new' } }
    if (intent === 'leave') return { text: `Open HR → Leave Management to apply.`, action: { label: 'Apply Leave', navigate: '/hr' } }
    return { text: `What would you like to create?` }
  },

  handleExplain(q, intent, context) {
    const module = erpKnowledge?.getModule?.(q)
    if (module) {
      return { text: `${module.name}\n\n${module.description}`, action: module.navigation ? { label: `Open ${module.name}`, navigate: `/${module.key || ''}` } : null }
    }
    return { text: `Which module would you like explained? HR, Payroll, CRM, Sales, Operations, Inventory, Procurement, Incidents?` }
  },

  handleReport(q, intent, context) {
    return { text: `Reports are available for all modules from the main Reports section or within each module.`, action: { label: 'Open Reports', navigate: '/reports' } }
  },

  async handleGeneralQuery(q, intent, context) {
    if (intent) return await this.handleDataQuery(q, intent, context, contextManager.getSession(context?.userId || 'anonymous'))
    return { text: `Ask me anything:\n• "How many employees?"\n• "Show open incidents"\n• "How to create a quotation?"\n• "Where is inventory?"\n• "Who is [name]?"` }
  },

  async handleReference(reference, q, context) {
    if (reference.type === 'employee') return { text: `You're asking about ${reference.entity}. What would you like to know?` }
    if (reference.type === 'client') return { text: `You're referring to ${reference.entity}. What would you like to know?` }
    return { text: `What would you like to do next?` }
  }
}
