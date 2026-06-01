import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  RouterLink,
  UrlSegment,
} from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs/operators';
import { BreadcrumbItem } from '../../shared/interfaces/ui.interfaces';
import { AuthStateSevice } from '../../shared/services/auth-state-sevice';
import { RouteMetaService } from '../../shared/services/route-meta-service';

interface BreadcrumbState {
  title: string | null;
  items: BreadcrumbItem[];
}

/**
 * Breadcrumb Component
 * --------------------
 * Automatic page header + breadcrumb renderer based on the active Angular route tree.
 *
 * Responsibilities:
 * - Traverse the active route hierarchy
 * - Read `data.title` and `data.breadcrumb` from route metadata through RouteMetaService
 * - Build ordered breadcrumb items with translated labels
 * - Resolve a default “home” breadcrumb from the authenticated user's role path
 * - Expose the current page title from the deepest matching route
 *
 * Expected route metadata shape:
 * ```ts
 * data: {
 *   title: 'modules.configuration',
 *   breadcrumb: 'modules.configuration'
 * }
 * ```
 *
 * Notes:
 * - `title` is taken from the deepest active route that defines it.
 * - `breadcrumb` is collected from every active route level.
 * - The initial home breadcrumb is resolved automatically from route/session metadata.
 */
@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss',
})
export class Breadcrumb {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly routeMeta = inject(RouteMetaService);
  private readonly authState = inject(AuthStateSevice);

  /**
   * Internal navigation metadata state rebuilt on every navigation end.
   */
  private readonly state = signal<BreadcrumbState>({
    title: null,
    items: [],
  });

  /**
   * Current page title resolved from the deepest active route with `data.title`.
   */
  protected readonly title = computed(() => this.state().title);

  /**
   * Public breadcrumb items consumed by the template.
   */
  protected readonly items = computed(() => this.state().items);

  constructor() {
    this.rebuildNavigationState();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.rebuildNavigationState());
  }

  /**
   * Traverses the current activated route tree and rebuilds page title + breadcrumb items.
   */
  private rebuildNavigationState(): void {
    const chain = this.routeMeta.getPrimaryChain(this.activatedRoute.root);
    const homeRoute = this.buildHomeRoute();
    const items: BreadcrumbItem[] = [
      {
        label: 'controllers.home',
        route: homeRoute,
      },
    ];

    let title: string | null = null;
    let fullPath = '';

    for (const snapshot of chain) {
      const routeUrl = this.buildRouteUrl(snapshot);
      const previousPath = fullPath;

      if (routeUrl) {
        fullPath += `/${routeUrl}`;
      }

      const meta = this.routeMeta.getSnapshotMeta(snapshot);

      if (typeof meta.title === 'string' && meta.title.trim()) {
        title = meta.title;
      }

      this.appendIntermediateSegmentCrumbs(items, previousPath, routeUrl, meta.breadcrumb);

      const currentRoute = fullPath || undefined;
      const isHomeRoute = currentRoute === homeRoute;

      if (
        typeof meta.breadcrumb === 'string' &&
        meta.breadcrumb.trim() &&
        !isHomeRoute &&
        !this.hasBreadcrumbRoute(items, currentRoute)
      ) {
        items.push({
          label: meta.breadcrumb,
          route: currentRoute,
        });
      }
    }

    this.state.set({
      title,
      items,
    });
  }

  /**
   * Adds breadcrumb items for intermediate static URL segments when a route snapshot
   * represents more than one URL segment (for example `modules/:id/controllers`).
   *
   * This protects the breadcrumb trail from skipping parent catalog levels such as
   * "Módulos" when drill-down routes are declared as a single nested path.
   */
  private appendIntermediateSegmentCrumbs(
    items: BreadcrumbItem[],
    basePath: string,
    routeUrl: string,
    finalBreadcrumb: string | undefined,
  ): void {
    if (!routeUrl) {
      return;
    }

    const segments = routeUrl.split('/').filter(Boolean);

    if (segments.length <= 1) {
      return;
    }

    let accumulatedPath = basePath;

    segments.forEach((segment, index) => {
      accumulatedPath += `/${segment}`;

      const isLastSegment = index === segments.length - 1;
      const isDynamicValue = /^\d+$/.test(segment);

      if (isLastSegment || isDynamicValue) {
        return;
      }

      const route = accumulatedPath;
      const label = `controllers.${segment}`;

      if (label === finalBreadcrumb || this.hasBreadcrumbRoute(items, route)) {
        return;
      }

      items.push({
        label,
        route,
      });
    });
  }

  /**
   * Prevents duplicated breadcrumb entries for the same route.
   */
  private hasBreadcrumbRoute(items: BreadcrumbItem[], route: string | undefined): boolean {
    if (!route) {
      return false;
    }

    return items.some((item) => item.route === route);
  }

  /**
   * Builds the relative URL for a route snapshot from its URL segments.
   */
  private buildRouteUrl(snapshot: ActivatedRouteSnapshot | null | undefined): string {
    if (!snapshot?.url?.length) {
      return '';
    }

    return snapshot.url
      .map((segment: UrlSegment) => segment.path)
      .filter(Boolean)
      .join('/');
  }

  /**
   * Resolves the authenticated user's home route using session context + role path.
   *
   * Examples:
   * - context=`central`, path=`/root-dashboard` => `/central/root-dashboard`
   * - context=`tenant`, path=`/dashboard` => `/tenant/dashboard`
   */
  private buildHomeRoute(): string {
    const context = this.authState.context();
    const rolePath = this.authState.activeRole()?.path || '/';
    const normalizedPath = rolePath.startsWith('/') ? rolePath : `/${rolePath}`;

    return context ? `/${context}${normalizedPath}` : normalizedPath;
  }
}
