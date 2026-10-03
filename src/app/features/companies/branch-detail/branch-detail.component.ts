import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService } from '../../../core/services/company.service';
import { CustomerService } from '../../../core/services/customer.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { Product } from '../../../core/models/product.model';
import { Customer } from '../../../core/models/customer.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-branch-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LoadingSpinnerComponent],
  template: `
    <div class="page-header" *ngIf="branch">
      <h1 class="page-title">{{ branch.name }} (Filial)</h1>
      <p class="page-subtitle">Filial ma'lumotlari, mahsulotlar va xodimlar boshqaruvi</p>
    </div>

    <app-loading-spinner *ngIf="isLoading"></app-loading-spinner>

    <div class="branch-detail-container" *ngIf="!isLoading && branch">
      <div class="branch-header-card card">
         <div class="card-top">
            <div class="branch-icon">&#127970;</div>
            <div class="branch-title-wrap">
              <h3 class="branch-name">{{ branch.name }}</h3>
              <span class="loc-badge">{{ branch.location || "Manzil yo'q" }}</span>
            </div>
         </div>
         <div class="branch-details">
            <div class="detail-item">
              <span class="detail-icon">&#128205;</span>
              <span class="detail-text">{{ branch.address }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">&#128222;</span>
              <span class="detail-text">{{ branch.phoneNumber }}</span>
            </div>
         </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="custom-tabs">
        <button class="tab-btn" [class.active]="activeTab === 'products'" (click)="activeTab = 'products'">
          &#128230; Mahsulotlar ({{ products.length }})
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'users'" (click)="setTab('users')">
          &#128101; Xodimlar va Mudirlar ({{ branchUsers.length }})
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'comments'" (click)="activeTab = 'comments'">
          &#11088; Sharhlar
        </button>
      </div>

      <!-- Tab 1: Products -->
      <div class="tab-content card" *ngIf="activeTab === 'products'">
         <div class="tab-header-row">
           <h3 style="margin: 0;">Filial mahsulotlari (Ombor qoldig'i)</h3>
         </div>
         <div *ngIf="isProductsLoading" style="text-align: center; padding: 2rem;">Yuklanmoqda...</div>
         <table class="table custom-table" *ngIf="!isProductsLoading && products.length > 0">
           <thead>
             <tr>
               <th>ID</th>
               <th>Nomi</th>
               <th>Narxi</th>
               <th>Qoldiq</th>
               <th>Sana</th>
             </tr>
           </thead>
           <tbody>
             <tr *ngFor="let p of products">
               <td>#{{ p.id }}</td>
               <td class="fw-bold">{{ p.name }}</td>
               <td>{{ p.price | number:'1.0-0' }} so'm</td>
               <td><span class="stock-badge">{{ p.quantity }} dona</span></td>
               <td>{{ p.createdAt | date:'shortDate' }}</td>
             </tr>
           </tbody>
         </table>
         <div *ngIf="!isProductsLoading && products.length === 0" style="padding: 2.5rem; text-align: center; color: #888;">
           Ushbu filialda mahsulotlar mavjud emas.
         </div>
      </div>

      <!-- Tab 2: Users & Branch Manager -->
      <div class="tab-content card" *ngIf="activeTab === 'users'">
         <div class="tab-header-row">
           <div>
             <h3 style="margin: 0;">Filial Mudirlari va Xodimlari</h3>
             <p style="margin: 0.25rem 0 0; color: #64748b; font-size: 0.875rem;">Ushbu filial faoliyatini boshqaruvchi mas'ul shaxslar</p>
           </div>
           <button class="btn btn-primary btn-sm" (click)="openAssignModal()" *ngIf="authState.isAdminMode()">
             &#128100; Mudir (Admin) Tayinlash
           </button>
         </div>

         <div *ngIf="isUsersLoading" style="text-align: center; padding: 2rem;">Yuklanmoqda...</div>

         <table class="table custom-table" *ngIf="!isUsersLoading && branchUsers.length > 0">
           <thead>
             <tr>
               <th>ID</th>
               <th>Ismi</th>
               <th>Email</th>
               <th>Telefon</th>
               <th>Roli</th>
               <th *ngIf="authState.isAdminMode()">Amallar</th>
             </tr>
           </thead>
           <tbody>
             <tr *ngFor="let u of branchUsers">
               <td>#{{ u.id }}</td>
               <td class="fw-bold">{{ u.name }}</td>
               <td>{{ u.email }}</td>
               <td>{{ u.phoneNumber || 'Kiritilmagan' }}</td>
               <td>
                 <span class="role-pill" [class.manager]="u.role === 'BranchManager'">
                   {{ u.role === 'BranchManager' ? '🏬 Filial Mudiri' : (u.role || 'Xodim') }}
                 </span>
               </td>
               <td *ngIf="authState.isAdminMode()">
                 <button class="btn btn-danger btn-sm" (click)="removeManager(u)" title="Mudir vazifasidan ozod qilish">
                   &#10006; Vazifadan olish
                 </button>
               </td>
             </tr>
           </tbody>
         </table>

         <div *ngIf="!isUsersLoading && branchUsers.length === 0" style="padding: 2.5rem; text-align: center; color: #888;">
           <p>Hozircha ushbu filialga mudir yoki xodim tayinlanmagan.</p>
           <button class="btn btn-outline-primary btn-sm" (click)="openAssignModal()" *ngIf="authState.isAdminMode()" style="margin-top: 0.5rem;">
             &#128100; Birinchi mudirni tayinlash
           </button>
         </div>
      </div>

      <!-- Tab 3: Comments -->
      <div class="tab-content card" *ngIf="activeTab === 'comments'">
         <h3 style="margin-bottom: 1.5rem;">Filial mahsulotlariga sharhlar</h3>
         <p style="color: var(--text-light); font-style: italic;">
           Hozircha ushbu filial mahsulotlari uchun sharhlar mavjud emas.
         </p>
      </div>
    </div>

    <!-- Assign Manager Modal -->
    <div class="modal-overlay" *ngIf="showAssignModal" (click)="closeAssignModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">Filial Mudirini Tayinlash</h3>
          <button class="modal-close" (click)="closeAssignModal()">&times;</button>
        </div>

        <form [formGroup]="assignForm" (ngSubmit)="submitAssign()" class="modal-body">
          <p style="color: #64748b; font-size: 0.875rem; margin-bottom: 1rem;">
            <strong>{{ branch?.name }}</strong> filialiga boshqaruvchi sifatida biriktirish uchun tizim foydalanuvchisini tanlang:
          </p>

          <div class="form-group">
            <label class="form-label">Foydalanuvchini tanlang *</label>
            <select class="form-control" formControlName="userId">
              <option [ngValue]="null" disabled>Foydalanuvchini tanlang</option>
              <option *ngFor="let c of allCustomers" [value]="c.id">
                #{{ c.id }} - {{ c.name }} ({{ c.email }})
              </option>
            </select>
            <div class="form-error" *ngIf="assignForm.get('userId')?.touched && assignForm.get('userId')?.invalid">
              Foydalanuvchini tanlash shart.
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeAssignModal()" [disabled]="isSubmitting">Bekor qilish</button>
            <button type="submit" class="btn btn-primary" [disabled]="assignForm.invalid || isSubmitting">
              {{ isSubmitting ? 'Tayinlanmoqda...' : 'Mudir qilib tayinlash' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .branch-header-card { padding: 2rem; background: white; border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); margin-bottom: 2rem; }
    .card-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .branch-icon { font-size: 2.5rem; }
    .branch-name { font-size: 1.5rem; font-weight: 700; color: var(--secondary); margin: 0; }
    .loc-badge { background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; color: var(--text-light); }
    .branch-details { display: flex; gap: 2rem; }
    .detail-item { display: flex; align-items: center; gap: 0.5rem; color: var(--text-main); font-size: 0.875rem; }
    .custom-tabs { display: flex; gap: 1rem; margin-bottom: 1rem; border-bottom: 2px solid var(--border); }
    .tab-btn { background: none; border: none; padding: 0.75rem 1.5rem; font-size: 0.9375rem; font-weight: 600; color: var(--text-light); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
    .tab-btn:hover { color: var(--primary); }
    .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); font-weight: 700; }
    .tab-content { padding: 2rem; background: white; border-radius: var(--radius-lg); }
    .tab-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .custom-table { width: 100%; border-collapse: collapse; }
    .custom-table th { text-align: left; padding: 1rem; border-bottom: 2px solid #eee; color: var(--text-light); text-transform: uppercase; font-size: 0.75rem; }
    .custom-table td { padding: 1rem; border-bottom: 1px solid #eee; font-size: 0.875rem; }
    .fw-bold { font-weight: 600; color: #1e293b; }
    .stock-badge { background: #e0f2fe; color: #0369a1; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.8rem; }
    .role-pill { background: #f1f5f9; color: #475569; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
    .role-pill.manager { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: white; border-radius: 12px; width: 100%; max-width: 480px; padding: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .modal-title { font-size: 1.25rem; font-weight: 700; margin: 0; color: #0f172a; }
    .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
    .form-group { margin-bottom: 1.25rem; }
    .form-label { display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.375rem; color: #334155; }
    .form-control { width: 100%; padding: 0.625rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.875rem; box-sizing: border-box; }
    .form-error { color: #ef4444; font-size: 0.75rem; margin-top: 0.25rem; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
  `]
})
export class BranchDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private companyService = inject(CompanyService);
  private customerService = inject(CustomerService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);
  authState = inject(AuthStateService);

  branchId!: number;
  branch: CompanyBranch | null = null;
  isLoading = true;

  activeTab: 'products' | 'users' | 'comments' = 'products';
  
  products: Product[] = [];
  isProductsLoading = false;

  branchUsers: Customer[] = [];
  isUsersLoading = false;

  allCustomers: Customer[] = [];
  showAssignModal = false;
  isSubmitting = false;

  assignForm: FormGroup = this.fb.group({
    userId: [null, Validators.required]
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.branchId = +id;
        this.loadBranchDetails();
      }
    });
  }

  setTab(tab: 'products' | 'users' | 'comments'): void {
    this.activeTab = tab;
    if (tab === 'users') {
      this.loadUsers();
    }
  }

  loadBranchDetails(): void {
    this.isLoading = true;
    this.companyService.getBranchById(this.branchId).subscribe({
      next: (b) => {
        this.branch = b;
        this.isLoading = false;
        this.loadProducts();
        this.loadUsers();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadProducts(): void {
    this.isProductsLoading = true;
    this.companyService.getBranchProducts(this.branchId).subscribe({
      next: (prods) => {
        this.products = prods;
        this.isProductsLoading = false;
      },
      error: () => {
        this.isProductsLoading = false;
      }
    });
  }

  loadUsers(): void {
    this.isUsersLoading = true;
    this.customerService.getUsersByBranchId(this.branchId).subscribe({
      next: (users) => {
        this.branchUsers = users;
        this.isUsersLoading = false;
      },
      error: () => {
        this.isUsersLoading = false;
      }
    });
  }

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
      error: () => {
        this.notification.error("Mudirni vazifadan olishda xatolik yuz berdi.");
      }
    });
  }
}
