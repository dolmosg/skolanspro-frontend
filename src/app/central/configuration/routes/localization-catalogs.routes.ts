import { Routes } from '@angular/router';

export const LOCALIZATION_CATALOGS_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        data: {
          breadcrumb: 'controllers.localization-catalogs',
          title: 'controllers.localization-catalogs',
          api: {
            route: 'configuration/localization-catalogs',
          },
        },
        loadComponent: () =>
          import('../../../shared/navigation/controller-navigation/controller-navigation.component').then(
            (m) => m.ControllerNavigationComponent,
          ),
      },
      {
        path: 'languages',
        data: {
          breadcrumb: 'controllers.languages',
          title: 'controllers.languages',
          api: {
            route: 'configuration/languages',
          },
        },
        loadComponent: () =>
          import('../localization-catalogs/languages/languages.component').then(
            (m) => m.LanguagesComponent,
          ),
      },
      {
        path: 'countries',
        data: {
          breadcrumb: 'controllers.countries',
          title: 'controllers.countries',
          api: {
            route: 'configuration/countries',
          },
        },
        loadComponent: () =>
          import('../localization-catalogs/countries/countries.component').then(
            (m) => m.CountriesComponent,
          ),
      },
      {
        path: 'postal-codes',
        data: {
          breadcrumb: 'controllers.postal-codes',
          title: 'controllers.postal-codes',
          api: {
            route: 'configuration/postal-codes',
          },
        },
        loadComponent: () =>
          import('../localization-catalogs/postal-codes/postal-codes.component').then(
            (m) => m.PostalCodesComponent,
          ),
      },
    ],
  },
];
