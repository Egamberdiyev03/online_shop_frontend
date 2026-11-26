import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import { UserNotificationService } from '../../../core/services/user-notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Kuryerga yangi buyurtma tushganda qalqib chiqadigan bildirishnoma -->
    @if (curierPopup(); as popup) {
      <div class="curier-popup-backdrop" (click)="dismissCurierPopup()">
        <div class="curier-popup-card" (click)="$event.stopPropagation()">
          <div class="curier-popup-header">
            <span class="curier-popup-icon">🛵</span>
            <div class="curier-popup-title-wrap">
              <span class="curier-popup-badge">YANGI BUYURTMA</span>
              <h3>{{ popup.title || 'Yangi yetkazma biriktirildi!' }}</h3>
            </div>
            <button type="button" class="curier-popup-close" (click)="dismissCurierPopup()">✕</button>
          </div>
          <p class="curier-popup-body">{{ popup.body }}</p>
          <div class="curier-popup-actions">
            <button type="button" class="curier-btn-primary" (click)="openCurierOrder(popup)">
              📦 Yetkazmalarga o'tish
            </button>
            <button type="button" class="curier-btn-secondary" (click)="dismissCurierPopup()">
              Yopish
            </button>
          </div>
        </div>
      </div>
    }

    <div class="toast-container" *ngIf="notifications().length > 0">
      <div 
        *ngFor="let toast of notifications()" 
        class="toast-item" 
        [ngClass]="'toast-' + toast.type"
      >
        <div class="toast-icon">
          <span *ngIf="toast.type === 'success'">✔</span>
          <span *ngIf="toast.type === 'error'">✖</span>
          <span *ngIf="toast.type === 'warning'">⚠</span>
          <span *ngIf="toast.type === 'info'">ℹ</span>
        </div>
        <div class="toast-body">
          <div class="toast-title" *ngIf="toast.title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button class="toast-close" (click)="close(toast.id)">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .curier-popup-backdrop {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 1.25rem 1rem;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
      animation: fadeInBackdrop 0.2s ease-out;
    }
    @keyframes fadeInBackdrop {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .curier-popup-card {
      width: 100%;
      max-width: 420px;
      margin-top: 1.5rem;
      background: var(--bg-card, #ffffff);
      color: var(--text-main, #0f172a);
      border: 2px solid var(--primary, #4f46e5);
      border-radius: 16px;
      padding: 1.25rem;
      box-shadow: 0 20px 45px rgba(79, 70, 229, 0.35);
      animation: popDown 0.32s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes popDown {
      from { transform: translateY(-28px) scale(0.95); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }
    .curier-popup-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .curier-popup-icon {
      font-size: 2rem;
      line-height: 1;
      padding: 0.5rem;
      border-radius: 12px;
      background: var(--primary-light, #e0e7ff);
      animation: pulseScooter 1.2s ease-in-out infinite;
    }
    @keyframes pulseScooter {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.09); }
    }
    .curier-popup-title-wrap {
      flex: 1;
    }
    .curier-popup-badge {
      display: inline-block;
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: var(--success-bg, #dcfce7);
      color: var(--success, #15803d);
      margin-bottom: 0.25rem;
    }
    .curier-popup-title-wrap h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-main, #0f172a);
    }
    .curier-popup-close {
      border: none;
      background: transparent;
      color: var(--text-muted, #64748b);
      font-size: 1rem;
      cursor: pointer;
      padding: 0.25rem;
    }
    .curier-popup-body {
      margin: 0.85rem 0 1.15rem;
      font-size: 0.9375rem;
      line-height: 1.45;
      color: var(--text-muted, #475569);
    }
    .curier-popup-actions {
      display: flex;
      gap: 0.625rem;
    }
    .curier-btn-primary {
      flex: 1;
      padding: 0.7rem 1rem;
      border: none;
      border-radius: 10px;
      background: var(--primary, #4f46e5);
      color: #ffffff;
      font-weight: 600;
      font-size: 0.9375rem;
      cursor: pointer;
    }
    .curier-btn-secondary {
      padding: 0.7rem 1rem;
      border: 1px solid var(--border, #cbd5e1);
      border-radius: 10px;
      background: var(--bg-subtle, #f1f5f9);
      color: var(--text-main, #0f172a);
      font-weight: 500;
      cursor: pointer;
    }

    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 420px;
      width: calc(100% - 3rem);
      pointer-events: none;
    }
    @media (max-width: 768px) {
      .toast-container {
        bottom: 5rem;
        right: 1rem;
        width: calc(100% - 2rem);
      }
    }
    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-left: 4px solid #94a3b8;
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .toast-success { border-left-color: var(--success); }
    .toast-error { border-left-color: var(--danger); }
    .toast-warning { border-left-color: var(--warning); }
    .toast-info { border-left-color: var(--primary); }
    .toast-icon {
      font-size: 1rem;
      font-weight: bold;
      margin-top: 0.125rem;
    }
    .toast-success .toast-icon { color: var(--success); }
    .toast-error .toast-icon { color: var(--danger); }
    .toast-warning .toast-icon { color: var(--warning); }
    .toast-info .toast-icon { color: var(--primary); }
    .toast-body {
      flex: 1;
    }
    .toast-title {
      font-weight: 700;
      font-size: 0.875rem;
      margin-bottom: 0.125rem;
      color: var(--text-main);
    }
    .toast-message {
      font-size: 0.8125rem;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .toast-close {
      color: var(--text-light);
      font-size: 0.875rem;
      padding: 0.125rem 0.25rem;
      border-radius: 4px;
    }
    .toast-close:hover {
      color: var(--text-main);
      background: var(--bg-subtle, #f1f5f9);
    }
  `]
})
export class ToastComponent {
  private notificationService = inject(NotificationService);
  private userNotificationService = inject(UserNotificationService);

  notifications = this.notificationService.toasts;
  curierPopup = this.userNotificationService.activeCurierPopup;

  close(id: string): void {
    this.notificationService.remove(id);
  }

  dismissCurierPopup(): void {
    this.userNotificationService.dismissCurierPopup();
  }

  openCurierOrder(popup: any): void {
    this.userNotificationService.openCurierPopupOrder(popup);
  }
}
