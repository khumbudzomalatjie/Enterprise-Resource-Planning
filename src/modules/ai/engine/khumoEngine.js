import { supabase } from '../../../../lib/supabaseClient'
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

  // ============================================
  // GREET
  // ============================================
  greet(userName, role) {
    const name = userName || 'there'
    const hour = new Date().getHours()
    const g = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const roleLabel = role?.replace(/_/g, ' ') || 'User'

    return {
      text: `${g}, ${name}! I'm Khumo, your ERP Assistant.\n\nI can help you with:\n\n📊 **View data** - "Show me all employees"\n📝 **Create things** - "Create a quotation"\n🗺️ **Find features** - "Where do I approve leave?"\n💡 **Learn** - "What is inventory management?"\n🔍 **Search** - "Find client John"\n\nWhat would you like to do?`,
      role: roleLabel
    }
  },

  // ============================================
  // EXPLAIN MODULE
  // ============================================
  explainModule(q) {
    const module = erpKnowledge.getModule(q)
    if (!module) {
      return { text: `I couldn't find a specific module matching your query. Try asking about: HR, Payroll, CRM, Sales, Operations, Inventory, Procurement, Fleet, Incidents, or Reports.` }
    }

    let response = `📚 **${module.name}**\n\n${module.description}\n\n`
    response += `**Who uses it:** ${module.roles?.includes('all') ? 'All staff' : module.roles?.map(r => r.replace(/_/g, ' ')).join(', ')}\n\n`
    
    if (module.features && module.features.length > 0) {
      response += `**Key Features:**\n`
      module.features.forEach(f => response += `• ${f}\n`)
    }

    if (module.navigation) {
      response += `\n🗺️ **How to access:** ${module.navigation}`
    }

    if (module.workflows) {
      response += `\n\n🔄 **Workflow:**\n`
      Object.values(module.workflows).forEach(w => response += `• ${w}\n`)
    }

    response += `\n\nWould you like me to guide you through using ${module.name}?`

    return { text: response, module: module.name }
  },

  // ============================================
  // GUIDE USER
  // ============================================
  guideUser(q) {
    if (this.matchAny(q, ['quote', 'quotation'])) {
      return {
        text: `📋 **Creating a Quotation**\n\nFollow these steps:\n\n1️⃣ Open **Sales & Quotations** from the main menu\n2️⃣ Click **New Quotation** button\n3️⃣ Select the **Client** from the dropdown\n4️⃣ Add your **services/items** with quantities and prices\n5️⃣ Set the **valid until date** and payment terms\n6️⃣ Review the preview on the right\n7️⃣ Click **Save & Send** or download as **A4 PDF**\n\n💡 After client approval, convert to an invoice with one click.\n\nWould you like me to open Sales for you?`,
        action: { label: 'Open Sales', navigate: '/sales' }
      }
    }

    if (this.matchAny(q, ['incident', 'accident', 'report'])) {
      return {
        text: `🚨 **Reporting an Incident**\n\n1️⃣ Open **Field Ops → Incidents**\n2️⃣ Click **Report Incident**\n3️⃣ Fill in: Title, Category, Severity, Description\n4️⃣ Add location, date, and time\n5️⃣ List people involved and witnesses\n6️⃣ Check injury/damage boxes if applicable\n7️⃣ Describe immediate actions taken\n8️⃣ Click **Submit Report**\n\n📌 The incident number is auto-generated. Your supervisor will be notified immediately.\n\nWould you like me to open the incident form?`,
        action: { label: 'Report Incident', navigate: '/fieldops/incidents/report' }
      }
    }

    if (this.matchAny(q, ['job', 'schedule'])) {
      return {
        text: `📝 **Creating a Job**\n\n1️⃣ Open **Operations** from the main menu\n2️⃣ Click **New Job**\n3️⃣ Select the **Client**\n4️⃣ Choose **Job Category** (Office Cleaning, Deep Clean, etc.)\n5️⃣ Enter job title and site address\n6️⃣ Set date, time, and estimated duration\n7️⃣ Set priority (Low/Medium/High/Urgent)\n8️⃣ Specify number of cleaners needed\n9️⃣ Add access instructions if needed\n🔟 Click **Create & Schedule**\n\nWould you like me to open Operations?`,
        action: { label: 'Open Operations', navigate: '/operations' }
      }
    }

    if (this.matchAny(q, ['clock in', 'clock out', 'attendance'])) {
      return {
        text: `⏰ **Clocking In/Out**\n\n**On Desktop:**\n1️⃣ Open **HR → Attendance**\n2️⃣ Click the green **Clock In** button\n3️⃣ Your GPS location is captured\n4️⃣ Click red **Clock Out** when done\n\n**On Mobile:**\n1️⃣ Open the mobile app\n2️⃣ Tap Clock In/Out\n3️⃣ GPS auto-captured\n\n💡 If you forgot to clock in, you can request a correction from your supervisor.\n\nWould you like me to open Attendance?`,
        action: { label: 'Open Attendance', navigate: '/hr/attendance' }
      }
    }

    if (this.matchAny(q, ['leave', 'apply leave'])) {
      return {
        text: `🏖️ **Applying for Leave**\n\n1️⃣ Open **HR → Leave Management**\n2️⃣ Click **New Leave Request**\n3️⃣ Select leave type (Annual, Sick, Family Responsibility, etc.)\n4️⃣ Choose start and end dates\n5️⃣ Enter reason\n6️⃣ Submit for approval\n\n📌 Under SA labor law:\n• Annual Leave: 15 working days per year\n• Sick Leave: 30 days per 3-year cycle\n• Family Responsibility: 3 days per year\n\nWould you like me to open Leave Management?`,
        action: { label: 'Open Leave', navigate: '/hr' }
      }
    }

    if (this.matchAny(q, ['assign', 'staff', 'employee'])) {
      return {
        text: `👤 **Assigning Staff to a Job**\n\n1️⃣ Open **Field Ops → Live Jobs**\n2️⃣ Find the job in the list\n3️⃣ Click the blue **Add Person** button\n4️⃣ Select the employee from the list\n5️⃣ Click **Assign**\n\nThe employee will see the job instantly on their mobile app.\n\nWould you like me to open Live Jobs?`,
        action: { label: 'Open Live Jobs', navigate: '/fieldops/live-jobs' }
      }
    }

    return {
      text: `I can guide you through many tasks. Try asking:\n\n• "How to create a quotation?"\n• "How to report an incident?"\n• "How to clock in?"\n• "How to apply for leave?"\n• "How to assign staff to a job?"\n\nWhat would you like to learn?`
    }
  },

  // ============================================
  // NAVIGATE USER
  // ============================================
  navigateUser(q) {
    if (this.matchAny(q, ['employee', 'staff', 'hr'])) {
      return {
        text: `👥 **Employees** are under **HR Management**.\n\nNavigate: **Home → HR Management → Employees**\n\nFrom there you can view all employees, add new ones, edit details, and manage contracts.`,
        action: { label: 'Open Employees', navigate: '/hr/employees' }
      }
    }

    if (this.matchAny(q, ['incident', 'accident'])) {
      return {
        text: `🚨 **Incidents** are under **Field Operations**.\n\nNavigate: **Home → Field Ops → Incidents**\n\nYou can view the dashboard, report new incidents, or track existing ones.`,
        action: { label: 'Open Incidents', navigate: '/fieldops/incidents' }
      }
    }

    if (this.matchAny(q, ['job', 'operation'])) {
      return {
        text: `📅 **Jobs** are under **Operations**.\n\nNavigate: **Home → Operations**\n\nFor live job tracking: **Home → Field Ops → Live Jobs**`,
        action: { label: 'Open Operations', navigate: '/operations' }
      }
    }

    if (this.matchAny(q, ['client', 'crm'])) {
      return {
        text: `🏢 **Clients** are under **CRM & Clients**.\n\nNavigate: **Home → CRM & Clients**`,
        action: { label: 'Open CRM', navigate: '/crm' }
      }
    }

    if (this.matchAny(q, ['quote', 'sale', 'invoice'])) {
      return {
        text: `📋 **Sales & Quotations** is in the main menu.\n\nNavigate: **Home → Sales & Quotations**`,
        action: { label: 'Open Sales', navigate: '/sales' }
      }
    }

    if (this.matchAny(q, ['stock', 'inventory'])) {
      return {
        text: `📦 **Inventory** is in the main menu.\n\nNavigate: **Home → Inventory**`,
        action: { label: 'Open Inventory', navigate: '/inventory' }
      }
    }

    if (this.matchAny(q, ['purchase', 'procurement', 'vendor'])) {
      return {
        text: `🛒 **Procurement** is in the main menu.\n\nNavigate: **Home → Procurement**`,
        action: { label: 'Open Procurement', navigate: '/procurement' }
      }
    }

    if (this.matchAny(q, ['payroll', 'salary'])) {
      return {
        text: `💰 **Payroll** is in the main menu.\n\nNavigate: **Home → Payroll**`,
        action: { label: 'Open Payroll', navigate: '/payroll' }
      }
    }

    if (this.matchAny(q, ['attendance', 'clock'])) {
      return {
        text: `⏰ **Attendance** is under HR Management.\n\nNavigate: **Home → HR Management → Attendance**`,
        action: { label: 'Open Attendance', navigate: '/hr/attendance' }
      }
    }

    if (this.matchAny(q, ['report', 'analytics'])) {
      return {
        text: `📊 **Reports** are in the main menu.\n\nNavigate: **Home → Reports**`,
        action: { label: 'Open Reports', navigate: '/reports' }
      }
    }

    if (this.matchAny(q, ['document', 'file'])) {
      return {
        text: `📁 **Documents** are in the main menu.\n\nNavigate: **Home → Documents**`,
        action: { label: 'Open Documents', navigate: '/documents' }
      }
    }

    if (this.matchAny(q, ['fleet', 'vehicle'])) {
      return {
        text: `🚛 **Fleet Management** is in the main menu.\n\nNavigate: **Home → Fleet Management**`,
        action: { label: 'Open Fleet', navigate: '/fleet' }
      }
    }

    if (this.matchAny(q, ['mobile', 'app'])) {
      return {
        text: `📱 **Mobile App** is available for field staff.\n\nNavigate: **Home → Mobile App**\n\nCleaners can view jobs, clock in/out, and report incidents from their phones.`,
        action: { label: 'Open Mobile', navigate: '/mobile' }
      }
    }

    return {
      text: `I can help you find any feature. Try asking:\n\n• "Where are employees?"\n• "Where do I report an incident?"\n• "Where is inventory?"\n• "Where do I approve leave?"`
    }
  },

  // ============================================
  // FETCH REAL DATA
  // ============================================
  async fetchData(q, role) {
    // Employee data
    if (this.matchAny(q, ['employee', 'staff', 'worker', 'people', 'team'])) {
      try {
        const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
        const { data: depts } = await supabase.from('employees').select('department').eq('employment_status', 'active')
        const deptCount = {}
        depts?.forEach(d => { const n = d.department || 'Other'; deptCount[n] = (deptCount[n] || 0) + 1 })

        let text = `👥 **Workforce Overview**\n\n• Active Employees: **${count || 0}**\n\n**By Department:**\n`
        Object.entries(deptCount).sort((a,b) => b[1]-a[1]).forEach(([d,c]) => text += `• ${d}: ${c}\n`)
        text += `\nTo see the full list with details, open Employees.`
        return { text, action: { label: 'Open Employees', navigate: '/hr/employees' } }
      } catch { return { text: `👥 View all employees under **HR Management → Employees**`, action: { label: 'Open HR', navigate: '/hr' } } }
    }

    // Incident data
    if (this.matchAny(q, ['incident', 'accident', 'safety'])) {
      try {
        const { count: open } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_investigation'])
        const { count: critical } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical')
        return {
          text: `🚨 **Incident Status**\n\n• Open Incidents: **${open || 0}**\n• Critical: **${critical || 0}**\n\n${critical > 0 ? '⚠️ Critical incidents need immediate attention!' : '✅ No critical incidents.'}`,
          action: { label: 'View Incidents', navigate: '/fieldops/incidents' }
        }
      } catch { return { text: `🚨 View incidents under **Field Ops → Incidents**`, action: { label: 'Open Incidents', navigate: '/fieldops/incidents' } } }
    }

    // Job data
    if (this.matchAny(q, ['job', 'schedule'])) {
      try {
        const today = new Date().toISOString().split('T')[0]
        const { count: open } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).not('status', 'eq', 'completed').not('status', 'eq', 'cancelled')
        const { count: todayCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('scheduled_date', today)
        const { count: inProgress } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress')
        return {
          text: `📅 **Job Status**\n\n• Open Jobs: **${open || 0}**\n• Today's Jobs: **${todayCount || 0}**\n• In Progress: **${inProgress || 0}**`,
          action: { label: 'View Jobs', navigate: '/operations' }
        }
      } catch { return { text: `📅 View jobs under **Operations**`, action: { label: 'Open Operations', navigate: '/operations' } } }
    }

    // Client data
    if (this.matchAny(q, ['client', 'customer'])) {
      try {
        const { count: total } = await supabase.from('clients').select('*', { count: 'exact', head: true })
        const { count: active } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'active')
        return {
          text: `🏢 **Client Overview**\n\n• Total Clients: **${total || 0}**\n• Active: **${active || 0}**`,
          action: { label: 'Open CRM', navigate: '/crm' }
        }
      } catch { return { text: `🏢 View clients under **CRM & Clients**`, action: { label: 'Open CRM', navigate: '/crm' } } }
    }

    // Inventory data
    if (this.matchAny(q, ['stock', 'inventory', 'supply'])) {
      try {
        const { count: total } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true })
        const { count: lowStock } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).lte('current_stock', supabase.raw('COALESCE(reorder_point, 10)')).gt('current_stock', 0)
        return {
          text: `📦 **Inventory Status**\n\n• Total Items: **${total || 0}**\n• Low Stock: **${lowStock || 0}**\n\n${lowStock > 0 ? '⚠️ Some items need reordering!' : '✅ Stock levels are good.'}`,
          action: { label: 'Open Inventory', navigate: '/inventory' }
        }
      } catch { return { text: `📦 View inventory under **Inventory**`, action: { label: 'Open Inventory', navigate: '/inventory' } } }
    }

    // Procurement data
    if (this.matchAny(q, ['purchase', 'procurement', 'po', 'order'])) {
      try {
        const { count: pendingPOs } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent', 'confirmed'])
        return {
          text: `🛒 **Procurement Status**\n\n• Pending Purchase Orders: **${pendingPOs || 0}**`,
          action: { label: 'Open Procurement', navigate: '/procurement' }
        }
      } catch { return { text: `🛒 View procurement under **Procurement**`, action: { label: 'Open Procurement', navigate: '/procurement' } } }
    }

    // Attendance data
    if (this.matchAny(q, ['attendance', 'present', 'absent'])) {
      try {
        const today = new Date().toISOString().split('T')[0]
        const { count: present } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', today).not('clock_in_time', 'is', null)
        return {
          text: `⏰ **Today's Attendance**\n\n• Clocked In: **${present || 0}**`,
          action: { label: 'Open Attendance', navigate: '/hr/attendance' }
        }
      } catch { return { text: `⏰ View attendance under **HR → Attendance**`, action: { label: 'Open Attendance', navigate: '/hr/attendance' } } }
    }

    return { text: `I can show you real-time data. Try: "Show me employees", "How many open incidents?", "What jobs are active?", "Check stock levels"` }
  },

  // ============================================
  // SUGGEST ACTION
  // ============================================
  suggestAction(q, role) {
    if (this.matchAny(q, ['quote', 'quotation'])) return { text: `To create a quotation, open **Sales & Quotations** and click **New Quotation**.`, action: { label: 'Open Sales', navigate: '/sales' } }
    if (this.matchAny(q, ['incident', 'accident'])) return { text: `To report an incident, open **Field Ops → Incidents** and click **Report Incident**.`, action: { label: 'Report Incident', navigate: '/fieldops/incidents/report' } }
    if (this.matchAny(q, ['job'])) return { text: `To create a job, open **Operations** and click **New Job**.`, action: { label: 'Open Operations', navigate: '/operations' } }
    if (this.matchAny(q, ['client'])) return { text: `To add a client, open **CRM & Clients** and click **Add Client**.`, action: { label: 'Open CRM', navigate: '/crm' } }
    if (this.matchAny(q, ['employee', 'staff'])) return { text: `To add an employee, open **HR → Employees** and click **Add Employee**.`, action: { label: 'Open HR', navigate: '/hr' } }
    if (this.matchAny(q, ['invoice'])) return { text: `To create an invoice, open **Sales & Quotations**.`, action: { label: 'Open Sales', navigate: '/sales' } }
    if (this.matchAny(q, ['purchase', 'order', 'po'])) return { text: `To create a purchase order, open **Procurement** and click **New PO**.`, action: { label: 'Open Procurement', navigate: '/procurement' } }
    if (this.matchAny(q, ['leave'])) return { text: `To apply for leave, open **HR → Leave Management**.`, action: { label: 'Open Leave', navigate: '/hr' } }
    return { text: `What would you like to create? I can help with quotations, jobs, incidents, purchase orders, and more.` }
  },

  // ============================================
  // SMART INTENT DETECTION
  // ============================================
  detectIntent(q, context) {
    // "I forgot to clock in"
    if (this.matchAny(q, ['forgot', 'clock', 'missed'])) {
      return {
        text: `⏰ If you forgot to clock in, you can request an attendance correction from your supervisor.\n\nOpen **HR → Attendance** and look for the correction request option.`,
        action: { label: 'Open Attendance', navigate: '/hr/attendance' }
      }
    }

    // "My quotation is wrong"
    if (this.matchAny(q, ['wrong', 'error', 'mistake', 'incorrect'])) {
      return {
        text: `If you need to correct something, you can usually edit it from the same module. What specifically needs to be corrected?\n\n• A quotation? Open Sales\n• An employee record? Open HR\n• A job? Open Operations`
      }
    }

    // "Leave balance"
    if (this.matchAny(q, ['leave balance', 'leave days', 'how many leave'])) {
      return {
        text: `To check your leave balance, open **HR → Leave Management**. You'll see your available days for each leave type.\n\n📌 Annual Leave: 15 working days per year (SA law).`,
        action: { label: 'Open Leave', navigate: '/hr' }
      }
    }

    // "Search for..."
    if (this.matchAny(q, ['search', 'find', 'lookup', 'look for'])) {
      return {
        text: `I can help you search! What are you looking for?\n\n• An employee? Tell me their name\n• A client? Tell me the company\n• A job? Tell me the job number\n• An incident? Tell me the incident number`
      }
    }

    // Smart fallback
    return {
      text: `I understand you're asking about something, but I need a bit more detail.\n\nHere's what I can help with:\n\n📊 **View data** - "Show me all employees"\n📝 **Create things** - "Create a quotation"\n🗺️ **Find features** - "Where is inventory?"\n💡 **Learn** - "What is procurement?"\n🔍 **Search** - "Find client John"\n📋 **How to** - "How to apply for leave?"\n\nWhat would you like to do?`
    }
  }
}
