import { CustomerService } from '../../../core/services/customer.service';
import { Customer } from '../../../core/models/customer.model';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Company, CreateCompanyDto, UpdateCompanyDto } from '../../../core/models/company.model';
import { CompanyBranch, CreateCompanyBranchDto } from '../../../core/models/company-branch.model';
import { CompanyService } from '../../../core/services/company.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-company-list',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule,
    LoadingSpinnerComponent, 
    EmptyStateComponent
  ],
  template: `
    <div class="container">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ authState.isCompanyAdmin() ? 'Mening Kompaniyam' : 'Kompaniyalar va Filiallar' }}</h1>
          <p class="page-subtitle">{{ authState.isCompanyAdmin() ? 'Siz boshqarayotgan kompaniya va uning filiallari' : 'Hamkor kompaniyalar hamda ularga tegishli filiallar tarmoqlari' }}</p>
        </div>

        <div class="header-btns" *ngIf="authState.isAdminMode()">
          <button class="btn btn-secondary" (click)="openBranchModal()">
            <span>📍</span> Yangi Filial Qo'shish
          </button>
          <button class="btn btn-primary" *ngIf="authState.isSuperAdmin()" (click)="openCompanyModal()">
            <span>➕</span> Yangi Kompaniya
          </button>
        </div>
      </div>

      <!-- Stat Overview Cards (Matching UI Spec: **0** Kompaniya, **0** Filial) -->
      <div class="stats-overview-grid">
        <div class="stat-card">
          <div class="stat-icon-wrap company-stat-icon">🏢</div>
          <div class="stat-text-wrap">
            <span class="stat-num company-count-val">{{ companies.length }}</span>
            <span class="stat-name">Kompaniya</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap branch-stat-icon">📍</div>
          <div class="stat-text-wrap">
            <span class="stat-num branch-count-val">{{ totalBranchesCount }}</span>
            <span class="stat-name">Filial</span>
          </div>
        </div>
      </div>

      <!-- Search Bar (Matching UI Spec: 🔍) -->
      <div class="filter-bar card">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Kompaniya nomi, INN yoki manzili bo'yicha qidiruv..." 
            class="search-input"
          />
          <button *ngIf="searchQuery" class="clear-btn" (click)="searchQuery = ''">&times;</button>
        </div>
        <div class="search-summary">
          Ko'rsatilmoqda: <strong>{{ filteredCompanies.length }}</strong> ta kompaniya
        </div>
      </div>

      <app-loading-spinner *ngIf="isLoading" message="Kompaniyalar ro'yxati yuklanmoqda..."></app-loading-spinner>

      <app-empty-state 
        *ngIf="!isLoading && filteredCompanies.length === 0"
        icon="🏢"
        title="Kompaniyalar topilmadi"
        description="Qidiruv natijasida birorta ham kompaniya topilmadi."
        [actionText]="emptyActionText"
        (actionClick)="openCompanyModal()"
      ></app-empty-state>

      <!-- Companies Grid (General & Customer View) -->
      <div class="companies-grid" *ngIf="!isLoading && filteredCompanies.length > 0 && !authState.isCompanyAdmin()">
        <div class="company-card card" *ngFor="let company of filteredCompanies">
          <div class="card-top">
            <div class="company-icon">🏢</div>
            <div class="company-title-wrap">
              <h3 class="company-name" [routerLink]="['/companies', company.id]" title="Kompaniya sahifasiga kirish">
                {{ company.name }} &rarr;
              </h3>
              <span class="inn-badge">INN: {{ company.inn }}</span>
            </div>
          </div>

          <div class="company-details">
            <div class="detail-item">
              <span class="detail-icon">📍</span>
              <span class="detail-text">{{ company.address }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">📞</span>
              <span class="detail-text">{{ company.phoneNumber }}</span>
            </div>
          </div>

          <!-- Direct Company Link Button -->
          <div class="view-link-row">
            <a [routerLink]="['/companies', company.id]" class="btn btn-outline-primary btn-sm full-btn">
              👁️ Kompaniya va Filiallarini ko'rish &rarr;
            </a>
          </div>

          <!-- Branches Section -->
          <div class="branches-section">
            <div class="branches-header">
              <span class="branches-title">Filiallar Ro'yxati</span>
              <button 
                class="view-branches-btn"
                (click)="toggleBranches(company)"
              >
                {{ expandedCompanyId === company.id ? "Yopish ▲" : ("Filiallar (" + getBranchesCount(company.id) + ") ▼") }}
              </button>
            </div>

            <!-- Expanded Branches List -->
            <div class="branches-dropdown" *ngIf="expandedCompanyId === company.id">
              <div *ngIf="isBranchLoading" class="branch-loading">Yuklanmoqda...</div>
              
              <div *ngIf="!isBranchLoading && (!companyBranches[company.id] || companyBranches[company.id].length === 0)" class="no-branch">
                Ushbu kompaniyada hozircha filiallar mavjud emas.
              </div>

              <div class="branch-item" *ngFor="let branch of companyBranches[company.id]" [routerLink]="['/branches', branch.id]" title="Filial ichiga kirish">
                <div class="branch-name-row">
                  <span class="b-name">📍 {{ branch.name }}</span>
                  <span class="b-id">#{{ branch.id }}</span>
                  <span class="b-arrow">&rarr;</span>
                </div>
                <div class="b-address">📍 {{ branch.address }}</div>
                <div class="b-phone" *ngIf="branch.phoneNumber">📞 {{ branch.phoneNumber }}</div>
                <div class="b-loc" *ngIf="branch.location">🌐 {{ branch.location }}</div>
              </div>
            </div>
          </div>

          <!-- Admin Actions -->
          <div class="company-actions" *ngIf="authState.isAdminMode()">
            <button class="btn btn-primary btn-sm" (click)="openAssignAdminModal(company)" *ngIf="authState.isSuperAdmin()" title="Kompaniyaga admin tayinlash">
              👤 Admin
            </button>
            <button class="btn btn-secondary btn-sm" (click)="openEditCompanyModal(company)">
              ✏️ Tahrirlash
            </button>
            <button class="btn btn-danger btn-sm" *ngIf="authState.isSuperAdmin()" (click)="deleteCompany(company)">
              🗑️ O'chirish
            </button>
          </div>
        </div>
      </div>

      <!-- COMPANY ADMIN VIEW -->
      <div class="company-admin-dashboard" *ngIf="!isLoading && companies.length > 0 && authState.isCompanyAdmin()">
        <div class="company-header-card card">
           <div class="card-top" style="margin-bottom: 0;">
              <div class="company-icon">💼</div>
              <div class="company-title-wrap">
                <h3 class="company-name" style="font-size: 1.5rem;">{{ companies[0].name }}</h3>
                <span class="inn-badge">INN: {{ companies[0].inn }}</span>
              </div>
              <button class="btn btn-secondary" style="margin-left: auto;" (click)="openEditCompanyModal(companies[0])">
                ✏️ Tahrirlash
              </button>
           </div>
           <div class="company-details" style="display: flex; gap: 2rem; margin-top: 1.5rem;">
              <div class="detail-item">
                <span class="detail-icon">📍</span>
                <span class="detail-text">{{ companies[0].address }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-icon">📞</span>
                <span class="detail-text">{{ companies[0].phoneNumber }}</span>
              </div>
           </div>
        </div>

        <h2 class="branches-section-title">Barcha Filiallar ({{ getBranchesCount(companies[0].id) }})</h2>
        
        <div *ngIf="isBranchLoading" class="branch-loading card" style="text-align: center; padding: 2rem;">Yuklanmoqda...</div>
        <div *ngIf="!isBranchLoading && (!companyBranches[companies[0].id] || companyBranches[companies[0].id].length === 0)" class="no-branch card" style="text-align: center; padding: 2rem;">
          Hozircha filiallar qo'shilmagan.
        </div>

        <div class="branches-dashboard-grid" *ngIf="companyBranches[companies[0].id] && companyBranches[companies[0].id].length > 0">
           <div class="branch-card card" *ngFor="let branch of companyBranches[companies[0].id]" [routerLink]="['/branches', branch.id]" style="cursor: pointer;">
                <div class="branch-name-row">
                  <span class="b-name" style="font-size: 1.25rem;">{{ branch.name }}</span>
                  <span class="b-id">#{{ branch.id }}</span>
                </div>
                <div class="b-address" style="margin-top: 0.75rem;">📍 {{ branch.address }}</div>
                <div class="b-phone" *ngIf="branch.phoneNumber">📞 {{ branch.phoneNumber }}</div>
                <div class="b-loc" *ngIf="branch.location">🌐 {{ branch.location }}</div>
           </div>
        </div>
      </div>

      <!-- Assign Admin Modal -->
      <div class="modal-overlay" *ngIf="showAdminModal" (click)="closeAdminModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Admin Tayinlash ({{ adminCompany?.name }})</h3>
            <button class="modal-close" (click)="closeAdminModal()">&times;</button>
          </div>

          <form [formGroup]="adminForm" (ngSubmit)="submitAdmin()" class="modal-body">
            <div class="form-group">
              <label class="form-label">Foydalanuvchini tanlang *</label>
              <select class="form-control" id="userId" name="userId" formControlName="userId">
                <option [ngValue]="null" disabled>Foydalanuvchini tanlang</option>
                <option *ngFor="let c of customersList" [value]="c.id">
                  {{ c.name }} ({{ c.email }})
                </option>
              </select>
              <div class="form-error" *ngIf="adminForm.get('userId')?.touched && adminForm.get('userId')?.invalid">
                Foydalanuvchini tanlash shart.
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeAdminModal()" [disabled]="isSubmittingAdmin">Bekor qilish</button>
              <button type="submit" class="btn btn-primary" [disabled]="adminForm.invalid || isSubmittingAdmin">
                {{ isSubmittingAdmin ? 'Saqlanmoqda...' : 'Tayinlash' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Create / Edit Company Modal -->
      <div class="modal-overlay" *ngIf="showCompanyModal" (click)="closeCompanyModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">{{ companyModalTitle }}</h3>
            <button class="modal-close" (click)="closeCompanyModal()">&times;</button>
          </div>

          <form [formGroup]="companyForm" (ngSubmit)="submitCompany()" class="modal-body">
            <div class="form-group">
              <label class="form-label">Kompaniya Nomi *</label>
              <input type="text" class="form-control" id="name" name="name" formControlName="name" placeholder="Masalan: Artel Electronics" />
              <div class="form-error" *ngIf="companyForm.get('name')?.touched && companyForm.get('name')?.invalid">
                Kompaniya nomi kamida 2 ta belgi bo'lishi kerak.
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">INN Raqami *</label>
                <input type="text" class="form-control" id="inn" name="inn" formControlName="inn" placeholder="123456789" />
                <div class="form-error" *ngIf="companyForm.get('inn')?.touched && companyForm.get('inn')?.invalid">
                  INN kiritilishi shart.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Telefon Raqami *</label>
                <input type="text" class="form-control" id="phoneNumber" name="phoneNumber" formControlName="phoneNumber" placeholder="+998 90 123 45 67" />
                <div class="form-error" *ngIf="companyForm.get('phoneNumber')?.touched && companyForm.get('phoneNumber')?.invalid">
                  Telefon raqam kiritilishi shart.
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Manzil *</label>
              <input type="text" class="form-control" id="address" name="address" formControlName="address" placeholder="Toshkent sh., Yunusobod tumani" />
              <div class="form-error" *ngIf="companyForm.get('address')?.touched && companyForm.get('address')?.invalid">
                Manzil kiritilishi shart.
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeCompanyModal()">Bekor qilish</button>
              <button type="submit" class="btn btn-primary" [disabled]="companyForm.invalid || isSubmittingCompany">
                {{ isSubmittingCompany ? 'Saqlanmoqda...' : 'Saqlash' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Create Branch Modal -->
      <div class="modal-overlay" *ngIf="showBranchModal" (click)="closeBranchModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">Yangi Filial Qo'shish</h3>
            <button class="modal-close" (click)="closeBranchModal()">&times;</button>
          </div>

          <form [formGroup]="branchForm" (ngSubmit)="submitBranch()" class="modal-body">
            <div class="form-group">
              <label class="form-label">Tegishli Kompaniya *</label>
              <select class="form-control" id="companyId" name="companyId" formControlName="companyId">
                <option [ngValue]="null" disabled>Kompaniyani tanlang</option>
                <option *ngFor="let c of companies" [value]="c.id">{{ c.name }}</option>
              </select>
              <div class="form-error" *ngIf="branchForm.get('companyId')?.touched && branchForm.get('companyId')?.invalid">
                Kompaniya tanlanishi shart.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Filial Nomi *</label>
              <input type="text" class="form-control" id="name" name="name" formControlName="name" placeholder="Masalan: Chilonzor Filiali" />
              <div class="form-error" *ngIf="branchForm.get('name')?.touched && branchForm.get('name')?.invalid">
                Filial nomi kiritilishi shart.
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Telefon Raqami *</label>
                <input type="text" class="form-control" id="phoneNumber" name="phoneNumber" formControlName="phoneNumber" placeholder="+998 90 987 65 43" />
              </div>
              <div class="form-group">
                <label class="form-label">Joylashuv (Koordinata / Mo'ljal)</label>
                <input type="text" class="form-control" id="location" name="location" formControlName="location" placeholder="Masalan: Metro yonida" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Manzil *</label>
              <input type="text" class="form-control" id="address" name="address" formControlName="address" placeholder="Toshkent sh., Chilonzor 9" />
              <div class="form-error" *ngIf="branchForm.get('address')?.touched && branchForm.get('address')?.invalid">
                Manzil kiritilishi shart.
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeBranchModal()">Bekor qilish</button>
              <button type="submit" class="btn btn-primary" [disabled]="branchForm.invalid || isSubmittingBranch">
                {{ isSubmittingBranch ? 'Saqlanmoqda...' : 'Filialni saqlash' }}
              </button>
            </div>
          </form>
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
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .page-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .page-subtitle {
      color: #64748b;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    .header-btns {
      display: flex;
      gap: 0.75rem;
    }

    /* Stat Overview Cards (Matching UI spec: **0** Kompaniya, **0** Filial) */
    .stats-overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    .stat-icon-wrap {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .company-stat-icon {
      background: #eef2ff;
      border: 1px solid #c7d2fe;
    }
    .branch-stat-icon {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
    }
    .stat-text-wrap {
      display: flex;
      flex-direction: column;
    }
    .stat-num {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }
    .stat-num.company-count-val {
      color: #4f46e5;
    }
    .stat-num.branch-count-val {
      color: #059669;
    }
    .stat-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #64748b;
      text-transform: capitalize;
    }

    :host-context(body.dark-theme) .stat-card,
    :host-context(.dark-theme) .stat-card {
      background: #151e32 !important;
      border-color: #22304d !important;
    }
    :host-context(body.dark-theme) .stat-num,
    :host-context(.dark-theme) .stat-num {
      color: #f8fafc !important;
    }
    :host-context(body.dark-theme) .stat-num.company-count-val,
    :host-context(.dark-theme) .stat-num.company-count-val {
      color: #a5b4fc !important;
    }
    :host-context(body.dark-theme) .stat-num.branch-count-val,
    :host-context(.dark-theme) .stat-num.branch-count-val {
      color: #6ee7b7 !important;
    }
    :host-context(body.dark-theme) .stat-name,
    :host-context(.dark-theme) .stat-name {
      color: #94a3b8 !important;
    }
    :host-context(body.dark-theme) .company-stat-icon,
    :host-context(.dark-theme) .company-stat-icon {
      background: #1e1b4b !important;
      border-color: #3730a3 !important;
    }
    :host-context(body.dark-theme) .branch-stat-icon,
    :host-context(.dark-theme) .branch-stat-icon {
      background: #064e3b !important;
      border-color: #047857 !important;
    }

    /* Filter Bar */
    .filter-bar {
      padding: 0.75rem 1.25rem;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }
    .search-box {
      flex: 1;
      min-width: 260px;
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.35rem 0.75rem;
    }
    .search-icon {
      font-size: 0.95rem;
      margin-right: 0.5rem;
      color: #94a3b8;
    }
    .search-input {
      border: none;
      background: transparent;
      padding: 0.4rem 0;
      width: 100%;
      font-size: 0.875rem;
      color: #0f172a;
      outline: none;
    }
    .clear-btn {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.1rem;
    }
    .search-summary {
      font-size: 0.825rem;
      color: #64748b;
    }

    /* Companies Grid */
    .companies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }
    .company-card {
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .company-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.08);
      border-color: #cbd5e1;
    }
    .card-top {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .company-icon {
      width: 46px;
      height: 46px;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      flex-shrink: 0;
    }
    .company-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .company-name {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      cursor: pointer;
      line-height: 1.2;
    }
    .company-name:hover {
      color: #4f46e5;
    }
    .inn-badge {
      font-size: 0.72rem;
      font-weight: 700;
      color: #4338ca;
      background: #e0e7ff;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      width: fit-content;
    }
    .company-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      font-size: 0.875rem;
      color: #475569;
      min-height: 4.5rem;
    }
    .detail-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .detail-icon {
      font-size: 0.95rem;
      margin-top: 1px;
      flex-shrink: 0;
    }
    .detail-text {
      line-height: 1.4;
      word-break: break-word;
    }
    .view-link-row {
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

    /* Branches section */
    .branches-section {
      background: #f8fafc;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      margin-bottom: 1rem;
      border: 1px solid #e2e8f0;
    }
    .branches-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .branches-title {
      font-size: 0.825rem;
      font-weight: 700;
      color: #0f172a;
    }
    .view-branches-btn {
      font-size: 0.78rem;
      font-weight: 700;
      color: #4f46e5;
      background: none;
      border: none;
      cursor: pointer;
    }
    .branches-dropdown {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      max-height: 220px;
      overflow-y: auto;
    }
    .branch-item {
      background: #ffffff;
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      font-size: 0.78rem;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .branch-item:hover {
      border-color: #818cf8;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    .branch-name-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 0.25rem;
    }
    .b-arrow {
      margin-left: auto;
      color: #4f46e5;
      font-weight: 800;
    }
    .b-address, .b-phone, .b-loc {
      color: #64748b;
      margin-top: 0.15rem;
    }
    .branch-loading, .no-branch {
      font-size: 0.78rem;
      color: #94a3b8;
      font-style: italic;
    }

    .company-actions {
      display: flex;
      gap: 0.4rem;
      justify-content: flex-end;
      padding-top: 0.85rem;
      border-top: 1px solid #f1f5f9;
      flex-wrap: wrap;
    }

    /* Dashboard admin view */
    .company-header-card {
      padding: 1.75rem;
      border-radius: 16px;
      margin-bottom: 2rem;
    }
    .branches-section-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 1rem;
    }
    .branches-dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.25rem;
    }
    .branch-card {
      padding: 1.25rem;
      border-radius: 12px;
      transition: all 0.2s;
    }
    .branch-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);
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
    .btn-info {
      background: #0ea5e9;
      color: #ffffff;
    }
    .btn-info:hover {
      background: #0284c7;
    }
  `]
})
export class CompanyListComponent implements OnInit {
  private companyService = inject(CompanyService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);
  private customerService = inject(CustomerService);

