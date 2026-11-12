import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order, OrderStatus, OrderFilter, OrderStatusCounts, parseOrderStatus } from '../models/order.model';
import { PagedResult, PagedQuery } from '../models/payment.model';
import { ResponseModel, unwrapResult, isErrorResponse } from '../models/response.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Order`;

  createOrder(): Observable<boolean> {
    return this.http.post<ResponseModel<boolean> | boolean>(`${this.apiUrl}/Create`, null).pipe(
      map(res => {
        if (res && typeof res === 'object') {
          const resp = res as any;
          if (isErrorResponse(resp)) {
            throw new Error(resp.message || "Buyurtma berishda xatolik yuz berdi.");
          }
        }
        const unwrapped = unwrapResult(res);
        return unwrapped === true || unwrapped === null;
      })
    );
  }

  private normalizeOrder(o: any): Order {
    if (!o) return o;
    return {
      ...o,
      status: parseOrderStatus(o.status),
      customerId: o.customerId || o.userId || 0,
      userId: o.userId || o.customerId || 0
    };
  }

  private normalizeOrders(orders: any): Order[] {
    const list = Array.isArray(orders) ? orders : [];
    return list.map(o => this.normalizeOrder(o));
  }

  getById(id: number): Observable<Order> {
    return this.http.get<ResponseModel<Order> | Order>(`${this.apiUrl}/GetById?id=${id}`).pipe(
      map(res => this.normalizeOrder(unwrapResult(res)))
    );
  }

  /**
   * @deprecated Eski metod - getAllPaged() dan foydalaning
   */
  getAll(): Observable<Order[]> {
    return this.getAllPaged({ pageNumber: 1, pageSize: 500 }).pipe(
      map(res => res.items || [])
    );
  }

  /**
   * Barcha buyurtmalarni pagination bilan olish
   * Backend: GET /api/Order/GetAll?PageNumber=1&PageSize=12&SortBy=&IsDescending=false
   */
  getAllPaged(query: PagedQuery = {}): Observable<PagedResult<Order>> {
    let params = this.appendPagedParams(new HttpParams(), query);

    return this.http.get<ResponseModel<PagedResult<Order>>>(`${this.apiUrl}/GetAll`, { params }).pipe(
      map(res => {
        const data = unwrapResult(res);
        if (data && data.items) {
          return { ...data, items: this.normalizeOrders(data.items) };
        }
        return this.emptyPagedResult(query);
      })
    );
  }

  private emptyPagedResult(query: PagedQuery = {}): PagedResult<Order> {
    return {
      items: [],
      totalCount: 0,
      pageNumber: query.pageNumber || 1,
      pageSize: query.pageSize || 12,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false
    };
  }

  private appendPagedParams(params: HttpParams, query: PagedQuery): HttpParams {
    if (query.pageNumber) params = params.set('PageNumber', query.pageNumber.toString());
    if (query.pageSize) params = params.set('PageSize', query.pageSize.toString());
    if (query.sortBy) params = params.set('SortBy', query.sortBy);
    if (query.isDescending !== undefined) params = params.set('IsDescending', query.isDescending.toString());
    if (query.filters) {
      Object.entries(query.filters).forEach(([key, value]) => {
        params = params.set(`Filters[${key}]`, value);
      });
    }
    return params;
  }

  getMyOrders(): Observable<Order[]> {
    // Barcha buyurtmalarni olish uchun katta pageSize ishlatamiz
    return this.http.get<ResponseModel<PagedResult<Order>>>(`${this.apiUrl}/GetOrderByUserId?pageNumber=1&pageSize=500`).pipe(
      map(res => {
        const data = unwrapResult(res);
        return this.normalizeOrders(data?.items || []);
      })
    );
  }

  /**
   * Pagination bilan foydalanuvchi buyurtmalarini olish
   * Backend: GET /api/Order/GetOrderByUserId?PageNumber=1&PageSize=10
   */
  getMyOrdersPaged(pageNumber: number = 1, pageSize: number = 10): Observable<PagedResult<Order>> {
    const query: PagedQuery = { pageNumber, pageSize };
    let params = new HttpParams()
      .set('PageNumber', pageNumber.toString())
      .set('PageSize', pageSize.toString());

    return this.http.get<ResponseModel<PagedResult<Order>>>(`${this.apiUrl}/GetOrderByUserId`, { params }).pipe(
      map(res => {
        const data = unwrapResult(res);
        if (data && data.items) {
          return {
            ...data,
            items: this.normalizeOrders(data.items)
          };
        }
        return this.emptyPagedResult(query);
      })
    );
  }

  // Eskirgan chaqiruvlar uchun moslik (orqaga moslashuv)
  getByCustomerId(_customerId?: number): Observable<Order[]> {
    // To'lovlar sahifasi uchun 50 ta buyurtma yetarli
    return this.getMyOrdersPaged(1, 50).pipe(
      map(res => res.items || [])
    );
  }

  updateStatus(orderId: number, status: OrderStatus): Observable<boolean> {
    return this.http.put<ResponseModel<boolean> | boolean>(
      `${this.apiUrl}/UpdateStatus?orderId=${orderId}&status=${status}`,
      null
    ).pipe(
      map(res => unwrapResult(res) === true)
    );
  }

  cancelOrder(orderId: number): Observable<boolean> {
    return this.http.put<ResponseModel<boolean> | boolean>(
      `${this.apiUrl}/Cancel?orderId=${orderId}`,
      null
    ).pipe(
      map(res => unwrapResult(res) === true)
    );
  }

  /**
   * @deprecated Eski metod - getOrdersByBranchIdPaged() dan foydalaning
   */
  getOrdersByBranchId(branchId: number): Observable<Order[]> {
    return this.getOrdersByBranchIdPaged(branchId, { pageNumber: 1, pageSize: 500 }).pipe(
      map(res => res.items || [])
    );
  }

  /**
   * Filial bo'yicha buyurtmalarni pagination bilan olish
   * Backend: GET /api/Order/GetOrdersByBranchId?branchId=1&PageNumber=1&PageSize=12
   */
  getOrdersByBranchIdPaged(branchId: number, query: PagedQuery = {}): Observable<PagedResult<Order>> {
    let params = new HttpParams().set('branchId', branchId.toString());
    params = this.appendPagedParams(params, query);

    return this.http.get<ResponseModel<PagedResult<Order>>>(`${this.apiUrl}/GetOrdersByBranchId`, { params }).pipe(
      map(res => {
        const data = unwrapResult(res);
        if (data && data.items) {
          return { ...data, items: this.normalizeOrders(data.items) };
        }
        return this.emptyPagedResult(query);
      })
    );
  }

  /**
   * Sana oralig'ida buyurtmalarni olish
   * Backend: GET /api/Order/GetOrdersByDateRange?from=2024-01-01&to=2024-12-31&PageNumber=1&PageSize=12
   */
  getOrdersByDateRange(from: string, to: string, query: PagedQuery = {}): Observable<PagedResult<Order>> {
    let params = new HttpParams()
      .set('from', from)
      .set('to', to);
    params = this.appendPagedParams(params, query);

    return this.http.get<ResponseModel<PagedResult<Order>>>(`${this.apiUrl}/GetOrdersByDateRange`, { params }).pipe(
      map(res => {
        const data = unwrapResult(res);
        if (data && data.items) {
          return { ...data, items: this.normalizeOrders(data.items) };
        }
        return this.emptyPagedResult(query);
      })
    );
  }

  getOrdersByStatus(status: OrderStatus): Observable<Order[]> {
    return this.http.get<ResponseModel<Order[]> | Order[]>(`${this.apiUrl}/GetOrdersByStatus?status=${status}`).pipe(
      map(res => this.normalizeOrders(unwrapResult(res)))
    );
  }

  computeStatusCounts(orders: Order[]): OrderStatusCounts {
    const counts: OrderStatusCounts = {
      all: orders.length,
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };

    orders.forEach(o => {
      switch (o.status) {
        case OrderStatus.Pending:
          counts.pending++;
          break;
        case OrderStatus.Confirmed:
          counts.confirmed++;
          break;
        case OrderStatus.Shipped:
          counts.shipped++;
          break;
        case OrderStatus.Delivered:
          counts.delivered++;
          break;
        case OrderStatus.Cancelled:
          counts.cancelled++;
          break;
      }
    });

    return counts;
  }

  filterOrders(
    orders: Order[],
    filter: OrderFilter,
    orderPayments?: Map<number, any>
  ): PagedResult<Order> {
    let result = [...orders];

    // 1. Status chip filter
    if (filter.status !== null && filter.status !== undefined && (filter.status as any) !== '') {
      const stNum = Number(filter.status);
      result = result.filter(o => o.status === stNum);
    }

    // 2. Branch filter
    if (filter.branchId !== null && filter.branchId !== undefined) {
      result = result.filter(o => o.companyBranchId === Number(filter.branchId));
    }

    // 3. Date From filter
    if (filter.dateFrom) {
      const fromTime = new Date(filter.dateFrom).getTime();
      result = result.filter(o => new Date(o.createdAt).getTime() >= fromTime);
    }

    // 4. Date To filter (kun oxirigacha: 23:59:59.999)
    if (filter.dateTo) {
      const toDate = new Date(filter.dateTo);
      toDate.setHours(23, 59, 59, 999);
      const toTime = toDate.getTime();
      result = result.filter(o => new Date(o.createdAt).getTime() <= toTime);
    }

    // 5. Search filter (order ID yoki mahsulot nomi)
    if (filter.search && filter.search.trim()) {
      const term = filter.search.trim().toLowerCase().replace(/^#/, '');
      result = result.filter(o => {
        const idMatches = o.id.toString().includes(term);
        const itemMatches = (o.orderItems || []).some(item =>
          (item.productName && item.productName.toLowerCase().includes(term)) ||
          item.productId.toString().includes(term)
        );
        return idMatches || itemMatches;
      });
    }

    // 6. Payment status filter
    if (filter.paymentStatus && filter.paymentStatus !== 'all' && orderPayments) {
      result = result.filter(o => {
        const pay = orderPayments.get(o.id);
        const isCompleted = (pay && pay.status === 1) || o.status === OrderStatus.Shipped || o.status === OrderStatus.Confirmed || o.status === OrderStatus.Delivered;
        
        switch (filter.paymentStatus) {
          case 'unpaid':
            return !pay && o.status !== OrderStatus.Shipped && o.status !== OrderStatus.Confirmed && o.status !== OrderStatus.Delivered;
          case 'pending':
            return pay && pay.status === 0;
          case 'completed':
            return isCompleted;
          case 'failed':
            return pay && pay.status === 2;
          default:
            return true;
        }
      });
    }

    // 7. Sorting
    const sortBy = filter.sortBy || 'createdAt_desc';
    result.sort((a, b) => {
      switch (sortBy) {
        case 'createdAt_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'totalPrice_desc':
          return (b.totalPrice || 0) - (a.totalPrice || 0);
        case 'totalPrice_asc':
          return (a.totalPrice || 0) - (b.totalPrice || 0);
        case 'createdAt_desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    // 8. Pagination
    const totalCount = result.length;
    const pageNumber = Math.max(1, filter.pageNumber || 1);
    const pageSize = Math.max(1, filter.pageSize || 10);
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const startIndex = (pageNumber - 1) * pageSize;
    const paginatedItems = result.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      totalCount,
      pageNumber,
      pageSize,
      totalPages,
      hasPreviousPage: pageNumber > 1,
      hasNextPage: pageNumber < totalPages
    };
  }
}

