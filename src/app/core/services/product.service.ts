import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product, CreateProductDto, UpdateProductDto, PagedResult } from '../models/product.model';
import { ResponseModel, unwrapResult } from '../models/response.model';

export interface ProductQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  isDescending?: boolean;
  categoryId?: number;
  companyBranchId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Product`;

  getAll(): Observable<Product[]> {
    return this.http.get<ResponseModel<Product[]> | Product[]>(`${this.apiUrl}/GetAll`).pipe(
      map(res => unwrapResult(res) || [])
    );
  }

  getPaged(query: ProductQuery = {}): Observable<PagedResult<Product>> {
    let params = new HttpParams()
      .set('PageNumber', (query.pageNumber || 1).toString())
      .set('PageSize', (query.pageSize || 12).toString());

    // SortBy va IsDescending
    if (query.sortBy) {
      params = params.set('SortBy', query.sortBy);
      params = params.set('IsDescending', (query.isDescending ?? false).toString());
    }

    // Name filter - qidiruv uchun
    const searchTrimmed = query.search?.trim();
    if (searchTrimmed) {
      params = params.set('Filters[name]', searchTrimmed);
    }

    // CategoryId filter
    if (query.categoryId && query.categoryId > 0) {
      params = params.set('Filters[categoryId]', query.categoryId.toString());
    }

    // CompanyBranchId filter
    if (query.companyBranchId && query.companyBranchId > 0) {
      params = params.set('Filters[companyBranchId]', query.companyBranchId.toString());
    }

    return this.http.get<ResponseModel<PagedResult<Product>> | PagedResult<Product>>(`${this.apiUrl}/GetPaged`, { params }).pipe(
      map(res => unwrapResult(res))
    );
  }

  getById(id: number): Observable<Product> {
    return this.http.get<ResponseModel<Product> | Product>(`${this.apiUrl}/GetById?id=${id}`).pipe(
      map(res => unwrapResult(res))
    );
  }

  create(dto: CreateProductDto): Observable<Product> {
    return this.http.post<ResponseModel<Product> | Product>(`${this.apiUrl}/Create`, dto).pipe(
      map(res => unwrapResult(res))
    );
  }

  update(dto: UpdateProductDto): Observable<Product> {
    return this.http.put<ResponseModel<Product> | Product>(`${this.apiUrl}/Update`, dto).pipe(
      map(res => unwrapResult(res))
    );
  }

  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean | ResponseModel<boolean>>(`${this.apiUrl}/Delete?id=${id}`).pipe(
      map(res => {
        const unwrapped = unwrapResult(res);
        return unwrapped === true || unwrapped === null || unwrapped === undefined;
      })
    );
  }
}
