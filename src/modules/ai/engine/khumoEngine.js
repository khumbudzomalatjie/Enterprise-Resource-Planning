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
    // ⭐ HOW TO - CHECKED FIRST BEFORE ANYTHING ELSE
    // ============================================
    if (this.hasWord(q, ['how to', 'how do i', 'how can i', 'steps to', 'guide me', 'show me how', 'explain how', 'instructions', 'walk me through'])) {
      return this.getDetailedInstructions(q)
    }

    // ============================================
    // WHERE IS / FIND / LOCATE
    // ============================================
    if (this.hasWord(q, ['where', 'find', 'locate', 'navigate', 'go to', 'take me'])) {
      return this.getNavigation(q)
    }

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
      return await this.getIncidentInfo(q)
    }

    // ============================================
    // JOBS
    // ============================================
    if (this.hasWord(q, ['job', 'schedule', 'operation', 'task', 'work order'])) {
      return await this.getJobInfo(q)
    }

    // ============================================
    // CLIENTS
    // ============================================
    if (this.hasWord(q, ['client', 'customer', 'crm'])) {
      return await this.getClientInfo()
    }

    // ============================================
    // SALES / QUOTES / INVOICES
    // ============================================
    if (this.hasWord(q, ['sale', 'quote', 'quotation', 'invoice', 'revenue', 'billing'])) {
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
    if (this.hasWord(q, ['payroll', 'salary', 'payslip', 'wage', 'pay', 'compensation'])) {
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
    // SEARCH FOR PERSON
    // ============================================
    if (this.hasWord(q, ['who is', 'search', 'find', 'look'])) {
      return await this.searchPerson(q)
    }

    // ============================================
    // CREATE / ADD / MAKE / NEW
    // ============================================
    if (this.hasWord(q, ['create', 'make', 'add', 'new', 'start'])) {
      return this.getCreateInstructions(q)
    }

    // ============================================
    // WHAT IS / EXPLAIN
    // ============================================
    if (this.hasWord(q, ['what is', 'explain', 'tell me about', 'describe', 'meaning'])) {
      return this.explainModule(q)
    }

    // ============================================
    // FALLBACK
    // ============================================
    return {
      text: `I can help with:\n\n• "How do I create a quotation?"\n• "Show me all employees"\n• "How many open incidents?"\n• "What jobs are active today?"\n• "How do I apply for leave?"\n• "Where is inventory?"\n• "How do I report an incident?"\n\nWhat would you like to know?`
    }
  },

  // Helper
  hasWord(text, words) {
    return words.some(w => text.includes(w))
  },

  // ============================================
  // ⭐ DETAILED STEP-BY-STEP INSTRUCTIONS
  // ============================================
  getDetailedInstructions(q) {
    // QUOTATION
    if (this.hasWord(q, ['quote', 'quotation'])) {
      return {
        text: `📋 **How to Create a Quotation**\n\n` +
          `**Step 1:** Open **Sales & Quotations** from the main dashboard menu\n\n` +
          `**Step 2:** Click the **"New Quotation"** button at the top of the page\n\n` +
          `**Step 3:** Select the **Client** from the dropdown list. If the client doesn't exist, add them first in CRM.\n\n` +
          `**Step 4:** Add your **services or items:**\n` +
          `• Enter a description for each line item\n` +
          `• Set the quantity (e.g., hours, square meters)\n` +
          `• Enter the unit price\n` +
          `• The system calculates totals automatically\n\n` +
          `**Step 5:** Set the **Valid Until** date - how long the quote is valid for\n\n` +
          `**Step 6:** Choose **Payment Terms** (e.g., 30 days, immediate)\n\n` +
          `**Step 7:** Add any **notes** or special instructions for the client\n\n` +
          `**Step 8:** Review the **preview** on the right side of the screen\n\n` +
          `**Step 9:** Click **"Save & Send"** to email it to the client, or **"Download PDF"** to save as an A4 document\n\n` +
          `💡 **After approval:** Convert the quotation to an invoice with one click from the quotations list.\n\n` +
          `📌 The quotation number is auto-generated (e.g., Q-25-0001).`,
        action: { label: 'Create Quotation Now', navigate: '/sales/quotations/new' }
      }
    }

    // INCIDENT
    if (this.hasWord(q, ['incident', 'accident', 'report'])) {
      return {
        text: `🚨 **How to Report an Incident**\n\n` +
          `**Step 1:** Open **Field Operations → Incidents** from the main menu\n\n` +
          `**Step 2:** Click the red **"Report Incident"** button\n\n` +
          `**Step 3:** Choose the **Incident Category:**\n` +
          `• Safety, Cleaning, Security, Vehicle, Equipment, Property Damage, Client Complaint, Environmental, Medical, Near Miss, Fire, Chemical Spill, Theft, Violence, Harassment, or Other\n\n` +
          `**Step 4:** Set the **Severity Level:**\n` +
          `• Low, Medium, High, or Critical\n\n` +
          `**Step 5:** Enter a clear **Title** (e.g., "Slip and fall in main hallway")\n\n` +
          `**Step 6:** Write a detailed **Description** of what happened\n\n` +
          `**Step 7:** Enter the **Date and Time** of the incident\n\n` +
          `**Step 8:** Add the **Location** (GPS is auto-captured on mobile)\n\n` +
          `**Step 9:** List **People Involved** and any **Witnesses**\n\n` +
          `**Step 10:** Check boxes if there were injuries, medical treatment, hospital visits, or emergency services called\n\n` +
          `**Step 11:** Describe **Immediate Actions** taken\n\n` +
          `**Step 12:** Click **"Submit Report"**\n\n` +
          `📌 The incident number is auto-generated (e.g., INC-2026-000001). Your supervisor and safety officer are notified automatically.\n\n` +
          `⚠️ Critical incidents are escalated to management immediately.`,
        action: { label: 'Report Incident Now', navigate: '/fieldops/incidents/report' }
      }
    }

    // JOB
    if (this.hasWord(q, ['job', 'schedule'])) {
      return {
        text: `📝 **How to Create a Job**\n\n` +
          `**Step 1:** Open **Operations** from the main dashboard menu\n\n` +
          `**Step 2:** Click the **"New Job"** button\n\n` +
          `**Step 3:** Select the **Client** from the dropdown (must exist in CRM first)\n\n` +
          `**Step 4:** Choose the **Job Category:**\n` +
          `• Office Cleaning, Deep Cleaning, Carpet Cleaning, Window Cleaning, Floor Maintenance, Sanitation, Waste Management, Pest Control, Garden Maintenance, Event Cleanup, Industrial Cleaning, Emergency Cleanup\n\n` +
          `**Step 5:** Enter a **Job Title** (e.g., "Weekly Office Clean - Sandton Branch")\n\n` +
          `**Step 6:** Fill in the **Site Address** and City\n\n` +
          `**Step 7:** Add **Site Contact** name and phone number\n\n` +
          `**Step 8:** Add **Access Instructions** (gate codes, key locations, parking)\n\n` +
          `**Step 9:** Set the **Date and Time:**\n` +
          `• Scheduled date\n` +
          `• Start time and end time\n` +
          `• Estimated duration in minutes\n\n` +
          `**Step 10:** Set the **Priority Level:** Low, Medium, High, Urgent, or Emergency\n\n` +
          `**Step 11:** Specify **Number of Cleaners Required**\n\n` +
          `**Step 12:** Enter the **Quoted Amount** if applicable\n\n` +
          `**Step 13:** Add any **Special Instructions** or internal notes\n\n` +
          `**Step 14:** Click **"Create & Schedule"** to publish the job\n\n` +
          `📌 The job appears on the Live Jobs board where you can assign staff.`,
        action: { label: 'Create Job Now', navigate: '/operations/jobs/new' }
      }
    }

    // LEAVE
    if (this.hasWord(q, ['leave', 'apply', 'time off', 'vacation', 'holiday'])) {
      return {
        text: `🏖️ **How to Apply for Leave**\n\n` +
          `**Step 1:** Open **HR Management → Leave Management**\n\n` +
          `**Step 2:** Click **"New Leave Request"**\n\n` +
          `**Step 3:** Select the **Leave Type:**\n` +
          `• Annual Leave (15 working days per year per SA law)\n` +
          `• Sick Leave (30 days per 3-year cycle)\n` +
          `• Family Responsibility Leave (3 days per year)\n` +
          `• Maternity Leave (4 months unpaid)\n` +
          `• Paternity Leave (10 days)\n` +
          `• Study Leave\n` +
          `• Unpaid Leave\n` +
          `• Bereavement Leave\n\n` +
          `**Step 4:** Choose the **Start Date** and **End Date**\n\n` +
          `**Step 5:** The system calculates total days automatically\n\n` +
          `**Step 6:** Enter a **Reason** for your leave\n\n` +
          `**Step 7:** Click **"Submit for Approval"**\n\n` +
          `📌 Your supervisor/manager will receive a notification to approve or reject.\n\n` +
          `💡 You can check your leave balance at any time from the Leave Dashboard.`,
        action: { label: 'Apply for Leave', navigate: '/hr' }
      }
    }

    // ATTENDANCE
    if (this.hasWord(q, ['clock', 'attendance', 'check in', 'check out'])) {
      return {
        text: `⏰ **How to Clock In/Out**\n\n` +
          `**On Desktop:**\n` +
          `**Step 1:** Open **HR Management → Attendance**\n` +
          `**Step 2:** Click the green **"Clock In"** button\n` +
          `**Step 3:** Your GPS location is captured automatically\n` +
          `**Step 4:** The timer starts tracking your work hours\n` +
          `**Step 5:** When done, click the red **"Clock Out"** button\n\n` +
          `**On Mobile App:**\n` +
          `**Step 1:** Open the mobile app\n` +
          `**Step 2:** Tap **Clock In**\n` +
          `**Step 3:** GPS auto-captured\n` +
          `**Step 4:** Tap **Clock Out** when finished\n\n` +
          `💡 **Forgot to clock in?** You can request an attendance correction from your supervisor.`,
        action: { label: 'Open Attendance', navigate: '/hr/attendance' }
      }
    }

    // EMPLOYEE
    if (this.hasWord(q, ['employee', 'staff', 'add employee', 'new employee', 'register'])) {
      return {
        text: `👥 **How to Add an Employee**\n\n` +
          `**Step 1:** Open **HR Management → Employees**\n\n` +
          `**Step 2:** Click **"Add Employee"** button\n\n` +
          `**Step 3:** Fill in **Personal Details:**\n` +
          `• First Name and Last Name\n` +
          `• Email address\n` +
          `• Phone number\n` +
          `• Date of birth and gender\n` +
          `• ID number or passport\n\n` +
          `**Step 4:** Add **Address** information\n\n` +
          `**Step 5:** Add **Emergency Contact** details\n\n` +
          `**Step 6:** Set **Employment Details:**\n` +
          `• Department (Operations, Administration, Sales, etc.)\n` +
          `• Position (Cleaner, Supervisor, Manager, etc.)\n` +
          `• Employment Type (Full-time, Part-time, Contract)\n` +
          `• Date of Hire\n\n` +
          `**Step 7:** Add **Banking Details** for payroll\n\n` +
          `**Step 8:** Upload any required **Documents** (ID, CV, certificates)\n\n` +
          `**Step 9:** Click **"Save"**\n\n` +
          `📌 The employee code is auto-generated (e.g., NG-25-0001).`,
        action: { label: 'Add Employee', navigate: '/hr/employees' }
      }
    }

    // CLIENT
    if (this.hasWord(q, ['client', 'customer', 'add client', 'new client'])) {
      return {
        text: `🏢 **How to Add a Client**\n\n` +
          `**Step 1:** Open **CRM & Clients**\n\n` +
          `**Step 2:** Click **"Add Client"** button\n\n` +
          `**Step 3:** Enter **Company Details:**\n` +
          `• Company Name (required)\n` +
          `• Trading Name (if different)\n` +
          `• Registration Number\n` +
          `• Tax/VAT Number\n\n` +
          `**Step 4:** Select **Client Type:** Corporate, Government, Retail, Industrial, Residential\n\n` +
          `**Step 5:** Add **Contact Information:**\n` +
          `• Email and phone\n` +
          `• Website\n` +
          `• Physical address\n\n` +
          `**Step 6:** Set **Billing Details:**\n` +
          `• Payment terms (7, 15, 30, 60 days)\n` +
          `• Credit limit if applicable\n\n` +
          `**Step 7:** Assign an **Account Manager** if needed\n\n` +
          `**Step 8:** Click **"Save"**\n\n` +
          `📌 The client code is auto-generated (e.g., CL-25-00001).`,
        action: { label: 'Add Client', navigate: '/crm/clients/new' }
      }
    }

    // PURCHASE ORDER
    if (this.hasWord(q, ['purchase', 'order', 'po', 'procurement'])) {
      return {
        text: `🛒 **How to Create a Purchase Order**\n\n` +
          `**Step 1:** Open **Procurement** from the main menu\n\n` +
          `**Step 2:** Click **"New PO"** button\n\n` +
          `**Step 3:** Select the **Vendor/Supplier** from the dropdown\n\n` +
          `**Step 4:** Set **Expected Delivery Date**\n\n` +
          `**Step 5:** Choose **Shipping Method** (Standard, Express, Courier)\n\n` +
          `**Step 6:** Add the **Delivery Address**\n\n` +
          `**Step 7:** Add **Line Items:**\n` +
          `• Select from inventory or enter manually\n` +
          `• Enter quantity and unit price\n` +
          `• The system calculates totals\n\n` +
          `**Step 8:** Review the **Total Amount**\n\n` +
          `**Step 9:** Add any **Notes**\n\n` +
          `**Step 10:** Click **"Save Draft"** or **"Send PO"**\n\n` +
          `📌 You can also create a PO from an approved Purchase Request (PR).`,
        action: { label: 'Create PO', navigate: '/procurement/po/new' }
      }
    }

    // INVOICE
    if (this.hasWord(q, ['invoice', 'bill'])) {
      return {
        text: `📄 **How to Create an Invoice**\n\n` +
          `**Option 1 - From Quotation (Recommended):**\n` +
          `**Step 1:** Open Sales & Quotations\n` +
          `**Step 2:** Find the approved quotation\n` +
          `**Step 3:** Click **"Convert to Invoice"**\n` +
          `**Step 4:** Review and adjust if needed\n` +
          `**Step 5:** Send to client\n\n` +
          `**Option 2 - New Invoice:**\n` +
          `**Step 1:** Open Sales & Quotations\n` +
          `**Step 2:** Click New Invoice\n` +
          `**Step 3:** Select client\n` +
          `**Step 4:** Add line items\n` +
          `**Step 5:** Set due date and terms\n` +
          `**Step 6:** Save and send\n\n` +
          `📌 Track payments under the invoice details.`,
        action: { label: 'Open Sales', navigate: '/sales' }
      }
    }

    // PAYROLL
    if (this.hasWord(q, ['payroll', 'salary', 'payslip', 'wage', 'pay', 'compensation'])) {
      return {
        text: `💰 **How to Run Payroll**\n\n` +
          `**Step 1:** Open **Payroll** from the main menu\n\n` +
          `**Step 2:** Ensure all **Salary Structures** are up to date for each employee\n\n` +
          `**Step 3:** Create a **Payroll Period:**\n` +
          `• Set period name (e.g., "July 2026")\n` +
          `• Set start and end dates\n` +
          `• Set payment date\n\n` +
          `**Step 4:** Click **"Run Payroll"** to process all employees\n\n` +
          `**Step 5:** Review the payroll summary:\n` +
          `• Gross salaries\n` +
          `• Deductions (PAYE, UIF, pension, medical aid)\n` +
          `• Net pay amounts\n\n` +
          `**Step 6:** Make any adjustments for overtime or bonuses\n\n` +
          `**Step 7:** **Approve** the payroll run\n\n` +
          `**Step 8:** Generate **Payslips** for all employees\n\n` +
          `⚠️ Requires Finance Officer or Administrator permissions.\n\n` +
          `📌 SA Tax: PAYE is calculated according to SARS tax tables. UIF is 1% of salary.`,
        action: { label: 'Open Payroll', navigate: '/payroll' }
      }
    }

    // Generic how-to fallback
    return {
      text: `I can give you step-by-step instructions for:\n\n` +
        `📋 "How to create a quotation?"\n` +
        `🚨 "How to report an incident?"\n` +
        `📝 "How to create a job?"\n` +
        `🏖️ "How to apply for leave?"\n` +
        `⏰ "How to clock in/out?"\n` +
        `👥 "How to add an employee?"\n` +
        `🏢 "How to add a client?"\n` +
        `🛒 "How to create a purchase order?"\n` +
        `💰 "How to run payroll?"\n` +
        `📄 "How to create an invoice?"\n\n` +
        `What would you like to learn?`
    }
  },

  // ============================================
  // CREATE INSTRUCTIONS (shorter version)
  // ============================================
  getCreateInstructions(q) {
    if (this.hasWord(q, ['quote', 'quotation'])) {
      return {
        text: `To create a quotation:\n\n1. Open Sales & Quotations\n2. Click New Quotation\n3. Select client\n4. Add items with prices\n5. Set validity date and terms\n6. Save, send, or download PDF\n\n💡 After approval, convert to invoice with one click.`,
        action: { label: 'Create Quotation', navigate: '/sales/quotations/new' }
      }
    }
    if (this.hasWord(q, ['incident', 'accident'])) {
      return {
        text: `To report an incident:\n\n1. Open Field Ops → Incidents\n2. Click Report Incident\n3. Choose category and severity\n4. Describe what happened\n5. Add people involved\n6. Submit report\n\n📌 Your supervisor is notified automatically.`,
        action: { label: 'Report Incident', navigate: '/fieldops/incidents/report' }
      }
    }
    if (this.hasWord(q, ['job'])) {
      return {
        text: `To create a job:\n\n1. Open Operations\n2. Click New Job\n3. Select client and category\n4. Enter site details\n5. Set date, time, priority\n6. Specify cleaners needed\n7. Click Create & Schedule`,
        action: { label: 'Create Job', navigate: '/operations/jobs/new' }
      }
    }
    if (this.hasWord(q, ['client'])) {
      return { text: `To add a client:\n\n1. Open CRM & Clients\n2. Click Add Client\n3. Fill company details\n4. Add contacts\n5. Set payment terms\n6. Save`, action: { label: 'Add Client', navigate: '/crm/clients/new' } }
    }
    if (this.hasWord(q, ['employee', 'staff'])) {
      return { text: `To add an employee:\n\n1. Open HR → Employees\n2. Click Add Employee\n3. Fill personal and employment details\n4. Set up banking\n5. Save`, action: { label: 'Add Employee', navigate: '/hr/employees' } }
    }
    if (this.hasWord(q, ['invoice'])) {
      return { text: `To create an invoice:\n\n1. Open Sales & Quotations\n2. Convert from quotation or create new\n3. Add items\n4. Set due date\n5. Send to client`, action: { label: 'Open Sales', navigate: '/sales' } }
    }
    if (this.hasWord(q, ['purchase', 'order', 'po'])) {
      return { text: `To create a purchase order:\n\n1. Open Procurement\n2. Click New PO\n3. Select vendor\n4. Add items with prices\n5. Set delivery date\n6. Send PO`, action: { label: 'Create PO', navigate: '/procurement/po/new' } }
    }
    if (this.hasWord(q, ['leave'])) {
      return { text: `To apply for leave:\n\n1. Open HR → Leave Management\n2. Click New Leave Request\n3. Select type and dates\n4. Submit for approval`, action: { label: 'Apply Leave', navigate: '/hr' } }
    }
    return { text: `What would you like to create?` }
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
      const searchMatch = q.match(/who is (.+)|find (.+)|search (.+)|lookup (.+)/i)
      if (searchMatch) {
        const name = (searchMatch[1] || searchMatch[2] || searchMatch[3] || searchMatch[4]).trim()
        const { data } = await supabase.from('employees').select('*').or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`).limit(5)
        if (data?.length) {
          return { text: `Found:\n${data.map(e => `• ${e.first_name} ${e.last_name} - ${e.department || 'N/A'}`).join('\n')}`, action: { label: 'View Employees', navigate: '/hr/employees' } }
        }
        return { text: `No employee found matching "${name}".`, action: { label: 'View All', navigate: '/hr/employees' } }
      }
      const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
      return { text: `👥 **${count || 0} active employees**`, action: { label: 'View Employees', navigate: '/hr/employees' } }
    } catch { return { text: `View employees under HR Management.`, action: { label: 'Open HR', navigate: '/hr' } } }
  },

  async getIncidentInfo(q) {
    try {
      const { count: open } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_investigation'])
      const { count: critical } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical')
      return { text: `🚨 **Incidents**\n• Open: ${open || 0}\n• Critical: ${critical || 0}${critical > 0 ? '\n\n⚠️ Critical incidents need attention!' : ''}`, action: { label: 'View Incidents', navigate: '/fieldops/incidents' } }
    } catch { return { text: `View incidents under Field Operations.`, action: { label: 'Open Incidents', navigate: '/fieldops/incidents' } } }
  },

  async getJobInfo(q) {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { count: open } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).not('status', 'eq', 'completed').not('status', 'eq', 'cancelled')
      const { count: todayCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('scheduled_date', today)
      return { text: `📅 **Jobs**\n• Open: ${open || 0}\n• Today: ${todayCount || 0}`, action: { label: 'View Jobs', navigate: '/operations' } }
    } catch { return { text: `View jobs under Operations.`, action: { label: 'Open Operations', navigate: '/operations' } } }
  },

  async getClientInfo() {
    try {
      const { count: active } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'active')
      return { text: `🏢 **${active || 0} active clients**`, action: { label: 'View Clients', navigate: '/crm' } }
    } catch { return { text: `View clients under CRM & Clients.`, action: { label: 'Open CRM', navigate: '/crm' } } }
  },

  async getSalesInfo(q) {
    try {
      if (this.hasWord(q, ['invoice', 'overdue'])) {
        const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).lt('due_date', new Date().toISOString().split('T')[0]).in('status', ['sent', 'overdue'])
        return { text: count > 0 ? `💰 ${count} overdue invoices.` : `✅ No overdue invoices.`, action: { label: 'View Invoices', navigate: '/sales' } }
      }
      const { count: quotes } = await supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('status', 'sent')
      return { text: `📋 ${quotes || 0} quotations pending.`, action: { label: 'Open Sales', navigate: '/sales' } }
    } catch { return { text: `Sales & Quotations in the main menu.`, action: { label: 'Open Sales', navigate: '/sales' } } }
  },

  async getInventoryInfo() {
    try {
      const { count } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true })
      const { count: low } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).lte('current_stock', 10).gt('current_stock', 0)
      return { text: `📦 ${count || 0} items.${low > 0 ? ` ${low} low stock.` : ''}`, action: { label: 'Open Inventory', navigate: '/inventory' } }
    } catch { return { text: `Inventory in the main menu.`, action: { label: 'Open Inventory', navigate: '/inventory' } } }
  },

  async getProcurementInfo() {
    try {
      const { count: pos } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent', 'confirmed'])
      return { text: `🛒 ${pos || 0} purchase orders pending.`, action: { label: 'Open Procurement', navigate: '/procurement' } }
    } catch { return { text: `Procurement in the main menu.`, action: { label: 'Open Procurement', navigate: '/procurement' } } }
  },

  async getPayrollInfo() {
    try {
      const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
      return { text: `💰 ${count || 0} employees on payroll.`, action: { label: 'Open Payroll', navigate: '/payroll' } }
    } catch { return { text: `Payroll in the main menu.
