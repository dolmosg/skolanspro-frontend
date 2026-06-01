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
  {
    path: 'users',
    data: {
      breadcrumb: 'controllers.users',
      title: 'controllers.users',
      api: {
        route: 'security/users',
      },
    },
    loadComponent: () =>
      import('./users/users.component').then((m) => m.UsersComponent),
  },
];
