import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Product, CreateProductDto, UpdateProductDto, PagedResult } from '../../../core/models/product.model';
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
          <p class="page-subtitle">Sifatli va qulay mahsulotlar to'plami (Jami {{ totalItems }} ta)</p>
        </div>

        <button 
          *ngIf="authState.isAdminMode()" 
          class="btn btn-primary"
          (click)="openCreateModal()"
        >
          <span>&#10010;</span> Yangi Mahsulot Qo'shish
        </button>
      </div>

      <!-- Filters & Search Bar -->
      <div class="filter-bar card">
        <div class="search-box">
          <span class="search-icon">&#128269;</span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (ngModelChange)="onFilterChange()"
            placeholder="Mahsulot nomi yoki tavsifi bo'yicha qidiruv..." 
            class="search-input"
          />
          <button *ngIf="searchQuery" class="clear-btn" (click)="searchQuery = ''; onFilterChange()">&times;</button>
        </div>

        <div class="filter-controls">
          <select [(ngModel)]="selectedCategoryId" (ngModelChange)="onFilterChange()" class="form-control select-filter">
            <option [ngValue]="null">Barcha Kategoriyalar</option>
            <option *ngFor="let cat of categories" [ngValue]="cat.id">
              {{ cat.title }}
            </option>
          </select>

          <select [(ngModel)]="sortBy" (ngModelChange)="onSortChange()" class="form-control select-filter">
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
        *ngIf="!isLoading && products.length === 0"
        icon="&#128717;"
        title="Mahsulotlar topilmadi"
        description="Tanlangan filtr yoki qidiruv bo'yicha mahsulot topilmadi."
        [actionText]="emptyActionText"
        (actionClick)="resetFilters()"
      ></app-empty-state>

      <!-- Products Grid -->
      <div class="products-grid" *ngIf="!isLoading && products.length > 0">
        <div class="product-card card" *ngFor="let product of products">
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
                {{ product.price | number:'1.0-0' }} so'm
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
                <span>&#128722;</span>
                <span>{{ addingProductId === product.id ? 'Qo‘shilmoqda...' : 'Savatga' }}</span>
              </button>

              <div class="admin-actions" *ngIf="authState.isAdminMode() || authState.isAdminRole()">
                <button class="btn btn-secondary btn-sm" (click)="openEditModal(product)" title="Tahrirlash">
                  &#9998; Tahrirlash
                </button>
                <button class="btn btn-danger btn-sm" (click)="deleteProduct(product)" title="O'chirish">
                  &#128465; O'chirish
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Server-side Pagination Bar -->
      <div class="pagination-bar card" *ngIf="!isLoading && totalItems > 0">
        <div class="pagination-info">
          Jami: <strong>{{ totalItems }}</strong> ta mahsulot &bull; Sahifa <strong>{{ currentPage }}</strong> / <strong>{{ totalPages }}</strong>
        </div>

        <div class="pagination-controls">
          <button 
            class="page-btn prev-btn" 
            [disabled]="!hasPrevious" 
            (click)="prevPage()"
            title="Oldingi sahifa"
          >
            &laquo; Oldingi
          </button>

          <button 
            *ngIf="visiblePages[0] > 1" 
            class="page-btn" 
            (click)="goToPage(1)"
          >
            1
          </button>
          <span *ngIf="visiblePages[0] > 2" class="page-dots">...</span>

          <button 
            *ngFor="let p of visiblePages" 
            class="page-btn" 
            [class.active]="p === currentPage"
            (click)="goToPage(p)"
          >
            {{ p }}
          </button>

          <span *ngIf="visiblePages[visiblePages.length - 1] < totalPages - 1" class="page-dots">...</span>
          <button 
            *ngIf="visiblePages[visiblePages.length - 1] < totalPages" 
            class="page-btn" 
            (click)="goToPage(totalPages)"
          >
            {{ totalPages }}
          </button>

          <button 
            class="page-btn next-btn" 
            [disabled]="!hasNext" 
            (click)="nextPage()"
            title="Keyingi sahifa"
          >
            Keyingi &raquo;
          </button>
        </div>

        <div class="page-size-picker">
          <span class="size-label">Sahifada:</span>
          <select 
            class="size-select" 
            [ngModel]="pageSize" 
            (ngModelChange)="onPageSizeChange($event)"
          >
            <option [value]="12">12 ta</option>
            <option [value]="24">24 ta</option>
            <option [value]="48">48 ta</option>
          </select>
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
      position: relative;
    }
    .search-icon {
      font-size: 0.875rem;
      color: var(--text-light);
      margin-right: 0.5rem;
    }
    .search-input {
      border: none;
      background: transparent;
      padding: 0.5rem 0;
      width: 100%;
      font-size: 0.875rem;
      color: var(--text-main);
      outline: none;
    }
    .clear-btn {
      background: none;
      border: none;
      color: var(--text-light);
      cursor: pointer;
      font-size: 1rem;
    }
    .filter-controls {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .select-filter {
      min-width: 170px;
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
    }
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .product-card {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: var(--transition);
      border: 1px solid var(--border);
    }
    .product-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-md);
      border-color: #cbd5e1;
    }
    .card-image-wrap {
      position: relative;
      height: 200px;
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
      transition: var(--transition);
    }
    .product-card:hover .product-image {
      transform: scale(1.05);
    }
    .image-fallback {
      width: 60px;
      height: 60px;
      border-radius: var(--radius-full);
      background: var(--primary-light);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      font-weight: 800;
    }
    .stock-badge {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: rgba(15, 23, 42, 0.75);
      color: #ffffff;
      backdrop-filter: blur(4px);
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-full);
    }
    .stock-badge.out-of-stock {
      background: rgba(239, 68, 68, 0.85);
    }
    .card-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .product-category {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 0.35rem;
    }
    .product-name {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--secondary);
      margin-bottom: 0.5rem;
      cursor: pointer;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.35;
    }
    .product-name:hover {
      color: var(--primary);
    }
    .product-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 1rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.4;
      flex: 1;
    }
    .price-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }
    .product-price {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--secondary);
    }
    .branch-tag {
      font-size: 0.7rem;
      color: var(--text-light);
      background: var(--bg-subtle);
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
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
      gap: 0.4rem;
    }
    .admin-actions {
      display: flex;
      gap: 0.5rem;
      width: 100%;
    }
    .admin-actions .btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      padding: 0.5rem;
    }

    /* PAGINATION STYLES */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      margin-top: 1rem;
      margin-bottom: 2.5rem;
      gap: 1rem;
      flex-wrap: wrap;
      background: white;
    }
    .pagination-info {
      font-size: 0.875rem;
      color: #64748b;
    }
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }
    .page-btn {
      padding: 0.45rem 0.85rem;
      border: 1px solid #cbd5e1;
      background: white;
      color: #1e293b;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .page-btn:hover:not(:disabled) {
      background: #eff6ff;
      color: #2563eb;
      border-color: #2563eb;
    }
    .page-btn.active {
      background: #2563eb;
      color: white;
      border-color: #2563eb;
    }
    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .page-dots {
      padding: 0 0.35rem;
      color: #94a3b8;
      font-weight: bold;
    }
    .page-size-picker {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #475569;
    }
    .size-select {
      padding: 0.35rem 0.6rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: white;
      outline: none;
      font-size: 0.875rem;
      cursor: pointer;
    }
  `]
})
export class ProductListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private cartService = inject(CartService);
  private notification = inject(NotificationService);
  authState = inject(AuthStateService);

  products: Product[] = [];
  categories: Category[] = [];
  isLoading = true;

  searchQuery = '';
  selectedCategoryId: number | null = null;
  sortBy = 'default';

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

  get emptyActionText(): string {
    if (this.searchQuery || this.selectedCategoryId !== null) {
      return 'Filtrni tozalash';
    }
    return this.authState.isAdminMode() ? "Mahsulot qo'shish" : '';
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
    // Read query parameter if redirected from global search
    this.route.queryParams.subscribe(params => {
      if (params['q'] !== undefined) {
        this.searchQuery = params['q'] || '';
        this.currentPage = 1;
      }
      this.loadData();
    });

    this.categoryService.getAll().subscribe({
      next: (cats) => (this.categories = cats),
      error: () => {}
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.productService.getPaged(
      this.currentPage,
      this.pageSize,
      this.searchQuery,
      this.selectedCategoryId || undefined
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
          // Fallback if backend returned array
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
            if (this.searchQuery) {
              const q = this.searchQuery.toLowerCase();
              list = list.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
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

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  onSortChange(): void {
    this.applyLocalSort();
  }

  applyLocalSort(): void {
    if (this.sortBy === 'price-asc') {
      this.products.sort((a, b) => a.price - b.price);
    } else if (this.sortBy === 'price-desc') {
      this.products.sort((a, b) => b.price - a.price);
    } else if (this.sortBy === 'name') {
      this.products.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.currentPage) return;
    this.currentPage = p;
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
    this.loadData();
  }
}
