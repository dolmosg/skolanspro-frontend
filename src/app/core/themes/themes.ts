export type ThemeName = 'orange' | 'blue' | 'purple' | 'green' | 'teal';

export type ThemePalette = Record<string, string>;

export const APP_THEMES: Record<ThemeName, ThemePalette> = {
  orange: {
    '--color-primary': '#fd7e14',
    '--color-primary-hover': '#e96b0c',
    '--color-primary-soft': '#ffe5d0',

    '--color-success': '#198754',
    '--color-success-hover': '#157347',
    '--color-success-soft': '#d1e7dd',

    '--color-danger': '#dc3545',
    '--color-danger-hover': '#bb2d3b',
    '--color-danger-soft': '#f8d7da',

    '--color-warning': '#ffc107',
    '--color-warning-hover': '#e0a800',
    '--color-warning-soft': '#fff3cd',

    '--color-info': '#0dcaf0',
    '--color-info-hover': '#31d2f2',
    '--color-info-soft': '#cff4fc',

    '--color-surface': '#ffffff',
    '--color-surface-subtle': '#f8f9fa',
    '--color-surface-muted': '#f1f3f5',

    '--color-border': '#dee2e6',
    '--color-border-strong': '#ced4da',

    '--color-text': '#212529',
    '--color-text-soft': '#495057',
    '--color-text-muted': '#6c757d',
    '--color-text-faint': '#adb5bd',

    '--shadow-primary': '0 8px 18px rgba(253, 126, 20, 0.25)',
    '--shadow-danger': '0 8px 18px rgba(220, 53, 69, 0.18)',

    '--radius-sm': '8px',
    '--radius-md': '12px',
    '--radius-lg': '16px',

    '--sidebar-bg': '#f8f9fa',
    '--sidebar-border': '#dee2e6',
    '--sidebar-text': '#495057',
    '--sidebar-text-strong': '#212529',
    '--sidebar-hover': '#f1f3f5',

    '--sidebar-active-bg': '#fff3e8',
    '--sidebar-active-text': '#fd7e14',
    '--sidebar-active-indicator': '#fd7e14',

    '--sidebar-group-open-bg': '#f8f9fa',
    '--sidebar-group-open-border': '#dee2e6',

    '--sidebar-tree-line': '#f1f3f5',
    '--sidebar-chevron': '#adb5bd',
    '--sidebar-chevron-open': '#6c757d',
  },

  blue: {
    '--color-primary': '#2563eb',
    '--color-primary-hover': '#1d4ed8',
    '--color-primary-soft': '#dbeafe',

    '--color-success': '#16a34a',
    '--color-success-hover': '#15803d',
    '--color-success-soft': '#dcfce7',

    '--color-danger': '#dc2626',
    '--color-danger-hover': '#b91c1c',
    '--color-danger-soft': '#fee2e2',

    '--color-warning': '#d97706',
    '--color-warning-hover': '#b45309',
    '--color-warning-soft': '#fef3c7',

    '--color-info': '#0891b2',
    '--color-info-hover': '#0e7490',
    '--color-info-soft': '#cffafe',

    '--color-surface': '#ffffff',
    '--color-surface-subtle': '#f8fafc',
    '--color-surface-muted': '#f1f5f9',

    '--color-border': '#e2e8f0',
    '--color-border-strong': '#dbe3ee',

    '--color-text': '#0f172a',
    '--color-text-soft': '#334155',
    '--color-text-muted': '#64748b',
    '--color-text-faint': '#94a3b8',

    '--shadow-primary': '0 8px 18px rgba(37, 99, 235, 0.18)',
    '--shadow-danger': '0 8px 18px rgba(220, 38, 38, 0.16)',

    '--radius-sm': '8px',
    '--radius-md': '12px',
    '--radius-lg': '16px',

    '--sidebar-bg': '#f8fafc',
    '--sidebar-border': '#e2e8f0',
    '--sidebar-text': '#334155',
    '--sidebar-text-strong': '#0f172a',
    '--sidebar-hover': '#eef2f7',

    '--sidebar-active-bg': '#e8f0ff',
    '--sidebar-active-text': '#2563eb',
    '--sidebar-active-indicator': '#2563eb',

    '--sidebar-group-open-bg': '#f8fafc',
    '--sidebar-group-open-border': '#e2e8f0',

    '--sidebar-tree-line': '#f1f5f9',
    '--sidebar-chevron': '#cbd5e1',
    '--sidebar-chevron-open': '#64748b',
  },

  purple: {
    '--color-primary': '#6f42c1',
    '--color-primary-hover': '#5a32a3',
    '--color-primary-soft': '#eadcf8',

    '--color-success': '#198754',
    '--color-success-hover': '#157347',
    '--color-success-soft': '#d1e7dd',

    '--color-danger': '#dc3545',
    '--color-danger-hover': '#bb2d3b',
    '--color-danger-soft': '#f8d7da',

    '--color-warning': '#ffc107',
    '--color-warning-hover': '#e0a800',
    '--color-warning-soft': '#fff3cd',

    '--color-info': '#0dcaf0',
    '--color-info-hover': '#31d2f2',
    '--color-info-soft': '#cff4fc',

    '--color-surface': '#ffffff',
    '--color-surface-subtle': '#f8f9fa',
    '--color-surface-muted': '#f1f3f5',

    '--color-border': '#dee2e6',
    '--color-border-strong': '#ced4da',

    '--color-text': '#212529',
    '--color-text-soft': '#495057',
    '--color-text-muted': '#6c757d',
    '--color-text-faint': '#adb5bd',

    '--shadow-primary': '0 8px 18px rgba(111, 66, 193, 0.24)',
    '--shadow-danger': '0 8px 18px rgba(220, 53, 69, 0.18)',

    '--radius-sm': '8px',
    '--radius-md': '12px',
    '--radius-lg': '16px',

    '--sidebar-bg': '#f8f9fa',
    '--sidebar-border': '#dee2e6',
    '--sidebar-text': '#495057',
    '--sidebar-text-strong': '#212529',
    '--sidebar-hover': '#f1f3f5',

    '--sidebar-active-bg': '#f3eafd',
    '--sidebar-active-text': '#6f42c1',
    '--sidebar-active-indicator': '#6f42c1',

    '--sidebar-group-open-bg': '#f8f9fa',
    '--sidebar-group-open-border': '#dee2e6',

    '--sidebar-tree-line': '#f1f3f5',
    '--sidebar-chevron': '#adb5bd',
    '--sidebar-chevron-open': '#6c757d',
  },

  green: {
    '--color-primary': '#16a34a',
    '--color-primary-hover': '#15803d',
    '--color-primary-soft': '#dcfce7',

    '--color-success': '#16a34a',
    '--color-success-hover': '#15803d',
    '--color-success-soft': '#dcfce7',

    '--color-danger': '#dc2626',
    '--color-danger-hover': '#b91c1c',
    '--color-danger-soft': '#fee2e2',

    '--color-warning': '#d97706',
    '--color-warning-hover': '#b45309',
    '--color-warning-soft': '#fef3c7',

    '--color-info': '#0891b2',
    '--color-info-hover': '#0e7490',
    '--color-info-soft': '#cffafe',

    '--color-surface': '#ffffff',
    '--color-surface-subtle': '#f8fafc',
    '--color-surface-muted': '#f1f5f9',

    '--color-border': '#e2e8f0',
    '--color-border-strong': '#dbe3ee',

    '--color-text': '#0f172a',
    '--color-text-soft': '#334155',
    '--color-text-muted': '#64748b',
    '--color-text-faint': '#94a3b8',

    '--shadow-primary': '0 8px 18px rgba(22, 163, 74, 0.2)',
    '--shadow-danger': '0 8px 18px rgba(220, 38, 38, 0.16)',

    '--radius-sm': '8px',
    '--radius-md': '12px',
    '--radius-lg': '16px',

    '--sidebar-bg': '#f8fafc',
    '--sidebar-border': '#e2e8f0',
    '--sidebar-text': '#334155',
    '--sidebar-text-strong': '#0f172a',
    '--sidebar-hover': '#eef2f7',

    '--sidebar-active-bg': '#e7f7ec',
    '--sidebar-active-text': '#16a34a',
    '--sidebar-active-indicator': '#16a34a',

    '--sidebar-group-open-bg': '#f8fafc',
    '--sidebar-group-open-border': '#e2e8f0',

    '--sidebar-tree-line': '#f1f5f9',
    '--sidebar-chevron': '#cbd5e1',
    '--sidebar-chevron-open': '#64748b',
  },

  teal: {
    '--color-primary': '#0d9488',
    '--color-primary-hover': '#0f766e',
    '--color-primary-soft': '#ccfbf1',

    '--color-success': '#16a34a',
    '--color-success-hover': '#15803d',
    '--color-success-soft': '#dcfce7',

    '--color-danger': '#dc2626',
    '--color-danger-hover': '#b91c1c',
    '--color-danger-soft': '#fee2e2',

    '--color-warning': '#d97706',
    '--color-warning-hover': '#b45309',
    '--color-warning-soft': '#fef3c7',

    '--color-info': '#0891b2',
    '--color-info-hover': '#0e7490',
    '--color-info-soft': '#cffafe',

    '--color-surface': '#ffffff',
    '--color-surface-subtle': '#f8fafc',
    '--color-surface-muted': '#f1f5f9',

    '--color-border': '#e2e8f0',
    '--color-border-strong': '#dbe3ee',

    '--color-text': '#0f172a',
    '--color-text-soft': '#334155',
    '--color-text-muted': '#64748b',
    '--color-text-faint': '#94a3b8',

    '--shadow-primary': '0 8px 18px rgba(13, 148, 136, 0.2)',
    '--shadow-danger': '0 8px 18px rgba(220, 38, 38, 0.16)',

    '--radius-sm': '8px',
    '--radius-md': '12px',
    '--radius-lg': '16px',

    '--sidebar-bg': '#f8fafc',
    '--sidebar-border': '#e2e8f0',
    '--sidebar-text': '#334155',
    '--sidebar-text-strong': '#0f172a',
    '--sidebar-hover': '#eef2f7',

    '--sidebar-active-bg': '#e6fffb',
    '--sidebar-active-text': '#0d9488',
    '--sidebar-active-indicator': '#0d9488',

    '--sidebar-group-open-bg': '#f8fafc',
    '--sidebar-group-open-border': '#e2e8f0',

    '--sidebar-tree-line': '#f1f5f9',
    '--sidebar-chevron': '#cbd5e1',
    '--sidebar-chevron-open': '#64748b',
  },
};
