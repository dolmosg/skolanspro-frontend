import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
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
   * Identifies the latest navigation request so responses started before a
   * role/context reset cannot restore stale sidebar or allowed-route state.
   */
  private loadVersion = 0;
  private readonly resetRequests = new Subject<void>();

  /**
   * Loads the current navigation tree from the API.
   */
  async load(force = false): Promise<void> {
    if (this.loading() || (!force && this.items().length > 0)) {
      return;
    }

    const requestVersion = ++this.loadVersion;
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.api.get<NavigationApiPayload>('navigation').pipe(takeUntil(this.resetRequests)),
        { defaultValue: null },
      );

      if (!response || requestVersion !== this.loadVersion) {
        return;
      }

      if (!response.success) {
        this.items.set([]);
        this.error.set(response.message || 'No se pudo cargar la navegación.');
        return;
      }

      const payload = response.data;

      this.items.set(this.mapResponseToSidebarItems(payload?.items ?? []));
      this.authState.setAllowedRoutes(payload?.allowedRoutes);
    } catch (error) {
      if (requestVersion !== this.loadVersion) {
        return;
      }

      const requestError = error as { message?: string };
      this.items.set([]);
      this.error.set(requestError?.message || 'No se pudo cargar la navegación.');
    } finally {
      if (requestVersion === this.loadVersion) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Clears the current navigation state.
   */
  clear(): void {
    this.loadVersion++;
    this.resetRequests.next();
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
