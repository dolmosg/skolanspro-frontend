import { Routes } from "@angular/router";

export const PEOPLE_CATALOGS_ROUTES : Routes = [
    {
    path: '',
    children: [
      {
        path: '',
        data: {
          breadcrumb: 'controllers.people-catalogs',
          title: 'controllers.people-catalogs',
          api: {
            route: 'configuration/people-catalogs',
          },
        },
        loadComponent: () =>
          import('../../../shared/navigation/controller-navigation/controller-navigation.component').then(
            (m) => m.ControllerNavigationComponent,
          ),
      },
      {
        path: 'genders',
        data: {
          breadcrumb: 'controllers.genders',
          title: 'controllers.genders',
          api: {
            route: 'configuration/genders',
          },
        },
        loadComponent: () =>
          import('../people-catalogs/genders/genders.component').then((m) => m.GendersComponent),
      },
      {
        path: 'marital-statuses',
        data: {
          breadcrumb: 'controllers.marital-statuses',
          title: 'controllers.marital-statuses',
          api: {
            route: 'configuration/marital-statuses',
          },
        },
        loadComponent: () =>
          import('../people-catalogs/marital-statuses/marital-statuses.component').then(
            (m) => m.MaritalStatusesComponent,
          ),
      },
      {
        path: 'blood-types',
        data: {
          breadcrumb: 'controllers.blood-types',
          title: 'controllers.blood-types',
          api: {
            route: 'configuration/blood-types',
          },
        },
        loadComponent: () =>
          import('../people-catalogs/blood-types/blood-types.component').then(
            (m) => m.BloodTypesComponent,
          ),
      },
      {
        path: 'name-casings',
        data: {
          breadcrumb: 'controllers.name-casings',
          title: 'controllers.name-casings',
          api: {
            route: 'configuration/name-casings',
          },
        },
        loadComponent: () =>
          import('../people-catalogs/name-casings/name-casings.component').then(
            (m) => m.NameCasingsComponent,
          ),
      },
      {
        path: 'mail-types',
        data: {
          breadcrumb: 'controllers.mail-types',
          title: 'controllers.mail-types',
          api: {
            route: 'configuration/mail-types',
          },
        },
        loadComponent: () =>
          import('../people-catalogs/mail-types/mail-types.component').then(
            (m) => m.MailTypesComponent,
          ),
      },
      {
        path: 'phone-types',
        data: {
          breadcrumb: 'controllers.phone-types',
          title: 'controllers.phone-types',
          api: {
            route: 'configuration/phone-types',
          },
        },
        loadComponent: () =>
          import('../people-catalogs/phone-types/phone-types.component').then(
            (m) => m.PhoneTypesComponent,
          ),
      },
      {
        path: 'address-types',
        data: {
          breadcrumb: 'controllers.address-types',
          title: 'controllers.address-types',
          api: {
            route: 'configuration/address-types',
          },
        },
        loadComponent: () =>
          import('../people-catalogs/address-types/address-types.component').then(
            (m) => m.AddressTypesComponent,
          ),
      },
    ],
  },
];