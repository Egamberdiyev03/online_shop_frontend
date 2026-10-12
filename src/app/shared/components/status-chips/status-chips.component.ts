import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderStatus, OrderStatusCounts } from '../../../core/models/order.model';

export interface StatusChipItem {
  status: OrderStatus | null;
  label: string;
  icon: string;
  count: number;
}

@Component({
  selector: 'app-status-chips',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="status-chips-scroll-container">
      <div class="status-chips-row">
        <button
          type="button"
          class="status-chip-btn"
          [class.active]="selectedStatus === null"
          [class.is-zero]="counts.all === 0"
          (click)="onSelect(null)"
        >
          <span class="chip-icon">📋</span>
          <span class="chip-label">Barchasi</span>
          <span class="chip-badge">({{ counts.all }})</span>
        </button>

        <button
          type="button"
          class="status-chip-btn chip-pending"
          [class.active]="selectedStatus === OrderStatus.Pending"
          [class.is-zero]="counts.pending === 0"
          (click)="onSelect(OrderStatus.Pending)"
        >
          <span class="chip-icon">⏳</span>
          <span class="chip-label">Kutilmoqda</span>
          <span class="chip-badge">({{ counts.pending }})</span>
        </button>

        <button
          type="button"
          class="status-chip-btn chip-confirmed"
          [class.active]="selectedStatus === OrderStatus.Confirmed"
          [class.is-zero]="counts.confirmed === 0"
          (click)="onSelect(OrderStatus.Confirmed)"
        >
          <span class="chip-icon">✅</span>
          <span class="chip-label">Tasdiqlangan</span>
          <span class="chip-badge">({{ counts.confirmed }})</span>
        </button>

        <button
          type="button"
          class="status-chip-btn chip-shipped"
          [class.active]="selectedStatus === OrderStatus.Shipped"
          [class.is-zero]="counts.shipped === 0"
          (click)="onSelect(OrderStatus.Shipped)"
        >
          <span class="chip-icon">🚚</span>
          <span class="chip-label">Jo‘natilgan</span>
          <span class="chip-badge">({{ counts.shipped }})</span>
        </button>

        <button
          type="button"
          class="status-chip-btn chip-delivered"
          [class.active]="selectedStatus === OrderStatus.Delivered"
          [class.is-zero]="counts.delivered === 0"
          (click)="onSelect(OrderStatus.Delivered)"
        >
          <span class="chip-icon">🎉</span>
          <span class="chip-label">Yetkazilgan</span>
          <span class="chip-badge">({{ counts.delivered }})</span>
        </button>

        <button
          type="button"
          class="status-chip-btn chip-cancelled"
          [class.active]="selectedStatus === OrderStatus.Cancelled"
          [class.is-zero]="counts.cancelled === 0"
          (click)="onSelect(OrderStatus.Cancelled)"
        >
          <span class="chip-icon">✖️</span>
          <span class="chip-label">Bekor qilingan</span>
          <span class="chip-badge">({{ counts.cancelled }})</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .status-chips-scroll-container {
      overflow-x: auto;
      padding-bottom: 0.5rem;
      margin-bottom: 1.25rem;
      -webkit-overflow-scrolling: touch;
    }

    .status-chips-scroll-container::-webkit-scrollbar {
      height: 4px;
    }

    .status-chips-scroll-container::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    .status-chips-row {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      min-width: 100%;
    }

    .status-chip-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.95rem;
      border-radius: 9999px;
      font-size: 0.825rem;
      font-weight: 700;
      background: var(--chip-bg, #f1f5f9);
      color: var(--chip-text, #475569);
      border: 1px solid var(--chip-border, #e2e8f0);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      user-select: none;
    }

    .status-chip-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
      transform: translateY(-1px);
    }

    .status-chip-btn.active {
      background: #4f46e5;
      color: #ffffff;
      border-color: #4f46e5;
      box-shadow: 0 3px 10px rgba(79, 70, 229, 0.3);
      transform: translateY(-1px);
    }

    .status-chip-btn.is-zero:not(.active) {
      opacity: 0.55;
      background: #f8fafc;
      color: #94a3b8;
      border-color: #f1f5f9;
    }

    .chip-badge {
      font-size: 0.775rem;
      font-weight: 800;
      opacity: 0.9;
    }

    .chip-icon {
      font-size: 0.85rem;
      line-height: 1;
    }

    /* Dark mode support (body.dark-theme) */
    :host-context(body.dark-theme) .status-chip-btn,
    :host-context(.dark) .status-chip-btn,
    :host-context([data-theme='dark']) .status-chip-btn {
      background: #151e32;
      color: #cbd5e1;
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .status-chip-btn:hover,
    :host-context(.dark) .status-chip-btn:hover,
    :host-context([data-theme='dark']) .status-chip-btn:hover {
      background: #1e293b;
      color: #f8fafc;
      border-color: #3b82f6;
    }

    :host-context(body.dark-theme) .status-chip-btn.active,
    :host-context(.dark) .status-chip-btn.active,
    :host-context([data-theme='dark']) .status-chip-btn.active {
      background: #4f46e5;
      color: #ffffff;
      border-color: #4f46e5;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
    }

    :host-context(body.dark-theme) .status-chip-btn.is-zero:not(.active),
    :host-context(.dark) .status-chip-btn.is-zero:not(.active),
    :host-context([data-theme='dark']) .status-chip-btn.is-zero:not(.active) {
      opacity: 0.45;
      background: #0b0f19;
      color: #64748b;
      border-color: #1e293b;
    }
  `]
})
export class StatusChipsComponent {
  OrderStatus = OrderStatus;

  @Input() selectedStatus: OrderStatus | null = null;
  @Input() counts: OrderStatusCounts = {
    all: 0,
    pending: 0,
    confirmed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  };

  @Output() statusChange = new EventEmitter<OrderStatus | null>();

  onSelect(status: OrderStatus | null): void {
    this.selectedStatus = status;
    this.statusChange.emit(status);
  }
}
