import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CompanyService } from '../../../core/services/company.service';
import { Company } from '../../../core/models/company.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { CustomerService } from '../../../core/services/customer.service';
import { Customer } from '../../../core/models/customer.model';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingSpinnerComponent],
  template: `
    <div class="page-header" *ngIf="company">
      <h1 class="page-title">{{ company.name }}</h1>
      <p class="page-subtitle">Kompaniya haqida ma'lumot va uning filiallari</p>
    </div>

    <app-loading-spinner *ngIf="isLoading"></app-loading-spinner>

    <div class="company-detail-container" *ngIf="!isLoading && company">
      <div class="company-header-card card">
         <div class="card-top" style="margin-bottom: 0;">
            <div class="company-icon">&#128188;</div>
            <div class="company-title-wrap">
              <h3 class="company-name" style="font-size: 1.5rem;">{{ company.name }}</h3>
              <span class="inn-badge">INN: {{ company.inn }}</span>
            </div>
         </div>
         <div class="company-details" style="display: flex; gap: 2rem; margin-top: 1.5rem;">
            <div class="detail-item">
              <span class="detail-icon">&#128205;</span>
              <span class="detail-text">{{ company.address }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">&#128222;</span>
              <span class="detail-text">{{ company.phoneNumber }}</span>
            </div>
         </div>
      </div>

      <h2 class="branches-section-title">Filiallar ro'yxati ({{ branches.length }})</h2>
      
      <div class="branches-dashboard-grid" *ngIf="branches.length > 0">
         <div class="branch-card card" *ngFor="let branch of branches" [routerLink]="['/branches', branch.id]" style="cursor: pointer;">
              <div class="branch-name-row">
                <span class="b-name" style="font-size: 1.25rem;">{{ branch.name }}</span>
                <span class="b-id">#{{ branch.id }}</span>
              </div>
              <div class="b-address" style="margin-top: 0.75rem;">&#128205; {{ branch.address }}</div>
              <div class="b-phone" *ngIf="branch.phoneNumber">&#128222; {{ branch.phoneNumber }}</div>
              <div class="b-loc" *ngIf="branch.location">&#127760; {{ branch.location }}</div>
         </div>
      </div>
      
      <div *ngIf="branches.length === 0" class="no-branch card" style="text-align: center; padding: 2rem;">
        Hozircha filiallar qo'shilmagan.
      </div>
      
      <!-- Admins -->
      <h2 class="branches-section-title" style="margin-top: 3rem;">Kompaniya Adminlari (Users)</h2>
      <div class="card" style="padding: 1.5rem;">
         <p style="color: var(--text-light); font-style: italic;">
           Tez kunda... Bu joyda GetUsersByCompanyId (agar backendda bo'lsa) chaqiriladi.
         </p>
      </div>
    </div>
  `,
  styles: [`
    .branches-section-title { margin: 2rem 0 1rem 0; font-size: 1.25rem; font-weight: 700; color: var(--secondary); }
    .branches-dashboard-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
    .branch-card { padding: 1.5rem; display: flex; flex-direction: column; transition: var(--transition); }
    .branch-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--primary-light); }
    .company-header-card { padding: 2rem; background: white; border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); }
    .card-top { display: flex; align-items: center; gap: 1rem; }
    .company-icon { font-size: 2.5rem; }
    .company-name { font-weight: 700; color: var(--secondary); margin: 0; }
    .inn-badge { background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; color: var(--text-light); }
    .detail-item { display: flex; align-items: center; gap: 0.5rem; color: var(--text-main); font-size: 0.875rem; }
    .branch-name-row { display: flex; justify-content: space-between; align-items: center; }
    .b-id { background: var(--bg-body); padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; color: var(--text-light); }
    .b-address, .b-phone, .b-loc { font-size: 0.875rem; color: var(--text-light); margin-top: 0.4rem; }
  `]
})
export class CompanyDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private companyService = inject(CompanyService);

  companyId!: number;
  company: Company | null = null;
  branches: CompanyBranch[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.companyId = +id;
        this.loadCompanyDetails();
      }
    });
  }

  loadCompanyDetails(): void {
    this.isLoading = true;
    this.companyService.getCompanyById(this.companyId).subscribe({
      next: (comp) => {
        this.company = comp;
        this.loadBranches();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadBranches(): void {
    this.companyService.getBranchesByCompanyId(this.companyId).subscribe({
      next: (branches) => {
        this.branches = branches;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
