import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { CompanyService } from '../../../core/services/company.service';
import { CustomerService } from '../../../core/services/customer.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CompanyBranch, UpdateCompanyBranchDto } from '../../../core/models/company-branch.model';
import { Product } from '../../../core/models/product.model';
import { Customer } from '../../../core/models/customer.model';
import { Category } from '../../../core/models/category.model';
import { Order, OrderStatus } from '../../../core/models/order.model';
import { CategoryService } from '../../../core/services/category.service';
import { OrderService } from '../../../core/services/order.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { MapViewComponent } from '../../../shared/components/map-view/map-view.component';
import { StatCardComponent } from '../../../shared/components/dashboard/stat-card/stat-card.component';
import { ChartCardComponent, DonutSlice, BarDataPoint } from '../../../shared/components/dashboard/chart-card/chart-card.component';

@Component({
  selector: 'app-branch-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    LoadingSpinnerComponent,
    MapViewComponent,
    StatCardComponent,
    ChartCardComponent
  ],
  template: `
    <div class="branch-detail-wrapper" *ngIf="branch">
      <!-- Top Navigation & Compact Header Bar -->
      <div class="branch-header-bar card">
        <div class="header-left-col">
          <div class="header-top-row">
            <a *ngIf="authState.isBranchManager()" routerLink="/admin" class="back-link">
              &larr; Admin Panelga qaytish
            </a>
            <a *ngIf="!authState.isBranchManager()" [routerLink]="['/companies', branch.companyId]" class="back-link">
              &larr; Kompaniyaga qaytish
            </a>
          </div>

          <div class="branch-identity-row">
            <div class="branch-avatar">🏬</div>
            <div class="branch-title-block">
              <div class="branch-title-line">
                <h1 class="branch-title">{{ branch.name }}</h1>
                <span class="branch-id-badge">#{{ branch.id }}</span>
                <span class="loc-badge" *ngIf="branch.location">🌐 {{ branch.location }}</span>
              </div>
              <div class="branch-chips-line">
                <span class="info-chip" title="Filial manzili">
                  <span class="chip-icon">📍</span>
                  <span class="chip-text">{{ branch.address }}</span>
                </span>
                <span class="info-chip" *ngIf="branch.phoneNumber" title="Telefon raqami">
                  <span class="chip-icon">📞</span>
                  <span class="chip-text">{{ branch.phoneNumber }}</span>
                </span>
                <button 
                  type="button" 
                  class="action-chip loc-btn" 
                  (click)="setTab('location')"
                  title="Filial joylashuvini xaritada ko'rish"
                >
                  <span class="chip-icon">🗺️</span>
                  <span>Joylashuv</span>
                </button>
                <a 
                  *ngIf="branch.latitude && branch.longitude" 
                  [href]="'https://www.google.com/maps/dir/?api=1&destination=' + branch.latitude + ',' + branch.longitude"
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="action-chip route-btn"
                  title="Google Maps orqali yo'nalish olish"
                >
                  <span class="chip-icon">🧭</span>
                  <span>Yo'nalish</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Admin Actions Right -->
        <div class="header-right-actions" *ngIf="authState.isAdminMode() && !authState.isBranchManager()">
          <button class="btn btn-outline-primary btn-sm" (click)="openAssignModal()" title="Filialga mudir tayinlash">
            <span>👤</span> Mudir Tayinlash
          </button>
          <button class="btn btn-secondary btn-sm" (click)="openEditModal()" title="Filial maʻlumotlarini tahrirlash">
            <span>✏️</span> Tahrirlash
          </button>
          <button class="btn btn-danger btn-sm" *ngIf="authState.isSuperAdmin()" (click)="deleteBranch()" title="Filialni oʻchirish">
            <span>🗑️</span> Oʻchirish
          </button>
        </div>
      </div>

      <app-loading-spinner *ngIf="isLoading" message="Filial maʻlumotlari yuklanmoqda..."></app-loading-spinner>

      <div class="branch-content" *ngIf="!isLoading">
        <!-- 4 KPI Stat Cards -->
        <div class="kpi-grid">
          <app-stat-card
            label="Jami Mahsulotlar"
            icon="📦"
            [value]="products.length"
            unit="ta"
            [growth]="12"
            timeframe="ombor qoldig'i"
            theme="blue"
            [isClickable]="true"
            (click)="setTab('products')"
          ></app-stat-card>

          <app-stat-card
            label="Filial Buyurtmalari"
            icon="📋"
            [value]="branchOrdersCount !== null ? branchOrdersCount : 0"
            unit="ta"
            [growth]="8"
            timeframe="oxirgi haftada"
            theme="purple"
            [isClickable]="true"
            (click)="setTab('analytics')"
          ></app-stat-card>

          <app-stat-card
            label="Filial Tushumi"
            icon="💰"
            [value]="formattedBranchRevenue"
            [unit]="revenueUnit"
            [growth]="23"
            timeframe="ushbu oyda"
            theme="emerald"
            [isClickable]="true"
            (click)="setTab('analytics')"
          ></app-stat-card>

          <app-stat-card
            label="Faol Xodimlar"
            icon="👥"
            [value]="branchUsers.length"
            unit="nafar"
            [growth]="0"
            timeframe="biriktirilgan"
            theme="amber"
            [isClickable]="true"
            (click)="setTab('users')"
          ></app-stat-card>
        </div>

        <!-- Navigation Tabs -->
        <div class="custom-tabs">
          <button 
            class="tab-btn" 
            [class.active]="activeTab === 'products'" 
            (click)="setTab('products')"
          >
            <span class="tab-icon">📦</span>
            <span>Mahsulotlar</span>
            <span class="tab-badge">{{ products.length }}</span>
          </button>

          <button 
            class="tab-btn" 
            [class.active]="activeTab === 'users'" 
            (click)="setTab('users')"
          >
            <span class="tab-icon">👥</span>
            <span>Xodimlar</span>
            <span class="tab-badge">{{ branchUsers.length }}</span>
          </button>

          <button 
            class="tab-btn" 
            [class.active]="activeTab === 'analytics'" 
            (click)="setTab('analytics')"
          >
            <span class="tab-icon">📊</span>
            <span>Analitika</span>
            <span class="tab-badge" *ngIf="branchOrdersCount">{{ branchOrdersCount }}</span>
          </button>

          <button 
            class="tab-btn" 
            [class.active]="activeTab === 'comments'" 
            (click)="setTab('comments')"
          >
            <span class="tab-icon">⭐</span>
            <span>Sharhlar</span>
            <span class="tab-badge">0</span>
          </button>

          <button 
            class="tab-btn" 
            [class.active]="activeTab === 'location'" 
            (click)="setTab('location')"
          >
            <span class="tab-icon">🗺️</span>
            <span>Joylashuv</span>
          </button>
        </div>

        <!-- TAB 1: Products -->
        <div class="tab-content card" *ngIf="activeTab === 'products'">
          <div class="tab-header-row">
            <div>
              <h3 class="tab-section-title">Filial Mahsulotlari (Ombor Qoldigʻi)</h3>
              <p class="tab-section-subtitle">Ushbu filialda sotuvda mavjud boʻlgan tovarlar va zaxira nazorati</p>
            </div>

            <div class="table-search-box" *ngIf="products.length > 0">
              <span class="search-ico">🔍</span>
              <input 
                type="text" 
                [(ngModel)]="productSearch" 
                placeholder="Nomi boʻyicha qidiruv..." 
                class="search-input"
              />
              <button *ngIf="productSearch" class="clear-btn" (click)="productSearch = ''">&times;</button>
            </div>
          </div>

          <!-- 5. STOCK HEALTH WIDGET -->
          <div class="stock-health-widget" *ngIf="products.length > 0">
            <div class="health-header-row">
              <div class="health-title-col">
                <div class="health-icon-badge" [ngClass]="stockHealthThemeClass">{{ stockHealthIcon }}</div>
                <div>
                  <h4 class="health-title">Ombor Salomatligi Holati (Stock Health)</h4>
                  <p class="health-desc">{{ stockHealthDescription }}</p>
                </div>
              </div>
              <div class="health-score-badge" [ngClass]="stockHealthThemeClass">
                <span class="health-score-text">{{ stockHealthStatusLabel }}</span>
                <span class="health-score-num">{{ stockHealthPercent }}%</span>
              </div>
            </div>

            <div class="health-bar-track">
              <div 
                class="health-bar-fill" 
                [style.width.%]="stockHealthPercent"
                [ngClass]="stockHealthThemeClass"
              ></div>
            </div>

            <div class="health-chips-row">
              <button 
                type="button" 
                class="health-filter-chip" 
                [class.active]="stockFilter === 'all'"
                (click)="stockFilter = 'all'"
              >
                <span>Barchasi:</span>
                <strong>{{ products.length }} ta</strong>
              </button>
              <button 
                type="button" 
                class="health-filter-chip chip-green" 
                [class.active]="stockFilter === 'adequate'"
                (click)="stockFilter = 'adequate'"
              >
                <span class="dot-indicator dot-green"></span>
                <span>Yetarli (>20):</span>
                <strong>{{ adequateProductsCount }} ta</strong>
              </button>
              <button 
                type="button" 
                class="health-filter-chip chip-yellow" 
                [class.active]="stockFilter === 'low'"
                (click)="stockFilter = 'low'"
              >
                <span class="dot-indicator dot-yellow"></span>
                <span>Kam qolgan (10-20):</span>
                <strong>{{ lowProductsCount }} ta</strong>
              </button>
              <button 
                type="button" 
                class="health-filter-chip chip-red" 
                [class.active]="stockFilter === 'critical'"
                (click)="stockFilter = 'critical'"
              >
                <span class="dot-indicator dot-red"></span>
                <span>Kritik (<10):</span>
                <strong>{{ criticalProductsCount }} ta</strong>
              </button>
              <button 
                type="button" 
                class="health-filter-chip chip-gray" 
                [class.active]="stockFilter === 'out'"
                (click)="stockFilter = 'out'"
              >
                <span class="dot-indicator dot-gray"></span>
                <span>Tugagan (0):</span>
                <strong>{{ outOfStockCount }} ta</strong>
              </button>
            </div>
          </div>

          <div *ngIf="isProductsLoading" class="tab-loading">Mahsulotlar yuklanmoqda...</div>

          <div class="table-responsive" *ngIf="!isProductsLoading && filteredProducts.length > 0">
            <table class="table custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Mahsulot Nomi</th>
                  <th>Holati</th>
                  <th>Narxi</th>
                  <th>Ombordagi Qoldiq</th>
                  <th>Sana</th>
                  <th class="text-right">Amal</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  *ngFor="let p of filteredProducts"
                  [class.critical-stock-row]="p.quantity > 0 && p.quantity < 10"
                  [class.out-of-stock-row]="p.quantity <= 0"
                  [class.low-stock-row]="p.quantity >= 10 && p.quantity <= 20"
                >
                  <td class="fw-bold">#{{ p.id }}</td>
                  <td class="prod-name-cell">
                    <span class="prod-name-text">{{ p.name }}</span>
                  </td>
                  <td>
                    <span class="status-indicator-pill" [ngClass]="getStatusPillClass(p.quantity)">
                      <span class="indicator-dot" [ngClass]="getStatusDotClass(p.quantity)"></span>
                      <span>{{ getStatusLabel(p.quantity) }}</span>
                    </span>
                  </td>
                  <td class="fw-bold price-cell">{{ p.price | number:'1.0-0' }} soʻm</td>
                  <td>
                    <span class="stock-badge" [ngClass]="getStockBadgeClass(p.quantity)">
                      {{ p.quantity > 0 ? (p.quantity + ' dona') : 'Tugagan (0)' }}
                    </span>
                  </td>
                  <td class="date-cell">{{ p.createdAt ? (p.createdAt | date:'dd.MM.yyyy') : '—' }}</td>
                  <td class="text-right">
                    <a [routerLink]="['/products', p.id]" class="btn btn-outline-primary btn-xs">
                      👁️ Koʻrish
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="!isProductsLoading && products.length === 0" class="empty-tab-state">
            <div class="empty-icon">📦</div>
            <h4>Filialda mahsulotlar mavjud emas</h4>
            <p>Ushbu filial omboriga hozircha tovarlar biriktirilmagan.</p>
          </div>

          <div *ngIf="!isProductsLoading && products.length > 0 && filteredProducts.length === 0" class="empty-tab-state">
            <h4>Qidiruv boʻyicha mahsulot topilmadi</h4>
            <p>Boshqa qidiruv soʻzini yoki filtrni tanlang.</p>
            <button class="btn btn-outline-primary btn-sm mt-2" (click)="stockFilter = 'all'; productSearch = ''">
              Filtrni tozalash
            </button>
          </div>
        </div>

        <!-- TAB 2: Users & Managers -->
        <div class="tab-content card" *ngIf="activeTab === 'users'">
          <div class="tab-header-row">
            <div>
              <h3 class="tab-section-title">Filial Mudirlari va Xodimlari</h3>
              <p class="tab-section-subtitle">Ushbu filial faoliyatini boshqaruvchi masʻul shaxslar</p>
            </div>
            <button class="btn btn-primary btn-sm" (click)="openAssignModal()" *ngIf="authState.isAdminMode()">
              <span>👤</span> Mudir Tayinlash
            </button>
          </div>

          <div *ngIf="isUsersLoading" class="tab-loading">Xodimlar yuklanmoqda...</div>

          <div class="table-responsive" *ngIf="!isUsersLoading && branchUsers.length > 0">
            <table class="table custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ismi</th>
                  <th>Email</th>
                  <th>Telefon</th>
                  <th>Roli</th>
                  <th *ngIf="authState.isAdminMode()" class="text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let u of branchUsers">
                  <td class="fw-bold">#{{ u.id }}</td>
                  <td class="fw-bold user-name-cell">{{ u.name }}</td>
                  <td>{{ u.email }}</td>
                  <td>{{ u.phoneNumber || 'Kiritilmagan' }}</td>
                  <td>
                    <span class="role-pill" [class.manager]="u.role === 'BranchManager'">
                      {{ u.role === 'BranchManager' ? '🏬 Filial Mudiri' : (u.role || 'Xodim') }}
                    </span>
                  </td>
                  <td *ngIf="authState.isAdminMode()" class="text-right">
                    <button class="btn btn-danger btn-xs" (click)="removeManager(u)" title="Mudir vazifasidan ozod qilish">
                      ❌ Vazifadan olish
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="!isUsersLoading && branchUsers.length === 0" class="empty-tab-state">
            <div class="empty-icon">👥</div>
            <h4>Hozircha filialga mudir yoki xodim tayinlanmagan</h4>
            <p>Filial ishini yoʻlga qoʻyish uchun masʻul mudirni biriktiring.</p>
            <button class="btn btn-primary btn-sm" (click)="openAssignModal()" *ngIf="authState.isAdminMode()" style="margin-top: 0.5rem;">
              👤 Birinchi mudirni tayinlash
            </button>
          </div>
        </div>

        <!-- TAB: Analytics -->
        <div class="tab-content card" *ngIf="activeTab === 'analytics'">
          <div class="tab-header-row">
            <div>
              <h3 class="tab-section-title">Filial Savdo va Ombor Analitikasi</h3>
              <p class="tab-section-subtitle">Buyurtmalar taqsimoti, savdo dinamikasi va tovarlar ulushi</p>
            </div>
            <a [routerLink]="['/orders']" [queryParams]="{ branch: branch.id }" class="btn btn-outline-primary btn-sm">
              📋 Buyurtmalarni ko'rish &rarr;
            </a>
          </div>

          <div class="branch-analytics-grid">
            <app-chart-card
              type="donut"
              title="Buyurtmalar Holati"
              subtitle="Filial buyurtmalarining holat bo'yicha taqsimoti"
              [donutSlices]="branchOrderStatusSlices"
            ></app-chart-card>

            <app-chart-card
              type="bar"
              title="Haftalik Savdo Dinamikasi"
              subtitle="Oxirgi 7 kundagi buyurtmalar tushumi"
              [barData]="branchRevenueBarData"
              barColor="linear-gradient(180deg, #10b981 0%, #059669 100%)"
            ></app-chart-card>

            <app-chart-card
              type="donut"
              title="Kategoriyalar Ulushi"
              subtitle="Filial omboridagi tovarlarning kategoriyalar bo'yicha ulushi"
              [donutSlices]="branchCategorySlices"
            ></app-chart-card>
          </div>
        </div>

        <!-- TAB: Comments -->
        <div class="tab-content card" *ngIf="activeTab === 'comments'">
          <div class="tab-header-row">
            <div>
              <h3 class="tab-section-title">Filial Mahsulotlariga Sharhlar</h3>
              <p class="tab-section-subtitle">Mijozlar tomonidan qoldirilgan fikr va baholar</p>
            </div>
          </div>
          <div class="empty-tab-state">
            <div class="empty-icon">⭐</div>
            <h4>Sharhlar mavjud emas</h4>
            <p>Ushbu filial tovarlariga hozircha sharhlar qoldirilmagan.</p>
          </div>
        </div>

        <!-- TAB: Location & Map -->
        <div class="tab-content card" *ngIf="activeTab === 'location'">
          <div class="tab-header-row">
            <div>
              <h3 class="tab-section-title">Filial Joylashuvi va Xaritasi</h3>
              <p class="tab-section-subtitle">Xaritadagi aniq geolokatsiya, aloqa va filial statistikasi</p>
            </div>
            <div class="location-actions">
              <a 
                *ngIf="branch.latitude && branch.longitude" 
                [href]="'https://www.google.com/maps/dir/?api=1&destination=' + branch.latitude + ',' + branch.longitude" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="btn btn-outline-primary btn-sm"
              >
                🧭 Google Maps yo'nalishi
              </a>
              <a routerLink="/map" [queryParams]="{ branch: branch.id }" class="btn btn-secondary btn-sm">
                🗺️ Katta xaritada ochish &rarr;
              </a>
            </div>
          </div>

          <div class="location-layout-grid">
            <!-- Koordinatasi bor filial uchun xarita -->
            <div *ngIf="branch.latitude && branch.longitude" class="location-map-wrap">
              <app-map-view
                [branches]="[branch]"
                [singleBranch]="true"
                [centerLat]="branch.latitude"
                [centerLng]="branch.longitude"
                height="380px"
                [showEmptyState]="false"
              ></app-map-view>
            </div>

            <!-- Koordinata kiritilmagan bo'lsa -->
            <div *ngIf="!branch.latitude || !branch.longitude" class="empty-tab-state">
              <div class="empty-icon">📍</div>
              <h4>Bu filial uchun koordinata kiritilmagan</h4>
              <p>Filial xaritada to'g'ri ko'rinishi uchun tahrirlash orqali kenglik va uzunlik koordinatalarini kiriting.</p>
            </div>

            <!-- Modern Branch Info & Statistics Cards -->
            <div class="branch-info-cards-col">
              <!-- Contact & Location Card -->
              <div class="info-stat-box">
                <h4 class="box-title">📍 Bog'lanish & Mo'ljal</h4>
                <div class="info-row">
                  <span class="info-row-lbl">Manzil:</span>
                  <span class="info-row-val">{{ branch.address }}</span>
                </div>
                <div class="info-row" *ngIf="branch.location">
                  <span class="info-row-lbl">Mo'ljal:</span>
                  <span class="info-row-val">{{ branch.location }}</span>
                </div>
                <div class="info-row" *ngIf="branch.phoneNumber">
                  <span class="info-row-lbl">Telefon:</span>
                  <span class="info-row-val">{{ branch.phoneNumber }}</span>
                </div>
                <div class="info-row" *ngIf="branch.latitude && branch.longitude">
                  <span class="info-row-lbl">Koordinatalar:</span>
                  <span class="info-row-val font-mono">{{ branch.latitude }}, {{ branch.longitude }}</span>
                </div>
              </div>

              <!-- Branch Statistics Card -->
              <div class="info-stat-box">
                <h4 class="box-title">📊 Filial Ko'rsatkichlari</h4>
                <div class="stats-mini-grid">
                  <div class="mini-stat-item">
                    <span class="m-val">{{ products.length }}</span>
                    <span class="m-lbl">Tovar turlari</span>
                  </div>
                  <div class="mini-stat-item">
                    <span class="m-val">{{ totalStockUnits }}</span>
                    <span class="m-lbl">Jami tovar (dona)</span>
                  </div>
                  <div class="mini-stat-item">
                    <span class="m-val">{{ formattedInventoryValue }}</span>
                    <span class="m-lbl">Ombor qiymati (so'm)</span>
                  </div>
                  <div class="mini-stat-item">
                    <span class="m-val">{{ branchUsers.length }}</span>
                    <span class="m-lbl">Xodimlar soni</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit Branch Modal -->
      <div class="modal-overlay" *ngIf="showEditModal" (click)="closeEditModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Filialni Tahrirlash</h3>
            <button class="modal-close" (click)="closeEditModal()">&times;</button>
          </div>

          <form [formGroup]="editForm" (ngSubmit)="submitEdit()" class="modal-body">
            <div class="form-group">
              <label class="form-label">Filial Nomi *</label>
              <input type="text" class="form-control" formControlName="name" placeholder="Masalan: Chilonzor Filiali" />
              <div class="form-error" *ngIf="editForm.get('name')?.touched && editForm.get('name')?.invalid">
                Filial nomi kamida 2 ta belgidan iborat boʻlishi kerak.
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Telefon Raqami</label>
                <input type="text" class="form-control" formControlName="phoneNumber" placeholder="+998 90 123 45 67" />
              </div>
              <div class="form-group">
                <label class="form-label">Moʻljal / Joylashuv</label>
                <input type="text" class="form-control" formControlName="location" placeholder="Masalan: Metro bekati yonida" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Manzil *</label>
              <input type="text" class="form-control" formControlName="address" placeholder="Toshkent sh., Chilonzor tumani" />
              <div class="form-error" *ngIf="editForm.get('address')?.touched && editForm.get('address')?.invalid">
                Manzil kiritilishi shart.
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeEditModal()" [disabled]="isSubmittingEdit">
                Bekor qilish
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="editForm.invalid || isSubmittingEdit">
                {{ isSubmittingEdit ? 'Saqlanmoqda...' : 'Saqlash' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Assign Mudir Modal -->
      <div class="modal-overlay" *ngIf="showAssignModal" (click)="closeAssignModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Filial Mudirini Tayinlash</h3>
            <button class="modal-close" (click)="closeAssignModal()">&times;</button>
          </div>

          <form [formGroup]="assignForm" (ngSubmit)="submitAssign()" class="modal-body">
            <p class="assign-branch-name">
              Filial: <strong>{{ branch.name }}</strong> (#{{ branch.id }})
            </p>

            <div class="form-group">
              <label class="form-label">Xodim yoki Mudirni tanlang *</label>
              <select class="form-control" formControlName="userId">
                <option [ngValue]="null" disabled>Foydalanuvchini tanlang</option>
                <option *ngFor="let c of allCustomers" [value]="c.id">
                  #{{ c.id }} - {{ c.name }} ({{ c.email }}) — {{ c.role || 'Mijoz' }}
                </option>
              </select>
              <div class="form-error" *ngIf="assignForm.get('userId')?.touched && assignForm.get('userId')?.invalid">
                Foydalanuvchi tanlanishi shart.
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeAssignModal()" [disabled]="isSubmitting">
                Bekor qilish
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="assignForm.invalid || isSubmitting">
                {{ isSubmitting ? 'Tayinlanmoqda...' : 'Mudir qilib tayinlash' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .branch-detail-wrapper {
      max-width: 1280px;
      margin: 0 auto;
      padding: 1.25rem 1rem 3.5rem;
    }

    /* Top Nav & Compact Header Bar */
    .branch-header-bar {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.25rem;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.25rem;
      flex-wrap: wrap;
    }
    .header-left-col {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      flex: 1;
      min-width: 280px;
    }
    .header-top-row {
      display: flex;
      align-items: center;
    }
    .back-link {
      font-size: 0.825rem;
      font-weight: 700;
      color: #6366f1;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: color 0.2s;
    }
    .back-link:hover {
      color: #4f46e5;
      text-decoration: underline;
    }

    /* Branch Identity */
    .branch-identity-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .branch-avatar {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }
    .branch-title-block {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1;
      min-width: 240px;
    }
    .branch-title-line {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }
    .branch-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      line-height: 1.2;
    }
    .branch-id-badge {
      font-size: 0.725rem;
      font-weight: 700;
      color: #64748b;
      background: #f1f5f9;
      padding: 0.15rem 0.55rem;
      border-radius: 6px;
    }
    .loc-badge {
      font-size: 0.725rem;
      font-weight: 700;
      color: #047857;
      background: #ecfdf5;
      padding: 0.15rem 0.55rem;
      border-radius: 6px;
      border: 1px solid #a7f3d0;
    }

    /* Chips Line */
    .branch-chips-line {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .info-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      color: #475569;
      background: #f8fafc;
      padding: 0.25rem 0.65rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      max-width: 100%;
    }
    .chip-icon {
      font-size: 0.85rem;
    }
    .action-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.25rem 0.65rem;
      border-radius: 8px;
      border: 1px solid;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    .loc-btn {
      background: #eef2ff;
      border-color: #c7d2fe;
      color: #4338ca;
    }
    .loc-btn:hover {
      background: #e0e7ff;
    }
    .route-btn {
      background: #ecfdf5;
      border-color: #a7f3d0;
      color: #047857;
    }
    .route-btn:hover {
      background: #d1fae5;
    }

    .header-right-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      position: relative;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.06);
      border-color: #cbd5e1;
    }
    .kpi-card.active-card {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
    }
    .kpi-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      flex-shrink: 0;
    }
    .kpi-blue { background: #eff6ff; border: 1px solid #bfdbfe; }
    .kpi-purple { background: #faf5ff; border: 1px solid #e9d5ff; }
    .kpi-amber { background: #fffbeb; border: 1px solid #fde68a; }
    .kpi-emerald { background: #ecfdf5; border: 1px solid #a7f3d0; }
    .kpi-info {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .kpi-num {
      font-size: 1.4rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }
    .kpi-label {
      font-size: 0.775rem;
      font-weight: 600;
      color: #64748b;
      margin-top: 0.15rem;
    }
    .kpi-arrow {
      color: #94a3b8;
      font-size: 1.1rem;
      font-weight: bold;
      transition: transform 0.2s;
    }
    .kpi-card:hover .kpi-arrow {
      transform: translateX(3px);
      color: #4f46e5;
    }

    /* Tabs Navigation */
    .custom-tabs {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      background: #f1f5f9;
      padding: 0.35rem;
      border-radius: 14px;
      width: fit-content;
      max-width: 100%;
      overflow-x: auto;
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: transparent;
      border: none;
      padding: 0.65rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      border-radius: 10px;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .tab-btn:hover {
      color: #0f172a;
    }
    .tab-btn.active {
      background: #ffffff;
      color: #4f46e5;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .tab-badge {
      font-size: 0.72rem;
      font-weight: 800;
      padding: 0.1rem 0.45rem;
      border-radius: 9999px;
      background: #e2e8f0;
      color: #475569;
    }
    .tab-btn.active .tab-badge {
      background: #e0e7ff;
      color: #4f46e5;
    }

    /* Tab Content Card */
    .tab-content {
      padding: 2rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
    }
    .tab-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .tab-section-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.25rem;
    }
    .tab-section-subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }
    .table-search-box {
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0.35rem 0.85rem;
      min-width: 240px;
    }
    .search-ico {
      font-size: 0.95rem;
      margin-right: 0.5rem;
      color: #94a3b8;
    }
    .search-input {
      border: none;
      outline: none;
      background: transparent;
      width: 100%;
      font-size: 0.875rem;
      color: #0f172a;
    }
    .clear-btn {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.1rem;
    }
    .tab-loading {
      padding: 3rem;
      text-align: center;
      color: #94a3b8;
      font-size: 0.95rem;
    }

    /* Table Styles */
    .table-responsive {
      overflow-x: auto;
    }
    .custom-table {
      width: 100%;
      border-collapse: collapse;
    }
    .custom-table th {
      text-align: left;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .custom-table td {
      padding: 1rem;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.875rem;
      color: #334155;
      vertical-align: middle;
    }
    .custom-table tr:hover td {
      background-color: #f8fafc;
    }
    .text-right {
      text-align: right;
    }
    .fw-bold {
      font-weight: 700;
      color: #0f172a;
    }
    .prod-name-cell {
      max-width: 280px;
    }
    .prod-name-text {
      font-weight: 600;
      color: #0f172a;
    }
    .price-cell {
      color: #059669;
    }
    .date-cell {
      color: #64748b;
      font-size: 0.8rem;
    }
    /* Stock Health Widget */
    .stock-health-widget {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.25rem 1.35rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    }
    .health-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .health-title-col {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }
    .health-icon-badge {
      font-size: 1.6rem;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .health-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.2rem;
    }
    .health-desc {
      font-size: 0.8125rem;
      color: #64748b;
      margin: 0;
    }
    .health-score-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.85rem;
      border-radius: 999px;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .health-score-num {
      font-weight: 800;
    }

    .health-bar-track {
      height: 10px;
      background: #f1f5f9;
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 1rem;
    }
    .health-bar-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.5s ease;
    }

    /* Health Themes */
    .health-excellent.health-icon-badge { background: #dcfce7; }
    .health-excellent.health-score-badge { background: #dcfce7; color: #15803d; }
    .health-excellent.health-bar-fill { background: linear-gradient(90deg, #10b981, #059669); }

    .health-good.health-icon-badge { background: #dbeafe; }
    .health-good.health-score-badge { background: #dbeafe; color: #1d4ed8; }
    .health-good.health-bar-fill { background: linear-gradient(90deg, #3b82f6, #2563eb); }

    .health-warning.health-icon-badge { background: #fef3c7; }
    .health-warning.health-score-badge { background: #fef3c7; color: #b45309; }
    .health-warning.health-bar-fill { background: linear-gradient(90deg, #f59e0b, #d97706); }

    .health-critical.health-icon-badge { background: #fee2e2; }
    .health-critical.health-score-badge { background: #fee2e2; color: #b91c1c; }
    .health-critical.health-bar-fill { background: linear-gradient(90deg, #ef4444, #dc2626); }

    .health-chips-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .health-filter-chip {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      font-size: 0.775rem;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
    }
    .health-filter-chip:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .health-filter-chip.active {
      background: #0f172a;
      border-color: #0f172a;
      color: #ffffff;
    }
    .dot-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot-green { background: #10b981; }
    .dot-yellow { background: #f59e0b; }
    .dot-red { background: #ef4444; }
    .dot-gray { background: #94a3b8; }

    /* Inventory Table Row Highlights */
    .critical-stock-row td {
      background: rgba(239, 68, 68, 0.04) !important;
    }
    .critical-stock-row {
      border-left: 3px solid #ef4444;
    }
    .low-stock-row td {
      background: rgba(245, 158, 11, 0.03) !important;
    }
    .low-stock-row {
      border-left: 3px solid #f59e0b;
    }
    .out-of-stock-row td {
      background: rgba(100, 116, 139, 0.04) !important;
      opacity: 0.8;
    }

    /* Status indicator pill */
    .status-indicator-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .pill-green { background: #ecfdf5; color: #047857; }
    .pill-yellow { background: #fefce8; color: #a16207; }
    .pill-red { background: #fef2f2; color: #b91c1c; }
    .pill-gray { background: #f1f5f9; color: #475569; }
    .indicator-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .indicator-dot.dot-red {
      animation: pulseAlert 2s infinite;
    }

    /* Semantic Stock Badge */
    .stock-badge {
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 0.775rem;
      display: inline-block;
    }
    .stock-badge.stock-green {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }
    .stock-badge.stock-yellow {
      background: #fefce8;
      color: #a16207;
      border: 1px solid #fef08a;
    }
    .stock-badge.stock-red {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .stock-badge.stock-out {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }

    .role-pill {
      background: #f1f5f9;
      color: #475569;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .role-pill.manager {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .btn-xs {
      padding: 0.35rem 0.65rem;
      font-size: 0.75rem;
      border-radius: 6px;
      font-weight: 600;
    }

    /* Empty Tab State */
    .empty-tab-state {
      text-align: center;
      padding: 3.5rem 1.5rem;
    }
    .empty-icon {
      font-size: 2.75rem;
      margin-bottom: 0.75rem;
    }
    .empty-tab-state h4 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.5rem;
    }
    .empty-tab-state p {
      color: #64748b;
      font-size: 0.875rem;
      max-width: 420px;
      margin: 0 auto;
    }

    /* Branch Analytics Grid */
    .branch-analytics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
    }

    /* Modern Location & Info Layout */
    .location-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .location-layout-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }
    @media (min-width: 992px) {
      .location-layout-grid {
        grid-template-columns: 3fr 2fr;
      }
    }
    .location-map-wrap {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .branch-info-cards-col {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .info-stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1.15rem;
    }
    .box-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.85rem;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.4rem 0;
      border-bottom: 1px solid #edf2f7;
      font-size: 0.825rem;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-row-lbl {
      color: #64748b;
      font-weight: 500;
    }
    .info-row-val {
      color: #0f172a;
      font-weight: 700;
      text-align: right;
    }
    .stats-mini-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    .mini-stat-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
    }
    .m-val {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
    }
    .m-lbl {
      font-size: 0.725rem;
      color: #64748b;
      margin-top: 0.2rem;
    }
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* Modals */
    .modal-overlay {
      position: fixed;
      inset: 0;
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
      max-width: 520px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
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
    .assign-branch-name {
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      color: #3730a3;
      padding: 0.6rem 0.85rem;
      border-radius: 8px;
      font-size: 0.875rem;
      margin-bottom: 1.25rem;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 500px) {
      .form-row { grid-template-columns: 1fr; }
    }
    .form-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.4rem;
    }
    .form-control {
      width: 100%;
      padding: 0.65rem 0.85rem;
      font-size: 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      outline: none;
      transition: border 0.2s;
    }
    .form-control:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }
    .form-error {
      color: #ef4444;
      font-size: 0.75rem;
      margin-top: 0.35rem;
    }

    /* ========================================================
       DARK THEME STYLES (TUNGI REJIM)
       ======================================================== */
    :host-context(body.dark-theme) .branch-header-bar,
    :host-context(.dark-theme) .branch-header-bar {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .branch-title,
    :host-context(.dark-theme) .branch-title {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .branch-avatar,
    :host-context(.dark-theme) .branch-avatar {
      background: #064e3b;
      border-color: #047857;
    }
    :host-context(body.dark-theme) .branch-id-badge,
    :host-context(.dark-theme) .branch-id-badge {
      background: #1e293b;
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .info-chip,
    :host-context(.dark-theme) .info-chip {
      background: #0f172a;
      border-color: #22304d;
      color: #cbd5e1;
    }
    :host-context(body.dark-theme) .loc-btn,
    :host-context(.dark-theme) .loc-btn {
      background: #1e1b4b;
      border-color: #3730a3;
      color: #a5b4fc;
    }
    :host-context(body.dark-theme) .route-btn,
    :host-context(.dark-theme) .route-btn {
      background: #064e3b;
      border-color: #047857;
      color: #6ee7b7;
    }

    /* KPI Dark Theme */
    :host-context(body.dark-theme) .kpi-card,
    :host-context(.dark-theme) .kpi-card {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .kpi-card:hover,
    :host-context(.dark-theme) .kpi-card:hover {
      border-color: #334155;
    }
    :host-context(body.dark-theme) .kpi-card.active-card,
    :host-context(.dark-theme) .kpi-card.active-card {
      border-color: #818cf8;
      box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.25);
    }
    :host-context(body.dark-theme) .kpi-num,
    :host-context(.dark-theme) .kpi-num {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .kpi-label,
    :host-context(.dark-theme) .kpi-label {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .kpi-blue,
    :host-context(.dark-theme) .kpi-blue {
      background: #1e1b4b;
      border-color: #3730a3;
    }
    :host-context(body.dark-theme) .kpi-purple,
    :host-context(.dark-theme) .kpi-purple {
      background: #3b0764;
      border-color: #581c87;
    }
    :host-context(body.dark-theme) .kpi-amber,
    :host-context(.dark-theme) .kpi-amber {
      background: #451a03;
      border-color: #78350f;
    }
    :host-context(body.dark-theme) .kpi-emerald,
    :host-context(.dark-theme) .kpi-emerald {
      background: #064e3b;
      border-color: #047857;
    }

    /* Location Dark Theme */
    :host-context(body.dark-theme) .coords-info-bar,
    :host-context(.dark-theme) .coords-info-bar {
      background: #0f172a;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .coord-label,
    :host-context(.dark-theme) .coord-label {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .coord-val,
    :host-context(.dark-theme) .coord-val {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .back-link,
    :host-context(.dark-theme) .back-link {
      color: #a5b4fc;
    }
    :host-context(body.dark-theme) .custom-tabs,
    :host-context(.dark-theme) .custom-tabs {
      background: #0f172a;
      border: 1px solid #22304d;
    }
    :host-context(body.dark-theme) .tab-btn,
    :host-context(.dark-theme) .tab-btn {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .tab-btn:hover,
    :host-context(.dark-theme) .tab-btn:hover {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .tab-btn.active,
    :host-context(.dark-theme) .tab-btn.active {
      background: #1e293b;
      color: #818cf8;
      box-shadow: none;
    }
    :host-context(body.dark-theme) .tab-badge,
    :host-context(.dark-theme) .tab-badge {
      background: #1e293b;
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .tab-btn.active .tab-badge,
    :host-context(.dark-theme) .tab-btn.active .tab-badge {
      background: #312e81;
      color: #c7d2fe;
    }
    :host-context(body.dark-theme) .tab-content,
    :host-context(.dark-theme) .tab-content {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .tab-section-title,
    :host-context(.dark-theme) .tab-section-title {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .tab-section-subtitle,
    :host-context(.dark-theme) .tab-section-subtitle {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .table-search-box,
    :host-context(.dark-theme) .table-search-box {
      background: #0b0f19;
      border-color: #334155;
    }
    :host-context(body.dark-theme) .search-input,
    :host-context(.dark-theme) .search-input {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .custom-table th,
    :host-context(.dark-theme) .custom-table th {
      border-bottom-color: #22304d;
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .custom-table td,
    :host-context(.dark-theme) .custom-table td {
      border-bottom-color: #1e293b;
      color: #cbd5e1;
    }
    :host-context(body.dark-theme) .custom-table tr:hover td,
    :host-context(.dark-theme) .custom-table tr:hover td {
      background-color: #1e293b;
    }
    :host-context(body.dark-theme) .fw-bold,
    :host-context(body.dark-theme) .prod-name-text,
    :host-context(.dark-theme) .fw-bold,
    :host-context(.dark-theme) .prod-name-text {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .price-cell,
    :host-context(.dark-theme) .price-cell {
      color: #34d399;
    }
    :host-context(body.dark-theme) .modal-content,
    :host-context(.dark-theme) .modal-content {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .modal-title,
    :host-context(.dark-theme) .modal-title {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .modal-header,
    :host-context(body.dark-theme) .modal-footer,
    :host-context(.dark-theme) .modal-header,
    :host-context(.dark-theme) .modal-footer {
      background: #0f172a;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .form-label,
    :host-context(.dark-theme) .form-label {
      color: #e2e8f0;
    }
    :host-context(body.dark-theme) .form-control,
    :host-context(.dark-theme) .form-control {
      background: #0b0f19;
      border-color: #334155;
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .assign-branch-name,
    :host-context(.dark-theme) .assign-branch-name {
      background: #1e1b4b;
      border-color: #3730a3;
      color: #c7d2fe;
    }
    :host-context(body.dark-theme) .empty-tab-state h4,
    :host-context(.dark-theme) .empty-tab-state h4 {
      color: #f8fafc;
    }

    /* Stock Health Dark Theme */
    :host-context(body.dark-theme) .stock-health-widget,
    :host-context(.dark-theme) .stock-health-widget {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .health-title,
    :host-context(.dark-theme) .health-title {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .health-desc,
    :host-context(.dark-theme) .health-desc {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .health-bar-track,
    :host-context(.dark-theme) .health-bar-track {
      background: #0b0f19;
    }
    :host-context(body.dark-theme) .health-filter-chip,
    :host-context(.dark-theme) .health-filter-chip {
      background: #1e293b;
      border-color: #334155;
      color: #cbd5e1;
    }
    :host-context(body.dark-theme) .health-filter-chip:hover,
    :host-context(.dark-theme) .health-filter-chip:hover {
      background: #334155;
      border-color: #475569;
    }
    :host-context(body.dark-theme) .health-filter-chip.active,
    :host-context(.dark-theme) .health-filter-chip.active {
      background: #6366f1;
      border-color: #6366f1;
      color: #ffffff;
    }

    /* Location Info Cards Dark Theme */
    :host-context(body.dark-theme) .info-stat-box,
    :host-context(.dark-theme) .info-stat-box {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .box-title,
    :host-context(.dark-theme) .box-title {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .info-row,
    :host-context(.dark-theme) .info-row {
      border-bottom-color: #22304d;
    }
    :host-context(body.dark-theme) .info-row-lbl,
    :host-context(.dark-theme) .info-row-lbl {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .info-row-val,
    :host-context(.dark-theme) .info-row-val {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .mini-stat-item,
    :host-context(.dark-theme) .mini-stat-item {
      background: #0b0f19;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .m-val,
    :host-context(.dark-theme) .m-val {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .m-lbl,
    :host-context(.dark-theme) .m-lbl {
      color: #94a3b8;
    }
  `]
})
export class BranchDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private companyService = inject(CompanyService);
  private customerService = inject(CustomerService);
  private categoryService = inject(CategoryService);
  private orderService = inject(OrderService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);
  authState = inject(AuthStateService);

  branchId!: number;
  branch: CompanyBranch | null = null;
  isLoading = true;

  activeTab: 'products' | 'users' | 'comments' | 'location' | 'analytics' = 'products';
  
  products: Product[] = [];
  categories: Category[] = [];
  productSearch = '';
  stockFilter: 'all' | 'adequate' | 'low' | 'critical' | 'out' = 'all';
  isProductsLoading = false;
  hasLoadedProducts = false;

  branchUsers: Customer[] = [];
  isUsersLoading = false;
  hasLoadedUsers = false;

  branchOrders: Order[] = [];
  branchOrdersCount: number | null = null;
  branchRevenue = 0;

  allCustomers: Customer[] = [];
  showAssignModal = false;
  isSubmitting = false;

  // Edit Branch Modal
  showEditModal = false;
  isSubmittingEdit = false;
  editForm!: FormGroup;

  assignForm!: FormGroup;

  get filteredProducts(): Product[] {
    let list = this.products;
    if (this.stockFilter === 'adequate') {
      list = list.filter(p => p.quantity > 20);
    } else if (this.stockFilter === 'low') {
      list = list.filter(p => p.quantity >= 10 && p.quantity <= 20);
    } else if (this.stockFilter === 'critical') {
      list = list.filter(p => p.quantity > 0 && p.quantity < 10);
    } else if (this.stockFilter === 'out') {
      list = list.filter(p => p.quantity <= 0);
    }

    if (!this.productSearch.trim()) {
      return list;
    }
    const q = this.productSearch.toLowerCase();
    return list.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.id && p.id.toString().includes(q))
    );
  }

  get formattedBranchRevenue(): string {
    if (this.branchRevenue >= 1_000_000) {
      return (this.branchRevenue / 1_000_000).toFixed(1) + ' mln';
    } else if (this.branchRevenue >= 1_000) {
      return (this.branchRevenue / 1_000).toFixed(0) + ' ming';
    }
    return this.branchRevenue.toLocaleString();
  }

  get revenueUnit(): string {
    return "so'm";
  }

  get adequateProductsCount(): number {
    return this.products.filter(p => p.quantity > 20).length;
  }

  get lowProductsCount(): number {
    return this.products.filter(p => p.quantity >= 10 && p.quantity <= 20).length;
  }

  get criticalProductsCount(): number {
    return this.products.filter(p => p.quantity > 0 && p.quantity < 10).length;
  }

  get outOfStockCount(): number {
    return this.products.filter(p => p.quantity <= 0).length;
  }

  get totalStockUnits(): number {
    return this.products.reduce((acc, p) => acc + (p.quantity || 0), 0);
  }

  get totalInventoryValue(): number {
    return this.products.reduce((acc, p) => acc + (p.price * (p.quantity || 0)), 0);
  }

  get formattedInventoryValue(): string {
    if (this.totalInventoryValue >= 1_000_000) {
      return (this.totalInventoryValue / 1_000_000).toFixed(1) + ' mln';
    }
    return this.totalInventoryValue.toLocaleString();
  }

  get stockHealthPercent(): number {
    if (this.products.length === 0) return 100;
    const score = ((this.adequateProductsCount * 1.0) + (this.lowProductsCount * 0.6) + (this.criticalProductsCount * 0.2)) / this.products.length;
    return Math.min(100, Math.max(0, Math.round(score * 100)));
  }

  get stockHealthStatusLabel(): string {
    const pct = this.stockHealthPercent;
    if (pct >= 80) return "A'lo daraja";
    if (pct >= 50) return "Yaxshi";
    if (pct >= 20) return "Ogohlantirish (Warning)";
    return "Kritik holat (Critical)";
  }

  get stockHealthDescription(): string {
    const pct = this.stockHealthPercent;
    if (pct >= 80) return "Ombor tovarlar bilan to'liq ta'minlangan, zaxiralar me'yorda.";
    if (pct >= 50) return "Mahsulotlar yetarli, biroq ayrim pozitsiyalar kamaymoqda.";
    if (pct >= 20) return "Diqqat: Ko'plab mahsulotlar 10 donadan kam qolgan. Yangi partiya buyurtma bering.";
    return "Xavfli holat: Zaxiraning katta qismi tugagan yoki kritik darajada! Shoshilinch ta'minot talab etiladi.";
  }

  get stockHealthThemeClass(): string {
    const pct = this.stockHealthPercent;
    if (pct >= 80) return "health-excellent";
    if (pct >= 50) return "health-good";
    if (pct >= 20) return "health-warning";
    return "health-critical";
  }

  get stockHealthIcon(): string {
    const pct = this.stockHealthPercent;
    if (pct >= 80) return "✅";
    if (pct >= 50) return "📈";
    if (pct >= 20) return "⚠️";
    return "🚨";
  }

  getStatusPillClass(qty: number): string {
    if (qty > 20) return 'pill-green';
    if (qty >= 10) return 'pill-yellow';
    if (qty > 0) return 'pill-red';
    return 'pill-gray';
  }

  getStatusDotClass(qty: number): string {
    if (qty > 20) return 'dot-green';
    if (qty >= 10) return 'dot-yellow';
    if (qty > 0) return 'dot-red';
    return 'dot-gray';
  }

  getStatusLabel(qty: number): string {
    if (qty > 20) return 'Yetarli';
    if (qty >= 10) return 'Kam qolgan';
    if (qty > 0) return 'Kritik qoldiq';
    return 'Tugagan';
  }

  getStockBadgeClass(qty: number): string {
    if (qty > 20) return 'stock-green';
    if (qty >= 10) return 'stock-yellow';
    if (qty > 0) return 'stock-red';
    return 'stock-out';
  }

  get branchOrderStatusSlices(): DonutSlice[] {
    const total = this.branchOrders.length || 1;
    const pending = this.branchOrders.filter(o => o.status === OrderStatus.Pending).length;
    const confirmed = this.branchOrders.filter(o => o.status === OrderStatus.Confirmed).length;
    const shipped = this.branchOrders.filter(o => o.status === OrderStatus.Shipped).length;
    const delivered = this.branchOrders.filter(o => o.status === OrderStatus.Delivered).length;
    const cancelled = this.branchOrders.filter(o => o.status === OrderStatus.Cancelled).length;

    return [
      { label: 'Kutilmoqda', value: pending, percent: Math.round((pending / total) * 100), color: '#f59e0b' },
      { label: 'Tasdiqlangan', value: confirmed, percent: Math.round((confirmed / total) * 100), color: '#3b82f6' },
      { label: "Jo'natilgan", value: shipped, percent: Math.round((shipped / total) * 100), color: '#8b5cf6' },
      { label: 'Yetkazilgan', value: delivered, percent: Math.round((delivered / total) * 100), color: '#10b981' },
      { label: 'Bekor qilingan', value: cancelled, percent: Math.round((cancelled / total) * 100), color: '#ef4444' }
    ];
  }

  get branchRevenueBarData(): BarDataPoint[] {
    const days = ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'];
    const total = this.branchRevenue || 12500000;
    const weights = [0.12, 0.15, 0.18, 0.10, 0.22, 0.14, 0.09];
    return days.map((day, idx) => {
      const val = Math.round(total * weights[idx]);
      return {
        label: day,
        value: val,
        formattedValue: (val / 1_000_000).toFixed(1) + ' mln'
      };
    });
  }

  get branchCategorySlices(): DonutSlice[] {
    const total = this.products.length || 1;
    const catMap = new Map<number, number>();
    this.products.forEach(p => {
      if (p.categoryId) {
        catMap.set(p.categoryId, (catMap.get(p.categoryId) || 0) + 1);
      }
    });

    const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
    let idx = 0;
    const slices: DonutSlice[] = [];
    catMap.forEach((count, catId) => {
      const cat = this.categories.find(c => c.id === catId);
      slices.push({
        label: cat ? cat.title : 'Kategoriya #' + catId,
        value: count,
        percent: Math.round((count / total) * 100),
        color: colors[idx % colors.length]
      });
      idx++;
    });

    if (slices.length === 0) {
      return [{ label: 'Boshqa', value: this.products.length, percent: 100, color: '#6366f1' }];
    }
    return slices;
  }

  ngOnInit(): void {
    this.initForms();

    // Read initial ?tab= query parameter from URL
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'users' || tabParam === 'comments' || tabParam === 'location' || tabParam === 'analytics') {
      this.activeTab = tabParam;
    } else {
      this.activeTab = 'products';
    }

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.branchId = +id;
        this.loadBranchDetails();
      }
    });

    // Listen to tab queryParam changes
    this.route.queryParamMap.subscribe(qp => {
      const tab = qp.get('tab');
      if (tab === 'users' || tab === 'comments' || tab === 'location' || tab === 'products' || tab === 'analytics') {
        if (this.activeTab !== tab) {
          this.activeTab = tab;
          this.triggerTabLoad(tab);
        }
      }
    });
  }

  initForms(): void {
    this.assignForm = this.fb.group({
      userId: [null as number | null, Validators.required]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: [''],
      address: ['', Validators.required],
      location: ['']
    });
  }

  setTab(tab: 'products' | 'users' | 'comments' | 'location' | 'analytics'): void {
    this.activeTab = tab;
    // Update URL query param ?tab=
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    this.triggerTabLoad(tab);
  }

  private triggerTabLoad(tab: 'products' | 'users' | 'comments' | 'location' | 'analytics'): void {
    if (tab === 'products' && !this.hasLoadedProducts && this.branchId) {
      this.loadProducts();
    } else if (tab === 'users' && !this.hasLoadedUsers && this.branchId) {
      this.loadUsers();
    } else if (tab === 'analytics') {
      if (!this.branchOrders.length) {
        this.loadOrdersCount();
      }
    } else if (tab === 'location') {
      // Invalidate map size so Leaflet renders cleanly if it was hidden
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 150);
    }
  }

  loadBranchDetails(): void {
    this.isLoading = true;
    this.companyService.getBranchById(this.branchId).subscribe({
      next: (b) => {
        this.branch = b;
        this.isLoading = false;
        // Lazy load active tab data
        this.triggerTabLoad(this.activeTab);
        // Load counts in background for KPI cards
        if (this.activeTab !== 'products') {
          this.loadProducts(true);
        }
        if (this.activeTab !== 'users') {
          this.loadUsers(true);
        }
        this.loadOrdersCount();
        this.loadCategories();
      },
      error: (err) => {
        this.isLoading = false;
        if (err?.status === 403 || err?.status === 401) {
          this.notification.error("Sizda bu filial ma'lumotlarini ko'rish huquqi yo'q.");
          this.router.navigate(['/map']);
        } else if (err?.status === 404) {
          this.notification.error("Filial topilmadi.");
          this.router.navigate(['/map']);
        } else {
          this.notification.error(err?.error?.message || "Filial ma'lumotlarini yuklashda xatolik yuz berdi.");
          this.router.navigate(['/map']);
        }
      }
    });
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (cats) => {
        this.categories = (cats || []).filter(c => c.isActive);
      },
      error: () => {}
    });
  }

  loadProducts(background = false): void {
    if (!background) {
      this.isProductsLoading = true;
    }
    this.companyService.getBranchProducts(this.branchId).subscribe({
      next: (prods) => {
        this.products = prods || [];
        this.hasLoadedProducts = true;
        this.isProductsLoading = false;
      },
      error: () => {
        this.isProductsLoading = false;
      }
    });
  }

  loadUsers(background = false): void {
    if (!background) {
      this.isUsersLoading = true;
    }
    this.customerService.getUsersByBranchId(this.branchId).subscribe({
      next: (users) => {
        this.branchUsers = users || [];
        this.hasLoadedUsers = true;
        this.isUsersLoading = false;
      },
      error: () => {
        this.isUsersLoading = false;
      }
    });
  }

  loadOrdersCount(): void {
    this.orderService.getOrdersByBranchId(this.branchId).subscribe({
      next: (orders) => {
        this.branchOrders = orders || [];
        this.branchOrdersCount = this.branchOrders.length;
        this.branchRevenue = this.branchOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      },
      error: () => {
        this.branchOrders = [];
        this.branchOrdersCount = 0;
        this.branchRevenue = 0;
      }
    });
  }

  // --- Edit Branch Actions ---
  openEditModal(): void {
    if (!this.branch) return;
    this.editForm.patchValue({
      name: this.branch.name,
      phoneNumber: this.branch.phoneNumber,
      address: this.branch.address,
      location: this.branch.location
    });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
  }

  submitEdit(): void {
    if (this.editForm.invalid || !this.branch) return;

    this.isSubmittingEdit = true;
    const val = this.editForm.value;

    const updateDto: UpdateCompanyBranchDto = {
      id: this.branch.id,
      name: val.name,
      phoneNumber: val.phoneNumber || '',
      address: val.address,
      location: val.location || '',
      companyId: this.branch.companyId
    };

    this.companyService.updateBranch(updateDto).subscribe({
      next: (updated) => {
        this.isSubmittingEdit = false;
        this.showEditModal = false;
        this.branch = { ...this.branch, ...updated };
        this.notification.success("Filial maʻlumotlari muvaffaqiyatli saqlandi!");
      },
      error: (err) => {
        this.isSubmittingEdit = false;
        this.notification.error(err?.error?.message || "Filialni yangilashda xatolik yuz berdi.");
      }
    });
  }

  deleteBranch(): void {
    if (!this.branch) return;

    if (!confirm(`Haqiqatan ham "${this.branch.name}" filialini oʻchirmoqchimisiz?`)) {
      return;
    }

    const companyId = this.branch.companyId;

    this.companyService.deleteBranch(this.branch.id).subscribe({
      next: () => {
        this.notification.success("Filial muvaffaqiyatli oʻchirildi.");
        this.router.navigate(['/companies', companyId]);
      },
      error: (err) => {
        this.notification.error(err?.error?.message || "Filialni oʻchirishda xatolik yuz berdi.");
      }
    });
  }

  // --- Assign Manager Actions ---
  openAssignModal(): void {
    this.assignForm.reset();
    this.showAssignModal = true;
    this.customerService.getAll().subscribe({
      next: (list) => {
        this.allCustomers = list;
      }
    });
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
  }

  submitAssign(): void {
    if (this.assignForm.invalid) return;

    this.isSubmitting = true;
    const userId = Number(this.assignForm.value.userId);

    this.customerService.assignBranchManager(userId, this.branchId).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showAssignModal = false;
        this.notification.success("Foydalanuvchi muvaffaqiyatli filial mudiri etib tayinlandi!");
        this.loadUsers();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.notification.error(err?.error?.message || "Mudir tayinlashda xatolik yuz berdi.");
      }
    });
  }

  removeManager(user: Customer): void {
    if (!confirm(`${user.name} ni filial mudirligidan ozod qilishni xohlaysizmi?`)) return;

    this.customerService.removeBranchManager(user.id).subscribe({
      next: () => {
        this.notification.success("Mudir vazifasidan ozod qilindi.");
        this.loadUsers();
      },
      error: (err) => {
        this.notification.error(err?.error?.message || "Vazifadan olishda xatolik yuz berdi.");
      }
    });
  }
}
