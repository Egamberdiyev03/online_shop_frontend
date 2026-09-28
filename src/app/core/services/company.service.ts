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

  getBranchesByCompanyId(companyId: number): Observable<CompanyBranch[]> {
    return this.http.get<ResponseModel<CompanyBranch[]> | CompanyBranch[]>(`${this.companyApiUrl}/GetBranchesByCompanyId?companyId=${companyId}`).pipe(
      map(res => unwrapResult(res) || [])
    );
  }

  // --- CompanyBranch ---
  getAllBranches(): Observable<CompanyBranch[]> {
    return this.http.get<CompanyBranch[] | ResponseModel<CompanyBranch[]>>(`${this.branchApiUrl}/GetAll`).pipe(
      map(res => unwrapResult(res) || [])
    );
  }

  getBranchById(id: number): Observable<CompanyBranch> {
    return this.http.get<ResponseModel<CompanyBranch> | CompanyBranch>(`${this.branchApiUrl}/GetById?id=${id}`).pipe(
      map(res => unwrapResult(res))
    );
  }

  createBranch(dto: CreateCompanyBranchDto): Observable<CompanyBranch> {
    return this.http.post<CompanyBranch | ResponseModel<CompanyBranch>>(`${this.branchApiUrl}/Create`, dto).pipe(
      map(res => unwrapResult(res))
    );
  }

  updateBranch(dto: UpdateCompanyBranchDto): Observable<CompanyBranch> {
    return this.http.put<ResponseModel<CompanyBranch> | CompanyBranch>(`${this.branchApiUrl}/Update`, dto).pipe(
      map(res => unwrapResult(res))
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
