import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderStatus, OrderStatusLabels } from '../../../core/models/order.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      class="badge" 
      [style.color]="config.color" 
      [style.background-color]="config.bg"
      [style.border]="'1px solid ' + config.color + '33'"
    >
      <span class="status-dot" [style.background-color]="config.color"></span>
      {{ config.label }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: var(--radius-full);
      letter-spacing: 0.02em;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
  `]
})
export class StatusBadgeComponent {
  @Input() status: OrderStatus | number = OrderStatus.Pending;

  get config() {
    return OrderStatusLabels[this.status] || { label: "Noma'lum", color: '#64748b', bg: '#f1f5f9' };
  }
}
