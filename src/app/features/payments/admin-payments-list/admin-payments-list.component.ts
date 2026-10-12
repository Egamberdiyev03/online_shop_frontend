import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { PaymentService } from '../../../core/services/payment.service';
import { CompanyService } from '../../../core/services/company.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PaymentListItem, PaymentSummary, PaymentStatus, PaymentFilter } from '../../../core/models/payment.model';
import { Company } from '../../../core/models/company.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { PaymentStatusBadgeComponent } from '../../../shared/components/payment-status-badge/payment-status-badge.component';

@Component({
  selector: 'app-admin-payments-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaymentStatusBadgeComponent],
  template: `
    <div class="payments-page-wrapper">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="breadcrumb-nav">
            <a routerLink="/admin" class="breadcrumb-link">Boshqaruv Paneli</a>
            <span class="breadcrumb-sep">&gt;</span>
            <span class="breadcrumb-current">To‘lovlar boshqaruvi</span>
          </div>
          <h1 class="page-title">💳 To‘lovlar Boshqaruvi</h1>
          <p class="page-subtitle">Barcha buyurtmalar to‘lovlari, cheklar tekshiruvi va tasdiqlash markazi</p>
        </div>

        <div class="header-right">
          <button class="btn btn-secondary refresh-btn" (click)="loadData()" [disabled]="isLoading" title="Ma'lumotlarni yangilash">
            <span class="refresh-icon" [class.spinning]="isLoading">🔄</span>
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      <!-- 4 KPI Summary Cards -->
      <div class="summary-grid">
        <!-- 1. Jami to'lovlar -->
        <div class="summary-card total">
          <div class="card-icon-box">
            <span class="card-emoji">💳</span>
          </div>
          <div class="card-info">
            <span class="card-label">Jami To‘lovlar</span>
            <div class="card-amount">{{ summary?.totalAmount || 0 | number:'1.0-0' }} so‘m</div>
            <div class="card-count">{{ summary?.totalCount || 0 }} ta tranzaksiya</div>
          </div>
        </div>

        <!-- 2. Kutilmoqda -->
        <div class="summary-card pending">
          <div class="card-icon-box">
            <span class="card-emoji">⏳</span>
          </div>
          <div class="card-info">
            <span class="card-label">Tekshiruv Kutilmoqda</span>
            <div class="card-amount warning-text">{{ summary?.pendingAmount || 0 | number:'1.0-0' }} so‘m</div>
            <div class="card-count">{{ summary?.pendingCount || 0 }} ta kutilmoqda</div>
          </div>
        </div>

        <!-- 3. Tasdiqlangan -->
        <div class="summary-card completed">
          <div class="card-icon-box">
            <span class="card-emoji">✅</span>
          </div>
          <div class="card-info">
            <span class="card-label">Tasdiqlangan</span>
            <div class="card-amount success-text">{{ summary?.completedAmount || 0 | number:'1.0-0' }} so‘m</div>
            <div class="card-count">{{ summary?.completedCount || 0 }} ta muvaffaqiyatli</div>
          </div>
        </div>

        <!-- 4. Rad etilgan -->
        <div class="summary-card failed">
          <div class="card-icon-box">
            <span class="card-emoji">❌</span>
          </div>
          <div class="card-info">
            <span class="card-label">Rad Etilgan</span>
            <div class="card-amount danger-text">{{ summary?.failedAmount || 0 | number:'1.0-0' }} so‘m</div>
            <div class="card-count">{{ summary?.failedCount || 0 }} ta bekor qilingan</div>
          </div>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="filters-card">
        <div class="filters-grid">
          <!-- Search input -->
          <div class="filter-item search-item">
            <label class="filter-label">Qidiruv</label>
            <div class="search-input-wrapper">
              <span class="search-icon">🔍</span>
              <input 
                type="text" 
                class="form-control search-input" 
                placeholder="To‘lov ID, buyurtma ID, mijoz, filial..."
                [ngModel]="searchQuery"
                (ngModelChange)="onSearchChange($event)"
              />
              <button *ngIf="searchQuery" class="clear-search-btn" (click)="clearSearch()">✕</button>
            </div>
          </div>

          <!-- Status Dropdown -->
          <div class="filter-item">
            <label class="filter-label">To‘lov Holati</label>
            <select class="form-control select-input" [(ngModel)]="selectedStatus" (ngModelChange)="applyFilter()">
              <option value="">Barchasi</option>
              <option [value]="PaymentStatus.Pending">Kutilmoqda (0)</option>
              <option [value]="PaymentStatus.Completed">Tasdiqlangan (1)</option>
              <option [value]="PaymentStatus.Failed">Rad etilgan (2)</option>
              <option [value]="PaymentStatus.Cancelled">Bekor qilingan (4)</option>
            </select>
          </div>

          <!-- Company Dropdown (Faqat SuperAdmin ko'radi) -->
          <div class="filter-item" *ngIf="authState.isSuperAdmin()">
            <label class="filter-label">Kompaniya</label>
            <select class="form-control select-input" [(ngModel)]="selectedCompanyId" (ngModelChange)="onCompanyChange()">
              <option value="">Barcha kompaniyalar</option>
              <option *ngFor="let c of companies" [value]="c.id">{{ c.name }}</option>
            </select>
          </div>

          <!-- Branch Dropdown (SuperAdmin va CompanyAdmin ko'radi) -->
          <div class="filter-item" *ngIf="authState.isSuperAdmin() || authState.isCompanyAdmin()">
            <label class="filter-label">Filial</label>
            <select class="form-control select-input" [(ngModel)]="selectedBranchId" (ngModelChange)="applyFilter()">
              <option value="">Barcha filiallar</option>
              <option *ngFor="let b of availableBranches" [value]="b.id">{{ b.name }}</option>
            </select>
          </div>

          <!-- Date From -->
          <div class="filter-item">
            <label class="filter-label">Dan (boshlanish)</label>
            <input type="date" class="form-control date-input" [(ngModel)]="dateFrom" (ngModelChange)="applyFilter()" />
          </div>

          <!-- Date To -->
          <div class="filter-item">
            <label class="filter-label">Gacha (tugash)</label>
            <input type="date" class="form-control date-input" [(ngModel)]="dateTo" (ngModelChange)="applyFilter()" />
          </div>

          <!-- Clear Filters -->
          <div class="filter-item actions-item">
            <button class="btn btn-secondary clear-filters-btn" (click)="resetFilters()" title="Barcha filtrlarni tozalash">
              <span>Tozalash</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content Area: Table / Loading / Empty / Error -->
      <div class="table-card">
        <!-- Table Top Meta -->
        <div class="table-meta-row">
          <div class="meta-left">
            <span class="meta-count">Topildi: <strong>{{ totalItems }}</strong> ta to‘lov</span>
            <span *ngIf="selectedStatus !== ''" class="active-filter-badge">
              Status filtri faol
            </span>
          </div>

          <div class="meta-right">
            <!-- Sort dropdown / toggle -->
            <div class="sort-controls">
              <span class="sort-label">Saralash:</span>
              <button 
                type="button" 
                class="sort-pill-btn" 
                [class.active]="sortBy === 'createdAt'"
                (click)="toggleSort('createdAt')"
              >
                Sana {{ sortBy === 'createdAt' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}
              </button>
              <button 
                type="button" 
                class="sort-pill-btn" 
                [class.active]="sortBy === 'amount'"
                (click)="toggleSort('amount')"
              >
                Summa {{ sortBy === 'amount' ? (sortDirection === 'asc' ? '↑' : '↓') : '' }}
              </button>
            </div>

            <!-- Page Size -->
            <div class="page-size-wrap">
              <span class="page-size-label">Ko‘rsatish:</span>
              <select class="form-control size-select" [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
                <option [value]="10">10</option>
                <option [value]="20">20</option>
                <option [value]="50">50</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Loading Skeleton -->
        <div class="skeleton-container" *ngIf="isLoading">
          <div class="skeleton-row" *ngFor="let i of [1,2,3,4,5]">
            <div class="skeleton-cell w-10"></div>
            <div class="skeleton-cell w-15"></div>
            <div class="skeleton-cell w-20"></div>
            <div class="skeleton-cell w-15"></div>
            <div class="skeleton-cell w-15"></div>
            <div class="skeleton-cell w-15"></div>
            <div class="skeleton-cell w-10"></div>
          </div>
        </div>

        <!-- Error State -->
        <div class="error-container" *ngIf="hasError && !isLoading">
          <div class="error-icon">⚠️</div>
          <h3 class="error-title">To‘lovlarni yuklashda xatolik yuz berdi</h3>
          <p class="error-message">Serverdan ma‘lumotlarni olish imkoni bo‘lmadi. Internet aloqasini tekshiring.</p>
          <button class="btn btn-primary" (click)="loadData()">Qayta urinish</button>
        </div>

        <!-- Empty State -->
        <div class="empty-container" *ngIf="!isLoading && !hasError && payments.length === 0">
          <div class="empty-icon">📭</div>
          <h3 class="empty-title">To‘lovlar topilmadi</h3>
          <p class="empty-message">Tanlangan parametrlar bo‘yicha hech qanday to‘lov ma‘lumoti mavjud emas.</p>
          <button *ngIf="hasActiveFilters" class="btn btn-secondary" (click)="resetFilters()">
            Filtrlarni tozalash
          </button>
        </div>

        <!-- Payments Table -->
        <div class="table-responsive" *ngIf="!isLoading && !hasError && payments.length > 0">
          <table class="payments-table">
            <thead>
              <tr>
                <th class="th-id">To‘lov ID</th>
                <th class="th-order">Buyurtma</th>
                <th class="th-customer">Mijoz</th>
                <th class="th-branch">Filial</th>
                <th class="th-amount" (click)="toggleSort('amount')">
                  Summa <span class="sort-icon">{{ sortBy === 'amount' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕' }}</span>
                </th>
                <th class="th-status">Holat</th>
                <th class="th-date" (click)="toggleSort('createdAt')">
                  Sana <span class="sort-icon">{{ sortBy === 'createdAt' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕' }}</span>
                </th>
                <th class="th-actions text-end">Amallar</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                *ngFor="let p of payments" 
                class="payment-row"
                (click)="viewDetails(p.id)"
                title="Tafsilotlarni ko'rish uchun bosing"
              >
                <!-- To'lov ID -->
                <td class="td-id">
                  <span class="id-badge">#{{ p.id }}</span>
                </td>

                <!-- Buyurtma -->
                <td class="td-order" (click)="$event.stopPropagation()">
                  <a [routerLink]="['/orders']" class="order-link" title="Buyurtmalar ro'yxati">
                    #{{ p.orderId }}
                  </a>
                </td>

                <!-- Mijoz -->
                <td class="td-customer">
                  <div class="customer-info-box">
                    <span class="cust-name">{{ p.customerName || 'Mijoz #' + p.customerId }}</span>
                    <span class="cust-phone" *ngIf="p.customerPhone">{{ p.customerPhone }}</span>
                  </div>
                </td>

                <!-- Filial -->
                <td class="td-branch">
                  <div class="branch-info-box">
                    <span class="branch-name">{{ p.branchName || 'Filial #' + p.branchId }}</span>
                    <span class="company-name" *ngIf="p.companyName">{{ p.companyName }}</span>
                  </div>
                </td>

                <!-- Summa -->
                <td class="td-amount">
                  <span class="amount-val">{{ p.amount | number:'1.0-0' }}</span>
                  <span class="amount-cur">so‘m</span>
                </td>

                <!-- Holat -->
                <td class="td-status">
                  <app-payment-status-badge [status]="p.status"></app-payment-status-badge>
                </td>

                <!-- Sana -->
                <td class="td-date">
                  <div class="date-box">
                    <span class="date-main">{{ p.createdAt | date:'dd.MM.yyyy' }}</span>
                    <span class="date-time">{{ p.createdAt | date:'HH:mm' }}</span>
                  </div>
                </td>

                <!-- Amallar -->
                <td class="td-actions text-end" (click)="$event.stopPropagation()">
                  <div class="actions-btn-group">
                    <!-- Ko'rish (Tafsilot) -->
                    <button 
                      type="button" 
                      class="btn-action view" 
                      (click)="viewDetails(p.id)"
                      title="Batafsil ko'rish"
                    >
                      👁️ Ko‘rish
                    </button>

                    <!-- Tezkor Tasdiqlash (faqat Pending holatda) -->
                    <button 
                      *ngIf="p.status === PaymentStatus.Pending"
                      type="button" 
                      class="btn-action confirm" 
                      (click)="openConfirmModal(p)"
                      title="To'lovni tasdiqlash"
                    >
                      ✓ Tasdiqlash
                    </button>

                    <!-- Tezkor Rad etish (faqat Pending holatda) -->
                    <button 
                      *ngIf="p.status === PaymentStatus.Pending"
                      type="button" 
                      class="btn-action reject" 
                      (click)="openRejectModal(p)"
                      title="To'lovni rad etish"
                    >
                      ✕ Rad etish
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div class="pagination-footer" *ngIf="!isLoading && !hasError && totalPages > 1">
          <div class="pagination-info">
            Sahifa: <strong>{{ currentPage }}</strong> / <strong>{{ totalPages }}</strong>
            ({{ totalItems }} ta to‘lovdan {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalItems) }} ko‘rsatilmoqda)
          </div>

          <div class="pagination-buttons">
            <button 
              type="button" 
              class="page-btn prev-btn" 
              [disabled]="currentPage === 1" 
              (click)="goToPage(currentPage - 1)"
            >
              &larr; Oldingi
            </button>

            <ng-container *ngFor="let page of visiblePages">
              <button 
                *ngIf="page !== -1"
                type="button" 
                class="page-btn num-btn" 
                [class.active]="page === currentPage"
                (click)="goToPage(page)"
              >
                {{ page }}
              </button>
              <span *ngIf="page === -1" class="page-ellipsis">&hellip;</span>
            </ng-container>

            <button 
              type="button" 
              class="page-btn next-btn" 
              [disabled]="currentPage === totalPages" 
              (click)="goToPage(currentPage + 1)"
            >
              Keyingi &rarr;
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Confirm Modal -->
      <div class="modal-overlay" *ngIf="showConfirmModal" (click)="closeConfirmModal()">
        <div class="modal-content confirm-modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">✓ To‘lovni tasdiqlash</h3>
            <button class="modal-close" (click)="closeConfirmModal()">&times;</button>
          </div>

          <div class="modal-body" *ngIf="selectedPaymentForAction">
            <p class="modal-text">
              Haqiqatan ham <strong>#{{ selectedPaymentForAction.id }}</strong>-sonli to‘lovni tasdiqlamoqchimisiz?
            </p>
            <div class="modal-details-card">
              <div class="m-row">
                <span class="m-label">Buyurtma:</span>
                <strong>#{{ selectedPaymentForAction.orderId }}</strong>
              </div>
              <div class="m-row">
                <span class="m-label">Mijoz:</span>
                <strong>{{ selectedPaymentForAction.customerName || 'Mijoz #' + selectedPaymentForAction.customerId }}</strong>
              </div>
              <div class="m-row">
                <span class="m-label">Summa:</span>
                <strong class="highlight-val">{{ selectedPaymentForAction.amount | number:'1.0-0' }} so‘m</strong>
              </div>
              <div class="m-row" *ngIf="selectedPaymentForAction.transactionNote">
                <span class="m-label">Izoh:</span>
                <span>{{ selectedPaymentForAction.transactionNote }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeConfirmModal()" [disabled]="isActionLoading">
              Bekor qilish
            </button>
            <button type="button" class="btn btn-primary confirm-action-btn" (click)="executeConfirm()" [disabled]="isActionLoading">
              <span *ngIf="isActionLoading" class="btn-spinner"></span>
              {{ isActionLoading ? 'Tasdiqlanmoqda...' : 'Tasdiqlash' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Reject Modal -->
      <div class="modal-overlay" *ngIf="showRejectModal" (click)="closeRejectModal()">
        <div class="modal-content reject-modal-card" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">✕ To‘lovni rad etish</h3>
            <button class="modal-close" (click)="closeRejectModal()">&times;</button>
          </div>

          <div class="modal-body" *ngIf="selectedPaymentForAction">
            <p class="modal-text">
              <strong>#{{ selectedPaymentForAction.id }}</strong>-sonli to‘lovni rad etish sababini kiriting. Ushbu ma‘lumot mijozga ko‘rsatiladi.
            </p>

            <div class="form-group mt-3">
              <label class="form-label required">Rad etish sababi:</label>
              <textarea 
                class="form-control rejection-textarea" 
                rows="3" 
                placeholder="Masalan: Chek rasmi noaniq yoki to'lov summasi mos kelmadi..."
                [(ngModel)]="rejectionReason"
                [class.is-invalid]="rejectionError"
              ></textarea>
              <div class="text-danger error-hint" *ngIf="rejectionError">
                {{ rejectionError }}
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeRejectModal()" [disabled]="isActionLoading">
              Bekor qilish
            </button>
            <button type="button" class="btn btn-danger reject-action-btn" (click)="executeReject()" [disabled]="isActionLoading">
              <span *ngIf="isActionLoading" class="btn-spinner"></span>
              {{ isActionLoading ? 'Rad etilmoqda...' : 'Rad etish' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payments-page-wrapper {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.5rem 1rem 3rem;
    }

    /* Page Header */
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
    .breadcrumb-link:hover {
      text-decoration: underline;
    }
    .breadcrumb-sep {
      color: #94a3b8;
    }
    .breadcrumb-current {
      color: #64748b;
    }

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

    .refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 8px;
    }
    .refresh-icon.spinning {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* 4 KPI Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .summary-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
    }
    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .card-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f1f5f9;
      font-size: 1.5rem;
      flex-shrink: 0;
    }
    .summary-card.total .card-icon-box { background: #e0e7ff; }
    .summary-card.pending .card-icon-box { background: #fef3c7; }
    .summary-card.completed .card-icon-box { background: #dcfce7; }
    .summary-card.failed .card-icon-box { background: #fee2e2; }

    .card-info {
      flex: 1;
      min-width: 0;
    }
    .card-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      display: block;
      margin-bottom: 0.25rem;
    }
    .card-amount {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }
    .warning-text { color: #d97706; }
    .success-text { color: #16a34a; }
    .danger-text { color: #dc2626; }
    .card-count {
      font-size: 0.8rem;
      color: #94a3b8;
      margin-top: 0.25rem;
    }

    /* Filters Card */
    .filters-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      align-items: flex-end;
    }
    .search-item {
      grid-column: span 2;
    }
    @media (max-width: 768px) {
      .search-item { grid-column: span 1; }
    }

    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .filter-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: #475569;
    }
    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      color: #94a3b8;
      pointer-events: none;
    }
    .search-input {
      padding-left: 2.25rem;
      padding-right: 2rem;
    }
    .clear-search-btn {
      position: absolute;
      right: 0.6rem;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .clear-search-btn:hover { color: #0f172a; }

    .clear-filters-btn {
      width: 100%;
      padding: 0.625rem 1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 8px;
    }

    /* Table Card */
    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .table-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .meta-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .meta-count {
      font-size: 0.875rem;
      color: #475569;
    }
    .active-filter-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      background: #e0e7ff;
      color: #4338ca;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 6px;
    }
    .meta-right {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .sort-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .sort-label {
      font-size: 0.8rem;
      color: #64748b;
      font-weight: 600;
    }
    .sort-pill-btn {
      padding: 0.25rem 0.6rem;
      font-size: 0.8rem;
      font-weight: 600;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .sort-pill-btn.active {
      background: #4f46e5;
      color: #ffffff;
      border-color: #4f46e5;
    }
    .page-size-wrap {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .page-size-label {
      font-size: 0.8rem;
      color: #64748b;
      font-weight: 600;
    }
    .size-select {
      width: 70px;
      padding: 0.25rem 0.5rem;
      font-size: 0.8rem;
    }

    /* Table styling */
    .table-responsive {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .payments-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }
    .payments-table th {
      padding: 0.875rem 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      cursor: default;
      user-select: none;
    }
    .payments-table th.th-amount,
    .payments-table th.th-date {
      cursor: pointer;
    }
    .sort-icon {
      font-size: 0.7rem;
      margin-left: 0.25rem;
      color: #94a3b8;
    }

    .payment-row {
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .payment-row:hover {
      background-color: #f8fafc;
    }
    .payments-table td {
      padding: 0.875rem 1rem;
      vertical-align: middle;
    }

    .id-badge {
      font-family: monospace;
      font-weight: 700;
      background: #f1f5f9;
      color: #334155;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-size: 0.825rem;
    }
    .order-link {
      font-weight: 700;
      color: #4f46e5;
      text-decoration: none;
      background: #eef2ff;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
    }
    .order-link:hover {
      text-decoration: underline;
    }

    .customer-info-box,
    .branch-info-box {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .cust-name, .branch-name {
      font-weight: 600;
      color: #0f172a;
    }
    .cust-phone, .company-name {
      font-size: 0.775rem;
      color: #64748b;
    }

    .amount-val {
      font-weight: 800;
      color: #0f172a;
      font-size: 0.95rem;
    }
    .amount-cur {
      font-size: 0.75rem;
      color: #64748b;
      margin-left: 0.25rem;
    }

    .date-box {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .date-main {
      font-weight: 600;
      color: #334155;
    }
    .date-time {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    /* Actions buttons */
    .actions-btn-group {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.4rem;
    }
    .btn-action {
      padding: 0.35rem 0.65rem;
      font-size: 0.775rem;
      font-weight: 700;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .btn-action.view {
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-action.view:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .btn-action.confirm {
      background: #dcfce7;
      color: #15803d;
      border-color: #bbf7d0;
    }
    .btn-action.confirm:hover {
      background: #bbf7d0;
    }
    .btn-action.reject {
      background: #fee2e2;
      color: #b91c1c;
      border-color: #fecaca;
    }
    .btn-action.reject:hover {
      background: #fecaca;
    }

    /* Pagination Footer */
    .pagination-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .pagination-info {
      font-size: 0.85rem;
      color: #64748b;
    }
    .pagination-buttons {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .page-btn {
      padding: 0.4rem 0.75rem;
      font-size: 0.825rem;
      font-weight: 600;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .page-btn:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #94a3b8;
    }
    .page-btn.active {
      background: #4f46e5;
      color: #ffffff;
      border-color: #4f46e5;
    }
    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .page-ellipsis {
      padding: 0 0.25rem;
      color: #94a3b8;
    }

    /* Loading Skeleton */
    .skeleton-container {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .skeleton-row {
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    .skeleton-cell {
      height: 20px;
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }
    .w-10 { width: 10%; }
    .w-15 { width: 15%; }
    .w-20 { width: 20%; }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Error and Empty states */
    .empty-container, .error-container {
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    .empty-icon, .error-icon {
      font-size: 3rem;
    }
    .empty-title, .error-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .empty-message, .error-message {
      color: #64748b;
      font-size: 0.9rem;
      max-width: 400px;
      margin: 0 0 0.5rem;
    }

    /* Modals */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }
    .modal-content {
      background: #ffffff;
      border-radius: 14px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .modal-close {
      font-size: 1.5rem;
      line-height: 1;
      color: #94a3b8;
      background: none;
      border: none;
      cursor: pointer;
    }
    .modal-close:hover { color: #0f172a; }
    .modal-body {
      padding: 1.5rem;
    }
    .modal-text {
      color: #334155;
      font-size: 0.95rem;
      line-height: 1.5;
      margin-bottom: 1rem;
    }
    .modal-details-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.875rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.875rem;
    }
    .m-row {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .m-label {
      color: #64748b;
    }
    .highlight-val {
      color: #4f46e5;
    }
    .rejection-textarea {
      width: 100%;
      border-radius: 8px;
      padding: 0.75rem;
      font-size: 0.875rem;
      border: 1px solid #cbd5e1;
      resize: vertical;
    }
    .rejection-textarea.is-invalid {
      border-color: #ef4444;
    }
    .error-hint {
      font-size: 0.8rem;
      color: #ef4444;
      margin-top: 0.35rem;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .btn-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 0.4rem;
    }

    /* Dark Mode Compatibility */
    :host-context(body.dark-theme) .page-title { color: #f8fafc; }
    :host-context(body.dark-theme) .page-subtitle { color: #94a3b8; }
    :host-context(body.dark-theme) .summary-card {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .card-amount { color: #f8fafc; }
    :host-context(body.dark-theme) .filters-card {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .filter-label { color: #cbd5e1; }
    :host-context(body.dark-theme) .form-control {
      background-color: #0b0f19;
      border-color: #334155;
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .table-card {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .table-meta-row,
    :host-context(body.dark-theme) .payments-table th,
    :host-context(body.dark-theme) .pagination-footer {
      background: #0f172a;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .payment-row {
      border-color: #1e293b;
    }
    :host-context(body.dark-theme) .payment-row:hover {
      background-color: #1e293b;
    }
    :host-context(body.dark-theme) .id-badge {
      background: #0b0f19;
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .order-link {
      background: #1e1b4b;
      color: #a5b4fc;
    }
    :host-context(body.dark-theme) .cust-name,
    :host-context(body.dark-theme) .branch-name,
    :host-context(body.dark-theme) .amount-val {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .date-main { color: #cbd5e1; }
    :host-context(body.dark-theme) .modal-content {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .modal-header,
    :host-context(body.dark-theme) .modal-footer {
      border-color: #22304d;
      background: #0f172a;
    }
    :host-context(body.dark-theme) .modal-title { color: #f8fafc; }
    :host-context(body.dark-theme) .modal-text { color: #cbd5e1; }
    :host-context(body.dark-theme) .modal-details-card {
      background: #0b0f19;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .page-btn {
      background: #0b0f19;
      border-color: #334155;
      color: #cbd5e1;
    }
    :host-context(body.dark-theme) .btn-action.view {
      background: #0b0f19;
      border-color: #334155;
      color: #cbd5e1;
    }
  `]
})
export class AdminPaymentsListComponent implements OnInit, OnDestroy {
  private paymentService = inject(PaymentService);
  private companyService = inject(CompanyService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  public PaymentStatus = PaymentStatus;
  public Math = Math;

  // Data
  payments: PaymentListItem[] = [];
  summary: PaymentSummary | null = null;
  companies: Company[] = [];
  branches: CompanyBranch[] = [];

  // Loading & Error States
  isLoading = false;
  hasError = false;
  isActionLoading = false;

  // Filter Models
  searchQuery = '';
  selectedStatus: PaymentStatus | string = '';
  selectedCompanyId: number | string = '';
  selectedBranchId: number | string = '';
  dateFrom = '';
  dateTo = '';

  // Sorting
  sortBy: 'createdAt' | 'amount' = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;

  // Modals
  showConfirmModal = false;
  showRejectModal = false;
  selectedPaymentForAction: PaymentListItem | null = null;
  rejectionReason = '';
  rejectionError = '';

  // RxJS Debounce for search
  private searchSubject = new Subject<string>();
  private sub = new Subscription();

  get availableBranches(): CompanyBranch[] {
    if (this.authState.isSuperAdmin()) {
      if (this.selectedCompanyId) {
        return this.branches.filter(b => b.companyId === Number(this.selectedCompanyId));
      }
      return this.branches;
    } else if (this.authState.isCompanyAdmin()) {
      const userCompId = this.authState.userCompanyId();
      return this.branches.filter(b => b.companyId === userCompId);
    }
    return this.branches;
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchQuery ||
      this.selectedStatus !== '' ||
      this.selectedCompanyId !== '' ||
      this.selectedBranchId !== '' ||
      this.dateFrom ||
      this.dateTo
    );
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (current > 3) pages.push(-1); // ellipsis

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 2) pages.push(-1); // ellipsis
    pages.push(total);

