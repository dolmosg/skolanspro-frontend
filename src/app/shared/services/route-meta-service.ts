import { Injectable, inject } from '@angular/core';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  PRIMARY_OUTLET,
} from '@angular/router';
import { RouteMeta } from '../interfaces/ui.interfaces';

/**
 * Route metadata service.
 *
 * This service centralizes access to route-level metadata stored in Angular
 * route `data`. It traverses the active primary outlet chain and exposes
 * typed helpers for retrieving the deepest active route snapshot and its
 * metadata.
 *
 * Responsibilities:
 * - Traverse the active primary outlet chain
 * - Resolve the deepest active primary snapshot
 * - Read typed route metadata safely
 * - Expose convenience helpers for title, breadcrumb, and API route
 *
 * Typical consumers:
 * - Breadcrumb component
 * - CRUD/index components that need `data.api.route`
 * - Layout or page-header helpers
 */
@Injectable({
  providedIn: 'root',
})
export class RouteMetaService {
  /**
   * Root Angular route reference used as the default traversal starting point.
   */
  private readonly activatedRoute = inject(ActivatedRoute);

  /**
   * Returns the ordered primary outlet chain starting from the provided route
   * down to its deepest active primary child.
   *
   * Important:
   * - When called with `this.activatedRoute.root`, it returns the full active chain.
   * - When called with an injected component route, it includes that current route first.
   *
   * @param route Route used as the traversal starting point.
   * @returns Ordered list of active primary route snapshots.
   */
  getPrimaryChain(route: ActivatedRoute | null = this.activatedRoute.root): ActivatedRouteSnapshot[] {
    const chain: ActivatedRouteSnapshot[] = [];
    let current: ActivatedRoute | null = route;

    while (current) {
      if (current.snapshot) {
        chain.push(current.snapshot);
      }

      const primaryChild = current.children.find(
        (child) => child.outlet === PRIMARY_OUTLET,
      ) ?? null;

      if (!primaryChild) {
        break;
      }

      current = primaryChild;
    }

    return chain;
  }

  /**
   * Returns the deepest active primary route snapshot starting from the provided route.
   *
   * @param route Route used as the traversal starting point.
   * @returns Deepest active primary snapshot, or null when none exists.
   */
  getDeepestSnapshot(route: ActivatedRoute | null = this.activatedRoute.root): ActivatedRouteSnapshot | null {
    const chain = this.getPrimaryChain(route);
    return chain.length ? chain[chain.length - 1] : null;
  }

  /**
   * Returns typed route metadata from the deepest active snapshot.
   *
   * @param route Route used as the traversal starting point.
   * @returns Typed metadata object for the deepest active route.
   */
  getMeta(route: ActivatedRoute | null = this.activatedRoute.root): RouteMeta {
    const snapshot = this.getDeepestSnapshot(route);
    return (snapshot?.data ?? {}) as RouteMeta;
  }

  /**
   * Returns the page title key from the deepest active route.
   *
   * @param route Route used as the traversal starting point.
   * @returns Title key when defined and non-empty; otherwise null.
   */
  getTitle(route: ActivatedRoute | null = this.activatedRoute.root): string | null {
    const title = this.getMeta(route).title;
    return typeof title === 'string' && title.trim() ? title : null;
  }

  /**
   * Returns the breadcrumb key from the deepest active route.
   *
   * @param route Route used as the traversal starting point.
   * @returns Breadcrumb key when defined and non-empty; otherwise null.
   */
  getBreadcrumb(route: ActivatedRoute | null = this.activatedRoute.root): string | null {
    const breadcrumb = this.getMeta(route).breadcrumb;
    return typeof breadcrumb === 'string' && breadcrumb.trim() ? breadcrumb : null;
  }

  /**
   * Returns the API base route defined in route metadata.
   *
   * @param route Route used as the traversal starting point.
   * @returns API route when defined and non-empty; otherwise null.
   */
  getApiRoute(route: ActivatedRoute | null = this.activatedRoute.root): string | null {
    const apiRoute = this.getMeta(route).api?.route;
    return typeof apiRoute === 'string' && apiRoute.trim() ? apiRoute : null;
  }

  /**
   * Reads typed metadata from a specific route snapshot.
   *
   * @param snapshot Route snapshot whose metadata should be read.
   * @returns Typed metadata object for the provided snapshot.
   */
  getSnapshotMeta(snapshot: ActivatedRouteSnapshot | null | undefined): RouteMeta {
    return (snapshot?.data ?? {}) as RouteMeta;
  }
}
