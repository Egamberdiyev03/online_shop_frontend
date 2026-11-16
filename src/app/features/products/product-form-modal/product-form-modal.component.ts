import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Product, CreateProductDto, UpdateProductDto } from '../../../core/models/product.model';
import { Category } from '../../../core/models/category.model';
import { CompanyBranch } from '../../../core/models/company-branch.model';
import { CategoryService } from '../../../core/services/category.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { CompanyService } from '../../../core/services/company.service';
import { environment } from '../../../../environments/environment';

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
          <button type="button" class="modal-close" (click)="onCancel()">&times;</button>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="modal-form">
          <div class="modal-body">
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
              <label class="form-label">Rasm</label>
              <div class="image-upload-area" [class.has-image]="imagePreviewUrl || existingImageUrl">
                <!-- Preview va Change tugmasi bir qatorda -->
                <div class="image-preview-row" *ngIf="imagePreviewUrl || existingImageUrl">
                  <div class="image-preview">
                    <img [src]="imagePreviewUrl || existingImageUrl" alt="Rasm preview" />
                    <button type="button" class="remove-image-btn" (click)="removeImage()" title="Rasmni olib tashlash">
                      &times;
                    </button>
                  </div>
                  <div class="change-image-row">
                    <input
                      type="file"
                      id="changeImageFile"
                      #changeFileInput
                      accept=".jpg,.jpeg,.png,.webp"
                      (change)="onFileSelected($event)"
                      class="file-input"
                    />
                    <label for="changeImageFile" class="btn btn-secondary btn-sm">
                      Rasmni almashtirish
                    </label>
                  </div>
                </div>

                <!-- Upload zone -->
                <div class="upload-zone" *ngIf="!imagePreviewUrl && !existingImageUrl">
                  <input
                    type="file"
                    id="imageFile"
                    #fileInput
                    accept=".jpg,.jpeg,.png,.webp"
                    (change)="onFileSelected($event)"
                    class="file-input"
                  />
                  <label for="imageFile" class="upload-label">
                    <span class="upload-icon">📷</span>
                    <span class="upload-text">Rasm tanlash</span>
                    <span class="upload-hint">.jpg, .jpeg, .png, .webp (max 5MB)</span>
                  </label>
                </div>
              </div>
              <div class="form-error" *ngIf="imageError">
                {{ imageError }}
              </div>
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
    /* Modal Layout - Scroll qo'llab-quvvatlash */
    .modal-content {
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }
    .modal-form {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .modal-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .modal-close {
      color: var(--text-light);
      font-size: 1.25rem;
      padding: 0.25rem;
      border-radius: var(--radius-sm);
      border: none;
      background: none;
      cursor: pointer;
      line-height: 1;
    }
    .modal-close:hover {
      color: var(--text-main);
      background: var(--bg-subtle);
    }
    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
      background: var(--bg-card, #fff);
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

    /* Image Upload Styles */
    .image-upload-area {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .image-preview-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .image-preview {
      position: relative;
      width: 120px;
      height: 120px;
      border-radius: 10px;
      overflow: hidden;
      border: 2px solid var(--border, #e2e8f0);
      background: #f8fafc;
      flex-shrink: 0;
    }
    .image-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .remove-image-btn {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.9);
      color: white;
      font-size: 0.875rem;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      line-height: 1;
    }
    .remove-image-btn:hover {
      background: #dc2626;
      transform: scale(1.1);
    }
    .upload-zone {
      position: relative;
    }
    .file-input {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      overflow: hidden;
    }
    .upload-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1.5rem 1rem;
      border: 2px dashed var(--border, #cbd5e1);
      border-radius: var(--radius-md, 8px);
      background: var(--bg-subtle, #f8fafc);
      cursor: pointer;
      transition: all 0.2s;
    }
    .upload-label:hover {
      border-color: var(--primary, #6366f1);
      background: #eef2ff;
    }
    .upload-icon {
      font-size: 1.75rem;
    }
    .upload-text {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-main, #0f172a);
    }
    .upload-hint {
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }
    .change-image-row {
      position: relative;
    }
    .change-image-row .file-input {
      position: absolute;
    }
    .change-image-row label {
      cursor: pointer;
      font-size: 0.8125rem;
      display: inline-block;
    }
    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
    }

    /* Kichik ekranlar uchun */
    @media (max-height: 700px) {
      .modal-content {
        max-height: 95vh;
      }
      .modal-body {
        padding: 1rem;
      }
      .modal-header,
      .modal-footer {
        padding: 0.875rem 1rem;
      }
    }
    @media (max-width: 500px) {
      .image-preview-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }
    }
  `]
})
export class ProductFormModalComponent implements OnInit, OnDestroy {
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

  // Image upload
  selectedFile: File | null = null;
  imagePreviewUrl: string | null = null;
  existingImageUrl: string | null = null;
  imageError: string | null = null;

  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  private readonly ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

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
    this.initExistingImage();
  }

  ngOnDestroy(): void {
    // Preview URL ni tozalash
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: [this.product?.name || '', [Validators.required, Validators.minLength(2)]],
      price: [this.product?.price || 0, [Validators.required, Validators.min(0)]],
      quantity: [this.product?.quantity || 0, [Validators.required, Validators.min(0)]],
      categoryId: [this.product?.categoryId || null, Validators.required],
      companyBranchId: [this.product?.companyBranchId || null, Validators.required],
      description: [this.product?.description || '']
    });
  }

  private initExistingImage(): void {
    if (this.product?.image) {
      // Agar "http" bilan boshlansa - to'liq URL, aks holda nisbiy yo'l
      if (this.product.image.startsWith('http')) {
        this.existingImageUrl = this.product.image;
      } else {
        this.existingImageUrl = `${environment.apiUrl}${this.product.image}`;
      }
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.imageError = null;

    // Fayl turini tekshirish
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(extension) || !this.ALLOWED_TYPES.includes(file.type)) {
      this.imageError = "Faqat .jpg, .jpeg, .png, .webp formatidagi rasmlar ruxsat etiladi.";
      input.value = '';
      return;
    }

    // Hajmni tekshirish
    if (file.size > this.MAX_FILE_SIZE) {
      this.imageError = "Rasm hajmi 5MB dan oshmasligi kerak.";
      input.value = '';
      return;
    }

    // Eski preview ni tozalash
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }

    this.selectedFile = file;
    this.imagePreviewUrl = URL.createObjectURL(file);
    this.existingImageUrl = null;
    input.value = '';
  }

  removeImage(): void {
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
    this.selectedFile = null;
    this.imagePreviewUrl = null;
    this.existingImageUrl = null;
    this.imageError = null;
  }

    private loadDropdownData(): void {
    this.categoryService.getAll().subscribe({
      next: (cats) => (this.categories = (cats || []).filter(c => c.isActive)),
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
        quantity: Number(val.quantity),
        companyBranchId: Number(val.companyBranchId)
      };
      // Yangi fayl tanlangan bo'lsa
      if (this.selectedFile) {
        updateDto.imageFile = this.selectedFile;
      }
      this.save.emit(updateDto);
    } else {
      const createDto: CreateProductDto = {
        name: val.name,
        description: val.description || '',
        price: Number(val.price),
        categoryId: Number(val.categoryId),
        quantity: Number(val.quantity),
        companyBranchid: Number(val.companyBranchId)
      };
      // Fayl tanlangan bo'lsa
      if (this.selectedFile) {
        createDto.imageFile = this.selectedFile;
      }
      this.save.emit(createDto);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}


