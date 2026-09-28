import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-col brand-col">
          <div class="footer-logo">
            <span class="logo-emoji">🛍</span>
            <span class="logo-title">Online<strong>Shop</strong></span>
          </div>
          <p class="footer-desc">
            Clean Architecture .NET 8 Web API + PostgreSQL backend asosidagi zamonaviy Angular frontend ilovasi.
          </p>
          <div class="tech-tags">
            <span class="tech-tag">.NET 8</span>
            <span class="tech-tag">Angular 19</span>
            <span class="tech-tag">PostgreSQL</span>
            <span class="tech-tag">Clean Architecture</span>
          </div>
        </div>

        <div class="footer-col">
          <h4 class="col-title">Tezkor Havolalar</h4>
          <ul class="col-links">
            <li><a routerLink="/products">Barcha Mahsulotlar</a></li>
            <li><a routerLink="/categories">Kategoriyalar</a></li>
            <li><a routerLink="/companies">Kompaniyalar & Filiallar</a></li>
            <li><a routerLink="/cart">Mening Savatim</a></li>
            <li><a routerLink="/orders">Mening Buyurtmalarim</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4 class="col-title">Tizim Holati</h4>
          <ul class="col-links">
            <li><a routerLink="/customers">Mijozlar Boshqaruvi</a></li>
            <li><a routerLink="/payments">To'lovlar (Mock / Rejalashtirilgan)</a></li>
            <li><a routerLink="/order-items">OrderItem moduli (Skeleton)</a></li>
            <li><a href="http://localhost:5099/swagger" target="_blank" rel="noopener">Backend Swagger API ↗</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="footer-bottom-inner">
          <p>© 2026 OnlineShop. Barcha huquqlar himoyalangan.</p>
          <p class="footer-status">🟢 Frontend & Backend API tayyor</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background-color: #0f172a;
      color: #94a3b8;
      border-top: 1px solid #1e293b;
      margin-top: auto;
    }
    .footer-container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 3rem 1rem 2rem;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 2.5rem;
    }
    @media (max-width: 768px) {
      .footer-container {
        grid-template-columns: 1fr;
      }
    }
    .footer-logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.25rem;
      color: #ffffff;
      margin-bottom: 0.75rem;
    }
    .logo-title strong {
      color: var(--primary);
    }
    .footer-desc {
      font-size: 0.875rem;
      line-height: 1.6;
      max-width: 380px;
      margin-bottom: 1rem;
    }
    .tech-tags {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .tech-tag {
      background: #1e293b;
      color: #cbd5e1;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      border: 1px solid #334155;
    }
    .col-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: #ffffff;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
    }
    .col-links {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }
    .col-links a {
      color: #94a3b8;
      font-size: 0.875rem;
      transition: color 0.2s ease;
    }
    .col-links a:hover {
      color: #ffffff;
    }
    .footer-bottom {
      border-top: 1px solid #1e293b;
      padding: 1.25rem 1rem;
      font-size: 0.8125rem;
    }
    .footer-bottom-inner {
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .footer-status {
      color: #10b981;
      font-weight: 600;
    }
  `]
})
export class FooterComponent {}
