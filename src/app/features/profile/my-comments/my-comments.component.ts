import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CommentService } from '../../../core/services/comment.service';
import { TelegramService } from '../../../core/services/telegram.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Comment } from '../../../core/models/comment.model';

@Component({
  selector: 'app-my-comments',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="comments-page">
      <!-- Header -->
      <header class="page-header">
        <h1 class="page-title">Sharhlarim</h1>
        <span class="comments-count" *ngIf="totalCount > 0">{{ totalCount }} ta</span>
      </header>

      <!-- Loading Skeleton -->
      <div class="skeleton-list" *ngIf="isLoading && comments.length === 0">
        <div class="skeleton-card" *ngFor="let i of [1,2,3]">
          <div class="skeleton-header">
            <div class="skeleton-rating"></div>
            <div class="skeleton-date"></div>
          </div>
          <div class="skeleton-body"></div>
          <div class="skeleton-product"></div>
        </div>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="hasError && !isLoading">
        <div class="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p class="error-text">Ma'lumotlarni yuklashda xatolik</p>
        <button class="btn btn-primary" (click)="loadComments()">Qayta urinish</button>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && !hasError && comments.length === 0">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h3 class="empty-title">Siz hali sharh yozmagansiz</h3>
        <p class="empty-text">Mahsulotlarga sharh qoldirib, boshqalarga yordam bering</p>
        <a routerLink="/products" class="btn btn-primary">Mahsulotlarga o'tish</a>
      </div>

      <!-- Comments List -->
      <div class="comments-list" *ngIf="!hasError && comments.length > 0">
        <div class="comment-card" *ngFor="let comment of comments; trackBy: trackById">
          <!-- Header -->
          <div class="comment-header">
            <div class="rating-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>{{ comment.starRating }}</span>
            </div>
            <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
          </div>

          <!-- Content -->
          <p class="comment-content">{{ comment.content }}</p>

          <!-- Product Link -->
          <a [routerLink]="['/products', comment.productId]" class="product-link" (click)="onProductClick($event)">
            <span class="product-label">Mahsulot #{{ comment.productId }}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>

          <!-- Delete Button -->
          <button
            class="delete-btn"
            (click)="deleteComment(comment)"
            aria-label="Sharhni o'chirish"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>

        <!-- Load More Button -->
        <button
          *ngIf="hasNextPage && !isLoadingMore"
          class="load-more-btn"
          (click)="loadMore()"
        >
          Yana yuklash
        </button>

        <!-- Loading More Spinner -->
        <div class="load-more-spinner" *ngIf="isLoadingMore">
          <div class="spinner"></div>
        </div>

        <!-- End of List -->
        <div class="end-of-list" *ngIf="!hasNextPage && comments.length > 0">
          <span>Ro'yxat tugadi</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .comments-page {
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--bg-main, #f8fafc);
      padding: 16px;
      padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-main, #0f172a);
      margin: 0;
    }

    .comments-count {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted, #64748b);
      background: var(--bg-subtle, #f1f5f9);
      padding: 6px 12px;
      border-radius: 20px;
    }

    /* Skeleton */
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .skeleton-card {
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 16px;
      padding: 16px;
    }

    .skeleton-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .skeleton-rating {
      width: 60px;
      height: 24px;
      background: linear-gradient(90deg, var(--bg-subtle, #f1f5f9) 25%, var(--bg-card, #ffffff) 50%, var(--bg-subtle, #f1f5f9) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
    }

    .skeleton-date {
      width: 80px;
      height: 16px;
      background: linear-gradient(90deg, var(--bg-subtle, #f1f5f9) 25%, var(--bg-card, #ffffff) 50%, var(--bg-subtle, #f1f5f9) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }

    .skeleton-body {
      height: 48px;
      background: linear-gradient(90deg, var(--bg-subtle, #f1f5f9) 25%, var(--bg-card, #ffffff) 50%, var(--bg-subtle, #f1f5f9) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
      margin-bottom: 12px;
    }

    .skeleton-product {
      width: 120px;
      height: 20px;
      background: linear-gradient(90deg, var(--bg-subtle, #f1f5f9) 25%, var(--bg-card, #ffffff) 50%, var(--bg-subtle, #f1f5f9) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Error & Empty States */
    .error-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
    }

    .error-icon, .empty-icon {
      color: var(--text-light, #94a3b8);
      margin-bottom: 16px;
    }

    .error-text, .empty-text {
      color: var(--text-muted, #64748b);
      font-size: 14px;
      margin-bottom: 16px;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-main, #0f172a);
      margin: 0 0 8px;
    }

    /* Comments List */
    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .comment-card {
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 16px;
      padding: 16px;
      position: relative;
    }

    .comment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .rating-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      background: #fef3c7;
      color: #b45309;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
    }

    .comment-date {
      font-size: 13px;
      color: var(--text-muted, #64748b);
    }

    .comment-content {
      font-size: 15px;
      color: var(--text-main, #0f172a);
      line-height: 1.6;
      margin: 0 0 12px;
    }

    .product-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--primary, #4f46e5);
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      padding: 6px 0;
    }

    .product-link:hover {
      text-decoration: underline;
    }

    .delete-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--text-light, #94a3b8);
      cursor: pointer;
      border-radius: 10px;
      transition: all 0.2s;
      -webkit-tap-highlight-color: transparent;
    }

    .delete-btn:hover {
      background: var(--danger-bg, #fee2e2);
      color: var(--danger, #ef4444);
    }

    .delete-btn:active {
      transform: scale(0.95);
    }

    /* Load More */
    .load-more-btn {
      width: 100%;
      height: 48px;
      background: var(--bg-subtle, #f1f5f9);
      color: var(--text-main, #0f172a);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .load-more-btn:hover {
      background: var(--border, #e2e8f0);
    }

    .load-more-spinner {
      display: flex;
      justify-content: center;
      padding: 16px;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--border, #e2e8f0);
      border-top-color: var(--primary, #4f46e5);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .end-of-list {
      text-align: center;
      padding: 16px;
      color: var(--text-light, #94a3b8);
      font-size: 13px;
    }

    /* Dark Theme */
    :host-context(body.dark-theme) .page-title,
    :host-context(.dark-theme) .page-title {
      color: var(--text-main, #f8fafc);
    }

    :host-context(body.dark-theme) .comments-count,
    :host-context(.dark-theme) .comments-count {
      background: var(--bg-subtle, #1e293b);
      color: var(--text-muted, #94a3b8);
    }

    :host-context(body.dark-theme) .comment-card,
    :host-context(.dark-theme) .comment-card {
      background: var(--bg-card, #151e32);
      border-color: var(--border, #232B45);
    }

    :host-context(body.dark-theme) .comment-content,
    :host-context(.dark-theme) .comment-content {
      color: var(--text-main, #f8fafc);
    }

    :host-context(body.dark-theme) .rating-badge,
    :host-context(.dark-theme) .rating-badge {
      background: #451a03;
      color: #fcd34d;
    }

    :host-context(body.dark-theme) .skeleton-card,
    :host-context(.dark-theme) .skeleton-card {
      background: var(--bg-card, #151e32);
      border-color: var(--border, #232B45);
    }

    :host-context(body.dark-theme) .skeleton-rating,
    :host-context(body.dark-theme) .skeleton-date,
    :host-context(body.dark-theme) .skeleton-body,
    :host-context(body.dark-theme) .skeleton-product,
    :host-context(.dark-theme) .skeleton-rating,
    :host-context(.dark-theme) .skeleton-date,
    :host-context(.dark-theme) .skeleton-body,
    :host-context(.dark-theme) .skeleton-product {
      background: linear-gradient(90deg, #1e293b 25%, #151e32 50%, #1e293b 75%);
      background-size: 200% 100%;
    }

    :host-context(body.dark-theme) .empty-title,
    :host-context(.dark-theme) .empty-title {
      color: var(--text-main, #f8fafc);
    }

    :host-context(body.dark-theme) .load-more-btn,
    :host-context(.dark-theme) .load-more-btn {
      background: var(--bg-subtle, #1e293b);
      border-color: var(--border, #334155);
      color: var(--text-main, #f8fafc);
    }
  `]
})
export class MyCommentsComponent implements OnInit {
  private commentService = inject(CommentService);
  private tg = inject(TelegramService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  comments: Comment[] = [];
  isLoading = true;
  isLoadingMore = false;
  hasError = false;
  hasNextPage = false;
  totalCount = 0;
  currentPage = 1;
  pageSize = 10;

  ngOnInit(): void {
    this.loadComments();
  }

  loadComments(): void {
    this.isLoading = true;
    this.hasError = false;
    this.currentPage = 1;

    this.commentService.getMy(1, this.pageSize).subscribe({
      next: (result) => {
        this.comments = result.items;
        this.totalCount = result.totalCount;
        this.hasNextPage = result.hasNextPage;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.hasError = true;
      }
    });
  }

  loadMore(): void {
    if (this.isLoadingMore || !this.hasNextPage) return;

    this.isLoadingMore = true;
    this.currentPage++;

    this.commentService.getMy(this.currentPage, this.pageSize).subscribe({
      next: (result) => {
        this.comments = [...this.comments, ...result.items];
        this.hasNextPage = result.hasNextPage;
        this.isLoadingMore = false;
      },
      error: () => {
        this.isLoadingMore = false;
        this.currentPage--;
      }
    });
  }

  async deleteComment(comment: Comment): Promise<void> {
    this.tg.hapticImpact('medium');

    const confirmed = await this.tg.showConfirm('Sharhni o\'chirmoqchimisiz?');

    if (!confirmed) return;

    // Optimistic update
    const originalComments = [...this.comments];
    this.comments = this.comments.filter(c => c.id !== comment.id);
    this.totalCount--;

    this.commentService.delete(comment.id).subscribe({
      next: () => {
        this.tg.hapticNotification('success');
        this.notification.success('Sharh o\'chirildi');
      },
      error: () => {
        // Revert
        this.comments = originalComments;
        this.totalCount++;
        this.notification.error('Sharhni o\'chirishda xatolik');
      }
    });
  }

  onProductClick(event: Event): void {
    event.stopPropagation();
    this.tg.hapticImpact('light');
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}.${m}.${y}`;
  }

  trackById(index: number, item: Comment): number {
    return item.id;
  }
}
