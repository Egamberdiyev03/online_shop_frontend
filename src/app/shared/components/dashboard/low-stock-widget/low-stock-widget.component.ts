import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface LowStockItemDto {
  id: number;
  name: string;
  categoryName?: string;
  quantity: number;
  branchName?: string;
  price?: number;
}

@Component({
  selector: 'app-low-stock-widget',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="low-stock-card">
      <div class="widget-header">
        <div class="header-title-box">
          <div class="alert-icon-box">⚠️</div>
          <div>
            <h3 class="widget-title">Kam Qolgan Mahsulotlar (Low Stock)</h3>
            <p class="widget-subtitle">Zudlik bilan to'ldirish tavsiya etiladigan tovarlar</p>
          </div>
        </div>
        <span class="count-badge">{{ displayItems.length }} ta tovar</span>
      </div>

      <div class="items-list">
        <div *ngFor="let item of displayItems" class="item-row">
          <div class="item-info">
            <span class="item-icon">📦</span>
            <div class="item-names">
              <a [routerLink]="['/products', item.id]" class="product-name-link" title="Mahsulotni ko'rish">
                {{ item.name }}
              </a>
              <span class="product-meta">
                {{ item.categoryName || 'Texnika' }} &bull; {{ item.branchName || 'Markaziy filial' }}
              </span>
            </div>
          </div>

          <div class="item-stock-box">
            <span class="stock-alert-pill" [class.zero-stock]="item.quantity <= 0">
              <span class="pulse-dot"></span>
              {{ item.quantity > 0 ? (item.quantity + ' dona qoldi') : 'Tugagan (0)' }}
            </span>
          </div>
        </div>

        <div *ngIf="displayItems.length === 0" class="empty-low-stock">
          <span class="check-icon">✅</span>
          <p>Hozirda barcha mahsulotlar yetarli miqdorda mavjud!</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .low-stock-card {
      background: #ffffff;
      border: 1px solid #fee2e2;
      border-radius: 18px;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 2px 10px rgba(239, 68, 68, 0.05);
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
    }

    .low-stock-card:hover {
      box-shadow: 0 6px 18px rgba(239, 68, 68, 0.1);
      border-color: #fca5a5;
    }

    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid #fee2e2;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .header-title-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .alert-icon-box {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .widget-title {
      font-size: 0.95rem;
      font-weight: 800;
      color: #991b1b;
      margin: 0;
      line-height: 1.2;
    }

    .widget-subtitle {
      font-size: 0.775rem;
      color: #64748b;
      margin: 0.2rem 0 0;
    }

    .count-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.65rem;
      border-radius: 9999px;
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .items-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      margin-top: 0.85rem;
    }

    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 0.75rem;
      border-radius: 12px;
      background: #fff5f5;
      border: 1px solid #fee2e2;
      transition: all 0.2s ease;
      gap: 0.75rem;
    }

    .item-row:hover {
      background: #fee2e2;
      transform: translateX(3px);
    }

    .item-info {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 0;
      flex: 1;
    }

    .item-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .item-names {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .product-name-link {
      font-size: 0.85rem;
      font-weight: 700;
      color: #1e293b;
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color 0.2s;
    }

    .product-name-link:hover {
      color: #dc2626;
      text-decoration: underline;
    }

    .product-meta {
      font-size: 0.725rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-stock-box {
      flex-shrink: 0;
    }

    .stock-alert-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.25rem 0.65rem;
      border-radius: 8px;
      background: #ffffff;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .stock-alert-pill.zero-stock {
      background: #450a0a;
      color: #fecaca;
      border-color: #991b1b;
    }

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 0 rgba(239, 68, 68, 0.7);
      animation: alertPulse 1.6s infinite;
    }

    @keyframes alertPulse {
      0% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
      }
      70% {
        transform: scale(1);
        box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
      }
      100% {
        transform: scale(0.95);
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
      }
    }

    .empty-low-stock {
      padding: 1.5rem 1rem;
      text-align: center;
      color: #16a34a;
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
    }

    .check-icon {
      font-size: 1.75rem;
    }

    /* Dark Mode */
    :host-context(body.dark-theme) .low-stock-card,
    :host-context(.dark-theme) .low-stock-card {
      background: #181622;
      border-color: #45151f;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
    }

    :host-context(body.dark-theme) .widget-header,
    :host-context(.dark-theme) .widget-header {
      border-bottom-color: #3b141e;
    }

    :host-context(body.dark-theme) .widget-title,
    :host-context(.dark-theme) .widget-title {
      color: #f87171;
    }

    :host-context(body.dark-theme) .alert-icon-box,
    :host-context(.dark-theme) .alert-icon-box {
      background: #3b141e;
      border-color: #5c1d28;
    }

    :host-context(body.dark-theme) .count-badge,
    :host-context(.dark-theme) .count-badge {
      background: #3b141e;
      color: #fca5a5;
      border-color: #5c1d28;
    }

    :host-context(body.dark-theme) .item-row,
    :host-context(.dark-theme) .item-row {
      background: #24141e;
      border-color: #3f1823;
    }

    :host-context(body.dark-theme) .item-row:hover,
    :host-context(.dark-theme) .item-row:hover {
      background: #341824;
    }

    :host-context(body.dark-theme) .product-name-link,
    :host-context(.dark-theme) .product-name-link {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .stock-alert-pill,
    :host-context(.dark-theme) .stock-alert-pill {
      background: #181622;
      color: #fca5a5;
      border-color: #5c1d28;
    }
  `]
})
export class LowStockWidgetComponent {
  @Input() items: LowStockItemDto[] = [];

  // Default featured low-stock items as per prompt specifications
  private defaultItems: LowStockItemDto[] = [
    { id: 101, name: 'Canon EOS R50 Mirrorless', categoryName: 'Kameralar', quantity: 2, branchName: 'Chilonzor filiali' },
    { id: 102, name: 'Asus TUF Gaming F15', categoryName: 'Noutbuklar', quantity: 1, branchName: 'Chilonzor filiali' },
    { id: 103, name: 'Dyson V12 Detect Slim', categoryName: 'Maishiy texnika', quantity: 3, branchName: 'Yunusobod filiali' }
  ];

  get displayItems(): LowStockItemDto[] {
    if (this.items && this.items.length > 0) {
      return this.items.slice(0, 5);
    }
    return this.defaultItems;
  }
}
