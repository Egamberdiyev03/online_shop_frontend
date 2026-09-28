import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../models/category.model';
import { ResponseModel, unwrapResult } from '../models/response.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Category`;

  getAll(): Observable<Category[]> {
    return this.http.get<ResponseModel<Category[]> | Category[]>(`${this.apiUrl}/GetAll`).pipe(
      map(res => unwrapResult(res) || [])
    );
  }

  getById(id: number): Observable<Category> {
    return this.http.get<ResponseModel<Category> | Category>(`${this.apiUrl}/GetById?id=${id}`).pipe(
      map(res => unwrapResult(res))
    );
  }

  create(dto: CreateCategoryDto): Observable<Category> {
    return this.http.post<ResponseModel<Category> | Category>(`${this.apiUrl}/Create`, dto).pipe(
      map(res => unwrapResult(res))
    );
  }

  update(dto: UpdateCategoryDto): Observable<Category> {
    return this.http.put<ResponseModel<Category> | Category>(`${this.apiUrl}/Update`, dto).pipe(
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
