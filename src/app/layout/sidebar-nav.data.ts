import { SidebarNavItem } from './sidebar-nav-item.model';

export const SIDEBAR_NAV: SidebarNavItem[] = [
  {
    id: 'dashboard',
    labelKey: 'sidebar.dashboard',
    route: '/dashboard',
    icon: 'dashboard',
  },
  {
    id: 'academic',
    labelKey: 'sidebar.academic',
    icon: 'academic',
    children: [
      {
        id: 'attendance',
        labelKey: 'sidebar.attendance',
        icon: 'attendance',
        children: [
          {
            id: 'attendance-dashboard',
            labelKey: 'common.dashboard',
            route: '/academic/attendance/dashboard',
            icon: 'dashboard',
          },
          {
            id: 'attendance-capture',
            labelKey: 'common.capture',
            route: '/academic/attendance/capture',
            icon: 'capture',
          },
          {
            id: 'attendance-reports',
            labelKey: 'common.reports',
            route: '/academic/attendance/reports',
            icon: 'reports',
          },
        ],
      },
      {
        id: 'grades',
        labelKey: 'sidebar.grades',
        icon: 'grades',
        children: [
          {
            id: 'grades-dashboard',
            labelKey: 'common.dashboard',
            route: '/academic/grades/dashboard',
            icon: 'dashboard',
          },
          {
            id: 'grades-capture',
            labelKey: 'common.capture',
            route: '/academic/grades/capture',
            icon: 'capture',
          },
          {
            id: 'grades-report-cards',
            labelKey: 'sidebar.report_cards',
            route: '/academic/grades/report-cards',
            icon: 'report-cards',
          },
        ],
      },
    ],
  },
  {
    id: 'admissions',
    labelKey: 'sidebar.admissions',
    icon: 'admissions',
    children: [
      {
        id: 'applicants',
        labelKey: 'sidebar.applicants',
        route: '/admissions/applicants',
        icon: 'applicants',
      },
      {
        id: 'processes',
        labelKey: 'sidebar.processes',
        route: '/admissions/processes',
        icon: 'processes',
      },
      {
        id: 'mails',
        labelKey: 'sidebar.mails',
        route: '/admissions/mails',
        icon: 'mails',
      },
    ],
  },
  {
    id: 'finance',
    labelKey: 'sidebar.finance',
    icon: 'finance',
    children: [
      {
        id: 'statements',
        labelKey: 'sidebar.statements',
        route: '/finance/statements',
        icon: 'statements',
      },
      {
        id: 'banks',
        labelKey: 'sidebar.banks',
        route: '/finance/banks',
        icon: 'banks',
      },
      {
        id: 'parameters',
        labelKey: 'sidebar.parameters',
        route: '/finance/parameters',
        icon: 'parameters',
      },
    ],
  },
  {
    id: 'settings',
    labelKey: 'sidebar.settings',
    icon: 'settings',
    children: [
      {
        id: 'users',
        labelKey: 'sidebar.users',
        route: '/settings/users',
        icon: 'users-manage',
      },
      {
        id: 'roles',
        labelKey: 'sidebar.roles',
        route: '/settings/roles',
        icon: 'roles',
      },
      {
        id: 'permissions',
        labelKey: 'sidebar.permissions',
        route: '/settings/permissions',
        icon: 'permissions',
      },
    ],
  },
];