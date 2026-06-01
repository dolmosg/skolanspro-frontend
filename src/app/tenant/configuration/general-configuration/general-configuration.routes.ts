import { Routes } from '@angular/router';

export const GENERAL_CONFIGURATION_ROUTES: Routes = [
  {
    path: '',
    data: {
      breadcrumb: 'controllers.general-configuration',
      title: 'controllers.general-configuration',
      api: {
        route: 'configuration/general-configuration',
      },
    },
    loadComponent: () =>
      import('../../../shared/navigation/controller-navigation/controller-navigation.component').then(
        (m) => m.ControllerNavigationComponent,
      ),
  },
  {
    path: 'levels',
    loadComponent: () =>
      import('../general-configuration/levels/levels.component').then((m) => m.LevelsComponent),
    data: {
      title: 'controllers.levels',
      breadcrumb: 'controllers.levels',
      api: {
        route: 'configuration/levels',
      },
    },
  },
  {
    path: 'levels/:levelId/grades',
    loadComponent: () =>
      import('../general-configuration/grades/grades.component').then((m) => m.GradesComponent),
    data: {
      title: 'controllers.grades',
      breadcrumb: 'controllers.grades',
      api: {
        route: 'configuration/grades',
      },
    },
  },
  {
    path: 'grade-progressions',
    loadComponent: () =>
      import('../general-configuration/grade-progressions/grade-progressions.component').then((m) => m.GradeProgressionsComponent),
    data: {
      title: 'controllers.grade-progressions',
      breadcrumb: 'controllers.grade-progressions',
      api: {
        route: 'configuration/grades',
      },
    },
  },
  {
    path:'organization-logos',
    loadComponent: () => 
      import('./organization-logos/organization-logos.component').then((m)=>m.OrganizationLogosComponent),
    data: {
      title: 'controllers.organization-logos',
      breadcrumb: 'controllers.organization-logos',
      api: {
        route: 'configuration/organization-logos',
      },
    },
  },
  {
    path:'sections',
    loadComponent: () => 
      import('./sections/sections.component').then((m)=>m.SectionsComponent),
    data: {
      title: 'controllers.sections',
      breadcrumb: 'controllers.sections',
      api: {
        route: 'configuration/sections',
      },
    },
  },
  {
    path:'campuses',
    loadComponent: () => 
      import('./campuses/campuses.component').then((m)=>m.CampusesComponent),
    data: {
      title: 'controllers.campuses',
      breadcrumb: 'controllers.campuses',
      api: {
        route: 'configuration/campuses',
      },
    },
  },
];