  // Admin Assign State
  showAdminModal = false;
  adminCompany: Company | null = null;
  adminForm!: FormGroup;
  isSubmittingAdmin = false;
  customersList: Customer[] = [];

  companies: Company[] = [];
  companyBranches: Record<number, CompanyBranch[]> = {};
  searchQuery = '';
  isLoading = true;
  expandedCompanyId: number | null = null;
  isBranchLoading = false;

  showCompanyModal = false;
  editingCompany: Company | null = null;
  isSubmittingCompany = false;
  companyForm!: FormGroup;

  showBranchModal = false;
  isSubmittingBranch = false;
  branchForm!: FormGroup;

  get companyModalTitle(): string {
    return this.editingCompany ? 'Kompaniyani Tahrirlash' : 'Yangi Kompaniya Qo‘shish';
  }

  get emptyActionText(): string {
    return this.authState.isAdminMode() ? "Kompaniya qo'shish" : '';
  }

  get totalBranchesCount(): number {
    return Object.values(this.companyBranches).reduce((acc, bList) => acc + (bList?.length || 0), 0);
  }

  get filteredCompanies(): Company[] {
    if (!this.searchQuery.trim()) {
      return this.companies;
    }
    const q = this.searchQuery.toLowerCase();
    return this.companies.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.inn && c.inn.toLowerCase().includes(q)) || 
      (c.address && c.address.toLowerCase().includes(q))
    );
  }

  getBranchesCount(companyId: number): number {
    return this.companyBranches[companyId]?.length || 0;
  }

  ngOnInit(): void {
    this.initForms();
    this.loadCompanies();
  }

  private initForms(): void {
    this.adminForm = this.fb.group({
      userId: [null, Validators.required]
    });
    this.companyForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      inn: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      address: ['', Validators.required]
    });

    this.branchForm = this.fb.group({
      companyId: [null, Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['', Validators.required],
      address: ['', Validators.required],
      location: ['']
    });
  }

  loadCompanies(): void {
    this.isLoading = true;
    this.companyService.getAllCompanies().subscribe({
      next: (list) => {
        this.companies = list;
        this.isLoading = false;
        list.forEach(c => this.loadBranchesForCompany(c.id));
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private loadBranchesForCompany(companyId: number): void {
    this.companyService.getBranchesByCompanyId(companyId).subscribe({
      next: (branches) => {
        this.companyBranches[companyId] = branches || [];
      },
      error: () => {}
    });
  }

  toggleBranches(company: Company): void {
    if (this.expandedCompanyId === company.id) {
      this.expandedCompanyId = null;
    } else {
      this.expandedCompanyId = company.id;
      if (!this.companyBranches[company.id]) {
        this.isBranchLoading = true;
        this.companyService.getBranchesByCompanyId(company.id).subscribe({
          next: (b) => {
            this.companyBranches[company.id] = b || [];
            this.isBranchLoading = false;
          },
          error: () => {
            this.isBranchLoading = false;
          }
        });
      }
    }
  }

  openAssignAdminModal(company: Company): void {
    this.adminCompany = company;
    this.adminForm.reset();
    
    this.customerService.getAll().subscribe({
      next: (users) => {
        this.customersList = users;
        this.showAdminModal = true;
      },
      error: () => {
        this.notification.error("Foydalanuvchilarni yuklashda xatolik yuz berdi.");
      }
    });
  }

  closeAdminModal(): void {
    this.showAdminModal = false;
    this.adminCompany = null;
  }

  submitAdmin(): void {
    if (this.adminForm.invalid || !this.adminCompany) return;
    
    this.isSubmittingAdmin = true;
    const userId = this.adminForm.value.userId;
    const companyId = this.adminCompany.id;

    this.customerService.assignCompanyAdmin(userId, companyId).subscribe({
      next: () => {
        this.notification.success('Foydalanuvchi muvaffaqiyatli ' + this.adminCompany?.name + ' ga admin qilib tayinlandi!');
        this.isSubmittingAdmin = false;
        this.closeAdminModal();
      },
      error: (err) => {
        this.isSubmittingAdmin = false;
        this.notification.error(err?.error?.message || 'Admin tayinlashda xatolik yuz berdi.');
      }
    });
  }

  openCompanyModal(): void {
    this.editingCompany = null;
    this.companyForm.reset();
    this.showCompanyModal = true;
  }

  openEditCompanyModal(company: Company): void {
    this.editingCompany = company;
    this.companyForm.patchValue({
      name: company.name,
      inn: company.inn,
      phoneNumber: company.phoneNumber,
      address: company.address
    });
    this.showCompanyModal = true;
  }

  closeCompanyModal(): void {
    this.showCompanyModal = false;
    this.editingCompany = null;
  }

  submitCompany(): void {
    if (this.companyForm.invalid) return;
    this.isSubmittingCompany = true;

    const val = this.companyForm.value;

    if (this.editingCompany) {
      const updateDto: UpdateCompanyDto = {
        id: this.editingCompany.id,
        name: val.name,
        inn: val.inn,
        phoneNumber: val.phoneNumber,
        address: val.address
      };

      this.companyService.updateCompany(updateDto).subscribe({
        next: () => {
          this.isSubmittingCompany = false;
          this.notification.success("Kompaniya yangilandi!");
          this.closeCompanyModal();
          this.loadCompanies();
        },
        error: () => {
          this.isSubmittingCompany = false;
        }
      });
    } else {
      const createDto: CreateCompanyDto = {
        name: val.name,
        inn: val.inn,
        phoneNumber: val.phoneNumber,
        address: val.address
      };

      this.companyService.createCompany(createDto).subscribe({
        next: () => {
          this.isSubmittingCompany = false;
          this.notification.success("Yangi kompaniya qo'shildi!");
          this.closeCompanyModal();
          this.loadCompanies();
        },
        error: () => {
          this.isSubmittingCompany = false;
        }
      });
    }
  }

  deleteCompany(company: Company): void {
    if (!confirm(`"${company.name}" kompaniyasini o'chirmoqchimisiz?`)) return;

    this.companyService.deleteCompany(company.id).subscribe({
      next: () => {
        this.notification.success(`"${company.name}" o'chirildi.`);
        this.companies = this.companies.filter(c => c.id !== company.id);
      },
      error: () => {}
    });
  }

  openBranchModal(): void {
    this.branchForm.reset({ companyId: this.companies[0]?.id || null });
    this.showBranchModal = true;
  }

  closeBranchModal(): void {
    this.showBranchModal = false;
  }

  submitBranch(): void {
    if (this.branchForm.invalid) return;
    this.isSubmittingBranch = true;

    const val = this.branchForm.value;
    const dto: CreateCompanyBranchDto = {
      companyId: Number(val.companyId),
      name: val.name,
      phoneNumber: val.phoneNumber,
      address: val.address,
      location: val.location || ''
    };

    this.companyService.createBranch(dto).subscribe({
      next: () => {
        this.isSubmittingBranch = false;
        this.notification.success("Yangi filial yaratildi!");
        this.closeBranchModal();
        this.loadBranchesForCompany(dto.companyId);
      },
      error: () => {
        this.isSubmittingBranch = false;
      }
    });
  }
}
