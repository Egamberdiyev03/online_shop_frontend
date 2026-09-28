import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
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
    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      background: #ffffff;
      border-left: 4px solid #94a3b8;
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .toast-success {
      border-left-color: var(--success);
      background: #ffffff;
    }
    .toast-error {
      border-left-color: var(--danger);
      background: #ffffff;
    }
    .toast-warning {
      border-left-color: var(--warning);
      background: #ffffff;
    }
    .toast-info {
      border-left-color: var(--primary);
      background: #ffffff;
    }
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
      background: #f1f5f9;
    }
  `]
})
export class ToastComponent {
  private notificationService = inject(NotificationService);
  notifications = this.notificationService.toasts;

  close(id: string): void {
    this.notificationService.remove(id);
  }
}
