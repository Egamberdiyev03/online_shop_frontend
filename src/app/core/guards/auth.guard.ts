import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthStateService } from '../services/auth-state.service';
import { NotificationService } from '../services/notification.service';
import { CompanyService } from '../services/company.service';

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
  // SuperAdmin, CompanyAdmin va BranchManager admin paneliga kirishi mumkin
  const isAdmin = role === 'SuperAdmin' || role === 'CompanyAdmin' || role === 'BranchManager';

  if (isAdmin) {
    return true;
  }

  notification.error("Ushbu bo'limga faqat administratorlar kirishi mumkin.");
  return router.createUrlTree(['/products']);
};

/**
 * Analitika sahifasi guardi:
 * Mehmon (tizimga kirmagan) bo'lsa -> /login ga yo'naltiriladi
 * Customer bo'lsa -> ogohlantirish bilan /products ga yo'naltiriladi
 * SuperAdmin, CompanyAdmin, BranchManager -> ruxsat beriladi
 */
export const analyticsGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const notification = inject(NotificationService);

  if (!authState.isAuthenticated()) {
    notification.warning("Analitikani ko'rish uchun avval tizimga kiring.");
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  if (authState.canViewAnalytics()) {
    return true;
  }

  notification.error("Sizda analitikani ko'rish huquqi yo'q.");
  return router.createUrlTree(['/products']);
};

/**
 * Faqat SuperAdmin uchun ruxsat beruvchi guard (Kategoriyalar, barcha Kompaniyalar boshqaruvi)
 */
export const superAdminGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const notification = inject(NotificationService);

  if (authState.isSuperAdmin()) {
    return true;
  }

  notification.error("Ushbu bo'limga faqat SuperAdmin kirishi mumkin.");
  return router.createUrlTree(['/products']);
};

/**
 * Faqat Customer (oddiy mijoz) uchun ruxsat beruvchi guard (Savat, Buyurtma berish)
 * CompanyAdmin, BranchAdmin, SuperAdmin bu sahifaga kira olmaydi
 */
export const customerGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const notification = inject(NotificationService);

  // Agar foydalanuvchi autentifikatsiya qilinmagan bo'lsa - login sahifasiga yo'naltirish
  if (!authState.isAuthenticated()) {
    notification.warning("Bu sahifani ko'rish uchun avval tizimga kiring.");
    return router.createUrlTree(['/login']);
  }

  // Agar foydalanuvchi admin roli bo'lsa - ruxsat bermaslik
  if (authState.isAdminRole()) {
    notification.warning("Savat faqat mijozlar uchun mavjud. Admin sifatida savatdan foydalana olmaysiz.");
    return router.createUrlTree(['/products']);
  }

  return true;
};

/**
 * Filial tafsilotini ko'rish uchun ruxsat guardi (/branches/:id)
 * Qoidalar:
 * - Customer / Mehmon: UMUMAN ko'ra olmaydi -> /map sahifasiga qaytariladi
 * - BranchManager: faqat O'Z filialini ko'ra oladi (userBranchId === branchId)
 * - CompanyAdmin: faqat O'Z kompaniyasining filiallarini ko'ra oladi
 * - SuperAdmin: BARCHA filiallarni ko'ra oladi
 * - Ruxsat bo'lmasa, /map ga qaytarilib, ogohlantirish beriladi.
 */
export const branchDetailGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const notification = inject(NotificationService);

  // Tizimga kirmagan bo'lsa
  if (!authState.isAuthenticated()) {
    notification.warning("Bu sahifani ko'rish uchun avval tizimga kiring.");
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  // SuperAdmin barcha filiallarga kira oladi
  if (authState.isSuperAdmin()) {
    return true;
  }

  // Customer umuman kira olmaydi
  if (authState.isCustomer() || !authState.isAdminRole()) {
    notification.error("Sizda bu filial ma'lumotlarini ko'rish huquqi yo'q.");
    return router.createUrlTree(['/map']);
  }

  const rawId = route.paramMap.get('id');
  const branchId = rawId ? Number(rawId) : 0;
  if (!branchId || isNaN(branchId)) {
    notification.error("Noto'g'ri filial identifikatori.");
    return router.createUrlTree(['/map']);
  }

  // BranchManager faqat o'z filialiga kira oladi
  if (authState.isBranchManager()) {
    const myBranchId = authState.userBranchId();
    if (myBranchId != null && Number(myBranchId) === branchId) {
      return true;
    }
    notification.error("Siz faqat o'z filialingiz ma'lumotlarini ko'ra olasiz.");
    return router.createUrlTree(['/map']);
  }

  // CompanyAdmin faqat o'z kompaniyasining filiallariga kira oladi
  if (authState.isCompanyAdmin()) {
    const myCompanyId = authState.userCompanyId();
    if (!myCompanyId) {
      notification.error("Sizda bu filial ma'lumotlarini ko'rish huquqi yo'q.");
      return router.createUrlTree(['/map']);
    }

    const companyService = inject(CompanyService);
    return companyService.getBranchById(branchId).pipe(
      map(branch => {
        if (branch && Number(branch.companyId) === Number(myCompanyId)) {
          return true;
        }
        notification.error("Siz faqat o'z kompaniyangiz filiallarini ko'ra olasiz.");
        return router.createUrlTree(['/map']);
      }),
      catchError(() => {
        notification.error("Sizda bu filial ma'lumotlarini ko'rish huquqi yo'q.");
        return of(router.createUrlTree(['/map']));
      })
    );
  }

  notification.error("Sizda bu filial ma'lumotlarini ko'rish huquqi yo'q.");
  return router.createUrlTree(['/map']);
};
