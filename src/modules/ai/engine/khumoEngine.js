import { supabase } from '../../../lib/supabaseClient'
import { erpKnowledge } from './erpKnowledge'

// Conversation memory - stores recent context per user session
const conversationMemory = {}

export const khumoEngine = {
  async processQuery(query, context) {
    const { role, userName, userId, currentPage } = context
    const q = query.toLowerCase().trim()
    
    // Initialize or get memory for this user
    if (!conversationMemory[userId]) {
      conversationMemory[userId] = {
        lastTopic: null,
        lastAction: null,
        mentionedEmployee: null,
        mentionedClient: null,
        mentionedJob: null,
        conversationHistory: [],
        greetingCount: 0
      }
    }
    const memory = conversationMemory[userId]

    // Track conversation
    memory.conversationHistory.push({ query: q, timestamp: new Date() })
    if (memory.conversationHistory.length > 20) memory.conversationHistory.shift()

    // ============================================
    // CASUAL CONVERSATION & PERSONALITY
    // ============================================
    
    // Greetings with personality
    if (this.matchAny(q, ['hello', 'hi', 'hey', 'dumela', 'sawubona', 'hola', 'howzit', 'good morning', 'good afternoon', 'good evening', 'morning', 'afternoon', 'evening'])) {
      memory.greetingCount++
      return this.personalGreeting(userName, memory.greetingCount)
    }

    // How are you
    if (this.matchAny(q, ['how are you', 'how you doing', 'how is it going', 'how do you feel', 'are you okay'])) {
      return this.feelingsResponse(userName)
    }

    // Who are you / Tell me about yourself
    if (this.matchAny(q, ['who are you', 'what are you', 'your name', 'tell me about yourself', 'what do you do', 'introduce yourself'])) {
      return this.aboutMe(userName)
    }

    // Thank you
    if (this.matchAny(q, ['thank', 'thanks', 'ke a leboga', 'appreciate', 'you are the best', 'you are amazing', 'great help', 'helpful'])) {
      return this.gratitudeResponse()
    }

    // Goodbye
    if (this.matchAny(q, ['bye', 'goodbye', 'see you', 'sala kahle', 'catch you later', 'talk later', 'have a good day'])) {
      return this.goodbyeResponse(userName)
    }

    // Compliments
    if (this.matchAny(q, ['you are smart', 'you are intelligent', 'you are cool', 'you are funny', 'good job', 'well done', 'awesome', 'fantastic', 'brilliant'])) {
      return this.complimentResponse(userName)
    }

    // Weather / small talk
    if (this.matchAny(q, ['weather', 'rain', 'sunny', 'cold', 'hot', 'temperature'])) {
      return this.smallTalk('weather')
    }

    // How's your day
    if (this.matchAny(q, ['how is your day', 'hows your day', 'busy day'])) {
      return this.smallTalk('day')
    }

    // Jokes / fun
    if (this.matchAny(q, ['joke', 'funny', 'make me laugh', 'tell me something funny', 'humor'])) {
      return this.tellJoke()
    }

    // Weekend / plans
    if (this.matchAny(q, ['weekend', 'plans', 'friday', 'holiday', 'vacation'])) {
      return this.smallTalk('weekend')
    }

    // Food / coffee
    if (this.matchAny(q, ['coffee', 'tea', 'hungry', 'food', 'lunch', 'breakfast', 'dinner', 'eat'])) {
      return this.smallTalk('food')
    }

    // Tired / stressed
    if (this.matchAny(q, ['tired', 'stressed', 'exhausted', 'overwhelmed', 'busy', 'too much work', 'workload'])) {
      return this.empatheticResponse(userName, q)
    }

    // ============================================
    // CONTEXT-AWARE FOLLOW-UP (Memory)
    // ============================================

    // If user previously mentioned something, use it
    if (memory.lastTopic && this.matchAny(q, ['that', 'it', 'this', 'there', 'again', 'more', 'tell me more', 'go on', 'continue', 'elaborate'])) {
      return this.followUp(memory)
    }

    // ============================================
    // WHAT IS / EXPLAIN
    // ============================================
    if (this.matchAny(q, ['what is', 'explain', 'tell me about', 'describe', 'meaning of', 'definition of'])) {
      memory.lastTopic = 'explain'
      return this.explainModule(q)
    }

    // ============================================
    // HOW TO
    // ============================================
    if (this.matchAny(q, ['how to', 'how do i', 'how can i', 'steps to', 'guide me', 'show me how'])) {
      memory.lastTopic = 'howto'
      return this.guideUser(q)
    }

    // ============================================
    // WHERE IS
    // ============================================
    if (this.matchAny(q, ['where', 'find', 'locate', 'which page', 'navigate', 'take me to'])) {
      memory.lastTopic = 'navigate'
      return this.navigateUser(q)
    }

    // ============================================
    // SHOW ME / DATA QUERIES
    // ============================================
    if (this.matchAny(q, ['show', 'display', 'list', 'view', 'how many', 'count', 'status', 'overview', 'summary', 'look at', 'check'])) {
      memory.lastTopic = 'data'
      return await this.fetchData(q, role, memory)
    }

    // ============================================
    // CREATE / MAKE / ADD
    // ============================================
    if (this.matchAny(q, ['create', 'make', 'add', 'new', 'start', 'begin', 'open'])) {
      memory.lastTopic = 'create'
      return this.suggestAction(q, role)
    }

    // ============================================
    // SEARCH FOR PEOPLE/THINGS
    // ============================================
    if (this.matchAny(q, ['search', 'find', 'lookup', 'look for', 'look up'])) {
      return await this.searchFor(q, memory)
    }

    // ============================================
    // SMART INTENT DETECTION
    // ============================================
    return this.detectIntent(q, context, memory)
  },

  // ============================================
  // HELPER
  // ============================================
  matchAny(text, keywords) {
    return keywords.some(kw => text.includes(kw))
  },

  // ============================================
  // PERSONALITY - GREETINGS
  // ============================================
  personalGreeting(userName, count) {
    const name = userName || 'there'
    const hour = new Date().getHours()
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    
    if (count === 1) {
      return {
        text: `${timeGreeting}, ${name}! 👋\n\nI'm Khumo, your ERP assistant. I'm here to help you with anything in the system.\n\nHow can I help you today?`,
        mood: 'welcoming'
      }
    } else if (count <= 3) {
      return {
        text: `Hey ${name}! 👋 Great to see you again.\n\nWhat can I help you with this time?`
      }
    } else {
      const greetings = [
        `Always a pleasure, ${name}! What's on your mind?`,
        `Welcome back, ${name}! Ready to tackle the day?`,
        `Hi again, ${name}! You're keeping me busy today - I love it! What's next?`,
        `${name}! You're back. Let's get things done. What do you need?`
      ]
      return { text: greetings[Math.floor(Math.random() * greetings.length)] }
    }
  },

  // ============================================
  // PERSONALITY - FEELINGS
  // ============================================
  feelingsResponse(userName) {
    const responses = [
      `I'm doing great, ${userName || 'friend'}! 😊 Ready to help you conquer the day.\n\nWhat can I assist you with?`,
      `Feeling fantastic and fully charged! ⚡ The database is healthy, the system is running smoothly, and I'm ready to work.\n\nHow can I help?`,
      `I'm wonderful, thank you for asking! 💚 It's always a good day when I get to help people like you.\n\nWhat would you like to do?`,
      `I'm living my best digital life! 🤖 Everything is running perfectly, and I'm eager to assist.\n\nWhat's on your mind?`
    ]
    return { text: responses[Math.floor(Math.random() * responses.length)] }
  },

  // ============================================
  // PERSONALITY - ABOUT ME
  // ============================================
  aboutMe(userName) {
    return {
      text: `I'm **Khumo**! 🤖\n\nI'm the AI assistant for the Ndanduleni Group ERP system. I was built to help you navigate, understand, and work more efficiently with your ERP.\n\n**What I do:**\n📊 Show you real-time data from any module\n📝 Guide you through creating things like quotations and jobs\n🗺️ Help you find any feature or page\n💡 Explain how different parts of the ERP work\n🔍 Search for employees, clients, jobs, and more\n\n**Fun fact:** My name "Khumo" means "wealth" or "riches" in Setswana - because knowledge is the greatest wealth!\n\nSo, ${userName || 'friend'}, what would you like to do today?`
    }
  },

  // ============================================
  // PERSONALITY - GRATITUDE
  // ============================================
  gratitudeResponse() {
    const responses = [
      `You're very welcome! 😊 I'm always happy to help.\n\nIs there anything else you need?`,
      `No problem at all! That's what I'm here for. 💚\n\nAnything else I can assist with?`,
      `Aww, thank YOU for being awesome to work with! 🙏\n\nLet me know if you need anything else.`,
      `My pleasure! Helping you is literally what I was built for, and I love it!\n\nWhat's next?`
    ]
    return { text: responses[Math.floor(Math.random() * responses.length)] }
  },

  // ============================================
  // PERSONALITY - GOODBYE
  // ============================================
  goodbyeResponse(userName) {
    const responses = [
      `Goodbye, ${userName || 'friend'}! 👋 Have a fantastic day. I'll be here whenever you need me.`,
      `See you later, ${userName || 'there'}! Don't forget to clock out! 😄\n\nI'll be right here when you come back.`,
      `Sala kahle! 🇿🇦 Take care and come back soon. I'll keep things running while you're away.`,
      `Bye for now! Remember, I'm just a click away whenever you need help. Have a great one! 🌟`
    ]
    return { text: responses[Math.floor(Math.random() * responses.length)] }
  },

  // ============================================
  // PERSONALITY - COMPLIMENTS
  // ============================================
  complimentResponse(userName) {
    const responses = [
      `Oh, stop it! 😊 You're making me blush... digitally speaking!\n\nBut seriously, thank you. Now, how can I help?`,
      `Thank you, ${userName || 'friend'}! 🙏 I try my best.\n\nYou're pretty awesome yourself for using this ERP like a pro!`,
      `Aww, you're too kind! 💚 I'm just doing what I was built to do - help amazing people like you.\n\nWhat can I do for you next?`
    ]
    return { text: responses[Math.floor(Math.random() * responses.length)] }
  },

  // ============================================
  // SMALL TALK
  // ============================================
  smallTalk(topic) {
    const responses = {
      weather: `I may not feel the weather, but I hope it's beautiful wherever you are! ☀️\n\nNow, back to business - what can I help you with?`,
      day: `My day is going great! Every day I get to help people like you, so I can't complain. 😊\n\nHow's your day going? And more importantly, what can I help with?`,
      weekend: `Ah, looking forward to some time off? 😄 You deserve it!\n\nLet's get things done now so you can enjoy your time away. What do you need?`,
      food: `I wish I could eat! 😄 But I run on electricity and data instead.\n\nWhile you grab a snack, is there anything I can help you with in the ERP?`
    }
    return { text: responses[topic] || `I'm always happy to chat! But I'm also here to help with your work.\n\nWhat can I assist with?` }
  },

  // ============================================
  // EMPATHY
  // ============================================
  empatheticResponse(userName, q) {
    if (this.matchAny(q, ['tired', 'exhausted'])) {
      return { text: `I hear you, ${userName || 'friend'}. 😴 Long days can be tough.\n\nHow about I help you get through your tasks faster? That way you can finish up and get some rest.\n\nWhat do you need to get done?` }
    }
    if (this.matchAny(q, ['stressed', 'overwhelmed', 'too much'])) {
      return { text: `I understand, ${userName || 'there'}. When there's too much on your plate, it can feel overwhelming. 😟\n\nLet me help you prioritize. Tell me what's most urgent, and I'll guide you through it step by step.\n\nWhat's the biggest thing on your mind right now?` }
    }
    return { text: `I'm here for you, ${userName || 'friend'}. 💚\n\nWhatever you're dealing with, let's tackle it together. What can I help with?` }
  },

  // ============================================
  // JOKES
  // ============================================
  tellJoke() {
    const jokes = [
      `Why did the spreadsheet go to therapy? Because it had too many issues with its columns! 📊😄\n\nOkay, back to work. What can I help with?`,
      `Why don't programmers like nature? Too many bugs! 🐛😆\n\nAlright, enough fun. What ERP task can I assist with?`,
      `What did the database say to the query? "You complete me!" 💾😂\n\nNow, what would you like to do?`,
      `I told my boss I needed a raise because I'm AI. He said I should be happy with my current... byte. 🤖💸\n\nOkay okay, I'll stop. What can I help you with?`
    ]
    return { text: jokes[Math.floor(Math.random() * jokes.length)] }
  },

  // ============================================
  // CONTEXT-AWARE FOLLOW-UP
  // ============================================
  followUp(memory) {
    if (memory.lastAction === 'showedEmployees') {
      return { text: `Would you like to see more details about ${memory.mentionedEmployee || 'a specific employee'}? Or would you prefer to look at something else?` }
    }
    if (memory.lastAction === 'showedIncidents') {
      return { text: `Would you like me to show you the incident details, or would you prefer to open the incident management page?` }
    }
    return { text: `I remember we were talking about ${memory.lastTopic || 'something'}. Would you like to continue with that, or shall we move on to something new?` }
  },

  // ============================================
  // EXPLAIN MODULE
  // ============================================
  explainModule(q) {
    const module = erpKnowledge.getModule(q)
    if (!module) {
      return { text: `Hmm, I couldn't find a specific module matching that. 🤔\n\nI know about: HR, Payroll, CRM, Sales, Operations, Inventory, Procurement, Fleet, Incidents, Reports, Documents, and more.\n\nWhich one would you like to learn about?` }
    }
    let response = `📚 **${module.name}**\n\n${module.description}\n\n`
    if (module.features?.length) {
      response += `\n**What you can do:**\n${module.features.map(f => `• ${f}`).join('\n')}\n`
    }
    if (module.navigation) {
      response += `\n🗺️ **Where to find it:** ${module.navigation}`
    }
    response += `\n\nWould you like me to guide you through using ${module.name}, or open it for you?`
    return { text: response, action: module.navigation ? { label: `Open ${module.name}`, navigate: `/${module.parent || module.key || ''}` } : null }
  },

  // ============================================
  // GUIDE USER
  // ============================================
  guideUser(q) {
    if (this.matchAny(q, ['quote', 'quotation'])) {
      return { text: `Great choice! Let me walk you through creating a quotation. 📋\n\n**Step 1:** Open **Sales & Quotations** from your main menu\n**Step 2:** Click the **New Quotation** button\n**Step 3:** Select your **Client** from the dropdown\n**Step 4:** Add the services or items with quantities and prices\n**Step 5:** Set the **valid until date**\n**Step 6:** Review everything on the preview panel\n**Step 7:** Click **Save & Send** or download as A4 PDF\n\n💡 **Pro tip:** Once the client approves, you can convert it to an invoice with one click!\n\nReady to create one?`, action: { label: 'Open Sales', navigate: '/sales' } }
    }
    if (this.matchAny(q, ['incident', 'accident', 'report'])) {
      return { text: `Safety first! Let me guide you through reporting an incident. 🚨\n\n**Step 1:** Open **Field Ops → Incidents**\n**Step 2:** Click the red **Report Incident** button\n**Step 3:** Choose the **Category** (Safety, Vehicle, Equipment, etc.)\n**Step 4:** Set the **Severity** level\n**Step 5:** Describe what happened in detail\n**Step 6:** Add location, date, and time\n**Step 7:** List people involved and any witnesses\n**Step 8:** Check injury/damage boxes if applicable\n**Step 9:** Describe immediate actions taken\n**Step 10:** Click **Submit Report**\n\n📌 Your supervisor and safety officer will be notified immediately.\n\nReady to report?`, action: { label: 'Report Incident', navigate: '/fieldops/incidents/report' } }
    }
    if (this.matchAny(q, ['job', 'schedule'])) {
      return { text: `Let's create a new job! 📝\n\n**Step 1:** Open **Operations**\n**Step 2:** Click **New Job**\n**Step 3:** Select the **Client**\n**Step 4:** Choose the **Job Category** (Office Cleaning, Deep Clean, etc.)\n**Step 5:** Enter the job title and site address\n**Step 6:** Set the date, start time, and estimated duration\n**Step 7:** Set the priority level\n**Step 8:** Specify how many cleaners are needed\n**Step 9:** Add any special instructions or access notes\n**Step 10:** Click **Create & Schedule**\n\n💡 The job will appear on the Live Jobs board where you can assign staff.\n\nReady to create one?`, action: { label: 'Open Operations', navigate: '/operations' } }
    }
    if (this.matchAny(q, ['clock in', 'clock out', 'attendance'])) {
      return { text: `Clocking in is easy! ⏰\n\n**On your computer:**\n1️⃣ Open **HR → Attendance**\n2️⃣ Click the green **Clock In** button\n3️⃣ Your GPS location is captured automatically\n4️⃣ When done, click the red **Clock Out** button\n\n**On your phone:**\n1️⃣ Open the mobile app\n2️⃣ Tap **Clock In**\n3️⃣ GPS is auto-captured\n\n💡 **Forgot to clock in?** You can request a correction from your supervisor.\n\nNeed to clock in now?`, action: { label: 'Open Attendance', navigate: '/hr/attendance' } }
    }
    if (this.matchAny(q, ['leave', 'apply leave'])) {
      return { text: `Taking time off? Let me help! 🏖️\n\n**Step 1:** Open **HR → Leave Management**\n**Step 2:** Click **New Leave Request**\n**Step 3:** Choose your leave type:\n   • Annual Leave (15 days/year)\n   • Sick Leave (30 days per 3-year cycle)\n   • Family Responsibility (3 days/year)\n   • Maternity/Paternity\n**Step 4:** Select start and end dates\n**Step 5:** Write a brief reason\n**Step 6:** Submit for approval\n\n📌 Your manager will be notified to approve.\n\nReady to apply?`, action: { label: 'Open Leave', navigate: '/hr' } }
    }
    if (this.matchAny(q, ['assign', 'staff', 'employee'])) {
      return { text: `Let's get the right people on the job! 👤\n\n**Step 1:** Open **Field Ops → Live Jobs**\n**Step 2:** Find the job in the list\n**Step 3:** Click the blue **Add Person** button\n**Step 4:** Select the employee from the dropdown\n**Step 5:** Click **Assign**\n\n📱 The employee will see the job instantly on their mobile app!\n\nReady to assign someone?`, action: { label: 'Open Live Jobs', navigate: '/fieldops/live-jobs' } }
    }
    return { text: `I'd love to guide you! What would you like to learn?\n\nHere are some popular ones:\n• "How to create a quotation?"\n• "How to report an incident?"\n• "How to clock in?"\n• "How to apply for leave?"\n• "How to assign staff?"` }
  },

  // ============================================
  // NAVIGATE USER
  // ============================================
  navigateUser(q) {
    const nav = {
      employee: { text: `Your team is under **HR Management**. 👥\n\nGo to: Home → HR Management → Employees\n\nFrom there you can view everyone, add new staff, and manage their records.`, action: { label: 'Open Employees', navigate: '/hr/employees' } },
      incident: { text: `Incidents are under **Field Operations**. 🚨\n\nGo to: Home → Field Ops → Incidents\n\nYou can view the dashboard, report new incidents, or track existing ones.`, action: { label: 'Open Incidents', navigate: '/fieldops/incidents' } },
      job: { text: `Jobs are under **Operations**. 📅\n\nGo to: Home → Operations\n\nFor live job tracking: Home → Field Ops → Live Jobs`, action: { label: 'Open Operations', navigate: '/operations' } },
      client: { text: `Your clients are under **CRM & Clients**. 🏢\n\nGo to: Home → CRM & Clients`, action: { label: 'Open CRM', navigate: '/crm' } },
      quote: { text: `Sales are under **Sales & Quotations**. 📋\n\nGo to: Home → Sales & Quotations`, action: { label: 'Open Sales', navigate: '/sales' } },
      stock: { text: `Inventory is under **Inventory Management**. 📦\n\nGo to: Home → Inventory`, action: { label: 'Open Inventory', navigate: '/inventory' } },
      purchase: { text: `Procurement is under **Procurement**. 🛒\n\nGo to: Home → Procurement`, action: { label: 'Open Procurement', navigate: '/procurement' } },
      payroll: { text: `Payroll is under **Payroll**. 💰\n\nGo to: Home → Payroll`, action: { label: 'Open Payroll', navigate: '/payroll' } },
      attendance: { text: `Attendance is under **HR Management**. ⏰\n\nGo to: Home → HR Management → Attendance`, action: { label: 'Open Attendance', navigate: '/hr/attendance' } },
      report: { text: `Reports are under **Reporting & Analytics**. 📊\n\nGo to: Home → Reports`, action: { label: 'Open Reports', navigate: '/reports' } },
      document: { text: `Documents are under **Document Management**. 📁\n\nGo to: Home → Documents`, action: { label: 'Open Documents', navigate: '/documents' } },
      fleet: { text: `Fleet is under **Fleet Management**. 🚛\n\nGo to: Home → Fleet Management`, action: { label: 'Open Fleet', navigate: '/fleet' } },
    }
    for (const [key, val] of Object.entries(nav)) {
      if (this.matchAny(q, [key])) return val
    }
    return { text: `I can help you find anything! Try asking:\n\n• "Where are employees?"\n• "Where do I report an incident?"\n• "Where is inventory?"\n• "Where do I approve leave?"` }
  },

  // ============================================
  // FETCH REAL DATA
  // ============================================
  async fetchData(q, role, memory) {
    try {
      if (this.matchAny(q, ['employee', 'staff', 'worker', 'people', 'team'])) {
        const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('employment_status', 'active')
        memory.lastAction = 'showedEmployees'
        return { text: `👥 You have **${count || 0} active employees** in the system.\n\nWould you like to see the full list with their departments and positions?`, action: { label: 'Open Employees', navigate: '/hr/employees' } }
      }
      if (this.matchAny(q, ['incident', 'accident', 'safety'])) {
        const { count: open } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['reported', 'under_investigation'])
        const { count: critical } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('severity', 'critical')
        memory.lastAction = 'showedIncidents'
        let text = `🚨 **Incident Report**\n\n• Open Incidents: **${open || 0}**\n• Critical: **${critical || 0}**`
        if (critical > 0) text += `\n\n⚠️ There are critical incidents that need immediate attention!`
        else text += `\n\n✅ No critical incidents - great job maintaining safety!`
        return { text, action: { label: 'View Incidents', navigate: '/fieldops/incidents' } }
      }
      if (this.matchAny(q, ['job', 'schedule'])) {
        const today = new Date().toISOString().split('T')[0]
        const { count: open } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).not('status', 'eq', 'completed').not('status', 'eq', 'cancelled')
        const { count: todayCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('scheduled_date', today)
        return { text: `📅 **Job Status**\n\n• Open Jobs: **${open || 0}**\n• Today's Jobs: **${todayCount || 0}**\n\nWould you like to see the details?`, action: { label: 'View Jobs', navigate: '/operations' } }
      }
      if (this.matchAny(q, ['client', 'customer'])) {
        const { count: total } = await supabase.from('clients').select('*', { count: 'exact', head: true })
        const { count: active } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('client_status', 'active')
        return { text: `🏢 **Client Overview**\n\n• Total Clients: **${total || 0}**\n• Active: **${active || 0}**\n\nYour client portfolio is looking ${active > 10 ? 'healthy!' : 'good - ready for growth!'}`, action: { label: 'Open CRM', navigate: '/crm' } }
      }
      if (this.matchAny(q, ['stock', 'inventory'])) {
        const { count: total } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true })
        const { count: lowStock } = await supabase.from('inventory_items').select('*', { count: 'exact', head: true }).lte('current_stock', supabase.raw('COALESCE(reorder_point, 10)')).gt('current_stock', 0)
        let text = `📦 **Inventory**\n\n• Total Items: **${total || 0}**`
        if (lowStock > 0) text += `\n• Low Stock: **${lowStock}** ⚠️\n\nSome items need reordering!`
        else text += `\n\n✅ All stock levels are good.`
        return { text, action: { label: 'Open Inventory', navigate: '/inventory' } }
      }
      if (this.matchAny(q, ['purchase', 'procurement', 'po'])) {
        const { count: pending } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).in('status', ['draft', 'sent', 'confirmed'])
        return { text: `🛒 **Procurement**\n\n• Pending Purchase Orders: **${pending || 0}**\n\n${pending > 0 ? 'There are orders waiting to be processed.' : 'No pending orders - everything is up to date!'}`, action: { label: 'Open Procurement', navigate: '/procurement' } }
      }
      if (this.matchAny(q, ['attendance', 'present', 'absent'])) {
        const today = new Date().toISOString().split('T')[0]
        const { count: present } = await supabase.from('attendance_records').select('*', { count: 'exact', head: true }).eq('attendance_date', today).not('clock_in_time', 'is', null)
        return { text: `⏰ **Today's Attendance**\n\n• Clocked In: **${present || 0}**\n\nTracking attendance helps with payroll and compliance.`, action: { label: 'Open Attendance', navigate: '/hr/attendance' } }
      }
    } catch (err) {
      console.error('Khumo data fetch:', err)
    }
    return { text: `I can pull up real-time data for you! Try:\n\n• "Show me employees"\n• "How many open incidents?"\n• "Check stock levels"\n• "Show active jobs"` }
  },

  // ============================================
  // SUGGEST ACTION
  // ============================================
  suggestAction(q, role) {
    if (this.matchAny(q, ['quote', 'quotation'])) return { text: `Let's create a quotation! 📋 Head over to Sales & Quotations and click New Quotation.\n\nI can open it for you:`, action: { label: 'Open Sales', navigate: '/sales' } }
    if (this.matchAny(q, ['incident', 'accident'])) return { text: `Safety is important. Let's report this properly. 🚨\n\nI can open the incident form for you:`, action: { label: 'Report Incident', navigate: '/fieldops/incidents/report' } }
    if (this.matchAny(q, ['job'])) return { text: `Time to create a new job! 📝\n\nI can take you straight to Operations:`, action: { label: 'Open Operations', navigate: '/operations' } }
    if (this.matchAny(q, ['client'])) return { text: `Adding a new client? Great for business! 🏢\n\nI can open CRM for you:`, action: { label: 'Open CRM', navigate: '/crm' } }
    if (this.matchAny(q, ['employee', 'staff'])) return { text: `Growing the team? Let's add them to the system! 👥\n\nI can open HR for you:`, action: { label: 'Open HR', navigate: '/hr' } }
    if (this.matchAny(q, ['invoice'])) return { text: `Let's get that invoice created! 📄\n\nI can open Sales for you:`, action: { label: 'Open Sales', navigate: '/sales' } }
    if (this.matchAny(q, ['purchase', 'order', 'po'])) return { text: `Time to order supplies! 🛒\n\nI can open Procurement for you:`, action: { label: 'Open Procurement', navigate: '/procurement' } }
    if (this.matchAny(q, ['leave'])) return { text: `Everyone needs time off! 🏖️\n\nI can take you to Leave Management:`, action: { label: 'Open Leave', navigate: '/hr' } }
    return { text: `What would you like to create? I can help with quotations, jobs, incidents, purchase orders, and more!` }
  },

  // ============================================
  // SEARCH
  // ============================================
  async searchFor(q, memory) {
    const searchTerm = q.replace(/search|find|lookup|look for|look up/gi, '').trim()
    if (!searchTerm) return { text: `Sure! What or who are you looking for?\n\nYou can search for employees, clients, jobs, or incidents.` }

    // Try employees
    const { data: employees } = await supabase.from('employees').select('first_name, last_name, employee_code, department').or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`).limit(5)
    if (employees?.length) {
      memory.mentionedEmployee = `${employees[0].first_name} ${employees[0].last_name}`
      let text = `🔍 Found ${employees.length} employee(s) matching "${searchTerm}":\n\n`
      employees.forEach(e => text += `• **${e.first_name} ${e.last_name}** - ${e.department || 'N/A'} (${e.employee_code})\n`)
      return { text, action: { label: 'Open Employees', navigate: '/hr/employees' } }
    }

    // Try clients
    const { data: clients } = await supabase.from('clients').select('company_name, city').ilike('company_name', `%${searchTerm}%`).limit(5)
    if (clients?.length) {
      memory.mentionedClient = clients[0].company_name
      let text = `🔍 Found ${clients.length} client(s) matching "${searchTerm}":\n\n`
      clients.forEach(c => text += `• **${c.company_name}** - ${c.city || 'N/A'}\n`)
      return { text, action: { label: 'Open CRM', navigate: '/crm' } }
    }

    // Try jobs
    const { data: jobs } = await supabase.from('jobs').select('job_number, title, status').ilike('job_number', `%${searchTerm}%`).limit(5)
    if (jobs?.length) {
      let text = `🔍 Found ${jobs.length} job(s) matching "${searchTerm}":\n\n`
      jobs.forEach(j => text += `• **${j.job_number}** - ${j.title} (${j.status})\n`)
      return { text, action: { label: 'View Jobs', navigate: '/operations' } }
    }

    return { text: `I searched for "${searchTerm}" but couldn't find anything. 🤔\n\nTry searching for:\n• An employee name\n• A client company\n• A job number\n• An incident number` }
  },

  // ============================================
  // SMART INTENT
  // ============================================
  detectIntent(q, context, memory) {
    if (this.matchAny(q, ['forgot', 'clock', 'missed'])) {
      return { text: `⏰ Oh no, forgot to clock in? Don't worry, it happens!\n\nYou can request an attendance correction from your supervisor. Go to HR → Attendance and look for the correction option.\n\nNeed me to open it?`, action: { label: 'Open Attendance', navigate: '/hr/attendance' } }
    }
    if (this.matchAny(q, ['leave balance', 'leave days', 'how many leave'])) {
      return { text: `📊 Your leave balance is available under HR → Leave Management.\n\n📌 Remember, under SA labor law:\n• Annual Leave: 15 working days per year\n• Sick Leave: 30 days per 3-year cycle\n• Family Responsibility: 3 days per year\n\nWant me to open it?`, action: { label: 'Open Leave', navigate: '/hr' } }
    }
    if (this.matchAny(q, ['help', 'stuck', 'confused', 'dont know', 'lost'])) {
      return { text: `No worries, I'm here to help! 😊\n\nTell me what you're trying to do, and I'll guide you through it step by step.\n\nSome things I can help with:\n📝 Creating documents\n🔍 Finding information\n📊 Viewing reports\n👥 Managing staff\n\nWhat's on your mind?` }
    }

    // Friendly fallback
    const fallbacks = [
      `I'm not quite sure what you mean, but I'd love to help! Could you rephrase that?\n\nFor example:\n• "Show me all employees"\n• "How do I create a quotation?"\n• "Where is inventory?"`,
      `Hmm, I didn't quite catch that. 😅\n\nTry asking me things like:\n• "What jobs are open today?"\n• "How to report an incident?"\n• "Show me the client list"`,
      `I want to help, but I need a bit more clarity. 🤔\n\nYou can ask me to:\n📊 Show data - "How many employees?"\n📝 Guide you - "How to create a quotation?"\n🗺️ Find things - "Where is payroll?"`
    ]
    return { text: fallbacks[Math.floor(Math.random() * fallbacks.length)] }
  }
}
