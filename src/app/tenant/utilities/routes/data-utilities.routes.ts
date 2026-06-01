import { Routes } from '@angular/router';

export const DATA_UTILITIES_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        data: {
          breadcrumb: 'controllers.data-utilities',
          title: 'controllers.data-utilities',
          api: {
            route: 'utilities/data-utilities',
          },
        },
        loadComponent: () =>
          import('../utility-launcher/utility-launcher.component').then(
            (m) => m.UtilityLauncherComponent,
          ),
      },
    ],
  },
];
