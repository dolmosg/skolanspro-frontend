import { Routes } from '@angular/router';
import { accessGuard } from '../shared/services/access.guard';

export const TENANT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../layout/app-shell/app-shell').then((m) => m.AppShell),
    canActivateChild: [accessGuard],
    children: [
      {
        path: 'administration',
        data: {
          breadcrumb: 'modules.administration',
          title: 'modules.administration',
        },
        loadChildren: () =>
          import('./administration/routes/administration.routes').then(
            (m) => m.ADMINISTRTION_ROUTES,
          ),
      },
      {
        path: 'home',
        data: {
          title: 'modules.home',
        },
        loadChildren: () => import('./home/home.routes').then((m) => m.HOME_ROUTES),
      },
      {
        path: 'security',
        data: {
          breadcrumb: 'modules.security',
          title: 'modules.security',
        },
        loadChildren: () => import('./security/security.routes').then((m) => m.SECURITY_ROUTES),
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
        path: 'utilities',
        data: {
          breadcrumb: 'modules.utilities',
          title: 'modules.utilities',
        },
        loadChildren: () =>
          import('./utilities/routes/utilities.routes').then((m) => m.UTILITIES_ROUTES),
      },
      {
        path: 'academics',
        data: {
          breadcrumb: 'modules.academics',
          title: 'modules.academics',
        },
        loadChildren: () =>
          import('./academics/routes/academics.routes').then((m) => m.ACADEMICS_ROUTES),
      },
      {
        path: 'planning',
        data: {
          breadcrumb: 'modules.planning',
          title: 'modules.planning',
        },
        loadChildren: () =>
          import('./planning/routes/planning.routes').then((m) => m.PLANNING_ROUTES),
      },
    ],
  },
];
