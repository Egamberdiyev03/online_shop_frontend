import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { CompanyService } from '../../../core/services/company.service';
import { Company } from '../../../core/models/company.model';
import { CompanyBranch, CreateCompanyBranchDto, UpdateCompanyBranchDto } from '../../../core/models/company-branch.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { CustomerService } from '../../../core/services/customer.service';
import { Customer } from '../../../core/models/customer.model';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LocationPickerComponent, SelectedLocation } from '../../../shared/components/location-picker/location-picker.component';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    LoadingSpinnerComponent,
    LocationPickerComponent
  ],
  template: `
    <div class="company-detail-wrapper" *ngIf="company">
      <!-- Back Link & Header -->
      <div class="page-top-nav">
        <a routerLink="/companies" class="back-link">
          &larr; Kompaniyalar roʻyxatiga qaytish
        </a>
      </div>

      <div class="page-header">
        <div>
          <h1 class="page-title">{{ company.name }}</h1>
          <p class="page-subtitle">Kompaniya haqida batafsil maʻlumot va barcha filiallar tarmogʻi</p>
        </div>

        <div class="header-actions" *ngIf="authState.isAdminMode()">
          <button class="btn btn-primary" (click)="openCreateBranchModal()">
            <span>📍</span> Yangi Filial Qoʻshish
          </button>
        </div>
      </div>

      <app-loading-spinner *ngIf="isLoading" message="Maʻlumotlar yuklanmoqda..."></app-loading-spinner>

      <div class="company-content" *ngIf="!isLoading">
        <!-- Company Header Info Card -->
        <div class="company-header-card card">
          <div class="company-info-main">
            <div class="company-icon-box">🏢</div>
            <div class="company-meta-wrap">
              <div class="company-title-row">
                <h2 class="company-heading">{{ company.name }}</h2>
                <span class="inn-badge">INN: {{ company.inn }}</span>
              </div>
              <div class="company-details-row">
                <div class="detail-pill">
                  <span class="pill-icon">📍</span>
                  <span class="pill-text">{{ company.address }}</span>
                </div>
                <div class="detail-pill">
                  <span class="pill-icon">📞</span>
                  <span class="pill-text">{{ company.phoneNumber }}</span>
                </div>
                <div class="detail-pill filial-pill">
                  <span class="pill-icon">🏬</span>
                  <span class="pill-text"><strong>{{ branches.length }}</strong> ta filial</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Branches Section -->
        <div class="branches-container">
          <div class="branches-section-header">
            <div class="section-title-wrap">
              <h2 class="section-title">Filiallar Roʻyxati</h2>
              <span class="count-tag">{{ branches.length }} ta</span>
            </div>

            <!-- Search box for branches -->
            <div class="branch-search-box" *ngIf="branches.length > 1">
              <span class="search-ico">🔍</span>
              <input 
                type="text" 
                [(ngModel)]="branchSearch" 
                placeholder="Filial nomi, manzili boʻyicha..." 
                class="search-input"
              />
              <button *ngIf="branchSearch" class="clear-btn" (click)="branchSearch = ''">&times;</button>
            </div>
          </div>

          <!-- Empty State -->
          <div *ngIf="filteredBranches.length === 0" class="empty-branches-card card">
            <div class="empty-icon">🏬</div>
            <h3 class="empty-title">{{ branches.length === 0 ? "Hozircha filiallar qoʻshilmagan" : "Qidiruv boʻyicha filial topilmadi" }}</h3>
            <p class="empty-desc">
              {{ branches.length === 0 ? "Ushbu kompaniyada hozircha filiallar mavjud emas. Yangi filial qoʻshishingiz mumkin." : "Boshqa qidiruv soʻzini kiritib koʻring." }}
            </p>
            <button 
              class="btn btn-primary btn-sm" 
              *ngIf="branches.length === 0 && authState.isAdminMode()"
              (click)="openCreateBranchModal()"
            >
              ➕ Birinchi filialni qoʻshish
            </button>
          </div>

          <!-- Branches Grid -->
          <div class="branches-dashboard-grid" *ngIf="filteredBranches.length > 0">
            <div class="branch-card card" *ngFor="let branch of filteredBranches">
              <!-- Top Row -->
              <div class="branch-card-header">
                <div class="branch-icon-title">
                  <span class="branch-ico">📍</span>
                  <h3
                    class="branch-title"
                    [routerLink]="authState.canViewBranchDetails(branch) ? ['/branches', branch.id] : ['/map']"
                    [queryParams]="authState.canViewBranchDetails(branch) ? null : { branch: branch.id }"
                    [title]="authState.canViewBranchDetails(branch) ? 'Filial ichiga kirish' : 'Xaritada koʻrish'"
                  >
                    {{ branch.name }}
                  </h3>
                </div>
                <span class="branch-id-badge">#{{ branch.id }}</span>
              </div>

              <!-- Details -->
              <div class="branch-details-list">
                <div class="branch-detail-item">
                  <span class="b-icon">📍</span>
                  <span class="b-val">{{ branch.address }}</span>
                </div>
                <div class="branch-detail-item" *ngIf="branch.phoneNumber">
                  <span class="b-icon">📞</span>
                  <span class="b-val">{{ branch.phoneNumber }}</span>
                </div>
                <div class="branch-detail-item" *ngIf="branch.location">
                  <span class="b-icon">🌐</span>
                  <span class="b-val">{{ branch.location }}</span>
                </div>
                <div class="branch-detail-item coords-item" *ngIf="branch.latitude && branch.longitude">
                  <span class="b-icon">🗺️</span>
                  <span class="b-val coords-val">Xaritada belgilangan</span>
                </div>
              </div>

              <!-- Main View Link Button -->
              <div class="branch-view-row">
                <a *ngIf="authState.canViewBranchDetails(branch)" [routerLink]="['/branches', branch.id]" class="btn btn-outline-primary btn-sm full-btn">
                  👁️ Filial Mahsulotlari va Boshqaruvi &rarr;
                </a>
                <a *ngIf="!authState.canViewBranchDetails(branch)" [routerLink]="['/map']" [queryParams]="{ branch: branch.id }" class="btn btn-outline-secondary btn-sm full-btn">
                  🗺️ Xaritada koʻrish &rarr;
                </a>
              </div>

              <!-- Admin Actions Toolbar -->
              <div class="branch-actions" *ngIf="authState.isAdminMode()">
                <button 
                  class="btn btn-primary btn-xs" 
                  (click)="openAssignModal(branch, $event)" 
                  title="Filialga mudir tayinlash"
                >
                  👤 Mudir
                </button>
                <button 
                  class="btn btn-secondary btn-xs" 
                  (click)="openEditBranchModal(branch, $event)" 
                  title="Filial maʻlumotlarini tahrirlash"
                >
                  ✏️ Tahrirlash
                </button>
                <button 
                  class="btn btn-danger btn-xs" 
                  *ngIf="authState.isSuperAdmin()" 
                  (click)="deleteBranch(branch, $event)" 
                  title="Filialni oʻchirish"
                >
                  🗑️ Oʻchirish
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create / Edit Branch Modal -->
      <div class="modal-overlay" *ngIf="showBranchModal" (click)="closeBranchModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">{{ branchModalTitle }}</h3>
            <button class="modal-close" (click)="closeBranchModal()">&times;</button>
          </div>

          <form [formGroup]="branchForm" (ngSubmit)="submitBranch()" class="modal-body">
            <div class="form-group">
              <label class="form-label">Filial Nomi *</label>
              <input 
                type="text" 
                class="form-control" 
                formControlName="name" 
                placeholder="Masalan: Chilonzor Filiali" 
              />
              <div class="form-error" *ngIf="branchForm.get('name')?.touched && branchForm.get('name')?.invalid">
                Filial nomi kamida 2 ta belgidan iborat boʻlishi kerak.
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Telefon Raqami</label>
                <input 
                  type="text" 
                  class="form-control" 
                  formControlName="phoneNumber" 
                  placeholder="+998 90 123 45 67" 
                />
              </div>
              <div class="form-group">
                <label class="form-label">Moʻljal / Joylashuv</label>
                <input 
                  type="text" 
                  class="form-control" 
                  formControlName="location" 
                  placeholder="Masalan: Chilonzor metro yonida" 
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Manzil *</label>
              <input
                type="text"
                class="form-control"
                formControlName="address"
                placeholder="Toshkent sh., Chilonzor tumani, 9-mavze"
              />
              <div class="form-error" *ngIf="branchForm.get('address')?.touched && branchForm.get('address')?.invalid">
                Manzil kiritilishi shart.
              </div>
            </div>

            <!-- Xaritadan koordinata tanlash -->
            <div class="form-group">
              <label class="form-label">Xaritadagi joylashuv</label>
              <div class="location-field-box" *ngIf="branchLocation">
                <div class="loc-coords">
                  <span class="loc-icon">📍</span>
                  <span class="loc-text">{{ branchLocation.latitude.toFixed(6) }}, {{ branchLocation.longitude.toFixed(6) }}</span>
                </div>
                <button type="button" class="change-loc-btn" (click)="showBranchLocationPicker = true">
                  O'zgartirish
                </button>
              </div>
              <button
                *ngIf="!branchLocation"
                type="button"
                class="btn btn-outline-primary btn-location"
                (click)="showBranchLocationPicker = true"
              >
                <span>🗺️</span> Xaritadan tanlash
              </button>
              <p class="form-hint">Filial joylashuvini xaritada belgilash orqali mijozlarga yo'nalish ko'rsatish imkonini berasiz.</p>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeBranchModal()" [disabled]="isSubmittingBranch">
                Bekor qilish
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="branchForm.invalid || isSubmittingBranch">
                {{ isSubmittingBranch ? 'Saqlanmoqda...' : 'Saqlash' }}
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
            <p class="assign-branch-name" *ngIf="selectedBranchForAssign">
              Filial: <strong>{{ selectedBranchForAssign.name }}</strong> (#{{ selectedBranchForAssign.id }})
            </p>

            <div class="form-group">
              <label class="form-label">Xodim yoki Mudirni tanlang *</label>
              <select class="form-control" formControlName="userId">
                <option [ngValue]="null" disabled>Foydalanuvchini tanlang</option>
                <option *ngFor="let u of allCustomers" [value]="u.id">
                  {{ u.name }} ({{ u.email }}) — {{ u.role || 'Mijoz' }}
                </option>
              </select>
              <div class="form-error" *ngIf="assignForm.get('userId')?.touched && assignForm.get('userId')?.invalid">
                Foydalanuvchi tanlanishi shart.
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeAssignModal()" [disabled]="isSubmittingAssign">
                Bekor qilish
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="assignForm.invalid || isSubmittingAssign">
                {{ isSubmittingAssign ? 'Tayinlanmoqda...' : 'Mudir qilib tayinlash' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Branch Location Picker Modal -->
      <div class="modal-overlay" *ngIf="showBranchLocationPicker" (click)="closeBranchLocationPicker()">
        <div class="modal-content location-modal" (click)="$event.stopPropagation()">
          <app-location-picker
            [initialLocation]="branchLocation ? { latitude: branchLocation.latitude, longitude: branchLocation.longitude } : undefined"
            [initialAddress]="branchForm.get('address')?.value"
            (locationSelected)="onBranchLocationSelected($event)"
            (cancelled)="closeBranchLocationPicker()"
          ></app-location-picker>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .company-detail-wrapper {
      max-width: 1240px;
      margin: 0 auto;
      padding: 2rem 1.5rem 4rem;
    }

    /* Back link */
    .page-top-nav {
      margin-bottom: 1.25rem;
    }
    .back-link {
      font-size: 0.875rem;
      font-weight: 700;
      color: #6366f1;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: color 0.2s;
    }
    .back-link:hover {
      color: #4f46e5;
      text-decoration: underline;
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .page-title {
      font-size: 2.25rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.03em;
      margin: 0 0 0.5rem;
      line-height: 1.2;
    }
    .page-subtitle {
      color: #64748b;
      font-size: 0.95rem;
      margin: 0;
      line-height: 1.5;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* Company Info Card */
    .company-header-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 1.75rem 2rem;
      margin-bottom: 2.5rem;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
    }
    .company-info-main {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .company-icon-box {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      flex-shrink: 0;
    }
    .company-meta-wrap {
      flex: 1;
      min-width: 260px;
    }
    .company-title-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.85rem;
      flex-wrap: wrap;
    }
    .company-heading {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      line-height: 1.2;
    }
    .inn-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #4338ca;
      background: #e0e7ff;
      padding: 0.2rem 0.65rem;
      border-radius: 6px;
      border: 1px solid #c7d2fe;
    }
    .company-details-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .detail-pill {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #475569;
      background: #f8fafc;
      padding: 0.4rem 0.85rem;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }
    .filial-pill {
      background: #ecfdf5;
      border-color: #a7f3d0;
      color: #065f46;
    }

    /* Branches Section */
    .branches-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .section-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .section-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .count-tag {
      font-size: 0.8rem;
      font-weight: 700;
      color: #6366f1;
      background: #eef2ff;
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
    }
    .branch-search-box {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0.35rem 0.85rem;
      min-width: 260px;
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

    /* Empty Branches Card */
    .empty-branches-card {
      text-align: center;
      padding: 3.5rem 2rem;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: 16px;
    }
    .empty-icon {
      font-size: 3rem;
      margin-bottom: 0.75rem;
    }
    .empty-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 0.5rem;
    }
    .empty-desc {
      color: #64748b;
      font-size: 0.875rem;
      max-width: 460px;
      margin: 0 auto 1.5rem;
    }

    /* Branches Grid */
    .branches-dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }
    .branch-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }
    .branch-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
      border-color: #cbd5e1;
    }

    /* Branch Card Header */
    .branch-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      gap: 0.75rem;
    }
    .branch-icon-title {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      flex: 1;
    }
    .branch-ico {
      font-size: 1.35rem;
      line-height: 1.2;
    }
    .branch-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      cursor: pointer;
      line-height: 1.35;
      transition: color 0.2s;
    }
    .branch-title:hover {
      color: #4f46e5;
    }
    .branch-id-badge {
      font-size: 0.72rem;
      font-weight: 700;
      color: #64748b;
      background: #f1f5f9;
      padding: 0.15rem 0.5rem;
      border-radius: 6px;
      flex-shrink: 0;
    }

    /* Details List */
    .branch-details-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      min-height: 4.5rem;
    }
    .branch-detail-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #475569;
    }
    .b-icon {
      font-size: 0.95rem;
      margin-top: 1px;
      flex-shrink: 0;
    }
    .b-val {
      line-height: 1.4;
      word-break: break-word;
    }
    .coords-item {
      background: #ecfdf5;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      margin-top: 0.25rem;
    }
    .coords-val {
      color: #059669;
      font-weight: 600;
      font-size: 0.8rem;
    }

    /* View Button */
    .branch-view-row {
      margin-top: auto;
      margin-bottom: 0.85rem;
    }
    .full-btn {
      width: 100%;
      text-align: center;
      display: block;
      padding: 0.55rem 0.75rem;
      border: 1px solid #c7d2fe;
      color: #4f46e5;
      background: #faf5ff;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.825rem;
      text-decoration: none;
      transition: all 0.2s;
    }
    .full-btn:hover {
      background: #4f46e5;
      color: #ffffff;
    }

    /* Actions Toolbar */
    .branch-actions {
      display: flex;
      gap: 0.4rem;
      justify-content: flex-end;
      padding-top: 0.85rem;
      border-top: 1px solid #f1f5f9;
      flex-wrap: wrap;
    }
    .btn-xs {
      padding: 0.35rem 0.65rem;
      font-size: 0.75rem;
      border-radius: 6px;
      font-weight: 600;
    }

    /* Modals */
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
    .form-hint {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 0.5rem;
      line-height: 1.4;
    }

    /* Location picker field styles */
    .location-field-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 10px;
      padding: 0.75rem 1rem;
    }
    .loc-coords {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      min-width: 0;
    }
    .loc-icon {
      font-size: 1.1rem;
    }
    .loc-text {
      font-size: 0.9rem;
      color: #064e3b;
      font-family: monospace;
    }
    .change-loc-btn {
      background: none;
      border: none;
      color: #059669;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .change-loc-btn:hover {
      text-decoration: underline;
    }
    .btn-location {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem;
    }
    .btn-outline-primary {
      background: #ffffff;
      border: 1px solid #4f46e5;
      color: #4f46e5;
    }
    .btn-outline-primary:hover {
      background: #eef2ff;
    }
    .location-modal {
      max-width: 650px;
      background: transparent;
      box-shadow: none;
    }

    /* ========================================================
       DARK THEME STYLES (TUNGI REJIM)
       ======================================================== */
    :host-context(body.dark-theme) .page-title,
    :host-context(.dark-theme) .page-title {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .page-subtitle,
    :host-context(.dark-theme) .page-subtitle {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .back-link,
    :host-context(.dark-theme) .back-link {
      color: #a5b4fc;
    }
    :host-context(body.dark-theme) .company-header-card,
    :host-context(.dark-theme) .company-header-card {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .company-heading,
    :host-context(.dark-theme) .company-heading {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .company-icon-box,
    :host-context(.dark-theme) .company-icon-box {
      background: #1e1b4b;
      border-color: #3730a3;
    }
    :host-context(body.dark-theme) .detail-pill,
    :host-context(.dark-theme) .detail-pill {
      background: #0f172a;
      border-color: #22304d;
      color: #cbd5e1;
    }
    :host-context(body.dark-theme) .filial-pill,
    :host-context(.dark-theme) .filial-pill {
      background: #064e3b;
      border-color: #065f46;
      color: #6ee7b7;
    }
    :host-context(body.dark-theme) .section-title,
    :host-context(.dark-theme) .section-title {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .count-tag,
    :host-context(.dark-theme) .count-tag {
      background: #1e1b4b;
      color: #a5b4fc;
    }
    :host-context(body.dark-theme) .branch-search-box,
    :host-context(.dark-theme) .branch-search-box {
      background: #0b0f19;
      border-color: #334155;
    }
    :host-context(body.dark-theme) .search-input,
    :host-context(.dark-theme) .search-input {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .branch-card,
    :host-context(.dark-theme) .branch-card {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .branch-card:hover,
    :host-context(.dark-theme) .branch-card:hover {
      border-color: #3b82f6;
    }
    :host-context(body.dark-theme) .branch-title,
    :host-context(.dark-theme) .branch-title {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .branch-id-badge,
    :host-context(.dark-theme) .branch-id-badge {
      background: #0b0f19;
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .b-val,
    :host-context(.dark-theme) .b-val {
      color: #cbd5e1;
    }
    :host-context(body.dark-theme) .full-btn,
    :host-context(.dark-theme) .full-btn {
      background: #1e1b4b;
      border-color: #3730a3;
      color: #a5b4fc;
    }
    :host-context(body.dark-theme) .full-btn:hover,
    :host-context(.dark-theme) .full-btn:hover {
      background: #4f46e5;
      color: #ffffff;
    }
    :host-context(body.dark-theme) .branch-actions,
    :host-context(.dark-theme) .branch-actions {
      border-top-color: #1e293b;
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
    :host-context(body.dark-theme) .empty-branches-card,
    :host-context(.dark-theme) .empty-branches-card {
      background: #151e32;
      border-color: #22304d;
    }
    :host-context(body.dark-theme) .empty-title,
    :host-context(.dark-theme) .empty-title {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .location-field-box,
    :host-context(.dark-theme) .location-field-box {
      background: #064e3b;
      border-color: #065f46;
    }
    :host-context(body.dark-theme) .loc-text,
    :host-context(.dark-theme) .loc-text {
      color: #6ee7b7;
    }
    :host-context(body.dark-theme) .change-loc-btn,
    :host-context(.dark-theme) .change-loc-btn {
      color: #34d399;
    }
    :host-context(body.dark-theme) .btn-outline-primary,
    :host-context(.dark-theme) .btn-outline-primary {
      background: #1e1b4b;
      border-color: #4338ca;
      color: #a5b4fc;
    }
    :host-context(body.dark-theme) .form-hint,
    :host-context(.dark-theme) .form-hint {
      color: #64748b;
    }
    :host-context(body.dark-theme) .coords-item,
    :host-context(.dark-theme) .coords-item {
      background: #064e3b;
    }
    :host-context(body.dark-theme) .coords-val,
    :host-context(.dark-theme) .coords-val {
      color: #6ee7b7;
    }
  `]
})
export class CompanyDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private companyService = inject(CompanyService);
  private customerService = inject(CustomerService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);

  companyId!: number;
  company: Company | null = null;
  branches: CompanyBranch[] = [];
  branchSearch = '';
  isLoading = true;

  // Branch Modal
  showBranchModal = false;
  editingBranch: CompanyBranch | null = null;
  isSubmittingBranch = false;
  branchForm!: FormGroup;

  // Assign Manager Modal
  showAssignModal = false;
  selectedBranchForAssign: CompanyBranch | null = null;
  assignForm!: FormGroup;
  allCustomers: Customer[] = [];
  isSubmittingAssign = false;

  // Branch Location Picker
  showBranchLocationPicker = false;
  branchLocation: SelectedLocation | null = null;

  get branchModalTitle(): string {
    return this.editingBranch ? 'Filialni Tahrirlash' : 'Yangi Filial Qoʻshish';
  }

  get filteredBranches(): CompanyBranch[] {
    if (!this.branchSearch.trim()) {
      return this.branches;
    }
    const q = this.branchSearch.toLowerCase();
    return this.branches.filter(b => 
      b.name.toLowerCase().includes(q) ||
      (b.address && b.address.toLowerCase().includes(q)) ||
      (b.location && b.location.toLowerCase().includes(q)) ||
      (b.phoneNumber && b.phoneNumber.toLowerCase().includes(q))
    );
  }

  ngOnInit(): void {
    this.initForms();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.companyId = +id;
        this.loadCompanyDetails();
      }
    });
  }

  initForms(): void {
    this.branchForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: [''],
      address: ['', Validators.required],
      location: ['']
    });

    this.assignForm = this.fb.group({
      userId: [null as number | null, Validators.required]
    });
  }

  loadCompanyDetails(): void {
    this.isLoading = true;
    console.log('[CompanyDetail] Loading company ID:', this.companyId);

    this.companyService.getCompanyById(this.companyId).subscribe({
      next: (comp) => {
        console.log('[CompanyDetail] Company loaded:', comp);
        this.company = comp;
        this.loadBranches();
      },
      error: (err) => {
        console.error('[CompanyDetail] Error loading company:', err);
        this.notification.error('Kompaniya maʻlumotlarini yuklashda xatolik: ' + (err?.message || err?.error?.message || 'Noma\'lum xato'));
        this.isLoading = false;
      }
    });
  }

  loadBranches(): void {
    this.companyService.getBranchesByCompanyId(this.companyId).subscribe({
      next: (branches) => {
        this.branches = branches;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  // --- Branch CRUD Actions ---
  openCreateBranchModal(): void {
    this.editingBranch = null;
    this.branchForm.reset();
    this.branchLocation = null;
    this.showBranchModal = true;
  }

  openEditBranchModal(branch: CompanyBranch, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.editingBranch = branch;
    this.branchForm.patchValue({
      name: branch.name,
      phoneNumber: branch.phoneNumber,
      address: branch.address,
      location: branch.location
    });
    // Mavjud koordinatalarni yuklash
    let lat = branch.latitude;
    let lng = branch.longitude;
    if ((lat == null || lng == null) && branch.location) {
      const match = branch.location.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
      if (match) {
        lat = parseFloat(match[1]);
        lng = parseFloat(match[2]);
      }
    }

    if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      this.branchLocation = {
        latitude: Number(lat),
        longitude: Number(lng),
        address: branch.address
      };
    } else {
      this.branchLocation = null;
    }
    this.showBranchModal = true;
  }

  closeBranchModal(): void {
    this.showBranchModal = false;
    this.editingBranch = null;
    this.branchLocation = null;
  }

  // --- Branch Location Picker Methods ---
  closeBranchLocationPicker(): void {
    this.showBranchLocationPicker = false;
  }

  onBranchLocationSelected(location: SelectedLocation): void {
    this.branchLocation = location;
    this.showBranchLocationPicker = false;
    // Agar manzil bo'sh bo'lsa, xaritadan tanlangan manzilni qo'yish
    if (!this.branchForm.get('address')?.value && location.address) {
      this.branchForm.patchValue({ address: location.address });
    }
    this.notification.success('Filial joylashuvi saqlandi!');
  }

  submitBranch(): void {
    if (this.branchForm.invalid) return;

    this.isSubmittingBranch = true;
    const val = this.branchForm.value;
    const branchLocationStr = this.branchLocation
      ? `${this.branchLocation.latitude.toFixed(6)}, ${this.branchLocation.longitude.toFixed(6)}`
      : (val.location || '');

    if (this.editingBranch) {
      const updateDto: UpdateCompanyBranchDto = {
        id: this.editingBranch.id,
        name: val.name,
        phoneNumber: val.phoneNumber || '',
        address: val.address,
        location: branchLocationStr,
        companyId: this.companyId,
        // Xarita koordinatalari
        latitude: this.branchLocation?.latitude,
        longitude: this.branchLocation?.longitude
      };

      this.companyService.updateBranch(updateDto).subscribe({
        next: () => {
          this.isSubmittingBranch = false;
          this.notification.success("Filial maʻlumotlari muvaffaqiyatli yangilandi!");
          this.closeBranchModal();
          this.loadBranches();
        },
        error: (err) => {
          this.isSubmittingBranch = false;
          this.notification.error(err?.error?.message || "Filialni yangilashda xatolik yuz berdi.");
        }
      });
    } else {
      const createDto: CreateCompanyBranchDto = {
        name: val.name,
        phoneNumber: val.phoneNumber || '',
        address: val.address,
        location: branchLocationStr,
        companyId: this.companyId,
        // Xarita koordinatalari
        latitude: this.branchLocation?.latitude,
        longitude: this.branchLocation?.longitude
      };

      console.log('[CreateBranch] Yuborilayotgan DTO:', createDto);

      this.companyService.createBranch(createDto).subscribe({
        next: (result) => {
          console.log('[CreateBranch] Backend javobi:', result);
          this.isSubmittingBranch = false;
          this.notification.success("Yangi filial muvaffaqiyatli qoʻshildi!");
          this.closeBranchModal();
          this.loadBranches();
        },
        error: (err) => {
          this.isSubmittingBranch = false;
          this.notification.error(err?.error?.message || "Filial qoʻshishda xatolik yuz berdi.");
        }
      });
    }
  }

  deleteBranch(branch: CompanyBranch, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!confirm(`Haqiqatan ham "${branch.name}" filialini oʻchirmoqchimisiz?`)) {
      return;
    }

    this.companyService.deleteBranch(branch.id).subscribe({
      next: () => {
        this.notification.success("Filial muvaffaqiyatli oʻchirildi.");
        this.loadBranches();
      },
      error: (err) => {
        this.notification.error(err?.error?.message || "Filialni oʻchirishda xatolik yuz berdi.");
      }
    });
  }

  // --- Assign Manager Actions ---
  openAssignModal(branch: CompanyBranch, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedBranchForAssign = branch;
    this.assignForm.reset();
    this.showAssignModal = true;

    if (this.allCustomers.length === 0) {
      this.customerService.getAll().subscribe({
        next: (users) => {
          this.allCustomers = users;
        }
      });
    }
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.selectedBranchForAssign = null;
  }

  submitAssign(): void {
    if (this.assignForm.invalid || !this.selectedBranchForAssign) return;

    this.isSubmittingAssign = true;
    const userId = Number(this.assignForm.value.userId);

    this.customerService.assignBranchManager(userId, this.selectedBranchForAssign.id).subscribe({
      next: () => {
        this.isSubmittingAssign = false;
        this.showAssignModal = false;
        this.notification.success(`Foydalanuvchi "${this.selectedBranchForAssign?.name}" filialiga muvaffaqiyatli mudir etib tayinlandi!`);
      },
      error: (err) => {
        this.isSubmittingAssign = false;
        this.notification.error(err?.error?.message || "Filial mudirini tayinlashda xatolik yuz berdi.");
      }
    });
  }
}
