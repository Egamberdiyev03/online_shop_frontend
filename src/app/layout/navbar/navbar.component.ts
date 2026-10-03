import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../core/services/cart.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { AuthService } from '../../core/services/auth.service';
import { CustomerService } from '../../core/services/customer.service';
import { Customer } from '../../core/models/customer.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <header class="navbar-wrapper">
      <div class="top-bar">
        <div class="top-bar-inner">
          <div class="top-announcement">
            <span>&#128640; OnlineShop &#128187; Zamonaviy Clean Architecture E-Commerce Platformasi</span>
          </div>

          <div class="top-actions">
            <!-- 1. Tizimga kirish / Chiqish qismi (AUTH) -->
            <ng-container *ngIf="authState.isAuthenticated(); else guestView">
              <div class="user-profile-section">
                <a routerLink="/profile" class="user-badge-link" title="Profil sahifasiga o'tish">
                  <span class="user-role-badge" [ngClass]="(authState.userRole() || '').toLowerCase()">
                    {{ authState.userRole() || 'Mijoz' }}
                  </span>
                  <span class="user-name">Salom, <strong>{{ authState.userName() }}</strong></span>
                </a>

                <button class="logout-btn" (click)="onLogout()" title="Tizimdan chiqish">
                  &#10142; Chiqish
                </button>
              </div>
            </ng-container>

            <ng-template #guestView>
              <div class="auth-section">
                <a routerLink="/login" class="top-auth-link">&#128272; Kirish</a>
                <span class="top-divider">|</span>
                <a routerLink="/register" class="top-auth-link">&#128100; Ro'yxatdan o'tish</a>
              </div>
            </ng-template>

            <!-- 2. Simulyatsiya (Mijoz tanlash) - Faqat tizimga kirmagan (mehmon) holatda test qilish uchun ko'rsatiladi -->
            <div class="customer-picker" *ngIf="!authState.isAuthenticated()">
              <span class="picker-label">Test Mijoz:</span>
              <select 
                class="customer-select" 
                [ngModel]="authState.currentCustomerId()" 
                (ngModelChange)="onCustomerChange($event)"
              >
                <option *ngFor="let c of customers" [value]="c.id">
                  #{{ c.id }} - {{ c.name }}
                </option>
                <option *ngIf="customers.length === 0" [value]="authState.currentCustomerId()">
                  Mijoz #{{ authState.currentCustomerId() }}
                </option>
              </select>
            </div>

            <!-- 3. Admin Rejimi tugmasi (Oddiy mijozga kerak emas) -->
            <button 
              *ngIf="!authState.isAuthenticated() || authState.isAdminRole()"
              class="admin-toggle-btn" 
              [class.active]="authState.isAdminMode()"
              (click)="authState.toggleAdminMode()"
              title="Admin rejimini yoqish/o'chirish"
            >
              {{ authState.isAdminMode() ? '&#9881; Admin Rejimi' : '&#128100; Mijoz Rejimi' }}
            </button>

            <!-- 4. Boshqaruv paneli havolasi (faqat adminlar uchun) -->
            <a 
              *ngIf="authState.isAdminMode() && (!authState.isAuthenticated() || authState.isAdminRole())"
              routerLink="/admin" 
              class="top-dashboard-link"
              title="Boshqaruv paneliga o'tish"
            >
              &#9881; Boshqaruv Paneli
            </a>
          </div>
        </div>
      </div>

      <nav class="main-nav">
        <div class="nav-container">
          <a routerLink="/" class="brand-logo">
            <div class="logo-icon">&#128717;</div>
            <div class="logo-text">
              <span class="brand-name">Online<span>Shop</span></span>
              <span class="brand-tag">E-Commerce</span>
            </div>
          </a>

          <div class="nav-links">
            <a routerLink="/products" routerLinkActive="active" class="nav-link">
              Mahsulotlar
            </a>
            <a routerLink="/companies" routerLinkActive="active" class="nav-link">
              Kompaniyalar
            </a>
            <a routerLink="/categories" routerLinkActive="active" class="nav-link">
              Kategoriyalar
            </a>
            <a routerLink="/orders" routerLinkActive="active" class="nav-link">
              Buyurtmalar
            </a>
            
            <!-- ADMIN PANELLAR (Faqat Boshqaruv Rejimida ko'rinadi) -->
            <a *ngIf="authState.isAdminMode() && (!authState.isAuthenticated() || authState.isAdminRole())" routerLink="/admin" routerLinkActive="active" class="nav-link admin-btn">
              &#9881; Boshqaruv Paneli
            </a>
          </div>

          <div class="nav-actions" *ngIf="authState.canUseCart()">
            <a routerLink="/cart" class="cart-btn" routerLinkActive="active">
              <span class="cart-icon">&#128722;</span>
              <span class="cart-label">Savat</span>
              <span class="cart-badge" *ngIf="cartService.cartCount() > 0">
                {{ cartService.cartCount() }}
              </span>
            </a>
          </div>
        </div>
      </nav>
    </header>
  `,
  styles: [`
    .navbar-wrapper {
      background: #ffffff;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: var(--shadow-sm);
    }
    .top-bar {
      background: #0f172a;
      color: #94a3b8;
      font-size: 0.75rem;
      padding: 0.375rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
      color: #cbd5e1;
      font-weight: 500;
    }
    .top-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .auth-section {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .top-auth-link {
      color: #cbd5e1;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.2s;
      font-size: 0.75rem;
    }
    .top-auth-link:hover {
      color: #ffffff;
      text-decoration: underline;
    }
    .top-divider {
      color: #475569;
    }
    .user-profile-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .user-badge-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: #f1f5f9;
      transition: opacity 0.2s;
    }
    .user-badge-link:hover {
      opacity: 0.9;
    }
    .user-name {
      font-size: 0.75rem;
    }
    .user-role-badge {
      background: #3b82f6;
      color: #ffffff;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .user-role-badge.superadmin { background: #ef4444; }
    .user-role-badge.companyadmin { background: #8b5cf6; }
    .user-role-badge.branchmanager { background: #f59e0b; }
    .user-role-badge.customer { background: #10b981; }

    .logout-btn {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .logout-btn:hover {
      background: #ef4444;
      color: #ffffff;
    }

    .customer-picker {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .picker-label {
      color: #94a3b8;
    }
    .customer-select {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
      border-radius: var(--radius-sm);
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      outline: none;
      cursor: pointer;
    }
    .admin-toggle-btn {
      background: #334155;
      color: #e2e8f0;
      padding: 0.25rem 0.625rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 600;
      transition: var(--transition);
      cursor: pointer;
      border: none;
    }
    .admin-toggle-btn.active {
      background: #2563eb;
      color: #ffffff;
    }
    .top-dashboard-link {
      background: #0ea5e9;
      color: #ffffff;
      padding: 0.25rem 0.625rem;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
      font-weight: 700;
      text-decoration: none;
      transition: var(--transition);
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .top-dashboard-link:hover {
      background: #0284c7;
      color: #ffffff;
    }
    .nav-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      text-decoration: none;
    }
    .logo-icon {
      font-size: 1.75rem;
      background: var(--primary-light);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-md);
    }
    .logo-text { display: flex; flex-direction: column; }
    .brand-name {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--secondary);
      letter-spacing: -0.02em;
    }
    .brand-name span {
      color: var(--primary);
    }
    .brand-tag {
      display: block;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-light);
      font-weight: 700;
      margin-top: -3px;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: auto;
    }
    .nav-link {
      padding: 0.5rem 0.875rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-muted);
      border-radius: var(--radius-md);
      transition: var(--transition);
      text-decoration: none;
    }
    .nav-link:hover {
      color: var(--primary);
      background-color: var(--primary-light);
    }
    .nav-link.active {
      color: var(--primary);
      background-color: var(--primary-light);
      font-weight: 700;
    }
    .admin-btn { background-color: #1e293b !important; color: #f8fafc !important; }
    .admin-btn:hover { background-color: #0f172a !important; }
    
    .cart-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background-color: var(--primary-light);
      border: 1px solid #bfdbfe;
      border-radius: var(--radius-full);
      font-weight: 700;
      font-size: 0.875rem;
      color: var(--primary-dark);
      transition: var(--transition);
      position: relative;
      text-decoration: none;
    }
    .cart-btn:hover {
      background-color: #dbeafe;
      transform: translateY(-1px);
    }
    .cart-badge {
      background-color: var(--danger);
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.125rem 0.45rem;
      border-radius: var(--radius-full);
      min-width: 1.25rem;
      text-align: center;
    }
  `]
})
export class NavbarComponent implements OnInit {
  cartService = inject(CartService);
  authState = inject(AuthStateService);
  private authService = inject(AuthService);
  private customerService = inject(CustomerService);
  private router = inject(Router);

  customers: Customer[] = [];


  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    this.loadCustomers();
    // Preload active customer's cart only if user can use cart
    if (this.authState.canUseCart()) {
      this.cartService.getByCustomerId(this.authState.currentCustomerId()).subscribe({ error: () => {} });
    }
  }

  loadCustomers(): void {
    this.customerService.getAll().subscribe({
      next: (list) => {
        this.customers = list;
        const current = list.find(c => c.id === this.authState.currentCustomerId());
        if (current) {
          this.authState.setCustomer(current);
        }
      },
      error: () => {}
    });
  }

  onCustomerChange(idStr: string | number): void {
    const id = Number(idStr);
    this.authState.setCustomerId(id);
    const found = this.customers.find(c => c.id === id);
    if (found) {
      this.authState.setCustomer(found);
    }
    // Refresh cart for new customer only if user can use cart
    if (this.authState.canUseCart()) {
      this.cartService.getByCustomerId(id).subscribe({ error: () => {} });
    }
  }
}
