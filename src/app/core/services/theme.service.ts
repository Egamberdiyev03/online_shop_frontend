import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'online_shop_theme';
  private platformId = inject(PLATFORM_ID);

  isDarkMode = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initTheme();

      effect(() => {
        const isDark = this.isDarkMode();
        if (isDark) {
          document.documentElement.classList.add('dark-theme');
          document.body.classList.add('dark-theme');
          localStorage.setItem(this.THEME_KEY, 'dark');
        } else {
          document.documentElement.classList.remove('dark-theme');
          document.body.classList.remove('dark-theme');
          localStorage.setItem(this.THEME_KEY, 'light');
        }
      });
    }
  }

  private initTheme(): void {
    const saved = localStorage.getItem(this.THEME_KEY) as ThemeMode | null;
    if (saved) {
      this.isDarkMode.set(saved === 'dark');
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkMode.set(prefersDark);
    }
  }

  toggleTheme(): void {
    this.isDarkMode.update(prev => !prev);
  }

  setTheme(mode: ThemeMode): void {
    this.isDarkMode.set(mode === 'dark');
  }
}
