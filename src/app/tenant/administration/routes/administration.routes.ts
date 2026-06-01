import { Routes } from '@angular/router';

export const ADMINISTRTION_ROUTES: Routes = [
  {
    path: 'staff-users',
    data: {
      breadcrumb: 'controllers.staff-users',
      title: 'controllers.staff-users',
      api: {
        route: 'administration/staff-users',
      },
    },
    children: [
      {
        path: '',
        loadComponent: () =>
          import('../staff-users/staff-users.component').then((m) => m.StaffUsersComponent),
      },
      {
        path: ':personId',
        data: {
          breadcrumb: 'controllers.staff-detail',
        },

        loadComponent: () =>
          import('../staff-profile/staff-profile.component').then((m) => m.StaffProfileComponent),
      },
    ],
  },
  {
    path: 'families',
    data: {
      breadcrumb: 'controllers.families',
      title: 'controllers.families',
      api: {
        route: 'administration/families',
      },
    },
    loadChildren: () => import('../families/routes/families.routes').then((m) => m.FAMILIES_ROUTES),
  },
  {
    path: 'school-years',
    data: {
      breadcrumb: 'controllers.school-years',
      title: 'controllers.school-years',
      api: {
        route: 'administration/school-years',
      },
    },
    loadComponent: () =>
      import('../school-years/school-years.component').then((m) => m.SchoolYearsComponent),
  },
];
