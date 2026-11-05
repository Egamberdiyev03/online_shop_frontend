import { Injectable, signal, computed } from '@angular/core';

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initData: string;
  initDataUnsafe: any;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
  sendData: (data: string) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  showPopup: (params: any, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class TelegramService {
  private _isMiniApp = signal(false);
  private _platform = signal<string>('unknown');
  private _colorScheme = signal<'light' | 'dark'>('light');
  private _viewportHeight = signal(window.innerHeight);
  private _isExpanded = signal(false);

  // Public signals
  readonly isMiniApp = this._isMiniApp.asReadonly();
  readonly platform = this._platform.asReadonly();
  readonly colorScheme = this._colorScheme.asReadonly();
  readonly viewportHeight = this._viewportHeight.asReadonly();
  readonly isExpanded = this._isExpanded.asReadonly();

  // Computed
  readonly isMobile = computed(() => {
    const p = this._platform();
    return p === 'android' || p === 'ios' || p === 'android_x' || p === 'ios_x';
  });

  readonly isIOS = computed(() => {
    const p = this._platform();
    return p === 'ios' || p === 'ios_x';
  });

  readonly isAndroid = computed(() => {
    const p = this._platform();
    return p === 'android' || p === 'android_x';
  });

  private tg: TelegramWebApp | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    try {
      this.tg = window.Telegram?.WebApp ?? null;

      // Faqat haqiqiy Telegram Mini App ichida ishlayotganini tekshirish
      // initData bo'sh bo'lsa - oddiy brauzer
      const isRealMiniApp = !!(this.tg && this.tg.initData && this.tg.initData.length > 0);

      if (this.tg && isRealMiniApp) {
        this._isMiniApp.set(true);
        this._platform.set(this.tg.platform || 'unknown');
        this._colorScheme.set(this.tg.colorScheme || 'light');
        this._viewportHeight.set(this.tg.viewportHeight || window.innerHeight);
        this._isExpanded.set(this.tg.isExpanded || false);

        // Apply Telegram class to body
        document.body.classList.add('telegram-mini-app');

        if (this.isMobile()) {
          document.body.classList.add('tg-mobile');
        }

        if (this.isIOS()) {
          document.body.classList.add('tg-ios');
        } else if (this.isAndroid()) {
          document.body.classList.add('tg-android');
        }

        // Apply theme
        if (this.tg.colorScheme === 'dark') {
          document.body.classList.add('dark-theme');
        }

        // Apply Telegram theme colors as CSS variables
        this.applyThemeColors();

        // Listen for theme changes
        this.tg.onEvent('themeChanged', () => {
          this._colorScheme.set(this.tg!.colorScheme);
          this.applyThemeColors();

          if (this.tg!.colorScheme === 'dark') {
            document.body.classList.add('dark-theme');
          } else {
            document.body.classList.remove('dark-theme');
          }
        });

        // Listen for viewport changes
        this.tg.onEvent('viewportChanged', () => {
          this._viewportHeight.set(this.tg!.viewportHeight);
          this._isExpanded.set(this.tg!.isExpanded);
          document.documentElement.style.setProperty('--tg-viewport-height', `${this.tg!.viewportHeight}px`);
          document.documentElement.style.setProperty('--tg-viewport-stable-height', `${this.tg!.viewportStableHeight}px`);
        });

        // Set initial viewport height
        document.documentElement.style.setProperty('--tg-viewport-height', `${this.tg.viewportHeight}px`);
        document.documentElement.style.setProperty('--tg-viewport-stable-height', `${this.tg.viewportStableHeight}px`);

      }
    } catch (e) {
      console.warn('TelegramService init error:', e);
    }
  }

  private applyThemeColors(): void {
    if (!this.tg?.themeParams) return;

    const tp = this.tg.themeParams;
    const root = document.documentElement;

    // Map Telegram theme params to CSS variables
    if (tp.bg_color) root.style.setProperty('--tg-bg', tp.bg_color);
    if (tp.text_color) root.style.setProperty('--tg-text', tp.text_color);
    if (tp.hint_color) root.style.setProperty('--tg-hint', tp.hint_color);
    if (tp.link_color) root.style.setProperty('--tg-link', tp.link_color);
    if (tp.button_color) root.style.setProperty('--tg-button', tp.button_color);
    if (tp.button_text_color) root.style.setProperty('--tg-button-text', tp.button_text_color);
    if (tp.secondary_bg_color) root.style.setProperty('--tg-secondary-bg', tp.secondary_bg_color);
    if (tp.header_bg_color) root.style.setProperty('--tg-header-bg', tp.header_bg_color);
    if (tp.accent_text_color) root.style.setProperty('--tg-accent', tp.accent_text_color);
    if (tp.section_bg_color) root.style.setProperty('--tg-section-bg', tp.section_bg_color);
    if (tp.destructive_text_color) root.style.setProperty('--tg-destructive', tp.destructive_text_color);
  }

  // Haptic Feedback
  hapticImpact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light'): void {
    this.tg?.HapticFeedback?.impactOccurred(style);
  }

  hapticNotification(type: 'error' | 'success' | 'warning'): void {
    this.tg?.HapticFeedback?.notificationOccurred(type);
  }

  hapticSelection(): void {
    this.tg?.HapticFeedback?.selectionChanged();
  }

  // Back Button
  showBackButton(callback: () => void): void {
    if (this.tg?.BackButton) {
      this.tg.BackButton.onClick(callback);
      this.tg.BackButton.show();
    }
  }

  hideBackButton(): void {
    this.tg?.BackButton?.hide();
  }

  // Main Button
  showMainButton(text: string, callback: () => void): void {
    if (this.tg?.MainButton) {
      this.tg.MainButton.setText(text);
      this.tg.MainButton.onClick(callback);
      this.tg.MainButton.show();
    }
  }

  hideMainButton(): void {
    this.tg?.MainButton?.hide();
  }

  setMainButtonLoading(loading: boolean): void {
    if (!this.tg?.MainButton) return;

    if (loading) {
      this.tg.MainButton.showProgress();
    } else {
      this.tg.MainButton.hideProgress();
    }
  }

  // Dialogs
  showAlert(message: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.tg) {
        this.tg.showAlert(message, () => resolve());
      } else {
        alert(message);
        resolve();
      }
    });
  }

  showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.tg) {
        this.tg.showConfirm(message, (confirmed) => resolve(confirmed));
      } else {
        resolve(confirm(message));
      }
    });
  }

  // Navigation
  openLink(url: string, tryInstantView = false): void {
    if (this.tg) {
      this.tg.openLink(url, { try_instant_view: tryInstantView });
    } else {
      window.open(url, '_blank');
    }
  }

  // Close app
  close(): void {
    this.tg?.close();
  }

  // Expand to full height
  expand(): void {
    this.tg?.expand();
  }

  // Get raw Telegram WebApp object
  get webApp(): TelegramWebApp | null {
    return this.tg;
  }
}
