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
              <label class="form-label" for="phoneNumber">Telefon raqam <span class="required">*</span></label>
              <div class="input-wrapper">
                <span class="input-icon">📞</span>
                <input
                  id="phoneNumber"
                  type="tel"
                  class="form-control"
                  [class.is-invalid]="f['phoneNumber'].touched && f['phoneNumber'].invalid"
                  placeholder="+998901234567"
                  formControlName="phoneNumber"
                />
              </div>
              <div class="form-error" *ngIf="f['phoneNumber'].touched && f['phoneNumber'].invalid">
                <span *ngIf="f['phoneNumber'].errors?.['required']">Telefon raqam kiritilishi shart.</span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="location">Shahar / Viloyat <span class="required">*</span></label>
              <div class="input-wrapper">
                <span class="input-icon">📍</span>
                <input
                  id="location"
                  type="text"
                  class="form-control"
                  [class.is-invalid]="f['location'].touched && f['location'].invalid"
                  placeholder="Toshkent sh."
                  formControlName="location"
                />
              </div>
              <div class="form-error" *ngIf="f['location'].touched && f['location'].invalid">
                <span *ngIf="f['location'].errors?.['required']">Shahar yoki viloyat kiritilishi shart.</span>
              </div>
            </div>
          </div>

          <!-- Address -->
          <div class="form-group">
            <label class="form-label" for="address">Yetkazib berish manzili <span class="required">*</span></label>
            <div class="input-wrapper">
              <span class="input-icon">🏠</span>
              <input
                id="address"
                type="text"
                class="form-control"
                [class.is-invalid]="f['address'].touched && f['address'].invalid"
                placeholder="Chilonzor tumani, 9-mavze, 12-uy"
                formControlName="address"
              />
            </div>
            <div class="form-error" *ngIf="f['address'].touched && f['address'].invalid">
              <span *ngIf="f['address'].errors?.['required']">Yetkazib berish manzili kiritilishi shart.</span>
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
            [disabled]="isLoading"
          >
            <span class="spinner" *ngIf="isLoading"></span>
            <span *ngIf="!isLoading">Ro'yxatdan o'tish</span>
            <span *ngIf="isLoading">Yuborilmoqda...</span>
          </button>
        </form>

        <!-- TELEGRAM REGISTER -->
        <div class="auth-divider">
          <span>Yoki</span>
        </div>

        <a href="https://t.me/XalqBozor_bot?start=auth" target="_blank" class="btn btn-telegram btn-block">
          <svg class="tg-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.63 3.73-.53.36-1.02.54-1.45.53-.48-.01-1.4-.27-2.09-.49-.84-.27-1.51-.42-1.45-.89.03-.25.38-.51 1.07-.78 4.19-1.82 6.99-3.03 8.4-3.61 4-.1.65 1.7.83 2.08.85.08.01.26.01.38-.08.08-.06.13-.15.15-.24.03-.13.04-.37.04-.37z"/>
          </svg>
          <span>Telegram orqali tezkor ro'yxatdan o'tish</span>
        </a>
        <p class="tg-caption">Parolsiz va tasdiqlash kodisiz 3 soniyada hisob oching</p>

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
    .auth-divider {
      display: flex;
      align-items: center;
      margin: 1.25rem 0 0.875rem 0;
      color: var(--text-muted, #94a3b8);
      font-size: 0.8125rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .auth-divider::before,
    .auth-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border, #e2e8f0);
    }
    .auth-divider span {
      padding: 0 0.875rem;
    }
    .btn-telegram {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.625rem;
      background: linear-gradient(135deg, #2AABEE 0%, #229ED9 100%);
      color: #ffffff !important;
      text-decoration: none;
      height: 2.875rem;
      font-size: 0.9375rem;
      font-weight: 700;
      border-radius: var(--radius-md, 8px);
      border: none;
      box-shadow: 0 4px 12px rgba(34, 158, 217, 0.28);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }
    .btn-telegram:hover {
      background: linear-gradient(135deg, #229ED9 0%, #1c88bd 100%);
      color: #ffffff !important;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(34, 158, 217, 0.38);
    }
    .btn-telegram:active {
      transform: translateY(0);
    }
    .tg-icon {
      flex-shrink: 0;
    }
    .tg-caption {
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
      margin: 0.5rem 0 0 0;
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
    phoneNumber: ['', [Validators.required]],
    location: ['', [Validators.required]],
    address: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  get f() {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    if (this.isLoading) return;

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.notification.warning("Iltimos, barcha majburiy maydonlarni to'g'ri to'ldiring!");
      return;
    }

    this.isLoading = true;
    const formVal = this.registerForm.value;

    const dto = {
      name: (formVal.name || '').trim(),
      email: (formVal.email || '').trim().toLowerCase(),
      password: formVal.password,
      phoneNumber: (formVal.phoneNumber || '').trim() || '+998901234567',
      location: (formVal.location || '').trim() || 'Toshkent',
      address: (formVal.address || '').trim() || "Ko'rsatilmagan"
    };

    this.authService.register(dto).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.notification.success(res.message || "Ro'yxatdan o'tish muvaffaqiyatli! Emailingizga tasdiqlash kodi yuborildi.");
        this.router.navigate(['/confirm-email'], {
          queryParams: { email: dto.email }
        });
      },
      error: (err) => {
        this.isLoading = false;
        let msg = "Ro'yxatdan o'tishda xatolik yuz berdi.";
        if (err?.error?.errors) {
          const list = Object.values(err.error.errors).flat() as string[];
          msg = list.join('. ');
        } else if (err?.error?.message) {
          msg = err.error.message;
        } else if (err?.message) {
          msg = err.message;
        }
        this.notification.error(msg);
      }
    });
  }
}
