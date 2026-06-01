export const APP_ICONS = {
  dashboard: 'dashboard',
  academic: 'academic',
  admissions: 'admissions',
  finance: 'finance',
  settings: 'settings',

  add: 'add',
  edit: 'edit',
  delete: 'delete',
  search: 'search',
  close: 'close',

  success: 'success',
  warning: 'warning',
  info: 'info',
  default: 'default',
} as const;

export type AppIconKey = keyof typeof APP_ICONS;