import { Component, inject, OnInit, DestroyRef, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError, tap } from 'rxjs';
import { Product, CreateProductDto, UpdateProductDto } from '../../../core/models/product.model';
import { Category } from '../../../core/models/category.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { ProductService, ProductQuery } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { CompanyService } from '../../../core/services/company.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TelegramService } from '../../../core/services/telegram.service';
import { ProductFormModalComponent } from '../product-form-modal/product-form-modal.component';
import { DropdownComponent, DropdownOption } from '../../../shared/components/dropdown/dropdown.component';

interface SortOption {
  value: string;
  label: string;
  icon: string;
  sortBy: string;
  isDescending: boolean;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ProductFormModalComponent,
    DropdownComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-wrapper">
      <div class="page-container">
        <!-- Sticky Filter Panel -->
        <div class="filter-panel">
          <!-- Search Row -->
          <div class="filter-row search-row">
            <div class="search-box" [class.focused]="searchFocused()">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchInput($event)"
                (focus)="searchFocused.set(true)"
                (blur)="searchFocused.set(false)"
                placeholder="Mahsulot qidirish..."
                class="search-input"
                aria-label="Mahsulot qidirish"
              />
              @if (searchQuery()) {
                <button
                  class="clear-search-btn"
                  (click)="clearSearch()"
                  aria-label="Qidiruvni tozalash"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              }
              @if (isSearching()) {
                <div class="search-spinner">
                  <div class="spinner-ring"></div>
                </div>
              }
            </div>

            <!-- Admin: Yangi mahsulot qo'shish -->
            @if (authState.isAdminMode()) {
              <button
                class="btn btn-primary add-product-btn"
                (click)="openCreateModal()"
              >
                <span class="btn-icon">+</span>
                <span class="btn-text">Yangi</span>
              </button>
            }
          </div>

          <!-- Dropdowns Row -->
          <div class="filter-row dropdowns-row">
            <app-dropdown
              [options]="categoryOptions()"
              [value]="selectedCategoryId()"
              allLabel="Barcha kategoriyalar"
              icon="📁"
              (valueChange)="selectCategory($event)"
            ></app-dropdown>

            <app-dropdown
              [options]="branchOptions()"
              [value]="selectedBranchId()"
              allLabel="Barcha filiallar"
              icon="🏢"
              (valueChange)="selectBranch($event)"
            ></app-dropdown>

            <app-dropdown
              [options]="sortDropdownOptions"
              [value]="sortBy()"
              icon="📊"
              (valueChange)="selectSort($event)"
            ></app-dropdown>
          </div>

        </div>

