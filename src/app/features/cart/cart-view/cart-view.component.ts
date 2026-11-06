import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Cart, CartItem } from '../../../core/models/cart.model';
import { Product } from '../../../core/models/product.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { CartService } from '../../../core/services/cart.service';
import { ProductService } from '../../../core/services/product.service';
import { OrderService } from '../../../core/services/order.service';
import { CompanyService } from '../../../core/services/company.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TelegramService } from '../../../core/services/telegram.service';
import { MapService } from '../../../core/services/map.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LocationPickerComponent, SelectedLocation } from '../../../shared/components/location-picker/location-picker.component';
import * as L from 'leaflet';

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
            <span class="customer-badge">
              <span class="badge-icon">👤</span>
              <span class="badge-id">{{ authState.currentCustomerId() || 5 }}</span>
            </span>
            uchun saqlangan mahsulotlar
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
                  <span class="item-id-badge">
                    <span class="id-label">ID</span>
                    <span class="id-value">{{ item.productId }}</span>
                  </span>
                </div>
              </div>

              <div class="price-cell">
                <span class="price-amount">{{ (item.product?.price || 0) | number:'1.0-0' }}</span>
                <span class="price-currency">so'm</span>
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
                <span class="total-amount">{{ ((item.product?.price || 0) * item.quantity) | number:'1.0-0' }}</span>
                <span class="total-currency">so'm</span>
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
              <span class="total-val">
                <span class="sum-amount">{{ totalPrice | number:'1.0-0' }}</span>
                <span class="sum-currency">so'm</span>
              </span>
            </div>

            <!-- Checkout Branch Info -->
            <div class="checkout-form-box">
              <div class="branch-auto-notice" (click)="toggleBranchDetails()">
                <span class="notice-icon">🏢</span>
                <p class="notice-text">
                  Buyurtma mahsulot joylashgan filialga avtomatik yuboriladi.
                </p>
                <span class="branch-toggle-hint" *ngIf="cartBranches.length > 0">
                  {{ showBranchDetails ? '▲ Yopish' : '▼ Manzilni korish' }}
                </span>
              </div>

              <!-- Filial tafsilotlari -->
              <div class="branch-details-list" *ngIf="showBranchDetails && cartBranches.length > 0">
                <div
                  class="branch-detail-item"
                  *ngFor="let branch of cartBranches"
                  (click)="openBranchOnMap(branch)"
                  (keydown.enter)="openBranchOnMap(branch)"
                  tabindex="0"
                  role="button"
                  [attr.aria-label]="'Xaritada ko\\'rish: ' + branch.name"
                >
                  <div class="branch-info">
                    <span class="branch-name">📍 {{ branch.name }}</span>
                    <span class="branch-address">{{ branch.address }}</span>
                    <a
                      *ngIf="branch.phoneNumber"
                      [href]="'tel:' + branch.phoneNumber"
                      class="branch-phone"
                      (click)="$event.stopPropagation()"
                      (keydown.enter)="$event.stopPropagation()"
                    >📞 {{ branch.phoneNumber }}</a>
                  </div>
                  <span class="branch-map-btn" *ngIf="branch.latitude && branch.longitude">
                    🗺️ Xaritada
                  </span>
                  <span class="branch-map-btn branch-map-fallback" *ngIf="!branch.latitude || !branch.longitude">
                    🔗 Ochish
                  </span>
                </div>
              </div>
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
              [disabled]="isPlacingOrder"
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

      <!-- Branch Map Modal (faqat ko'rish uchun) -->
      <div class="modal-overlay" *ngIf="showBranchMapModal" (click)="closeBranchMapModal()">
        <div class="modal-content branch-map-modal" (click)="$event.stopPropagation()">
          <div class="branch-map-header">
            <div class="branch-map-title-row">
              <span class="branch-map-icon">🏬</span>
              <div>
                <h3 class="branch-map-title">{{ viewingBranch?.name }}</h3>
                <p class="branch-map-address">{{ viewingBranch?.address }}</p>
              </div>
            </div>
            <button class="branch-map-close" (click)="closeBranchMapModal()" aria-label="Yopish">✕</button>
          </div>
          <div class="branch-map-container" [id]="branchMapId"></div>
          <div class="branch-map-footer">
            <a
              *ngIf="viewingBranch?.latitude && viewingBranch?.longitude"
              [href]="getDirectionsUrl(viewingBranch!)"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-primary btn-directions"
            >
              🧭 Yo'nalish olish
            </a>
            <button class="btn btn-secondary" (click)="closeBranchMapModal()">Yopish</button>
          </div>
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
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .customer-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #ffffff;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .badge-icon {
      font-size: 0.75rem;
    }
    .badge-id {
      font-family: 'SF Mono', 'Monaco', monospace;
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
    @media (max-width: 600px) {
      .table-header {
        display: none;
      }
      .cart-item-row {
        flex-wrap: wrap;
        gap: 0.75rem;
        padding: 1rem;
      }
      .product-cell {
        flex: 1 1 100%;
      }
      .price-cell, .total-cell {
        flex: 1;
        flex-direction: row;
        align-items: center;
        gap: 0.25rem;
      }
      .price-amount, .total-amount {
        font-size: 0.9rem;
      }
      .price-currency, .total-currency {
        font-size: 0.7rem;
      }
      .qty-cell {
        flex: 0 0 auto;
      }
      .action-cell {
        flex: 0 0 auto;
      }
      .sum-amount {
        font-size: 1.2rem;
      }
      .sum-currency {
        font-size: 0.75rem;
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
    .item-id-badge {
      display: inline-flex;
      align-items: center;
      gap: 0;
      margin-top: 0.25rem;
    }
    .id-label {
      font-size: 0.6rem;
      font-weight: 700;
      color: #ffffff;
      background: #94a3b8;
      padding: 0.1rem 0.3rem;
      border-radius: 4px 0 0 4px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .id-value {
      font-size: 0.7rem;
      font-weight: 600;
      color: #64748b;
      background: #f1f5f9;
      padding: 0.1rem 0.35rem;
      border-radius: 0 4px 4px 0;
      font-family: 'SF Mono', 'Monaco', monospace;
    }
    .price-cell {
      flex: 1;
      text-align: right;
      font-size: 0.9rem;
      color: #64748b;
      font-weight: 600;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0;
    }
    .price-amount {
      font-weight: 700;
      color: #475569;
      line-height: 1.2;
    }
    .price-currency {
      font-size: 0.65rem;
      color: #94a3b8;
      font-weight: 500;
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
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0;
    }
    .total-amount {
      font-weight: 800;
      color: #0f172a;
      font-size: 1rem;
      line-height: 1.2;
    }
    .total-currency {
      font-size: 0.65rem;
      color: #64748b;
      font-weight: 500;
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
      display: flex;
      align-items: baseline;
      gap: 0.3rem;
    }
    .sum-amount {
      font-size: 1.4rem;
      font-weight: 800;
    }
    .sum-currency {
      font-size: 0.85rem;
      font-weight: 600;
      color: #6366f1;
    }
    .checkout-form-box {
      margin-bottom: 1.5rem;
    }
    .branch-auto-notice {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.85rem 1rem;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      font-size: 0.875rem;
      color: #166534;
      line-height: 1.4;
      cursor: pointer;
      transition: all 0.2s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .branch-auto-notice:hover {
      background: #dcfce7;
      border-color: #86efac;
    }
    .branch-auto-notice:active {
      transform: scale(0.98);
    }
    .branch-auto-notice .notice-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
    }
    .branch-auto-notice .notice-text {
      margin: 0;
      font-weight: 500;
      flex: 1;
    }
    .branch-toggle-hint {
      display: block;
      font-size: 0.75rem;
      color: #15803d;
      margin-top: 0.25rem;
      font-weight: 600;
    }
    .branch-details-list {
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .branch-detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      -webkit-tap-highlight-color: transparent;
    }
    .branch-detail-item:hover {
      border-color: #6366f1;
      background: #f5f3ff;
    }
    .branch-detail-item:active {
      transform: scale(0.98);
    }
    .branch-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .branch-name {
      font-weight: 600;
      color: #1e293b;
      font-size: 0.875rem;
    }
    .branch-address {
      font-size: 0.8125rem;
      color: #64748b;
    }
    .branch-phone {
      font-size: 0.75rem;
      color: #6366f1;
    }
    .branch-map-btn {
      padding: 0.375rem 0.625rem;
      background: #eef2ff;
      color: #6366f1;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }
    :host-context(body.dark-theme) .branch-auto-notice,
    :host-context(.dark-theme) .branch-auto-notice {
      background: rgba(34, 197, 94, 0.1);
      border-color: rgba(34, 197, 94, 0.2);
      color: #86efac;
    }
    :host-context(body.dark-theme) .branch-auto-notice:hover,
    :host-context(.dark-theme) .branch-auto-notice:hover {
      background: rgba(34, 197, 94, 0.15);
    }
    :host-context(body.dark-theme) .branch-toggle-hint,
    :host-context(.dark-theme) .branch-toggle-hint {
      color: #4ade80;
    }
    :host-context(body.dark-theme) .branch-detail-item,
    :host-context(.dark-theme) .branch-detail-item {
      background: #1e293b;
      border-color: #334155;
    }
    :host-context(body.dark-theme) .branch-detail-item:hover,
    :host-context(.dark-theme) .branch-detail-item:hover {
      background: #312e81;
      border-color: #6366f1;
    }
    :host-context(body.dark-theme) .branch-name,
    :host-context(.dark-theme) .branch-name {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .branch-address,
    :host-context(.dark-theme) .branch-address {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .branch-map-btn,
    :host-context(.dark-theme) .branch-map-btn {
      background: #312e81;
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

    /* Branch detail item accessibility */
    .branch-detail-item:focus {
      outline: 2px solid #4f46e5;
      outline-offset: 2px;
    }
    .branch-phone {
      color: #6366f1;
      text-decoration: none;
    }
    .branch-phone:hover {
      text-decoration: underline;
    }
    .branch-map-fallback {
      background: #f1f5f9;
      color: #64748b;
    }

    /* Branch Map Modal */
    .branch-map-modal {
      max-width: 550px;
      padding: 0;
      overflow: hidden;
    }
    .branch-map-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.25rem 1.25rem 1rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .branch-map-title-row {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .branch-map-icon {
      font-size: 1.75rem;
    }
    .branch-map-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .branch-map-address {
      font-size: 0.85rem;
      color: #64748b;
      margin: 0.25rem 0 0;
    }
    .branch-map-close {
      background: #f1f5f9;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      font-size: 1rem;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .branch-map-close:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .branch-map-container {
      height: 300px;
      width: 100%;
    }
    .branch-map-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .btn-directions {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      text-decoration: none;
    }

    /* ===== DARK THEME STYLES ===== */
    :host-context(body.dark-theme) .price-amount,
    :host-context(.dark-theme) .price-amount {
      color: #cbd5e1;
    }
    :host-context(body.dark-theme) .total-amount,
    :host-context(.dark-theme) .total-amount {
      color: #f1f5f9;
      font-weight: 800;
    }
    :host-context(body.dark-theme) .price-currency,
    :host-context(.dark-theme) .price-currency {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .total-currency,
    :host-context(.dark-theme) .total-currency {
      color: #a5b4fc;
    }
    :host-context(body.dark-theme) .sum-amount,
    :host-context(.dark-theme) .sum-amount {
      color: #a5b4fc;
    }
    :host-context(body.dark-theme) .sum-currency,
    :host-context(.dark-theme) .sum-currency {
      color: #c7d2fe;
    }
    :host-context(body.dark-theme) .branch-map-modal,
    :host-context(.dark-theme) .branch-map-modal {
      background: #1e293b;
    }
    :host-context(body.dark-theme) .branch-map-header,
    :host-context(.dark-theme) .branch-map-header {
      border-color: #334155;
    }
    :host-context(body.dark-theme) .branch-map-title,
    :host-context(.dark-theme) .branch-map-title {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .branch-map-address,
    :host-context(.dark-theme) .branch-map-address {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .branch-map-close,
    :host-context(.dark-theme) .branch-map-close {
      background: #334155;
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .branch-map-close:hover,
    :host-context(.dark-theme) .branch-map-close:hover {
      background: #475569;
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .branch-map-footer,
    :host-context(.dark-theme) .branch-map-footer {
      background: #0f172a;
      border-color: #334155;
    }
  `]
})
export class CartViewComponent implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private productService = inject(ProductService);
  private orderService = inject(OrderService);
  private companyService = inject(CompanyService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private tg = inject(TelegramService);
  private router = inject(Router);
  private mapService = inject(MapService);

  rawCart: Cart | null = null;
  enrichedItems: EnrichedCartItem[] = [];

  isLoading = true;
  updatingProductId: number | null = null;
  isPlacingOrder = false;
  showSuccessModal = false;

  // Filial ma'lumotlari
  cartBranches: CompanyBranch[] = [];
  showBranchDetails = false;

  // Location picker state
  showLocationPicker = false;
  deliveryLocation: SelectedLocation | null = null;

  // Branch map modal state
  showBranchMapModal = false;
  viewingBranch: CompanyBranch | null = null;
  branchMapId = 'branch-map-' + Math.random().toString(36).substring(2, 9);
  private branchMap?: L.Map;

  ngOnInit(): void {
    this.loadCart();
  }

  ngOnDestroy(): void {
    if (this.branchMap) {
      this.branchMap.remove();
      this.branchMap = undefined;
    }
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
        this.loadBranchInfo();
      },
      error: () => {
        this.enrichedItems = items.map(item => ({ ...item }));
        this.isLoading = false;
      }
    });
  }

  private loadBranchInfo(): void {
    // Unikal filial ID larini olish
    const branchIds = new Set<number>();
    this.enrichedItems.forEach(item => {
      if (item.product?.companyBranchId) {
        branchIds.add(item.product.companyBranchId);
      }
    });

    if (branchIds.size === 0) return;

    // Har bir filial uchun ma'lumot olish (xato bo'lsa yashirin o'tkazamiz)
    this.cartBranches = [];
    branchIds.forEach(branchId => {
      this.companyService.getBranchById(branchId).subscribe({
        next: (branch) => {
          if (branch && !this.cartBranches.find(b => b.id === branch.id)) {
            this.cartBranches.push(branch);
          }
        },
        error: () => {
          // 403 yoki boshqa xato - yashirin o'tkazamiz
          // Filial ma'lumoti yuklanmasa ham savat ishlayveradi
        }
      });
    });
  }

  toggleBranchDetails(): void {
    this.tg.hapticImpact('light');
    this.showBranchDetails = !this.showBranchDetails;
  }

  openBranchOnMap(branch: CompanyBranch): void {
    this.tg.hapticImpact('light');

    // Koordinatalar bo'lsa - modal xarita ochish
    if (branch.latitude && branch.longitude) {
      this.viewingBranch = branch;
      this.showBranchMapModal = true;

      // Xaritani keyingi renderda yaratish
      setTimeout(() => this.initBranchMap(), 100);
    } else {
      // Koordinatalar yo'q - tashqi xaritada manzil bo'yicha qidirish
      const encodedAddress = encodeURIComponent(branch.address || branch.name);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    }
  }

  private initBranchMap(): void {
    if (!this.viewingBranch?.latitude || !this.viewingBranch?.longitude) return;

    // Oldingi xaritani tozalash
    if (this.branchMap) {
      this.branchMap.remove();
    }

    const location = {
      latitude: this.viewingBranch.latitude,
      longitude: this.viewingBranch.longitude
    };

    this.branchMap = this.mapService.createMap(this.branchMapId, location, 16);
    this.mapService.addBranchMarker(this.branchMap, this.viewingBranch, false);
  }

  closeBranchMapModal(): void {
    this.showBranchMapModal = false;
    this.viewingBranch = null;

    if (this.branchMap) {
      this.branchMap.remove();
      this.branchMap = undefined;
    }
  }

  getDirectionsUrl(branch: CompanyBranch): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`;
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

    this.isPlacingOrder = true;

    this.orderService.createOrder().subscribe({
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
