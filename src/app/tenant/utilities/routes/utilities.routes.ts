import { Routes } from "@angular/router";

export const UTILITIES_ROUTES: Routes = [
    {
    path: 'data-utilities',
    data: {
      breadcrumb: 'controllers.data-utilities',
      title: 'controllers.data-utilities',
    },
    loadChildren: () => import('./data-utilities.routes').then((m) => m.DATA_UTILITIES_ROUTES),
  },
];