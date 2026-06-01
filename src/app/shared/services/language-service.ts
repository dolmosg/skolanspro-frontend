import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { SiteStateService } from './site-state';

export type AppLanguage = 'es-MX' | 'en-US';

/**
 * Application language service.
 */
@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly siteState = inject(SiteStateService);

  readonly currentLanguage = signal<AppLanguage>('es-MX');

  init(): void {
    const saved = localStorage.getItem('skolans-language') as AppLanguage | null;
    const browser = this.translate.getBrowserCultureLang();

    const lang: AppLanguage =
      saved === 'es-MX' || saved === 'en-US'
        ? saved
        : browser?.toLowerCase().startsWith('en')
          ? 'en-US'
          : 'es-MX';

    this.setLanguage(lang);
  }

  setLanguage(lang: AppLanguage): void {
    this.translate.use(lang);
    this.currentLanguage.set(lang);
    this.siteState.setLocale(lang);
    localStorage.setItem('skolans-language', lang);
    document.documentElement.lang = lang;
  }

  toggle(): void {
    this.setLanguage(this.currentLanguage() === 'es-MX' ? 'en-US' : 'es-MX');
  }
}