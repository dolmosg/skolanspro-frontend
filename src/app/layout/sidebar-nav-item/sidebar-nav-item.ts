import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { UiIconComponent } from '../../shared/ui/ui-icon/ui-icon';
import { SidebarNavItem } from '../sidebar-nav-item.model';
import { AppContextService } from '../../shared/services/app-context-service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar-nav-item',
  standalone: true,
  imports: [CommonModule, RouterLink, UiIconComponent, TranslatePipe],
  templateUrl: './sidebar-nav-item.html',
  styleUrl: './sidebar-nav-item.scss',
})
export class SidebarNavItemComponent implements OnInit {
  @Input({ required: true }) item!: SidebarNavItem;
  @Input() level = 0;
  @Input() collapsed = false;
  @Input() showTitle = false;

  protected readonly open = signal(false);
  private readonly appContext = inject(AppContextService);
  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    this.syncOpenStateWithRoute();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.syncOpenStateWithRoute();
      });
  }

  protected syncOpenStateWithRoute(): void {
    if (!this.item.children?.length) {
      this.open.set(false);
      return;
    }

    this.open.set(this.isActive());
  }

  protected getContextualRoute(route?: string): string | undefined {
    if (!route) {
      return undefined;
    }

    const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
    const contextPrefix = `/${this.appContext.type}`;

    if (normalizedRoute === contextPrefix || normalizedRoute.startsWith(`${contextPrefix}/`)) {
      return normalizedRoute;
    }

    return `${contextPrefix}${normalizedRoute}`;
  }

  protected toggle(): void {
    if (!this.item.children?.length) return;
    this.open.update((value) => !value);
  }

  protected isRouteActive(route?: string): boolean {
    const contextualRoute = this.getContextualRoute(route);

    if (!contextualRoute) {
      return false;
    }

    return this.router.url === contextualRoute || this.router.url.startsWith(contextualRoute + '/');
  }

  protected isActive(): boolean {
    return this.isItemActive(this.item);
  }

  private isItemActive(item: SidebarNavItem): boolean {
    if (item.route && this.isRouteActive(item.route)) {
      return true;
    }

    if (!item.children?.length) {
      return false;
    }

    return item.children.some((child) => this.isItemActive(child));
  }

  private shouldBeExpanded(item: SidebarNavItem): boolean {
    if (!item.children?.length) {
      return this.isRouteActive(item.route);
    }

    return item.children.some((child) => this.shouldBeExpanded(child));
  }
}
