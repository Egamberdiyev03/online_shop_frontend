import { Component, OnInit, OnDestroy, inject, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, of } from 'rxjs';
import { catchError, filter } from 'rxjs/operators';
import { CartService } from '../../core/services/cart.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { CurierService } from '../../core/services/curier.service';
import { OrderService } from '../../core/services/order.service';
import { PaymentService } from '../../core/services/payment.service';
import { ThemeService } from '../../core/services/theme.service';
import { UserNotificationService } from '../../core/services/user-notification.service';
import { PaymentStatus } from '../../core/models/payment.model';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';
import { ImageUrlPipe } from '../../shared/pipes/image-url.pipe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NotificationBellComponent, ImageUrlPipe],
  template: `
    <header class="navbar-wrapper">
      <nav class="main-nav">
        <div class="nav-container">
          <!-- Brand Logo -->
          <a [routerLink]="authState.isCurier() ? '/curier/dashboard' : '/'" class="brand-logo" (click)="closeMobileMenu()">
            <div class="logo-icon">🛍️</div>
            <div class="logo-text">
              <span class="brand-name">Online<strong>Shop</strong></span>
              <span class="brand-tag">E-COMMERCE</span>
            </div>
          </a>

          <!-- Desktop Main Nav Links (bitta qator, white-space: nowrap) -->
          <div class="nav-links">
            <ng-container *ngTemplateOutlet="navLinksTpl; context: { isMobile: false }"></ng-container>
          </div>

          <!-- Right Actions: [Tema] [Bildirishnoma] [Savat] [Profil] [Gamburger] -->
          <div class="nav-actions">
            <!-- Tema tugmasi -->
            @if (authState.isAuthenticated()) {
              <button
                type="button"
                class="theme-toggle-btn"
                (click)="toggleTheme()"
                [attr.aria-label]="themeService.isDarkMode() ? 'Kunduzgi rejimga o\\'tish' : 'Tungi rejimga o\\'tish'"
                [attr.title]="themeService.isDarkMode() ? 'Kunduzgi rejim' : 'Tungi rejim'"
              >
                @if (themeService.isDarkMode()) {
                  <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                } @else {
                  <svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                  </svg>
                }
              </button>
            }

            <!-- Bildirishnomalar -->
            @if (authState.isAuthenticated()) {
              <app-notification-bell></app-notification-bell>
            }

            <!-- Savat - faqat Customer uchun -->
            @if (authState.canUseCart()) {
              <a
                routerLink="/cart"
                class="cart-pill-btn"
                routerLinkActive="active"
                title="Savatcha"
                (click)="closeMobileMenu()"
              >
                <span class="cart-icon">🛒</span>
                <span class="cart-title">Savat</span>
                <span class="cart-badge">{{ cartService.cartCount() }}</span>
              </a>
            }

            <!-- Profil - oddiy link -->
            @if (authState.isAuthenticated()) {
              <a
                routerLink="/profile"
                routerLinkActive="active"
                class="profile-link"
                title="Profil"
                (click)="closeMobileMenu()"
              >
                <span class="profile-avatar">
                  @if (profilePictureUrl && !avatarBroken) {
                    <img
                      [src]="profilePictureUrl | imageUrl"
                      [alt]="authState.userName()"
                      class="profile-avatar-img"
                      (error)="avatarBroken = true"
                    />
                  } @else {
                    {{ userInitials }}
                  }
                </span>
                <span class="profile-text">Profil</span>
              </a>
            }

            <!-- Mehmon uchun -->
            @if (!authState.isAuthenticated()) {
              <div class="auth-buttons">
                <a routerLink="/login" class="btn btn-secondary btn-sm" (click)="closeMobileMenu()">Kirish</a>
                <a routerLink="/register" class="btn btn-primary btn-sm" (click)="closeMobileMenu()">Ro'yxatdan o'tish</a>
              </div>
            }

            <!-- Gamburger tugma (kichik ekranlarda) -->
            <button
              type="button"
              class="hamburger-btn"
              (click)="toggleMobileMenu($event)"
              [attr.aria-expanded]="mobileMenuOpen"
              aria-label="Navigatsiya menyusi"
            >
              @if (mobileMenuOpen) {
                <svg class="hamburger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              } @else {
                <svg class="hamburger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              }
            </button>
          </div>
        </div>

        <!-- Mobile Hamburger Drawer -->
        @if (mobileMenuOpen) {
          <div class="mobile-nav-drawer" (click)="$event.stopPropagation()">
            <ng-container *ngTemplateOutlet="navLinksTpl; context: { isMobile: true }"></ng-container>
          </div>
        }
      </nav>
    </header>

    <!-- Umumiy navigatsiya bandlari shabloni -->
    <ng-template #navLinksTpl let-isMobile="isMobile">
      @if (showProductsInNavbar) {
        <a
          routerLink="/products"
          routerLinkActive="active"
          [class]="isMobile ? 'mobile-nav-link' : 'nav-link'"
          (click)="closeMobileMenu()"
        >
          Mahsulotlar
        </a>
      }

      @if (authState.isSuperAdmin()) {
        <a
          routerLink="/companies"
          routerLinkActive="active"
          [class]="isMobile ? 'mobile-nav-link' : 'nav-link'"
          (click)="closeMobileMenu()"
        >
          Kompaniyalar
        </a>
        <a
          routerLink="/categories"
          routerLinkActive="active"
          [class]="isMobile ? 'mobile-nav-link' : 'nav-link'"
          (click)="closeMobileMenu()"
        >
          Kategoriyalar
        </a>
      }

      @if (!authState.isCurier()) {
        <a
          routerLink="/orders"
          routerLinkActive="active"
          [class]="isMobile ? 'mobile-nav-link' : 'nav-link'"
          (click)="closeMobileMenu()"
        >
          <span>Buyurtmalar</span>
          @if (authState.isAdminRole() && pendingOrdersCount > 0) {
            <span class="nav-count-badge" title="Kutilayotgan (Pending) buyurtmalar">{{ pendingOrdersCount }}</span>
          }
        </a>
      }

      @if (authState.isCurier()) {
        <a
          routerLink="/curier/dashboard"
          routerLinkActive="active"
          [class]="isMobile ? 'mobile-nav-link' : 'nav-link'"
          (click)="closeMobileMenu()"
        >
          🛵 Kuryer kabineti
        </a>
        <a
          routerLink="/curier/deliveries"
          routerLinkActive="active"
          [class]="isMobile ? 'mobile-nav-link' : 'nav-link'"
          (click)="closeMobileMenu()"
        >
          📦 Yetkazmalarim
        </a>
      }

      @if (authState.isCompanyAdmin() && authState.userCompanyId()) {
        <a
          [routerLink]="['/companies', authState.userCompanyId()]"
          routerLinkActive="active"
          [class]="isMobile ? 'mobile-nav-link' : 'nav-link'"
          (click)="closeMobileMenu()"
        >
          Mening Kompaniyam
        </a>
      }

      @if (authState.isAdminRole()) {
        <a
          routerLink="/admin/payments"
          routerLinkActive="active"
          [class]="isMobile ? 'mobile-nav-link' : 'nav-link'"
          (click)="closeMobileMenu()"
        >
          <span>💳 To'lovlar</span>
          @if (pendingPaymentsCount > 0) {
            <span class="nav-count-badge" title="Tasdiqlanmagan cheklar">{{ pendingPaymentsCount }}</span>
          }
        </a>
        <a
          routerLink="/admin/curiers"
          routerLinkActive="active"
          [class]="isMobile ? 'mobile-nav-link' : 'nav-link'"
          (click)="closeMobileMenu()"
        >
          🛵 Kuryerlar
        </a>
      }

      @if (authState.isSuperAdmin() || authState.userRole() === 'BranchManager') {
        <a
          routerLink="/admin/cash"
          routerLinkActive="active"
          [class]="isMobile ? 'mobile-nav-link' : 'nav-link'"
          (click)="closeMobileMenu()"
        >
          💵 Naqd pul
        </a>
      }
    </ng-template>
  `,
  styles: [`
    .navbar-wrapper {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
    }

    .main-nav {
      padding: 0.75rem 1rem 0.75rem 1.25rem;
    }

    .nav-container {
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    /* Brand Logo */
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      text-decoration: none;
      flex-shrink: 0;
    }

    .logo-icon {
      font-size: 1.6rem;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
    }

    .logo-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }

    .brand-name strong {
      color: #4f46e5;
      font-weight: 900;
    }

    .brand-tag {
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: #64748b;
      margin-top: 2px;
    }

    /* Nav Links */
    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-wrap: nowrap;
      min-width: 0;
    }

    .nav-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.48rem 0.72rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: #475569;
      text-decoration: none;
      border-radius: 8px;
      white-space: nowrap;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .nav-count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 5px;
      border-radius: 9999px;
      background: #ef4444;
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 800;
      line-height: 1;
    }

    .nav-link:hover {
      color: #4f46e5;
      background-color: #f1f5f9;
    }

    .nav-link.active {
      color: #4f46e5;
      background-color: #eef2ff;
      font-weight: 700;
    }

    /* Nav Actions */
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .hamburger-btn {
      display: none;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      border: 1px solid var(--border, #e2e8f0);
      background: var(--bg-subtle, #f1f5f9);
      color: var(--text-primary, #0f172a);
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .hamburger-btn:hover {
      background: #eef2ff;
      border-color: #6366f1;
      color: #4f46e5;
    }

    .hamburger-icon {
      width: 20px;
      height: 20px;
    }

    .mobile-nav-drawer {
      display: none;
    }

    /* Theme Toggle Button */
    .theme-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: var(--bg-subtle, #f1f5f9);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .theme-toggle-btn:hover {
      background: #eef2ff;
      border-color: #6366f1;
    }

    .theme-icon {
      width: 20px;
      height: 20px;
      color: #64748b;
    }

    .theme-toggle-btn:hover .theme-icon {
      color: #6366f1;
    }

    /* Cart Button */
    .cart-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #4f46e5;
      color: #ffffff;
      padding: 0.55rem 1.1rem;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 0.875rem;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .cart-pill-btn:hover {
      background: #4338ca;
      box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
      transform: translateY(-1px);
    }

    .cart-icon {
      font-size: 1rem;
    }

    .cart-title {
      font-weight: 700;
    }

    .cart-badge {
      background: #ffffff;
      color: #4f46e5;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.1rem 0.5rem;
      border-radius: 9999px;
      line-height: 1.2;
    }

    .cart-pill-btn.active {
      outline: 2px solid #818cf8;
      outline-offset: 2px;
    }

    /* Profile Link */
    .profile-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem 0.375rem 0.375rem;
      background: var(--bg-subtle, #f1f5f9);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 9999px;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .profile-link:hover {
      background: #eef2ff;
      border-color: #6366f1;
    }

    .profile-link.active {
      background: #eef2ff;
      border-color: #6366f1;
    }

    .profile-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 50%;
      text-transform: uppercase;
      overflow: hidden;
      flex-shrink: 0;
    }

    .profile-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .profile-text {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
    }

    .profile-link.active .profile-text {
      color: #4f46e5;
    }

    /* Auth Buttons */
    .auth-buttons {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 8px;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
    }

    .btn-sm {
      padding: 0.4rem 0.875rem;
      font-size: 0.8125rem;
    }

    .btn-primary {
      background: #4f46e5;
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #4338ca;
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #e2e8f0;
    }

    .btn-secondary:hover {
      background: #e2e8f0;
    }

    /* Dark theme */
    :host-context(body.dark-theme) .navbar-wrapper {
      background: #0f172a;
      border-bottom-color: #1e293b;
    }

    :host-context(body.dark-theme) .brand-name {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .logo-icon {
      background: #1e1b4b;
      border-color: #3730a3;
    }

    :host-context(body.dark-theme) .nav-link {
      color: #cbd5e1;
    }

    :host-context(body.dark-theme) .nav-link:hover {
      background: #1e293b;
      color: #818cf8;
    }

    :host-context(body.dark-theme) .nav-link.active {
      background: #1e1b4b;
      color: #a5b4fc;
    }

    :host-context(body.dark-theme) .theme-toggle-btn {
      background: #1e293b;
      border-color: #334155;
    }

    :host-context(body.dark-theme) .theme-toggle-btn:hover {
      background: #334155;
      border-color: #6366f1;
    }

    :host-context(body.dark-theme) .theme-icon {
      color: #fbbf24;
    }

    :host-context(body.dark-theme) .profile-link {
      background: #1e293b;
      border-color: #334155;
    }

    :host-context(body.dark-theme) .profile-link:hover,
    :host-context(body.dark-theme) .profile-link.active {
      background: #312e81;
      border-color: #6366f1;
    }

    :host-context(body.dark-theme) .profile-text {
      color: #e2e8f0;
    }

    :host-context(body.dark-theme) .profile-link.active .profile-text {
      color: #a5b4fc;
    }

    :host-context(body.dark-theme) .btn-secondary {
      background: #1e293b;
      border-color: #334155;
      color: #e2e8f0;
    }

    :host-context(body.dark-theme) .btn-secondary:hover {
      background: #334155;
    }

    :host-context(body.dark-theme) .hamburger-btn {
      background: #1e293b;
      border-color: #334155;
      color: #e2e8f0;
    }

    :host-context(body.dark-theme) .mobile-nav-drawer {
      background: #0f172a;
      border-top-color: #1e293b;
    }

    :host-context(body.dark-theme) .mobile-nav-link {
      color: #cbd5e1;
      background: #1e293b;
    }

    :host-context(body.dark-theme) .mobile-nav-link.active {
      background: #1e1b4b;
      color: #a5b4fc;
    }

    /* Tablet / Mobile Responsive -> Hamburger Menyuga O'tish */
    @media (max-width: 1024px) {
      .main-nav {
        padding: 0.55rem 0.75rem;
      }

      .nav-container {
        gap: 0.5rem;
      }

      .brand-logo {
        gap: 0.4rem;
      }

      .logo-icon {
        width: 36px;
        height: 36px;
        font-size: 1.3rem;
        border-radius: 8px;
      }

      .brand-name {
        font-size: 1.15rem;
      }

      .brand-tag {
        display: none;
      }

      .nav-links {
        display: none;
      }

      .hamburger-btn {
        display: inline-flex;
      }

      .nav-actions {
        gap: 0.4rem;
      }

      .theme-toggle-btn {
        width: 36px;
        height: 36px;
      }

      .theme-icon {
        width: 18px;
        height: 18px;
      }

      .cart-pill-btn {
        padding: 0.4rem 0.65rem;
        gap: 0.35rem;
      }

      .cart-title {
        display: none;
      }

      .cart-badge {
        padding: 0.1rem 0.4rem;
        font-size: 0.7rem;
      }

      .profile-link {
        padding: 0.25rem;
        background: transparent;
        border: none;
      }

      .profile-link:hover,
      .profile-link.active {
        background: transparent;
        border: none;
      }

      .profile-avatar {
        width: 36px;
        height: 36px;
        font-size: 0.8125rem;
      }

      .profile-text {
        display: none;
      }

      .auth-buttons {
        gap: 0.35rem;
      }

      .auth-buttons .btn {
        padding: 0.35rem 0.65rem;
        font-size: 0.75rem;
        white-space: nowrap;
      }

      .mobile-nav-drawer {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        margin-top: 0.6rem;
        padding-top: 0.65rem;
        border-top: 1px solid #e2e8f0;
      }

      .mobile-nav-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.65rem 0.85rem;
        border-radius: 10px;
        background: #f8fafc;
        color: #334155;
        font-size: 0.9rem;
        font-weight: 600;
        text-decoration: none;
        white-space: nowrap;
      }

      .mobile-nav-link.active {
        background: #eef2ff;
        color: #4f46e5;
        font-weight: 700;
      }
    }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  cartService = inject(CartService);
  authState = inject(AuthStateService);
  curierService = inject(CurierService);
  private orderService = inject(OrderService);
  private paymentService = inject(PaymentService);
  private userNotification = inject(UserNotificationService);
  themeService = inject(ThemeService);
  private router = inject(Router);

  avatarBroken = false;
  mobileMenuOpen = false;
  pendingOrdersCount = 0;
  pendingPaymentsCount = 0;

  private sub = new Subscription();
  private lastBadgeFetchAt = 0;

  constructor() {
    effect(() => {
      this.curierService.myProfile()?.profilePictureUrl;
      this.avatarBroken = false;
    });

    effect(() => {
      const isAuth = this.authState.isAuthenticated();
      const role = this.authState.userRole();
      // Yangi bildirishnoma kelganda ham admin nishonlari yangilansin
      this.userNotification.unreadCount();

      if (isAuth && role && this.authState.isAdminRole()) {
        this.loadAdminBadges();
      } else {
        this.pendingOrdersCount = 0;
        this.pendingPaymentsCount = 0;
      }
    });
  }

  get showProductsInNavbar(): boolean {
    if (this.authState.isCurier()) return false;
    // BranchAdmin mahsulotlarni boshqarmaydi (ProductController da ruxsat yo'q) -> Profil menyusiga ko'chirildi
    if (this.authState.userRole() === 'BranchAdmin') return false;
    return true;
  }

  get profilePictureUrl(): string {
    if (!this.authState.isCurier()) return '';
    return this.curierService.myProfile()?.profilePictureUrl?.trim() || '';
  }

  get userInitials(): string {
    const name = this.authState.userName() || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase() || 'U';
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleMobileMenu(event: Event): void {
    event.stopPropagation();
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.mobileMenuOpen) {
      this.mobileMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.mobileMenuOpen = false;
  }

  ngOnInit(): void {
    this.sub.add(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
        this.mobileMenuOpen = false;
        if (this.authState.isAuthenticated() && this.authState.isAdminRole()) {
          this.loadAdminBadges();
        }
      })
    );

    if (this.authState.isAuthenticated() && this.authState.canUseCart()) {
      const userId = this.authState.currentCustomerId();
      if (userId > 0) {
        this.cartService.getByCustomerId(userId).subscribe({ error: () => {} });
      }
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private loadAdminBadges(): void {
    const now = Date.now();
    if (now - this.lastBadgeFetchAt < 500) return;
    this.lastBadgeFetchAt = now;

    const role = this.authState.userRole();
    const branchId = (role === 'BranchManager' || role === 'BranchAdmin')
      ? (this.authState.userBranchId() || undefined)
      : undefined;

    // 1. Tasdiqlanmagan cheklar soni (Cash to'lovlarda chek yo'q)
    this.paymentService.getAllPayments(PaymentStatus.Pending, branchId).pipe(
      catchError(() => of([]))
    ).subscribe(payments => {
      this.pendingPaymentsCount = (payments || []).filter(p => p.paymentMethod !== 'Cash').length;
    });

    // 2. Pending buyurtmalar soni
    // TODO: OrderController.cs (GetAll / GetOrdersByBranchId) ga BranchAdmin roli qo'shilmagani sababli
    // BranchAdmin uchun 403 bermaslik maqsadida Pending buyurtmalar soni so'rovi hozircha faqat
    // SuperAdmin, CompanyAdmin va BranchManager uchun yuboriladi.
    if (role === 'SuperAdmin' || role === 'CompanyAdmin' || role === 'BranchManager') {
      this.orderService.getAllPaged({
        pageNumber: 1,
        pageSize: 1,
        filters: { status: 'Pending' }
      }).pipe(
        catchError(() => of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 1, totalPages: 0, hasPreviousPage: false, hasNextPage: false }))
      ).subscribe(res => {
        this.pendingOrdersCount = res?.totalCount || 0;
      });
    } else {
      this.pendingOrdersCount = 0;
    }
  }
}
