import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { OrderFilter, OrderPaymentFilter } from '../../../core/models/order.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { Company } from '../../../core/models/company.model';

@Component({
  selector: 'app-order-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filter-panel-card">
      <div class="filter-panel-header" (click)="toggleCollapse()">
        <div class="header-left-title">
          <span class="filter-header-icon">🔍</span>
          <span class="filter-header-title">Filtrlar va saralash</span>
          <span class="active-filters-badge" *ngIf="activeFiltersCount > 0">
            {{ activeFiltersCount }} faol
          </span>
        </div>

        <div class="header-right-actions">
          <button
            *ngIf="activeFiltersCount > 0"
            type="button"
            class="clear-filters-link"
            (click)="$event.stopPropagation(); resetFilters()"
          >
            ✕ Tozalash
          </button>
          <button type="button" class="collapse-toggle-btn" [class.collapsed]="isCollapsed">
            {{ isCollapsed ? '▼ Ko‘rsatish' : '▲ Yashirish' }}
          </button>
        </div>
      </div>

      <div class="filter-panel-body" [class.collapsed]="isCollapsed">
        <div class="filters-grid">
          <!-- 1. Qidiruv input (Search debounce 400ms) -->
          <div class="filter-field field-search">
            <label class="field-label">Qidiruv:</label>
            <div class="search-input-wrap">
              <span class="search-icon">🔎</span>
              <input
                type="text"
                class="filter-input search-input"
                placeholder="Buyurtma #ID yoki mahsulot nomi..."
                [ngModel]="filter.search || ''"
                (ngModelChange)="onSearchInput($event)"
              />
              <button
                *ngIf="filter.search"
                type="button"
                class="search-clear-btn"
                (click)="clearSearch()"
                title="Qidiruvni tozalash"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- 2. Kompaniya dropdown (Faqat SuperAdmin uchun) -->
          <div class="filter-field" *ngIf="showCompanyFilter">
            <label class="field-label">Kompaniya:</label>
            <select
              class="filter-select"
              [(ngModel)]="filter.companyId"
              (ngModelChange)="onFilterChanged()"
            >
              <option [ngValue]="null">Barcha kompaniyalar</option>
              <option *ngFor="let c of companies" [ngValue]="c.id">
                {{ c.name }}
              </option>
            </select>
          </div>

          <!-- 3. Filial dropdown (BranchManager ko'rmaydi) -->
          <div class="filter-field" *ngIf="showBranchFilter">
            <label class="field-label">Filial:</label>
            <select
              class="filter-select"
              [(ngModel)]="filter.branchId"
              (ngModelChange)="onFilterChanged()"
            >
              <option [ngValue]="null">Barcha filiallar</option>
              <option *ngFor="let b of branches" [ngValue]="b.id">
                {{ b.name }}
              </option>
            </select>
          </div>

          <!-- 4. To'lov holati dropdown -->
          <div class="filter-field">
            <label class="field-label">To‘lov holati:</label>
            <select
              class="filter-select"
              [(ngModel)]="filter.paymentStatus"
              (ngModelChange)="onFilterChanged()"
            >
              <option value="all">Hammasi</option>
              <option value="unpaid">To‘lov qilinmagan</option>
              <option value="pending">Kutilmoqda</option>
              <option value="completed">Tasdiqlangan</option>
              <option value="failed">Rad etilgan</option>
            </select>
          </div>

          <!-- 5. Sana: Dan -->
          <div class="filter-field">
            <label class="field-label">Sana (dan):</label>
            <input
              type="date"
              class="filter-input date-input"
              [(ngModel)]="filter.dateFrom"
              (ngModelChange)="onFilterChanged()"
            />
          </div>

          <!-- 6. Sana: Gacha -->
          <div class="filter-field">
            <label class="field-label">Sana (gacha):</label>
            <input
              type="date"
              class="filter-input date-input"
              [(ngModel)]="filter.dateTo"
              (ngModelChange)="onFilterChanged()"
            />
          </div>

          <!-- 7. Saralash -->
          <div class="filter-field">
            <label class="field-label">Saralash:</label>
            <select
              class="filter-select"
              [(ngModel)]="filter.sortBy"
              (ngModelChange)="onFilterChanged()"
            >
              <option value="createdAt_desc">Yangi avval</option>
              <option value="createdAt_asc">Eski avval</option>
              <option value="totalPrice_desc">Summa kamayish</option>
              <option value="totalPrice_asc">Summa o‘sish</option>
            </select>
          </div>
        </div>

        <div class="filter-footer-row" *ngIf="activeFiltersCount > 0">
          <div class="active-tags-list">
            <span class="active-tag" *ngIf="filter.search">
              Qidiruv: "{{ filter.search }}"
              <button (click)="clearSearch()">×</button>
            </span>
            <span class="active-tag" *ngIf="filter.branchId">
              Filial #{{ filter.branchId }}
              <button (click)="filter.branchId = null; onFilterChanged()">×</button>
            </span>
            <span class="active-tag" *ngIf="filter.companyId">
              Kompaniya #{{ filter.companyId }}
              <button (click)="filter.companyId = null; onFilterChanged()">×</button>
            </span>
            <span class="active-tag" *ngIf="filter.paymentStatus">
              To‘lov: {{ getPaymentStatusLabel(filter.paymentStatus) }}
              <button (click)="filter.paymentStatus = null; onFilterChanged()">×</button>
            </span>
            <span class="active-tag" *ngIf="filter.dateFrom">
              Dan: {{ filter.dateFrom }}
              <button (click)="filter.dateFrom = null; onFilterChanged()">×</button>
            </span>
            <span class="active-tag" *ngIf="filter.dateTo">
              Gacha: {{ filter.dateTo }}
              <button (click)="filter.dateTo = null; onFilterChanged()">×</button>
            </span>
          </div>

          <button
            type="button"
            class="btn btn-outline-danger btn-sm reset-btn"
            (click)="resetFilters()"
          >
            Barcha filtrlarni tozalash ({{ activeFiltersCount }})
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filter-panel-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .filter-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      background: #f8fafc;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      user-select: none;
    }

    .filter-panel-header:hover {
      background: #f1f5f9;
    }

    .header-left-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .filter-header-icon {
      font-size: 1rem;
    }

    .filter-header-title {
      font-size: 0.9rem;
      font-weight: 700;
      color: #1e293b;
    }

    .active-filters-badge {
      background: #4f46e5;
      color: #ffffff;
      font-size: 0.725rem;
      font-weight: 700;
      padding: 0.15rem 0.55rem;
      border-radius: 9999px;
      margin-left: 0.25rem;
    }

    .header-right-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .clear-filters-link {
      background: transparent;
      border: none;
      color: #ef4444;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0.2rem 0.4rem;
    }

    .clear-filters-link:hover {
      text-decoration: underline;
    }

    .collapse-toggle-btn {
      background: transparent;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.25rem 0.6rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
    }

    .filter-panel-body {
      padding: 1rem 1.25rem;
      transition: all 0.3s ease;
    }

    .filter-panel-body.collapsed {
      display: none;
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 0.85rem 1rem;
      align-items: flex-end;
    }

    .field-search {
      grid-column: span 2;
    }

    @media (max-width: 768px) {
      .field-search {
        grid-column: span 1;
      }
      .filters-grid {
        grid-template-columns: 1fr;
      }
    }

    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .field-label {
      font-size: 0.775rem;
      font-weight: 700;
      color: #475569;
      margin: 0;
    }

    .filter-input,
    .filter-select {
      height: 38px;
      padding: 0.4rem 0.75rem;
      font-size: 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;
      color: #1e293b;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      width: 100%;
    }

    .filter-input:focus,
    .filter-select:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }

    .search-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      font-size: 0.85rem;
      color: #94a3b8;
      pointer-events: none;
    }

    .search-input {
      padding-left: 2.1rem;
      padding-right: 2rem;
    }

    .search-clear-btn {
      position: absolute;
      right: 0.6rem;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.8rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.2rem;
    }

    .search-clear-btn:hover {
      color: #0f172a;
    }

    .date-input {
      padding-right: 0.5rem;
    }

    .filter-footer-row {
      margin-top: 1rem;
      padding-top: 0.85rem;
      border-top: 1px dashed #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .active-tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      align-items: center;
    }

    .active-tag {
      background: #ede9fe;
      color: #5b21b6;
      border: 1px solid #ddd6fe;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }

    .active-tag button {
      background: transparent;
      border: none;
      color: #5b21b6;
      font-size: 0.85rem;
      cursor: pointer;
      line-height: 1;
      padding: 0;
    }

    .reset-btn {
      font-size: 0.775rem;
      font-weight: 700;
      border-radius: 6px;
      padding: 0.3rem 0.7rem;
      border: 1px solid #fca5a5;
      background: #fef2f2;
      color: #dc2626;
      cursor: pointer;
    }

    .reset-btn:hover {
      background: #fee2e2;
    }

    /* Dark Mode Support (body.dark-theme) */
    :host-context(body.dark-theme) .filter-panel-card,
    :host-context(.dark) .filter-panel-card,
    :host-context([data-theme='dark']) .filter-panel-card {
      background: #151e32;
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .filter-panel-header,
    :host-context(.dark) .filter-panel-header,
    :host-context([data-theme='dark']) .filter-panel-header {
      background: #0f172a;
      border-color: #22304d;
    }

    :host-context(body.dark-theme) .filter-panel-header:hover,
    :host-context(.dark) .filter-panel-header:hover,
    :host-context([data-theme='dark']) .filter-panel-header:hover {
      background: #151e32;
    }

    :host-context(body.dark-theme) .filter-header-title,
    :host-context(.dark) .filter-header-title,
    :host-context([data-theme='dark']) .filter-header-title {
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .collapse-toggle-btn,
    :host-context(.dark) .collapse-toggle-btn,
    :host-context([data-theme='dark']) .collapse-toggle-btn {
      border-color: #22304d;
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .field-label,
    :host-context(.dark) .field-label,
    :host-context([data-theme='dark']) .field-label {
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .filter-input,
    :host-context(.dark) .filter-input,
    :host-context([data-theme='dark']) .filter-input,
    :host-context(body.dark-theme) .filter-select,
    :host-context(.dark) .filter-select,
    :host-context([data-theme='dark']) .filter-select {
      background: #0b0f19;
      border-color: #22304d;
      color: #f8fafc;
    }

    :host-context(body.dark-theme) .filter-input:focus,
    :host-context(body.dark-theme) .filter-select:focus {
      border-color: #6366f1;
      background: #0f172a;
    }

    :host-context(body.dark-theme) .filter-input::placeholder {
      color: #475569;
    }

    :host-context(body.dark-theme) .search-input-wrap .search-icon {
      color: #64748b;
    }

    :host-context(body.dark-theme) .search-clear-btn {
      color: #94a3b8;
    }

    :host-context(body.dark-theme) .active-filters-strip {
      border-top-color: #22304d;
    }

    :host-context(body.dark-theme) .active-tag {
      background: #1e1b4b;
      color: #c7d2fe;
      border-color: #3730a3;
    }

    :host-context(body.dark-theme) .active-tag button {
      color: #c7d2fe;
    }

    :host-context(body.dark-theme) .reset-btn {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.35);
      color: #fca5a5;
    }
    :host-context(body.dark-theme) .reset-btn:hover {
      background: rgba(239, 68, 68, 0.25);
    }
  `]
})
export class OrderFiltersComponent implements OnInit, OnDestroy {
  @Input() filter: OrderFilter = {
    search: '',
    branchId: null,
    companyId: null,
    dateFrom: null,
    dateTo: null,
    paymentStatus: 'all',
    sortBy: 'createdAt_desc',
    pageNumber: 1,
    pageSize: 10
  };

  @Input() branches: CompanyBranch[] = [];
  @Input() companies: Company[] = [];
  @Input() showBranchFilter = true;
  @Input() showCompanyFilter = false;

  @Output() filterChange = new EventEmitter<OrderFilter>();
  @Output() reset = new EventEmitter<void>();

  isCollapsed = false;
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  ngOnInit(): void {
    if (!this.filter.paymentStatus) {
      this.filter.paymentStatus = 'all';
    }
    this.searchSub = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe((term) => {
      this.filter.search = term;
      this.filter.pageNumber = 1;
      this.filterChange.emit({ ...this.filter });
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.filter.search = '';
    this.filter.pageNumber = 1;
    this.searchSubject.next('');
  }

  onFilterChanged(): void {
    this.filter.pageNumber = 1;
    this.filterChange.emit({ ...this.filter });
  }

  resetFilters(): void {
    this.filter.search = '';
    this.filter.branchId = null;
    this.filter.companyId = null;
    this.filter.dateFrom = null;
    this.filter.dateTo = null;
    this.filter.paymentStatus = 'all';
    this.filter.sortBy = 'createdAt_desc';
    this.filter.pageNumber = 1;
    this.reset.emit();
    this.filterChange.emit({ ...this.filter });
  }

  get activeFiltersCount(): number {
    let count = 0;
    if (this.filter.search && this.filter.search.trim()) count++;
    if (this.filter.branchId !== null && this.filter.branchId !== undefined) count++;
    if (this.filter.companyId !== null && this.filter.companyId !== undefined) count++;
    if (this.filter.dateFrom) count++;
    if (this.filter.dateTo) count++;
    if (this.filter.paymentStatus && this.filter.paymentStatus !== 'all') count++;
    if (this.filter.sortBy && this.filter.sortBy !== 'createdAt_desc') count++;
    return count;
  }

  getPaymentStatusLabel(status: OrderPaymentFilter | null): string {
    switch (status) {
      case 'unpaid': return 'To‘lov qilinmagan';
      case 'pending': return 'Kutilmoqda';
      case 'completed': return 'Tasdiqlangan';
      case 'failed': return 'Rad etilgan';
      default: return 'Barchasi';
    }
  }
}
