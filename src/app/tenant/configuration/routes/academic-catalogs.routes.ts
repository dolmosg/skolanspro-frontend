import { Routes } from '@angular/router';

export const ACADEMIC_CATALOGS_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        data: {
          breadcrumb: 'controllers.academic-catalogs',
          title: 'controllers.academic-catalogs',
          api: {
            route: 'configuration/academic-catalogs',
          },
        },
        loadComponent: () =>
          import('../../../shared/navigation/controller-navigation/controller-navigation.component').then(
            (m) => m.ControllerNavigationComponent,
          ),
      },
      {
        path: 'grade-policies',
        data: {
          breadcrumb: 'controllers.grade-policies',
          title: 'controllers.grade-policies',
          collectionKey: 'grade-policies',
          itemKey: 'grade-policies',
          api: {
            route: 'configuration/grade-policies',
          },
        },
        loadComponent: () =>
          import('../../../features/configuration/grade-policies/grade-policies.component').then(
            (m) => m.GradePoliciesComponent,
          ),
      },
      {
        path: 'grade-policies/grade-policy-items/:gradePolicyId',
        data: {
          breadcrumb: 'controllers.grade-policy-items',
          title: 'controllers.grade-policy-items',
          collectionKey: 'grade-policy-items',
          itemKey: 'grade-policy-item',
          access: {
            route: 'configuration/grade-policy-items',
          },
          api: {
            route: 'configuration/grade-policy-items',
          },
        },
        loadComponent: () =>
          import('../../../features/configuration/grade-policy-items/grade-policy-items.component').then(
            (m) => m.GradePolicyItemsComponent,
          ),
      },
      {
        path: 'gradebook-types',
        data: {
          breadcrumb: 'controllers.gradebook-types',
          title: 'controllers.gradebook-types',
          collectionKey: 'gradebook-types',
          itemKey: 'gradebook-type',
          api: {
            route: 'configuration/gradebook-types',
          },
        },
        loadComponent: () =>
          import('../../../features/configuration/gradebook-types/gradebook-types.component').then(
            (m) => m.GradebookTypesComponent,
          ),
      },
    ],
  },
];
