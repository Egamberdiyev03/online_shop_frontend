import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../core/services/cart.service';
import { AuthStateService } from '../../core/services/auth-state.service';
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
            <span>✨ OnlineShop — Zamonaviy Clean Architecture E-Commerce Platformasi</span>
          </div>
          <div class="customer-picker">
            <span class="picker-label">Faol Mijoz:</span>
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

            <button 
              class="admin-toggle-btn" 
              [class.active]="authState.isAdminMode()"
              (click)="authState.toggleAdminMode()"
              title="Admin rejimini yoqish/o'chirish"
            >
              {{ authState.isAdminMode() ? '🛡 Admin Rejimi' : '👤 Mijoz Rejimi' }}
            </button>
          </div>
        </div>
      </div>

      <nav class="main-nav">
        <div class="nav-container">
          <a routerLink="/" class="brand-logo">
            <div class="logo-icon">🛍</div>
            <div class="logo-text">
              <span class="brand-name">Online<span>Shop</span></span>
              <span class="brand-tag">E-Commerce</span>
            </div>
          </a>

          <div class="nav-links">
            <a routerLink="/products" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
              Mahsulotlar
            </a>
            <a routerLink="/categories" routerLinkActive="active" class="nav-link">
              Kategoriyalar
            </a>
            <a routerLink="/companies" routerLinkActive="active" class="nav-link">
              Kompaniyalar
            </a>
            <a routerLink="/orders" routerLinkActive="active" class="nav-link">
              Buyurtmalar
            </a>
            <a routerLink="/customers" routerLinkActive="active" class="nav-link">
              Mijozlar
            </a>
            <a routerLink="/payments" routerLinkActive="active" class="nav-link placeholder-link" title="Backend kutilmoqda">
              To'lovlar (Mock)
            </a>
          </div>

          <div class="nav-actions">
            <a routerLink="/cart" class="cart-btn" routerLinkActive="active">
              <span class="cart-icon">🛒</span>
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
    }
    .admin-toggle-btn.active {
      background: #2563eb;
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
    }
    .nav-link {
      padding: 0.5rem 0.875rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-muted);
      border-radius: var(--radius-md);
      transition: var(--transition);
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
    .placeholder-link {
      font-style: italic;
      color: #94a3b8;
    }
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
  private customerService = inject(CustomerService);

  customers: Customer[] = [];

  ngOnInit(): void {
    this.loadCustomers();
    // Preload active customer's cart
    this.cartService.getByCustomerId(this.authState.currentCustomerId()).subscribe({ error: () => {} });
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
    // Refresh cart for new customer
    this.cartService.getByCustomerId(id).subscribe({ error: () => {} });
  }
}
