import { Routes } from '@angular/router';
import { accessGuard } from '../shared/services/access.guard';

export const CENTRAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../layout/app-shell/app-shell').then((m) => m.AppShell),
    canActivateChild: [accessGuard],
    children: [
      {
        path: 'root-dashboard',
        data: {
          breadcrumb: 'controllers.root-dashboard',
          title: 'controllers.root-dashboard',
        },
        loadComponent: () =>
          import('./dashboards/root-dashboard/root-dashboard').then((m) => m.RootDashboard),
      },
      {
        path: 'administration',
        data: {
          breadcrumb: 'modules.administration',
          title: 'modules.administration',
        },
        loadChildren: () =>
          import('./administration/administration.routes').then((m) => m.ADMINISTRATION_ROUTES),
      },
      {
        path: 'configuration',
        data: {
          breadcrumb: 'modules.configuration',
          title: 'modules.configuration',
        },
        loadChildren: () =>
          import('./configuration/routes/configuration.routes').then((m) => m.CONFIGURATION_ROUTES),
      },
      {
        path: 'security',
        data: {
          breadcrumb: 'modules.security',
          title: 'modules.security',
        },
        loadChildren: () => import('./security/security.routes').then((m) => m.SECURITY_ROUTES),
      },
    ],
  },
];
