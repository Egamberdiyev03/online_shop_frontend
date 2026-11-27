import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import { Order, OrderItem, OrderStatus, OrderFilter, OrderStatusCounts, OrderPaymentFilter, parseOrderStatus } from '../../../core/models/order.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { Company } from '../../../core/models/company.model';
import { Payment, PaymentStatus, PaymentStatusLabels, PagedResult, parsePaymentStatus } from '../../../core/models/payment.model';
import { Customer } from '../../../core/models/customer.model';
import { OrderService } from '../../../core/services/order.service';
import { CompanyService } from '../../../core/services/company.service';
import { PaymentService } from '../../../core/services/payment.service';
import { CustomerService } from '../../../core/services/customer.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CommentService } from '../../../core/services/comment.service';
import { CurierService } from '../../../core/services/curier.service';
import { MapService, MapLocation, RouteEstimate } from '../../../core/services/map.service';
import { CurierResponseDto, TransportTypeLabels, TransportTypeIcons } from '../../../core/models/curier.model';
import { CreateCommentDto } from '../../../core/models/comment.model';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusChipsComponent } from '../../../shared/components/status-chips/status-chips.component';
import { OrderFiltersComponent } from '../../../shared/components/order-filters/order-filters.component';
import { OrderStepperComponent } from '../../../shared/components/dashboard/order-stepper/order-stepper.component';
import { ImageUrlPipe } from '../../../shared/pipes/image-url.pipe';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule,
    StatusBadgeComponent, 
    LoadingSpinnerComponent, 
    EmptyStateComponent,
    StatusChipsComponent,
    OrderFiltersComponent,
    OrderStepperComponent,
    ImageUrlPipe
  ],
  template: `
    <div class="container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">
            {{ authState.isBranchManager()
                ? 'Filial buyurtmalari'
                : (viewMode === 'my' ? 'Mening buyurtmalarim' : "Kompaniyalar bo'yicha buyurtmalar") }}
          </h1>
          <p class="page-subtitle" *ngIf="authState.isBranchManager() || viewMode !== 'my'">
            {{ authState.isBranchManager()
                ? 'Filial #' + (authState.userBranchId() || '') + ' - buyurtmalar boshqaruvi'
                : 'Tizimdagi filiallar va mijozlarning buyurtmalari boshqaruvi' }}
          </p>
        </div>

        <!-- Mode Toggle if admin/manager - BranchManager uchun yashirin -->
        <div class="mode-toggle" *ngIf="authState.isAdminMode() && !authState.isBranchManager()">
          <button
            class="toggle-btn"
            [class.active]="viewMode === 'my'"
            (click)="setViewMode('my')"
          >
            Mening Buyurtmalarim
          </button>
          <button
            class="toggle-btn"
            [class.active]="viewMode === 'all'"
            (click)="setViewMode('all')"
          >
            Barcha Buyurtmalar
          </button>
        </div>
      </div>

      <!-- Main Tabs for 'my' mode: Faol / Eski -->
      @if (viewMode === 'my') {
        <div class="main-tabs-container">
          <div class="main-tabs">
            <button
              type="button"
              class="main-tab"
              [class.active]="activeTab === 'active'"
              (click)="setActiveTab('active')"
            >
              <span class="tab-icon">🔥</span>
              <span class="tab-label">Faol</span>
              <span class="tab-count">({{ activeOrders.length }})</span>
            </button>
            <button
              type="button"
              class="main-tab"
              [class.active]="activeTab === 'past'"
              (click)="setActiveTab('past')"
            >
              <span class="tab-icon">📦</span>
              <span class="tab-label">Eski</span>
              <span class="tab-count">({{ pastOrders.length }})</span>
            </button>
          </div>
        </div>

        <!-- Sub-filter chips for 'Eski' tab -->
        @if (activeTab === 'past' && pastOrders.length > 0) {
          <div class="past-filter-chips">
            <button
              type="button"
              class="filter-chip"
              [class.active]="pastFilterStatus === 'all'"
              (click)="setPastFilter('all')"
            >
              Hammasi ({{ pastOrders.length }})
            </button>
            <button
              type="button"
              class="filter-chip chip-delivered"
              [class.active]="pastFilterStatus === 'delivered'"
              (click)="setPastFilter('delivered')"
            >
              🎉 Yetkazilgan ({{ deliveredCount }})
            </button>
            <button
              type="button"
              class="filter-chip chip-cancelled"
              [class.active]="pastFilterStatus === 'cancelled'"
              (click)="setPastFilter('cancelled')"
            >
              ✖️ Bekor qilingan ({{ cancelledCount }})
            </button>
          </div>
        }
      } @else {
        <!-- Status Chips for 'all' mode (admin/branch manager) -->
        <app-status-chips
          [selectedStatus]="orderFilter.status ?? null"
          [counts]="statusCounts"
          (statusChange)="onStatusChipSelected($event)"
        ></app-status-chips>
      }

      <!-- Advanced Filters Panel (Search with debounce, branch, date range, payment status, sorting) -->
      <app-order-filters
        [filter]="orderFilter"
        [branches]="availableBranches"
        [companies]="companies"
        [curiers]="filterCuriers"
        [showBranchFilter]="showBranchDropdown"
        [showCompanyFilter]="showCompanyDropdown"
        [showCurierFilter]="viewMode === 'all'"
        (filterChange)="onFilterChanged($event)"
        (reset)="onFilterReset()"
      ></app-order-filters>

      <app-loading-spinner *ngIf="isLoading" message="Buyurtmalar yuklanmoqda..."></app-loading-spinner>

      <!-- Xato holati -->
      <app-empty-state
        *ngIf="!isLoading && hasError"
        icon="⚠️"
        title="Xatolik yuz berdi"
        [description]="errorMessage"
        actionText="Qayta urinish"
        (actionClick)="loadOrders()"
      ></app-empty-state>

      <!-- Bo'sh holat: Agar mijozda umuman buyurtma bo'lmasa -->
      <app-empty-state
        *ngIf="!isLoading && !hasError && allOrders.length === 0"
        icon="🛍️"
        title="Sizda hali buyurtmalar yo'q"
        description="Xarid qilishni boshlash uchun mahsulotlar katalogiga o'ting."
        actionText="Mahsulotlarga o'tish"
        (actionClick)="goToProducts()"
      ></app-empty-state>

      <!-- Bo'sh holat: Faol buyurtmalar yo'q (viewMode === 'my') -->
      @if (!isLoading && !hasError && viewMode === 'my' && activeTab === 'active' && activeOrders.length === 0 && allOrders.length > 0 && !hasActiveMyFilters) {
        <app-empty-state
          icon="✅"
          title="Faol buyurtmalar yo'q"
          description="Hozircha jarayondagi buyurtmalar mavjud emas. Eski buyurtmalarni ko'rish uchun 'Eski' tabini bosing."
          actionText="Eski buyurtmalarni ko'rish"
          (actionClick)="setActiveTab('past')"
        ></app-empty-state>
      }

      @if (!isLoading && !hasError && viewMode === 'my' && activeTab === 'active' && activeOrders.length === 0 && allOrders.length > 0 && hasActiveMyFilters) {
        <app-empty-state
          icon="🔍"
          title="Bu filtr bo'yicha faol buyurtma topilmadi"
          description="Qidiruv yoki filtrlash shartlarini o'zgartiring yoxud 'Eski' tabini tekshiring."
          actionText="Filtrni tozalash"
          (actionClick)="onFilterReset()"
        ></app-empty-state>
      }

      <!-- Bo'sh holat: Eski buyurtmalar yo'q (viewMode === 'my') -->
      @if (!isLoading && !hasError && viewMode === 'my' && activeTab === 'past' && pastOrders.length === 0 && allOrders.length > 0 && !hasActiveMyFilters) {
        <app-empty-state
          icon="📦"
          title="Eski buyurtmalar yo'q"
          description="Yetkazilgan yoki bekor qilingan buyurtmalar hali mavjud emas."
          actionText="Faol buyurtmalarni ko'rish"
          (actionClick)="setActiveTab('active')"
        ></app-empty-state>
      }

      @if (!isLoading && !hasError && viewMode === 'my' && activeTab === 'past' && pastOrders.length === 0 && allOrders.length > 0 && hasActiveMyFilters) {
        <app-empty-state
          icon="🔍"
          title="Bu filtr bo'yicha eski buyurtma topilmadi"
          description="Qidiruv yoki filtrlash shartlarini o'zgartirib ko'ring."
          actionText="Filtrni tozalash"
          (actionClick)="onFilterReset()"
        ></app-empty-state>
      }

      <!-- Bo'sh holat: Filtrlangan eski buyurtmalar yo'q -->
      @if (!isLoading && !hasError && viewMode === 'my' && activeTab === 'past' && pastOrders.length > 0 && filteredPastOrders.length === 0) {
        <app-empty-state
          icon="🔍"
          title="Bu filtr bo'yicha buyurtma topilmadi"
          description="Boshqa filter tanlang."
          actionText="Hammasini ko'rsatish"
          (actionClick)="setPastFilter('all')"
        ></app-empty-state>
      }

      <!-- Bo'sh holat: Agar filtr bo'yicha buyurtma topilmasa (viewMode === 'all') -->
      <app-empty-state
        *ngIf="!isLoading && !hasError && viewMode === 'all' && allOrders.length > 0 && paginatedOrders.length === 0"
        icon="🔍"
        title="Bu filtr bo'yicha buyurtma topilmadi"
        description="Qidiruv yoki filtrlash shartlarini o'zgartirib ko'ring."
        actionText="Filtrni tozalash"
        (actionClick)="onFilterReset()"
      ></app-empty-state>

      <!-- Active Orders (Full cards) - viewMode === 'my' -->
      @if (!isLoading && !hasError && viewMode === 'my' && activeTab === 'active' && displayedActiveOrders.length > 0) {
        <div class="orders-container">
          @for (order of displayedActiveOrders; track order.id) {
            <div
              class="order-card card"
              [attr.id]="'order-card-' + order.id"
              [class.order-highlight]="highlightedOrderId === order.id"
            >
              <div class="order-header">
                <div class="order-id-block">
                  <span class="order-number">Buyurtma #{{ order.id }}</span>
                  <span class="order-date">{{ order.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
                </div>
                <div class="header-right">
                  <a
                    *ngIf="order.companyBranchId && hasBranchCoords(order.companyBranchId)"
                    [routerLink]="['/map']"
                    [queryParams]="{ branch: order.companyBranchId }"
                    class="branch-tag branch-link"
                    title="Xaritada ko'rish"
                    (click)="$event.stopPropagation()"
                  >
                    📍 {{ getBranchName(order.companyBranchId) }}
                  </a>
                  <span
                    *ngIf="order.companyBranchId && !hasBranchCoords(order.companyBranchId)"
                    class="branch-tag branch-no-coords"
                    title="Koordinata kiritilmagan"
                  >
                    📍 {{ getBranchName(order.companyBranchId) }}
                  </span>
                  <app-status-badge [status]="order.status"></app-status-badge>
                </div>
              </div>

              <!-- Order Timeline Progress Stepper -->
              <div class="order-stepper-box">
                <app-order-stepper [currentStatus]="order.status"></app-order-stepper>
              </div>

              <div class="order-delivery-strip" *ngIf="order.deliveryAddress">
                <span>🏠 Yetkazish: <strong>{{ order.deliveryAddress }}</strong></span>
                <span *ngIf="order.deliveryNotes" class="delivery-notes-chip">📝 {{ order.deliveryNotes }}</span>
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
                      <td class="text-right">{{ item.unitPrice | number:'1.0-0' }} so'm</td>
                      <td class="text-right fw-bold">{{ (item.unitPrice * item.quantity) | number:'1.0-0' }} so'm</td>
                    </tr>
                  </tbody>
                </table>
                <div *ngIf="!order.orderItems || order.orderItems.length === 0" class="no-items-note">
                  OrderItem ma'lumotlari mavjud emas.
                </div>
              </div>

              <!-- Order Footer & Actions -->
              <div class="order-footer">
                <div class="total-wrap">
                  <span class="total-label">Jami to'lov:</span>
                  <span class="total-amount">{{ order.totalPrice | number:'1.0-0' }} so'm</span>
                  <div class="payment-badge-wrap">
                    <span
                      class="payment-pill"
                      [style.color]="getOrderPaymentBadge(order).color"
                      [style.background]="getOrderPaymentBadge(order).bg"
                    >
                      💳 {{ getOrderPaymentBadge(order).label }}
                    </span>
                    <span
                      class="rejection-note"
                      *ngIf="isPaymentFailed(orderPayments.get(order.id)) && orderPayments.get(order.id)?.rejectionReason"
                    >
                      Sabab: {{ orderPayments.get(order.id)?.rejectionReason }}
                    </span>
                  </div>
                </div>

                <!-- Kuryer tayinlanishi kutilmoqda -->
                <div class="curier-waiting-note" *ngIf="!order.curier && (order.status === OrderStatus.Pending || order.status === OrderStatus.Confirmed)">
                  🛵 Kuryer tez orada tayinlanadi
                </div>

                <div class="order-actions">
                  <button
                    *ngIf="order.curier"
                    type="button"
                    class="btn btn-secondary btn-sm curier-info-btn"
                    (click)="openCurierInfoModal(order); $event.stopPropagation()"
                    title="Kuryer ma'lumotlarini ko'rish"
                  >
                    {{ getCurierVehicleIcon(order.curier.vehicleType) }} Kuryer
                  </button>
                  <button
                    *ngIf="canCustomerPay(order)"
                    class="btn btn-primary btn-sm pay-btn"
                    (click)="openPayModal(order)"
                  >
                    💳 {{ orderPayments.get(order.id) ? 'Chekni yangilash' : 'Tolov qilish' }}
                  </button>
                  <button
                    *ngIf="canAssignCurier(order)"
                    class="btn btn-primary btn-sm"
                    (click)="openAssignCurierModal(order)"
                  >
                    🛵 Kuryer biriktirish
                  </button>
                  <button
                    *ngIf="canUnassignCurier(order)"
                    class="btn btn-secondary btn-sm"
                    (click)="unassignCurierFromOrder(order)"
                  >
                    ✖ Kuryerni olib tashlash
                  </button>
                  <button
                    *ngIf="canTrackCurier(order)"
                    class="btn btn-primary btn-sm"
                    (click)="openTrackCurierModal(order)"
                  >
                    📍 Kuryerni kuzatish
                  </button>
                  <button
                    *ngIf="orderPayments.get(order.id)?.chekUrl"
                    class="btn btn-secondary btn-sm"
                    (click)="openViewReceiptModal(order)"
                    title="Chek rasmini ko'rish"
                  >
                    🧾 Chekni ko'rish
                  </button>
                  <a
                    *ngIf="orderPayments.get(order.id) as paymentObj"
                    [routerLink]="['/payments', paymentObj.id]"
                    class="btn btn-secondary btn-sm"
                    title="To'lov tafsiloti va chekni ko'rish"
                  >
                    🔎 To'lovni ko'rish
                  </a>
                  <button
                    *ngIf="canCancel(order.status)"
                    class="btn btn-danger btn-sm cancel-btn"
                    [disabled]="actionInProgress.has(order.id)"
                    (click)="openCancelModal(order)"
                  >
                    ✕ Buyurtmani bekor qilish
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Load More for Active Orders -->
        @if (activeOrders.length > displayedActiveCount) {
          <div class="load-more-section">
            <div class="page-info-text">
              {{ displayedActiveCount }} / {{ activeOrders.length }} ta buyurtma
            </div>
            <button type="button" class="btn btn-secondary load-more-btn" (click)="loadMoreActive()">
              @if (activeOrders.length - displayedActiveCount >= ORDERS_PAGE_SIZE) {
                Yana {{ ORDERS_PAGE_SIZE }} ta ko'rsatish
              } @else {
                Yana {{ activeOrders.length - displayedActiveCount }} ta ko'rsatish
              }
            </button>
          </div>
        }
      }

      <!-- Past Orders (Compact expandable rows) - viewMode === 'my' -->
      @if (!isLoading && !hasError && viewMode === 'my' && activeTab === 'past' && displayedPastOrders.length > 0) {
        <div class="past-orders-container">
          @for (order of displayedPastOrders; track order.id) {
            <div
              class="past-order-row"
              [attr.id]="'order-card-' + order.id"
              [class.order-highlight]="highlightedOrderId === order.id"
              [class.expanded]="expandedOrderIds.has(order.id)"
              [class.cancelled]="order.status === OrderStatus.Cancelled || order.status === OrderStatus.DeliveryFailed"
            >
              <!-- Compact Header (Always visible) -->
              <div class="past-order-header" (click)="toggleOrderExpand(order.id)">
                <div class="past-order-main">
                  <span class="past-order-id">#{{ order.id }}</span>
                  <span class="past-order-date">{{ order.createdAt | date:'dd.MM.yyyy' }}</span>
                  <span class="past-order-items">{{ order.orderItems?.length || 0 }} ta mahsulot</span>
                </div>
                <div class="past-order-end">
                  <span class="past-order-total">{{ order.totalPrice | number:'1.0-0' }} so'm</span>
                  <app-status-badge [status]="order.status"></app-status-badge>
                  <button type="button" class="expand-btn" [attr.aria-expanded]="expandedOrderIds.has(order.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Expanded Content -->
              @if (expandedOrderIds.has(order.id)) {
                <div class="past-order-details">
                  <!-- Order Items -->
                  <div class="past-items-list">
                    @for (item of order.orderItems; track item.productId) {
                      <div class="past-item-row">
                        <span class="past-item-name">{{ item.productName || ('Mahsulot #' + item.productId) }}</span>
                        <span class="past-item-qty">{{ item.quantity }} × {{ item.unitPrice | number:'1.0-0' }}</span>
                        <span class="past-item-sum">{{ (item.unitPrice * item.quantity) | number:'1.0-0' }} so'm</span>
                      </div>
                    }
                  </div>

                  <!-- Footer Actions -->
                  <div class="past-order-footer">
                    <div class="payment-badge-wrap">
                      <span
                        class="payment-pill"
                        [style.color]="getOrderPaymentBadge(order).color"
                        [style.background]="getOrderPaymentBadge(order).bg"
                      >
                        💳 {{ getOrderPaymentBadge(order).label }}
                      </span>
                    </div>
                    <div class="past-order-actions">
                      <button
                        *ngIf="order.curier"
                        type="button"
                        class="btn btn-secondary btn-sm curier-info-btn"
                        (click)="openCurierInfoModal(order); $event.stopPropagation()"
                        title="Kuryer ma'lumotlarini ko'rish"
                      >
                        {{ getCurierVehicleIcon(order.curier.vehicleType) }} Kuryer
                      </button>
                      <button
                        *ngIf="canLeaveComment(order)"
                        class="btn btn-success btn-sm comment-btn"
                        (click)="openCommentModal(order); $event.stopPropagation()"
                      >
                        ⭐ Sharh qoldirish
                      </button>
                      <a
                        *ngIf="orderPayments.get(order.id) as paymentObj"
                        [routerLink]="['/payments', paymentObj.id]"
                        class="btn btn-secondary btn-sm"
                        (click)="$event.stopPropagation()"
                      >
                        🔎 To'lovni ko'rish
                      </a>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Load More for Past Orders -->
        @if (filteredPastOrders.length > displayedPastCount) {
          <div class="load-more-section">
            <div class="page-info-text">
              {{ displayedPastCount }} / {{ filteredPastOrders.length }} ta buyurtma
            </div>
            <button type="button" class="btn btn-secondary load-more-btn" (click)="loadMorePast()">
              @if (filteredPastOrders.length - displayedPastCount >= ORDERS_PAGE_SIZE) {
                Yana {{ ORDERS_PAGE_SIZE }} ta ko'rsatish
              } @else {
                Yana {{ filteredPastOrders.length - displayedPastCount }} ta ko'rsatish
              }
            </button>
          </div>
        }
      }

      <!-- Orders List for 'all' mode (Admin/BranchManager) -->
      <div class="orders-container" *ngIf="!isLoading && !hasError && viewMode === 'all' && paginatedOrders.length > 0">
        <div
          class="order-card card"
          *ngFor="let order of paginatedOrders"
          [attr.id]="'order-card-' + order.id"
          [class.order-highlight]="highlightedOrderId === order.id"
          [class.order-mismatch-card]="hasPaymentMismatch(order)"
        >
          <div class="order-header">
            <div class="order-id-block">
              <span class="order-number">Buyurtma #{{ order.id }}</span>
              <span class="order-date">{{ order.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
            </div>

            <div class="header-right">
              <span class="customer-tag" *ngIf="viewMode === 'all'" title="Mijoz">
                👤 {{ getCustomerDisplayName(order) }}
              </span>
              <a
                *ngIf="order.companyBranchId && hasBranchCoords(order.companyBranchId)"
                [routerLink]="['/map']"
                [queryParams]="{ branch: order.companyBranchId }"
                class="branch-tag branch-link"
                title="Xaritada ko‘rish"
                (click)="$event.stopPropagation()"
              >
                📍 {{ getBranchName(order.companyBranchId) }}
              </a>
              <span
                *ngIf="order.companyBranchId && !hasBranchCoords(order.companyBranchId)"
                class="branch-tag branch-no-coords"
                title="Koordinata kiritilmagan"
              >
                📍 {{ getBranchName(order.companyBranchId) }}
              </span>
              <app-status-badge [status]="order.status"></app-status-badge>
            </div>
          </div>

          <!-- Order Timeline Progress Stepper -->
          <div class="order-stepper-box">
            <app-order-stepper [currentStatus]="order.status"></app-order-stepper>
          </div>

          <div class="order-delivery-strip" *ngIf="order.deliveryAddress">
            <span>🏠 Yetkazish: <strong>{{ order.deliveryAddress }}</strong></span>
            <span *ngIf="order.deliveryNotes" class="delivery-notes-chip">📝 {{ order.deliveryNotes }}</span>
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
                  <td class="text-right">{{ item.unitPrice | number:'1.0-0' }} so'm</td>
                  <td class="text-right fw-bold">{{ (item.unitPrice * item.quantity) | number:'1.0-0' }} so'm</td>
                </tr>
              </tbody>
            </table>

            <div *ngIf="!order.orderItems || order.orderItems.length === 0" class="no-items-note">
              OrderItem ma'lumotlari mavjud emas.
            </div>
          </div>

          <!-- Order Footer & Actions -->
          <div class="order-footer">
            <!-- Payment vs Status mismatch warning -->
            <div class="payment-mismatch-warning" *ngIf="getPaymentMismatchMessage(order) as mismatchMsg" role="alert">
              <span class="mismatch-icon">⚠️</span>
              <span class="mismatch-text">{{ mismatchMsg }}</span>
            </div>

            <div class="total-wrap">
              <span class="total-label">Jami to'lov:</span>
              <span class="total-amount">{{ order.totalPrice | number:'1.0-0' }} so'm</span>

              <!-- To'lov statusi ko'rinishi -->
              <div class="payment-badge-wrap">
                <span 
                  class="payment-pill" 
                  [style.color]="getOrderPaymentBadge(order).color" 
                  [style.background]="getOrderPaymentBadge(order).bg"
                >
                  💳 {{ getOrderPaymentBadge(order).label }}
                </span>
                <span
                  class="mismatch-pill"
                  *ngIf="hasPaymentMismatch(order)"
                  [title]="getPaymentMismatchMessage(order) || ''"
                >
                  ⚠️ Nomuvofiqlik
                </span>
                <span 
                  class="rejection-note" 
                  *ngIf="isPaymentFailed(orderPayments.get(order.id)) && orderPayments.get(order.id)?.rejectionReason"
                >
                  Sabab: {{ orderPayments.get(order.id)?.rejectionReason }}
                </span>
              </div>
            </div>

            <!-- Kuryer tayinlanishi kutilmoqda -->
            <div class="curier-waiting-note" *ngIf="!order.curier && (order.status === OrderStatus.Pending || order.status === OrderStatus.Confirmed)">
              🛵 Kuryer tez orada tayinlanadi
            </div>

            <div class="order-actions">
              <button
                *ngIf="order.curier"
                type="button"
                class="btn btn-secondary btn-sm curier-info-btn"
                (click)="openCurierInfoModal(order); $event.stopPropagation()"
                title="Kuryer ma'lumotlarini ko'rish"
              >
                {{ getCurierVehicleIcon(order.curier.vehicleType) }} Kuryer
              </button>

              <!-- Admin/Branch staff: Kuryer biriktirish / almashtirish / olib tashlash (faqat olinmagan bo'lsa) -->
              <button
                *ngIf="canAssignCurier(order)"
                type="button"
                class="btn btn-primary btn-sm"
                [disabled]="actionInProgress.has(order.id)"
                (click)="openAssignCurierModal(order)"
              >
                🛵 Kuryer biriktirish
              </button>
              <button
                *ngIf="canReassignCurier(order)"
                type="button"
                class="btn btn-primary btn-sm"
                [disabled]="actionInProgress.has(order.id)"
                (click)="openAssignCurierModal(order)"
              >
                🔄 Kuryerni almashtirish
              </button>
              <button
                *ngIf="canUnassignCurier(order)"
                type="button"
                class="btn btn-secondary btn-sm"
                [disabled]="actionInProgress.has(order.id)"
                (click)="unassignCurierFromOrder(order)"
              >
                ✖ Kuryerni olib tashlash
              </button>
              <button
                *ngIf="canTrackCurier(order)"
                type="button"
                class="btn btn-primary btn-sm"
                (click)="openTrackCurierModal(order)"
              >
                📍 Kuryerni kuzatish
              </button>

              <!-- View Receipt Button (Chek rasmi bo'lsa barchaga ko'rinadi) -->
              <button
                *ngIf="orderPayments.get(order.id)?.chekUrl"
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="openViewReceiptModal(order)"
                title="Chek rasmini ko'rish"
              >
                🧾 Chekni ko‘rish
              </button>

              <!-- To'lovni ko'rish (Payment details link) -->
              <a
                *ngIf="orderPayments.get(order.id) as paymentObj"
                [routerLink]="(authState.isAdminMode() || authState.isAdminRole()) ? ['/admin/payments', paymentObj.id] : ['/payments', paymentObj.id]"
                class="btn btn-secondary btn-sm"
                title="To‘lov tafsiloti va chekni ko‘rish"
              >
                🔎 To‘lovni ko‘rish
              </a>

              <!-- Admin/BranchManager: To'lovni ko'rish/tekshirish (faqat Shipped dan oldin) -->
              <button
                *ngIf="canAdminReviewPayment(order)"
                type="button"
                class="btn btn-sm"
                [ngClass]="getAdminPaymentBtnClass(order)"
                [disabled]="actionInProgress.has(order.id)"
                (click)="openAdminPaymentModal(order)"
              >
                {{ getAdminPaymentBtnLabel(order) }}
              </button>

              <!-- Bekor qilish (Shipped va undan keyin ko'rsatilmaydi; sabab oynasi bilan) -->
              <button
                *ngIf="canStaffCancel(order)"
                type="button"
                class="btn btn-danger btn-sm cancel-btn"
                [disabled]="actionInProgress.has(order.id)"
                (click)="openCancelModal(order)"
              >
                ✕ Bekor qilish
              </button>
            </div>
          </div>

          <!-- SuperAdmin uchun alohida kichik "Qo'lda o'zgartirish" menyusi (asosiy qatorda emas) -->
          <div class="superadmin-override-bar" *ngIf="authState.isSuperAdmin() && canSuperAdminOverride(order)">
            <div class="superadmin-bar-top">
              <button
                type="button"
                class="override-toggle-btn"
                [class.active]="overrideMenuOrderId === order.id"
                [disabled]="actionInProgress.has(order.id)"
                (click)="toggleOverrideMenu(order); $event.stopPropagation()"
                title="Statusni qo'lda o'zgartirish (SuperAdmin)"
              >
                <span>⚙️ Qo'lda o'zgartirish</span>
                <span class="override-chevron">{{ overrideMenuOrderId === order.id ? '▲' : '▼' }}</span>
              </button>
            </div>

            @if (overrideMenuOrderId === order.id) {
              <div class="override-panel" (click)="$event.stopPropagation()">
                <div class="override-panel-grid">
                  <div class="override-field">
                    <label class="form-sub-label" [attr.for]="'override-status-' + order.id">Yangi status *</label>
                    <select
                      [attr.id]="'override-status-' + order.id"
                      class="form-control form-control-sm"
                      [(ngModel)]="overrideNewStatus"
                      (ngModelChange)="overrideError = false"
                    >
                      <option [ngValue]="null" disabled>Statusni tanlang...</option>
                      <option
                        *ngFor="let st of overrideStatusOptions"
                        [ngValue]="st"
                        [disabled]="parseStatus(order.status) === st"
                      >
                        {{ getStatusLabel(st) }}{{ parseStatus(order.status) === st ? ' (joriy)' : '' }}
                      </option>
                    </select>
                  </div>

                  <div class="override-field override-reason-field">
                    <label class="form-sub-label" [attr.for]="'override-reason-' + order.id">Sabab (majburiy) *</label>
                    <textarea
                      [attr.id]="'override-reason-' + order.id"
                      class="form-control form-control-sm"
                      [(ngModel)]="overrideReason"
                      rows="2"
                      placeholder="Qo'lda o'zgartirish sababini yozing..."
                      [class.is-invalid]="overrideError && !overrideReason.trim()"
                      (input)="overrideError = false"
                    ></textarea>
                    <div class="text-danger error-hint" *ngIf="overrideError && (overrideNewStatus === null || overrideNewStatus === undefined || !overrideReason.trim())">
                      {{ (overrideNewStatus === null || overrideNewStatus === undefined) ? 'Yangi statusni tanlang!' : "Qo'lda o'zgartirish sababini kiriting!" }}
                    </div>
                  </div>
                </div>

                <div class="override-panel-actions">
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    [disabled]="actionInProgress.has(order.id)"
                    (click)="closeOverrideMenu()"
                  >
                    Bekor
                  </button>
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    [disabled]="actionInProgress.has(order.id)"
                    (click)="submitOverrideStatus(order)"
                  >
                    {{ actionInProgress.has(order.id) ? 'Saqlanmoqda...' : 'Saqlash' }}
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Pagination (server-side for 'my' mode) -->
      <div class="pagination-bar" *ngIf="!isLoading && !hasError && viewMode === 'my' && totalPages > 1">
        <div class="pagination-info">
          Jami <strong>{{ totalItems }}</strong> ta buyurtma
        </div>

        <div class="pagination-controls">
          <button
            class="page-btn nav-btn"
            [disabled]="!hasPreviousPage"
            (click)="prevPage()"
            aria-label="Oldingi sahifa"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          <button
            *ngIf="visiblePages[0] > 1"
            class="page-btn"
            (click)="goToPage(1)"
          >1</button>
          <span *ngIf="visiblePages[0] > 2" class="page-dots">...</span>

          <button
            *ngFor="let p of visiblePages"
            class="page-btn"
            [class.active]="p === currentPage"
            (click)="goToPage(p)"
          >{{ p }}</button>

          <span *ngIf="visiblePages[visiblePages.length - 1] < totalPages - 1" class="page-dots">...</span>
          <button
            *ngIf="visiblePages[visiblePages.length - 1] < totalPages"
            class="page-btn"
            (click)="goToPage(totalPages)"
          >{{ totalPages }}</button>

          <button
            class="page-btn nav-btn"
            [disabled]="!hasNextPage"
            (click)="nextPage()"
            aria-label="Keyingi sahifa"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        <div class="page-size-picker">
          <span class="size-label">Sahifada:</span>
          <select [value]="pageSize" (change)="onPageSizeChange(+$any($event.target).value)">
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      <!-- Load More (client-side for 'all' mode) -->
      <div class="load-more-section" *ngIf="!isLoading && !hasError && viewMode === 'all' && filteredOrders.length > displayedCount">
        <div class="page-info-text">
          {{ Math.min(displayedCount, filteredOrders.length) }} / {{ filteredOrders.length }} ta buyurtma ko'rsatilmoqda
        </div>
        <div class="load-more-actions">
          <button
            type="button"
            class="btn btn-secondary load-more-btn"
            (click)="loadMore()"
          >
            Yana yuklash ({{ Math.min(orderFilter.pageSize || 5, filteredOrders.length - displayedCount) }} ta)
          </button>
        </div>
      </div>

      <!-- Customer: Pay & Upload Receipt Modal -->
      <div class="modal-overlay" *ngIf="showPayModal" (click)="closePayModal()">
        <div class="modal-content pay-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">💳 To‘lov qilish (#{{ currentOrderForPay?.id }}-buyurtma)</h3>
            <button class="modal-close" (click)="closePayModal()">&times;</button>
          </div>

          <div class="modal-body" *ngIf="currentOrderForPay">
            <!-- Payment Method Selector -->
            <div class="form-group-compact" style="margin-bottom: 12px;">
              <label class="form-sub-label">To‘lov usulini tanlang *</label>
              <div class="payment-method-radios" style="display: flex; gap: 10px;">
                <label class="radio-option" style="flex: 1;">
                  <input type="radio" name="customerPayMethod" [(ngModel)]="customerPaymentMethod" value="CardTransfer" />
                  <span>💳 Karta orqali</span>
                </label>
                <label class="radio-option" style="flex: 1;">
                  <input type="radio" name="customerPayMethod" [(ngModel)]="customerPaymentMethod" value="Cash" />
                  <span>💵 Naqd (Kuryerga)</span>
                </label>
              </div>
            </div>

            <ng-container *ngIf="customerPaymentMethod === 'CardTransfer'">
              <!-- Compact Bank Card Box -->
              <div class="compact-card-box">
                <div class="card-top-row">
                  <span class="card-brand-badge">💳 HUMO / UZCARD</span>
                  <span class="card-brand-sub">Rasmiy to‘lov kartasi</span>
                </div>
                <div class="card-num-row">
                  <span class="card-num-text">9860 3501 2345 6789</span>
                  <button type="button" class="copy-pill-btn" (click)="copyCardNumber('9860350123456789')" title="Nusxa olish">
                    📋 Nusxa
                  </button>
                </div>
                <div class="card-holder-text">
                  OnlineShop Rasmiy Hisobi (Asadbek E.)
                </div>
              </div>

              <!-- Pay Amount & Concise Guide -->
              <div class="pay-summary-strip">
                <div class="amount-side">
                  <span class="label">To‘lanadigan summa:</span>
                  <span class="val">{{ currentOrderForPay.totalPrice | number:'1.0-0' }} so‘m</span>
                </div>
                <div class="guide-side">
                  <span>💡 Karta raqamiga to‘lov qilib, chek skrinshotini yuklang.</span>
                </div>
              </div>

              <!-- File Upload -->
              <div class="form-group-compact">
                <label class="form-sub-label">To‘lov cheki rasmi (skrinshot / PDF) *</label>
                <div 
                  class="file-drop-area-compact" 
                  (click)="fileInput.click()"
                  (dragover)="$event.preventDefault()"
                  (drop)="onFileDrop($event)"
                >
                  <input
                    #fileInput
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    (change)="onFileSelected($event)"
                    style="display: none"
                  />

                  <div class="drop-empty" *ngIf="!selectedFilePreview && !selectedReceiptFile">
                    <span class="drop-icon">📎</span>
                    <div class="drop-texts">
                      <strong>Chek faylini tanlash uchun bosing</strong>
                      <small>(JPG, JPEG, PNG, PDF, maks 5 MB)</small>
                    </div>
                  </div>

                  <div class="drop-filled" *ngIf="selectedFilePreview || selectedReceiptFile">
                    <img *ngIf="selectedFilePreview && !selectedReceiptFile?.name?.toLowerCase()?.endsWith('.pdf')" [src]="selectedFilePreview" alt="Chek rasmi" class="receipt-thumb" />
                    <span *ngIf="selectedReceiptFile?.name?.toLowerCase()?.endsWith('.pdf')" style="font-size: 1.75rem;">📄</span>
                    <div class="filled-info">
                      <span class="file-name">{{ selectedReceiptFile?.name || 'Chek rasmi yuklangan' }}</span>
                      <span class="file-size" *ngIf="selectedReceiptFile">({{ (selectedReceiptFile.size / 1024).toFixed(0) }} KB)</span>
                      <span class="change-action">🔄 O‘zgartirish uchun bosing</span>
                    </div>
                    <button type="button" class="btn-remove-file" (click)="removeSelectedFile($event)" title="O‘chirish">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </ng-container>

            <div class="cash-info-banner" *ngIf="customerPaymentMethod === 'Cash'" style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; margin-bottom: 12px; color: #065f46;">
              <strong>💵 Pulni kuryerga topshirasiz</strong>
              <p style="margin: 4px 0 0; font-size: 0.85rem;">
                To‘lanadigan summa: <strong>{{ currentOrderForPay.totalPrice | number:'1.0-0' }} so‘m</strong>. Chek yuklash talab qilinmaydi.
              </p>
            </div>

            <!-- Transaction Note -->
            <div class="form-group-compact">
              <label class="form-sub-label">Qo‘shimcha izoh (ixtiyoriy)</label>
              <input
                type="text"
                class="form-control form-control-sm"
                [(ngModel)]="payTransactionNote"
                [placeholder]="customerPaymentMethod === 'Cash' ? 'Masalan: Qaytim tayyorlab keling' : 'Masalan: 9860 **** 1234 dan Aliyev V.'"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" (click)="closePayModal()" [disabled]="isSubmittingPay">
              Bekor qilish
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm submit-pay-btn"
              [disabled]="isSubmittingPay || (customerPaymentMethod === 'CardTransfer' && !selectedReceiptFile && !currentOrderExistingChekUrl)"
              (click)="submitPaymentReceipt()"
            >
              <span *ngIf="isSubmittingPay" class="btn-spinner"></span>
              {{ isSubmittingPay ? 'Yuborilmoqda...' : (customerPaymentMethod === 'Cash' ? 'Naqd to‘lovni tasdiqlash' : 'To‘lov chekini yuborish') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Admin / BranchManager: Review & Confirm/Reject Payment Modal -->
      <div class="modal-overlay" *ngIf="showAdminPaymentModal" (click)="closeAdminPaymentModal()">
        <div class="modal-content admin-pay-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">🧾 To‘lovni tekshirish (#{{ adminReviewOrder?.id }}-buyurtma)</h3>
            <button class="modal-close" (click)="closeAdminPaymentModal()">&times;</button>
          </div>

          <div class="modal-body" *ngIf="adminReviewOrder">
            <!-- Review Summary -->
            <div class="admin-review-summary">
              <div class="summary-line">
                <span class="label">Mijoz:</span>
                <strong class="text-dark">👤 {{ getCustomerFullName(adminReviewOrder) }}</strong>
              </div>
              <div class="summary-line" *ngIf="getCustomerPhone(adminReviewOrder)">
                <span class="label">Telefon raqami:</span>
                <strong>📞 {{ getCustomerPhone(adminReviewOrder) }}</strong>
              </div>
              <div class="summary-line">
                <span class="label">Jami summa:</span>
                <strong class="total-highlight">{{ adminReviewOrder.totalPrice | number:'1.0-0' }} so‘m</strong>
              </div>
              <div class="summary-line">
                <span class="label">To‘lov holati:</span>
                <span 
                  *ngIf="adminReviewPayment" 
                  class="payment-pill" 
                  [style.color]="getPaymentBadge(adminReviewPayment.status).color" 
                  [style.background]="getPaymentBadge(adminReviewPayment.status).bg"
                >
                  {{ getPaymentBadge(adminReviewPayment.status).label }}
                </span>
                <span *ngIf="!adminReviewPayment" class="payment-pill unpaid-pill">
                  ⚠️ Hali chek yuklanmagan
                </span>
              </div>
              <div class="summary-line" *ngIf="adminReviewPayment?.paymentMethod">
                <span class="label">To‘lov usuli:</span>
                <span>{{ adminReviewPayment?.paymentMethod }}</span>
              </div>
              <div class="summary-line" *ngIf="adminReviewPayment?.transactionNote">
                <span class="label">Mijoz izohi:</span>
                <span class="note-text">{{ adminReviewPayment?.transactionNote }}</span>
              </div>
              <div class="summary-line" *ngIf="adminReviewPayment">
                <span class="label">Chek yuborilgan vaqt:</span>
                <span class="fw-bold">🕒 {{ formatPaymentDate(adminReviewPayment.createdAt, adminReviewOrder.createdAt) }}</span>
              </div>
              <div class="summary-line" *ngIf="adminReviewPayment?.confirmedAt">
                <span class="label">Tasdiqlangan vaqt:</span>
                <span>{{ formatPaymentDate(adminReviewPayment!.confirmedAt!) }} (Admin #{{ adminReviewPayment?.confirmedByUserId }})</span>
              </div>
              <div class="summary-line" *ngIf="adminReviewPayment?.rejectionReason">
                <span class="label text-danger">Rad etish sababi:</span>
                <span class="text-danger fw-bold">{{ adminReviewPayment?.rejectionReason }}</span>
              </div>
            </div>

            <!-- Case 1: Receipt Image Available -->
            <div class="receipt-section" *ngIf="adminReviewPayment?.chekUrl">
              <label class="form-sub-label">Yuklangan to‘lov cheki:</label>
              <div class="receipt-preview-card" (click)="openViewReceiptModal(adminReviewOrder)" title="Kattalashtirish">
                <img
                  [src]="paymentService.getFullImageUrl(adminReviewPayment?.chekUrl)"
                  alt="Chek rasmi"
                  class="admin-thumb-img"
                />
                <div class="receipt-overlay">
                  <span>🔍 Kattalashtirib ko‘rish</span>
                </div>
              </div>
              <div class="receipt-quick-actions">
                <button 
                  type="button" 
                  class="btn btn-secondary btn-sm"
                  (click)="openViewReceiptModal(adminReviewOrder)"
                >
                  🔍 Chekni to‘liq ko‘rish
                </button>
                <a 
                  [href]="paymentService.getFullImageUrl(adminReviewPayment?.chekUrl)" 
                  target="_blank" 
                  class="btn btn-secondary btn-sm"
                >
                  ↗ Yangi oynada ochish
                </a>
              </div>
            </div>

            <!-- Case 2: No Receipt yet but Order Pending (Manual Cash/Terminal confirmation at branch) -->
            <div class="manual-payment-box" *ngIf="!adminReviewPayment && isOrderPending(adminReviewOrder)">
              <div class="manual-pay-title">
                <span>💵 Filialda to‘lovni qabul qilish</span>
              </div>
              <p class="manual-pay-desc">
                Agar mijoz filialda naqd pul yoki terminal orqali to‘lagan bo‘lsa, usulni tanlab to‘lovni tasdiqlashingiz mumkin:
              </p>
              <div class="method-selector">
                <label class="radio-option">
                  <input type="radio" [(ngModel)]="adminPaymentMethod" value="Cash" />
                  <span>💵 Naqd pul</span>
                </label>
                <label class="radio-option">
                  <input type="radio" [(ngModel)]="adminPaymentMethod" value="CardTransfer" />
                  <span>💳 Terminal / Bank kartasi</span>
                </label>
              </div>
              <div class="form-group-compact mt-2">
                <label class="form-sub-label">Kassa izohi (ixtiyoriy)</label>
                <input
                  type="text"
                  class="form-control form-control-sm"
                  [(ngModel)]="adminPaymentNote"
                  placeholder="Masalan: Kassa #1 ga qabul qilindi"
                />
              </div>
            </div>

            <!-- Rejection Reason Input (shown only if rejecting) -->
            <div class="reject-box" *ngIf="showRejectReasonInput" id="adminRejectBox">
              <label class="form-sub-label text-danger fw-bold">⚠️ Rad etish sababini kiriting (majburiy):</label>
              <p style="font-size: 0.8rem; color: #b91c1c; margin: 4px 0 8px;">
                Diqqat: To'lov rad etilsa, buyurtma avtomatik bekor qilinadi va mahsulotlar omborga qaytariladi.
              </p>
              <textarea
                id="adminRejectReasonInput"
                class="form-control reject-textarea"
                [class.is-invalid]="rejectReasonHasError && !adminRejectReason.trim()"
                rows="2"
                [(ngModel)]="adminRejectReason"
                placeholder="Masalan: Chek yaroqsiz, summa to‘liq tushmagan yoki boshqa sabab..."
                (input)="rejectReasonHasError = false"
              ></textarea>
              <div class="text-danger error-hint" *ngIf="rejectReasonHasError && !adminRejectReason.trim()">
                Iltimos, rad etish sababini yozing!
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" (click)="closeAdminPaymentModal()" [disabled]="isAdminProcessingPayment">
              Yopish
            </button>

            <!-- Case A: CardTransfer Payment Pending -> Reject or Approve (Cash uchun yashirin) -->
            <ng-container *ngIf="adminReviewPayment && isPaymentPending(adminReviewPayment) && adminReviewPayment.paymentMethod !== 'Cash'">
              <button
                *ngIf="!showRejectReasonInput"
                type="button"
                class="btn btn-danger btn-sm"
                (click)="startRejectMode()"
                [disabled]="isAdminProcessingPayment"
              >
                ❌ Rad etish
              </button>
              <button
                *ngIf="showRejectReasonInput"
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="cancelRejectMode()"
                [disabled]="isAdminProcessingPayment"
              >
                Bekor qilish
              </button>
              <button
                *ngIf="showRejectReasonInput"
                type="button"
                class="btn btn-danger btn-sm"
                (click)="confirmRejectPayment()"
                [disabled]="isAdminProcessingPayment"
              >
                <span *ngIf="isAdminProcessingPayment" class="btn-spinner"></span>
                {{ isAdminProcessingPayment ? 'Bajarilmoqda...' : 'Rad etishni tasdiqlash' }}
              </button>
              <button
                *ngIf="!showRejectReasonInput"
                type="button"
                class="btn btn-success btn-sm"
                (click)="confirmApprovePayment()"
                [disabled]="isAdminProcessingPayment"
              >
                {{ isAdminProcessingPayment ? 'Tasdiqlanmoqda...' : '✅ To‘lovni tasdiqlash' }}
              </button>
            </ng-container>

            <!-- Case B: No payment record yet -> Direct cash confirmation -->
            <ng-container *ngIf="!adminReviewPayment && isOrderPending(adminReviewOrder)">
              <button
                type="button"
                class="btn btn-success btn-sm"
                (click)="confirmCashOrDirectPayment()"
                [disabled]="isAdminProcessingPayment"
              >
                {{ isAdminProcessingPayment ? 'Tasdiqlanmoqda...' : '✅ To‘lovni qabul qilib tasdiqlash' }}
              </button>
            </ng-container>
          </div>
        </div>
      </div>

      <!-- Assign / Reassign Curier Modal (Admin / BranchManager) -->
      <div class="modal-overlay" *ngIf="showAssignCurierModal" (click)="closeAssignCurierModal()">
        <div class="modal-content" (click)="$event.stopPropagation()" style="max-width: 460px;">
          <div class="modal-header">
            <h3 class="modal-title">
              {{ orderForAssignCurier?.curierProfileId ? '🔄 Kuryerni almashtirish' : '🛵 Kuryer biriktirish' }} (#{{ orderForAssignCurier?.id }})
            </h3>
            <button class="modal-close" (click)="closeAssignCurierModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p *ngIf="isLoadingCuriers" style="text-align: center; color: #64748b;">Faol va online kuryerlar yuklanmoqda...</p>

            <div *ngIf="!isLoadingCuriers && availableCuriers.length === 0" style="padding: 16px; background: #fef3c7; border-radius: 8px; color: #92400e;">
              Hozircha faol va online kuryerlar mavjud emas.
            </div>

            <div *ngIf="!isLoadingCuriers && availableCuriers.length > 0" class="curier-select-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto;">
              <label
                *ngFor="let c of availableCuriers"
                class="radio-option"
                style="display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;"
              >
                <input
                  type="radio"
                  name="selectedCurier"
                  [value]="c.id"
                  [(ngModel)]="selectedCurierId"
                  [disabled]="orderForAssignCurier?.curierProfileId === c.id"
                />
                <span style="font-size: 1.25rem;">{{ getCurierVehicleIcon(c.vehicleType) }}</span>
                <div style="flex: 1;">
                  <div style="font-weight: 600;">
                    {{ c.name }}
                    <span *ngIf="orderForAssignCurier?.curierProfileId === c.id" style="font-size: 0.72rem; color: #64748b; font-weight: 500;">(hozirgi)</span>
                  </div>
                  <div style="font-size: 0.8rem; color: #64748b;">{{ getCurierVehicleLabel(c.vehicleType) }} • {{ c.phoneNumber }}</div>
                </div>
                <span style="font-size: 0.75rem; background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 99px;">Online</span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" (click)="closeAssignCurierModal()" [disabled]="isAssigningCurier">
              Bekor qilish
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              (click)="confirmAssignCurier()"
              [disabled]="isAssigningCurier || !selectedCurierId || !!(orderForAssignCurier && actionInProgress.has(orderForAssignCurier.id)) || (orderForAssignCurier?.curierProfileId === selectedCurierId)"
            >
              {{ isAssigningCurier ? 'Saqlanmoqda...' : (orderForAssignCurier?.curierProfileId ? 'Almashtirish' : 'Biriktirish') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Curier Info Modal -->
      <div class="modal-overlay" *ngIf="showCurierInfoModal && curierInfoOrder?.curier as curier" (click)="closeCurierInfoModal()">
        <div class="modal-content curier-info-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">🛵 Kuryer ma'lumotlari (#{{ curierInfoOrder?.id }})</h3>
            <button type="button" class="modal-close" (click)="closeCurierInfoModal()" aria-label="Yopish">&times;</button>
          </div>
          <div class="modal-body">
            <div class="curier-modal-profile">
              <div class="curier-modal-avatar-wrap">
                <img
                  *ngIf="hasValidCurierPhoto(curier.profilePictureUrl) && !failedCurierAvatarIds.has(curier.id)"
                  [src]="curier.profilePictureUrl | imageUrl"
                  (error)="onCurierAvatarError(curier.id)"
                  [alt]="curier.name"
                  class="curier-modal-avatar"
                />
                <span
                  *ngIf="!hasValidCurierPhoto(curier.profilePictureUrl) || failedCurierAvatarIds.has(curier.id)"
                  class="curier-modal-initials"
                >
                  {{ getCurierInitials(curier.name) }}
                </span>
              </div>
              <div class="curier-modal-details">
                <div class="curier-modal-name">{{ curier.name }}</div>
                <div class="curier-modal-vehicle">
                  <span>{{ getCurierVehicleIcon(curier.vehicleType) }}</span>
                  <span>{{ getCurierVehicleLabel(curier.vehicleType) }}</span>
                </div>
                <a
                  *ngIf="curier.phoneNumber"
                  [href]="'tel:' + curier.phoneNumber"
                  class="btn btn-secondary btn-sm curier-modal-phone"
                >
                  📞 {{ curier.phoneNumber }}
                </a>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button
              *ngIf="curierInfoOrder && canTrackCurier(curierInfoOrder)"
              type="button"
              class="btn btn-primary btn-sm"
              (click)="openTrackFromCurierModal()"
            >
              📍 Jonli kuzatish
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="closeCurierInfoModal()">
              Yopish
            </button>
          </div>
        </div>
      </div>

      <!-- Track Curier Live Map Modal (Admin only) -->
      <div class="modal-overlay" *ngIf="showTrackCurierModal" (click)="closeTrackCurierModal()">
        <div class="modal-content track-curier-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">📍 Buyurtma #{{ trackingOrder?.id }} — Jonli kuzatuv</h3>
            <button class="modal-close" (click)="closeTrackCurierModal()">&times;</button>
          </div>
          <div class="modal-body">
            <!-- Curier summary bar -->
            <div *ngIf="trackedCurier" class="track-curier-card">
              <div class="track-curier-identity">
                <span class="track-curier-icon">{{ getCurierVehicleIcon(trackedCurier.vehicleType) }}</span>
                <div>
                  <div class="track-curier-name">{{ trackedCurier.name }}</div>
                  <div class="track-curier-meta">
                    {{ getCurierVehicleLabel(trackedCurier.vehicleType) }} ·
                    <span [style.color]="trackedCurier.isOnline ? '#16a34a' : '#64748b'">
                      {{ trackedCurier.isOnline ? '🟢 Online' : '⚫ Offline' }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="track-curier-actions">
                <a *ngIf="trackedCurier.phoneNumber" [href]="'tel:' + trackedCurier.phoneNumber" class="btn btn-secondary btn-sm">
                  📞 {{ trackedCurier.phoneNumber }}
                </a>
                <button type="button" class="btn btn-secondary btn-sm" (click)="refreshTrackedCurier()" [disabled]="isLoadingTrack" title="Yangilash">
                  🔄
                </button>
              </div>
            </div>

            <!-- ETA & Route Summary Card -->
            <div *ngIf="trackEstimate || trackingOrder?.deliveryAddress" class="track-eta-card">
              <div class="track-eta-top" *ngIf="trackEstimate">
                <div class="track-eta-main">
                  <span class="track-eta-badge">⏱️ Taxminiy vaqt: <strong>{{ trackEstimate.minMinutes }}–{{ trackEstimate.maxMinutes }} daqiqa</strong></span>
                  <span class="track-eta-dist">📏 {{ trackEstimate.distanceKm }} km</span>
                </div>
                <span class="track-eta-sub">{{ trackLegLabel }} · {{ trackEstimate.isRoadRoute ? "ko'chalar bo'yicha" : 'taxminiy masofa' }}</span>
              </div>
              <div class="track-address-row" *ngIf="trackingOrder">
                <span>🏢 <strong>Filial:</strong> {{ getBranchName(trackingOrder.companyBranchId) }}</span>
                <span *ngIf="trackingOrder.deliveryAddress">🏠 <strong>Manzil:</strong> {{ trackingOrder.deliveryAddress }}</span>
                <span *ngIf="trackingOrder.deliveryNotes" class="track-notes-text">📝 {{ trackingOrder.deliveryNotes }}</span>
              </div>
            </div>

            <!-- Map Legend -->
            <div class="track-legend" *ngIf="hasAnyTrackMapPoint">
              <span><span class="legend-dot dot-branch"></span> Filial</span>
              <span><span class="legend-dot dot-curier"></span> Kuryer</span>
              <span><span class="legend-dot dot-delivery"></span> Yetkazish manzili</span>
            </div>

            <div *ngIf="isLoadingTrack && !trackedCurier" class="track-loading-box">
              Kuryer va marshrut ma'lumotlari yuklanmoqda...
            </div>

            <div
              id="order-curier-track-map"
              class="track-map-canvas"
              [style.display]="hasAnyTrackMapPoint ? 'block' : 'none'"
            ></div>

            <div
              *ngIf="trackedCurier && (trackedCurier.latitude == null || trackedCurier.longitude == null)"
              class="track-warning-box"
            >
              Kuryer hozircha GPS joylashuvini yubormagan (Online bo'lganda har 15 soniyada avtomatik yangilanadi).
            </div>

            <div
              *ngIf="trackingOrder && !hasDeliveryCoords(trackingOrder)"
              class="track-info-hint"
            >
              ℹ️ Buyurtmada yetkazish nuqtasi koordinatasi saqlanmagan — xaritada mavjud nuqtalar ko'rsatilmoqda.
            </div>

            <div *ngIf="hasAnyTrackMapPoint" class="track-footer-meta">
              <span>Har 10 soniyada yangilanadi<ng-container *ngIf="trackLastUpdated"> · {{ trackLastUpdated | date:'HH:mm:ss' }}</ng-container></span>
              <a *ngIf="getTrackGoogleMapsUrl() as gUrl" [href]="gUrl" target="_blank" rel="noopener noreferrer" class="track-gmaps-link">
                Google Maps ↗
              </a>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary btn-sm" (click)="closeTrackCurierModal()">
              Yopish
            </button>
          </div>
        </div>
      </div>

      <!-- View Receipt Modal (Enlarged) -->
      <div class="modal-overlay" *ngIf="showReceiptViewerModal" (click)="closeReceiptViewerModal()">
        <div class="modal-content viewer-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">🧾 To‘lov cheki</h3>
            <button class="modal-close" (click)="closeReceiptViewerModal()">&times;</button>
          </div>
          <div class="modal-body text-center">
            <img *ngIf="!isPdfUrl(viewingReceiptUrl)" [src]="viewingReceiptUrl" alt="Chek rasmi" class="viewer-img" />
            <div *ngIf="isPdfUrl(viewingReceiptUrl)" class="pdf-viewer-box">
              <div class="pdf-icon">📄</div>
              <p class="pdf-label">PDF to‘lov cheki</p>
              <a [href]="viewingReceiptUrl" target="_blank" rel="noopener" class="btn btn-secondary">
                PDF ni yangi oynada ochish &rarr;
              </a>
            </div>
          </div>
          <div class="modal-footer">
            <a [href]="viewingReceiptUrl" target="_blank" download class="btn btn-secondary">
              📥 Yuklab olish
            </a>
            <button type="button" class="btn btn-primary" (click)="closeReceiptViewerModal()">
              Yopish
            </button>
          </div>
        </div>
      </div>

      <!-- Cancel Confirmation Modal -->
      <div class="modal-overlay" *ngIf="showCancelModal" (click)="closeCancelModal()">
        <div class="modal-content cancel-modal" (click)="$event.stopPropagation()">
          <div class="modal-header modal-header-danger">
            <h3 class="modal-title">⚠️ Buyurtmani bekor qilasizmi?</h3>
            <button class="modal-close" (click)="closeCancelModal()">&times;</button>
          </div>

          <div class="modal-body">
            <p class="cancel-modal-text">
              Haqiqatan ham <strong>#{{ orderToCancel?.id }}</strong>-raqamli buyurtmani bekor qilishni xohlaysizmi?
            </p>
            <div class="cancel-order-summary" *ngIf="orderToCancel">
              <div class="summary-row">
                <span>Jami summa:</span>
                <strong>{{ orderToCancel.totalPrice | number:'1.0-0' }} so'm</strong>
              </div>
              <div class="summary-row">
                <span>Sana:</span>
                <span>{{ orderToCancel.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
              </div>
            </div>
            <!-- Staff uchun bekor qilish sababi (majburiy) -->
            <div class="cancel-reason-box" *ngIf="isStaffOrderView()">
              <label class="form-sub-label" for="staffCancelReasonInput">Bekor qilish sababi (majburiy) *</label>
              <textarea
                id="staffCancelReasonInput"
                class="form-control form-control-sm"
                [(ngModel)]="cancelReason"
                rows="2"
                placeholder="Masalan: Mijoz bilan bog'lanib bo'lmadi, mahsulot tugadi..."
                [class.is-invalid]="cancelReasonError && !cancelReason.trim()"
                (input)="cancelReasonError = false"
              ></textarea>
              <div class="text-danger error-hint" *ngIf="cancelReasonError && !cancelReason.trim()">
                Iltimos, bekor qilish sababini kiriting!
              </div>
            </div>
            <p class="cancel-warning-note">
              ⚠️ Bekor qilingach, ushbu buyurtma qayta tiklanmaydi.
            </p>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" [disabled]="isCancelling" (click)="closeCancelModal()">
              Yo'q, qolsin
            </button>
            <button 
              type="button" 
              class="btn btn-danger" 
              [disabled]="isCancelling || !!(orderToCancel && actionInProgress.has(orderToCancel.id))"
              (click)="confirmCancelOrder()"
            >
              {{ isCancelling ? 'Bekor qilinmoqda...' : 'Ha, bekor qilinsin' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Comment Modal - Sharh qoldirish -->
      <div class="modal-overlay" *ngIf="showCommentModal" (click)="closeCommentModal()">
        <div class="modal-content comment-modal" (click)="$event.stopPropagation()">
          <div class="modal-header modal-header-success">
            <h3 class="modal-title">⭐ Sharh qoldirish</h3>
            <button class="modal-close" (click)="closeCommentModal()">&times;</button>
          </div>

          <div class="modal-body" *ngIf="orderForComment">
            <div class="comment-product-info">
              <p class="info-label">Buyurtma #{{ orderForComment.id }} mahsulotlari:</p>
              <div class="product-chips">
                <span
                  *ngFor="let item of orderForComment.orderItems"
                  class="product-chip"
                  [class.selected]="selectedProductForComment?.productId === item.productId"
                  (click)="selectProductForComment(item)"
                >
                  {{ item.productName || ('Mahsulot #' + item.productId) }}
                </span>
              </div>
            </div>

            <div class="comment-form" *ngIf="selectedProductForComment">
              <div class="form-group">
                <label class="form-label">Bahoyingiz (1-5 yulduz)</label>
                <div class="star-rating-input">
                  <span
                    *ngFor="let star of [1,2,3,4,5]"
                    class="star-btn"
                    [class.filled]="star <= commentStarRating"
                    (click)="setCommentRating(star)"
                  >★</span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Fikringiz</label>
                <textarea
                  [(ngModel)]="commentContent"
                  class="form-control"
                  rows="3"
                  placeholder="Mahsulot sifati, yetkazib berilishi haqida fikringiz..."
                ></textarea>
              </div>
            </div>

            <div class="no-product-selected" *ngIf="!selectedProductForComment">
              <p>👆 Sharh qoldirish uchun yuqoridagi mahsulotlardan birini tanlang</p>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeCommentModal()">
              Bekor qilish
            </button>
            <button
              type="button"
              class="btn btn-success"
              [disabled]="!selectedProductForComment || !commentContent || commentContent.length < 3 || isSubmittingComment"
              (click)="submitComment()"
            >
              {{ isSubmittingComment ? 'Yuborilmoqda...' : 'Sharhni yuborish' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.25rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .page-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .page-subtitle {
      color: #64748b;
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }
    .mode-toggle {
      display: flex;
      background: #f1f5f9;
      padding: 0.25rem;
      border-radius: 10px;
      gap: 0.25rem;
      border: 1px solid #e2e8f0;
    }
    .toggle-btn {
      padding: 0.5rem 0.95rem;
      border-radius: 8px;
      font-size: 0.825rem;
      font-weight: 700;
      color: #64748b;
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    .toggle-btn.active {
      background: #ffffff;
      color: #4f46e5;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    /* Main Tabs (Faol / Eski) */
    .main-tabs-container {
      margin-bottom: 1.25rem;
    }
    .main-tabs {
      display: inline-flex;
      background: #f1f5f9;
      padding: 0.35rem;
      border-radius: 12px;
      gap: 0.25rem;
      border: 1px solid #e2e8f0;
    }
    .main-tab {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 700;
      color: #64748b;
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .main-tab:hover {
      color: #334155;
      background: rgba(255, 255, 255, 0.5);
    }
    .main-tab.active {
      background: #ffffff;
      color: #4f46e5;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.15);
    }
    .tab-icon {
      font-size: 1rem;
    }
    .tab-count {
      font-size: 0.8rem;
      opacity: 0.85;
    }

    /* Past Filter Chips */
    .past-filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }
    .filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.9rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .filter-chip:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .filter-chip.active {
      background: #4f46e5;
      color: #ffffff;
      border-color: #4f46e5;
    }
    .filter-chip.chip-delivered.active {
      background: #059669;
      border-color: #059669;
    }
    .filter-chip.chip-cancelled.active {
      background: #dc2626;
      border-color: #dc2626;
    }

    /* Past Orders Container (Compact rows) */
    .past-orders-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .past-order-row {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.2s ease;
    }
    .past-order-row:hover {
      border-color: #cbd5e1;
    }
    .past-order-row.expanded {
      border-color: #6366f1;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
    }
    .past-order-row.cancelled {
      background: #fef2f2;
      border-color: #fecaca;
    }
    .past-order-row.cancelled.expanded {
      border-color: #f87171;
    }

    .past-order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      cursor: pointer;
      gap: 1rem;
    }
    .past-order-main {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .past-order-id {
      font-weight: 700;
      color: #0f172a;
      font-size: 0.95rem;
    }
    .past-order-date {
      font-size: 0.8rem;
      color: #64748b;
    }
    .past-order-items {
      font-size: 0.8rem;
      color: #94a3b8;
    }
    .past-order-end {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .past-order-total {
      font-weight: 700;
      color: #4f46e5;
      font-size: 0.95rem;
    }
    .expand-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: #f1f5f9;
      border: none;
      border-radius: 8px;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .expand-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .expand-btn svg {
      transition: transform 0.2s ease;
    }
    .past-order-row.expanded .expand-btn svg {
      transform: rotate(180deg);
    }

    .past-order-details {
      padding: 0 1.25rem 1rem;
      border-top: 1px dashed #e2e8f0;
      animation: slideDown 0.2s ease;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .past-items-list {
      padding: 0.75rem 0;
    }
    .past-item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      font-size: 0.85rem;
      color: #334155;
      border-bottom: 1px dashed #f1f5f9;
    }
    .past-item-row:last-child {
      border-bottom: none;
    }
    .past-item-name {
      flex: 1;
      font-weight: 500;
    }
    .past-item-qty {
      color: #64748b;
      margin: 0 1rem;
      white-space: nowrap;
    }
    .past-item-sum {
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
    }

    .past-order-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid #e2e8f0;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .past-order-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    /* Load More Section */
    .load-more-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding: 1rem;
    }
    .page-info-text {
      font-size: 0.85rem;
      color: #64748b;
    }
    .load-more-btn {
      padding: 0.65rem 1.5rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    /* Dark theme for new tabs */
    :host-context(.dark-theme) .main-tabs { background: #151e32; border-color: #22304d; }
    :host-context(.dark-theme) .main-tab { color: #94a3b8; }
    :host-context(.dark-theme) .main-tab:hover { color: #e2e8f0; background: rgba(255, 255, 255, 0.05); }
    :host-context(.dark-theme) .main-tab.active { background: #1e293b; color: #a5b4fc; }
    :host-context(.dark-theme) .filter-chip { background: #151e32; color: #94a3b8; border-color: #22304d; }
    :host-context(.dark-theme) .filter-chip:hover { background: #1e293b; color: #e2e8f0; }
    :host-context(.dark-theme) .filter-chip.active { background: #4f46e5; color: #ffffff; }
    :host-context(.dark-theme) .past-order-row { background: #151e32; border-color: #22304d; }
    :host-context(.dark-theme) .past-order-row:hover { border-color: #334155; }
    :host-context(.dark-theme) .past-order-row.expanded { border-color: #6366f1; }
    :host-context(.dark-theme) .past-order-row.cancelled { background: #1c1917; border-color: #7f1d1d; }
    :host-context(.dark-theme) .past-order-id,
    :host-context(.dark-theme) .past-item-sum { color: #f8fafc; }
    :host-context(.dark-theme) .past-order-details,
    :host-context(.dark-theme) .past-order-footer { border-color: #22304d; }
    :host-context(.dark-theme) .past-item-row { color: #cbd5e1; border-color: #1e293b; }
    :host-context(.dark-theme) .expand-btn { background: #1e293b; color: #94a3b8; }
    :host-context(.dark-theme) .expand-btn:hover { background: #334155; color: #e2e8f0; }

    /* Mobile responsive */
    @media (max-width: 375px) {
      .main-tabs {
        width: 100%;
      }
      .main-tab {
        flex: 1;
        justify-content: center;
        padding: 0.55rem 0.75rem;
        font-size: 0.825rem;
      }
      .tab-icon {
        display: none;
      }
      .past-filter-chips {
        gap: 0.4rem;
      }
      .filter-chip {
        padding: 0.4rem 0.7rem;
        font-size: 0.75rem;
      }
      .past-order-header {
        padding: 0.85rem 1rem;
        flex-direction: column;
        align-items: flex-start;
      }
      .past-order-end {
        width: 100%;
        justify-content: space-between;
        margin-top: 0.5rem;
      }
      .past-order-main {
        gap: 0.5rem;
      }
    }

    .orders-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .order-card {
      padding: 0;
      overflow: hidden;
      background: #ffffff;
      border-radius: 18px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .order-card:hover {
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      border-color: #cbd5e1;
    }
    .order-stepper-box {
      padding: 0.85rem 1.5rem;
      background: #ffffff;
      border-bottom: 1px solid #f1f5f9;
    }
    .order-header {
      padding: 1.25rem 1.5rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
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
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
    }
    .order-date {
      font-size: 0.8125rem;
      color: #64748b;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .customer-tag, .branch-tag {
      font-size: 0.75rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
      color: #475569;
      font-weight: 600;
    }
    .branch-link {
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      transition: all 0.2s ease;
    }
    .branch-link:hover {
      background: #eef2ff;
      border-color: #6366f1;
      color: #4f46e5;
      transform: translateY(-1px);
      box-shadow: 0 2px 5px rgba(99, 102, 241, 0.15);
    }
    .branch-no-coords {
      opacity: 0.65;
      cursor: default;
    }

    .order-items-wrapper {
      padding: 1.25rem 1.5rem;
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
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .items-table td {
      padding: 0.85rem 0;
      border-bottom: 1px dashed #f1f5f9;
      color: #334155;
    }
    .items-table tr:last-child td {
      border-bottom: none;
    }
    .item-name {
      font-weight: 600;
      color: #0f172a;
    }
    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .fw-bold { font-weight: 700; color: #0f172a; }
    .no-items-note {
      font-size: 0.825rem;
      color: #94a3b8;
      font-style: italic;
      padding: 0.5rem 0;
    }

    .order-footer {
      padding: 1.25rem 1.5rem;
      background: #fafafa;
      border-top: 1px solid #f1f5f9;
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
      font-size: 0.9rem;
      color: #64748b;
      font-weight: 600;
    }
    .total-amount {
      font-size: 1.35rem;
      font-weight: 800;
      color: #4f46e5;
    }
    .order-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .cancel-btn {
      padding: 0.5rem 0.95rem;
      font-size: 0.825rem;
      border-radius: 8px;
    }

    /* Payment Mismatch Warning */
    .order-mismatch-card {
      border-color: #f59e0b !important;
      box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.25), 0 4px 12px rgba(245, 158, 11, 0.08);
    }
    .payment-mismatch-warning {
      flex-basis: 100%;
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.6rem 0.9rem;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 10px;
      color: #92400e;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .mismatch-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }
    .mismatch-text {
      line-height: 1.4;
    }
    .mismatch-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      color: #92400e;
      background: #fde68a;
      border: 1px solid #f59e0b;
    }

    /* SuperAdmin Override Utility Bar (separate from main row) */
    .superadmin-override-bar {
      background: #f8fafc;
      border-top: 1px dashed #cbd5e1;
      padding: 0.5rem 1.5rem;
    }
    .superadmin-bar-top {
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }
    .override-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.28rem 0.7rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .override-toggle-btn:hover:not(:disabled) {
      background: #eef2ff;
      color: #4338ca;
      border-color: #818cf8;
    }
    .override-toggle-btn.active {
      background: #4f46e5;
      color: #ffffff;
      border-color: #4f46e5;
    }
    .override-toggle-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .override-chevron {
      font-size: 0.65rem;
      opacity: 0.8;
    }
    .override-panel {
      margin-top: 0.65rem;
      padding: 0.85rem 1rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .override-panel-grid {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 0.85rem;
      align-items: start;
    }
    .override-field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .override-field textarea.is-invalid,
    .cancel-reason-box textarea.is-invalid {
      border-color: #dc2626;
      background-color: #fffaf0;
    }
    .override-panel-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    .cancel-reason-box {
      margin: 0.85rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    @media (max-width: 640px) {
      .override-panel-grid {
        grid-template-columns: 1fr;
      }
      .superadmin-override-bar {
        padding: 0.5rem 1rem;
      }
    }

    /* Cancel Modal */
    .cancel-modal {
      max-width: 460px;
    }
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
    }
    .modal-content {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      animation: modalSlide 0.2s ease-out;
    }
    @keyframes modalSlide {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
    }
    .modal-header-danger {
      background: #fef2f2;
      border-bottom: 1px solid #fee2e2;
    }
    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #991b1b;
    }
    .modal-close {
      color: #94a3b8;
      font-size: 1.4rem;
      background: none;
      border: none;
      cursor: pointer;
    }
    .modal-body {
      padding: 1.5rem;
    }
    .cancel-modal-text {
      font-size: 0.95rem;
      color: #0f172a;
      line-height: 1.5;
    }
    .cancel-order-summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.85rem;
      margin: 1rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.85rem;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      color: #475569;
    }
    .cancel-warning-note {
      font-size: 0.78rem;
      color: #b45309;
      margin: 0;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
    }

    /* Comment Modal */
    .comment-modal {
      max-width: 520px;
    }
    .modal-header-success {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border-bottom: 1px solid #a7f3d0;
    }
    .modal-header-success .modal-title {
      color: #065f46;
    }
    .comment-product-info {
      margin-bottom: 1.25rem;
    }
    .info-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.75rem;
    }
    .product-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .product-chip {
      padding: 0.5rem 1rem;
      background: #f1f5f9;
      border: 2px solid #e2e8f0;
      border-radius: 999px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
    }
    .product-chip:hover {
      background: #e2e8f0;
      border-color: #cbd5e1;
    }
    .product-chip.selected {
      background: #dbeafe;
      border-color: #3b82f6;
      color: #1d4ed8;
    }
    .comment-form {
      margin-top: 1rem;
    }
    .star-rating-input {
      display: flex;
      gap: 0.25rem;
    }
    .star-btn {
      font-size: 1.75rem;
      color: #d1d5db;
      cursor: pointer;
      transition: color 0.15s, transform 0.15s;
    }
    .star-btn:hover {
      transform: scale(1.1);
    }
    .star-btn.filled {
      color: #fbbf24;
    }
    .no-product-selected {
      text-align: center;
      padding: 2rem 1rem;
      color: #64748b;
      font-size: 0.9rem;
    }
    .comment-btn {
      background: #059669;
      color: #ffffff;
      border: none;
    }
    .comment-btn:hover {
      background: #047857;
    }

    /* Payment Badges & UI */
    .payment-badge-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.25rem;
      flex-wrap: wrap;
    }
    .payment-pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .unpaid-pill {
      color: #92400e;
      background: #fef3c7;
    }
    .rejection-note {
      font-size: 0.75rem;
      color: #dc2626;
      font-weight: 600;
    }
    .pay-btn {
      background: #4f46e5;
      color: #ffffff;
      border: none;
    }
    .pay-btn:hover {
      background: #4338ca;
    }

    /* Pay Modal & Admin Modal common structure */
    .pay-modal, .admin-pay-modal {
      max-width: 500px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .pay-modal .modal-header, .admin-pay-modal .modal-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .pay-modal .modal-body, .admin-pay-modal .modal-body {
      padding: 1rem 1.25rem;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .pay-modal .modal-footer, .admin-pay-modal .modal-footer {
      padding: 0.85rem 1.25rem;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
      flex-shrink: 0;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    /* Customer Pay Modal elements */
    .compact-card-box {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      color: #ffffff;
      border-radius: 12px;
      padding: 0.75rem 1rem;
      box-shadow: 0 4px 12px rgba(30, 27, 75, 0.15);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .card-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      opacity: 0.85;
      font-weight: 600;
    }
    .card-brand-badge {
      letter-spacing: 0.05em;
    }
    .card-brand-sub {
      font-size: 0.7rem;
      opacity: 0.75;
    }
    .card-num-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-num-text {
      font-family: monospace;
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .copy-pill-btn {
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #ffffff;
      font-size: 0.725rem;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }
    .copy-pill-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    .card-holder-text {
      font-size: 0.78rem;
      opacity: 0.9;
    }

    .pay-summary-strip {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0.65rem 0.85rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .amount-side {
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
    }
    .amount-side .label {
      font-size: 0.825rem;
      color: #64748b;
      font-weight: 600;
    }
    .amount-side .val {
      font-size: 1.15rem;
      font-weight: 800;
      color: #4f46e5;
    }
    .guide-side {
      font-size: 0.75rem;
      color: #475569;
      background: #eff6ff;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      border-left: 3px solid #3b82f6;
    }

    .form-group-compact {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-sub-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #334155;
    }

    /* File Drop Area Compact */
    .file-drop-area-compact {
      border: 2px dashed #cbd5e1;
      border-radius: 10px;
      padding: 0.65rem 0.85rem;
      cursor: pointer;
      background: #f8fafc;
      transition: border-color 0.2s, background 0.2s;
    }
    .file-drop-area-compact:hover {
      border-color: #4f46e5;
      background: #f1f5f9;
    }
    .drop-empty {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      color: #475569;
      font-size: 0.825rem;
    }
    .drop-icon {
      font-size: 1.5rem;
    }
    .drop-texts {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
    }
    .drop-texts small {
      color: #94a3b8;
      font-size: 0.72rem;
    }
    .drop-filled {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-align: left;
    }
    .receipt-thumb {
      width: 54px;
      height: 54px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .filled-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      flex: 1;
      overflow: hidden;
    }
    .file-name {
      font-size: 0.825rem;
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-size {
      font-size: 0.72rem;
      color: #64748b;
    }
    .change-action {
      font-size: 0.72rem;
      color: #4f46e5;
      font-weight: 600;
    }
    .btn-remove-file {
      background: #fee2e2;
      color: #dc2626;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      cursor: pointer;
      flex-shrink: 0;
    }
    .submit-pay-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      border-top-color: #ffffff;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Admin Review Modal Elements */
    .admin-review-summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0.75rem 0.95rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      font-size: 0.825rem;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #475569;
    }
    .total-highlight {
      font-size: 1.05rem;
      font-weight: 800;
      color: #4f46e5;
    }
    .note-text {
      color: #0f172a;
      font-weight: 600;
      max-width: 65%;
      text-align: right;
    }
    .receipt-section {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .receipt-preview-card {
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #cbd5e1;
      max-height: 200px;
      background: #0f172a;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .admin-thumb-img {
      max-height: 200px;
      max-width: 100%;
      object-fit: contain;
    }
    .receipt-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(15, 23, 42, 0.75);
      color: #ffffff;
      font-size: 0.75rem;
      text-align: center;
      padding: 0.3rem;
      font-weight: 600;
    }
    .receipt-quick-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }
    .manual-payment-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 0.85rem;
    }
    .manual-pay-title {
      font-weight: 700;
      color: #166534;
      font-size: 0.9rem;
      margin-bottom: 0.25rem;
    }
    .manual-pay-desc {
      font-size: 0.78rem;
      color: #15803d;
      margin-bottom: 0.5rem;
      line-height: 1.4;
    }
    .method-selector {
      display: flex;
      gap: 1.25rem;
    }
    .radio-option {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.825rem;
      font-weight: 700;
      color: #166534;
      cursor: pointer;
    }
    .reject-box {
      background: #fef2f2;
      border: 1.5px solid #ef4444;
      border-radius: 8px;
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.1);
    }
    .reject-textarea {
      resize: vertical;
      min-height: 65px;
    }
    .reject-textarea.is-invalid {
      border-color: #dc2626;
      background-color: #fffaf0;
    }
    .error-hint {
      font-size: 0.75rem;
      font-weight: 600;
      color: #dc2626;
    }

    /* Viewer Modal */
    .viewer-modal {
      max-width: 650px;
    }
    .viewer-img {
      max-width: 100%;
      max-height: 70vh;
      border-radius: 8px;
      object-fit: contain;
    }

    /* Pagination bar */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      margin-top: 1.5rem;
      margin-bottom: 2rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .pagination-info {
      font-size: 0.875rem;
      color: #64748b;
    }
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .page-btn {
      min-width: 36px;
      height: 36px;
      padding: 0 0.65rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      font-size: 0.875rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .page-btn:hover:not(:disabled):not(.active) {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .page-btn.active {
      background: #4f46e5;
      border-color: #4f46e5;
      color: #ffffff;
    }
    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .page-btn.nav-btn {
      background: #f8fafc;
    }
    .page-dots {
      color: #94a3b8;
      padding: 0 0.25rem;
    }
    .page-size-picker {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .size-label {
      font-size: 0.8125rem;
      color: #64748b;
    }
    .page-size-picker select {
      padding: 0.4rem 0.6rem;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      font-size: 0.8125rem;
      background: #ffffff;
      cursor: pointer;
    }
    @media (max-width: 640px) {
      .pagination-bar {
        justify-content: center;
      }
      .pagination-info, .page-size-picker {
        width: 100%;
        justify-content: center;
        text-align: center;
      }
    }

    /* Load more / pagination */
    .load-more-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      margin-top: 1.5rem;
      margin-bottom: 2rem;
    }
    .page-info-text {
      font-size: 0.85rem;
      color: #64748b;
    }
    .load-more-btn {
      padding: 0.65rem 1.75rem;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 10px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
    }
    .load-more-btn:hover {
      background: #f8fafc;
      border-color: #94a3b8;
      color: #0f172a;
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
    }

    /* Dark Mode Support */
    :host-context(body.dark-theme) .page-title {
      color: #f8fafc !important;
    }
    :host-context(body.dark-theme) .page-subtitle {
      color: #94a3b8 !important;
    }
    :host-context(body.dark-theme) .mode-toggle {
      background: #0b0f19;
      border-color: #334155;
    }
    :host-context(body.dark-theme) .toggle-btn {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .toggle-btn.active {
      background: #1e293b;
      color: #818cf8;
    }
    :host-context(body.dark-theme) .load-more-btn {
      background: #151e32;
      border-color: #22304d;
      color: #cbd5e1;
    }
    :host-context(body.dark-theme) .load-more-btn:hover {
      background: #1e293b;
      border-color: #3b82f6;
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .page-info-text {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .branch-link {
      background: #151e32;
      border-color: #22304d;
      color: #818cf8;
    }
    :host-context(body.dark-theme) .branch-link:hover {
      background: #1e1b4b;
      border-color: #6366f1;
      color: #a5b4fc;
      box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
    }
    :host-context(body.dark-theme) .branch-no-coords {
      background: #151e32;
      border-color: #22304d;
      color: #64748b;
    }
    :host-context(body.dark-theme) .order-stepper-box,
    :host-context(.dark-theme) .order-stepper-box {
      background: #111827;
      border-bottom-color: #1f2937;
    }

    /* Dark Mode - Admin Review & Modals */
    :host-context(body.dark-theme) .admin-review-summary {
      background: #0f172a !important;
      border-color: #22304d !important;
    }
    :host-context(body.dark-theme) .summary-line {
      color: #94a3b8 !important;
    }
    :host-context(body.dark-theme) .summary-line strong {
      color: #f8fafc !important;
    }
    :host-context(body.dark-theme) .note-text {
      color: #cbd5e1 !important;
    }
    :host-context(body.dark-theme) .manual-payment-box {
      background: #064e3b22 !important;
      border-color: #05966955 !important;
    }
    :host-context(body.dark-theme) .manual-pay-title {
      color: #34d399 !important;
    }
    :host-context(body.dark-theme) .manual-pay-desc {
      color: #a7f3d0 !important;
    }
    :host-context(body.dark-theme) .radio-option {
      color: #6ee7b7 !important;
    }
    :host-context(body.dark-theme) .form-sub-label {
      color: #cbd5e1 !important;
    }
    :host-context(body.dark-theme) .receipt-preview-card {
      border-color: #334155 !important;
    }
    :host-context(body.dark-theme) .pay-summary-strip {
      background: #0f172a !important;
      border-color: #22304d !important;
    }
    :host-context(body.dark-theme) .guide-side {
      background: #1e1b4b !important;
      color: #a5b4fc !important;
      border-left-color: #6366f1 !important;
    }
    :host-context(body.dark-theme) .file-drop-area-compact {
      background: #0f172a !important;
      border-color: #334155 !important;
    }
    :host-context(body.dark-theme) .file-drop-area-compact:hover {
      background: #1e293b !important;
      border-color: #6366f1 !important;
    }
    :host-context(body.dark-theme) .file-name {
      color: #f8fafc !important;
    }
    :host-context(body.dark-theme) .drop-empty {
      color: #94a3b8 !important;
    }
    .btn-warning {
      background: #f59e0b;
      color: #ffffff;
      border: 1px solid #d97706;
      box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.25);
    }
    .btn-warning:hover {
      background: #d97706;
      color: #ffffff;
    }
    .btn-success {
      background: #10b981;
      color: #ffffff;
      border: 1px solid #059669;
      box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.25);
    }
    .btn-success:hover {
      background: #059669;
      color: #ffffff;
    }
    :host-context(body.dark-theme) .btn-warning {
      background: #d97706 !important;
      color: #ffffff !important;
      border-color: #f59e0b !important;
      box-shadow: 0 4px 10px rgba(217, 119, 6, 0.35) !important;
    }
    :host-context(body.dark-theme) .btn-warning:hover {
      background: #b45309 !important;
    }
    :host-context(body.dark-theme) .btn-success {
      background: #10b981 !important;
      color: #ffffff !important;
      border-color: #059669 !important;
      box-shadow: 0 4px 10px rgba(16, 185, 129, 0.35) !important;
    }
    :host-context(body.dark-theme) .btn-success:hover {
      background: #059669 !important;
    }

    /* Dark Mode - Price/Total Contrast Fix */
    :host-context(body.dark-theme) .total-amount,
    :host-context(.dark-theme) .total-amount {
      color: #a5b4fc !important;
    }
    :host-context(body.dark-theme) .amount-side .val,
    :host-context(.dark-theme) .amount-side .val {
      color: #a5b4fc !important;
    }
    :host-context(body.dark-theme) .total-highlight,
    :host-context(.dark-theme) .total-highlight {
      color: #c7d2fe !important;
    }

    /* Order Delivery Strip & Live Track Modal */
    .order-delivery-strip {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 14px;
      padding: 8px 12px;
      margin-bottom: 12px;
      border-radius: 8px;
      background: var(--bg-subtle, #f8fafc);
      border: 1px solid var(--border, #e2e8f0);
      font-size: 0.85rem;
      color: var(--text-main, #1e293b);
    }
    .delivery-notes-chip {
      color: var(--text-muted, #64748b);
      font-size: 0.82rem;
    }
    .track-curier-modal {
      max-width: 640px;
      width: 95%;
    }
    .track-curier-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--bg-subtle, #f1f5f9);
      border: 1px solid var(--border, #e2e8f0);
    }
    .track-curier-identity {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .track-curier-icon {
      font-size: 1.5rem;
    }
    .track-curier-name {
      font-weight: 700;
      color: var(--text-main, #0f172a);
    }
    .track-curier-meta {
      font-size: 0.8rem;
      color: var(--text-muted, #64748b);
    }
    .track-curier-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .track-eta-card {
      margin-bottom: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(79, 70, 229, 0.08);
      border: 1px solid rgba(79, 70, 229, 0.25);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .track-eta-top {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .track-eta-main {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .track-eta-badge {
      font-size: 0.92rem;
      color: var(--text-main, #1e1b4b);
    }
    .track-eta-dist {
      font-weight: 700;
      font-size: 0.88rem;
      color: #4f46e5;
    }
    .track-eta-sub {
      font-size: 0.78rem;
      color: var(--text-muted, #64748b);
    }
    .track-address-row {
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 0.82rem;
      color: var(--text-main, #334155);
      border-top: 1px dashed rgba(79, 70, 229, 0.22);
      padding-top: 6px;
    }
    .track-notes-text {
      color: var(--text-muted, #64748b);
    }
    .track-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      margin-bottom: 8px;
      font-size: 0.78rem;
      color: var(--text-muted, #475569);
    }
    .track-legend > span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      border: 1.5px solid #ffffff;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
    }
    .dot-branch { background: #4f46e5; }
    .dot-curier { background: #16a34a; }
    .dot-delivery { background: #ef4444; }
    .track-loading-box {
      text-align: center;
      padding: 20px;
      color: var(--text-muted, #64748b);
    }
    .track-map-canvas {
      height: 340px;
      width: 100%;
      border-radius: 12px;
      border: 1px solid var(--border, #e2e8f0);
    }
    .track-warning-box {
      margin-top: 10px;
      padding: 12px;
      text-align: center;
      border-radius: 10px;
      background: #fef3c7;
      color: #92400e;
      font-size: 0.85rem;
    }
    .track-info-hint {
      margin-top: 8px;
      font-size: 0.8rem;
      color: var(--text-muted, #64748b);
    }
    .track-footer-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
      font-size: 0.8rem;
      color: var(--text-muted, #64748b);
    }
    .track-gmaps-link {
      color: var(--primary, #4f46e5);
      font-weight: 600;
      text-decoration: none;
    }
    :host-context(body.dark-theme) .track-eta-card,
    :host-context(.dark-theme) .track-eta-card {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(129, 140, 248, 0.35);
    }
    :host-context(body.dark-theme) .track-eta-dist,
    :host-context(.dark-theme) .track-eta-dist,
    :host-context(body.dark-theme) .track-gmaps-link,
    :host-context(.dark-theme) .track-gmaps-link {
      color: #a5b4fc;
    }
    :host-context(body.dark-theme) .track-warning-box,
    :host-context(.dark-theme) .track-warning-box {
      background: rgba(245, 158, 11, 0.18);
      color: #fde68a;
    }
    .order-highlight {
      border-color: #6366f1 !important;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.28), 0 8px 24px rgba(99, 102, 241, 0.14) !important;
    }
    .pdf-viewer-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 1.5rem 1rem;
    }
    .pdf-viewer-box .pdf-icon {
      font-size: 3rem;
      line-height: 1;
    }
    .pdf-viewer-box .pdf-label {
      margin: 0;
      font-weight: 600;
      color: var(--text-main, #1e293b);
    }
    .curier-info-modal {
      max-width: 420px;
      width: 94%;
    }
    .curier-modal-profile {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .curier-modal-avatar-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #4f46e5, #6366f1);
      color: #ffffff;
      font-weight: 700;
      font-size: 1.25rem;
      border: 2px solid rgba(99, 102, 241, 0.25);
    }
    .curier-modal-avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .curier-modal-initials {
      letter-spacing: 0.03em;
    }
    .curier-modal-details {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 0;
    }
    .curier-modal-name {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-main, #0f172a);
    }
    .curier-modal-vehicle {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.875rem;
      color: var(--text-muted, #475569);
    }
    .curier-modal-phone {
      margin-top: 0.25rem;
      align-self: flex-start;
    }
    .curier-waiting-note {
      font-size: 0.84rem;
      color: var(--text-muted, #475569);
      padding: 0.35rem 0.65rem;
      background: var(--bg-subtle, #f1f5f9);
      border-radius: 8px;
    }
    :host-context(.dark-theme) .curier-modal-name { color: #f8fafc; }
    :host-context(.dark-theme) .curier-modal-vehicle,
    :host-context(.dark-theme) .curier-waiting-note { color: #cbd5e1; }
    :host-context(.dark-theme) .curier-waiting-note { background: #1e293b; }
    :host-context(.dark-theme) .payment-mismatch-warning { background: rgba(245, 158, 11, 0.14); border-color: rgba(245, 158, 11, 0.5); color: #fde68a; }
    :host-context(.dark-theme) .mismatch-pill { background: rgba(245, 158, 11, 0.25); border-color: rgba(245, 158, 11, 0.55); color: #fde68a; }
    :host-context(.dark-theme) .superadmin-override-bar { background: #0f172a; border-top-color: #334155; }
    :host-context(.dark-theme) .override-toggle-btn { background: #1e293b; border-color: #334155; color: #cbd5e1; }
    :host-context(.dark-theme) .override-toggle-btn:hover:not(:disabled) { background: #312e81; border-color: #6366f1; color: #e0e7ff; }
    :host-context(.dark-theme) .override-toggle-btn.active { background: #6366f1; border-color: #6366f1; color: #ffffff; }
    :host-context(.dark-theme) .override-panel { background: #151e32; border-color: #334155; }
    :host-context(.dark-theme) .override-field textarea.is-invalid,
    :host-context(.dark-theme) .cancel-reason-box textarea.is-invalid { background-color: #2c1518; border-color: #ef4444; }
  `]
})
export class OrdersListComponent implements OnInit, OnDestroy {
  private orderService = inject(OrderService);
  private companyService = inject(CompanyService);
  public paymentService = inject(PaymentService);
  public customerService = inject(CustomerService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private mapService = inject(MapService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  Math = Math;
  OrderStatus = OrderStatus;
  PaymentStatus = PaymentStatus;
  viewMode: 'my' | 'all' = 'my';

  // Raw orders loaded from backend
  allOrders: Order[] = [];
  // For backwards compatibility
  orders: Order[] = [];
  // Filtered orders list (before client pagination slice)
  filteredOrders: Order[] = [];
  // Current displayed orders for the UI
  paginatedOrders: Order[] = [];

  branches: CompanyBranch[] = [];
  companies: Company[] = [];
  availableBranches: CompanyBranch[] = [];
  customersMap: Map<number, Customer> = new Map();

  isLoading = true;
  hasError = false;
  errorMessage = '';

  // Pagination state (server-side for 'my' mode)
  displayedCount = 5;
  totalPages = 1;
  currentPage = 1;
  pageSize = 5;
  totalItems = 0;
  hasPreviousPage = false;
  hasNextPage = false;

  // Active filter state
  orderFilter: OrderFilter = {
    status: null,
    search: null,
    branchId: null,
    companyId: null,
    curierProfileId: null,
    dateFrom: null,
    dateTo: null,
    paymentStatus: 'all',
    sortBy: 'createdAt_desc',
    pageNumber: 1,
    pageSize: 5
  };

  filterCuriers: { id: number; name: string }[] = [];

  // Status counts (calculated over all customer/role orders, independent of active filters)
  statusCounts: OrderStatusCounts = {
    all: 0,
    pending: 0,
    confirmed: 0,
    assigned: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    failed: 0
  };

  // Payments map: orderId -> Payment
  orderPayments: Map<number, Payment> = new Map();

  // Customer Pay Modal state
  showPayModal = false;
  currentOrderForPay: Order | null = null;
  customerPaymentMethod: 'CardTransfer' | 'Cash' = 'CardTransfer';
  selectedReceiptFile: File | null = null;
  selectedFilePreview: string | null = null;
  payTransactionNote = '';
  isSubmittingPay = false;
  currentOrderExistingChekUrl: string | null = null;

  // Assign Curier Modal state
  private curierService = inject(CurierService);
  showAssignCurierModal = false;
  orderForAssignCurier: Order | null = null;
  availableCuriers: CurierResponseDto[] = [];
  selectedCurierId: number = 0;
  isLoadingCuriers = false;
  isAssigningCurier = false;

  // Curier Info Modal state
  showCurierInfoModal = false;
  curierInfoOrder: Order | null = null;

  // Track Curier Live Map Modal state (Admin only)
  showTrackCurierModal = false;
  trackingOrder: Order | null = null;
  trackedCurier: CurierResponseDto | null = null;
  isLoadingTrack = false;
  trackLastUpdated: Date | null = null;
  trackEstimate: RouteEstimate | null = null;
  trackLegLabel = '';
  failedCurierAvatarIds = new Set<number>();
  private trackTimer: any = null;
  private trackMap?: L.Map;
  private trackCurierMarker?: L.Marker;
  private trackBranchMarker?: L.Marker;
  private trackDeliveryMarker?: L.Marker;
  private trackRouteLayer?: L.Polyline;
  private trackBoundsFitted = false;
  private lastRouteKey = '';
  private lastRouteCurierLoc: MapLocation | null = null;
  private trackSessionId = 0;

  // Admin Review Modal state
  showAdminPaymentModal = false;
  adminReviewOrder: Order | null = null;
  adminReviewPayment: Payment | null = null;
  adminRejectReason = '';
  showRejectReasonInput = false;
  rejectReasonHasError = false;
  isAdminProcessingPayment = false;
  adminPaymentMethod: 'Cash' | 'CardTransfer' = 'Cash';
  adminPaymentNote = '';

  // Receipt Viewer Modal state
  showReceiptViewerModal = false;
  viewingReceiptUrl = '';

  // Cancel modal state (Matching UI Spec: ### Buyurtmani bekor qilasizmi?)
  showCancelModal = false;
  orderToCancel: Order | null = null;
  isCancelling = false;

  // Comment modal state
  private commentService = inject(CommentService);
  showCommentModal = false;
  orderForComment: Order | null = null;
  selectedProductForComment: OrderItem | null = null;
  commentStarRating = 5;
  commentContent = '';
  isSubmittingComment = false;

  // === SuperAdmin Qo'lda o'zgartirish menyusi ===
  overrideMenuOrderId: number | null = null;
  overrideNewStatus: OrderStatus | null = null;
  overrideReason = '';
  overrideError = false;
  readonly overrideStatusOptions: OrderStatus[] = [
    OrderStatus.Pending,
    OrderStatus.Confirmed,
    OrderStatus.AssignedToCourier,
    OrderStatus.Shipped,
    OrderStatus.Delivered,
    OrderStatus.Cancelled,
    OrderStatus.DeliveryFailed
  ];

  // === Double-click himoyasi va bekor qilish sababi ===
  actionInProgress = new Set<number>();
  cancelReason = '';
  cancelReasonError = false;

  // === NEW TAB SYSTEM STATE (Faol / Eski) ===
  readonly ORDERS_PAGE_SIZE = 10;
  readonly ACTIVE_STATUSES = [OrderStatus.Pending, OrderStatus.Confirmed, OrderStatus.AssignedToCourier, OrderStatus.Shipped];
  readonly PAST_STATUSES = [OrderStatus.Delivered, OrderStatus.Cancelled, OrderStatus.DeliveryFailed];

  activeTab: 'active' | 'past' = 'active';
  activeOrders: Order[] = [];
  pastOrders: Order[] = [];
  pastFilterStatus: 'all' | 'delivered' | 'cancelled' = 'all';
  displayedActiveCount = 10;
  displayedPastCount = 10;
  expandedOrderIds: Set<number> = new Set();
  highlightedOrderId: number | null = null;
  private inFlightCustomerIds: Set<number> = new Set();

  get hasActiveMyFilters(): boolean {
    const f = this.orderFilter;
    return !!(
      (f.search && f.search.trim()) ||
      (f.branchId !== null && f.branchId !== undefined) ||
      f.dateFrom ||
      f.dateTo ||
      (f.paymentStatus && f.paymentStatus !== 'all') ||
      (f.sortBy && f.sortBy !== 'createdAt_desc')
    );
  }

  get filteredPastOrders(): Order[] {
    if (this.pastFilterStatus === 'all') return this.pastOrders;
    if (this.pastFilterStatus === 'delivered') {
      return this.pastOrders.filter(o => parseOrderStatus(o.status) === OrderStatus.Delivered);
    }
    return this.pastOrders.filter(o => {
      const st = parseOrderStatus(o.status);
      return st === OrderStatus.Cancelled || st === OrderStatus.DeliveryFailed;
    });
  }

  get displayedActiveOrders(): Order[] {
    return this.activeOrders.slice(0, this.displayedActiveCount);
  }

  get displayedPastOrders(): Order[] {
    return this.filteredPastOrders.slice(0, this.displayedPastCount);
  }

  get deliveredCount(): number {
    return this.pastOrders.filter(o => parseOrderStatus(o.status) === OrderStatus.Delivered).length;
  }

  get cancelledCount(): number {
    return this.pastOrders.filter(o => {
      const st = parseOrderStatus(o.status);
      return st === OrderStatus.Cancelled || st === OrderStatus.DeliveryFailed;
    }).length;
  }

  get showBranchDropdown(): boolean {
    return !this.authState.isBranchManager();
  }

  get showCompanyDropdown(): boolean {
    return this.authState.isSuperAdmin();
  }

  ngOnInit(): void {
    this.parseFiltersFromUrl();
    this.loadBranches();
    this.loadCompanies();
    this.loadCustomers();
    this.loadFilterCuriers();

    if (this.authState.isAdminMode() || this.authState.isAdminRole()) {
      this.viewMode = 'all';
    }
    if (this.authState.isBranchManager()) {
      this.orderFilter.branchId = this.authState.userBranchId();
      this.viewMode = 'all';
    }

    // Subscribe to query params changes (back/forward navigation & deep-linking support)
    this.route.queryParams.subscribe(params => {
      this.applyParamsToFilter(params);
      // Handle tab param for 'my' mode
      if (this.viewMode === 'my') {
        const tab = params['tab'];
        if (tab === 'past' || tab === 'active') {
          this.activeTab = tab;
        }
      }
      if (this.allOrders.length > 0) {
        this.applyFilters(false);
        this.focusTargetOrderIfNeeded();
      }
    });

    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.stopTrackTimer();
    this.destroyTrackCurierMap();
  }

  // === TAB SYSTEM METHODS ===
  setActiveTab(tab: 'active' | 'past'): void {
    this.activeTab = tab;
    // Reset display counts when switching tabs
    if (tab === 'active') {
      this.displayedActiveCount = this.ORDERS_PAGE_SIZE;
    } else {
      this.displayedPastCount = this.ORDERS_PAGE_SIZE;
      this.pastFilterStatus = 'all';
    }
    this.syncTabToUrl();
  }

  setPastFilter(status: 'all' | 'delivered' | 'cancelled'): void {
    this.pastFilterStatus = status;
    this.displayedPastCount = this.ORDERS_PAGE_SIZE;
  }

  loadMoreActive(): void {
    this.displayedActiveCount += this.ORDERS_PAGE_SIZE;
  }

  loadMorePast(): void {
    this.displayedPastCount += this.ORDERS_PAGE_SIZE;
  }

  toggleOrderExpand(orderId: number): void {
    if (this.expandedOrderIds.has(orderId)) {
      this.expandedOrderIds.delete(orderId);
    } else {
      this.expandedOrderIds.add(orderId);
    }
  }

  private splitOrdersByType(autoSwitchEmptyActive = true): void {
    const filterCopy: OrderFilter = {
      ...this.orderFilter,
      status: null,
      pageSize: 999999,
      pageNumber: 1
    };
    const filtered = this.orderService.filterOrders(this.allOrders, filterCopy, this.orderPayments).items;

    this.activeOrders = filtered.filter(o => this.ACTIVE_STATUSES.includes(parseOrderStatus(o.status)));
    this.pastOrders = filtered.filter(o => this.PAST_STATUSES.includes(parseOrderStatus(o.status)));

    // Auto-switch to 'past' tab on initial load if no active orders but has past orders
    if (autoSwitchEmptyActive && !this.highlightedOrderId && this.activeOrders.length === 0 && this.pastOrders.length > 0) {
      this.activeTab = 'past';
    }
  }

  private focusTargetOrderIfNeeded(): void {
    const targetId = this.highlightedOrderId;
    if (!targetId || this.allOrders.length === 0) return;

    const targetOrder = this.allOrders.find(o => o.id === targetId);
    if (!targetOrder) return;

    if (this.viewMode === 'my') {
      const st = parseOrderStatus(targetOrder.status);
      if (this.PAST_STATUSES.includes(st)) {
        this.activeTab = 'past';
        this.pastFilterStatus = 'all';
        this.expandedOrderIds.add(targetId);
        const idx = this.filteredPastOrders.findIndex(o => o.id === targetId);
        if (idx >= 0 && idx >= this.displayedPastCount) {
          this.displayedPastCount = idx + this.ORDERS_PAGE_SIZE;
        }
      } else {
        this.activeTab = 'active';
        const idx = this.activeOrders.findIndex(o => o.id === targetId);
        if (idx >= 0 && idx >= this.displayedActiveCount) {
          this.displayedActiveCount = idx + this.ORDERS_PAGE_SIZE;
        }
      }
    } else {
      let idx = this.filteredOrders.findIndex(o => o.id === targetId);
      if (idx === -1) {
        // Clear blocking filters so deep-linked order is visible
        this.orderFilter = {
          ...this.orderFilter,
          status: null,
          search: null,
          curierProfileId: null,
          dateFrom: null,
          dateTo: null,
          paymentStatus: 'all'
        };
        this.applyFilters(false);
        idx = this.filteredOrders.findIndex(o => o.id === targetId);
      }
      if (idx >= 0 && idx >= this.displayedCount) {
        this.displayedCount = idx + (this.orderFilter.pageSize || 5);
        this.paginatedOrders = this.filteredOrders.slice(0, this.displayedCount);
      }
    }

    setTimeout(() => {
      const el = document.getElementById(`order-card-${targetId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  }

  private syncTabToUrl(): void {
    if (this.viewMode !== 'my') return;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: this.activeTab },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private parseFiltersFromUrl(): void {
    const params = this.route.snapshot.queryParams;
    this.applyParamsToFilter(params);
  }

  private applyParamsToFilter(params: any): void {
    if (params['status'] !== undefined && params['status'] !== null && params['status'] !== '') {
      const parsedStatus = Number(params['status']);
      this.orderFilter.status = isNaN(parsedStatus) ? null : parsedStatus;
    } else {
      this.orderFilter.status = null;
    }

    if (params['orderId'] !== undefined && params['orderId'] !== null && params['orderId'] !== '') {
      const parsedId = Number(params['orderId']);
      this.highlightedOrderId = !isNaN(parsedId) && parsedId > 0 ? parsedId : null;
    } else {
      this.highlightedOrderId = null;
    }

    this.orderFilter.search = params['search'] || null;
    if (params['branchId']) {
      this.orderFilter.branchId = Number(params['branchId']);
    } else if (!this.authState.isBranchManager()) {
      this.orderFilter.branchId = null;
    }
    this.orderFilter.companyId = params['companyId'] ? Number(params['companyId']) : null;
    this.orderFilter.curierProfileId = params['curierProfileId'] ? Number(params['curierProfileId']) : null;
    this.orderFilter.dateFrom = params['dateFrom'] || null;
    this.orderFilter.dateTo = params['dateTo'] || null;
    this.orderFilter.paymentStatus = params['paymentStatus'] || 'all';
    this.orderFilter.sortBy = params['sortBy'] || 'createdAt_desc';
    if (params['pageSize']) {
      this.orderFilter.pageSize = Number(params['pageSize']) || 5;
    }
    if (params['page']) {
      const page = Number(params['page']) || 1;
      this.displayedCount = page * (this.orderFilter.pageSize || 5);
    }
  }

  private syncUrlWithFilters(): void {
    const queryParams: any = {};

    if (this.viewMode === 'my') {
      queryParams['tab'] = this.activeTab;
    }
    if (this.orderFilter.status !== null && this.orderFilter.status !== undefined) {
      queryParams['status'] = this.orderFilter.status;
    }
    if (this.orderFilter.search) {
      queryParams['search'] = this.orderFilter.search;
    }
    if (this.orderFilter.branchId && !this.authState.isBranchManager()) {
      queryParams['branchId'] = this.orderFilter.branchId;
    }
    if (this.orderFilter.companyId) {
      queryParams['companyId'] = this.orderFilter.companyId;
    }
    if (this.orderFilter.curierProfileId) {
      queryParams['curierProfileId'] = this.orderFilter.curierProfileId;
    }
    if (this.orderFilter.dateFrom) {
      queryParams['dateFrom'] = this.orderFilter.dateFrom;
    }
    if (this.orderFilter.dateTo) {
      queryParams['dateTo'] = this.orderFilter.dateTo;
    }
    if (this.orderFilter.paymentStatus && this.orderFilter.paymentStatus !== 'all') {
      queryParams['paymentStatus'] = this.orderFilter.paymentStatus;
    }
    if (this.orderFilter.sortBy && this.orderFilter.sortBy !== 'createdAt_desc') {
      queryParams['sortBy'] = this.orderFilter.sortBy;
    }
    const currentPage = Math.ceil(this.displayedCount / (this.orderFilter.pageSize || 5));
    if (currentPage > 1) {
      queryParams['page'] = currentPage;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: '',
      replaceUrl: true
    });
  }

  setViewMode(mode: 'my' | 'all'): void {
    this.viewMode = mode;
    this.closeOverrideMenu();
    this.loadOrders();
  }

  loadCompanies(): void {
    if (this.authState.isSuperAdmin()) {
      this.companyService.getAllCompanies().subscribe({
        next: (companies: Company[]) => {
          this.companies = companies || [];
        },
        error: () => {}
      });
    }
  }

  loadFilterCuriers(): void {
    if (!this.authState.isAdminRole() && !this.authState.isAdminMode()) return;
    this.curierService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        this.mergeFilterCuriers((res?.items || []).map(c => ({ id: c.id, name: c.name })));
      },
      error: () => {}
    });
  }

  private mergeFilterCuriers(items: { id: number; name: string }[]): void {
    const map = new Map<number, { id: number; name: string }>();
    this.filterCuriers.forEach(c => map.set(c.id, c));
    items.forEach(c => {
      if (c.id && !map.has(c.id)) {
        map.set(c.id, c);
      }
    });
    this.filterCuriers = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  loadCustomers(): void {
    if (this.authState.isSuperAdmin() || this.authState.isCompanyAdmin()) {
      this.customerService.getAll().subscribe({
        next: (customers) => {
          (customers || []).forEach(c => {
            this.customersMap.set(c.id, c);
          });
        },
        error: () => {}
      });
    } else {
      // Oddiy mijoz yoki filial mudiri uchun o'z ma'lumotlarini map ga joylash
      const currentCust = this.authState.currentCustomer();
      if (currentCust) {
        this.customersMap.set(currentCust.id, currentCust);
      }
      const user = this.authState.currentUser();
      const customerId = this.authState.currentCustomerId() || user?.userId;
      if (customerId && user) {
        this.customersMap.set(customerId, {
          id: customerId,
          name: user.name,
          email: user.email,
          phoneNumber: '',
          address: '',
          location: ''
        });
      }
    }
  }

  enrichBranchOrdersCustomers(): void {
    if (!this.authState.isBranchManager()) return;
    const missingIds = new Set<number>();
    this.allOrders.forEach(o => {
      const cId = o.customerId || (o as any).userId;
      if (cId && !this.customersMap.has(cId) && !this.inFlightCustomerIds.has(cId)) {
        missingIds.add(cId);
      }
    });
    missingIds.forEach(id => {
      this.inFlightCustomerIds.add(id);
      this.customerService.getById(id).subscribe({
        next: (c) => {
          this.inFlightCustomerIds.delete(id);
          if (c) this.customersMap.set(c.id, c);
        },
        error: () => {
          this.inFlightCustomerIds.delete(id);
        }
      });
    });
  }

  loadBranches(): void {
    this.companyService.getAllBranches().subscribe({
      next: (branches) => {
        if (this.authState.isCompanyAdmin()) {
          const cId = this.authState.userCompanyId();
          this.branches = branches.filter(b => b.companyId === cId);
          this.availableBranches = this.branches;
        } else if (this.authState.isBranchManager()) {
          const bId = this.authState.userBranchId();
          this.branches = branches.filter(b => b.id === bId);
          this.availableBranches = this.branches;
        } else if (this.authState.isSuperAdmin()) {
          this.branches = branches;
          this.availableBranches = branches;
        } else {
          // Oddiy mijoz uchun ham ro'yxatni saqlash
          this.branches = branches;
          this.computeCustomerAvailableBranches();
        }
      },
      error: () => {}
    });
  }

  computeCustomerAvailableBranches(): void {
    if (this.authState.isAdminRole() || this.authState.isAdminMode()) {
      this.availableBranches = this.branches;
      return;
    }
    if (!this.allOrders || this.allOrders.length === 0) {
      this.availableBranches = [];
      return;
    }
    const customerBranchIds = new Set(this.allOrders.map(o => o.companyBranchId).filter(id => !!id));
    this.availableBranches = this.branches.filter(b => customerBranchIds.has(b.id));
  }

  loadOrders(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    if (this.viewMode === 'my') {
      if (!this.authState.isAuthenticated()) {
        this.isLoading = false;
        this.allOrders = [];
        this.orders = [];
        this.filteredOrders = [];
        this.paginatedOrders = [];
        this.activeOrders = [];
        this.pastOrders = [];
        return;
      }
      // Load all orders at once (PageSize=100) for client-side tab splitting
      this.orderService.getMyOrdersPaged(1, 100).subscribe({
        next: (pagedResult) => {
          this.allOrders = pagedResult.items || [];
          this.orders = this.allOrders;
          this.paginatedOrders = this.allOrders;
          this.filteredOrders = this.allOrders;

          // Pagination state (for backwards compat)
          this.totalItems = pagedResult.totalCount || 0;
          this.totalPages = 1;
          this.hasPreviousPage = false;
          this.hasNextPage = false;

          // Split orders into active/past for the new tab system
          this.splitOrdersByType(true);

          this.isLoading = false;
          this.statusCounts = this.orderService.computeStatusCounts(this.allOrders);
          this.computeCustomerAvailableBranches();
          this.loadPaymentsForOrders();
          this.focusTargetOrderIfNeeded();
        },
        error: (err) => {
          console.error('[Orders] Error loading my orders:', err);
          this.isLoading = false;
          this.hasError = true;
          this.allOrders = [];
          this.orders = [];
          this.filteredOrders = [];
          this.paginatedOrders = [];
          this.activeOrders = [];
          this.pastOrders = [];
          this.totalItems = 0;
          this.totalPages = 0;
          this.hasPreviousPage = false;
          this.hasNextPage = false;
          this.statusCounts = { all: 0, pending: 0, confirmed: 0, assigned: 0, shipped: 0, delivered: 0, cancelled: 0, failed: 0 };
          if (err?.status === 403) {
            this.errorMessage = 'Buyurtmalarni ko\'rish uchun ruxsat yo\'q.';
          } else {
            this.errorMessage = 'Buyurtmalarni yuklashda xatolik yuz berdi. Qayta urinib ko\'ring.';
          }
          this.notification.error(this.errorMessage);
        }
      });
    } else {
      if (this.authState.isBranchManager()) {
        const branchId = this.authState.userBranchId() || this.orderFilter.branchId || 0;
        this.orderService.getOrdersByBranchId(branchId).subscribe({
          next: (orders) => {
            this.allOrders = orders || [];
            this.orders = this.allOrders;
            this.isLoading = false;
            this.statusCounts = this.orderService.computeStatusCounts(this.allOrders);
            this.enrichBranchOrdersCustomers();
            this.applyFilters(false);
            this.loadPaymentsForOrders();
            this.focusTargetOrderIfNeeded();
          },
          error: (err) => {
            console.error('[Orders] Error loading orders by branch:', err);
            this.isLoading = false;
            this.hasError = true;
            this.allOrders = [];
            this.orders = [];
            this.filteredOrders = [];
            this.paginatedOrders = [];
            this.errorMessage = err?.status === 403 ? 'Ruxsat yo\'q.' : 'Xatolik yuz berdi.';
          }
        });
      } else {
        this.orderService.getAll().subscribe({
          next: (orders) => {
            if (this.authState.isSuperAdmin()) {
              this.allOrders = orders || [];
            } else {
              const branchIds = this.branches.map(b => b.id);
              this.allOrders = (orders || []).filter(o => branchIds.includes(o.companyBranchId));
            }
            this.orders = this.allOrders;
            this.isLoading = false;
            this.statusCounts = this.orderService.computeStatusCounts(this.allOrders);
            this.enrichBranchOrdersCustomers();
            this.applyFilters(false);
            this.loadPaymentsForOrders();
            this.focusTargetOrderIfNeeded();
          },
          error: (err) => {
            console.error('[Orders] Error loading all orders:', err);
            this.isLoading = false;
            this.hasError = true;
            this.allOrders = [];
            this.orders = [];
            this.filteredOrders = [];
            this.paginatedOrders = [];
            this.errorMessage = err?.status === 403 ? 'Barcha buyurtmalarni ko\'rish uchun ruxsat yo\'q.' : 'Xatolik yuz berdi.';
          }
        });
      }
    }
  }

  // --- Filtering & Pagination methods ---
  applyFilters(syncUrl = true): void {
    if (syncUrl) {
      this.highlightedOrderId = null;
    }

    if (this.viewMode === 'my') {
      this.splitOrdersByType(false);
      if (syncUrl) {
        this.syncUrlWithFilters();
      }
      return;
    }

    // If companyId filter is selected by SuperAdmin, filter by branches of that company
    this.mergeFilterCuriers(
      this.allOrders
        .filter(o => o.curierProfileId && o.curier)
        .map(o => ({ id: o.curierProfileId!, name: o.curier!.name }))
    );

    let targetOrders = [...this.allOrders];
    if (this.orderFilter.companyId && this.authState.isSuperAdmin()) {
      const companyBranchIds = new Set(
        this.branches.filter(b => b.companyId === this.orderFilter.companyId).map(b => b.id)
      );
      targetOrders = targetOrders.filter(o => companyBranchIds.has(o.companyBranchId));
    }

    // Run order filtering logic
    const filterCopy = { ...this.orderFilter, pageSize: 999999, pageNumber: 1 };
    const pagedResult = this.orderService.filterOrders(targetOrders, filterCopy, this.orderPayments);

    this.filteredOrders = pagedResult.items;

    const pageSize = this.orderFilter.pageSize || 5;
    this.totalPages = Math.ceil(this.filteredOrders.length / pageSize) || 1;

    // Slice for client-side pagination (load more)
    this.paginatedOrders = this.filteredOrders.slice(0, this.displayedCount);

    if (syncUrl) {
      this.syncUrlWithFilters();
    }
  }

  onStatusChipSelected(status: OrderStatus | null): void {
    this.orderFilter.status = status;
    this.displayedCount = this.orderFilter.pageSize || 5;
    this.applyFilters(true);
  }

  onFilterChanged(updatedFilter: OrderFilter): void {
    this.orderFilter = { ...updatedFilter };
    this.displayedCount = this.orderFilter.pageSize || 5;
    this.applyFilters(true);
  }

  onFilterReset(): void {
    this.closeOverrideMenu();
    this.orderFilter = {
      status: null,
      search: null,
      branchId: this.authState.isBranchManager() ? this.authState.userBranchId() : null,
      companyId: null,
      curierProfileId: null,
      dateFrom: null,
      dateTo: null,
      paymentStatus: 'all',
      sortBy: 'createdAt_desc',
      pageNumber: 1,
      pageSize: 5
    };
    this.displayedCount = 5;
    this.currentPage = 1;
    this.applyFilters(true);
  }

  loadMore(): void {
    const pageSize = this.orderFilter.pageSize || 5;
    this.displayedCount += pageSize;
    this.applyFilters(true);
  }

  // Server-side pagination metodlari
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadOrders();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  nextPage(): void {
    if (this.hasNextPage) {
      this.goToPage(this.currentPage + 1);
    }
  }

  prevPage(): void {
    if (this.hasPreviousPage) {
      this.goToPage(this.currentPage - 1);
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = Math.min(newSize, 50);
    this.currentPage = 1;
    this.loadOrders();
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToProducts(): void {
    this.router.navigate(['/']);
  }

  loadPaymentsForOrders(): void {
    if (!this.orders || this.orders.length === 0) return;

    this.orders.forEach(o => {
      if (o.payment) {
        this.orderPayments.set(o.id, this.paymentService.normalizePayment(o.payment));
      }
    });

    if (this.authState.isAdminRole() && this.viewMode === 'all') {
      const branchId = this.orderFilter.branchId || undefined;
      this.paymentService.getAllPayments(undefined, branchId).subscribe({
        next: (payments) => {
          (payments || []).forEach(p => {
            this.orderPayments.set(p.orderId, p);
          });
          if (this.orderFilter.paymentStatus && this.orderFilter.paymentStatus !== 'all') {
            this.applyFilters(false);
          }
        },
        error: (err) => {
          console.error('[Orders] Error loading payments:', err);
        }
      });
    } else {
      this.paymentService.getPaymentsByUserId(1, 100).subscribe({
        next: (paged) => {
          (paged?.items || []).forEach(p => {
            this.orderPayments.set(p.orderId, p);
          });
          if (this.orderFilter.paymentStatus && this.orderFilter.paymentStatus !== 'all') {
            this.splitOrdersByType(false);
          }
        },
        error: () => {}
      });
    }
  }

  getPayment(orderId: number): Payment | undefined {
    return this.orderPayments.get(orderId);
  }

  isPaymentPending(payment?: Payment | null): boolean {
    if (!payment) return false;
    return parsePaymentStatus(payment.status) === PaymentStatus.Pending;
  }

  isPaymentCompleted(payment?: Payment | null): boolean {
    if (!payment) return false;
    return parsePaymentStatus(payment.status) === PaymentStatus.Completed;
  }

  isPaymentFailed(payment?: Payment | null): boolean {
    if (!payment) return false;
    return parsePaymentStatus(payment.status) === PaymentStatus.Failed;
  }

  isOrderPending(order?: Order | null): boolean {
    if (!order) return false;
    return parseOrderStatus(order.status) === OrderStatus.Pending;
  }

  getPaymentBadge(status: any): { label: string; color: string; bg: string } {
    return PaymentStatusLabels[status] || PaymentStatusLabels[parsePaymentStatus(status)] || { label: 'Noma\'lum', color: '#6b7280', bg: '#f3f4f6' };
  }

  getOrderPaymentBadge(order: Order): { label: string; color: string; bg: string } {
    const payment = this.getPayment(order.id);
    if (payment) {
      return this.getPaymentBadge(payment.status);
    }
    const status = parseOrderStatus(order.status);
    if (status === OrderStatus.Cancelled || status === OrderStatus.DeliveryFailed) {
      return { label: 'Bekor qilingan', color: '#4b5563', bg: '#e5e7eb' };
    }
    return { label: 'To‘lov qilinmagan', color: '#b45309', bg: '#fef3c7' };
  }

  canCustomerPay(order: Order): boolean {
    // Agar login qilgan user admin, branch manager yoki company admin bo'lsa yoki viewMode 'all' bo'lsa, to'lov tugmasi CHIQMAYDI
    if (this.authState.isAdminRole() || this.authState.isAdminMode() || this.viewMode === 'all') {
      return false;
    }
    // Jo'natildi (Shipped), Yetkazildi (Delivered), Bekor qilindi (Cancelled), DeliveryFailed yoki Tasdiqlangan (Confirmed) holatida to'lov qilish tugmasi ko'rinmaydi
    if (
      order.status === OrderStatus.Shipped ||
      order.status === OrderStatus.Delivered ||
      order.status === OrderStatus.Cancelled ||
      order.status === OrderStatus.DeliveryFailed ||
      order.status === OrderStatus.Confirmed
    ) {
      return false;
    }
    const payment = this.getPayment(order.id);
    if (payment?.paymentMethod === 'Cash' && payment.status === PaymentStatus.Pending) {
      return false;
    }
    return !payment || payment.status === PaymentStatus.Failed || payment.status === PaymentStatus.Pending;
  }

  canAdminReviewPayment(order: Order): boolean {
    if (!this.isStaffOrderView()) return false;
    // Jo'natildi / Yetkazildi / Bekor / Yetkazilmadi holatlarida faqat ko'rish rejimi
    if (!this.isBeforeShipped(order.status)) return false;
    const payment = this.getPayment(order.id);
    // Naqd (Cash) to'lovlarni kuryer yig'adi, admin chek tasdiqlash/rad etish tugmalari yashiriladi
    if (payment && payment.paymentMethod === 'Cash') return false;
    return true;
  }

  getAdminPaymentBtnLabel(order: Order): string {
    const payment = this.getPayment(order.id);
    if (!payment) {
      return this.isOrderPending(order) ? '💵 To‘lovni qabul qilish' : '🔎 To‘lovni ko‘rish';
    }
    const pStatus = parsePaymentStatus(payment.status);
    if (pStatus === PaymentStatus.Pending) {
      return '⏳ To‘lovni tekshirish';
    }
    if (pStatus === PaymentStatus.Completed) {
      return '✅ To‘lov tasdiqlangan';
    }
    if (pStatus === PaymentStatus.Failed) {
      return '⚠️ To‘lov rad etilgan';
    }
    return '💳 To‘lov ma’lumotlari';
  }

  getAdminPaymentBtnClass(order: Order): string {
    const payment = this.getPayment(order.id);
    if (!payment) {
      return 'btn-success';
    }
    const pStatus = parsePaymentStatus(payment.status);
    if (pStatus === PaymentStatus.Pending) {
      return 'btn-warning';
    }
    if (pStatus === PaymentStatus.Completed) {
      return 'btn-secondary';
    }
    if (pStatus === PaymentStatus.Failed) {
      return 'btn-danger';
    }
    return 'btn-secondary';
  }

  getCustomerFullName(order?: Order | null): string {
    if (!order) return '—';
    const id = order.customerId || (order as any).userId;
    if (!id) return 'Nomaʼlum mijoz';

    const customer = this.customersMap.get(id);
    if (customer && customer.name) {
      return `${customer.name} (ID: #${id})`;
    }
    return `Mijoz #${id}`;
  }

  getCustomerDisplayName(order?: Order | null): string {
    if (!order) return '—';
    const id = order.customerId || (order as any).userId;
    if (!id) return 'Nomaʼlum mijoz';

    const customer = this.customersMap.get(id);
    if (customer && customer.name) {
      return `${customer.name} (#${id})`;
    }
    return `Mijoz #${id}`;
  }

  getCustomerPhone(order?: Order | null): string | null {
    if (!order) return null;
    const id = order.customerId || (order as any).userId;
    if (!id) return null;

    const customer = this.customersMap.get(id);
    return customer?.phoneNumber || null;
  }

  formatPaymentDate(dateStr?: string | null, fallbackDateStr?: string | null): string {
    const target = dateStr || fallbackDateStr;
    if (!target) return '—';

    const d = new Date(target);
    // Agar sana noto'g'ri bo'lsa yoki yil <= 1 bo'lsa (0001-01-01 default qiymat)
    if (isNaN(d.getTime()) || d.getFullYear() <= 1) {
      if (fallbackDateStr) {
        const fb = new Date(fallbackDateStr);
        if (!isNaN(fb.getTime()) && fb.getFullYear() > 1) {
          return this.formatDisplayDate(fb);
        }
      }
      return 'Yaqinda yuborilgan';
    }

    return this.formatDisplayDate(d);
  }

  formatDisplayDate(d: Date | string): string {
    try {
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      return dateObj.toLocaleString('uz-UZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(d);
    }
  }

  // --- Customer Pay Modal Actions ---
  openPayModal(order: Order): void {
    this.currentOrderForPay = order;
    this.customerPaymentMethod = 'CardTransfer';
    const existingPayment = this.getPayment(order.id);
    this.currentOrderExistingChekUrl = existingPayment?.chekUrl || null;
    this.selectedFilePreview = existingPayment?.chekUrl 
      ? this.paymentService.getFullImageUrl(existingPayment.chekUrl) 
      : null;
    this.payTransactionNote = existingPayment?.transactionNote || '';
    this.selectedReceiptFile = null;
    this.showPayModal = true;
  }

  closePayModal(): void {
    this.showPayModal = false;
    this.currentOrderForPay = null;
    this.customerPaymentMethod = 'CardTransfer';
    this.selectedReceiptFile = null;
    this.selectedFilePreview = null;
    this.currentOrderExistingChekUrl = null;
    this.payTransactionNote = '';
    this.isSubmittingPay = false;
  }

  copyCardNumber(num: string): void {
    navigator.clipboard.writeText(num);
    this.notification.success('Karta raqami nusxalandi: ' + num);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.handleReceiptFile(file);
    }
  }

  removeSelectedFile(event: Event): void {
    event.stopPropagation();
    this.selectedReceiptFile = null;
    this.selectedFilePreview = null;
    this.currentOrderExistingChekUrl = null;
  }

  private handleReceiptFile(file: File): void {
    if (file.size > 5 * 1024 * 1024) {
      this.notification.error('Fayl hajmi 5MB dan oshmasligi kerak!');
      return;
    }
    this.selectedReceiptFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedFilePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onFileSelected(event: any): void {
    const file = event?.target?.files?.[0];
    if (file) {
      this.handleReceiptFile(file);
    }
  }

  submitPaymentReceipt(): void {
    if (!this.currentOrderForPay) return;

    this.isSubmittingPay = true;
    const order = this.currentOrderForPay;

    if (this.customerPaymentMethod === 'Cash') {
      this.executeCreatePayment(order, undefined);
      return;
    }

    if (this.selectedReceiptFile) {
      this.paymentService.uploadReceipt(this.selectedReceiptFile).subscribe({
        next: (chekUrl) => {
          this.executeCreatePayment(order, chekUrl);
        },
        error: (err) => {
          this.isSubmittingPay = false;
          this.notification.error(err?.error?.message || err?.message || 'Chek rasmini yuklashda xatolik yuz berdi.');
        }
      });
    } else if (this.currentOrderExistingChekUrl) {
      this.executeCreatePayment(order, this.currentOrderExistingChekUrl);
    } else {
      this.isSubmittingPay = false;
      this.notification.error('Iltimos, to‘lov cheki rasmini yuklang!');
    }
  }

  private executeCreatePayment(order: Order, chekUrl?: string): void {
    this.paymentService.createPayment({
      orderId: order.id,
      paymentMethod: this.customerPaymentMethod,
      ...(chekUrl ? { chekUrl } : {}),
      ...(this.payTransactionNote?.trim() ? { transactionNote: this.payTransactionNote.trim() } : {})
    }).subscribe({
      next: (payment) => {
        this.isSubmittingPay = false;
        this.orderPayments.set(order.id, payment);
        this.notification.success(
          this.customerPaymentMethod === 'Cash'
            ? 'Naqd to‘lov tanlandi! Buyurtma yetkazilganda pulni kuryerga topshirasiz.'
            : 'To‘lov cheki muvaffaqiyatli yuborildi! Admin tasdiqlashi kutilmoqda.'
        );
        this.closePayModal();
      },
      error: (err) => {
        this.isSubmittingPay = false;
        this.notification.error(err?.error?.message || err?.message || 'To‘lovni yuborishda xatolik yuz berdi.');
      }
    });
  }

  // --- Admin Review Actions ---
  openAdminPaymentModal(order: Order): void {
    this.adminReviewOrder = order;
    this.adminReviewPayment = this.getPayment(order.id) || null;
    this.adminRejectReason = '';
    this.adminPaymentNote = '';
    this.adminPaymentMethod = 'Cash';
    this.showRejectReasonInput = false;
    this.rejectReasonHasError = false;
    this.showAdminPaymentModal = true;

    if (!this.adminReviewPayment) {
      this.paymentService.getPaymentByOrderId(order.id).subscribe({
        next: (p) => {
          if (p) {
            this.adminReviewPayment = p;
            this.orderPayments.set(order.id, p);
          }
        }
      });
    }

    const cId = order.customerId || (order as any).userId;
    if (cId && !this.customersMap.has(cId)) {
      this.customerService.getById(cId).subscribe({
        next: (cust) => {
          if (cust) this.customersMap.set(cust.id, cust);
        },
        error: () => {}
      });
    }
  }

  closeAdminPaymentModal(): void {
    this.showAdminPaymentModal = false;
    this.adminReviewOrder = null;
    this.adminReviewPayment = null;
    this.showRejectReasonInput = false;
    this.rejectReasonHasError = false;
    this.adminRejectReason = '';
    this.adminPaymentNote = '';
    this.isAdminProcessingPayment = false;
  }

  startRejectMode(): void {
    this.showRejectReasonInput = true;
    this.rejectReasonHasError = false;
    setTimeout(() => {
      const el = document.getElementById('adminRejectReasonInput');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 100);
  }

  cancelRejectMode(): void {
    this.showRejectReasonInput = false;
    this.rejectReasonHasError = false;
  }

  confirmApprovePayment(): void {
    if (!this.adminReviewPayment || this.isAdminProcessingPayment) return;
    const orderId = this.adminReviewPayment.orderId || this.adminReviewOrder?.id;
    if (orderId && this.actionInProgress.has(orderId)) return;

    this.isAdminProcessingPayment = true;
    if (orderId) this.actionInProgress.add(orderId);
    const paymentId = this.adminReviewPayment.id;
    const adminId = this.authState.currentUser()?.userId || this.authState.currentCustomerId() || 1;

    this.paymentService.confirmPayment(paymentId, adminId).subscribe({
      next: (updatedPayment) => {
        this.isAdminProcessingPayment = false;
        this.orderPayments.set(updatedPayment.orderId, updatedPayment);
        this.notification.success('To‘lov muvaffaqiyatli tasdiqlandi! Buyurtma holati yangilandi.');
        this.closeAdminPaymentModal();
        const targetId = orderId || updatedPayment.orderId;
        this.reloadOrder(targetId, () => this.actionInProgress.delete(targetId));
      },
      error: (err) => {
        this.isAdminProcessingPayment = false;
        if (orderId) this.actionInProgress.delete(orderId);
        this.notification.error(this.extractErrorMessage(err, 'To‘lovni tasdiqlashda xatolik yuz berdi.'));
      }
    });
  }

  confirmRejectPayment(): void {
    if (!this.adminReviewPayment || this.isAdminProcessingPayment) return;
    const orderId = this.adminReviewPayment.orderId || this.adminReviewOrder?.id;
    if (orderId && this.actionInProgress.has(orderId)) return;

    if (!this.adminRejectReason || !this.adminRejectReason.trim()) {
      this.rejectReasonHasError = true;
      this.notification.error('Iltimos, rad etish sababini kiriting!');
      const el = document.getElementById('adminRejectReasonInput');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return;
    }

    this.rejectReasonHasError = false;
    this.isAdminProcessingPayment = true;
    if (orderId) this.actionInProgress.add(orderId);
    const paymentId = this.adminReviewPayment.id;
    const adminId = this.authState.currentUser()?.userId || this.authState.currentCustomerId() || 1;

    this.paymentService.rejectPayment({
      paymentId: paymentId,
      reason: this.adminRejectReason.trim()
    }, adminId).subscribe({
      next: (updatedPayment) => {
        this.isAdminProcessingPayment = false;
        this.orderPayments.set(updatedPayment.orderId, updatedPayment);
        this.notification.warning('To‘lov rad etildi.');
        this.closeAdminPaymentModal();
        const targetId = orderId || updatedPayment.orderId;
        this.reloadOrder(targetId, () => this.actionInProgress.delete(targetId));
      },
      error: (err) => {
        this.isAdminProcessingPayment = false;
        if (orderId) this.actionInProgress.delete(orderId);
        this.notification.error(this.extractErrorMessage(err, 'To‘lovni rad etishda xatolik yuz berdi.'));
      }
    });
  }

  confirmCashOrDirectPayment(): void {
    if (!this.adminReviewOrder || this.isAdminProcessingPayment) return;
    const order = this.adminReviewOrder;
    if (this.actionInProgress.has(order.id)) return;

    this.isAdminProcessingPayment = true;
    this.actionInProgress.add(order.id);
    const adminId = this.authState.currentUser()?.userId || this.authState.currentCustomerId() || 1;

    this.paymentService.createPayment({
      orderId: order.id,
      paymentMethod: this.adminPaymentMethod,
      transactionNote: this.adminPaymentNote || (this.adminPaymentMethod === 'Cash' ? 'Filialda naqd pul to‘landi' : 'Filialda terminal orqali to‘landi')
    }).subscribe({
      next: (createdPayment) => {
        this.paymentService.confirmPayment(createdPayment.id, adminId).subscribe({
          next: (confirmedPayment) => {
            this.isAdminProcessingPayment = false;
            this.orderPayments.set(order.id, confirmedPayment);
            this.notification.success(`Buyurtma #${order.id} uchun to‘lov qabul qilindi va tasdiqlandi!`);
            this.closeAdminPaymentModal();
            this.reloadOrder(order.id, () => this.actionInProgress.delete(order.id));
          },
          error: (err) => {
            this.isAdminProcessingPayment = false;
            this.actionInProgress.delete(order.id);
            this.notification.error(this.extractErrorMessage(err, 'To‘lovni tasdiqlashda xatolik yuz berdi.'));
          }
        });
      },
      error: (err) => {
        this.isAdminProcessingPayment = false;
        this.actionInProgress.delete(order.id);
        this.notification.error(this.extractErrorMessage(err, 'To‘lov yaratishda xatolik yuz berdi.'));
      }
    });
  }

  // --- Viewer Modal Actions ---
  openViewReceiptModal(order: Order): void {
    const payment = this.getPayment(order.id);
    if (!payment?.chekUrl) return;
    this.viewingReceiptUrl = this.paymentService.getFullImageUrl(payment.chekUrl);
    this.showReceiptViewerModal = true;
  }

  closeReceiptViewerModal(): void {
    this.showReceiptViewerModal = false;
    this.viewingReceiptUrl = '';
  }

  isPdfUrl(url?: string | null): boolean {
    if (!url) return false;
    return /\.pdf(\?.*)?$/i.test(url.trim());
  }

  canCancel(status: OrderStatus | number): boolean {
    const s = parseOrderStatus(status);
    return s === OrderStatus.Pending || s === OrderStatus.Confirmed || s === OrderStatus.AssignedToCourier;
  }

  isStaffOrderView(): boolean {
    return (this.authState.isAdminRole() || this.authState.isAdminMode()) && this.viewMode === 'all';
  }

  isBeforeShipped(status: any): boolean {
    const s = parseOrderStatus(status);
    return s === OrderStatus.Pending || s === OrderStatus.Confirmed || s === OrderStatus.AssignedToCourier;
  }

  canStaffCancel(order: Order): boolean {
    if (!this.isStaffOrderView()) return false;
    return this.isBeforeShipped(order.status);
  }

  canAssignCurier(order: Order): boolean {
    if (!this.isStaffOrderView() || order.curierProfileId) return false;
    const s = parseOrderStatus(order.status);
    return s === OrderStatus.Pending || s === OrderStatus.Confirmed;
  }

  canReassignCurier(order: Order): boolean {
    if (!this.isStaffOrderView() || !order.curierProfileId) return false;
    return this.isBeforeShipped(order.status);
  }

  canUnassignCurier(order: Order): boolean {
    if (!this.isStaffOrderView() || !order.curierProfileId) return false;
    return this.isBeforeShipped(order.status);
  }

  openAssignCurierModal(order: Order): void {
    if (this.actionInProgress.has(order.id)) return;
    this.orderForAssignCurier = order;
    this.selectedCurierId = 0;
    this.showAssignCurierModal = true;
    this.isLoadingCuriers = true;
    this.curierService.getAll({ pageNumber: 1, pageSize: 100 }).subscribe({
      next: (res) => {
        this.availableCuriers = (res.items || []).filter(c => c.isActive && c.isOnline);
        this.isLoadingCuriers = false;
      },
      error: () => {
        this.availableCuriers = [];
        this.isLoadingCuriers = false;
      }
    });
  }

  closeAssignCurierModal(): void {
    this.showAssignCurierModal = false;
    this.orderForAssignCurier = null;
    this.selectedCurierId = 0;
    this.isAssigningCurier = false;
  }

  confirmAssignCurier(): void {
    if (!this.orderForAssignCurier || !this.selectedCurierId || this.isAssigningCurier) return;
    const orderId = this.orderForAssignCurier.id;
    if (this.actionInProgress.has(orderId)) return;

    const newCurierId = Number(this.selectedCurierId);
    if (this.orderForAssignCurier.curierProfileId === newCurierId) {
      this.notification.warning('Bu kuryer allaqachon ushbu buyurtmaga biriktirilgan.');
      return;
    }

    const wasReassign = !!this.orderForAssignCurier.curierProfileId;
    this.isAssigningCurier = true;
    this.actionInProgress.add(orderId);

    this.orderService.assignCurier({
      orderId,
      curierProfileId: newCurierId
    }).subscribe({
      next: () => {
        this.notification.success(wasReassign ? 'Kuryer muvaffaqiyatli almashtirildi' : 'Kuryer buyurtmaga biriktirildi');
        this.closeAssignCurierModal();
        this.reloadOrder(orderId, () => this.actionInProgress.delete(orderId));
      },
      error: (err) => {
        this.actionInProgress.delete(orderId);
        this.isAssigningCurier = false;
        this.notification.error(this.extractErrorMessage(err, 'Kuryer biriktirishda xatolik'));
      }
    });
  }

  unassignCurierFromOrder(order: Order): void {
    if (this.actionInProgress.has(order.id)) return;
    this.actionInProgress.add(order.id);
    this.orderService.unassignCurier(order.id).subscribe({
      next: () => {
        this.notification.info('Kuryer buyurtmadan olib tashlandi');
        this.reloadOrder(order.id, () => this.actionInProgress.delete(order.id));
      },
      error: (err) => {
        this.actionInProgress.delete(order.id);
        this.notification.error(this.extractErrorMessage(err, 'Kuryerni olib tashlashda xatolik yuz berdi'));
      }
    });
  }

  getCurierVehicleLabel(type: number): string {
    return TransportTypeLabels[type] || 'Transport';
  }

  getCurierVehicleIcon(type: number): string {
    return TransportTypeIcons[type] || '🛵';
  }

  onCurierAvatarError(curierId: number): void {
    this.failedCurierAvatarIds.add(curierId);
  }

  openCurierInfoModal(order: Order): void {
    if (!order?.curier) return;
    this.curierInfoOrder = order;
    this.showCurierInfoModal = true;
  }

  closeCurierInfoModal(): void {
    this.showCurierInfoModal = false;
    this.curierInfoOrder = null;
  }

  openTrackFromCurierModal(): void {
    const order = this.curierInfoOrder;
    this.closeCurierInfoModal();
    if (order) {
      this.openTrackCurierModal(order);
    }
  }

  hasValidCurierPhoto(url?: string | null): boolean {
    if (!url || !url.trim()) return false;
    const lower = url.trim().toLowerCase();
    return !(
      lower.includes('share.google') ||
      lower.includes('pinterest.com/pin/') ||
      lower.includes('google.com/search') ||
      lower.includes('google.com/url')
    );
  }

  getCurierInitials(name?: string | null): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (parts[0]?.slice(0, 2) || 'K').toUpperCase();
  }

  canTrackCurier(order: Order): boolean {
    const isAdmin = this.authState.isAdminRole() || this.authState.isAdminMode();
    if (!isAdmin || !order.curierProfileId) return false;
    return !this.isOrderFinal(order.status) && order.status !== OrderStatus.DeliveryFailed;
  }

  hasDeliveryCoords(order?: Order | null): boolean {
    return !!this.getOrderDeliveryCoords(order);
  }

  get hasAnyTrackMapPoint(): boolean {
    if (!this.trackingOrder) return false;
    return !!(
      this.getCurierCoords(this.trackedCurier) ||
      this.getOrderBranchCoords(this.trackingOrder) ||
      this.getOrderDeliveryCoords(this.trackingOrder)
    );
  }

  private isValidCoord(lat?: number | null, lng?: number | null): boolean {
    if (lat == null || lng == null) return false;
    const nLat = Number(lat);
    const nLng = Number(lng);
    return !isNaN(nLat) && !isNaN(nLng) && !(nLat === 0 && nLng === 0);
  }

  private getCurierCoords(c?: CurierResponseDto | null): MapLocation | null {
    if (!c || !this.isValidCoord(c.latitude, c.longitude)) return null;
    return { latitude: Number(c.latitude), longitude: Number(c.longitude) };
  }

  private getOrderBranchCoords(order?: Order | null): MapLocation | null {
    if (!order?.companyBranchId) return null;
    const branch = this.branches.find(b => b.id === order.companyBranchId);
    if (!branch) return null;
    let lat = branch.latitude != null ? Number(branch.latitude) : NaN;
    let lng = branch.longitude != null ? Number(branch.longitude) : NaN;
    if ((isNaN(lat) || isNaN(lng)) && branch.location) {
      const match = branch.location.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
      if (match) {
        lat = parseFloat(match[1]);
        lng = parseFloat(match[2]);
      }
    }
    return this.isValidCoord(lat, lng) ? { latitude: lat, longitude: lng, address: branch.address } : null;
  }

  private getOrderDeliveryCoords(order?: Order | null): MapLocation | null {
    if (!order || !this.isValidCoord(order.deliveryLatitude, order.deliveryLongitude)) return null;
    return {
      latitude: Number(order.deliveryLatitude),
      longitude: Number(order.deliveryLongitude),
      address: order.deliveryAddress
    };
  }

  private createTrackBadgeIcon(emoji: string, bg: string): L.DivIcon {
    return L.divIcon({
      html: `<div style="width:36px;height:36px;border-radius:50%;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;border:2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.3);">${emoji}</div>`,
      className: 'track-custom-pin',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20]
    });
  }

  getTrackGoogleMapsUrl(): string | null {
    const curierLoc = this.getCurierCoords(this.trackedCurier);
    const branchLoc = this.getOrderBranchCoords(this.trackingOrder);
    const deliveryLoc = this.getOrderDeliveryCoords(this.trackingOrder);
    const origin = curierLoc || branchLoc;
    const dest = deliveryLoc || branchLoc;

    if (origin && dest && (origin.latitude !== dest.latitude || origin.longitude !== dest.longitude)) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}`;
    }
    const single = curierLoc || deliveryLoc || branchLoc;
    return single ? `https://www.google.com/maps?q=${single.latitude},${single.longitude}` : null;
  }

  openTrackCurierModal(order: Order): void {
    this.stopTrackTimer();
    this.destroyTrackCurierMap();
    this.trackSessionId++;
    this.trackingOrder = order;
    this.trackedCurier = null;
    this.trackEstimate = null;
    this.trackLegLabel = '';
    this.trackLastUpdated = null;
    this.showTrackCurierModal = true;
    if (this.hasAnyTrackMapPoint) {
      setTimeout(() => this.renderOrUpdateTrackMap(), 50);
    }
    this.refreshTrackedCurier();
    this.trackTimer = setInterval(() => this.refreshTrackedCurier(), 10000);
  }

  refreshTrackedCurier(): void {
    const order = this.trackingOrder;
    const curierId = order?.curierProfileId;
    if (!curierId || !order) return;
    const sessionId = this.trackSessionId;
    this.isLoadingTrack = true;
    this.curierService.getById(curierId).subscribe({
      next: (c) => {
        if (sessionId !== this.trackSessionId) return;
        this.trackedCurier = c;
        this.trackLastUpdated = new Date();
        this.isLoadingTrack = false;
        if (this.hasAnyTrackMapPoint) {
          setTimeout(() => this.renderOrUpdateTrackMap(), 50);
        }
      },
      error: () => {
        if (sessionId !== this.trackSessionId) return;
        this.isLoadingTrack = false;
        if (this.hasAnyTrackMapPoint) {
          setTimeout(() => this.renderOrUpdateTrackMap(), 50);
        }
      }
    });
  }

  private renderOrUpdateTrackMap(): void {
    const order = this.trackingOrder;
    const el = document.getElementById('order-curier-track-map');
    if (!el || !order) return;

    const c = this.trackedCurier;
    const curierLoc = this.getCurierCoords(c);
    const branchLoc = this.getOrderBranchCoords(order);
    const deliveryLoc = this.getOrderDeliveryCoords(order);

    const allPoints: MapLocation[] = [branchLoc, curierLoc, deliveryLoc].filter((p): p is MapLocation => !!p);
    if (allPoints.length === 0) return;

    const first = curierLoc || deliveryLoc || branchLoc!;
    if (!this.trackMap) {
      this.trackMap = L.map(el).setView([first.latitude, first.longitude], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(this.trackMap);
      this.trackMap.invalidateSize();
    }

    // 1. Filial markeri
    if (branchLoc && !this.trackBranchMarker) {
      const branch = this.branches.find(b => b.id === order.companyBranchId);
      const bName = this.mapService.escapeHtml(branch?.name || 'Filial');
      const bAddr = branch?.address ? `<br><small>${this.mapService.escapeHtml(branch.address)}</small>` : '';
      this.trackBranchMarker = L.marker([branchLoc.latitude, branchLoc.longitude], {
        icon: this.createTrackBadgeIcon('🏢', '#4f46e5')
      })
        .addTo(this.trackMap)
        .bindPopup(`🏢 <strong>${bName}</strong>${bAddr}`);
    }

    // 2. Yetkazish manzili markeri
    if (deliveryLoc && !this.trackDeliveryMarker) {
      const dAddr = order.deliveryAddress ? `<br><small>${this.mapService.escapeHtml(order.deliveryAddress)}</small>` : '';
      this.trackDeliveryMarker = L.marker([deliveryLoc.latitude, deliveryLoc.longitude], {
        icon: this.createTrackBadgeIcon('🏠', '#ef4444')
      })
        .addTo(this.trackMap)
        .bindPopup(`🏠 <strong>Yetkazish manzili</strong>${dAddr}`);
    }

    // 3. Kuryer markeri (jonli yangilanadi)
    if (curierLoc && c) {
      const curierBg = c.isOnline ? '#16a34a' : '#64748b';
      const curierEmoji = this.getCurierVehicleIcon(c.vehicleType);
      const safeCName = this.mapService.escapeHtml(c.name || 'Kuryer');
      const safeCPhone = this.mapService.escapeHtml(c.phoneNumber || '');
      const popupHtml = `${curierEmoji} <strong>${safeCName}</strong><br>${safeCPhone}<br><small>${c.isOnline ? '🟢 Online' : '⚫ Offline'}</small>`;
      if (!this.trackCurierMarker) {
        this.trackCurierMarker = L.marker([curierLoc.latitude, curierLoc.longitude], {
          icon: this.createTrackBadgeIcon(curierEmoji, curierBg),
          zIndexOffset: 500
        })
          .addTo(this.trackMap)
          .bindPopup(popupHtml);
      } else {
        this.trackCurierMarker.setLatLng([curierLoc.latitude, curierLoc.longitude]);
        this.trackCurierMarker.setIcon(this.createTrackBadgeIcon(curierEmoji, curierBg));
        this.trackCurierMarker.setPopupContent(popupHtml);
      }
    }

    if (!this.trackBoundsFitted && allPoints.length > 0) {
      if (allPoints.length === 1) {
        this.trackMap.setView([allPoints[0].latitude, allPoints[0].longitude], 15);
      } else {
        this.trackMap.fitBounds(
          allPoints.map(p => [p.latitude, p.longitude] as [number, number]),
          { padding: [45, 45], maxZoom: 16 }
        );
      }
      this.trackBoundsFitted = true;
    }

    this.updateTrackRouteAndEta(order, c, curierLoc, branchLoc, deliveryLoc);
  }

  private async updateTrackRouteAndEta(
    order: Order,
    curier: CurierResponseDto | null,
    curierLoc: MapLocation | null,
    branchLoc: MapLocation | null,
    deliveryLoc: MapLocation | null
  ): Promise<void> {
    let points: MapLocation[] = [];
    let includePickupBuffer = false;
    let legLabel = '';

    if (curierLoc && deliveryLoc) {
      if (order.status === OrderStatus.Shipped || !branchLoc) {
        points = [curierLoc, deliveryLoc];
        legLabel = 'Kuryer → Yetkazish manzili';
      } else {
        const toBranchKm = this.mapService.calculateDistance(curierLoc, branchLoc);
        if (toBranchKm < 0.25) {
          points = [branchLoc, deliveryLoc];
          legLabel = 'Filial (olish +5 daq) → Yetkazish manzili';
        } else {
          points = [curierLoc, branchLoc, deliveryLoc];
          legLabel = 'Kuryer → Filial → Yetkazish manzili';
        }
        includePickupBuffer = true;
      }
    } else if (branchLoc && deliveryLoc) {
      points = [branchLoc, deliveryLoc];
      includePickupBuffer = order.status !== OrderStatus.Shipped;
      legLabel = 'Filial → Yetkazish manzili (kuryer GPS kutilmoqda)';
    } else if (curierLoc && branchLoc) {
      points = [curierLoc, branchLoc];
      legLabel = 'Kuryer ↔ Filial';
    } else {
      this.trackEstimate = null;
      this.trackLegLabel = '';
      return;
    }

    this.trackLegLabel = legLabel;
    const routeKey = `${order.id}:${order.status}:${points.length}:${curier?.vehicleType ?? 'x'}`;
    const curierMoved =
      !curierLoc ||
      !this.lastRouteCurierLoc ||
      this.mapService.calculateDistance(curierLoc, this.lastRouteCurierLoc) >= 0.05;

    if (this.lastRouteKey === routeKey && !curierMoved && this.trackEstimate) {
      return;
    }

    this.lastRouteKey = routeKey;
    this.lastRouteCurierLoc = curierLoc ? { ...curierLoc } : null;
    const sessionId = this.trackSessionId;

    const estimate = await this.mapService.estimateRoute(points, curier?.vehicleType, includePickupBuffer);
    if (sessionId !== this.trackSessionId || !this.showTrackCurierModal || !this.trackMap) {
      return;
    }

    this.trackEstimate = estimate;
    if (this.trackRouteLayer) {
      this.trackRouteLayer.remove();
      this.trackRouteLayer = undefined;
    }
    if (estimate.geometry.length >= 2) {
      this.trackRouteLayer = L.polyline(estimate.geometry, {
        color: '#4f46e5',
        weight: 4,
        opacity: 0.85,
        dashArray: estimate.isRoadRoute ? undefined : '8, 8'
      }).addTo(this.trackMap);
    }
  }

  private stopTrackTimer(): void {
    if (this.trackTimer) {
      clearInterval(this.trackTimer);
      this.trackTimer = null;
    }
  }

  private destroyTrackCurierMap(): void {
    if (this.trackRouteLayer) {
      this.trackRouteLayer.remove();
      this.trackRouteLayer = undefined;
    }
    if (this.trackMap) {
      this.trackMap.remove();
      this.trackMap = undefined;
    }
    this.trackCurierMarker = undefined;
    this.trackBranchMarker = undefined;
    this.trackDeliveryMarker = undefined;
    this.trackBoundsFitted = false;
    this.lastRouteKey = '';
    this.lastRouteCurierLoc = null;
  }

  closeTrackCurierModal(): void {
    this.trackSessionId++;
    this.stopTrackTimer();
    this.destroyTrackCurierMap();
    this.showTrackCurierModal = false;
    this.trackingOrder = null;
    this.trackedCurier = null;
    this.trackEstimate = null;
    this.trackLegLabel = '';
    this.trackLastUpdated = null;
  }

  getBranchName(branchId: number): string {
    const branch = this.branches.find(b => b.id === branchId);
    return branch ? (branch.name || branch.address || `Filial #${branchId}`) : `Filial #${branchId}`;
  }

  hasBranchCoords(branchId: number): boolean {
    const branch = this.branches.find(b => b.id === branchId);
    if (!branch) return false;
    let lat = branch.latitude != null ? Number(branch.latitude) : undefined;
    let lng = branch.longitude != null ? Number(branch.longitude) : undefined;
    if ((lat == null || isNaN(lat) || lng == null || isNaN(lng)) && branch.location) {
      const match = branch.location.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
      if (match) {
        lat = parseFloat(match[1]);
        lng = parseFloat(match[2]);
      }
    }
    return lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
  }

  openCancelModal(order: Order): void {
    if (this.actionInProgress.has(order.id)) return;
    this.orderToCancel = order;
    this.cancelReason = '';
    this.cancelReasonError = false;
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.orderToCancel = null;
    this.cancelReason = '';
    this.cancelReasonError = false;
  }

  confirmCancelOrder(): void {
    if (!this.orderToCancel || this.isCancelling) return;
    const orderId = this.orderToCancel.id;
    if (this.actionInProgress.has(orderId)) return;

    const reason = this.cancelReason.trim();
    if (this.isStaffOrderView() && !reason) {
      this.cancelReasonError = true;
      this.notification.error("Iltimos, bekor qilish sababini kiriting!");
      return;
    }

    this.cancelReasonError = false;
    this.isCancelling = true;
    this.actionInProgress.add(orderId);

    this.orderService.cancelOrder(orderId).subscribe({
      next: () => {
        this.isCancelling = false;
        this.notification.success(
          reason
            ? `#${orderId}-buyurtma bekor qilindi. Sabab: ${reason}`
            : `#${orderId}-buyurtma muvaffaqiyatli bekor qilindi.`
        );
        this.closeCancelModal();
        this.reloadOrder(orderId, () => this.actionInProgress.delete(orderId));
      },
      error: (err) => {
        this.isCancelling = false;
        this.actionInProgress.delete(orderId);
        this.notification.error(this.extractErrorMessage(err, 'Buyurtmani bekor qilishda xatolik yuz berdi.'));
      }
    });
  }

  // ========== Comment Modal Methods ==========

  canLeaveComment(order: Order): boolean {
    // Faqat mijoz (admin emas) va faqat yetkazilgan buyurtmalar uchun
    if (this.authState.isAdminMode() || this.authState.isAdminRole()) return false;
    const s = parseOrderStatus(order.status);
    return s === OrderStatus.Delivered;
  }

  openCommentModal(order: Order): void {
    this.orderForComment = order;
    this.selectedProductForComment = null;
    this.commentStarRating = 5;
    this.commentContent = '';
    this.showCommentModal = true;
  }

  closeCommentModal(): void {
    this.showCommentModal = false;
    this.orderForComment = null;
    this.selectedProductForComment = null;
  }

  selectProductForComment(item: OrderItem): void {
    this.selectedProductForComment = item;
  }

  setCommentRating(star: number): void {
    this.commentStarRating = star;
  }

  submitComment(): void {
    if (!this.selectedProductForComment || !this.commentContent || this.commentContent.length < 3) {
      return;
    }

    const userId = this.authState.currentUser()?.userId || this.authState.currentCustomerId();
    if (!userId) {
      this.notification.error("Sharh qoldirish uchun tizimga kiring!");
      return;
    }

    this.isSubmittingComment = true;

    const dto: CreateCommentDto = {
      productId: this.selectedProductForComment.productId,
      userId: userId,
      content: this.commentContent,
      starRating: this.commentStarRating
    };

    console.log('Sending comment DTO:', dto);

    this.commentService.create(dto).subscribe({
      next: (result) => {
        this.isSubmittingComment = false;
        if (result && result.id) {
          this.notification.success("Sharhingiz muvaffaqiyatli qabul qilindi!");
          this.closeCommentModal();
        } else {
          this.notification.error("Sharh saqlanmadi. Qaytadan urinib ko'ring.");
        }
      },
      error: (err) => {
        this.isSubmittingComment = false;
        const errorMsg = err?.message || err?.error?.message || "Sharh qo'shishda xatolik yuz berdi.";
        this.notification.error(errorMsg);
        console.error('Comment create error:', err);
      }
    });
  }

  // ========================================

  parseStatus(status: any): OrderStatus {
    return parseOrderStatus(status);
  }

  isOrderFinal(status: any): boolean {
    const s = parseOrderStatus(status);
    return s === OrderStatus.Delivered || s === OrderStatus.Cancelled;
  }

  getStatusLabel(status: any): string {
    const s = parseOrderStatus(status);
    const labels: Record<number, string> = {
      [OrderStatus.Pending]: 'Kutilmoqda',
      [OrderStatus.Confirmed]: 'Tasdiqlangan',
      [OrderStatus.AssignedToCourier]: 'Kuryerga biriktirilgan',
      [OrderStatus.Shipped]: "Jo'natildi",
      [OrderStatus.Delivered]: 'Yetkazildi',
      [OrderStatus.Cancelled]: 'Bekor qilindi',
      [OrderStatus.DeliveryFailed]: "Yetkazib bo'lmadi"
    };
    return labels[s] || "Noma'lum";
  }

  hasPaymentMismatch(order: Order): boolean {
    return !!this.getPaymentMismatchMessage(order);
  }

  getPaymentMismatchMessage(order: Order): string | null {
    const s = parseOrderStatus(order.status);
    const payment = this.getPayment(order.id) || (order.payment ? this.paymentService.normalizePayment(order.payment) : undefined);
    const ps = payment ? parsePaymentStatus(payment.status) : null;
    const statusLabel = this.getStatusLabel(order.status);
    const payLabel = payment ? this.getPaymentBadge(payment.status).label : "To'lov qilinmagan";

    // Yetkazildi, lekin to'lov tasdiqlanmagan
    if (s === OrderStatus.Delivered) {
      if (!payment || ps !== PaymentStatus.Completed) {
        return `Nomuvofiqlik: Buyurtma "${statusLabel}", lekin to'lov "${payLabel}"!`;
      }
      return null;
    }

    // Jo'natildi, lekin to'lov rad etilgan/bekor/qaytarilgan yoki naqdsiz to'lov hali tasdiqlanmagan
    if (s === OrderStatus.Shipped) {
      if (ps === PaymentStatus.Failed || ps === PaymentStatus.Cancelled || ps === PaymentStatus.Refunded) {
        return `Nomuvofiqlik: Buyurtma "${statusLabel}", lekin to'lov "${payLabel}"!`;
      }
      if ((!payment || ps === PaymentStatus.Pending) && payment?.paymentMethod !== 'Cash') {
        return `Nomuvofiqlik: Buyurtma "${statusLabel}", lekin to'lov "${payLabel}"!`;
      }
      return null;
    }

    // Bekor qilindi / Yetkazilmadi, lekin to'lov hali Tasdiqlangan
    if (s === OrderStatus.Cancelled || s === OrderStatus.DeliveryFailed) {
      if (ps === PaymentStatus.Completed) {
        return `Nomuvofiqlik: Buyurtma "${statusLabel}", lekin to'lov hali "${payLabel}"!`;
      }
      return null;
    }

    // Tasdiqlangan / Kuryerda, lekin to'lov rad etilgan / bekor / qaytarilgan
    if (s === OrderStatus.Confirmed || s === OrderStatus.AssignedToCourier) {
      if (ps === PaymentStatus.Failed || ps === PaymentStatus.Cancelled || ps === PaymentStatus.Refunded) {
        return `Nomuvofiqlik: Buyurtma "${statusLabel}", lekin to'lov "${payLabel}"!`;
      }
      return null;
    }

    // Kutilmoqda, lekin to'lov allaqachon Tasdiqlangan
    if (s === OrderStatus.Pending && ps === PaymentStatus.Completed) {
      return `Nomuvofiqlik: To'lov "${payLabel}", lekin buyurtma hali "${statusLabel}" holatida!`;
    }

    return null;
  }

  canSuperAdminOverride(order: Order): boolean {
    return this.authState.isSuperAdmin() && !this.isOrderFinal(order.status);
  }

  toggleOverrideMenu(order: Order): void {
    if (this.overrideMenuOrderId === order.id) {
      this.closeOverrideMenu();
    } else {
      this.overrideMenuOrderId = order.id;
      this.overrideNewStatus = null;
      this.overrideReason = '';
      this.overrideError = false;
    }
  }

  closeOverrideMenu(): void {
    this.overrideMenuOrderId = null;
    this.overrideNewStatus = null;
    this.overrideReason = '';
    this.overrideError = false;
  }

  submitOverrideStatus(order: Order): void {
    if (this.actionInProgress.has(order.id)) return;

    if (this.overrideNewStatus === null || this.overrideNewStatus === undefined) {
      this.overrideError = true;
      this.notification.error("Iltimos, yangi statusni tanlang!");
      return;
    }

    const reason = this.overrideReason.trim();
    if (!reason) {
      this.overrideError = true;
      this.notification.error("Qo'lda o'zgartirish uchun sabab kiritish majburiy!");
      return;
    }

    const newStatus = parseOrderStatus(this.overrideNewStatus);
    if (newStatus === parseOrderStatus(order.status)) {
      this.overrideError = true;
      this.notification.warning("Buyurtma allaqachon tanlangan statusda.");
      return;
    }

    this.overrideError = false;
    this.actionInProgress.add(order.id);

    this.orderService.updateStatus(order.id, newStatus).subscribe({
      next: () => {
        this.notification.success(`#${order.id} statusi "${this.getStatusLabel(newStatus)}" ga o'zgartirildi. Sabab: ${reason}`);
        this.closeOverrideMenu();
        this.reloadOrder(order.id, () => this.actionInProgress.delete(order.id));
      },
      error: (err) => {
        this.actionInProgress.delete(order.id);
        this.notification.error(this.extractErrorMessage(err, "Statusni qo'lda o'zgartirishda xatolik yuz berdi."));
      }
    });
  }

  private reloadOrder(orderId: number, onDone?: () => void): void {
    this.orderService.getById(orderId).subscribe({
      next: (freshOrder) => {
        if (!freshOrder) {
          onDone?.();
          this.loadOrders();
          return;
        }
        const replaceItem = (list: Order[]) => list.map(o => (o.id === orderId ? freshOrder : o));
        this.allOrders = replaceItem(this.allOrders);
        this.orders = replaceItem(this.orders);
        if (freshOrder.payment) {
          this.orderPayments.set(orderId, this.paymentService.normalizePayment(freshOrder.payment));
        }
        this.statusCounts = this.orderService.computeStatusCounts(this.allOrders);
        if (this.viewMode === 'my') {
          this.splitOrdersByType(false);
        } else {
          this.applyFilters(false);
        }
        onDone?.();
      },
      error: () => {
        onDone?.();
        this.loadOrders();
      }
    });
  }

  private extractErrorMessage(err: any, fallback: string): string {
    return err?.error?.message || err?.message || fallback;
  }
}
