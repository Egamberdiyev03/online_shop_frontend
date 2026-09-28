import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Customer, CreateCustomerDto, UpdateCustomerDto } from '../models/customer.model';
import { ResponseModel, unwrapResult } from '../models/response.model';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Customer`;

  getAll(): Observable<Customer[]> {
    return this.http.get<Customer[] | ResponseModel<Customer[]>>(`${this.apiUrl}/GetAll`).pipe(
      map(res => unwrapResult(res) || [])
    );
  }

  getById(id: number): Observable<Customer> {
    return this.http.get<ResponseModel<Customer> | Customer>(`${this.apiUrl}/GetById?id=${id}`).pipe(
      map(res => unwrapResult(res))
    );
  }

  create(dto: CreateCustomerDto): Observable<Customer> {
    return this.http.post<Customer | ResponseModel<Customer>>(`${this.apiUrl}/Create`, dto).pipe(
      map(res => unwrapResult(res))
    );
  }

  update(dto: UpdateCustomerDto): Observable<Customer> {
    return this.http.put<ResponseModel<Customer> | Customer>(`${this.apiUrl}/Update`, dto).pipe(
      map(res => unwrapResult(res))
    );
  }

  delete(id: number): Observable<boolean> {
    return this.http.delete<ResponseModel<boolean> | boolean>(`${this.apiUrl}/Delete?id=${id}`).pipe(
      map(res => unwrapResult(res) === true)
    );
  }
}
