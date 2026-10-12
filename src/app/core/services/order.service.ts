import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order, OrderStatus, OrderFilter, OrderStatusCounts } from '../models/order.model';
import { PagedResult } from '../models/payment.model';
import { ResponseModel, unwrapResult } from '../models/response.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Order`;

  createOrder(
    customerId: number,
    branchId: number,
    deliveryAddress?: string,
    deliveryLatitude?: number,
    deliveryLongitude?: number
  ): Observable<boolean> {
    // Query params
    let url = `${this.apiUrl}/Create?userId=${customerId}&branchId=${branchId}`;

    // Yetkazish ma'lumotlari (agar mavjud bo'lsa)
    if (deliveryAddress) {
      url += `&deliveryAddress=${encodeURIComponent(deliveryAddress)}`;
    }
    if (deliveryLatitude !== undefined) {
      url += `&deliveryLatitude=${deliveryLatitude}`;
    }
    if (deliveryLongitude !== undefined) {
      url += `&deliveryLongitude=${deliveryLongitude}`;
    }

    return this.http.post<ResponseModel<boolean> | boolean>(url, null).pipe(
      map(res => {
        if (res && typeof res === 'object') {
          const resp = res as any;
          if (resp.statusCode && resp.statusCode >= 400) {
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

  getAll(): Observable<Order[]> {
    return this.http.get<ResponseModel<Order[]> | Order[]>(`${this.apiUrl}/GetAll`).pipe(
      map(res => this.normalizeOrders(unwrapResult(res)))
    );
  }

  getByCustomerId(customerId: number): Observable<Order[]> {
    return this.http.get<ResponseModel<Order[]> | Order[]>(`${this.apiUrl}/GetOrderByCustomerId?customerId=${customerId}`).pipe(
      map(res => this.normalizeOrders(unwrapResult(res)))
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

  getOrdersByBranchId(branchId: number): Observable<Order[]> {
    return this.http.get<ResponseModel<Order[]> | Order[]>(`${this.apiUrl}/GetOrdersByBranchId?branchId=${branchId}`).pipe(
      map(res => this.normalizeOrders(unwrapResult(res)))
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
    const total = result.length;
    const pageNumber = Math.max(1, filter.pageNumber || 1);
    const pageSize = Math.max(1, filter.pageSize || 10);
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (pageNumber - 1) * pageSize;
    const paginatedItems = result.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      total,
      pageNumber,
      pageSize,
      totalPages
    };
  }
}

