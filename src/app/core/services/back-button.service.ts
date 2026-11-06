import { Injectable, inject, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { TelegramService } from './telegram.service';

/**
 * Telegram BackButton markaziy boshqaruvi.
 * Ichki sahifalarda BackButton ko'rinadi, asosiy sahifalarda yashiriladi.
 */
@Injectable({
  providedIn: 'root'
})
export class BackButtonService implements OnDestroy {
  private tg = inject(TelegramService);
  private router = inject(Router);
  private subscription: Subscription | null = null;
  private currentCallback: (() => void) | null = null;

  // Asosiy sahifalar - BackButton yashirin
  private readonly mainRoutes = [
    '/products',
    '/orders',
    '/cart',
    '/profile'
  ];

  // Ichki sahifalar - BackButton ko'rinadi
  private readonly innerRoutes = [
    '/payments',
    '/map',
    '/notifications',
    '/profile/comments',
    '/profile/settings',
    '/products/', // product detail
    '/companies/',
    '/branches/'
  ];

  constructor() {
    this.init();
  }

  private init(): void {
    // Telegram Mini App bo'lmasa, hech narsa qilmaymiz
    if (!this.tg.isMiniApp()) return;

    // Router eventlarini tinglash
    this.subscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const navEnd = event as NavigationEnd;
      this.handleRouteChange(navEnd.urlAfterRedirects || navEnd.url);
    });

    // Dastlabki sahifani tekshirish
    this.handleRouteChange(this.router.url);
  }

  private handleRouteChange(url: string): void {
    // Asosiy sahifada bo'lsa, BackButton yashir
    if (this.isMainRoute(url)) {
      this.hideBackButton();
      return;
    }

    // Ichki sahifada bo'lsa, BackButton ko'rsat
    if (this.isInnerRoute(url)) {
      this.showBackButton();
    }
  }

  private isMainRoute(url: string): boolean {
    // URL faqat asosiy yo'lga teng bo'lsa (masalan, /profile, /orders)
    const cleanUrl = url.split('?')[0]; // query parametrlarni olib tashlash
    return this.mainRoutes.some(route => cleanUrl === route);
  }

  private isInnerRoute(url: string): boolean {
    const cleanUrl = url.split('?')[0];
    return this.innerRoutes.some(route => cleanUrl.startsWith(route));
  }

  private showBackButton(): void {
    // Avvalgi callbackni tozalash
    this.clearCallback();

    // Yangi callback yaratish
    this.currentCallback = () => {
      this.tg.hapticImpact('light');
      // Orqaga qaytish
      window.history.back();
    };

    // BackButton ko'rsatish
    this.tg.showBackButton(this.currentCallback);
  }

  private hideBackButton(): void {
    this.clearCallback();
    this.tg.hideBackButton();
  }

  private clearCallback(): void {
    if (this.currentCallback) {
      // TelegramService'da offClick metodi yo'q, shuning uchun hide qilamiz
      this.tg.hideBackButton();
      this.currentCallback = null;
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.clearCallback();
  }
}
