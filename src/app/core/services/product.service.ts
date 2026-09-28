import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product, CreateProductDto, UpdateProductDto } from '../models/product.model';
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
