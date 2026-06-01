/**
 * Generic breadcrumb item used by layout navigation components.
 */
export interface BreadcrumbItem {
  label: string;
  route?: string;
}

/**
 * API metadata associated with a route.
 */
export interface RouteApiMeta {
  route: string;
}

/**
 * Route metadata contract used across the application.
 *
 * This metadata is defined in Angular route `data` and consumed by
 * layout/navigation helpers such as Breadcrumb and RouteMetaService.
 */
export interface RouteMeta {
  title?: string;
  breadcrumb?: string;
  api?: RouteApiMeta;
}