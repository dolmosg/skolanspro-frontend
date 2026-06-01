import { Routes } from '@angular/router';

export const FAMILIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../families/families.component').then((m) => m.FamiliesComponent),
  },
  {
    path: ':familyId',
    data: {
      breadcrumb: 'controllers.family-profile',
    },
    loadComponent: () =>
      import('../family-profile/family-profile.component').then(
        (m) => m.FamilyProfileComponent,
      ),
  },
];