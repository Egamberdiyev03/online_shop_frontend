import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderStatus } from '../../../../core/models/order.model';

@Component({
  selector: 'app-order-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stepper-container" [class.cancelled-state]="isCancelled">
      <div *ngFor="let step of steps; let last = last; let i = index" class="step-col">
        <!-- Circle & connecting line -->
        <div class="step-node-row">
          <div 
            class="step-circle" 
            [class.completed]="isCompleted(step.status)"
            [class.active]="isActive(step.status)"
            [class.upcoming]="isUpcoming(step.status)"
            [class.cancelled]="isCancelled && step.status === OrderStatus.Cancelled"
          >
            <span *ngIf="isCompleted(step.status)">✓</span>
            <span *ngIf="!isCompleted(step.status) && !isCancelled">{{ i + 1 }}</span>
            <span *ngIf="isCancelled && step.status === OrderStatus.Cancelled">✕</span>
          </div>

          <div 
            *ngIf="!last" 
            class="step-connector" 
            [class.connector-completed]="isCompleted(steps[i + 1].status) || isActive(steps[i + 1].status)"
          ></div>
        </div>

        <!-- Text Labels -->
        <div class="step-meta">
          <span 
            class="step-name" 
            [class.name-active]="isActive(step.status)"
            [class.name-completed]="isCompleted(step.status)"
          >
            {{ step.label }}
          </span>
          <span class="step-hint">{{ step.hint }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stepper-container {
      display: flex;
      align-items: flex-start;
      width: 100%;
      overflow-x: auto;
      padding: 0.5rem 0.25rem;
    }

    .step-col {
      flex: 1;
      min-width: 90px;
      position: relative;
    }

    .step-node-row {
      display: flex;
      align-items: center;
      position: relative;
    }

    .step-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 800;
      z-index: 2;
      transition: all 0.3s ease;
      background: #f1f5f9;
      color: #64748b;
      border: 2px solid #cbd5e1;
      flex-shrink: 0;
    }

    .step-circle.completed {
      background: #10b981;
      border-color: #10b981;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }

    .step-circle.active {
      background: #4f46e5;
      border-color: #4f46e5;
      color: #ffffff;
      box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.2);
    }

    .step-circle.cancelled {
      background: #ef4444;
      border-color: #ef4444;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    }

    .step-connector {
      flex: 1;
      height: 3px;
      background: #e2e8f0;
      margin: 0 4px;
      border-radius: 2px;
      transition: background-color 0.4s ease;
    }

    .step-connector.connector-completed {
      background: #10b981;
    }

    .step-meta {
      margin-top: 0.4rem;
      padding-right: 0.5rem;
    }

    .step-name {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      line-height: 1.2;
    }

    .step-name.name-active {
      color: #4f46e5;
      font-weight: 800;
    }

    .step-name.name-completed {
      color: #059669;
    }

    .step-hint {
      display: block;
      font-size: 0.675rem;
      color: #94a3b8;
      margin-top: 0.15rem;
    }

    /* Dark Mode */
    :host-context(body.dark-theme) .step-circle,
    :host-context(.dark-theme) .step-circle {
      background: #0f172a;
      border-color: #334155;
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .step-circle.completed,
    :host-context(.dark-theme) .step-circle.completed {
      background: #059669;
      border-color: #059669;
      color: #ffffff;
    }

    :host-context(body.dark-theme) .step-circle.active,
    :host-context(.dark-theme) .step-circle.active {
      background: #6366f1;
      border-color: #6366f1;
      color: #ffffff;
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.25);
    }

    :host-context(body.dark-theme) .step-connector,
    :host-context(.dark-theme) .step-connector {
      background: #22304d;
    }

    :host-context(body.dark-theme) .step-connector.connector-completed,
    :host-context(.dark-theme) .step-connector.connector-completed {
      background: #059669;
    }

    :host-context(body.dark-theme) .step-name,
    :host-context(.dark-theme) .step-name {
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .step-name.name-active,
    :host-context(.dark-theme) .step-name.name-active {
      color: #a5b4fc;
    }

    :host-context(body.dark-theme) .step-name.name-completed,
    :host-context(.dark-theme) .step-name.name-completed {
      color: #34d399;
    }
  `]
})
export class OrderStepperComponent {
  @Input({ required: true }) currentStatus: OrderStatus | number = OrderStatus.Pending;

  OrderStatus = OrderStatus;

  steps = [
    { status: OrderStatus.Pending, label: 'Kutilmoqda', hint: 'Buyurtma olindi' },
    { status: OrderStatus.Confirmed, label: 'Tasdiqlangan', hint: 'Omborga uzatildi' },
    { status: OrderStatus.Shipped, label: "Jo'natilgan", hint: 'Kuryer yo‘lda' },
    { status: OrderStatus.Delivered, label: 'Yetkazilgan', hint: 'Mijoz qabul qildi' }
  ];

  get isCancelled(): boolean {
    return Number(this.currentStatus) === OrderStatus.Cancelled;
  }

  private weight(status: OrderStatus | number): number {
    switch (Number(status)) {
      case OrderStatus.Pending: return 1;
      case OrderStatus.Confirmed: return 2;
      case OrderStatus.Shipped: return 3;
      case OrderStatus.Delivered: return 4;
      default: return 0;
    }
  }

  isCompleted(stepStatus: OrderStatus): boolean {
    if (this.isCancelled) return false;
    return this.weight(this.currentStatus) > this.weight(stepStatus);
  }

  isActive(stepStatus: OrderStatus): boolean {
    if (this.isCancelled) return false;
    return Number(this.currentStatus) === stepStatus;
  }

  isUpcoming(stepStatus: OrderStatus): boolean {
    if (this.isCancelled) return true;
    return this.weight(this.currentStatus) < this.weight(stepStatus);
  }
}
