import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, forkJoin, of, switchMap, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Payment,
  PaymentStatus,
  CreatePaymentDto,
  RejectPaymentDto,
  PaymentListItem,
  PaymentDetails,
  PaymentSummary,
  PaymentFilter,
  PagedResult
} from '../models/payment.model';
import { ResponseModel, unwrapResult } from '../models/response.model';
import { AuthStateService } from './auth-state.service';
import { OrderService } from './order.service';
import { CustomerService } from './customer.service';
import { CompanyService } from './company.service';
import { Order } from '../models/order.model';
import { Customer } from '../models/customer.model';
import { CompanyBranch } from '../models/company-branch.model';
import { Company } from '../models/company.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private authState = inject(AuthStateService);
  private orderService = inject(OrderService);
  private customerService = inject(CustomerService);
  private companyService = inject(CompanyService);

  private apiUrl = `${environment.apiUrl}/Payment`;

  // 1. Chek rasmini serverga yuklash (fayl orqali)
  uploadReceipt(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<ResponseModel<string> | string>(`${this.apiUrl}/upload-receipt`, formData).pipe(
      map(res => {
        const unwrapped = unwrapResult(res);
        return typeof unwrapped === 'string' ? unwrapped : (res as any)?.data || '';
      })
    );
  }

  // 2. To'lov yaratish (mijoz chek yuboradi)
  createPayment(dto: CreatePaymentDto): Observable<Payment> {
    return this.http.post<ResponseModel<Payment> | Payment>(`${this.apiUrl}/create`, dto).pipe(
      map(res => unwrapResult(res))
    );
  }

  // 3. Buyurtma bo'yicha to'lov ma'lumotini olish
  getPaymentByOrderId(orderId: number): Observable<Payment | null> {
    return this.http.get<ResponseModel<Payment> | Payment>(`${this.apiUrl}/get-by-order/${orderId}`).pipe(
      map(res => unwrapResult(res) || null),
      catchError(() => of(null))
    );
  }

  // 4. Barcha to'lovlar (raw API)
  getAllPayments(status?: PaymentStatus, branchId?: number): Observable<Payment[]> {
    let url = `${this.apiUrl}/get-all`;
    const params: string[] = [];
    if (status !== undefined && status !== null) {
      params.push(`status=${status}`);
    }
    if (branchId !== undefined && branchId !== null) {
      params.push(`branchId=${branchId}`);
    }
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.http.get<ResponseModel<Payment[]> | Payment[]>(url).pipe(
      map(res => unwrapResult(res) || []),
      catchError(() => of([]))
    );
  }

  // 5. Admin to'lovni tasdiqlashi (raw API)
  confirmPayment(paymentId: number, adminId: number): Observable<Payment> {
    return this.http.post<ResponseModel<Payment> | Payment>(
      `${this.apiUrl}/confirm/${paymentId}?adminId=${adminId}`,
      null
    ).pipe(
      map(res => unwrapResult(res))
    );
  }

  // 6. Admin to'lovni rad etishi (raw API)
  rejectPayment(dto: RejectPaymentDto, adminId: number): Observable<Payment> {
    return this.http.post<ResponseModel<Payment> | Payment>(
      `${this.apiUrl}/reject?adminId=${adminId}`,
      dto
    ).pipe(
      map(res => unwrapResult(res))
    );
  }

  // 7. Qulay confirm(id) - adminId ni avtomatik aniqlaydi
  confirm(id: number): Observable<Payment> {
    const adminId = this.getCurrentUserId();
    return this.confirmPayment(id, adminId);
  }

  // 8. Qulay reject(id, reason) - adminId ni avtomatik aniqlaydi
  reject(id: number, reason: string): Observable<Payment> {
    const adminId = this.getCurrentUserId();
    return this.rejectPayment({ paymentId: id, reason }, adminId);
  }

  // Mijoz uchun o'z buyurtmalari bo'yicha to'lovlarni olish (Payment/get-all 403 xato bermasligi uchun)
  getCustomerPayments(customerId: number): Observable<{ payments: Payment[]; orders: Order[] }> {
    return this.orderService.getByCustomerId(customerId).pipe(
      catchError(() => of([] as Order[])),
      switchMap(orders => {
        if (!orders || orders.length === 0) {
          return of({ payments: [] as Payment[], orders: [] as Order[] });
        }
        const paymentObservables = orders.map(o => 
          this.getPaymentByOrderId(o.id).pipe(catchError(() => of(null)))
        );
        return forkJoin(paymentObservables).pipe(
          map(results => {
            const payments = (results || []).filter((p): p is Payment => p !== null && p !== undefined);
            return { payments, orders };
          })
        );
      })
    );
  }

  // Filial mudiri uchun o'z filiali buyurtmalari bo'yicha to'lovlarni olish (Payment/get-all 403 xato bermasligi uchun)
  getBranchPayments(branchId: number): Observable<{ payments: Payment[]; orders: Order[] }> {
    return this.orderService.getOrdersByBranchId(branchId).pipe(
      catchError(() => of([] as Order[])),
      switchMap(orders => {
        const orderList = Array.isArray(orders) ? orders : [];
        if (orderList.length === 0) {
          return of({ payments: [] as Payment[], orders: [] as Order[] });
        }
        const paymentObservables = orderList.map(o => 
          this.getPaymentByOrderId(o.id).pipe(catchError(() => of(null)))
        );
        return forkJoin(paymentObservables).pipe(
          map(results => {
            const payments = (results || []).filter((p): p is Payment => p !== null && p !== undefined);
            return { payments, orders: orderList };
          })
        );
      })
    );
  }

  // 9. Filtr va sahifalash bilan to'lovlar ro'yxatini olish (Admin va Customer uchun)
  getPayments(filter: PaymentFilter): Observable<PagedResult<PaymentListItem>> {
    const isSuperOrCompanyAdmin = this.authState.isSuperAdmin() || this.authState.isCompanyAdmin();
    const isCustomer = this.authState.isCustomer() || (!this.authState.isAdminRole() && !this.authState.isSuperAdmin());
    const isBranchManager = this.authState.isBranchManager();
    const currentUserId = this.authState.currentCustomerId() || this.getCurrentUserId();
    const userBranchId = this.authState.userBranchId();

    const data$ = isCustomer
      ? this.getCustomerPayments(currentUserId).pipe(
          map(({ payments, orders }) => ({
            payments,
            orders,
            customers: [] as Customer[]
          }))
        )
      : (isBranchManager && userBranchId)
      ? this.getBranchPayments(userBranchId).pipe(
          map(({ payments, orders }) => ({
            payments,
            orders,
            customers: [] as Customer[]
          }))
        )
      : forkJoin({
          payments: this.getAllPayments(),
          orders: this.orderService.getAll().pipe(catchError(() => of([] as Order[]))),
          customers: isSuperOrCompanyAdmin
            ? this.customerService.getAll().pipe(catchError(() => of([] as Customer[])))
            : of([] as Customer[])
        });

    return forkJoin({
      baseData: data$,
      branches: this.companyService.getAllBranches().pipe(catchError(() => of([] as CompanyBranch[]))),
      companies: this.companyService.getAllCompanies().pipe(catchError(() => of([] as Company[])))
    }).pipe(
      map(({ baseData, branches, companies }) => {
        const { payments, orders, customers } = baseData;
        const orderMap = new Map<number, Order>();
        orders.forEach(o => orderMap.set(o.id, o));

        const customerMap = new Map<number, Customer>();
        customers.forEach(c => customerMap.set(c.id, c));

        const branchMap = new Map<number, CompanyBranch>();
        branches.forEach(b => branchMap.set(b.id, b));

        const companyMap = new Map<number, Company>();
        companies.forEach(c => companyMap.set(c.id, c));

        // Enriched list
        let items: PaymentListItem[] = payments.map(p => {
          const ord = orderMap.get(p.orderId);
          const cust = ord 
            ? (customerMap.get(ord.customerId) || (isCustomer && this.authState.currentUser() ? {
                id: ord.customerId,
                name: this.authState.userName(),
                email: this.authState.userEmail(),
                phoneNumber: '',
                address: '',
                location: ''
              } as Customer : undefined))
            : undefined;
          const br = ord ? branchMap.get(ord.companyBranchId) : undefined;
          const comp = br?.companyId ? companyMap.get(br.companyId) : undefined;
          const confirmedUser = p.confirmedByUserId ? customerMap.get(p.confirmedByUserId) : undefined;

          return {
            id: p.id,
            orderId: p.orderId,
            amount: p.amount,
            status: p.status,
            createdAt: p.createdAt,
            paymentMethod: p.paymentMethod,
            chekUrl: p.chekUrl,
            transactionNote: p.transactionNote,
            customerName: cust?.name,
            customerPhone: cust?.phoneNumber,
            customerEmail: cust?.email,
            customerId: ord?.customerId,
            branchId: ord?.companyBranchId,
            branchName: br?.name,
            companyId: br?.companyId,
            companyName: comp?.name,
            confirmedAt: p.confirmedAt,
            confirmedByUserId: p.confirmedByUserId,
            confirmedByName: confirmedUser?.name,
            rejectionReason: p.rejectionReason
          };
        });

        // 1. Role-based scoping
        const userRole = this.authState.userRole();
        const userCompanyId = this.authState.userCompanyId();
        const userBranchId = this.authState.userBranchId();
        const currentUserId = this.authState.currentCustomerId() || this.getCurrentUserId();

        if (this.authState.isCustomer() || (!this.authState.isAdminRole() && !this.authState.isSuperAdmin())) {
          // Oddiy mijoz faqat o'z to'lovlarini ko'radi
          items = items.filter(i => i.customerId === currentUserId);
        } else if (this.authState.isBranchManager()) {
          // Filial mudiri faqat o'z filiali to'lovlarini ko'radi
          if (userBranchId) {
            items = items.filter(i => i.branchId === userBranchId);
          }
        } else if (this.authState.isCompanyAdmin()) {
          // Kompaniya admini faqat o'z kompaniyasiga tegishli filiallar to'lovlarini ko'radi
          if (userCompanyId) {
            items = items.filter(i => i.companyId === userCompanyId);
          }
        }

        // 2. Apply filters
        // Status filter
        if (filter.status !== undefined && filter.status !== null && (filter.status as any) !== '') {
          const stNum = Number(filter.status);
          items = items.filter(i => i.status === stNum);
        }

        // Branch filter
        if (filter.branchId) {
          items = items.filter(i => i.branchId === Number(filter.branchId));
        }

        // Company filter
        if (filter.companyId) {
          items = items.filter(i => i.companyId === Number(filter.companyId));
        }

        // Date range
        if (filter.dateFrom) {
          const from = new Date(filter.dateFrom).getTime();
          items = items.filter(i => new Date(i.createdAt).getTime() >= from);
        }
        if (filter.dateTo) {
          const toDate = new Date(filter.dateTo);
          toDate.setHours(23, 59, 59, 999);
          const toTime = toDate.getTime();
          items = items.filter(i => new Date(i.createdAt).getTime() <= toTime);
        }

        // Search query
        if (filter.search && filter.search.trim()) {
          const term = filter.search.trim().toLowerCase();
          items = items.filter(i =>
            i.id.toString().includes(term) ||
            i.orderId.toString().includes(term) ||
            (i.customerName && i.customerName.toLowerCase().includes(term)) ||
            (i.customerPhone && i.customerPhone.toLowerCase().includes(term)) ||
            (i.branchName && i.branchName.toLowerCase().includes(term)) ||
            (i.amount && i.amount.toString().includes(term)) ||
            (i.transactionNote && i.transactionNote.toLowerCase().includes(term))
          );
        }

        // 3. Sorting
        const sortBy = filter.sortBy || 'createdAt';
        const sortDirection = filter.sortDirection || 'desc';

        items.sort((a, b) => {
          let aVal: any = a[sortBy as keyof PaymentListItem];
          let bVal: any = b[sortBy as keyof PaymentListItem];

          if (sortBy === 'createdAt') {
            aVal = new Date(aVal || 0).getTime();
            bVal = new Date(bVal || 0).getTime();
          } else if (sortBy === 'amount') {
            aVal = Number(aVal || 0);
            bVal = Number(bVal || 0);
          } else {
            aVal = String(aVal || '').toLowerCase();
            bVal = String(bVal || '').toLowerCase();
          }

          if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });

        // 4. Pagination
        const total = items.length;
        const pageNumber = Math.max(1, filter.pageNumber || 1);
        const pageSize = Math.max(1, filter.pageSize || 10);
        const totalPages = Math.ceil(total / pageSize) || 1;
        const startIndex = (pageNumber - 1) * pageSize;
        const paginatedItems = items.slice(startIndex, startIndex + pageSize);

        return {
          items: paginatedItems,
          total,
          pageNumber,
          pageSize,
          totalPages
        };
      })
    );
  }

  // 10. To'lov tafsiloti (Order, Customer, Branch, Timeline ma'lumotlari bilan)
  getPaymentById(id: number): Observable<PaymentDetails | null> {
    const isSuperOrCompanyAdmin = this.authState.isSuperAdmin() || this.authState.isCompanyAdmin();
    const isCustomer = this.authState.isCustomer() || (!this.authState.isAdminRole() && !this.authState.isSuperAdmin());
    const isBranchManager = this.authState.isBranchManager();
    const currentUserId = this.authState.currentCustomerId() || this.getCurrentUserId();
    const userBranchId = this.authState.userBranchId();

    const paymentSource$ = isCustomer
      ? this.getCustomerPayments(currentUserId).pipe(
          map(({ payments }) => payments.find(p => p.id === id) || null)
        )
      : (isBranchManager && userBranchId)
      ? this.getBranchPayments(userBranchId).pipe(
          map(({ payments }) => payments.find(p => p.id === id) || null)
        )
      : this.getAllPayments().pipe(
          map(payments => payments.find(p => p.id === id) || null)
        );

    return paymentSource$.pipe(
      switchMap(payment => {
        if (!payment) return of(null);

        return forkJoin({
          order: this.orderService.getById(payment.orderId).pipe(catchError(() => of(null))),
          customers: isSuperOrCompanyAdmin
            ? this.customerService.getAll().pipe(catchError(() => of([] as Customer[])))
            : of([] as Customer[]),
          branches: this.companyService.getAllBranches().pipe(catchError(() => of([] as CompanyBranch[]))),
          companies: this.companyService.getAllCompanies().pipe(catchError(() => of([] as Company[])))
        }).pipe(
          switchMap(({ order, customers, branches, companies }) => {
            const customerMap = new Map<number, Customer>();
            customers.forEach(c => customerMap.set(c.id, c));

            const branchMap = new Map<number, CompanyBranch>();
            branches.forEach(b => branchMap.set(b.id, b));

            const companyMap = new Map<number, Company>();
            companies.forEach(c => companyMap.set(c.id, c));

            const needCustomerFetch = order?.customerId && !customerMap.has(order.customerId);
            const customerSingle$ = needCustomerFetch
              ? this.customerService.getById(order!.customerId).pipe(catchError(() => of(null)))
              : of(order?.customerId ? customerMap.get(order.customerId) || null : null);

            return customerSingle$.pipe(
              map(singleCustomer => {
                if (singleCustomer) {
                  customerMap.set(singleCustomer.id, singleCustomer);
                }

                const customer = order 
                  ? (customerMap.get(order.customerId) || (this.authState.currentUser() ? {
                      id: order.customerId,
                      name: this.authState.userName(),
                      email: this.authState.userEmail(),
                      phoneNumber: '',
                      address: '',
                      location: ''
                    } as Customer : undefined))
                  : undefined;
                const branch = order ? branchMap.get(order.companyBranchId) : undefined;
                const company = branch?.companyId ? companyMap.get(branch.companyId) : undefined;
                const confirmedUser = payment.confirmedByUserId ? customerMap.get(payment.confirmedByUserId) : undefined;

                const details: PaymentDetails = {
                  ...payment,
                  order: order ? {
                    id: order.id,
                    status: order.status,
                    totalPrice: order.totalPrice,
                    createdAt: order.createdAt,
                    orderItems: (order.orderItems || []).map(oi => ({
                      id: oi.id,
                      productId: oi.productId,
                      productName: oi.productName,
                      quantity: oi.quantity,
                      unitPrice: oi.unitPrice
                    })),
                    deliveryAddress: order.deliveryAddress,
                    deliveryLatitude: order.deliveryLatitude,
                    deliveryLongitude: order.deliveryLongitude
                  } : undefined,
                  customer: customer ? {
                    id: customer.id,
                    name: customer.name,
                    phoneNumber: customer.phoneNumber,
                    email: customer.email,
                    address: customer.address
                  } : undefined,
                  branch: branch ? {
                    id: branch.id,
                    name: branch.name,
                    address: branch.address,
                    phoneNumber: branch.phoneNumber,
                    companyId: branch.companyId,
                    companyName: company?.name
                  } : undefined,
                  confirmedByName: confirmedUser?.name
                };

                return details;
              })
            );
          })
        );
      }),
      catchError(() => of(null))
    );
  }

  // 11. Statistika (KPI kartochkalari uchun)
  getSummary(branchId?: number, companyId?: number): Observable<PaymentSummary> {
    const isCustomer = this.authState.isCustomer() || (!this.authState.isAdminRole() && !this.authState.isSuperAdmin());
    const isBranchManager = this.authState.isBranchManager();
    const currentUserId = this.authState.currentCustomerId() || this.getCurrentUserId();
    const userBranchId = this.authState.userBranchId();

    const payments$ = isCustomer
      ? this.getCustomerPayments(currentUserId).pipe(map(({ payments }) => payments))
      : (isBranchManager && userBranchId)
      ? this.getBranchPayments(userBranchId).pipe(map(({ payments }) => payments))
      : this.getAllPayments();

    const orders$ = isCustomer
      ? this.orderService.getByCustomerId(currentUserId).pipe(catchError(() => of([] as Order[])))
      : (isBranchManager && userBranchId)
      ? this.orderService.getOrdersByBranchId(userBranchId).pipe(catchError(() => of([] as Order[])))
      : this.orderService.getAll().pipe(catchError(() => of([] as Order[])));

    return forkJoin({
      payments: payments$,
      orders: orders$,
      branches: this.companyService.getAllBranches().pipe(catchError(() => of([] as CompanyBranch[])))
    }).pipe(
      map(({ payments, orders, branches }) => {
        const orderMap = new Map<number, Order>();
        orders.forEach(o => orderMap.set(o.id, o));

        const branchMap = new Map<number, CompanyBranch>();
        branches.forEach(b => branchMap.set(b.id, b));

        // Role scoping
        const userCompanyId = this.authState.userCompanyId();
        const userBranchId = this.authState.userBranchId();

        let scoped = payments;

        if (this.authState.isBranchManager()) {
          const targetBranch = branchId || userBranchId;
          if (targetBranch) {
            scoped = scoped.filter(p => {
              const ord = orderMap.get(p.orderId);
              return ord && ord.companyBranchId === targetBranch;
            });
          }
        } else if (this.authState.isCompanyAdmin()) {
          const targetCompany = companyId || userCompanyId;
          if (targetCompany) {
            scoped = scoped.filter(p => {
              const ord = orderMap.get(p.orderId);
              const br = ord ? branchMap.get(ord.companyBranchId) : undefined;
              return br && br.companyId === targetCompany;
            });
          }
        } else {
          // SuperAdmin with optional filters
          if (branchId) {
            scoped = scoped.filter(p => {
              const ord = orderMap.get(p.orderId);
              return ord && ord.companyBranchId === branchId;
            });
          } else if (companyId) {
            scoped = scoped.filter(p => {
              const ord = orderMap.get(p.orderId);
              const br = ord ? branchMap.get(ord.companyBranchId) : undefined;
              return br && br.companyId === companyId;
            });
          }
        }

        const summary: PaymentSummary = {
          totalCount: scoped.length,
          totalAmount: scoped.reduce((sum, p) => sum + (p.amount || 0), 0),
          pendingCount: scoped.filter(p => p.status === PaymentStatus.Pending).length,
          pendingAmount: scoped.filter(p => p.status === PaymentStatus.Pending).reduce((sum, p) => sum + (p.amount || 0), 0),
          completedCount: scoped.filter(p => p.status === PaymentStatus.Completed).length,
          completedAmount: scoped.filter(p => p.status === PaymentStatus.Completed).reduce((sum, p) => sum + (p.amount || 0), 0),
          failedCount: scoped.filter(p => p.status === PaymentStatus.Failed).length,
          failedAmount: scoped.filter(p => p.status === PaymentStatus.Failed).reduce((sum, p) => sum + (p.amount || 0), 0),
          cancelledCount: scoped.filter(p => p.status === PaymentStatus.Cancelled).length,
          cancelledAmount: scoped.filter(p => p.status === PaymentStatus.Cancelled).reduce((sum, p) => sum + (p.amount || 0), 0)
        };

        return summary;
      })
    );
  }

  // Serverdagi rasm URL-ini to'liq formatga keltirish
  getFullImageUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const base = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private getCurrentUserId(): number {
    return this.authState.currentUser()?.userId || this.authState.currentCustomerId() || 1;
  }
}
