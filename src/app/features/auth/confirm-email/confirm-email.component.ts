import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <div class="auth-header">
          <div class="mail-icon-bubble">📬</div>
          <h1 class="auth-title">Emailni tasdiqlash</h1>
          <p class="auth-subtitle">
            Emailingizga yuborilgan 6 xonali tasdiqlash kodini kiriting
          </p>
        </div>

        <form [formGroup]="confirmForm" (ngSubmit)="onSubmit()" class="auth-form">
          <!-- Email field (editable if needed) -->
          <div class="form-group">
            <div class="email-label-row">
              <label class="form-label" for="email">Tasdiqlanuvchi email</label>
              <button 
                type="button" 
                class="edit-email-btn"
                (click)="isEmailEditable = !isEmailEditable"
              >
                {{ isEmailEditable ? 'Saqlash' : 'O\'zgartirish' }}
              </button>
            </div>
            <div class="input-wrapper">
              <span class="input-icon">✉️</span>
              <input
                id="email"
                type="email"
                class="form-control"
                [class.is-invalid]="f['email'].touched && f['email'].invalid"
                placeholder="misol@gmail.com"
                formControlName="email"
                [readonly]="!isEmailEditable"
              />
            </div>
            <div class="form-error" *ngIf="f['email'].touched && f['email'].invalid">
              <span *ngIf="f['email'].errors?.['required']">Email kiritilishi shart.</span>
              <span *ngIf="f['email'].errors?.['email']">Email to'g'ri formatda emas.</span>
            </div>
          </div>

          <!-- OTP Code Input -->
          <div class="form-group">
            <label class="form-label text-center" for="code">
              6 xonali tasdiqlash kodi
            </label>
            <div class="otp-input-container">
              <input
                id="code"
                type="text"
                class="form-control otp-input"
                [class.is-invalid]="f['code'].touched && f['code'].invalid"
                placeholder="123456"
                maxlength="6"
                autocomplete="one-time-code"
                formControlName="code"
                (input)="onCodeInput($event)"
              />
            </div>
            <div class="form-error text-center" *ngIf="f['code'].touched && f['code'].invalid">
              <span *ngIf="f['code'].errors?.['required']">Tasdiqlash kodini kiriting.</span>
              <span *ngIf="f['code'].errors?.['pattern'] || f['code'].errors?.['minlength']">
                Kod aynan 6 ta raqamdan iborat bo'lishi kerak.
              </span>
            </div>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            class="btn btn-primary btn-block submit-btn" 
            [disabled]="confirmForm.invalid || isLoading"
          >
            <span class="spinner" *ngIf="isLoading"></span>
            <span *ngIf="!isLoading">Tasdiqlash va Kirish &rarr;</span>
            <span *ngIf="isLoading">Tekshirilmoqda...</span>
          </button>
        </form>

        <div class="auth-footer">
          <div class="info-box">
            <span class="info-icon">💡</span>
            <p>
              Kod kelmadimi? Spam (Keraksiz xatlar) papkasini tekshiring yoki ro'yxatdan o'tishni qaytadan amalga oshiring.
            </p>
          </div>

          <div class="footer-links">
            <a routerLink="/login" class="auth-link">Kirish sahifasiga qaytish</a>
            <span class="divider">•</span>
            <a routerLink="/register" class="auth-link">Qaytadan ro'yxatdan o'tish</a>
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
      max-width: 460px;
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
    .mail-icon-bubble {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 4rem;
      height: 4rem;
      font-size: 2rem;
      background: var(--primary-light);
      border-radius: var(--radius-full);
      margin-bottom: 1rem;
      border: 2px solid #bfdbfe;
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
    .email-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }
    .edit-email-btn {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--primary);
      text-decoration: underline;
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
    .otp-input-container {
      margin-top: 0.25rem;
      display: flex;
      justify-content: center;
    }
    .otp-input {
      padding-left: 0;
      text-align: center;
      letter-spacing: 0.75rem;
      font-size: 1.75rem;
      font-weight: 800;
      font-family: monospace;
      color: var(--primary-dark);
      background-color: var(--primary-light);
      border: 2px dashed #93c5fd;
      height: 3.5rem;
      max-width: 280px;
    }
    .otp-input:focus {
      border-style: solid;
      border-color: var(--primary);
      background-color: #ffffff;
    }
    .text-center {
      text-align: center;
    }
    .submit-btn {
      margin-top: 1.25rem;
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
    }
    .info-box {
      display: flex;
      gap: 0.5rem;
      background: var(--bg-subtle);
      padding: 0.75rem 0.875rem;
      border-radius: var(--radius-md);
      font-size: 0.75rem;
      color: var(--text-muted);
      line-height: 1.4;
      margin-bottom: 1rem;
    }
    .info-icon {
      font-size: 1rem;
    }
    .footer-links {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      font-size: 0.8125rem;
    }
    .divider {
      color: var(--text-light);
    }
    .auth-link {
      color: var(--primary);
      font-weight: 600;
      transition: color 0.2s;
    }
    .auth-link:hover {
      text-decoration: underline;
    }
  `]
})
export class ConfirmEmailComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);

  isEmailEditable = false;
  isLoading = false;

  confirmForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]]
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const email = params['email'];
      if (email) {
        this.confirmForm.patchValue({ email: email.trim() });
      } else {
        this.isEmailEditable = true;
      }
    });
  }

  get f() {
    return this.confirmForm.controls;
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Allow digits only
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 6);
    this.confirmForm.patchValue({ code: digitsOnly }, { emitEvent: false });
    input.value = digitsOnly;
  }

  onSubmit(): void {
    if (this.confirmForm.invalid || this.isLoading) {
      this.confirmForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formVal = this.confirmForm.value;

    const dto = {
      email: formVal.email.trim().toLowerCase(),
      code: formVal.code.trim()
    };

    this.authService.confirmEmail(dto).subscribe({
      next: () => {
        this.isLoading = false;
        // User session already stored in authService.confirmEmail
        this.router.navigate(['/products']);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
