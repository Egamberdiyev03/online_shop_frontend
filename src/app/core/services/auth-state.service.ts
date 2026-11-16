import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthResponseDto, DecodedJwtToken } from '../models/auth.model';
import { Customer } from '../models/customer.model';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  // MUHIM: bu ikki maydon signal'lardan OLDIN turishi shart
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly TOKEN_KEY = 'online_shop_token';
  private readonly USER_KEY = 'online_shop_user';
  private readonly CUSTOMER_ID_KEY = 'online_shop_active_customer_id';
  private readonly ADMIN_MODE_KEY = 'online_shop_admin_mode';

  // Core signals
  token = signal<string | null>(this.getInitialToken());
  currentUser = signal<AuthResponseDto | null>(this.getInitialUser());
  currentCustomerId = signal<number>(this.getInitialCustomerId());
  currentCustomer = signal<Customer | null>(null);
  isAdminMode = signal<boolean>(this.getInitialAdminMode());

  // Computed state
  isAuthenticated = computed(() => !!this.token() && !!this.currentUser());
  userRole = computed(() => this.currentUser()?.role || null);
  userName = computed(() => this.currentUser()?.name || 'Mijoz');
  userEmail = computed(() => this.currentUser()?.email || '');

  isSuperAdmin = computed(() => this.userRole() === 'SuperAdmin');
  isCompanyAdmin = computed(() => this.userRole() === 'CompanyAdmin');
  isBranchManager = computed(() => this.userRole() === 'BranchManager' || this.userRole() === 'BranchAdmin');
  isCustomer = computed(() => this.userRole() === 'Customer' || (!this.isAdminRole() && !this.isSuperAdmin()));

  // SuperAdmin, CompanyAdmin, BranchManager/BranchAdmin rollari
  isAdminRole = computed(() => {
    const role = this.userRole();
    return role === 'SuperAdmin' || role === 'CompanyAdmin' || role === 'BranchManager' || role === 'BranchAdmin';
  });

  canViewAnalytics = computed(() => {
    if (!this.isAuthenticated()) return false;
    const role = this.userRole();
    return role === 'SuperAdmin' || role === 'CompanyAdmin' || role === 'BranchManager' || role === 'BranchAdmin';
  });

  hasAnyRole(roles: string[]): boolean {
    const current = this.userRole();
    return current ? roles.includes(current) : false;
  }

  // Savat faqat oddiy mijozlar uchun
  canUseCart = computed(() => {
    if (this.isAdminRole() || this.isAdminMode()) {
      return false;
    }
    return true;
  });

  userCompanyId = computed(() => this.currentUser()?.companyId || null);
  userBranchId = computed(() => this.currentUser()?.companyBranchId || null);

  canViewBranchDetails(branch: { id: number; companyId?: number } | null | undefined): boolean {
    if (!branch || !this.isAuthenticated()) {
      return false;
    }
    if (this.isSuperAdmin()) {
      return true;
    }
    if (this.isCompanyAdmin()) {
      const myCompanyId = this.userCompanyId();
      return myCompanyId != null && Number(branch.companyId) === Number(myCompanyId);
    }
    if (this.isBranchManager()) {
      const myBranchId = this.userBranchId();
      return myBranchId != null && Number(branch.id) === Number(myBranchId);
    }
    return false;
  }

  constructor() {
    this.syncSessionOnStartup();
  }

  // ---------- Xavfsiz storage yordamchilari (SSR uchun) ----------
  private storageGet(key: string): string | null {
    return this.isBrowser ? localStorage.getItem(key) : null;
  }

  private storageSet(key: string, value: string): void {
    if (this.isBrowser) localStorage.setItem(key, value);
  }

  private storageRemove(key: string): void {
    if (this.isBrowser) localStorage.removeItem(key);
  }

  // ---------- Boshlang'ich qiymatlar ----------
  private getInitialToken(): string | null {
    return this.storageGet(this.TOKEN_KEY);
  }

  private getInitialUser(): AuthResponseDto | null {
    const raw = this.storageGet(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private getInitialCustomerId(): number {
    const saved = this.storageGet(this.CUSTOMER_ID_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 0;
  }

  private getInitialAdminMode(): boolean {
    return this.storageGet(this.ADMIN_MODE_KEY) === 'true';
  }

  private syncSessionOnStartup(): void {
    const currentToken = this.token();
    if (currentToken) {
      const decoded = this.decodeToken(currentToken);
      if (decoded) {
        // Token muddati tugaganmi
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          this.clearSession();
          return;
        }

        const userId = this.extractUserId(decoded);
        if (userId) {
          this.setCustomerId(userId);
        }

        // Token claimlaridan companyId va companyBranchId ni sinxronlash
        const user = this.currentUser();
        let compId = user?.companyId;
        let branchId = user?.companyBranchId;
        if (compId == null && decoded['companyId']) {
          const parsed = parseInt(decoded['companyId'], 10);
          if (!isNaN(parsed)) compId = parsed;
        }
        if (branchId == null && decoded['companyBranchId']) {
          const parsed = parseInt(decoded['companyBranchId'], 10);
          if (!isNaN(parsed)) branchId = parsed;
        }
        if (user && (user.companyId !== compId || user.companyBranchId !== branchId)) {
          const updated = { ...user, companyId: compId, companyBranchId: branchId };
          this.currentUser.set(updated);
          this.storageSet(this.USER_KEY, JSON.stringify(updated));
        }

        const isAdmin = decoded.role === 'SuperAdmin' || decoded.role === 'CompanyAdmin' || decoded.role === 'BranchManager' || decoded.role === 'BranchAdmin';
        this.isAdminMode.set(isAdmin);
        this.storageSet(this.ADMIN_MODE_KEY, String(isAdmin));
      }
    }
  }

  decodeToken(token: string): DecodedJwtToken | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload) as DecodedJwtToken;
    } catch {
      return null;
    }
  }

  private extractUserId(decoded: DecodedJwtToken): number | null {
    const rawId =
      decoded.nameid ||
      decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      decoded.sub;
    if (rawId) {
      const parsed = parseInt(rawId, 10);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  saveSession(auth: AuthResponseDto): void {
    if (!auth || !auth.token) return;

    let userId = auth.userId;
    let companyId = auth.companyId;
    let companyBranchId = auth.companyBranchId;

    const decoded = this.decodeToken(auth.token);
    if (decoded) {
      const extractedId = this.extractUserId(decoded);
      if (extractedId) userId = extractedId;
      if (companyId == null && decoded['companyId']) {
        const parsed = parseInt(decoded['companyId'], 10);
        if (!isNaN(parsed)) companyId = parsed;
      }
      if (companyBranchId == null && decoded['companyBranchId']) {
        const parsed = parseInt(decoded['companyBranchId'], 10);
        if (!isNaN(parsed)) companyBranchId = parsed;
      }
    }

    const completeAuth: AuthResponseDto = {
      ...auth,
      userId: userId || auth.userId,
      companyId: companyId != null ? companyId : null,
      companyBranchId: companyBranchId != null ? companyBranchId : null
    };

    this.token.set(auth.token);
    this.currentUser.set(completeAuth);

    this.storageSet(this.TOKEN_KEY, auth.token);
    this.storageSet(this.USER_KEY, JSON.stringify(completeAuth));

    if (userId) {
      this.setCustomerId(userId);
    }

    // BranchAdmin ham qo'shildi (avval yo'q edi)
    const isAdmin = ['SuperAdmin', 'CompanyAdmin', 'BranchManager', 'BranchAdmin'].includes(auth.role);
    this.isAdminMode.set(isAdmin);
    this.storageSet(this.ADMIN_MODE_KEY, String(isAdmin));
  }

  clearSession(): void {
    this.token.set(null);
    this.currentUser.set(null);
    this.currentCustomer.set(null);

    this.storageRemove(this.TOKEN_KEY);
    this.storageRemove(this.USER_KEY);
    this.storageRemove(this.CUSTOMER_ID_KEY);
    this.storageRemove(this.ADMIN_MODE_KEY);

    this.currentCustomerId.set(0);
    this.isAdminMode.set(false);
  }

  setCustomer(customer: Customer): void {
    this.currentCustomer.set(customer);
    this.currentCustomerId.set(customer.id);
    this.storageSet(this.CUSTOMER_ID_KEY, customer.id.toString());
  }

  setCustomerId(id: number): void {
    this.currentCustomerId.set(id);
    this.storageSet(this.CUSTOMER_ID_KEY, id.toString());
  }

  toggleAdminMode(): void {
    const next = !this.isAdminMode();
    this.isAdminMode.set(next);
    this.storageSet(this.ADMIN_MODE_KEY, String(next));
  }
}