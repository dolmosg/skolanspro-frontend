import { Routes } from '@angular/router';

export const RUBRICS_ROUTES: Routes = [
  {
    path: '',
    data: {
      breadcrumb: 'controllers.rubrics',
      title: 'controllers.rubrics',
      api: {
        route: 'planning/rubrics',
      },
    },
    loadComponent: () =>
      import('./components/rubrics/rubrics.component').then((m) => m.RubricsComponent),
  },
];
