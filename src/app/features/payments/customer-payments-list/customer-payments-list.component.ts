import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { PaymentListItem, PaymentStatus, PaymentFilter } from '../../../core/models/payment.model';
import { PaymentStatusBadgeComponent } from '../../../shared/components/payment-status-badge/payment-status-badge.component';

@Component({
  selector: 'app-customer-payments-list',
  standalone: true,
  imports: [CommonModule, RouterModule, PaymentStatusBadgeComponent],
  template: `
    <div class="customer-payments-wrapper">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb-nav">
            <a routerLink="/products" class="breadcrumb-link">Bosh sahifa</a>
            <span class="breadcrumb-sep">&gt;</span>
            <span class="breadcrumb-current">Mening to‘lovlarim</span>
          </div>
          <h1 class="page-title">💳 Mening To‘lovlarim</h1>
          <p class="page-subtitle">Barcha buyurtmalaringiz uchun amalga oshirilgan to‘lovlar va cheklar holati</p>
        </div>

        <div class="header-right">
          <a routerLink="/orders" class="btn btn-secondary orders-link-btn">
            📦 Buyurtmalarimga o‘tish
          </a>
        </div>
      </div>

      <!-- Filter Status Chips -->
      <div class="filter-chips-row">
        <button 
          type="button" 
          class="chip-btn" 
          [class.active]="selectedStatus === null"
          (click)="setStatusFilter(null)"
        >
          Barchasi ({{ allPayments.length }})
        </button>

        <button 
          type="button" 
          class="chip-btn" 
          [class.active]="selectedStatus === PaymentStatus.Pending"
          (click)="setStatusFilter(PaymentStatus.Pending)"
        >
          ⏳ Kutilmoqda ({{ getCountByStatus(PaymentStatus.Pending) }})
        </button>

        <button 
          type="button" 
          class="chip-btn" 
          [class.active]="selectedStatus === PaymentStatus.Completed"
          (click)="setStatusFilter(PaymentStatus.Completed)"
        >
          ✅ Tasdiqlangan ({{ getCountByStatus(PaymentStatus.Completed) }})
        </button>

        <button 
          type="button" 
          class="chip-btn" 
          [class.active]="selectedStatus === PaymentStatus.Failed"
          (click)="setStatusFilter(PaymentStatus.Failed)"
        >
          ❌ Rad etilgan ({{ getCountByStatus(PaymentStatus.Failed) }})
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading-grid" *ngIf="isLoading">
        <div class="skeleton-card" *ngFor="let i of [1,2,3,4]">
          <div class="sk-header"></div>
          <div class="sk-line"></div>
          <div class="sk-line w-75"></div>
          <div class="sk-footer"></div>
        </div>
      </div>

      <!-- Error State -->
      <div class="error-container" *ngIf="hasError && !isLoading">
        <div class="error-icon">⚠️</div>
        <h3 class="error-title">To‘lovlarni yuklashda xatolik yuz berdi</h3>
        <p class="error-message">Ma‘lumotlarni yuklashda muammo yuzaga keldi. Iltimos, qayta urinib ko‘ring.</p>
        <button class="btn btn-primary" (click)="loadPayments()">Qayta urinish</button>
      </div>

      <!-- Empty State -->
      <div class="empty-state-card" *ngIf="!isLoading && !hasError && filteredPayments.length === 0">
        <div class="empty-icon">🧾</div>
        <h2 class="empty-title">
          {{ selectedStatus !== null ? "Ushbu holatda to'lovlar mavjud emas" : "Sizda hali to'lovlar yo'q" }}
        </h2>
        <p class="empty-description">
          {{ selectedStatus !== null ? "Boshqa filtrlarni tanlab ko'ring." : "Buyurtma berganingizdan so'ng, to'lov ma'lumotlari va cheklaringiz shu yerda aks etadi." }}
        </p>
        <a routerLink="/orders" class="btn btn-primary mt-3">
          📦 Buyurtmalarga o‘tish
        </a>
      </div>

      <!-- Cards Grid -->
      <div class="payments-cards-grid" *ngIf="!isLoading && !hasError && filteredPayments.length > 0">
        <div 
          class="payment-card" 
          *ngFor="let p of paginatedPayments"
          (click)="viewDetails(p.id)"
        >
          <div class="card-top-row">
            <div class="id-wrap">
              <span class="pay-id">To‘lov #{{ p.id }}</span>
              <span class="order-link-pill" (click)="$event.stopPropagation()">
                <a [routerLink]="['/orders']">Buyurtma #{{ p.orderId }}</a>
              </span>
            </div>
            <app-payment-status-badge [status]="p.status"></app-payment-status-badge>
          </div>

          <div class="card-body">
            <!-- Amount -->
            <div class="amount-row">
              <span class="amount-num">{{ p.amount | number:'1.0-0' }}</span>
              <span class="amount-currency">so‘m</span>
            </div>

            <!-- Meta details -->
            <div class="meta-details-list">
              <div class="meta-line">
                <span class="meta-label">📅 Sana:</span>
                <span class="meta-val">{{ p.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
              </div>

              <div class="meta-line" *ngIf="p.branchName">
                <span class="meta-label">🏢 Filial:</span>
                <a 
                  *ngIf="p.branchId; else noBranchId"
                  [routerLink]="['/map']"
                  [queryParams]="{ branch: p.branchId }"
                  class="meta-val branch-map-link"
                  title="Xaritada ko‘rish"
                  (click)="$event.stopPropagation()"
                >
                  {{ p.branchName }} 📍
                </a>
                <ng-template #noBranchId>
                  <span class="meta-val">{{ p.branchName }}</span>
                </ng-template>
              </div>

              <div class="meta-line">
                <span class="meta-label">💳 To‘lov usuli:</span>
                <span class="meta-val">{{ p.paymentMethod || 'Karta orqali o‘tkazma' }}</span>
              </div>

              <div class="meta-line">
                <span class="meta-label">🧾 Chek:</span>
                <span class="receipt-status-tag" [class.has-receipt]="!!p.chekUrl">
                  {{ p.chekUrl ? 'Yuklangan ✓' : 'Yuklanmagan' }}
                </span>
              </div>

              <div class="rejection-box" *ngIf="p.status === PaymentStatus.Failed && p.rejectionReason">
                <span class="rejection-icon">⚠️</span>
                <span class="rejection-text">Rad etilish sababi: {{ p.rejectionReason }}</span>
              </div>
            </div>
          </div>

          <div class="card-footer" (click)="$event.stopPropagation()">
            <button class="btn btn-outline-primary details-btn" (click)="viewDetails(p.id)">
              Batafsil ko‘rish &rarr;
            </button>
          </div>
        </div>
      </div>

      <!-- Load More / Pagination -->
      <div class="load-more-section" *ngIf="!isLoading && !hasError && totalPages > 1">
        <div class="page-info-text">
          {{ Math.min(displayedCount, filteredPayments.length) }} / {{ filteredPayments.length }} ta to‘lov ko‘rsatilmoqda
        </div>
        <div class="load-more-actions">
          <button 
            *ngIf="displayedCount < filteredPayments.length"
            type="button" 
            class="btn btn-secondary load-more-btn"
            (click)="loadMore()"
          >
            Yana yuklash ({{ Math.min(pageSize, filteredPayments.length - displayedCount) }} ta)
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .customer-payments-wrapper {
      max-width: 1100px;
      margin: 0 auto;
      padding: 1.5rem 1rem 3.5rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .breadcrumb-nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #64748b;
      margin-bottom: 0.5rem;
    }
    .breadcrumb-link {
      color: #4f46e5;
      text-decoration: none;
      font-weight: 500;
    }
    .breadcrumb-link:hover { text-decoration: underline; }
    .breadcrumb-sep { color: #94a3b8; }
    .breadcrumb-current { color: #64748b; }

    .page-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0 0 0.25rem;
    }
    .page-subtitle {
      color: #64748b;
      font-size: 0.925rem;
      margin: 0;
    }

    .orders-link-btn {
      font-weight: 600;
      font-size: 0.875rem;
      border-radius: 8px;
      padding: 0.5rem 1rem;
    }

    /* Filter Chips */
    .filter-chips-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 1.5rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }
    .chip-btn {
      padding: 0.45rem 0.9rem;
      border-radius: 9999px;
      font-size: 0.825rem;
      font-weight: 700;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .chip-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .chip-btn.active {
      background: #4f46e5;
      color: #ffffff;
      border-color: #4f46e5;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
    }

    /* Cards Grid */
    .payments-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }
    .payment-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .payment-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
      border-color: #cbd5e1;
    }

    .card-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      gap: 0.5rem;
    }
    .id-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .pay-id {
      font-weight: 800;
      font-size: 0.95rem;
      color: #0f172a;
    }
    .order-link-pill a {
      font-size: 0.775rem;
      font-weight: 700;
      color: #4f46e5;
      background: #eef2ff;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      text-decoration: none;
    }
    .order-link-pill a:hover {
      text-decoration: underline;
    }

    .amount-row {
      margin-bottom: 1rem;
    }
    .amount-num {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
    }
    .amount-currency {
      font-size: 0.85rem;
      color: #64748b;
      margin-left: 0.35rem;
      font-weight: 600;
    }

    .meta-details-list {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      font-size: 0.825rem;
      border-top: 1px dashed #e2e8f0;
      padding-top: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .meta-line {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .meta-label {
      color: #64748b;
    }
    .meta-val {
      font-weight: 600;
      color: #1e293b;
    }
    .branch-map-link {
      color: #4f46e5;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .branch-map-link:hover {
      text-decoration: underline;
      color: #4338ca;
    }
    .receipt-status-tag {
      font-size: 0.75rem;
      font-weight: 700;
      color: #94a3b8;
    }
    .receipt-status-tag.has-receipt {
      color: #16a34a;
    }

    .rejection-box {
      margin-top: 0.4rem;
      background: #fee2e2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.775rem;
      color: #991b1b;
      font-weight: 600;
    }

    .card-footer {
      border-top: 1px solid #f1f5f9;
      padding-top: 0.85rem;
    }
    .btn-outline-primary {
      width: 100%;
      border: 1px solid #4f46e5;
      color: #4f46e5;
      background: transparent;
      padding: 0.5rem 1rem;
      font-size: 0.825rem;
      font-weight: 700;
      border-radius: 8px;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .btn-outline-primary:hover {
      background: #4f46e5;
      color: #ffffff;
    }

    /* Empty and Error states */
    .empty-state-card, .error-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 3.5rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .empty-icon, .error-icon {
      font-size: 3.5rem;
    }
    .empty-title, .error-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .empty-description, .error-message {
      color: #64748b;
      font-size: 0.95rem;
      max-width: 440px;
      margin: 0;
    }

    /* Skeleton Loading */
    .loading-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }
    .skeleton-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .sk-header {
      height: 24px;
      background: #f1f5f9;
      border-radius: 6px;
    }
    .sk-line {
      height: 18px;
      background: #f1f5f9;
      border-radius: 4px;
    }
    .sk-line.w-75 { width: 75%; }
    .sk-footer {
      height: 36px;
      background: #f1f5f9;
      border-radius: 8px;
      margin-top: 0.5rem;
    }

    /* Load more section */
    .load-more-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
    .page-info-text {
      font-size: 0.85rem;
      color: #64748b;
    }
    .load-more-btn {
      padding: 0.6rem 1.5rem;
      font-weight: 700;
      font-size: 0.875rem;
      border-radius: 8px;
    }

    /* Dark Mode */
    :host-context(body.dark-theme) .page-title { color: #f8fafc; }
    :host-context(body.dark-theme) .page-subtitle { color: #94a3b8; }
    :host-context(body.dark-theme) .chip-btn {
      background: #151e32;
      border-color: #22304d;
      color: #cbd5e1;
    }
    :host-context(body.dark-theme) .chip-btn.active {
      background: #4f46e5;
      color: #ffffff;
      border-color: #4f46e5;
    }
    :host-context(body.dark-theme) .payment-card,
    :host-context(body.dark-theme) .empty-state-card {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .pay-id,
    :host-context(body.dark-theme) .amount-num,
    :host-context(body.dark-theme) .meta-val,
    :host-context(body.dark-theme) .empty-title {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .meta-details-list {
      border-top-color: #22304d;
    }
    :host-context(body.dark-theme) .card-footer {
      border-top-color: #22304d;
    }
    :host-context(body.dark-theme) .order-link-pill a {
      background: #1e1b4b;
      color: #a5b4fc;
    }
    :host-context(body.dark-theme) .rejection-box {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.35);
      color: #fca5a5;
    }
  `]
})
export class CustomerPaymentsListComponent implements OnInit {
  private paymentService = inject(PaymentService);
  public authState = inject(AuthStateService);
  private router = inject(Router);

