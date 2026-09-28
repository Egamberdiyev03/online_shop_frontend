import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = "Server bilan aloqada xatolik yuz berdi.";

      if (error.status === 0) {
        errorMessage = "Backend serverga ulanib bo'lmadi (http://localhost:5099 ishlamayotgan bo'lishi mumkin).";
      } else if (error.error) {
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

      notificationService.error(errorMessage, `Xatolik (${error.status || 'Tarmoq'})`);
      return throwError(() => error);
    })
  );
};
