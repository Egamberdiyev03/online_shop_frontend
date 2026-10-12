import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../../../core/models/category.model';
import { CategoryService } from '../../../core/services/category.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule,
    RouterModule, 
    LoadingSpinnerComponent, 
    EmptyStateComponent
  ],
  template: `
    <div class="container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Kategoriyalar Boshqaruvi</h1>
          <p class="page-subtitle">Mahsulotlarni guruhlash va saralash uchun kategoriyalar ro'yxati</p>
        </div>

        <button class="btn btn-primary" (click)="openCreateModal()">
          <span>➕</span> Yangi Kategoriya
        </button>
      </div>

      <!-- Search Bar (Matching UI Spec: 🔍) -->
      <div class="filter-bar card" *ngIf="categories.length > 0 || searchQuery">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Kategoriya nomi yoki tavsifi bo'yicha qidiruv..." 
            class="search-input"
          />
          <button *ngIf="searchQuery" class="clear-btn" (click)="searchQuery = ''">&times;</button>
        </div>
        <div class="count-badge">
          Jami: <strong>{{ filteredCategories.length }}</strong> ta kategoriya
        </div>
      </div>

      <app-loading-spinner *ngIf="isLoading" message="Kategoriyalar yuklanmoqda..."></app-loading-spinner>

      <app-empty-state 
        *ngIf="!isLoading && filteredCategories.length === 0"
        icon="🏷️"
        title="Kategoriyalar topilmadi"
        description="Qidiruv bo'yicha hech qanday kategoriya topilmadi yoki hali qo'shilmagan."
        [actionText]="emptyActionText"
        (actionClick)="onEmptyActionClick()"
      ></app-empty-state>

      <!-- Categories Table (Matching UI Spec Table) -->
      <div class="card table-card" *ngIf="!isLoading && filteredCategories.length > 0">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nomi</th>
              <th>Tavsif</th>
              <th>Holat</th>
              <th class="text-right">Amallar</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let cat of filteredCategories">
              <td class="cat-id">#{{ cat.id }}</td>
              <td class="cat-title">
                <span class="title-text">{{ cat.title }}</span>
              </td>
              <td class="cat-desc">{{ cat.description || '—' }}</td>
              <td>
                <span class="status-pill" [class.status-active]="cat.isActive" [class.status-inactive]="!cat.isActive">
                  <span class="status-dot"></span>
                  {{ cat.isActive ? 'Faol' : 'Faol emas' }}
                </span>
              </td>
              <td class="text-right actions-cell">
                <button class="btn btn-secondary btn-sm" (click)="openEditModal(cat)" title="Tahrirlash">
                  ✏️ Tahrirlash
                </button>
                <button class="btn btn-danger btn-sm" (click)="openDeleteModal(cat)" title="O'chirish">
                  🗑️ O'chirish
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Create / Edit Modal (Matching UI Spec: ### Yangi kategoriya) -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">
              {{ editingCategory ? 'Kategoriyani Tahrirlash' : 'Yangi Kategoriya' }}
            </h3>
            <button class="modal-close" (click)="closeModal()">&times;</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="modal-body">
            <div class="form-group">
              <label class="form-label">Kategoriya Nomi *</label>
              <input 
                type="text" 
                class="form-control" 
                formControlName="title" 
                placeholder="Masalan: Smartfonlar, Noutbuklar..."
              />
              <div class="form-error" *ngIf="form.get('title')?.touched && form.get('title')?.invalid">
                Kategoriya nomi kiritilishi shart (kamida 2 ta belgi).
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Tavsif</label>
              <textarea 
                class="form-control" 
                formControlName="description" 
                rows="3" 
                placeholder="Ushbu kategoriya haqida qisqacha ma'lumot..."
              ></textarea>
            </div>

            <div class="form-check-group">
              <label class="checkbox-label">
                <input type="checkbox" formControlName="isActive" />
                <span>Faol kategoriya sifatida saqlansin</span>
              </label>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Bekor qilish</button>
              <button type="submit" class="btn btn-primary" [disabled]="form.invalid || isSubmitting">
                {{ isSubmitting ? 'Saqlanmoqda...' : (editingCategory ? 'Saqlash' : 'Yaratish') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Delete Confirmation Modal (Matching UI Spec: ### O'chirishni tasdiqlang) -->
      <div class="modal-overlay" *ngIf="showDeleteModal" (click)="closeDeleteModal()">
        <div class="modal-content modal-sm" (click)="$event.stopPropagation()">
          <div class="modal-header modal-header-danger">
            <h3 class="modal-title">⚠️ O'chirishni tasdiqlang</h3>
            <button class="modal-close" (click)="closeDeleteModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="font-size: 0.95rem; color: #1e293b; line-height: 1.5;">
              Haqiqatan ham <strong>"{{ categoryToDelete?.title }}"</strong> kategoriyasini o'chirmoqchimisiz?
            </p>
            <p style="font-size: 0.8rem; color: #64748b; margin-top: 0.5rem;">
              Ushbu amal kategoriyani tizimdan butunlay olib tashlaydi.
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeDeleteModal()">Bekor qilish</button>
            <button 
              type="button" 
              class="btn btn-danger" 
              [disabled]="isDeleting"
              (click)="confirmDeleteCategory()"
            >
              {{ isDeleting ? 'O‘chirilmoqda...' : '🗑️ Ha, o‘chirilsin' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1.25rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .page-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .page-subtitle {
      color: #64748b;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    /* Filter Bar */
    .filter-bar {
      padding: 0.75rem 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }
    .search-box {
      flex: 1;
      min-width: 260px;
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.35rem 0.75rem;
    }
    .search-icon {
      font-size: 0.95rem;
      margin-right: 0.5rem;
      color: #94a3b8;
    }
    .search-input {
      border: none;
      background: transparent;
      padding: 0.4rem 0;
      width: 100%;
      font-size: 0.875rem;
      color: #0f172a;
      outline: none;
    }
    .clear-btn {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.1rem;
    }
    .count-badge {
      font-size: 0.825rem;
      color: #64748b;
    }

    /* Table Styles */
    .table-card {
      overflow-x: auto;
      padding: 0;
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .data-table th {
      background: #f8fafc;
      padding: 1rem 1.25rem;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table td {
      padding: 1.1rem 1.25rem;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      vertical-align: middle;
    }
    .data-table tr:last-child td {
      border-bottom: none;
    }
    .data-table tr:hover {
      background-color: #f8fafc;
    }
    .cat-id {
      font-weight: 700;
      color: #64748b;
      width: 80px;
    }
    .title-text {
      font-weight: 700;
      color: #0f172a;
      font-size: 0.95rem;
    }
    .cat-desc {
      color: #64748b;
      max-width: 380px;
      line-height: 1.4;
    }

    /* Status Pills */
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .status-active {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .status-active .status-dot {
      background: #16a34a;
    }
    .status-inactive {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }
    .status-inactive .status-dot {
      background: #ef4444;
    }

    :host-context(body.dark-theme) .status-active,
    :host-context(.dark-theme) .status-active {
      background: #064e3b;
      color: #86efac;
      border-color: #047857;
    }
    :host-context(body.dark-theme) .status-inactive,
    :host-context(.dark-theme) .status-inactive {
      background: #450a0a;
      color: #fca5a5;
      border-color: #7f1d1d;
    }

    .actions-cell {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }
    .text-right { text-align: right; }

    /* Modals */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
    }
    .modal-content {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      animation: modalSlide 0.2s ease-out;
    }
    .modal-sm {
      max-width: 440px;
    }
    @keyframes modalSlide {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .modal-header-danger {
      background: #fef2f2;
      border-bottom: 1px solid #fee2e2;
    }
    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
    }
    .modal-close {
      color: #94a3b8;
      font-size: 1.4rem;
      background: none;
      border: none;
      cursor: pointer;
      line-height: 1;
    }
    .modal-close:hover {
      color: #ef4444;
    }
    .modal-body {
      padding: 1.5rem;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #f1f5f9;
      background: #f8fafc;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    .form-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.4rem;
    }
    .form-control {
      width: 100%;
      padding: 0.65rem 0.85rem;
      font-size: 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      outline: none;
      transition: border 0.2s;
    }
    .form-control:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }
    .form-error {
      color: #ef4444;
      font-size: 0.75rem;
      margin-top: 0.35rem;
    }
    .form-check-group {
      margin-bottom: 0.5rem;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
    }
  `]
})
export class CategoryListComponent implements OnInit {
  private categoryService = inject(CategoryService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);

