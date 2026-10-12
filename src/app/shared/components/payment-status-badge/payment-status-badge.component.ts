import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentStatus, PaymentStatusLabels } from '../../../core/models/payment.model';

@Component({
  selector: 'app-payment-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      class="payment-badge" 
      [ngClass]="'status-' + statusClass"
      [class.badge-sm]="size === 'sm'"
    >
      <span *ngIf="showDot" class="status-dot"></span>
      <span class="status-text">{{ label }}</span>
    </span>
  `,
  styles: [`
    .payment-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.3rem 0.675rem;
      font-size: 0.775rem;
      font-weight: 700;
      border-radius: 9999px;
      letter-spacing: 0.015em;
      line-height: 1.2;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .badge-sm {
      padding: 0.175rem 0.5rem;
      font-size: 0.7rem;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* Pending: Amber / Yellow */
    .status-pending {
      color: #b45309;
      background-color: #fef3c7;
      border: 1px solid #fde68a;
    }
    .status-pending .status-dot {
      background-color: #f59e0b;
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
    }

    /* Completed: Emerald / Green */
    .status-completed {
      color: #15803d;
      background-color: #dcfce7;
      border: 1px solid #bbf7d0;
    }
    .status-completed .status-dot {
      background-color: #16a34a;
      box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2);
    }

    /* Failed: Red */
    .status-failed {
      color: #b91c1c;
      background-color: #fee2e2;
      border: 1px solid #fecaca;
    }
    .status-failed .status-dot {
      background-color: #ef4444;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
    }

    /* Refunded: Indigo */
    .status-refunded {
      color: #4338ca;
      background-color: #e0e7ff;
      border: 1px solid #c7d2fe;
    }
    .status-refunded .status-dot {
      background-color: #6366f1;
    }

    /* Cancelled / Default: Gray */
    .status-cancelled,
    .status-unknown {
      color: #4b5563;
      background-color: #f3f4f6;
      border: 1px solid #e5e7eb;
    }
    .status-cancelled .status-dot,
    .status-unknown .status-dot {
      background-color: #9ca3af;
    }

    /* Dark Theme Styles */
    :host-context(body.dark-theme) .status-pending {
      color: #fde68a;
      background-color: rgba(245, 158, 11, 0.16);
      border-color: rgba(245, 158, 11, 0.35);
    }
    :host-context(body.dark-theme) .status-completed {
      color: #86efac;
      background-color: rgba(34, 197, 94, 0.16);
      border-color: rgba(34, 197, 94, 0.35);
    }
    :host-context(body.dark-theme) .status-failed {
      color: #fca5a5;
      background-color: rgba(239, 68, 68, 0.16);
      border-color: rgba(239, 68, 68, 0.35);
    }
    :host-context(body.dark-theme) .status-refunded {
      color: #c7d2fe;
      background-color: rgba(99, 102, 241, 0.16);
      border-color: rgba(99, 102, 241, 0.35);
    }
    :host-context(body.dark-theme) .status-cancelled,
    :host-context(body.dark-theme) .status-unknown {
      color: #cbd5e1;
      background-color: rgba(148, 163, 184, 0.14);
      border-color: rgba(148, 163, 184, 0.28);
    }
  `]
})
export class PaymentStatusBadgeComponent {
  @Input() status: PaymentStatus | number = PaymentStatus.Pending;
  @Input() size: 'sm' | 'md' = 'md';
  @Input() showDot = true;

  get statusClass(): string {
    switch (Number(this.status)) {
      case PaymentStatus.Pending: return 'pending';
      case PaymentStatus.Completed: return 'completed';
      case PaymentStatus.Failed: return 'failed';
      case PaymentStatus.Refunded: return 'refunded';
      case PaymentStatus.Cancelled: return 'cancelled';
      default: return 'unknown';
    }
  }

  get label(): string {
    const item = PaymentStatusLabels[Number(this.status) as PaymentStatus];
    return item ? item.label : "Noma'lum";
  }
}
