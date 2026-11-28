import { Injectable, signal, inject, ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first } from 'rxjs/operators';
import { concat, interval } from 'rxjs';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private swUpdate = inject(SwUpdate);
  private appRef = inject(ApplicationRef);
  private notification = inject(NotificationService);

  // Install prompt
  private deferredPrompt: any = null;
  public canInstall = signal<boolean>(false);
  public isInstalled = signal<boolean>(false);
  public isOnline = signal<boolean>(navigator.onLine);
  public hasUpdate = signal<boolean>(false);

  // PWA platform detection
  public isStandalone = signal<boolean>(false);
  public platform = signal<'ios' | 'android' | 'desktop' | 'unknown'>('unknown');

  constructor() {
    this.detectPlatform();
    this.detectStandaloneMode();
    this.setupInstallPrompt();
    this.setupOnlineStatus();
    this.setupUpdateCheck();
  }

  private detectPlatform(): void {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      this.platform.set('ios');
    } else if (/android/.test(ua)) {
      this.platform.set('android');
    } else if (/windows|macintosh|linux/.test(ua)) {
      this.platform.set('desktop');
    } else {
      this.platform.set('unknown');
    }
  }

  private detectStandaloneMode(): void {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    this.isStandalone.set(isStandalone);
    this.isInstalled.set(isStandalone);
  }

  private setupInstallPrompt(): void {
    if (typeof window === 'undefined') return;

    // Android/Chrome install prompt
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstall.set(true);
    });

    // Installed event
    window.addEventListener('appinstalled', () => {
      this.canInstall.set(false);
      this.isInstalled.set(true);
      this.deferredPrompt = null;
      this.notification.success("Ilova muvaffaqiyatli o'rnatildi!");
    });
  }

  private setupOnlineStatus(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.notification.info('Internet qayta ulandi');
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
      this.notification.warning("Internet yo'q. Offline rejimda ishlayapsiz.");
    });
  }

  private setupUpdateCheck(): void {
    if (!this.swUpdate.isEnabled) return;

    // Check for updates on startup and every 30 minutes
    const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable));
    const every30Min$ = interval(30 * 60 * 1000);
    const checkInterval$ = concat(appIsStable$, every30Min$);

    checkInterval$.subscribe(() => {
      this.swUpdate.checkForUpdate().catch(() => {});
    });

    // Handle version updates
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        this.hasUpdate.set(true);
        this.notification.info('Yangi versiya mavjud! Yangilash uchun bosing.', 'Yangilanish');
      });
  }

  /**
   * Install promptni ko'rsatish
   */
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      // iOS uchun ko'rsatma
      if (this.platform() === 'ios') {
        this.notification.info(
          "Safari'da \"Ulashish\" tugmasini bosing va \"Bosh ekranga qo'shish\" ni tanlang",
          "O'rnatish"
        );
        return false;
      }
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        this.canInstall.set(false);
        this.deferredPrompt = null;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Yangilanishni qo'llash
   */
  async applyUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled) return;

    try {
      await this.swUpdate.activateUpdate();
      this.hasUpdate.set(false);
      window.location.reload();
    } catch (err) {
      this.notification.error("Yangilashda xatolik yuz berdi");
    }
  }

  /**
   * iOS uchun o'rnatish ko'rsatmasi kerakmi
   */
  shouldShowIosInstallGuide(): boolean {
    return this.platform() === 'ios' && !this.isInstalled() && !this.isStandalone();
  }
}
