import { Routes } from '@angular/router';

export const CONFIGURATION_ROUTES: Routes = [
  {
    path: 'roles',
    data: {
      breadcrumb: 'controllers.roles',
      title: 'controllers.roles',
      api: {
        route: 'configuration/roles',
      },
    },
    loadComponent: () => import('../../../features/configuration/roles/roles').then((m) => m.Roles),
  },
  {
    path: 'modules',
    data: {
      breadcrumb: 'controllers.modules',
      title: 'controllers.modules',
      api: {
        route: 'configuration/modules',
      },
    },
    loadComponent: () => import('../modules/modules').then((m) => m.Modules),
  },
  {
    path: 'modules/:moduleId/controllers',
    data: {
      breadcrumb: 'controllers.controllers',
      title: 'controllers.controllers',
      api: {
        route: 'configuration/controllers',
      },
    },
    loadComponent: () => import('../controllers/controllers').then((m) => m.Controllers),
  },
  {
    path: 'modules/:moduleId/controllers/:controllerId/actions',
    data: {
      breadcrumb: 'controllers.actions',
      title: 'controllers.actions',
      api: {
        route: 'configuration/actions',
      },
    },
    loadComponent: () => import('../actions/actions').then((m) => m.Actions),
  },
  {
    path: 'people-catalogs',
    data: {
      breadcrumb: 'controllers.people-catalogs',
      title: 'controllers.people-catalogs',
    },
    loadChildren: () => import('./people-catalogs.routes').then((m) => m.PEOPLE_CATALOGS_ROUTES),
  },
  {
    path: 'localization-catalogs',
    data: {
      breadcrumb: 'controllers.localization-catalogs',
      title: 'controllers.localization-catalogs',
    },
    loadChildren: () =>
      import('./localization-catalogs.routes').then((m) => m.LOCALIZATION_CATALOGS_ROUTES),
  },
  {
    path: 'system-catalogs',
    data: {
      breadcrumb: 'controllers.system-catalogs',
      title: 'controllers.system-catalogs',
    },
    loadChildren: () => import('./system-catalogs.routes').then((m) => m.SYSTEM_CATALOGS_ROUTES),
  },
  {
    path: 'finance-catalogs',
    data: {
      breadcrumb: 'controllers.finance-catalogs',
      title: 'controllers.finance-catalogs',
    },
    loadChildren: () => import('./finance-catalogs.routes').then((m) => m.FINANCE_CATALOGS_ROUTES),
  },
  {
    path: 'community-catalogs',
    data: {
      breadcrumb: 'controllers.community-catalogs',
      title: 'controllers.community-catalogs',
    },
    loadChildren: () => import('./community-catalogs.routes').then((m) => m.COMMUNITY_CATALOGS_ROUTES),
  },
  {
    path: 'academic-catalogs',
    data: {
      breadcrumb: 'controllers.academic-catalogs',
      title: 'controllers.academic-catalogs',
    },
    loadChildren: () => import('./academic-catalogs.routes').then((m) => m.ACADEMIC_CATALOGS_ROUTES),
  },
];
