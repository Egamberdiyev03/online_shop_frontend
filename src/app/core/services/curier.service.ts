import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, tap, catchError, throwError, shareReplay, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ResponseModel, unwrapOrThrow } from '../models/response.model';
import { PagedResult, PagedQuery } from '../models/payment.model';
import {
  CreateCurierDto,
  CurierResponseDto,
  UpdateCurierLocationDto
} from '../models/curier.model';

@Injectable({ providedIn: 'root' })
export class CurierService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Curier`;

  myProfile = signal<CurierResponseDto | null>(null);
  private profileInFlight$: Observable<CurierResponseDto> | null = null;

  clearProfile(): void {
    this.myProfile.set(null);
    this.profileInFlight$ = null;
  }

  private handleBody<T>(res: ResponseModel<T> | T, fallback: string): T {
    return unwrapOrThrow(res, fallback);
  }

  private handleError(err: any): Observable<never> {
    return throwError(() => err);
  }

  uploadPhoto(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ResponseModel<string> | string>(`${this.apiUrl}/UploadPhoto`, formData).pipe(
      map(res => {
        const unwrapped = this.handleBody(res, 'Rasm yuklashda xatolik');
        return typeof unwrapped === 'string' ? unwrapped : '';
      }),
      catchError(err => this.handleError(err))
    );
  }

  apply(dto: CreateCurierDto): Observable<number> {
    const payload: CreateCurierDto = {
      vehicleType: Number(dto.vehicleType),
      license: dto.license?.trim() || undefined,
      profilePictureUrl: dto.profilePictureUrl?.trim() || ''
    };
    return this.http.post<ResponseModel<number>>(`${this.apiUrl}/apply`, payload).pipe(
      map(res => this.handleBody(res, 'Kuryerlikka ariza yuborishda xatolik')),
      catchError(err => this.handleError(err))
    );
  }

  getMyProfile(forceRefresh = false): Observable<CurierResponseDto> {
    const cached = this.myProfile();
    if (!forceRefresh && cached) {
      return of(cached);
    }
    if (!forceRefresh && this.profileInFlight$) {
      return this.profileInFlight$;
    }

    this.profileInFlight$ = this.http.get<ResponseModel<CurierResponseDto>>(`${this.apiUrl}/profile`).pipe(
      map(res => this.handleBody(res, 'Kuryer profilini yuklashda xatolik')),
      tap(profile => this.myProfile.set(profile)),
      catchError(err => this.handleError(err)),
      finalize(() => {
        this.profileInFlight$ = null;
      }),
      shareReplay(1)
    );
    return this.profileInFlight$;
  }

  setOnline(isOnline: boolean): Observable<boolean> {
    return this.http.put<ResponseModel<boolean>>(`${this.apiUrl}/online`, null, {
      params: new HttpParams().set('isOnline', isOnline.toString())
    }).pipe(
      map(res => this.handleBody(res, 'Holatni yangilashda xatolik') === true),
      tap(ok => {
        if (ok) {
          this.myProfile.update(p => p ? { ...p, isOnline } : p);
        }
      }),
      catchError(err => this.handleError(err))
    );
  }

  updateLocation(dto: UpdateCurierLocationDto): Observable<boolean> {
    return this.http.put<ResponseModel<boolean>>(`${this.apiUrl}/location`, dto).pipe(
      map(res => this.handleBody(res, 'Joylashuvni yangilashda xatolik') === true)
    );
  }

  getAll(query: PagedQuery): Observable<PagedResult<CurierResponseDto>> {
    let params = new HttpParams()
      .set('PageNumber', query.pageNumber?.toString() || '1')
      .set('PageSize', query.pageSize?.toString() || '12');
    if (query.sortBy) params = params.set('SortBy', query.sortBy);
    if (query.isDescending) params = params.set('IsDescending', 'true');
    if (query.filters) {
      Object.entries(query.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(`Filters[${key}]`, String(value));
        }
      });
    }
    return this.http.get<ResponseModel<PagedResult<CurierResponseDto>>>(this.apiUrl, { params }).pipe(
      map(res => this.handleBody(res, 'Kuryerlarni yuklashda xatolik')),
      catchError(err => this.handleError(err))
    );
  }

  getById(id: number): Observable<CurierResponseDto> {
    return this.http.get<ResponseModel<CurierResponseDto>>(`${this.apiUrl}/get-by-id`, {
      params: new HttpParams().set('id', id.toString())
    }).pipe(
      map(res => this.handleBody(res, 'Kuryer ma\'lumotini yuklashda xatolik')),
      catchError(err => this.handleError(err))
    );
  }

  approve(id: number): Observable<boolean> {
    return this.http.put<ResponseModel<boolean>>(`${this.apiUrl}/${id}/approve`, null).pipe(
      map(res => this.handleBody(res, 'Kuryerni tasdiqlashda xatolik') === true),
      catchError(err => this.handleError(err))
    );
  }

  reject(id: number): Observable<boolean> {
    return this.http.put<ResponseModel<boolean>>(`${this.apiUrl}/${id}/reject`, null).pipe(
      map(res => this.handleBody(res, 'Arizani rad etishda xatolik') === true),
      catchError(err => this.handleError(err))
    );
  }
}
