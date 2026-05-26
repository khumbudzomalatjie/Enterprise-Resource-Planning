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

export const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: ['*'],
  [USER_ROLES.OPERATIONS_MANAGER]: ['view_dashboard', 'manage_operations', 'view_reports'],
  [USER_ROLES.HR_MANAGER]: ['view_dashboard', 'manage_employees', 'view_reports'],
  [USER_ROLES.FINANCE_OFFICER]: ['view_dashboard', 'manage_finance', 'view_reports'],
  [USER_ROLES.SUPERVISOR]: ['view_dashboard', 'view_employees', 'manage_attendance'],
  [USER_ROLES.CLEANER]: ['view_dashboard', 'view_own_profile'],
  [USER_ROLES.SALES_AGENT]: ['view_dashboard', 'manage_clients', 'view_reports'],
  [USER_ROLES.CUSTOMER]: ['view_portal'],
}