    return pages;
  }

  ngOnInit(): void {
    // 1. Setup search debounce (400ms)
    this.sub.add(
      this.searchSubject.pipe(
        debounceTime(400),
        distinctUntilChanged()
      ).subscribe(term => {
        this.searchQuery = term;
        this.currentPage = 1;
        this.syncUrlAndLoad();
      })
    );

    // 2. Load companies and branches for dropdowns
    this.loadDropdownData();

    // 3. Read initial query params from URL
    this.route.queryParams.subscribe(params => {
      if (params['search'] !== undefined) this.searchQuery = params['search'];
      if (params['status'] !== undefined) this.selectedStatus = params['status'] !== '' ? Number(params['status']) : '';
      if (params['companyId'] !== undefined) this.selectedCompanyId = params['companyId'] !== '' ? Number(params['companyId']) : '';
      if (params['branchId'] !== undefined) this.selectedBranchId = params['branchId'] !== '' ? Number(params['branchId']) : '';
      if (params['dateFrom'] !== undefined) this.dateFrom = params['dateFrom'];
      if (params['dateTo'] !== undefined) this.dateTo = params['dateTo'];
      if (params['page'] !== undefined) this.currentPage = Number(params['page']) || 1;
      if (params['size'] !== undefined) this.pageSize = Number(params['size']) || 10;
      if (params['sortBy'] !== undefined) this.sortBy = params['sortBy'];
      if (params['sortDirection'] !== undefined) this.sortDirection = params['sortDirection'];

      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  loadDropdownData(): void {
    if (this.authState.isSuperAdmin()) {
      this.companyService.getAllCompanies().subscribe({
        next: (res) => this.companies = res,
        error: () => {}
      });
    }

    this.companyService.getAllBranches().subscribe({
      next: (res) => this.branches = res,
      error: () => {}
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.hasError = false;

    const filter: PaymentFilter = {
      status: this.selectedStatus !== '' ? Number(this.selectedStatus) : null,
      companyId: this.selectedCompanyId ? Number(this.selectedCompanyId) : null,
      branchId: this.selectedBranchId ? Number(this.selectedBranchId) : null,
      dateFrom: this.dateFrom || null,
      dateTo: this.dateTo || null,
      search: this.searchQuery || null,
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection
    };

    // Load payments
    this.paymentService.getPayments(filter).subscribe({
      next: (result) => {
        this.payments = result.items;
        this.totalItems = result.total;
        this.totalPages = result.totalPages;
        this.currentPage = result.pageNumber;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.hasError = true;
      }
    });

    // Load KPI Summary
    const targetBranch = this.selectedBranchId ? Number(this.selectedBranchId) : undefined;
    const targetCompany = this.selectedCompanyId ? Number(this.selectedCompanyId) : undefined;
    this.paymentService.getSummary(targetBranch, targetCompany).subscribe({
      next: (sum) => this.summary = sum,
      error: () => {}
    });
  }

  onSearchChange(term: string): void {
    this.searchSubject.next(term);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  onCompanyChange(): void {
    this.selectedBranchId = '';
    this.applyFilter();
  }

  applyFilter(): void {
    this.currentPage = 1;
    this.syncUrlAndLoad();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.selectedCompanyId = '';
    this.selectedBranchId = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.currentPage = 1;
    this.sortBy = 'createdAt';
    this.sortDirection = 'desc';
    this.syncUrlAndLoad();
  }

  toggleSort(column: 'createdAt' | 'amount'): void {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'desc';
    }
    this.syncUrlAndLoad();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.syncUrlAndLoad();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.syncUrlAndLoad();
  }

  private syncUrlAndLoad(): void {
    const queryParams: any = {};
    if (this.searchQuery) queryParams['search'] = this.searchQuery;
    if (this.selectedStatus !== '') queryParams['status'] = this.selectedStatus;
    if (this.selectedCompanyId !== '') queryParams['companyId'] = this.selectedCompanyId;
    if (this.selectedBranchId !== '') queryParams['branchId'] = this.selectedBranchId;
    if (this.dateFrom) queryParams['dateFrom'] = this.dateFrom;
    if (this.dateTo) queryParams['dateTo'] = this.dateTo;
    if (this.currentPage > 1) queryParams['page'] = this.currentPage;
    if (this.pageSize !== 10) queryParams['size'] = this.pageSize;
    if (this.sortBy !== 'createdAt') queryParams['sortBy'] = this.sortBy;
    if (this.sortDirection !== 'desc') queryParams['sortDirection'] = this.sortDirection;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'replace'
    });
  }

  viewDetails(paymentId: number): void {
    this.router.navigate(['/admin/payments', paymentId]);
  }

  // Quick Action Confirm Modal
  openConfirmModal(p: PaymentListItem): void {
    this.selectedPaymentForAction = p;
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.selectedPaymentForAction = null;
  }

  executeConfirm(): void {
    if (!this.selectedPaymentForAction) return;
    this.isActionLoading = true;
    const paymentId = this.selectedPaymentForAction.id;

    this.paymentService.confirm(paymentId).subscribe({
      next: () => {
        this.isActionLoading = false;
        this.closeConfirmModal();
        this.notification.success(`To‘lov #${paymentId} muvaffaqiyatli tasdiqlandi.`);
        this.loadData();
      },
      error: (err) => {
        this.isActionLoading = false;
        this.notification.error(err?.error?.message || err?.message || 'To‘lovni tasdiqlashda xatolik yuz berdi.');
      }
    });
  }

  // Quick Action Reject Modal
  openRejectModal(p: PaymentListItem): void {
    this.selectedPaymentForAction = p;
    this.rejectionReason = '';
    this.rejectionError = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedPaymentForAction = null;
    this.rejectionReason = '';
    this.rejectionError = '';
  }

  executeReject(): void {
    if (!this.selectedPaymentForAction) return;

    if (!this.rejectionReason || !this.rejectionReason.trim()) {
      this.rejectionError = 'Iltimos, rad etish sababini kiriting.';
      return;
    }

    this.isActionLoading = true;
    const paymentId = this.selectedPaymentForAction.id;
    const reason = this.rejectionReason.trim();

    this.paymentService.reject(paymentId, reason).subscribe({
      next: () => {
        this.isActionLoading = false;
        this.closeRejectModal();
        this.notification.success(`To‘lov #${paymentId} rad etildi.`);
        this.loadData();
      },
      error: (err) => {
        this.isActionLoading = false;
        this.notification.error(err?.error?.message || err?.message || 'To‘lovni rad etishda xatolik yuz berdi.');
      }
    });
  }
}
