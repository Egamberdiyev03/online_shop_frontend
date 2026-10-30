import { Component, inject, signal, HostListener, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserNotificationService } from '../../../core/services/user-notification.service';
import {
  NotificationDto,
  getNotificationIcon,
  formatNotificationTime
} from '../../../core/models/notification.model';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="notification-container">
      <!-- Qo'ng'iroqcha tugmasi -->
      <button
        type="button"
        class="bell-btn"
        [class.has-unread]="unreadCount() > 0"
        (click)="toggleDropdown($event)"
        [attr.aria-expanded]="isOpen()"
        aria-label="Bildirishnomalar"
        title="Bildirishnomalar"
      >
        <span class="bell-icon">🔔</span>
        <span *ngIf="unreadCount() > 0" class="badge">
          {{ unreadCount() > 99 ? '99+' : unreadCount() }}
        </span>
      </button>

      <!-- Dropdown oynasi -->
      <div *ngIf="isOpen()" class="dropdown-panel" (click)="$event.stopPropagation()">
        <!-- Panel sarlavhasi -->
        <div class="panel-header">
          <div class="header-left">
            <h3 class="panel-title">Bildirishnomalar</h3>
            <span *ngIf="unreadCount() > 0" class="unread-pill">
              {{ unreadCount() }} yangi
            </span>
          </div>

          <button
            *ngIf="unreadCount() > 0"
            type="button"
            class="mark-all-btn"
            (click)="markAllAsRead()"
            title="Barchasini o'qilgan deb belgilash"
          >
            ✓ Hammasini o'qish
          </button>
        </div>

        <!-- Bildirishnomalar ro'yxati -->
        <div class="panel-body">
          <!-- Yuklanmoqda -->
          <div *ngIf="isLoading() && notifications().length === 0" class="empty-state">
            <span class="spinner"></span>
            <p>Yuklanmoqda...</p>
          </div>

          <!-- Bo'sh holat -->
          <div *ngIf="!isLoading() && notifications().length === 0" class="empty-state">
            <span class="empty-icon">📭</span>
            <p class="empty-title">Bildirishnomalar yo'q</p>
            <p class="empty-sub">Yangi xabarlar va buyurtma holatlari shu yerda ko'rinadi</p>
          </div>

          <!-- Ro'yxat elementlari -->
          <div
            *ngFor="let item of notifications()"
            class="notification-item"
            [class.unread]="!item.isRead"
            (click)="onItemClick(item)"
          >
            <div class="item-icon-wrapper" [attr.data-priority]="item.priority">
              <span class="item-icon">{{ getItemIcon(item.type) }}</span>
            </div>

            <div class="item-content">
              <div class="item-header-row">
                <span class="item-title">{{ item.title }}</span>
                <span class="item-time">{{ formatTime(item.createdAt) }}</span>
              </div>
              <p class="item-body">{{ item.body }}</p>
            </div>

            <span *ngIf="!item.isRead" class="unread-dot" title="O'qilmagan"></span>
          </div>
        </div>

        <!-- Panel pastki qismi (Status) -->
        <div class="panel-footer">
          <div class="connection-status">
            <span
              class="status-indicator"
              [class.online]="isConnected()"
              [class.offline]="!isConnected()"
            ></span>
            <span class="status-text">
              {{ isConnected() ? 'Jonli ulanish faol' : 'Ulanish kutilmoqda' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    /* Qo'ng'iroqcha tugmasi */
    .bell-btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border, #e2e8f0);
      background: var(--bg-card, #ffffff);
      color: var(--text-main, #0f172a);
      cursor: pointer;
      font-size: 1.15rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bell-btn:hover {
      background: var(--bg-subtle, #f1f5f9);
      border-color: #cbd5e1;
      transform: translateY(-1px);
    }

    .bell-btn:active {
      transform: translateY(0);
    }

    .bell-btn.has-unread .bell-icon {
      animation: bellWiggle 1.5s ease infinite alternate;
      transform-origin: top center;
    }

    @keyframes bellWiggle {
      0%, 80% { transform: rotate(0); }
      85% { transform: rotate(14deg); }
      90% { transform: rotate(-14deg); }
      95% { transform: rotate(8deg); }
      100% { transform: rotate(0); }
    }

    /* O'qilmaganlar nishoni (Badge) */
    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: 9px;
      background: var(--accent, #f43f5e);
      color: #ffffff;
      font-size: 0.6875rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 2px var(--bg-card, #ffffff);
      animation: popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    @keyframes popIn {
      from { transform: scale(0); }
      to { transform: scale(1); }
    }

    /* Dropdown paneli */
    .dropdown-panel {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 380px;
      max-width: 90vw;
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius-lg, 14px);
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.04);
      z-index: 1050;
      overflow: hidden;
      animation: panelSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes panelSlide {
      from {
        opacity: 0;
        transform: translateY(-8px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* Header */
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--border, #e2e8f0);
      background: var(--bg-subtle, #f8fafc);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .panel-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-main, #0f172a);
      margin: 0;
    }

    .unread-pill {
      font-size: 0.7rem;
      font-weight: 600;
      color: #ffffff;
      background: var(--primary, #4f46e5);
      padding: 0.15rem 0.45rem;
      border-radius: 10px;
    }

    .mark-all-btn {
      background: transparent;
      border: none;
      color: var(--primary, #4f46e5);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: background 0.15s;
    }

    .mark-all-btn:hover {
      background: rgba(79, 70, 229, 0.1);
    }

    /* Body */
    .panel-body {
      max-height: 380px;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    /* Scrollbar */
    .panel-body::-webkit-scrollbar {
      width: 5px;
    }
    .panel-body::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    /* Empty state */
    .empty-state {
      padding: 2.5rem 1.5rem;
      text-align: center;
      color: var(--text-muted, #64748b);
    }

    .empty-icon {
      font-size: 2.25rem;
      display: block;
      margin-bottom: 0.5rem;
    }

    .empty-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-main, #0f172a);
      margin-bottom: 0.25rem;
    }

    .empty-sub {
      font-size: 0.775rem;
      margin: 0;
    }

    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid var(--border, #e2e8f0);
      border-top-color: var(--primary, #4f46e5);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-bottom: 0.5rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Item */
    .notification-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--border, #f1f5f9);
      cursor: pointer;
      transition: background 0.15s ease;
      position: relative;
    }

    .notification-item:hover {
      background: var(--bg-subtle, #f8fafc);
    }

    .notification-item.unread {
      background: rgba(79, 70, 229, 0.04);
    }

    .notification-item.unread:hover {
      background: rgba(79, 70, 229, 0.08);
    }

    .item-icon-wrapper {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--bg-subtle, #f1f5f9);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 1.1rem;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.2rem;
    }

    .item-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-main, #0f172a);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-time {
      font-size: 0.7rem;
      color: var(--text-light, #94a3b8);
      flex-shrink: 0;
    }

    .item-body {
      font-size: 0.775rem;
      color: var(--text-muted, #64748b);
      margin: 0;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--primary, #4f46e5);
      flex-shrink: 0;
      margin-top: 0.5rem;
    }

    /* Footer */
    .panel-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1rem;
      border-top: 1px solid var(--border, #e2e8f0);
      background: var(--bg-subtle, #f8fafc);
      font-size: 0.725rem;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--text-muted, #64748b);
    }

    .status-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .status-indicator.online {
      background: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }

    .status-indicator.offline {
      background: #94a3b8;
    }

    /* Dark Mode Overrides */
    :host-context(body.dark-theme) .bell-btn,
    :host-context(.dark-theme) .bell-btn {
      background: #151e32;
      border-color: #22304d;
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .bell-btn:hover,
    :host-context(.dark-theme) .bell-btn:hover {
      background: #1e293b;
    }
    :host-context(body.dark-theme) .dropdown-panel,
    :host-context(.dark-theme) .dropdown-panel {
      background: #151e32;
      border-color: #22304d;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    }
    :host-context(body.dark-theme) .panel-header,
    :host-context(.dark-theme) .panel-header,
    :host-context(body.dark-theme) .panel-footer,
    :host-context(.dark-theme) .panel-footer {
      background: #0f172a;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .panel-title,
    :host-context(.dark-theme) .panel-title,
    :host-context(body.dark-theme) .item-title,
    :host-context(.dark-theme) .item-title,
    :host-context(body.dark-theme) .empty-title,
    :host-context(.dark-theme) .empty-title {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .notification-item,
    :host-context(.dark-theme) .notification-item {
      border-color: #1e293b;
    }
    :host-context(body.dark-theme) .notification-item:hover,
    :host-context(.dark-theme) .notification-item:hover {
      background: #1e293b;
    }
    :host-context(body.dark-theme) .notification-item.unread,
    :host-context(.dark-theme) .notification-item.unread {
      background: rgba(99, 102, 241, 0.1);
    }
    :host-context(body.dark-theme) .item-icon-wrapper,
    :host-context(.dark-theme) .item-icon-wrapper {
      background: #1e293b;
    }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private userNotificationService = inject(UserNotificationService);
  private elementRef = inject(ElementRef);

  isOpen = signal<boolean>(false);
  // Vaqtni har 30 soniyada yangilab turish uchun reaktiv tick
  timeTick = signal<number>(Date.now());
  private timerId: any = null;

  // Signallarni to'g'ridan-to'g'ri servisdan olamiz
  notifications = this.userNotificationService.notifications;
  unreadCount = this.userNotificationService.unreadCount;
  isConnected = this.userNotificationService.isConnected;
  isLoading = this.userNotificationService.isLoading;

  ngOnInit(): void {
    this.timerId = setInterval(() => {
      this.timeTick.set(Date.now());
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    const nextState = !this.isOpen();
    this.isOpen.set(nextState);

    // Agar ochilsa, eng so'nggi ma'lumotlarni yangilab olamiz
    if (nextState) {
      this.timeTick.set(Date.now());
      this.userNotificationService.loadNotifications(1, 15);
      this.userNotificationService.loadUnreadCount();
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  markAllAsRead(): void {
    this.userNotificationService.markAllAsRead();
  }

  onItemClick(item: NotificationDto): void {
    this.closeDropdown();
    this.userNotificationService.handleNotificationClick(item);
  }

  getItemIcon(type: any): string {
    return getNotificationIcon(type);
  }

  formatTime(dateStr: string): string {
    // timeTick signalini chaqirib qo'yish orqali vaqt o'tishi bilan qayta hisoblanadi
    this.timeTick();
    return formatNotificationTime(dateStr);
  }

  // Tashqariga bosilganda dropdownni yopish
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  // Escape tugmasi bosilganda dropdownni yopish
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeDropdown();
  }
}
