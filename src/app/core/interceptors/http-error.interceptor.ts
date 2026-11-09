import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { AuthStateService } from '../services/auth-state.service';
import { TelegramService } from '../services/telegram.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const authState = inject(AuthStateService);
  const tg = inject(TelegramService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = "Server bilan aloqada xatolik yuz berdi.";
      let errorTitle = `Xatolik (${error.status || 'Tarmoq'})`;

      // 401 Unauthorized - sessiya muddati tugagan
      if (error.status === 401) {
        errorMessage = "Sessiya muddati tugadi. Qayta kiring.";
        errorTitle = "Avtorizatsiya xatosi";

        // Sessiyani tozalash
        authState.clearSession();

        // Mini App bo'lsa, qayta autentifikatsiya qilishga urinish
        if (tg.isMiniApp() && tg.webApp?.initData) {
          notificationService.info("Qayta ulanmoqda...", "Sessiya yangilanmoqda");
          // Sahifani qayta yuklash - app.component avtomatik login qiladi
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return throwError(() => error);
        }

        // Oddiy foydalanuvchi uchun login sahifasiga yo'naltirish
        notificationService.warning(errorMessage, errorTitle);
        router.navigate(['/login']);
        return throwError(() => error);
      }

      // 403 Forbidden - ruxsat yo'q
      if (error.status === 403) {
        errorMessage = "Sizda bu amalni bajarish uchun ruxsat yo'q.";
        errorTitle = "Ruxsat rad etildi";
        notificationService.warning(errorMessage, errorTitle);
        return throwError(() => error);
      }

      // 404 Not Found
      if (error.status === 404) {
        errorMessage = "So'ralgan ma'lumot topilmadi.";
        errorTitle = "Topilmadi";
        notificationService.warning(errorMessage, errorTitle);
        return throwError(() => error);
      }

      // 500 Server Error
      if (error.status >= 500) {
        errorMessage = "Serverda ichki xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.";
        errorTitle = "Server xatosi";
        notificationService.error(errorMessage, errorTitle);
        return throwError(() => error);
      }

      // 0 - Tarmoq xatosi (server ishlamayapti)
      if (error.status === 0) {
        errorMessage = "Serverga ulanib bo'lmadi. Internet aloqangizni tekshiring.";
        errorTitle = "Ulanish xatosi";
        notificationService.error(errorMessage, errorTitle);
        return throwError(() => error);
      }

      // Boshqa xatolar uchun server xabarini olish
      if (error.error) {
        if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error.errors) {
          // Validation error dictionary from ASP.NET Core
          const validationErrors = Object.values(error.error.errors).flat().join(', ');
          errorMessage = validationErrors || errorMessage;
        }
      }

      notificationService.error(errorMessage, errorTitle);
      return throwError(() => error);
    })
  );
};
