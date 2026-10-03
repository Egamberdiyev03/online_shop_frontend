import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';
import { NotificationService } from '../services/notification.service';

/**
 * Faqat tizimga kirgan foydalanuvchilar uchun ruxsat beruvchi guard
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const notification = inject(NotificationService);

  if (authState.isAuthenticated()) {
    return true;
  }

  notification.warning("Bu sahifani ko'rish uchun avval tizimga kiring.");
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Faqat mehmonlar (tizimga kirmaganlar) uchun ruxsat beruvchi guard (Login, Register uchun)
 */
export const guestGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    return router.createUrlTree(['/products']);
  }

  return true;
};

/**
 * Faqat Admin yoki Menejerlar uchun ruxsat beruvchi guard
 */
export const adminGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const notification = inject(NotificationService);

  const role = authState.userRole();
  const isAdmin = role === 'SuperAdmin' || role === 'CompanyAdmin' || authState.isAdminMode();

  if (isAdmin) {
    return true;
  }

  notification.error("Ushbu bo'limga faqat administratorlar kirishi mumkin.");
  return router.createUrlTree(['/products']);
};
