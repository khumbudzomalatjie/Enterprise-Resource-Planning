import { supabase } from '../../../lib/supabaseClient'

export const aiEngine = {
  async processQuery(query, userContext) {
    const { role, userId, currentPage, userName } = userContext
    const lowerQuery = query.toLowerCase().trim()

    // ============================================
    // GREETINGS & CASUAL CONVERSATION
    // ============================================
    if (this.matchAny(lowerQuery, ['hello', 'hi', 'hey', 'dumela', 'sawubona', 'good morning', 'good afternoon', 'good evening'])) {
      return this.getWelcomeMessage(userName)
    }

    if (this.matchAny(lowerQuery, ['how are you', 'how do you do', 'how is it going'])) {
      return `🤖 I'm doing great, thank you for asking! I'm KHUMO, your ERP assistant, ready to help you 24/7.\n\nHow can I assist you today?`
    }

    if (this.matchAny(lowerQuery, ['who are you', 'what are you', 'your name', 'what do you do'])) {
      return `🤖 **I'm KHUMO!** I'm the AI assistant for the Ndanduleni Group ERP system.\n\nI can:\n🗺️ Guide you to any page in the ERP\n📊 Show you data and insights\n🔍 Find information for you\n📝 Explain how to use features\n💡 Give recommendations\n\nJust ask me anything about your ERP!`
    }

    if (this.matchAny(lowerQuery, ['thank', 'thanks', 'ke a leboga', 'appreciate'])) {
      return `🤖 You're very welcome! I'm happy to help. 😊\n\nIs there anything else you need?`
    }

    if (this.matchAny(lowerQuery, ['bye', 'goodbye', 'see you', 'sala kahle'])) {
      return `👋 Goodbye! Feel free to chat with me anytime you need help. I'm always here!`
    }

    // ============================================
    // ERP SYSTEM OVERVIEW
    // ============================================
    if (this.matchAny(lowerQuery, ['what is this system', 'what is erp', 'about this system', 'what does this do', 'overview'])) {
      return this.getSystemOverview(role)
    }

    // ============================================
    // NAVIGATION - WHERE TO FIND THINGS
    // ============================================
    if (this.matchAny(lowerQuery, ['where', 'find', 'how do i', 'navigate', 'go to', 'show me', 'take me', 'open', 'location'])) {
      return await this.handleNavigation(lowerQuery, role)
    }

    // ============================================
    // EMPLOYEES / HR / STAFF
    // ============================================
    if (this.matchAny(lowerQuery, ['employee', 'staff', 'worker', 'hr', 'human resource', 'personnel', 'people', 'team member', 'colleague'])) {
      return await this.handleEmployeeQuery(lowerQuery, role)
    }

    // ============================================
    // INCIDENTS / SAFETY / ACCIDENTS
    // ============================================
    if (this.matchAny(lowerQuery, ['incident', 'accident', 'safety', 'injury', 'hazard', 'risk', 'near miss', 'danger'])) {
      return await this.handleIncidentQuery(lowerQuery, role)
    }

    // ============================================
    // JOBS / OPERATIONS / SCHEDULING
    // ============================================
    if (this.matchAny(lowerQuery, ['job', 'schedule', 'operation', 'task', 'work order', 'assignment', 'route', 'shift'])) {
      return await this.handleJobQuery(lowerQuery, role)
    }

    // ============================================
    // CLIENTS / CRM / CUSTOMERS
    // ============================================
    if (this.matchAny(lowerQuery, ['client', 'customer', 'crm', 'lead', 'prospect', 'account', 'company'])) {
      return await this.handleCRMQuery(lowerQuery, role)
    }

    // ============================================
    // SALES / QUOTATIONS / INVOICES
    // ============================================
    if (this.matchAny(lowerQuery, ['sale', 'quote', 'quotation', 'invoice', 'proposal', 'deal', 'revenue', 'sell'])) {
      return await this.handleSalesQuery(lowerQuery, role)
    }

    // ============================================
    // INVENTORY / STOCK / WAREHOUSE
    // ============================================
    if (this.matchAny(lowerQuery, ['stock', 'inventory', 'warehouse', 'supply', 'item', 'product', 'material', 'equipment'])) {
      return await this.handleInventoryQuery(lowerQuery, role)
    }

    // ============================================
    // PROCUREMENT / PURCHASING / VENDORS
    // ============================================
    if (this.matchAny(lowerQuery, ['purchase', 'procurement', 'vendor', 'supplier', 'rfq', 'order', 'buy', 'procure'])) {
      return await this.handleProcurementQuery(lowerQuery, role)
    }

    // ============================================
    // FINANCE / BUDGET / PAYROLL
    // ============================================
    if (this.matchAny(lowerQuery, ['finance', 'budget', 'money', 'payroll', 'salary', 'tax', 'payment', 'expense', 'cost', 'accounting'])) {
      return await this.handleFinanceQuery(lowerQuery, role)
    }

    // ============================================
    // FLEET / VEHICLES / TRANSPORT
    // ============================================
    if (this.matchAny(lowerQuery, ['fleet', 'vehicle', 'car', 'truck', 'transport', 'driver', 'fuel', 'mileage'])) {
      return await this.handleFleetQuery(lowerQuery, role)
    }

    // ============================================
    // ATTENDANCE / TIME TRACKING
    // ============================================
    if (this.matchAny(lowerQuery, ['attendance', 'clock', 'timesheet', 'time tracking', 'absent', 'late', 'present'])) {
      return await this.handleAttendanceQuery(lowerQuery, role)
    }

    // ============================================
    // REPORTS / ANALYTICS
    // ============================================
    if (this.matchAny(lowerQuery, ['report', 'analytics', 'dashboard', 'chart', 'statistic', 'kpi', 'metric', 'data'])) {
      return await this.handleReportQuery(lowerQuery, role)
    }

    // ============================================
    // MOBILE / FIELD OPERATIONS
    // ============================================
    if (this.matchAny(lowerQuery, ['mobile', 'field', 'cleaner', 'app', 'phone', 'tablet'])) {
      return this.handleMobileQuery(role)
    }

    // ============================================
    // DOCUMENTS / FILES
    // ============================================
    if (this.matchAny(lowerQuery, ['document', 'file', 'upload', 'download', 'contract', 'policy', 'sop'])) {
      return this.handleDocumentQuery(role)
    }

    // ============================================
    // ASSETS / EQUIPMENT / MAINTENANCE
    // ============================================
    if (this.matchAny(lowerQuery, ['asset', 'maintenance', 'repair', 'machine', 'depreciation'])) {
      return this.handleAssetQuery(role)
    }

    // ============================================
    // HOW-TO / HELP / TUTORIAL
    // ============================================
    if (this.matchAny(lowerQuery, ['how to', 'how do', 'tutorial', 'guide', 'explain', 'help me', 'steps', 'process', 'workflow'])) {
      return this.handleHowToQuery(lowerQuery, role)
    }

    // ============================================
    // SMART FALLBACK
    // ============================================
    return this.getSmartFallback(lowerQuery, role)
  },

  // ============================================
  // HELPER: Match any keyword
  // ============================================
  matchAny(text, keywords) {
    return keywords.some(kw => text.includes(kw))
  },

  // ============================================
  // SYSTEM OVERVIEW
  // ============================================
  getSystemOverview(role) {
    return `🏢 **Ndanduleni Group ERP System**\n\n` +
      `This is a complete Enterprise Resource Planning system designed for cleaning, facilities management, security, and workforce operations.\n\n` +
      `**📦 Available Modules:**\n\n` +
      `| # | Module | Path |\n|---|--------|------|\n` +
      `| 1 | 👥 HR Management | /hr |\n` +
      `| 2 | 💰 Payroll | /payroll |\n` +
      `| 3 | ⏰ Attendance | /hr/attendance |\n` +
      `| 4 | 🏢 CRM & Clients | /crm |\n` +
      `| 5 | 📋 Sales & Quotations | /sales |\n` +
      `| 6 | ⚙️ Operations | /operations |\n` +
      `| 7 | 📦 Inventory | /inventory |\n` +
      `| 8 | 🛒 Procurement | /procurement |\n` +
      `| 9 | 🚛 Fleet Management | /fleet |\n` +
      `| 10 | 🚨 Incidents | /fieldops/incidents |\n` +
      `| 11 | 📊 Reports | /reports |\n` +
      `| 12 | 📁 Documents | /documents |\n` +
      `| 13 | 📱 Mobile App | /mobile |\n\n` +
      `You are logged in as **${role?.replace(/_/g, ' ') || 'User'}**.\n\n` +
      `Ask me about any module or feature and I'll guide you!`
  },

  // ============================================
  // SMART NAVIGATION
  // ============================================
  async handleNavigation(query, role) {
    const q = query.toLowerCase()

    if (this.matchAny(q, ['employee', 'staff', 'worker', 'hr', 'personnel'])) {
      return `👥 **Employee Management**\n\n` +
        `📌 **Location:** /hr/employees\n\n` +
        `**How to get there:**\n` +
        `1️⃣ Go to your Main Dashboard\n` +
        `2️⃣ Click on **Human Resources** module\n` +
        `3️⃣ Click **Employees** in the HR menu\n\n` +
        `🔗 **Click this link:** /hr/employees\n\n` +
        `**What you can do there:**\n` +
        `• View all employees with search and filters\n` +
        `• Add new employees\n` +
        `• Edit employee details\n` +
        `• View contracts, leave, training records\n\n` +
        `Would you like to know about a specific HR feature?`
    }

    if (this.matchAny(q, ['job', 'schedule', 'operation'])) {
      return `📅 **Job & Schedule Management**\n\n` +
        `**Multiple locations depending on what you need:**\n\n` +
        `📌 **All Jobs:** /operations\n` +
        `📌 **Live Jobs (Real-time):** /fieldops/live-jobs\n` +
        `📌 **Job Tracker (Audit):** /fieldops/job-tracker\n` +
        `📌 **Create New Job:** /operations/jobs/new\n\n` +
        `🔗 Click any link above to go directly there!\n\n` +
        `**Which one do you need?**\n` +
        `• **All Jobs** - View and manage all jobs\n` +
        `• **Live Jobs** - See active jobs and assign staff in real-time\n` +
        `• **Job Tracker** - Enter a job number to see its complete history`
    }

    if (this.matchAny(q, ['incident', 'accident', 'safety'])) {
      return `🚨 **Incident Management**\n\n` +
        `**Multiple locations:**\n\n` +
        `📌 **Incident Dashboard:** /fieldops/incidents\n` +
        `📌 **Report New Incident:** /fieldops/incidents/report\n` +
        `📌 **View All Incidents:** /fieldops/incidents/list\n` +
        `📌 **Track Incident:** /fieldops/incidents/tracker\n\n` +
        `🔗 Click any link to go directly there!\n\n` +
        `**Quick Guide:**\n` +
        `• To **report** - Click "Report New" above\n` +
        `• To **view** - Click "View All" above\n` +
        `• To **audit** - Use Tracker with incident number`
    }

    if (this.matchAny(q, ['client', 'customer', 'crm'])) {
      return `🏢 **CRM & Client Management**\n\n` +
        `📌 **Location:** /crm\n\n` +
        `**How to get there:**\n` +
        `1️⃣ Go to Main Dashboard\n` +
        `2️⃣ Click **CRM & Clients** module\n\n` +
        `🔗 **Click:** /crm\n\n` +
        `From CRM you can manage clients, contacts, pipeline, and services.`
    }

    if (this.matchAny(q, ['stock', 'inventory', 'warehouse'])) {
      return `📦 **Inventory Management**\n\n` +
        `📌 **Location:** /inventory\n\n` +
        `🔗 **Click:** /inventory\n\n` +
        `View stock levels, manage warehouses, track movements.`
    }

    if (this.matchAny(q, ['purchase', 'procurement', 'vendor'])) {
      return `🛒 **Procurement**\n\n` +
        `📌 **Location:** /procurement\n\n` +
        `🔗 **Click:** /procurement\n\n` +
        `Manage PRs, POs, RFQs, vendors, and goods receipts.`
    }

    if (this.matchAny(q, ['sale', 'quote', 'invoice'])) {
      return `📋 **Sales & Quotations**\n\n` +
        `📌 **Location:** /sales\n\n` +
        `🔗 **Click:** /sales\n\n` +
        `Create quotations, manage invoices, track payments.`
    }

    if (this.matchAny(q, ['finance', 'budget', 'payroll', 'salary'])) {
      return `💰 **Finance & Payroll**\n\n` +
        `📌 **Finance:** /finance\n` +
        `📌 **Payroll:** /payroll\n\n` +
        `🔗 Click either link to go directly there.`
    }

    if (this.matchAny(q, ['fleet', 'vehicle', 'car', 'truck'])) {
      return `🚛 **Fleet Management**\n\n📌 **Location:** /fleet\n\n🔗 **Click:** /fleet`
    }

    if (this.matchAny(q, ['attendance', 'clock', 'timesheet'])) {
      return `⏰ **Attendance**\n\n📌 **Location:** /hr/attendance\n\n🔗 **Click:** /hr/attendance`
    }

    if (this.matchAny(q, ['report', 'analytics'])) {
      return `📊 **Reports**\n\n📌 **Location:** /reports\n\n🔗 **Click:** /reports`
    }

    if (this.matchAny(q, ['document', 'file'])) {
      return `📁 **Documents**\n\n📌 **Location:** /documents\n\n🔗 **Click:** /documents`
    }

    if (this.matchAny(q, ['mobile', 'app', 'cleaner'])) {
      return `📱 **Mobile App**\n\n📌 **Location:** /mobile\n\n🔗 **Click:** /mobile`
    }

    // General navigation
    return this.getGeneralNavigation(role)
  },

  // ============================================
  // EMPLOYEE QUERIES
  // ============================================
  async handleEmployeeQuery(query, role) {
    const q = query.toLowerCase()

    try {
      // List all employees
      if (this.matchAny(q, ['list', 'show', 'all', 'see', 'view', 'how many', 'count'])) {
        const { data: employees, count } = await supabase
          .from('employees')
          .select('first_name, last_name, employee_code, department, position, email, phone', { count: 'exact' })
          .eq('employment_status', 'active')
          .order('first_name')
          .limit(15)

        let response = `👥 **Employee Directory**\n\n`
        response += `📌 **Full list:** /hr/employees\n\n`

        if (employees && employees.length > 0) {
          response += `**Showing ${employees.length} of ${count} active employees:**\n\n`
          employees.forEach(emp => {
            response += `• **${emp.first_name} ${emp.last_name || ''}** - ${emp.position || 'Staff'} (${emp.department || 'N/A'})\n`
          })
          if (count > 15) response += `\n*...and ${count - 15} more. View all at /hr/employees*\n`
        }

        response += `\n💡 You can search, filter, and manage employees at /hr/employees`
        return response
      }

      // Department query
      if (this.matchAny(q, ['department', 'which department'])) {
        const { data: depts } = await supabase.from('employees').select('department').eq('employment_status', 'active')
        const deptCount = {}
        depts?.forEach(d => { const name = d.department || 'Unassigned'; deptCount[name] = (deptCount[name] || 0) + 1 })
        
        let response = `🏢 **Departments**\n\n`
        Object.entries(deptCount).sort((a,b) => b[1] - a[1]).forEach(([dept, count]) => {
          response += `• **${dept}**: ${count} employees\n`
        })
        response += `\n📌 View full breakdown at /hr/employees`
        return response
      }

      // Leave query
      if (this.matchAny(q, ['leave', 'off', 'vacation', 'holiday'])) {
        const { count: pending } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        return `🏖️ **Leave Management**\n\n` +
          `📌 **Location:** /hr (HR Dashboard)\n\n` +
          `• Pending Leave Requests: **${pending || 0}**\n\n` +
          `**To manage leave:**\n` +
          `• Go to /hr and click **Leave Management**\n` +
          `• Approve or reject requests\n` +
          `• View leave balances`
      }

      return `👥 **HR Management**\n\n📌 **Location:** /hr\n\n` +
        `From HR you can manage employees, contracts, leave, training, attendance, and disciplinary records.\n\n` +
        `What specifically would you like to know about?`
    } catch (err) {
      return `👥 **HR Management**\n\n📌 Navigate to /hr to manage all employee-related functions.`
    }
  },

  // ============================================
  // INCIDENT QUERIES
  // ============================================
  async handleIncidentQuery(query, role) {
    try {
      const { count: total } = await supabase.from('incidents').select('*', { count: 'exact', head: true })
      const { count: open } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'submitted', 'acknowledged', 'under_review', 'under_investigation'])
      const { count: critical } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical')
      const { count: closed } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'closed')
      const { data: recent } = await supabase.from('incidents').select('incident_number, title, severity, status, incident_date').order('created_at', { ascending: false }).limit(5)

      let response = `🚨 **Incident Summary**\n\n`
      response += `📌 **Dashboard:** /fieldops/incidents\n\n`
      response += `| Metric | Count |\n|--------|-------|\n`
      response += `| Total | ${total || 0} |\n`
      response += `| Open | ${open || 0} |\n`
      response += `| Critical | ${critical || 0} |\n`
      response += `| Closed | ${closed || 0} |\n\n`

      if (recent && recent.length > 0) {
        response += `**Recent Incidents:**\n`
        recent.forEach(inc => {
          const icon = inc.severity === 'critical' ? '🔴' : inc.severity === 'high' ? '🟠' : inc.severity === 'medium' ? '🟡' : '🟢'
          response += `${icon} ${inc.incident_number}: ${inc.title}\n`
        })
      }

      response += `\n📌 **Report new:** /fieldops/incidents/report\n`
      response += `📌 **Track incident:** /fieldops/incidents/tracker`

      return response
    } catch (err) {
      return `🚨 **Incident Management**\n\n📌 Dashboard: /fieldops/incidents\n📌 Report: /fieldops/incidents/report`
    }
  },

  // ============================================
  // JOB QUERIES
  // ============================================
  async handleJobQuery(query, role) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: todayJobs } = await supabase.from('jobs').select('*').eq('scheduled_date', today).not('status', 'eq', 'completed').not('status', 'eq', 'cancelled')
      const { count: total } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).not('status', 'eq', 'completed').not('status', 'eq', 'cancelled')

      let response = `📅 **Job Overview**\n\n`
      response += `• Open Jobs: **${total || 0}**\n`
      response += `• Today's Jobs: **${todayJobs?.length || 0}**\n\n`
      response += `📌 **All Jobs:** /operations\n`
      response += `📌 **Live Jobs:** /fieldops/live-jobs\n`
      response += `📌 **Create Job:** /operations/jobs/new\n`
      response += `📌 **Job Tracker:** /fieldops/job-tracker`

      return response
    } catch (err) {
      return `📅 **Job Management**\n\n📌 Operations: /operations\n📌 Live Jobs: /fieldops/live-jobs`
    }
  },

  // ============================================
  // CRM QUERIES
  // ============================================
  async handleCRMQuery(query, role) {
    try {
      const { count: total } = await supabase.from('clients').select('*', { count: 'exact', head: true })
      const { count: active } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'active')

      return `🏢 **CRM Overview**\n\n` +
        `• Total Clients: **${total || 0}**\n` +
        `• Active: **${active || 0}**\n\n` +
        `📌 **CRM Dashboard:** /crm\n` +
        `📌 **Client List:** /crm/clients\n` +
        `📌 **Add Client:** /crm/clients/new\n\n` +
        `From CRM you can manage clients, contacts, pipeline, and services.`
    } catch (err) {
      return `🏢 **CRM Management**\n\n📌 Dashboard: /crm`
    }
  },

  // ============================================
  // SALES QUERIES
  // ============================================
  async handleSalesQuery(query, role) {
    return `📋 **Sales & Quotations**\n\n` +
      `📌 **Sales Dashboard:** /sales\n\n` +
      `**What you can do:**\n` +
      `• Create Quotation: /sales/quotations/new\n` +
      `• View Invoices: /sales/invoices\n` +
      `• Record Payment: /sales/payments\n` +
      `• Sales Reports: /sales/reports\n\n` +
      `💡 Quotations can be downloaded as A4 PDF and converted to invoices.`
  },

  // ============================================
  // INVENTORY QUERIES
  // ============================================
  async handleInventoryQuery(query, role) {
    try {
      const { count: total } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true })
      const { data: lowItems } = await supabase.from('inventory_items').select('name, current_stock, reorder_point').lte('current_stock', supabase.raw('COALESCE(reorder_point, 10)')).limit(5)

      let response = `📦 **Inventory**\n\n• Total Items: **${total || 0}**\n\n`
      
      if (lowItems && lowItems.length > 0) {
        response += `⚠️ **Low Stock:**\n`
        lowItems.forEach(i => response += `• ${i.name}: ${i.current_stock} left\n`)
      }

      response += `\n📌 **Dashboard:** /inventory\n📌 **Stock List:** /inventory/items`
      return response
    } catch (err) {
      return `📦 **Inventory Management**\n\n📌 Dashboard: /inventory`
    }
  },

  // ============================================
  // PROCUREMENT QUERIES
  // ============================================
  async handleProcurementQuery(query, role) {
    return `🛒 **Procurement**\n\n` +
      `📌 **Dashboard:** /procurement\n\n` +
      `**Quick Links:**\n` +
      `• Purchase Requests: /procurement/pr\n` +
      `• Purchase Orders: /procurement/po\n` +
      `• RFQs: /procurement/rfq\n` +
      `• Vendors: /procurement/vendors\n` +
      `• Goods Receipts: /procurement/receipts`
  },

  // ============================================
  // FINANCE QUERIES
  // ============================================
  async handleFinanceQuery(query, role) {
    if (role !== 'super_admin' && role !== 'finance_officer') {
      return `💰 **Finance**\n\n⚠️ Detailed financial data is restricted.\n\n📌 Available to you:\n• /sales - Revenue & invoices\n• /procurement - Purchase budgets\n\nContact your Finance Officer for full access.`
    }
    return `💰 **Finance & Payroll**\n\n📌 Finance: /finance\n📌 Payroll: /payroll\n📌 Sales: /sales`
  },

  // ============================================
  // FLEET QUERIES
  // ============================================
  async handleFleetQuery(query, role) {
    return `🚛 **Fleet Management**\n\n📌 Dashboard: /fleet\n\nTrack vehicles, schedule maintenance, monitor fuel, manage drivers.`
  },

  // ============================================
  // ATTENDANCE QUERIES
  // ============================================
  async handleAttendanceQuery(query, role) {
    return `⏰ **Attendance**\n\n📌 Location: /hr/attendance\n\nClock in/out, view timesheets, manage shifts, track attendance.`
  },

  // ============================================
  // REPORT QUERIES
  // ============================================
  async handleReportQuery(query, role) {
    return `📊 **Reports & Analytics**\n\n📌 Location: /reports\n\nGenerate reports for HR, Sales, Operations, Finance, and Incidents.`
  },

  // ============================================
  // MOBILE QUERIES
  // ============================================
  handleMobileQuery(role) {
    return `📱 **Mobile Workforce**\n\n📌 App: /mobile\n📌 Live Jobs: /fieldops/live-jobs\n\nCleaners can select jobs, clock in/out, take photos, report incidents from their phones.`
  },

  // ============================================
  // DOCUMENT QUERIES
  // ============================================
  handleDocumentQuery(role) {
    return `📁 **Document Management**\n\n📌 Location: /documents\n\nUpload, store, and manage contracts, policies, SOPs, and compliance documents.`
  },

  // ============================================
  // ASSET QUERIES
  // ============================================
  handleAssetQuery(role) {
    return `🔧 **Asset Management**\n\n📌 Location: /assets\n\nTrack assets, depreciation, maintenance schedules.`
  },

  // ============================================
  // HOW-TO QUERIES
  // ============================================
  handleHowToQuery(query, role) {
    const q = query.toLowerCase()

    if (this.matchAny(q, ['create job', 'new job', 'add job'])) {
      return `📝 **How to Create a Job**\n\n1️⃣ Go to /operations\n2️⃣ Click **"New Job"** button\n3️⃣ Fill in: Client, Title, Location, Date, Time\n4️⃣ Set priority and number of cleaners\n5️⃣ Click **"Create & Schedule"**\n\n📌 Direct link: /operations/jobs/new`
    }

    if (this.matchAny(q, ['report incident', 'new incident', 'log incident'])) {
      return `🚨 **How to Report an Incident**\n\n1️⃣ Go to /fieldops/incidents\n2️⃣ Click **"Report Incident"** (red button)\n3️⃣ Fill in: Title, Category, Severity, Description\n4️⃣ Add location, people involved, injuries\n5️⃣ Click **"Submit Report"**\n\n📌 Direct link: /fieldops/incidents/report`
    }

    if (this.matchAny(q, ['create quotation', 'new quote', 'quotation'])) {
      return `📋 **How to Create a Quotation**\n\n1️⃣ Go to /sales\n2️⃣ Click **"New Quotation"**\n3️⃣ Select client\n4️⃣ Add items/services with prices\n5️⃣ Download as A4 PDF or send to client\n\n📌 Direct link: /sales/quotations/new`
    }

    if (this.matchAny(q, ['assign', 'assign job', 'assign staff'])) {
      return `👤 **How to Assign Staff to a Job**\n\n1️⃣ Go to /fieldops/live-jobs\n2️⃣ Find the job\n3️⃣ Click the blue **👤+** button\n4️⃣ Select employee from dropdown\n5️⃣ Click **"Assign"**\n\nThey will see it instantly on mobile!`
    }

    if (this.matchAny(q, ['clock in', 'clock out', 'attendance'])) {
      return `⏰ **How to Clock In/Out**\n\n1️⃣ Go to /hr/attendance\n2️⃣ Click **"Clock In"** (green button)\n3️⃣ GPS location is captured automatically\n4️⃣ Click **"Clock Out"** when done\n\n📱 Also available on mobile app!`
    }

    return `🤖 **How can I help?**\n\nI can guide you through:\n• Creating jobs\n• Reporting incidents\n• Creating quotations\n• Assigning staff\n• Clock in/out\n• And more!\n\nJust ask "how to [what you want to do]"`
  },

  // ============================================
  // WELCOME MESSAGE
  // ============================================
  getWelcomeMessage(userName) {
    const name = userName || 'there'
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    return `🤖 **${greeting}, ${name}!** I'm **KHUMO**, your Ndanduleni ERP AI Assistant. 🇿🇦\n\n` +
      `I'm here to help you navigate and use the ERP system. Here's what I can do:\n\n` +
      `🗺️ **Find anything** - "Where do I see employees?"\n` +
      `📊 **Show data** - "How many open incidents?"\n` +
      `📝 **Explain how** - "How do I create a quotation?"\n` +
      `💡 **Give tips** - "What's the best way to...?"\n\n` +
      `**Try asking me:**\n` +
      `• "Show me the employee list"\n` +
      `• "Where do I report an incident?"\n` +
      `• "How many jobs are open today?"\n` +
      `• "How do I assign staff to a job?"\n\n` +
      `Just type your question below! 🎯`
  },

  // ============================================
  // GENERAL NAVIGATION
  // ============================================
  getGeneralNavigation(role) {
    return `🗺️ **ERP Navigation Guide**\n\n` +
      `Here's where to find everything:\n\n` +
      `| What | Where |\n|------|-------|\n` +
      `| Employees | /hr |\n` +
      `| Payroll | /payroll |\n` +
      `| Attendance | /hr/attendance |\n` +
      `| Clients | /crm |\n` +
      `| Sales/Quotes | /sales |\n` +
      `| Jobs/Operations | /operations |\n` +
      `| Live Jobs | /fieldops/live-jobs |\n` +
      `| Inventory | /inventory |\n` +
      `| Procurement | /procurement |\n` +
      `| Fleet | /fleet |\n` +
      `| Incidents | /fieldops/incidents |\n` +
      `| Reports | /reports |\n` +
      `| Documents | /documents |\n` +
      `| Mobile App | /mobile |\n\n` +
      `Click any path above or ask me for directions!`
  },

  // ============================================
  // SMART FALLBACK
  // ============================================
  getSmartFallback(query, role) {
    return `🤖 I understand you're asking about something, but I need a bit more clarity.\n\n` +
      `Here are some things I can help with:\n\n` +
      `👥 **Employees** - "Show me the staff list"\n` +
      `🚨 **Incidents** - "How many open incidents?"\n` +
      `📅 **Jobs** - "What jobs are scheduled today?"\n` +
      `🏢 **Clients** - "Show active clients"\n` +
      `📦 **Inventory** - "Check stock levels"\n` +
      `🛒 **Procurement** - "Pending purchase orders"\n` +
      `💰 **Finance** - "Revenue overview"\n` +
      `📱 **Mobile** - "How does the mobile app work?"\n\n` +
      `Or try: "Where can I find...?" and I'll guide you!\n\n` +
      `You can also click the Quick Prompts below ⚡`
  }
}
