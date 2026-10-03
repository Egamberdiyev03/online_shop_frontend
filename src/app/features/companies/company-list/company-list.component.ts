import { CustomerService } from '../../../core/services/customer.service';
import { Customer } from '../../../core/models/customer.model';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
    LoadingSpinnerComponent, 
    EmptyStateComponent
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ authState.isCompanyAdmin() ? 'Mening Kompaniyam' : 'Kompaniyalar va Filiallar' }}</h1>
          <p class="page-subtitle">{{ authState.isCompanyAdmin() ? 'Siz boshqarayotgan kompaniya va uning filiallari' : 'Hamkor kompaniyalar hamda ularga tegishli filiallar tarmoqlari' }}</p>
        </div>

        <div class="header-btns" *ngIf="authState.isAdminMode()">
          <button class="btn btn-secondary" (click)="openBranchModal()">
            <span>&#127970;</span> Yangi Filial Qo'shish
          </button>
          <button class="btn btn-primary" *ngIf="authState.isSuperAdmin()" (click)="openCompanyModal()">
            <span>вћ•</span> Yangi Kompaniya
          </button>
        </div>
      </div>

      <app-loading-spinner *ngIf="isLoading" message="Kompaniyalar ro'yxati yuklanmoqda..."></app-loading-spinner>

      <app-empty-state 
        *ngIf="!isLoading && companies.length === 0"
        icon="&#127970;"
        title="Kompaniyalar topilmadi"
        description="Hozircha tizimda birorta ham kompaniya mavjud emas."
        [actionText]="emptyActionText"
        (actionClick)="openCompanyModal()"
      ></app-empty-state>

      <!-- Companies Grid -->
      <div class="companies-grid" *ngIf="!isLoading && companies.length > 0">
        <div class="company-card card" *ngFor="let company of companies">
          <div class="card-top">
            <div class="company-icon">&#127970;</div>
            <div class="company-title-wrap">
              <h3 class="company-name" [routerLink]="['/companies', company.id]" style="cursor: pointer;" title="Kompaniya sahifasiga kirish">
                {{ company.name }} &rarr;
              </h3>
              <span class="inn-badge">INN: {{ company.inn }}</span>
            </div>
          </div>

          <div class="company-details">
            <div class="detail-item">
              <span class="detail-icon">&#128205;</span>
              <span class="detail-text">{{ company.address }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">&#128222;</span>
              <span class="detail-text">{{ company.phoneNumber }}</span>
            </div>
          </div>

          <!-- Direct Company Link Button -->
          <div style="margin: 0.5rem 0;">
            <a [routerLink]="['/companies', company.id]" class="btn btn-outline-primary btn-sm" style="width: 100%; text-align: center; text-decoration: none; display: block;">
              &#128065; Kompaniya va Filiallarini ko'rish &rarr;
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
                {{ expandedCompanyId === company.id ? "Yopish &#9650;" : ("Filiallar (" + getBranchesCount(company.id) + ") &#9660;") }}
              </button>
            </div>

            <!-- Expanded Branches List -->
            <div class="branches-dropdown" *ngIf="expandedCompanyId === company.id">
              <div *ngIf="isBranchLoading" class="branch-loading">Yuklanmoqda...</div>
              
              <div *ngIf="!isBranchLoading && (!companyBranches[company.id] || companyBranches[company.id].length === 0)" class="no-branch">
                Ushbu kompaniyada filiallar mavjud emas.
              </div>

              <div class="branch-item" *ngFor="let branch of companyBranches[company.id]" [routerLink]="['/branches', branch.id]" style="cursor: pointer;" title="Filial ichiga kirish (Mahsulotlar, Xodimlar)">
                <div class="branch-name-row">
                  <span class="b-name">&#127970; {{ branch.name }}</span>
                  <span class="b-id">#{{ branch.id }}</span>
                  <span style="color: #2563eb; font-weight: bold; margin-left: auto;">&rarr;</span>
                </div>
                <div class="b-address">&#128205; {{ branch.address }}</div>
                <div class="b-phone" *ngIf="branch.phoneNumber">&#128222; {{ branch.phoneNumber }}</div>
                <div class="b-loc" *ngIf="branch.location">&#127760; {{ branch.location }}</div>
              </div>
            </div>
          </div>

          <!-- Admin Actions -->
          <div class="company-actions" *ngIf="authState.isAdminMode()">
            <button class="btn btn-info btn-sm" [routerLink]="['/companies', company.id]">
              &#128065; Kirish
            </button>
            <button class="btn btn-primary btn-sm" (click)="openAssignAdminModal(company)" *ngIf="authState.isSuperAdmin()" title="Kompaniyaga admin tayinlash">
              &#128100; Admin
            </button>
            <button class="btn btn-secondary btn-sm" (click)="openEditCompanyModal(company)">
              &#9998; Tahrirlash
            </button>
            <button class="btn btn-danger btn-sm" *ngIf="authState.isSuperAdmin()" (click)="deleteCompany(company)">
              &#128465; O'chirish
            </button>
          </div>
        </div>
      </div>

      <!-- COMPANY ADMIN VIEW -->
      <div class="company-admin-dashboard" *ngIf="!isLoading && companies.length > 0 && authState.isCompanyAdmin()">
        <div class="company-header-card card">
           <div class="card-top" style="margin-bottom: 0;">
              <div class="company-icon">&#128188;</div>
              <div class="company-title-wrap">
                <h3 class="company-name" style="font-size: 1.5rem;">{{ companies[0].name }}</h3>
                <span class="inn-badge">INN: {{ companies[0].inn }}</span>
              </div>
              <button class="btn btn-secondary" style="margin-left: auto;" (click)="openEditCompanyModal(companies[0])">
                &#9998; Tahrirlash
              </button>
           </div>
           <div class="company-details" style="display: flex; gap: 2rem; margin-top: 1.5rem;">
              <div class="detail-item">
                <span class="detail-icon">&#128205;</span>
                <span class="detail-text">{{ companies[0].address }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-icon">&#128222;</span>
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
                <div class="b-address" style="margin-top: 0.75rem;">&#128205; {{ branch.address }}</div>
                <div class="b-phone" *ngIf="branch.phoneNumber">&#128222; {{ branch.phoneNumber }}</div>
                <div class="b-loc" *ngIf="branch.location">&#127760; {{ branch.location }}</div>
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
            <h3 class="modal-title">
              {{ editingCompany ? 'Kompaniyani Tahrirlash' : 'Yangi Kompaniya QoвЂshish' }}
            </h3>
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
                <label class="form-label">Lokatsiya (Kordinata / Shahar)</label>
                <input type="text" class="form-control" id="location" name="location" formControlName="location" placeholder="41.2995, 69.2401" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Manzil *</label>
              <input type="text" class="form-control" id="address" name="address" formControlName="address" placeholder="Chilonzor 9-mavze, 12-uy" />
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
    .header-btns {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .companies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }
    .company-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
    }
    .card-top {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .company-icon {
      font-size: 1.75rem;
      background: var(--primary-light);
      padding: 0.5rem;
      border-radius: var(--radius-md);
    }
    .company-name {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--secondary);
    }
    .inn-badge {
      font-size: 0.75rem;
      color: var(--text-light);
      font-family: monospace;
    }
    .company-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      font-size: 0.875rem;
      color: var(--secondary-light);
    }
    .detail-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .branches-section {
      background: var(--bg-subtle);
      border-radius: var(--radius-md);
      padding: 0.875rem 1rem;
      margin-top: auto;
      margin-bottom: 1rem;
      border: 1px solid var(--border);
    }
    .branches-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .branches-title {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--secondary);
    }
    .view-branches-btn {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--primary);
      cursor: pointer;
    }
    .branches-dropdown {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px dashed var(--border);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 220px;
      overflow-y: auto;
    }
    .branch-item {
      background: #ffffff;
      padding: 0.625rem 0.75rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      font-size: 0.75rem;
    }
    .branch-name-row {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      color: var(--secondary);
      margin-bottom: 0.25rem;
    }
    .b-address, .b-phone, .b-loc {
      color: var(--text-muted);
      margin-top: 0.125rem;
    }
    .branch-loading, .no-branch {
      font-size: 0.75rem;
      color: var(--text-light);
      font-style: italic;
    }
    .company-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 500px) {
      .form-row { grid-template-columns: 1fr; }
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .modal-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .modal-close {
      color: var(--text-light);
      font-size: 1.125rem;
    }
    .modal-body {
      padding: 1.5rem;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
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

  get emptyActionText(): string {
    return this.authState.isAdminMode() ? "Kompaniya qo'shish" : '';
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
        // Preload branches for each company
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
    
    // Fetch users for dropdown
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
        this.notification.error(err?.error?.message || 'Admin tayinlashda xatolik yuz berdi. Balki limit (3) ga yetilgan.');
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





