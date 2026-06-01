import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlobalLoaderComponent } from './layout/global-loader-component/global-loader-component';
import { firstValueFrom } from 'rxjs';
import { ThemeService } from './core/themes/theme.service';
import { LanguageService } from './shared/services/language-service';
import { ApiService } from './shared/services/api-service';
import { SiteStateService } from './shared/services/site-state';
import { SiteStateData } from './shared/interfaces/central.interfaces';
import { AuthStateSevice } from './shared/services/auth-state-sevice';

/**
 * Root Application Component (App)
 * --------------------------------
 *
 * Responsibilities:
 * - Bootstrap global application state
 * - Initialize theme and language preferences
 * - Restore authenticated session from storage
 * - Load central configuration via `checkstate`
 *
 * Core Services Used:
 * - ThemeService: Manages UI theme (light/dark/custom)
 * - LanguageService: Controls active language and i18n
 * - ApiService: Handles HTTP communication with backend
 * - SiteStateService: Stores global app configuration (branding, languages, etc.)
 * - AuthStateSevice: Manages authenticated user session
 *
 * Initialization Flow:
 * 1. Initialize language and theme
 * 2. Hydrate authentication session from localStorage
 * 3. Call backend `checkstate` endpoint
 * 4. Apply backend-provided configuration (language, theme, etc.)
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GlobalLoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /** Theme manager (light/dark/custom) */
  private readonly themeService = inject(ThemeService);

  /** Language and i18n manager */
  private readonly languageService = inject(LanguageService);

  /** HTTP API abstraction layer */
  private readonly api = inject(ApiService);

  /** Global site state (branding, languages, config) */
  private readonly siteState = inject(SiteStateService);

  /** Authentication session manager */
  private readonly authState = inject(AuthStateSevice);

  constructor() {
    // Initialize language from localStorage or defaults
    this.languageService.init();

    // Load saved theme (if any)
    this.themeService.loadSavedTheme();

    // Restore authenticated session (token + user) from storage
    this.authState.hydrateFromStorage();

    // Load global site configuration from backend
    void this.bootstrapSite();
  }

  /**
   * Loads global configuration from backend (`checkstate` endpoint)
   *
   * Responsibilities:
   * - Fetch central configuration
   * - Store it in SiteStateService
   * - Apply backend-driven language and theme
   */
  private async bootstrapSite(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.get<SiteStateData>('checkstate'));

      if (!response.success) {
        return;
      }

      // Store global configuration
      this.siteState.setState(response.data);

      // Apply backend language if no local override exists
      this.applyBackendLanguageIfNeeded(response.data.language, response.data.languages);

      // Apply backend theme
      this.applyBackendTheme(response.data.theme);
    } catch (error) {
      console.error('[CheckStateError]', error);
    }
  }

  /**
   * Applies backend-provided language only if user has no local preference
   *
   * Priority:
   * 1. LocalStorage (user preference)
   * 2. Backend default
   */
  private applyBackendLanguageIfNeeded(language: unknown, languages: unknown): void {
    const savedLanguage = localStorage.getItem('skolans-language');

    if (savedLanguage) {
      return;
    }

    if (!language || typeof language !== 'object') {
      return;
    }

    const code = (language as { code?: unknown }).code;

    if (typeof code !== 'string') {
      return;
    }

    const availableLanguages = Array.isArray(languages) ? languages : [];

    const exists = availableLanguages.some((item) => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      return (item as { code?: unknown }).code === code;
    });

    if (exists) {
      this.languageService.setLanguage(
        code as Parameters<LanguageService['setLanguage']>[0]
      );
    }
  }

  /**
   * Applies backend-provided theme
   *
   * Uses ThemeService dynamic setter to avoid strict typing limitations
   */
  private applyBackendTheme(theme: unknown): void {
    const themeName =
      theme && typeof theme === 'object' ? (theme as { name?: unknown }).name : null;

    if (typeof themeName !== 'string') {
      return;
    }

    const themeApi = this.themeService as unknown as {
      setTheme: (themeName: string) => void;
    };

    themeApi.setTheme(themeName);
  }
}
