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
    const formData = this.buildFormData(dto, false);
    return this.http.post<ResponseModel<Product> | Product>(`${this.apiUrl}/Create`, formData).pipe(
      map(res => unwrapResult(res))
    );
  }

  update(dto: UpdateProductDto): Observable<Product> {
    const formData = this.buildFormData(dto, true);
    return this.http.put<ResponseModel<Product> | Product>(`${this.apiUrl}/Update`, formData).pipe(
      map(res => unwrapResult(res))
    );
  }

  private buildFormData(dto: CreateProductDto | UpdateProductDto, isUpdate: boolean): FormData {
    const formData = new FormData();

    if (isUpdate && 'id' in dto) {
      formData.append('Id', dto.id.toString());
    }

    formData.append('Name', dto.name);
    formData.append('Description', dto.description || '');
    formData.append('Price', dto.price.toString());
    formData.append('CategoryId', dto.categoryId.toString());
    formData.append('Quantity', dto.quantity.toString());

    // CompanyBranchId - backend CreateProductDto uchun "companyBranchid" (kichik harf)
    if (isUpdate) {
      formData.append('CompanyBranchId', (dto as UpdateProductDto).companyBranchId.toString());
    } else {
      formData.append('CompanyBranchid', (dto as CreateProductDto).companyBranchid.toString());
    }

    // Rasm fayli yuborilsa
    if (dto.imageFile) {
      formData.append('Image', dto.imageFile, dto.imageFile.name);
    }

    return formData;
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
