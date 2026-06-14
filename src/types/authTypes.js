export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  OPERATIONS_MANAGER: 'operations_manager',
  HR_MANAGER: 'hr_manager',
  FINANCE_OFFICER: 'finance_officer',
  SUPERVISOR: 'supervisor',
  CLEANER: 'cleaner',
  SALES_AGENT: 'sales_agent',
  CUSTOMER: 'customer',
}

export const ROLE_HIERARCHY = {
  [USER_ROLES.SUPER_ADMIN]: 8,
  [USER_ROLES.OPERATIONS_MANAGER]: 7,
  [USER_ROLES.HR_MANAGER]: 6,
  [USER_ROLES.FINANCE_OFFICER]: 5,
  [USER_ROLES.SUPERVISOR]: 4,
  [USER_ROLES.SALES_AGENT]: 3,
  [USER_ROLES.CLEANER]: 2,
  [USER_ROLES.CUSTOMER]: 1,
}

export const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: [
    'view_dashboard', 'manage_users', 'manage_roles', 'view_audit_logs',
    'manage_settings', 'view_all_data', 'export_data', 'manage_permissions'
  ],
  [USER_ROLES.OPERATIONS_MANAGER]: [
    'view_dashboard', 'manage_operations', 'view_reports', 'manage_scheduling', 'view_employees'
  ],
  [USER_ROLES.HR_MANAGER]: [
    'view_dashboard', 'manage_employees', 'view_reports', 'manage_leave', 'manage_training'
  ],
  [USER_ROLES.FINANCE_OFFICER]: [
    'view_dashboard', 'manage_finance', 'view_reports', 'manage_payroll', 'manage_invoices'
  ],
  [USER_ROLES.SUPERVISOR]: [
    'view_dashboard', 'view_employees', 'manage_attendance', 'view_reports'
  ],
  [USER_ROLES.CLEANER]: [
    'view_dashboard', 'view_own_profile', 'clock_in_out', 'view_schedule'
  ],
  [USER_ROLES.SALES_AGENT]: [
    'view_dashboard', 'manage_clients', 'view_reports', 'create_quotations'
  ],
  [USER_ROLES.CUSTOMER]: [
    'view_portal', 'view_own_services', 'submit_feedback'
  ],
}

export const ROLE_LABELS = {
  [USER_ROLES.SUPER_ADMIN]: 'Super Admin',
  [USER_ROLES.OPERATIONS_MANAGER]: 'Operations Manager',
  [USER_ROLES.HR_MANAGER]: 'HR Manager',
  [USER_ROLES.FINANCE_OFFICER]: 'Finance Officer',
  [USER_ROLES.SUPERVISOR]: 'Supervisor',
  [USER_ROLES.CLEANER]: 'Cleaner',
  [USER_ROLES.SALES_AGENT]: 'Sales Agent',
  [USER_ROLES.CUSTOMER]: 'Customer',
}
