import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Customer, CreateCustomerDto, UpdateCustomerDto } from '../../../core/models/customer.model';
import { CustomerService } from '../../../core/services/customer.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CartService } from '../../../core/services/cart.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    LoadingSpinnerComponent, 
    EmptyStateComponent
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Mijozlar Boshqaruvi va Profil</h1>
          <p class="page-subtitle">Ro'yxatdan o'tgan barcha mijozlar profillari va faol sessiyani boshqarish</p>
        </div>

        <button class="btn btn-primary" (click)="openCreateModal()">
          <span>➕</span> Yangi Mijoz Qo'shish
        </button>
      </div>

      <!-- Active Customer Highlight Card -->
      <div class="active-customer-banner card">
        <div class="banner-left">
          <div class="avatar-lg">
            {{ (activeCustomer?.name || 'M').charAt(0).toUpperCase() }}
          </div>
          <div>
            <div class="active-tag">Hozirgi Faol Sessiya</div>
            <h2 class="active-name">{{ activeCustomer?.name || ('Mijoz #' + authState.currentCustomerId()) }}</h2>
            <div class="active-details">
              <span>📧 {{ activeCustomer?.email || "Email kiritilmagan" }}</span>
              <span>📞 {{ activeCustomer?.phoneNumber || "Telefon kiritilmagan" }}</span>
              <span>📍 {{ activeCustomer?.address || "Manzil ko'rsatilmagan" }}</span>
            </div>
          </div>
        </div>
        <div class="banner-right">
          <span class="info-note">Savat va Buyurtmalar ushbu mijoz IDsi bilan bog'lanadi.</span>
        </div>
      </div>

      <app-loading-spinner *ngIf="isLoading" message="Mijozlar ro'yxati yuklanmoqda..."></app-loading-spinner>

      <app-empty-state 
        *ngIf="!isLoading && customers.length === 0"
        icon="👥"
        title="Mijozlar mavjud emas"
        description="Hozircha tizimda birorta ham mijoz ro'yxatdan o'tmagan."
        actionText="Mijoz qo'shish"
        (actionClick)="openCreateModal()"
      ></app-empty-state>

      <!-- Customer Cards Grid -->
      <div class="customers-grid" *ngIf="!isLoading && customers.length > 0">
        <div 
          class="customer-card card" 
          *ngFor="let c of customers"
          [class.is-active-card]="c.id === authState.currentCustomerId()"
        >
          <div class="card-head">
            <div class="c-avatar">{{ c.name.charAt(0).toUpperCase() }}</div>
            <div class="c-title">
              <h3 class="c-name">{{ c.name }}</h3>
              <span class="c-id">ID: #{{ c.id }}</span>
            </div>
            <span class="active-badge" *ngIf="c.id === authState.currentCustomerId()">
              Faol
            </span>
          </div>

          <div class="c-info-list">
            <div class="c-info-row">
              <span class="c-label">Email:</span>
              <span class="c-val">{{ c.email }}</span>
            </div>
            <div class="c-info-row">
              <span class="c-label">Telefon:</span>
              <span class="c-val">{{ c.phoneNumber }}</span>
            </div>
            <div class="c-info-row">
              <span class="c-label">Manzil:</span>
              <span class="c-val">{{ c.address }}</span>
            </div>
            <div class="c-info-row" *ngIf="c.location">
              <span class="c-label">Lokatsiya:</span>
              <span class="c-val">{{ c.location }}</span>
            </div>
          </div>

          <div class="card-bottom">
            <button 
              class="btn btn-secondary btn-sm switch-btn"
              [disabled]="c.id === authState.currentCustomerId()"
              (click)="setActiveCustomer(c)"
            >
              {{ c.id === authState.currentCustomerId() ? '✔ Hozirgi tanlangan' : '👉 Faol qilish' }}
            </button>

            <div class="admin-btns" *ngIf="authState.isAdminMode()">
              <button class="btn btn-secondary btn-sm" (click)="openEditModal(c)" title="Tahrirlash">✏</button>
              <button class="btn btn-danger btn-sm" (click)="deleteCustomer(c)" title="O'chirish">🗑</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Create / Edit Customer Modal -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">
              {{ modalTitle }}
            </h3>
            <button class="modal-close" (click)="closeModal()">✕</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="modal-body">
            <div class="form-group">
              <label class="form-label">To'liq Ismi *</label>
              <input type="text" class="form-control" formControlName="name" placeholder="Masalan: Sardor Aliyev" />
              <div class="form-error" *ngIf="form.get('name')?.touched && form.get('name')?.invalid">
                Ism kiritilishi shart (kamida 2 ta belgi).
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Email Manzili *</label>
                <input type="email" class="form-control" formControlName="email" placeholder="sardor@example.com" />
                <div class="form-error" *ngIf="form.get('email')?.touched && form.get('email')?.invalid">
                  To'g'ri email manzil kiriting.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Telefon Raqami *</label>
                <input type="text" class="form-control" formControlName="phoneNumber" placeholder="+998 90 123 45 67" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Manzil *</label>
                <input type="text" class="form-control" formControlName="address" placeholder="Toshkent, Mirzo Ulug'bek" />
              </div>

              <div class="form-group">
                <label class="form-label">Lokatsiya / Hudud</label>
                <input type="text" class="form-control" formControlName="location" placeholder="Toshkent shahar" />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Bekor qilish</button>
              <button type="submit" class="btn btn-primary" [disabled]="form.invalid || isSubmitting">
                {{ isSubmitting ? 'Saqlanmoqda...' : (editingCustomer ? 'Saqlash' : 'Mijozni yaratish') }}
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
    .active-customer-banner {
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff;
      padding: 1.75rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    .banner-left {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .avatar-lg {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 800;
    }
    .active-tag {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #93c5fd;
      font-weight: 700;
    }
    .active-name {
      font-size: 1.375rem;
      font-weight: 800;
      margin: 0.125rem 0 0.375rem;
    }
    .active-details {
      display: flex;
      gap: 1rem;
      font-size: 0.8125rem;
      color: #dbeafe;
      flex-wrap: wrap;
    }
    .info-note {
      font-size: 0.8125rem;
      color: #bfdbfe;
      background: rgba(0, 0, 0, 0.15);
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius-sm);
    }
    .customers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }
    .customer-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      border-radius: var(--radius-lg);
      transition: var(--transition);
    }
    .customer-card.is-active-card {
      border: 2px solid var(--primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }
    .card-head {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .c-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--primary-light);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.125rem;
    }
    .c-title {
      flex: 1;
    }
    .c-name {
      font-size: 1.0625rem;
      font-weight: 700;
      color: var(--secondary);
    }
    .c-id {
      font-size: 0.75rem;
      color: var(--text-light);
    }
    .active-badge {
      background: var(--success-bg);
      color: var(--success);
      padding: 0.25rem 0.625rem;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: var(--radius-full);
    }
    .c-info-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.8125rem;
      margin-bottom: 1.5rem;
    }
    .c-info-row {
      display: flex;
      gap: 0.5rem;
    }
    .c-label {
      color: var(--text-light);
      min-width: 65px;
    }
    .c-val {
      color: var(--secondary-light);
      font-weight: 500;
      word-break: break-all;
    }
    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }
    .switch-btn {
      flex: 1;
      margin-right: 0.5rem;
    }
    .admin-btns {
      display: flex;
      gap: 0.25rem;
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
export class CustomerListComponent implements OnInit {
  private customerService = inject(CustomerService);
  public authState = inject(AuthStateService);
  private cartService = inject(CartService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);

  customers: Customer[] = [];
  isLoading = true;

  showModal = false;
  editingCustomer: Customer | null = null;
  isSubmitting = false;
  form!: FormGroup;

  get modalTitle(): string {
    return this.editingCustomer ? "Mijoz Ma'lumotlarini Tahrirlash" : "Yangi Mijoz Qo'shish";
  }

  get activeCustomer(): Customer | null {
    return this.customers.find(c => c.id === this.authState.currentCustomerId()) || this.authState.currentCustomer();
  }

  ngOnInit(): void {
    this.initForm();
    this.loadCustomers();
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      address: ['', Validators.required],
      location: ['']
    });
  }

  loadCustomers(): void {
    this.isLoading = true;
    this.customerService.getAll().subscribe({
      next: (list) => {
        this.customers = list;
        this.isLoading = false;
        const current = list.find(c => c.id === this.authState.currentCustomerId());
        if (current) {
          this.authState.setCustomer(current);
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  setActiveCustomer(customer: Customer): void {
    this.authState.setCustomer(customer);
    this.notification.success(`Faol mijoz "${customer.name}" (#${customer.id}) ga o'zgartirildi.`);
    // Refresh cart for newly activated customer
    this.cartService.getByCustomerId(customer.id).subscribe({ error: () => {} });
  }

  openCreateModal(): void {
    this.editingCustomer = null;
    this.form.reset();
    this.showModal = true;
  }

  openEditModal(customer: Customer): void {
    this.editingCustomer = customer;
    this.form.patchValue({
      name: customer.name,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      address: customer.address,
      location: customer.location
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingCustomer = null;
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.isSubmitting = true;

    const val = this.form.value;

    if (this.editingCustomer) {
      const updateDto: UpdateCustomerDto = {
        id: this.editingCustomer.id,
        name: val.name,
        email: val.email,
        phoneNumber: val.phoneNumber,
        address: val.address,
        location: val.location || ''
      };

      this.customerService.update(updateDto).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.notification.success("Mijoz ma'lumotlari yangilandi!");
          this.closeModal();
          this.loadCustomers();
        },
        error: () => {
          this.isSubmitting = false;
        }
      });
    } else {
      const createDto: CreateCustomerDto = {
        name: val.name,
        email: val.email,
        phoneNumber: val.phoneNumber,
        address: val.address,
        location: val.location || ''
      };

      this.customerService.create(createDto).subscribe({
        next: (created) => {
          this.isSubmitting = false;
          this.notification.success("Yangi mijoz ro'yxatdan o'tkazildi!");
          this.closeModal();
          this.loadCustomers();
        },
        error: () => {
          this.isSubmitting = false;
        }
      });
    }
  }

  deleteCustomer(customer: Customer): void {
    if (!confirm(`"${customer.name}" mijozini o'chirmoqchimisiz?`)) return;

    this.customerService.delete(customer.id).subscribe({
      next: () => {
        this.notification.success(`"${customer.name}" o'chirildi.`);
        this.customers = this.customers.filter(c => c.id !== customer.id);
      },
      error: () => {}
    });
  }
}
