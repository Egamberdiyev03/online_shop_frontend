import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Comment } from '../../../core/models/comment.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { Product } from '../../../core/models/product.model';
import { PagedQuery } from '../../../core/models/payment.model';
import { CommentService } from '../../../core/services/comment.service';
import { CompanyService } from '../../../core/services/company.service';
import { ProductService } from '../../../core/services/product.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { StarRatingComponent } from '../../../shared/components/star-rating/star-rating.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

type CommentSortOption = 'date_desc' | 'date_asc' | 'rating_asc' | 'rating_desc';

@Component({
  selector: 'app-branch-comments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    StarRatingComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="branch-comments-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb-nav">
            <a routerLink="/admin" class="breadcrumb-link">Boshqaruv Paneli</a>
            <span class="breadcrumb-sep">&gt;</span>
            <span class="breadcrumb-current">Filial sharhlari</span>
          </div>
          <h1 class="page-title">💬 Filial sharhlari</h1>
          <p class="page-subtitle">
            {{
              canSelectBranch
                ? "Filiallar mahsulotlariga qoldirilgan mijoz sharhlari va baholar"
                : "Sizning filialingiz mahsulotlariga qoldirilgan mijoz sharhlari"
            }}
          </p>
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="btn quick-low-btn"
            [class.active]="sortOption === 'rating_asc'"
            [disabled]="isLoading"
            (click)="toggleLowRatingsFirst()"
            title="Past baholi sharhlarni birinchi ko'rsatish"
          >
            <span>⬇️ Past baholilar birinchi</span>
          </button>

          <button
            type="button"
            class="btn btn-secondary refresh-btn"
            [disabled]="isLoading"
            (click)="loadComments()"
            title="Ro'yxatni yangilash"
          >
            <span [class.spinning]="isLoading">🔄</span>
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      <!-- Filters Card -->
      <div class="filters-card card">
        <div class="filters-grid">
          <!-- Comment text search -->
          <div class="filter-item search-item">
            <label class="filter-label" for="commentSearch">Sharh matni bo'yicha qidirish</label>
            <div class="search-input-wrap">
              <span class="search-icon" aria-hidden="true">🔍</span>
              <input
                id="commentSearch"
                type="text"
                class="form-control search-input"
                placeholder="Sharh matnidan qidirish..."
                [ngModel]="contentSearch"
                (ngModelChange)="onSearchChange($event)"
              />
              <button
                *ngIf="contentSearch"
                type="button"
                class="clear-btn"
                [disabled]="isLoading"
                (click)="clearSearch()"
                aria-label="Qidiruvni tozalash"
              >&times;</button>
            </div>
          </div>

          <!-- Branch filter: ONLY SuperAdmin and CompanyAdmin -->
          <div class="filter-item" *ngIf="canSelectBranch">
            <label class="filter-label" for="branchFilter">Filial</label>
            <select
              id="branchFilter"
              class="form-control"
              [disabled]="isLoading"
              [(ngModel)]="selectedBranchId"
              (ngModelChange)="onBranchFilterChange()"
            >
              <option value="">Barcha filiallar</option>
              <option *ngFor="let b of availableBranches" [value]="b.id">{{ b.name }}</option>
            </select>
          </div>

          <!-- Product filter (Filters[productId]) -->
          <div class="filter-item">
            <label class="filter-label" for="productFilter">Mahsulot</label>
            <select
              id="productFilter"
              class="form-control"
              [disabled]="isLoading"
              [(ngModel)]="selectedProductId"
              (ngModelChange)="onFilterChange()"
            >
              <option value="">Barcha mahsulotlar</option>
              <option *ngFor="let p of availableProducts" [value]="p.id">{{ getProductOptionLabel(p) }}</option>
            </select>
          </div>

          <!-- Rating filter (1-5) -->
          <div class="filter-item">
            <label class="filter-label" for="ratingFilter">Baho</label>
            <select
              id="ratingFilter"
              class="form-control"
              [disabled]="isLoading"
              [(ngModel)]="selectedRating"
              (ngModelChange)="onFilterChange()"
            >
              <option value="">Barcha baholar</option>
              <option value="5">⭐⭐⭐⭐⭐ (5 yulduz)</option>
              <option value="4">⭐⭐⭐⭐ (4 yulduz)</option>
              <option value="3">⭐⭐⭐ (3 yulduz)</option>
              <option value="2">⭐⭐ (2 yulduz)</option>
              <option value="1">⭐ (1 yulduz)</option>
            </select>
          </div>

          <!-- Sorting -->
          <div class="filter-item">
            <label class="filter-label" for="sortSelect">Saralash</label>
            <select
              id="sortSelect"
              class="form-control"
              [disabled]="isLoading"
              [(ngModel)]="sortOption"
              (ngModelChange)="onSortChange()"
            >
              <option value="date_desc">Yangilari birinchi (Sana ↓)</option>
              <option value="date_asc">Eskilari birinchi (Sana ↑)</option>
              <option value="rating_asc">Past baholilar birinchi (Baho ↑)</option>
              <option value="rating_desc">Yuqori baholilar birinchi (Baho ↓)</option>
            </select>
          </div>

          <div class="filter-item reset-item" *ngIf="hasActiveFilters">
            <button
              type="button"
              class="btn btn-secondary reset-btn"
              [disabled]="isLoading"
              (click)="resetFilters()"
            >
              Tozalash
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <app-loading-spinner *ngIf="isLoading" message="Sharhlar yuklanmoqda..."></app-loading-spinner>

      <!-- Error State -->
      <div *ngIf="!isLoading && hasError" class="error-card card">
        <div class="error-icon">⚠️</div>
        <h3 class="error-title">Sharhlarni yuklashda xatolik</h3>
        <p class="error-desc">{{ errorMessage || "Ma'lumotlarni yuklab bo'lmadi." }}</p>
        <button type="button" class="btn btn-primary" [disabled]="isLoading" (click)="loadComments()">
          Qayta urinish
        </button>
      </div>

      <!-- Empty State -->
      <app-empty-state
        *ngIf="!isLoading && !hasError && comments.length === 0"
        icon="💬"
        title="Hozircha sharhlar yo'q"
        [description]="hasActiveFilters ? 'Tanlangan filtrlar bo\\'yicha sharhlar topilmadi.' : 'Mijozlar mahsulotlarga sharh qoldirganda shu yerda ko\\'rinadi.'"
        [actionText]="hasActiveFilters ? 'Filtrlarni tozalash' : ''"
        (actionClick)="resetFilters()"
      ></app-empty-state>

      <!-- Comments List -->
      <div *ngIf="!isLoading && !hasError && comments.length > 0" class="comments-list">
        <div
          *ngFor="let item of comments; trackBy: trackById"
          class="comment-card card"
          [class.low-rating]="item.starRating <= 2"
        >
          <div class="card-top">
            <div class="product-meta">
              <a [routerLink]="['/products', item.productId]" class="product-name-link">
                🛍️ {{ item.productName || ('Mahsulot #' + item.productId) }}
              </a>
              <span class="customer-name">
                👤 {{ item.userName || ('Mijoz #' + item.userId) }}
              </span>
            </div>

            <div class="rating-and-date">
              <div class="rating-pill" [class.rating-low]="item.starRating <= 2" [class.rating-high]="item.starRating >= 4">
                <app-star-rating [rating]="item.starRating" [readonly]="true"></app-star-rating>
                <span class="rating-num">{{ item.starRating }}/5</span>
              </div>
              <span class="comment-date">{{ item.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
            </div>
          </div>

          <div class="comment-body-row">
            <p class="comment-body">{{ item.content || "Matn kiritilmagan" }}</p>

            <button
              *ngIf="canDeleteComments"
              type="button"
              class="btn btn-danger btn-sm delete-comment-btn"
              [disabled]="isLoading || isDeletingComment"
              (click)="openDeleteModal(item)"
            >
              🗑️ O'chirish
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Reason Modal -->
      <div class="modal-overlay" *ngIf="deleteTargetComment" (click)="closeDeleteModal()">
        <div class="modal-card card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2 class="modal-title">🗑️ Sharhni o'chirish</h2>
            <button
              type="button"
              class="modal-close-btn"
              [disabled]="isDeletingComment"
              (click)="closeDeleteModal()"
              aria-label="Yopish"
            >&times;</button>
          </div>

          <div class="modal-comment-preview" *ngIf="deleteTargetComment as target">
            <div class="preview-meta">
              <strong>{{ target.productName || ('Mahsulot #' + target.productId) }}</strong>
              <span>• {{ target.userName || ('Mijoz #' + target.userId) }} ({{ target.starRating }}/5 ⭐)</span>
            </div>
            <p class="preview-text">{{ target.content || "Matn kiritilmagan" }}</p>
          </div>

          <div class="form-group">
            <label class="filter-label" for="deleteReasonInput">
              O'chirish sababi <span class="required">*</span>
            </label>
            <textarea
              id="deleteReasonInput"
              rows="3"
              class="form-control reason-textarea"
              [(ngModel)]="deleteReason"
              (ngModelChange)="deleteReasonTouched = true"
              [disabled]="isDeletingComment"
              placeholder="Sababni kiriting (kamida 5 ta belgi)..."
            ></textarea>
            <div class="reason-meta-row">
              <span
                class="reason-error"
                *ngIf="deleteReasonTouched && !isDeleteReasonValid"
              >
                Sabab matni kamida 5 ta belgidan iborat bo'lishi kerak.
              </span>
              <span class="reason-count">{{ deleteReason.trim().length }} / 5+</span>
            </div>
          </div>

          <div class="modal-actions">
            <button
              type="button"
              class="btn btn-secondary"
              [disabled]="isDeletingComment"
              (click)="closeDeleteModal()"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              class="btn btn-danger"
              [disabled]="isDeletingComment || !isDeleteReasonValid"
              (click)="confirmDelete()"
            >
              {{ isDeletingComment ? "O'chirilmoqda..." : "Tasdiqlash" }}
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination-bar" *ngIf="!isLoading && !hasError && totalCount > 0">
        <div class="pagination-info">
          Jami <strong>{{ totalCount }}</strong> ta sharh
          <span *ngIf="totalPages > 1"> • Sahifa {{ currentPage }} / {{ totalPages }}</span>
        </div>

        <div class="pagination-controls" *ngIf="totalPages > 1">
          <button
            type="button"
            class="page-btn nav-btn"
            [disabled]="!hasPreviousPage || isLoading"
            (click)="prevPage()"
            aria-label="Oldingi sahifa"
          >
            &larr;
          </button>

          <button
            *ngIf="visiblePages[0] > 1"
            type="button"
            class="page-btn"
            [disabled]="isLoading"
            (click)="goToPage(1)"
          >1</button>
          <span *ngIf="visiblePages[0] > 2" class="page-dots">...</span>

          <button
            *ngFor="let p of visiblePages"
            type="button"
            class="page-btn"
            [class.active]="p === currentPage"
            [disabled]="isLoading"
            (click)="goToPage(p)"
          >{{ p }}</button>

          <span *ngIf="visiblePages[visiblePages.length - 1] < totalPages - 1" class="page-dots">...</span>
          <button
            *ngIf="visiblePages[visiblePages.length - 1] < totalPages"
            type="button"
            class="page-btn"
            [disabled]="isLoading"
            (click)="goToPage(totalPages)"
          >{{ totalPages }}</button>

          <button
            type="button"
            class="page-btn nav-btn"
            [disabled]="!hasNextPage || isLoading"
            (click)="nextPage()"
            aria-label="Keyingi sahifa"
          >
            &rarr;
          </button>
        </div>

        <div class="page-size-picker">
          <label for="commentPageSize">Sahifada:</label>
          <select
            id="commentPageSize"
            class="form-control page-size-select"
            [disabled]="isLoading"
            [(ngModel)]="pageSize"
            (ngModelChange)="onPageSizeChange()"
          >
            <option [ngValue]="10">10</option>
            <option [ngValue]="12">12</option>
            <option [ngValue]="20">20</option>
            <option [ngValue]="50">50</option>
          </select>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .branch-comments-page {
      max-width: 1120px;
      margin: 0 auto;
      padding: 1.5rem 1rem 4rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .breadcrumb-nav {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.8125rem;
      color: var(--text-muted, #64748b);
      margin-bottom: 0.45rem;
    }

    .breadcrumb-link {
      color: var(--primary, #4f46e5);
      text-decoration: none;
      font-weight: 600;
    }

    .breadcrumb-link:hover {
      text-decoration: underline;
    }

    .page-title {
      font-size: 1.65rem;
      font-weight: 800;
      color: var(--text-main, #0f172a);
      margin: 0 0 0.25rem;
    }

    .page-subtitle {
      margin: 0;
      font-size: 0.9rem;
      color: var(--text-muted, #64748b);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .quick-low-btn {
      background: var(--bg-card, #ffffff);
      color: var(--text-main, #0f172a);
      border: 1px solid var(--border, #e2e8f0);
      font-weight: 600;
      padding: 0.55rem 0.95rem;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .quick-low-btn:hover:not(:disabled) {
      border-color: #f59e0b;
      background: #fffbeb;
      color: #b45309;
    }

    .quick-low-btn.active {
      background: #fef3c7;
      border-color: #f59e0b;
      color: #b45309;
    }

    .refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .spinning {
      display: inline-block;
      animation: spin 0.9s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Filters */
    .filters-card {
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.85rem;
      align-items: end;
    }

    .search-item {
      grid-column: span 2;
    }

    @media (max-width: 720px) {
      .search-item {
        grid-column: span 1;
      }
    }

    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .filter-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-muted, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .search-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      font-size: 0.9rem;
      pointer-events: none;
    }

    .search-input {
      padding-left: 2.2rem;
      padding-right: 2rem;
    }

    .clear-btn {
      position: absolute;
      right: 0.5rem;
      background: none;
      border: none;
      font-size: 1.15rem;
      color: var(--text-muted, #64748b);
      cursor: pointer;
      padding: 0 0.25rem;
    }

    .reset-item {
      justify-content: flex-end;
    }

    .reset-btn {
      height: 42px;
    }

    /* Error card */
    .error-card {
      text-align: center;
      padding: 2.5rem 1.5rem;
      margin-bottom: 1.25rem;
    }

    .error-icon {
      font-size: 2.25rem;
      margin-bottom: 0.5rem;
    }

    .error-title {
      margin: 0 0 0.4rem;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main, #0f172a);
    }

    .error-desc {
      margin: 0 0 1rem;
      color: var(--text-muted, #64748b);
      font-size: 0.9rem;
    }

    /* Comments List */
    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .comment-card {
      padding: 1.15rem 1.25rem;
      border-left: 4px solid var(--primary, #4f46e5);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .comment-card.low-rating {
      border-left-color: #f59e0b;
    }

    .comment-card:hover {
      box-shadow: var(--shadow-md, 0 4px 14px rgba(15, 23, 42, 0.08));
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 0.75rem;
    }

    .product-meta {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .product-name-link {
      font-size: 1rem;
      font-weight: 700;
      color: var(--primary, #4f46e5);
      text-decoration: none;
    }

    .product-name-link:hover {
      text-decoration: underline;
    }

    .customer-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted, #64748b);
    }

    .rating-and-date {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.3rem;
    }

    @media (max-width: 600px) {
      .rating-and-date {
        align-items: flex-start;
      }
    }

    .rating-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      background: var(--bg-subtle, #f1f5f9);
    }

    .rating-pill.rating-low {
      background: #fef3c7;
    }

    .rating-pill.rating-high {
      background: #dcfce7;
    }

    .rating-num {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-main, #0f172a);
    }

    .comment-date {
      font-size: 0.78rem;
      color: var(--text-muted, #64748b);
    }

    .comment-body-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .comment-body {
      margin: 0;
      flex: 1;
      min-width: 220px;
      font-size: 0.95rem;
      line-height: 1.55;
      color: var(--text-main, #0f172a);
      white-space: pre-line;
    }

    .delete-comment-btn {
      flex-shrink: 0;
      white-space: nowrap;
    }

    /* Delete Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      z-index: 1200;
    }

    .modal-card {
      width: 100%;
      max-width: 480px;
      padding: 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }

    .modal-title {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main, #0f172a);
    }

    .modal-close-btn {
      border: none;
      background: transparent;
      font-size: 1.5rem;
      line-height: 1;
      color: var(--text-muted, #64748b);
      cursor: pointer;
    }

    .modal-comment-preview {
      padding: 0.75rem 0.9rem;
      border-radius: 10px;
      background: var(--bg-subtle, #f8fafc);
      border: 1px solid var(--border, #e2e8f0);
    }

    .preview-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      font-size: 0.84rem;
      margin-bottom: 0.35rem;
      color: var(--text-main, #0f172a);
    }

    .preview-meta span {
      color: var(--text-muted, #64748b);
    }

    .preview-text {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-muted, #475569);
      line-height: 1.45;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .required {
      color: #ef4444;
    }

    .reason-textarea {
      resize: vertical;
      min-height: 86px;
    }

    .reason-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      min-height: 18px;
    }

    .reason-error {
      font-size: 0.8rem;
      color: #ef4444;
      font-weight: 500;
    }

    .reason-count {
      margin-left: auto;
      font-size: 0.78rem;
      color: var(--text-muted, #64748b);
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.65rem;
    }

    /* Pagination */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      margin-top: 1.5rem;
      padding: 0.9rem 1.15rem;
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
    }

    .pagination-info {
      font-size: 0.875rem;
      color: var(--text-muted, #64748b);
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .page-btn {
      min-width: 36px;
      height: 36px;
      padding: 0 0.6rem;
      border-radius: 8px;
      border: 1px solid var(--border, #e2e8f0);
      background: var(--bg-card, #ffffff);
      color: var(--text-main, #0f172a);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .page-btn:hover:not(:disabled) {
      border-color: var(--primary, #4f46e5);
      color: var(--primary, #4f46e5);
    }

    .page-btn.active {
      background: var(--primary, #4f46e5);
      border-color: var(--primary, #4f46e5);
      color: #ffffff;
    }

    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .page-dots {
      padding: 0 0.25rem;
      color: var(--text-muted, #64748b);
    }

    .page-size-picker {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--text-muted, #64748b);
    }

    .page-size-select {
      width: auto;
      min-width: 72px;
      padding: 0.3rem 0.55rem;
      height: 36px;
    }

    /* Dark theme */
    :host-context(body.dark-theme) .quick-low-btn {
      background: #151e32;
      border-color: #334155;
      color: #e2e8f0;
    }

    :host-context(body.dark-theme) .quick-low-btn.active {
      background: rgba(245, 158, 11, 0.2);
      border-color: #f59e0b;
      color: #fbbf24;
    }

    :host-context(body.dark-theme) .rating-pill {
      background: #1e293b;
    }

    :host-context(body.dark-theme) .rating-pill.rating-low {
      background: rgba(245, 158, 11, 0.18);
    }

    :host-context(body.dark-theme) .rating-pill.rating-high {
      background: rgba(34, 197, 94, 0.18);
    }

    :host-context(body.dark-theme) .rating-num {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .pagination-bar,
    :host-context(body.dark-theme) .page-btn {
      background: #151e32;
      border-color: #232b45;
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .modal-comment-preview {
      background: #1e293b;
      border-color: #334155;
    }

    :host-context(body.dark-theme) .preview-text {
      color: #cbd5e1;
    }
  `]
})
export class BranchCommentsComponent implements OnInit, OnDestroy {
  private commentService = inject(CommentService);
  private companyService = inject(CompanyService);
  private productService = inject(ProductService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);

  comments: Comment[] = [];
  branches: CompanyBranch[] = [];
  products: Product[] = [];

  isLoading = false;
  hasError = false;
  errorMessage = '';

  // Delete modal state
  deleteTargetComment: Comment | null = null;
  deleteReason = '';
  deleteReasonTouched = false;
  isDeletingComment = false;

  // Filters & sorting
  contentSearch = '';
  selectedBranchId = '';
  selectedProductId = '';
  selectedRating = '';
  sortOption: CommentSortOption = 'date_desc';

  // Pagination
  currentPage = 1;
  pageSize = 12;
  totalCount = 0;
  totalPages = 0;
  hasPreviousPage = false;
  hasNextPage = false;

  private searchSubject = new Subject<string>();
  private sub = new Subscription();

  get canSelectBranch(): boolean {
    return this.authState.isSuperAdmin() || this.authState.isCompanyAdmin();
  }

  // CommentController.DeleteByStaff: [Authorize(Roles = "SuperAdmin,CompanyAdmin,BranchManager")]
  get canDeleteComments(): boolean {
    const role = this.authState.userRole();
    return role === 'SuperAdmin' || role === 'CompanyAdmin' || role === 'BranchManager';
  }

  get isDeleteReasonValid(): boolean {
    return this.deleteReason.trim().length >= 5;
  }

  get availableBranches(): CompanyBranch[] {
    if (this.authState.isSuperAdmin()) {
      return this.branches;
    }
    if (this.authState.isCompanyAdmin()) {
      const myCompanyId = this.authState.userCompanyId();
      return myCompanyId ? this.branches.filter(b => Number(b.companyId) === Number(myCompanyId)) : [];
    }
    return [];
  }

  get availableProducts(): Product[] {
    if (this.canSelectBranch) {
      if (this.selectedBranchId) {
        const bId = Number(this.selectedBranchId);
        return this.products.filter(p => Number(p.companyBranchId) === bId);
      }
      if (this.authState.isCompanyAdmin()) {
        const companyBranchIds = new Set(this.availableBranches.map(b => Number(b.id)));
        return companyBranchIds.size > 0
          ? this.products.filter(p => companyBranchIds.has(Number(p.companyBranchId)))
          : this.products;
      }
      return this.products;
    }

    const myBranchId = this.authState.userBranchId();
    return myBranchId ? this.products.filter(p => Number(p.companyBranchId) === Number(myBranchId)) : this.products;
  }

  getProductOptionLabel(p: Product): string {
    if (this.canSelectBranch && !this.selectedBranchId && p.companyBranchId) {
      const branch = this.branches.find(b => Number(b.id) === Number(p.companyBranchId));
      const branchLabel = branch?.name || `Filial #${p.companyBranchId}`;
      return `${p.name} (${branchLabel})`;
    }
    return p.name;
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.contentSearch.trim() ||
      (this.canSelectBranch && this.selectedBranchId) ||
      this.selectedProductId ||
      this.selectedRating ||
      this.sortOption !== 'date_desc'
    );
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  ngOnInit(): void {
    this.sub.add(
      this.searchSubject.pipe(debounceTime(350), distinctUntilChanged()).subscribe(term => {
        this.contentSearch = term;
        this.currentPage = 1;
        this.loadComments();
      })
    );

    if (this.canSelectBranch) {
      this.companyService.getAllBranches().pipe(catchError(() => of([] as CompanyBranch[]))).subscribe(list => {
        this.branches = list || [];
      });
    }

    this.productService.getAll().pipe(catchError(() => of([] as Product[]))).subscribe(list => {
      this.products = list || [];
    });

    this.loadComments();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  loadComments(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    const filters: Record<string, string> = {};
    if (this.selectedRating) {
      filters['starRating'] = this.selectedRating;
    }
    if (this.selectedProductId) {
      filters['productId'] = this.selectedProductId;
    }
    if (this.contentSearch.trim()) {
      filters['content'] = this.contentSearch.trim();
    }

    const { sortBy, isDescending } = this.resolveSortParams();
    const query: PagedQuery = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      sortBy,
      isDescending,
      ...(Object.keys(filters).length > 0 ? { filters } : {})
    };

    // Faqat SuperAdmin va CompanyAdmin uchun ixtiyoriy branchId yuboriladi
    const branchId = this.canSelectBranch && this.selectedBranchId
      ? Number(this.selectedBranchId)
      : undefined;

    this.commentService.getByBranchPaged(query, branchId).subscribe({
      next: (res) => {
        this.comments = res.items || [];
        this.totalCount = res.totalCount || 0;
        this.pageSize = res.pageSize || this.pageSize;
        this.currentPage = res.pageNumber || this.currentPage;
        this.totalPages = res.totalPages || 0;
        this.hasPreviousPage = res.hasPreviousPage ?? this.currentPage > 1;
        this.hasNextPage = res.hasNextPage ?? this.currentPage < this.totalPages;
        this.isLoading = false;
      },
      error: (err) => {
        const handled = this.isHandledHttpError(err);
        const msg = handled
          ? "Serverda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
          : (err?.message || err?.error?.message || "Filial sharhlarini yuklashda xatolik yuz berdi");
        this.errorMessage = msg;
        this.hasError = true;
        this.isLoading = false;
        if (!handled) {
          this.notification.error(msg);
        }
      }
    });
  }

  private resolveSortParams(): { sortBy: string; isDescending: boolean } {
    switch (this.sortOption) {
      case 'date_asc':
        return { sortBy: 'CreatedAt', isDescending: false };
      case 'rating_asc':
        return { sortBy: 'StarRating', isDescending: false };
      case 'rating_desc':
        return { sortBy: 'StarRating', isDescending: true };
      case 'date_desc':
      default:
        return { sortBy: 'CreatedAt', isDescending: true };
    }
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.contentSearch = '';
    this.currentPage = 1;
    this.loadComments();
  }

  onBranchFilterChange(): void {
    if (this.selectedProductId) {
      const stillValid = this.availableProducts.some(p => String(p.id) === String(this.selectedProductId));
      if (!stillValid) {
        this.selectedProductId = '';
      }
    }
    this.currentPage = 1;
    this.loadComments();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadComments();
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.loadComments();
  }

  toggleLowRatingsFirst(): void {
    if (this.isLoading) return;
    this.sortOption = this.sortOption === 'rating_asc' ? 'date_desc' : 'rating_asc';
    this.currentPage = 1;
    this.loadComments();
  }

  resetFilters(): void {
    this.contentSearch = '';
    this.selectedBranchId = '';
    this.selectedProductId = '';
    this.selectedRating = '';
    this.sortOption = 'date_desc';
    this.currentPage = 1;
    this.loadComments();
  }

  goToPage(page: number): void {
    if (this.isLoading || page < 1 || page === this.currentPage || (this.totalPages > 0 && page > this.totalPages)) {
      return;
    }
    this.currentPage = page;
    this.loadComments();
  }

  prevPage(): void {
    if (this.hasPreviousPage) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.hasNextPage) {
      this.goToPage(this.currentPage + 1);
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadComments();
  }

  openDeleteModal(comment: Comment): void {
    if (!this.canDeleteComments || this.isDeletingComment) return;
    this.deleteTargetComment = comment;
    this.deleteReason = '';
    this.deleteReasonTouched = false;
  }

  closeDeleteModal(): void {
    if (this.isDeletingComment) return;
    this.deleteTargetComment = null;
    this.deleteReason = '';
    this.deleteReasonTouched = false;
  }

  confirmDelete(): void {
    if (!this.deleteTargetComment || this.isDeletingComment) return;
    this.deleteReasonTouched = true;
    const trimmedReason = this.deleteReason.trim();
    if (trimmedReason.length < 5) {
      this.notification.warning("O'chirish sababi kamida 5 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    const targetId = this.deleteTargetComment.id;
    this.isDeletingComment = true;

    this.commentService.deleteByStaff(targetId, trimmedReason).subscribe({
      next: () => {
        this.isDeletingComment = false;
        this.deleteTargetComment = null;
        this.deleteReason = '';
        this.deleteReasonTouched = false;
        this.comments = this.comments.filter(c => c.id !== targetId);
        this.totalCount = Math.max(0, this.totalCount - 1);
        this.totalPages = this.totalCount > 0 ? Math.ceil(this.totalCount / this.pageSize) : 0;
        this.hasPreviousPage = this.currentPage > 1;
        this.hasNextPage = this.currentPage < this.totalPages;
        this.notification.success("Sharh muvaffaqiyatli o'chirildi.");

        if (this.comments.length === 0 && this.totalCount > 0) {
          this.currentPage = Math.max(1, Math.min(this.currentPage - 1, this.totalPages));
          this.loadComments();
        }
      },
      error: (err) => {
        this.isDeletingComment = false;
        if (!this.isHandledHttpError(err)) {
          const msg = err?.message || err?.error?.message || "Sharhni o'chirishda xatolik yuz berdi";
          this.notification.error(msg);
        }
      }
    });
  }

  private isHandledHttpError(err: unknown): boolean {
    return err instanceof HttpErrorResponse &&
      (err.status === 0 || err.status === 401 || err.status === 403 || err.status >= 500);
  }

  trackById(index: number, item: Comment): number {
    return item.id;
  }
}
