import { Routes } from '@angular/router';

export const PLANNING_ROUTES: Routes = [
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
