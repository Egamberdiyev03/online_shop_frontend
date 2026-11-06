import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerService } from '../../../core/services/customer.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TelegramService } from '../../../core/services/telegram.service';
import { Customer, UpdateCustomerDto } from '../../../core/models/customer.model';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="settings-page">
      <!-- Header -->
      <header class="page-header">
        <h1 class="page-title">Sozlamalar</h1>
      </header>

      <!-- Loading Skeleton -->
      <div class="skeleton-form" *ngIf="isLoading">
        <div class="skeleton-field" *ngFor="let i of [1,2,3]">
          <div class="skeleton-label"></div>
          <div class="skeleton-input"></div>
        </div>
        <div class="skeleton-button"></div>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="hasError && !isLoading">
        <div class="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p class="error-text">Ma'lumotlarni yuklashda xatolik</p>
        <button class="btn btn-primary" (click)="loadProfile()">Qayta urinish</button>
      </div>

      <!-- Form -->
      <form
        *ngIf="!isLoading && !hasError && form"
        [formGroup]="form"
        (ngSubmit)="onSubmit()"
        class="settings-form"
      >
        <!-- Name -->
        <div class="form-group">
          <label class="form-label" for="name">Ism</label>
          <input
            type="text"
            id="name"
            class="form-control"
            formControlName="name"
            placeholder="Ismingiz"
          />
          <span class="form-error" *ngIf="form.get('name')?.touched && form.get('name')?.errors?.['required']">
            Ismni kiriting
          </span>
          <span class="form-error" *ngIf="form.get('name')?.touched && form.get('name')?.errors?.['minlength']">
            Ism kamida 2 ta belgidan iborat bo'lishi kerak
          </span>
        </div>

        <!-- Phone -->
        <div class="form-group">
          <label class="form-label" for="phone">Telefon raqam</label>
          <input
            type="tel"
            id="phone"
            class="form-control"
            formControlName="phoneNumber"
            placeholder="+998 90 123 45 67"
          />
          <span class="form-error" *ngIf="form.get('phoneNumber')?.touched && form.get('phoneNumber')?.errors?.['pattern']">
            Telefon raqam noto'g'ri formatda. +998 va 9 raqam kiriting
          </span>
        </div>

        <!-- Address -->
        <div class="form-group">
          <label class="form-label" for="address">Manzil</label>
          <input
            type="text"
            id="address"
            class="form-control"
            formControlName="address"
            placeholder="Shahar, tuman, ko'cha..."
          />
        </div>

        <!-- Save Button -->
        <button
          type="submit"
          class="btn btn-primary save-btn"
          [disabled]="form.invalid || !form.dirty || isSaving"
        >
          <span *ngIf="!isSaving">Saqlash</span>
          <span *ngIf="isSaving" class="saving-state">
            <span class="spinner-small"></span>
            Saqlanmoqda...
          </span>
        </button>
      </form>
    </div>
  `,
  styles: [`
    .settings-page {
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--bg-main, #f8fafc);
      padding: 16px;
      padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    }

    /* Header */
    .page-header {
      margin-bottom: 24px;
    }

    .page-title {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-main, #0f172a);
      margin: 0;
    }

    /* Skeleton */
    .skeleton-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .skeleton-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-label {
      width: 80px;
      height: 16px;
      background: linear-gradient(90deg, var(--bg-subtle, #f1f5f9) 25%, var(--bg-card, #ffffff) 50%, var(--bg-subtle, #f1f5f9) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }

    .skeleton-input {
      height: 48px;
      background: linear-gradient(90deg, var(--bg-subtle, #f1f5f9) 25%, var(--bg-card, #ffffff) 50%, var(--bg-subtle, #f1f5f9) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 12px;
    }

    .skeleton-button {
      height: 52px;
      margin-top: 12px;
      background: linear-gradient(90deg, var(--bg-subtle, #f1f5f9) 25%, var(--bg-card, #ffffff) 50%, var(--bg-subtle, #f1f5f9) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 14px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Error State */
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
    }

    .error-icon {
      color: var(--text-light, #94a3b8);
      margin-bottom: 16px;
    }

    .error-text {
      color: var(--text-muted, #64748b);
      font-size: 14px;
      margin-bottom: 16px;
    }

    /* Form */
    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main, #0f172a);
      margin-bottom: 8px;
    }

    .form-control {
      width: 100%;
      height: 48px;
      padding: 0 16px;
      font-size: 16px;
      font-family: inherit;
      color: var(--text-main, #0f172a);
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      outline: none;
      transition: all 0.2s;
    }

    .form-control:focus {
      border-color: var(--primary, #4f46e5);
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }

    .form-control::placeholder {
      color: var(--text-light, #94a3b8);
    }

    .form-error {
      font-size: 13px;
      color: var(--danger, #ef4444);
      margin-top: 6px;
    }

    /* Save Button */
    .save-btn {
      width: 100%;
      height: 52px;
      margin-top: 12px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 14px;
    }

    .save-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .saving-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .spinner-small {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Dark Theme */
    :host-context(body.dark-theme) .page-title,
    :host-context(.dark-theme) .page-title {
      color: var(--text-main, #f8fafc);
    }

    :host-context(body.dark-theme) .form-label,
    :host-context(.dark-theme) .form-label {
      color: var(--text-main, #f8fafc);
    }

    :host-context(body.dark-theme) .form-control,
    :host-context(.dark-theme) .form-control {
      background: var(--bg-card, #151e32);
      border-color: var(--border, #334155);
      color: var(--text-main, #f8fafc);
    }

    :host-context(body.dark-theme) .form-control:focus,
    :host-context(.dark-theme) .form-control:focus {
      border-color: var(--primary, #6366f1);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
    }

    :host-context(body.dark-theme) .skeleton-label,
    :host-context(body.dark-theme) .skeleton-input,
    :host-context(body.dark-theme) .skeleton-button,
    :host-context(.dark-theme) .skeleton-label,
    :host-context(.dark-theme) .skeleton-input,
    :host-context(.dark-theme) .skeleton-button {
      background: linear-gradient(90deg, #1e293b 25%, #151e32 50%, #1e293b 75%);
      background-size: 200% 100%;
    }
  `]
})
export class ProfileSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private customerService = inject(CustomerService);
  private authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private tg = inject(TelegramService);

  form!: FormGroup;
  currentCustomer: Customer | null = null;
  isLoading = true;
  hasError = false;
  isSaving = false;

  ngOnInit(): void {
    this.initForm();
    this.loadProfile();
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['', [Validators.pattern(/^\+998\d{9}$/)]],
      address: ['']
    });
  }

  loadProfile(): void {
    this.isLoading = true;
    this.hasError = false;

    const userId = this.authState.currentCustomerId();
    if (!userId) {
      this.isLoading = false;
      this.hasError = true;
      return;
    }

    this.customerService.getById(userId).subscribe({
      next: (customer) => {
        this.currentCustomer = customer;
        this.form.patchValue({
          name: customer.name || '',
          phoneNumber: customer.phoneNumber || '',
          address: customer.address || ''
        });
        this.form.markAsPristine();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.hasError = true;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.currentCustomer || this.isSaving) return;

    this.tg.hapticImpact('light');
    this.isSaving = true;

    const val = this.form.value;
    const updateDto: UpdateCustomerDto = {
      id: this.currentCustomer.id,
      name: val.name,
      email: this.currentCustomer.email,
      phoneNumber: val.phoneNumber || '',
      address: val.address || '',
      location: this.currentCustomer.location || ''
    };

    this.customerService.update(updateDto).subscribe({
      next: (updated) => {
        this.isSaving = false;
        this.tg.hapticNotification('success');
        this.notification.success('Ma\'lumotlar saqlandi');
        this.form.markAsPristine();
        this.authState.setCustomer(updated);
        this.currentCustomer = updated;
      },
      error: () => {
        this.isSaving = false;
        this.tg.hapticNotification('error');
        this.notification.error('Saqlashda xatolik yuz berdi. Qayta urinib ko\'ring.');
      }
    });
  }
}
