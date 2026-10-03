import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (!password || !confirmPassword) return null;
  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <div class="auth-header">
          <div class="brand-badge">🛍 OnlineShop</div>
          <h1 class="auth-title">Yangi hisob yaratish</h1>
          <p class="auth-subtitle">Platformaning barcha imkoniyatlaridan foydalanish uchun ro'yxatdan o'ting</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
          <!-- Full Name -->
          <div class="form-group">
            <label class="form-label" for="name">To'liq ismingiz <span class="required">*</span></label>
            <div class="input-wrapper">
              <span class="input-icon">👤</span>
              <input
                id="name"
                type="text"
                class="form-control"
                [class.is-invalid]="f['name'].touched && f['name'].invalid"
                placeholder="Masalan: Ali Valiyev"
                formControlName="name"
              />
            </div>
            <div class="form-error" *ngIf="f['name'].touched && f['name'].invalid">
              <span *ngIf="f['name'].errors?.['required']">Ism kiritilishi shart.</span>
              <span *ngIf="f['name'].errors?.['minlength']">Ism kamida 3 belgidan iborat bo'lishi kerak.</span>
            </div>
          </div>

          <!-- Email -->
          <div class="form-group">
            <label class="form-label" for="email">Email manzil <span class="required">*</span></label>
            <div class="input-wrapper">
              <span class="input-icon">✉️</span>
              <input
                id="email"
                type="email"
                class="form-control"
                [class.is-invalid]="f['email'].touched && f['email'].invalid"
                placeholder="misol@gmail.com"
                formControlName="email"
              />
            </div>
            <div class="form-error" *ngIf="f['email'].touched && f['email'].invalid">
              <span *ngIf="f['email'].errors?.['required']">Email kiritilishi shart.</span>
              <span *ngIf="f['email'].errors?.['email']">Yaroqli email manzil kiriting.</span>
            </div>
            <span class="form-hint">Tasdiqlash kodi aynan shu emailga yuboriladi.</span>
          </div>

          <!-- Phone Number & Location (2 cols) -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="phoneNumber">Telefon raqam</label>
              <div class="input-wrapper">
                <span class="input-icon">📞</span>
                <input
                  id="phoneNumber"
                  type="tel"
                  class="form-control"
                  placeholder="+998901234567"
                  formControlName="phoneNumber"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="location">Shahar / Viloyat</label>
              <div class="input-wrapper">
                <span class="input-icon">📍</span>
                <input
                  id="location"
                  type="text"
                  class="form-control"
                  placeholder="Toshkent sh."
                  formControlName="location"
                />
              </div>
            </div>
          </div>

          <!-- Address -->
          <div class="form-group">
            <label class="form-label" for="address">Yetkazib berish manzili</label>
            <div class="input-wrapper">
              <span class="input-icon">🏠</span>
              <input
                id="address"
                type="text"
                class="form-control"
                placeholder="Chilonzor tumani, 9-mavze, 12-uy"
                formControlName="address"
              />
            </div>
          </div>

          <!-- Passwords (2 cols) -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="password">Parol <span class="required">*</span></label>
              <div class="input-wrapper">
                <span class="input-icon">🔒</span>
                <input
                  id="password"
                  [type]="showPassword ? 'text' : 'password'"
                  class="form-control password-input"
                  [class.is-invalid]="f['password'].touched && f['password'].invalid"
                  placeholder="Kamida 6 belgi"
                  formControlName="password"
                />
                <button 
                  type="button" 
                  class="toggle-pwd-btn" 
                  (click)="showPassword = !showPassword"
                >
                  {{ showPassword ? '👁️' : '🙈' }}
                </button>
              </div>
              <div class="form-error" *ngIf="f['password'].touched && f['password'].invalid">
                <span *ngIf="f['password'].errors?.['required']">Parol kiritilishi shart.</span>
                <span *ngIf="f['password'].errors?.['minlength']">Kamida 6 belgi bo'lishi kerak.</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="confirmPassword">Parolni tasdiqlang <span class="required">*</span></label>
              <div class="input-wrapper">
                <span class="input-icon">🔒</span>
                <input
                  id="confirmPassword"
                  [type]="showPassword ? 'text' : 'password'"
                  class="form-control password-input"
                  [class.is-invalid]="(f['confirmPassword'].touched || registerForm.touched) && registerForm.errors?.['passwordMismatch']"
                  placeholder="Qayta kiriting"
                  formControlName="confirmPassword"
                />
              </div>
              <div class="form-error" *ngIf="(f['confirmPassword'].touched || registerForm.touched) && registerForm.errors?.['passwordMismatch']">
                Parollar bir-biriga mos kelmadi.
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            class="btn btn-primary btn-block submit-btn" 
            [disabled]="registerForm.invalid || isLoading"
          >
            <span class="spinner" *ngIf="isLoading"></span>
            <span *ngIf="!isLoading">Ro'yxatdan o'tish</span>
            <span *ngIf="isLoading">Yuborilmoqda...</span>
          </button>
        </form>

        <div class="auth-footer">
          <p>
            Profilingiz bormi? 
            <a routerLink="/login" class="auth-link">Kirish</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: calc(100vh - 180px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1rem;
      background: radial-gradient(circle at top, #eff6ff 0%, #f8fafc 70%);
    }
    .auth-card {
      width: 100%;
      max-width: 580px;
      padding: 2.25rem 2rem;
      border-radius: var(--radius-lg);
      background: #ffffff;
      box-shadow: var(--shadow-xl);
      border: 1px solid var(--border);
    }
    .auth-header {
      text-align: center;
      margin-bottom: 1.75rem;
    }
    .brand-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: var(--primary-light);
      color: var(--primary-dark);
      font-size: 0.8125rem;
      font-weight: 700;
      border-radius: var(--radius-full);
      margin-bottom: 0.75rem;
    }
    .auth-title {
      font-size: 1.625rem;
      font-weight: 800;
      color: var(--secondary);
      letter-spacing: -0.02em;
      margin-bottom: 0.375rem;
    }
    .auth-subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
    }
    .required {
      color: var(--danger);
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 540px) {
      .form-row {
        grid-template-columns: 1fr;
        gap: 0;
      }
    }
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-icon {
      position: absolute;
      left: 0.875rem;
      color: var(--text-light);
      pointer-events: none;
      font-size: 0.95rem;
    }
    .form-control {
      padding-left: 2.5rem;
      height: 2.75rem;
      border-radius: var(--radius-md);
      font-size: 0.9rem;
    }
    .form-control.is-invalid {
      border-color: var(--danger);
      background-color: #fffaf0;
    }
    .form-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }
    .password-input {
      padding-right: 2.75rem;
    }
    .toggle-pwd-btn {
      position: absolute;
      right: 0.625rem;
      padding: 0.375rem;
      font-size: 1rem;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    .toggle-pwd-btn:hover {
      opacity: 1;
    }
    .submit-btn {
      margin-top: 0.875rem;
      height: 2.875rem;
      font-size: 0.95rem;
      font-weight: 700;
      border-radius: var(--radius-md);
    }
    .btn-block {
      width: 100%;
    }
    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 0.5rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .auth-footer {
      margin-top: 1.75rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border);
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .auth-link {
      color: var(--primary);
      font-weight: 700;
      transition: color 0.2s;
    }
    .auth-link:hover {
      text-decoration: underline;
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notification = inject(NotificationService);

  showPassword = false;
  isLoading = false;

  registerForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: [''],
    location: [''],
    address: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  get f() {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.isLoading) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formVal = this.registerForm.value;

    const dto = {
      name: formVal.name.trim(),
      email: formVal.email.trim().toLowerCase(),
      password: formVal.password,
      phoneNumber: formVal.phoneNumber?.trim() || undefined,
      location: formVal.location?.trim() || undefined,
      address: formVal.address?.trim() || undefined
    };

    this.authService.register(dto).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.notification.success(res.message || "Ro'yxatdan o'tish muvaffaqiyatli! Emailingizga tasdiqlash kodi yuborildi.");
        this.router.navigate(['/confirm-email'], {
          queryParams: { email: dto.email }
        });
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
