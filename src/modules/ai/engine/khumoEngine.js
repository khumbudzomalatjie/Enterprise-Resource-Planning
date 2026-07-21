import { supabase } from '../../../lib/supabaseClient'
import { intentMapper } from './intentMapper'
import { contextManager } from './contextManager'
import { dataFetcher } from './dataFetcher'
import { erpKnowledge } from './erpKnowledge'

export const khumoEngine = {
  async processQuery(query, context) {
    const { userId, userName, role } = context
    const q = query.toLowerCase().trim()

    // Get conversation session
    const session = contextManager.getSession(userId)

    // Check for pronoun references (it, that, them, etc.)
    const reference = contextManager.resolveReference(userId, q)
    if (reference.resolved) {
      return this.handleReference(reference, q, context)
    }

    // Detect intent
    const intent = intentMapper.detectIntent(q)
    const actionType = intentMapper.getActionType(q)

    // Update context
    contextManager.updateContext(userId, { currentIntent: intent, lastQuery: q })

    // ============================================
    // GREETINGS
    // ============================================
    if (this.isGreeting(q)) return this.greet(userName, role)

    // ============================================
    // CASUAL CONVERSATION
    // ============================================
    if (this.isCasual(q)) return this.casualResponse(q, userName)

    // ============================================
    // DASHBOARD / OVERVIEW
    // ============================================
    if (this.matchAny(q, ['dashboard', 'overview', 'summary', 'what is happening', 'how is business', 'status update'])) {
      return await this.getDashboardResponse()
    }

    // ============================================
    // ACTIONS BASED ON INTENT
    // ============================================
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
  },

  // ============================================
  // HELPERS
  // ============================================
  matchAny(text, keywords) { return keywords.some(kw => text.includes(kw)) },
  isGreeting(q) { return this.matchAny(q, ['hello', 'hi', 'hey', 'dumela', 'good morning', 'good afternoon', 'good evening']) },
  isCasual(q) { return this.matchAny(q, ['how are you', 'who are you', 'thank', 'bye', 'goodbye', 'joke', 'weather']) },

  // ============================================
  // GREETINGS
  // ============================================
  greet(userName, role) {
    const name = userName || 'there'
    const hour = new Date().getHours()
    const g = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    return { text: `${g}, ${name}. I'm Khumo, your ERP assistant. How can I help?` }
  },

  // ============================================
  // CASUAL
  // ============================================
  casualResponse(q, userName) {
    if (this.matchAny(q, ['how are you'])) return { text: `I'm ready to help, ${userName || 'friend'}. What do you need?` }
    if (this.matchAny(q, ['who are you'])) return { text: `I'm Khumo, the ERP assistant. I know every module, every workflow, and every piece of data in this system. Ask me anything.` }
    if (this.matchAny(q, ['thank'])) return { text: `You're welcome. Anything else?` }
    if (this.matchAny(q, ['bye', 'goodbye'])) return { text: `Goodbye. I'm here when you need me.` }
    return { text: `How can I help you with the ERP?` }
  },

  // ============================================
  // DASHBOARD OVERVIEW
  // ============================================
  async getDashboardResponse() {
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
  },

  // ============================================
  // DATA QUERIES
  // ============================================
  async handleDataQuery(q, intent, context, session) {
    // Employee data
    if (intent === 'employee') {
      const { count } = await dataFetcher.searchEmployees()
      contextManager.updateContext(context.userId, { mentionedEntityType: 'employee', lastDataResult: count })
      return {
        text: `There are ${count} active employees.\n\nWould you like to see the list, search for someone specific, or view by department?`,
        action: { label: 'View Employees', navigate: '/hr/employees' }
      }
    }

    // Incident data
    if (intent === 'incident') {
      const { count } = await dataFetcher.getIncidents()
      const { count: critical } = await dataFetcher.getIncidents({ severity: 'critical' })
      let text = `${count} incidents on record`
      if (critical > 0) text += `, including ${critical} critical. ⚠️`
      else text += `. No critical incidents.`
      return {
        text,
        action: { label: 'View Incidents', navigate: '/fieldops/incidents' }
      }
    }

    // Job data
    if (intent === 'job') {
      const { count } = await dataFetcher.getJobs()
      const { count: todayCount } = await dataFetcher.getJobs({ today: true })
      return {
        text: `${count} open jobs. ${todayCount} scheduled for today.`,
        action: { label: 'View Jobs', navigate: '/operations' }
      }
    }

    // Client data
    if (intent === 'client') {
      const { count } = await dataFetcher.getClients()
      return {
        text: `${count} active clients in the system.`,
        action: { label: 'View Clients', navigate: '/crm' }
      }
    }

    // Inventory data
    if (intent === 'inventory') {
      const { count, lowStock } = await dataFetcher.getInventory()
      let text = `${count} items in inventory.`
      if (lowStock > 0) text += ` ${lowStock} items are low in stock and need reordering.`
      return { text, action: { label: 'View Inventory', navigate: '/inventory' } }
    }

    // Quotation data
    if (intent === 'quotation') {
      const { count } = await dataFetcher.getQuotations({ status: 'sent' })
      return {
        text: `${count} quotations pending client response.`,
        action: { label: 'View Quotations', navigate: '/sales' }
      }
    }

    // Invoice data
    if (intent === 'invoice') {
      const { count } = await dataFetcher.getInvoices({ overdue: true })
      return {
        text: count > 0 ? `${count} invoices are overdue. These need attention.` : `No overdue invoices. All payments are up to date.`,
        action: count > 0 ? { label: 'View Invoices', navigate: '/sales' } : null
      }
    }

    // Attendance data
    if (intent === 'attendance') {
      const { present, total } = await dataFetcher.getAttendance()
      return {
        text: `${present} out of ${total} employees clocked in today.`,
        action: { label: 'View Attendance', navigate: '/hr/attendance' }
      }
    }

    // Leave data
    if (intent === 'leave') {
      const { pending, onLeave } = await dataFetcher.getLeave()
      return {
        text: `${pending} leave requests pending. ${onLeave} employees currently on leave.`,
        action: { label: 'View Leave', navigate: '/hr' }
      }
    }

    // Payroll data
    if (intent === 'payroll') {
      const { employees, latestPeriod } = await dataFetcher.getPayroll()
      return {
        text: `${employees} employees on payroll.${latestPeriod ? ` Latest period: ${latestPeriod.period_name} (${latestPeriod.status}).` : ' No payroll period active.'}`,
        action: { label: 'Open Payroll', navigate: '/payroll' }
      }
    }

    // Procurement data
    if (intent === 'purchase') {
      const { pendingPOs, pendingPRs } = await dataFetcher.getProcurement()
      return {
        text: `${pendingPOs} purchase orders pending. ${pendingPRs} purchase requests awaiting approval.`,
        action: { label: 'Open Procurement', navigate: '/procurement' }
      }
    }

    return { text: `What specific data would you like to see?` }
  },

  // ============================================
  // SEARCH
  // ============================================
  async handleSearch(q, context, session) {
    const searchTerm = q.replace(/search|find|lookup|look for|who is|where is/gi, '').trim()

    if (!searchTerm) return { text: `Who or what are you looking for?` }

    // Search employees
    if (intentMapper.detectIntent(q) === 'employee' || this.matchAny(q, ['who is', 'employee', 'staff', 'cleaner', 'supervisor', 'manager'])) {
      const name = searchTerm.replace(/employee|staff|cleaner|supervisor|manager/gi, '').trim()
      const detail = await dataFetcher.getEmployeeDetail(name)
      if (detail) {
        contextManager.updateContext(context.userId, {
          mentionedEntity: `${detail.first_name} ${detail.last_name}`,
          mentionedEntityType: 'employee'
        })
        let text = `${detail.first_name} ${detail.last_name}\n${detail.position || 'Staff'} · ${detail.department || 'N/A'}\n`
        if (detail.attendance?.clock_in_time) text += `\n⏰ Clocked in today at ${new Date(detail.attendance.clock_in_time).toLocaleTimeString()}`
        else text += `\n⏰ Not clocked in today`
        if (detail.assignments?.length) text += `\n📋 Assigned to: ${detail.assignments.map(a => a.jobs?.title).join(', ')}`
        return { text, action: { label: 'View Employee', navigate: '/hr/employees' } }
      }
      return { text: `I couldn't find an employee matching "${name}". Try a different name or check the employee list.`, action: { label: 'View All Employees', navigate: '/hr/employees' } }
    }

    // Search clients
    if (intentMapper.detectIntent(q) === 'client') {
      const { data: clients } = await dataFetcher.getClients(searchTerm)
      if (clients?.length) {
        contextManager.updateContext(context.userId, { mentionedEntity: clients[0].company_name, mentionedEntityType: 'client' })
        return {
          text: `Found: ${clients.map(c => c.company_name).join(', ')}`,
          action: { label: 'View Clients', navigate: '/crm' }
        }
      }
      return { text: `No clients found matching "${searchTerm}".` }
    }

    // Search jobs by number
    if (intentMapper.detectIntent(q) === 'job' || searchTerm.toUpperCase().startsWith('JOB')) {
      const { data: jobs } = await supabase.from('jobs').select('job_number, title, status').eq('job_number', searchTerm.toUpperCase()).limit(1)
      if (jobs?.length) {
        return {
          text: `${jobs[0].job_number}: ${jobs[0].title} (${jobs[0].status})`,
          action: { label: 'View Job', navigate: '/operations' }
        }
      }
    }

    return { text: `I searched for "${searchTerm}" but couldn't find a match. Try a different search term.` }
  },

  // ============================================
  // GUIDE
  // ============================================
  handleGuide(q, intent, context) {
    if (intent === 'quotation' || this.matchAny(q, ['quote', 'quotation'])) {
      return {
        text: `To create a quotation:\n\n1. Open Sales & Quotations\n2. Click New Quotation\n3. Select the client\n4. Add services with prices\n5. Set validity date\n6. Save, send, or download as PDF\n\nAfter client approval, convert to invoice with one click.`,
        action: { label: 'Create Quotation', navigate: '/sales/quotations/new' }
      }
    }
    if (intent === 'incident') {
      return {
        text: `To report an incident:\n\n1. Open Field Ops → Incidents\n2. Click Report Incident\n3. Choose category and severity\n4. Describe what happened\n5. Add location, date, time\n6. List people involved\n7. Submit\n\nYour supervisor is notified automatically.`,
        action: { label: 'Report Incident', navigate: '/fieldops/incidents/report' }
      }
    }
    if (intent === 'leave') {
      return {
        text: `To apply for leave:\n\n1. Open HR → Leave Management\n2. Click New Leave Request\n3. Select leave type\n4. Choose dates\n5. Enter reason\n6. Submit for approval\n\nSA law: 15 days annual leave, 30 days sick leave per 3-year cycle.`,
        action: { label: 'Apply for Leave', navigate: '/hr' }
      }
    }
    if (intent === 'job') {
      return {
        text: `To create a job:\n\n1. Open Operations\n2. Click New Job\n3. Select client\n4. Choose category\n5. Enter details\n6. Set date, time, priority\n7. Specify cleaners needed\n8. Click Create & Schedule`,
        action: { label: 'Create Job', navigate: '/operations/jobs/new' }
      }
    }
    if (intent === 'attendance') {
      return {
        text: `To clock in:\n\n1. Open HR → Attendance\n2. Click Clock In\n3. GPS captured automatically\n4. Click Clock Out when done`,
        action: { label: 'Clock In/Out', navigate: '/hr/attendance' }
      }
    }
    if (intent === 'employee') {
      return {
        text: `To add an employee:\n\n1. Open HR → Employees\n2. Click Add Employee\n3. Fill personal details\n4. Add employment info\n5. Set up banking for payroll\n6. Save`,
        action: { label: 'Add Employee', navigate: '/hr/employees' }
      }
    }
    if (intent === 'payroll') {
      return {
        text: `To run payroll:\n\n1. Open Payroll\n2. Verify salary structures are up to date\n3. Create a payroll period\n4. Process the payroll run\n5. Review and approve\n6. Generate payslips\n\nRequires Finance Officer or Admin permissions.`,
        action: { label: 'Open Payroll', navigate: '/payroll' }
      }
    }
    if (intent === 'purchase') {
      return {
        text: `To create a purchase order:\n\n1. Open Procurement\n2. Click New PO\n3. Select vendor\n4. Add items with quantities and prices\n5. Set delivery date\n6. Send PO to vendor`,
        action: { label: 'Create PO', navigate: '/procurement/po/new' }
      }
    }
    return { text: `What would you like to learn how to do?` }
  },

  // ============================================
  // NAVIGATE
  // ============================================
  handleNavigate(q, intent, context) {
    const nav = {
      employee: { text: `Employees are under HR Management.`, action: { label: 'Open Employees', navigate: '/hr/employees' } },
      incident: { text: `Incidents are under Field Operations.`, action: { label: 'Open Incidents', navigate: '/fieldops/incidents' } },
      job: { text: `Jobs are under Operations.`, action: { label: 'Open Operations', navigate: '/operations' } },
      client: { text: `Clients are under CRM & Clients.`, action: { label: 'Open CRM', navigate: '/crm' } },
      quotation: { text: `Sales & Quotations is in the main menu.`, action: { label: 'Open Sales', navigate: '/sales' } },
      invoice: { text: `Invoices are under Sales & Quotations.`, action: { label: 'Open Sales', navigate: '/sales' } },
      inventory: { text: `Inventory is in the main menu.`, action: { label: 'Open Inventory', navigate: '/inventory' } },
      purchase: { text: `Procurement is in the main menu.`, action: { label: 'Open Procurement', navigate: '/procurement' } },
      payroll: { text: `Payroll is in the main menu.`, action: { label: 'Open Payroll', navigate: '/payroll' } },
      attendance: { text: `Attendance is under HR Management.`, action: { label: 'Open Attendance', navigate: '/hr/attendance' } },
      leave: { text: `Leave Management is under HR.`, action: { label: 'Open Leave', navigate: '/hr' } },
      report: { text: `Reports are in the main menu.`, action: { label: 'Open Reports', navigate: '/reports' } },
      document: { text: `Documents are in the main menu.`, action: { label: 'Open Documents', navigate: '/documents' } },
      vehicle: { text: `Fleet is in the main menu.`, action: { label: 'Open Fleet', navigate: '/fleet' } },
    }
    if (intent && nav[intent]) return nav[intent]
    return { text: `What are you looking for? I can help you find any module.` }
  },

  // ============================================
  // CREATE
  // ============================================
  handleCreate(q, intent, context) {
    if (intent === 'quotation') return { text: `Open Sales & Quotations and click New Quotation.`, action: { label: 'New Quotation', navigate: '/sales/quotations/new' } }
    if (intent === 'incident') return { text: `Open Incidents and click Report Incident.`, action: { label: 'Report Incident', navigate: '/fieldops/incidents/report' } }
    if (intent === 'job') return { text: `Open Operations and click New Job.`, action: { label: 'New Job', navigate: '/operations/jobs/new' } }
    if (intent === 'client') return { text: `Open CRM and click Add Client.`, action: { label: 'Add Client', navigate: '/crm/clients/new' } }
    if (intent === 'employee') return { text: `Open HR → Employees and click Add Employee.`, action: { label: 'Add Employee', navigate: '/hr/employees' } }
    if (intent === 'invoice') return { text: `Open Sales to create an invoice.`, action: { label: 'Open Sales', navigate: '/sales' } }
    if (intent === 'purchase') return { text: `Open Procurement and click New PO.`, action: { label: 'New PO', navigate: '/procurement/po/new' } }
    if (intent === 'leave') return { text: `Open HR → Leave Management to apply.`, action: { label: 'Apply Leave', navigate: '/hr' } }
    return { text: `What would you like to create?` }
  },

  // ============================================
  // EXPLAIN
  // ============================================
  handleExplain(q, intent, context) {
    const module = erpKnowledge.getModule(q)
    if (module) {
      let text = `${module.name}\n\n${module.description}\n\n`
      if (module.features?.length) text += `Features:\n${module.features.map(f => `• ${f}`).join('\n')}`
      return { text, action: module.navigation ? { label: `Open ${module.name}`, navigate: `/${module.key || ''}` } : null }
    }
    return { text: `Which module would you like explained? HR, Payroll, CRM, Sales, Operations, Inventory, Procurement, Incidents, Fleet, Reports?` }
  },

  // ============================================
  // REPORT
  // ============================================
  handleReport(q, intent, context) {
    return {
      text: `Reports are available for all modules. Go to Reports from the main menu, or each module has its own reports section.\n\nYou can generate:\n• HR reports (staff, attendance, leave)\n• Sales reports (revenue, quotations)\n• Operations reports (jobs, quality)\n• Finance reports (budgets, expenses)\n• Incident reports (safety, trends)`,
      action: { label: 'Open Reports', navigate: '/reports' }
    }
  },

  // ============================================
  // GENERAL
  // ============================================
  async handleGeneralQuery(q, intent, context) {
    // Try getting data for the detected intent
    if (intent) {
      return await this.handleDataQuery(q, intent, context, contextManager.getSession(context.userId))
    }
    return { text: `Ask me anything about your ERP. For example:\n\n• "How many employees do we have?"\n• "Show me open incidents"\n• "How do I create a quotation?"\n• "Where is inventory?"\n• "Who is [employee name]?"\n• "What jobs are scheduled today?"` }
  },

  // ============================================
  // HANDLE PRONOUN REFERENCES
  // ============================================
  async handleReference(reference, q, context) {
    if (reference.type === 'employee') {
      const detail = await dataFetcher.getEmployeeDetail(reference.entity)
      if (detail) {
        return { text: `You're asking about ${reference.entity}. What would you like to know about them?` }
      }
    }
    if (reference.type === 'client') {
      return { text: `You're referring to ${reference.entity}. What would you like to know?` }
    }
    return { text: `I remember we were discussing that. What would you like to do next?` }
  }
}
