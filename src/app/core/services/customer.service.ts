import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Customer, CreateCustomerDto, UpdateCustomerDto } from '../models/customer.model';
import { ResponseModel, unwrapResult } from '../models/response.model';
import { PagedResult, PagedQuery } from '../models/payment.model';

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

  /**
   * @deprecated Eski metod - getUsersByBranchIdPaged() dan foydalaning
   */
  getUsersByBranchId(branchId: number): Observable<Customer[]> {
    return this.getUsersByBranchIdPaged(branchId, { pageNumber: 1, pageSize: 100 }).pipe(
      map(res => res.items || [])
    );
  }

  /**
   * Filial bo'yicha foydalanuvchilarni pagination bilan olish
   * Backend: GET /api/User/GetUsersByBranchId?branchId=1&PageNumber=1&PageSize=10&SortBy=&IsDescending=false
   */
  getUsersByBranchIdPaged(branchId: number, query: PagedQuery = {}): Observable<PagedResult<Customer>> {
    let params = new HttpParams().set('branchId', branchId.toString());
    params = this.appendPagedParams(params, query);

    return this.http.get<ResponseModel<PagedResult<Customer>>>(`${this.apiUrl}/GetUsersByBranchId`, { params }).pipe(
      map(res => {
        const data = unwrapResult(res);
        if (data && data.items) {
          return data;
        }
        return this.emptyPagedResult(query);
      })
    );
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

  private emptyPagedResult(query: PagedQuery = {}): PagedResult<Customer> {
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
}
