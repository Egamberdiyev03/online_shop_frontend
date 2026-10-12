import { Component, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Product, CreateProductDto, UpdateProductDto, PagedResult } from '../../../core/models/product.model';
import { Category } from '../../../core/models/category.model';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CompanyService } from '../../../core/services/company.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ProductFormModalComponent } from '../product-form-modal/product-form-modal.component';
import { StatCardComponent } from '../../../shared/components/dashboard/stat-card/stat-card.component';
import { ChartCardComponent, DonutSlice } from '../../../shared/components/dashboard/chart-card/chart-card.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ProductFormModalComponent,
    StatCardComponent,
    ChartCardComponent
  ],
  template: `
    <div class="page-wrapper">
      <div class="page-container">
        <!-- Hero / Header -->
        <div class="page-header">
          <div class="header-content">
            <h1 class="page-title">
              {{ authState.isBranchManager() ? 'Filial Mahsulotlari' : 'Mahsulotlar Katalogi' }}
            </h1>
            <p class="page-subtitle">
              {{ authState.isBranchManager()
                  ? 'Filial #' + (authState.userBranchId() || '') + ' - mahsulotlar'
                  : 'Sifatli va qulay mahsulotlar' }}
            </p>
          </div>

          <div class="header-action-group">
            <button
              *ngIf="canViewAnalytics"
              class="btn btn-secondary analytics-btn"
              (click)="toggleAnalytics()"
              type="button"
            >
              <span class="btn-icon">📊</span>
              <span>{{ showAnalytics ? 'Analitikani yopish' : 'Katalog & Ombor Analitikasi' }}</span>
            </button>

            <button
              *ngIf="authState.isAdminMode()"
              class="btn btn-primary add-product-btn"
              (click)="openCreateModal()"
            >
              <span class="btn-icon">+</span>
              <span>Yangi Mahsulot</span>
            </button>
          </div>
        </div>

        <!-- Analytics Section -->
        <div class="analytics-panel" *ngIf="showAnalytics && canViewAnalytics">
          <div class="analytics-kpi-grid">
            <app-stat-card
              label="Jami Mahsulotlar"
              icon="📦"
              [value]="totalAllProducts || totalItems"
              unit="ta"
              [growth]="12"
              timeframe="katalogda"
              theme="blue"
            ></app-stat-card>
            <app-stat-card
              label="Zaxirada Yetarli (>20)"
              icon="✅"
              [value]="inStockCount"
              unit="ta"
              [growth]="8"
              timeframe="faol sotuvda"
              theme="emerald"
            ></app-stat-card>
            <app-stat-card
              label="Kam Qolgan (10-20)"
              icon="⚠️"
              [value]="lowStockCount"
              unit="ta"
              [growth]="-4"
              timeframe="kamaymoqda"
              theme="amber"
            ></app-stat-card>
            <app-stat-card
              label="Kritik Qoldiq (<10)"
              icon="🚨"
              [value]="criticalStockCount"
              unit="ta"
              [growth]="-18"
              timeframe="shoshilinch to'ldirish"
              theme="red"
            ></app-stat-card>
          </div>

          <div class="analytics-charts-grid">
            <app-chart-card
              type="donut"
              title="Ombor Zaxirasi Holati"
              subtitle="Mahsulotlarning zaxira darajasi bo'yicha taqsimoti"
              [donutSlices]="stockDonutSlices"
            ></app-chart-card>
            <app-chart-card
              type="donut"
              title="Kategoriyalar Taqsimoti"
              subtitle="Katalogdagi mahsulotlar ulushi"
              [donutSlices]="categoryChartSlices"
            ></app-chart-card>
          </div>
        </div>

        <!-- 1. Category Cards Overview -->
        <div class="category-cards-section" *ngIf="categories.length > 0">
          <div class="category-section-header">
            <h3 class="category-section-title">Kategoriyalar bo'yicha saralash</h3>
            <span class="category-section-sub">Tezkor kategoriya tanlash va mahsulot ulushlari</span>
          </div>
          <div class="cat-cards-scroll">
            <!-- All Categories Card -->
            <div
              class="cat-overview-card"
              [class.active]="selectedCategoryId === null"
              (click)="selectCategory(null)"
            >
              <div class="cat-card-header">
                <span class="cat-icon-bubble">🏪</span>
                <span class="cat-badge-pill">Barchasi</span>
              </div>
              <div class="cat-card-body">
                <h4 class="cat-title">Barcha Mahsulotlar</h4>
                <div class="cat-count-line">
                  <span class="cat-count-num">{{ totalItems }}</span>
                  <span class="cat-count-unit">mahsulot</span>
                </div>
              </div>
              <div class="cat-progress-wrap">
                <div class="cat-progress-bar" style="width: 100%;"></div>
              </div>
              <div class="cat-pct-label">100% qamrov</div>
            </div>

            <!-- Dynamic Category Cards -->
            <div
              *ngFor="let cat of categories"
              class="cat-overview-card"
              [class.active]="selectedCategoryId === cat.id"
              (click)="selectCategory(cat.id)"
            >
              <div class="cat-card-header">
                <span class="cat-icon-bubble">{{ getCategoryIcon(cat.title) }}</span>
                <span class="cat-badge-pill" *ngIf="getCategoryPercent(cat.id) >= 20">Ommabop</span>
              </div>
              <div class="cat-card-body">
                <h4 class="cat-title">{{ cat.title }}</h4>
                <div class="cat-count-line">
                  <span class="cat-count-num">{{ getCategoryCount(cat.id) }}</span>
                  <span class="cat-count-unit">mahsulot</span>
                </div>
              </div>
              <div class="cat-progress-wrap">
                <div class="cat-progress-bar" [style.width.%]="getCategoryPercent(cat.id)"></div>
              </div>
              <div class="cat-pct-label">{{ getCategoryPercent(cat.id) }}% ulush</div>
            </div>
          </div>
        </div>

        <!-- Sticky Filter Panel -->
        <div class="filter-panel" [class.scrolled]="isScrolled">
          <!-- Search Box -->
          <div class="search-wrapper">
            <div class="search-box" [class.focused]="searchFocused">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchInput($event)"
                (focus)="searchFocused = true"
                (blur)="searchFocused = false"
                placeholder="Mahsulot qidirish..."
                class="search-input"
                aria-label="Mahsulot qidirish"
              />
              <button
                *ngIf="searchQuery"
                class="clear-search-btn"
                (click)="clearSearch()"
                aria-label="Qidiruvni tozalash"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
              <div class="search-spinner" *ngIf="isSearching">
                <div class="spinner-ring"></div>
              </div>
            </div>
          </div>

          <!-- Category Chips -->
          <div class="category-chips-wrapper">
            <div class="category-chips" #categoryChips>
              <button
                class="category-chip"
                [class.active]="selectedCategoryId === null"
                (click)="selectCategory(null)"
              >
                Barchasi
                <span class="chip-count">{{ totalItems }}</span>
              </button>
              <button
                *ngFor="let cat of categories"
                class="category-chip"
                [class.active]="selectedCategoryId === cat.id"
                (click)="selectCategory(cat.id)"
              >
                {{ cat.title }}
                <span class="chip-count" *ngIf="getCategoryCount(cat.id) > 0">{{ getCategoryCount(cat.id) }}</span>
              </button>
            </div>
          </div>

          <!-- Sort & Results Info -->
          <div class="filter-bottom-row">
            <div class="results-info">
              <span class="results-count">{{ totalItems }} ta mahsulot</span>
              <span class="results-showing" *ngIf="products.length > 0">
                ({{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalItems) }} ko'rsatilmoqda)
              </span>
            </div>

            <div class="sort-dropdown-wrapper">
              <label class="sort-label" for="sortSelect">Tartiblash:</label>
              <div class="custom-select" [class.open]="sortDropdownOpen">
                <button
                  class="select-trigger"
                  (click)="toggleSortDropdown()"
                  aria-haspopup="listbox"
                  [attr.aria-expanded]="sortDropdownOpen"
                >
                  <span>{{ getSortLabel(sortBy) }}</span>
                  <svg class="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                <ul class="select-options" role="listbox" *ngIf="sortDropdownOpen">
                  <li
                    *ngFor="let opt of sortOptions"
                    class="select-option"
                    [class.selected]="sortBy === opt.value"
                    (click)="selectSort(opt.value)"
                    role="option"
                  >
                    <span class="option-icon">{{ opt.icon }}</span>
                    <span>{{ opt.label }}</span>
                    <svg *ngIf="sortBy === opt.value" class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Active Filters -->
          <div class="active-filters" *ngIf="hasActiveFilters">
            <span class="filters-label">Filtrlar:</span>
            <div class="filter-tags">
              <span class="filter-tag" *ngIf="searchQuery">
                <span class="tag-label">Qidiruv:</span> "{{ searchQuery }}"
                <button class="tag-remove" (click)="clearSearch()" aria-label="Qidiruvni olib tashlash">&times;</button>
              </span>
              <span class="filter-tag" *ngIf="selectedCategoryId">
                <span class="tag-label">Kategoriya:</span> {{ getSelectedCategoryName() }}
                <button class="tag-remove" (click)="selectCategory(null)" aria-label="Kategoriyani olib tashlash">&times;</button>
              </span>
              <span class="filter-tag" *ngIf="sortBy !== 'default'">
                <span class="tag-label">Tartiblash:</span> {{ getSortLabel(sortBy) }}
                <button class="tag-remove" (click)="selectSort('default')" aria-label="Tartiblashni olib tashlash">&times;</button>
              </span>
            </div>
            <button class="clear-all-btn" (click)="resetFilters()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/>
              </svg>
              Tozalash
            </button>
          </div>
        </div>

        <!-- Skeleton Loading -->
        <div class="products-grid skeleton-grid" *ngIf="isLoading">
          <div class="skeleton-card" *ngFor="let i of [1,2,3,4,5,6,7,8]">
            <div class="skeleton-image"></div>
            <div class="skeleton-body">
              <div class="skeleton-line short"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line medium"></div>
              <div class="skeleton-price"></div>
              <div class="skeleton-button"></div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div class="empty-state-wrapper" *ngIf="!isLoading && products.length === 0">
          <div class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <h3 class="empty-title">Mahsulotlar topilmadi</h3>
            <p class="empty-desc">
              {{ searchQuery ? '"' + searchQuery + '" bo‘yicha hech narsa topilmadi.' : 'Tanlangan filtr bo‘yicha mahsulot yo‘q.' }}
            </p>
            <button class="btn btn-primary" (click)="resetFilters()" *ngIf="hasActiveFilters">
              Filtrlarni tozalash
            </button>
          </div>
        </div>

        <!-- Products Grid -->
        <div class="products-grid" *ngIf="!isLoading && products.length > 0">
          <div class="product-card" *ngFor="let product of products">
            <div class="card-image-wrap" [routerLink]="['/products', product.id]">
              <img
                *ngIf="product.image"
                [src]="product.image"
                [alt]="product.name"
                class="product-image"
                loading="lazy"
                (error)="product.image = ''"
              />
              <div *ngIf="!product.image" class="image-fallback">
                <span>{{ product.name.charAt(0).toUpperCase() }}</span>
              </div>

              <!-- Category Badge -->
              <span class="card-cat-badge" *ngIf="getCategoryTitle(product.categoryId)">
                {{ getCategoryTitle(product.categoryId) }}
              </span>

              <!-- Semantic Stock Badge (>20 Green, 10-20 Yellow, <10 Red, 0 Gray) -->
              <span class="stock-badge" [ngClass]="getStockBadgeClass(product.quantity)">
                {{ getStockBadgeLabel(product.quantity) }}
              </span>

              <!-- Quick Hover Actions -->
              <div class="card-hover-actions" (click)="$event.stopPropagation()">
                <a [routerLink]="['/products', product.id]" class="quick-act-btn" title="Batafsil ko'rish">
                  👁️
                </a>
                <button
                  *ngIf="authState.canUseCart() && product.quantity > 0"
                  class="quick-act-btn cart-act"
                  (click)="addToCart(product)"
                  title="Savatga qo'shish"
                >
                  🛒
                </button>
                <button
                  *ngIf="authState.isAdminMode() || authState.isAdminRole()"
                  class="quick-act-btn edit-act"
                  (click)="openEditModal(product)"
                  title="Tahrirlash"
                >
                  ✏️
                </button>
              </div>
            </div>

            <div class="card-body">
              <div class="product-category" *ngIf="getCategoryTitle(product.categoryId)">
                {{ getCategoryTitle(product.categoryId) }}
              </div>

              <h3 class="product-name" [routerLink]="['/products', product.id]">
                {{ product.name }}
              </h3>

              <p class="product-desc" *ngIf="product.description">
                {{ product.description }}
              </p>

              <div class="price-row">
                <div class="product-price">
                  {{ product.price | number:'1.0-0' }} <span class="currency">so'm</span>
                </div>
                <span class="branch-tag" *ngIf="product.companyBranchId">
                  Filial #{{ product.companyBranchId }}
                </span>
              </div>

              <!-- Actions -->
              <div class="card-actions">
                <button
                  *ngIf="authState.canUseCart()"
                  class="btn btn-primary add-cart-btn"
                  [disabled]="product.quantity <= 0 || addingProductId === product.id"
                  (click)="addToCart(product)"
                >
                  <svg class="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                  </svg>
                  <span>{{ addingProductId === product.id ? 'Qo‘shilmoqda...' : 'Savatga' }}</span>
                </button>

                <div class="admin-actions" *ngIf="authState.isAdminMode() || authState.isAdminRole()">
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
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div class="pagination-bar" *ngIf="!isLoading && totalItems > pageSize">
          <div class="pagination-info">
            Jami <strong>{{ totalItems }}</strong> ta mahsulot
          </div>

          <div class="pagination-controls">
            <button
              class="page-btn nav-btn"
              [disabled]="!hasPrevious"
              (click)="prevPage()"
              aria-label="Oldingi sahifa"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>

            <button
              *ngIf="visiblePages[0] > 1"
              class="page-btn"
              (click)="goToPage(1)"
            >1</button>
            <span *ngIf="visiblePages[0] > 2" class="page-dots">...</span>

            <button
              *ngFor="let p of visiblePages"
              class="page-btn"
              [class.active]="p === currentPage"
              (click)="goToPage(p)"
            >{{ p }}</button>

            <span *ngIf="visiblePages[visiblePages.length - 1] < totalPages - 1" class="page-dots">...</span>
            <button
              *ngIf="visiblePages[visiblePages.length - 1] < totalPages"
              class="page-btn"
              (click)="goToPage(totalPages)"
            >{{ totalPages }}</button>

            <button
              class="page-btn nav-btn"
              [disabled]="!hasNext"
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
              [ngModel]="pageSize"
              (ngModelChange)="onPageSizeChange($event)"
              aria-label="Sahifadagi mahsulotlar soni"
            >
              <option [value]="12">12</option>
              <option [value]="24">24</option>
              <option [value]="48">48</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Overlay for dropdown -->
      <div class="dropdown-overlay" *ngIf="sortDropdownOpen" (click)="sortDropdownOpen = false"></div>

      <!-- Product Form Modal -->
      <app-product-form-modal
        *ngIf="showModal"
        [product]="editingProduct"
        (save)="onSaveProduct($event)"
        (cancel)="closeModal()"
      ></app-product-form-modal>
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

    /* ===== PAGE HEADER ===== */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--text-primary, #0f172a);
      letter-spacing: -0.02em;
      margin: 0;
    }

    .page-subtitle {
      color: var(--text-secondary, #64748b);
      font-size: 0.9rem;
      margin: 0.25rem 0 0;
    }

    .add-product-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      font-weight: 600;
    }

    .btn-icon {
      font-size: 1.25rem;
      line-height: 1;
    }

    .header-action-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .analytics-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.15rem;
      font-weight: 600;
      border-radius: 10px;
    }

    /* ===== ANALYTICS PANEL ===== */
    .analytics-panel {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
      animation: fadeIn 0.3s ease;
    }

    .analytics-kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .analytics-charts-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }

    @media (min-width: 900px) {
      .analytics-charts-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    /* ===== CATEGORY CARDS SECTION ===== */
    .category-cards-section {
      margin-bottom: 1.75rem;
    }

    .category-section-header {
      margin-bottom: 0.875rem;
    }

    .category-section-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      margin: 0;
    }

    .category-section-sub {
      font-size: 0.8125rem;
      color: var(--text-secondary, #64748b);
    }

    .cat-cards-scroll {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.875rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }

    @media (max-width: 768px) {
      .cat-cards-scroll {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        padding-bottom: 0.75rem;
      }
      .cat-overview-card {
        flex: 0 0 200px;
        scroll-snap-align: start;
      }
    }

    .cat-overview-card {
      background: #ffffff;
      border: 1.5px solid #e2e8f0;
      border-radius: 14px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 120px;
    }

    .cat-overview-card:hover {
      transform: translateY(-3px);
      border-color: #6366f1;
      box-shadow: 0 8px 18px rgba(99, 102, 241, 0.12);
    }

    .cat-overview-card.active {
      border-color: #6366f1;
      background: #f5f3ff;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
    }

    .cat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .cat-icon-bubble {
      font-size: 1.35rem;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cat-overview-card.active .cat-icon-bubble {
      background: #e0e7ff;
    }

    .cat-badge-pill {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #6366f1;
      background: #e0e7ff;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
    }

    .cat-card-body {
      margin-bottom: 0.5rem;
    }

    .cat-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      margin: 0 0 0.2rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cat-count-line {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
    }

    .cat-count-num {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--text-primary, #0f172a);
    }

    .cat-count-unit {
      font-size: 0.75rem;
      color: var(--text-secondary, #64748b);
      font-weight: 500;
    }

    .cat-progress-wrap {
      height: 6px;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 0.35rem;
    }

    .cat-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 999px;
      transition: width 0.4s ease;
    }

    .cat-pct-label {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--text-secondary, #64748b);
      text-align: right;
    }

    /* ===== STICKY FILTER PANEL ===== */
    .filter-panel {
      position: sticky;
      top: 0;
      z-index: 40;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 16px;
      padding: 1rem;
      margin-bottom: 1.5rem;
      transition: all 0.3s ease;
    }

    .filter-panel.scrolled {
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border-color: transparent;
    }

    /* ===== SEARCH BOX ===== */
    .search-wrapper {
      margin-bottom: 1rem;
    }

    .search-box {
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

    /* ===== CATEGORY CHIPS ===== */
    .category-chips-wrapper {
      overflow-x: auto;
      margin: 0 -1rem;
      padding: 0 1rem;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .category-chips-wrapper::-webkit-scrollbar {
      display: none;
    }

    .category-chips {
      display: flex;
      gap: 0.5rem;
      padding-bottom: 0.5rem;
    }

    .category-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      background: var(--bg-subtle, #f1f5f9);
      border: 1px solid transparent;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-secondary, #475569);
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .category-chip:hover {
      background: #e0e7ff;
      color: var(--primary, #6366f1);
    }

    .category-chip.active {
      background: var(--primary, #6366f1);
      color: white;
      border-color: var(--primary, #6366f1);
    }

    .chip-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 700;
    }

    .category-chip.active .chip-count {
      background: rgba(255, 255, 255, 0.25);
    }

    /* ===== FILTER BOTTOM ROW ===== */
    .filter-bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border, #e2e8f0);
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .results-info {
      font-size: 0.875rem;
      color: var(--text-secondary, #64748b);
    }

    .results-count {
      font-weight: 700;
      color: var(--text-primary, #0f172a);
    }

    .results-showing {
      color: var(--text-muted, #94a3b8);
    }

    /* ===== CUSTOM SORT DROPDOWN ===== */
    .sort-dropdown-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .sort-label {
      font-size: 0.8125rem;
      color: var(--text-muted, #94a3b8);
      display: none;
    }

    @media (min-width: 640px) {
      .sort-label {
        display: block;
      }
    }

    .custom-select {
      position: relative;
    }

    .select-trigger {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      background: var(--bg-subtle, #f1f5f9);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
      cursor: pointer;
      transition: all 0.2s;
    }

    .select-trigger:hover {
      border-color: var(--primary, #6366f1);
    }

    .custom-select.open .select-trigger {
      border-color: var(--primary, #6366f1);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .select-arrow {
      width: 16px;
      height: 16px;
      transition: transform 0.2s;
    }

    .custom-select.open .select-arrow {
      transform: rotate(180deg);
    }

    .select-options {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      min-width: 200px;
      background: white;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      padding: 0.375rem;
      margin: 0;
      list-style: none;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
      z-index: 50;
    }

    .select-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      font-size: 0.875rem;
      color: var(--text-primary, #0f172a);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .select-option:hover {
      background: var(--bg-subtle, #f1f5f9);
    }

    .select-option.selected {
      background: #eef2ff;
      color: var(--primary, #6366f1);
    }

    .option-icon {
      font-size: 1rem;
    }

    .check-icon {
      width: 16px;
      height: 16px;
      margin-left: auto;
      color: var(--primary, #6366f1);
    }

    .dropdown-overlay {
      position: fixed;
      inset: 0;
      z-index: 39;
    }

    /* ===== ACTIVE FILTERS ===== */
    .active-filters {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border, #e2e8f0);
      flex-wrap: wrap;
    }

    .filters-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
    }

    .filter-tags {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem 0.25rem 0.75rem;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 9999px;
      font-size: 0.75rem;
      color: var(--primary, #4f46e5);
    }

    .tag-label {
      font-weight: 600;
      color: #6366f1;
    }

    .tag-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      background: #c7d2fe;
      border: none;
      border-radius: 50%;
      color: #4f46e5;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
      transition: all 0.15s;
    }

    .tag-remove:hover {
      background: #ef4444;
      color: white;
    }

    .clear-all-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      background: transparent;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted, #64748b);
      cursor: pointer;
      margin-left: auto;
      transition: all 0.2s;
    }

    .clear-all-btn:hover {
      background: #fef2f2;
      border-color: #fecaca;
      color: #ef4444;
    }

    .clear-all-btn svg {
      width: 14px;
      height: 14px;
    }

    /* ===== SKELETON LOADING ===== */
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
      height: 200px;
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

    /* ===== EMPTY STATE ===== */
    .empty-state-wrapper {
      display: flex;
      justify-content: center;
      padding: 4rem 1rem;
    }

    .empty-state {
      text-align: center;
      max-width: 400px;
    }

    .empty-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      background: #f1f5f9;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-icon svg {
      width: 40px;
      height: 40px;
      color: #94a3b8;
    }

    .empty-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary, #0f172a);
      margin: 0 0 0.5rem;
    }

    .empty-desc {
      color: var(--text-secondary, #64748b);
      margin: 0 0 1.5rem;
      line-height: 1.5;
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

    .stock-badge {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      z-index: 2;
      font-size: 0.6875rem;
      font-weight: 700;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      backdrop-filter: blur(4px);
      box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    }

    .stock-badge.stock-green {
      background: rgba(16, 185, 129, 0.92);
      color: white;
    }

    .stock-badge.stock-yellow {
      background: rgba(245, 158, 11, 0.95);
      color: white;
    }

    .stock-badge.stock-red {
      background: rgba(239, 68, 68, 0.95);
      color: white;
      animation: pulseAlert 2s infinite;
    }

    .stock-badge.stock-out {
      background: rgba(100, 116, 139, 0.95);
      color: white;
    }

    @keyframes pulseAlert {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.85; transform: scale(1.04); }
    }

    .card-hover-actions {
      position: absolute;
      bottom: 0.75rem;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      display: flex;
      gap: 0.5rem;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      opacity: 0;
      visibility: hidden;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 3;
    }

    .product-card:hover .card-hover-actions {
      opacity: 1;
      visibility: visible;
      transform: translateX(-50%) translateY(0);
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

    .product-category {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
      color: var(--primary, #6366f1);
      margin-bottom: 0.375rem;
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

    .product-desc {
      font-size: 0.8125rem;
      color: var(--text-secondary, #64748b);
      margin: 0 0 1rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.5;
      flex: 1;
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

    .branch-tag {
      font-size: 0.6875rem;
      color: var(--text-muted, #94a3b8);
      background: var(--bg-subtle, #f1f5f9);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
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

    /* ===== PAGINATION ===== */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      background: white;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      margin-bottom: 2rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .pagination-info {
      font-size: 0.875rem;
      color: var(--text-secondary, #64748b);
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

    :host-context(body.dark-theme) .category-chip,
    :host-context(.dark-theme) .category-chip {
      background: #1e293b;
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .category-chip:hover,
    :host-context(.dark-theme) .category-chip:hover {
      background: #312e81;
      color: #a5b4fc;
    }

    :host-context(body.dark-theme) .category-chip.active,
    :host-context(.dark-theme) .category-chip.active {
      background: #6366f1;
      color: white;
    }

    :host-context(body.dark-theme) .select-trigger,
    :host-context(.dark-theme) .select-trigger {
      background: #1e293b;
      border-color: #334155;
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .select-options,
    :host-context(.dark-theme) .select-options {
      background: #151e32;
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .select-option,
    :host-context(.dark-theme) .select-option {
      color: #e2e8f0;
    }

    :host-context(body.dark-theme) .select-option:hover,
    :host-context(.dark-theme) .select-option:hover {
      background: #1e293b;
    }

    :host-context(body.dark-theme) .select-option.selected,
    :host-context(.dark-theme) .select-option.selected {
      background: #312e81;
    }

    :host-context(body.dark-theme) .product-card,
    :host-context(.dark-theme) .product-card,
    :host-context(body.dark-theme) .skeleton-card,
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
    :host-context(.dark-theme) .product-name,
    :host-context(body.dark-theme) .product-price,
    :host-context(.dark-theme) .product-price,
    :host-context(body.dark-theme) .page-title,
    :host-context(.dark-theme) .page-title {
      color: #f8fafc;
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

    :host-context(body.dark-theme) .filter-bottom-row,
    :host-context(.dark-theme) .filter-bottom-row,
    :host-context(body.dark-theme) .active-filters,
    :host-context(.dark-theme) .active-filters {
      border-top-color: #22304d;
    }

    :host-context(body.dark-theme) .results-count,
    :host-context(.dark-theme) .results-count {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .filter-tag,
    :host-context(.dark-theme) .filter-tag {
      background: #312e81;
      border-color: #4338ca;
      color: #c7d2fe;
    }

    :host-context(body.dark-theme) .skeleton-image,
    :host-context(.dark-theme) .skeleton-image,
    :host-context(body.dark-theme) .skeleton-line,
    :host-context(.dark-theme) .skeleton-line,
    :host-context(body.dark-theme) .skeleton-price,
    :host-context(.dark-theme) .skeleton-price,
    :host-context(body.dark-theme) .skeleton-button,
    :host-context(.dark-theme) .skeleton-button {
      background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
      background-size: 200% 100%;
    }

    :host-context(body.dark-theme) .empty-icon,
    :host-context(.dark-theme) .empty-icon {
      background: #1e293b;
    }

    :host-context(body.dark-theme) .empty-title,
    :host-context(.dark-theme) .empty-title {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .analytics-panel,
    :host-context(.dark-theme) .analytics-panel {
      background: #151e32;
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .cat-overview-card,
    :host-context(.dark-theme) .cat-overview-card {
      background: #151e32;
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .cat-overview-card:hover,
    :host-context(.dark-theme) .cat-overview-card:hover {
      border-color: #6366f1;
    }

    :host-context(body.dark-theme) .cat-overview-card.active,
    :host-context(.dark-theme) .cat-overview-card.active {
      background: #1e1b4b;
      border-color: #6366f1;
    }

    :host-context(body.dark-theme) .cat-icon-bubble,
    :host-context(.dark-theme) .cat-icon-bubble {
      background: #0b0f19;
    }

    :host-context(body.dark-theme) .cat-title,
    :host-context(body.dark-theme) .cat-count-num,
    :host-context(.dark-theme) .cat-title,
    :host-context(.dark-theme) .cat-count-num,
    :host-context(body.dark-theme) .category-section-title,
    :host-context(.dark-theme) .category-section-title {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .cat-progress-wrap,
    :host-context(.dark-theme) .cat-progress-wrap {
      background: #1e293b;
    }
  `]
})
export class ProductListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private cartService = inject(CartService);
  private notification = inject(NotificationService);
  private companyService = inject(CompanyService);
  private destroyRef = inject(DestroyRef);
  authState = inject(AuthStateService);

  Math = Math; // For template usage

  products: Product[] = [];
  categories: Category[] = [];
  categoryCounts: Map<number, number> = new Map();
  allProductsList: Product[] = [];
  showAnalytics = false;
  isLoading = true;
  isSearching = false;
  isScrolled = false;

  get canViewAnalytics(): boolean {
    return this.authState.canViewAnalytics();
  }

  toggleAnalytics(): void {
    if (!this.canViewAnalytics) return;
    this.showAnalytics = !this.showAnalytics;
  }

  get totalAllProducts(): number {
    return this.allProductsList.length || this.totalItems;
  }

  get inStockCount(): number {
    return this.allProductsList.filter(p => p.quantity > 20).length;
  }

  get lowStockCount(): number {
    return this.allProductsList.filter(p => p.quantity >= 10 && p.quantity <= 20).length;
  }

  get criticalStockCount(): number {
    return this.allProductsList.filter(p => p.quantity > 0 && p.quantity < 10).length;
  }

  get outOfStockCount(): number {
    return this.allProductsList.filter(p => p.quantity <= 0).length;
  }

  get stockDonutSlices(): DonutSlice[] {
    const total = this.totalAllProducts || 1;
    return [
      { label: 'Yetarli (>20)', value: this.inStockCount, percent: Math.round((this.inStockCount / total) * 100), color: '#10b981' },
      { label: 'Kam qolgan (10-20)', value: this.lowStockCount, percent: Math.round((this.lowStockCount / total) * 100), color: '#f59e0b' },
      { label: 'Kritik (<10)', value: this.criticalStockCount, percent: Math.round((this.criticalStockCount / total) * 100), color: '#ef4444' },
      { label: 'Tugagan (0)', value: this.outOfStockCount, percent: Math.round((this.outOfStockCount / total) * 100), color: '#64748b' }
    ];
  }

  get categoryChartSlices(): DonutSlice[] {
    const total = this.totalAllProducts || 1;
    const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];
    return this.categories.map((c, i) => {
      const count = this.getCategoryCount(c.id);
      return {
        label: c.title,
        value: count,
        percent: Math.round((count / total) * 100),
        color: colors[i % colors.length]
      };
    });
  }

  getCategoryPercent(categoryId: number): number {
    const total = this.totalAllProducts || this.totalItems || 1;
    const count = this.getCategoryCount(categoryId);
    return Math.round((count / total) * 100);
  }

  getCategoryIcon(title: string): string {
    if (!title) return '📦';
    const t = title.toLowerCase();
    if (t.includes('noutbuk') || t.includes('kompyuter') || t.includes('laptop')) return '💻';
    if (t.includes('telefon') || t.includes('smartfon') || t.includes('phone')) return '📱';
    if (t.includes('audio') || t.includes('naushnik') || t.includes('quloqchin')) return '🎧';
    if (t.includes('maishiy') || t.includes('muzlat') || t.includes('kir')) return '🏠';
    if (t.includes('tv') || t.includes('televizor') || t.includes('ekran')) return '📺';
    if (t.includes('soat') || t.includes('watch') || t.includes('smart')) return '⌚';
    if (t.includes('kamera') || t.includes('foto') || t.includes('camera')) return '📷';
    if (t.includes('oyun') || t.includes('game') || t.includes('playstation') || t.includes('xbox')) return '🎮';
    return '📦';
  }

  getStockBadgeClass(qty: number): string {
    if (qty > 20) return 'stock-green';
    if (qty >= 10) return 'stock-yellow';
    if (qty > 0) return 'stock-red';
    return 'stock-out';
  }

  getStockBadgeLabel(qty: number): string {
    if (qty > 20) return 'Yetarli (' + qty + ')';
    if (qty >= 10) return 'Kam (' + qty + ')';
    if (qty > 0) return 'Kritik (' + qty + ')';
    return 'Tugagan (0)';
  }

  searchQuery = '';
  searchFocused = false;
  private searchSubject = new Subject<string>();
  selectedCategoryId: number | null = null;
  sortBy = 'default';
  sortDropdownOpen = false;

  sortOptions = [
    { value: 'default', label: 'Standart', icon: '📋' },
    { value: 'price-asc', label: 'Narx: Arzondan qimmatga', icon: '💰' },
    { value: 'price-desc', label: 'Narx: Qimmatdan arzonga', icon: '💎' },
    { value: 'name', label: 'Nom: A-Z', icon: '🔤' },
    { value: 'newest', label: 'Yangilari', icon: '✨' }
  ];

  // Server-side Pagination state
  currentPage = 1;
  pageSize = 12;
  totalItems = 0;
  totalPages = 1;
  hasPrevious = false;
  hasNext = false;

  showModal = false;
  editingProduct: Product | null = null;
  addingProductId: number | null = null;

  get hasActiveFilters(): boolean {
    return !!this.searchQuery || this.selectedCategoryId !== null || this.sortBy !== 'default';
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  ngOnInit(): void {
    // Listen for scroll to add shadow to filter panel
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => {
        this.isScrolled = window.scrollY > 50;
      });
    }

    // Setup debounce for search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.isSearching = false;
      this.currentPage = 1;
      this.updateUrlParams();
      this.loadData();
    });

    // Read query parameters
    this.route.queryParams.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(params => {
      let shouldLoad = false;

      if (params['q'] !== undefined && params['q'] !== this.searchQuery) {
        this.searchQuery = params['q'] || '';
        shouldLoad = true;
      }
      if (params['category'] !== undefined) {
        const catId = params['category'] ? Number(params['category']) : null;
        if (catId !== this.selectedCategoryId) {
          this.selectedCategoryId = catId;
          shouldLoad = true;
        }
      }
      if (params['sort'] !== undefined && params['sort'] !== this.sortBy) {
        this.sortBy = params['sort'] || 'default';
        shouldLoad = true;
      }
      if (params['page'] !== undefined) {
        const page = Number(params['page']) || 1;
        if (page !== this.currentPage) {
          this.currentPage = page;
          shouldLoad = true;
        }
      }

      if (shouldLoad || !this.products.length) {
        this.loadData();
      }
    });

    // Load categories
    this.categoryService.getAll().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (cats) => {
        this.categories = (cats || []).filter(c => c.isActive);
        this.loadCategoryCounts();
      },
      error: () => {}
    });
  }

  loadCategoryCounts(): void {
    // Load all products to count by category & provide stock analytics for staff
    this.productService.getAll().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (products) => {
        const rawProducts = products || [];

        // 1. BranchManager: faqat o'z filialidagi mahsulotlar
        if (this.authState.isBranchManager()) {
          const userBranchId = this.authState.userBranchId();
          this.allProductsList = rawProducts.filter(p => p.companyBranchId === userBranchId);
          this.recalcCategoryCounts();
        }
        // 2. CompanyAdmin: faqat o'z kompaniyasining filiallarga tegishli mahsulotlari
        else if (this.authState.isCompanyAdmin()) {
          const companyId = this.authState.userCompanyId();
          if (companyId) {
            this.companyService.getBranchesByCompanyId(companyId).pipe(
              takeUntilDestroyed(this.destroyRef)
            ).subscribe({
              next: (branches) => {
                const branchIds = new Set((branches || []).map(b => b.id));
                this.allProductsList = rawProducts.filter(p => p.companyBranchId != null && branchIds.has(p.companyBranchId));
                this.recalcCategoryCounts();
              },
              error: () => {
                this.allProductsList = rawProducts;
                this.recalcCategoryCounts();
              }
            });
          } else {
            this.allProductsList = rawProducts;
            this.recalcCategoryCounts();
          }
        }
        // 3. SuperAdmin va boshqalar: barcha mahsulotlar
        else {
          this.allProductsList = rawProducts;
          this.recalcCategoryCounts();
        }
      }
    });
  }

  private recalcCategoryCounts(): void {
    this.categoryCounts.clear();
    this.allProductsList.forEach(p => {
      if (p.categoryId) {
        const count = this.categoryCounts.get(p.categoryId) || 0;
        this.categoryCounts.set(p.categoryId, count + 1);
      }
    });
  }

  getCategoryCount(categoryId: number): number {
    return this.categoryCounts.get(categoryId) || 0;
  }

  onSearchInput(value: string): void {
    this.isSearching = true;
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.isSearching = false;
    this.currentPage = 1;
    this.updateUrlParams();
    this.loadData();
  }

  selectCategory(categoryId: number | null): void {
    if (this.selectedCategoryId === categoryId) return;
    this.selectedCategoryId = categoryId;
    this.currentPage = 1;
    this.updateUrlParams();
    this.loadData();
  }

  getSelectedCategoryName(): string {
    if (!this.selectedCategoryId) return '';
    const cat = this.categories.find(c => c.id === this.selectedCategoryId);
    return cat ? cat.title : '';
  }

  toggleSortDropdown(): void {
    this.sortDropdownOpen = !this.sortDropdownOpen;
  }

  selectSort(value: string): void {
    this.sortBy = value;
    this.sortDropdownOpen = false;
    this.updateUrlParams();
    this.applyLocalSort();
  }

  getSortLabel(value: string): string {
    const opt = this.sortOptions.find(o => o.value === value);
    return opt ? opt.label : 'Standart';
  }

  updateUrlParams(): void {
    const queryParams: any = {};

    if (this.searchQuery) {
      queryParams.q = this.searchQuery;
    }
    if (this.selectedCategoryId) {
      queryParams.category = this.selectedCategoryId;
    }
    if (this.sortBy !== 'default') {
      queryParams.sort = this.sortBy;
    }
    if (this.currentPage > 1) {
      queryParams.page = this.currentPage;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: '',
      replaceUrl: true
    });
  }

  loadData(): void {
    this.isLoading = true;
    // BranchManager uchun faqat o'z filiali mahsulotlarini ko'rsatish
    const branchId = this.authState.isBranchManager() ? this.authState.userBranchId() || undefined : undefined;

    this.productService.getPaged(
      this.currentPage,
      this.pageSize,
      this.searchQuery,
      this.selectedCategoryId || undefined,
      branchId
    ).subscribe({
      next: (res: any) => {
        if (res && res.items) {
          this.products = res.items;
          this.totalItems = res.totalCount;
          this.totalPages = res.totalPages || 1;
          this.hasPrevious = res.hasPreviousPage;
          this.hasNext = res.hasNextPage;
          this.applyLocalSort();
        } else if (Array.isArray(res)) {
          this.products = res;
          this.totalItems = res.length;
          this.totalPages = Math.ceil(res.length / this.pageSize) || 1;
        }
        this.isLoading = false;
      },
      error: () => {
        // Fallback to getAll
        this.productService.getAll().subscribe({
          next: (all) => {
            let list = all || [];
            // BranchManager uchun faqat o'z filiali mahsulotlarini ko'rsatish
            if (this.authState.isBranchManager()) {
              const userBranchId = this.authState.userBranchId();
              if (userBranchId) {
                list = list.filter(p => p.companyBranchId === userBranchId);
              }
            }
            if (this.searchQuery) {
              const q = this.searchQuery.toLowerCase();
              list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.description && p.description.toLowerCase().includes(q))
              );
            }
            if (this.selectedCategoryId) {
              list = list.filter(p => p.categoryId === this.selectedCategoryId);
            }
            this.totalItems = list.length;
            this.totalPages = Math.ceil(list.length / this.pageSize) || 1;
            const start = (this.currentPage - 1) * this.pageSize;
            this.products = list.slice(start, start + this.pageSize);
            this.hasPrevious = this.currentPage > 1;
            this.hasNext = this.currentPage < this.totalPages;
            this.applyLocalSort();
            this.isLoading = false;
          },
          error: () => {
            this.isLoading = false;
          }
        });
      }
    });
  }

  applyLocalSort(): void {
    if (this.sortBy === 'price-asc') {
      this.products.sort((a, b) => a.price - b.price);
    } else if (this.sortBy === 'price-desc') {
      this.products.sort((a, b) => b.price - a.price);
    } else if (this.sortBy === 'name') {
      this.products.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy === 'newest') {
      this.products.sort((a, b) => b.id - a.id);
    }
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.currentPage) return;
    this.currentPage = p;
    this.updateUrlParams();
    this.loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  nextPage(): void {
    if (this.hasNext) {
      this.goToPage(this.currentPage + 1);
    }
  }

  prevPage(): void {
    if (this.hasPrevious) {
      this.goToPage(this.currentPage - 1);
    }
  }

  onPageSizeChange(newSize: string | number): void {
    this.pageSize = Number(newSize);
    this.currentPage = 1;
    this.updateUrlParams();
    this.loadData();
  }

  getCategoryTitle(categoryId: number): string {
    const cat = this.categories.find(c => c.id === categoryId);
    return cat ? cat.title : '';
  }

  addToCart(product: Product): void {
    const customerId = this.authState.currentCustomerId();
    this.addingProductId = product.id;

    this.cartService.addItem(customerId, product.id, 1).subscribe({
      next: () => {
        this.addingProductId = null;
        this.notification.success(`"${product.name}" savatga qo'shildi!`);
      },
      error: () => {
        this.addingProductId = null;
      }
    });
  }

  openCreateModal(): void {
    this.editingProduct = null;
    this.showModal = true;
  }

  openEditModal(product: Product): void {
    this.editingProduct = product;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingProduct = null;
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
      },
      error: () => {}
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategoryId = null;
    this.sortBy = 'default';
    this.currentPage = 1;
    this.updateUrlParams();
    this.loadData();
  }
}