  categories: Category[] = [];
  searchQuery = '';
  isLoading = true;

  // Create / Edit modal state
  showModal = false;
  editingCategory: Category | null = null;
  isSubmitting = false;

  // Delete confirmation modal state (Matching 'O'chirishni tasdiqlang' spec)
  showDeleteModal = false;
  categoryToDelete: Category | null = null;
  isDeleting = false;

  form!: FormGroup;

  get emptyActionText(): string {
    return this.searchQuery ? 'Qidiruvni tozalash' : "Birinchi kategoriyani qo'shish";
  }

  onEmptyActionClick(): void {
    if (this.searchQuery) {
      this.searchQuery = '';
    } else {
      this.openCreateModal();
    }
  }

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();
  }

  private initForm(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      isActive: [true]
    });
  }

  loadCategories(): void {
    this.isLoading = true;
    this.categoryService.getAll().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  get filteredCategories(): Category[] {
    if (!this.searchQuery.trim()) {
      return this.categories;
    }
    const q = this.searchQuery.toLowerCase();
    return this.categories.filter(c => 
      c.title.toLowerCase().includes(q) || 
      (c.description && c.description.toLowerCase().includes(q))
    );
  }

  openCreateModal(): void {
    this.editingCategory = null;
    this.form.reset({ title: '', description: '', isActive: true });
    this.showModal = true;
  }

  openEditModal(cat: Category): void {
    this.editingCategory = cat;
    this.form.patchValue({
      title: cat.title,
      description: cat.description,
      isActive: cat.isActive
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingCategory = null;
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.isSubmitting = true;

    const val = this.form.value;

    if (this.editingCategory) {
      const updateDto: UpdateCategoryDto = {
        id: this.editingCategory.id,
        title: val.title,
        description: val.description || '',
        isActive: Boolean(val.isActive)
      };

      this.categoryService.update(updateDto).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.notification.success("Kategoriya muvaffaqiyatli yangilandi!");
          this.closeModal();
          this.loadCategories();
        },
        error: () => {
          this.isSubmitting = false;
        }
      });
    } else {
      const createDto: CreateCategoryDto = {
        title: val.title,
        description: val.description || '',
        isActive: Boolean(val.isActive)
      };

      this.categoryService.create(createDto).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.notification.success("Yangi kategoriya yaratildi!");
          this.closeModal();
          this.loadCategories();
        },
        error: () => {
          this.isSubmitting = false;
        }
      });
    }
  }

  openDeleteModal(cat: Category): void {
    this.categoryToDelete = cat;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.categoryToDelete = null;
  }

  confirmDeleteCategory(): void {
    if (!this.categoryToDelete) return;
    this.isDeleting = true;

    const catId = this.categoryToDelete.id;
    const catTitle = this.categoryToDelete.title;

    this.categoryService.delete(catId).subscribe({
      next: () => {
        this.isDeleting = false;
        this.notification.success(`"${catTitle}" o'chirildi.`);
        this.categories = this.categories.filter(c => c.id !== catId);
        this.closeDeleteModal();
      },
      error: () => {
        this.isDeleting = false;
      }
    });
  }
}
