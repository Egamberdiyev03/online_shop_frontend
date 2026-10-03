import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product, CreateProductDto, UpdateProductDto } from '../../../core/models/product.model';
import { Category } from '../../../core/models/category.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { CategoryService } from '../../../core/services/category.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CompanyService } from '../../../core/services/company.service';

@Component({
  selector: 'app-product-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" (click)="onCancel()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ modalTitle }}
          </h3>
          <button class="modal-close" (click)="onCancel()">&times;</button>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="modal-body">
          <div class="form-group">
            <label class="form-label">Mahsulot Nomi *</label>
            <input 
              type="text" 
              class="form-control" 
              id="name" name="name" formControlName="name" 
              placeholder="Masalan: iPhone 15 Pro"
            />
            <div class="form-error" *ngIf="form.get('name')?.touched && form.get('name')?.invalid">
              Mahsulot nomi kiritilishi shart (kamida 2 ta belgi).
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Narxi ($ yoki so'm) *</label>
              <input 
                type="number" 
                class="form-control" 
                id="price" name="price" formControlName="price" 
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <div class="form-error" *ngIf="form.get('price')?.touched && form.get('price')?.invalid">
                Narx 0 dan kam bo'lishi mumkin emas.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Ombordagi Soni (Dona) *</label>
              <input 
                type="number" 
                class="form-control" 
                id="quantity" name="quantity" formControlName="quantity" 
                placeholder="0"
                min="0"
              />
              <div class="form-error" *ngIf="form.get('quantity')?.touched && form.get('quantity')?.invalid">
                Miqdor musbat butun son bo'lishi kerak.
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Kategoriya *</label>
              <select class="form-control" id="categoryId" name="categoryId" formControlName="categoryId">
                <option [ngValue]="null" disabled>Kategoriya tanlang</option>
                <option *ngFor="let cat of categories" [value]="cat.id">
                  {{ cat.title }}
                </option>
              </select>
              <div class="form-error" *ngIf="form.get('categoryId')?.touched && form.get('categoryId')?.invalid">
                Kategoriya tanlanishi shart.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Filial (Branch) *</label>
              <select class="form-control" id="companyBranchId" name="companyBranchId" formControlName="companyBranchId">
                <option [ngValue]="null" disabled>Filial tanlang</option>
                <option *ngFor="let branch of branches" [value]="branch.id">
                  {{ branch.name }} (#{{ branch.id }})
                </option>
              </select>
              <div class="form-error" *ngIf="form.get('companyBranchId')?.touched && form.get('companyBranchId')?.invalid">
                Filial tanlanishi shart.
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Rasm URL</label>
            <input 
              type="text" 
              class="form-control" 
              id="image" name="image" formControlName="image" 
              placeholder="https://images.unsplash.com/..."
            />
          </div>

          <div class="form-group">
            <label class="form-label">Tavsif (Description)</label>
            <textarea 
              class="form-control" 
              formControlName="description" 
              rows="3" 
              placeholder="Mahsulot haqida to'liq ma'lumot..."
            ></textarea>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="onCancel()">
              Bekor qilish
            </button>
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid || isSubmitting">
              {{ submitBtnText }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
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
      padding: 0.25rem;
      border-radius: var(--radius-sm);
    }
    .modal-close:hover {
      color: var(--text-main);
      background: var(--bg-subtle);
    }
    .modal-body {
      padding: 1.5rem;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 500px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      margin-top: 0.5rem;
    }
  `]
})
export class ProductFormModalComponent implements OnInit {
  @Input() product: Product | null = null;
  @Output() save = new EventEmitter<CreateProductDto | UpdateProductDto>();
  @Output() cancel = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private companyService = inject(CompanyService);
  public authState = inject(AuthStateService);

  form!: FormGroup;
  categories: Category[] = [];
  branches: CompanyBranch[] = [];
  isSubmitting = false;

  get modalTitle(): string {
    return this.product ? "Mahsulotni Tahrirlash" : "Yangi Mahsulot Qo'shish";
  }

  get submitBtnText(): string {
    if (this.isSubmitting) return "Saqlanmoqda...";
    return this.product ? "Saqlash" : "Qo'shish";
  }

  ngOnInit(): void {
    this.initForm();
    this.loadDropdownData();
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: [this.product?.name || '', [Validators.required, Validators.minLength(2)]],
      price: [this.product?.price || 0, [Validators.required, Validators.min(0)]],
      quantity: [this.product?.quantity || 0, [Validators.required, Validators.min(0)]],
      categoryId: [this.product?.categoryId || null, Validators.required],
      companyBranchId: [this.product?.companyBranchId || null, Validators.required],
      image: [this.product?.image || ''],
      description: [this.product?.description || '']
    });
  }

    private loadDropdownData(): void {
    this.categoryService.getAll().subscribe({
      next: (cats) => (this.categories = cats),
      error: () => {}
    });

    this.companyService.getAllBranches().subscribe({
      next: (branches) => {
        const authState = this.authState;
        if (authState.isCompanyAdmin()) {
          const cId = authState.userCompanyId();
          this.branches = branches.filter(b => b.companyId === cId);
        } else if (authState.isBranchManager()) {
          const bId = authState.userBranchId();
          this.branches = branches.filter(b => b.id === bId);
          this.form.patchValue({ companyBranchId: bId });
          // Optionally disable it so they can't even try to change it in dev tools
          // this.form.get('companyBranchId')?.disable();
        } else {
          this.branches = branches;
        }
      },
      error: () => {}
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.isSubmitting = true;

    const val = this.form.value;
    if (this.product) {
      const updateDto: UpdateProductDto = {
        id: this.product.id,
        name: val.name,
        description: val.description || '',
        price: Number(val.price),
        categoryId: Number(val.categoryId),
        image: val.image || '',
        quantity: Number(val.quantity),
        companyBranchId: Number(val.companyBranchId)
      };
      this.save.emit(updateDto);
    } else {
      const createDto: CreateProductDto = {
        name: val.name,
        description: val.description || '',
        price: Number(val.price),
        categoryId: Number(val.categoryId),
        image: val.image || '',
        quantity: Number(val.quantity),
        companyBranchid: Number(val.companyBranchId)
      };
      this.save.emit(createDto);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}


