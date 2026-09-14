import { Routes } from '@angular/router';

export const PLANNING_ROUTES: Routes = [
  {
    path: 'gradebook-components',
    data: {
      breadcrumb: 'controllers.gradebook-components',
      title: 'controllers.gradebook-components',
      api: {
        route: 'planning/gradebook-components',
      },
    },
    loadComponent: () =>
      import('../components/gradebook-components/gradebook-components.component').then(
        (m) => m.GradebookComponentsComponent,
      ),
  },
  {
    path: 'study-plans',
    data: {
      breadcrumb: 'controllers.study-plans',
      title: 'controllers.study-plans',
    },
    loadChildren: () =>
      import('../study-plans/routes/study-plans.routes').then((m) => m.STUDY_PLANS_ROUTES),
  },
];
