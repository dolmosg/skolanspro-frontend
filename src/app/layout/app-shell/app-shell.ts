import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { Topbar } from '../topbar/topbar';
import { SklModalHostComponent } from '../../shared/base/skl-modal-host.component/skl-modal-host.component';
import { SideBarComponent } from '../side-bar/side-bar';
import { NavigationService } from '../../shared/services/navigation-service';
import { SiteStateService } from '../../shared/services/site-state';
import { AppContextService } from '@shared/services/app-context-service';

const MOBILE_BREAKPOINT = 992;

/**
 * Root shell component used by authenticated areas of the application.
 *
 * It coordinates layout composition and responsive UI state,
 * while delegating page rendering to the Angular Router
 * and menu rendering to the sidebar component.
 */
@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Topbar, SklModalHostComponent, SideBarComponent],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly navigationService = inject(NavigationService);
  private readonly siteState = inject(SiteStateService);
  private readonly appContext = inject(AppContextService);

  /**
   * Navigation items provided to the sidebar component.
   */
  protected readonly navItems = this.navigationService.items;

  /**
   * Local loading state for sidebar navigation rendering.
   */
  protected readonly navLoading = this.navigationService.loading;

  /**
   * Local error state for sidebar navigation loading.
   */
  protected readonly navError = this.navigationService.error;

  /**
   * Static shell branding placeholders.
   *
   * These values are temporary and should later be replaced
   * by the current site/context state.
   */
  protected readonly brandName = computed(() => {
    const tradename = this.siteState.tradename();
    return typeof tradename === 'string' && tradename.trim().length ? tradename : 'SkolansPro';
  });
  protected readonly brandSubtitle = '';
  protected readonly appVersion = computed(() => {
    const version = this.siteState.appVersion();
    return typeof version === 'string' && version.trim().length ? version : '';
  });
  protected readonly brandLogo = 'logo/logo-32.png';
  protected readonly brandLogoAlt = 'Logo del sitio';

  /**
   * Reactive UI state.
   *
   * - sidebarOpen: mobile drawer visibility
   * - sidebarCollapsed: desktop collapsed sidebar state
   * - isMobile: responsive breakpoint flag
   */
  protected readonly sidebarOpen = signal(false);
  protected readonly sidebarCollapsed = signal(false);
  protected readonly isMobile = signal(window.innerWidth < MOBILE_BREAKPOINT);

  /**
   * Dynamic host CSS class map used by the shell template.
   */
  protected readonly shellClasses = computed(() => ({
    'shell--mobile': this.isMobile(),
    'shell--sidebar-open': this.sidebarOpen(),
    'shell--sidebar-collapsed': this.sidebarCollapsed() && !this.isMobile(),
  }));

  /**
   * Initializes shell-level navigation data and listens to route changes
   * in order to automatically close the sidebar drawer after mobile navigation.
   */
  constructor() {
    this.navigationService.load();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.isMobile()) {
          this.sidebarOpen.set(false);
        }
      });
  }

  /**
   * Updates responsive state when window size changes.
   *
   * Behavior:
   * - detects whether the current viewport is mobile
   * - closes the mobile sidebar when returning to desktop
   */
  @HostListener('window:resize')
  onResize(): void {
    const mobile = window.innerWidth < MOBILE_BREAKPOINT;
    this.isMobile.set(mobile);

    if (!mobile) {
      this.sidebarOpen.set(false);
    }
  }

  /**
   * Closes the mobile sidebar drawer.
   */
  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  /**
   * Toggles sidebar behavior depending on viewport:
   * - mobile: open/close drawer
   * - desktop: collapse/expand sidebar
   */
  protected toggleSidebar(): void {
    if (this.isMobile()) {
      this.sidebarOpen.update((value) => !value);
      return;
    }

    this.sidebarCollapsed.update((value) => !value);
  }

  /**
   * Opens the authenticated user's profile screen
   * using the current application context as route prefix.
   */
  protected openProfile(): void {
    this.router.navigate(['/', this.appContext.type, 'home','profile']);
  }
}
