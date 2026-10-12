import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PaymentDetails, PaymentStatus } from '../../../core/models/payment.model';
import { OrderStatus, OrderStatusLabels } from '../../../core/models/order.model';
import { PaymentStatusBadgeComponent } from '../../../shared/components/payment-status-badge/payment-status-badge.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-payment-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PaymentStatusBadgeComponent, StatusBadgeComponent],
  template: `
    <div class="detail-page-wrapper">
      <!-- Loading State -->
      <div class="loading-container" *ngIf="isLoading">
        <div class="spinner-box">
          <div class="spinner"></div>
          <span class="loading-text">To‘lov ma‘lumotlari yuklanmoqda...</span>
        </div>
      </div>

      <!-- 404 / Not Found State -->
      <div class="not-found-card" *ngIf="!isLoading && !payment">
        <div class="not-found-icon">🔍</div>
        <h2 class="not-found-title">To‘lov topilmadi</h2>
        <p class="not-found-text">
          Siz qidirayotgan to‘lov mavjud emas yoki uni ko‘rish uchun sizda yetarli huquq yo‘q.
        </p>
        <button class="btn btn-primary" (click)="goBack()">
          &larr; Orqaga qaytish
        </button>
      </div>

      <!-- Main Detail Content -->
      <div class="detail-content" *ngIf="!isLoading && payment">
        <!-- Top Navigation Bar & Action Header -->
        <div class="page-top-header">
          <div class="header-left">
            <button class="back-link-btn" (click)="goBack()">
              &larr; {{ isAdminView ? 'Barcha to‘lovlar ro‘yxati' : 'Mening to‘lovlarim' }}
            </button>
            <div class="title-row">
              <h1 class="page-title">To‘lov #{{ payment.id }}</h1>
              <app-payment-status-badge [status]="payment.status"></app-payment-status-badge>
            </div>
            <span class="creation-date">
              📅 Yaratilgan sana: {{ payment.createdAt | date:'dd-MMMM yyyy, HH:mm' }}
            </span>
          </div>

          <!-- Top Actions (Admin buttons) -->
          <div class="header-right" *ngIf="isAdminView && payment.status === PaymentStatus.Pending">
            <button 
              type="button" 
              class="btn btn-danger action-btn" 
              (click)="openRejectModal()" 
              [disabled]="isActionSubmitting"
            >
              ✕ Rad etish
            </button>
            <button 
              type="button" 
              class="btn btn-primary action-btn" 
              (click)="openConfirmModal()" 
              [disabled]="isActionSubmitting"
            >
              ✓ Tasdiqlash
            </button>
          </div>
        </div>

        <!-- 2 Columns Grid Layout -->
        <div class="detail-grid">
          <!-- Left Column: Payment Info, Receipt, Order Items -->
          <div class="grid-col main-col">
            <!-- 1. To'lov Ma'lumotlari Card -->
            <div class="content-card">
              <div class="card-header">
                <h3 class="card-title">💳 To‘lov Tafsilotlari</h3>
              </div>
              <div class="card-body">
                <div class="info-metrics-row">
                  <div class="metric-item">
                    <span class="metric-label">To‘lov Summasi</span>
                    <div class="metric-value amount-highlight">
                      {{ payment.amount | number:'1.0-0' }} <span class="cur">so‘m</span>
                    </div>
                  </div>

                  <div class="metric-item">
                    <span class="metric-label">To‘lov Usuli</span>
                    <div class="metric-value">
                      {{ getPaymentMethodText(payment.paymentMethod) }}
                    </div>
                  </div>

                  <div class="metric-item">
                    <span class="metric-label">To‘lov Holati</span>
                    <div class="metric-value">
                      <app-payment-status-badge [status]="payment.status"></app-payment-status-badge>
                    </div>
                  </div>
                </div>

                <div class="note-box" *ngIf="payment.transactionNote">
                  <span class="note-label">Mijoz izohi / Tranzaksiya:</span>
                  <p class="note-content">"{{ payment.transactionNote }}"</p>
                </div>

                <!-- Rejection Notice if Failed -->
                <div class="rejection-alert" *ngIf="payment.status === PaymentStatus.Failed && payment.rejectionReason">
                  <div class="alert-icon">⚠️</div>
                  <div class="alert-body">
                    <strong>To‘lov rad etilgan</strong>
                    <p class="rejection-reason-text">Sabab: {{ payment.rejectionReason }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. Chek (Receipt) Card -->
            <div class="content-card">
              <div class="card-header">
                <h3 class="card-title">🧾 To‘lov Cheki</h3>
              </div>
              <div class="card-body">
                <!-- Chek mavjud bo'lsa -->
                <div class="receipt-preview-box" *ngIf="payment.chekUrl; else noReceiptBlock">
                  <!-- Rasm bo'lsa -->
                  <div class="receipt-image-wrap" *ngIf="!isPdfReceipt(payment.chekUrl)">
                    <img 
                      [src]="getFullImageUrl(payment.chekUrl)" 
                      alt="To'lov cheki" 
                      class="receipt-thumbnail" 
                      (click)="openImageModal()"
                      title="Chekni kattalashtirib ko'rish"
                    />
                    <div class="receipt-overlay" (click)="openImageModal()">
                      <span>🔍 Kattalashtirib ko‘rish</span>
                    </div>
                  </div>

                  <!-- PDF bo'lsa -->
                  <div class="pdf-receipt-wrap" *ngIf="isPdfReceipt(payment.chekUrl)">
                    <span class="pdf-icon">📄</span>
                    <div class="pdf-info">
                      <span class="pdf-name">PDF To‘lov hujjati</span>
                      <a [href]="getFullImageUrl(payment.chekUrl)" target="_blank" class="pdf-link">
                        Chekni yangi oynada ochish &rarr;
                      </a>
                    </div>
                  </div>
                </div>

                <!-- Chek yuklanmagan bo'lsa -->
                <ng-template #noReceiptBlock>
                  <div class="no-receipt-box">
                    <span class="no-receipt-icon">📄</span>
                    <span class="no-receipt-text">Ushbu to‘lov uchun chek fayli biriktirilmagan</span>

                    <!-- Agar Mijoz bo'lsa va to'lov Pending bo'lsa (hamda buyurtma bekor qilinmagan/jo'natilmagan bo'lsa): Chek yuklash imkoniyati -->
                    <div class="upload-receipt-wrapper" *ngIf="!isAdminView && payment.status === PaymentStatus.Pending && (!payment.order || (payment.order.status !== OrderStatus.Shipped && payment.order.status !== OrderStatus.Delivered && payment.order.status !== OrderStatus.Cancelled))">
                      <div class="upload-dropzone">
                        <input 
                          type="file" 
                          id="receiptFileInput" 
                          class="file-input" 
                          (change)="onFileSelected($event)" 
                          accept=".jpg,.jpeg,.png,.pdf" 
                        />
                        <label for="receiptFileInput" class="file-label">
                          <span class="upload-icon">📁</span>
                          <span class="upload-prompt">
                            {{ selectedFile ? selectedFile.name : 'Chek faylini tanlang (.jpg, .png, .pdf)' }}
                          </span>
                          <span class="upload-hint">Maksimal hajm: 5MB</span>
                        </label>
                      </div>

                      <div class="file-error" *ngIf="fileError">
                        {{ fileError }}
                      </div>

                      <button 
                        type="button" 
                        class="btn btn-primary upload-btn mt-2" 
                        [disabled]="!selectedFile || isUploadingReceipt"
                        (click)="submitCustomerReceipt()"
                      >
                        <span *ngIf="isUploadingReceipt" class="btn-spinner"></span>
                        {{ isUploadingReceipt ? 'Yuklanmoqda...' : 'Chekni yuborish' }}
                      </button>
                    </div>
                  </div>
                </ng-template>
              </div>
            </div>

            <!-- 3. Buyurtma va Mahsulotlar Card -->
            <div class="content-card" *ngIf="payment.order">
              <div class="card-header space-between">
                <h3 class="card-title">📦 Bog‘langan Buyurtma #{{ payment.order.id }}</h3>
                <a [routerLink]="['/orders']" class="btn btn-sm btn-secondary view-order-link">
                  Buyurtmalarga o‘tish &rarr;
                </a>
              </div>
              <div class="card-body">
                <div class="order-meta-info">
                  <div class="order-meta-item">
                    <span class="label">Buyurtma holati:</span>
                    <app-status-badge [status]="payment.order.status"></app-status-badge>
                  </div>
                  <div class="order-meta-item" *ngIf="payment.order.deliveryAddress">
                    <span class="label">Yetkazish manzili:</span>
                    <span class="val">{{ payment.order.deliveryAddress }}</span>
                  </div>
                </div>

                <!-- Products Table -->
                <div class="table-responsive mt-3" *ngIf="payment.order.orderItems && payment.order.orderItems.length > 0">
                  <table class="items-table">
                    <thead>
                      <tr>
                        <th>Mahsulot</th>
                        <th class="text-center">Miqdori</th>
                        <th class="text-end">Narxi</th>
                        <th class="text-end">Jami</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let item of payment.order.orderItems">
                        <td class="item-name">{{ item.productName }}</td>
                        <td class="text-center">{{ item.quantity }} dona</td>
                        <td class="text-end">{{ item.unitPrice | number:'1.0-0' }} so‘m</td>
                        <td class="text-end fw-bold">{{ (item.quantity * item.unitPrice) | number:'1.0-0' }} so‘m</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="3" class="text-end total-cell-label">Buyurtma umumiy summasi:</td>
                        <td class="text-end total-cell-val">{{ payment.order.totalPrice | number:'1.0-0' }} so‘m</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Customer Info, Branch Info, Timeline -->
          <div class="grid-col side-col">
            <!-- 4. Mijoz Ma'lumotlari -->
            <div class="content-card" *ngIf="payment.customer">
              <div class="card-header">
                <h3 class="card-title">👤 Mijoz Ma‘lumotlari</h3>
              </div>
              <div class="card-body">
                <div class="profile-details-list">
                  <div class="p-detail-item">
                    <span class="p-label">F.I.Sh:</span>
                    <strong class="p-val">{{ payment.customer.name }}</strong>
                  </div>
                  <div class="p-detail-item" *ngIf="payment.customer.phoneNumber">
                    <span class="p-label">Telefon:</span>
                    <a [href]="'tel:' + payment.customer.phoneNumber" class="p-val phone-link">
                      {{ payment.customer.phoneNumber }}
                    </a>
                  </div>
                  <div class="p-detail-item" *ngIf="payment.customer.email">
                    <span class="p-label">Email:</span>
                    <span class="p-val">{{ payment.customer.email }}</span>
                  </div>
                  <div class="p-detail-item" *ngIf="payment.customer.address">
                    <span class="p-label">Manzil:</span>
                    <span class="p-val">{{ payment.customer.address }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 5. Filial va Kompaniya -->
            <div class="content-card" *ngIf="payment.branch">
              <div class="card-header">
                <h3 class="card-title">🏢 Filial & Kompaniya</h3>
              </div>
              <div class="card-body">
                <div class="profile-details-list">
                  <div class="p-detail-item" *ngIf="payment.branch.companyName">
                    <span class="p-label">Kompaniya:</span>
                    <strong class="p-val">{{ payment.branch.companyName }}</strong>
                  </div>
                  <div class="p-detail-item">
                    <span class="p-label">Filial:</span>
                    <a
                      *ngIf="payment.branch.id; else plainBranchName"
                      [routerLink]="['/map']"
                      [queryParams]="{ branch: payment.branch.id }"
                      class="p-val branch-map-link"
                      title="Xaritada ko‘rish"
                    >
                      {{ payment.branch.name }} 📍
                    </a>
                    <ng-template #plainBranchName>
                      <span class="p-val">{{ payment.branch.name }}</span>
                    </ng-template>
                  </div>
                  <div class="p-detail-item" *ngIf="payment.branch.phoneNumber">
                    <span class="p-label">Filial telefoni:</span>
                    <span class="p-val">{{ payment.branch.phoneNumber }}</span>
                  </div>
                  <div class="p-detail-item" *ngIf="payment.branch.address">
                    <span class="p-label">Filial manzili:</span>
                    <span class="p-val">{{ payment.branch.address }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 6. Tarix (Timeline) Card -->
            <div class="content-card">
              <div class="card-header">
                <h3 class="card-title">⏱️ Tranzaksiya Tarixi</h3>
              </div>
              <div class="card-body">
                <div class="timeline-container">
                  <!-- Step 1: Yaratildi -->
                  <div class="timeline-step done">
                    <div class="timeline-marker">✓</div>
                    <div class="timeline-content">
                      <span class="timeline-title">To‘lov yaratildi</span>
                      <span class="timeline-time">{{ payment.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
                      <p class="timeline-desc">Buyurtma uchun to‘lov hisobi ochildi.</p>
                    </div>
                  </div>

                  <!-- Step 2: Chek yuborildi -->
                  <div class="timeline-step" [class.done]="!!payment.chekUrl">
                    <div class="timeline-marker">{{ payment.chekUrl ? '✓' : '•' }}</div>
                    <div class="timeline-content">
                      <span class="timeline-title">
                        {{ payment.chekUrl ? 'To‘lov cheki biriktirildi' : 'To‘lov cheki kutilmoqda' }}
                      </span>
                      <p class="timeline-desc">
                        {{ payment.chekUrl ? 'Chek serverga muvaffaqiyatli yuklangan.' : 'Mijoz to‘lov chekini yuborishi lozim.' }}
                      </p>
                    </div>
                  </div>

                  <!-- Step 3: Tasdiqlandi yoki Rad etildi -->
                  <div 
                    class="timeline-step" 
                    [class.done]="payment.status === PaymentStatus.Completed"
                    [class.failed]="payment.status === PaymentStatus.Failed"
                  >
                    <div class="timeline-marker">
                      {{ payment.status === PaymentStatus.Completed ? '✓' : (payment.status === PaymentStatus.Failed ? '✕' : '•') }}
                    </div>
                    <div class="timeline-content">
                      <span class="timeline-title">
                        {{ payment.status === PaymentStatus.Completed ? 'To‘lov tasdiqlandi' : (payment.status === PaymentStatus.Failed ? 'To‘lov rad etildi' : 'Moderatsiya kutilmoqda') }}
                      </span>
                      <span class="timeline-time" *ngIf="payment.confirmedAt">
                        {{ payment.confirmedAt | date:'dd.MM.yyyy HH:mm' }}
                      </span>
                      <p class="timeline-desc" *ngIf="payment.confirmedByName">
                        Moderator: <strong>{{ payment.confirmedByName }}</strong>
                      </p>
                      <p class="timeline-desc text-danger" *ngIf="payment.rejectionReason">
                        Sabab: {{ payment.rejectionReason }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Zoom Modal for Receipt Image -->
      <div class="modal-overlay" *ngIf="showImageModal" (click)="closeImageModal()">
        <div class="zoom-image-container" (click)="$event.stopPropagation()">
          <button class="modal-close-corner" (click)="closeImageModal()">✕</button>
          <img [src]="getFullImageUrl(payment?.chekUrl)" alt="Chek to'liq hajmi" class="full-zoom-img" />
        </div>
      </div>

      <!-- Admin Confirm Modal -->
      <div class="modal-overlay" *ngIf="showConfirmModal" (click)="closeConfirmModal()">
        <div class="modal-content confirm-modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">✓ To‘lovni tasdiqlash</h3>
            <button class="modal-close" (click)="closeConfirmModal()">&times;</button>
          </div>
          <div class="modal-body" *ngIf="payment">
            <p class="modal-prompt">
              Ushbu to‘lovni tasdiqlaysizmi? Buyurtma holati avtomatik ravishda <strong>Tasdiqlangan</strong>ga o‘zgaradi.
            </p>
            <div class="summary-box">
              <div>To‘lov: <strong>#{{ payment.id }}</strong></div>
              <div>Summa: <strong class="text-primary">{{ payment.amount | number:'1.0-0' }} so‘m</strong></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeConfirmModal()" [disabled]="isActionSubmitting">
              Bekor qilish
            </button>
            <button class="btn btn-primary" (click)="executeConfirm()" [disabled]="isActionSubmitting">
              <span *ngIf="isActionSubmitting" class="btn-spinner"></span>
              {{ isActionSubmitting ? 'Tasdiqlanmoqda...' : 'Tasdiqlash' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Admin Reject Modal -->
      <div class="modal-overlay" *ngIf="showRejectModal" (click)="closeRejectModal()">
        <div class="modal-content reject-modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">✕ To‘lovni rad etish</h3>
            <button class="modal-close" (click)="closeRejectModal()">&times;</button>
          </div>
          <div class="modal-body" *ngIf="payment">
            <p class="modal-prompt">
              To‘lovni rad etish sababini kiriting (mijozga ko‘rinadi):
            </p>
            <textarea 
              class="form-control" 
              rows="3" 
              placeholder="Masalan: Chek yaroqsiz yoki noto'g'ri summa..." 
              [(ngModel)]="rejectionReasonText"
            ></textarea>
            <div class="text-danger error-hint" *ngIf="rejectionErrorText">
              {{ rejectionErrorText }}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeRejectModal()" [disabled]="isActionSubmitting">
              Bekor qilish
            </button>
            <button class="btn btn-danger" (click)="executeReject()" [disabled]="isActionSubmitting">
              <span *ngIf="isActionSubmitting" class="btn-spinner"></span>
              {{ isActionSubmitting ? 'Rad etilmoqda...' : 'Rad etish' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-page-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.5rem 1rem 3.5rem;
    }

    /* Loading Spinner */
    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 350px;
    }
    .spinner-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid rgba(79, 70, 229, 0.2);
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .loading-text {
      color: #64748b;
      font-size: 0.95rem;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* 404 / Not Found */
    .not-found-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 4rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .not-found-icon { font-size: 3.5rem; }
    .not-found-title { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0; }
    .not-found-text { color: #64748b; font-size: 0.95rem; max-width: 420px; margin: 0; }

    /* Page Header */
    .page-top-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .back-link-btn {
      background: none;
      border: none;
      color: #4f46e5;
      font-weight: 600;
      font-size: 0.875rem;
      padding: 0;
      cursor: pointer;
      margin-bottom: 0.5rem;
      display: inline-block;
    }
    .back-link-btn:hover { text-decoration: underline; }
    .title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
    }
    .page-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0;
    }
    .creation-date {
      color: #64748b;
      font-size: 0.85rem;
    }

    .header-right {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .action-btn {
      padding: 0.55rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 700;
      border-radius: 8px;
    }

    /* Grid Layout */
    .detail-grid {
      display: grid;
      grid-template-columns: 1.7fr 1fr;
      gap: 1.5rem;
      align-items: start;
    }
    @media (max-width: 900px) {
      .detail-grid { grid-template-columns: 1fr; }
    }

    .grid-col {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* Content Cards */
    .content-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .card-header {
      padding: 1.1rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .card-header.space-between {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .card-body {
      padding: 1.25rem;
    }

    /* Metrics Row */
    .info-metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .metric-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .metric-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .metric-value {
      font-size: 1rem;
      font-weight: 700;
      color: #0f172a;
    }
    .amount-highlight {
      font-size: 1.35rem;
      color: #4f46e5;
    }
    .amount-highlight .cur {
      font-size: 0.85rem;
      color: #64748b;
    }

    .note-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-top: 0.75rem;
    }
    .note-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      display: block;
      margin-bottom: 0.25rem;
    }
    .note-content {
      margin: 0;
      font-size: 0.875rem;
      color: #334155;
      font-style: italic;
    }

    .rejection-alert {
      background: #fee2e2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      margin-top: 1rem;
      color: #991b1b;
      font-size: 0.875rem;
    }
    .rejection-reason-text {
      margin: 0.25rem 0 0;
    }

    /* Receipt Section */
    .receipt-preview-box {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .receipt-image-wrap {
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      max-width: 380px;
      cursor: pointer;
    }
    .receipt-thumbnail {
      width: 100%;
      height: auto;
      max-height: 280px;
      object-fit: cover;
      display: block;
      transition: transform 0.2s ease;
    }
    .receipt-image-wrap:hover .receipt-thumbnail {
      transform: scale(1.02);
    }
    .receipt-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
      font-weight: 700;
      font-size: 0.875rem;
    }
    .receipt-image-wrap:hover .receipt-overlay {
      opacity: 1;
    }

    .pdf-receipt-wrap {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      width: 100%;
    }
    .pdf-icon { font-size: 2.5rem; }
    .pdf-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .pdf-name { font-weight: 700; color: #0f172a; }
    .pdf-link { color: #4f46e5; font-size: 0.85rem; font-weight: 600; text-decoration: none; }
    .pdf-link:hover { text-decoration: underline; }

    .no-receipt-box {
      text-align: center;
      padding: 2rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    .no-receipt-icon { font-size: 2.5rem; color: #94a3b8; }
    .no-receipt-text { color: #64748b; font-size: 0.9rem; }

    .upload-receipt-wrapper {
      width: 100%;
      max-width: 360px;
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .upload-dropzone {
      width: 100%;
      position: relative;
    }
    .file-input {
      position: absolute;
      width: 0.1px;
      height: 0.1px;
      opacity: 0;
    }
    .file-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.25rem;
      border: 2px dashed #cbd5e1;
      border-radius: 10px;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
    }
    .file-label:hover {
      border-color: #4f46e5;
      background: #eef2ff;
    }
    .upload-icon { font-size: 1.75rem; margin-bottom: 0.25rem; }
    .upload-prompt { font-size: 0.85rem; font-weight: 700; color: #334155; }
    .upload-hint { font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem; }
    .file-error { color: #ef4444; font-size: 0.8rem; margin-top: 0.5rem; }
    .upload-btn { width: 100%; }

    /* Order details & items table */
    .order-meta-info {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.875rem;
    }
    .order-meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .order-meta-item .label { color: #64748b; }
    .order-meta-item .val { font-weight: 600; color: #0f172a; }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .items-table th {
      background: #f8fafc;
      padding: 0.6rem 0.75rem;
      border-bottom: 1px solid #e2e8f0;
      color: #64748b;
      font-weight: 700;
    }
    .items-table td {
      padding: 0.6rem 0.75rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .items-table tfoot td {
      padding: 0.75rem;
      border-top: 2px solid #e2e8f0;
      font-weight: 800;
    }
    .total-cell-label { color: #475569; }
    .total-cell-val { color: #4f46e5; font-size: 0.95rem; }

    /* Side Column Cards: Customer & Branch info */
    .profile-details-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      font-size: 0.875rem;
    }
    .p-detail-item {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .p-label { color: #64748b; }
    .p-val { font-weight: 600; color: #1e293b; text-align: right; }
    .branch-map-link {
      color: #4f46e5;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .branch-map-link:hover {
      text-decoration: underline;
      color: #4338ca;
    }
    .phone-link { color: #4f46e5; text-decoration: none; }
    .phone-link:hover { text-decoration: underline; }

    /* Timeline */
    .timeline-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      position: relative;
      padding-left: 0.5rem;
    }
    .timeline-step {
      display: flex;
      gap: 1rem;
      position: relative;
    }
    .timeline-step:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 13px;
      top: 28px;
      bottom: -15px;
      width: 2px;
      background: #e2e8f0;
    }
    .timeline-marker {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 800;
      flex-shrink: 0;
      z-index: 1;
      border: 2px solid #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .timeline-step.done .timeline-marker {
      background: #16a34a;
      color: #ffffff;
    }
    .timeline-step.failed .timeline-marker {
      background: #dc2626;
      color: #ffffff;
    }
    .timeline-content {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .timeline-title {
      font-weight: 700;
      font-size: 0.875rem;
      color: #0f172a;
    }
    .timeline-time {
      font-size: 0.75rem;
      color: #64748b;
    }
    .timeline-desc {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0.2rem 0 0;
    }

    /* Zoom image modal */
    .zoom-image-container {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .full-zoom-img {
      max-width: 100%;
      max-height: 85vh;
      border-radius: 10px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .modal-close-corner {
      position: absolute;
      top: -40px;
      right: 0;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: #ffffff;
      font-size: 1.5rem;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
    }
    .modal-close-corner:hover { background: rgba(255, 255, 255, 0.4); }

    /* Confirm/Reject modals */
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
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .modal-title { font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0; }
    .modal-close { background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; }
    .modal-body { padding: 1.5rem; }
    .modal-prompt { font-size: 0.95rem; color: #334155; margin: 0 0 1rem; line-height: 1.5; }
    .summary-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .error-hint { font-size: 0.8rem; color: #ef4444; margin-top: 0.35rem; }
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

    /* Dark Mode */
    :host-context(body.dark-theme) .page-title { color: #f8fafc; }
    :host-context(body.dark-theme) .creation-date { color: #94a3b8; }
    :host-context(body.dark-theme) .content-card,
    :host-context(body.dark-theme) .not-found-card {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .card-header {
      background: #0f172a;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .card-title,
    :host-context(body.dark-theme) .metric-value,
    :host-context(body.dark-theme) .order-meta-item .val,
    :host-context(body.dark-theme) .timeline-title,
    :host-context(body.dark-theme) .p-val {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .note-box,
    :host-context(body.dark-theme) .pdf-receipt-wrap,
    :host-context(body.dark-theme) .items-table th,
    :host-context(body.dark-theme) .items-table tfoot td {
      background: #0b0f19;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .note-content { color: #cbd5e1; }
    :host-context(body.dark-theme) .items-table td {
      border-color: #1e293b;
      color: #cbd5e1;
    }
    :host-context(body.dark-theme) .modal-content {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .modal-header,
    :host-context(body.dark-theme) .modal-footer {
      background: #0f172a;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .modal-title { color: #f8fafc; }
    :host-context(body.dark-theme) .modal-prompt { color: #cbd5e1; }
    :host-context(body.dark-theme) .summary-box {
      background: #0b0f19;
      border-color: #22304d;
    }
  `]
})
export class PaymentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paymentService = inject(PaymentService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);

  public PaymentStatus = PaymentStatus;
  public OrderStatus = OrderStatus;

  paymentId = 0;
  payment: PaymentDetails | null = null;
  isLoading = false;
  isAdminView = false;

  // Modals & Actions
  showImageModal = false;
  showConfirmModal = false;
  showRejectModal = false;
  isActionSubmitting = false;

  rejectionReasonText = '';
  rejectionErrorText = '';

  // Customer Receipt Upload
  selectedFile: File | null = null;
  fileError = '';
  isUploadingReceipt = false;

  ngOnInit(): void {
    // Determine admin or customer view based on current URL or role
    this.isAdminView = this.router.url.startsWith('/admin') || this.authState.isAdminRole();

    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.paymentId = Number(idParam);
        this.loadDetails();
      }
    });
  }

  loadDetails(): void {
    this.isLoading = true;
    this.paymentService.getPaymentById(this.paymentId).subscribe({
      next: (res) => {
        this.payment = res;
        this.isLoading = false;
      },
      error: () => {
        this.payment = null;
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    if (this.isAdminView) {
      this.router.navigate(['/admin/payments']);
    } else {
      this.router.navigate(['/payments']);
    }
  }

  getPaymentMethodText(method?: string): string {
    if (!method) return 'Karta orqali o‘tkazma';
    if (method.toLowerCase().includes('cash')) return 'Naqd to‘lov';
    if (method.toLowerCase().includes('card')) return 'Karta orqali o‘tkazma';
    return method;
  }

  isPdfReceipt(url?: string): boolean {
    if (!url) return false;
    return url.toLowerCase().endsWith('.pdf');
  }

  getFullImageUrl(path?: string): string {
    return this.paymentService.getFullImageUrl(path);
  }

  openImageModal(): void {
    this.showImageModal = true;
  }

  closeImageModal(): void {
    this.showImageModal = false;
  }

  // Admin Confirm
  openConfirmModal(): void {
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
  }

  executeConfirm(): void {
    if (!this.payment) return;
    this.isActionSubmitting = true;

    this.paymentService.confirm(this.payment.id).subscribe({
      next: () => {
        this.isActionSubmitting = false;
        this.closeConfirmModal();
        this.notification.success(`To‘lov #${this.paymentId} muvaffaqiyatli tasdiqlandi.`);
        this.loadDetails();
      },
      error: (err) => {
        this.isActionSubmitting = false;
        this.notification.error(err?.error?.message || err?.message || 'To‘lovni tasdiqlashda xatolik yuz berdi.');
      }
    });
  }

  // Admin Reject
  openRejectModal(): void {
    this.rejectionReasonText = '';
    this.rejectionErrorText = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectionReasonText = '';
    this.rejectionErrorText = '';
  }

  executeReject(): void {
    if (!this.payment) return;

    if (!this.rejectionReasonText || !this.rejectionReasonText.trim()) {
      this.rejectionErrorText = 'Iltimos, rad etish sababini kiriting.';
      return;
    }

    this.isActionSubmitting = true;
    const reason = this.rejectionReasonText.trim();

    this.paymentService.reject(this.payment.id, reason).subscribe({
      next: () => {
        this.isActionSubmitting = false;
        this.closeRejectModal();
        this.notification.success(`To‘lov #${this.paymentId} rad etildi.`);
        this.loadDetails();
      },
      error: (err) => {
        this.isActionSubmitting = false;
        this.notification.error(err?.error?.message || err?.message || 'To‘lovni rad etishda xatolik yuz berdi.');
      }
    });
  }

  // Customer Receipt Upload
  onFileSelected(event: any): void {
    this.fileError = '';
    const file = event.target?.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.fileError = 'Fayl hajmi 5MB dan oshmasligi kerak!';
      this.selectedFile = null;
      return;
    }

    // Validate extension
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    if (!allowed.includes(ext)) {
      this.fileError = 'Faqat .jpg, .jpeg, .png yoki .pdf formatdagi fayllar qabul qilinadi!';
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
  }

  submitCustomerReceipt(): void {
    if (!this.selectedFile || !this.payment) return;
    this.isUploadingReceipt = true;

    this.paymentService.uploadReceipt(this.selectedFile).subscribe({
      next: (chekUrl) => {
        // Now re-submit or link payment with receipt
        this.paymentService.createPayment({
          orderId: this.payment!.orderId,
          userId: this.payment!.customer?.id || this.authState.currentCustomerId() || 0,
          amount: this.payment!.amount,
          paymentMethod: this.payment!.paymentMethod || 'CardTransfer',
          chekUrl: chekUrl,
          transactionNote: this.payment!.transactionNote
        }).subscribe({
          next: () => {
            this.isUploadingReceipt = false;
            this.selectedFile = null;
            this.notification.success('To‘lov cheki muvaffaqiyatli yuklandi!');
            this.loadDetails();
          },
          error: (err) => {
            this.isUploadingReceipt = false;
            this.notification.error(err?.error?.message || 'Chekni saqlashda xatolik yuz berdi.');
          }
        });
      },
      error: (err) => {
        this.isUploadingReceipt = false;
        this.notification.error(err?.error?.message || 'Chek faylini yuklashda xatolik yuz berdi.');
      }
    });
  }
}