        <!-- Skeleton Loading -->
        @if (isLoading()) {
          <div class="products-grid skeleton-grid">
            @for (i of skeletonItems; track i) {
              <div class="skeleton-card">
                <div class="skeleton-image"></div>
                <div class="skeleton-body">
                  <div class="skeleton-line short"></div>
                  <div class="skeleton-line"></div>
                  <div class="skeleton-line medium"></div>
                  <div class="skeleton-price"></div>
                  <div class="skeleton-button"></div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Error State -->
        @if (hasError() && !isLoading()) {
          <div class="error-state-wrapper">
            <div class="error-state">
              <div class="error-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <h3 class="error-title">Xatolik yuz berdi</h3>
              <p class="error-desc">Mahsulotlarni yuklashda muammo chiqdi. Iltimos, qayta urinib ko'ring.</p>
              <button class="btn btn-primary" (click)="loadData()">
                Qayta urinish
              </button>
            </div>
          </div>
        }

        <!-- Empty State -->
        @if (!isLoading() && !hasError() && products().length === 0) {
          <div class="empty-state-wrapper">
            <div class="empty-state">
              <div class="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <h3 class="empty-title">Mahsulot topilmadi</h3>
              @if (hasActiveFilters()) {
                <p class="empty-filter-desc">
                  {{ getActiveFiltersDescription() }} bo'yicha hech narsa yo'q.
                </p>
              } @else {
                <p class="empty-desc">
                  Filtrlarni o'zgartirib ko'ring yoki qidiruv so'rovingizni tekshiring.
                </p>
              }
              @if (hasActiveFilters()) {
                <button class="btn btn-primary" (click)="resetFilters()">
                  Filtrlarni tozalash
                </button>
              }
            </div>
          </div>
        }

        <!-- Products Grid -->
        @if (!isLoading() && !hasError() && products().length > 0) {
          <div class="products-grid">
            @for (product of products(); track product.id; let i = $index) {
              <div class="product-card">
                <div class="card-image-wrap" (click)="goToProduct(product.id)">
                  @if (product.image) {
                    <img
                      [src]="product.image"
                      [alt]="product.name"
                      class="product-image"
                      width="260"
                      height="210"
                      [attr.loading]="i < 4 ? 'eager' : 'lazy'"
                      [attr.fetchpriority]="i < 4 ? 'high' : 'auto'"
                      (error)="onImageError(product)"
                    />
                  } @else {
                    <div class="image-fallback">
                      <span>{{ product.name.charAt(0).toUpperCase() }}</span>
                    </div>
                  }

                  <!-- Category Badge (chap tepa) -->
                  @if (getCategoryTitle(product.categoryId)) {
                    <span class="card-cat-badge">
                      {{ getCategoryTitle(product.categoryId) }}
                    </span>
                  }

                  <!-- Rating & Reviews Badge (chap past) - faqat baho bo'lganda ko'rsatiladi -->
                  @if (product.averageRating && product.averageRating > 0 || product.commentsCount && product.commentsCount > 0) {
                    <div class="rating-badge">
                      <span class="rating-item">
                        <svg class="rating-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        {{ product.averageRating?.toFixed(1) || '0.0' }}
                      </span>
                      <span class="rating-divider">|</span>
                      <span class="rating-item">
                        <svg class="comment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        </svg>
                        {{ product.commentsCount || 0 }}
                      </span>
                    </div>
                  }

                  <!-- Quick Hover Actions -->
                  <div class="card-hover-actions" (click)="$event.stopPropagation()">
                    <a [routerLink]="['/products', product.id]" class="quick-act-btn" title="Batafsil ko'rish">
                      👁️
                    </a>
                    @if (authState.canUseCart() && product.quantity > 0) {
                      <button
                        class="quick-act-btn cart-act"
                        (click)="addToCart(product)"
                        title="Savatga qo'shish"
                      >
                        🛒
                      </button>
                    }
                    @if (authState.isAdminMode() || authState.isAdminRole()) {
                      <button
                        class="quick-act-btn edit-act"
                        (click)="openEditModal(product)"
                        title="Tahrirlash"
                      >
                        ✏️
                      </button>
                    }
                  </div>
                </div>

                <div class="card-body">
                  <h3 class="product-name" (click)="goToProduct(product.id)">
                    {{ product.name }}
                  </h3>

                  <!-- Branch Info -->
                  <div class="branch-info">
                    @if (selectedBranchId()) {
                      <span class="branch-text">{{ getSelectedBranchName() }}</span>
                    } @else if (product.companyBranchId) {
                      <span class="branch-text">{{ getBranchName(product.companyBranchId) }}</span>
                    } @else {
                      <span class="branch-text">Filial ko'rsatilmagan</span>
                    }
                  </div>

                  <div class="price-row">
                    <div class="product-price">
                      {{ product.price | number:'1.0-0' }} <span class="currency">so'm</span>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="card-actions">
                    @if (authState.canUseCart()) {
                      @if (product.quantity > 0) {
                        <button
                          class="btn btn-primary add-cart-btn"
                          [disabled]="addingProductId() === product.id"
                          (click)="addToCart(product)"
                        >
                          <svg class="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                          </svg>
                          <span>{{ addingProductId() === product.id ? "Qo'shilmoqda..." : "Savatga" }}</span>
                        </button>
                      } @else {
                        <button class="btn btn-disabled unavailable-btn" disabled>
                          Mavjud emas
                        </button>
                      }
                    }

                    @if (authState.isAdminMode() || authState.isAdminRole()) {
                      <div class="admin-actions">
                        <button class="btn btn-secondary btn-icon-only" (click)="openEditModal(product)" title="Tahrirlash">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button class="btn btn-danger btn-icon-only" (click)="deleteProduct(product)" title="O'chirish">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/>
                          </svg>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Pagination -->
        @if (!isLoading() && totalItems() > pageSize()) {
          <div class="pagination-bar">
            <div class="pagination-controls">
              <button
                class="page-btn nav-btn"
                [disabled]="!hasPrevious()"
                (click)="prevPage()"
                aria-label="Oldingi sahifa"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>

              @if (visiblePages()[0] > 1) {
                <button class="page-btn" (click)="goToPage(1)">1</button>
              }
              @if (visiblePages()[0] > 2) {
                <span class="page-dots">...</span>
              }

              @for (p of visiblePages(); track p) {
                <button
                  class="page-btn"
                  [class.active]="p === currentPage()"
                  (click)="goToPage(p)"
                >{{ p }}</button>
              }

              @if (visiblePages()[visiblePages().length - 1] < totalPages() - 1) {
                <span class="page-dots">...</span>
              }
              @if (visiblePages()[visiblePages().length - 1] < totalPages()) {
                <button class="page-btn" (click)="goToPage(totalPages())">{{ totalPages() }}</button>
              }

              <button
                class="page-btn nav-btn"
                [disabled]="!hasNext()"
                (click)="nextPage()"
                aria-label="Keyingi sahifa"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            <div class="page-size-picker">
              <span class="size-label">Sahifada:</span>
              <select
                class="size-select"
                [ngModel]="pageSize()"
                (ngModelChange)="onPageSizeChange($event)"
                aria-label="Sahifadagi mahsulotlar soni"
              >
                <option [value]="12">12</option>
                <option [value]="24">24</option>
                <option [value]="48">48</option>
              </select>
            </div>
          </div>
        }
      </div>

      <!-- Product Form Modal -->
      @if (showModal()) {
        <app-product-form-modal
          [product]="editingProduct()"
          (save)="onSaveProduct($event)"
          (cancel)="closeModal()"
        ></app-product-form-modal>
      }
    </div>
  `,
  styles: [`
    /* ===== PAGE LAYOUT ===== */
    .page-wrapper {
      min-height: 100vh;
      background: var(--bg-main, #f8fafc);
    }

    .page-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 1.5rem 1.5rem 3rem;
    }

    @media (min-width: 768px) {
      .page-container {
        padding: 2rem 2rem 4rem;
      }
    }

    /* ===== FILTER PANEL ===== */
    .filter-panel {
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 16px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .filter-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .filter-row + .filter-row {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border, #e2e8f0);
    }

    /* ===== SEARCH ROW ===== */
    .search-row {
      gap: 0.75rem;
    }

    .search-box {
      flex: 1;
      display: flex;
      align-items: center;
      background: var(--bg-subtle, #f1f5f9);
      border: 2px solid transparent;
      border-radius: 12px;
      padding: 0.5rem 1rem;
      transition: all 0.2s ease;
    }

    .search-box.focused {
      background: #fff;
      border-color: var(--primary, #6366f1);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    }

    .search-icon {
      width: 20px;
      height: 20px;
      color: var(--text-muted, #94a3b8);
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 0.5rem 0.75rem;
      font-size: 0.9375rem;
      color: var(--text-primary, #0f172a);
      outline: none;
    }

    .search-input::placeholder {
      color: var(--text-muted, #94a3b8);
    }

    .clear-search-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: var(--bg-subtle, #e2e8f0);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.2s;
    }

    .clear-search-btn:hover {
      background: var(--danger, #ef4444);
      color: white;
    }

    .clear-search-btn svg {
      width: 14px;
      height: 14px;
    }

    .search-spinner {
      margin-left: 0.5rem;
    }

    .spinner-ring {
      width: 20px;
      height: 20px;
      border: 2px solid var(--border, #e2e8f0);
      border-top-color: var(--primary, #6366f1);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .add-product-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .btn-icon {
      font-size: 1.25rem;
      line-height: 1;
    }

    /* ===== DROPDOWNS ROW ===== */
    .dropdowns-row {
      flex-wrap: wrap;
    }

    /* ===== PRODUCTS GRID ===== */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    @media (min-width: 640px) {
      .products-grid {
        gap: 1.5rem;
      }
    }

    .product-card {
      background: white;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .product-card:hover {
      transform: translateY(-6px);
      box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
      border-color: #cbd5e1;
    }

    .card-image-wrap {
      position: relative;
      height: 210px;
      background: #f8fafc;
      overflow: hidden;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .product-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 1rem;
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .product-card:hover .product-image {
      transform: scale(1.08);
    }

    .image-fallback {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      font-weight: 800;
    }

    .card-cat-badge {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      background: rgba(15, 23, 42, 0.75);
      color: #ffffff;
      backdrop-filter: blur(6px);
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      z-index: 2;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Rating Badge */
    .rating-badge {
      position: absolute;
      bottom: 0.75rem;
      left: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(6px);
      padding: 0.375rem 0.625rem;
      border-radius: 8px;
      z-index: 2;
    }

    .rating-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #ffffff;
    }

    .rating-icon {
      width: 12px;
      height: 12px;
      color: #fbbf24;
    }

    .comment-icon {
      width: 12px;
      height: 12px;
      color: #94a3b8;
    }

    .rating-divider {
      color: rgba(255, 255, 255, 0.4);
      font-size: 0.75rem;
    }

    .card-hover-actions {
      position: absolute;
      bottom: 0.75rem;
      right: 0.75rem;
      display: flex;
      gap: 0.5rem;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(10px);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 3;
    }

    .product-card:hover .card-hover-actions {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .quick-act-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .quick-act-btn:hover {
      background: white;
      color: #0f172a;
      transform: scale(1.1);
    }

    .card-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .product-name {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      margin: 0 0 0.5rem;
      cursor: pointer;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.4;
      transition: color 0.2s;
    }

    .product-name:hover {
      color: var(--primary, #6366f1);
    }

    .branch-info {
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
      margin-bottom: 0.75rem;
    }

    .branch-text {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .price-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 1rem;
      gap: 0.5rem;
    }

    .product-price {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--text-primary, #0f172a);
    }

    .currency {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary, #64748b);
    }

    .card-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: auto;
    }

    .add-cart-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .cart-icon {
      width: 18px;
      height: 18px;
    }

    .unavailable-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      background: var(--bg-subtle, #f1f5f9);
      color: var(--text-muted, #94a3b8);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 8px;
      cursor: not-allowed;
    }

    .btn-disabled {
      opacity: 0.7;
    }

    .admin-actions {
      display: flex;
      gap: 0.375rem;
      width: 100%;
    }

    .btn-icon-only {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.625rem;
    }

    .btn-icon-only svg {
      width: 18px;
      height: 18px;
    }

    /* ===== SKELETON ===== */
    .skeleton-grid {
      margin-bottom: 2rem;
    }

    .skeleton-card {
      background: white;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 16px;
      overflow: hidden;
    }

    .skeleton-image {
      height: 210px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .skeleton-body {
      padding: 1.25rem;
    }

    .skeleton-line {
      height: 12px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
      margin-bottom: 0.75rem;
    }

    .skeleton-line.short { width: 40%; }
    .skeleton-line.medium { width: 70%; }

    .skeleton-price {
      height: 24px;
      width: 50%;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
      margin: 1rem 0;
    }

    .skeleton-button {
      height: 40px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ===== EMPTY & ERROR STATES ===== */
    .empty-state-wrapper,
    .error-state-wrapper {
      display: flex;
      justify-content: center;
      padding: 4rem 1rem;
    }

    .empty-state,
    .error-state {
      text-align: center;
      max-width: 400px;
    }

    .empty-icon,
    .error-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      background: #f1f5f9;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-icon svg,
    .error-icon svg {
      width: 40px;
      height: 40px;
      color: #94a3b8;
    }

    .error-icon {
      background: #fef2f2;
    }

    .error-icon svg {
      color: #ef4444;
    }

    .empty-title,
    .error-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      margin: 0 0 0.5rem;
    }

    .empty-desc,
    .error-desc {
      color: var(--text-secondary, #64748b);
      margin: 0 0 1.5rem;
      line-height: 1.5;
    }

    .empty-filter-desc {
      color: var(--text-primary, #0f172a);
      font-weight: 500;
      margin: 0 0 1.5rem;
      line-height: 1.5;
      padding: 0.75rem 1rem;
      background: var(--bg-subtle, #f1f5f9);
      border-radius: 8px;
      max-width: 320px;
      word-break: break-word;
    }

    /* ===== PAGINATION ===== */
    .pagination-bar {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1rem 1.25rem;
      background: white;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      margin-bottom: 2rem;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .page-btn {
      min-width: 36px;
      height: 36px;
      padding: 0 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border, #e2e8f0);
      background: white;
      color: var(--text-primary, #1e293b);
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .page-btn:hover:not(:disabled):not(.active) {
      background: #eef2ff;
      border-color: var(--primary, #6366f1);
      color: var(--primary, #6366f1);
    }

    .page-btn.active {
      background: var(--primary, #6366f1);
      border-color: var(--primary, #6366f1);
      color: white;
    }

    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .page-btn svg {
      width: 18px;
      height: 18px;
    }

    .page-dots {
      padding: 0 0.25rem;
      color: var(--text-muted, #94a3b8);
    }

    .page-size-picker {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-secondary, #64748b);
    }

    .size-select {
      padding: 0.375rem 0.625rem;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 6px;
      background: white;
      font-size: 0.875rem;
      cursor: pointer;
    }

    /* ===== BUTTONS ===== */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.625rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 8px;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
    }

    .btn-primary {
      background: var(--primary, #6366f1);
      color: white;
    }

    .btn-primary:hover {
      background: var(--primary-hover, #4f46e5);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: var(--bg-subtle, #f1f5f9);
      color: var(--text-primary, #0f172a);
      border: 1px solid var(--border, #e2e8f0);
    }

    .btn-secondary:hover {
      background: var(--border, #e2e8f0);
    }

    .btn-danger {
      background: var(--danger, #ef4444);
      color: white;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    /* ===== DARK THEME ===== */
    :host-context(body.dark-theme) .page-wrapper,
    :host-context(.dark-theme) .page-wrapper {
      background: #0b0f19;
    }

    :host-context(body.dark-theme) .filter-panel,
    :host-context(.dark-theme) .filter-panel {
      background: rgba(21, 30, 50, 0.9);
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .search-box,
    :host-context(.dark-theme) .search-box {
      background: #0b0f19;
    }

    :host-context(body.dark-theme) .search-box.focused,
    :host-context(.dark-theme) .search-box.focused {
      background: #151e32;
    }

    :host-context(body.dark-theme) .search-input,
    :host-context(.dark-theme) .search-input {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .filter-row + .filter-row,
    :host-context(.dark-theme) .filter-row + .filter-row {
      border-top-color: #22304d;
    }

    :host-context(body.dark-theme) .product-card,
    :host-context(body.dark-theme) .skeleton-card,
    :host-context(.dark-theme) .product-card,
    :host-context(.dark-theme) .skeleton-card {
      background: #151e32;
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .product-card:hover,
    :host-context(.dark-theme) .product-card:hover {
      border-color: #3b82f6;
    }

    :host-context(body.dark-theme) .card-image-wrap,
    :host-context(.dark-theme) .card-image-wrap {
      background: #0b0f19;
    }

    :host-context(body.dark-theme) .product-name,
    :host-context(body.dark-theme) .product-price,
    :host-context(.dark-theme) .product-name,
    :host-context(.dark-theme) .product-price {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .branch-info,
    :host-context(.dark-theme) .branch-info {
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .pagination-bar,
    :host-context(.dark-theme) .pagination-bar {
      background: #151e32;
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .page-btn,
    :host-context(.dark-theme) .page-btn {
      background: #1e293b;
      border-color: #334155;
      color: #e2e8f0;
    }

    :host-context(body.dark-theme) .page-btn:hover:not(:disabled):not(.active),
    :host-context(.dark-theme) .page-btn:hover:not(:disabled):not(.active) {
      background: #312e81;
      border-color: #6366f1;
    }

    :host-context(body.dark-theme) .empty-icon,
    :host-context(.dark-theme) .empty-icon {
      background: #1e293b;
    }

    :host-context(body.dark-theme) .empty-title,
    :host-context(body.dark-theme) .error-title,
    :host-context(.dark-theme) .empty-title,
    :host-context(.dark-theme) .error-title {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .empty-filter-desc,
    :host-context(.dark-theme) .empty-filter-desc {
      background: #1e293b;
      color: #e2e8f0;
    }

    :host-context(body.dark-theme) .skeleton-image,
    :host-context(body.dark-theme) .skeleton-line,
    :host-context(body.dark-theme) .skeleton-price,
    :host-context(body.dark-theme) .skeleton-button,
    :host-context(.dark-theme) .skeleton-image,
    :host-context(.dark-theme) .skeleton-line,
    :host-context(.dark-theme) .skeleton-price,
    :host-context(.dark-theme) .skeleton-button {
      background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
      background-size: 200% 100%;
    }

    :host-context(body.dark-theme) .unavailable-btn,
    :host-context(.dark-theme) .unavailable-btn {
      background: #1e293b;
      border-color: #334155;
      color: #64748b;
    }

    /* ===== MOBILE RESPONSIVE ===== */
    @media (max-width: 768px) {
      .page-container {
        padding: 1rem 0.75rem 2rem;
      }

      .filter-panel {
        padding: 0.75rem;
        border-radius: 12px;
      }

      .filter-row {
        gap: 0.5rem;
      }

      .dropdowns-row {
        overflow-x: auto;
        flex-wrap: nowrap;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        padding-bottom: 0.25rem;
      }

      .dropdowns-row::-webkit-scrollbar {
        display: none;
      }

      .add-product-btn .btn-text {
        display: none;
      }

      .add-product-btn {
        padding: 0.5rem;
      }

      .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 1rem;
      }

      .pagination-bar {
        flex-direction: column;
        gap: 0.75rem;
        padding: 0.75rem;
      }
    }

    @media (max-width: 480px) {
      .products-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProductListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private companyService = inject(CompanyService);
  private cartService = inject(CartService);
  private notification = inject(NotificationService);
  private destroyRef = inject(DestroyRef);
  private tg = inject(TelegramService);
  authState = inject(AuthStateService);

  // Signals
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  branches = signal<CompanyBranch[]>([]);

  isLoading = signal(true);
  isSearching = signal(false);
  hasError = signal(false);
  searchFocused = signal(false);

  searchQuery = signal('');
  selectedCategoryId = signal<number | null>(null);
  selectedBranchId = signal<number | null>(null);
  sortBy = signal('newest');

  currentPage = signal(1);
  pageSize = signal(12);
  totalItems = signal(0);
  totalPages = signal(1);
  hasPrevious = signal(false);
  hasNext = signal(false);

  showModal = signal(false);
  editingProduct = signal<Product | null>(null);
  addingProductId = signal<number | null>(null);

  private searchSubject = new Subject<string>();
  skeletonItems = Array(8).fill(0);

  sortOptions: SortOption[] = [
    { value: 'newest', label: 'Yangilari birinchi', icon: '✨', sortBy: 'CreatedAt', isDescending: true },
    { value: 'price-asc', label: 'Arzonroq birinchi', icon: '💰', sortBy: 'Price', isDescending: false },
    { value: 'price-desc', label: 'Qimmatroq birinchi', icon: '💎', sortBy: 'Price', isDescending: true },
    { value: 'name-asc', label: 'Nom A-Z', icon: '🔤', sortBy: 'Name', isDescending: false }
  ];

  sortDropdownOptions: DropdownOption[] = this.sortOptions.map(opt => ({
    value: opt.value,
    label: opt.label
  }));

  // Computed - allLabel dropdown tomonidan boshqariladi, shu sababli "Barcha..." options'da yo'q
  categoryOptions = computed<DropdownOption[]>(() => {
    const cats = this.categories();
    return cats.map(c => ({ value: c.id, label: c.title }));
  });

  branchOptions = computed<DropdownOption[]>(() => {
    const branchesList = this.branches();
    return branchesList.map(b => ({ value: b.id, label: b.name }));
  });

  hasActiveFilters = computed(() => {
    return !!this.searchQuery() || this.selectedCategoryId() !== null || this.selectedBranchId() !== null;
  });

  visiblePages = computed(() => {
    const current = this.currentPage();
    const total = this.totalPages();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  ngOnInit(): void {
    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        this.currentPage.set(1);
        this.updateUrlParams();
      }),
      switchMap(() => {
        this.isLoading.set(true);
        this.hasError.set(false);
        return this.fetchProducts().pipe(
          catchError(() => {
            this.hasError.set(true);
            this.isLoading.set(false);
            this.isSearching.set(false);
            return of(null);
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((res) => {
      this.isSearching.set(false);
      if (res) {
        this.handlePagedResult(res);
      }
      this.isLoading.set(false);
    });

    // Read query params
    this.route.queryParams.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(params => {
      let shouldLoad = false;

      if (params['search'] !== undefined && params['search'] !== this.searchQuery()) {
        this.searchQuery.set(params['search'] || '');
        shouldLoad = true;
      }
      if (params['categoryId'] !== undefined) {
        const catId = params['categoryId'] ? Number(params['categoryId']) : null;
        if (catId !== this.selectedCategoryId()) {
          this.selectedCategoryId.set(catId);
          shouldLoad = true;
        }
      }
      if (params['branchId'] !== undefined) {
        const branchId = params['branchId'] ? Number(params['branchId']) : null;
        if (branchId !== this.selectedBranchId()) {
          this.selectedBranchId.set(branchId);
          shouldLoad = true;
        }
      }
      if (params['sort'] !== undefined && params['sort'] !== this.sortBy()) {
        this.sortBy.set(params['sort'] || 'newest');
        shouldLoad = true;
      }
      if (params['page'] !== undefined) {
        const page = Number(params['page']) || 1;
        if (page !== this.currentPage()) {
          this.currentPage.set(page);
          shouldLoad = true;
        }
      }

      if (shouldLoad || this.products().length === 0) {
        this.loadData();
      }
    });

    // Load categories
    this.categoryService.getAll().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (cats) => {
        this.categories.set((cats || []).filter(c => c.isActive));
      }
    });

    // Load branches
    this.companyService.getAllBranches().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (branchesList) => {
        this.branches.set(branchesList || []);
      }
    });
  }

  private fetchProducts() {
    const sortOption = this.sortOptions.find(o => o.value === this.sortBy());
    const query: ProductQuery = {
      pageNumber: this.currentPage(),
      pageSize: this.pageSize(),
      search: this.searchQuery() || undefined,
      categoryId: this.selectedCategoryId() || undefined,
      companyBranchId: this.selectedBranchId() || (this.authState.isBranchManager() ? this.authState.userBranchId() || undefined : undefined),
      sortBy: sortOption?.sortBy,
      isDescending: sortOption?.isDescending
    };

    return this.productService.getPaged(query);
  }

  private handlePagedResult(res: any): void {
    if (res && res.items) {
      this.products.set(res.items);
      this.totalItems.set(res.totalCount);
      this.totalPages.set(res.totalPages || 1);
      this.hasPrevious.set(res.hasPreviousPage);
      this.hasNext.set(res.hasNextPage);
    } else if (Array.isArray(res)) {
      this.products.set(res);
      this.totalItems.set(res.length);
      this.totalPages.set(Math.ceil(res.length / this.pageSize()) || 1);
    }
  }

  loadData(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.fetchProducts().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (res) => {
        this.handlePagedResult(res);
        this.isLoading.set(false);
      },
      error: () => {
        this.hasError.set(true);
        this.isLoading.set(false);
      }
    });
  }

  updateUrlParams(): void {
    const queryParams: Record<string, string | number | null> = {};

    if (this.searchQuery()) {
      queryParams['search'] = this.searchQuery();
    }
    if (this.selectedCategoryId()) {
      queryParams['categoryId'] = this.selectedCategoryId();
    }
    if (this.selectedBranchId()) {
      queryParams['branchId'] = this.selectedBranchId();
    }
    if (this.sortBy() !== 'newest') {
      queryParams['sort'] = this.sortBy();
    }
    if (this.currentPage() > 1) {
      queryParams['page'] = this.currentPage();
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: '',
      replaceUrl: true
    });
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.isSearching.set(true);
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.isSearching.set(false);
    this.currentPage.set(1);
    this.updateUrlParams();
    this.loadData();
  }

  selectCategory(categoryId: string | number | null): void {
    const id = categoryId === null ? null : Number(categoryId);
    if (this.selectedCategoryId() === id) return;
    this.tg.hapticImpact('light');
    this.selectedCategoryId.set(id);
    this.currentPage.set(1);
    this.updateUrlParams();
    this.loadData();
  }

  selectBranch(branchId: string | number | null): void {
    const id = branchId === null ? null : Number(branchId);
    if (this.selectedBranchId() === id) return;
    this.tg.hapticImpact('light');
    this.selectedBranchId.set(id);
    this.currentPage.set(1);
    this.updateUrlParams();
    this.loadData();
  }

  selectSort(value: string | number | null): void {
    const sortValue = String(value || 'newest');
    if (this.sortBy() === sortValue) return;
    this.sortBy.set(sortValue);
    this.currentPage.set(1);
    this.updateUrlParams();
    this.loadData();
  }

  getSelectedCategoryName(): string {
    const catId = this.selectedCategoryId();
    const cat = this.categories().find(c => String(c.id) === String(catId));
    return cat ? cat.title : '';
  }

  getSelectedBranchName(): string {
    const branchId = this.selectedBranchId();
    const branch = this.branches().find(b => String(b.id) === String(branchId));
    return branch ? branch.name : '';
  }

  getBranchName(branchId: number): string {
    const branch = this.branches().find(b => b.id === branchId);
    return branch ? branch.name : `Filial #${branchId}`;
  }

  getCategoryTitle(categoryId: number): string {
    const cat = this.categories().find(c => c.id === categoryId);
    return cat ? cat.title : '';
  }

  getActiveFiltersDescription(): string {
    const parts: string[] = [];

    if (this.searchQuery()) {
      parts.push(`"${this.searchQuery()}"`);
    }

    const catName = this.getSelectedCategoryName();
    if (catName) {
      parts.push(catName);
    }

    const branchName = this.getSelectedBranchName();
    if (branchName) {
      parts.push(branchName);
    }

    return parts.join(' · ') || 'Tanlangan filtrlar';
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategoryId.set(null);
    this.selectedBranchId.set(null);
    this.sortBy.set('newest');
    this.currentPage.set(1);
    this.updateUrlParams();
    this.loadData();
  }

  goToProduct(productId: number): void {
    this.tg.hapticImpact('light');
    this.router.navigate(['/products', productId]);
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.currentPage()) return;
    this.tg.hapticImpact('light');
    this.currentPage.set(p);
    this.updateUrlParams();
    this.loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  nextPage(): void {
    if (this.hasNext()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.hasPrevious()) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  onPageSizeChange(newSize: string | number): void {
    this.tg.hapticImpact('light');
    this.pageSize.set(Number(newSize));
    this.currentPage.set(1);
    this.updateUrlParams();
    this.loadData();
  }

  onImageError(product: Product): void {
    product.image = '';
  }

  addToCart(product: Product): void {
    const customerId = this.authState.currentCustomerId();
    this.addingProductId.set(product.id);

    this.cartService.addItem(customerId, product.id, 1).subscribe({
      next: (success) => {
        this.addingProductId.set(null);
        if (success) {
          this.notification.success(`"${product.name}" savatga qo'shildi!`);
        }
      },
      error: () => {
        this.addingProductId.set(null);
      }
    });
  }

  openCreateModal(): void {
    this.editingProduct.set(null);
    this.showModal.set(true);
  }

  openEditModal(product: Product): void {
    this.editingProduct.set(product);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingProduct.set(null);
  }

  onSaveProduct(dto: CreateProductDto | UpdateProductDto): void {
    if ('id' in dto) {
      this.productService.update(dto).subscribe({
        next: () => {
          this.notification.success("Mahsulot muvaffaqiyatli yangilandi!");
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.closeModal();
        }
      });
    } else {
      this.productService.create(dto).subscribe({
        next: () => {
          this.notification.success("Yangi mahsulot yaratildi!");
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.closeModal();
        }
      });
    }
  }

  deleteProduct(product: Product): void {
    if (!confirm(`Haqiqatan ham "${product.name}" mahsulotini o'chirmoqchimisiz?`)) {
      return;
    }

    this.productService.delete(product.id).subscribe({
      next: () => {
        this.notification.success(`"${product.name}" o'chirildi.`);
        this.loadData();
      }
    });
  }
}
