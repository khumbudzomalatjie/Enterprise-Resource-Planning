// KHUMO's complete ERP knowledge - auto-updates with new modules

export const erpKnowledge = {
  modules: {
    dashboard: {
      name: 'Dashboard',
      description: 'Central overview of your entire ERP system. See key metrics, active jobs, pending tasks, and quick access to all modules.',
      path: 'Home',
      navigation: 'Home → Dashboard',
      roles: ['all'],
      features: ['Stats overview', 'Quick actions', 'Module navigation', 'Recent activity']
    },
    hr: {
      name: 'Human Resources',
      description: 'Complete employee lifecycle management. Handle recruitment, onboarding, employee records, leave, training, performance reviews, and disciplinary matters.',
      path: 'Home → HR Management',
      navigation: 'Home → HR Management',
      roles: ['super_admin', 'hr_manager', 'operations_manager'],
      submodules: {
        employees: {
          name: 'Employees',
          description: 'View and manage all employee records including personal details, contracts, documents, and employment history.',
          navigation: 'Home → HR Management → Employees',
          features: ['Employee list', 'Add employee', 'Edit details', 'Upload documents', 'View contracts']
        },
        attendance: {
          name: 'Attendance',
          description: 'Track employee attendance with clock in/out, GPS location, QR codes, timesheets, and shift management.',
          navigation: 'Home → HR Management → Attendance',
          features: ['Clock in', 'Clock out', 'Timesheets', 'Shift management', 'QR check-in', 'GPS tracking']
        },
        leave: {
          name: 'Leave Management',
          description: 'Process leave requests, view balances, and manage different leave types including annual, sick, family responsibility, and maternity leave per South African labor law.',
          navigation: 'Home → HR Management → Leave',
          features: ['Apply leave', 'Approve requests', 'Leave balances', 'Leave types', 'Leave calendar']
        },
        training: {
          name: 'Training Records',
          description: 'Track employee training, certifications, and development programs.',
          navigation: 'Home → HR Management → Training',
          features: ['Training records', 'Certifications', 'Course management']
        },
        disciplinary: {
          name: 'Disciplinary Records',
          description: 'Manage disciplinary cases, warnings, hearings, and outcomes.',
          navigation: 'Home → HR Management → Disciplinary',
          features: ['Warnings', 'Hearings', 'Outcomes', 'Appeals']
        }
      }
    },
    payroll: {
      name: 'Payroll',
      description: 'Process monthly payroll including salaries, overtime, deductions, tax (PAYE/UIF), and generate payslips.',
      path: 'Home → Payroll',
      navigation: 'Home → Payroll',
      roles: ['super_admin', 'finance_officer', 'hr_manager'],
      features: ['Salary processing', 'Payslips', 'Tax deductions', 'Overtime', 'Payment history']
    },
    crm: {
      name: 'CRM & Clients',
      description: 'Manage your client portfolio, contacts, service agreements, sales pipeline, and client communications.',
      path: 'Home → CRM & Clients',
      navigation: 'Home → CRM & Clients',
      roles: ['super_admin', 'operations_manager', 'sales_agent'],
      features: ['Client list', 'Add client', 'Contacts', 'Pipeline', 'Service agreements', 'Interactions']
    },
    sales: {
      name: 'Sales & Quotations',
      description: 'Create professional A4 quotations, convert to invoices, track payments, and manage your sales pipeline.',
      path: 'Home → Sales & Quotations',
      navigation: 'Home → Sales & Quotations',
      roles: ['super_admin', 'operations_manager', 'sales_agent', 'finance_officer'],
      features: ['Quotations', 'Invoices', 'Payments', 'Products catalog', 'Sales reports'],
      workflows: {
        quotation: 'Create Quotation → Send to Client → Client Approves → Convert to Invoice → Receive Payment'
      }
    },
    operations: {
      name: 'Operations & Scheduling',
      description: 'Manage all cleaning jobs, schedules, team assignments, routes, quality inspections, and job completion.',
      path: 'Home → Operations',
      navigation: 'Home → Operations',
      roles: ['super_admin', 'operations_manager', 'supervisor'],
      features: ['Job management', 'Scheduling', 'Team assignment', 'Routes', 'Quality inspections'],
      submodules: {
        jobs: {
          name: 'Jobs',
          description: 'Create and manage cleaning jobs with scheduling, staff assignment, and completion tracking.',
          navigation: 'Home → Operations → Jobs',
          features: ['Create job', 'View jobs', 'Assign staff', 'Complete job']
        }
      }
    },
    inventory: {
      name: 'Inventory Management',
      description: 'Track all stock items, cleaning chemicals, equipment, PPE, and consumables across warehouses.',
      path: 'Home → Inventory',
      navigation: 'Home → Inventory',
      roles: ['super_admin', 'operations_manager', 'supervisor'],
      features: ['Stock list', 'Stock in', 'Stock out', 'Warehouses', 'Categories', 'Suppliers']
    },
    procurement: {
      name: 'Procurement',
      description: 'Manage purchase requisitions, purchase orders, RFQs, vendors, and goods receipts.',
      path: 'Home → Procurement',
      navigation: 'Home → Procurement',
      roles: ['super_admin', 'operations_manager', 'finance_officer'],
      features: ['Purchase Requests', 'Purchase Orders', 'RFQs', 'Vendors', 'Goods Receipts'],
      workflows: {
        procurement: 'Purchase Request → Approval → RFQ → Vendor Selection → Purchase Order → Goods Receipt → Inventory Update'
      }
    },
    fleet: {
      name: 'Fleet Management',
      description: 'Track vehicles, schedule maintenance, monitor fuel consumption, and manage driver assignments.',
      path: 'Home → Fleet Management',
      navigation: 'Home → Fleet Management',
      roles: ['super_admin', 'operations_manager', 'supervisor'],
      features: ['Vehicle tracking', 'Maintenance', 'Fuel tracking', 'Driver management']
    },
    incidents: {
      name: 'Incident Management',
      description: 'Report, investigate, and manage workplace incidents. Track root causes, corrective actions, and approvals.',
      path: 'Home → Field Ops → Incidents',
      navigation: 'Home → Field Ops → Incidents',
      roles: ['all'],
      features: ['Report incident', 'Investigation', 'Corrective actions', 'Approvals', 'Incident tracker'],
      workflows: {
        incident: 'Report Incident → Supervisor Review → Investigation → Root Cause Analysis → Corrective Actions → Approvals → Closure'
      }
    },
    reports: {
      name: 'Reporting & Analytics',
      description: 'Generate comprehensive reports across all modules with charts, graphs, and export options.',
      path: 'Home → Reports',
      navigation: 'Home → Reports',
      roles: ['super_admin', 'operations_manager', 'finance_officer', 'hr_manager'],
      features: ['HR reports', 'Sales reports', 'Operations reports', 'Finance reports', 'Incident reports']
    },
    documents: {
      name: 'Document Management',
      description: 'Central document repository for contracts, policies, SOPs, compliance documents, and company files.',
      path: 'Home → Documents',
      navigation: 'Home → Documents',
      roles: ['super_admin', 'operations_manager', 'hr_manager'],
      features: ['Upload', 'Organize', 'Search', 'Share', 'Version control']
    },
    mobile: {
      name: 'Mobile Workforce',
      description: 'Mobile app for field cleaners to view jobs, clock in/out, take site photos, report incidents, and request supplies.',
      path: 'Home → Mobile App',
      navigation: 'Home → Mobile App',
      roles: ['all'],
      features: ['My jobs', 'Clock in/out', 'Photos', 'Incidents', 'Supplies request']
    },
    finance: {
      name: 'Finance & Accounting',
      description: 'Financial management including budgets, expenses, approvals, and financial reporting.',
      path: 'Home → Finance',
      navigation: 'Home → Finance',
      roles: ['super_admin', 'finance_officer'],
      features: ['Budgets', 'Expenses', 'Approvals', 'Financial reports']
    },
    assets: {
      name: 'Asset Management',
      description: 'Track company assets, depreciation, maintenance schedules, and asset lifecycle.',
      path: 'Home → Assets',
      navigation: 'Home → Assets',
      roles: ['super_admin', 'finance_officer', 'operations_manager'],
      features: ['Asset register', 'Depreciation', 'Maintenance', 'Asset tracking']
    },
    workflow: {
      name: 'Workflow Automation',
      description: 'Automate business processes, approvals, notifications, and task assignments.',
      path: 'Home → Workflow',
      navigation: 'Home → Workflow',
      roles: ['super_admin', 'operations_manager', 'finance_officer'],
      features: ['Approval flows', 'Automated tasks', 'Notifications', 'Business rules']
    }
  },

  // Common workflows
  workflows: {
    quotation_to_payment: {
      name: 'Quotation to Payment',
      steps: [
        'Create Quotation in Sales',
        'Send to client for approval',
        'Client approves quotation',
        'Convert quotation to invoice',
        'Client makes payment',
        'Record payment in system'
      ]
    },
    job_lifecycle: {
      name: 'Job Lifecycle',
      steps: [
        'Create job in Operations',
        'Schedule date and time',
        'Assign cleaning staff',
        'Staff travels to site',
        'Clock in at site (GPS)',
        'Take before photos',
        'Complete cleaning tasks',
        'Take after photos',
        'Quality inspection',
        'Client sign-off',
        'Job marked complete',
        'Invoice generated'
      ]
    },
    incident_management: {
      name: 'Incident Management',
      steps: [
        'Report incident immediately',
        'Supervisor acknowledges',
        'Investigation assigned',
        'Root cause analysis',
        'Corrective actions created',
        'Preventive actions implemented',
        'Approvals obtained',
        'Incident closed',
        'Reports generated'
      ]
    },
    procurement_flow: {
      name: 'Procurement Flow',
      steps: [
        'Create Purchase Request (PR)',
        'Manager approves PR',
        'Issue RFQ to vendors',
        'Evaluate vendor responses',
        'Create Purchase Order (PO)',
        'Send PO to vendor',
        'Receive goods',
        'Update inventory'
      ]
    }
  },

  // South African context
  saContext: {
    leaveTypes: ['Annual Leave (15 days)', 'Sick Leave (30 days per 3-year cycle)', 'Family Responsibility Leave (3 days)', 'Maternity Leave (4 months)', 'Paternity Leave (10 days)'],
    publicHolidays: ['Human Rights Day', 'Freedom Day', 'Workers Day', 'Youth Day', 'Womens Day', 'Heritage Day', 'Reconciliation Day'],
    taxInfo: 'PAYE (Pay As You Earn) and UIF (Unemployment Insurance Fund) contributions are mandatory for all employees.',
    bbbee: 'Broad-Based Black Economic Empowerment compliance is tracked in vendor management.'
  },

  // Search all modules
  search(query) {
    const q = query.toLowerCase()
    const results = []
    
    for (const [key, module] of Object.entries(this.modules)) {
      if (module.name.toLowerCase().includes(q) || module.description.toLowerCase().includes(q)) {
        results.push({ type: 'module', key, ...module })
      }
      if (module.submodules) {
        for (const [subKey, sub] of Object.entries(module.submodules)) {
          if (sub.name.toLowerCase().includes(q) || sub.description.toLowerCase().includes(q)) {
            results.push({ type: 'submodule', parent: key, key: subKey, ...sub })
          }
        }
      }
      if (module.features) {
        module.features.forEach(f => {
          if (f.toLowerCase().includes(q)) results.push({ type: 'feature', module: key, name: f })
        })
      }
    }
    return results
  },

  // Get module by name
  getModule(name) {
    const q = name.toLowerCase()
    for (const [key, module] of Object.entries(this.modules)) {
      if (module.name.toLowerCase().includes(q) || key === q) return { key, ...module }
      if (module.submodules) {
        for (const [subKey, sub] of Object.entries(module.submodules)) {
          if (sub.name.toLowerCase().includes(q) || subKey === q) return { key: subKey, parent: key, ...sub }
        }
      }
    }
    return null
  }
}
