import { Routes } from '@angular/router';

export const CONFIGURATION_ROUTES: Routes = [
  {
    path: 'roles',
    loadComponent: () => import('../../../features/configuration/roles/roles').then((m) => m.Roles),
    data: {
      title: 'controllers.roles',
      breadcrumb: 'controllers.roles',
      api: {
        route: 'configuration/roles',
      },
    },
  },
  {
    path: 'person-attributes',
    data: {
      breadcrumb: 'controllers.person-attributes',
      title: 'controllers.person-attributes',
    },
    loadChildren: () =>
      import('./person-attributes.routes').then((m) => m.PERSON_ATTRIBUTES_ROUTES),
  },
  {
    path: 'general-configuration',
    data: {
      breadcrumb: 'controllers.general-configuration',
      title: 'controllers.general-configuration',
    },
    loadChildren: () =>
      import('../general-configuration/general-configuration.routes').then((m) => m.GENERAL_CONFIGURATION_ROUTES),
  },
  {
    path: 'academic-catalogs',
    data: {
      breadcrumb: 'controllers.academic-catalogs',
      title: 'controllers.academic-catalogs',
    },
    loadChildren: () =>
      import('./academic-catalogs.routes').then((m) => m.ACADEMIC_CATALOGS_ROUTES),
  },
];
