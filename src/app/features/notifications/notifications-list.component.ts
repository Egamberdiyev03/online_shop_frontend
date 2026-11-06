import { Component, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { UserNotificationService } from '../../core/services/user-notification.service';
import { TelegramService } from '../../core/services/telegram.service';
import { NotificationDto, formatNotificationTime } from '../../core/models/notification.model';

@Component({
  selector: 'app-notifications-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="notifications-page">
      <!-- Header -->
      <header class="page-header">
        <h1 class="page-title">Bildirishnomalar</h1>
        <button
          *ngIf="unreadCount > 0"
          class="mark-all-btn"
          (click)="markAllAsRead()"
          aria-label="Hammasini o'qilgan qilish"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <span>Barchasini o'qilgan qilish</span>
        </button>
      </header>

      <!-- Loading Skeleton -->
      <div class="skeleton-list" *ngIf="isLoading && notifications.length === 0">
        <div class="skeleton-card" *ngFor="let i of [1,2,3,4,5]">
          <div class="skeleton-dot"></div>
          <div class="skeleton-content">
            <div class="skeleton-title"></div>
            <div class="skeleton-body"></div>
            <div class="skeleton-time"></div>
          </div>
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
        <button class="btn btn-primary" (click)="retry()">Qayta urinish</button>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="!isLoading && !hasError && notifications.length === 0">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <h3 class="empty-title">Bildirishnomalar yo'q</h3>
        <p class="empty-text">Yangi bildirishnomalar kelganda shu yerda ko'rinadi</p>
      </div>

      <!-- Notifications List -->
      <div class="notifications-list" *ngIf="!hasError && notifications.length > 0">
        <button
          *ngFor="let item of notifications; trackBy: trackById"
          class="notification-card"
          [class.unread]="!item.isRead"
          (click)="onNotificationClick(item)"
        >
          <!-- Unread Indicator -->
          <span class="unread-dot" *ngIf="!item.isRead" aria-label="O'qilmagan"></span>

          <!-- Content -->
          <div class="notification-content">
            <h3 class="notification-title" [class.bold]="!item.isRead">{{ item.title }}</h3>
            <p class="notification-body">{{ item.body }}</p>
            <span class="notification-time">{{ formatTime(item.createdAt) }}</span>
          </div>

          <!-- Arrow -->
          <span class="notification-arrow" *ngIf="hasLink(item)" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
        </button>

        <!-- Load More Spinner -->
        <div class="load-more-spinner" *ngIf="isLoadingMore">
          <div class="spinner"></div>
        </div>

        <!-- End of List -->
        <div class="end-of-list" *ngIf="!hasMore && notifications.length > 0">
          <span>Ro'yxat tugadi</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notifications-page {
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
      gap: 12px;
    }

    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-main, #0f172a);
      margin: 0;
    }

    .mark-all-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 44px;
      padding: 0 14px;
      background: var(--primary, #4f46e5);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      -webkit-tap-highlight-color: transparent;
    }

    .mark-all-btn:hover {
      background: var(--primary-hover, #4338ca);
    }

    .mark-all-btn:active {
      transform: scale(0.97);
    }

    /* Skeleton */
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 16px;
      padding: 16px;
    }

    .skeleton-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--bg-subtle, #f1f5f9);
      flex-shrink: 0;
      margin-top: 6px;
    }

    .skeleton-content {
      flex: 1;
    }

    .skeleton-title {
      height: 18px;
      width: 60%;
      background: linear-gradient(90deg, var(--bg-subtle, #f1f5f9) 25%, var(--bg-card, #ffffff) 50%, var(--bg-subtle, #f1f5f9) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .skeleton-body {
      height: 14px;
      width: 90%;
      background: linear-gradient(90deg, var(--bg-subtle, #f1f5f9) 25%, var(--bg-card, #ffffff) 50%, var(--bg-subtle, #f1f5f9) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .skeleton-time {
      height: 12px;
      width: 30%;
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

    /* Notifications List */
    .notifications-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .notification-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      width: 100%;
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 16px;
      padding: 16px;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s;
      -webkit-tap-highlight-color: transparent;
      position: relative;
    }

    .notification-card:hover {
      background: var(--bg-subtle, #f1f5f9);
    }

    .notification-card:active {
      transform: scale(0.99);
    }

    .notification-card.unread {
      background: var(--primary-light, #e0e7ff);
      border-color: var(--primary, #4f46e5);
    }

    .unread-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--primary, #4f46e5);
      flex-shrink: 0;
      margin-top: 6px;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-size: 15px;
      font-weight: 500;
      color: var(--text-main, #0f172a);
      margin: 0 0 4px;
      line-height: 1.4;
    }

    .notification-title.bold {
      font-weight: 700;
    }

    .notification-body {
      font-size: 14px;
      color: var(--text-muted, #64748b);
      margin: 0 0 8px;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .notification-time {
      font-size: 12px;
      color: var(--text-light, #94a3b8);
    }

    .notification-arrow {
      color: var(--text-light, #94a3b8);
      flex-shrink: 0;
      margin-top: 4px;
    }

    /* Load More */
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

    :host-context(body.dark-theme) .notification-card,
    :host-context(.dark-theme) .notification-card {
      background: var(--bg-card, #151e32);
      border-color: var(--border, #232B45);
    }

    :host-context(body.dark-theme) .notification-card:hover,
    :host-context(.dark-theme) .notification-card:hover {
      background: var(--bg-subtle, #1e293b);
    }

    :host-context(body.dark-theme) .notification-card.unread,
    :host-context(.dark-theme) .notification-card.unread {
      background: rgba(79, 70, 229, 0.15);
      border-color: var(--primary, #6366f1);
    }

    :host-context(body.dark-theme) .notification-title,
    :host-context(.dark-theme) .notification-title {
      color: var(--text-main, #f8fafc);
    }

    :host-context(body.dark-theme) .skeleton-card,
    :host-context(.dark-theme) .skeleton-card {
      background: var(--bg-card, #151e32);
      border-color: var(--border, #232B45);
    }

    :host-context(body.dark-theme) .skeleton-title,
    :host-context(body.dark-theme) .skeleton-body,
    :host-context(body.dark-theme) .skeleton-time,
    :host-context(.dark-theme) .skeleton-title,
    :host-context(.dark-theme) .skeleton-body,
    :host-context(.dark-theme) .skeleton-time {
      background: linear-gradient(90deg, #1e293b 25%, #151e32 50%, #1e293b 75%);
      background-size: 200% 100%;
    }

    :host-context(body.dark-theme) .empty-title,
    :host-context(.dark-theme) .empty-title {
      color: var(--text-main, #f8fafc);
    }
  `]
})
export class NotificationsListComponent implements OnInit, OnDestroy {
  private notificationService = inject(UserNotificationService);
  private tg = inject(TelegramService);
  private router = inject(Router);

  notifications: NotificationDto[] = [];
  isLoading = true;
  isLoadingMore = false;
  hasError = false;
  hasMore = true;
  currentPage = 1;
  pageSize = 10;

  get unreadCount(): number {
    return this.notificationService.unreadCount();
  }

  ngOnInit(): void {
    this.loadNotifications();

    // Ilovaga qaytganda yangilash
    if (this.tg.isMiniApp()) {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.notificationService.loadUnreadCount();
    }
  };

  loadNotifications(): void {
    this.isLoading = true;
    this.hasError = false;
    this.currentPage = 1;

    this.notificationService.loadNotifications(1, this.pageSize);

    // Service'dagi signal'dan foydalanish
    setTimeout(() => {
      this.notifications = this.notificationService.notifications();
      this.isLoading = this.notificationService.isLoading();
      this.hasMore = this.notifications.length >= this.pageSize;
    }, 100);

    // Signal o'zgarishini kuzatish
    const checkLoading = setInterval(() => {
      if (!this.notificationService.isLoading()) {
        this.notifications = this.notificationService.notifications();
        this.isLoading = false;
        this.hasMore = this.notifications.length >= this.pageSize;
        clearInterval(checkLoading);
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkLoading);
      if (this.isLoading) {
        this.isLoading = false;
        this.hasError = true;
      }
    }, 10000);
  }

  loadMore(): void {
    if (this.isLoadingMore || !this.hasMore) return;

    this.isLoadingMore = true;
    this.currentPage++;

    const prevLength = this.notifications.length;
    this.notificationService.loadNotifications(this.currentPage, this.pageSize);

    const checkLoading = setInterval(() => {
      const newList = this.notificationService.notifications();
      if (newList.length !== prevLength || !this.notificationService.isLoading()) {
        this.notifications = newList;
        this.isLoadingMore = false;
        this.hasMore = newList.length - prevLength >= this.pageSize;
        clearInterval(checkLoading);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkLoading);
      this.isLoadingMore = false;
    }, 10000);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    // Infinite scroll
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.scrollHeight - 200;

    if (scrollPosition >= threshold && !this.isLoadingMore && this.hasMore && !this.isLoading) {
      this.loadMore();
    }
  }

  onNotificationClick(item: NotificationDto): void {
    this.tg.hapticImpact('light');
    this.notificationService.handleNotificationClick(item);
  }

  markAllAsRead(): void {
    this.tg.hapticImpact('medium');
    this.notificationService.markAllAsRead();
    // UI yangilash
    this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
  }

  retry(): void {
    this.loadNotifications();
  }

  formatTime(dateStr: string): string {
    return formatNotificationTime(dateStr);
  }

  hasLink(item: NotificationDto): boolean {
    return !!(item.link || item.relatedEntityId);
  }

  trackById(index: number, item: NotificationDto): number {
    return item.id;
  }
}
