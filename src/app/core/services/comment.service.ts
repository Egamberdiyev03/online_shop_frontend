import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Comment, CreateCommentDto, UpdateCommentDto, PagedCommentResult } from '../models/comment.model';
import { ResponseModel, unwrapResult, isErrorResponse } from '../models/response.model';
import { PagedResult, PagedQuery } from '../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Comment`;

  create(dto: CreateCommentDto): Observable<Comment> {
    return this.http.post<ResponseModel<Comment> | Comment>(`${this.apiUrl}/Create`, dto).pipe(
      map(res => {
        console.log('Comment API raw response:', res);
        if (isErrorResponse(res)) {
          const errorMsg = (res as ResponseModel<Comment>).message || "Sharh qo'shishda xatolik";
          console.error('Comment API error:', errorMsg);
          throw new Error(errorMsg);
        }
        return unwrapResult(res);
      })
    );
  }

  getById(id: number): Observable<Comment> {
    return this.http.get<ResponseModel<Comment> | Comment>(`${this.apiUrl}/GetById?id=${id}`).pipe(
      map(res => unwrapResult(res))
    );
  }

  /**
   * @deprecated Eski metod - getAllPaged() dan foydalaning
   */
  getAll(): Observable<Comment[]> {
    return this.getAllPaged({ pageNumber: 1, pageSize: 500 }).pipe(
      map(res => res.items || [])
    );
  }

  /**
   * Barcha sharhlarni pagination bilan olish
   * Backend: GET /api/Comment/GetAll?PageNumber=1&PageSize=12&SortBy=&IsDescending=false
   */
  getAllPaged(query: PagedQuery = {}): Observable<PagedResult<Comment>> {
    const params = this.buildPagedParams(query);

    return this.http.get<ResponseModel<PagedResult<Comment>>>(`${this.apiUrl}/GetAll`, { params }).pipe(
      map(res => this.handlePagedResponse(res, query))
    );
  }

  private buildPagedParams(query: PagedQuery, initial?: HttpParams): HttpParams {
    let params = initial || new HttpParams();
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

  private handlePagedResponse(res: any, query: PagedQuery = {}): PagedResult<Comment> {
    const data = unwrapResult(res);
    if (data && data.items) {
      return data;
    }
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

  update(dto: UpdateCommentDto): Observable<Comment> {
    return this.http.put<ResponseModel<Comment> | Comment>(`${this.apiUrl}/Update`, dto).pipe(
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

  /**
   * @deprecated Eski metod - getByProductIdPaged() dan foydalaning
   */
  getByProductId(productId: number, pageNumber = 1, pageSize = 50): Observable<Comment[]> {
    return this.getByProductIdPaged(productId, { pageNumber, pageSize }).pipe(
      map(res => res.items || [])
    );
  }

  /**
   * Mahsulot sharhlari - pagination bilan
   * Backend: GET /api/Comment/GetByProductId?productId=1&PageNumber=1&PageSize=12
   */
  getByProductIdPaged(productId: number, query: PagedQuery = {}): Observable<PagedResult<Comment>> {
    const initial = new HttpParams().set('productId', productId.toString());
    const params = this.buildPagedParams(query, initial);

    return this.http.get<ResponseModel<PagedResult<Comment>>>(`${this.apiUrl}/GetByProductId`, { params }).pipe(
      map(res => this.handlePagedResponse(res, query))
    );
  }

  /**
   * @deprecated Bu metod endi ishlatilmaydi. getMy() dan foydalaning.
   */
  getByCustomerId(_customerId: number): Observable<Comment[]> {
    // Eski metod - getMy() ga yo'naltirish
    return this.getMy(1, 100).pipe(
      map(res => res.items || [])
    );
  }

  getAverageRating(productId: number): Observable<number> {
    return this.http.get<ResponseModel<number> | number>(`${this.apiUrl}/GetAverageRating?productId=${productId}`).pipe(
      map(res => {
        const val = unwrapResult(res);
        return typeof val === 'number' ? val : 0;
      })
    );
  }

  /**
   * Joriy foydalanuvchining sharhlari (pagination bilan)
   * Backend: GET /api/Comment/GetByUserId?PageNumber=1&PageSize=12
   * UserId token'dan olinadi
   */
  getMy(pageNumber = 1, pageSize = 12): Observable<PagedCommentResult> {
    return this.getMyPaged({ pageNumber, pageSize }).pipe(
      map(res => ({
        items: res.items || [],
        totalCount: res.totalCount || 0,
        pageNumber: res.pageNumber,
        pageSize: res.pageSize,
        totalPages: res.totalPages,
        hasNextPage: res.hasNextPage || false
      }))
    );
  }

  /**
   * Joriy foydalanuvchining sharhlari - PagedQuery bilan
   * Backend: GET /api/Comment/GetByUserId?PageNumber=1&PageSize=12&SortBy=&IsDescending=false
   */
  getMyPaged(query: PagedQuery = {}): Observable<PagedResult<Comment>> {
    const params = this.buildPagedParams(query);

    return this.http.get<ResponseModel<PagedResult<Comment>>>(`${this.apiUrl}/GetByUserId`, { params }).pipe(
      map(res => this.handlePagedResponse(res, query))
    );
  }
}
