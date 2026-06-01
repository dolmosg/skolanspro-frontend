import { Routes } from '@angular/router';
import { StudyPlansComponent } from '../study-plans/study-plans.component';
import { StudyPlanConfigurationComponent } from '../study-plan-configuration/study-plan-configuration.component';

export const STUDY_PLANS_ROUTES: Routes = [
  {
    path: '',
    data: {
      breadcrumb: 'controllers.study-plans',
      title: 'controllers.study-plans',
      api: {
        route: 'planning/study-plans',
      },
    },
    loadComponent: () =>
      import('../study-plans/study-plans.component').then((m) => StudyPlansComponent),
  },
  {
    path: ':planId',
    data: {
      breadcrumb: 'planning.study-plans.configuration.title',
      title: 'planning.study-plans.configuration.title',
      api: { route: 'planning/study-plans' },
      access: { route: 'planning/study-plans' },
    },
    loadComponent: () =>
      import('../study-plan-configuration/study-plan-configuration.component').then(
        (m) => StudyPlanConfigurationComponent,
      ),
  },
];
