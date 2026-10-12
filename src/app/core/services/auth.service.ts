import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap, switchMap, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RegisterDto,
  LoginDto,
  ConfirmEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  AuthResponseDto
} from '../models/auth.model';
import { ResponseModel, unwrapResult } from '../models/response.model';
import { AuthStateService } from './auth-state.service';
import { CartService } from './cart.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private authState = inject(AuthStateService);
  private cartService = inject(CartService);
  private router = inject(Router);
  private notification = inject(NotificationService);

  private apiUrl = `${environment.apiUrl}/Auth`;

  /**
   * Foydalanuvchini ro'yxatdan o'tkazish va tasdiqlash kodini yuborish
   */
  register(dto: RegisterDto): Observable<{ message: string }> {
    return this.http.post<ResponseModel<string> | any>(`${this.apiUrl}/Register`, dto).pipe(
      map(res => {
        if (res && typeof res === 'object') {
          const resp = res as any;
          if (resp.statusCode && resp.statusCode >= 400) {
            throw new Error(resp.message || "Ro'yxatdan o'tishda xatolik yuz berdi.");
          }
        }
        const message = res?.message || res?.result || "Ro'yxatdan o'tish muvaffaqiyatli! Emailingizga tasdiqlash kodi yuborildi.";
        return { message };
      })
    );
  }

  /**
   * 6 xonali OTP kod orqali emailni tasdiqlash va tizimga avtomatik kirish
   */
  confirmEmail(dto: ConfirmEmailDto): Observable<AuthResponseDto> {
    return this.http.post<ResponseModel<AuthResponseDto> | AuthResponseDto>(`${this.apiUrl}/ConfirmEmail`, dto).pipe(
      map(res => {
        if (res && typeof res === 'object') {
          const resp = res as any;
          if (resp.statusCode && resp.statusCode >= 400) {
            throw new Error(resp.message || "Tasdiqlash kodi noto'g'ri.");
          }
        }
        const auth = unwrapResult(res);
        if (!auth || !auth.token) {
          throw new Error("Tasdiqlash kodi noto'g'ri yoki muddati o'tgan.");
        }
        return auth;
      }),
      switchMap(auth => {
        this.authState.saveSession(auth);
        this.notification.success(`Xush kelibsiz, ${auth.name}! Email tasdiqlandi.`);
        if (auth.userId) {
          return this.cartService.syncGuestCartToUser(auth.userId).pipe(
            map(() => auth),
            catchError(() => of(auth))
          );
        }
        return of(auth);
      })
    );
  }

  /**
   * Email va parol orqali tizimga kirish
   */
  login(dto: LoginDto): Observable<AuthResponseDto> {
    return this.http.post<ResponseModel<AuthResponseDto> | AuthResponseDto>(`${this.apiUrl}/Login`, dto).pipe(
      map(res => {
        if (res && typeof res === 'object') {
          const resp = res as any;
          if (resp.statusCode && resp.statusCode >= 400) {
            throw new Error(resp.message || "Email yoki parol noto'g'ri.");
          }
          if (resp.result === null && resp.message) {
            throw new Error(resp.message);
          }
        }
        const auth = unwrapResult(res);
        if (!auth || !auth.token) {
          throw new Error("Email yoki parol noto'g'ri.");
        }
        return auth;
      }),
      switchMap(auth => {
        this.authState.saveSession(auth);
        this.notification.success(`Xush kelibsiz, ${auth.name}!`);
        if (auth.userId) {
          return this.cartService.syncGuestCartToUser(auth.userId).pipe(
            map(() => auth),
            catchError(() => of(auth))
          );
        }
        return of(auth);
      })
    );
  }

  /**
   * Parolni tiklash uchun emailga tasdiqlash kodini yuborish
   */
  forgotPassword(dto: ForgotPasswordDto): Observable<{ message: string }> {
    return this.http.post<ResponseModel<string> | any>(`${this.apiUrl}/ForgotPassword`, dto).pipe(
      map(res => {
        if (res && typeof res === 'object') {
          const resp = res as any;
          if (resp.statusCode && resp.statusCode >= 400) {
            throw new Error(resp.message || "Emailga kod yuborishda xatolik yuz berdi.");
          }
        }
        const message = res?.message || res?.result || "Emailingizga tasdiqlash kodi yuborildi.";
        return { message };
      })
    );
  }

  /**
   * 6 xonali kod va yangi parol orqali parolni yangilash
   */
  resetPassword(dto: ResetPasswordDto): Observable<{ message: string }> {
    return this.http.post<ResponseModel<string> | any>(`${this.apiUrl}/ResetPassword`, dto).pipe(
      map(res => {
        if (res && typeof res === 'object') {
          const resp = res as any;
          if (resp.statusCode && resp.statusCode >= 400) {
            throw new Error(resp.message || "Parolni yangilashda xatolik yuz berdi.");
          }
        }
        const message = res?.message || res?.result || "Parolingiz muvaffaqiyatli yangilandi.";
        return { message };
      })
    );
  }

  /**
   * Tizimdan chiqish
   */
  logout(): void {
    const userName = this.authState.userName();
    this.authState.clearSession();
    this.cartService.clearLocalCart();
    this.notification.info(`Xayr, ${userName}. Tizimdan muvaffaqiyatli chiqdingiz.`);
    this.router.navigate(['/login']);
  }
}
