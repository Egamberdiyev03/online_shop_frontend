import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Comment, CreateCommentDto, UpdateCommentDto } from '../models/comment.model';
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

  getByCustomerId(customerId: number): Observable<Comment[]> {
    return this.http.get<ResponseModel<Comment[]> | Comment[]>(`${this.apiUrl}/GetByCustomerId?customerId=${customerId}`).pipe(
      map(res => unwrapResult(res) || [])
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
}
