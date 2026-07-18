import { supabase } from '../../../lib/supabaseClient'

export const aiEngine = {
  async processQuery(query, userContext) {
    const { role, userId, currentPage, userName } = userContext
    const lowerQuery = query.toLowerCase()

    // ============================================
    // GREETINGS
    // ============================================
    if (lowerQuery.includes('hello') || lowerQuery.includes('hi ') || lowerQuery.includes('hey') || 
        lowerQuery.includes('who are you') || lowerQuery.includes('dumela') || lowerQuery.includes('help')) {
      return this.getWelcomeMessage(userName)
    }

    if (lowerQuery.includes('thank') || lowerQuery.includes('thanks')) {
      return `🤖 **You're welcome!** I'm KHUMO, always here to guide you. 😊\n\nIs there anything else you need help finding?`
    }

    // ============================================
    // NAVIGATION & "WHERE CAN I FIND..." QUERIES
    // ============================================
    if (lowerQuery.includes('where') || lowerQuery.includes('find') || lowerQuery.includes('how do i') || 
        lowerQuery.includes('navigate') || lowerQuery.includes('go to') || lowerQuery.includes('show me')) {
      return this.handleNavigationQuery(lowerQuery, role)
    }

    // ============================================
    // EMPLOYEES / HR
    // ============================================
    if (lowerQuery.includes('employee') || lowerQuery.includes('staff') || lowerQuery.includes('worker') ||
        lowerQuery.includes('hr') || lowerQuery.includes('human resource') || lowerQuery.includes('personnel')) {
      return this.handleEmployeeQuery(lowerQuery, role)
    }

    // ============================================
    // INCIDENTS
    // ============================================
    if (lowerQuery.includes('incident') || lowerQuery.includes('accident') || lowerQuery.includes('risk')) {
      return this.handleIncidentQuery(lowerQuery, role)
    }

    // ============================================
    // JOBS / SCHEDULING / OPERATIONS
    // ============================================
    if (lowerQuery.includes('job') || lowerQuery.includes('schedule') || lowerQuery.includes('route') || 
        lowerQuery.includes('operation') || lowerQuery.includes('task') || lowerQuery.includes('work order')) {
      return this.handleJobQuery(lowerQuery, role)
    }

    // ============================================
    // CLIENTS / CRM
    // ============================================
    if (lowerQuery.includes('client') || lowerQuery.includes('customer') || lowerQuery.includes('crm') ||
        lowerQuery.includes('contract') || lowerQuery.includes('lead')) {
      return this.handleCRMQuery(lowerQuery, role)
    }

    // ============================================
    // INVENTORY / STOCK
    // ============================================
    if (lowerQuery.includes('stock') || lowerQuery.includes('inventory') || lowerQuery.includes('supply') || 
        lowerQuery.includes('item') || lowerQuery.includes('product') || lowerQuery.includes('warehouse')) {
      return this.handleInventoryQuery(lowerQuery, role)
    }

    // ============================================
    // PROCUREMENT / PURCHASE ORDERS
    // ============================================
    if (lowerQuery.includes('purchase') || lowerQuery.includes('order') || lowerQuery.includes('procurement') || 
        lowerQuery.includes('vendor') || lowerQuery.includes('supplier') || lowerQuery.includes('rfq')) {
      return this.handleProcurementQuery(lowerQuery, role)
    }

    // ============================================
    // FINANCE
    // ============================================
    if (lowerQuery.includes('finance') || lowerQuery.includes('budget') || lowerQuery.includes('invoice') ||
        lowerQuery.includes('revenue') || lowerQuery.includes('payment') || lowerQuery.includes('salary') ||
        lowerQuery.includes('payroll') || lowerQuery.includes('tax')) {
      return this.handleFinanceQuery(lowerQuery, role)
    }

    // ============================================
    // SALES / QUOTATIONS
    // ============================================
    if (lowerQuery.includes('sale') || lowerQuery.includes('quote') || lowerQuery.includes('quotation') ||
        lowerQuery.includes('invoice') || lowerQuery.includes('proposal')) {
      return this.handleSalesQuery(lowerQuery, role)
    }

    // ============================================
    // FLEET / VEHICLES
    // ============================================
    if (lowerQuery.includes('fleet') || lowerQuery.includes('vehicle') || lowerQuery.includes('car') ||
        lowerQuery.includes('truck') || lowerQuery.includes('transport') || lowerQuery.includes('driver')) {
      return this.handleFleetQuery(lowerQuery, role)
    }

    // ============================================
    // REPORTS / ANALYTICS
    // ============================================
    if (lowerQuery.includes('report') || lowerQuery.includes('analytics') || lowerQuery.includes('dashboard') ||
        lowerQuery.includes('chart') || lowerQuery.includes('statistic') || lowerQuery.includes('kpi')) {
      return this.handleReportQuery(lowerQuery, role)
    }

    // ============================================
    // MAINTENANCE / EQUIPMENT
    // ============================================
    if (lowerQuery.includes('maintenance') || lowerQuery.includes('equipment') || lowerQuery.includes('repair') ||
        lowerQuery.includes('asset') || lowerQuery.includes('machine')) {
      return this.handleMaintenanceQuery(lowerQuery, role)
    }

    // ============================================
    // ATTENDANCE / TIME TRACKING
    // ============================================
    if (lowerQuery.includes('attendance') || lowerQuery.includes('clock in') || lowerQuery.includes('clock out') ||
        lowerQuery.includes('timesheet') || lowerQuery.includes('time tracking') || lowerQuery.includes('absent')) {
      return this.handleAttendanceQuery(lowerQuery, role)
    }

    // ============================================
    // DOCUMENTS
    // ============================================
    if (lowerQuery.includes('document') || lowerQuery.includes('file') || lowerQuery.includes('upload') ||
        lowerQuery.includes('download') || lowerQuery.includes('contract') || lowerQuery.includes('policy')) {
      return this.handleDocumentQuery(lowerQuery, role)
    }

    // ============================================
    // MOBILE / FIELD OPS
    // ============================================
    if (lowerQuery.includes('mobile') || lowerQuery.includes('field') || lowerQuery.includes('cleaner') ||
        lowerQuery.includes('app') || lowerQuery.includes('phone')) {
      return this.handleMobileQuery(lowerQuery, role)
    }

    // ============================================
    // GENERAL FALLBACK - Give directions
    // ============================================
    return this.getGeneralDirections(role)
  },

  // ============================================
  // NAVIGATION HANDLER
  // ============================================
  handleNavigationQuery(query, role) {
    if (query.includes('employee') || query.includes('staff') || query.includes('worker')) {
      return `👥 **Finding Employees**\n\n` +
        `Here's how to view your employee list:\n\n` +
        `📌 **Step 1:** Go to the **Main Dashboard**\n` +
        `📌 **Step 2:** Click on the **Human Resources** module card\n` +
        `📌 **Step 3:** On the HR Dashboard, click **Employees**\n` +
        `📌 **Step 4:** You'll see the complete employee list with search and filters\n\n` +
        `🔗 **Direct Link:** Navigate to **/hr/employees** in your browser\n\n` +
        `💡 **Tip:** You can also click "HR Management" on your dashboard for quick access.\n\n` +
        `Would you like me to tell you about specific employee management features?`
    }

    if (query.includes('job') || query.includes('schedule') || query.includes('operation')) {
      return `📅 **Finding Jobs & Schedules**\n\n` +
        `Here's how to manage your jobs:\n\n` +
        `📌 **All Jobs:** Go to **Operations > Jobs** from the main dashboard\n` +
        `📌 **Live Jobs:** Go to **Field Ops > Live Jobs** to see active jobs\n` +
        `📌 **Create Job:** Go to **Operations** and click "New Job"\n` +
        `📌 **Job Tracker:** Go to **Field Ops > Job Tracker** to audit any job\n\n` +
        `🔗 **Quick Links:**\n` +
        `• Operations: **/operations**\n` +
        `• Live Jobs: **/fieldops/live-jobs**\n` +
        `• Job Tracker: **/fieldops/job-tracker**\n\n` +
        `💡 **Tip:** Use the Job Tracker to see who created, assigned, and completed each job.`
    }

    if (query.includes('incident') || query.includes('accident')) {
      return `🚨 **Finding Incidents**\n\n` +
        `Here's how to manage incidents:\n\n` +
        `📌 **Dashboard:** Go to **Field Ops > Incidents** for the overview\n` +
        `📌 **Report New:** Click **"Report Incident"** button (red)\n` +
        `📌 **View All:** Click **"View All"** or go to **Incidents > List**\n` +
        `📌 **Track:** Use **Incident Tracker** to audit any incident\n\n` +
        `🔗 **Quick Links:**\n` +
        `• Incident Dashboard: **/fieldops/incidents**\n` +
        `• Report Incident: **/fieldops/incidents/report**\n` +
        `• Incident Tracker: **/fieldops/incidents/tracker**\n\n` +
        `💡 **Tip:** The Incident Tracker shows who reported, investigated, and approved each incident.`
    }

    if (query.includes('client') || query.includes('customer') || query.includes('crm')) {
      return `🏢 **Finding Clients**\n\n` +
        `Here's how to manage your clients:\n\n` +
        `📌 **Step 1:** Go to the **Main Dashboard**\n` +
        `📌 **Step 2:** Click on **CRM & Clients** module card\n` +
        `📌 **Step 3:** You'll see the CRM Dashboard with pipeline and client list\n\n` +
        `🔗 **Direct Link:** Navigate to **/crm** in your browser\n\n` +
        `💡 **From there you can:**\n` +
        `• View all clients\n` +
        `• Add new clients\n` +
        `• Manage contacts\n` +
        `• Track sales pipeline\n` +
        `• Record interactions`
    }

    if (query.includes('stock') || query.includes('inventory') || query.includes('warehouse')) {
      return `📦 **Finding Inventory**\n\n` +
        `Here's how to manage your stock:\n\n` +
        `📌 **Dashboard:** Go to **Inventory** from the main dashboard\n` +
        `📌 **Stock List:** Click **Stock List** to see all items\n` +
        `📌 **Low Stock:** The dashboard shows low stock alerts\n\n` +
        `🔗 **Direct Link:** Navigate to **/inventory**\n\n` +
        `💡 **Tip:** Set reorder points for items to get automatic low-stock alerts.`
    }

    if (query.includes('purchase') || query.includes('procurement') || query.includes('vendor')) {
      return `🛒 **Finding Procurement**\n\n` +
        `Here's how to manage purchasing:\n\n` +
        `📌 **Dashboard:** Go to **Procurement** from the main dashboard\n` +
        `📌 **Purchase Requests (PR):** Click **Purchase Requests**\n` +
        `📌 **Purchase Orders (PO):** Click **Purchase Orders**\n` +
        `📌 **RFQs:** Click **RFQ Management**\n` +
        `📌 **Vendors:** Click **Vendor Management**\n\n` +
        `🔗 **Direct Link:** Navigate to **/procurement**`
    }

    if (query.includes('report') || query.includes('analytics')) {
      return `📊 **Finding Reports**\n\n` +
        `Here's how to access reports:\n\n` +
        `📌 **Main Dashboard:** Click on **Reporting & Analytics** module\n` +
        `📌 **Module Reports:** Each module has its own reports section\n` +
        `• HR Reports: **/hr** → Reports tab\n` +
        `• Sales Reports: **/sales/reports**\n` +
        `• Operations Reports: **/operations/reports**\n` +
        `• Finance Reports: **/finance**\n\n` +
        `🔗 **Direct Link:** Navigate to **/reports**`
    }

    if (query.includes('finance') || query.includes('budget') || query.includes('accounting')) {
      return `💰 **Finding Finance**\n\n` +
        `Here's how to access financial information:\n\n` +
        `📌 **Dashboard:** Go to **Finance** from the main dashboard\n` +
        `📌 **Payroll:** Go to **Payroll** for salary processing\n` +
        `📌 **Sales:** Go to **Sales** for invoices and payments\n\n` +
        `🔗 **Quick Links:**\n` +
        `• Finance: **/finance**\n` +
        `• Payroll: **/payroll**\n` +
        `• Sales: **/sales**\n\n` +
        `⚠️ **Note:** Financial data access depends on your role permissions.`
    }

    if (query.includes('fleet') || query.includes('vehicle')) {
      return `🚛 **Finding Fleet Management**\n\n` +
        `Here's how to manage your fleet:\n\n` +
        `📌 **Dashboard:** Go to **Fleet Management** from the main dashboard\n\n` +
        `🔗 **Direct Link:** Navigate to **/fleet**\n\n` +
        `💡 **From there you can:**\n` +
        `• Track vehicles\n` +
        `• Schedule maintenance\n` +
        `• Monitor fuel usage\n` +
        `• Manage drivers`
    }

    if (query.includes('attendance') || query.includes('clock')) {
      return `⏰ **Finding Attendance**\n\n` +
        `Here's how to track attendance:\n\n` +
        `📌 **HR Module:** Go to **HR Management > Attendance**\n` +
        `📌 **Clock In/Out:** Available on the attendance dashboard\n` +
        `📌 **Timesheets:** View timesheets under the attendance section\n\n` +
        `🔗 **Direct Link:** Navigate to **/hr/attendance**`
    }

    // Generic navigation fallback
    return `🧭 **ERP Navigation Guide**\n\n` +
      `Here are the main sections of your ERP:\n\n` +
      `🏠 **Dashboard:** **/dashboard** - Main overview\n` +
      `👥 **HR:** **/hr** - Employees, leave, training\n` +
      `💰 **Payroll:** **/payroll** - Salary processing\n` +
      `🏢 **CRM:** **/crm** - Clients and pipeline\n` +
      `📋 **Sales:** **/sales** - Quotations and invoices\n` +
      `⚙️ **Operations:** **/operations** - Job management\n` +
      `📦 **Inventory:** **/inventory** - Stock control\n` +
      `🛒 **Procurement:** **/procurement** - Purchasing\n` +
      `🚛 **Fleet:** **/fleet** - Vehicle management\n` +
      `📊 **Reports:** **/reports** - Analytics\n` +
      `🚨 **Incidents:** **/fieldops/incidents** - Incident management\n\n` +
      `What would you like help finding?`
  },

  // ============================================
  // EMPLOYEE QUERIES
  // ============================================
  async handleEmployeeQuery(query, role) {
    // "List of employees" or "Show me employees"
    if (query.includes('list') || query.includes('show') || query.includes('all') || query.includes('see')) {
      try {
        const { data: employees } = await supabase
          .from('employees')
          .select('first_name, last_name, employee_code, department, position, employment_status')
          .eq('employment_status', 'active')
          .order('first_name')
          .limit(10)

        let response = `👥 **Employee List** (Active Staff)\n\n`
        response += `📌 **Navigation:** Go to **HR Management > Employees** or visit **/hr/employees**\n\n`
        
        if (employees && employees.length > 0) {
          response += `**Showing ${employees.length} employees:**\n\n`
          response += `| Name | Code | Department | Position |\n`
          response += `|------|------|------------|----------|\n`
          employees.forEach(emp => {
            response += `| ${emp.first_name} ${emp.last_name || ''} | ${emp.employee_code || 'N/A'} | ${emp.department || 'N/A'} | ${emp.position || 'N/A'} |\n`
          })
          
          const { count: total } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
          if (total > 10) {
            response += `\n*...and ${total - 10} more employees. View the full list at **/hr/employees**.*`
          }
        } else {
          response += `No employees found in the database. Add employees at **/hr/employees**.\n`
        }

        response += `\n💡 **You can also:**\n`
        response += `• Search employees by name or department\n`
        response += `• Filter by employment status\n`
        response += `• Click any employee for full details\n`
        response += `• Add new employees with the "Add Employee" button`

        return response
      } catch (err) {
        return `👥 **Employee Management**\n\n📌 Navigate to **HR Management > Employees** or visit **/hr/employees** to view the complete employee list with search and filters.`
      }
    }

    // Employee count
    if (query.includes('how many') || query.includes('count') || query.includes('number of')) {
      const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
      return `👥 **Staff Count**\n\nThere are currently **${count || 0} active employees** in the system.\n\n📌 View the full list at **/hr/employees**`
    }

    return `👥 **HR & Employee Management**\n\n📌 Navigate to **HR Management** from your dashboard or visit **/hr**\n\nFrom there you can:\n• View all employees (**/hr/employees**)\n• Manage contracts\n• Process leave requests\n• Track training records\n• Handle disciplinary matters\n• View attendance (**/hr/attendance**)\n\nWould you like to know about a specific HR feature?`
  },

  // ============================================
  // INCIDENT QUERIES
  // ============================================
  async handleIncidentQuery(query, role) {
    try {
      const { count: total } = await supabase.from('incidents').select('*', { count: 'exact', head: true })
      const { count: open } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'submitted', 'acknowledged', 'under_review', 'under_investigation'])
      const { count: critical } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical')

      let response = `🚨 **Incident Management**\n\n`
      response += `📌 **Navigate to:** Field Ops > Incidents or visit **/fieldops/incidents**\n\n`
      response += `**Current Overview:**\n`
      response += `• Total Incidents: **${total || 0}**\n`
      response += `• Open/Active: **${open || 0}**\n`
      response += `• Critical: **${critical || 0}**\n\n`
      response += `**Quick Actions:**\n`
      response += `• **Report Incident:** Click red "Report Incident" button or go to **/fieldops/incidents/report**\n`
      response += `• **View All:** Go to **/fieldops/incidents/list**\n`
      response += `• **Track Incident:** Use Incident Tracker at **/fieldops/incidents/tracker**\n`
      response += `• **Dashboard:** View stats at **/fieldops/incidents**\n\n`
      response += `💡 **Tip:** Enter an incident number in the Incident Tracker to see the complete audit trail.`

      return response
    } catch (err) {
      return `🚨 **Incident Management**\n\n📌 Navigate to **Field Ops > Incidents** or visit **/fieldops/incidents**\n\nFrom there you can report, track, and manage all incidents.`
    }
  },

  // ============================================
  // JOB QUERIES
  // ============================================
  async handleJobQuery(query, role) {
    try {
      const { count: total } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).not('status', 'eq', 'completed').not('status', 'eq', 'cancelled')
      const { count: inProgress } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress')
      const { count: unassigned } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending')

      let response = `📅 **Job & Schedule Management**\n\n`
      response += `📌 **Navigate to:** Operations or visit **/operations**\n\n`
      response += `**Current Overview:**\n`
      response += `• Open Jobs: **${total || 0}**\n`
      response += `• In Progress: **${inProgress || 0}**\n`
      response += `• Unassigned: **${unassigned || 0}**\n\n`
      response += `**Quick Links:**\n`
      response += `• **All Jobs:** **/operations**\n`
      response += `• **Live Jobs (assign staff):** **/fieldops/live-jobs**\n`
      response += `• **Create Job:** **/operations/jobs/new**\n`
      response += `• **Job Tracker (audit):** **/fieldops/job-tracker**\n\n`
      response += `💡 **Tip:** Use Live Jobs to assign and release staff from jobs in real-time.`

      return response
    } catch (err) {
      return `📅 **Job Management**\n\n📌 Navigate to **Operations** or visit **/operations** to manage jobs, schedules, and assignments.`
    }
  },

  // ============================================
  // CRM QUERIES
  // ============================================
  async handleCRMQuery(query, role) {
    try {
      const { count: total } = await supabase.from('clients').select('*', { count: 'exact', head: true })
      const { count: active } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'active')

      let response = `🏢 **CRM & Client Management**\n\n`
      response += `📌 **Navigate to:** CRM & Clients or visit **/crm**\n\n`
      response += `**Current Overview:**\n`
      response += `• Total Clients: **${total || 0}**\n`
      response += `• Active Clients: **${active || 0}**\n\n`
      response += `**From CRM you can:**\n`
      response += `• View all clients (**/crm/clients**)\n`
      response += `• Add new clients\n`
      response += `• Manage contacts\n`
      response += `• Track sales pipeline\n`
      response += `• Record client interactions\n`
      response += `• Manage client services\n\n`
      response += `💡 **Tip:** The pipeline view shows deals at each stage of your sales process.`

      return response
    } catch (err) {
      return `🏢 **CRM Management**\n\n📌 Navigate to **CRM & Clients** or visit **/crm** to manage clients, contacts, and pipeline.`
    }
  },

  // ============================================
  // INVENTORY QUERIES
  // ============================================
  async handleInventoryQuery(query, role) {
    try {
      const { data: lowItems } = await supabase.from('inventory_items').select('name, current_stock, reorder_point, unit').lte('current_stock', supabase.raw('COALESCE(reorder_point, 10)')).limit(5)
      const { count: total } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true })

      let response = `📦 **Inventory Management**\n\n`
      response += `📌 **Navigate to:** Inventory or visit **/inventory**\n\n`
      response += `**Overview:** ${total || 0} total items in stock\n\n`

      if (lowItems && lowItems.length > 0) {
        response += `⚠️ **Low Stock Alert:**\n`
        lowItems.forEach(item => {
          response += `• ${item.name}: ${item.current_stock} ${item.unit || 'units'} left\n`
        })
        response += `\n📌 Reorder at **/inventory** or create a Purchase Order at **/procurement/po/new**\n`
      }

      response += `\n**Quick Links:**\n`
      response += `• Stock List: **/inventory/items**\n`
      response += `• Stock In: **/inventory/stock-in**\n`
      response += `• Stock Out: **/inventory/stock-out**\n`
      response += `• Warehouses: **/inventory/warehouses**\n`

      return response
    } catch (err) {
      return `📦 **Inventory Management**\n\n📌 Navigate to **Inventory** or visit **/inventory** to manage stock, warehouses, and supplies.`
    }
  },

  // ============================================
  // PROCUREMENT QUERIES
  // ============================================
  async handleProcurementQuery(query, role) {
    return `🛒 **Procurement Management**\n\n` +
      `📌 **Navigate to:** Procurement or visit **/procurement**\n\n` +
      `**From Procurement you can:**\n` +
      `• Create Purchase Requests (PR): **/procurement/pr/new**\n` +
      `• Manage Purchase Orders (PO): **/procurement/po**\n` +
      `• Issue RFQs: **/procurement/rfq/new**\n` +
      `• Manage Vendors: **/procurement/vendors**\n` +
      `• Receive Goods: **/procurement/receipts/new**\n\n` +
      `💡 **Workflow:** PR → Approval → RFQ → PO → Goods Receipt → Inventory Update`
  },

  // ============================================
  // FINANCE QUERIES
  // ============================================
  handleFinanceQuery(query, role) {
    if (role !== 'super_admin' && role !== 'finance_officer') {
      return `💰 **Finance Module**\n\n` +
        `📌 **Navigate to:** Finance or visit **/finance**\n\n` +
        `⚠️ **Access Notice:** Detailed financial data is restricted to Finance Officers and Administrators.\n\n` +
        `**Available to you:**\n` +
        `• Sales & Quotations: **/sales**\n` +
        `• Procurement Budgets: **/procurement**\n` +
        `• Payroll (if HR): **/payroll**\n\n` +
        `Please contact your Finance Officer for detailed financial reports.`
    }

    return `💰 **Finance & Accounting**\n\n` +
      `📌 **Navigate to:** Finance or visit **/finance**\n\n` +
      `**Financial Modules:**\n` +
      `• **Finance:** **/finance** - Accounting, budgets, approvals\n` +
      `• **Payroll:** **/payroll** - Salary processing, payslips\n` +
      `• **Sales:** **/sales** - Invoices, payments, revenue\n` +
      `• **Procurement:** **/procurement** - Purchase budgets\n` +
      `• **Reports:** **/reports** - Financial reports and analytics\n\n` +
      `💡 **Tip:** Generate a monthly financial report from the Reports module.`
  },

  // ============================================
  // SALES QUERIES
  // ============================================
  handleSalesQuery(query, role) {
    return `📋 **Sales & Quotations**\n\n` +
      `📌 **Navigate to:** Sales & Quotations or visit **/sales**\n\n` +
      `**From Sales you can:**\n` +
      `• Create Quotations: **/sales/quotations/new**\n` +
      `• View Invoices: **/sales/invoices**\n` +
      `• Record Payments: **/sales/payments**\n` +
      `• View Reports: **/sales/reports**\n\n` +
      `💡 **Tip:** Quotations can be downloaded as A4 PDF and converted to invoices with one click.`
  },

  // ============================================
  // FLEET QUERIES
  // ============================================
  handleFleetQuery(query, role) {
    return `🚛 **Fleet Management**\n\n` +
      `📌 **Navigate to:** Fleet Management or visit **/fleet**\n\n` +
      `**From Fleet you can:**\n` +
      `• Track vehicles and their locations\n` +
      `• Schedule maintenance\n` +
      `• Monitor fuel consumption\n` +
      `• Manage driver assignments\n` +
      `• Track vehicle expenses\n\n` +
      `💡 **Tip:** Set up maintenance reminders to avoid unexpected breakdowns.`
  },

  // ============================================
  // REPORT QUERIES
  // ============================================
  handleReportQuery(query, role) {
    return `📊 **Reports & Analytics**\n\n` +
      `📌 **Navigate to:** Reporting & Analytics or visit **/reports**\n\n` +
      `**Available Reports:**\n` +
      `• HR Reports: Staff, attendance, leave\n` +
      `• Sales Reports: Revenue, invoices, quotations\n` +
      `• Operations Reports: Jobs, quality, scheduling\n` +
      `• Finance Reports: Budgets, expenses, profit/loss\n` +
      `• Incident Reports: Safety, trends, root causes\n\n` +
      `💡 **Tip:** Most modules have their own reports section accessible from their dashboard.`
  },

  // ============================================
  // MAINTENANCE QUERIES
  // ============================================
  handleMaintenanceQuery(query, role) {
    return `🔧 **Maintenance & Assets**\n\n` +
      `📌 **Navigate to:** Assets Management or visit **/assets**\n\n` +
      `**For Vehicle Maintenance:** Go to **/fleet**\n` +
      `**For Equipment:** Check **/inventory** for equipment supplies\n\n` +
      `💡 **Tip:** Schedule preventive maintenance to extend asset life and reduce costs.`
  },

  // ============================================
  // ATTENDANCE QUERIES
  // ============================================
  handleAttendanceQuery(query, role) {
    return `⏰ **Attendance & Time Tracking**\n\n` +
      `📌 **Navigate to:** HR Management > Attendance or visit **/hr/attendance**\n\n` +
      `**From Attendance you can:**\n` +
      `• Clock In/Out with GPS location\n` +
      `• View timesheets\n` +
      `• Manage shifts\n` +
      `• Track attendance reports\n` +
      `• Generate QR codes for check-in\n\n` +
      `💡 **Tip:** The mobile app allows cleaners to clock in/out from their phones.`
  },

  // ============================================
  // DOCUMENT QUERIES
  // ============================================
  handleDocumentQuery(query, role) {
    return `📁 **Document Management**\n\n` +
      `📌 **Navigate to:** Document Management or visit **/documents**\n\n` +
      `**From Documents you can:**\n` +
      `• Upload and store contracts\n` +
      `• Manage policies and SOPs\n` +
      `• Store compliance documents\n` +
      `• Share files with teams\n\n` +
      `💡 **Tip:** Documents can be linked to clients, employees, and jobs for easy reference.`
  },

  // ============================================
  // MOBILE QUERIES
  // ============================================
  handleMobileQuery(query, role) {
    return `📱 **Mobile Workforce**\n\n` +
      `📌 **Navigate to:** Mobile App or visit **/mobile**\n\n` +
      `**The mobile app allows cleaners to:**\n` +
      `• View assigned jobs\n` +
      `• Select open jobs from the pool\n` +
      `• Clock in/out with GPS\n` +
      `• Take photos at job sites\n` +
      `• Report incidents\n` +
      `• Request supplies\n` +
      `• Complete checklists\n\n` +
      `📌 **Managers can monitor** all mobile activity at **/fieldops/live-jobs**\n\n` +
      `💡 **Tip:** Jobs selected on mobile sync instantly with the main ERP.`
  },

  // ============================================
  // GET WELCOME MESSAGE
  // ============================================
  getWelcomeMessage(userName) {
    const name = userName || 'there'
    return `🤖 **Dumela ${name}! I'm KHUMO**, your Ndanduleni ERP Assistant. 🇿🇦\n\n` +
      `I can guide you to any part of the system. Here's what you can ask me:\n\n` +
      `🗺️ **Navigation Help:**\n` +
      `• "Where can I see the list of employees?"\n` +
      `• "How do I find open jobs?"\n` +
      `• "Where do I report an incident?"\n` +
      `• "Show me how to create a quotation"\n\n` +
      `📊 **Quick Overviews:**\n` +
      `• "Show me open incidents"\n` +
      `• "What jobs are in progress?"\n` +
      `• "How many active clients do we have?"\n` +
      `• "Show low stock items"\n\n` +
      `Just type your question and I'll guide you step by step! 🎯`
  },

  // ============================================
  // GENERAL DIRECTIONS
  // ============================================
  getGeneralDirections(role) {
    return `🤖 **KHUMO here!** Let me help you find what you need. 🧭\n\n` +
      `Here are the main sections of your ERP:\n\n` +
      `| Module | Path | Description |\n` +
      `|--------|------|-------------|\n` +
      `| 🏠 Dashboard | **/dashboard** | Main overview |\n` +
      `| 👥 HR | **/hr** | Employees, leave, training |\n` +
      `| 💰 Payroll | **/payroll** | Salary, payslips |\n` +
      `| 🏢 CRM | **/crm** | Clients, pipeline |\n` +
      `| 📋 Sales | **/sales** | Quotations, invoices |\n` +
      `| ⚙️ Operations | **/operations** | Job management |\n` +
      `| 📦 Inventory | **/inventory** | Stock control |\n` +
      `| 🛒 Procurement | **/procurement** | Purchasing |\n` +
      `| 🚛 Fleet | **/fleet** | Vehicle management |\n` +
      `| 📊 Reports | **/reports** | Analytics |\n` +
      `| 🚨 Incidents | **/fieldops/incidents** | Incident management |\n` +
      `| 📱 Mobile | **/mobile** | Cleaner app |\n\n` +
      `Just tell me what you're looking for and I'll give you step-by-step directions! 🎯`
  }
}
