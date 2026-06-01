import { Routes } from "@angular/router";

export const SYSTEM_CATALOGS_ROUTES : Routes = [
    {
    path: '',
    children: [
      {
        path: '',
        data: {
          breadcrumb: 'controllers.system-catalogs',
          title: 'controllers.system-catalogs',
          api: {
            route: 'configuration/system-catalogs',
          },
        },
        loadComponent: () =>
          import('../../../shared/navigation/controller-navigation/controller-navigation.component').then(
            (m) => m.ControllerNavigationComponent,
          ),
      },
      {
        path: 'organization-themes',
        data: {
          breadcrumb: 'controllers.organization-themes',
          title: 'controllers.organization-themes',
          api: {
            route: 'configuration/organization-themes',
          },
        },
        loadComponent: () =>
          import('../system-catalogs/organization-themes/organization-themes.component').then(
            (m) => m.OrganizationThemesComponent,
          ),
      },
      {
        path: 'support-types',
        data: {
          breadcrumb: 'controllers.support-types',
          title: 'controllers.support-types',
          api: {
            route: 'configuration/support-types',
          },
        },
        loadComponent: () =>
          import('../system-catalogs/support-types/support-types.component').then(
            (m) => m.SupportTypesComponent,
          ),
      },
      {
        path: 'password-types',
        data: {
          breadcrumb: 'controllers.password-types',
          title: 'controllers.password-types',
          api: {
            route: 'configuration/password-types',
          },
        },
        loadComponent: () =>
          import('../system-catalogs/password-types/password-types.component').then(
            (m) => m.PasswordTypesComponent,
          ),
      },
    ],
  },
];