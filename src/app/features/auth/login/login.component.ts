import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ForgotPasswordDto, ResetPasswordDto } from '../../../core/models/auth.model';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const p1 = group.get('newPassword')?.value;
  const p2 = group.get('confirmPassword')?.value;
  if (!p1 || !p2) return null;
  return p1 === p2 ? null : { passwordMismatch: true };
}

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
              <span *ngIf="f['email'].errors?.['email']">Email formati to‘g‘ri emas.</span>
            </div>
          </div>

          <!-- Password field with Forgot Password button -->
          <div class="form-group">
            <div class="password-label-row">
              <label class="form-label" for="password">Parol</label>
              <button 
                type="button" 
                class="forgot-pwd-btn" 
                (click)="openForgotModal()"
                title="Parolni tiklash oynasini ochish"
              >
                Parolni unutdingizmi?
              </button>
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
              <span *ngIf="f['password'].errors?.['minlength']">Parol kamida 6 belgidan iborat bo‘lishi kerak.</span>
            </div>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            class="btn btn-primary btn-block submit-btn" 
            [disabled]="isLoading"
          >
            <span class="spinner" *ngIf="isLoading"></span>
            <span *ngIf="!isLoading">Kirish</span>
            <span *ngIf="isLoading">Kirilmoqda...</span>
          </button>
        </form>

        <div class="auth-footer">
          <p>
            Hali hisobingiz yo‘qmi? 
            <a routerLink="/register" class="auth-link">Ro‘yxatdan o‘tish</a>
          </p>
          <div class="verify-link-row">
            <a [routerLink]="['/confirm-email']" class="subtle-link">
              ✉️ Emailni tasdiqlash sahifasi
            </a>
          </div>
        </div>
      </div>

      <!-- ========================================================
           PAROLNI TIKLASH (FORGOT PASSWORD) MODAL DIALOG
           ======================================================== -->
      <div class="modal-overlay" *ngIf="showForgotModal" (click)="closeForgotModal()">
        <div class="modal-content forgot-modal" (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="modal-header">
            <div class="modal-title-wrap">
              <span class="modal-pill">🔑 Xavfsizlik</span>
              <h3 class="modal-title">Parolni tiklash</h3>
            </div>
            <button class="modal-close" (click)="closeForgotModal()">&times;</button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body">
            
            <!-- STEP 1: Emailni kiritish -->
            <div *ngIf="forgotStep === 'email'" class="step-content">
              <p class="modal-desc">
                Ro‘yxatdan o‘tgan email manzilingizni kiriting. Biz emailingizga 6 xonali maxsus tasdiqlash kodini yuboramiz.
              </p>

              <form [formGroup]="forgotEmailForm" (ngSubmit)="sendForgotCode()" class="auth-form">
                <div class="form-group">
                  <label class="form-label" for="forgotEmail">Email manzil</label>
                  <div class="input-wrapper">
                    <span class="input-icon">✉️</span>
                    <input 
                      id="forgotEmail"
                      type="email" 
                      class="form-control" 
                      placeholder="misol@pochta.uz"
                      formControlName="email"
                      [class.is-invalid]="fe['email'].touched && fe['email'].invalid"
                      autocomplete="email"
                    />
                  </div>
                  <div class="form-error" *ngIf="fe['email'].touched && fe['email'].invalid">
                    <span *ngIf="fe['email'].errors?.['required']">Email kiritilishi shart.</span>
                    <span *ngIf="fe['email'].errors?.['email']">Email formati to‘g‘ri emas.</span>
                  </div>
                </div>

                <div class="modal-actions">
                  <button type="button" class="btn btn-secondary" (click)="closeForgotModal()">
                    Bekor qilish
                  </button>
                  <button type="submit" class="btn btn-primary" [disabled]="isForgotLoading">
                    <span class="spinner" *ngIf="isForgotLoading"></span>
                    <span *ngIf="!isForgotLoading">Kodni yuborish &rarr;</span>
                    <span *ngIf="isForgotLoading">Yuborilmoqda...</span>
                  </button>
                </div>
              </form>
            </div>

            <!-- STEP 2: Kod va Yangi parol o'rnatish -->
            <div *ngIf="forgotStep === 'code'" class="step-content">
              <div class="email-sent-badge">
                <span class="badge-text">✉️ Kod yuborildi: <strong>{{ targetForgotEmail }}</strong></span>
                <button type="button" class="change-email-btn" (click)="changeEmailStep()">O‘zgartirish</button>
              </div>

              <form [formGroup]="resetForm" (ngSubmit)="submitResetPassword()" class="auth-form">
                <!-- 6 xonali OTP Kod -->
                <div class="form-group">
                  <label class="form-label text-center" for="resetCode">
                    6 xonali tasdiqlash kodi
                  </label>
                  <div class="otp-input-container">
                    <input 
                      id="resetCode"
                      type="text" 
                      class="form-control otp-input" 
                      placeholder="123456"
                      maxlength="6"
                      formControlName="code"
                      (input)="onForgotOtpInput($event)"
                      [class.is-invalid]="fr['code'].touched && fr['code'].invalid"
                      autocomplete="one-time-code"
                    />
                  </div>
                  <div class="form-error text-center" *ngIf="fr['code'].touched && fr['code'].invalid">
                    <span>Aynan 6 ta raqamdan iborat kodni kiriting.</span>
                  </div>
                </div>

                <!-- Yangi parol -->
                <div class="form-group">
                  <label class="form-label" for="newPassword">Yangi parol</label>
                  <div class="input-wrapper">
                    <span class="input-icon">🔒</span>
                    <input 
                      id="newPassword"
                      [type]="showNewPassword ? 'text' : 'password'" 
                      class="form-control password-input" 
                      placeholder="Kamida 6 ta belgi"
                      formControlName="newPassword"
                      [class.is-invalid]="fr['newPassword'].touched && fr['newPassword'].invalid"
                      autocomplete="new-password"
                    />
                    <button 
                      type="button" 
                      class="toggle-pwd-btn" 
                      (click)="showNewPassword = !showNewPassword"
                    >
                      {{ showNewPassword ? '👁️' : '🙈' }}
                    </button>
                  </div>
                  <div class="form-error" *ngIf="fr['newPassword'].touched && fr['newPassword'].invalid">
                    <span *ngIf="fr['newPassword'].errors?.['required']">Yangi parol kiritilishi shart.</span>
                    <span *ngIf="fr['newPassword'].errors?.['minlength']">Parol kamida 6 belgidan iborat bo‘lishi kerak.</span>
                  </div>
                </div>

                <!-- Yangi parolni takrorlash -->
                <div class="form-group">
                  <label class="form-label" for="confirmPassword">Yangi parolni takrorlang</label>
                  <div class="input-wrapper">
                    <span class="input-icon">🔒</span>
                    <input 
                      id="confirmPassword"
                      [type]="showConfirmPassword ? 'text' : 'password'" 
                      class="form-control password-input" 
                      placeholder="Parolni qayta kiriting"
                      formControlName="confirmPassword"
                      [class.is-invalid]="fr['confirmPassword'].touched && (fr['confirmPassword'].invalid || resetForm.errors?.['passwordMismatch'])"
                      autocomplete="new-password"
                    />
                    <button 
                      type="button" 
                      class="toggle-pwd-btn" 
                      (click)="showConfirmPassword = !showConfirmPassword"
                    >
                      {{ showConfirmPassword ? '👁️' : '🙈' }}
                    </button>
                  </div>
                  <div class="form-error" *ngIf="fr['confirmPassword'].touched && resetForm.errors?.['passwordMismatch']">
                    <span>Parollar bir-biriga mos kelmadi.</span>
                  </div>
                </div>

                <!-- Kodni qayta yuborish timer -->
                <div class="resend-row">
                  <span *ngIf="countdown > 0" class="countdown-text">
                    Kodni qaytadan yuborish: <strong>{{ countdown }}s</strong>
                  </span>
                  <button 
                    *ngIf="countdown === 0" 
                    type="button" 
                    class="resend-btn" 
                    (click)="resendForgotCode()"
                    [disabled]="isForgotLoading"
                  >
                    🔄 Kodni qaytadan yuborish
                  </button>
                </div>

                <div class="modal-actions">
                  <button type="button" class="btn btn-secondary" (click)="forgotStep = 'email'">
                    &larr; Ortga
                  </button>
                  <button type="submit" class="btn btn-primary" [disabled]="isForgotLoading">
                    <span class="spinner" *ngIf="isForgotLoading"></span>
                    <span *ngIf="!isForgotLoading">Parolni saqlash &rarr;</span>
                    <span *ngIf="isForgotLoading">Saqlanmoqda...</span>
                  </button>
                </div>
              </form>
            </div>

            <!-- STEP 3: Muvaffaqiyat (Success) -->
            <div *ngIf="forgotStep === 'success'" class="step-content success-step">
              <div class="success-icon-bubble">✅</div>
              <h4 class="success-title">Parol yangilandi!</h4>
              <p class="modal-desc text-center">
                Parolingiz muvaffaqiyatli o‘zgartirildi. Endi yangi parolingiz orqali tizimga kirishingiz mumkin.
              </p>
              <button type="button" class="btn btn-primary btn-block" (click)="finishForgotAndLogin()">
                Kirish oynasiga o‘tish &rarr;
              </button>
            </div>

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
      border: 1px solid #cbd5e1;
      width: 100%;
      background: #ffffff;
      color: #0f172a;
      transition: all 0.2s;
    }
    .form-control:focus {
      border-color: #4f46e5;
      outline: none;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
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
      background: transparent;
      border: none;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.2s;
    }
    .toggle-pwd-btn:hover {
      opacity: 1;
    }

    /* Password Label Row with Forgot Password Link */
    .password-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
    }
    .forgot-pwd-btn {
      background: none;
      border: none;
      color: #4f46e5;
      font-size: 0.775rem;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
      transition: all 0.2s;
    }
    .forgot-pwd-btn:hover {
      color: #3730a3;
      text-decoration: underline;
    }

    .form-error {
      color: #ef4444;
      font-size: 0.75rem;
      margin-top: 0.35rem;
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
      display: inline-block;
      vertical-align: middle;
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

    /* ========================================================
       MODAL STYLES
       ======================================================== */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }
    .forgot-modal {
      background: #ffffff;
      border-radius: 20px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid #e2e8f0;
      overflow: hidden;
      animation: modalScale 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modalScale {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.75rem;
      border-bottom: 1px solid #f1f5f9;
      background: #fafafa;
    }
    .modal-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .modal-pill {
      font-size: 0.7rem;
      font-weight: 700;
      color: #4f46e5;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .modal-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .modal-close {
      color: #94a3b8;
      font-size: 1.6rem;
      background: none;
      border: none;
      cursor: pointer;
      line-height: 1;
      padding: 0.25rem;
      transition: color 0.2s;
    }
    .modal-close:hover {
      color: #ef4444;
    }
    .modal-body {
      padding: 1.75rem;
    }
    .modal-desc {
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid #f1f5f9;
    }

    /* Step 2 specific */
    .email-sent-badge {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 10px;
      padding: 0.65rem 0.85rem;
      margin-bottom: 1.5rem;
      font-size: 0.825rem;
      color: #1e1b4b;
    }
    .badge-text strong {
      color: #4f46e5;
    }
    .change-email-btn {
      background: none;
      border: none;
      color: #4f46e5;
      font-weight: 700;
      font-size: 0.75rem;
      cursor: pointer;
      text-decoration: underline;
    }
    .otp-input-container {
      display: flex;
      justify-content: center;
    }
    .otp-input {
      padding-left: 0;
      text-align: center;
      letter-spacing: 0.65rem;
      font-size: 1.75rem;
      font-weight: 800;
      font-family: monospace;
      color: #4f46e5;
      background-color: #f8fafc;
      border: 2px dashed #cbd5e1;
      height: 3.5rem;
      max-width: 260px;
    }
    .otp-input:focus {
      border-style: solid;
      border-color: #4f46e5;
      background-color: #ffffff;
    }
    .resend-row {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0.75rem 0;
      font-size: 0.825rem;
    }
    .countdown-text {
      color: #64748b;
    }
    .countdown-text strong {
      color: #4f46e5;
    }
    .resend-btn {
      background: none;
      border: none;
      color: #4f46e5;
      font-size: 0.825rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
    }

    /* Success Step */
    .success-step {
      text-align: center;
      padding: 1rem 0;
    }
    .success-icon-bubble {
      font-size: 3.5rem;
      margin-bottom: 1rem;
      line-height: 1;
    }
    .success-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.5rem;
    }

    /* ========================================================
       DARK THEME STYLES (TUNGI REJIM)
       ======================================================== */
    :host-context(body.dark-theme) .forgot-modal,
    :host-context(.dark-theme) .forgot-modal {
      background: #151e32;
      border-color: #22304d;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    :host-context(body.dark-theme) .modal-header,
    :host-context(.dark-theme) .modal-header {
      background: #0f172a;
      border-bottom-color: #22304d;
    }
    :host-context(body.dark-theme) .modal-title,
    :host-context(.dark-theme) .modal-title {
      color: #f8fafc;
    }
    :host-context(body.dark-theme) .modal-desc,
    :host-context(.dark-theme) .modal-desc {
      color: #94a3b8;
    }
    :host-context(body.dark-theme) .modal-actions,
    :host-context(.dark-theme) .modal-actions {
      border-top-color: #22304d;
    }
    :host-context(body.dark-theme) .email-sent-badge,
    :host-context(.dark-theme) .email-sent-badge {
      background: #1e1b4b;
      border-color: #3730a3;
      color: #cbd5e1;
    }
    :host-context(body.dark-theme) .badge-text strong,
    :host-context(.dark-theme) .badge-text strong {
      color: #a5b4fc;
    }
    :host-context(body.dark-theme) .otp-input,
    :host-context(.dark-theme) .otp-input {
      background-color: #0b0f19;
      border-color: #334155;
      color: #818cf8;
    }
    :host-context(body.dark-theme) .otp-input:focus,
    :host-context(.dark-theme) .otp-input:focus {
      background-color: #0b0f19;
      border-color: #818cf8;
    }
    :host-context(body.dark-theme) .forgot-pwd-btn,
    :host-context(.dark-theme) .forgot-pwd-btn {
      color: #818cf8;
    }
    :host-context(body.dark-theme) .forgot-pwd-btn:hover,
    :host-context(.dark-theme) .forgot-pwd-btn:hover {
      color: #a5b4fc;
    }
    :host-context(body.dark-theme) .success-title,
    :host-context(.dark-theme) .success-title {
      color: #f8fafc;
    }
  `]
})
export class LoginComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private authState = inject(AuthStateService);
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

  // ==========================================
  // PAROLNI TIKLASH (FORGOT PASSWORD) HOLATI
  // ==========================================
  showForgotModal = false;
  forgotStep: 'email' | 'code' | 'success' = 'email';
  targetForgotEmail = '';
  isForgotLoading = false;
  showNewPassword = false;
  showConfirmPassword = false;
  countdown = 0;
  private countdownTimer: any = null;

  forgotEmailForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  resetForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

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

  get fe() {
    return this.forgotEmailForm.controls;
  }

  get fr() {
    return this.resetForm.controls;
  }

  onSubmit(): void {
    if (this.isLoading) return;

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.notification.warning("Iltimos, email va parolingizni to‘g‘ri kiriting!");
      return;
    }

    this.isLoading = true;
    this.unconfirmedEmail = null;

    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: () => {
        this.isLoading = false;
        if (this.authState.isAdminRole()) {
          this.router.navigateByUrl('/admin');
        } else {
          this.router.navigateByUrl(this.returnUrl || '/products');
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.message || err?.error?.message || err?.error || "Email yoki parol noto‘g‘ri.";
        this.notification.error(msg);
        if (typeof msg === 'string' && (msg.toLowerCase().includes('tasdiqlanmagan') || msg.toLowerCase().includes('confirm'))) {
          this.unconfirmedEmail = credentials.email;
        }
      }
    });
  }

  // ==========================================
  // PAROLNI TIKLASH METODLARI
  // ==========================================
  openForgotModal(): void {
    const currentEmail = this.loginForm.get('email')?.value || '';
    this.forgotEmailForm.reset({ email: currentEmail.trim() });
    this.resetForm.reset({ code: '', newPassword: '', confirmPassword: '' });
    this.forgotStep = 'email';
    this.showForgotModal = true;
  }

  closeForgotModal(): void {
    this.showForgotModal = false;
    this.stopCountdown();
  }

  changeEmailStep(): void {
    this.forgotStep = 'email';
    this.stopCountdown();
  }

  sendForgotCode(): void {
    if (this.forgotEmailForm.invalid) {
      this.forgotEmailForm.markAllAsTouched();
      this.notification.warning("Iltimos, to‘g‘ri email manzil kiriting!");
      return;
    }

    this.isForgotLoading = true;
    const email = this.forgotEmailForm.get('email')?.value.trim().toLowerCase();
    const dto: ForgotPasswordDto = { email };

    this.authService.forgotPassword(dto).subscribe({
      next: (res) => {
        this.isForgotLoading = false;
        this.targetForgotEmail = email;
        this.forgotStep = 'code';
        this.startCountdown(60);
        this.notification.success(res.message || "Tasdiqlash kodi emailingizga yuborildi!");
      },
      error: (err) => {
        this.isForgotLoading = false;
        const msg = err?.error?.message || err?.message || "Email topilmadi yoki xatolik yuz berdi.";
        this.notification.error(msg);
      }
    });
  }

  resendForgotCode(): void {
    if (!this.targetForgotEmail || this.isForgotLoading) return;

    this.isForgotLoading = true;
    this.authService.forgotPassword({ email: this.targetForgotEmail }).subscribe({
      next: (res) => {
        this.isForgotLoading = false;
        this.startCountdown(60);
        this.notification.success(res.message || "Yangi tasdiqlash kodi yuborildi!");
      },
      error: (err) => {
        this.isForgotLoading = false;
        this.notification.error(err?.error?.message || err?.message || "Kodni qayta yuborib bo‘lmadi.");
      }
    });
  }

  onForgotOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 6);
    this.resetForm.patchValue({ code: digitsOnly }, { emitEvent: false });
    input.value = digitsOnly;
  }

  submitResetPassword(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      if (this.resetForm.errors?.['passwordMismatch']) {
        this.notification.warning("Kiritilgan parollar bir-biriga mos kelmadi!");
      } else {
        this.notification.warning("Iltimos, barcha maydonlarni to‘g‘ri to‘ldiring!");
      }
      return;
    }

    this.isForgotLoading = true;
    const formVal = this.resetForm.value;

    const dto: ResetPasswordDto = {
      email: this.targetForgotEmail,
      code: formVal.code.trim(),
      newPassword: formVal.newPassword
    };

    this.authService.resetPassword(dto).subscribe({
      next: (res) => {
        this.isForgotLoading = false;
        this.stopCountdown();
        this.forgotStep = 'success';
        this.notification.success(res.message || "Parolingiz muvaffaqiyatli yangilandi!");
      },
      error: (err) => {
        this.isForgotLoading = false;
        const msg = err?.error?.message || err?.message || "Tasdiqlash kodi noto‘g‘ri yoki muddati o‘tgan.";
        this.notification.error(msg);
      }
    });
  }

  finishForgotAndLogin(): void {
    if (this.targetForgotEmail) {
      this.loginForm.patchValue({ email: this.targetForgotEmail, password: '' });
    }
    this.closeForgotModal();
  }

  private startCountdown(seconds: number): void {
    this.countdown = seconds;
    this.stopCountdown();
    this.countdownTimer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.stopCountdown();
      }
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }
}
