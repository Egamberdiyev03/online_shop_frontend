import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Comment, CreateCommentDto, UpdateCommentDto, PagedCommentResult } from '../models/comment.model';
import { ResponseModel, unwrapResult } from '../models/response.model';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Comment`;

  create(dto: CreateCommentDto): Observable<Comment> {
    return this.http.post<ResponseModel<Comment> | Comment>(`${this.apiUrl}/Create`, dto).pipe(
      map(res => unwrapResult(res))
    );
  }

  getById(id: number): Observable<Comment> {
    return this.http.get<ResponseModel<Comment> | Comment>(`${this.apiUrl}/GetById?id=${id}`).pipe(
      map(res => unwrapResult(res))
    );
  }

  getAll(): Observable<Comment[]> {
    return this.http.get<Comment[] | ResponseModel<Comment[]>>(`${this.apiUrl}/GetAll`).pipe(
      map(res => unwrapResult(res) || [])
    );
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

  getByProductId(productId: number): Observable<Comment[]> {
    return this.http.get<ResponseModel<Comment[]> | Comment[]>(`${this.apiUrl}/GetByProductId?productId=${productId}`).pipe(
      map(res => unwrapResult(res) || [])
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
   * Backend: GET /api/Comment/GetByUserId?pageNumber=1&pageSize=10
   * UserId token'dan olinadi
   */
  getMy(pageNumber = 1, pageSize = 10): Observable<PagedCommentResult> {
    return this.http.get<ResponseModel<PagedCommentResult>>(`${this.apiUrl}/GetByUserId?pageNumber=${pageNumber}&pageSize=${pageSize}`).pipe(
      map(res => {
        const data = unwrapResult(res);
        return data || { items: [], totalCount: 0, pageNumber, pageSize, totalPages: 0, hasNextPage: false };
      })
    );
  }
}
