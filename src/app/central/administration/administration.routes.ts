import { Routes } from '@angular/router';

export const ADMINISTRATION_ROUTES: Routes = [
  {
    path: 'tenants',
    data: {
      breadcrumb: 'controllers.tenants',
      title: 'controllers.tenants',
      api: {
        route: 'administration/tenants',
      },
    },
    loadComponent: () => import('./tenants/tenants.component').then((m) => m.TenantsComponent),
  },
];
