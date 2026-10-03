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
  private apiUrl = `${environment.apiUrl}/User`;

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

  assignCompanyAdmin(userId: number, companyId: number): Observable<any> { 
    return this.http.post<any>(this.apiUrl + '/AssignCompanyAdmin?userId=' + userId + '&companyId=' + companyId, null); 
  }

  removeCompanyAdmin(userId: number): Observable<any> { 
    return this.http.post<any>(this.apiUrl + '/RemoveCompanyAdmin?userId=' + userId, null); 
  }

  assignBranchManager(userId: number, branchId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/AssignBranchManager?userId=${userId}&branchId=${branchId}`, null);
  }

  removeBranchManager(userId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/RemoveBranchManager?userId=${userId}`, null);
  }

  getUsersByBranchId(branchId: number): Observable<Customer[]> {
    return this.http.get<ResponseModel<Customer[]> | Customer[]>(`${this.apiUrl}/GetUsersByBranchId?branchId=${branchId}`).pipe(
      map(res => unwrapResult(res) || [])
    );
  }
}
