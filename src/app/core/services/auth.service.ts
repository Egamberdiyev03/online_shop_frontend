import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  RegisterDto,
  LoginDto,
  ConfirmEmailDto,
  AuthResponseDto
} from '../models/auth.model';
import { ResponseModel, unwrapResult } from '../models/response.model';
import { AuthStateService } from './auth-state.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private authState = inject(AuthStateService);
  private router = inject(Router);
  private notification = inject(NotificationService);

  private apiUrl = `${environment.apiUrl}/Auth`;

  /**
   * Foydalanuvchini ro'yxatdan o'tkazish va tasdiqlash kodini yuborish
   */
  register(dto: RegisterDto): Observable<{ message: string }> {
    return this.http.post<ResponseModel<string> | any>(`${this.apiUrl}/Register`, dto).pipe(
      map(res => {
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
      map(res => unwrapResult(res)),
      tap(auth => {
        if (auth && auth.token) {
          this.authState.saveSession(auth);
          this.notification.success(`Xush kelibsiz, ${auth.name}! Email tasdiqlandi.`);
        }
      })
    );
  }

  /**
   * Email va parol orqali tizimga kirish
   */
  login(dto: LoginDto): Observable<AuthResponseDto> {
    return this.http.post<ResponseModel<AuthResponseDto> | AuthResponseDto>(`${this.apiUrl}/Login`, dto).pipe(
      map(res => unwrapResult(res)),
      tap(auth => {
        if (auth && auth.token) {
          this.authState.saveSession(auth);
          this.notification.success(`Xush kelibsiz, ${auth.name}!`);
        }
      })
    );
  }

  /**
   * Tizimdan chiqish
   */
  logout(): void {
    const userName = this.authState.userName();
    this.authState.clearSession();
    this.notification.info(`Xayr, ${userName}. Tizimdan muvaffaqiyatli chiqdingiz.`);
    this.router.navigate(['/login']);
  }
}