  public PaymentStatus = PaymentStatus;
  public Math = Math;

  allPayments: PaymentListItem[] = [];
  filteredPayments: PaymentListItem[] = [];
  paginatedPayments: PaymentListItem[] = [];

  isLoading = false;
  hasError = false;

  selectedStatus: PaymentStatus | null = null;
  pageSize = 6;
  displayedCount = 6;

  get totalPages(): number {
    return Math.ceil(this.filteredPayments.length / this.pageSize);
  }

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.isLoading = true;
    this.hasError = false;

    // Load all payments for this customer (PaymentService handles customer scoping automatically)
    this.paymentService.getPayments({
      pageNumber: 1,
      pageSize: 500,
      sortBy: 'createdAt',
      sortDirection: 'desc'
    }).subscribe({
      next: (res) => {
        this.allPayments = res.items;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.hasError = true;
      }
    });
  }

  setStatusFilter(status: PaymentStatus | null): void {
    this.selectedStatus = status;
    this.displayedCount = this.pageSize;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.selectedStatus === null) {
      this.filteredPayments = [...this.allPayments];
    } else {
      this.filteredPayments = this.allPayments.filter(p => p.status === this.selectedStatus);
    }
    this.updatePagination();
  }

  updatePagination(): void {
    this.paginatedPayments = this.filteredPayments.slice(0, this.displayedCount);
  }

  loadMore(): void {
    this.displayedCount += this.pageSize;
    this.updatePagination();
  }

  getCountByStatus(status: PaymentStatus): number {
    return this.allPayments.filter(p => p.status === status).length;
  }

  viewDetails(paymentId: number): void {
    this.router.navigate(['/payments', paymentId]);
  }
}
