import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product, CreateProductDto, UpdateProductDto, PagedResult } from '../models/product.model';
import { ResponseModel, unwrapResult } from '../models/response.model';

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

  getPaged(
    pageNumber: number = 1, 
    pageSize: number = 12, 
    search: string = '', 
    categoryId?: number, 
    branchId?: number
  ): Observable<PagedResult<Product>> {
    let params: any = { pageNumber, pageSize };
    if (search && search.trim()) params.search = search.trim();
    if (categoryId && categoryId > 0) params.categoryId = categoryId;
    if (branchId && branchId > 0) params.branchId = branchId;

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
