import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container">
      <div class="placeholder-card card">
        <div class="badge-tag">⚠️ Backend Integratsiyasi Kutilmoqda</div>
        <div class="hero-icon">{{ icon }}</div>
        <h1 class="hero-title">{{ title }}</h1>
        <p class="hero-desc">{{ description }}</p>

        <div class="status-box">
          <div class="status-header">
            <span class="status-dot"></span>
            <strong>Backend holati haqida ma'lumot:</strong>
          </div>
          <p class="status-text">
            .NET 8 Web API backendida ushbu modul (<code>{{ serviceName }}</code>) hozircha skeleton holatida
            (servis va repository'lar <code>Program.cs</code> da to'liq ro'yxatdan o'tkazilmagan).
            Frontend arxitekturasi va modellari to'liq tayyorlangan va backend endpointlari ishga tushishi bilan
            bir zumda ulanadi.
          </p>
        </div>

        <!-- Mock Preview Cards -->
        <div class="mock-section" *ngIf="type === 'payments'">
          <h3 class="mock-title">To'lov Tizimi Mock Ko'rinishi (Kelajakdagi UI)</h3>
          <div class="mock-grid">
            <div class="mock-item card">
              <div class="mock-top">
                <span class="payment-method">💳 Uzum Bank / Click</span>
                <span class="badge badge-success">Muvaffaqiyatli</span>
              </div>
              <div class="mock-amount">$120.00</div>
              <div class="mock-meta">Buyurtma #101 • 28.09.2026 14:32</div>
            </div>

            <div class="mock-item card">
              <div class="mock-top">
                <span class="payment-method">💳 Payme</span>
                <span class="badge badge-pending">Kutilmoqda</span>
              </div>
              <div class="mock-amount">$45.50</div>
              <div class="mock-meta">Buyurtma #102 • 28.09.2026 15:10</div>
            </div>
          </div>
        </div>

        <div class="actions-row">
          <a routerLink="/products" class="btn btn-primary">
            🛍 Mahsulotlarga qaytish
          </a>
          <a href="http://localhost:5099/swagger" target="_blank" rel="noopener" class="btn btn-secondary">
            Swagger API hujjatini ko'rish ↗
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .placeholder-card {
      padding: 3rem 2rem;
      text-align: center;
      max-width: 800px;
      margin: 2rem auto;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .badge-tag {
      background: #fef3c7;
      color: #b45309;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-full);
      margin-bottom: 1.5rem;
      border: 1px solid #fde68a;
    }
    .hero-icon {
      font-size: 3.5rem;
      margin-bottom: 1rem;
    }
    .hero-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--secondary);
      margin-bottom: 0.5rem;
    }
    .hero-desc {
      font-size: 0.9375rem;
      color: var(--text-muted);
      max-width: 520px;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .status-box {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-left: 4px solid #3b82f6;
      border-radius: var(--radius-md);
      padding: 1.25rem 1.5rem;
      text-align: left;
      margin-bottom: 2rem;
      width: 100%;
    }
    .status-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--secondary);
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3b82f6;
    }
    .status-text {
      font-size: 0.8125rem;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .status-text code {
      background: #e2e8f0;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-family: monospace;
      color: #1e293b;
    }
    .mock-section {
      width: 100%;
      margin-bottom: 2rem;
    }
    .mock-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--secondary);
      margin-bottom: 1rem;
      text-align: left;
    }
    .mock-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 600px) {
      .mock-grid { grid-template-columns: 1fr; }
    }
    .mock-item {
      padding: 1rem 1.25rem;
      text-align: left;
    }
    .mock-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .payment-method {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--secondary);
    }
    .badge-success { background: var(--success-bg); color: var(--success); }
    .badge-pending { background: var(--warning-bg); color: var(--warning); }
    .mock-amount {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--primary);
      margin-bottom: 0.25rem;
    }
    .mock-meta {
      font-size: 0.75rem;
      color: var(--text-light);
    }
    .actions-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
    }
  `]
})
export class PlaceholderComponent {
  @Input() type: 'payments' | 'order-items' = 'payments';

  get icon(): string {
    return this.type === 'payments' ? '💳' : '📋';
  }

  get title(): string {
    return this.type === 'payments' ? "To'lovlar Moduli (Payment)" : "Buyurtma Elementlari (OrderItem)";
  }

  get description(): string {
    return this.type === 'payments'
      ? "Buyurtmalar bo'yicha to'lovlar, kvitansiyalar va to'lov holatlarini kuzatish sahifasi."
      : "Alohida order itemlarni qidirish va boshqarish xizmati.";
  }

  get serviceName(): string {
    return this.type === 'payments' ? 'IPaymentService / PaymentService' : 'IOrderItemService / OrderItemService';
  }
}
