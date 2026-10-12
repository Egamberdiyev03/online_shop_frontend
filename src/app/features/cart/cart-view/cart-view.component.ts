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
import { LocationPickerComponent, SelectedLocation } from '../../../shared/components/location-picker/location-picker.component';

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
    EmptyStateComponent,
    LocationPickerComponent
  ],
  template: `
    <div class="container">
      <!-- Page Header (Matching UI Spec: 🛒 Savat X, # Sizning savatingiz, Mijoz #... uchun saqlangan mahsulotlar) -->
      <div class="page-header">
        <div class="header-content">
          <div class="cart-title-row">
            <span class="cart-pill-tag">
              🛒 Savat {{ totalItemsCount }}
            </span>
          </div>
          <h1 class="page-title">Sizning savatingiz</h1>
          <p class="page-subtitle">
            Mijoz #{{ authState.currentCustomerId() || 5 }} uchun saqlangan mahsulotlar
          </p>
        </div>
      </div>

      <!-- Admin Notice if Admin visits Cart -->
      <div *ngIf="!authState.canUseCart()" class="card admin-notice-card">
        <span class="notice-icon">🛡️</span>
        <h2 class="notice-title">Boshqaruvchi uchun savat mavjud emas</h2>
        <p class="notice-desc">
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
                  🗑️
                </button>
              </div>
            </div>
          </div>

          <!-- Checkout Summary Card (Matching UI Spec: ### Buyurtma xulosasi) -->
          <div class="summary-card card">
            <h3 class="summary-title">Buyurtma xulosasi</h3>

            <div class="summary-line">
              <span>Jami mahsulotlar:</span>
              <strong class="line-val">{{ totalItemsCount }} ta</strong>
            </div>

            <div class="summary-line">
              <span>Yetkazib berish:</span>
              <span class="free-shipping-badge">Bepul</span>
            </div>

            <div class="summary-divider"></div>

            <div class="summary-line total-line">
              <span>Umumiy summa:</span>
              <span class="total-val">{{ totalPrice | number:'1.0-0' }} so'm</span>
            </div>

            <!-- Checkout Branch Selector Form (Matching UI Spec: Qaysi filialdan qabul qilasiz? *) -->
            <div class="checkout-form-box">
              <label class="form-label">Qaysi filialdan qabul qilasiz? *</label>
              <select class="form-control" [(ngModel)]="selectedBranchId">
                <option [ngValue]="null" disabled>Filialni tanlang</option>
                <option *ngFor="let branch of branches" [ngValue]="branch.id">
                  {{ branch.name }} — {{ branch.address }}
                </option>
              </select>
            </div>

            <!-- Yetkazib berish manzili -->
            <div class="checkout-form-box">
              <label class="form-label">Yetkazib berish manzili</label>
              <div class="delivery-location-box" *ngIf="deliveryLocation">
                <div class="location-info">
                  <span class="loc-icon">📍</span>
                  <span class="loc-address">{{ deliveryLocation.address }}</span>
                </div>
                <button type="button" class="change-loc-btn" (click)="openLocationPicker()">
                  O'zgartirish
                </button>
              </div>
              <button
                *ngIf="!deliveryLocation"
                type="button"
                class="btn btn-outline-primary btn-location"
                (click)="openLocationPicker()"
              >
                <span>📍</span> Xaritadan tanlash
              </button>
            </div>

            <button 
              class="btn btn-primary btn-lg checkout-btn" 
              [disabled]="isPlacingOrder || !selectedBranchId"
              (click)="checkout()"
            >
              <span>🛍️</span>
              <span>{{ isPlacingOrder ? 'Buyurtma rasmiylashtirilmoqda...' : 'Buyurtma berish' }}</span>
            </button>

            <!-- Warning/Note Box (Matching UI Spec: ⚠️ Buyurtma berilgach, avtomatik ravishda buyurtmalar ro'yxatida ko'rinadi) -->
            <div class="summary-note-box">
              <span class="note-icon">⚠️</span>
              <p class="note-text">Buyurtma berilgach, avtomatik ravishda buyurtmalar ro'yxatida ko'rinadi.</p>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Order Placed Success Modal (Matching UI Spec: ✓ ### Buyurtma qabul qilindi!) -->
      <div class="modal-overlay" *ngIf="showSuccessModal" (click)="closeSuccessModal()">
        <div class="modal-content success-modal" (click)="$event.stopPropagation()">
          <div class="success-icon-wrap">
            <span class="check-mark">✓</span>
          </div>

          <h3 class="success-title">Buyurtma qabul qilindi!</h3>
          <p class="success-desc">
            Sizning buyurtmangiz muvaffaqiyatli rasmiylashtirildi va tizimda ro'yxatga olindi. 
            Uni "Mening Buyurtmalarim" bo'limida kuzatib borishingiz mumkin.
          </p>

          <div class="success-actions">
            <button class="btn btn-secondary" (click)="goToProducts()">
              Xaridni davom ettirish
            </button>
            <button class="btn btn-primary" (click)="goToOrders()">
              Buyurtmalarni ko'rish &rarr;
            </button>
          </div>
        </div>
      </div>

      <!-- Location Picker Modal -->
      <div class="modal-overlay" *ngIf="showLocationPicker" (click)="closeLocationPicker()">
        <div class="modal-content location-modal" (click)="$event.stopPropagation()">
          <app-location-picker
            [initialLocation]="deliveryLocation ? { latitude: deliveryLocation.latitude, longitude: deliveryLocation.longitude } : undefined"
            [initialAddress]="deliveryLocation?.address"
            (locationSelected)="onLocationSelected($event)"
            (cancelled)="closeLocationPicker()"
          ></app-location-picker>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.25rem;
    }
    .page-header {
      margin-bottom: 2rem;
    }
    .cart-title-row {
      margin-bottom: 0.5rem;
    }
    .cart-pill-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #e0e7ff;
      color: #4338ca;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.3rem 0.85rem;
      border-radius: 9999px;
    }
    .page-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .page-subtitle {
      color: #64748b;
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }

    .admin-notice-card {
      text-align: center;
      padding: 3.5rem 1.5rem;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
    }
    .notice-icon {
      font-size: 3.5rem;
      display: block;
      margin-bottom: 1rem;
    }
    .notice-title {
      font-size: 1.5rem;
      margin-bottom: 0.75rem;
      color: #0f172a;
      font-weight: 800;
    }
    .notice-desc {
      color: #64748b;
      max-width: 520px;
      margin: 0 auto 1.5rem;
      line-height: 1.6;
      font-size: 0.95rem;
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
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .table-header {
      display: flex;
      align-items: center;
      padding: 1rem 1.25rem;
      background: #f8fafc;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
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
      border-bottom: 1px solid #f1f5f9;
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
      border-radius: 10px;
      overflow: hidden;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e2e8f0;
    }
    .item-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .item-fallback {
      font-size: 1.5rem;
      font-weight: 800;
      color: #4f46e5;
    }
    .item-info {
      display: flex;
      flex-direction: column;
    }
    .item-name {
      font-weight: 700;
      color: #0f172a;
      font-size: 0.95rem;
      text-decoration: none;
    }
    .item-name:hover {
      color: #4f46e5;
    }
    .item-id {
      font-size: 0.75rem;
      color: #94a3b8;
    }
    .price-cell {
      flex: 1;
      text-align: right;
      font-size: 0.9rem;
      color: #64748b;
      font-weight: 600;
    }
    .qty-cell {
      flex: 1.5;
      display: flex;
      justify-content: center;
    }
    .qty-stepper {
      display: flex;
      align-items: center;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      overflow: hidden;
    }
    .stepper-btn {
      width: 32px;
      height: 32px;
      background: #f8fafc;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: none;
      transition: background 0.15s;
    }
    .stepper-btn:hover:not(:disabled) {
      background: #e2e8f0;
    }
    .stepper-val {
      width: 36px;
      text-align: center;
      font-size: 0.875rem;
      font-weight: 700;
      color: #0f172a;
    }
    .total-cell {
      flex: 1.2;
      text-align: right;
      font-weight: 800;
      color: #0f172a;
      font-size: 1rem;
    }
    .action-cell {
      width: 40px;
      text-align: right;
    }
    .remove-btn {
      color: #94a3b8;
      font-size: 1.1rem;
      padding: 0.35rem;
      border-radius: 6px;
      background: none;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    .remove-btn:hover {
      color: #ef4444;
      background: #fee2e2;
    }

    /* Summary Card */
    .summary-card {
      padding: 1.75rem;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      position: sticky;
      top: 5rem;
    }
    .summary-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 1.25rem;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
      color: #64748b;
      margin-bottom: 0.85rem;
    }
    .line-val {
      color: #0f172a;
      font-weight: 700;
    }
    .free-shipping-badge {
      background: #dcfce7;
      color: #15803d;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
    }
    .summary-divider {
      height: 1px;
      background: #e2e8f0;
      margin: 1.25rem 0;
    }
    .total-line {
      font-size: 1.1rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 1.5rem;
    }
    .total-val {
      color: #4f46e5;
      font-size: 1.4rem;
    }
    .checkout-form-box {
      margin-bottom: 1.5rem;
    }
    .checkout-btn {
      width: 100%;
      padding: 0.85rem 1.25rem;
      font-size: 1rem;
      font-weight: 700;
      border-radius: 10px;
    }
    .summary-note-box {
      display: flex;
      gap: 0.6rem;
      align-items: flex-start;
      margin-top: 1.25rem;
      padding: 0.85rem;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 8px;
    }
    .note-icon {
      font-size: 1.1rem;
      line-height: 1.2;
    }
    .note-text {
      font-size: 0.78rem;
      color: #92400e;
      line-height: 1.45;
      margin: 0;
      font-weight: 500;
    }

    /* Success Modal */
    .success-modal {
      text-align: center;
      padding: 2.5rem 2rem;
      max-width: 440px;
    }
    .success-icon-wrap {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: #dcfce7;
      color: #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
    }
    .check-mark {
      font-size: 2.25rem;
      font-weight: 900;
    }
    .success-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.75rem;
    }
    .success-desc {
      font-size: 0.9rem;
      color: #64748b;
      line-height: 1.55;
      margin-bottom: 1.75rem;
    }
    .success-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
    }

    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.5);
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

    /* Location picker styles */
    .location-modal {
      max-width: 650px;
      background: transparent;
      box-shadow: none;
    }

    .delivery-location-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 10px;
      padding: 0.75rem 1rem;
    }
    .location-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      min-width: 0;
    }
    .loc-icon {
      font-size: 1.1rem;
    }
    .loc-address {
      font-size: 0.9rem;
      color: #064e3b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .change-loc-btn {
      background: none;
      border: none;
      color: #059669;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .change-loc-btn:hover {
      text-decoration: underline;
    }
    .btn-location {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem;
    }
    .btn-outline-primary {
      background: #ffffff;
      border: 1px solid #4f46e5;
      color: #4f46e5;
    }
    .btn-outline-primary:hover {
      background: #eef2ff;
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
  showSuccessModal = false;

  // Location picker state
  showLocationPicker = false;
  deliveryLocation: SelectedLocation | null = null;

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
        this.branches = branches || [];
        const userBranch = this.authState.userBranchId();
        if (userBranch && branches.some(b => b.id === userBranch)) {
          this.selectedBranchId = userBranch;
        } else if (branches.length > 0) {
          this.selectedBranchId = branches[0].id;
        }
      },
      error: (err) => {
        console.error('[Cart] Error loading branches:', err);
        this.branches = [];
        if (err?.status === 403) {
          this.notification.error('Filiallar ro\'yxatini yuklashda ruxsat yo\'q. Administrator bilan bog\'laning.');
        }
      }
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
    this.enrichedItems = this.enrichedItems.filter(i => i.productId !== item.productId);

    this.cartService.removeItem(customerId, item.productId).subscribe({
      next: () => {
        this.notification.success("Mahsulot savatdan olib tashlandi.");
      },
      error: () => {}
    });
  }

  checkout(): void {
    if (!this.authState.isAuthenticated()) {
      this.notification.warning("Buyurtmani rasmiylashtirish uchun avval tizimga kiring yoki ro'yxatdan o'ting!");
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
      return;
    }

    if (!this.selectedBranchId) {
      this.notification.warning("Iltimos, filialni tanlang!");
      return;
    }

    this.isPlacingOrder = true;
    const customerId = this.authState.currentCustomerId();

    this.orderService.createOrder(
      customerId,
      this.selectedBranchId,
      this.deliveryLocation?.address,
      this.deliveryLocation?.latitude,
      this.deliveryLocation?.longitude
    ).subscribe({
      next: () => {
        this.isPlacingOrder = false;
        this.cartService.clearLocalCart();
        this.showSuccessModal = true;
      },
      error: (err) => {
        this.isPlacingOrder = false;
        this.notification.error(err?.message || "Buyurtma berishda xatolik yuz berdi.");
      }
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.router.navigate(['/orders']);
  }

  goToOrders(): void {
    this.showSuccessModal = false;
    this.router.navigate(['/orders']);
  }

  goToProducts(): void {
    this.showSuccessModal = false;
    this.router.navigate(['/products']);
  }

  // Location picker methods
  openLocationPicker(): void {
    this.showLocationPicker = true;
  }

  closeLocationPicker(): void {
    this.showLocationPicker = false;
  }

  onLocationSelected(location: SelectedLocation): void {
    this.deliveryLocation = location;
    this.showLocationPicker = false;
    this.notification.success('Yetkazib berish manzili saqlandi!');
  }
}
