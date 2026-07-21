import { supabase } from '../../../lib/supabaseClient'

export const khumoEngine = {
  async processQuery(query, context) {
    const { userId, userName, role } = context || {}
    const q = (query || '').toLowerCase().trim()
    
    if (!q) return { text: 'How can I help you?' }

    // ============================================
    // GREETINGS
    // ============================================
    if (this.hasWord(q, ['hello', 'hi', 'hey', 'dumela', 'good morning', 'good afternoon', 'good evening'])) {
      const name = userName || 'there'
      const hour = new Date().getHours()
      const g = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
      return { text: `${g}, ${name}. I'm Khumo, your ERP assistant. How can I help?` }
    }

    // ============================================
    // CASUAL
    // ============================================
    if (this.hasWord(q, ['how are you'])) return { text: `I'm great, ready to help! What do you need?` }
    if (this.hasWord(q, ['who are you'])) return { text: `I'm Khumo, the ERP assistant. Ask me anything about your system.` }
    if (this.hasWord(q, ['thank', 'thanks'])) return { text: `You're welcome! 😊` }
    if (this.hasWord(q, ['bye', 'goodbye'])) return { text: `Goodbye! I'm here when you need me.` }

    // ============================================
    // DASHBOARD OVERVIEW
    // ============================================
    if (this.hasWord(q, ['dashboard', 'overview', 'summary', 'what is happening', 'how is business'])) {
      return await this.getDashboardSummary()
    }

    // ============================================
    // EMPLOYEES
    // ============================================
    if (this.hasWord(q, ['employee', 'staff', 'worker', 'people', 'team', 'cleaner'])) {
      return await this.getEmployeeInfo(q)
    }

    // ============================================
    // INCIDENTS
    // ============================================
    if (this.hasWord(q, ['incident', 'accident', 'safety', 'injury', 'hazard', 'risk'])) {
      return await this.getIncidentInfo()
    }

    // ============================================
    // JOBS
    // ============================================
    if (this.hasWord(q, ['job', 'schedule', 'operation', 'task', 'work order'])) {
      return await this.getJobInfo()
    }

    // ============================================
    // CLIENTS
    // ============================================
    if (this.hasWord(q, ['client', 'customer', 'crm'])) {
      return await this.getClientInfo()
    }

    // ============================================
    // SALES / QUOTES
    // ============================================
    if (this.hasWord(q, ['sale', 'quote', 'quotation', 'invoice', 'revenue'])) {
      return await this.getSalesInfo(q)
    }

    // ============================================
    // INVENTORY
    // ============================================
    if (this.hasWord(q, ['stock', 'inventory', 'supply', 'item', 'product', 'warehouse'])) {
      return await this.getInventoryInfo()
    }

    // ============================================
    // PROCUREMENT
    // ============================================
    if (this.hasWord(q, ['purchase', 'procurement', 'vendor', 'supplier', 'rfq', 'po'])) {
      return await this.getProcurementInfo()
    }

    // ============================================
    // PAYROLL
    // ============================================
    if (this.hasWord(q, ['payroll', 'salary', 'payslip', 'wage', 'pay'])) {
      return await this.getPayrollInfo()
    }

    // ============================================
    // ATTENDANCE
    // ============================================
    if (this.hasWord(q, ['attendance', 'clock', 'timesheet', 'present', 'absent'])) {
      return await this.getAttendanceInfo()
    }

    // ============================================
    // LEAVE
    // ============================================
    if (this.hasWord(q, ['leave', 'vacation', 'holiday', 'time off'])) {
      return await this.getLeaveInfo()
    }

    // ============================================
    // FLEET
    // ============================================
    if (this.hasWord(q, ['fleet', 'vehicle', 'car', 'truck', 'transport'])) {
      return { text: `Fleet Management is available from the main menu. Track vehicles, maintenance, fuel, and drivers.`, action: { label: 'Open Fleet', navigate: '/fleet' } }
    }

    // ============================================
    // REPORTS
    // ============================================
    if (this.hasWord(q, ['report', 'analytics', 'chart', 'graph', 'kpi'])) {
      return { text: `Reports are available from the main menu. Generate reports for any module.`, action: { label: 'Open Reports', navigate: '/reports' } }
    }

    // ============================================
    // HOW TO
    // ============================================
    if (this.hasWord(q, ['how to', 'how do i', 'how can i'])) {
      return this.getHowToGuide(q)
    }

    // ============================================
    // WHERE IS
    // ============================================
    if (this.hasWord(q, ['where', 'find', 'locate', 'navigate'])) {
      return this.getNavigation(q)
    }

    // ============================================
    // SEARCH FOR PERSON
    // ============================================
    if (this.hasWord(q, ['who is', 'search', 'find', 'look'])) {
      return await this.searchPerson(q)
    }

    // ============================================
    // CREATE
    // ============================================
    if (this.hasWord(q, ['create', 'make', 'add', 'new', 'start'])) {
      return this.getCreateAction(q)
    }

    // ============================================
    // FALLBACK
    // ============================================
    return {
      text: `I can help with:\n\n• "Show me employees"\n• "How many open incidents?"\n• "What jobs are active?"\n• "How to create a quotation?"\n• "Where is inventory?"\n• "How many clients?"\n• "Check stock levels"\n• "Who is [name]?"\n\nWhat would you like to know?`
    }
  },

  // Helper
  hasWord(text, words) {
    return words.some(w => text.includes(w))
  },

  // ============================================
  // DATA FUNCTIONS
  // ============================================
  async getDashboardSummary() {
    try {
      const { count: emp } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
      const { count: jobs } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).not('status', 'eq', 'completed').not('status', 'eq', 'cancelled')
      const { count: inc } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_investigation'])
      const { count: clients } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'active')
      return {
        text: `📊 **ERP Overview**\n\n👥 Employees: ${emp || 0}\n📅 Open Jobs: ${jobs || 0}\n🚨 Open Incidents: ${inc || 0}\n🏢 Active Clients: ${clients || 0}\n\nWhat would you like to explore?`,
        action: { label: 'Open Dashboard', navigate: '/dashboard' }
      }
    } catch { return { text: 'Unable to load dashboard. Please try again.' } }
  },

  async getEmployeeInfo(q) {
    try {
      const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
      
      // Check if searching for specific person
      const searchMatch = q.match(/who is (.+)|find (.+)|search (.+)|lookup (.+)/i)
      if (searchMatch) {
        const name = (searchMatch[1] || searchMatch[2] || searchMatch[3] || searchMatch[4]).trim()
        const { data } = await supabase.from('employees').select('*').or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`).limit(5)
        if (data?.length) {
          return {
            text: `Found ${data.length} match(es):\n${data.map(e => `• ${e.first_name} ${e.last_name} - ${e.department || 'N/A'} (${e.position || 'Staff'})`).join('\n')}`,
            action: { label: 'View Employees', navigate: '/hr/employees' }
          }
        }
        return { text: `No employee found matching "${name}".`, action: { label: 'View All', navigate: '/hr/employees' } }
      }

      return {
        text: `👥 **${count || 0} active employees**\n\nView the full list with departments, positions, and contact details.`,
        action: { label: 'View Employees', navigate: '/hr/employees' }
      }
    } catch { return { text: `View employees under HR Management.`, action: { label: 'Open HR', navigate: '/hr' } } }
  },

  async getIncidentInfo() {
    try {
      const { count: open } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_investigation'])
      const { count: critical } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical')
      return {
        text: `🚨 **Incidents**\n• Open: ${open || 0}\n• Critical: ${critical || 0}${critical > 0 ? '\n\n⚠️ Critical incidents need attention!' : ''}`,
        action: { label: 'View Incidents', navigate: '/fieldops/incidents' }
      }
    } catch { return { text: `View incidents under Field Operations.`, action: { label: 'Open Incidents', navigate: '/fieldops/incidents' } } }
  },

  async getJobInfo() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { count: open } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).not('status', 'eq', 'completed').not('status', 'eq', 'cancelled')
      const { count: todayCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('scheduled_date', today)
      return {
        text: `📅 **Jobs**\n• Open: ${open || 0}\n• Today: ${todayCount || 0}`,
        action: { label: 'View Jobs', navigate: '/operations' }
      }
    } catch { return { text: `View jobs under Operations.`, action: { label: 'Open Operations', navigate: '/operations' } } }
  },

  async getClientInfo() {
    try {
      const { count: active } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'active')
      return {
        text: `🏢 **${active || 0} active clients**`,
        action: { label: 'View Clients', navigate: '/crm' }
      }
    } catch { return { text: `View clients under CRM & Clients.`, action: { label: 'Open CRM', navigate: '/crm' } } }
  },

  async getSalesInfo(q) {
    try {
      if (this.hasWord(q, ['invoice', 'overdue'])) {
        const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).lt('due_date', new Date().toISOString().split('T')[0]).in('status', ['sent', 'overdue'])
        return {
          text: count > 0 ? `💰 ${count} overdue invoices need attention.` : `✅ No overdue invoices.`,
          action: { label: 'View Invoices', navigate: '/sales' }
        }
      }
      const { count: quotes } = await supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('status', 'sent')
      return {
        text: `📋 ${quotes || 0} quotations pending.`,
        action: { label: 'Open Sales', navigate: '/sales' }
      }
    } catch { return { text: `Sales & Quotations in the main menu.`, action: { label: 'Open Sales', navigate: '/sales' } } }
  },

  async getInventoryInfo() {
    try {
      const { count } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true })
      const { count: low } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).lte('current_stock', 10).gt('current_stock', 0)
      return {
        text: `📦 ${count || 0} items in stock.${low > 0 ? ` ${low} items running low.` : ''}`,
        action: { label: 'Open Inventory', navigate: '/inventory' }
      }
    } catch { return { text: `Inventory in the main menu.`, action: { label: 'Open Inventory', navigate: '/inventory' } } }
  },

  async getProcurementInfo() {
    try {
      const { count: pos } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent', 'confirmed'])
      return {
        text: `🛒 ${pos || 0} purchase orders pending.`,
        action: { label: 'Open Procurement', navigate: '/procurement' }
      }
    } catch { return { text: `Procurement in the main menu.`, action: { label: 'Open Procurement', navigate: '/procurement' } } }
  },

  async getPayrollInfo() {
    try {
      const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
      return {
        text: `💰 ${count || 0} employees on payroll.`,
        action: { label: 'Open Payroll', navigate: '/payroll' }
      }
    } catch { return { text: `Payroll in the main menu.`, action: { label: 'Open Payroll', navigate: '/payroll' } } }
  },

  async getAttendanceInfo() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', today).not('clock_in_time', 'is', null)
      return {
        text: `⏰ ${count || 0} clocked in today.`,
        action: { label: 'Open Attendance', navigate: '/hr/attendance' }
      }
    } catch { return { text: `Attendance under HR.`, action: { label: 'Open Attendance', navigate: '/hr/attendance' } } }
  },

  async getLeaveInfo() {
    try {
      const { count: pending } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      return {
        text: `🏖️ ${pending || 0} leave requests pending.`,
        action: { label: 'View Leave', navigate: '/hr' }
      }
    } catch { return { text: `Leave Management under HR.`, action: { label: 'Open HR', navigate: '/hr' } } }
  },

  // ============================================
  // HOW TO GUIDE
  // ============================================
  getHowToGuide(q) {
    if (this.hasWord(q, ['quote', 'quotation'])) return { text: `**Create a Quotation:**\n1. Open Sales & Quotations\n2. Click New Quotation\n3. Select client\n4. Add items with prices\n5. Save or send as PDF`, action: { label: 'New Quotation', navigate: '/sales/quotations/new' } }
    if (this.hasWord(q, ['incident', 'accident', 'report'])) return { text: `**Report an Incident:**\n1. Open Field Ops → Incidents\n2. Click Report Incident\n3. Fill details\n4. Submit`, action: { label: 'Report Incident', navigate: '/fieldops/incidents/report' } }
    if (this.hasWord(q, ['job'])) return { text: `**Create a Job:**\n1. Open Operations\n2. Click New Job\n3. Fill details\n4. Schedule`, action: { label: 'New Job', navigate: '/operations/jobs/new' } }
    if (this.hasWord(q, ['leave', 'apply'])) return { text: `**Apply for Leave:**\n1. Open HR → Leave\n2. Click New Request\n3. Select type and dates\n4. Submit`, action: { label: 'Apply Leave', navigate: '/hr' } }
    if (this.hasWord(q, ['clock', 'attendance'])) return { text: `**Clock In/Out:**\n1. Open HR → Attendance\n2. Click Clock In\n3. GPS auto-captured`, action: { label: 'Clock In', navigate: '/hr/attendance' } }
    if (this.hasWord(q, ['employee', 'staff', 'add'])) return { text: `**Add Employee:**\n1. Open HR → Employees\n2. Click Add Employee\n3. Fill details\n4. Save`, action: { label: 'Add Employee', navigate: '/hr/employees' } }
    if (this.hasWord(q, ['client', 'add'])) return { text: `**Add Client:**\n1. Open CRM\n2. Click Add Client\n3. Fill company details\n4. Save`, action: { label: 'Add Client', navigate: '/crm/clients/new' } }
    if (this.hasWord(q, ['purchase', 'order', 'po'])) return { text: `**Create Purchase Order:**\n1. Open Procurement\n2. Click New PO\n3. Select vendor, add items\n4. Send`, action: { label: 'New PO', navigate: '/procurement/po/new' } }
    if (this.hasWord(q, ['invoice'])) return { text: `**Create Invoice:**\n1. Open Sales\n2. Convert from quotation or create new\n3. Send to client`, action: { label: 'Open Sales', navigate: '/sales' } }
    return { text: `What would you like to learn how to do?` }
  },

  // ============================================
  // NAVIGATION
  // ============================================
  getNavigation(q) {
    const map = {
      employee: { text: `HR Management → Employees`, action: { label: 'Open Employees', navigate: '/hr/employees' } },
      incident: { text: `Field Operations → Incidents`, action: { label: 'Open Incidents', navigate: '/fieldops/incidents' } },
      job: { text: `Operations`, action: { label: 'Open Operations', navigate: '/operations' } },
      client: { text: `CRM & Clients`, action: { label: 'Open CRM', navigate: '/crm' } },
      quote: { text: `Sales & Quotations`, action: { label: 'Open Sales', navigate: '/sales' } },
      invoice: { text: `Sales & Quotations`, action: { label: 'Open Sales', navigate: '/sales' } },
      stock: { text: `Inventory`, action: { label: 'Open Inventory', navigate: '/inventory' } },
      purchase: { text: `Procurement`, action: { label: 'Open Procurement', navigate: '/procurement' } },
      payroll: { text: `Payroll`, action: { label: 'Open Payroll', navigate: '/payroll' } },
      attendance: { text: `HR → Attendance`, action: { label: 'Open Attendance', navigate: '/hr/attendance' } },
      leave: { text: `HR → Leave Management`, action: { label: 'Open Leave', navigate: '/hr' } },
      report: { text: `Reports`, action: { label: 'Open Reports', navigate: '/reports' } },
      document: { text: `Documents`, action: { label: 'Open Documents', navigate: '/documents' } },
      fleet: { text: `Fleet Management`, action: { label: 'Open Fleet', navigate: '/fleet' } },
    }
    for (const [key, val] of Object.entries(map)) {
      if (this.hasWord(q, [key])) return val
    }
    return { text: `What are you looking for?` }
  },

  // ============================================
  // SEARCH PERSON
  // ============================================
  async searchPerson(q) {
    const words = q.split(' ')
    const nameIndex = words.findIndex(w => w === 'is' || w === 'search' || w === 'find' || w === 'look')
    const name = nameIndex >= 0 ? words.slice(nameIndex + 1).join(' ') : ''
    if (!name) return { text: `Who are you looking for?` }
    try {
      const { data } = await supabase.from('employees').select('*').or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`).limit(5)
      if (data?.length) {
        return {
          text: `Found:\n${data.map(e => `• ${e.first_name} ${e.last_name} - ${e.department || 'N/A'}`).join('\n')}`,
          action: { label: 'View Employees', navigate: '/hr/employees' }
        }
      }
      return { text: `No one found matching "${name}".` }
    } catch { return { text: `Search failed. Try again.` } }
  },

  // ============================================
  // CREATE
  // ============================================
  getCreateAction(q) {
    if (this.hasWord(q, ['quote', 'quotation'])) return { text: `Open Sales and click New Quotation.`, action: { label: 'New Quotation', navigate: '/sales/quotations/new' } }
    if (this.hasWord(q, ['incident', 'accident'])) return { text: `Open Incidents and click Report Incident.`, action: { label: 'Report', navigate: '/fieldops/incidents/report' } }
    if (this.hasWord(q, ['job'])) return { text: `Open Operations and click New Job.`, action: { label: 'New Job', navigate: '/operations/jobs/new' } }
    if (this.hasWord(q, ['client'])) return { text: `Open CRM and click Add Client.`, action: { label: 'Add Client', navigate: '/crm/clients/new' } }
    if (this.hasWord(q, ['employee', 'staff'])) return { text: `Open HR → Employees and click Add Employee.`, action: { label: 'Add Employee', navigate: '/hr/employees' } }
    if (this.hasWord(q, ['invoice'])) return { text: `Open Sales to create an invoice.`, action: { label: 'Open Sales', navigate: '/sales' } }
    if (this.hasWord(q, ['purchase', 'order', 'po'])) return { text: `Open Procurement and click New PO.`, action: { label: 'New PO', navigate: '/procurement/po/new' } }
    if (this.hasWord(q, ['leave'])) return { text: `Open HR → Leave to apply.`, action: { label: 'Apply Leave', navigate: '/hr' } }
    return { text: `What would you like to create?` }
  }
}
