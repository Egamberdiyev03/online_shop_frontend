import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { TelegramService } from '../../core/services/telegram.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="bottom-nav">
      <a routerLink="/products" routerLinkActive="active" class="nav-item" (click)="onNavClick()">
        <span class="nav-icon">🏠</span>
        <span class="nav-label">Bosh sahifa</span>
      </a>

      <a routerLink="/categories" routerLinkActive="active" class="nav-item" (click)="onNavClick()" *ngIf="authState.isSuperAdmin()">
        <span class="nav-icon">📂</span>
        <span class="nav-label">Kategoriyalar</span>
      </a>

      <a routerLink="/orders" routerLinkActive="active" class="nav-item" (click)="onNavClick()">
        <span class="nav-icon">📋</span>
        <span class="nav-label">Buyurtmalar</span>
      </a>

      <!-- Savat - faqat mijozlar uchun -->
      <a
        *ngIf="authState.canUseCart()"
        routerLink="/cart"
        routerLinkActive="active"
        class="nav-item cart-item"
        (click)="onNavClick()"
      >
        <span class="nav-icon">🛒</span>
        <span class="cart-badge" *ngIf="cartService.cartCount() > 0">{{ cartService.cartCount() }}</span>
        <span class="nav-label">Savat</span>
      </a>

      <!-- Admin panel - admin rollar uchun -->
      <a
        *ngIf="authState.isAdminRole()"
        routerLink="/admin"
        routerLinkActive="active"
        class="nav-item"
        (click)="onNavClick()"
      >
        <span class="nav-icon">⚙️</span>
        <span class="nav-label">Admin</span>
      </a>

      <a
        routerLink="/profile"
        routerLinkActive="active"
        #profileLink="routerLinkActive"
        [attr.aria-current]="profileLink.isActive ? 'page' : null"
        class="nav-item"
        (click)="onNavClick()"
        *ngIf="authState.isAuthenticated()"
      >
        <span class="nav-icon">👤</span>
        <span class="nav-label">Profil</span>
      </a>

      <a routerLink="/login" routerLinkActive="active" class="nav-item" (click)="onNavClick()" *ngIf="!authState.isAuthenticated()">
        <span class="nav-icon">🔐</span>
        <span class="nav-label">Kirish</span>
      </a>
    </nav>
  `,
  styles: [`
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: calc(60px + env(safe-area-inset-bottom, 0px));
      padding-bottom: env(safe-area-inset-bottom, 0px);
      background: var(--tg-bg, #ffffff);
      border-top: 1px solid var(--tg-hint, #e2e8f0);
      display: flex;
      justify-content: space-around;
      align-items: flex-start;
      z-index: 1000;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
    }

    :host-context(body.dark-theme) .bottom-nav {
      background: var(--tg-bg, #0f172a);
      border-top-color: var(--tg-hint, #1e293b);
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      min-width: 64px;
      height: 60px;
      text-decoration: none;
      color: var(--tg-hint, #64748b);
      transition: all 0.2s ease;
      position: relative;
      -webkit-tap-highlight-color: transparent;
    }

    .nav-item:active {
      transform: scale(0.92);
    }

    .nav-item.active {
      color: var(--tg-button, #4f46e5);
    }

    .nav-item.active .nav-icon {
      transform: scale(1.1);
    }

    .nav-icon {
      font-size: 1.4rem;
      line-height: 1;
      margin-bottom: 4px;
      transition: transform 0.2s ease;
    }

    .nav-label {
      font-size: 0.65rem;
      font-weight: 600;
      letter-spacing: 0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 60px;
    }

    .cart-item {
      position: relative;
    }

    .cart-badge {
      position: absolute;
      top: 4px;
      right: 8px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      background: var(--tg-destructive, #ef4444);
      color: #ffffff;
      font-size: 0.65rem;
      font-weight: 700;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    /* iOS safe area */
    @supports (padding-bottom: env(safe-area-inset-bottom)) {
      .bottom-nav {
        padding-bottom: env(safe-area-inset-bottom);
      }
    }

    /* Android notch support */
    @media (display-mode: standalone) {
      .bottom-nav {
        padding-bottom: max(env(safe-area-inset-bottom, 0px), 8px);
      }
    }
  `]
})
export class BottomNavComponent {
  cartService = inject(CartService);
  authState = inject(AuthStateService);
  private tg = inject(TelegramService);
  private router = inject(Router);

  onNavClick(): void {
    this.tg.hapticImpact('light');
  }
}
