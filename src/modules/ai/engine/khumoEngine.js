import { supabase } from '../../../lib/supabaseClient'
import { erpKnowledge } from './erpKnowledge'

export const khumoEngine = {
  async processQuery(query, context) {
    const { role, userName, currentPage } = context
    const q = query.toLowerCase().trim()

    // ============================================
    // GREETINGS
    // ============================================
    if (this.matchAny(q, ['hello', 'hi', 'hey', 'dumela', 'good morning', 'good afternoon', 'good evening'])) {
      return this.greet(userName, role)
    }

    // ============================================
    // WHAT IS / EXPLAIN
    // ============================================
    if (this.matchAny(q, ['what is', 'explain', 'tell me about', 'describe'])) {
      return this.explainModule(q)
    }

    // ============================================
    // HOW TO
    // ============================================
    if (this.matchAny(q, ['how to', 'how do i', 'how can i', 'steps to', 'guide me'])) {
      return this.guideUser(q)
    }

    // ============================================
    // WHERE IS
    // ============================================
    if (this.matchAny(q, ['where', 'find', 'locate', 'which page', 'navigate'])) {
      return this.navigateUser(q)
    }

    // ============================================
    // SHOW ME / DATA QUERIES
    // ============================================
    if (this.matchAny(q, ['show', 'display', 'list', 'view', 'how many', 'count', 'status', 'overview', 'summary'])) {
      return await this.fetchData(q, role)
    }

    // ============================================
    // CREATE / MAKE / ADD
    // ============================================
    if (this.matchAny(q, ['create', 'make', 'add', 'new', 'start'])) {
      return this.suggestAction(q, role)
    }

    // ============================================
    // SMART INTENT DETECTION
    // ============================================
    return this.detectIntent(q, context)
  },

  matchAny(text, keywords) {
    return keywords.some(kw => text.includes(kw))
  },

  greet(userName, role) {
    const name = userName || 'there'
    const hour = new Date().getHours()
    const g = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    return {
      text: `${g}, ${name}! I'm Khumo, your ERP Assistant.\n\nI can help you with:\n\n📊 View data - "Show me all employees"\n📝 Create things - "Create a quotation"\n🗺️ Find features - "Where do I approve leave?"\n💡 Learn - "What is inventory management?"\n\nWhat would you like to do?`
    }
  },

  explainModule(q) {
    const module = erpKnowledge.getModule(q)
    if (!module) {
      return { text: `I couldn't find a specific module matching your query. Try asking about: HR, Payroll, CRM, Sales, Operations, Inventory, Procurement, Fleet, Incidents, or Reports.` }
    }
    let response = `📚 **${module.name}**\n\n${module.description}\n\n`
    if (module.features?.length) {
      response += `**Key Features:**\n${module.features.map(f => `• ${f}`).join('\n')}\n`
    }
    if (module.navigation) response += `\n🗺️ **How to access:** ${module.navigation}`
    return { text: response, module: module.name }
  },

  guideUser(q) {
    if (this.matchAny(q, ['quote', 'quotation'])) {
      return { text: `📋 **Creating a Quotation**\n\n1️⃣ Open Sales & Quotations from the main menu\n2️⃣ Click New Quotation\n3️⃣ Select the Client\n4️⃣ Add services with quantities and prices\n5️⃣ Set valid until date\n6️⃣ Review preview\n7️⃣ Save & Send or download as A4 PDF\n\n💡 After approval, convert to invoice with one click.`, action: { label: 'Open Sales', navigate: '/sales' } }
    }
    if (this.matchAny(q, ['incident', 'accident', 'report'])) {
      return { text: `🚨 **Reporting an Incident**\n\n1️⃣ Open Field Ops → Incidents\n2️⃣ Click Report Incident\n3️⃣ Fill in Title, Category, Severity\n4️⃣ Add location, date, time\n5️⃣ List people involved\n6️⃣ Submit Report\n\n📌 Your supervisor is notified immediately.`, action: { label: 'Report Incident', navigate: '/fieldops/incidents/report' } }
    }
    if (this.matchAny(q, ['job', 'schedule'])) {
      return { text: `📝 **Creating a Job**\n\n1️⃣ Open Operations\n2️⃣ Click New Job\n3️⃣ Select Client\n4️⃣ Choose Job Category\n5️⃣ Enter title and site address\n6️⃣ Set date, time, priority\n7️⃣ Specify cleaners needed\n8️⃣ Click Create & Schedule`, action: { label: 'Open Operations', navigate: '/operations' } }
    }
    if (this.matchAny(q, ['clock in', 'clock out', 'attendance'])) {
      return { text: `⏰ **Clocking In/Out**\n\n1️⃣ Open HR → Attendance\n2️⃣ Click Clock In (green button)\n3️⃣ GPS captured automatically\n4️⃣ Click Clock Out when done\n\n💡 If you forgot, request a correction from your supervisor.`, action: { label: 'Open Attendance', navigate: '/hr/attendance' } }
    }
    if (this.matchAny(q, ['leave', 'apply leave'])) {
      return { text: `🏖️ **Applying for Leave**\n\n1️⃣ Open HR → Leave Management\n2️⃣ Click New Leave Request\n3️⃣ Select leave type\n4️⃣ Choose dates\n5️⃣ Enter reason\n6️⃣ Submit for approval\n\n📌 SA Law: 15 days annual leave, 30 days sick leave per 3-year cycle.`, action: { label: 'Open Leave', navigate: '/hr' } }
    }
    if (this.matchAny(q, ['assign', 'staff', 'employee'])) {
      return { text: `👤 **Assigning Staff**\n\n1️⃣ Open Field Ops → Live Jobs\n2️⃣ Find the job\n3️⃣ Click the blue Add Person button\n4️⃣ Select employee\n5️⃣ Click Assign\n\nThe employee sees the job instantly on mobile.`, action: { label: 'Open Live Jobs', navigate: '/fieldops/live-jobs' } }
    }
    return { text: `I can guide you through many tasks. Try: "How to create a quotation?", "How to report an incident?", "How to clock in?", "How to apply for leave?"` }
  },

  navigateUser(q) {
    const nav = {
      employee: { text: `👥 Employees are under HR Management.\n\nNavigate: Home → HR Management → Employees`, action: { label: 'Open Employees', navigate: '/hr/employees' } },
      incident: { text: `🚨 Incidents are under Field Operations.\n\nNavigate: Home → Field Ops → Incidents`, action: { label: 'Open Incidents', navigate: '/fieldops/incidents' } },
      job: { text: `📅 Jobs are under Operations.\n\nNavigate: Home → Operations`, action: { label: 'Open Operations', navigate: '/operations' } },
      client: { text: `🏢 Clients are under CRM & Clients.\n\nNavigate: Home → CRM & Clients`, action: { label: 'Open CRM', navigate: '/crm' } },
      quote: { text: `📋 Sales & Quotations is in the main menu.\n\nNavigate: Home → Sales & Quotations`, action: { label: 'Open Sales', navigate: '/sales' } },
      stock: { text: `📦 Inventory is in the main menu.\n\nNavigate: Home → Inventory`, action: { label: 'Open Inventory', navigate: '/inventory' } },
      purchase: { text: `🛒 Procurement is in the main menu.\n\nNavigate: Home → Procurement`, action: { label: 'Open Procurement', navigate: '/procurement' } },
      payroll: { text: `💰 Payroll is in the main menu.\n\nNavigate: Home → Payroll`, action: { label: 'Open Payroll', navigate: '/payroll' } },
      attendance: { text: `⏰ Attendance is under HR Management.\n\nNavigate: Home → HR Management → Attendance`, action: { label: 'Open Attendance', navigate: '/hr/attendance' } },
      report: { text: `📊 Reports are in the main menu.\n\nNavigate: Home → Reports`, action: { label: 'Open Reports', navigate: '/reports' } },
    }
    for (const [key, val] of Object.entries(nav)) {
      if (this.matchAny(q, [key])) return val
    }
    return { text: `I can help you find any feature. Try: "Where are employees?", "Where do I report an incident?", "Where is inventory?"` }
  },

  async fetchData(q, role) {
    try {
      if (this.matchAny(q, ['employee', 'staff', 'worker'])) {
        const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
        return { text: `👥 **Active Employees: ${count || 0}**\n\nView the full list under HR Management → Employees.`, action: { label: 'Open Employees', navigate: '/hr/employees' } }
      }
      if (this.matchAny(q, ['incident', 'accident'])) {
        const { count: open } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_investigation'])
        const { count: critical } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical')
        return { text: `🚨 **Incidents**\n• Open: ${open || 0}\n• Critical: ${critical || 0}\n${critical > 0 ? '⚠️ Critical incidents need attention!' : '✅ No critical incidents.'}`, action: { label: 'View Incidents', navigate: '/fieldops/incidents' } }
      }
      if (this.matchAny(q, ['job', 'schedule'])) {
        const { count: open } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).not('status', 'eq', 'completed').not('status', 'eq', 'cancelled')
        const { count: todayCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('scheduled_date', new Date().toISOString().split('T')[0])
        return { text: `📅 **Jobs**\n• Open: ${open || 0}\n• Today: ${todayCount || 0}`, action: { label: 'View Jobs', navigate: '/operations' } }
      }
      if (this.matchAny(q, ['client', 'customer'])) {
        const { count: total } = await supabase.from('clients').select('*', { count: 'exact', head: true })
        const { count: active } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'active')
        return { text: `🏢 **Clients**\n• Total: ${total || 0}\n• Active: ${active || 0}`, action: { label: 'Open CRM', navigate: '/crm' } }
      }
      if (this.matchAny(q, ['stock', 'inventory'])) {
        const { count: total } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true })
        return { text: `📦 **Inventory: ${total || 0} items**`, action: { label: 'Open Inventory', navigate: '/inventory' } }
      }
      if (this.matchAny(q, ['purchase', 'procurement', 'po'])) {
        const { count: pending } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent', 'confirmed'])
        return { text: `🛒 **Pending Purchase Orders: ${pending || 0}**`, action: { label: 'Open Procurement', navigate: '/procurement' } }
      }
      if (this.matchAny(q, ['attendance', 'present'])) {
        const { count: present } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', new Date().toISOString().split('T')[0]).not('clock_in_time', 'is', null)
        return { text: `⏰ **Clocked In Today: ${present || 0}**`, action: { label: 'Open Attendance', navigate: '/hr/attendance' } }
      }
    } catch (err) {
      console.error('Khumo data fetch error:', err)
    }
    return { text: `I can show you real-time data. Try: "Show me employees", "How many open incidents?", "What jobs are active?", "Check stock levels"` }
  },

  suggestAction(q, role) {
    if (this.matchAny(q, ['quote', 'quotation'])) return { text: `To create a quotation, open Sales & Quotations and click New Quotation.`, action: { label: 'Open Sales', navigate: '/sales' } }
    if (this.matchAny(q, ['incident', 'accident'])) return { text: `To report an incident, open Field Ops → Incidents and click Report Incident.`, action: { label: 'Report Incident', navigate: '/fieldops/incidents/report' } }
    if (this.matchAny(q, ['job'])) return { text: `To create a job, open Operations and click New Job.`, action: { label: 'Open Operations', navigate: '/operations' } }
    if (this.matchAny(q, ['client'])) return { text: `To add a client, open CRM & Clients and click Add Client.`, action: { label: 'Open CRM', navigate: '/crm' } }
    if (this.matchAny(q, ['employee', 'staff'])) return { text: `To add an employee, open HR → Employees and click Add Employee.`, action: { label: 'Open HR', navigate: '/hr' } }
    if (this.matchAny(q, ['invoice'])) return { text: `To create an invoice, open Sales & Quotations.`, action: { label: 'Open Sales', navigate: '/sales' } }
    if (this.matchAny(q, ['purchase', 'order', 'po'])) return { text: `To create a purchase order, open Procurement and click New PO.`, action: { label: 'Open Procurement', navigate: '/procurement' } }
    if (this.matchAny(q, ['leave'])) return { text: `To apply for leave, open HR → Leave Management.`, action: { label: 'Open Leave', navigate: '/hr' } }
    return { text: `What would you like to create? I can help with quotations, jobs, incidents, purchase orders, and more.` }
  },

  detectIntent(q, context) {
    if (this.matchAny(q, ['forgot', 'clock', 'missed'])) {
      return { text: `⏰ If you forgot to clock in, you can request an attendance correction from your supervisor.\n\nOpen HR → Attendance for the correction option.`, action: { label: 'Open Attendance', navigate: '/hr/attendance' } }
    }
    if (this.matchAny(q, ['wrong', 'error', 'mistake'])) {
      return { text: `If you need to correct something, you can usually edit it from the same module. What specifically needs correction?` }
    }
    if (this.matchAny(q, ['leave balance', 'leave days'])) {
      return { text: `Check your leave balance under HR → Leave Management.\n\n📌 Annual Leave: 15 working days per year (SA law).`, action: { label: 'Open Leave', navigate: '/hr' } }
    }
    return { text: `I'm here to help! Try asking:\n\n📊 "Show me all employees"\n📝 "Create a quotation"\n🗺️ "Where is inventory?"\n💡 "What is procurement?"\n📋 "How to apply for leave?"` }
  }
}
