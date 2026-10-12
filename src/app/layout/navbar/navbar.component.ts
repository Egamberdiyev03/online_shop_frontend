import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../core/services/cart.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <header class="navbar-wrapper">
      <!-- Top Announcement & Auth Bar (Matching 'OnlineShop — Admin rejimi.md') -->
      <div class="top-bar">
        <div class="top-bar-inner">
          <div class="top-announcement">
            <span class="pulse-dot"></span>
            <span>🛍️ OnlineShop &middot; Zamonaviy Clean Architecture E-Commerce Platformasi</span>
          </div>

          <div class="top-actions">
            <!-- Tizimga kirgan foydalanuvchi -->
            <ng-container *ngIf="authState.isAuthenticated(); else guestView">
              <div class="user-profile-section">
                <!-- Role Badge: SUPERADMIN / COMPANYADMIN / MIJOZ -->
                <span class="user-role-badge" [ngClass]="(authState.userRole() || '').toLowerCase()">
                  {{ authState.userRole()?.toUpperCase() || 'MIJOZ' }}
                </span>

                <!-- Salom, Foydalanuvchi -->
                <a routerLink="/profile" class="user-badge-link" title="Profil sahifasiga o'tish">
                  <span class="user-name">Salom, <strong>{{ authState.userName() }}</strong></span>
                </a>

                <!-- → Chiqish tugmasi -->
                <button class="logout-btn" (click)="openLogoutConfirmModal()" title="Tizimdan chiqish">
                  &rarr; Chiqish
                </button>
              </div>
            </ng-container>

            <!-- Mehmon (Guest) uchun -->
            <ng-template #guestView>
              <div class="auth-section">
                <a routerLink="/login" class="top-auth-link">🔐 Kirish</a>
                <span class="top-divider">|</span>
                <a routerLink="/register" class="top-auth-link">👤 Ro'yxatdan o'tish</a>
              </div>
            </ng-template>
          </div>
        </div>
      </div>

      <!-- Main Navigation Bar -->
      <nav class="main-nav">
        <div class="nav-container">
          <!-- Brand Logo: OnlineShop -->
          <a routerLink="/" class="brand-logo">
            <div class="logo-icon">🛍️</div>
            <div class="logo-text">
              <span class="brand-name">Online<strong>Shop</strong></span>
              <span class="brand-tag">E-COMMERCE</span>
            </div>
          </a>

          <!-- Main Nav Links -->
          <div class="nav-links">
            <a routerLink="/products" routerLinkActive="active" class="nav-link">
              Mahsulotlar
            </a>

            <!-- Kompaniyalar faqat SuperAdmin uchun ko'rinadi -->
            <a *ngIf="authState.isSuperAdmin()" routerLink="/companies" routerLinkActive="active" class="nav-link">
              Kompaniyalar
            </a>

            <!-- Kategoriyalar faqat SuperAdmin uchun ko'rinadi -->
            <a *ngIf="authState.isSuperAdmin()" routerLink="/categories" routerLinkActive="active" class="nav-link">
              Kategoriyalar
            </a>

            <!-- Buyurtmalar - barcha foydalanuvchilar uchun -->
            <a routerLink="/orders" routerLinkActive="active" class="nav-link">
              Buyurtmalar
            </a>

            <!-- To'lovlarim - faqat mijozlar uchun -->
            <a
              *ngIf="authState.isAuthenticated() && !authState.isAdminRole()"
              routerLink="/payments"
              routerLinkActive="active"
              class="nav-link"
            >
              To‘lovlarim
            </a>

            <!-- Xarita - barcha foydalanuvchilar uchun -->
            <a routerLink="/map" routerLinkActive="active" class="nav-link">
              Xarita
            </a>

            <!-- CompanyAdmin uchun o'z kompaniyasiga havola -->
            <a
              *ngIf="authState.isCompanyAdmin() && authState.userCompanyId()"
              [routerLink]="['/companies', authState.userCompanyId()]"
              routerLinkActive="active"
              class="nav-link"
            >
              Mening Kompaniyam
            </a>

            <!-- BranchManager uchun o'z filialiga havola -->
            <a
              *ngIf="authState.isBranchManager() && authState.userBranchId()"
              [routerLink]="['/branches', authState.userBranchId()]"
              routerLinkActive="active"
              class="nav-link"
            >
              Mening Filialim
            </a>

            <!-- To'lovlar - barcha admin rollari uchun -->
            <a
              *ngIf="authState.isAdminRole()"
              routerLink="/admin/payments"
              routerLinkActive="active"
              class="nav-link"
            >
              💳 To‘lovlar
            </a>

            <!-- Admin Panel - barcha admin rollari uchun -->
            <a
              *ngIf="authState.isAdminRole()"
              routerLink="/admin"
              routerLinkActive="active"
              class="nav-link admin-pill"
            >
              ⚙️ Admin Panel
            </a>
          </div>

          <!-- Right Action: Cart & Theme Toggle -->
          <div class="nav-actions">
            <!-- Kun / Tun (Theme toggle) button -->
            <button 
              type="button"
              class="theme-toggle-btn"
              (click)="themeService.toggleTheme()"
              [attr.aria-label]="themeTooltip"
              [title]="themeTooltip"
            >
              <span class="theme-icon">{{ themeModeIcon }}</span>
              <span class="theme-text">{{ themeModeText }}</span>
            </button>

            <!-- Savat faqat Customer (oddiy mijoz) uchun ko'rinadi, admin rollariga yashirin -->
            <a
              *ngIf="authState.canUseCart()"
              routerLink="/cart"
              class="cart-pill-btn"
              routerLinkActive="active"
              title="Savatcha"
            >
              <span class="cart-icon">🛒</span>
              <span class="cart-title">Savat</span>
              <span class="cart-badge">{{ cartService.cartCount() }}</span>
            </a>
          </div>
        </div>
      </nav>

      <!-- Confirmation Modal (Matching 'OnlineShop — Admin rejimi.md' ### Tasdiqlang) -->
      <div class="modal-overlay" *ngIf="showConfirmModal" (click)="closeConfirmModal()">
        <div class="modal-content confirm-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Tasdiqlang</h3>
            <button class="modal-close" (click)="closeConfirmModal()">&times;</button>
          </div>

          <div class="modal-body">
            <p class="confirm-message">{{ confirmMessage }}</p>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeConfirmModal()">
              Bekor qilish
            </button>
            <button type="button" class="btn btn-primary" (click)="confirmAction()">
              Tasdiqlash
            </button>
          </div>
        </div>
      </div>
    </header>
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

    /* Top Utility Bar */
    .top-bar {
      background: #0f172a;
      color: #94a3b8;
      font-size: 0.75rem;
      padding: 0.4rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .top-bar-inner {
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .top-announcement {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #cbd5e1;
      font-weight: 500;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .top-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .auth-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .top-auth-link {
      color: #cbd5e1;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
    }
    .top-auth-link:hover {
      color: #ffffff;
    }
    .top-divider {
      color: #475569;
    }

    .user-profile-section {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }
    .top-dashboard-link {
      background: #0284c7;
      color: #ffffff;
      padding: 0.25rem 0.65rem;
      border-radius: 5px;
      font-size: 0.75rem;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .top-dashboard-link:hover {
      background: #0369a1;
    }

    .admin-mode-toggle-btn {
      background: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      padding: 0.2rem 0.6rem;
      border-radius: 5px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.2s;
    }
    .admin-mode-toggle-btn:hover {
      background: #334155;
    }
    .admin-mode-toggle-btn.active {
      border-color: #6366f1;
      background: #1e1b4b;
      color: #c7d2fe;
    }
    .mode-state-pill {
      font-size: 0.65rem;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      background: #475569;
      color: #ffffff;
      font-weight: 700;
    }
    .mode-state-pill.on {
      background: #10b981;
    }

    .user-badge-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #f1f5f9;
      text-decoration: none;
      font-size: 0.8rem;
    }
    .user-role-badge {
      background: #334155;
      color: #93c5fd;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .user-role-badge.superadmin {
      background: #dc2626;
      color: #ffffff;
    }
    .user-role-badge.companyadmin {
      background: #ea580c;
      color: #ffffff;
    }
    .user-role-badge.branchmanager {
      background: #f59e0b;
      color: #0f172a;
    }

    .logout-btn {
      background: #ef4444;
      color: #ffffff;
      padding: 0.25rem 0.65rem;
      border-radius: 5px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: background 0.2s;
    }
    .logout-btn:hover {
      background: #dc2626;
    }

    /* Main Nav */
    .main-nav {
      padding: 0.75rem 1.25rem;
    }
    .nav-container {
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }

    /* Brand Logo */
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      text-decoration: none;
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
      gap: 0.35rem;
    }
    .nav-link {
      padding: 0.55rem 0.95rem;
      font-size: 0.925rem;
      font-weight: 600;
      color: #475569;
      text-decoration: none;
      border-radius: 8px;
      transition: all 0.2s ease;
      position: relative;
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
    .admin-pill {
      background-color: #f8fafc;
      color: #334155;
      border: 1px solid #e2e8f0;
    }
    .admin-pill:hover {
      background-color: #0f172a;
      color: #ffffff;
    }

    /* Cart Pill Button & Theme Toggle */
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .theme-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 0.45rem 0.8rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
    }
    .theme-toggle-btn:hover {
      background: #e2e8f0;
      border-color: #94a3b8;
      transform: translateY(-1px);
    }
    .theme-icon {
      font-size: 0.95rem;
      line-height: 1;
    }
    .theme-text {
      font-size: 0.775rem;
      letter-spacing: 0.02em;
    }
    :host-context(body.dark-theme) .theme-toggle-btn,
    :host-context(.dark-theme) .theme-toggle-btn {
      background: #1e293b;
      color: #f8fafc;
      border-color: #475569;
    }
    :host-context(body.dark-theme) .theme-toggle-btn:hover,
    :host-context(.dark-theme) .theme-toggle-btn:hover {
      background: #334155;
      border-color: #64748b;
    }
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

    /* Confirmation Modal (### Tasdiqlang) */
    .confirm-modal {
      max-width: 440px;
    }
    .confirm-message {
      font-size: 1rem;
      color: #334155;
      line-height: 1.6;
      margin: 0;
    }

    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
    }
    .modal-content {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      animation: modalSlide 0.2s ease-out;
    }
    @keyframes modalSlide {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
    }
    .modal-close {
      color: #94a3b8;
      font-size: 1.4rem;
      background: none;
      border: none;
      cursor: pointer;
    }
    .modal-close:hover {
      color: #0f172a;
    }
    .modal-body {
      padding: 1.5rem;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
    }

    /* Dark theme overrides for confirmation modal */
    :host-context(body.dark-theme) .modal-content,
    :host-context(.dark-theme) .modal-content {
      background: #151e32;
      border: 1px solid #22304d;
      color: #f8fafc;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    }
    :host-context(body.dark-theme) .modal-header,
    :host-context(.dark-theme) .modal-header {
      border-bottom: 1px solid #22304d;
      background: #0f172a;
    }
    :host-context(body.dark-theme) .modal-title,
    :host-context(.dark-theme) .modal-title {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .confirm-message,
    :host-context(.dark-theme) .confirm-message {
      color: #e2e8f0;
    }
    :host-context(body.dark-theme) .modal-close,
    :host-context(.dark-theme) .modal-close {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .modal-close:hover,
    :host-context(.dark-theme) .modal-close:hover {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .modal-footer,
    :host-context(.dark-theme) .modal-footer {
      border-top: 1px solid #22304d;
      background: #0f172a;
    }

    @media (max-width: 860px) {
      .top-announcement { display: none; }
      .nav-links { gap: 0.15rem; }
      .nav-link { padding: 0.45rem 0.65rem; font-size: 0.825rem; }
      .brand-name { font-size: 1.15rem; }
    }
  `]
})
export class NavbarComponent implements OnInit {
  cartService = inject(CartService);
  authState = inject(AuthStateService);
  themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private router = inject(Router);

  showConfirmModal = false;
  confirmMessage = '';
  pendingAction: 'logout' | null = null;

  get themeTooltip(): string {
    return this.themeService.isDarkMode() ? "Kunduzgi rejimga o'tish" : "Tungi rejimga o'tish";
  }

  get themeModeIcon(): string {
    return this.themeService.isDarkMode() ? '☀️' : '🌙';
  }

  get themeModeText(): string {
    return this.themeService.isDarkMode() ? 'Kun' : 'Tun';
  }

  openLogoutConfirmModal(): void {
    this.confirmMessage = "Haqiqatan ham hisobingizdan chiqmoqchimisiz?";
    this.pendingAction = 'logout';
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.pendingAction = null;
  }

  confirmAction(): void {
    if (this.pendingAction === 'logout') {
      this.closeConfirmModal();
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }

  ngOnInit(): void {
    if (this.authState.isAuthenticated() && !this.authState.isAdminRole()) {
      const userId = this.authState.currentCustomerId();
      if (userId > 0) {
        this.cartService.getByCustomerId(userId).subscribe({ error: () => {} });
      }
    }
  }
}
