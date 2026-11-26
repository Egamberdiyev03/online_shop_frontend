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
    if (authState.isCurier()) return router.createUrlTree(['/curier']);
    if (authState.isAdminRole()) return router.createUrlTree(['/admin']);
    return router.createUrlTree(['/products']);
  }

  return true;
};

/**
 * Kuryer bo'lmagan foydalanuvchilar uchun (Kuryer kirsa /curier ga yo'naltiriladi)
 */
export const nonCurierGuard: CanActivateFn = () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  if (authState.isCurier()) {
    return router.createUrlTree(['/curier']);
  }

  return true;
};

/**
 * Faqat Admin yoki Filial xodimlari uchun ruxsat beruvchi guard
 * (SuperAdmin, CompanyAdmin, BranchManager, BranchAdmin)
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const notification = inject(NotificationService);

  if (!authState.isAuthenticated()) {
    notification.warning("Bu sahifani ko'rish uchun avval tizimga kiring.");
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  if (authState.isAdminRole()) {
    return true;
  }

  notification.error("Ushbu bo'limga faqat administratorlar va filial xodimlari kirishi mumkin.");
  return router.createUrlTree([authState.isCurier() ? '/curier' : '/products']);
};

/**
 * Analitika sahifasi guardi:
 * Mehmon (tizimga kirmagan) bo'lsa -> /login ga yo'naltiriladi
 * Customer bo'lsa -> ogohlantirish bilan /products ga yo'naltiriladi
 * SuperAdmin, CompanyAdmin, BranchManager, BranchAdmin -> ruxsat beriladi
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
  return router.createUrlTree([authState.isCurier() ? '/curier' : '/products']);
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
  return router.createUrlTree([authState.isCurier() ? '/curier' : '/products']);
};

/**
 * Faqat Customer (oddiy mijoz) uchun ruxsat beruvchi guard
 * (Savat, buyurtma berish, To'lovlarim, Sharhlarim, Kuryer bo'lish)
 * Curier -> /curier ga, Admin/Filial xodimlari -> /admin ga yo'naltiriladi
 */
export const customerGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const notification = inject(NotificationService);

  // Agar foydalanuvchi autentifikatsiya qilinmagan bo'lsa - login sahifasiga yo'naltirish
  if (!authState.isAuthenticated()) {
    notification.warning("Bu sahifani ko'rish uchun avval tizimga kiring.");
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  if (authState.isCurier()) {
    return router.createUrlTree(['/curier']);
  }

  // Agar foydalanuvchi admin yoki filial xodimi roli bo'lsa - ruxsat bermaslik
  if (authState.isAdminRole()) {
    notification.warning("Bu bo'lim faqat mijozlar uchun mavjud.");
    return router.createUrlTree(['/admin']);
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

  // Curier kira olmaydi -> Kuryer kabinetiga yo'naltirish
  if (authState.isCurier()) {
    return router.createUrlTree(['/curier']);
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

/**
 * Faqat Curier (kuryer) roli uchun ruxsat beruvchi guard
 */
export const curierGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const notification = inject(NotificationService);

  if (!authState.isAuthenticated()) {
    notification.warning("Bu sahifani ko'rish uchun avval tizimga kiring.");
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const role = authState.userRole();
  if (role === 'Curier') {
    return true;
  }

  notification.error("Bu sahifa faqat kuryerlar uchun.");
  return router.createUrlTree(['/products']);
};

/**
 * Kuryer yoki Admin rollari uchun ruxsat beruvchi guard
 */
export const curierOrAdminGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const notification = inject(NotificationService);

  if (!authState.isAuthenticated()) {
    notification.warning("Bu sahifani ko'rish uchun avval tizimga kiring.");
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  const role = authState.userRole();
  const allowedRoles = ['SuperAdmin', 'CompanyAdmin', 'BranchManager', 'BranchAdmin', 'Curier'];

  if (allowedRoles.includes(role || '')) {
    return true;
  }

  notification.error("Sizda bu sahifaga kirish huquqi yo'q.");
  return router.createUrlTree(['/products']);
};

/**
 * Faqat SuperAdmin va BranchManager uchun naqd pul hisobi guardi
 */
export const cashAdminGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  const notification = inject(NotificationService);

  if (!authState.isAuthenticated()) {
    notification.warning("Bu sahifani ko'rish uchun avval tizimga kiring.");
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  if (authState.isSuperAdmin() || authState.userRole() === 'BranchManager') {
    return true;
  }

  notification.error("Naqd pul hisobini faqat SuperAdmin va Filial mudiri ko'rishi mumkin.");
  return router.createUrlTree(['/admin']);
};
