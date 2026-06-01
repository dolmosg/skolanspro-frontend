import { Routes } from '@angular/router';

export const PERSON_ATTRIBUTES_ROUTES: Routes = [
  {
    path: '',
    data: {
      breadcrumb: 'controllers.person-attributes',
      title: 'controllers.person-attributes',
      api: {
        route: 'configuration/person-attributes',
      },
    },
    loadComponent: () =>
      import('../../../shared/navigation/controller-navigation/controller-navigation.component').then(
        (m) => m.ControllerNavigationComponent,
      ),
  },
  {
    path: 'staff-fields',
    loadComponent: () =>
      import('../person-fields/person-fields.component').then((m) => m.PersonFieldsComponent),
    data: {
      context: 'staff',
      title: 'configuration.person-fields.context.staff',
      breadcrumb: 'controllers.staff-fields',
      access: {
        route: 'configuration/staff-fields',
      },
      api: {
        route: 'configuration/person-fields/staff',
      },
    },
  },
  {
    path: 'student-fields',
    loadComponent: () =>
      import('../person-fields/person-fields.component').then((m) => m.PersonFieldsComponent),
    data: {
      context: 'student',
      title: 'configuration.person-fields.context.student',
      breadcrumb: 'controllers.student-fields',
      access: {
        route: 'configuration/student-fields',
      },
      api: {
        route: 'configuration/person-fields/student',
      },
    },
  },
  {
    path: 'parent-fields',
    loadComponent: () =>
      import('../person-fields/person-fields.component').then((m) => m.PersonFieldsComponent),
    data: {
      context: 'parent',
      title: 'configuration.person-fields.context.parent',
      breadcrumb: 'controllers.parent-fields',
      access: {
        route: 'configuration/parent-fields',
      },
      api: {
        route: 'configuration/person-fields/parent',
      },
    },
  },
];
