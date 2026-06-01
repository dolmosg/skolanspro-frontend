import { inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ApiService } from './api-service';
import { AuthStateSevice } from './auth-state-sevice';
import { SidebarNavItem } from '../../layout/sidebar-nav-item.model';

interface NavigationApiItem {
  id: string;
  labelKey: string;
  route?: string;
  icon?: string;
  children?: NavigationApiItem[];
}

interface NavigationApiPayload {
  items: NavigationApiItem[];
  allowedRoutes?: string[] | null;
}

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly api = inject(ApiService);
  private readonly authState = inject(AuthStateSevice);

  readonly items = signal<SidebarNavItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Loads the current navigation tree from the API.
   */
  load(force = false): void {
    if (this.loading() || (!force && this.items().length > 0)) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.api
      .get<NavigationApiPayload>('navigation')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.items.set([]);
            this.error.set(response.message || 'No se pudo cargar la navegación.');
            return;
          }

          const payload = response.data;

          this.items.set(this.mapResponseToSidebarItems(payload?.items ?? []));
          this.authState.setAllowedRoutes(payload?.allowedRoutes);
        },
        error: (error) => {
          this.items.set([]);
          this.error.set(error?.message || 'No se pudo cargar la navegación.');
        },
      });
  }

  /**
   * Clears the current navigation state.
   */
  clear(): void {
    this.items.set([]);
    this.authState.setAllowedRoutes([]);
    this.loading.set(false);
    this.error.set(null);
  }

  /**
   * Returns true when the provided route exists in the current navigation tree.
   */
  hasRouteAccess(route: string): boolean {
    const normalizedRoute = this.normalizeRoute(route);

    if (!normalizedRoute) {
      return false;
    }

    return this.routeExistsInTree(normalizedRoute, this.items());
  }

  /**
   * Normalizes application routes by removing the context segment
   * (`/central` or `/tenant`) before comparing against navigation items.
   */
  private normalizeRoute(route: string): string {
    if (!route) {
      return '';
    }

    const [path] = route.split('?');
    const cleanedPath = path.trim();

    if (!cleanedPath) {
      return '';
    }

    const normalizedPath = cleanedPath.startsWith('/') ? cleanedPath : `/${cleanedPath}`;

    if (normalizedPath === '/central' || normalizedPath === '/tenant') {
      return '';
    }

    if (normalizedPath.startsWith('/central/')) {
      return normalizedPath.replace('/central', '');
    }

    if (normalizedPath.startsWith('/tenant/')) {
      return normalizedPath.replace('/tenant', '');
    }

    return normalizedPath;
  }

  /**
   * Recursively checks whether a normalized route exists in the navigation tree.
   */
  private routeExistsInTree(route: string, items: SidebarNavItem[]): boolean {
    return items.some((item) => {
      const itemRoute = item.route?.trim();

      if (itemRoute && (route === itemRoute || route.startsWith(`${itemRoute}/`))) {
        return true;
      }

      if (!item.children?.length) {
        return false;
      }

      return this.routeExistsInTree(route, item.children);
    });
  }

  /**
   * Maps API navigation items to the sidebar UI model.
   */
  private mapResponseToSidebarItems(items: NavigationApiItem[]): SidebarNavItem[] {
    return items.map((item) => ({
      id: item.id,
      labelKey: item.labelKey,
      route: item.route,
      icon: item.icon,
      children: item.children?.length ? this.mapResponseToSidebarItems(item.children) : undefined,
    }));
  }
}