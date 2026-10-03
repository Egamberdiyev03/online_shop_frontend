import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerService } from '../../core/services/customer.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { Customer, UpdateCustomerDto } from '../../core/models/customer.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Mijoz Kabineti</h1>
          <p class="page-subtitle">Shaxsiy ma'lumotlaringizni boshqaring</p>
        </div>
        <button class="btn btn-secondary" (click)="goToOrders()">Mening Buyurtmalarim</button>
      </div>

      <app-loading-spinner *ngIf="isLoading" message="Ma'lumotlar yuklanmoqda..."></app-loading-spinner>

      <div class="profile-card" *ngIf="!isLoading && form">
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">To'liq ismingiz *</label>
              <input type="text" class="form-control" formControlName="name" placeholder="Masalan: Alisher Navoiy" />
              <div class="form-error" *ngIf="form.get('name')?.touched && form.get('name')?.invalid">
                Ismni kiritish shart (kamida 2 ta belgi).
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Elektron pochta</label>
              <input type="email" class="form-control" formControlName="email" readonly />
              <small class="help-text">Email manzilni o'zgartirib bo'lmaydi.</small>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Telefon raqam</label>
              <input type="tel" class="form-control" formControlName="phoneNumber" placeholder="+998901234567" />
            </div>

            <div class="form-group">
              <label class="form-label">Yashash manzili</label>
              <input type="text" class="form-control" formControlName="address" placeholder="Shahar, ko'cha, uy..." />
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="loadProfile()">Bekor qilish</button>
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid || isSubmitting || !form.dirty">
              {{ isSubmitting ? 'Saqlanmoqda...' : "O'zgarishlarni Saqlash" }}
            </button>
          </div>

        </form>
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
    .profile-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border);
      padding: 2rem;
      max-width: 800px;
      box-shadow: var(--shadow-sm);
    }
    .form-row {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .form-row .form-group {
      flex: 1;
      margin-bottom: 0;
    }
    .help-text {
      display: block;
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: var(--text-light);
    }
    input[readonly] {
      background-color: #f8fafc;
      cursor: not-allowed;
      color: var(--text-muted);
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }
    @media (max-width: 640px) {
      .form-row {
        flex-direction: column;
        gap: 1.5rem;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  private customerService = inject(CustomerService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  form!: FormGroup;
  isLoading = true;
  isSubmitting = false;
  currentCustomer: Customer | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadProfile();
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: [''],
      phoneNumber: [''],
      address: ['']
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
        // reset dirty state
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
        this.notification.success("Ma'lumotlaringiz muvaffaqiyatli saqlandi!");
        this.form.markAsPristine();
        // Update state if needed
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
