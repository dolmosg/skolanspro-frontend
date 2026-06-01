import { Routes } from "@angular/router";

export const FINANCE_CATALOGS_ROUTES : Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        data: {
          breadcrumb: 'controllers.finance-catalogs',
          title: 'controllers.finance-catalogs',
          api: {
            route: 'configuration/finance-catalogs',
          },
        },
        loadComponent: () =>
          import('../../../shared/navigation/controller-navigation/controller-navigation.component').then(
            (m) => m.ControllerNavigationComponent,
          ),
      },
      {
        path: 'tin-types',
        data: {
          breadcrumb: 'controllers.tin-types',
          title: 'controllers.tin-types',
          api: {
            route: 'configuration/tin-types',
          },
        },
        loadComponent: () =>
          import('../finance-catalogs/tin-types/tin-types.component').then(
            (m) => m.TinTypesComponent,
          ),
      },
      {
        path: 'invoice-uses',
        data: {
          breadcrumb: 'controllers.invoice-uses',
          title: 'controllers.invoice-uses',
          api: {
            route: 'configuration/invoice-uses',
          },
        },
        loadComponent: () =>
          import('../finance-catalogs/invoice-uses/invoice-uses.component').then(
            (m) => m.InvoiceUsesComponent,
          ),
      },
      {
        path: 'tax-regimes',
        data: {
          breadcrumb: 'controllers.tax-regimes',
          title: 'controllers.tax-regimes',
          api: {
            route: 'configuration/tax-regimes',
          },
        },
        loadComponent: () =>
          import('../finance-catalogs/tax-regimes/tax-regimes.component').then(
            (m) => m.TaxRegimesComponent,
          ),
      },
    ],
  },  
];