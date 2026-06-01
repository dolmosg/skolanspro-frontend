/**
 * Main Topbar UI component
 *
 * Inputs:
 * - notificationsCount: Notification badge count
 * - languages: Optional language list override
 *
 * Data sources:
 * - SiteStateService: languages and site bootstrap data
 * - AuthStateSevice: authenticated user, role, avatar and role switching state
 *
 * Outputs:
 * - Emits UI interaction events related to layout and language changes
 */
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SiteLanguage } from '../../shared/interfaces/central.interfaces';
import { LanguageService } from '../../shared/services/language-service';
import { SiteStateService } from '../../shared/services/site-state';
import { UiIconComponent } from '../../shared/ui/ui-icon/ui-icon';
import { AuthStateSevice } from '../../shared/services/auth-state-sevice';
import { Breadcrumb } from '../breadcrumb/breadcrumb';



export interface TopbarLanguageOption {
  id: number;
  label: string;
  value: string;
  shorthand?: string;
  icon?: string;
}

export interface TopbarRoleOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, UiIconComponent, TranslatePipe, Breadcrumb],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar implements OnInit {
  private readonly languageService = inject(LanguageService);
  private readonly siteState = inject(SiteStateService);
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateSevice);

  constructor() {
    effect(() => {
      // console.log('[Topbar user debug]', {
      //   context: this.authState.context(),
      //   picture: this.authState.userPicture(),
      //   hasPicture: this.hasUserPicture(),
      //   initials: this.authState.userInitials(),
      //   name: this.authState.userName(),
      //   user: this.authState.user(),
      // });
    });
  }

  @Input() notificationsCount = 0;
  @Input() languages: TopbarLanguageOption[] = [];

  /**
   * Current active language code shown in the selector.
   *
   * This value is initialized from LanguageService and may fall back
   * to SiteStateService when the application boots.
   */
  protected currentLanguage = 'ES';

  @Output() menuClick = new EventEmitter<void>();
  @Output() languageClick = new EventEmitter<void>();
  @Output() languageChange = new EventEmitter<string>();
  @Output() notificationsClick = new EventEmitter<void>();
  @Output() roleClick = new EventEmitter<void>();
  @Output() userClick = new EventEmitter<void>();
  @Output() profileClick = new EventEmitter<void>();

  /**
   * Reactive UI state for dropdown visibility
   */
  protected readonly languageMenuOpen = signal(false);
  protected readonly roleMenuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);

  /**
   * Resolves available languages.
   * Priority:
   * 1. Input languages (if provided)
   * 2. Languages from SiteStateService (checkstate)
   */
  protected readonly availableLanguages = computed<TopbarLanguageOption[]>(() => {
    const inputLanguages = this.languages;

    if (inputLanguages.length > 0) {
      return inputLanguages;
    }

    return this.siteState.languages().map((language: SiteLanguage) => ({
      id: language.id,
      label: language.label,
      value: language.code,
      shorthand: language.shorthand,
      icon: language.icon,
    }));
  });

  /**
   * Computed auth-derived values used by the template
   */
  protected readonly userInitialsComputed = computed(() => this.authState.userInitials() ?? '');

  protected readonly currentRoleComputed = computed(() => this.authState.activeRole()?.name ?? '');

  protected readonly rolesComputed = computed<TopbarRoleOption[]>(() =>
    this.authState.availableRoles().map((role) => ({
      label: role.name,
      value: String(role.id),
    }))
  );

  /**
   * Resolved avatar URL for the authenticated user
   */
  protected readonly resolvedUserPicture = computed(() => this.authState.userPicture());

  /**
   * Resolved display name for the authenticated user
   */
  protected readonly resolvedUserName = computed(() => this.authState.userName());

  /**
   * Indicates whether the current authenticated session belongs to tenant context
   */
  protected readonly isTenantContext = computed(() => this.authState.context() === 'tenant');

  /**
   * Indicates whether the authenticated user has an avatar image
   */
  protected readonly hasUserPicture = computed(() => {
    return this.isTenantContext() && !!this.resolvedUserPicture();
  });

  /**
   * Determines if role switcher should be visible
   */
  protected readonly canSwitchRoles = computed(() => this.rolesComputed().length > 0);

  /**
   * Short label rendered in the language switcher button.
   * Prefers backend-provided shorthand when available.
   */
  protected get currentLanguageLabel(): string {
    const current = this.availableLanguages().find((language) => language.value === this.currentLanguage);

    if (current?.shorthand) {
      return current.shorthand.toUpperCase();
    }

    return this.currentLanguage.toLowerCase().startsWith('en') ? 'EN' : 'ES';
  }

  onMenuClick(): void {
    this.menuClick.emit();
  }

  onLanguageClick(): void {
    this.languageMenuOpen.update((value) => !value);
    this.languageClick.emit();
  }

  /**
   * Changes application language
   * Updates LanguageService and emits change event
   */
  selectLanguage(value: string): void {
    const lang = value as 'es-MX' | 'en-US';

    this.languageService.setLanguage(lang);
    this.currentLanguage = value;

    this.languageChange.emit(value);
    this.languageMenuOpen.set(false);
  }

  closeLanguageMenu(): void {
    this.languageMenuOpen.set(false);
  }

  /**
   * Initializes the active language from LanguageService.
   * Falls back to SiteStateService or the first available language option.
   */
  ngOnInit(): void {
    this.currentLanguage = this.languageService.currentLanguage();

    if (!this.currentLanguage) {
      this.currentLanguage = this.siteState.languageCode() || this.availableLanguages()[0]?.value || 'es-MX';
    }
  }

  onNotificationsClick(): void {
    this.notificationsClick.emit();
  }

  /**
   * Toggles the role selector dropdown
   */
  onRoleClick(): void {
    this.roleMenuOpen.update((value) => !value);
    this.roleClick.emit();
  }

  /**
   * Updates selected role using AuthStateService
   */
  selectRole(value: string): void {
    const selected = this.authState.availableRoles().find((r) => String(r.id) === value);

    if (selected) {
      this.authState.setActiveRole(selected);
    }

    this.roleMenuOpen.set(false);
  }

  /**
   * Closes the role selector dropdown
   */
  closeRoleMenu(): void {
    this.roleMenuOpen.set(false);
  }

  /**
   * Toggles the user actions dropdown
   */
  onUserClick(): void {
    this.userMenuOpen.update((value) => !value);
    this.userClick.emit();
  }

  /**
   * Emits profile action from the user menu
   */
  onProfileClick(): void {
    this.userMenuOpen.set(false);
    this.profileClick.emit();
  }

  /**
   * Handles logout action
   * Redirects user to logout route
   */
  onLogoutClick(): void {
    this.userMenuOpen.set(false);
    this.router.navigate(['/auth/logout']);
  }

  /**
   * Closes the user actions dropdown
   */
  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }
}