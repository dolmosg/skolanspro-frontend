import { Routes } from '@angular/router';

export const HOME_ROUTES: Routes = [
  {
    path: 'root-dashboard',
    data: {
      breadcrumb: 'controllers.root-dashboard',
      title: 'controllers.root-dashboard',
      api: {
        route: 'home/root-dashboard',
      },
    },
    loadComponent: () =>
      import('./root-dashboard/root-dashboard.component').then((m) => m.RootDashboardComponent),
  },
  {
        path: 'profile',
        data: {
          breadcrumb: 'layout.topbar.profile',
          title: 'layout.topbar.profile',
          api: {
            route:'home/profile'
          }
        },
        loadComponent: () => import('./profile/profile.component').then((m) => m.ProfileComponent),
      },
];
