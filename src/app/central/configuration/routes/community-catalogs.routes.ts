import { Routes } from '@angular/router';

export const COMMUNITY_CATALOGS_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        data: {
          breadcrumb: 'controllers.community-catalogs',
          title: 'controllers.community-catalogs',
          api: {
            route: 'configuration/community-catalogs',
          },
        },
        loadComponent: () =>
          import('../../../shared/navigation/controller-navigation/controller-navigation.component').then(
            (m) => m.ControllerNavigationComponent,
          ),
      },
      {
        path: 'family-statuses',
        data: {
          breadcrumb: 'controllers.family-statuses',
          title: 'controllers.family-statuses',
          collectionKey: 'family-statuses',
          itemKey: 'family_status',
          api: {
            route: 'configuration/family-statuses',
          },
        },
        loadComponent: () =>
          import('../community-catalogs/community-catalog/community-catalog.component').then(
            (m) => m.CommunityCatalogComponent,
          ),
      },
      {
        path: 'student-statuses',
        data: {
          breadcrumb: 'controllers.student-statuses',
          title: 'controllers.student-statuses',
          collectionKey: 'student-statuses',
          itemKey: 'student_status',
          api: {
            route: 'configuration/student-statuses',
          },
        },
        loadComponent: () =>
          import('../community-catalogs/community-catalog/community-catalog.component').then(
            (m) => m.CommunityCatalogComponent,
          ),
      },
      {
        path: 'student-year-statuses',
        data: {
          breadcrumb: 'controllers.student-year-statuses',
          title: 'controllers.student-statuses',
          collectionKey: 'student-year-statuses',
          itemKey: 'student_year_status',
          api: {
            route: 'configuration/student-year-statuses',
          },
        },
        loadComponent: () =>
          import('../community-catalogs/community-catalog/community-catalog.component').then(
            (m) => m.CommunityCatalogComponent,
          ),
      },
      {
        path: 'tutor-statuses',
        data: {
          breadcrumb: 'controllers.tutor-statuses',
          title: 'controllers.tutor-statuses',
          collectionKey: 'tutor-statuses',
          itemKey: 'tutor_status',
          api: {
            route: 'configuration/tutor-statuses',
          },
        },
        loadComponent: () =>
          import('../community-catalogs/community-catalog/community-catalog.component').then(
            (m) => m.CommunityCatalogComponent,
          ),
      },
    ],
  },
];
