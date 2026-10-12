import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-card" [class.clickable]="isClickable">
      <div class="card-top-row">
        <span class="stat-label">{{ label }}</span>
        <div class="stat-icon-wrapper" [ngClass]="themeClass">
          <span class="icon-emoji">{{ icon }}</span>
        </div>
      </div>

      <div class="card-metric-row">
        <span class="stat-value">{{ formattedValue }}</span>
        <span class="stat-unit" *ngIf="unit">{{ unit }}</span>
      </div>

      <div class="card-footer-row">
        <span 
          class="trend-pill" 
          [class.trend-up]="growth >= 0" 
          [class.trend-down]="growth < 0"
        >
          <span class="trend-arrow">{{ growth >= 0 ? '↑' : '↓' }}</span>
          <span class="trend-num">{{ Math.abs(growth) }}%</span>
        </span>
        <span class="timeframe-text">{{ timeframe }}</span>
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 1.25rem 1.35rem;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 140px;
    }

    .stat-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
      border-color: #cbd5e1;
    }

    .stat-card.clickable {
      cursor: pointer;
    }

    .card-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .stat-label {
      font-size: 0.775rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }

    .stat-icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      transition: transform 0.3s ease;
    }

    .stat-card:hover .stat-icon-wrapper {
      transform: scale(1.1);
    }

    /* Icon Themes */
    .theme-blue {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
    }
    .theme-green {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #15803d;
    }
    .theme-emerald {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #047857;
    }
    .theme-amber {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #b45309;
    }
    .theme-purple {
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      color: #7e22ce;
    }
    .theme-red {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
    }

    .card-metric-row {
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
      margin-bottom: 0.75rem;
    }

    .stat-value {
      font-size: 1.85rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #0f172a;
      line-height: 1;
    }

    .stat-unit {
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748b;
    }

    .card-footer-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid #f1f5f9;
    }

    .trend-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      line-height: 1.2;
    }

    .trend-up {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }

    .trend-down {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .timeframe-text {
      font-size: 0.75rem;
      color: #94a3b8;
    }

    /* Dark Mode */
    :host-context(body.dark-theme) .stat-card,
    :host-context(.dark-theme) .stat-card {
      background: #151e32;
      border-color: #22304d;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    }

    :host-context(body.dark-theme) .stat-card:hover,
    :host-context(.dark-theme) .stat-card:hover {
      border-color: #334155;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    :host-context(body.dark-theme) .stat-label,
    :host-context(.dark-theme) .stat-label {
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .stat-value,
    :host-context(.dark-theme) .stat-value {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .card-footer-row,
    :host-context(.dark-theme) .card-footer-row {
      border-top-color: #1e293b;
    }

    :host-context(body.dark-theme) .theme-blue,
    :host-context(.dark-theme) .theme-blue {
      background: #1e1b4b;
      border-color: #3730a3;
      color: #93c5fd;
    }

    :host-context(body.dark-theme) .theme-green,
    :host-context(.dark-theme) .theme-green {
      background: #052e16;
      border-color: #166534;
      color: #86efac;
    }

    :host-context(body.dark-theme) .theme-emerald,
    :host-context(.dark-theme) .theme-emerald {
      background: #064e3b;
      border-color: #047857;
      color: #6ee7b7;
    }

    :host-context(body.dark-theme) .theme-amber,
    :host-context(.dark-theme) .theme-amber {
      background: #451a03;
      border-color: #78350f;
      color: #fcd34d;
    }

    :host-context(body.dark-theme) .theme-purple,
    :host-context(.dark-theme) .theme-purple {
      background: #3b0764;
      border-color: #581c87;
      color: #d8b4fe;
    }

    :host-context(body.dark-theme) .theme-red,
    :host-context(.dark-theme) .theme-red {
      background: #450a0a;
      border-color: #991b1b;
      color: #fca5a5;
    }

    :host-context(body.dark-theme) .trend-up,
    :host-context(.dark-theme) .trend-up {
      background: #064e3b;
      color: #6ee7b7;
      border-color: #047857;
    }

    :host-context(body.dark-theme) .trend-down,
    :host-context(.dark-theme) .trend-down {
      background: #450a0a;
      color: #fca5a5;
      border-color: #991b1b;
    }
  `]
})
export class StatCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() unit?: string;
  @Input() growth: number = 0;
  @Input() timeframe: string = 'this month';
  @Input() icon: string = '📊';
  @Input() theme: 'blue' | 'green' | 'emerald' | 'amber' | 'purple' | 'red' = 'blue';
  @Input() isClickable: boolean = false;

  Math = Math;

  get formattedValue(): string {
    if (typeof this.value === 'number') {
      return this.value.toLocaleString();
    }
    return this.value;
  }

  get themeClass(): string {
    return `theme-${this.theme}`;
  }
}
