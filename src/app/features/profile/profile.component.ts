import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerService } from '../../core/services/customer.service';
import { CompanyService } from '../../core/services/company.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { Customer, UpdateCustomerDto } from '../../core/models/customer.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LoadingSpinnerComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ pageTitle }}</h1>
          <p class="page-subtitle">{{ pageSubtitle }}</p>
        </div>

        <div class="header-btns">
          <!-- Mijoz uchun buyurtmalar tugmasi -->
          <button class="btn btn-secondary" (click)="goToOrders()" *ngIf="authState.isCustomer()">
            🛍️ Mening Buyurtmalarim
          </button>
          <!-- CompanyAdmin uchun kompaniya sahifasiga havola -->
          <a
            class="btn btn-primary"
            *ngIf="authState.isCompanyAdmin() && authState.userCompanyId()"
            [routerLink]="['/companies', authState.userCompanyId()]"
          >
            🏢 Mening Kompaniyam
          </a>
          <!-- BranchManager uchun filial sahifasiga havola -->
          <a
            class="btn btn-primary"
            *ngIf="authState.isBranchManager() && authState.userBranchId()"
            [routerLink]="['/branches', authState.userBranchId()]"
          >
            🏪 Mening Filialim
          </a>
          <!-- SuperAdmin uchun boshqaruv paneli -->
          <a class="btn btn-primary" routerLink="/admin" *ngIf="authState.isSuperAdmin()">
            ⚙️ Boshqaruv Paneli
          </a>
        </div>
      </div>

      <app-loading-spinner *ngIf="isLoading" message="Maʻlumotlar yuklanmoqda..."></app-loading-spinner>

      <div class="profile-card" *ngIf="!isLoading && form">
        <!-- User Banner Header -->
        <div class="profile-user-banner" *ngIf="currentCustomer">
          <div class="avatar-circle">
            {{ avatarIcon }}
          </div>
          <div class="user-meta">
            <div class="user-name-row">
              <h2 class="user-display-name">{{ currentCustomer.name }}</h2>
              <span
                class="role-badge"
                [class.company-admin]="authState.isCompanyAdmin()"
                [class.super-admin]="authState.isSuperAdmin()"
                [class.branch-manager]="authState.isBranchManager()"
              >
                {{ authState.userRole() || 'Mijoz' }}
              </span>
            </div>
            <p class="user-display-email">{{ currentCustomer.email }}</p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Toʻliq ismingiz *</label>
              <input type="text" class="form-control" formControlName="name" placeholder="Masalan: Alisher Navoiy" />
              <div class="form-error" *ngIf="form.get('name')?.touched && form.get('name')?.invalid">
                Ismni kiritish shart (kamida 2 ta belgi).
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Elektron pochta</label>
              <input type="email" class="form-control" formControlName="email" readonly />
              <small class="help-text">Email manzilni oʻzgartirib boʻlmaydi.</small>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Telefon raqam</label>
              <input type="tel" class="form-control" formControlName="phoneNumber" placeholder="+998901234567" />
            </div>

            <!-- Yashash manzili faqat Customer uchun ko'rinadi -->
            <div class="form-group" *ngIf="authState.isCustomer()">
              <label class="form-label">Yashash manzili</label>
              <input type="text" class="form-control" formControlName="address" placeholder="Shahar, koʻcha, uy..." />
            </div>

            <!-- CompanyAdmin uchun kompaniya nomi ko'rinadi -->
            <div class="form-group" *ngIf="authState.isCompanyAdmin()">
              <label class="form-label">Kompaniya</label>
              <input type="text" class="form-control" [value]="companyName" readonly />
              <small class="help-text">Kompaniya maʻlumotlarini kompaniya sahifasida tahrirlashingiz mumkin.</small>
            </div>

            <!-- BranchManager uchun filial nomi ko'rinadi -->
            <div class="form-group" *ngIf="authState.isBranchManager()">
              <label class="form-label">Filial</label>
              <input type="text" class="form-control" [value]="branchName" readonly />
              <small class="help-text">Filial maʻlumotlarini filial sahifasida tahrirlashingiz mumkin.</small>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="loadProfile()">Bekor qilish</button>
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid || isSubmitting || !form.dirty">
              {{ isSubmitting ? 'Saqlanmoqda...' : "Oʻzgarishlarni Saqlash" }}
            </button>
          </div>

        </form>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem 1.25rem 4rem;
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
      font-size: 2rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0 0 0.35rem;
    }
    .page-subtitle {
      color: #64748b;
      font-size: 0.925rem;
      margin: 0;
    }
    .header-btns {
      display: flex;
      gap: 0.75rem;
    }

    /* Profile Card */
    .profile-card {
      background: #ffffff;
      border-radius: 18px;
      border: 1px solid #e2e8f0;
      padding: 2.25rem;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
    }

    /* User Banner Header */
    .profile-user-banner {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding-bottom: 1.75rem;
      margin-bottom: 1.75rem;
      border-bottom: 1px solid #f1f5f9;
      flex-wrap: wrap;
    }
    .avatar-circle {
      width: 60px;
      height: 60px;
      border-radius: 16px;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.85rem;
      flex-shrink: 0;
    }
    .user-meta {
      flex: 1;
    }
    .user-name-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-bottom: 0.25rem;
    }
    .user-display-name {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .role-badge {
      font-size: 0.72rem;
      font-weight: 700;
      color: #4338ca;
      background: #e0e7ff;
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .role-badge.company-admin {
      background: #ffedd5;
      color: #c2410c;
    }
    .role-badge.super-admin {
      background: #fee2e2;
      color: #b91c1c;
    }
    .role-badge.branch-manager {
      background: #fef3c7;
      color: #b45309;
    }
    .user-display-email {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
    }

    /* Form Layout */
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.25rem;
    }
    @media (max-width: 640px) {
      .form-row {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
    }
    .form-group {
      display: flex;
      flex-direction: column;
    }
    .form-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.45rem;
    }
    .form-control {
      width: 100%;
      padding: 0.65rem 0.85rem;
      font-size: 0.9rem;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      outline: none;
      transition: all 0.2s;
    }
    .form-control:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }
    input[readonly] {
      background-color: #f8fafc;
      cursor: not-allowed;
      color: #64748b;
    }
    .help-text {
      display: block;
      margin-top: 0.35rem;
      font-size: 0.775rem;
      color: #94a3b8;
    }
    .form-error {
      color: #ef4444;
      font-size: 0.75rem;
      margin-top: 0.35rem;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1.75rem;
      padding-top: 1.5rem;
      border-top: 1px solid #f1f5f9;
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
    :host-context(body.dark-theme) .profile-card,
    :host-context(.dark-theme) .profile-card {
      background: #151e32 !important;
      border-color: #22304d !important;
    }
    :host-context(body.dark-theme) .profile-user-banner,
    :host-context(.dark-theme) .profile-user-banner {
      border-bottom-color: #22304d;
    }
    :host-context(body.dark-theme) .avatar-circle,
    :host-context(.dark-theme) .avatar-circle {
      background: #1e1b4b;
      border-color: #3730a3;
    }
    :host-context(body.dark-theme) .user-display-name,
    :host-context(.dark-theme) .user-display-name {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .user-display-email,
    :host-context(.dark-theme) .user-display-email {
      color: #94a3b8;
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
    :host-context(body.dark-theme) input[readonly],
    :host-context(.dark-theme) input[readonly] {
      background-color: #0b0f19 !important;
      border-color: #334155 !important;
      color: #94a3b8 !important;
    }
    :host-context(body.dark-theme) .help-text,
    :host-context(.dark-theme) .help-text {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .form-actions,
    :host-context(.dark-theme) .form-actions {
      border-top-color: #22304d;
    }
  `]
})
export class ProfileComponent implements OnInit {
  private customerService = inject(CustomerService);
  private companyService = inject(CompanyService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  form!: FormGroup;
  isLoading = true;
  isSubmitting = false;
  currentCustomer: Customer | null = null;
  companyName = '';
  branchName = ''; // BranchManager uchun filial nomi

  get avatarIcon(): string {
    if (this.authState.isSuperAdmin()) return '⚡';
    if (this.authState.isCompanyAdmin()) return '🏢';
    if (this.authState.isBranchManager()) return '🏪';
    return '👤';
  }

  get pageTitle(): string {
    if (this.authState.isSuperAdmin()) return 'Super Admin Profili';
    if (this.authState.isCompanyAdmin()) return 'Kompaniya Profili';
    if (this.authState.isBranchManager()) return 'Filial Menejer Profili';
    return 'Mijoz Kabineti';
  }

  get pageSubtitle(): string {
    if (this.authState.isSuperAdmin()) {
      return 'Super admin profil sozlamalari';
    }
    if (this.authState.isCompanyAdmin()) {
      return 'Kompaniya administratori maʻlumotlari va sozlamalari';
    }
    if (this.authState.isBranchManager()) {
      return 'Filial boshqaruvchisi maʻlumotlari va sozlamalari';
    }
    return 'Shaxsiy maʻlumotlaringiz va profil sozlamalarini boshqaring';
  }

  ngOnInit(): void {
    this.initForm();
    this.loadProfile();
    this.loadCompanyName();
    this.loadBranchName();
  }

  private loadCompanyName(): void {
    if (this.authState.isCompanyAdmin()) {
      const companyId = this.authState.userCompanyId();
      console.log('[Profile] CompanyAdmin detected, companyId from token:', companyId);

      if (companyId) {
        this.companyService.getCompanyById(companyId).subscribe({
          next: (company) => {
            console.log('[Profile] Company loaded:', company);
            this.companyName = company?.name || 'Noma\'lum kompaniya';
          },
          error: (err) => {
            console.error('[Profile] Error loading company:', err);
            this.companyName = 'Noma\'lum kompaniya';
          }
        });
      } else {
        console.warn('[Profile] CompanyId is NULL! User needs to be assigned via /User/AssignCompanyAdmin API');
        this.companyName = 'Kompaniya tayinlanmagan';
      }
    }
  }

  private loadBranchName(): void {
    if (this.authState.isBranchManager()) {
      const branchId = this.authState.userBranchId();
      console.log('[Profile] BranchManager detected, branchId from token:', branchId);

      if (branchId) {
        this.companyService.getBranchById(branchId).subscribe({
          next: (branch) => {
            console.log('[Profile] Branch loaded:', branch);
            this.branchName = branch?.name || 'Noma\'lum filial';
          },
          error: (err) => {
            console.error('[Profile] Error loading branch:', err);
            this.branchName = 'Noma\'lum filial';
          }
        });
      } else {
        console.warn('[Profile] BranchId is NULL! User needs to be assigned via /User/AssignBranchManager API');
        this.branchName = 'Filial tayinlanmagan';
      }
    }
  }

  private initForm(): void {
    // Address faqat Customer uchun majburiy
    const addressValidators = this.authState.isCustomer() ? [Validators.required] : [];

    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: [''],
      phoneNumber: [''],
      address: ['', addressValidators]
    });
  }

  loadProfile(): void {
    this.isLoading = true;
    const userId = this.authState.currentCustomerId();
    
    this.customerService.getById(userId).subscribe({
      next: (customer) => {
        this.currentCustomer = customer;
        this.form.patchValue({
          name: customer.name,
          email: customer.email,
          phoneNumber: customer.phoneNumber,
          address: customer.address
        });
        this.form.markAsPristine();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.currentCustomer) return;
    this.isSubmitting = true;

    const val = this.form.value;
    const updateDto: UpdateCustomerDto = {
      id: this.currentCustomer.id,
      name: val.name,
      email: this.currentCustomer.email, 
      phoneNumber: val.phoneNumber,
      address: val.address,
      location: this.currentCustomer.location || ''
    };

    this.customerService.update(updateDto).subscribe({
      next: (updated) => {
        this.isSubmitting = false;
        this.notification.success("Maʻlumotlaringiz muvaffaqiyatli saqlandi!");
        this.form.markAsPristine();
        this.authState.setCustomer(updated);
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  goToOrders(): void {
    this.router.navigate(['/orders']);
  }
}
