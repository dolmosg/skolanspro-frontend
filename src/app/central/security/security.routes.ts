import { Routes } from '@angular/router';

export const SECURITY_ROUTES: Routes = [
  {
    path: 'permissions',
    data: {
      breadcrumb: 'controllers.permissions',
      title: 'controllers.permissions',
      api: {
        route: 'security/permissions',
      },
    },
    loadComponent: () =>
      import('../../features/security/permissions/permissions').then((m) => m.Permissions),
  },
];
