import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
    RouterModule, 
    LoadingSpinnerComponent, 
    EmptyStateComponent
  ],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Kategoriyalar Boshqaruvi</h1>
          <p class="page-subtitle">Mahsulotlarni guruhlash va saralash uchun kategoriyalar ro'yxati</p>
        </div>

        <button class="btn btn-primary" (click)="openCreateModal()">
          <span>➕</span> Yangi Kategoriya
        </button>
      </div>

      <app-loading-spinner *ngIf="isLoading" message="Kategoriyalar yuklanmoqda..."></app-loading-spinner>

      <app-empty-state 
        *ngIf="!isLoading && categories.length === 0"
        icon="🏷"
        title="Kategoriyalar topilmadi"
        description="Hozircha tizimda birorta ham kategoriya mavjud emas."
        actionText="Birinchi kategoriyani qo'shish"
        (actionClick)="openCreateModal()"
      ></app-empty-state>

      <!-- Categories Table -->
      <div class="card table-card" *ngIf="!isLoading && categories.length > 0">
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
            <tr *ngFor="let cat of categories">
              <td class="cat-id">#{{ cat.id }}</td>
              <td class="cat-title">
                <strong>{{ cat.title }}</strong>
              </td>
              <td class="cat-desc">{{ cat.description || '—' }}</td>
              <td>
                <span class="badge" [class.badge-active]="cat.isActive" [class.badge-inactive]="!cat.isActive">
                  {{ cat.isActive ? 'Faol' : 'Nofaol' }}
                </span>
              </td>
              <td class="text-right actions-cell">
                <button class="btn btn-secondary btn-sm" (click)="openEditModal(cat)">
                  ✏ Tahrirlash
                </button>
                <button class="btn btn-danger btn-sm" (click)="deleteCategory(cat)">
                  🗑 O'chirish
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Create / Edit Modal -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">
              {{ editingCategory ? 'Kategoriyani Tahrirlash' : 'Yangi Kategoriya Qo\'shish' }}
            </h3>
            <button class="modal-close" (click)="closeModal()">✕</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="modal-body">
            <div class="form-group">
              <label class="form-label">Kategoriya Nomi *</label>
              <input 
                type="text" 
                class="form-control" 
                formControlName="title" 
                placeholder="Masalan: Elektronika"
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
                <span>Faol kategoriya sifatida ko'rsatilsin</span>
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
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .page-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--secondary);
    }
    .page-subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    .table-card {
      overflow-x: auto;
      padding: 0;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .data-table th {
      background: var(--bg-subtle);
      padding: 1rem 1.25rem;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border);
    }
    .data-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border);
      color: var(--secondary-light);
    }
    .data-table tr:last-child td {
      border-bottom: none;
    }
    .data-table tr:hover {
      background-color: #f8fafc;
    }
    .cat-id {
      font-weight: 600;
      color: var(--text-light);
    }
    .cat-title {
      color: var(--secondary);
    }
    .cat-desc {
      color: var(--text-muted);
      max-width: 320px;
    }
    .badge-active {
      background: var(--success-bg);
      color: var(--success);
    }
    .badge-inactive {
      background: #f1f5f9;
      color: var(--text-light);
    }
    .actions-cell {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }
    .text-right { text-align: right; }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .modal-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .modal-close {
      color: var(--text-light);
      font-size: 1.125rem;
    }
    .modal-body {
      padding: 1.5rem;
    }
    .form-check-group {
      margin-bottom: 1.25rem;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-main);
      cursor: pointer;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }
  `]
})
export class CategoryListComponent implements OnInit {
  private categoryService = inject(CategoryService);
  public authState = inject(AuthStateService);
  private notification = inject(NotificationService);
  private fb = inject(FormBuilder);

  categories: Category[] = [];
  isLoading = true;
  showModal = false;
  editingCategory: Category | null = null;
  isSubmitting = false;

  form!: FormGroup;

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

  deleteCategory(cat: Category): void {
    if (!confirm(`"${cat.title}" kategoriyasini o'chirmoqchimisiz?`)) return;

    this.categoryService.delete(cat.id).subscribe({
      next: () => {
        this.notification.success(`"${cat.title}" o'chirildi.`);
        this.categories = this.categories.filter(c => c.id !== cat.id);
      },
      error: () => {}
    });
  }
}
