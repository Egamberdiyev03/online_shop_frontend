import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Cart, CartItem } from '../../../core/models/cart.model';
import { Product } from '../../../core/models/product.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { CartService } from '../../../core/services/cart.service';
import { ProductService } from '../../../core/services/product.service';
import { CompanyService } from '../../../core/services/company.service';
import { OrderService } from '../../../core/services/order.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

interface EnrichedCartItem extends CartItem {
  product?: Product;
}

@Component({
  selector: 'app-cart-view',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    LoadingSpinnerComponent, 
    EmptyStateComponent
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Sizning Savatingiz</h1>
          <p class="page-subtitle">Mijoz #{{ authState.currentCustomerId() }} uchun saqlangan mahsulotlar</p>
        </div>
      </div>

      <!-- Admin Notice if Admin visits Cart -->
      <div *ngIf="!authState.canUseCart()" class="card" style="text-align: center; padding: 3.5rem 1.5rem; margin-top: 1.5rem; background: white; border-radius: 12px;">
        <span style="font-size: 3.5rem; display: block; margin-bottom: 1rem;">&#128737;</span>
        <h2 style="font-size: 1.5rem; margin-bottom: 0.75rem; color: #1e293b;">Boshqaruvchi uchun savat mavjud emas</h2>
        <p style="color: #64748b; max-width: 520px; margin: 0 auto 1.5rem; line-height: 1.6; font-size: 0.95rem;">
          Siz tizimga <strong>{{ authState.userRole() || 'Admin' }}</strong> sifatida kirgansiz. Savat va buyurtma berish xizmati faqat mijozlar (xaridorlar) uchun mo'ljallangan.
        </p>
        <button class="btn btn-primary" (click)="goToProducts()">Mahsulotlar katalogiga qaytish</button>
      </div>

      <ng-container *ngIf="authState.canUseCart()">
        <app-loading-spinner *ngIf="isLoading" message="Savat ma'lumotlari yuklanmoqda..."></app-loading-spinner>

        <app-empty-state 
          *ngIf="!isLoading && enrichedItems.length === 0"
          icon="🛒"
          title="Savatingiz bo'sh"
          description="Hozircha hech qanday mahsulot savatga qo'shilmagan."
          actionText="Mahsulotlarni ko'rish"
          (actionClick)="goToProducts()"
        ></app-empty-state>

        <!-- Cart Content -->
        <div *ngIf="!isLoading && enrichedItems.length > 0" class="cart-layout">
        <!-- Items Table / List -->
        <div class="cart-items-card card">
          <div class="table-header">
            <span class="col-product">Mahsulot</span>
            <span class="col-price">Narx</span>
            <span class="col-qty">Miqdor</span>
            <span class="col-total">Jami</span>
            <span class="col-action"></span>
          </div>

          <div class="cart-item-row" *ngFor="let item of enrichedItems">
            <div class="product-cell">
              <div class="item-img-wrap">
                <img 
                  *ngIf="item.product?.image" 
                  [src]="item.product?.image" 
                  [alt]="item.product?.name"
                  (error)="item.product!.image = ''"
                />
                <div *ngIf="!item.product?.image" class="item-fallback">
                  {{ (item.product?.name || 'M').charAt(0).toUpperCase() }}
                </div>
              </div>
              <div class="item-info">
                <a [routerLink]="['/products', item.productId]" class="item-name">
                  {{ item.product?.name || ('Mahsulot #' + item.productId) }}
                </a>
                <span class="item-id">ID: #{{ item.productId }}</span>
              </div>
            </div>

            <div class="price-cell">
              {{ (item.product?.price || 0) | number:'1.0-0' }} so'm
            </div>

            <div class="qty-cell">
              <div class="qty-stepper">
                <button 
                  class="stepper-btn" 
                  [disabled]="item.quantity <= 1 || updatingProductId === item.productId"
                  (click)="updateQuantity(item, item.quantity - 1)"
                >-</button>
                <span class="stepper-val">{{ item.quantity }}</span>
                <button 
                  class="stepper-btn" 
                  [disabled]="updatingProductId === item.productId"
                  (click)="updateQuantity(item, item.quantity + 1)"
                >+</button>
              </div>
            </div>

            <div class="total-cell">
              {{ ((item.product?.price || 0) * item.quantity) | number:'1.0-0' }} so'm
            </div>

            <div class="action-cell">
              <button 
                class="remove-btn" 
                (click)="removeItem(item)"
                title="Savatdan o'chirish"
              >
                🗑
              </button>
            </div>
          </div>
        </div>

        <!-- Checkout Summary Card -->
        <div class="summary-card card">
          <h3 class="summary-title">Buyurtma Xulosasi</h3>

          <div class="summary-line">
            <span>Jami mahsulotlar:</span>
            <strong>{{ totalItemsCount }} ta</strong>
          </div>

          <div class="summary-line">
            <span>Yetkazib berish:</span>
            <span class="free-shipping">Bepul</span>
          </div>

          <div class="summary-divider"></div>

          <div class="summary-line total-line">
            <span>Umumiy Summa:</span>
            <span class="total-val">{{ totalPrice | number:'1.0-0' }} so'm</span>
          </div>

          <!-- Checkout Branch Selector Form -->
          <div class="checkout-form-box">
            <label class="form-label">Qaysi filialdan qabul qilasiz? *</label>
            <select class="form-control" [(ngModel)]="selectedBranchId">
              <option [ngValue]="null" disabled>Filialni tanlang</option>
              <option *ngFor="let branch of branches" [ngValue]="branch.id">
                {{ branch.name }} — {{ branch.address }}
              </option>
            </select>
          </div>

          <button 
            class="btn btn-primary btn-lg checkout-btn" 
            [disabled]="isPlacingOrder || !selectedBranchId"
            (click)="checkout()"
          >
            <span>🛍</span>
            <span>{{ isPlacingOrder ? 'Buyurtma rasmiylashtirilmoqda...' : 'Buyurtma berish' }}</span>
          </button>

          <p class="summary-note">
            ⚠️ Buyurtma berilgach, avtomatik ravishda buyurtmalar ro'yxatida ko'rinadi.
          </p>
        </div>
      </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .page-header {
      margin-bottom: 2rem;
    }
    .page-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--secondary);
    }
    .page-subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    .cart-layout {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 2rem;
      align-items: start;
    }
    @media (max-width: 900px) {
      .cart-layout {
        grid-template-columns: 1fr;
      }
    }
    .cart-items-card {
      overflow: hidden;
      padding: 0;
    }
    .table-header {
      display: flex;
      align-items: center;
      padding: 1rem 1.25rem;
      background: var(--bg-subtle);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
    }
    .col-product { flex: 3; }
    .col-price { flex: 1; text-align: right; }
    .col-qty { flex: 1.5; text-align: center; }
    .col-total { flex: 1.2; text-align: right; }
    .col-action { width: 40px; }

    .cart-item-row {
      display: flex;
      align-items: center;
      padding: 1.25rem;
      border-bottom: 1px solid var(--border);
      transition: background 0.15s ease;
    }
    .cart-item-row:last-child {
      border-bottom: none;
    }
    .cart-item-row:hover {
      background: #fafafa;
    }
    .product-cell {
      flex: 3;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .item-img-wrap {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-md);
      overflow: hidden;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border);
    }
    .item-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .item-fallback {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--primary);
    }
    .item-info {
      display: flex;
      flex-direction: column;
    }
    .item-name {
      font-weight: 700;
      color: var(--secondary);
      font-size: 0.9375rem;
    }
    .item-name:hover {
      color: var(--primary);
    }
    .item-id {
      font-size: 0.75rem;
      color: var(--text-light);
    }
    .price-cell {
      flex: 1;
      text-align: right;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .qty-cell {
      flex: 1.5;
      display: flex;
      justify-content: center;
    }
    .qty-stepper {
      display: flex;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: #ffffff;
      overflow: hidden;
    }
    .stepper-btn {
      width: 28px;
      height: 32px;
      background: var(--bg-subtle);
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stepper-btn:hover:not(:disabled) {
      background: #e2e8f0;
    }
    .stepper-val {
      width: 36px;
      text-align: center;
      font-size: 0.875rem;
      font-weight: 700;
    }
    .total-cell {
      flex: 1.2;
      text-align: right;
      font-weight: 800;
      color: var(--secondary);
      font-size: 0.9375rem;
    }
    .action-cell {
      width: 40px;
      text-align: right;
    }
    .remove-btn {
      color: var(--text-light);
      font-size: 1rem;
      padding: 0.375rem;
      border-radius: var(--radius-sm);
    }
    .remove-btn:hover {
      color: var(--danger);
      background: var(--danger-bg);
    }
    .summary-card {
      padding: 1.75rem;
      position: sticky;
      top: 5rem;
    }
    .summary-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--secondary);
      margin-bottom: 1.25rem;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: 0.875rem;
    }
    .free-shipping {
      color: var(--success);
      font-weight: 700;
    }
    .summary-divider {
      height: 1px;
      background: var(--border);
      margin: 1.25rem 0;
    }
    .total-line {
      font-size: 1.125rem;
      font-weight: 800;
      color: var(--secondary);
      margin-bottom: 1.5rem;
    }
    .total-val {
      color: var(--primary);
      font-size: 1.375rem;
    }
    .checkout-form-box {
      margin-bottom: 1.5rem;
    }
    .checkout-btn {
      width: 100%;
    }
    .summary-note {
      font-size: 0.75rem;
      color: var(--text-light);
      margin-top: 1rem;
      line-height: 1.4;
    }
  `]
})
export class CartViewComponent implements OnInit {
  private cartService = inject(CartService);
  private productService = inject(ProductService);
  private companyService = inject(CompanyService);
  private orderService = inject(OrderService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  rawCart: Cart | null = null;
  enrichedItems: EnrichedCartItem[] = [];
  branches: CompanyBranch[] = [];
  selectedBranchId: number | null = null;

  isLoading = true;
  updatingProductId: number | null = null;
  isPlacingOrder = false;

  ngOnInit(): void {
    this.loadCart();
    this.loadBranches();
  }

  loadCart(): void {
    if (!this.authState.canUseCart()) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    const customerId = this.authState.currentCustomerId();

    this.cartService.getByCustomerId(customerId).subscribe({
      next: (cart) => {
        this.rawCart = cart;
        const items = cart?.cartItems || cart?.items || [];
        this.resolveProductDetails(items);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private resolveProductDetails(items: CartItem[]): void {
    if (items.length === 0) {
      this.enrichedItems = [];
      this.isLoading = false;
      return;
    }

    this.productService.getAll().subscribe({
      next: (products) => {
        const productMap = new Map(products.map(p => [p.id, p]));
        this.enrichedItems = items.map(item => ({
          ...item,
          product: productMap.get(item.productId)
        }));
        this.isLoading = false;
      },
      error: () => {
        this.enrichedItems = items.map(item => ({ ...item }));
        this.isLoading = false;
      }
    });
  }

  private loadBranches(): void {
    this.companyService.getAllBranches().subscribe({
      next: (branches) => {
        this.branches = branches;
        if (branches.length > 0) {
          this.selectedBranchId = branches[0].id;
        }
      },
      error: () => {}
    });
  }

  get totalItemsCount(): number {
    return this.enrichedItems.reduce((acc, i) => acc + (i.quantity || 1), 0);
  }

  get totalPrice(): number {
    return this.enrichedItems.reduce((acc, i) => {
      const price = i.product?.price || 0;
      return acc + (price * (i.quantity || 1));
    }, 0);
  }

  updateQuantity(item: EnrichedCartItem, newQuantity: number): void {
    if (newQuantity < 1) return;
    this.updatingProductId = item.productId;
    const customerId = this.authState.currentCustomerId();

    // Optimistic local update
    item.quantity = newQuantity;

    this.cartService.updateQuantity(customerId, item.productId, newQuantity).subscribe({
      next: () => {
        this.updatingProductId = null;
      },
      error: () => {
        this.updatingProductId = null;
      }
    });
  }

  removeItem(item: EnrichedCartItem): void {
    const customerId = this.authState.currentCustomerId();
    // Optimistic removal as requested in brief
    this.enrichedItems = this.enrichedItems.filter(i => i.productId !== item.productId);

    this.cartService.removeItem(customerId, item.productId).subscribe({
      next: () => {
        this.notification.success("Mahsulot savatdan olib tashlandi.");
      },
      error: () => {}
    });
  }

  checkout(): void {
    if (!this.selectedBranchId) {
      this.notification.warning("Iltimos, filialni tanlang!");
      return;
    }

    this.isPlacingOrder = true;
    const customerId = this.authState.currentCustomerId();

    this.orderService.createOrder(customerId, this.selectedBranchId).subscribe({
      next: () => {
        this.isPlacingOrder = false;
        this.notification.success("Buyurtmangiz muvaffaqiyatli qabul qilindi!");
        this.cartService.clearLocalCart();
        this.router.navigate(['/orders']);
      },
      error: () => {
        this.isPlacingOrder = false;
      }
    });
  }

  goToProducts(): void {
    this.router.navigate(['/products']);
  }
}
