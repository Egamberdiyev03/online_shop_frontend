import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Product, CreateProductDto, UpdateProductDto } from '../../../core/models/product.model';
import { Category } from '../../../core/models/category.model';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ProductFormModalComponent } from '../product-form-modal/product-form-modal.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    LoadingSpinnerComponent, 
    EmptyStateComponent,
    ProductFormModalComponent
  ],
  template: `
    <div class="container">
      <!-- Hero / Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Mahsulotlar Katalogi</h1>
          <p class="page-subtitle">Sifatli va qulay mahsulotlar to'plami</p>
        </div>

        <button 
          *ngIf="authState.isAdminMode()" 
          class="btn btn-primary"
          (click)="openCreateModal()"
        >
          <span>➕</span> Yangi Mahsulot Qo'shish
        </button>
      </div>

      <!-- Filters & Search Bar -->
      <div class="filter-bar card">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Mahsulot nomi yoki tavsifi bo'yicha qidiruv..." 
            class="search-input"
          />
          <button *ngIf="searchQuery" class="clear-btn" (click)="searchQuery = ''">✕</button>
        </div>

        <div class="filter-controls">
          <select [(ngModel)]="selectedCategoryId" class="form-control select-filter">
            <option [ngValue]="null">Barcha Kategoriyalar</option>
            <option *ngFor="let cat of categories" [ngValue]="cat.id">
              {{ cat.title }}
            </option>
          </select>

          <select [(ngModel)]="sortBy" class="form-control select-filter">
            <option value="default">Tartiblash (Standart)</option>
            <option value="price-asc">Narx: Arzondan qimmatga</option>
            <option value="price-desc">Narx: Qimmatdan arzonga</option>
            <option value="name">Nomi bo'yicha (A-Z)</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <app-loading-spinner *ngIf="isLoading" message="Mahsulotlar yuklanmoqda..."></app-loading-spinner>

      <!-- Empty State -->
      <app-empty-state 
        *ngIf="!isLoading && filteredProducts.length === 0"
        icon="🛍"
        title="Mahsulotlar topilmadi"
        description="Tanlangan filtr yoki qidiruv bo'yicha mahsulot topilmadi."
        [actionText]="emptyActionText"
        (actionClick)="resetFilters()"
      ></app-empty-state>

      <!-- Products Grid -->
      <div class="products-grid" *ngIf="!isLoading && filteredProducts.length > 0">
        <div class="product-card card" *ngFor="let product of filteredProducts">
          <div class="card-image-wrap" [routerLink]="['/products', product.id]">
            <img 
              *ngIf="product.image" 
              [src]="product.image" 
              [alt]="product.name"
              class="product-image"
              (error)="product.image = ''"
            />
            <div *ngIf="!product.image" class="image-fallback">
              <span>{{ product.name.charAt(0).toUpperCase() }}</span>
            </div>
            <span class="stock-badge" [class.out-of-stock]="product.quantity <= 0">
              {{ product.quantity > 0 ? product.quantity + ' dona qoldi' : 'Tugagan' }}
            </span>
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
                {{ product.price | currency:'USD':'symbol':'1.2-2' }}
              </div>
              <span class="branch-tag" *ngIf="product.companyBranchId">
                Filial #{{ product.companyBranchId }}
              </span>
            </div>

            <!-- Actions -->
            <div class="card-actions">
              <button 
                class="btn btn-primary add-cart-btn"
                [disabled]="product.quantity <= 0 || addingProductId === product.id"
                (click)="addToCart(product)"
              >
                <span>🛒</span>
                <span>{{ addingProductId === product.id ? 'Qo‘shilmoqda...' : 'Savatga' }}</span>
              </button>

              <div class="admin-actions" *ngIf="authState.isAdminMode()">
                <button class="btn btn-secondary btn-sm" (click)="openEditModal(product)" title="Tahrirlash">
                  ✏
                </button>
                <button class="btn btn-danger btn-sm" (click)="deleteProduct(product)" title="O'chirish">
                  🗑
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create / Edit Modal -->
      <app-product-form-modal 
        *ngIf="showModal"
        [product]="editingProduct"
        (save)="onSaveProduct($event)"
        (cancel)="closeModal()"
      ></app-product-form-modal>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .page-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--secondary);
      letter-spacing: -0.02em;
    }
    .page-subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    .filter-bar {
      padding: 1rem 1.25rem;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .search-box {
      flex: 1;
      min-width: 260px;
      display: flex;
      align-items: center;
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 0.25rem 0.75rem;
    }
    .search-icon {
      font-size: 0.875rem;
      margin-right: 0.5rem;
    }
    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      outline: none;
      padding: 0.5rem 0;
      font-size: 0.875rem;
      color: var(--text-main);
    }
    .clear-btn {
      color: var(--text-light);
      font-size: 0.875rem;
      padding: 0.25rem;
    }
    .filter-controls {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .select-filter {
      width: auto;
      min-width: 170px;
    }
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
      gap: 1.5rem;
    }
    .product-card {
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-lg);
    }
    .card-image-wrap {
      position: relative;
      width: 100%;
      height: 200px;
      background-color: #f1f5f9;
      cursor: pointer;
      overflow: hidden;
    }
    .product-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    .card-image-wrap:hover .product-image {
      transform: scale(1.05);
    }
    .image-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
      color: var(--primary);
      font-size: 3rem;
      font-weight: 800;
    }
    .stock-badge {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: rgba(15, 23, 42, 0.75);
      color: #ffffff;
      backdrop-filter: blur(4px);
      padding: 0.25rem 0.625rem;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
    }
    .stock-badge.out-of-stock {
      background: var(--danger);
    }
    .card-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .product-category {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.375rem;
    }
    .product-name {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--secondary);
      margin-bottom: 0.375rem;
      cursor: pointer;
      line-height: 1.3;
    }
    .product-name:hover {
      color: var(--primary);
    }
    .product-desc {
      font-size: 0.8125rem;
      color: var(--text-muted);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 0.75rem;
    }
    .price-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: auto;
      margin-bottom: 1rem;
    }
    .product-price {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--secondary);
    }
    .branch-tag {
      font-size: 0.75rem;
      color: var(--text-light);
      background: var(--bg-subtle);
      padding: 0.125rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .card-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .add-cart-btn {
      flex: 1;
    }
    .admin-actions {
      display: flex;
      gap: 0.375rem;
    }
  `]
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private cartService = inject(CartService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);

  products: Product[] = [];
  categories: Category[] = [];
  isLoading = true;

  searchQuery = '';
  selectedCategoryId: number | null = null;
  sortBy = 'default';

  showModal = false;
  editingProduct: Product | null = null;
  addingProductId: number | null = null;

  get emptyActionText(): string {
    if (this.searchQuery || this.selectedCategoryId !== null) {
      return 'Filtrni tozalash';
    }
    return this.authState.isAdminMode() ? "Mahsulot qo'shish" : '';
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.productService.getAll().subscribe({
      next: (products) => {
        this.products = products;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    this.categoryService.getAll().subscribe({
      next: (cats) => (this.categories = cats),
      error: () => {}
    });
  }

  get filteredProducts(): Product[] {
    let result = [...this.products];

    // Filter by search query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (this.selectedCategoryId !== null) {
      result = result.filter(p => p.categoryId === this.selectedCategoryId);
    }

    // Sort
    if (this.sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (this.sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (this.sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
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
        next: (updated) => {
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
        next: (created) => {
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
        this.products = this.products.filter(p => p.id !== product.id);
      },
      error: () => {}
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategoryId = null;
    this.sortBy = 'default';
  }
}
