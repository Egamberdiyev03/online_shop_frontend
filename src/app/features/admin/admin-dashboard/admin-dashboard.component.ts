import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CustomerService } from '../../../core/services/customer.service';
import { ProductService } from '../../../core/services/product.service';
import { OrderService } from '../../../core/services/order.service';
import { CompanyService } from '../../../core/services/company.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-wrapper">
      <div class="dash-header">
        <h2>Boshqaruv Paneli</h2>
        <p>Umumiy statistika va tizim holati</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon users">&#128101;</div>
          <div class="stat-info">
            <span class="stat-label">Jami Foydalanuvchilar</span>
            <span class="stat-value">{{ totalUsers }}</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon products">&#128230;</div>
          <div class="stat-info">
            <span class="stat-label">Barcha Mahsulotlar</span>
            <span class="stat-value">{{ totalProducts }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon companies">&#127970;</div>
          <div class="stat-info">
            <span class="stat-label">Kompaniya va Filiallar</span>
            <span class="stat-value">{{ totalCompanies }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon revenue">&#128176;</div>
          <div class="stat-info">
            <span class="stat-label">Umumiy Tushum</span>
            <span class="stat-value">{{ totalRevenue | number:'1.0-0' }} so'm</span>
          </div>
        </div>
      </div>

      <div class="dash-quick-links">
        <h3>Tezkor O'tish</h3>
        <div class="links-grid">
          <a routerLink="/companies" class="quick-link">Kompaniyalar va Filiallarni Boshqarish &rarr;</a>
          <a routerLink="/categories" class="quick-link">Kategoriyalar &rarr;</a>
          <a routerLink="/customers" class="quick-link">Xodimlar / Mijozlar &rarr;</a>
          <a routerLink="/orders" class="quick-link">Barcha Buyurtmalar &rarr;</a>
          <a routerLink="/products" class="quick-link">Mahsulotlar Bazasi &rarr;</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-wrapper { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .dash-header { margin-bottom: 2rem; }
    .dash-header h2 { font-size: 2rem; font-weight: 800; color: #1e293b; margin: 0; }
    .dash-header p { color: #64748b; margin-top: 0.5rem; }
    
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
    .stat-card { background: white; border-radius: 12px; padding: 1.5rem; display: flex; align-items: center; gap: 1.25rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; transition: transform 0.2s; }
    .stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
    .stat-icon { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; }
    .stat-icon.users { background: #dbeafe; color: #2563eb; }
    .stat-icon.products { background: #fef3c7; color: #d97706; }
    .stat-icon.companies { background: #e0e7ff; color: #4f46e5; }
    .stat-icon.revenue { background: #dcfce7; color: #16a34a; }
    
    .stat-info { display: flex; flex-direction: column; }
    .stat-label { font-size: 0.875rem; color: #64748b; font-weight: 600; margin-bottom: 0.25rem; }
    .stat-value { font-size: 1.5rem; font-weight: 800; color: #0f172a; }

    .dash-quick-links h3 { font-size: 1.25rem; font-weight: 700; color: #334155; margin-bottom: 1rem; }
    .links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
    .quick-link { display: block; padding: 1rem; background: white; border: 1px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: #0f172a; font-weight: 600; transition: all 0.2s; }
    .quick-link:hover { background: #f8fafc; border-color: #cbd5e1; color: #2563eb; padding-left: 1.25rem; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  totalUsers = 0;
  totalProducts = 0;
  totalCompanies = 0;
  totalRevenue = 0;

  private customerService = inject(CustomerService);
  private productService = inject(ProductService);
  private companyService = inject(CompanyService);
  private orderService = inject(OrderService);

  ngOnInit() {
    this.customerService.getAll().subscribe(d => this.totalUsers = d.length);
    this.productService.getAll().subscribe(d => this.totalProducts = d.length);
    this.companyService.getAllCompanies().subscribe(d => this.totalCompanies = d.length);
    this.orderService.getAll().subscribe(d => {
      this.totalRevenue = d.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    });
  }
}
