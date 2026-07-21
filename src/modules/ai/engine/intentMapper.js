// Maps natural language to ERP intents
// Khumo understands multiple ways of asking the same thing

export const intentMapper = {
  // Payroll variations
  payroll: [
    'payroll', 'run payroll', 'do payroll', 'process salaries', 'pay employees',
    'generate payslips', 'monthly wages', 'salary run', 'employee pay', 'payslip',
    'wages', 'salary processing', 'pay staff', 'compensation', 'remuneration'
  ],

  // Leave variations
  leave: [
    'leave', 'book leave', 'annual leave', 'take leave', 'apply leave',
    'vacation', 'holiday', 'time off', 'sick leave', 'family responsibility',
    'maternity leave', 'paternity leave', 'leave days', 'leave balance'
  ],

  // Employee variations
  employee: [
    'employee', 'staff', 'worker', 'personnel', 'team member', 'colleague',
    'cleaner', 'supervisor', 'manager', 'person', 'people', 'workforce',
    'human resource', 'hr', 'staff member', 'employee record'
  ],

  // Quotation variations
  quotation: [
    'quote', 'quotation', 'proposal', 'estimate', 'pricing', 'bid',
    'tender', 'offer', 'price quote', 'sales quote', 'customer quote'
  ],

  // Invoice variations
  invoice: [
    'invoice', 'bill', 'billing', 'payment request', 'statement',
    'account', 'receivable', 'debtor', 'outstanding payment'
  ],

  // Job variations
  job: [
    'job', 'task', 'assignment', 'work order', 'service', 'cleaning job',
    'project', 'operation', 'schedule', 'booking', 'appointment'
  ],

  // Incident variations
  incident: [
    'incident', 'accident', 'injury', 'hazard', 'near miss', 'safety',
    'danger', 'risk', 'emergency', 'report', 'occurrence', 'event'
  ],

  // Inventory variations
  inventory: [
    'inventory', 'stock', 'supply', 'item', 'product', 'material',
    'chemical', 'equipment', 'consumable', 'warehouse', 'storage'
  ],

  // Client variations
  client: [
    'client', 'customer', 'account', 'company', 'business', 'organisation',
    'enterprise', 'corporate', 'contract', 'service agreement'
  ],

  // Attendance variations
  attendance: [
    'attendance', 'clock in', 'clock out', 'present', 'absent', 'late',
    'timesheet', 'time tracking', 'check in', 'check out', 'sign in'
  ],

  // Report variations
  report: [
    'report', 'analytics', 'dashboard', 'chart', 'graph', 'statistics',
    'metrics', 'kpi', 'data', 'analysis', 'summary', 'overview'
  ],

  // Vehicle variations
  vehicle: [
    'vehicle', 'car', 'truck', 'fleet', 'transport', 'bakkie', 'van',
    'driver', 'fuel', 'mileage', 'service', 'maintenance'
  ],

  // Asset variations
  asset: [
    'asset', 'equipment', 'machine', 'device', 'appliance', 'tool',
    'property', 'fixed asset', 'depreciation', 'asset register'
  ],

  // Document variations
  document: [
    'document', 'file', 'contract', 'policy', 'sop', 'procedure',
    'manual', 'guide', 'form', 'template', 'record', 'paper'
  ],

  // Finance variations
  finance: [
    'finance', 'budget', 'expense', 'cost', 'spending', 'revenue',
    'income', 'profit', 'loss', 'accounting', 'ledger', 'tax'
  ],

  // Purchase variations
  purchase: [
    'purchase', 'procurement', 'order', 'buy', 'acquire', 'vendor',
    'supplier', 'rfq', 'purchase order', 'po', 'requisition'
  ],

  // Map a query to an intent
  detectIntent(query) {
    const q = query.toLowerCase().trim()
    const matches = {}

    for (const [intent, variations] of Object.entries(this)) {
      if (intent === 'detectIntent') continue // skip this function
      for (const variation of variations) {
        if (q.includes(variation)) {
          matches[intent] = (matches[intent] || 0) + 1
        }
      }
    }

    // Return the intent with the most matches
    const sorted = Object.entries(matches).sort((a, b) => b[1] - a[1])
    return sorted.length > 0 ? sorted[0][0] : null
  },

  // Map intent to action type
  getActionType(query) {
    const q = query.toLowerCase()

    if (this.matchAny(q, ['how to', 'how do i', 'how can i', 'steps', 'guide', 'explain how'])) return 'guide'
    if (this.matchAny(q, ['where', 'find', 'locate', 'navigate', 'go to', 'take me', 'open', 'show me where'])) return 'navigate'
    if (this.matchAny(q, ['show', 'display', 'list', 'view', 'how many', 'count', 'status', 'what is the'])) return 'data'
    if (this.matchAny(q, ['create', 'make', 'add', 'new', 'start', 'begin', 'generate'])) return 'create'
    if (this.matchAny(q, ['search', 'find', 'lookup', 'look for', 'who is', 'where is'])) return 'search'
    if (this.matchAny(q, ['what is', 'explain', 'tell me about', 'describe', 'meaning'])) return 'explain'
    if (this.matchAny(q, ['approve', 'reject', 'submit', 'complete', 'close', 'cancel', 'delete'])) return 'action'
    if (this.matchAny(q, ['report', 'analytics', 'chart', 'graph', 'export'])) return 'report'

    return 'general'
  },

  matchAny(text, keywords) {
    return keywords.some(kw => text.includes(kw))
  }
}
