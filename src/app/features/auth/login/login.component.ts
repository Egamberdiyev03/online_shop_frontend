import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <div class="auth-header">
          <div class="brand-badge">🛍 OnlineShop</div>
          <h1 class="auth-title">Xush kelibsiz</h1>
          <p class="auth-subtitle">Platformaga kirish uchun emailingiz va parolingizni kiriting</p>
        </div>

        <!-- Alert messages if any -->
        <div class="unconfirmed-alert" *ngIf="unconfirmedEmail">
          <div class="alert-icon">⚠️</div>
          <div class="alert-content">
            <p><strong>Email tasdiqlanmagan:</strong> Ushbu hisob hali faollashtirilmagan.</p>
            <a [routerLink]="['/confirm-email']" [queryParams]="{ email: unconfirmedEmail }" class="alert-link">
              Tasdiqlash kodini kiritish &rarr;
            </a>
          </div>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
          <!-- Email field -->
          <div class="form-group">
            <label class="form-label" for="email">Email manzil</label>
            <div class="input-wrapper">
              <span class="input-icon">✉️</span>
              <input
                id="email"
                type="email"
                class="form-control"
                [class.is-invalid]="f['email'].touched && f['email'].invalid"
                placeholder="misol@pochta.uz"
                formControlName="email"
                autocomplete="email"
              />
            </div>
            <div class="form-error" *ngIf="f['email'].touched && f['email'].invalid">
              <span *ngIf="f['email'].errors?.['required']">Email kiritilishi shart.</span>
              <span *ngIf="f['email'].errors?.['email']">Email formati to'g'ri emas.</span>
            </div>
          </div>

          <!-- Password field -->
          <div class="form-group">
            <div class="password-label-row">
              <label class="form-label" for="password">Parol</label>
            </div>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input
                id="password"
                [type]="showPassword ? 'text' : 'password'"
                class="form-control password-input"
                [class.is-invalid]="f['password'].touched && f['password'].invalid"
                placeholder="Parolingizni kiriting"
                formControlName="password"
                autocomplete="current-password"
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
              <span *ngIf="f['password'].errors?.['minlength']">Parol kamida 6 belgidan iborat bo'lishi kerak.</span>
            </div>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            class="btn btn-primary btn-block submit-btn" 
            [disabled]="loginForm.invalid || isLoading"
          >
            <span class="spinner" *ngIf="isLoading"></span>
            <span *ngIf="!isLoading">Kirish</span>
            <span *ngIf="isLoading">Kirilmoqda...</span>
          </button>
        </form>

        <div class="auth-footer">
          <p>
            Hali hisobingiz yo'qmi? 
            <a routerLink="/register" class="auth-link">Ro'yxatdan o'tish</a>
          </p>
          <div class="verify-link-row">
            <a [routerLink]="['/confirm-email']" class="subtle-link">
              ✉️ Emailni tasdiqlash sahifasi
            </a>
          </div>
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
      max-width: 440px;
      padding: 2.25rem 2rem;
      border-radius: var(--radius-lg);
      background: #ffffff;
      box-shadow: var(--shadow-xl);
      border: 1px solid var(--border);
    }
    .auth-header {
      text-align: center;
      margin-bottom: 2rem;
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
    .unconfirmed-alert {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: var(--radius-md);
      padding: 0.875rem;
      margin-bottom: 1.5rem;
      font-size: 0.8125rem;
      color: #92400e;
    }
    .alert-icon {
      font-size: 1.125rem;
      line-height: 1;
    }
    .alert-link {
      display: inline-block;
      margin-top: 0.25rem;
      font-weight: 700;
      color: var(--primary);
      text-decoration: underline;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
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
    .password-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .submit-btn {
      margin-top: 0.75rem;
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
      margin-top: 2rem;
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
    .verify-link-row {
      margin-top: 0.75rem;
    }
    .subtle-link {
      font-size: 0.8125rem;
      color: var(--text-light);
      transition: color 0.2s;
    }
    .subtle-link:hover {
      color: var(--primary);
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);

  showPassword = false;
  isLoading = false;
  unconfirmedEmail: string | null = null;
  private returnUrl: string = '/products';

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor() {
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl']) {
        this.returnUrl = params['returnUrl'];
      }
      if (params['email']) {
        this.loginForm.patchValue({ email: params['email'] });
      }
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.unconfirmedEmail = null;

    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || err?.error || '';
        // If message indicates email unconfirmed, provide shortcut
        if (typeof msg === 'string' && (msg.toLowerCase().includes('tasdiqlanmagan') || msg.toLowerCase().includes('confirm'))) {
          this.unconfirmedEmail = credentials.email;
        }
      }
    });
  }
}
