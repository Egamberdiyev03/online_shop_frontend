import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Company, CreateCompanyDto, UpdateCompanyDto } from '../models/company.model';
import { CompanyBranch, CreateCompanyBranchDto, UpdateCompanyBranchDto } from '../models/company-branch.model';
import { ResponseModel, unwrapResult } from '../models/response.model';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private http = inject(HttpClient);
  private companyApiUrl = `${environment.apiUrl}/Company`;
  private branchApiUrl = `${environment.apiUrl}/CompanyBranch`;

  // --- Company ---
  getAllCompanies(): Observable<Company[]> {
    return this.http.get<Company[] | ResponseModel<Company[]>>(`${this.companyApiUrl}/GetAll`).pipe(
      map(res => unwrapResult(res) || [])
    );
  }

  getCompanyById(id: number): Observable<Company> {
    return this.http.get<ResponseModel<Company> | Company>(`${this.companyApiUrl}/GetById?id=${id}`).pipe(
      map(res => unwrapResult(res))
    );
  }

  createCompany(dto: CreateCompanyDto): Observable<Company> {
    return this.http.post<Company | ResponseModel<Company>>(`${this.companyApiUrl}/Create`, dto).pipe(
      map(res => unwrapResult(res))
    );
  }

  updateCompany(dto: UpdateCompanyDto): Observable<Company> {
    return this.http.put<ResponseModel<Company> | Company>(`${this.companyApiUrl}/Update`, dto).pipe(
      map(res => unwrapResult(res))
    );
  }

  deleteCompany(id: number): Observable<boolean> {
    return this.http.delete<ResponseModel<boolean> | boolean>(`${this.companyApiUrl}/Delete?id=${id}`).pipe(
      map(res => unwrapResult(res) === true)
    );
  }

  private normalizeBranch(branch: CompanyBranch): CompanyBranch {
    if (!branch) return branch;
    let lat = branch.latitude != null ? Number(branch.latitude) : undefined;
    let lng = branch.longitude != null ? Number(branch.longitude) : undefined;

    if ((lat == null || isNaN(lat) || lng == null || isNaN(lng)) && branch.location) {
      const match = branch.location.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
      if (match) {
        const parsedLat = parseFloat(match[1]);
        const parsedLng = parseFloat(match[2]);
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          lat = parsedLat;
          lng = parsedLng;
        }
      }
    }

    return {
      ...branch,
      latitude: lat != null && !isNaN(lat) ? lat : undefined,
      longitude: lng != null && !isNaN(lng) ? lng : undefined
    };
  }

  getBranchesByCompanyId(companyId: number): Observable<CompanyBranch[]> {
    return this.http.get<ResponseModel<CompanyBranch[]> | CompanyBranch[]>(`${this.companyApiUrl}/GetBranchesByCompanyId?companyId=${companyId}`).pipe(
      map(res => {
        const list = unwrapResult(res) || [];
        return list.map(b => this.normalizeBranch(b));
      })
    );
  }

  // --- CompanyBranch ---
  getAllBranches(): Observable<CompanyBranch[]> {
    return this.http.get<CompanyBranch[] | ResponseModel<CompanyBranch[]>>(`${this.branchApiUrl}/GetAll`).pipe(
      map(res => {
        const list = unwrapResult(res) || [];
        return list.map(b => this.normalizeBranch(b));
      })
    );
  }

  getBranchById(id: number): Observable<CompanyBranch> {
    return this.http.get<ResponseModel<CompanyBranch> | CompanyBranch>(`${this.branchApiUrl}/GetById?id=${id}`).pipe(
      map(res => {
        const b = unwrapResult(res);
        return b ? this.normalizeBranch(b) : b;
      })
    );
  }

  createBranch(dto: CreateCompanyBranchDto): Observable<CompanyBranch> {
    const payload: CreateCompanyBranchDto = { ...dto };
    if ((!payload.location || !payload.location.includes(',')) && payload.latitude != null && payload.longitude != null) {
      payload.location = `${payload.latitude}, ${payload.longitude}`;
    }
    return this.http.post<CompanyBranch | ResponseModel<CompanyBranch>>(`${this.branchApiUrl}/Create`, payload).pipe(
      map(res => {
        const b = unwrapResult(res);
        return b ? this.normalizeBranch(b) : b;
      })
    );
  }

  updateBranch(dto: UpdateCompanyBranchDto): Observable<CompanyBranch> {
    const payload: UpdateCompanyBranchDto = { ...dto };
    if ((!payload.location || !payload.location.includes(',')) && payload.latitude != null && payload.longitude != null) {
      payload.location = `${payload.latitude}, ${payload.longitude}`;
    }
    return this.http.put<ResponseModel<CompanyBranch> | CompanyBranch>(`${this.branchApiUrl}/Update`, payload).pipe(
      map(res => {
        const b = unwrapResult(res);
        return b ? this.normalizeBranch(b) : b;
      })
    );
  }

  deleteBranch(id: number): Observable<boolean> {
    return this.http.delete<ResponseModel<boolean> | boolean>(`${this.branchApiUrl}/Delete?id=${id}`).pipe(
      map(res => unwrapResult(res) === true)
    );
  }

  getBranchProducts(branchId: number): Observable<Product[]> {
    return this.http.get<Product[] | ResponseModel<Product[]>>(`${this.branchApiUrl}/GetCompanyBranchAllProduct?companybranchid=${branchId}`).pipe(
      map(res => unwrapResult(res) || [])
    );
  }
}
