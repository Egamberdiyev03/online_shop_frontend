import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Order, OrderStatus } from '../../../core/models/order.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { OrderService } from '../../../core/services/order.service';
import { CompanyService } from '../../../core/services/company.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    StatusBadgeComponent, 
    LoadingSpinnerComponent, 
    EmptyStateComponent
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            {{ viewMode === 'my' ? 'Mening Buyurtmalarim' : 'Barcha Buyurtmalar (Admin)' }}
          </h1>
          <p class="page-subtitle">
            {{ viewMode === 'my' 
                ? 'Mijoz #' + authState.currentCustomerId() + ' hisobidagi buyurtmalar tarixi va holati' 
                : 'Tizimdagi barcha filial va mijozlarning buyurtmalari boshqaruvi' }}
          </p>
        </div>

        <!-- Mode Toggle (if admin mode is enabled) -->
        <div class="mode-toggle" *ngIf="authState.isAdminMode()">
          <button 
            class="toggle-btn" 
            [class.active]="viewMode === 'my'"
            (click)="setViewMode('my')"
          >
            👤 Mening buyurtmalarim
          </button>
          <button 
            class="toggle-btn" 
            [class.active]="viewMode === 'all'"
            (click)="setViewMode('all')"
          >
            🛡 Barcha buyurtmalar
          </button>
        </div>
      </div>

      <!-- Admin Filters -->
      <div class="filter-bar card" *ngIf="viewMode === 'all'">
        <div class="filter-col">
          <label class="filter-label">Filial bo'yicha:</label>
          <select [(ngModel)]="filterBranchId" (ngModelChange)="loadOrders()" class="form-control">
            <option [ngValue]="null">Barcha filiallar</option>
            <option *ngFor="let branch of branches" [ngValue]="branch.id">
              {{ branch.name }} (#{{ branch.id }})
            </option>
          </select>
        </div>

        <div class="filter-col">
          <label class="filter-label">Status bo'yicha:</label>
          <select [(ngModel)]="filterStatus" (ngModelChange)="loadOrders()" class="form-control">
            <option [ngValue]="null">Barcha statuslar</option>
            <option [ngValue]="OrderStatus.Pending">Kutilmoqda (Pending)</option>
            <option [ngValue]="OrderStatus.Confirmed">Tasdiqlangan (Confirmed)</option>
            <option [ngValue]="OrderStatus.Shipped">Jo'natildi (Shipped)</option>
            <option [ngValue]="OrderStatus.Delivered">Yetkazildi (Delivered)</option>
            <option [ngValue]="OrderStatus.Cancelled">Bekor qilingan (Cancelled)</option>
          </select>
        </div>
      </div>

      <app-loading-spinner *ngIf="isLoading" message="Buyurtmalar yuklanmoqda..."></app-loading-spinner>

      <app-empty-state 
        *ngIf="!isLoading && orders.length === 0"
        icon="📦"
        title="Buyurtmalar mavjud emas"
        description="Hozircha hech qanday buyurtma ro'yxatga olinmagan."
      ></app-empty-state>

      <!-- Orders List -->
      <div class="orders-container" *ngIf="!isLoading && orders.length > 0">
        <div class="order-card card" *ngFor="let order of orders">
          <div class="order-header">
            <div class="order-id-block">
              <span class="order-number">Buyurtma #{{ order.id }}</span>
              <span class="order-date">{{ order.createdAt | date:'medium' }}</span>
            </div>

            <div class="header-right">
              <span class="customer-tag" *ngIf="viewMode === 'all'">
                Mijoz #{{ order.customerId }}
              </span>
              <span class="branch-tag" *ngIf="order.companyBranchId">
                Filial #{{ order.companyBranchId }}
              </span>
              <app-status-badge [status]="order.status"></app-status-badge>
            </div>
          </div>

          <!-- Order Items Table -->
          <div class="order-items-wrapper">
            <table class="items-table" *ngIf="order.orderItems && order.orderItems.length > 0">
              <thead>
                <tr>
                  <th>Mahsulot ID</th>
                  <th>Nomi</th>
                  <th class="text-center">Miqdori</th>
                  <th class="text-right">Narxi</th>
                  <th class="text-right">Jami</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of order.orderItems">
                  <td>#{{ item.productId }}</td>
                  <td class="item-name">{{ item.productName || ('Mahsulot #' + item.productId) }}</td>
                  <td class="text-center">{{ item.quantity }} dona</td>
                  <td class="text-right">{{ item.unitPrice | currency:'USD':'symbol':'1.2-2' }}</td>
                  <td class="text-right fw-bold">{{ (item.unitPrice * item.quantity) | currency:'USD':'symbol':'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>

            <div *ngIf="!order.orderItems || order.orderItems.length === 0" class="no-items-note">
              OrderItem ma'lumotlari kiritilmagan.
            </div>
          </div>

          <!-- Order Footer & Actions -->
          <div class="order-footer">
            <div class="total-wrap">
              <span class="total-label">Jami to'lov:</span>
              <span class="total-amount">{{ order.totalPrice | currency:'USD':'symbol':'1.2-2' }}</span>
            </div>

            <div class="order-actions">
              <!-- Cancel Button: Only visible if Pending or Confirmed, with single-click guard -->
              <button 
                *ngIf="canCancel(order.status)"
                class="btn btn-danger btn-sm cancel-btn"
                [disabled]="cancellingOrderId === order.id"
                (click)="cancelOrder(order)"
              >
                {{ cancellingOrderId === order.id ? 'Bekor qilinmoqda...' : '✕ Buyurtmani bekor qilish' }}
              </button>

              <!-- Admin Status Change Dropdown -->
              <div class="admin-status-changer" *ngIf="authState.isAdminMode()">
                <label class="status-label">Statusni o'zgartirish:</label>
                <select 
                  [ngModel]="order.status" 
                  (ngModelChange)="updateStatus(order, $event)"
                  class="form-control status-select"
                >
                  <option [ngValue]="OrderStatus.Pending">Kutilmoqda</option>
                  <option [ngValue]="OrderStatus.Confirmed">Tasdiqlangan</option>
                  <option [ngValue]="OrderStatus.Shipped">Jo'natildi</option>
                  <option [ngValue]="OrderStatus.Delivered">Yetkazildi</option>
                  <option [ngValue]="OrderStatus.Cancelled">Bekor qilindi</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .page-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--secondary);
    }
    .page-subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    .mode-toggle {
      display: flex;
      background: #e2e8f0;
      padding: 0.25rem;
      border-radius: var(--radius-md);
      gap: 0.25rem;
    }
    .toggle-btn {
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--text-muted);
      transition: var(--transition);
    }
    .toggle-btn.active {
      background: #ffffff;
      color: var(--primary);
      box-shadow: var(--shadow-sm);
    }
    .filter-bar {
      display: flex;
      gap: 1.5rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .filter-col {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .filter-label {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
    }
    .orders-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .order-card {
      padding: 0;
      overflow: hidden;
    }
    .order-header {
      padding: 1.25rem 1.5rem;
      background: var(--bg-subtle);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .order-id-block {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
    }
    .order-number {
      font-size: 1.125rem;
      font-weight: 800;
      color: var(--secondary);
    }
    .order-date {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .customer-tag, .branch-tag {
      font-size: 0.75rem;
      background: #ffffff;
      border: 1px solid var(--border);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      font-weight: 600;
    }
    .order-items-wrapper {
      padding: 1rem 1.5rem;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .items-table th {
      text-align: left;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-light);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border);
    }
    .items-table td {
      padding: 0.75rem 0;
      border-bottom: 1px dashed #f1f5f9;
      color: var(--secondary-light);
    }
    .items-table tr:last-child td {
      border-bottom: none;
    }
    .item-name {
      font-weight: 600;
      color: var(--text-main);
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .fw-bold { font-weight: 700; color: var(--secondary); }
    .no-items-note {
      font-size: 0.8125rem;
      color: var(--text-light);
      font-style: italic;
      padding: 0.5rem 0;
    }
    .order-footer {
      padding: 1.25rem 1.5rem;
      background: #fafafa;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .total-wrap {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }
    .total-label {
      font-size: 0.875rem;
      color: var(--text-muted);
      font-weight: 600;
    }
    .total-amount {
      font-size: 1.375rem;
      font-weight: 800;
      color: var(--primary);
    }
    .order-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .admin-status-changer {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .status-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 600;
    }
    .status-select {
      width: auto;
      padding: 0.375rem 0.625rem;
      font-size: 0.8125rem;
    }
  `]
})
export class OrdersListComponent implements OnInit {
  private orderService = inject(OrderService);
  private companyService = inject(CompanyService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);

  OrderStatus = OrderStatus;
  viewMode: 'my' | 'all' = 'my';
  orders: Order[] = [];
  branches: CompanyBranch[] = [];
  isLoading = true;

  filterBranchId: number | null = null;
  filterStatus: OrderStatus | null = null;
  cancellingOrderId: number | null = null;

  ngOnInit(): void {
    this.loadBranches();
    this.loadOrders();
  }

  setViewMode(mode: 'my' | 'all'): void {
    this.viewMode = mode;
    this.loadOrders();
  }

  loadBranches(): void {
    this.companyService.getAllBranches().subscribe({
      next: (branches) => (this.branches = branches),
      error: () => {}
    });
  }

  loadOrders(): void {
    this.isLoading = true;
    if (this.viewMode === 'my') {
      const customerId = this.authState.currentCustomerId();
      this.orderService.getByCustomerId(customerId).subscribe({
        next: (orders) => {
          this.orders = orders;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    } else {
      if (this.filterBranchId !== null) {
        this.orderService.getOrdersByBranchId(this.filterBranchId).subscribe({
          next: (orders) => {
            this.orders = orders;
            this.isLoading = false;
          },
          error: () => {
            this.isLoading = false;
          }
        });
      } else if (this.filterStatus !== null) {
        this.orderService.getOrdersByStatus(this.filterStatus).subscribe({
          next: (orders) => {
            this.orders = orders;
            this.isLoading = false;
          },
          error: () => {
            this.isLoading = false;
          }
        });
      } else {
        this.orderService.getAll().subscribe({
          next: (orders) => {
            this.orders = orders;
            this.isLoading = false;
          },
          error: () => {
            this.isLoading = false;
          }
        });
      }
    }
  }

  canCancel(status: OrderStatus | number): boolean {
    // Only allow cancellation for Pending (0) or Confirmed (1)
    return status === OrderStatus.Pending || status === OrderStatus.Confirmed;
  }

  cancelOrder(order: Order): void {
    if (!confirm(`Haqiqatan ham #${order.id}-buyurtmani bekor qilmoqchimisiz?`)) {
      return;
    }

    // Single-click guard to prevent exploit
    this.cancellingOrderId = order.id;

    this.orderService.cancelOrder(order.id).subscribe({
      next: () => {
        this.cancellingOrderId = null;
        this.notification.success(`#${order.id}-buyurtma muvaffaqiyatli bekor qilindi.`);
        order.status = OrderStatus.Cancelled;
      },
      error: () => {
        this.cancellingOrderId = null;
      }
    });
  }

  updateStatus(order: Order, newStatus: OrderStatus): void {
    this.orderService.updateStatus(order.id, newStatus).subscribe({
      next: () => {
        order.status = newStatus;
        this.notification.success(`#${order.id}-buyurtma holati yangilandi.`);
      },
      error: () => {}
    });
  }
}
