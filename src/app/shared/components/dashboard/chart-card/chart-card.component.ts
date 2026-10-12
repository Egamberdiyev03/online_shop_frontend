import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DonutSlice {
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface BarDataPoint {
  label: string;
  value: number;
  formattedValue?: string;
  sublabel?: string;
}

@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-card">
      <div class="chart-header">
        <div>
          <h3 class="chart-title">{{ title }}</h3>
          <p class="chart-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
        </div>

        <!-- Optional Period Toggle -->
        <div class="period-toggle" *ngIf="showPeriodToggle">
          <button 
            type="button" 
            class="toggle-chip" 
            [class.active]="selectedPeriod === '7d'" 
            (click)="onPeriodSelect('7d')"
          >
            7 kun
          </button>
          <button 
            type="button" 
            class="toggle-chip" 
            [class.active]="selectedPeriod === '30d'" 
            (click)="onPeriodSelect('30d')"
          >
            30 kun
          </button>
        </div>
      </div>

      <!-- 1. DONUT / PIE CHART -->
      <div *ngIf="type === 'donut'" class="donut-chart-wrap">
        <div class="donut-visual">
          <svg viewBox="0 0 100 100" class="donut-svg">
            <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f1f5f9" stroke-width="12"></circle>
            <circle
              *ngFor="let slice of donutSlices; let idx = index"
              cx="50"
              cy="50"
              r="38"
              fill="transparent"
              [attr.stroke]="slice.color"
              stroke-width="12"
              [attr.stroke-dasharray]="getStrokeDashArray(slice.percent)"
              [attr.stroke-dashoffset]="getStrokeDashOffset(idx)"
              class="donut-segment"
            ></circle>
          </svg>
          <div class="donut-center-info">
            <span class="donut-total-num">{{ donutTotal }}</span>
            <span class="donut-total-label">Jami</span>
          </div>
        </div>

        <div class="donut-legend">
          <div *ngFor="let item of donutSlices" class="legend-row">
            <div class="legend-title-box">
              <span class="legend-color-dot" [style.background-color]="item.color"></span>
              <span class="legend-name">{{ item.label }}</span>
            </div>
            <div class="legend-val-box">
              <span class="legend-count">{{ item.value }} ta</span>
              <span class="legend-pct">({{ item.percent }}%)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. REVENUE BAR / AREA CHART -->
      <div *ngIf="type === 'bar'" class="bar-chart-wrap">
        <div class="bar-chart-body">
          <div *ngFor="let bar of barData" class="bar-column group">
            <div class="bar-tooltip">
              <span class="tooltip-val">{{ bar.formattedValue || (bar.value | number:'1.0-0') }}</span>
              <span class="tooltip-label">{{ bar.label }}</span>
            </div>
            <div class="bar-track">
              <div 
                class="bar-fill" 
                [style.height.%]="getBarHeightPercent(bar.value)"
                [style.background]="barColor"
              ></div>
            </div>
            <span class="bar-label-text">{{ bar.label }}</span>
          </div>
        </div>
      </div>

      <!-- 3. PROGRESS DISTRIBUTION BARS -->
      <div *ngIf="type === 'progress'" class="progress-bars-wrap">
        <div *ngFor="let item of progressItems" class="progress-row">
          <div class="progress-info-line">
            <span class="prog-label">{{ item.label }}</span>
            <span class="prog-val">{{ item.value }}</span>
          </div>
          <div class="prog-track">
            <div class="prog-fill" [style.width.%]="item.percent" [style.background-color]="item.color"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chart-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 1.35rem 1.5rem;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .chart-card:hover {
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
      border-color: #cbd5e1;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .chart-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      line-height: 1.2;
    }

    .chart-subtitle {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0.25rem 0 0;
    }

    .period-toggle {
      display: flex;
      gap: 0.35rem;
      background: #f1f5f9;
      padding: 0.25rem;
      border-radius: 10px;
    }

    .toggle-chip {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 8px;
      color: #64748b;
      transition: all 0.2s;
    }

    .toggle-chip.active {
      background: #ffffff;
      color: #4f46e5;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    /* Donut Chart */
    .donut-chart-wrap {
      display: flex;
      align-items: center;
      gap: 1.75rem;
      flex: 1;
      flex-wrap: wrap;
    }

    .donut-visual {
      position: relative;
      width: 140px;
      height: 140px;
      flex-shrink: 0;
    }

    .donut-svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }

    .donut-segment {
      transition: stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease;
    }

    .donut-center-info {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .donut-total-num {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1;
    }

    .donut-total-label {
      font-size: 0.725rem;
      font-weight: 600;
      color: #64748b;
      margin-top: 0.15rem;
    }

    .donut-legend {
      flex: 1;
      min-width: 170px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .legend-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
    }

    .legend-title-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .legend-color-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .legend-name {
      color: #475569;
      font-weight: 600;
    }

    .legend-val-box {
      display: flex;
      gap: 0.35rem;
      align-items: center;
    }

    .legend-count {
      font-weight: 800;
      color: #0f172a;
    }

    .legend-pct {
      color: #94a3b8;
      font-size: 0.75rem;
    }

    /* Bar Chart */
    .bar-chart-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 180px;
    }

    .bar-chart-body {
      display: flex;
      align-items: flex-end;
      gap: 0.65rem;
      height: 160px;
      padding-top: 25px;
    }

    .bar-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      position: relative;
    }

    .bar-tooltip {
      position: absolute;
      top: -24px;
      background: #0f172a;
      color: #ffffff;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-size: 0.675rem;
      font-weight: 700;
      white-space: nowrap;
      opacity: 0;
      transform: translateY(4px);
      transition: all 0.2s ease;
      pointer-events: none;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .bar-column:hover .bar-tooltip {
      opacity: 1;
      transform: translateY(0);
    }

    .bar-track {
      width: 100%;
      max-width: 32px;
      background: #f1f5f9;
      border-radius: 8px 8px 0 0;
      flex: 1;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
    }

    .bar-fill {
      width: 100%;
      border-radius: 6px 6px 0 0;
      transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .bar-label-text {
      font-size: 0.725rem;
      font-weight: 600;
      color: #64748b;
      margin-top: 0.4rem;
      white-space: nowrap;
    }

    /* Progress Distribution */
    .progress-bars-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      flex: 1;
    }

    .progress-row {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .progress-info-line {
      display: flex;
      justify-content: space-between;
      font-size: 0.825rem;
    }

    .prog-label {
      color: #475569;
      font-weight: 600;
    }

    .prog-val {
      font-weight: 800;
      color: #0f172a;
    }

    .prog-track {
      height: 8px;
      background: #f1f5f9;
      border-radius: 9999px;
      overflow: hidden;
    }

    .prog-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.6s ease;
    }

    /* Dark Mode */
    :host-context(body.dark-theme) .chart-card,
    :host-context(.dark-theme) .chart-card {
      background: #151e32;
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .chart-title,
    :host-context(.dark-theme) .chart-title {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .chart-subtitle,
    :host-context(.dark-theme) .chart-subtitle {
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .period-toggle,
    :host-context(.dark-theme) .period-toggle {
      background: #0f172a;
    }

    :host-context(body.dark-theme) .toggle-chip,
    :host-context(.dark-theme) .toggle-chip {
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .toggle-chip.active,
    :host-context(.dark-theme) .toggle-chip.active {
      background: #1e293b;
      color: #818cf8;
    }

    :host-context(body.dark-theme) .donut-total-num,
    :host-context(.dark-theme) .donut-total-num {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .legend-name,
    :host-context(.dark-theme) .legend-name {
      color: #cbd5e1;
    }

    :host-context(body.dark-theme) .legend-count,
    :host-context(.dark-theme) .legend-count {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .bar-track,
    :host-context(.dark-theme) .bar-track {
      background: #0f172a;
    }

    :host-context(body.dark-theme) .bar-label-text,
    :host-context(.dark-theme) .bar-label-text {
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .prog-label,
    :host-context(.dark-theme) .prog-label {
      color: #cbd5e1;
    }

    :host-context(body.dark-theme) .prog-val,
    :host-context(.dark-theme) .prog-val {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .prog-track,
    :host-context(.dark-theme) .prog-track {
      background: #0f172a;
    }
  `]
})
export class ChartCardComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() type: 'donut' | 'bar' | 'progress' = 'donut';
  @Input() showPeriodToggle: boolean = false;
  @Input() selectedPeriod: '7d' | '30d' = '7d';

  @Input() donutSlices: DonutSlice[] = [];
  @Input() donutTotal: number | string = 0;

  @Input() barData: BarDataPoint[] = [];
  @Input() barColor: string = 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)';

  @Input() progressItems: { label: string; value: string | number; percent: number; color: string }[] = [];

  @Output() periodChange = new EventEmitter<'7d' | '30d'>();

  onPeriodSelect(p: '7d' | '30d'): void {
    this.selectedPeriod = p;
    this.periodChange.emit(p);
  }

  getStrokeDashArray(pct: number): string {
    const circumference = 2 * Math.PI * 38; // ~238.76
    const filled = (pct / 100) * circumference;
    return `${filled} ${circumference - filled}`;
  }

  getStrokeDashOffset(idx: number): number {
    const circumference = 2 * Math.PI * 38;
    let accumulated = 0;
    for (let i = 0; i < idx; i++) {
      accumulated += (this.donutSlices[i]?.percent || 0);
    }
    return -((accumulated / 100) * circumference);
  }

  getBarHeightPercent(val: number): number {
    if (!this.barData || this.barData.length === 0) return 0;
    const max = Math.max(...this.barData.map(d => d.value), 1);
    return Math.max(12, Math.round((val / max) * 100));
  }
}
