import { supabase } from '../../../lib/supabaseClient'

export const aiEngine = {
  async processQuery(query, userContext) {
    const { role, userId, currentPage, userName } = userContext
    const q = query.toLowerCase().trim()

    // ============================================
    // GREETINGS
    // ============================================
    if (this.matchAny(q, ['hello', 'hi', 'hey', 'dumela', 'good morning', 'good afternoon', 'good evening'])) {
      return this.getWelcomeMessage(userName)
    }
    if (this.matchAny(q, ['how are you'])) return `🤖 I'm great, ${userName || 'there'}! Ready to help. What do you need?`
    if (this.matchAny(q, ['who are you', 'what are you', 'your name'])) return `🤖 I'm KHUMO, your Ndanduleni ERP AI Assistant. I know everything happening in your ERP. Ask me anything!`
    if (this.matchAny(q, ['thank', 'thanks'])) return `🤖 You're welcome! 😊`
    if (this.matchAny(q, ['bye', 'goodbye'])) return `👋 Goodbye! I'm always here when you need me.`

    // ============================================
    // HOW-TO QUESTIONS
    // ============================================
    if (this.matchAny(q, ['how to', 'how do i', 'how can i', 'create', 'make', 'add new', 'report', 'clock in', 'clock out', 'assign'])) {
      return this.handleHowTo(q)
    }

    // ============================================
    // WHERE QUESTIONS
    // ============================================
    if (this.matchAny(q, ['where', 'find', 'navigate', 'go to', 'show me', 'open', 'take me', 'location'])) {
      return this.handleNavigation(q)
    }

    // ============================================
    // DASHBOARD OVERVIEW
    // ============================================
    if (this.matchAny(q, ['dashboard', 'overview', 'summary', 'what is happening', 'whats going on', 'status', 'how is business'])) {
      return await this.getFullDashboardOverview()
    }

    // ============================================
    // HR / EMPLOYEES
    // ============================================
    if (this.matchAny(q, ['employee', 'staff', 'worker', 'hr', 'personnel', 'people', 'team'])) {
      return await this.getEmployeeInfo(q)
    }

    // ============================================
    // INCIDENTS
    // ============================================
    if (this.matchAny(q, ['incident', 'accident', 'safety', 'injury', 'hazard', 'risk', 'near miss'])) {
      return await this.getIncidentInfo(q)
    }

    // ============================================
    // JOBS / OPERATIONS
    // ============================================
    if (this.matchAny(q, ['job', 'schedule', 'operation', 'task', 'work order', 'assignment', 'route', 'shift'])) {
      return await this.getJobInfo(q)
    }

    // ============================================
    // CLIENTS / CRM
    // ============================================
    if (this.matchAny(q, ['client', 'customer', 'crm', 'lead', 'prospect', 'account'])) {
      return await this.getCRMInfo(q)
    }

    // ============================================
    // SALES / QUOTES / INVOICES
    // ============================================
    if (this.matchAny(q, ['sale', 'quote', 'quotation', 'invoice', 'proposal', 'revenue', 'sell'])) {
      return await this.getSalesInfo(q)
    }

    // ============================================
    // INVENTORY
    // ============================================
    if (this.matchAny(q, ['stock', 'inventory', 'warehouse', 'supply', 'item', 'product'])) {
      return await this.getInventoryInfo(q)
    }

    // ============================================
    // PROCUREMENT
    // ============================================
    if (this.matchAny(q, ['purchase', 'procurement', 'vendor', 'supplier', 'rfq', 'po', 'order'])) {
      return await this.getProcurementInfo(q)
    }

    // ============================================
    // FINANCE / PAYROLL
    // ============================================
    if (this.matchAny(q, ['finance', 'budget', 'money', 'payroll', 'salary', 'tax', 'payment', 'expense'])) {
      return await this.getFinanceInfo(q, role)
    }

    // ============================================
    // FLEET
    // ============================================
    if (this.matchAny(q, ['fleet', 'vehicle', 'car', 'truck', 'transport', 'driver', 'fuel'])) {
      return await this.getFleetInfo(q)
    }

    // ============================================
    // ATTENDANCE
    // ============================================
    if (this.matchAny(q, ['attendance', 'clock', 'timesheet', 'time tracking', 'absent', 'late', 'present'])) {
      return await this.getAttendanceInfo(q)
    }

    // ============================================
    // REPORTS
    // ============================================
    if (this.matchAny(q, ['report', 'analytics', 'chart', 'statistic', 'kpi', 'metric'])) {
      return `📊 **Reports** at /reports\n\nGenerate reports for any module. Each module also has its own reports section.`
    }

    // ============================================
    // MOBILE
    // ============================================
    if (this.matchAny(q, ['mobile', 'app', 'cleaner', 'phone'])) {
      return `📱 **Mobile App** at /mobile\n\nCleaners can select jobs, clock in/out, take photos, and report incidents from their phones. Managers monitor at /fieldops/live-jobs`
    }

    // ============================================
    // SMART FALLBACK
    // ============================================
    return `🤖 I'm KHUMO! I know everything happening in your ERP.\n\nTry asking me:\n• "What's happening today?"\n• "How many open incidents?"\n• "Show me employees"\n• "How many active jobs?"\n• "Check stock levels"\n• "Show pending purchase orders"\n• "How many clients do we have?"\n• "How do I create a quotation?"`
  },

  // ============================================
  // HELPER
  // ============================================
  matchAny(text, keywords) {
    return keywords.some(kw => text.includes(kw))
  },

  // ============================================
  // FULL DASHBOARD OVERVIEW
  // ============================================
  async getFullDashboardOverview() {
    try {
      const [
        { count: employees }, { count: openIncidents }, { count: criticalIncidents },
        { count: openJobs }, { count: inProgressJobs }, { count: activeClients },
        { count: totalStock }, { count: pendingPOs }, { count: pendingLeave },
        { data: todayJobs }
      ] = await Promise.all([
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active'),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_investigation', 'acknowledged']),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical').in('status', ['reported', 'under_investigation']),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).not('status', 'eq', 'completed').not('status', 'eq', 'cancelled'),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'active'),
        supabase.from('inventory_items').select('*', { count: 'exact', head: true }),
        supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent', 'confirmed']),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('jobs').select('*').eq('scheduled_date', new Date().toISOString().split('T')[0]).not('status', 'eq', 'completed')
      ])

      const today = new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

      return `📊 **ERP Dashboard Overview - ${today}**\n\n` +
        `| Module | Metric | Count |\n|--------|--------|-------|\n` +
        `| 👥 HR | Active Employees | **${employees || 0}** |\n` +
        `| 👥 HR | Pending Leave | **${pendingLeave || 0}** |\n` +
        `| 🚨 Incidents | Open Incidents | **${openIncidents || 0}** |\n` +
        `| 🚨 Incidents | Critical | **${criticalIncidents || 0}** |\n` +
        `| 📅 Jobs | Open Jobs | **${openJobs || 0}** |\n` +
        `| 📅 Jobs | In Progress | **${inProgressJobs || 0}** |\n` +
        `| 📅 Jobs | Today | **${todayJobs?.length || 0}** |\n` +
        `| 🏢 CRM | Active Clients | **${activeClients || 0}** |\n` +
        `| 📦 Inventory | Total Items | **${totalStock || 0}** |\n` +
        `| 🛒 Procurement | Pending POs | **${pendingPOs || 0}** |\n\n` +
        `📌 **Quick Actions:**\n` +
        `• View employees: /hr/employees\n` +
        `• Report incident: /fieldops/incidents/report\n` +
        `• Manage jobs: /operations\n` +
        `• Check stock: /inventory`
    } catch (err) {
      return `🤖 I couldn't fetch the dashboard data right now. Please try again or check individual modules.`
    }
  },

  // ============================================
  // EMPLOYEE INFO
  // ============================================
  async getEmployeeInfo(q) {
    try {
      const { count: total } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
      const { data: recent } = await supabase.from('employees').select('first_name, last_name, department, position').eq('employment_status', 'active').order('created_at', { ascending: false }).limit(5)
      const { count: onLeave } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved').gte('end_date', new Date().toISOString().split('T')[0])
      const { data: departments } = await supabase.from('employees').select('department').eq('employment_status', 'active')

      let response = `👥 **HR Overview**\n\n• Active Employees: **${total || 0}**\n• On Leave Today: **${onLeave || 0}**\n\n`

      if (departments) {
        const deptCount = {}
        departments.forEach(d => { const n = d.department || 'Unassigned'; deptCount[n] = (deptCount[n] || 0) + 1 })
        response += `**By Department:**\n`
        Object.entries(deptCount).sort((a,b) => b[1] - a[1]).forEach(([d, c]) => response += `• ${d}: ${c}\n`)
      }

      response += `\n📌 Full list: /hr/employees\n📌 Add employee: /hr/employees/new`
      return response
    } catch { return `👥 **HR** at /hr - ${await this.getCount('employees', 'employment_status', 'active')} active employees` }
  },

  // ============================================
  // INCIDENT INFO
  // ============================================
  async getIncidentInfo(q) {
    try {
      const { count: total } = await supabase.from('incidents').select('*', { count: 'exact', head: true })
      const { count: open } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'submitted', 'under_investigation', 'acknowledged'])
      const { count: critical } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical')
      const { count: closed } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'closed')
      const { data: recent } = await supabase.from('incidents').select('incident_number, title, severity, status, incident_date').order('created_at', { ascending: false }).limit(5)

      let response = `🚨 **Incident Report**\n\n• Total: **${total || 0}** | Open: **${open || 0}** | Critical: **${critical || 0}** | Closed: **${closed || 0}**\n\n`
      
      if (recent && recent.length > 0) {
        response += `**Recent:**\n`
        recent.forEach(i => response += `• ${i.severity === 'critical' ? '🔴' : i.severity === 'high' ? '🟠' : '🟡'} ${i.incident_number}: ${i.title}\n`)
      }

      response += `\n📌 Report: /fieldops/incidents/report\n📌 Track: /fieldops/incidents/tracker`
      return response
    } catch { return `🚨 **Incidents** at /fieldops/incidents` }
  },

  // ============================================
  // JOB INFO
  // ============================================
  async getJobInfo(q) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { count: open } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).not('status', 'eq', 'completed').not('status', 'eq', 'cancelled')
      const { count: inProgress } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress')
      const { count: todayCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('scheduled_date', today)
      const { count: unassigned } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      const { count: completed } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed')

      return `📅 **Jobs Overview**\n\n` +
        `• Open: **${open || 0}** | In Progress: **${inProgress || 0}** | Today: **${todayCount || 0}**\n` +
        `• Unassigned: **${unassigned || 0}** | Completed: **${completed || 0}**\n\n` +
        `📌 Manage: /operations\n📌 Live Jobs: /fieldops/live-jobs\n📌 Create: /operations/jobs/new`
    } catch { return `📅 **Jobs** at /operations` }
  },

  // ============================================
  // CRM INFO
  // ============================================
  async getCRMInfo(q) {
    try {
      const { count: total } = await supabase.from('clients').select('*', { count: 'exact', head: true })
      const { count: active } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'active')
      const { count: prospects } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'prospect')
      const { data: recent } = await supabase.from('clients').select('company_name, city, client_rating').eq('client_status', 'active').order('created_at', { ascending: false }).limit(5)

      let response = `🏢 **CRM Overview**\n\n• Total Clients: **${total || 0}** | Active: **${active || 0}** | Prospects: **${prospects || 0}**\n\n`
      if (recent && recent.length > 0) {
        response += `**Active Clients:**\n`
        recent.forEach(c => response += `• ${c.company_name} (${c.city || 'N/A'}) - Rating: ${c.client_rating || 'N/A'}\n`)
      }
      response += `\n📌 CRM: /crm\n📌 Add Client: /crm/clients/new`
      return response
    } catch { return `🏢 **CRM** at /crm` }
  },

  // ============================================
  // SALES INFO
  // ============================================
  async getSalesInfo(q) {
    try {
      const { count: quotations } = await supabase.from('quotations').select('*', { count: 'exact', head: true })
      const { count: pendingQuotes } = await supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('status', 'sent')
      const { count: invoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true })
      const { count: unpaidInvoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).in('status', ['sent', 'overdue'])

      return `📋 **Sales Overview**\n\n` +
        `• Quotations: **${quotations || 0}** (${pendingQuotes || 0} pending)\n` +
        `• Invoices: **${invoices || 0}** (${unpaidInvoices || 0} unpaid)\n\n` +
        `📌 Sales: /sales\n📌 New Quote: /sales/quotations/new`
    } catch { return `📋 **Sales** at /sales` }
  },

  // ============================================
  // INVENTORY INFO
  // ============================================
  async getInventoryInfo(q) {
    try {
      const { count: total } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true })
      const { data: lowStock } = await supabase.from('inventory_items').select('name, current_stock, reorder_point, unit').lte('current_stock', supabase.raw('COALESCE(reorder_point, 10)')).gt('current_stock', 0).limit(5)
      const { count: outOfStock } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).eq('current_stock', 0)

      let response = `📦 **Inventory**\n\n• Total Items: **${total || 0}**\n• Out of Stock: **${outOfStock || 0}**\n\n`
      if (lowStock && lowStock.length > 0) {
        response += `⚠️ **Low Stock:**\n`
        lowStock.forEach(i => response += `• ${i.name}: ${i.current_stock} ${i.unit || 'units'} left\n`)
      }
      response += `\n📌 Inventory: /inventory`
      return response
    } catch { return `📦 **Inventory** at /inventory` }
  },

  // ============================================
  // PROCUREMENT INFO
  // ============================================
  async getProcurementInfo(q) {
    try {
      const { count: pendingPRs } = await supabase.from('purchase_requisitions').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval')
      const { count: pendingPOs } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent', 'confirmed'])
      const { count: vendors } = await supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('status', 'active')

      return `🛒 **Procurement**\n\n` +
        `• Pending PRs: **${pendingPRs || 0}**\n` +
        `• Pending POs: **${pendingPOs || 0}**\n` +
        `• Active Vendors: **${vendors || 0}**\n\n` +
        `📌 Procurement: /procurement`
    } catch { return `🛒 **Procurement** at /procurement` }
  },

  // ============================================
  // FINANCE INFO
  // ============================================
  async getFinanceInfo(q, role) {
    if (role !== 'super_admin' && role !== 'finance_officer') {
      return `💰 **Finance** - Access restricted. Available: Sales at /sales and Procurement budgets at /procurement`
    }
    try {
      const { data: invoices } = await supabase.from('invoices').select('total_amount').in('status', ['sent', 'overdue', 'partially_paid'])
      const total = invoices?.reduce((s, i) => s + (i.total_amount || 0), 0) || 0
      return `💰 **Finance**\n\n• Outstanding Invoices: R ${total.toLocaleString()}\n\n📌 Finance: /finance\n📌 Payroll: /payroll`
    } catch { return `💰 **Finance** at /finance` }
  },

  // ============================================
  // FLEET INFO
  // ============================================
  async getFleetInfo(q) {
    return `🚛 **Fleet Management** at /fleet\n\nTrack vehicles, schedule maintenance, monitor fuel usage, and manage drivers.`
  },

  // ============================================
  // ATTENDANCE INFO
  // ============================================
  async getAttendanceInfo(q) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { count: present } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', today).eq('status', 'present')
      const { count: absent } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', today).eq('status', 'absent')
      return `⏰ **Attendance Today**\n\n• Present: **${present || 0}**\n• Absent: **${absent || 0}**\n\n📌 Attendance: /hr/attendance`
    } catch { return `⏰ **Attendance** at /hr/attendance` }
  },

  // ============================================
  // HOW-TO
  // ============================================
  handleHowTo(q) {
    if (this.matchAny(q, ['quote', 'quotation'])) return `📋 **Create Quotation:**\n1️⃣ Go to /sales\n2️⃣ Click "New Quotation"\n3️⃣ Select client\n4️⃣ Add items with prices\n5️⃣ Download as A4 PDF or send\n\n📌 /sales/quotations/new`
    if (this.matchAny(q, ['incident', 'accident'])) return `🚨 **Report Incident:**\n1️⃣ Go to /fieldops/incidents\n2️⃣ Click "Report Incident"\n3️⃣ Fill details\n4️⃣ Submit\n\n📌 /fieldops/incidents/report`
    if (this.matchAny(q, ['job', 'schedule'])) return `📝 **Create Job:**\n1️⃣ Go to /operations\n2️⃣ Click "New Job"\n3️⃣ Select client, fill details\n4️⃣ Schedule\n\n📌 /operations/jobs/new`
    if (this.matchAny(q, ['assign', 'allocate'])) return `👤 **Assign Staff:**\n1️⃣ Go to /fieldops/live-jobs\n2️⃣ Click blue 👤+ button\n3️⃣ Select employee\n4️⃣ Click Assign\n\n📌 /fieldops/live-jobs`
    if (this.matchAny(q, ['clock in', 'clock out'])) return `⏰ **Clock In/Out:**\n1️⃣ Go to /hr/attendance\n2️⃣ Click Clock In/Out\n3️⃣ GPS auto-captured\n\n📌 /hr/attendance`
    if (this.matchAny(q, ['invoice'])) return `📄 **Create Invoice:**\n1️⃣ Go to /sales\n2️⃣ Convert from quotation or create new\n\n📌 /sales`
    if (this.matchAny(q, ['client', 'customer'])) return `🏢 **Add Client:**\n1️⃣ Go to /crm\n2️⃣ Click "Add Client"\n3️⃣ Fill company details\n\n📌 /crm/clients/new`
    if (this.matchAny(q, ['employee', 'staff'])) return `👥 **Add Employee:**\n1️⃣ Go to /hr/employees\n2️⃣ Click "Add Employee"\n3️⃣ Fill details\n\n📌 /hr/employees`
    if (this.matchAny(q, ['purchase order', 'po'])) return `🛒 **Create PO:**\n1️⃣ Go to /procurement\n2️⃣ Click "New PO"\n3️⃣ Select vendor, add items\n\n📌 /procurement/po/new`
    return `🤖 What would you like to learn how to do? Try: "How to create a quotation?" or "How to report an incident?"`
  },

  // ============================================
  // NAVIGATION
  // ============================================
  handleNavigation(q) {
    if (this.matchAny(q, ['employee', 'staff', 'hr'])) return `👥 **Employees** at /hr/employees`
    if (this.matchAny(q, ['incident', 'accident'])) return `🚨 **Incidents** at /fieldops/incidents`
    if (this.matchAny(q, ['job', 'operation'])) return `📅 **Jobs** at /operations\n📌 Live: /fieldops/live-jobs`
    if (this.matchAny(q, ['client', 'crm'])) return `🏢 **Clients** at /crm`
    if (this.matchAny(q, ['quote', 'sale', 'invoice'])) return `📋 **Sales** at /sales`
    if (this.matchAny(q, ['stock', 'inventory'])) return `📦 **Inventory** at /inventory`
    if (this.matchAny(q, ['purchase', 'procurement', 'vendor'])) return `🛒 **Procurement** at /procurement`
    if (this.matchAny(q, ['finance', 'budget'])) return `💰 **Finance** at /finance`
    if (this.matchAny(q, ['payroll', 'salary'])) return `💰 **Payroll** at /payroll`
    if (this.matchAny(q, ['fleet', 'vehicle'])) return `🚛 **Fleet** at /fleet`
    if (this.matchAny(q, ['attendance', 'clock'])) return `⏰ **Attendance** at /hr/attendance`
    if (this.matchAny(q, ['report'])) return `📊 **Reports** at /reports`
    if (this.matchAny(q, ['document'])) return `📁 **Documents** at /documents`
    if (this.matchAny(q, ['mobile', 'app'])) return `📱 **Mobile App** at /mobile`
    return `🤖 What are you looking for? Try: "Where do I see employees?"`
  },

  // ============================================
  // HELPER: Get count
  // ============================================
  async getCount(table, column, value) {
    try {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq(column, value)
      return count || 0
    } catch { return 0 }
  },

  // ============================================
  // WELCOME
  // ============================================
  getWelcomeMessage(userName) {
    const name = userName || 'there'
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    return `🤖 **${greeting}, ${name}!** I'm **KHUMO**, your ERP AI Assistant. 🇿🇦\n\n` +
      `I know everything happening in your system. Try:\n\n` +
      `📊 **"What's happening today?"** - Full dashboard overview\n` +
      `👥 **"Show me employees"** - Staff list and stats\n` +
      `🚨 **"How many open incidents?"** - Incident report\n` +
      `📅 **"What jobs are open?"** - Job overview\n` +
      `📦 **"Check stock levels"** - Inventory status\n` +
      `📝 **"How do I create a quotation?"** - Step-by-step\n\n` +
      `Just ask! I'll fetch real-time data for you. 🎯`
  }
}
