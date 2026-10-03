import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order, OrderStatus } from '../models/order.model';
import { ResponseModel, unwrapResult } from '../models/response.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Order`;

  createOrder(customerId: number, branchId: number): Observable<boolean> {
    return this.http.post<ResponseModel<boolean> | boolean>(
      `${this.apiUrl}/Create?userId=${customerId}&branchId=${branchId}`,
      null
    ).pipe(
      map(res => {
        const unwrapped = unwrapResult(res);
        return unwrapped === true || unwrapped === null;
      })
    );
  }

  getById(id: number): Observable<Order> {
    return this.http.get<ResponseModel<Order> | Order>(`${this.apiUrl}/GetById?id=${id}`).pipe(
      map(res => unwrapResult(res))
    );
  }

  getAll(): Observable<Order[]> {
    return this.http.get<ResponseModel<Order[]> | Order[]>(`${this.apiUrl}/GetAll`).pipe(
      map(res => unwrapResult(res) || [])
    );
  }

  getByCustomerId(customerId: number): Observable<Order[]> {
    return this.http.get<ResponseModel<Order[]> | Order[]>(`${this.apiUrl}/GetOrderByCustomerId?customerId=${customerId}`).pipe(
      map(res => unwrapResult(res) || [])
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
      map(res => unwrapResult(res) || [])
    );
  }

  getOrdersByStatus(status: OrderStatus): Observable<Order[]> {
    return this.http.get<ResponseModel<Order[]> | Order[]>(`${this.apiUrl}/GetOrdersByStatus?status=${status}`).pipe(
      map(res => unwrapResult(res) || [])
    );
  }
}
