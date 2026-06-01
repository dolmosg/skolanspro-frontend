import { Routes } from '@angular/router';
import { authGuard } from './shared/services/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'logout',
        loadComponent: () => import('./features/auth/logout/logout').then((m) => m.Logout),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
      },
    ],
  },
  {
    path: 'central',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadChildren: () => import('./central/central.routes').then((m) => m.CENTRAL_ROUTES),
  },
  {
    path: 'tenant',
    // canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadChildren: () => import('./tenant/tenant.routes').then((m) => m.TENANT_ROUTES),
  },
  {
    path: '**',
    redirectTo: '/auth/login',
  },
];
