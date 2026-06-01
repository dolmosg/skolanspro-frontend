import { Injectable, signal } from '@angular/core';
import { APP_THEMES, ThemeName } from './themes';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly currentTheme = signal<ThemeName>('orange');

  applyTheme(theme: ThemeName): void {
    const root = document.documentElement;
    const palette = APP_THEMES[theme];

    Object.entries(palette).forEach(([token, value]) => {
      root.style.setProperty(token, value);
    });

    this.currentTheme.set(theme);
    localStorage.setItem('skolans-theme', theme);
  }

  loadSavedTheme(): void {
    this.applyTheme('blue');
  }

  setTheme(theme: ThemeName): void {
    if (!APP_THEMES[theme]) {
      this.applyTheme('blue');
      return;
    }

    this.applyTheme(theme);
  }
}