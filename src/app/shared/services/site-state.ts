/**
 * Global application state service.
 */
import { Injectable, computed, signal } from '@angular/core';
import { AppContextType } from '../app-context-types';
import { SiteLanguage, SiteStateData, NameCasingMode } from '../interfaces/central.interfaces';

@Injectable({
  providedIn: 'root',
})
export class SiteStateService {
  private readonly state = signal<SiteStateData | null>(null);

  private readonly activeLocale = signal<string | null>(null);

  readonly siteState = computed(() => this.state());
  readonly hasState = computed(() => this.state() !== null);

  readonly context = computed(() => this.state()?.context ?? null);
  readonly tradename = computed(() => this.state()?.tradename ?? null);
  readonly title = computed(() => this.state()?.title ?? null);
  readonly message = computed(() => this.state()?.message ?? null);
  readonly messageAuthor = computed(() => this.state()?.messageAuthor ?? null);
  readonly messageSource = computed(() => this.state()?.messageSource ?? null);
  readonly logo = computed(() => this.state()?.logo ?? null);
  readonly googlelogin = computed(() => this.state()?.googlelogin ?? false);
  readonly theme = computed(() => this.state()?.theme ?? null);
  readonly language = computed(() => this.state()?.language ?? null);
  readonly maintenance = computed(() => this.state()?.maintenance ?? null);
  readonly languages = computed<SiteLanguage[]>(() => this.state()?.languages ?? []);
  readonly appVersion = computed(() => this.state()?.appVersion ?? null);

  readonly nameCasing = computed<NameCasingMode>(() => {
    return this.state()?.nameCasing ?? 'normal';
  });

  readonly isCentral = computed(() => this.state()?.context === 'central');
  readonly isTenant = computed(() => this.state()?.context === 'tenant');
  readonly isReady = computed(() => this.state() !== null && this.context() !== null);

  readonly languageCode = computed<string | null>(() => {
    const language = this.state()?.language;

    if (!language) {
      return null;
    }

    if (typeof language === 'string') {
      return language;
    }

    return language.code ?? null;
  });

  readonly locale = computed<string>(() => {
    return this.activeLocale() ?? this.languageCode() ?? 'es-MX';
  });

  readonly timezone = computed<string>(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

  setState(data: SiteStateData): void {
    this.state.set({
      ...data,
      context: this.normalizeContext(data.context),
    });
  }

  setLocale(locale: string): void {
    this.activeLocale.set(locale);
  }

  updateTheme(theme: SiteStateData['theme']): void {
    this.state.update((current) => (current ? { ...current, theme } : current));
  }

  updateTradename(tradename: SiteStateData['tradename']): void {
    this.state.update((current) => (current ? { ...current, tradename } : current));
  }

  updateMessage(message: SiteStateData['message']): void {
    this.state.update((current) => (current ? { ...current, message } : current));
  }

  updateLogo(logo: SiteStateData['logo']): void {
    this.state.update((current) => (current ? { ...current, logo } : current));
  }

  private normalizeContext(context: SiteStateData['context'] | null | undefined): AppContextType {
    return context === 'tenant' ? 'tenant' : 'central';
  }

  clear(): void {
    this.state.set(null);
    this.activeLocale.set(null);
  }
}